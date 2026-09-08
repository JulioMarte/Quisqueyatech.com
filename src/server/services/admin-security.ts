import { randomUUID } from "node:crypto";
import type { SQLiteDatabase } from "../db/sqlite";

interface InstallationRow {
  id: string;
  singleton: string;
  status: "provisioning" | "configured";
  claimExpiresAt: number | null;
  adminUserId: string | null;
  adminEmail: string | null;
  adminName: string | null;
  configuredAt: number | null;
  updatedAt: number;
}

interface RecoveryRow {
  id: string;
  userId: string;
  codeHash: string;
  createdAt: number;
  claimedAt: number | null;
  claimExpiresAt: number | null;
  consumedAt: number | null;
}

interface AgentRow {
  id: string;
  keyId: string;
  name: string;
  tokenHash: string;
  prefix: string;
  status: "pending" | "active" | "revoked";
  requestLimit: number;
  uploadLimit: number;
  createdBy: string;
  createdAt: number;
  rotatedAt: number | null;
  revokedAt: number | null;
  lastUsedAt: number | null;
  pendingTokenHash: string | null;
  pendingPrefix: string | null;
  pendingActivationId: string | null;
  pendingExpiresAt: number | null;
}

function constantTimeEqual(left: string, right: string) {
  const size = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < size; index += 1) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return difference === 0;
}

function clearPendingSql() {
  return "pendingTokenHash=NULL,pendingPrefix=NULL,pendingActivationId=NULL,pendingExpiresAt=NULL";
}

export class AdminSecurityService {
  constructor(private readonly database: SQLiteDatabase) {}

  getInstallation() {
    return this.database.prepare("SELECT * FROM adminInstallation WHERE singleton='admin' LIMIT 1").get() as InstallationRow | undefined;
  }

  setupStatus(now = Date.now(), configuredSetupCode = process.env.ADMIN_SETUP_CODE?.trim() ?? "") {
    const row = this.getInstallation();
    const setupCodeRequired = configuredSetupCode.length >= 24;
    if (!row || (row.status === "provisioning" && (row.claimExpiresAt ?? 0) <= now)) {
      return { status: "uninitialized" as const, setupCodeRequired };
    }
    return { status: row.status, setupCodeRequired };
  }

  claimSetup(code: string, now = Date.now(), configuredSetupCode = process.env.ADMIN_SETUP_CODE?.trim() ?? "") {
    return this.database.transaction(() => {
      if (configuredSetupCode.length >= 24 && !constantTimeEqual(code, configuredSetupCode)) return { ok: false };
      const row = this.getInstallation();
      if (row?.status === "configured" || (row?.status === "provisioning" && (row.claimExpiresAt ?? 0) > now)) return { ok: false };
      if (row) {
        this.database.prepare("UPDATE adminInstallation SET status='provisioning',claimExpiresAt=?,updatedAt=? WHERE id=?").run(now + 120_000, now, row.id);
      } else {
        this.database.prepare(`
          INSERT INTO adminInstallation(id,singleton,status,claimExpiresAt,updatedAt)
          VALUES (?,'admin','provisioning',?,?)
        `).run(randomUUID(), now + 120_000, now);
      }
      return { ok: true };
    });
  }

  finalizeSetup(input: { userId: string; email: string; name: string; recoveryHashes: string[]; now?: number }) {
    const now = input.now ?? Date.now();
    return this.database.transaction(() => {
      const row = this.getInstallation();
      if (
        !row || row.status !== "provisioning" || (row.claimExpiresAt ?? 0) <= now ||
        input.recoveryHashes.length !== 8 || input.recoveryHashes.some((value) => !/^[a-f0-9]{64}$/.test(value))
      ) throw new Error("Setup claim expired");
      this.database.prepare(`
        UPDATE adminInstallation SET status='configured',claimExpiresAt=NULL,adminUserId=?,adminEmail=?,adminName=?,configuredAt=?,updatedAt=? WHERE id=?
      `).run(input.userId, input.email.toLowerCase(), input.name, now, now, row.id);
      for (const codeHash of input.recoveryHashes) {
        this.database.prepare("INSERT INTO adminRecoveryCodes(id,userId,codeHash,createdAt) VALUES (?,?,?,?)").run(randomUUID(), input.userId, codeHash, now);
      }
      return true;
    });
  }

  claimRecoveryCode(codeHash: string, now = Date.now()) {
    return this.database.transaction(() => {
      const code = this.database.prepare("SELECT * FROM adminRecoveryCodes WHERE codeHash=? LIMIT 1").get(codeHash) as RecoveryRow | undefined;
      const installation = this.getInstallation();
      if (!code || code.consumedAt || (code.claimExpiresAt ?? 0) > now || installation?.adminUserId !== code.userId) return null;
      this.database.prepare("UPDATE adminRecoveryCodes SET claimedAt=?,claimExpiresAt=? WHERE id=?").run(now, now + 600_000, code.id);
      return { userId: code.userId, claimedAt: now };
    });
  }

  consumeRecoveryCode(codeHash: string, claimedAt: number, now = Date.now()) {
    return this.database.transaction(() => {
      const code = this.database.prepare("SELECT * FROM adminRecoveryCodes WHERE codeHash=? LIMIT 1").get(codeHash) as RecoveryRow | undefined;
      if (!code || code.claimedAt !== claimedAt || code.consumedAt) return false;
      this.database.prepare("UPDATE adminRecoveryCodes SET consumedAt=?,claimExpiresAt=NULL WHERE id=?").run(now, code.id);
      return true;
    });
  }

  releaseRecoveryCode(codeHash: string, claimedAt: number) {
    return this.database.transaction(() => {
      const code = this.database.prepare("SELECT * FROM adminRecoveryCodes WHERE codeHash=? LIMIT 1").get(codeHash) as RecoveryRow | undefined;
      if (!code || code.claimedAt !== claimedAt || code.consumedAt) return false;
      this.database.prepare("UPDATE adminRecoveryCodes SET claimedAt=NULL,claimExpiresAt=NULL WHERE id=?").run(code.id);
      return true;
    });
  }

  listAgents(now = Date.now()) {
    const rows = this.database.prepare("SELECT * FROM contentAgents ORDER BY createdAt DESC LIMIT 200").all() as unknown as AgentRow[];
    return rows.map((agent) => ({
      id: agent.id,
      keyId: agent.keyId,
      name: agent.name,
      prefix: agent.prefix,
      status: agent.status,
      requestLimit: agent.requestLimit,
      uploadLimit: agent.uploadLimit,
      createdBy: agent.createdBy,
      createdAt: agent.createdAt,
      rotatedAt: agent.rotatedAt,
      revokedAt: agent.revokedAt,
      lastUsedAt: agent.lastUsedAt,
      pendingRotation: Boolean(agent.pendingTokenHash && (agent.pendingExpiresAt ?? 0) > now),
      pendingExpiresAt: agent.pendingExpiresAt,
    }));
  }

  createAgent(input: { keyId: string; name: string; tokenHash: string; prefix: string; activationId: string; requestLimit: number; uploadLimit: number; createdBy: string; now?: number }) {
    const now = input.now ?? Date.now();
    if (!input.keyId || !input.name || !input.tokenHash || !input.prefix || !input.activationId) throw new Error("VALIDATION_ERROR");
    this.validateLimits(input.requestLimit, input.uploadLimit);
    const id = randomUUID();
    this.database.prepare(`
      INSERT INTO contentAgents(
        id,keyId,name,tokenHash,prefix,status,requestLimit,uploadLimit,createdBy,createdAt,
        pendingTokenHash,pendingPrefix,pendingActivationId,pendingExpiresAt
      ) VALUES (?,?,? ,?,'pending','pending',?,?,?,?,?,?,?,?)
    `).run(
      id,input.keyId,input.name,`pending:${input.keyId}`,input.requestLimit,input.uploadLimit,input.createdBy,now,
      input.tokenHash,input.prefix,input.activationId,now + 1_800_000,
    );
    return id;
  }

  revokeAgent(keyId: string, now = Date.now()) {
    const row = this.agent(keyId);
    if (!row) return false;
    this.database.prepare(`UPDATE contentAgents SET status='revoked',revokedAt=?,${clearPendingSql()} WHERE id=?`).run(now, row.id);
    return true;
  }

  prepareAgentRotation(input: { keyId: string; tokenHash: string; prefix: string; activationId: string; now?: number }) {
    const now = input.now ?? Date.now();
    const row = this.agent(input.keyId);
    if (!row || row.status !== "active") return false;
    if (row.pendingTokenHash && (row.pendingExpiresAt ?? 0) > now) throw new Error("CONFLICT: A credential rotation is already pending");
    this.database.prepare(`
      UPDATE contentAgents SET pendingTokenHash=?,pendingPrefix=?,pendingActivationId=?,pendingExpiresAt=? WHERE id=?
    `).run(input.tokenHash, input.prefix, input.activationId, now + 1_800_000, row.id);
    return true;
  }

  activateAgentCredential(keyId: string, activationId: string, now = Date.now()) {
    return this.database.transaction(() => {
      const row = this.agent(keyId);
      if (!row) return false;
      if (!row.pendingTokenHash || !row.pendingPrefix || row.pendingActivationId !== activationId || (row.pendingExpiresAt ?? 0) <= now) {
        throw new Error("CONFLICT: Pending credential expired or does not match");
      }
      this.database.prepare(`
        UPDATE contentAgents SET tokenHash=?,prefix=?,status='active',revokedAt=NULL,rotatedAt=?,${clearPendingSql()} WHERE id=?
      `).run(row.pendingTokenHash, row.pendingPrefix, row.status === "active" ? now : null, row.id);
      return true;
    });
  }

  updateAgentLimits(keyId: string, requestLimit: number, uploadLimit: number) {
    this.validateLimits(requestLimit, uploadLimit);
    const row = this.agent(keyId);
    if (!row) return false;
    this.database.prepare("UPDATE contentAgents SET requestLimit=?,uploadLimit=? WHERE id=?").run(Math.floor(requestLimit), Math.floor(uploadLimit), row.id);
    return true;
  }

  checkSecurityRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
    if (limit < 1 || limit > 10_000 || windowMs < 1_000 || windowMs > 7 * 24 * 60 * 60_000) throw new Error("Invalid rate limit");
    return this.database.transaction(() => {
      const row = this.database.prepare("SELECT id,count,resetAt FROM authSecurityRateLimits WHERE key=? LIMIT 1").get(key) as { id: string; count: number; resetAt: number } | undefined;
      if (!row || row.resetAt <= now) {
        if (row) this.database.prepare("UPDATE authSecurityRateLimits SET count=1,resetAt=? WHERE id=?").run(now + windowMs, row.id);
        else this.database.prepare("INSERT INTO authSecurityRateLimits(id,key,count,resetAt) VALUES (?,?,1,?)").run(randomUUID(), key, now + windowMs);
        return { allowed: true, retryAfter: 0 };
      }
      if (row.count >= limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((row.resetAt - now) / 1000)) };
      this.database.prepare("UPDATE authSecurityRateLimits SET count=count+1 WHERE id=?").run(row.id);
      return { allowed: true, retryAfter: 0 };
    });
  }

  authenticateAgent(tokenHash: string, operation: string, now = Date.now()) {
    return this.database.transaction(() => {
      const agent = this.database.prepare("SELECT * FROM contentAgents WHERE tokenHash=? LIMIT 1").get(tokenHash) as AgentRow | undefined;
      if (!agent || agent.status !== "active") return { status: "unauthorized" as const };
      const window = Math.floor(now / 3_600_000);
      const rateKey = `${agent.keyId}:${operation}:${window}`;
      const rate = this.database.prepare("SELECT id,count,resetAt FROM contentAgentRateLimits WHERE key=? LIMIT 1").get(rateKey) as { id: string; count: number; resetAt: number } | undefined;
      const limit = operation === "upload" ? agent.uploadLimit : agent.requestLimit;
      if (rate && rate.count >= limit) return { status: "limited" as const, retryAfter: Math.ceil((rate.resetAt - now) / 1000) };
      if (rate) this.database.prepare("UPDATE contentAgentRateLimits SET count=count+1 WHERE id=?").run(rate.id);
      else this.database.prepare("INSERT INTO contentAgentRateLimits(id,key,count,resetAt) VALUES (?,?,1,?)").run(randomUUID(), rateKey, (window + 1) * 3_600_000);
      if (!agent.lastUsedAt || now - agent.lastUsedAt > 900_000) this.database.prepare("UPDATE contentAgents SET lastUsedAt=? WHERE id=?").run(now, agent.id);
      return { status: "ok" as const, agent: { keyId: agent.keyId, name: agent.name } };
    });
  }

  cleanup(now = Date.now()) {
    this.database.transaction(() => {
      this.database.prepare("DELETE FROM contentAgentRateLimits WHERE resetAt <= ?").run(now - 3_600_000);
      this.database.prepare("DELETE FROM authSecurityRateLimits WHERE resetAt <= ?").run(now - 3_600_000);
      const expired = this.database.prepare("SELECT * FROM contentAgents WHERE pendingExpiresAt IS NOT NULL AND pendingExpiresAt <= ? LIMIT 100").all(now) as unknown as AgentRow[];
      for (const agent of expired) {
        if (agent.status === "pending") this.database.prepare(`UPDATE contentAgents SET status='revoked',revokedAt=?,${clearPendingSql()} WHERE id=?`).run(now, agent.id);
        else this.database.prepare(`UPDATE contentAgents SET ${clearPendingSql()} WHERE id=?`).run(agent.id);
      }
    });
  }

  private agent(keyId: string) {
    return this.database.prepare("SELECT * FROM contentAgents WHERE keyId=? LIMIT 1").get(keyId) as AgentRow | undefined;
  }

  private validateLimits(requestLimit: number, uploadLimit: number) {
    if (requestLimit < 10 || requestLimit > 1000 || uploadLimit < 1 || uploadLimit > 100) throw new Error("VALIDATION_ERROR: Invalid limits");
  }
}
