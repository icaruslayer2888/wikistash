-- =============================================================================
-- Migration: 0001_init.sql
-- Database: Cloudflare D1 (SQLite) for WikiStash
-- Zero Inactivity Pausing, 0-cost persistent storage
-- =============================================================================

CREATE TABLE IF NOT EXISTS articles (
  wikipedia_page_id INTEGER PRIMARY KEY,
  published_date TEXT NOT NULL,
  article_title TEXT NOT NULL,
  wikipedia_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL,
  read_time_minutes INTEGER NOT NULL,
  hook TEXT NOT NULL,
  digest_json TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
