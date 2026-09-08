import { createServer } from "node:http";
import { apiRuntimeFromEnv } from "../src/server/api";

const port = Number.parseInt(process.env.API_PORT || "8787", 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid API_PORT");

const runtime = apiRuntimeFromEnv();
const server = createServer((request, response) => {
  runtime.handler(request, response).catch((error) => {
    console.error("API request failed", error instanceof Error ? error.message : "unknown error");
    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    if (!response.writableEnded) response.end(JSON.stringify({ error: "Internal server error" }));
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`QuisqueyaTech API listening on :${port}`);
});

function shutdown(signal: string) {
  console.log(`Received ${signal}; shutting down API`);
  server.close(() => {
    runtime.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
