-- These records exercise the evidence pipeline. They are simulated, visibly labeled,
-- and excluded from research findings by include_in_findings = 0.
INSERT INTO sources (
  id, source_kind, platform, canonical_url, author_handle, published_at,
  collected_at, language, is_simulated, include_in_findings, metadata_json
) VALUES
  ('src_fixture_01', 'simulated', 'Illustrative fixture', 'fixture://photo-recall/cafe', NULL, NULL, datetime('now'), 'en', 1, 0, '{"purpose":"schema demonstration"}'),
  ('src_fixture_02', 'simulated', 'Illustrative fixture', 'fixture://photo-recall/medicine', NULL, NULL, datetime('now'), 'en', 1, 0, '{"purpose":"schema demonstration"}'),
  ('src_fixture_03', 'simulated', 'Illustrative fixture', 'fixture://photo-recall/document', NULL, NULL, datetime('now'), 'en', 1, 0, '{"purpose":"schema demonstration"}');

INSERT INTO raw_documents (
  id, source_id, external_id, title, body, content_hash, collected_at
) VALUES
  ('doc_fixture_01', 'src_fixture_01', 'fixture-cafe', 'Remembered cafe', 'I remember a tiny cafe from our Goa trip with blue chairs, but not the name or date.', 'fixture-hash-cafe-v1', datetime('now')),
  ('doc_fixture_02', 'src_fixture_02', 'fixture-medicine', 'Medicine photo', 'I took a picture of a medicine while sick last year. I remember the package color but not the month.', 'fixture-hash-medicine-v1', datetime('now')),
  ('doc_fixture_03', 'src_fixture_03', 'fixture-document', 'Old receipt', 'I need the photo of a repair receipt. I know why I took it, but cannot recall where I was.', 'fixture-hash-document-v1', datetime('now'));

INSERT INTO evidence_units (
  id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json,
  forgotten_context_json, search_attempt, failure_stage, workaround,
  retrieval_outcome, model_name, schema_version, extraction_confidence,
  extracted_at, is_human_verified
) VALUES
  ('ev_fixture_01', 'doc_fixture_01', 'A small cafe photo from a Goa trip', 'tiny cafe from our Goa trip with blue chairs', '["Goa","trip","small cafe","blue chairs"]', '["exact date","cafe name"]', 'Goa cafe', 'interpretation', 'Scrolled through the trip period', 'not_found', 'fixture', '1.0', 1.0, datetime('now'), 1),
  ('ev_fixture_02', 'doc_fixture_02', 'A photo of medicine taken during an illness', 'medicine while sick last year', '["medicine","illness","package color","last year"]', '["month","medicine name"]', 'medicine last year', 'evaluation', 'Checked screenshots and camera folders', 'abandoned', 'fixture', '1.0', 1.0, datetime('now'), 1),
  ('ev_fixture_03', 'doc_fixture_03', 'A photo of a repair receipt', 'photo of a repair receipt', '["repair","receipt","reason for taking it"]', '["location","date","merchant"]', 'repair receipt', 'refinement', 'Tried several object keywords', 'not_found', 'fixture', '1.0', 1.0, datetime('now'), 1);

INSERT INTO evidence_tags (evidence_id, tag_type, tag_value) VALUES
  ('ev_fixture_01', 'photo_type', 'place'),
  ('ev_fixture_01', 'memory_clue', 'visual detail'),
  ('ev_fixture_02', 'photo_type', 'medicine'),
  ('ev_fixture_02', 'memory_clue', 'life event'),
  ('ev_fixture_03', 'photo_type', 'document'),
  ('ev_fixture_03', 'workaround', 'keyword iteration');

