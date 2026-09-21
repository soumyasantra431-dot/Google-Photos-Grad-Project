-- A separate, human-reviewed product decomposition layer. This keeps source
-- text and AI extraction independent from PM opportunity framing.
CREATE TABLE opportunity_codings (
  evidence_id TEXT PRIMARY KEY REFERENCES evidence_units(id) ON DELETE CASCADE,
  problem_mechanism TEXT NOT NULL CHECK (problem_mechanism IN (
    'clue_expression',
    'clue_interpretation',
    'result_evaluation',
    'search_refinement',
    'library_access'
  )),
  rationale TEXT NOT NULL,
  coded_by TEXT NOT NULL,
  coded_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_opportunity_codings_mechanism
  ON opportunity_codings(problem_mechanism);
