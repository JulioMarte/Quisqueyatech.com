export type LiveKitParticipant = { identity: string; kind: number; metadata?: string };
export type LiveKitDispatch = { id: string; agentName: string; room: string };

export type LiveKitDispatchClients = {
  dispatch: {
    createDispatch: (
      roomName: string,
      agentName: string,
      options: { metadata: string },
    ) => Promise<LiveKitDispatch>;
  };
  rooms: {
    listParticipants: (roomName: string) => Promise<LiveKitParticipant[]>;
    deleteRoom: (roomName: string) => Promise<void>;
  };
};

export class LiveKitDispatchError extends Error {
  constructor(
    readonly code: "PROJECT_MISMATCH" | "DISPATCH_FAILED" | "AGENT_TIMEOUT",
    readonly supportId: string,
    message: string,
  ) {
    super(message);
    this.name = "LiveKitDispatchError";
  }
}

export function normalizeLiveKitUrl(raw: string, expectedHostname: string) {
  const url = new URL(raw);
  if (!["wss:", "https:"].includes(url.protocol))
    throw new Error("LiveKit URL must use WSS or HTTPS");
  const hostname = url.hostname.toLowerCase();
  if (hostname !== expectedHostname.toLowerCase())
    throw new Error(`LiveKit project mismatch: expected ${expectedHostname}, received ${hostname}`);
  url.protocol = "https:";
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return { apiUrl: url.toString(), hostname };
}

export async function dispatchAndWaitForAgent({
  clients,
  roomName,
  agentName,
  metadata,
  supportId,
  timeoutMs = 15_000,
  pollMs = 500,
  agentKind = 4,
  agentReady = () => true,
}: {
  clients: LiveKitDispatchClients;
  roomName: string;
  agentName: string;
  metadata: string;
  supportId: string;
  timeoutMs?: number;
  pollMs?: number;
  agentKind?: number;
  agentReady?: (participant: LiveKitParticipant) => boolean;
}) {
  let dispatch: LiveKitDispatch;
  try {
    dispatch = await clients.dispatch.createDispatch(roomName, agentName, { metadata });
  } catch (error) {
    throw new LiveKitDispatchError(
      "DISPATCH_FAILED",
      supportId,
      error instanceof Error ? error.message : "LiveKit dispatch failed",
    );
  }

  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      const participants = await clients.rooms.listParticipants(roomName);
      const agent = participants.find(
        (participant) => participant.kind === agentKind && agentReady(participant),
      );
      if (agent)
        return { dispatch, agent, latencyMs: timeoutMs - Math.max(0, deadline - Date.now()) };
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(pollMs, Math.max(1, deadline - Date.now()))),
      );
    }
  } catch (error) {
    await safeDeleteRoom(clients, roomName);
    throw new LiveKitDispatchError(
      "DISPATCH_FAILED",
      supportId,
      error instanceof Error ? error.message : "LiveKit participant check failed",
    );
  }
  await safeDeleteRoom(clients, roomName);
  throw new LiveKitDispatchError("AGENT_TIMEOUT", supportId, "LiveKit agent did not become ready");
}

export async function safeDeleteRoom(clients: LiveKitDispatchClients, roomName: string) {
  try {
    await clients.rooms.deleteRoom(roomName);
  } catch {
    // The room may already be gone; cleanup must not hide the primary result.
  }
}
