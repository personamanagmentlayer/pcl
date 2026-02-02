-- ═══════════════════════════════════════════════════════════════════════════════
-- PCL Registry - PostgreSQL Initial Schema
-- Migration: 001_initial_schema.sql
-- Version: 2.0.0
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ═══════════════════════════════════════════════════════════════════════════════
--                              ENUMS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TYPE artifact_type AS ENUM ('persona', 'team', 'workflow', 'skill');

-- ═══════════════════════════════════════════════════════════════════════════════
--                              TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Organizations table (for multi-tenancy)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

-- Users table (for authentication and authorization)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

-- Artifacts table (main registry storage)
CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type artifact_type NOT NULL,

    -- Metadata
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    description TEXT,
    version VARCHAR(50) NOT NULL,
    author VARCHAR(255),
    author_email VARCHAR(255),
    organization VARCHAR(255),
    license VARCHAR(100),
    repository VARCHAR(500),
    homepage VARCHAR(500),
    custom JSONB DEFAULT '{}'::JSONB,

    -- Source code
    source TEXT NOT NULL,

    -- Statistics
    downloads BIGINT DEFAULT 0,
    stars BIGINT DEFAULT 0,
    views BIGINT DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published BOOLEAN DEFAULT FALSE,
    deleted BOOLEAN DEFAULT FALSE,

    -- Constraints
    CONSTRAINT unique_slug_not_deleted UNIQUE NULLS NOT DISTINCT (slug, deleted)
);

-- Versions table (version history)
CREATE TABLE IF NOT EXISTS versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    source TEXT NOT NULL,
    changelog TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published BOOLEAN DEFAULT FALSE,

    -- Constraints
    CONSTRAINT unique_artifact_version UNIQUE (artifact_id, version)
);

-- Tags table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS tags (
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,

    PRIMARY KEY (artifact_id, tag)
);

-- Skills table (many-to-many relationship for personas)
CREATE TABLE IF NOT EXISTS skills (
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    skill VARCHAR(100) NOT NULL,

    PRIMARY KEY (artifact_id, skill)
);

-- Keywords table (many-to-many relationship for search)
CREATE TABLE IF NOT EXISTS keywords (
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,

    PRIMARY KEY (artifact_id, keyword)
);

-- Dependencies table (artifact dependencies)
CREATE TABLE IF NOT EXISTS dependencies (
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    dependency_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (artifact_id, dependency_id),
    CONSTRAINT no_self_dependency CHECK (artifact_id != dependency_id)
);

-- Audit log table (for tracking changes)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    artifact_id UUID REFERENCES artifacts(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- CREATE, READ, UPDATE, DELETE, PUBLISH
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
--                              INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Artifacts indexes
CREATE INDEX idx_artifacts_type ON artifacts(type) WHERE deleted = FALSE;
CREATE INDEX idx_artifacts_slug ON artifacts(slug) WHERE deleted = FALSE;
CREATE INDEX idx_artifacts_author ON artifacts(author) WHERE deleted = FALSE;
CREATE INDEX idx_artifacts_organization ON artifacts(organization) WHERE deleted = FALSE;
CREATE INDEX idx_artifacts_published ON artifacts(published) WHERE deleted = FALSE;
CREATE INDEX idx_artifacts_created_at ON artifacts(created_at DESC) WHERE deleted = FALSE;
CREATE INDEX idx_artifacts_updated_at ON artifacts(updated_at DESC) WHERE deleted = FALSE;
CREATE INDEX idx_artifacts_downloads ON artifacts(downloads DESC) WHERE deleted = FALSE;
CREATE INDEX idx_artifacts_stars ON artifacts(stars DESC) WHERE deleted = FALSE;

-- Full-text search index
CREATE INDEX idx_artifacts_fts ON artifacts USING GIN (
    to_tsvector('english',
        COALESCE(name, '') || ' ' ||
        COALESCE(description, '') || ' ' ||
        COALESCE(author, '')
    )
) WHERE deleted = FALSE;

-- Trigram index for fuzzy matching
CREATE INDEX idx_artifacts_name_trgm ON artifacts USING GIN (name gin_trgm_ops) WHERE deleted = FALSE;
CREATE INDEX idx_artifacts_description_trgm ON artifacts USING GIN (description gin_trgm_ops) WHERE deleted = FALSE;

-- Tags indexes
CREATE INDEX idx_tags_tag ON tags(tag);
CREATE INDEX idx_tags_artifact_id ON tags(artifact_id);

-- Skills indexes
CREATE INDEX idx_skills_skill ON skills(skill);
CREATE INDEX idx_skills_artifact_id ON skills(artifact_id);

-- Keywords indexes
CREATE INDEX idx_keywords_keyword ON keywords(keyword);

-- Versions indexes
CREATE INDEX idx_versions_artifact_id ON versions(artifact_id);
CREATE INDEX idx_versions_created_at ON versions(created_at DESC);

-- Dependencies indexes
CREATE INDEX idx_dependencies_artifact_id ON dependencies(artifact_id);
CREATE INDEX idx_dependencies_dependency_id ON dependencies(dependency_id);

-- Audit log indexes
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_artifact_id ON audit_log(artifact_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
--                              FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Manage artifact versions
CREATE OR REPLACE FUNCTION manage_artifact_versions()
RETURNS TRIGGER AS $$
BEGIN
    -- When artifact is updated, create a version snapshot if version changed
    IF (TG_OP = 'UPDATE' AND OLD.version != NEW.version) THEN
        INSERT INTO versions (artifact_id, version, source, published)
        VALUES (OLD.id, OLD.version, OLD.source, OLD.published)
        ON CONFLICT (artifact_id, version) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Increment download counter
CREATE OR REPLACE FUNCTION increment_downloads(artifact_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE artifacts
    SET downloads = downloads + 1,
        last_accessed = NOW()
    WHERE id = artifact_uuid;
END;
$$ LANGUAGE plpgsql;

-- Increment star counter
CREATE OR REPLACE FUNCTION increment_stars(artifact_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE artifacts
    SET stars = stars + 1
    WHERE id = artifact_uuid;
END;
$$ LANGUAGE plpgsql;

-- Increment view counter
CREATE OR REPLACE FUNCTION increment_views(artifact_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE artifacts
    SET views = views + 1,
        last_accessed = NOW()
    WHERE id = artifact_uuid;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
--                              TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at on artifacts
CREATE TRIGGER trigger_artifacts_updated_at
    BEFORE UPDATE ON artifacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on organizations
CREATE TRIGGER trigger_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on users
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-create version snapshots
CREATE TRIGGER trigger_artifacts_version_snapshot
    BEFORE UPDATE ON artifacts
    FOR EACH ROW
    EXECUTE FUNCTION manage_artifact_versions();

-- ═══════════════════════════════════════════════════════════════════════════════
--                              INITIAL DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create default organization
INSERT INTO organizations (name, slug)
VALUES ('Default Organization', 'default')
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
--                              GRANTS (for security)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Grant permissions to application user (create this user separately)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pcl_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pcl_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO pcl_app;

-- ═══════════════════════════════════════════════════════════════════════════════
--                              COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE artifacts IS 'Main registry storage for personas, teams, workflows, and skills';
COMMENT ON TABLE versions IS 'Version history for artifacts';
COMMENT ON TABLE tags IS 'Tags for categorizing artifacts';
COMMENT ON TABLE skills IS 'Skills associated with persona artifacts';
COMMENT ON TABLE dependencies IS 'Dependency graph between artifacts';
COMMENT ON TABLE audit_log IS 'Audit trail for security and compliance';

COMMENT ON COLUMN artifacts.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN artifacts.custom IS 'Custom metadata as JSON';
COMMENT ON COLUMN artifacts.source IS 'PCL source code';
COMMENT ON COLUMN artifacts.deleted IS 'Soft delete flag';
