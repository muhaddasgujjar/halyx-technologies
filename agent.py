"""Halyx Technologies — the voice agent relay.

    browser ──WebRTC──▶ LiveKit Cloud ──▶ this worker ──▶ Deepgram / OpenAI / Cartesia
                                                │
                                                └── capture_lead_info ──▶ the studio inbox

This process does not serve the browser. It registers with LiveKit as a worker,
and LiveKit dispatches it into a room when a visitor joins one. The browser gets
there on its own with a token minted by `app/api/livekit/token/route.ts`; the
only thing the two halves share is the room name and the `agent_name` below.

Run it:

    .venv\\Scripts\\python agent.py download-files   # once — fetches the VAD + turn models
    .venv\\Scripts\\python agent.py console          # talk to it in the terminal, no browser
    .venv\\Scripts\\python agent.py dev              # connect to LiveKit (works, but warns
                                                  # it is superseded by `lk agent dev`,
                                                  # which adds the hot reload the Python
                                                  # CLI has dropped)
    .venv\\Scripts\\python agent.py start            # production

`console` is the one to reach for first. It runs the whole pipeline against your
own microphone with no LiveKit connection and no frontend, so when something is
wrong you find out whether it is the agent or the plumbing before you have
debugged the wrong half.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Annotated

from dotenv import dotenv_values
from pydantic import Field
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobExecutorType,
    JobProcess,
    RoomInputOptions,
    RunContext,
    cli,
    function_tool,
    inference,
)
from livekit.agents.worker import ServerEnvOption
from livekit.plugins import cartesia, deepgram, openai, silero

logger = logging.getLogger("halyx-agent")

def _load_env() -> None:
    """Read the same files Next.js does, without letting them clobber the host.

    Precedence, highest first: the real environment, then `.env.local`, then
    `.env` — which is what Next.js does and what any deployment target expects,
    because in production the keys arrive as environment variables and there is
    no `.env.local` on disk at all.

    Two rules do the work, and both exist because of a bug this had:

    **A blank value is not a value.** `.env.local` ships with every key present
    and empty, as a template to fill in. Loading that with `override=True` — the
    obvious way to make `.env.local` beat `.env` — set `DEEPGRAM_API_KEY=""`
    over a perfectly good key that was already exported, and the plugin then
    failed with "API key is required" while the operator looked at a file that
    plainly contained one.

    **The environment always wins.** Anything already set is left alone, so
    running the worker with a key exported for one session does what it looks
    like it does.
    """
    root = Path(__file__).parent
    merged: dict[str, str] = {}
    for name in (".env", ".env.local"):  # later file wins
        for key, value in dotenv_values(root / name).items():
            if value:  # skip blanks and unset keys
                merged[key] = value

    for key, value in merged.items():
        os.environ.setdefault(key, value)


_load_env()


# ─────────────────────────────  Persona  ─────────────────────────────

INSTRUCTIONS = """\
You are the voice of Halyx Technologies, an applied-AI product studio. A visitor \
has opened the console on the studio's own site and is speaking to you out loud. \
You are also the studio's demo: someone deciding whether Halyx can build them \
something is, right now, deciding by listening to you.

# What Halyx does
Generative AI, RAG pipelines and autonomous agent workflows, taken to production \
rather than to a prototype. The studio also does the engineering around them: \
custom software, web and mobile, data and cloud.

# What you are for
Answer what you are asked, find out what they are building, and get a name and an \
email to the team.

# How you sound
You are being spoken aloud, so write only what sounds right said out loud.

- **One to three sentences.** This matters more than anything else here. A \
paragraph that takes eight seconds to read takes thirty to hear and cannot be \
skimmed. If you are about to make three points, make the first and stop — they \
will ask for the second.
- Contractions, always. "I'm", "that's", "we've".
- Start in the middle. Never restate the question, never open with "Great \
question" or "Absolutely", never announce what you are about to do.
- Vary how you open. Two replies that begin the same way is what makes a voice \
sound synthetic.
- No lists, numbering, markdown, asterisks or emoji — say them in a sentence.
- Never read a web address aloud. Say the product's name and offer to send a link.
- A little hedging is human: "I think", "I'd want to check that". Use it where \
you are genuinely unsure, never as decoration.

# If they talk over you
They can, and it works — you will stop mid-sentence. Do not acknowledge it. No \
"sorry", no starting again. A person who is interrupted just answers the new \
thing.

# Honesty
Never invent a client name, a metric, a certification, a headcount or a date. If \
you do not know, say the team will confirm — that is a strong answer, not a weak \
one. Never quote a price: the CEO scopes every engagement personally, and a \
number given before that is worthless to both sides. Never describe a Halyx \
project as a failure or invent a setback to sound candid.

# Capturing the lead
The moment you have a name and an email, call capture_lead_info. Ask for what is \
missing first, plainly: "What's the best email for them to reach you on?" Read an \
email back if it sounded ambiguous, and never guess one. Once it is sent, say so \
and ask one more useful question rather than signing off.

# Opening
You greet them first, so do not introduce yourself a second time. Answer what \
they said.
"""

GREETING = "Hey — Halyx here. What are you working on?"

# Must match AGENT_NAME in `app/api/livekit/token/route.ts`. A *named* worker is
# never auto-dispatched, so the browser's token has to ask for this exact string
# by name; if the two drift, the visitor joins a room nothing else ever joins.
AGENT_NAME = "halyx-agent"


# ─────────────────────────────  Session state  ─────────────────────────────


@dataclass
class Lead:
    """What we have learned about the visitor so far.

    Carried on the session rather than in a module global because a worker
    process handles many rooms at once, and a global would let one visitor's
    half-finished details leak into another's conversation.
    """

    name: str | None = None
    email: str | None = None
    scope: str | None = None
    captured: bool = False
    transcript: list[str] = field(default_factory=list)


# ─────────────────────────────  Agent  ─────────────────────────────


class HalyxAgent(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=INSTRUCTIONS)

    @function_tool
    async def capture_lead_info(
        self,
        context: RunContext[Lead],
        # `Field(description=...)` rather than a bare string inside Annotated.
        # The schema is built by pydantic, which ignores plain metadata — a
        # bare `Annotated[str, "..."]` typechecks, runs, and silently sends the
        # model three untitled string parameters with nothing to say what goes
        # in them.
        name: Annotated[str, Field(description="The visitor's full name, as they gave it.")],
        email: Annotated[
            str, Field(description="Their email address, exactly as they said it.")
        ],
        project_scope: Annotated[
            str,
            Field(
                description=(
                    "What they are trying to build or fix, in your own words. "
                    "Specific enough that the team can prepare before replying — "
                    "include the constraint and any timing they mentioned."
                )
            ),
        ],
    ) -> str:
        """Send a visitor's details to the Halyx studio inbox.

        Call this as soon as you have a name and an email, or when they ask to be
        contacted, quoted, or put in front of the team. Ask for anything missing
        before calling, and never guess an email address.
        """
        lead = context.userdata
        lead.name, lead.email, lead.scope = name, email, project_scope
        lead.captured = True

        # Logged as a single structured line so it is greppable in a deployment's
        # log drain. Wire the real delivery in here — the studio's existing
        # `lib/rag/leads.ts` posts to Resend, and an HTTP call to that same
        # endpoint keeps one code path owning what a lead actually looks like.
        logger.info(
            "lead captured",
            extra={"lead_name": name, "lead_email": email, "lead_scope": project_scope},
        )

        # Returned to the model, not to the visitor. It decides how to say it.
        return (
            f"Sent to the team. Confirm to {name} that it has gone to the studio "
            "and that they will hear back within two working days, then ask one "
            "more question about the project."
        )


# ─────────────────────────────  Worker  ─────────────────────────────

def prewarm(proc: JobProcess) -> None:
    """Load the Silero VAD once per worker process, not once per conversation.

    Loading it inside the entrypoint puts a model load between the visitor
    clicking Start and the agent being able to hear anything. It runs to a few
    hundred milliseconds and it is the same weights every time.
    """
    proc.userdata["vad"] = silero.VAD.load()


# `setup_fnc` is a plain settable property on AgentServer, not a decorator —
# `@server.setup_fnc` raises `TypeError: 'NoneType' object is not callable`,
# because the getter returns None until something has been assigned.
server = AgentServer(
    setup_fnc=prewarm,
    # One OS process per conversation, not one thread.
    #
    # The thread executor is the library default and it crashes this stack on
    # Windows. Audio resampling runs through soxr inside `livekit_ffi.dll`,
    # whose FFT cache is a process-global that is not safe to tear down from
    # several threads: starting and ending a few sessions in one process trips
    # `Assertion failed: LSX_FFT_BR == NULL` in `fft4g_cache.h` and takes the
    # whole worker down with a Visual C++ runtime dialog — mid-call, for every
    # visitor connected to it.
    #
    # A process per job gives each conversation its own copy of that global, so
    # a teardown cannot corrupt anybody else's. It costs a little more memory
    # and a slower cold start, which `num_idle_processes` covers in production.
    job_executor_type=JobExecutorType.PROCESS,
    # Keep one process warm in dev.
    #
    # Process isolation above costs a cold Python start per conversation, and
    # the library warms none in dev (`dev_default=0`) — which showed up as five
    # seconds of silence between pressing Start and hearing anything, the exact
    # pause a visitor reads as "it is broken". One warm process removes it while
    # testing; production already warms twelve.
    num_idle_processes=ServerEnvOption(dev_default=1, prod_default=12),
)


def _tts():
    """Cartesia if it is configured, OpenAI otherwise.

    Cartesia's Sonic is the better voice and the lower latency, but it is a
    second account to set up. Falling back rather than failing means the agent
    runs on the keys you already have, and improves the day you add the other
    one without a code change.

    The cartesia import is at module scope, not in here. Importing a plugin
    registers it, registration is only legal on the main thread, and this
    function runs inside the job — which the default THREAD executor runs off
    the main thread. A lazy import here looks like a tidy way to avoid
    depending on a package that may not be configured, and it crashes every
    dispatch with "Plugins must be registered on the main thread" the moment
    the key IS configured. The import is cheap and unconditional; only the
    construction below is conditional.
    """
    if os.getenv("CARTESIA_API_KEY"):
        voice = os.getenv("CARTESIA_VOICE_ID")
        return cartesia.TTS(model="sonic-3", **({"voice": voice} if voice else {}))

    logger.info("CARTESIA_API_KEY not set - using OpenAI TTS")
    return openai.TTS(model="gpt-4o-mini-tts", voice="ash")


@server.rtc_session(agent_name=AGENT_NAME)
async def entrypoint(ctx: JobContext) -> None:
    """One visitor, one room, one conversation.

    `agent_name` is what ties this worker to the frontend: the token route sets
    the same string in its room configuration, so LiveKit knows to dispatch
    *this* agent into the room the browser just joined. Change it in one place
    and the visitor sits in an empty room.
    """
    ctx.log_context_fields = {"room": ctx.room.name}

    session: AgentSession[Lead] = AgentSession(
        userdata=Lead(),
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(
            model="nova-3",
            language="en-US",
            # Proper nouns a general model has no reason to know, and gets
            # confidently wrong: a live test transcribed "Halyx" as "Alex", and
            # the studio's own name arriving wrong is the one transcription
            # error that reads as the demo not knowing who it works for.
            # nova-3 keyterm boosting is exact-match, so the spellings here are
            # the ones that must reach the model. The parameter is `keyterm`, not
            # `keyterms` — the plural spelling still works and warns.
            keyterm=[
                "Halyx",
                "Halyx Technologies",
                "Maiku",
                "ArchitectXpert",
                "Axiom",
                "Cartesia",
                "Muhaddas",
                "Aleem",
                "Numan",
                "RAG",
            ],
        ),
        llm=openai.LLM(model="gpt-4o-mini", temperature=0.6),
        tts=_tts(),
        # Semantic end-of-turn detection. Silence alone cannot tell "I'm done"
        # from "I'm thinking", so a VAD-only agent talks over anybody who pauses
        # mid-sentence — the single most machine-like thing a voice agent does.
        #
        # Two deprecations avoided here, both of which still "work" and both of
        # which warn. `inference.TurnDetector` replaces
        # `livekit.plugins.turn_detector.MultilingualModel()`, and it belongs
        # inside `turn_handling` rather than as a top-level `turn_detection=`
        # kwarg, which is slated for removal in v2. It runs on LiveKit's
        # inference gateway using the credentials already in the environment,
        # and `local_fallback` keeps it working if that is unreachable.
        turn_handling={
            "turn_detection": inference.TurnDetector(),
            # Barge-in: the visitor talks, the agent stops mid-word.
            #
            # `min_words` is 1, deliberately. At 2 the agent ignores "stop",
            # "wait" and "no" — which are the actual words people interrupt
            # with, and the ones that matter most when it is saying something
            # wrong. The noise guard is `min_duration` instead: half a second
            # of continuous speech, which a cough or a door does not produce.
            #
            # `resume_false_interruption` is the net under that. If something
            # stops the reply and no real turn follows within two seconds, the
            # agent picks the sentence back up rather than leaving the visitor
            # in silence wondering whether it crashed.
            "interruption": {
                "enabled": True,
                "min_words": 1,
                "min_duration": 0.5,
                "resume_false_interruption": True,
            },
        },
    )

    @session.on("user_input_transcribed")
    def _on_transcript(event) -> None:
        if event.is_final:
            session.userdata.transcript.append(event.transcript)
            logger.info("visitor said: %s", event.transcript)

    @session.on("conversation_item_added")
    def _on_item(event) -> None:
        item = event.item
        text = getattr(item, "text_content", None) or ""
        logger.info("turn [%s]: %s", getattr(item, "role", "?"), text[:300])

    @session.on("agent_state_changed")
    def _on_state(event) -> None:
        logger.info("agent state: %s -> %s", event.old_state, event.new_state)

    @session.on("agent_false_interruption")
    def _on_false(event) -> None:
        # The visitor appeared to interrupt and then said nothing real. The
        # session resumes the reply itself; this is here so the behaviour is
        # visible in a log rather than looking like a stutter.
        logger.info("false interruption - resuming the reply")

    async def _on_shutdown() -> None:
        lead = session.userdata
        logger.info(
            "session ended",
            extra={
                "turns": len(lead.transcript),
                "lead_captured": lead.captured,
                "lead_email": lead.email,
            },
        )

    ctx.add_shutdown_callback(_on_shutdown)

    # The browser's own echo cancellation keeps the agent from hearing itself;
    # see `components/VoiceAgent.tsx`, which asks for it explicitly. If this ends
    # up in a noisy room, `livekit-plugins-noise-cancellation` adds LiveKit
    # Cloud's BVC model here via `room_input_options=RoomInputOptions(
    # noise_cancellation=noise_cancellation.BVC())` — a separate install, and
    # Cloud-only, so it is not wired in by default.
    # Join the room before starting the session.
    #
    # Without this the worker registers as a participant on the signalling
    # channel but never completes the WebRTC peer connection, and the job dies
    # after ten seconds with "wait_pc_connection timed out" — a room the visitor
    # is sitting in, with an agent that is listed as present and cannot hear or
    # be heard. The warning the SDK logs for it names this call.
    await ctx.connect()

    await session.start(
        HalyxAgent(),
        room=ctx.room,
        room_input_options=RoomInputOptions(
            # Tear the room down when the visitor hangs up.
            #
            # `close_on_disconnect` already ends the session, but the default
            # leaves the room standing: after the visitor left, the agent stayed
            # listed as a participant for the room's whole empty-timeout, so a
            # browser tab closed at the end of a demo left a room and a worker
            # process idling behind it. Every conversation gets a fresh room
            # (see the token route), so there is never a reason to keep an empty
            # one alive.
            delete_room_on_close=True,
        ),
    )

    # Speak first. The greeting is said rather than generated, so there is no
    # model round trip between the visitor connecting and hearing a voice.
    await session.say(GREETING, allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(server)
