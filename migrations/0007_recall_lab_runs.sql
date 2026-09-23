CREATE TABLE IF NOT EXISTS recall_lab_runs (
  session_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  selected_photo_id TEXT,
  correct INTEGER NOT NULL,
  target_in_last_top_five INTEGER NOT NULL,
  ai_mode TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id, task_id, mode)
);

CREATE INDEX IF NOT EXISTS idx_recall_lab_runs_submitted_at ON recall_lab_runs(submitted_at);
