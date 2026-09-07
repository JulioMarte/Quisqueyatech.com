DROP TRIGGER IF EXISTS bookings_search_insert;
DROP TRIGGER IF EXISTS bookings_search_delete;
DROP TRIGGER IF EXISTS bookings_search_update;
DROP TABLE IF EXISTS bookingsSearch;

CREATE TABLE bookings_next (
  id TEXT PRIMARY KEY,
  creationTime REAL,
  bookingId TEXT NOT NULL,
  externalId TEXT,
  leadId TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
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

INSERT INTO bookings_next(
  id,creationTime,bookingId,externalId,leadId,searchText,start,end,startAt,endAt,timezone,channel,status,
  previousStart,previousStartAt,recordingConsentAt,createdAt,updatedAt,callSid,callAttempts
)
SELECT
  id,creationTime,bookingId,externalId,leadId,searchText,start,end,startAt,endAt,timezone,channel,status,
  previousStart,previousStartAt,recordingConsentAt,createdAt,updatedAt,callSid,callAttempts
FROM bookings;

DROP TABLE bookings;
ALTER TABLE bookings_next RENAME TO bookings;

CREATE UNIQUE INDEX bookings_by_booking_id ON bookings(bookingId);
CREATE INDEX bookings_by_external_id ON bookings(externalId);
CREATE INDEX bookings_by_call_sid ON bookings(callSid);
CREATE INDEX bookings_by_start ON bookings(start);
CREATE INDEX bookings_by_status_and_start ON bookings(status,start);
CREATE INDEX bookings_by_start_at ON bookings(startAt);
CREATE INDEX bookings_by_end_at ON bookings(endAt);
CREATE INDEX bookings_by_channel_and_start_at ON bookings(channel,startAt);
CREATE INDEX bookings_by_status_and_start_at ON bookings(status,startAt);
CREATE INDEX bookings_by_status_channel_start_at ON bookings(status,channel,startAt);

CREATE VIRTUAL TABLE bookingsSearch USING fts5(
  searchText,
  status UNINDEXED,
  channel UNINDEXED,
  content='bookings',
  content_rowid='rowid'
);
CREATE TRIGGER bookings_search_insert AFTER INSERT ON bookings BEGIN
  INSERT INTO bookingsSearch(rowid,searchText,status,channel)
  VALUES (new.rowid,coalesce(new.searchText,''),new.status,new.channel);
END;
CREATE TRIGGER bookings_search_delete AFTER DELETE ON bookings BEGIN
  INSERT INTO bookingsSearch(bookingsSearch,rowid,searchText,status,channel)
  VALUES ('delete',old.rowid,coalesce(old.searchText,''),old.status,old.channel);
END;
CREATE TRIGGER bookings_search_update AFTER UPDATE ON bookings BEGIN
  INSERT INTO bookingsSearch(bookingsSearch,rowid,searchText,status,channel)
  VALUES ('delete',old.rowid,coalesce(old.searchText,''),old.status,old.channel);
  INSERT INTO bookingsSearch(rowid,searchText,status,channel)
  VALUES (new.rowid,coalesce(new.searchText,''),new.status,new.channel);
END;
INSERT INTO bookingsSearch(bookingsSearch) VALUES ('rebuild');
