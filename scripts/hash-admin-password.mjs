import { randomBytes, scrypt } from "node:crypto";
if (!process.stdin.isTTY) throw new Error("Run this script in an interactive terminal.");
process.stdout.write("Administrator password: "); process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding("utf8");
let password = "";
for await (const key of process.stdin) { if (key === "\u0003") process.exit(130); if (key === "\r" || key === "\n") break; if (key === "\u007f" || key === "\b") password = password.slice(0, -1); else password += key; }
process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write("\n");
if (password.length < 14) throw new Error("Use at least 14 characters.");
const N = 32768, r = 8, p = 1, length = 64, salt = randomBytes(16);
scrypt(password, salt, length, { N, r, p, maxmem: 256 * 1024 * 1024 }, (error, derived) => { password = ""; if (error) throw error; process.stdout.write(`ADMIN_PASSWORD_HASH=scrypt$v1$${N}$${r}$${p}$${length}$${salt.toString("base64url")}$${derived.toString("base64url")}\n`); });
