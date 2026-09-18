PRAGMA foreign_keys = ON;

CREATE TABLE collection_runs (
  id TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('reddit', 'google_play', 'app_store', 'google_support', 'youtube', 'forum', 'social', 'simulated')),
  collector_version TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  records_seen INTEGER NOT NULL DEFAULT 0,
  records_stored INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT
) STRICT;

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('reddit', 'google_play', 'app_store', 'google_support', 'youtube', 'forum', 'social', 'simulated')),
  platform TEXT NOT NULL,
  canonical_url TEXT NOT NULL UNIQUE,
  author_handle TEXT,
  published_at TEXT,
  collected_at TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  is_simulated INTEGER NOT NULL DEFAULT 0 CHECK (is_simulated IN (0, 1)),
  include_in_findings INTEGER NOT NULL DEFAULT 1 CHECK (include_in_findings IN (0, 1)),
  metadata_json TEXT NOT NULL DEFAULT '{}'
) STRICT;

CREATE TABLE raw_documents (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  collection_run_id TEXT REFERENCES collection_runs(id) ON DELETE SET NULL,
  external_id TEXT,
  title TEXT,
  body TEXT NOT NULL,
  content_hash TEXT NOT NULL UNIQUE,
  reply_to_external_id TEXT,
  engagement_count INTEGER,
  collected_at TEXT NOT NULL,
  UNIQUE (source_id, external_id)
) STRICT;

CREATE TABLE evidence_units (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES raw_documents(id) ON DELETE CASCADE,
  retrieval_target TEXT NOT NULL,
  evidence_excerpt TEXT NOT NULL,
  remembered_clues_json TEXT NOT NULL DEFAULT '[]',
  forgotten_context_json TEXT NOT NULL DEFAULT '[]',
  search_attempt TEXT,
  failure_stage TEXT NOT NULL CHECK (failure_stage IN ('expression', 'interpretation', 'evaluation', 'refinement', 'unknown')),
  workaround TEXT,
  retrieval_outcome TEXT NOT NULL CHECK (retrieval_outcome IN ('found', 'not_found', 'abandoned', 'unclear')),
  model_name TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  extraction_confidence REAL NOT NULL CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1),
  extracted_at TEXT NOT NULL,
  is_human_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_human_verified IN (0, 1))
) STRICT;

CREATE TABLE evidence_tags (
  evidence_id TEXT NOT NULL REFERENCES evidence_units(id) ON DELETE CASCADE,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('photo_type', 'memory_clue', 'forgotten_info', 'workaround', 'user_context')),
  tag_value TEXT NOT NULL,
  PRIMARY KEY (evidence_id, tag_type, tag_value)
) STRICT;

CREATE TABLE human_audits (
  id TEXT PRIMARY KEY,
  evidence_id TEXT NOT NULL REFERENCES evidence_units(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL CHECK (verdict IN ('accurate', 'partially_accurate', 'inaccurate', 'uncertain')),
  auditor_label TEXT NOT NULL,
  notes TEXT,
  audited_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_sources_kind_included ON sources(source_kind, include_in_findings);
CREATE INDEX idx_documents_source ON raw_documents(source_id);
CREATE INDEX idx_evidence_document ON evidence_units(document_id);
CREATE INDEX idx_evidence_failure_stage ON evidence_units(failure_stage);
CREATE INDEX idx_evidence_outcome ON evidence_units(retrieval_outcome);
CREATE INDEX idx_audits_evidence ON human_audits(evidence_id);

