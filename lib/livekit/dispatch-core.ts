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
    readonly code:
      | "PROJECT_MISMATCH"
      | "AGENT_DISPATCH_FAILED"
      | "AGENT_COLD_START_TIMEOUT"
      | "AGENT_CONFIGURATION"
      | "AGENT_MODEL_UNAVAILABLE",
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
  timeoutMs = 60_000,
  pollMs = 500,
  agentKind = 4,
  agentReady = () => true,
  agentFailure,
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
  agentFailure?: (
    participant: LiveKitParticipant,
  ) => "AGENT_CONFIGURATION" | "AGENT_MODEL_UNAVAILABLE" | undefined;
}) {
  let dispatch: LiveKitDispatch;
  try {
    dispatch = await clients.dispatch.createDispatch(roomName, agentName, { metadata });
  } catch (error) {
    throw new LiveKitDispatchError(
      "AGENT_DISPATCH_FAILED",
      supportId,
      error instanceof Error ? error.message : "LiveKit dispatch failed",
    );
  }

  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      const participants = await clients.rooms.listParticipants(roomName);
      for (const participant of participants.filter((candidate) => candidate.kind === agentKind)) {
        const failure = agentFailure?.(participant);
        if (failure)
          throw new LiveKitDispatchError(failure, supportId, `LiveKit agent reported ${failure}`);
      }
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
    if (error instanceof LiveKitDispatchError) {
      await safeDeleteRoom(clients, roomName);
      throw error;
    }
    await safeDeleteRoom(clients, roomName);
    throw new LiveKitDispatchError(
      "AGENT_DISPATCH_FAILED",
      supportId,
      error instanceof Error ? error.message : "LiveKit participant check failed",
    );
  }
  throw new LiveKitDispatchError(
    "AGENT_COLD_START_TIMEOUT",
    supportId,
    "LiveKit agent did not become ready before the cold-start deadline",
  );
}

export async function safeDeleteRoom(clients: LiveKitDispatchClients, roomName: string) {
  try {
    await clients.rooms.deleteRoom(roomName);
  } catch {
    // The room may already be gone; cleanup must not hide the primary result.
  }
}
