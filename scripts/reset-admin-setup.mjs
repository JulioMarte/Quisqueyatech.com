import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error("Uso:\n  npm run admin:reset-setup -- --prod\n  npm run admin:reset-setup -- --deployment <nombre|referencia>");
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
    } else {
      usage(`argumento desconocido: ${argument}`);
    }
  }
  if (!target) usage("debes indicar --prod o --deployment; el destino nunca se infiere");
  return target;
}

const target = parseTarget(process.argv.slice(2));
const confirmation = `RESET ${target.label}`;
console.log("\nEsta operación elimina la cuenta administrativa, credenciales, sesiones y códigos de recuperación.");
console.log("Conserva contenido, evaluaciones, medios y agentes. El proceso puede reintentarse si se interrumpe.\n");

if (!stdin.isTTY) usage("la confirmación requiere una terminal interactiva");
const prompt = createInterface({ input: stdin, output: stdout });
const answer = await prompt.question(`Escribe exactamente \"${confirmation}\" para continuar: `);
prompt.close();
if (answer !== confirmation) usage("confirmación incorrecta; no se modificó nada");

// Invoke the installed JavaScript entrypoint through the current Node binary.
// Spawning npx.cmd directly fails with EINVAL on some Windows Node versions.
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

const resetToken = randomBytes(32).toString("base64url");
const resetExpiresAt = Date.now() + 5 * 60_000;
const setupCode = randomBytes(32).toString("base64url");
let resetCompleted = false;
let setupCodeInstalled = false;
let failure = null;

try {
  console.log("\nInstalando autorización efímera de reset...");
  convex(["env", "set", "ADMIN_SETUP_RESET_TOKEN", `${resetToken}:${resetExpiresAt}`]);
  console.log("Revocando la identidad administrativa...");
  convex(["run", "adminReset:resetAdminSetup", JSON.stringify({ resetToken, confirmation: "RESET_ADMIN_SETUP" }), "--typecheck", "disable"]);
  resetCompleted = true;
  console.log("Instalando un nuevo ADMIN_SETUP_CODE...");
  convex(["env", "set", "ADMIN_SETUP_CODE", setupCode]);
  setupCodeInstalled = true;
} catch (error) {
  failure = error;
} finally {
  try {
    convex(["env", "remove", "ADMIN_SETUP_RESET_TOKEN"], { capture: true });
  } catch (error) {
    console.error(`ADVERTENCIA: no se pudo retirar el token efímero: ${error.message}`);
    console.error("Caduca automáticamente en cinco minutos; también puedes retirarlo con `npx convex env remove ADMIN_SETUP_RESET_TOKEN` usando el mismo destino.");
  }
}

if (failure) {
  console.error(`\nEl comando no terminó: ${failure instanceof Error ? failure.message : String(failure)}`);
}
if (resetCompleted && !setupCodeInstalled) {
  console.error("\nEl reset terminó, pero no se pudo instalar el nuevo setup code.");
  console.error(`Configúralo manualmente como ADMIN_SETUP_CODE con este valor: ${setupCode}`);
}
if (failure || !resetCompleted || !setupCodeInstalled) {
  process.exit(1);
}

console.log("\nReset completado. El deployment está listo para abrir /setup.");
console.log(`Nuevo ADMIN_SETUP_CODE (se muestra una sola vez): ${setupCode}`);
console.log("Después de crear la cuenta y guardar los ocho códigos de recuperación, elimina ADMIN_SETUP_CODE del deployment.");
