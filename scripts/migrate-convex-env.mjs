import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const migratable = new Set([
  "ADMIN_API_SECRET",
  "ASSESSMENT_STORAGE_SECRET",
  "ASSESSMENT_TOKEN_SECRET",
  "ASSESSMENT_WORKER_SECRET",
  "AUTH_IP_HASH_SECRET",
  "TURNSTILE_SECRET_KEY",
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "GEMINI_API_KEY",
  "GEMINI_LIVE_MODEL",
  "GEMINI_LIVE_VOICE",
  "GEMINI_LIVE_TEMPERATURE",
  "ASSESSMENT_REPORT_MODEL",
  "ULTRAVOX_API_URL",
  "ULTRAVOX_API_KEY",
  "ULTRAVOX_MODEL",
  "ULTRAVOX_VOICE",
  "ULTRAVOX_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "LEAD_TO_EMAIL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "EASY_APPOINTMENTS_URL",
  "EASY_APPOINTMENTS_API_TOKEN",
  "EASY_APPOINTMENTS_WEBHOOK_TOKEN",
  "EASY_APPOINTMENTS_PROVIDER_ID",
  "EASY_APPOINTMENTS_SERVICE_ID",
  "EASY_APPOINTMENTS_TIMEZONE",
]);
const bootstrap = new Set([
  "ADMIN_API_SECRET",
  "ASSESSMENT_WORKER_SECRET",
  "CONVEX_URL",
  "CONVEX_SITE_URL",
]);
const obsolete = new Set(["CONFIG_ENCRYPTION_KEY", "ADMIN_PASSWORD_HASH"]);

const flags = new Set(process.argv.slice(2));
const target = flags.has("--prod") ? "prod" : "dev";
const apply = flags.has("--dev") || flags.has("--prod");
const values = parseEnv(readFileSync(".env.local", "utf8"));
const selected = [...migratable]
  .filter((name) => values.get(name))
  .map((name) => [name, values.get(name)]);

console.log(`Convex env migration: target=${target}, mode=${apply ? "apply" : "dry-run"}`);
for (const [name] of selected) {
  const role = bootstrap.has(name) ? "bootstrap+convex" : "convex";
  console.log(`${name}: SET (${role})`);
}
for (const name of obsolete) {
  if (values.get(name)) console.log(`${name}: OBSOLETE (not migrated)`);
}
for (const name of values.keys()) {
  if (name.startsWith("NEXT_PUBLIC_") || name === "CONVEX_DEPLOYMENT") {
    console.log(`${name}: LOCAL/BUILD (not migrated)`);
  }
}
if (!apply) {
  console.log(`Dry run complete: ${selected.length} values are eligible.`);
  process.exit(0);
}
if (target === "prod") {
  const prompt = createInterface({ input: stdin, output: stdout });
  const answer = await prompt.question("Type production to update Convex production: ");
  prompt.close();
  if (answer.trim() !== "production") throw new Error("Production migration cancelled");
}

for (const [name, value] of selected) {
  const args = ["convex", "env", "set", name, `--deployment=${target}`];
  const result = spawnSync("npx", args, {
    input: value,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.status !== 0) throw new Error(`Unable to set ${name} in Convex ${target}`);
  const fetched = spawnSync(
    "npx",
    ["convex", "env", "get", name, `--deployment=${target}`],
    { encoding: "utf8", shell: process.platform === "win32" },
  );
  if (fetched.status !== 0 || digest(fetched.stdout.trim()) !== digest(value)) {
    throw new Error(`Hash verification failed for ${name}`);
  }
  console.log(`${name}: VERIFIED`);
}
console.log(`Migration complete: ${selected.length} values verified in Convex ${target}.`);

function parseEnv(source) {
  const result = new Map();
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result.set(match[1], value);
  }
  return result;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
