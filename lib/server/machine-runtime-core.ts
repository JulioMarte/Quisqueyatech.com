export type MachineRuntimeEnvelope<T> = { config: T; source: "convex-env" };

export type MachineRuntimeFetchOptions = {
  timeoutMs?: number;
  retries?: number;
  fetcher?: typeof fetch;
};

export async function fetchMachineRuntime<T>(
  url: string,
  secret: string,
  options: MachineRuntimeFetchOptions = {},
): Promise<MachineRuntimeEnvelope<T>> {
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 5_000;
  const retries = options.retries ?? 1;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(url, {
        headers: { Accept: "application/json", Authorization: `Bearer ${secret}` },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Convex runtime gateway failed (${response.status})`);
      const value = (await response.json()) as unknown;
      if (!isEnvelope<T>(value)) throw new Error("Convex runtime gateway returned an invalid body");
      return value;
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Convex runtime gateway failed");
}

function isEnvelope<T>(value: unknown): value is MachineRuntimeEnvelope<T> {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { source?: unknown }).source === "convex-env" &&
      (value as { config?: unknown }).config &&
      typeof (value as { config?: unknown }).config === "object",
  );
}
