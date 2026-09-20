-- Human-coded public reply. Groq did not return a valid structured item.
-- The user explicitly remembers where the image was taken and forgets when.
-- No typed query, result-evaluation failure, or confirmed file existence is asserted.

INSERT INTO sources (
  id, source_kind, platform, canonical_url, author_handle, published_at,
  collected_at, language, is_simulated, include_in_findings, metadata_json
)
SELECT 'src_1d3f98f5d3d779238336786b', 'google_support', 'Google Photos Community',
  canonical_url, NULL, NULL, collected_at, 'en', 0, 1,
  '{"threadId":"5343478","postId":"25656087","extractionMethod":"public_reply"}'
FROM review_candidates WHERE external_id = '5343478:25656087'
ON CONFLICT(id) DO NOTHING;

INSERT INTO raw_documents (
  id, source_id, collection_run_id, external_id, title, body, content_hash,
  reply_to_external_id, engagement_count, collected_at
)
SELECT 'doc_1d3f98f5d3d779238336786b', 'src_1d3f98f5d3d779238336786b',
  collection_run_id, '25656087', title, body,
  'd827b0ef21dced32c9b901be97581faf63f7c77018531726e191b05204c01bd8',
  '5343478', NULL, collected_at
FROM review_candidates WHERE external_id = '5343478:25656087'
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
  'ev_1d3f98f5d3d779238336786b', 'doc_1d3f98f5d3d779238336786b',
  'picture taken at a remembered location',
  'I was looking for a picture that I remember exactly where I took but I don''t remember when.',
  '["location where the picture was taken"]', '["when it was taken"]',
  'wanted to browse photos on a world map', 'unknown', NULL, 'not_found',
  'human_source_coding', '2.0', 0, CURRENT_TIMESTAMP, 1,
  'photo', '["unknown"]', '["place"]', '["date"]',
  '["map_browse_request"]', '[]', 'uncertain', 'human_v2'
)
ON CONFLICT(id) DO NOTHING;

INSERT INTO human_audits (id, evidence_id, verdict, auditor_label, notes, audited_at)
VALUES (
  'audit_20260920_map_reply', 'ev_1d3f98f5d3d779238336786b',
  'accurate', 'PM source review',
  'Direct first-person retrieval attempt. The user explicitly remembers the location but not the date and asks for map-based browsing. The actual place, typed search terms, file-existence confirmation, and failure stage are not stated. Groq returned no valid structured item; this coding is human-authored.',
  CURRENT_TIMESTAMP
)
ON CONFLICT(id) DO NOTHING;

UPDATE review_candidates
SET decision = 'human_admitted', reviewed_at = CURRENT_TIMESTAMP,
  review_note = 'Human-coded after no valid model output; see audit_20260920_map_reply.'
WHERE external_id = '5343478:25656087' AND reviewed_at IS NULL;
