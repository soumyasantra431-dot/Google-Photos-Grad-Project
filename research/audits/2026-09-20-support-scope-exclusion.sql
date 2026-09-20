-- Public Community post describes broad face-grouping errors across many
-- photos, not one vaguely remembered target. Preserve source and AI coding.
UPDATE sources SET include_in_findings = 0
WHERE canonical_url = 'https://support.google.com/photos/thread/369327381?hl=en';

UPDATE evidence_units SET is_human_verified = 1, coding_status = 'human_excluded'
WHERE id = 'ev_4f1098040fe1e31f740272c5';

INSERT INTO human_audits (id, evidence_id, verdict, auditor_label, notes, audited_at)
VALUES ('audit_20260920_exclude_faces_group', 'ev_4f1098040fe1e31f740272c5',
  'inaccurate', 'PM source review',
  'Full retained post describes misassigned face groups affecting many pictures and videos; it does not identify a particular old photo sought with incomplete memory.',
  CURRENT_TIMESTAMP)
ON CONFLICT(id) DO NOTHING;

UPDATE review_candidates
SET decision = 'human_excluded', reviewed_at = CURRENT_TIMESTAMP,
  review_note = 'Broad face-grouping defect, outside specific-photo vague-memory retrieval.'
WHERE source_kind = 'google_support' AND external_id = '369327381' AND reviewed_at IS NULL;
