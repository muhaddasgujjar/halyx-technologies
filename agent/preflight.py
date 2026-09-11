"""Check that every key in `.env.local` is present *and* actually works.

    .venv\\Scripts\\python preflight.py

"Is it configured?" has two answers and only one of them is visible in the file.
A key can be present and revoked, present and for the wrong project, present
with a trailing space pasted in from a dashboard, or - the one that wastes the
most time - a LiveKit URL from one project with an API key from another. Every
one of those looks correct in an editor and fails at the first real call, three
layers deep, as a timeout or a 401 that names nothing.

So this calls each service once, cheaply, and says which of them answered.
Nothing here starts a conversation or bills for a model: the LiveKit check lists
rooms, Deepgram and OpenAI list models, Cartesia reads its voice catalogue.

Secrets are never printed. A key is reported by length and first characters
only, so the output can be pasted into a chat or an issue safely.
"""

from __future__ import annotations

import asyncio
import os
import sys

import aiohttp

# Reuse the agent's own loader, so this checks exactly what the agent will see -
# including the precedence rules. A preflight that reads the file differently
# from the program it is vetting is worse than no preflight.
from agent import AGENT_NAME, _load_env

_load_env()

OK, BAD, WARN, SKIP = "  OK  ", " FAIL ", " WARN ", " SKIP "


def redact(value: str | None) -> str:
    if not value:
        return "not set"
    return f"{len(value)} chars, starts {value[:6]!r}"


def check_present() -> tuple[bool, list[str]]:
    """Presence and obvious shape problems, before anything is dialled."""
    print("-- keys -----------------------------------------------")
    required = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "DEEPGRAM_API_KEY", "OPENAI_API_KEY"]
    missing: list[str] = []

    for name in required:
        value = os.getenv(name)
        if not value:
            missing.append(name)
            print(f"[{BAD}] {name:20} not set")
            continue

        note = ""
        if value != value.strip():
            note = "  <- has leading/trailing whitespace, strip it"
        if name == "LIVEKIT_URL":
            if "your-project" in value:
                missing.append(name)
                print(f"[{BAD}] {name:20} still the placeholder")
                continue
            if not value.startswith(("ws://", "wss://")):
                missing.append(name)
                print(f"[{BAD}] {name:20} must start wss:// - got {value[:24]!r}")
                continue
            print(f"[{OK}] {name:20} {value}{note}")
            continue

        print(f"[{OK}] {name:20} {redact(value)}{note}")

    cartesia = os.getenv("CARTESIA_API_KEY")
    print(
        f"[{OK if cartesia else SKIP}] {'CARTESIA_API_KEY':20} "
        + (redact(cartesia) if cartesia else "not set - agent.py falls back to OpenAI TTS")
    )
    return not missing, missing


async def check_livekit(session: aiohttp.ClientSession) -> bool:
    """Mint a token against the real credentials and use it on the real server."""
    from livekit import api

    url = os.environ["LIVEKIT_URL"]
    http = url.replace("wss://", "https://").replace("ws://", "http://")
    try:
        lk = api.LiveKitAPI(url=http, api_key=os.environ["LIVEKIT_API_KEY"], api_secret=os.environ["LIVEKIT_API_SECRET"])
        rooms = await lk.room.list_rooms(api.ListRoomsRequest())
        await lk.aclose()
        print(f"[{OK}] LiveKit              reachable, {len(rooms.rooms)} room(s) open")
        return True
    except Exception as exc:  # noqa: BLE001 - every failure here is worth showing verbatim
        detail = str(exc)
        hint = ""
        if "401" in detail or "unauthorized" in detail.lower():
            hint = "  <- key/secret rejected; check they are from the same project as LIVEKIT_URL"
        elif "Cannot connect" in detail or "getaddrinfo" in detail:
            hint = "  <- host unreachable; check LIVEKIT_URL spelling"
        print(f"[{BAD}] LiveKit              {detail[:110]}{hint}")
        return False


async def check_deepgram(session: aiohttp.ClientSession) -> bool:
    try:
        async with session.get(
            "https://api.deepgram.com/v1/auth/token",
            headers={"Authorization": f"Token {os.environ['DEEPGRAM_API_KEY']}"},
            timeout=aiohttp.ClientTimeout(total=15),
        ) as r:
            if r.status == 200:
                print(f"[{OK}] Deepgram             key accepted (nova-3 available on all paid plans)")
                return True
            print(f"[{BAD}] Deepgram             HTTP {r.status} - {(await r.text())[:90]}")
            return False
    except Exception as exc:  # noqa: BLE001
        print(f"[{BAD}] Deepgram             {str(exc)[:110]}")
        return False


async def check_openai(session: aiohttp.ClientSession) -> bool:
    try:
        async with session.get(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
            timeout=aiohttp.ClientTimeout(total=20),
        ) as r:
            if r.status != 200:
                print(f"[{BAD}] OpenAI               HTTP {r.status} - {(await r.text())[:90]}")
                return False
            ids = {m["id"] for m in (await r.json()).get("data", [])}
            # The two models agent.py actually names. A valid key on a project
            # with no access to one of them fails at the first turn, not here,
            # unless it is checked by name.
            missing = [m for m in ("gpt-4o-mini", "gpt-4o-mini-tts") if m not in ids]
            if missing:
                print(f"[{WARN}] OpenAI               key works, but not visible: {', '.join(missing)}")
                return True
            print(f"[{OK}] OpenAI               key accepted, gpt-4o-mini + gpt-4o-mini-tts available")
            return True
    except Exception as exc:  # noqa: BLE001
        print(f"[{BAD}] OpenAI               {str(exc)[:110]}")
        return False


async def check_cartesia(session: aiohttp.ClientSession) -> bool:
    key = os.getenv("CARTESIA_API_KEY")
    if not key:
        print(f"[{SKIP}] Cartesia             not configured - OpenAI TTS will be used")
        return True
    try:
        async with session.get(
            "https://api.cartesia.ai/voices/",
            headers={"X-API-Key": key, "Cartesia-Version": "2024-06-10"},
            timeout=aiohttp.ClientTimeout(total=15),
        ) as r:
            if r.status == 200:
                print(f"[{OK}] Cartesia             key accepted")
                return True
            print(f"[{WARN}] Cartesia             HTTP {r.status} - agent.py will fall back to OpenAI TTS")
            return True
    except Exception as exc:  # noqa: BLE001
        print(f"[{WARN}] Cartesia             {str(exc)[:90]} - falling back to OpenAI TTS")
        return True


async def main() -> int:
    print(f"\nHalyx voice agent preflight - dispatching to agent_name={AGENT_NAME!r}\n")

    present, missing = check_present()
    if not present:
        print(f"\n{len(missing)} key(s) still to fill in: {', '.join(missing)}")
        print("Open .env.local and paste them in, then run this again.\n")
        return 1

    print("\n-- services -------------------------------------------")
    async with aiohttp.ClientSession() as session:
        results = await asyncio.gather(
            check_livekit(session),
            check_deepgram(session),
            check_openai(session),
            check_cartesia(session),
        )

    print()
    if all(results):
        print("All good. Next:")
        print("  1.  .venv\\Scripts\\python agent.py console      talk to it, no browser needed")
        print("  2.  .venv\\Scripts\\python agent.py dev          connect it to LiveKit")
        print("  3.  npm run dev                                 and open the page\n")
        return 0

    print("Something above failed - fix that before running the agent.\n")
    return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
