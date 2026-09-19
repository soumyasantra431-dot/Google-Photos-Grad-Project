-- Human scope audit of the 2026-09-19 public Google Photos Community run.
-- Only one of five AI-retained original posts describes re-finding a specific remembered image.
-- Keep rejected source/document/evidence rows for provenance; exclude them from findings.

UPDATE sources SET include_in_findings = 0
WHERE id IN (
  'src_a07ce309dd2d98959ef7bfde', -- shared-album search, no remembered photo
  'src_570cf0647d3628fde5a8aa69', -- generic long-list complaint
  'src_4c4f463ce823394e03ad94dd', -- system-wide no-results issue, no target photo
  'src_f9b53e56c31c66daa784fd6e'  -- generic basic-query failure, no target photo
);

UPDATE evidence_units SET is_human_verified = 1
WHERE id IN (
  'ev_a07ce309dd2d98959ef7bfde',
  'ev_570cf0647d3628fde5a8aa69',
  'ev_4c4f463ce823394e03ad94dd',
  'ev_f9b53e56c31c66daa784fd6e'
);

-- The user remembered a picture of their mother and cats from a memory card and tried to
-- re-find it. The post does not describe typed search or result evaluation, so stage is unknown.
UPDATE evidence_units
SET failure_stage = 'unknown', search_attempt = NULL, workaround = NULL, is_human_verified = 1
WHERE id = 'ev_299801e1f46faa55bd584b8f';

INSERT OR IGNORE INTO human_audits (id, evidence_id, verdict, auditor_label, notes, audited_at) VALUES
  ('audit_20260919_support_a07', 'ev_a07ce309dd2d98959ef7bfde', 'inaccurate', 'PM source audit', 'No specific remembered photo or incomplete-memory clue; shared-album search behavior is a different problem.', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('audit_20260919_support_570', 'ev_570cf0647d3628fde5a8aa69', 'inaccurate', 'PM source audit', 'Generic difficulty browsing a long list; no distinct retrieval episode or remembered clue.', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('audit_20260919_support_4c4', 'ev_4c4f463ce823394e03ad94dd', 'inaccurate', 'PM source audit', 'Search returns no results generally, including March; no specific vaguely remembered visual target.', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('audit_20260919_support_f9b', 'ev_f9b53e56c31c66daa784fd6e', 'inaccurate', 'PM source audit', 'Generic basic-query complaint without a particular remembered photo.', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('audit_20260919_support_299', 'ev_299801e1f46faa55bd584b8f', 'partially_accurate', 'PM source audit', 'Specific remembered photo and failed re-finding are supported; typed search, workaround, and evaluation-stage inference removed.', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
