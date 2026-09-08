CREATE VIRTUAL TABLE IF NOT EXISTS bookingsSearch USING fts5(
  searchText,
  status UNINDEXED,
  channel UNINDEXED,
  content='bookings',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS bookings_search_insert AFTER INSERT ON bookings BEGIN
  INSERT INTO bookingsSearch(rowid, searchText, status, channel)
  VALUES (new.rowid, coalesce(new.searchText,''), new.status, new.channel);
END;
CREATE TRIGGER IF NOT EXISTS bookings_search_delete AFTER DELETE ON bookings BEGIN
  INSERT INTO bookingsSearch(bookingsSearch, rowid, searchText, status, channel)
  VALUES ('delete', old.rowid, coalesce(old.searchText,''), old.status, old.channel);
END;
CREATE TRIGGER IF NOT EXISTS bookings_search_update AFTER UPDATE ON bookings BEGIN
  INSERT INTO bookingsSearch(bookingsSearch, rowid, searchText, status, channel)
  VALUES ('delete', old.rowid, coalesce(old.searchText,''), old.status, old.channel);
  INSERT INTO bookingsSearch(rowid, searchText, status, channel)
  VALUES (new.rowid, coalesce(new.searchText,''), new.status, new.channel);
END;

CREATE VIRTUAL TABLE IF NOT EXISTS postsSearch USING fts5(
  title,
  locale UNINDEXED,
  status UNINDEXED,
  content='posts',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS posts_search_insert AFTER INSERT ON posts BEGIN
  INSERT INTO postsSearch(rowid, title, locale, status)
  VALUES (new.rowid, new.title, new.locale, new.status);
END;
CREATE TRIGGER IF NOT EXISTS posts_search_delete AFTER DELETE ON posts BEGIN
  INSERT INTO postsSearch(postsSearch, rowid, title, locale, status)
  VALUES ('delete', old.rowid, old.title, old.locale, old.status);
END;
CREATE TRIGGER IF NOT EXISTS posts_search_update AFTER UPDATE ON posts BEGIN
  INSERT INTO postsSearch(postsSearch, rowid, title, locale, status)
  VALUES ('delete', old.rowid, old.title, old.locale, old.status);
  INSERT INTO postsSearch(rowid, title, locale, status)
  VALUES (new.rowid, new.title, new.locale, new.status);
END;
