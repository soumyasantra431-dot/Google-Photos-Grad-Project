-- Human-reviewed product decomposition for the currently admitted corpus.
-- This is deliberately separate from the portable schema migration.
INSERT INTO opportunity_codings
  (evidence_id, problem_mechanism, rationale, coded_by, coded_at)
VALUES
  ('ev_730921585171656c9bdd375b', 'clue_expression',
   'The user remembers the target through another image but cannot use that visual reference as the search input they need.',
   'PM source review', CURRENT_TIMESTAMP),
  ('ev_1d3f98f5d3d779238336786b', 'clue_expression',
   'The user remembers the exact place but needs a spatial browsing input because the date is unavailable.',
   'PM source review', CURRENT_TIMESTAMP),
  ('ev_23562978cccbc0dfdc94dc4f', 'clue_interpretation',
   'A person-name query misses the target because the second face was not recognized or indexed.',
   'PM source review', CURRENT_TIMESTAMP),
  ('ev_7caedc4e3b87ed400e4f664a', 'clue_interpretation',
   'The system treats a saved description as a semantic theme instead of matching the user-provided keyword.',
   'PM source review', CURRENT_TIMESTAMP),
  ('ev_cdd113943654b7452a3a0378', 'clue_interpretation',
   'Several grounded object, animal, name, appearance, and time clues fail to surface the known target.',
   'PM source review', CURRENT_TIMESTAMP),
  ('ev_5cb83656d3a1091ae20950f1', 'clue_interpretation',
   'The target is remembered clearly, but both the correct animal query and the prior machine label return irrelevant results.',
   'PM source review', CURRENT_TIMESTAMP),
  ('ev_75e2c48be4040202c42cfb93', 'search_refinement',
   'The user tries multiple terms, still cannot converge, and asks for a different visual-search method.',
   'PM source review', CURRENT_TIMESTAMP),
  ('ev_4fb1bb93ea3929165b273858', 'library_access',
   'The remembered photo may be hidden and cannot be reached through recent, places, selfies, device folders, or hidden-folder search.',
   'PM source review', CURRENT_TIMESTAMP),
  ('ev_299801e1f46faa55bd584b8f', 'library_access',
   'The user saw the target in a memory surface but cannot navigate the library far enough back to reach it again.',
   'PM source review', CURRENT_TIMESTAMP)
ON CONFLICT(evidence_id) DO UPDATE SET
  problem_mechanism = excluded.problem_mechanism,
  rationale = excluded.rationale,
  coded_by = excluded.coded_by,
  coded_at = excluded.coded_at;
