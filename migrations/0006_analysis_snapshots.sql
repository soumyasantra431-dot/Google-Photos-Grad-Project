CREATE TABLE IF NOT EXISTS analysis_snapshots (
  template_id TEXT NOT NULL,
  corpus_signature TEXT NOT NULL,
  response_json TEXT NOT NULL,
  model_name TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  PRIMARY KEY (template_id, corpus_signature)
);

CREATE INDEX IF NOT EXISTS idx_analysis_snapshots_generated_at
  ON analysis_snapshots(generated_at DESC);
