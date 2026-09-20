-- v2 coding keeps absence of evidence separate from an explicitly forgotten detail.
ALTER TABLE evidence_units ADD COLUMN photo_kind TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE evidence_units ADD COLUMN target_types_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE evidence_units ADD COLUMN remembered_clue_types_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE evidence_units ADD COLUMN explicitly_forgotten_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE evidence_units ADD COLUMN search_methods_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE evidence_units ADD COLUMN exact_queries_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE evidence_units ADD COLUMN existence_status TEXT NOT NULL DEFAULT 'uncertain';
ALTER TABLE evidence_units ADD COLUMN coding_status TEXT NOT NULL DEFAULT 'legacy';

-- The three admitted episodes were checked against their source text and audit notes.
-- None explicitly states a forgotten date, place, album or filename.
UPDATE evidence_units SET
  photo_kind = 'photo',
  target_types_json = '["people","animal"]',
  remembered_clue_types_json = '["person","animal","memory_surface"]',
  search_methods_json = '["timeline_browse"]',
  existence_status = 'confirmed',
  coding_status = 'human_v2'
WHERE id = 'ev_299801e1f46faa55bd584b8f';

UPDATE evidence_units SET
  photo_kind = 'photo',
  target_types_json = '["everyday_place"]',
  remembered_clue_types_json = '["place","library_state"]',
  search_methods_json = '["folder_browse","typed_query"]',
  existence_status = 'uncertain',
  coding_status = 'human_v2'
WHERE id = 'ev_4fb1bb93ea3929165b273858';

UPDATE evidence_units SET
  photo_kind = 'photo',
  target_types_json = '["people","travel_place"]',
  remembered_clue_types_json = '["person","place","appearance"]',
  search_methods_json = '["typed_query","reference_image_request"]',
  existence_status = 'uncertain',
  coding_status = 'human_v2'
WHERE id = 'ev_75e2c48be4040202c42cfb93';
