import assert from "node:assert/strict";
import test from "node:test";
import { buildDeterministicAnalysis } from "../worker/analysis.ts";

const base = {
  source_text: "I cannot remember the date, so I searched for yellow sticky note.",
  evidence_excerpt: "I cannot remember the date",
  source_kind: "forum",
  canonical_url: "https://example.org/story",
  retrieval_target: "an old note photo",
  target_types_json: '["object"]',
  remembered_clue_types_json: '["object","appearance"]',
  explicitly_forgotten_json: '["date"]',
  search_methods_json: '["typed_query"]',
  exact_queries_json: '["yellow sticky note"]',
  failure_stage: "interpretation",
  retrieval_outcome: "not_found",
  workaround: null,
  problem_mechanism: "clue_interpretation",
  rationale: "The query missed the known photo.",
};

test("forgotten-context fallback counts only explicit forgetting and cites evidence", () => {
  const result = buildDeterministicAnalysis("forgotten_context", [{ ...base, id: "e1" }, { ...base, id: "e2", explicitly_forgotten_json: "[]" }]);
  assert.match(result.answer, /date \(1\)/);
  assert.deepEqual(result.insights[0].evidenceIds, ["e1"]);
  assert.match(result.insights[0].finding, /Other absent details are not inferred/);
});

test("search-language fallback separates methods from exact query words", () => {
  const result = buildDeterministicAnalysis("search_language", [{ ...base, id: "e1" }]);
  assert.match(result.answer, /typed queries \(1\)/);
  assert.equal(result.insights.length, 2);
  assert.match(result.insights[1].finding, /1 exact reported query/);
  assert.deepEqual(result.insights[1].evidenceIds, ["e1"]);
});
