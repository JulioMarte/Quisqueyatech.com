PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schemaMigrations (
  version TEXT PRIMARY KEY,
  appliedAt INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  assessmentId TEXT,
  bookingId TEXT,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  company TEXT,
  role TEXT,
  notes TEXT,
  country TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('es','en')),
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  processingConsentAt REAL NOT NULL,
  leadExpiresAt REAL NOT NULL,
  createdAt REAL NOT NULL,
  updatedAt REAL NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS leads_by_assessment ON leads(assessmentId);
CREATE INDEX IF NOT EXISTS leads_by_booking ON leads(bookingId);
CREATE INDEX IF NOT EXISTS leads_by_email ON leads(email);
CREATE INDEX IF NOT EXISTS leads_by_lead_expires ON leads(leadExpiresAt);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  assessmentId TEXT NOT NULL,
  leadId TEXT NOT NULL REFERENCES leads(id),
  provider TEXT,
  providerSessionId TEXT,
  supportId TEXT,
  providerModel TEXT,
  providerVoice TEXT,
  frameworkVersion TEXT,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  stage TEXT,
  coverageScore REAL,
  snapshot TEXT CHECK (snapshot IS NULL OR json_valid(snapshot)),
  completionReason TEXT,
  resumeTokenHash TEXT,
  resumeExpiresAt REAL,
  finalizationStartedAt REAL,
  finalizationClaimedAt REAL,
  reportDraft TEXT CHECK (reportDraft IS NULL OR json_valid(reportDraft)),
  reportStatus TEXT,
  reportRevision REAL,
  reportContentHash TEXT,
  reportSendKey TEXT,
  reportSendClaimId TEXT,
  reportSendClaimExpiresAt REAL,
  reportSendMessageId TEXT,
  reviewedBy TEXT,
  reviewedAt REAL,
  snapshotReviewedBy TEXT,
  snapshotReviewedAt REAL,
  sentAt REAL,
  sendError TEXT,
  recordingConsentAt REAL NOT NULL,
  consentVersion TEXT,
  audioStorageId TEXT,
  audioExpiresAt REAL NOT NULL,
  transcript TEXT,
  transcriptExpiresAt REAL NOT NULL,
  result TEXT CHECK (result IS NULL OR json_valid(result)),
  durationSeconds REAL,
  createdAt REAL NOT NULL,
  completedAt REAL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS assessments_by_assessment_id ON assessments(assessmentId);
CREATE INDEX IF NOT EXISTS assessments_by_provider_session ON assessments(providerSessionId);
CREATE INDEX IF NOT EXISTS assessments_by_audio_expiry ON assessments(audioExpiresAt);
CREATE INDEX IF NOT EXISTS assessments_by_transcript_expiry ON assessments(transcriptExpiresAt);
CREATE INDEX IF NOT EXISTS assessments_by_report_status ON assessments(reportStatus);

CREATE TABLE IF NOT EXISTS assessmentSessions (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  sessionKey TEXT NOT NULL,
  assessmentId TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerSessionId TEXT,
  supportId TEXT,
  model TEXT,
  voice TEXT,
  frameworkVersion TEXT NOT NULL,
  status TEXT NOT NULL,
  startedAt REAL NOT NULL,
  endedAt REAL,
  durationSeconds REAL,
  completionReason TEXT,
  recoveryKey TEXT,
  replacementSessionKey TEXT,
  canonicalTranscript TEXT,
  report TEXT CHECK (report IS NULL OR json_valid(report))
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS assessmentSessions_by_session_key ON assessmentSessions(sessionKey);
CREATE INDEX IF NOT EXISTS assessmentSessions_by_assessment ON assessmentSessions(assessmentId, startedAt);
CREATE INDEX IF NOT EXISTS assessmentSessions_by_provider_session ON assessmentSessions(providerSessionId);

CREATE TABLE IF NOT EXISTS assessmentTelemetry (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  eventId TEXT NOT NULL,
  assessmentId TEXT NOT NULL,
  supportId TEXT NOT NULL,
  sessionKey TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('worker','client','server')),
  event TEXT NOT NULL,
  turnId TEXT,
  state TEXT,
  code TEXT,
  durationMs REAL,
  recoverable INTEGER CHECK (recoverable IS NULL OR recoverable IN (0,1)),
  createdAt REAL NOT NULL,
  expiresAt REAL NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS assessmentTelemetry_by_event_id ON assessmentTelemetry(eventId);
CREATE INDEX IF NOT EXISTS assessmentTelemetry_by_assessment_time ON assessmentTelemetry(assessmentId, createdAt);
CREATE INDEX IF NOT EXISTS assessmentTelemetry_by_support_time ON assessmentTelemetry(supportId, createdAt);
CREATE INDEX IF NOT EXISTS assessmentTelemetry_by_expires_at ON assessmentTelemetry(expiresAt);

CREATE TABLE IF NOT EXISTS assessmentEvents (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  assessmentId TEXT NOT NULL,
  eventId TEXT NOT NULL,
  sessionKey TEXT,
  reason TEXT NOT NULL,
  input TEXT NOT NULL CHECK (json_valid(input)),
  output TEXT NOT NULL CHECK (json_valid(output)),
  createdAt REAL NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS assessmentEvents_by_assessment_event ON assessmentEvents(assessmentId, eventId);
CREATE INDEX IF NOT EXISTS assessmentEvents_by_assessment_time ON assessmentEvents(assessmentId, createdAt);

CREATE TABLE IF NOT EXISTS assessmentRateLimits (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  key TEXT NOT NULL,
  count REAL NOT NULL,
  resetAt REAL NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS assessmentRateLimits_by_key ON assessmentRateLimits(key);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  bookingId TEXT NOT NULL,
  externalId TEXT,
  leadId TEXT NOT NULL REFERENCES leads(id),
  searchText TEXT,
  start TEXT NOT NULL,
  end TEXT,
  startAt REAL,
  endAt REAL,
  timezone TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('web','phone')),
  status TEXT NOT NULL,
  previousStart TEXT,
  previousStartAt REAL,
  recordingConsentAt REAL,
  createdAt REAL NOT NULL,
  updatedAt REAL NOT NULL,
  callSid TEXT,
  callAttempts REAL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_by_booking_id ON bookings(bookingId);
CREATE INDEX IF NOT EXISTS bookings_by_external_id ON bookings(externalId);
CREATE INDEX IF NOT EXISTS bookings_by_call_sid ON bookings(callSid);
CREATE INDEX IF NOT EXISTS bookings_by_start ON bookings(start);
CREATE INDEX IF NOT EXISTS bookings_by_status_and_start ON bookings(status,start);
CREATE INDEX IF NOT EXISTS bookings_by_start_at ON bookings(startAt);
CREATE INDEX IF NOT EXISTS bookings_by_end_at ON bookings(endAt);
CREATE INDEX IF NOT EXISTS bookings_by_channel_and_start_at ON bookings(channel,startAt);
CREATE INDEX IF NOT EXISTS bookings_by_status_and_start_at ON bookings(status,startAt);
CREATE INDEX IF NOT EXISTS bookings_by_status_channel_start_at ON bookings(status,channel,startAt);

CREATE TABLE IF NOT EXISTS availabilityRules (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  singleton TEXT NOT NULL,
  timezone TEXT NOT NULL,
  durationMinutes REAL NOT NULL,
  bufferMinutes REAL NOT NULL,
  minimumNoticeHours REAL NOT NULL,
  horizonDays REAL NOT NULL,
  weekly TEXT NOT NULL CHECK (json_valid(weekly)),
  updatedBy TEXT NOT NULL,
  updatedAt REAL NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS availabilityRules_by_singleton ON availabilityRules(singleton);

CREATE TABLE IF NOT EXISTS availabilityExceptions (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  date TEXT NOT NULL,
  available INTEGER NOT NULL CHECK (available IN (0,1)),
  start TEXT,
  end TEXT,
  reason TEXT,
  createdBy TEXT NOT NULL,
  createdAt REAL NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS availabilityExceptions_by_date ON availabilityExceptions(date);

CREATE TABLE IF NOT EXISTS bookingAudit (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  bookingId TEXT NOT NULL,
  action TEXT NOT NULL,
  actorEmail TEXT NOT NULL,
  before TEXT CHECK (before IS NULL OR json_valid(before)),
  after TEXT CHECK (after IS NULL OR json_valid(after)),
  createdAt REAL NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS bookingAudit_by_booking_created ON bookingAudit(bookingId,createdAt);

CREATE TABLE IF NOT EXISTS secretSettings (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  key TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  lastFour TEXT NOT NULL,
  version REAL NOT NULL,
  updatedBy TEXT NOT NULL,
  updatedAt REAL NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS secretSettings_by_key ON secretSettings(key);

CREATE TABLE IF NOT EXISTS webhookDeliveries (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  eventId TEXT NOT NULL,
  type TEXT NOT NULL,
  bookingId TEXT,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  status TEXT NOT NULL,
  attempts REAL NOT NULL,
  nextAttemptAt REAL,
  lastStatusCode REAL,
  lastError TEXT,
  leaseId TEXT,
  leaseExpiresAt REAL,
  lastAttemptAt REAL,
  createdAt REAL NOT NULL,
  deliveredAt REAL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS webhookDeliveries_by_event_id ON webhookDeliveries(eventId);
CREATE INDEX IF NOT EXISTS webhookDeliveries_by_status_next_attempt ON webhookDeliveries(status,nextAttemptAt);
CREATE INDEX IF NOT EXISTS webhookDeliveries_by_booking_id ON webhookDeliveries(bookingId);

CREATE TABLE IF NOT EXISTS webhookDeliveryAttempts (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  deliveryId TEXT NOT NULL REFERENCES webhookDeliveries(id) ON DELETE CASCADE,
  eventId TEXT NOT NULL,
  attempt REAL NOT NULL,
  manual INTEGER NOT NULL CHECK (manual IN (0,1)),
  requestedAt REAL NOT NULL,
  completedAt REAL,
  success INTEGER CHECK (success IS NULL OR success IN (0,1)),
  statusCode REAL,
  error TEXT,
  durationMs REAL,
  leaseId TEXT NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS webhookDeliveryAttempts_by_delivery_attempt ON webhookDeliveryAttempts(deliveryId,attempt);
CREATE INDEX IF NOT EXISTS webhookDeliveryAttempts_by_event_requested ON webhookDeliveryAttempts(eventId,requestedAt);

CREATE TABLE IF NOT EXISTS configurationAudit (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  actorEmail TEXT NOT NULL,
  changedFields TEXT NOT NULL CHECK (json_valid(changedFields)),
  changedSecretKeys TEXT NOT NULL CHECK (json_valid(changedSecretKeys)),
  createdAt REAL NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS configurationAudit_by_created_at ON configurationAudit(createdAt);

CREATE TABLE IF NOT EXISTS webhookEvents (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  eventId TEXT NOT NULL,
  provider TEXT NOT NULL,
  event TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts REAL NOT NULL,
  error TEXT,
  requestId TEXT,
  receivedAt REAL NOT NULL,
  processedAt REAL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS webhookEvents_by_event_id ON webhookEvents(eventId);
CREATE INDEX IF NOT EXISTS webhookEvents_by_received_at ON webhookEvents(receivedAt);

CREATE TABLE IF NOT EXISTS voiceMetrics (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  assessmentId TEXT NOT NULL,
  provider TEXT NOT NULL,
  completion INTEGER NOT NULL CHECK (completion IN (0,1)),
  extractionScore REAL,
  latencyMs REAL,
  languageScore REAL,
  costUsd REAL,
  createdAt REAL NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS voiceMetrics_by_provider ON voiceMetrics(provider);
CREATE INDEX IF NOT EXISTS voiceMetrics_by_assessment ON voiceMetrics(assessmentId);
