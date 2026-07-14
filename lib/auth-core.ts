import { createHash } from "node:crypto";
export function tokenHash(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function safeReturnTo(value: unknown) { return typeof value === "string" && (value === "/admin" || value.startsWith("/admin?")) ? value : "/admin"; }
export function isAgentToken(value: string) { return /^qta_[A-Za-z0-9_-]{8,32}_[A-Za-z0-9_-]{40,}$/.test(value); }
