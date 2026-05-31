// Persist a stable per-install identifier so `x-whoop-installation-identifier`
// stays constant across restarts — a real app install keeps one ID for its
// whole lifetime, and a value that changed every boot would itself be an
// anomaly. Mirrors how the token store writes back to the .env file.
//
// Best-effort: on read-only filesystems (Cloudflare Workers, locked containers)
// the write is skipped and device.ts falls back to a per-process random ID,
// which is stable for that process's lifetime.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

/**
 * Ensure `WHOOP_INSTALLATION_ID` exists in the environment, generating and
 * persisting one to the env file on first run. Sets `process.env` so device.ts
 * picks it up on its first header build. Idempotent; call once at boot before
 * any request goes out.
 */
export function resolveInstallationId(envPath: string): string {
  const existing = process.env.WHOOP_INSTALLATION_ID;
  if (existing) return existing;

  // The app sends an uppercase UUID; match its shape.
  const id = randomUUID().toUpperCase();
  process.env.WHOOP_INSTALLATION_ID = id;

  try {
    if (existsSync(envPath)) {
      const lines = readFileSync(envPath, "utf8").split("\n");
      if (!lines.some((l) => l.startsWith("WHOOP_INSTALLATION_ID="))) {
        lines.push(`WHOOP_INSTALLATION_ID=${id}`);
        writeFileSync(envPath, lines.join("\n"));
      }
    }
  } catch {
    // Read-only FS — fine. The in-memory process.env value still gives a stable
    // ID for this process's lifetime.
  }
  return id;
}
