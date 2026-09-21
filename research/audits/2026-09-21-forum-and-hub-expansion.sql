PRAGMA foreign_keys = ON;

-- Three source-checked retrieval stories from the 2026-09-21 expansion.
-- Groq's model_out_of_scope / low_confidence decisions remain in review_candidates.
-- This file records the separate human judgement and never rewrites model output.

-- 1. A user remembers the place but explicitly forgets when the photo was taken.
INSERT OR IGNORE INTO sources
  (id, source_kind, platform, canonical_url, published_at, collected_at, language, is_simulated, include_in_findings, metadata_json)
SELECT 'src_human_webapps_map', source_kind, 'Web Applications Stack Exchange', canonical_url,
  '2019-12-23', collected_at, 'en', 0, 1,
  '{"curationMethod":"human_source_audit","candidateId":"rev_5f6e8edf48d314c70d9ac0f3"}'
FROM review_candidates WHERE id = 'rev_5f6e8edf48d314c70d9ac0f3';

INSERT OR IGNORE INTO raw_documents
  (id, source_id, collection_run_id, external_id, title, body, content_hash, collected_at)
SELECT 'doc_human_webapps_map', 'src_human_webapps_map', collection_run_id, external_id, title, body,
  '0d1b01bf1f4446f005dd64bc982157a3a931f7e710d5a365ff2a5c34556fd3fc', collected_at
FROM review_candidates WHERE id = 'rev_5f6e8edf48d314c70d9ac0f3';

INSERT OR IGNORE INTO evidence_units
  (id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json, forgotten_context_json,
   search_attempt, failure_stage, workaround, retrieval_outcome, model_name, schema_version,
   extraction_confidence, extracted_at, is_human_verified, photo_kind, target_types_json,
   remembered_clue_types_json, explicitly_forgotten_json, search_methods_json, exact_queries_json,
   existence_status, coding_status)
VALUES
  ('ev_human_webapps_map', 'doc_human_webapps_map', 'a photo taken at a remembered place',
   'Sometimes I remember places but not the time when I have taken a photo.',
   '["place where the photo was taken"]', '["when the photo was taken"]',
   'Wanted to browse Google Photos on a map using the remembered place', 'expression', NULL, 'not_found',
   'human_source_coding', 'human-v2', 1.0, '2026-09-21T17:05:00Z', 1, 'photo',
   '["outdoor_place"]', '["place"]', '["date"]', '["map_browse_request"]', '[]', 'uncertain', 'human_v2');

INSERT OR REPLACE INTO human_audits VALUES
  ('audit_20260921_webapps_map', 'ev_human_webapps_map', 'accurate', 'researcher',
   'Original public question checked. The user explicitly remembers places, forgets the time, and asks for a map to turn that place memory into a retrieval path. The exact place and file existence are not stated.',
   '2026-09-21T17:05:00Z');
INSERT OR REPLACE INTO opportunity_codings VALUES
  ('ev_human_webapps_map', 'clue_expression',
   'The user retains a place clue but cannot express it through the desired map-based retrieval path when the date is forgotten.',
   'researcher', '2026-09-21T17:05:00Z');
UPDATE review_candidates SET decision = 'human_admitted', reviewed_at = '2026-09-21T17:05:00Z',
  review_note = 'Original forum page checked; admitted as a place-remembered, date-forgotten retrieval story.'
WHERE id = 'rev_5f6e8edf48d314c70d9ac0f3';

-- 2. A remembered cabin cannot be used as a location clue because no place name was created.
INSERT OR IGNORE INTO sources
  (id, source_kind, platform, canonical_url, published_at, collected_at, language, is_simulated, include_in_findings, metadata_json)
SELECT 'src_human_webapps_cabin', source_kind, 'Web Applications Stack Exchange', canonical_url,
  '2023-12-27', collected_at, 'en', 0, 1,
  '{"curationMethod":"human_source_audit","candidateId":"rev_a212be92cda71bf0354f2ab2"}'
FROM review_candidates WHERE id = 'rev_a212be92cda71bf0354f2ab2';

INSERT OR IGNORE INTO raw_documents
  (id, source_id, collection_run_id, external_id, title, body, content_hash, collected_at)
SELECT 'doc_human_webapps_cabin', 'src_human_webapps_cabin', collection_run_id, external_id, title, body,
  '8427e8be040965a3446d3d158c4634fe6761a915a13bc7624c24c3dd3f135881', collected_at
FROM review_candidates WHERE id = 'rev_a212be92cda71bf0354f2ab2';

INSERT OR IGNORE INTO evidence_units
  (id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json, forgotten_context_json,
   search_attempt, failure_stage, workaround, retrieval_outcome, model_name, schema_version,
   extraction_confidence, extracted_at, is_human_verified, photo_kind, target_types_json,
   remembered_clue_types_json, explicitly_forgotten_json, search_methods_json, exact_queries_json,
   existence_status, coding_status)
VALUES
  ('ev_human_webapps_cabin', 'doc_human_webapps_cabin', 'a picture taken at the user''s cabin',
   'Find a picture taken at my cabin which is in the middle of nowhere and therefore Google doesn''t automatically create a location name for it.',
   '["the cabin where the picture was taken"]', '[]',
   'Tried to retrieve the picture through its location and wanted to narrow it on a map', 'interpretation', NULL, 'not_found',
   'human_source_coding', 'human-v2', 1.0, '2026-09-21T17:06:00Z', 1, 'photo',
   '["outdoor_place"]', '["place"]', '[]', '["map_browse_request"]', '[]', 'uncertain', 'human_v2');

INSERT OR REPLACE INTO human_audits VALUES
  ('audit_20260921_webapps_cabin', 'ev_human_webapps_cabin', 'accurate', 'researcher',
   'Original public question checked. The target and remembered cabin are explicit; Google Photos does not create a usable location name. No forgotten detail or exact typed query is claimed.',
   '2026-09-21T17:06:00Z');
INSERT OR REPLACE INTO opportunity_codings VALUES
  ('ev_human_webapps_cabin', 'clue_interpretation',
   'A precise remembered place does not become a searchable location label, so the clue cannot narrow the library.',
   'researcher', '2026-09-21T17:06:00Z');
UPDATE review_candidates SET decision = 'human_admitted', reviewed_at = '2026-09-21T17:06:00Z',
  review_note = 'Original forum page checked; admitted as a place-clue interpretation failure.'
WHERE id = 'rev_a212be92cda71bf0354f2ab2';

-- 3. Photos visible on a Google Hub cannot be reached again as a group in the library.
INSERT OR IGNORE INTO sources
  (id, source_kind, platform, canonical_url, published_at, collected_at, language, is_simulated, include_in_findings, metadata_json)
SELECT 'src_human_hub_407763097', source_kind, 'Google Photos Community', canonical_url,
  NULL, collected_at, 'en', 0, 1,
  '{"curationMethod":"human_source_audit","candidateId":"rev_3e0f91ca877e96e4b91947e8"}'
FROM review_candidates WHERE id = 'rev_3e0f91ca877e96e4b91947e8';

INSERT OR IGNORE INTO raw_documents
  (id, source_id, collection_run_id, external_id, title, body, content_hash, collected_at)
SELECT 'doc_human_hub_407763097', 'src_human_hub_407763097', collection_run_id, external_id, title, body,
  '88ec958ffb6bc84786b4aa4bdaa646a8b4569febe87a72374ac4b6e02983677f', collected_at
FROM review_candidates WHERE id = 'rev_3e0f91ca877e96e4b91947e8';

INSERT OR IGNORE INTO evidence_units
  (id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json, forgotten_context_json,
   search_attempt, failure_stage, workaround, retrieval_outcome, model_name, schema_version,
   extraction_confidence, extracted_at, is_human_verified, photo_kind, target_types_json,
   remembered_clue_types_json, explicitly_forgotten_json, search_methods_json, exact_queries_json,
   existence_status, coding_status)
VALUES
  ('ev_human_hub_407763097', 'doc_human_hub_407763097', 'photos currently displayed on the user''s Google Hub',
   'I can''t find the pictures that are being displayed on my Google HUB.',
   '["the photos are visible on Google Hub","date and sometimes location labels","Family and Friends label"]', '[]',
   'Looked for the displayed photos and considered searching for each one individually', 'evaluation',
   'Search for each displayed photo individually', 'not_found', 'human_source_coding', 'human-v2', 1.0,
   '2026-09-21T17:07:00Z', 1, 'photo', '["people"]',
   '["memory_surface","approximate_time","place","library_state"]', '[]',
   '["visual_scan","typed_query"]', '[]', 'confirmed', 'human_v2');

INSERT OR REPLACE INTO human_audits VALUES
  ('audit_20260921_hub', 'ev_human_hub_407763097', 'accurate', 'researcher',
   'Original Google Photos Community post checked. The photos exist because they are displayed on Hub; the user cannot reopen the surfaced set in Photos and names individual search as a burdensome workaround.',
   '2026-09-21T17:07:00Z');
INSERT OR REPLACE INTO opportunity_codings VALUES
  ('ev_human_hub_407763097', 'library_access',
   'Google has already surfaced the photos, but the user has no direct path from that surfaced set back to the underlying library items.',
   'researcher', '2026-09-21T17:07:00Z');
UPDATE review_candidates SET decision = 'human_admitted', reviewed_at = '2026-09-21T17:07:00Z',
  review_note = 'Original Google Photos Community page checked; admitted as a resurfacing-to-library access failure.'
WHERE id = 'rev_3e0f91ca877e96e4b91947e8';
