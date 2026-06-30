-- Disable foreign key checks during schema creation for clean sequencing
PRAGMA foreign_keys = ON;

-- 1. USERS LAYER
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                         -- Unique UUIDv4 string
    email TEXT UNIQUE NOT NULL,                  -- Enforces individual accounts
    password_hash TEXT NOT NULL,                 -- SHA-256 secure hash output
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. USER SESSIONS (For tracking active auth states)
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,                 -- Unix timestamp integers
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. THE MAIN REPOSITORY (News Pipeline Output)
CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,                         -- Unique UUIDv4 or URL Hash reference
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,                    -- Enforces strict uniqueness across ingestion
    source_name TEXT NOT NULL,                   -- e.g., 'Reuters', 'Associated Press'
    raw_content TEXT NOT NULL,                   -- The full article text for the viewer
    ai_summary TEXT NOT NULL,                    -- The custom 3-sentence TL;DR briefing
    category TEXT DEFAULT 'General',             -- Classified vertical (e.g., Cyber, Tech, Geopolitics)
    published_at TEXT NOT NULL,                  -- ISO8601 creation string
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. TRUST ENGINE ENVELOPE (1:1 with Articles)
CREATE TABLE IF NOT EXISTS trust_analysis (
    article_id TEXT PRIMARY KEY,
    confidence_score REAL NOT NULL,              -- Precision float (e.g., 0.94)
    is_primary_source INTEGER DEFAULT 0,         -- SQLite boolean surrogate (0 or 1)
    fact_vs_opinion_ratio REAL NOT NULL,         -- Score representing analytical objectivity
    developing_story INTEGER DEFAULT 0,          -- 1 if a fluid situation, 0 if settled
    trust_explanation TEXT NOT NULL,             -- Custom Markdown text explaining the metric
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 5. AI SOCIAL ENRICHMENT (1:1 with Articles)
CREATE TABLE IF NOT EXISTS article_enrichments (
    article_id TEXT PRIMARY KEY,
    conversation_starters TEXT NOT NULL,         -- Stored JSON array format: ["Prompt 1", "Prompt 2"]
    rabbit_hole_data TEXT NOT NULL,              -- Stored JSON structural tree object
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 6. USER INTERACTIONS & BOOKMARKS (Many-to-Many Relational Ledger)
CREATE TABLE IF NOT EXISTS reading_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    is_bookmarked INTEGER DEFAULT 0,             -- 0 or 1
    clicked_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- --- INDEX ARCHITECTURE (CRITICAL FOR PERFORMANCE AT THE EDGE) ---
-- Speeds up the 6 AM cron check when confirming duplicate URLs
CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url);

-- Speeds up your feed queries when fetching the 10 most recent briefings
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);

-- Optimizes reading lists and history dashboards per user lookup
CREATE INDEX IF NOT EXISTS idx_history_user_lookup ON reading_history(user_id);