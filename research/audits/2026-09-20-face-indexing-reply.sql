-- Human review of a low-confidence but in-scope Google Photos Community reply.
-- The source says a name search missed photos that were later found; the face was not indexed.
-- Groq was relevant but supplied a non-verbatim excerpt, an evaluation-stage label,
-- and an unresolved outcome. The corrected episode is interpretation/indexing and later found.

INSERT INTO sources (
  id, source_kind, platform, canonical_url, author_handle, published_at,
  collected_at, language, is_simulated, include_in_findings, metadata_json
)
SELECT 'src_23562978cccbc0dfdc94dc4f', 'google_support', 'Google Photos Community',
  canonical_url, NULL, NULL, collected_at, 'en', 0, 1,
  '{"threadId":"332668136","postId":"333104606","extractionMethod":"public_reply"}'
FROM review_candidates WHERE external_id = '332668136:333104606'
ON CONFLICT(id) DO NOTHING;

INSERT INTO raw_documents (
  id, source_id, collection_run_id, external_id, title, body, content_hash,
  reply_to_external_id, engagement_count, collected_at
)
SELECT 'doc_23562978cccbc0dfdc94dc4f', 'src_23562978cccbc0dfdc94dc4f',
  collection_run_id, '333104606', title, body,
  'bc78fbf66b87a41514596d6a2de5af107b1fea3b6416c273f5d640f82f59a1de',
  '332668136', NULL, collected_at
FROM review_candidates WHERE external_id = '332668136:333104606'
ON CONFLICT(id) DO NOTHING;

INSERT INTO evidence_units (
  id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json,
  forgotten_context_json, search_attempt, failure_stage, workaround,
  retrieval_outcome, model_name, schema_version, extraction_confidence,
  extracted_at, is_human_verified, photo_kind, target_types_json,
  remembered_clue_types_json, explicitly_forgotten_json, search_methods_json,
  exact_queries_json, existence_status, coding_status
)
VALUES (
  'ev_23562978cccbc0dfdc94dc4f', 'doc_23562978cccbc0dfdc94dc4f',
  'photo of a known person whose face was not indexed',
  'I''ve searched endlessly for photos with people through a name search and can''t find photos that I knew that I had, only to discover much later that the photo I was looking for didnt have their face marked as a face to "recognize."',
  '["known person","two faces side-by-side"]', '[]',
  'searched for the person by name', 'interpretation', NULL, 'found',
  'openai/gpt-oss-20b', '2.0', 0.6, CURRENT_TIMESTAMP, 1,
  'photo', '["people"]', '["person","appearance"]', '[]',
  '["typed_query"]', '[]', 'confirmed', 'human_v2'
)
ON CONFLICT(id) DO NOTHING;

INSERT INTO human_audits (id, evidence_id, verdict, auditor_label, notes, audited_at)
VALUES (
  'audit_20260920_face_indexing', 'ev_23562978cccbc0dfdc94dc4f',
  'partially_accurate', 'PM source review',
  'The user reports repeated name searches that missed known photos and later discovered an unindexed face. Corrected the model non-verbatim quote, failure stage from evaluation to interpretation/indexing, outcome from not_found to found later, and existence to confirmed. No exact typed query or forgotten context is stated.',
  CURRENT_TIMESTAMP
)
ON CONFLICT(id) DO NOTHING;

UPDATE review_candidates
SET decision = 'human_admitted', reviewed_at = CURRENT_TIMESTAMP,
  review_note = 'Source checked and corrected; see audit_20260920_face_indexing.'
WHERE external_id = '332668136:333104606' AND reviewed_at IS NULL;
