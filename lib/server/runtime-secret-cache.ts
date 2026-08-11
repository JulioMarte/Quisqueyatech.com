import type { RuntimeConfig } from "@/lib/server/runtime-config";

let secrets: RuntimeConfig = {};

export function rememberRuntimeSecrets(config: RuntimeConfig) {
  secrets = { ...secrets, ...config };
}

export function runtimeSecret(name: string) {
  const value = secrets[name];
  return typeof value === "string" ? value.trim() : "";
}
