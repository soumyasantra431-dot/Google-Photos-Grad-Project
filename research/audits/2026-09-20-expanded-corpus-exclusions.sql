-- Human source review: retain these records but exclude them from the
-- specific-photo, incomplete-memory retrieval corpus. No source text is deleted.

UPDATE sources SET include_in_findings = 0
WHERE canonical_url IN (
  'https://support.google.com/photos/thread/55525345?hl=en',
  'https://support.google.com/photos/thread/136246816?hl=en',
  'https://support.google.com/photos/thread/114768188?hl=en',
  'https://support.google.com/photos/thread/345700868?hl=en'
);

UPDATE evidence_units
SET is_human_verified = 1, coding_status = 'human_excluded'
WHERE document_id IN (
  SELECT d.id FROM raw_documents d JOIN sources s ON s.id = d.source_id
  WHERE s.canonical_url IN (
    'https://support.google.com/photos/thread/55525345?hl=en',
    'https://support.google.com/photos/thread/136246816?hl=en',
    'https://support.google.com/photos/thread/114768188?hl=en',
    'https://support.google.com/photos/thread/345700868?hl=en'
  )
);

INSERT INTO human_audits (id, evidence_id, verdict, auditor_label, notes, audited_at)
SELECT 'audit_20260920_exclude_' || e.id, e.id, 'inaccurate', 'PM source review',
  CASE s.canonical_url
    WHEN 'https://support.google.com/photos/thread/55525345?hl=en' THEN 'Original post is a shorter duplicate of the more specific reply already admitted from this user and thread; exclude to avoid double-counting the episode.'
    WHEN 'https://support.google.com/photos/thread/136246816?hl=en' THEN 'Complains generally that duplicate images can be hidden; no specific remembered target or retrieval attempt is described.'
    WHEN 'https://support.google.com/photos/thread/114768188?hl=en' THEN 'Describes many photos visible in search but not the Photos tab; this is a library-surface inconsistency rather than failure to retrieve a particular vaguely remembered photo.'
    ELSE 'The user already found the picture and wants to determine its capture date; this is metadata lookup, not retrieval failure.'
  END,
  CURRENT_TIMESTAMP
FROM evidence_units e JOIN raw_documents d ON d.id = e.document_id JOIN sources s ON s.id = d.source_id
WHERE s.canonical_url IN (
  'https://support.google.com/photos/thread/55525345?hl=en',
  'https://support.google.com/photos/thread/136246816?hl=en',
  'https://support.google.com/photos/thread/114768188?hl=en',
  'https://support.google.com/photos/thread/345700868?hl=en'
)
ON CONFLICT(id) DO NOTHING;

UPDATE review_candidates
SET decision = 'human_excluded', reviewed_at = CURRENT_TIMESTAMP,
  review_note = 'Specific-photo retrieval scope review; see audit_20260920_exclude evidence record.'
WHERE canonical_url IN (
  'https://support.google.com/photos/thread/55525345?hl=en',
  'https://support.google.com/photos/thread/136246816?hl=en',
  'https://support.google.com/photos/thread/114768188?hl=en',
  'https://support.google.com/photos/thread/345700868?hl=en'
) AND reviewed_at IS NULL;
