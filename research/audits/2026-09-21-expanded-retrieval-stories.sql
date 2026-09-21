PRAGMA foreign_keys = ON;

-- Human review of the 2026-09-21 targeted expansion. Groq's original outputs
-- remain in review_candidates; these inserts are a separate audit layer.

-- The model-retained large-album case: correct the structured coding and verify it.
UPDATE evidence_units SET
  retrieval_target = 'a specific picture inside a 1,400-photo album',
  evidence_excerpt = 'I did CtrlF when I opened the Album, but it shows 0 results',
  remembered_clues_json = '["the album containing the photo","the photo is visibly present in the album"]',
  forgotten_context_json = '[]',
  search_attempt = 'Opened the known album and tried Ctrl+F',
  failure_stage = 'evaluation',
  workaround = 'Manual scanning through more than 1,400 photos',
  retrieval_outcome = 'not_found',
  is_human_verified = 1,
  target_types_json = '[]',
  remembered_clue_types_json = '["album_context"]',
  explicitly_forgotten_json = '[]',
  search_methods_json = '["album_search","manual_scan"]',
  exact_queries_json = '[]',
  existence_status = 'confirmed',
  coding_status = 'human_v2'
WHERE id = 'ev_3304f6741048cce1eee1e771';

INSERT OR REPLACE INTO human_audits
  (id, evidence_id, verdict, auditor_label, notes, audited_at)
VALUES
  ('audit_20260921_large_album', 'ev_3304f6741048cce1eee1e771', 'partially_accurate', 'researcher',
   'Source checked. The target is a known photo inside a known album; the failure is recognizing or isolating it among 1,400 items after in-album search returns zero.',
   '2026-09-21T09:15:00Z');

INSERT OR REPLACE INTO opportunity_codings
  (evidence_id, problem_mechanism, rationale, coded_by, coded_at)
VALUES
  ('ev_3304f6741048cce1eee1e771', 'result_evaluation',
   'The photo is known to be inside the album, but the user cannot isolate or recognize it without manually scanning 1,400 images.',
   'researcher', '2026-09-21T09:15:00Z');

UPDATE review_candidates SET decision = 'human_admitted', reviewed_at = '2026-09-21T09:15:00Z',
  review_note = 'Public source checked; AI extraction corrected and human verified.'
WHERE id = 'rev_2acf96825c536dbfb52dde0f';

-- Helper pattern for seven candidates that Groq rejected or scored below the
-- automatic threshold. Each source and document is copied from the preserved
-- candidate; the human interpretation is added below it.

-- 1. A missed face tag blocks person-based retrieval.
INSERT OR IGNORE INTO sources
  (id, source_kind, platform, canonical_url, published_at, collected_at, language, is_simulated, include_in_findings, metadata_json)
SELECT 'src_human_11er7fc', source_kind, 'Reddit', canonical_url, '2023-03-01', collected_at, 'en', 0, 1,
  '{"curationMethod":"human_source_audit","candidateId":"rev_3412518ba5bc74d733009ae5"}'
FROM review_candidates WHERE id = 'rev_3412518ba5bc74d733009ae5';

INSERT OR IGNORE INTO raw_documents
  (id, source_id, collection_run_id, external_id, title, body, content_hash, collected_at)
SELECT 'doc_human_11er7fc', s.id, r.collection_run_id, r.external_id, r.title, r.body,
  '40295bbe6e047af98184562ceabc324a92985ad04f951563614aea194daa254e', r.collected_at
FROM review_candidates r JOIN sources s ON s.canonical_url = r.canonical_url
WHERE r.id = 'rev_3412518ba5bc74d733009ae5';

INSERT OR IGNORE INTO evidence_units
  (id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json, forgotten_context_json,
   search_attempt, failure_stage, workaround, retrieval_outcome, model_name, schema_version,
   extraction_confidence, extracted_at, is_human_verified, photo_kind, target_types_json,
   remembered_clue_types_json, explicitly_forgotten_json, search_methods_json, exact_queries_json,
   existence_status, coding_status)
VALUES
  ('ev_human_11er7fc', 'doc_human_11er7fc', 'a specific photo of someone',
   'It drives me nuts to be looking for a specific photo of someone just to find they aren''t tagged because it didn''t recognize their very obvious face, from straight on, as a face.',
   '["the person in the photo","their clearly visible face"]', '[]', 'Looked for the photo using the person tag',
   'interpretation', NULL, 'found', 'human_source_coding', 'human-v2', 1.0, '2026-09-21T09:16:00Z', 1,
   'photo', '["people"]', '["person","appearance"]', '[]', '["person_search"]', '[]', 'confirmed', 'human_v2');

INSERT OR REPLACE INTO human_audits VALUES
  ('audit_20260921_11er7fc', 'ev_human_11er7fc', 'accurate', 'researcher',
   'Source checked. The user searched for a known photo of a person and later discovered the visible face had not been recognized or tagged.',
   '2026-09-21T09:16:00Z');
INSERT OR REPLACE INTO opportunity_codings VALUES
  ('ev_human_11er7fc', 'clue_interpretation', 'The remembered person clue fails because the face in the target photo was not indexed.', 'researcher', '2026-09-21T09:16:00Z');
UPDATE review_candidates SET decision = 'human_admitted', reviewed_at = '2026-09-21T09:16:00Z',
  review_note = 'Low-confidence Groq output reviewed and admitted with corrected coding.'
WHERE id = 'rev_3412518ba5bc74d733009ae5';

-- 2. Exact document clues produce thousands of irrelevant results.
INSERT OR IGNORE INTO raw_documents
  (id, source_id, collection_run_id, external_id, title, body, content_hash, collected_at)
SELECT 'doc_human_passport', s.id, r.collection_run_id, r.external_id, r.title, r.body,
  '69f46fb2fbddc9b69c6a92a3ea67a62dade8667b25df658ec2813e36fd875753', r.collected_at
FROM review_candidates r JOIN sources s ON s.canonical_url = r.canonical_url
WHERE r.id = 'rev_4e0bbc35864fd31bfe2cd1be';

INSERT OR IGNORE INTO evidence_units
  (id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json, forgotten_context_json,
   search_attempt, failure_stage, workaround, retrieval_outcome, model_name, schema_version,
   extraction_confidence, extracted_at, is_human_verified, photo_kind, target_types_json,
   remembered_clue_types_json, explicitly_forgotten_json, search_methods_json, exact_queries_json,
   existence_status, coding_status)
VALUES
  ('ev_human_passport', 'doc_human_passport', 'a photo of a passport or Global Entry card',
   'Need a pic of passport? Just type "Passport". Forgot your Known Traveler Number? Search "Global Entry Card". Now I search any of the above and it shows me thousands of photos with absolutely no relevance.',
   '["passport","Global Entry card","document text"]', '[]', 'Typed the document names into search',
   'interpretation', NULL, 'not_found', 'human_source_coding', 'human-v2', 1.0, '2026-09-21T09:17:00Z', 1,
   'photo', '["document"]', '["object","text"]', '[]', '["typed_query"]', '["Passport","Global Entry Card"]', 'confirmed', 'human_v2');

INSERT OR REPLACE INTO human_audits VALUES
  ('audit_20260921_passport', 'ev_human_passport', 'accurate', 'researcher',
   'Source checked. The user gives exact query wording and reports thousands of irrelevant results for a known document photo.',
   '2026-09-21T09:17:00Z');
INSERT OR REPLACE INTO opportunity_codings VALUES
  ('ev_human_passport', 'clue_interpretation', 'Specific document words are understood too broadly and the wanted photo is buried in irrelevant results.', 'researcher', '2026-09-21T09:17:00Z');
UPDATE review_candidates SET decision = 'human_admitted', reviewed_at = '2026-09-21T09:17:00Z',
  review_note = 'Groq rejection overridden after public-source review; exact query and failure are explicit.'
WHERE id = 'rev_4e0bbc35864fd31bfe2cd1be';

-- 3. Object search under-retrieves and forces manual date scrolling.
INSERT OR IGNORE INTO sources
  (id, source_kind, platform, canonical_url, published_at, collected_at, language, is_simulated, include_in_findings, metadata_json)
SELECT 'src_human_1px47il', source_kind, 'Reddit', canonical_url, '2025-12-27', collected_at, 'en', 0, 1,
  '{"curationMethod":"human_source_audit","candidateId":"rev_36744dd9789f35bd8134a0b8"}'
FROM review_candidates WHERE id = 'rev_36744dd9789f35bd8134a0b8';
INSERT OR IGNORE INTO raw_documents
  (id, source_id, collection_run_id, external_id, title, body, content_hash, collected_at)
SELECT 'doc_human_1px47il', s.id, r.collection_run_id, r.external_id, r.title, r.body,
  'c9cffee3cad247e5d8b90fb80b29e35f8e8660335228a5c893f1285a1af3f56b', r.collected_at
FROM review_candidates r JOIN sources s ON s.canonical_url = r.canonical_url
WHERE r.id = 'rev_36744dd9789f35bd8134a0b8';
INSERT OR IGNORE INTO evidence_units
  (id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json, forgotten_context_json,
   search_attempt, failure_stage, workaround, retrieval_outcome, model_name, schema_version,
   extraction_confidence, extracted_at, is_human_verified, photo_kind, target_types_json,
   remembered_clue_types_json, explicitly_forgotten_json, search_methods_json, exact_queries_json,
   existence_status, coding_status)
VALUES
  ('ev_human_1px47il', 'doc_human_1px47il', 'a photo of their dog or BBQ to show someone',
   'If I want to find a photo of something and show it to someone, I have to remember the date I took it and scroll back through the history and get the date right.',
   '["dog or puppy","BBQ","the object or scene in the wanted photo"]', '[]', 'Searched dog, puppy, and BBQ',
   'interpretation', 'Remember the exact date and manually scroll the timeline', 'unclear', 'human_source_coding', 'human-v2', 1.0,
   '2026-09-21T09:18:00Z', 1, 'photo', '["animal","food"]', '["animal","object"]', '[]',
   '["typed_query","timeline_browse"]', '["dog","puppy","BBQ"]', 'confirmed', 'human_v2');
INSERT OR REPLACE INTO human_audits VALUES
  ('audit_20260921_1px47il', 'ev_human_1px47il', 'accurate', 'researcher',
   'Source checked. Object searches return only a small subset, so the user falls back to remembering the exact date and manually scrolling.',
   '2026-09-21T09:18:00Z');
INSERT OR REPLACE INTO opportunity_codings VALUES
  ('ev_human_1px47il', 'clue_interpretation', 'Meaningful animal and object clues under-retrieve, forcing a date-based workaround.', 'researcher', '2026-09-21T09:18:00Z');
UPDATE review_candidates SET decision = 'human_admitted', reviewed_at = '2026-09-21T09:18:00Z',
  review_note = 'Low-confidence output corrected after source review; workaround captured from the same comment.'
WHERE id = 'rev_36744dd9789f35bd8134a0b8';

-- 4. The user has the local reference image but cannot use it to find the cloud copy.
INSERT OR IGNORE INTO sources
  (id, source_kind, platform, canonical_url, published_at, collected_at, language, is_simulated, include_in_findings, metadata_json)
SELECT 'src_human_xa1j13', source_kind, 'Reddit', canonical_url, '2022-09-09', collected_at, 'en', 0, 1,
  '{"curationMethod":"human_source_audit","candidateId":"rev_55f0d81d6e3336002e43b829"}'
FROM review_candidates WHERE id = 'rev_55f0d81d6e3336002e43b829';
INSERT OR IGNORE INTO raw_documents
  (id, source_id, collection_run_id, external_id, title, body, content_hash, collected_at)
SELECT 'doc_human_xa1j13', s.id, r.collection_run_id, r.external_id, r.title, r.body,
  '78a51f68ac6bb2399b69b3227d82780114e25af47b46e4d755cc28d439bdeabf', r.collected_at
FROM review_candidates r JOIN sources s ON s.canonical_url = r.canonical_url
WHERE r.id = 'rev_55f0d81d6e3336002e43b829';
INSERT OR IGNORE INTO evidence_units
  (id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json, forgotten_context_json,
   search_attempt, failure_stage, workaround, retrieval_outcome, model_name, schema_version,
   extraction_confidence, extracted_at, is_human_verified, photo_kind, target_types_json,
   remembered_clue_types_json, explicitly_forgotten_json, search_methods_json, exact_queries_json,
   existence_status, coding_status)
VALUES
  ('ev_human_xa1j13', 'doc_human_xa1j13', 'the cloud copy of a specific local photo',
   'The filename is different between my local version and the Google Photos version. How do I find this file in Google Photos so I can delete it and reupload the file with the more EXIF information?',
   '["the local reference photo","its corrected EXIF information"]', '[]', 'Wanted to search using the local photo rather than its filename',
   'expression', NULL, 'not_found', 'human_source_coding', 'human-v2', 1.0, '2026-09-21T09:19:00Z', 1,
   'photo', '["unknown"]', '["reference_image","metadata"]', '[]', '["reference_image_request"]', '[]', 'uncertain', 'human_v2');
INSERT OR REPLACE INTO human_audits VALUES
  ('audit_20260921_xa1j13', 'ev_human_xa1j13', 'accurate', 'researcher',
   'Source checked. The strongest clue is another copy of the same image, but the filename differs and image-to-library search is unavailable.',
   '2026-09-21T09:19:00Z');
INSERT OR REPLACE INTO opportunity_codings VALUES
  ('ev_human_xa1j13', 'clue_expression', 'The user has a visual reference clue but cannot submit it as the retrieval input.', 'researcher', '2026-09-21T09:19:00Z');
UPDATE review_candidates SET decision = 'human_admitted', reviewed_at = '2026-09-21T09:19:00Z',
  review_note = 'Prefilter rejection overridden after source review; this is a specific-photo reference-image retrieval task.'
WHERE id = 'rev_55f0d81d6e3336002e43b829';

-- 5. Semantic object and appearance clues no longer find a known old photo.
INSERT OR IGNORE INTO sources
  (id, source_kind, platform, canonical_url, collected_at, language, is_simulated, include_in_findings, metadata_json)
SELECT 'src_human_support373', source_kind, 'Google Photos Community', canonical_url, collected_at, 'en', 0, 1,
  '{"curationMethod":"human_source_audit","candidateId":"rev_f1f4df4ec0bfcd6ce8868218"}'
FROM review_candidates WHERE id = 'rev_f1f4df4ec0bfcd6ce8868218';
INSERT OR IGNORE INTO raw_documents
  (id, source_id, collection_run_id, external_id, title, body, content_hash, collected_at)
SELECT 'doc_human_support373', s.id, r.collection_run_id, r.external_id, r.title, r.body,
  'a94aa0c85d3f99f4ac2d5af55ef9271f1a8a2d17720567ef77fde0226ab7cc8f', r.collected_at
FROM review_candidates r JOIN sources s ON s.canonical_url = r.canonical_url
WHERE r.id = 'rev_f1f4df4ec0bfcd6ce8868218';
INSERT OR IGNORE INTO evidence_units
  (id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json, forgotten_context_json,
   search_attempt, failure_stage, workaround, retrieval_outcome, model_name, schema_version,
   extraction_confidence, extracted_at, is_human_verified, photo_kind, target_types_json,
   remembered_clue_types_json, explicitly_forgotten_json, search_methods_json, exact_queries_json,
   existence_status, coding_status)
VALUES
  ('ev_human_support373', 'doc_human_support373', 'an old photo of a tattoo on someone''s arm',
   'If I wanted to look at a picture of a tattoo on someone''s arm, I could search for the term tattoo on arm and it would immediately find the photo from 10 years ago that I wanted to find.',
   '["tattoo","someone''s arm","about 10 years ago"]', '[]', 'Typed tattoo on arm', 'interpretation',
   'Use Samsung Photos instead', 'not_found', 'human_source_coding', 'human-v2', 1.0, '2026-09-21T09:20:00Z', 1,
   'photo', '["people","object"]', '["object","appearance","approximate_time"]', '[]', '["typed_query"]',
   '["tattoo on arm"]', 'confirmed', 'human_v2');
INSERT OR REPLACE INTO human_audits VALUES
  ('audit_20260921_support373', 'ev_human_support373', 'accurate', 'researcher',
   'Public Google Photos Community source checked. The remembered object, body location, and approximate age are explicit; the user reports that known photos now return no result.',
   '2026-09-21T09:20:00Z');
INSERT OR REPLACE INTO opportunity_codings VALUES
  ('ev_human_support373', 'clue_interpretation', 'Search fails to map a natural object-plus-appearance description to a known old photo.', 'researcher', '2026-09-21T09:20:00Z');
UPDATE review_candidates SET decision = 'human_admitted', reviewed_at = '2026-09-21T09:20:00Z',
  review_note = 'Groq rejection overridden after public-source review; target, clues, query, and failure are explicit.'
WHERE id = 'rev_f1f4df4ec0bfcd6ce8868218';

-- 6. A remembered favorite is absent despite several recovery attempts.
INSERT OR IGNORE INTO sources
  (id, source_kind, platform, canonical_url, collected_at, language, is_simulated, include_in_findings, metadata_json)
SELECT 'src_human_support156', source_kind, 'Google Photos Community', canonical_url, collected_at, 'en', 0, 1,
  '{"curationMethod":"human_source_audit","candidateId":"rev_0496ccfc3417ade677674205"}'
FROM review_candidates WHERE id = 'rev_0496ccfc3417ade677674205';
INSERT OR IGNORE INTO raw_documents
  (id, source_id, collection_run_id, external_id, title, body, content_hash, collected_at)
SELECT 'doc_human_support156', s.id, r.collection_run_id, r.external_id, r.title, r.body,
  'f6cf4275e3eb849a2865a895865578957418d4a697e60975e912c1b6453258e9', r.collected_at
FROM review_candidates r JOIN sources s ON s.canonical_url = r.canonical_url
WHERE r.id = 'rev_0496ccfc3417ade677674205';
INSERT OR IGNORE INTO evidence_units
  (id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json, forgotten_context_json,
   search_attempt, failure_stage, workaround, retrieval_outcome, model_name, schema_version,
   extraction_confidence, extracted_at, is_human_verified, photo_kind, target_types_json,
   remembered_clue_types_json, explicitly_forgotten_json, search_methods_json, exact_queries_json,
   existence_status, coding_status)
VALUES
  ('ev_human_support156', 'doc_human_support156', 'a particular favorite photo of the user, a friend, or family member from an event',
   'I can see pictures from the event, but a particular photo I remember, usually of myself or a friend or family member is missing.',
   '["the event","the person in the photo","it was a favorite"]', '[]',
   'Checked Trash, Archive, and a Google Takeout download', 'refinement', 'Checked multiple recovery surfaces and exported the library',
   'not_found', 'human_source_coding', 'human-v2', 1.0, '2026-09-21T09:21:00Z', 1, 'photo', '["people"]',
   '["person","event"]', '[]', '["folder_browse","export_browse"]', '[]', 'uncertain', 'human_v2');
INSERT OR REPLACE INTO human_audits VALUES
  ('audit_20260921_support156', 'ev_human_support156', 'accurate', 'researcher',
   'Public source checked. This is one remembered favorite within a visible event set, followed by concrete checks of Trash, Archive, and Takeout.',
   '2026-09-21T09:21:00Z');
INSERT OR REPLACE INTO opportunity_codings VALUES
  ('ev_human_support156', 'library_access', 'The surrounding event photos are reachable, but the remembered favorite remains inaccessible across library and recovery surfaces.', 'researcher', '2026-09-21T09:21:00Z');
UPDATE review_candidates SET decision = 'human_admitted', reviewed_at = '2026-09-21T09:21:00Z',
  review_note = 'Groq rejection overridden after public-source review; a specific remembered target and recovery attempts are explicit.'
WHERE id = 'rev_0496ccfc3417ade677674205';

-- 7. A recently seen Memory cannot be reached again.
INSERT OR IGNORE INTO sources
  (id, source_kind, platform, canonical_url, collected_at, language, is_simulated, include_in_findings, metadata_json)
SELECT 'src_human_support444', source_kind, 'Google Photos Community', canonical_url, collected_at, 'en', 0, 1,
  '{"curationMethod":"human_source_audit","candidateId":"rev_461267b719766030099be488"}'
FROM review_candidates WHERE id = 'rev_461267b719766030099be488';
INSERT OR IGNORE INTO raw_documents
  (id, source_id, collection_run_id, external_id, title, body, content_hash, collected_at)
SELECT 'doc_human_support444', s.id, r.collection_run_id, r.external_id, r.title, r.body,
  '5671d25a52d521a64d62f34c0e9e92b34b3d6ce9117ff1ec3a8d36b310fad4bf', r.collected_at
FROM review_candidates r JOIN sources s ON s.canonical_url = r.canonical_url
WHERE r.id = 'rev_461267b719766030099be488';
INSERT OR IGNORE INTO evidence_units
  (id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json, forgotten_context_json,
   search_attempt, failure_stage, workaround, retrieval_outcome, model_name, schema_version,
   extraction_confidence, extracted_at, is_human_verified, photo_kind, target_types_json,
   remembered_clue_types_json, explicitly_forgotten_json, search_methods_json, exact_queries_json,
   existence_status, coding_status)
VALUES
  ('ev_human_support444', 'doc_human_support444', 'an old photo recently shown in Memories',
   'I saw the old picture recently, now I need to see it again and probably download it. How do I find it. Pls help',
   '["recently surfaced in Memories","an old picture"]', '[]', 'Tried to find the picture again after seeing it in Memories',
   'unknown', NULL, 'not_found', 'human_source_coding', 'human-v2', 1.0, '2026-09-21T09:22:00Z', 1,
   'photo', '["unknown"]', '["memory_surface","approximate_time"]', '[]', '["memory_surface"]', '[]', 'confirmed', 'human_v2');
INSERT OR REPLACE INTO human_audits VALUES
  ('audit_20260921_support444', 'ev_human_support444', 'accurate', 'researcher',
   'Public source checked. The user confirms recent existence through Memories but cannot navigate back to the old picture.',
   '2026-09-21T09:22:00Z');
INSERT OR REPLACE INTO opportunity_codings VALUES
  ('ev_human_support444', 'library_access', 'A photo surfaced by Memories cannot be reliably opened again after the card disappears.', 'researcher', '2026-09-21T09:22:00Z');
UPDATE review_candidates SET decision = 'human_admitted', reviewed_at = '2026-09-21T09:22:00Z',
  review_note = 'Low-confidence candidate admitted after source review; existence and cross-surface access failure are explicit.'
WHERE id = 'rev_461267b719766030099be488';

-- Explicitly document nearby candidates that remain outside the target question.
UPDATE review_candidates SET decision = 'human_excluded', reviewed_at = '2026-09-21T09:23:00Z',
  review_note = 'Feature request for finding a class of similar plants or pots; no specific remembered-photo retrieval attempt or outcome.'
WHERE id = 'rev_be069448123f599e1fd3d30a';

UPDATE review_candidates SET decision = 'human_excluded', reviewed_at = '2026-09-21T09:23:00Z',
  review_note = 'Broad missing-year library problem; not a specific remembered-photo retrieval task.'
WHERE id = 'rev_0275647af1480cc883c8ce75';
