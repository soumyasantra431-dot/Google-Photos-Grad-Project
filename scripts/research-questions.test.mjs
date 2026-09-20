import assert from "node:assert/strict";
import test from "node:test";
import { buildResearchQuestions } from "../worker/research.ts";

const example = {
  id: "e1",
  evidence_excerpt: "I cannot remember the date but searched for my daughter.",
  source_text: "I cannot remember the date but searched for my daughter.",
  canonical_url: "https://example.org/e1",
  source_kind: "google_support",
  target_types_json: '["people","people"]',
  remembered_clue_types_json: '["person"]',
  explicitly_forgotten_json: '["date"]',
  search_methods_json: '["typed_query"]',
  exact_queries_json: '["daughter"]',
  coding_status: "human_v2",
  is_human_verified: 1,
};

test("four answers have distinct denominators and deduplicate codes within an episode", () => {
  const result = buildResearchQuestions([example], 1);
  assert.equal(result.questions.length, 4);
  assert.equal(result.questions[0].patterns[0].episodes, 1);
  assert.equal(result.questions[2].patterns[0].code, "date");
  assert.equal(result.questions[3].reportedExactQueries?.[0].query, "daughter");
  assert.deepEqual(result.coverage.sourceKinds, ["google_support"]);
});

test("unmentioned details remain unknown, never inferred as forgotten", () => {
  const result = buildResearchQuestions([{ ...example, explicitly_forgotten_json: "[]", exact_queries_json: "[]" }], 1);
  assert.equal(result.questions[2].evidenceState, "not_observed");
  assert.equal(result.questions[2].observedEpisodes, 0);
  assert.deepEqual(result.questions[3].reportedExactQueries, []);
});

test("unknown photo subject is not counted as a photo type", () => {
  const result = buildResearchQuestions([{ ...example, target_types_json: '["unknown"]' }], 1);
  assert.equal(result.questions[0].observedEpisodes, 0);
  assert.deepEqual(result.questions[0].patterns, []);
});
