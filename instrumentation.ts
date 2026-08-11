export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startNodeOpenTelemetry } = await import("./lib/observability/node");
    startNodeOpenTelemetry(process.env.OTEL_SERVICE_NAME || "quisqueyatech-web");
  }
}
