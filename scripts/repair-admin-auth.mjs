import { createHmac, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error(
    "Uso:\n  npm run admin:repair-auth -- --prod\n  npm run admin:repair-auth -- --deployment <nombre|referencia>",
  );
  process.exit(2);
}

function parseTarget(argv) {
  let target = null;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--prod") {
      if (target) usage("indica un solo deployment");
      target = { args: ["--prod"], label: "PRODUCTION" };
    } else if (argument === "--deployment") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) usage("falta el valor de --deployment");
      if (target) usage("indica un solo deployment");
      target = { args: ["--deployment", value], label: value };
      index += 1;
    } else usage(`argumento desconocido: ${argument}`);
  }
  if (!target) usage("debes indicar --prod o --deployment; el destino nunca se infiere");
  return target;
}

const target = parseTarget(process.argv.slice(2));
const confirmation = `REPAIR ${target.label}`;
console.log("\nEsta operación regenera únicamente las claves JWT de Better Auth.");
console.log("Conserva la cuenta, contraseña, sesiones, códigos de recuperación y contenido.\n");
if (!stdin.isTTY) usage("la confirmación requiere una terminal interactiva");
const prompt = createInterface({ input: stdin, output: stdout });
const answer = await prompt.question(`Escribe exactamente \"${confirmation}\" para continuar: `);
prompt.close();
if (answer !== confirmation) usage("confirmación incorrecta; no se modificó nada");

const convexCli = fileURLToPath(new URL("../node_modules/convex/bin/main.js", import.meta.url));
function convex(args, { capture = false } = {}) {
  const result = spawnSync(process.execPath, [convexCli, ...args, ...target.args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (capture) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    throw new Error(`Convex terminó con código ${result.status}`);
  }
  return result.stdout?.trim() ?? "";
}

function signedSessionCookie(value, secret) {
  const signature = createHmac("sha256", secret).update(value).digest("base64");
  return encodeURIComponent(`${value}.${signature}`);
}

async function validateJwtRegeneration() {
  const sessions = JSON.parse(
    convex(["data", "session", "--component", "betterAuth", "--limit", "1", "--format", "json"], {
      capture: true,
    }),
  );
  if (!sessions[0]?.token)
    throw new Error(
      "No existe una sesión para validar. Intenta iniciar sesión una vez y repite la reparación.",
    );
  const secret = convex(["env", "get", "BETTER_AUTH_SECRET"], { capture: true });
  const siteUrl = convex(["env", "get", "SITE_URL"], { capture: true });
  const cookie = `better-auth.session_token=${signedSessionCookie(sessions[0].token, secret)}`;
  const tokenResponse = await fetch(new URL("/api/auth/convex/token", siteUrl), {
    headers: { cookie },
    redirect: "manual",
  });
  const tokenBody = await tokenResponse.json().catch(() => null);
  if (
    tokenResponse.status !== 200 ||
    typeof tokenBody?.token !== "string" ||
    tokenBody.token.length < 100
  ) {
    throw new Error(`La regeneración JWT no pudo validarse (HTTP ${tokenResponse.status}).`);
  }
  const adminResponse = await fetch(new URL("/admin", siteUrl), {
    headers: { cookie },
    redirect: "manual",
  });
  if (adminResponse.status !== 200) {
    throw new Error(`El panel todavía no reconoce la sesión (HTTP ${adminResponse.status}).`);
  }
}

const resetToken = randomBytes(32).toString("base64url");
const resetExpiresAt = Date.now() + 5 * 60_000;
let failure = null;
try {
  console.log("\nInstalando autorización efímera de mantenimiento...");
  convex(["env", "set", "ADMIN_SETUP_RESET_TOKEN", `${resetToken}:${resetExpiresAt}`]);
  console.log("Retirando claves JWKS incompatibles...");
  convex([
    "run",
    "adminReset:repairAdminJwks",
    JSON.stringify({ resetToken, confirmation: "REPAIR_ADMIN_JWKS" }),
    "--typecheck",
    "disable",
  ]);
  console.log("Regenerando y validando el token Convex...");
  await validateJwtRegeneration();
} catch (error) {
  failure = error;
} finally {
  try {
    convex(["env", "remove", "ADMIN_SETUP_RESET_TOKEN"], { capture: true });
  } catch (error) {
    console.error(`ADVERTENCIA: no se pudo retirar el token efímero: ${error.message}`);
    console.error("Caduca automáticamente en cinco minutos.");
  }
}

if (failure) {
  console.error(
    `\nLa reparación no terminó: ${failure instanceof Error ? failure.message : String(failure)}`,
  );
  process.exit(1);
}
console.log("\nReparación completada: JWT válido y acceso a /admin confirmado.");
