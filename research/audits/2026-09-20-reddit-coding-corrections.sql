-- PM audit of four source-linked Reddit retrieval episodes. Preserve model output
-- in review_candidates; correct only claims directly supported by the linked post.

UPDATE evidence_units SET
  retrieval_target = 'older photo of the same distinct item shown in a recent photo',
  remembered_clues_json = '["appearance of the item in a recent reference photo"]',
  forgotten_context_json = '["when the older photo was taken"]',
  search_attempt = 'asks whether a recent photo can be used to find the older match',
  workaround = 'tries to use a recent photo as a visual reference',
  target_types_json = '["object"]',
  remembered_clue_types_json = '["object","reference_image"]',
  explicitly_forgotten_json = '["date"]',
  search_methods_json = '["reference_image_request"]',
  is_human_verified = 1,
  coding_status = 'human_corrected'
WHERE id = 'ev_730921585171656c9bdd375b';

UPDATE evidence_units SET
  remembered_clues_json = '["grandmother''s cat Sweety","cat appearance","rough years grandmother had the cat"]',
  search_attempt = 'Calico Cat; White Cat; Cats; Stairway; Steps; Sweety; Cats plus 2006, 2007, and 2008',
  failure_stage = 'interpretation',
  workaround = 'scrolled through years of photos around when grandmother had the cat',
  retrieval_outcome = 'found',
  remembered_clue_types_json = '["animal","person","approximate_time","appearance"]',
  search_methods_json = '["typed_query","timeline_browse"]',
  exact_queries_json = '["Calico Cat","White Cat","Cats","Stairway","Steps","Sweety","Cats 2006"]',
  is_human_verified = 1,
  coding_status = 'human_corrected'
WHERE id = 'ev_cdd113943654b7452a3a0378';

UPDATE evidence_units SET
  retrieval_target = 'childhood photo of the commenter''s daughter singing Toto',
  remembered_clues_json = '["daughter when she was little","singing Toto","saved description phrase"]',
  search_attempt = 'searched a saved keyword phrase; search returned thematic guesses instead of the described photo',
  failure_stage = 'interpretation',
  remembered_clue_types_json = '["person","approximate_time","event","text"]',
  search_methods_json = '["typed_query"]',
  exact_queries_json = '["singing all the way"]',
  is_human_verified = 1,
  coding_status = 'human_corrected'
WHERE id = 'ev_7caedc4e3b87ed400e4f664a';

UPDATE evidence_units SET
  search_attempt = 'searched groundhog, then dog after an earlier label; neither found the target',
  failure_stage = 'interpretation',
  remembered_clue_types_json = '["animal","object","place","event"]',
  search_methods_json = '["typed_query"]',
  exact_queries_json = '["groundhog","dog"]',
  is_human_verified = 1,
  coding_status = 'human_corrected'
WHERE id = 'ev_5cb83656d3a1091ae20950f1';

INSERT INTO human_audits (id, evidence_id, verdict, auditor_label, notes, audited_at)
VALUES
  ('audit_20260920_reddit_xl693t', 'ev_730921585171656c9bdd375b', 'partially_accurate', 'PM source review',
   'The model omitted the explicit forgotten date and misread library size as the remembered clue. Full linked post says the user has a recent image of the same distinctive item and asks to use it as a visual query.', CURRENT_TIMESTAMP),
  ('audit_20260920_reddit_cat', 'ev_cdd113943654b7452a3a0378', 'partially_accurate', 'PM source review',
   'Full linked post enumerates attempted queries and says the user ultimately found the cat photo by scrolling years around the period the grandmother had the cat.', CURRENT_TIMESTAMP),
  ('audit_20260920_reddit_daughter', 'ev_7caedc4e3b87ed400e4f664a', 'partially_accurate', 'PM source review',
   'Linked comment specifies a childhood photo of the daughter singing Toto and the saved keyword phrase; failure is interpretation of literal metadata, not result evaluation.', CURRENT_TIMESTAMP),
  ('audit_20260920_reddit_groundhog', 'ev_5cb83656d3a1091ae20950f1', 'partially_accurate', 'PM source review',
   'Linked comment specifies groundhog and dog queries with irrelevant results. No date was explicitly forgotten.', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO NOTHING;

UPDATE review_candidates
SET reviewed_at = CURRENT_TIMESTAMP,
  review_note = 'PM checked the linked public post and corrected episode coding; see human_audits.'
WHERE source_kind = 'reddit'
  AND external_id IN ('xl693t', '1jbiao1-op', '1lklsk2-daughter-keyword-comment', '1fvq7hr-groundhog-comment')
  AND reviewed_at IS NULL;
