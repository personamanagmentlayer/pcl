-- ═══════════════════════════════════════════════════════════════════════════════
-- PCL Registry - PostgreSQL Rollback Script
-- Migration: 002_rollback.sql
-- Version: 2.0.0
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- This script rolls back the initial schema (001_initial_schema.sql)
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_artifacts_version_snapshot ON artifacts;
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
DROP TRIGGER IF EXISTS trigger_organizations_updated_at ON organizations;
DROP TRIGGER IF EXISTS trigger_artifacts_updated_at ON artifacts;

-- Drop functions
DROP FUNCTION IF EXISTS increment_views(UUID);
DROP FUNCTION IF EXISTS increment_stars(UUID);
DROP FUNCTION IF EXISTS increment_downloads(UUID);
DROP FUNCTION IF EXISTS manage_artifact_versions();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS dependencies CASCADE;
DROP TABLE IF EXISTS keywords CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS versions CASCADE;
DROP TABLE IF EXISTS artifacts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop types
DROP TYPE IF EXISTS artifact_type;

-- Drop extensions
-- Note: We don't drop extensions as they might be used by other databases
-- DROP EXTENSION IF EXISTS "pg_trgm";
-- DROP EXTENSION IF EXISTS "uuid-ossp";
