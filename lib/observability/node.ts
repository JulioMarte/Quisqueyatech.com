import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ConsoleInstrumentation } from "@opentelemetry/instrumentation-console";
import { defaultResource, resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

type GlobalWithOtel = typeof globalThis & {
  __quisqueyaOtelSdk?: NodeSDK;
};

const enabledValues = new Set(["1", "true", "yes", "on"]);
const disabledValues = new Set(["0", "false", "no", "off"]);

export function startNodeOpenTelemetry(serviceName: string) {
  const globalForOtel = globalThis as GlobalWithOtel;
  if (globalForOtel.__quisqueyaOtelSdk) return globalForOtel.__quisqueyaOtelSdk;
  if (!isOpenTelemetryEnabled()) return null;

  configureDiagnostics();

  const traceExporter = shouldExport("OTEL_TRACES_EXPORTER") ? new OTLPTraceExporter() : undefined;
  const metricReader = shouldExport("OTEL_METRICS_EXPORTER")
    ? new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
      })
    : undefined;
  const logRecordProcessors = shouldExport("OTEL_LOGS_EXPORTER")
    ? [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })]
    : undefined;

  const sdk = new NodeSDK({
    serviceName,
    resource: defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: serviceName,
        [ATTR_SERVICE_VERSION]: process.env.npm_package_version || "0.1.0",
        "deployment.environment": process.env.OTEL_DEPLOYMENT_ENVIRONMENT || process.env.NODE_ENV,
      }),
    ),
    traceExporter,
    metricReader,
    logRecordProcessors,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
      ...(logRecordProcessors ? [new ConsoleInstrumentation()] : []),
    ],
  });

  sdk.start();
  globalForOtel.__quisqueyaOtelSdk = sdk;

  const shutdown = async () => {
    try {
      await sdk.shutdown();
    } catch (error) {
      console.error("[otel] shutdown failed", error);
    }
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  return sdk;
}

function isOpenTelemetryEnabled() {
  const value = process.env.OTEL_ENABLED?.trim().toLowerCase();
  if (!value) return process.env.OTEL_SDK_DISABLED !== "true";
  if (disabledValues.has(value)) return false;
  if (enabledValues.has(value)) return true;
  return process.env.OTEL_SDK_DISABLED !== "true";
}

function shouldExport(
  variableName: "OTEL_TRACES_EXPORTER" | "OTEL_METRICS_EXPORTER" | "OTEL_LOGS_EXPORTER",
) {
  const configured = process.env[variableName]?.trim().toLowerCase();
  return configured !== "none";
}

function configureDiagnostics() {
  const configured = process.env.OTEL_LOG_LEVEL?.trim().toUpperCase();
  if (!configured) return;

  const level = DiagLogLevel[configured as keyof typeof DiagLogLevel];
  if (typeof level === "number") {
    diag.setLogger(new DiagConsoleLogger(), level);
  }
}
