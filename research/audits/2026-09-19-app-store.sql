-- The retained review is about wrong photo date metadata after a successful find,
-- not a failed vague-memory retrieval. Preserve the record but exclude it from findings.
UPDATE sources SET include_in_findings = 0
WHERE id = 'src_25e65554617923cbbdbae4c2';

UPDATE evidence_units SET is_human_verified = 1
WHERE id = 'ev_25e65554617923cbbdbae4c2';

INSERT OR IGNORE INTO human_audits (id, evidence_id, verdict, auditor_label, notes, audited_at)
VALUES (
  'audit_20260919_appstore_25e', 'ev_25e65554617923cbbdbae4c2', 'inaccurate',
  'PM source audit',
  'The photo was found. The complaint is a wrong displayed date (1969 versus 2013), not failure to retrieve from incomplete memory.',
  strftime('%Y-%m-%dT%H:%M:%fZ','now')
);
