import { existsSync, unlinkSync } from "node:fs";
import type { SQLiteDatabase } from "../db/sqlite";

const BATCH = 40;

interface StorageRow { id: string; path: string | null }
interface ExpiredAssessment { id: string; assessmentId: string; audioStorageId: string | null; transcript: string | null }
interface ExpiredLead { id: string; assessmentId: string | null }
interface ExpiredMedia { id: string; storageId: string }

export interface RetentionResult {
  deletedLeads: number;
  scrubbedAudio: number;
  scrubbedTranscripts: number;
  deletedWebhooks: number;
  deletedMedia: number;
  deletedIdempotency: number;
  deletedTelemetry: number;
}

export class RetentionService {
  constructor(private readonly database: SQLiteDatabase) {}

  cleanup(now = Date.now()): RetentionResult {
    const result: RetentionResult = {
      deletedLeads: 0,
      scrubbedAudio: 0,
      scrubbedTranscripts: 0,
      deletedWebhooks: 0,
      deletedMedia: 0,
      deletedIdempotency: 0,
      deletedTelemetry: 0,
    };

    result.deletedTelemetry = Number(this.database.prepare(`
      DELETE FROM assessmentTelemetry
      WHERE id IN (SELECT id FROM assessmentTelemetry WHERE expiresAt <= ? ORDER BY expiresAt LIMIT ?)
    `).run(now, BATCH).changes);

    const audioExpired = this.database.prepare(`
      SELECT id,assessmentId,audioStorageId,transcript FROM assessments
      WHERE audioExpiresAt <= ? AND audioStorageId IS NOT NULL
      ORDER BY audioExpiresAt LIMIT ?
    `).all(now, BATCH) as unknown as ExpiredAssessment[];
    for (const assessment of audioExpired) {
      this.deleteStorageObject(assessment.audioStorageId!);
      this.database.prepare("UPDATE assessments SET audioStorageId=NULL WHERE id=?").run(assessment.id);
      result.scrubbedAudio += 1;
    }

    const transcriptExpired = this.database.prepare(`
      SELECT id,assessmentId,audioStorageId,transcript FROM assessments
      WHERE transcriptExpiresAt <= ? AND transcript IS NOT NULL
      ORDER BY transcriptExpiresAt LIMIT ?
    `).all(now, BATCH) as unknown as ExpiredAssessment[];
    for (const assessment of transcriptExpired) {
      this.database.transaction(() => {
        this.database.prepare("UPDATE assessments SET transcript=NULL WHERE id=?").run(assessment.id);
        this.database.prepare("UPDATE assessmentSessions SET canonicalTranscript=NULL WHERE assessmentId=? AND canonicalTranscript IS NOT NULL").run(assessment.assessmentId);
      });
      result.scrubbedTranscripts += 1;
    }

    const expiredLeads = this.database.prepare(`
      SELECT id,assessmentId FROM leads WHERE leadExpiresAt <= ? ORDER BY leadExpiresAt LIMIT ?
    `).all(now, BATCH) as unknown as ExpiredLead[];
    for (const lead of expiredLeads) {
      this.database.transaction(() => {
        if (lead.assessmentId) {
          const assessment = this.database.prepare("SELECT id,audioStorageId FROM assessments WHERE assessmentId=? LIMIT 1").get(lead.assessmentId) as
            { id: string; audioStorageId: string | null } | undefined;
          if (assessment) {
            if (assessment.audioStorageId) this.deleteStorageObject(assessment.audioStorageId);
            this.database.prepare("DELETE FROM assessmentSessions WHERE assessmentId=?").run(lead.assessmentId);
            this.database.prepare("DELETE FROM assessmentEvents WHERE assessmentId=?").run(lead.assessmentId);
            this.database.prepare("DELETE FROM voiceMetrics WHERE assessmentId=?").run(lead.assessmentId);
            this.database.prepare("DELETE FROM assessmentTelemetry WHERE assessmentId=?").run(lead.assessmentId);
            this.database.prepare("DELETE FROM assessments WHERE id=?").run(assessment.id);
          }
        }
        // Bookings reference leads with ON DELETE CASCADE. This deliberately avoids the orphaned
        // document state that was possible in Convex when retention removed a booking lead.
        this.database.prepare("DELETE FROM leads WHERE id=?").run(lead.id);
      });
      result.deletedLeads += 1;
    }

    const webhookCutoff = now - 90 * 24 * 60 * 60_000;
    result.deletedWebhooks = Number(this.database.prepare(`
      DELETE FROM webhookEvents
      WHERE id IN (SELECT id FROM webhookEvents WHERE receivedAt <= ? ORDER BY receivedAt LIMIT ?)
    `).run(webhookCutoff, BATCH).changes);

    const expiredMedia = this.database.prepare(`
      SELECT id,storageId FROM media
      WHERE expiresAt IS NOT NULL AND expiresAt > 0 AND expiresAt <= ?
      ORDER BY expiresAt LIMIT ?
    `).all(now, BATCH) as unknown as ExpiredMedia[];
    for (const media of expiredMedia) {
      this.deleteStorageObject(media.storageId);
      this.database.prepare("DELETE FROM media WHERE id=?").run(media.id);
      result.deletedMedia += 1;
    }

    result.deletedIdempotency = Number(this.database.prepare(`
      DELETE FROM apiIdempotency
      WHERE id IN (SELECT id FROM apiIdempotency WHERE expiresAt <= ? ORDER BY expiresAt LIMIT ?)
    `).run(now, BATCH).changes);

    return result;
  }

  private deleteStorageObject(storageId: string) {
    const storage = this.database.prepare("SELECT id,path FROM storageObjects WHERE id=? LIMIT 1").get(storageId) as StorageRow | undefined;
    if (!storage) return;
    if (storage.path && existsSync(storage.path)) unlinkSync(storage.path);
    this.database.prepare("DELETE FROM storageObjects WHERE id=?").run(storage.id);
  }
}
