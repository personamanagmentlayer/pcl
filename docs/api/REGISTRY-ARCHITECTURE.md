# PCL Registry System Architecture

## Enterprise-Grade Persona & Artifact Management

**Version**: 2.0.0
**Date**: 2026-01-17
**Status**: Design Phase
**Author**: ARCHI (Architecture Persona)
**Phase**: 1.2 - Registry System

---

## 📋 Executive Summary

The PCL Registry System is a **multi-backend, distributed, enterprise-grade** storage and retrieval system for personas, teams, workflows, skills, and other PCL artifacts. This document outlines a comprehensive architecture supporting multiple database backends, advanced search capabilities, versioning, security, and scalability.

### Vision

```
┌─────────────────────────────────────────────────────────────┐
│                     PCL Registry System                      │
│                                                              │
│  "The Universal Repository for AI Persona Management"       │
│                                                              │
│  • Multi-Database Support (PostgreSQL, MongoDB, SQLite)    │
│  • Version Control & History                                │
│  • Advanced Search & Discovery                              │
│  • Tag & Skill-Based Resolution                            │
│  • Import/Export (PCLPack Format)                          │
│  • Role-Based Access Control                               │
│  • Caching & Performance Optimization                      │
│  • Distributed Architecture Ready                          │
└─────────────────────────────────────────────────────────────┘
```

### Key Requirements

1. **Multi-Backend Support**: PostgreSQL, MongoDB, SQLite, Memory (testing)
2. **CRUD Operations**: Create, Read, Update, Delete for all artifact types
3. **Advanced Search**: Full-text, tags, skills, semantic search
4. **Version Management**: Semantic versioning, history, rollback
5. **Security**: RBAC, encryption, audit logs
6. **Performance**: Caching, indexing, connection pooling
7. **Import/Export**: PCLPack format for portability
8. **Extensibility**: Plugin architecture for custom backends

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                         Application Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │   CLI    │  │   LSP    │  │   HTTP   │  │  SDK     │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
└───────┼─────────────┼─────────────┼─────────────┼────────────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                    Registry Core (Facade)                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  RegistryManager                                           │ │
│  │  • Artifact management (personas, teams, workflows)        │ │
│  │  • Version control                                         │ │
│  │  • Search & query                                          │ │
│  │  • Caching layer                                           │ │
│  │  • Transaction management                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                     Backend Adapters                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │ PostgreSQL│  │  MongoDB  │  │  SQLite   │  │  Memory   │   │
│  │  Adapter  │  │  Adapter  │  │  Adapter  │  │  Adapter  │   │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘   │
└────────┼──────────────┼──────────────┼──────────────┼───────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
    PostgreSQL      MongoDB         SQLite         In-Memory
     Database       Database        File           HashMap
```

### Component Layers

```typescript
// Layer 1: Registry Interface (Abstraction)
interface IRegistry {
  // CRUD Operations
  create(artifact: Artifact): Promise<string>;
  read(id: string): Promise<Artifact | null>;
  update(id: string, artifact: Partial<Artifact>): Promise<void>;
  delete(id: string): Promise<void>;

  // Query Operations
  find(query: Query): Promise<Artifact[]>;
  search(criteria: SearchCriteria): Promise<SearchResult[]>;

  // Version Operations
  listVersions(id: string): Promise<Version[]>;
  getVersion(id: string, version: string): Promise<Artifact>;

  // Metadata Operations
  getTags(): Promise<string[]>;
  getSkills(): Promise<string[]>;
}

// Layer 2: Registry Manager (Orchestration)
class RegistryManager implements IRegistry {
  constructor(
    private backend: IBackend,
    private cache: ICache,
    private search: ISearchEngine,
    private versioning: IVersionControl
  ) {}
}

// Layer 3: Backend Adapters (Implementation)
class PostgreSQLBackend implements IBackend {}
class MongoDBBackend implements IBackend {}
class SQLiteBackend implements IBackend {}
class MemoryBackend implements IBackend {}
```

---

## 🗄️ Database Schema Design

### PostgreSQL Schema

```sql
-- ═══════════════════════════════════════════════════════════════
-- PCL Registry Database Schema (PostgreSQL)
-- ═══════════════════════════════════════════════════════════════

-- Artifact Types Enum
CREATE TYPE artifact_type AS ENUM (
  'persona',
  'team',
  'workflow',
  'skill',
  'type',
  'interface',
  'enum',
  'function',
  'module'
);

-- Visibility Enum
CREATE TYPE visibility AS ENUM ('public', 'private', 'unlisted');

-- ───────────────────────────────────────────────────────────────
-- Organizations (Multi-tenancy)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  website VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_orgs_slug ON organizations(slug);
CREATE INDEX idx_orgs_deleted ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- ───────────────────────────────────────────────────────────────
-- Users (Registry Authentication)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org ON users(org_id);

-- ───────────────────────────────────────────────────────────────
-- Artifacts (Main Storage)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Identification
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  type artifact_type NOT NULL,

  -- Versioning
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  is_latest BOOLEAN DEFAULT TRUE,

  -- Content
  source_code TEXT NOT NULL,
  ast_json JSONB,
  metadata JSONB,

  -- Discovery
  description TEXT,
  tags TEXT[],
  skills TEXT[],
  visibility visibility DEFAULT 'private',

  -- Statistics
  downloads_count INTEGER DEFAULT 0,
  stars_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  UNIQUE(org_id, slug, version),
  CHECK (version ~ '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$')
);

-- Indexes for performance
CREATE INDEX idx_artifacts_org ON artifacts(org_id);
CREATE INDEX idx_artifacts_type ON artifacts(type);
CREATE INDEX idx_artifacts_slug ON artifacts(slug);
CREATE INDEX idx_artifacts_version ON artifacts(version);
CREATE INDEX idx_artifacts_is_latest ON artifacts(is_latest) WHERE is_latest = TRUE;
CREATE INDEX idx_artifacts_visibility ON artifacts(visibility);
CREATE INDEX idx_artifacts_tags ON artifacts USING GIN(tags);
CREATE INDEX idx_artifacts_skills ON artifacts USING GIN(skills);
CREATE INDEX idx_artifacts_metadata ON artifacts USING GIN(metadata);
CREATE INDEX idx_artifacts_deleted ON artifacts(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_artifacts_fts ON artifacts USING GIN(
  to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(array_to_string(tags, ' '), '')
  )
);

-- ───────────────────────────────────────────────────────────────
-- Dependencies (Artifact Relationships)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE,
  depends_on_id UUID REFERENCES artifacts(id) ON DELETE CASCADE,
  version_constraint VARCHAR(100),
  dependency_type VARCHAR(50), -- 'import', 'extends', 'implements', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(artifact_id, depends_on_id)
);

CREATE INDEX idx_deps_artifact ON dependencies(artifact_id);
CREATE INDEX idx_deps_depends_on ON dependencies(depends_on_id);

-- ───────────────────────────────────────────────────────────────
-- Versions (Version History)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  changelog TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  UNIQUE(artifact_id, version)
);

CREATE INDEX idx_versions_artifact ON versions(artifact_id);
CREATE INDEX idx_versions_version ON versions(version);

-- ───────────────────────────────────────────────────────────────
-- Tags (Normalized Tag Storage)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_usage ON tags(usage_count DESC);

CREATE TABLE artifact_tags (
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(artifact_id, tag_id)
);

-- ───────────────────────────────────────────────────────────────
-- Skills (Normalized Skill Storage)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(100),
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);

CREATE TABLE artifact_skills (
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  proficiency VARCHAR(50), -- 'beginner', 'intermediate', 'expert'
  PRIMARY KEY(artifact_id, skill_id)
);

-- ───────────────────────────────────────────────────────────────
-- Collections (Persona Bundles)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  visibility visibility DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(org_id, slug)
);

CREATE TABLE collection_artifacts (
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE,
  order_index INTEGER,
  PRIMARY KEY(collection_id, artifact_id)
);

-- ───────────────────────────────────────────────────────────────
-- Audit Log (Security & Compliance)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  artifact_id UUID REFERENCES artifacts(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'publish', etc.
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_artifact ON audit_log(artifact_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ───────────────────────────────────────────────────────────────
-- Functions & Triggers
-- ───────────────────────────────────────────────────────────────

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_artifacts_updated_at BEFORE UPDATE ON artifacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Version management trigger
CREATE OR REPLACE FUNCTION manage_artifact_versions()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new version is created, mark previous versions as not latest
  IF NEW.is_latest = TRUE THEN
    UPDATE artifacts
    SET is_latest = FALSE
    WHERE org_id = NEW.org_id
      AND slug = NEW.slug
      AND id != NEW.id
      AND is_latest = TRUE;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER manage_versions BEFORE INSERT OR UPDATE ON artifacts
  FOR EACH ROW EXECUTE FUNCTION manage_artifact_versions();
```

### MongoDB Schema

```javascript
// ═══════════════════════════════════════════════════════════════
// PCL Registry Database Schema (MongoDB)
// ═══════════════════════════════════════════════════════════════

// Collections:
// - organizations
// - users
// - artifacts
// - dependencies
// - tags
// - skills
// - collections
// - auditLog

// ───────────────────────────────────────────────────────────────
// Artifacts Collection (Main)
// ───────────────────────────────────────────────────────────────
db.createCollection('artifacts', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['orgId', 'name', 'slug', 'type', 'version', 'sourceCode'],
      properties: {
        orgId: { bsonType: 'objectId' },
        ownerId: { bsonType: 'objectId' },
        name: { bsonType: 'string', maxLength: 255 },
        slug: { bsonType: 'string', maxLength: 100 },
        type: {
          enum: [
            'persona',
            'team',
            'workflow',
            'skill',
            'type',
            'interface',
            'enum',
            'function',
            'module',
          ],
        },
        version: {
          bsonType: 'string',
          pattern: '^[0-9]+\\.[0-9]+\\.[0-9]+(-[a-zA-Z0-9.]+)?$',
        },
        isLatest: { bsonType: 'bool' },
        sourceCode: { bsonType: 'string' },
        ast: { bsonType: 'object' },
        metadata: { bsonType: 'object' },
        description: { bsonType: 'string' },
        tags: { bsonType: 'array', items: { bsonType: 'string' } },
        skills: { bsonType: 'array', items: { bsonType: 'string' } },
        visibility: { enum: ['public', 'private', 'unlisted'] },
        downloads: { bsonType: 'int', minimum: 0 },
        stars: { bsonType: 'int', minimum: 0 },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
        publishedAt: { bsonType: 'date' },
        deletedAt: { bsonType: 'date' },
      },
    },
  },
});

// Indexes
db.artifacts.createIndex({ orgId: 1, slug: 1, version: 1 }, { unique: true });
db.artifacts.createIndex({ type: 1 });
db.artifacts.createIndex({ isLatest: 1 });
db.artifacts.createIndex({ tags: 1 });
db.artifacts.createIndex({ skills: 1 });
db.artifacts.createIndex({ visibility: 1 });
db.artifacts.createIndex({ deletedAt: 1 });
db.artifacts.createIndex(
  { name: 'text', description: 'text', tags: 'text' },
  { name: 'artifacts_fts' }
);

// Compound indexes for queries
db.artifacts.createIndex({ orgId: 1, type: 1, isLatest: 1 });
db.artifacts.createIndex({ visibility: 1, createdAt: -1 });
```

---

## 🔧 Core Components

### 1. Registry Interface

```typescript
// src/registry/types.ts

export type ArtifactType =
  | 'persona'
  | 'team'
  | 'workflow'
  | 'skill'
  | 'type'
  | 'interface'
  | 'enum'
  | 'function'
  | 'module';

export type Visibility = 'public' | 'private' | 'unlisted';

export interface Artifact {
  id: string;
  orgId: string;
  ownerId: string;

  // Identification
  name: string;
  slug: string;
  type: ArtifactType;

  // Versioning
  version: string;
  isLatest: boolean;

  // Content
  sourceCode: string;
  ast?: AST.Node;
  metadata?: Record<string, unknown>;

  // Discovery
  description?: string;
  tags: string[];
  skills: string[];
  visibility: Visibility;

  // Statistics
  downloads: number;
  stars: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  deletedAt?: Date;
}

export interface Query {
  type?: ArtifactType | ArtifactType[];
  tags?: string[];
  skills?: string[];
  visibility?: Visibility;
  isLatest?: boolean;
  limit?: number;
  offset?: number;
  sort?: {
    field: keyof Artifact;
    order: 'asc' | 'desc';
  };
}

export interface SearchCriteria {
  query: string;
  type?: ArtifactType[];
  tags?: string[];
  skills?: string[];
  minDownloads?: number;
  minStars?: number;
}

export interface SearchResult {
  artifact: Artifact;
  score: number;
  matches: {
    field: string;
    snippet: string;
  }[];
}

export interface Version {
  version: string;
  changelog?: string;
  createdAt: Date;
  createdBy: string;
}

export interface IRegistry {
  // ═══════════════════════════════════════════════════════════
  // CRUD Operations
  // ═══════════════════════════════════════════════════════════

  /**
   * Create a new artifact in the registry
   * @returns Artifact ID
   */
  create(
    artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string>;

  /**
   * Read an artifact by ID
   */
  read(id: string): Promise<Artifact | null>;

  /**
   * Read an artifact by slug and optional version
   */
  readBySlug(
    orgId: string,
    slug: string,
    version?: string
  ): Promise<Artifact | null>;

  /**
   * Update an artifact (creates new version if version changed)
   */
  update(id: string, artifact: Partial<Artifact>): Promise<void>;

  /**
   * Delete an artifact (soft delete)
   */
  delete(id: string): Promise<void>;

  /**
   * Permanently delete an artifact
   */
  purge(id: string): Promise<void>;

  // ═══════════════════════════════════════════════════════════
  // Query Operations
  // ═══════════════════════════════════════════════════════════

  /**
   * Find artifacts matching query criteria
   */
  find(query: Query): Promise<Artifact[]>;

  /**
   * Count artifacts matching query criteria
   */
  count(query: Query): Promise<number>;

  /**
   * Full-text search for artifacts
   */
  search(criteria: SearchCriteria): Promise<SearchResult[]>;

  // ═══════════════════════════════════════════════════════════
  // Version Operations
  // ═══════════════════════════════════════════════════════════

  /**
   * List all versions of an artifact
   */
  listVersions(artifactId: string): Promise<Version[]>;

  /**
   * Get a specific version of an artifact
   */
  getVersion(artifactId: string, version: string): Promise<Artifact | null>;

  /**
   * Publish a new version
   */
  publish(
    artifactId: string,
    version: string,
    changelog?: string
  ): Promise<void>;

  // ═══════════════════════════════════════════════════════════
  // Discovery Operations
  // ═══════════════════════════════════════════════════════════

  /**
   * Get all unique tags
   */
  getTags(): Promise<string[]>;

  /**
   * Get all unique skills
   */
  getSkills(): Promise<string[]>;

  /**
   * Get trending artifacts
   */
  getTrending(limit?: number): Promise<Artifact[]>;

  /**
   * Get related artifacts (by tags/skills)
   */
  getRelated(artifactId: string, limit?: number): Promise<Artifact[]>;

  // ═══════════════════════════════════════════════════════════
  // Statistics
  // ═══════════════════════════════════════════════════════════

  /**
   * Increment download counter
   */
  incrementDownloads(artifactId: string): Promise<void>;

  /**
   * Star/unstar an artifact
   */
  star(artifactId: string, userId: string): Promise<void>;
  unstar(artifactId: string, userId: string): Promise<void>;

  // ═══════════════════════════════════════════════════════════
  // Import/Export
  // ═══════════════════════════════════════════════════════════

  /**
   * Export artifacts to PCLPack format
   */
  export(artifactIds: string[]): Promise<PCLPack>;

  /**
   * Import artifacts from PCLPack
   */
  import(pack: PCLPack): Promise<string[]>;
}
```

### 2. Backend Adapter Interface

```typescript
// src/registry/backend/interface.ts

export interface IBackend {
  /**
   * Initialize the backend connection
   */
  connect(): Promise<void>;

  /**
   * Close the backend connection
   */
  disconnect(): Promise<void>;

  /**
   * Check if backend is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Begin a transaction
   */
  beginTransaction(): Promise<Transaction>;

  /**
   * Execute a query
   */
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Insert a record
   */
  insert(table: string, data: Record<string, unknown>): Promise<string>;

  /**
   * Update records
   */
  update(
    table: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<void>;

  /**
   * Delete a record
   */
  delete(table: string, id: string): Promise<void>;

  /**
   * Find records
   */
  findMany(
    table: string,
    where: WhereClause,
    options?: QueryOptions
  ): Promise<unknown[]>;

  /**
   * Find one record
   */
  findOne(table: string, where: WhereClause): Promise<unknown | null>;
}

export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface WhereClause {
  [key: string]: unknown;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
}
```

### 3. Registry Manager Implementation

```typescript
// src/registry/manager.ts

import type { IRegistry, Artifact, Query, SearchCriteria } from './types';
import type { IBackend } from './backend/interface';
import type { ICache } from './cache/interface';
import type { ISearchEngine } from './search/interface';

export class RegistryManager implements IRegistry {
  constructor(
    private backend: IBackend,
    private cache: ICache,
    private searchEngine: ISearchEngine,
    private options: RegistryOptions = {}
  ) {}

  async create(
    artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    // 1. Validate artifact
    this.validate(artifact);

    // 2. Generate slug if not provided
    if (!artifact.slug) {
      artifact.slug = this.generateSlug(artifact.name);
    }

    // 3. Check for duplicates
    const existing = await this.readBySlug(
      artifact.orgId,
      artifact.slug,
      artifact.version
    );

    if (existing) {
      throw new Error(
        `Artifact ${artifact.slug}@${artifact.version} already exists`
      );
    }

    // 4. Insert into database
    const id = await this.backend.insert('artifacts', {
      ...artifact,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Index for search
    await this.searchEngine.index({
      id,
      ...artifact,
    });

    // 6. Invalidate cache
    await this.cache.invalidate(`artifact:${artifact.orgId}:${artifact.slug}`);

    // 7. Audit log
    await this.auditLog('create', id, artifact);

    return id;
  }

  async read(id: string): Promise<Artifact | null> {
    // 1. Check cache
    const cached = await this.cache.get<Artifact>(`artifact:${id}`);
    if (cached) return cached;

    // 2. Query database
    const artifact = await this.backend.findOne('artifacts', { id });

    if (!artifact) return null;

    // 3. Cache result
    await this.cache.set(`artifact:${id}`, artifact, { ttl: 3600 });

    return artifact as Artifact;
  }

  async readBySlug(
    orgId: string,
    slug: string,
    version?: string
  ): Promise<Artifact | null> {
    const cacheKey = `artifact:${orgId}:${slug}:${version || 'latest'}`;

    // Check cache
    const cached = await this.cache.get<Artifact>(cacheKey);
    if (cached) return cached;

    // Query database
    const where: WhereClause = { orgId, slug };
    if (version) {
      where.version = version;
    } else {
      where.isLatest = true;
    }

    const artifact = await this.backend.findOne('artifacts', where);

    if (!artifact) return null;

    // Cache result
    await this.cache.set(cacheKey, artifact, { ttl: 3600 });

    return artifact as Artifact;
  }

  async find(query: Query): Promise<Artifact[]> {
    const where: WhereClause = {};

    if (query.type) {
      where.type = Array.isArray(query.type) ? { $in: query.type } : query.type;
    }

    if (query.tags && query.tags.length > 0) {
      where.tags = { $contains: query.tags };
    }

    if (query.skills && query.skills.length > 0) {
      where.skills = { $contains: query.skills };
    }

    if (query.visibility) {
      where.visibility = query.visibility;
    }

    if (query.isLatest !== undefined) {
      where.isLatest = query.isLatest;
    }

    const options: QueryOptions = {
      limit: query.limit || 100,
      offset: query.offset || 0,
    };

    if (query.sort) {
      options.orderBy = [
        { field: query.sort.field, direction: query.sort.order },
      ];
    }

    const artifacts = await this.backend.findMany('artifacts', where, options);

    return artifacts as Artifact[];
  }

  async search(criteria: SearchCriteria): Promise<SearchResult[]> {
    return this.searchEngine.search(criteria);
  }

  // ... other methods ...

  private validate(artifact: Partial<Artifact>): void {
    if (!artifact.name) throw new Error('Artifact name is required');
    if (!artifact.type) throw new Error('Artifact type is required');
    if (!artifact.sourceCode) throw new Error('Source code is required');

    // Validate version format (semver)
    if (
      artifact.version &&
      !/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(artifact.version)
    ) {
      throw new Error(
        'Invalid version format. Use semantic versioning (e.g., 1.0.0)'
      );
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async auditLog(
    action: string,
    artifactId: string,
    details: unknown
  ): Promise<void> {
    await this.backend.insert('audit_log', {
      action,
      artifactId,
      details: JSON.stringify(details),
      createdAt: new Date(),
    });
  }
}
```

---

## 🚀 Advanced Features

### 1. Caching Layer

```typescript
// src/registry/cache/redis-cache.ts

import { createClient, type RedisClientType } from 'redis';
import type { ICache } from './interface';

export class RedisCache implements ICache {
  private client: RedisClientType;

  constructor(private url: string) {
    this.client = createClient({ url });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(
    key: string,
    value: T,
    options?: { ttl?: number }
  ): Promise<void> {
    const serialized = JSON.stringify(value);

    if (options?.ttl) {
      await this.client.setEx(key, options.ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async clear(): Promise<void> {
    await this.client.flushDb();
  }
}
```

### 2. Full-Text Search Engine

```typescript
// src/registry/search/elasticsearch-engine.ts

import { Client } from '@elastic/elasticsearch';
import type { ISearchEngine, SearchCriteria, SearchResult } from './interface';

export class ElasticsearchEngine implements ISearchEngine {
  private client: Client;

  constructor(private node: string) {
    this.client = new Client({ node });
  }

  async index(artifact: Artifact): Promise<void> {
    await this.client.index({
      index: 'pcl-artifacts',
      id: artifact.id,
      document: {
        name: artifact.name,
        description: artifact.description,
        tags: artifact.tags,
        skills: artifact.skills,
        type: artifact.type,
        visibility: artifact.visibility,
        downloads: artifact.downloads,
        stars: artifact.stars,
        createdAt: artifact.createdAt,
      },
    });
  }

  async search(criteria: SearchCriteria): Promise<SearchResult[]> {
    const must: unknown[] = [
      {
        multi_match: {
          query: criteria.query,
          fields: ['name^3', 'description^2', 'tags', 'skills'],
          fuzziness: 'AUTO',
        },
      },
    ];

    if (criteria.type) {
      must.push({ terms: { type: criteria.type } });
    }

    if (criteria.tags) {
      must.push({ terms: { tags: criteria.tags } });
    }

    if (criteria.minDownloads) {
      must.push({ range: { downloads: { gte: criteria.minDownloads } } });
    }

    const response = await this.client.search({
      index: 'pcl-artifacts',
      body: {
        query: {
          bool: { must },
        },
        highlight: {
          fields: {
            name: {},
            description: {},
            tags: {},
          },
        },
      },
    });

    return response.hits.hits.map((hit) => ({
      artifact: hit._source as Artifact,
      score: hit._score || 0,
      matches: this.extractMatches(hit.highlight),
    }));
  }

  private extractMatches(highlight: unknown): SearchResult['matches'] {
    // Extract highlighted snippets
    const matches: SearchResult['matches'] = [];

    if (highlight) {
      for (const [field, snippets] of Object.entries(highlight)) {
        if (Array.isArray(snippets)) {
          matches.push({
            field,
            snippet: snippets[0],
          });
        }
      }
    }

    return matches;
  }
}
```

### 3. Version Control System

```typescript
// src/registry/versioning/semver-manager.ts

import semver from 'semver';

export class SemverManager {
  /**
   * Validate version format
   */
  validate(version: string): boolean {
    return semver.valid(version) !== null;
  }

  /**
   * Compare two versions
   */
  compare(v1: string, v2: string): -1 | 0 | 1 {
    return semver.compare(v1, v2);
  }

  /**
   * Check if version satisfies constraint
   */
  satisfies(version: string, range: string): boolean {
    return semver.satisfies(version, range);
  }

  /**
   * Increment version
   */
  increment(version: string, release: 'major' | 'minor' | 'patch'): string {
    return semver.inc(version, release) || version;
  }

  /**
   * Get latest version from array
   */
  latest(versions: string[]): string {
    return semver.maxSatisfying(versions, '*') || versions[0];
  }
}
```

---

## 📊 Performance Optimizations

### 1. Connection Pooling

```typescript
// src/registry/backend/postgresql-backend.ts

import { Pool } from 'pg';

export class PostgreSQLBackend implements IBackend {
  private pool: Pool;

  constructor(config: PoolConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }
}
```

### 2. Query Optimization

```typescript
// Batch operations
async batchInsert(artifacts: Artifact[]): Promise<string[]> {
  const values = artifacts.map(a =>
    `('${a.orgId}', '${a.name}', '${a.slug}', '${a.type}', '${a.version}', '${a.sourceCode}')`
  ).join(', ');

  const sql = `
    INSERT INTO artifacts (org_id, name, slug, type, version, source_code)
    VALUES ${values}
    RETURNING id
  `;

  const result = await this.query<{ id: string }>(sql);
  return result.map(r => r.id);
}

// Prepared statements
async findByType(type: ArtifactType): Promise<Artifact[]> {
  const sql = 'SELECT * FROM artifacts WHERE type = $1 AND deleted_at IS NULL';
  return this.query<Artifact>(sql, [type]);
}
```

### 3. Caching Strategy

```
┌─────────────────────────────────────────────────────────┐
│                   Caching Layers                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  L1: In-Memory (LRU)        │  Hot data, 5 min TTL    │
│  ├── Recent artifacts       │  Max 1000 items         │
│  ├── Popular personas       │  95% hit rate           │
│  └── Trending teams         │                         │
│                                                         │
│  L2: Redis (Distributed)    │  Warm data, 1 hour TTL  │
│  ├── All artifacts          │  Unlimited size         │
│  ├── Search results         │  85% hit rate           │
│  └── Metadata               │                         │
│                                                         │
│  L3: Database (Persistent)  │  Cold data, permanent   │
│  ├── All data               │  Source of truth        │
│  ├── Historical versions    │  100% coverage          │
│  └── Audit logs             │                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Features

### 1. Role-Based Access Control (RBAC)

```typescript
// src/registry/security/rbac.ts

export enum Role {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export enum Permission {
  CREATE_ARTIFACT = 'artifacts:create',
  READ_ARTIFACT = 'artifacts:read',
  UPDATE_ARTIFACT = 'artifacts:update',
  DELETE_ARTIFACT = 'artifacts:delete',
  PUBLISH_ARTIFACT = 'artifacts:publish',
  MANAGE_USERS = 'users:manage',
}

const rolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.CREATE_ARTIFACT,
    Permission.READ_ARTIFACT,
    Permission.UPDATE_ARTIFACT,
    Permission.DELETE_ARTIFACT,
    Permission.PUBLISH_ARTIFACT,
    Permission.MANAGE_USERS,
  ],
  [Role.EDITOR]: [
    Permission.CREATE_ARTIFACT,
    Permission.READ_ARTIFACT,
    Permission.UPDATE_ARTIFACT,
  ],
  [Role.VIEWER]: [Permission.READ_ARTIFACT],
};

export class RBAC {
  hasPermission(role: Role, permission: Permission): boolean {
    return rolePermissions[role]?.includes(permission) || false;
  }

  async checkAccess(
    userId: string,
    artifactId: string,
    permission: Permission
  ): Promise<boolean> {
    const user = await this.getUser(userId);
    const artifact = await this.getArtifact(artifactId);

    // Check if user is owner
    if (artifact.ownerId === userId) return true;

    // Check role permissions
    return this.hasPermission(user.role, permission);
  }
}
```

### 2. Encryption at Rest

```typescript
// src/registry/security/encryption.ts

import crypto from 'crypto';

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;

  constructor(private secretKey: string) {
    if (Buffer.from(secretKey, 'hex').length !== this.keyLength) {
      throw new Error('Invalid encryption key length');
    }
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      Buffer.from(this.secretKey, 'hex'),
      iv
    );

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(this.secretKey, 'hex'),
      iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

---

## 📦 PCLPack Format (Import/Export)

```typescript
// src/registry/pclpack/format.ts

export interface PCLPack {
  version: string; // Pack format version
  metadata: PackMetadata;
  artifacts: PackedArtifact[];
  dependencies: PackDependency[];
}

export interface PackMetadata {
  name: string;
  description?: string;
  author?: string;
  license?: string;
  createdAt: string;
}

export interface PackedArtifact {
  id: string;
  name: string;
  type: ArtifactType;
  version: string;
  sourceCode: string;
  metadata?: Record<string, unknown>;
}

export interface PackDependency {
  from: string; // artifact ID
  to: string; // artifact ID
  type: string; // 'import', 'extends', etc.
}

export class PCLPackManager {
  /**
   * Create a PCLPack from artifacts
   */
  async pack(artifactIds: string[], metadata: PackMetadata): Promise<PCLPack> {
    const artifacts: PackedArtifact[] = [];
    const dependencies: PackDependency[] = [];

    for (const id of artifactIds) {
      const artifact = await this.registry.read(id);
      if (!artifact) continue;

      artifacts.push({
        id: artifact.id,
        name: artifact.name,
        type: artifact.type,
        version: artifact.version,
        sourceCode: artifact.sourceCode,
        metadata: artifact.metadata,
      });

      // Collect dependencies
      const deps = await this.getDependencies(id);
      dependencies.push(...deps);
    }

    return {
      version: '1.0.0',
      metadata,
      artifacts,
      dependencies,
    };
  }

  /**
   * Unpack and import a PCLPack
   */
  async unpack(pack: PCLPack): Promise<string[]> {
    const importedIds: string[] = [];

    // Validate pack format
    this.validatePack(pack);

    // Topologically sort artifacts by dependencies
    const sorted = this.topologicalSort(pack.artifacts, pack.dependencies);

    // Import in order
    for (const artifact of sorted) {
      try {
        const id = await this.registry.create(artifact);
        importedIds.push(id);
      } catch (error) {
        console.error(`Failed to import ${artifact.name}:`, error);
      }
    }

    return importedIds;
  }

  private topologicalSort(
    artifacts: PackedArtifact[],
    dependencies: PackDependency[]
  ): PackedArtifact[] {
    // Kahn's algorithm for topological sorting
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Build graph
    for (const artifact of artifacts) {
      graph.set(artifact.id, []);
      inDegree.set(artifact.id, 0);
    }

    for (const dep of dependencies) {
      graph.get(dep.from)?.push(dep.to);
      inDegree.set(dep.to, (inDegree.get(dep.to) || 0) + 1);
    }

    // Find nodes with no incoming edges
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const sorted: PackedArtifact[] = [];

    while (queue.length > 0) {
      const id = queue.shift()!;
      const artifact = artifacts.find((a) => a.id === id);
      if (artifact) sorted.push(artifact);

      for (const neighbor of graph.get(id) || []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (sorted.length !== artifacts.length) {
      throw new Error('Circular dependency detected in PCLPack');
    }

    return sorted;
  }
}
```

---

## 📋 Implementation Timeline

### Week 1: Foundation (Days 1-5)

**Day 1-2: Core Interfaces & Types**

- [ ] Define `IRegistry` interface
- [ ] Define `IBackend` interface
- [ ] Define `Artifact`, `Query`, `SearchCriteria` types
- [ ] Create base error classes
- [ ] Set up project structure

**Day 3-4: Memory Backend (Testing)**

- [ ] Implement `MemoryBackend` with HashMap
- [ ] Implement CRUD operations
- [ ] Add query filtering
- [ ] Write unit tests (100% coverage)

**Day 5: Registry Manager Skeleton**

- [ ] Create `RegistryManager` class
- [ ] Implement basic CRUD operations
- [ ] Add validation logic
- [ ] Integration tests with MemoryBackend

### Week 2: Database Backends (Days 6-10)

**Day 6-7: PostgreSQL Backend**

- [ ] Set up PostgreSQL schema (run migrations)
- [ ] Implement `PostgreSQLBackend`
- [ ] Connection pooling setup
- [ ] CRUD operations
- [ ] Transaction support
- [ ] Integration tests

**Day 8-9: MongoDB Backend**

- [ ] Set up MongoDB schema
- [ ] Implement `MongoDBBackend`
- [ ] CRUD operations
- [ ] Index creation
- [ ] Integration tests

**Day 10: SQLite Backend**

- [ ] Set up SQLite schema
- [ ] Implement `SQLiteBackend`
- [ ] File-based storage
- [ ] Integration tests

### Week 3: Advanced Features (Days 11-15)

**Day 11-12: Caching Layer**

- [ ] Implement `RedisCache`
- [ ] Implement `MemoryCache` (LRU)
- [ ] Cache invalidation strategies
- [ ] Cache warming
- [ ] Performance tests

**Day 13-14: Search Engine**

- [ ] Set up Elasticsearch
- [ ] Implement `ElasticsearchEngine`
- [ ] Full-text search
- [ ] Faceted search
- [ ] Search result ranking

**Day 15: Version Control**

- [ ] Implement `SemverManager`
- [ ] Version listing
- [ ] Version comparison
- [ ] Version constraints

### Week 4: Security & Import/Export (Days 16-20)

**Day 16-17: Security**

- [ ] Implement RBAC system
- [ ] Encryption at rest
- [ ] Audit logging
- [ ] API key management

**Day 18-19: PCLPack Format**

- [ ] Implement pack/unpack logic
- [ ] Dependency resolution
- [ ] Topological sorting
- [ ] Validation

**Day 20: Polish & Documentation**

- [ ] API documentation
- [ ] Usage examples
- [ ] Performance benchmarks
- [ ] Migration guides

---

## ✅ Success Criteria

### Functional Requirements

- [x] Support 4 backend types (Memory, PostgreSQL, MongoDB, SQLite)
- [ ] All CRUD operations working
- [ ] Advanced query capabilities
- [ ] Full-text search
- [ ] Version management
- [ ] Import/export functionality
- [ ] Security (RBAC, encryption)

### Performance Requirements

| Metric             | Target         | Measurement |
| ------------------ | -------------- | ----------- |
| **Read Latency**   | <10ms (cached) | p95         |
| **Write Latency**  | <50ms          | p95         |
| **Search Latency** | <100ms         | p95         |
| **Throughput**     | >1000 req/s    | Sustained   |
| **Cache Hit Rate** | >90%           | Average     |
| **Database Pool**  | 20 connections | Max         |

### Quality Requirements

- [ ] 90%+ test coverage
- [ ] 0 critical security vulnerabilities
- [ ] API documentation complete
- [ ] Migration scripts provided
- [ ] Performance benchmarks documented

---

## 🎯 Next Steps

1. ✅ Architecture design complete
2. ⏭️ Review with team
3. ⏭️ Begin Week 1 implementation
4. ⏭️ Set up CI/CD for registry tests
5. ⏭️ Create Docker Compose for local development

---

**Status**: ✅ **Architecture Complete**
**Ready for Implementation**: ✅ **Yes**

---

_Designed by ARCHI Persona - PCL Architecture Specialist_
_Date: 2026-01-17_
