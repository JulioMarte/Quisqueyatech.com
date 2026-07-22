import { existsSync, readFileSync } from "node:fs";

const envFile = ".env.local";
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

const baseUrl = (
  process.env.ASSESSMENT_DOCTOR_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const required = [
  "NEXT_PUBLIC_CONVEX_URL",
  "NEXT_PUBLIC_CONVEX_SITE_URL",
  "ADMIN_API_SECRET",
  "CONFIG_ENCRYPTION_KEY",
  "ASSESSMENT_TOKEN_SECRET",
  "ASSESSMENT_STORAGE_SECRET",
  "ASSESSMENT_WORKER_SECRET",
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "LIVEKIT_PROJECT_SUBDOMAIN",
  "GEMINI_API_KEY",
  "GEMINI_LIVE_MODEL",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
];

const missing = required.filter((key) => !process.env[key]?.trim());
console.log(`Assessment doctor target: ${baseUrl}`);
if (missing.length) {
  console.log(`Missing local variables: ${missing.join(", ")}`);
} else {
  console.log("Local variable shape: ok");
}

async function readHealth(probe) {
  const url = `${baseUrl}/api/health/assessment${probe ? "?probe=1" : ""}`;
  const headers = probe
    ? { "x-health-probe-token": process.env.ASSESSMENT_HEALTH_PROBE_TOKEN || "" }
    : {};
  const response = await fetch(url, { headers, cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

try {
  const passive = await readHealth(false);
  console.log(`Passive health: HTTP ${passive.response.status} ${passive.body.status || ""}`);
  if (passive.body.code && passive.body.code !== "READY")
    console.log(`Readiness code: ${passive.body.code}`);
  if (Array.isArray(passive.body.issues) && passive.body.issues.length) {
    for (const issue of passive.body.issues) console.log(`- ${issue.code}: ${issue.message}`);
  }

  if (process.env.ASSESSMENT_HEALTH_PROBE_TOKEN?.trim()) {
    const active = await readHealth(true);
    console.log(`Active probe: HTTP ${active.response.status} ${active.body.status || ""}`);
    if (active.body.checks?.activeProbe) {
      console.log(JSON.stringify(active.body.checks.activeProbe, null, 2));
    }
  } else {
    console.log("Active probe skipped: ASSESSMENT_HEALTH_PROBE_TOKEN is not set.");
  }

  if (!passive.response.ok || missing.length) process.exitCode = 1;
} catch (error) {
  console.error(
    `Assessment doctor failed to reach ${baseUrl}. Start Next first with npm run dev or set ASSESSMENT_DOCTOR_URL.`,
  );
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
