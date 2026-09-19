-- Two source-verified user replies describe specific re-finding attempts.
-- Correct AI-assigned stage and distinguish remembered clues from failed navigation.

UPDATE evidence_units
SET retrieval_target = 'unnamed bathroom photo',
    remembered_clues_json = '["bathroom","previously hidden"]',
    failure_stage = 'unknown',
    is_human_verified = 1
WHERE id = 'ev_4fb1bb93ea3929165b273858';

UPDATE evidence_units
SET evidence_excerpt = 'I am looking for a certain photo (I took several poses of my daughter at the beach in the same sweater). I tried all sorts of search terms but I did not find the photo I''m searching for.',
    failure_stage = 'refinement',
    is_human_verified = 1
WHERE id = 'ev_75e2c48be4040202c42cfb93';

INSERT OR IGNORE INTO human_audits (id, evidence_id, verdict, auditor_label, notes, audited_at) VALUES
  ('audit_20260919_reply_4fb', 'ev_4fb1bb93ea3929165b273858', 'partially_accurate', 'PM source audit', 'Specific unnamed bathroom photo and folder/search attempts are supported. The page does not establish a result-evaluation failure; removed non-clue labels and set stage unknown. File existence remains uncertain.', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('audit_20260919_reply_75e', 'ev_75e2c48be4040202c42cfb93', 'partially_accurate', 'PM source audit', 'Specific daughter-beach-sweater photo and several unsuccessful search terms are supported. Corrected the exact excerpt to include the clues and coded unsuccessful repeated terms as refinement, not result evaluation.', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
