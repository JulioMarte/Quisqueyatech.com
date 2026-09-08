import { SQLiteDatabase } from "../src/server/db/sqlite";
import { RuntimeWorker } from "../src/server/workers/runtime";

const intervalMs = Number.parseInt(process.env.WORKER_INTERVAL_MS || "5000", 10);
if (!Number.isInteger(intervalMs) || intervalMs < 1000 || intervalMs > 60_000) throw new Error("Invalid WORKER_INTERVAL_MS");

const database = new SQLiteDatabase();
const worker = new RuntimeWorker(database);
let stopped = false;
let running = false;

async function run() {
  if (running || stopped) return;
  running = true;
  try {
    await worker.tick();
  } catch (error) {
    console.error("Runtime worker tick failed", error instanceof Error ? error.message : "unknown error");
  } finally {
    running = false;
  }
}

await run();
const timer = setInterval(() => void run(), intervalMs);
timer.unref();

function shutdown(signal: string) {
  if (stopped) return;
  stopped = true;
  clearInterval(timer);
  console.log(`Received ${signal}; shutting down runtime worker`);
  const finish = () => {
    database.close();
    process.exit(0);
  };
  if (running) {
    const wait = setInterval(() => {
      if (!running) {
        clearInterval(wait);
        finish();
      }
    }, 25);
    setTimeout(() => process.exit(1), 10_000).unref();
  } else finish();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

// Keep the process alive even though the interval itself is unref'd.
await new Promise<void>(() => {});
