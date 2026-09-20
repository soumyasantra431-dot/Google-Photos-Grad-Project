-- A beach need not be a trip and a bathroom need not be a generic everyday scene.
-- Recode only the visible setting, keeping both original source excerpts and audit history.
UPDATE evidence_units SET target_types_json = '["people","outdoor_place"]'
WHERE id = 'ev_75e2c48be4040202c42cfb93' AND is_human_verified = 1;

UPDATE evidence_units SET target_types_json = '["indoor_place"]'
WHERE id = 'ev_4fb1bb93ea3929165b273858' AND is_human_verified = 1;
