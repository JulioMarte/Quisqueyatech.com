import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SQLiteDatabase } from "../../src/server/db/sqlite";
import { FunnelService } from "../../src/server/services/funnel";
import { RetentionService } from "../../src/server/services/retention";

const NOW = 1_800_000_000_000;

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-retention-"));
  const database = new SQLiteDatabase({ path: join(directory, "test.sqlite") });
  return {
    directory,
    database,
    retention: new RetentionService(database),
    funnel: new FunnelService(database),
    close() {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

function insertLead(db: SQLiteDatabase, id: string, assessmentId: string | null, bookingId: string | null, expiresAt: number) {
  db.prepare(`INSERT INTO leads(
    id,assessmentId,bookingId,firstName,lastName,country,locale,email,phone,source,status,
    processingConsentAt,leadExpiresAt,createdAt,updatedAt
  ) VALUES (?,?,?,?,?,'DO','es','a@example.com','+18095550000','test','active',?,?,?,?)`).run(
    id,assessmentId,bookingId,'Ana','Perez',NOW - 1000,expiresAt,NOW - 1000,NOW - 1000,
  );
}

test("funnel service preserves the historical event allow-list", () => {
  const f = fixture();
  try {
    const id = f.funnel.track({ sessionId: "session-1", locale: "es", name: "assessment_started", assessmentId: "assessment-1", path: "/evaluacion/ahora", createdAt: NOW });
    assert.equal((f.database.prepare("SELECT name FROM funnelEvents WHERE id=?").get(id) as { name: string }).name, "assessment_started");
    assert.throws(() => f.funnel.track({ sessionId: "s", locale: "es", name: "arbitrary", createdAt: NOW }), /INVALID_FUNNEL_EVENT/);
  } finally { f.close(); }
});

test("expired booking leads cascade without orphan bookings", () => {
  const f = fixture();
  try {
    insertLead(f.database, "lead-booking", null, "booking-1", NOW - 1);
    f.database.prepare(`INSERT INTO bookings(id,bookingId,leadId,start,startAt,endAt,timezone,channel,status,createdAt,updatedAt)
      VALUES ('booking-row','booking-1','lead-booking','2027-01-01T12:00:00.000Z',1,2,'America/Santo_Domingo','web','confirmed',?,?)`).run(NOW - 1000,NOW - 1000);
    const result = f.retention.cleanup(NOW);
    assert.equal(result.deletedLeads, 1);
    assert.equal((f.database.prepare("SELECT count(*) AS count FROM bookings").get() as { count: number }).count, 0);
  } finally { f.close(); }
});

test("expired assessment lead removes dependent rows and stored audio", () => {
  const f = fixture();
  try {
    const audioPath = join(f.directory, "audio.bin");
    writeFileSync(audioPath, "audio");
    f.database.prepare("INSERT INTO storageObjects(id,path) VALUES ('audio-1',?)").run(audioPath);
    insertLead(f.database, "lead-assessment", "assessment-1", null, NOW - 1);
    f.database.prepare(`INSERT INTO assessments(id,assessmentId,leadId,mode,status,recordingConsentAt,audioStorageId,audioExpiresAt,transcript,transcriptExpiresAt,createdAt)
      VALUES ('assessment-row','assessment-1','lead-assessment','voice','completed',?,'audio-1',?,'secret transcript',?,?)`).run(NOW - 1000,NOW + 100000,NOW + 100000,NOW - 1000);
    f.database.prepare(`INSERT INTO assessmentSessions(id,sessionKey,assessmentId,provider,frameworkVersion,status,startedAt,canonicalTranscript)
      VALUES ('session-row','session-1','assessment-1','livekit','v1','ended',?,'session transcript')`).run(NOW - 1000);
    f.database.prepare("INSERT INTO assessmentEvents(id,assessmentId,eventId,reason,input,output,createdAt) VALUES ('event-row','assessment-1','event-1','answer','{}','{}',?)").run(NOW - 1000);
    f.database.prepare(`INSERT INTO assessmentTelemetry(id,eventId,assessmentId,supportId,sessionKey,source,event,createdAt,expiresAt)
      VALUES ('telemetry-row','t-1','assessment-1','support','session-1','server','x',?,?)`).run(NOW - 1000,NOW + 100000);
    f.database.prepare("INSERT INTO voiceMetrics(id,assessmentId,provider,completion,createdAt) VALUES ('metric-row','assessment-1','livekit',1,?)").run(NOW - 1000);

    f.retention.cleanup(NOW);
    assert.equal(existsSync(audioPath), false);
    for (const table of ["leads","assessments","assessmentSessions","assessmentEvents","assessmentTelemetry","voiceMetrics","storageObjects"]) {
      assert.equal((f.database.prepare(`SELECT count(*) AS count FROM ${table}`).get() as { count: number }).count, 0, table);
    }
  } finally { f.close(); }
});

test("bounded cleanup scrubs transcripts and expired operational records", () => {
  const f = fixture();
  try {
    insertLead(f.database, "lead-keep", "assessment-keep", null, NOW + 100000);
    f.database.prepare(`INSERT INTO assessments(id,assessmentId,leadId,mode,status,recordingConsentAt,audioExpiresAt,transcript,transcriptExpiresAt,createdAt)
      VALUES ('assessment-keep-row','assessment-keep','lead-keep','voice','completed',?,?,'private transcript',?,?)`).run(NOW - 1000,NOW + 100000,NOW - 1,NOW - 1000);
    f.database.prepare(`INSERT INTO assessmentSessions(id,sessionKey,assessmentId,provider,frameworkVersion,status,startedAt,canonicalTranscript)
      VALUES ('session-keep','session-keep','assessment-keep','livekit','v1','ended',?,'private session transcript')`).run(NOW - 1000);
    f.database.prepare(`INSERT INTO assessmentTelemetry(id,eventId,assessmentId,supportId,sessionKey,source,event,createdAt,expiresAt)
      VALUES ('expired-t','expired-t','other','support','session','server','x',?,?)`).run(NOW - 1000,NOW - 1);
    f.database.prepare("INSERT INTO webhookEvents(id,eventId,provider,event,payload,status,attempts,receivedAt) VALUES ('old-hook','old-hook','test','x','{}','processed',1,?)").run(NOW - 91 * 86_400_000);
    const mediaPath = join(f.directory, "media.bin");
    writeFileSync(mediaPath, "media");
    f.database.prepare("INSERT INTO storageObjects(id,path) VALUES ('media-storage',?)").run(mediaPath);
    f.database.prepare("INSERT INTO media(id,storageId,filename,contentType,purpose,ownerEmail,expiresAt,createdAt) VALUES ('media-1','media-storage','x.bin','application/octet-stream','temp','a@example.com',?,?)").run(NOW - 1,NOW - 1000);
    f.database.prepare("INSERT INTO apiIdempotency(id,scope,key,value,expiresAt,createdAt) VALUES ('idem-1','test','key','{}',?,?)").run(NOW - 1,NOW - 1000);

    const result = f.retention.cleanup(NOW);
    assert.deepEqual({
      scrubbedTranscripts: result.scrubbedTranscripts,
      deletedTelemetry: result.deletedTelemetry,
      deletedWebhooks: result.deletedWebhooks,
      deletedMedia: result.deletedMedia,
      deletedIdempotency: result.deletedIdempotency,
    }, { scrubbedTranscripts: 1, deletedTelemetry: 1, deletedWebhooks: 1, deletedMedia: 1, deletedIdempotency: 1 });
    assert.equal((f.database.prepare("SELECT transcript FROM assessments WHERE id='assessment-keep-row'").get() as { transcript: string | null }).transcript, null);
    assert.equal((f.database.prepare("SELECT canonicalTranscript FROM assessmentSessions WHERE id='session-keep'").get() as { canonicalTranscript: string | null }).canonicalTranscript, null);
    assert.equal(existsSync(mediaPath), false);
  } finally { f.close(); }
});
