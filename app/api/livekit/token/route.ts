/*
 * All three come from `livekit-server-sdk`, deliberately — `RoomConfiguration`
 * and `RoomAgentDispatch` originate in `@livekit/protocol`, but importing them
 * from there fails to typecheck: `livekit-client` pulls in its own copy of that
 * package, npm nests a second one under the server SDK, and the two generated
 * protobuf classes are structurally incompatible. The SDK re-exports the
 * versions it actually accepts, so taking all three from one place keeps them
 * the same types.
 */
import { AccessToken, RoomAgentDispatch, RoomConfiguration } from "livekit-server-sdk";

/**
 * `POST /api/livekit/token` — the visitor's way into a room.
 *
 * The browser cannot mint its own LiveKit token: doing so would mean shipping
 * `LIVEKIT_API_SECRET` to every visitor, and that secret can create rooms,
 * delete them and join any of them. So this route is the only thing that holds
 * it, and it hands back a JWT scoped to one room, one identity and a few
 * minutes.
 *
 * ## The part that is easy to get wrong
 *
 * `agent.py` registers itself with `agent_name="halyx-agent"`. A worker with a
 * name is **not** dispatched automatically — LiveKit only auto-dispatches
 * anonymous workers — so a token without the `roomConfig` below drops the
 * visitor into a room where nothing ever joins them. No error, no warning, just
 * a connected microphone and silence. The dispatch has to be requested here, at
 * the moment the room is created, and the name has to match the worker's
 * exactly.
 *
 * @see agent.py — the other half of that contract.
 */

/** Node's `crypto` and the SDK's JWT signing; neither runs on the Edge runtime. */
export const runtime = "nodejs";

/** A token is minted per visitor per session. Never cache one. */
export const dynamic = "force-dynamic";

/** Must match `agent_name` in `agent.py`. */
const AGENT_NAME = "halyx-agent";

/**
 * Long enough to join, short enough that a leaked token is worthless.
 *
 * The token authorises joining, not the session itself: once the visitor is in
 * the room, the connection outlives the token's expiry, so this does not cap
 * how long anybody can talk.
 */
const TTL_SECONDS = 5 * 60;

/** Trims anything a caller sends to a shape LiveKit will accept as an identifier. */
function sanitise(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const clean = value.replace(/[^\w.\-:]/g, "").slice(0, 64);
  return clean || fallback;
}

export async function POST(request: Request): Promise<Response> {
  const url = process.env.LIVEKIT_URL;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;

  if (!url || !key || !secret) {
    // An operator error, so it is loud in the log and vague to the visitor.
    console.error(
      "[livekit] missing credentials: set LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET in .env.local",
    );
    return Response.json(
      { error: "The voice agent is not configured." },
      { status: 503 },
    );
  }

  let body: { room?: unknown; identity?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // An empty body is fine — both fields have sensible defaults below.
  }

  /*
   * A fresh room per visitor by default.
   *
   * Rooms are conversations here, not lobbies: two strangers landing in the
   * same room would hear each other and share one agent. `crypto.randomUUID`
   * keeps them apart without needing any state on this side.
   */
  const room = sanitise(body.room, `halyx-${crypto.randomUUID()}`);
  const identity = sanitise(body.identity, `visitor-${crypto.randomUUID().slice(0, 8)}`);

  const token = new AccessToken(key, secret, { identity, ttl: TTL_SECONDS });

  token.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    // The agent reads transcriptions over the data channel, and the frontend
    // publishes nothing else — so this is the visitor's microphone and that is
    // all it is.
    canPublishData: true,
  });

  // Ask for the named worker by name. Without this the room stays empty.
  token.roomConfig = new RoomConfiguration({
    agents: [new RoomAgentDispatch({ agentName: AGENT_NAME })],
  });

  return Response.json(
    { token: await token.toJwt(), url, room, identity },
    { headers: { "Cache-Control": "no-store" } },
  );
}
