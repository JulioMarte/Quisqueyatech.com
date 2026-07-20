export function retryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

export async function fetchBounded(
  input: string,
  init: RequestInit,
  {
    timeoutMs,
    retries = 0,
    fetcher = fetch,
  }: { timeoutMs: number; retries?: number; fetcher?: typeof fetch },
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(input, { ...init, signal: controller.signal });
      if (attempt < retries && retryableStatus(response.status)) continue;
      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

export function errorCode(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") return "tool_timeout";
  return "network_error";
}
