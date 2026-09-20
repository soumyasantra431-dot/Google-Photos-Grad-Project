-- Preserve screened public candidates so low-confidence and rejected cases can be audited.
CREATE TABLE review_candidates (
  id TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  model_output_json TEXT,
  decision TEXT NOT NULL,
  model_confidence REAL,
  collection_run_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  reviewed_at TEXT,
  review_note TEXT
) STRICT;

CREATE INDEX idx_review_candidates_decision ON review_candidates(source_kind, decision);
