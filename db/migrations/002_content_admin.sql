PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  locale TEXT NOT NULL CHECK (locale IN ('es','en')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS categories_by_locale_slug ON categories(locale,slug);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  locale TEXT NOT NULL CHECK (locale IN ('es','en')),
  slug TEXT NOT NULL,
  translationKey TEXT,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  categoryId TEXT REFERENCES categories(id) ON DELETE SET NULL,
  category TEXT,
  body TEXT NOT NULL,
  imageId TEXT,
  imageAlt TEXT,
  seoTitle TEXT,
  seoDescription TEXT,
  readingMinutes REAL,
  featured INTEGER CHECK (featured IS NULL OR featured IN (0,1)),
  status TEXT NOT NULL CHECK (status IN ('draft','review_pending','scheduled','published','archived')),
  publishedAt REAL,
  authorEmail TEXT NOT NULL,
  actorType TEXT CHECK (actorType IS NULL OR actorType IN ('admin','agent','system')),
  actorId TEXT,
  actorLabel TEXT,
  createdAt REAL NOT NULL,
  updatedAt REAL NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS posts_by_locale_slug ON posts(locale,slug);
CREATE INDEX IF NOT EXISTS posts_by_locale_updated_at ON posts(locale,updatedAt);
CREATE INDEX IF NOT EXISTS posts_by_status_published ON posts(status,publishedAt);
CREATE INDEX IF NOT EXISTS posts_by_locale_status_published ON posts(locale,status,publishedAt);
CREATE INDEX IF NOT EXISTS posts_by_translation_locale ON posts(translationKey,locale);
CREATE INDEX IF NOT EXISTS posts_by_image_id ON posts(imageId);

CREATE TABLE IF NOT EXISTS storageObjects (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  sha256 TEXT,
  size REAL,
  contentType TEXT,
  path TEXT,
  metadata TEXT CHECK (metadata IS NULL OR json_valid(metadata))
) STRICT;

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  storageId TEXT NOT NULL,
  filename TEXT NOT NULL,
  contentType TEXT NOT NULL,
  purpose TEXT NOT NULL,
  ownerEmail TEXT NOT NULL,
  lifecycle TEXT CHECK (lifecycle IS NULL OR lifecycle IN ('temporary','permanent','orphaned')),
  associatedPostId TEXT REFERENCES posts(id) ON DELETE SET NULL,
  expiresAt REAL,
  createdAt REAL NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS media_by_storage_id ON media(storageId);
CREATE INDEX IF NOT EXISTS media_by_expiry ON media(expiresAt);

CREATE TABLE IF NOT EXISTS postRevisions (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  postId TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  snapshot TEXT NOT NULL CHECK (json_valid(snapshot)),
  reason TEXT NOT NULL,
  actorEmail TEXT NOT NULL,
  actorType TEXT CHECK (actorType IS NULL OR actorType IN ('admin','agent','system')),
  actorId TEXT,
  actorLabel TEXT,
  createdAt REAL NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS postRevisions_by_post_created ON postRevisions(postId,createdAt);

CREATE TABLE IF NOT EXISTS aiRuns (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  postId TEXT REFERENCES posts(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  warnings TEXT NOT NULL CHECK (json_valid(warnings)),
  inputTokens REAL,
  outputTokens REAL,
  durationMs REAL NOT NULL,
  actorEmail TEXT NOT NULL,
  createdAt REAL NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS aiRuns_by_post_created ON aiRuns(postId,createdAt);

CREATE TABLE IF NOT EXISTS apiIdempotency (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL CHECK (json_valid(value)),
  expiresAt REAL NOT NULL,
  createdAt REAL NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS apiIdempotency_by_scope_key ON apiIdempotency(scope,key);
CREATE INDEX IF NOT EXISTS apiIdempotency_by_expiry ON apiIdempotency(expiresAt);

CREATE TABLE IF NOT EXISTS funnelEvents (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  sessionId TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('es','en')),
  name TEXT NOT NULL,
  assessmentId TEXT,
  bookingId TEXT,
  path TEXT,
  createdAt REAL NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS funnelEvents_by_name_time ON funnelEvents(name,createdAt);

CREATE TABLE IF NOT EXISTS systemSettings (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  key TEXT NOT NULL,
  value TEXT NOT NULL CHECK (json_valid(value)),
  updatedBy TEXT NOT NULL,
  updatedAt REAL NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS systemSettings_by_key ON systemSettings(key);

CREATE TABLE IF NOT EXISTS adminInstallation (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  singleton TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('provisioning','configured')),
  claimExpiresAt REAL,
  adminUserId TEXT,
  adminEmail TEXT,
  adminName TEXT,
  configuredAt REAL,
  updatedAt REAL NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS adminInstallation_by_singleton ON adminInstallation(singleton);

CREATE TABLE IF NOT EXISTS adminRecoveryCodes (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  userId TEXT NOT NULL,
  codeHash TEXT NOT NULL,
  createdAt REAL NOT NULL,
  claimedAt REAL,
  claimExpiresAt REAL,
  consumedAt REAL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS adminRecoveryCodes_by_code_hash ON adminRecoveryCodes(codeHash);
CREATE INDEX IF NOT EXISTS adminRecoveryCodes_by_user_id ON adminRecoveryCodes(userId);

CREATE TABLE IF NOT EXISTS contentAgents (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  keyId TEXT NOT NULL,
  name TEXT NOT NULL,
  tokenHash TEXT NOT NULL,
  prefix TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','active','revoked')),
  requestLimit REAL NOT NULL,
  uploadLimit REAL NOT NULL,
  createdBy TEXT NOT NULL,
  createdAt REAL NOT NULL,
  rotatedAt REAL,
  revokedAt REAL,
  lastUsedAt REAL,
  pendingTokenHash TEXT,
  pendingPrefix TEXT,
  pendingActivationId TEXT,
  pendingExpiresAt REAL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS contentAgents_by_key_id ON contentAgents(keyId);
CREATE INDEX IF NOT EXISTS contentAgents_by_token_hash ON contentAgents(tokenHash);
CREATE INDEX IF NOT EXISTS contentAgents_by_pending_expiry ON contentAgents(pendingExpiresAt);

CREATE TABLE IF NOT EXISTS contentAgentRateLimits (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  key TEXT NOT NULL,
  count REAL NOT NULL,
  resetAt REAL NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS contentAgentRateLimits_by_key ON contentAgentRateLimits(key);
CREATE INDEX IF NOT EXISTS contentAgentRateLimits_by_reset_at ON contentAgentRateLimits(resetAt);

CREATE TABLE IF NOT EXISTS authSecurityRateLimits (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  key TEXT NOT NULL,
  count REAL NOT NULL,
  resetAt REAL NOT NULL
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS authSecurityRateLimits_by_key ON authSecurityRateLimits(key);
CREATE INDEX IF NOT EXISTS authSecurityRateLimits_by_reset_at ON authSecurityRateLimits(resetAt);
