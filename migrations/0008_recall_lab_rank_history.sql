-- Synthetic catalog diagnostics only; no personal photos or raw search terms.
ALTER TABLE recall_lab_runs ADD COLUMN target_ranks_json TEXT;
ALTER TABLE recall_lab_runs ADD COLUMN attempt_modes_json TEXT;
