-- App Store review celebrates unexpected resurfacing of a forgotten old
-- picture. No remembered target, retrieval intent, or search attempt occurred.
UPDATE sources SET include_in_findings = 0
WHERE id = (SELECT source_id FROM raw_documents WHERE id =
  (SELECT document_id FROM evidence_units WHERE id = 'ev_8abb7e56ce344c94d887554b'));

UPDATE evidence_units SET is_human_verified = 1, coding_status = 'human_excluded'
WHERE id = 'ev_8abb7e56ce344c94d887554b';

INSERT INTO human_audits (id, evidence_id, verdict, auditor_label, notes, audited_at)
VALUES ('audit_20260920_appstore_resurfacing', 'ev_8abb7e56ce344c94d887554b',
  'inaccurate', 'PM source review',
  'The review says an old picture unexpectedly resurfaced after being erased from memory; it does not describe trying to retrieve a remembered image.',
  CURRENT_TIMESTAMP)
ON CONFLICT(id) DO NOTHING;

UPDATE review_candidates SET decision = 'human_excluded', reviewed_at = CURRENT_TIMESTAMP,
  review_note = 'Unexpected resurfacing, not intentional retrieval of a remembered photo.'
WHERE source_kind = 'app_store' AND external_id = 'in:14568048679' AND reviewed_at IS NULL;
