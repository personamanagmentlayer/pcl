-- ═══════════════════════════════════════════════════════════════════════════════
-- PCL Registry - SQLite Initial Schema
-- Migration: 001_initial_schema.sql
-- Version: 2.0.0
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- ═══════════════════════════════════════════════════════════════════════════════
--                              TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Artifacts table (main registry storage)
CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('persona', 'team', 'workflow', 'skill')),

    -- Metadata
    name TEXT NOT NULL,
    slug TEXT,
    description TEXT,
    version TEXT NOT NULL,
    author TEXT,
    author_email TEXT,
    organization TEXT,
    license TEXT,
    repository TEXT,
    homepage TEXT,
    custom TEXT DEFAULT '{}', -- JSON string

    -- Source code
    source TEXT NOT NULL,

    -- Statistics
    downloads INTEGER DEFAULT 0,
    stars INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    last_accessed TEXT, -- ISO 8601 datetime

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    published INTEGER DEFAULT 0, -- Boolean (0 or 1)
    deleted INTEGER DEFAULT 0,   -- Boolean (0 or 1)

    -- Constraints
    UNIQUE(slug, deleted) ON CONFLICT ABORT
);

-- Versions table (version history)
CREATE TABLE IF NOT EXISTS versions (
    id TEXT PRIMARY KEY,
    artifact_id TEXT NOT NULL,
    version TEXT NOT NULL,
    source TEXT NOT NULL,
    changelog TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    published INTEGER DEFAULT 0,

    FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE,
    UNIQUE(artifact_id, version)
);

-- Tags table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS tags (
    artifact_id TEXT NOT NULL,
    tag TEXT NOT NULL,

    PRIMARY KEY (artifact_id, tag),
    FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
);

-- Skills table (many-to-many relationship for personas)
CREATE TABLE IF NOT EXISTS skills (
    artifact_id TEXT NOT NULL,
    skill TEXT NOT NULL,

    PRIMARY KEY (artifact_id, skill),
    FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
);

-- Keywords table (many-to-many relationship for search)
CREATE TABLE IF NOT EXISTS keywords (
    artifact_id TEXT NOT NULL,
    keyword TEXT NOT NULL,

    PRIMARY KEY (artifact_id, keyword),
    FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
);

-- Dependencies table (artifact dependencies)
CREATE TABLE IF NOT EXISTS dependencies (
    artifact_id TEXT NOT NULL,
    dependency_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    PRIMARY KEY (artifact_id, dependency_id),
    FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE,
    FOREIGN KEY (dependency_id) REFERENCES artifacts(id) ON DELETE CASCADE,
    CHECK (artifact_id != dependency_id)
);

-- Audit log table (for tracking changes)
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    artifact_id TEXT,
    action TEXT NOT NULL, -- CREATE, READ, UPDATE, DELETE, PUBLISH
    details TEXT, -- JSON string
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL
);

-- ═══════════════════════════════════════════════════════════════════════════════
--                              INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Artifacts indexes
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_artifacts_slug ON artifacts(slug) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_artifacts_author ON artifacts(author) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_artifacts_organization ON artifacts(organization) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_artifacts_published ON artifacts(published) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at ON artifacts(created_at DESC) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_artifacts_updated_at ON artifacts(updated_at DESC) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_artifacts_downloads ON artifacts(downloads DESC) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_artifacts_stars ON artifacts(stars DESC) WHERE deleted = 0;

-- Tags indexes
CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
CREATE INDEX IF NOT EXISTS idx_tags_artifact_id ON tags(artifact_id);

-- Skills indexes
CREATE INDEX IF NOT EXISTS idx_skills_skill ON skills(skill);
CREATE INDEX IF NOT EXISTS idx_skills_artifact_id ON skills(artifact_id);

-- Keywords indexes
CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_keywords_artifact_id ON keywords(artifact_id);

-- Versions indexes
CREATE INDEX IF NOT EXISTS idx_versions_artifact_id ON versions(artifact_id);
CREATE INDEX IF NOT EXISTS idx_versions_created_at ON versions(created_at DESC);

-- Dependencies indexes
CREATE INDEX IF NOT EXISTS idx_dependencies_artifact_id ON dependencies(artifact_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_dependency_id ON dependencies(dependency_id);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_artifact_id ON audit_log(artifact_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
--                              FTS5 FULL-TEXT SEARCH
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS artifacts_fts USING fts5(
    artifact_id UNINDEXED,
    name,
    description,
    author,
    tags,
    skills,
    source,
    content='artifacts',
    content_rowid='rowid',
    tokenize='porter unicode61'
);

-- Triggers to keep FTS5 index in sync with artifacts table
CREATE TRIGGER IF NOT EXISTS artifacts_fts_insert AFTER INSERT ON artifacts BEGIN
    INSERT INTO artifacts_fts(artifact_id, name, description, author, tags, skills, source)
    VALUES (
        new.id,
        new.name,
        new.description,
        new.author,
        (SELECT GROUP_CONCAT(tag, ' ') FROM tags WHERE artifact_id = new.id),
        (SELECT GROUP_CONCAT(skill, ' ') FROM skills WHERE artifact_id = new.id),
        new.source
    );
END;

CREATE TRIGGER IF NOT EXISTS artifacts_fts_delete AFTER DELETE ON artifacts BEGIN
    DELETE FROM artifacts_fts WHERE artifact_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS artifacts_fts_update AFTER UPDATE ON artifacts BEGIN
    DELETE FROM artifacts_fts WHERE artifact_id = old.id;
    INSERT INTO artifacts_fts(artifact_id, name, description, author, tags, skills, source)
    VALUES (
        new.id,
        new.name,
        new.description,
        new.author,
        (SELECT GROUP_CONCAT(tag, ' ') FROM tags WHERE artifact_id = new.id),
        (SELECT GROUP_CONCAT(skill, ' ') FROM skills WHERE artifact_id = new.id),
        new.source
    );
END;

-- Trigger to update tags in FTS index
CREATE TRIGGER IF NOT EXISTS tags_fts_update AFTER INSERT ON tags BEGIN
    DELETE FROM artifacts_fts WHERE artifact_id = new.artifact_id;
    INSERT INTO artifacts_fts(artifact_id, name, description, author, tags, skills, source)
    SELECT
        a.id,
        a.name,
        a.description,
        a.author,
        (SELECT GROUP_CONCAT(tag, ' ') FROM tags WHERE artifact_id = a.id),
        (SELECT GROUP_CONCAT(skill, ' ') FROM skills WHERE artifact_id = a.id),
        a.source
    FROM artifacts a WHERE a.id = new.artifact_id;
END;

-- Trigger to update skills in FTS index
CREATE TRIGGER IF NOT EXISTS skills_fts_update AFTER INSERT ON skills BEGIN
    DELETE FROM artifacts_fts WHERE artifact_id = new.artifact_id;
    INSERT INTO artifacts_fts(artifact_id, name, description, author, tags, skills, source)
    SELECT
        a.id,
        a.name,
        a.description,
        a.author,
        (SELECT GROUP_CONCAT(tag, ' ') FROM tags WHERE artifact_id = a.id),
        (SELECT GROUP_CONCAT(skill, ' ') FROM skills WHERE artifact_id = a.id),
        a.source
    FROM artifacts a WHERE a.id = new.artifact_id;
END;

-- ═══════════════════════════════════════════════════════════════════════════════
--                              TRIGGERS FOR AUTO-UPDATE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at on artifacts
CREATE TRIGGER IF NOT EXISTS trigger_artifacts_updated_at
    AFTER UPDATE ON artifacts
    FOR EACH ROW
BEGIN
    UPDATE artifacts SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Auto-create version snapshots when version changes
CREATE TRIGGER IF NOT EXISTS trigger_artifacts_version_snapshot
    AFTER UPDATE ON artifacts
    FOR EACH ROW
    WHEN OLD.version != NEW.version
BEGIN
    INSERT OR IGNORE INTO versions (id, artifact_id, version, source, published)
    VALUES (
        lower(hex(randomblob(16))),
        OLD.id,
        OLD.version,
        OLD.source,
        OLD.published
    );
END;

-- ═══════════════════════════════════════════════════════════════════════════════
--                              VIEWS
-- ═══════════════════════════════════════════════════════════════════════════════

-- View for artifacts with aggregated tags and skills
CREATE VIEW IF NOT EXISTS artifacts_full AS
SELECT
    a.*,
    (SELECT GROUP_CONCAT(tag, ',') FROM tags WHERE artifact_id = a.id) AS tags,
    (SELECT GROUP_CONCAT(skill, ',') FROM skills WHERE artifact_id = a.id) AS skills,
    (SELECT GROUP_CONCAT(keyword, ',') FROM keywords WHERE artifact_id = a.id) AS keywords
FROM artifacts a;

-- View for published artifacts only
CREATE VIEW IF NOT EXISTS artifacts_published AS
SELECT * FROM artifacts_full WHERE published = 1 AND deleted = 0;

-- ═══════════════════════════════════════════════════════════════════════════════
--                              UTILITY FUNCTIONS (via triggers)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Note: SQLite doesn't have stored procedures like PostgreSQL
-- We implement utility functions as application-level code

-- Optimize database
PRAGMA optimize;

-- Analyze tables for query planner
ANALYZE;
