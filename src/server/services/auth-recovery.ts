import { hashPassword } from "better-auth/crypto";
import type { SQLiteDatabase } from "../db/sqlite";
import { AdminSecurityService } from "./admin-security";

export class AuthRecoveryService {
  private readonly security: AdminSecurityService;

  constructor(private readonly database: SQLiteDatabase) {
    this.security = new AdminSecurityService(database);
  }

  async recover(input: { codeHash: string; newPassword: string; now?: number }) {
    const now = input.now ?? Date.now();
    if (!/^[a-f0-9]{64}$/.test(input.codeHash) || input.newPassword.length < 14 || input.newPassword.length > 128) {
      throw new Error("Invalid recovery request");
    }

    const claim = this.security.claimRecoveryCode(input.codeHash, now);
    if (!claim) throw new Error("Invalid recovery request");

    try {
      const passwordHash = await hashPassword(input.newPassword);
      this.database.transaction(() => {
        const account = this.database.prepare(`
          SELECT id FROM account WHERE userId=? AND providerId='credential' LIMIT 1
        `).get(claim.userId) as { id: string } | undefined;
        if (!account) throw new Error("Invalid recovery request");

        this.database.prepare("UPDATE account SET password=? WHERE id=?").run(passwordHash, account.id);
        this.database.prepare("DELETE FROM session WHERE userId=?").run(claim.userId);
        const consumed = this.database.prepare(`
          UPDATE adminRecoveryCodes
          SET consumedAt=?,claimExpiresAt=NULL
          WHERE codeHash=? AND claimedAt=? AND consumedAt IS NULL
        `).run(now, input.codeHash, claim.claimedAt);
        if (consumed.changes !== 1) throw new Error("Invalid recovery request");
      });
      return { ok: true } as const;
    } catch (error) {
      this.security.releaseRecoveryCode(input.codeHash, claim.claimedAt);
      throw error;
    }
  }
}
