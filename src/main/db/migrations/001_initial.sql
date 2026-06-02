PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS threads (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'scheduled', 'posting', 'posted', 'failed')),
    scheduled_at    TEXT,
    posted_at       TEXT,
    first_tweet_id  TEXT,
    error_message   TEXT,
    ai_prompt       TEXT,
    ai_style        TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tweets (
    id              TEXT PRIMARY KEY,
    thread_id       TEXT NOT NULL,
    position        INTEGER NOT NULL,
    content         TEXT NOT NULL DEFAULT '',
    x_tweet_id      TEXT,
    posted_at       TEXT,
    error_message   TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tweets_thread_position
    ON tweets(thread_id, position);

CREATE TABLE IF NOT EXISTS media (
    id              TEXT PRIMARY KEY,
    tweet_id        TEXT NOT NULL,
    file_path       TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    file_size       INTEGER NOT NULL,
    width           INTEGER,
    height          INTEGER,
    position        INTEGER NOT NULL DEFAULT 0,
    x_media_id      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tweet_id) REFERENCES tweets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_tweet
    ON media(tweet_id, position);

CREATE TABLE IF NOT EXISTS settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    encrypted       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS _migrations (
    version         INTEGER PRIMARY KEY,
    applied_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
