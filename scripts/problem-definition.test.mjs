import assert from "node:assert/strict";
import test from "node:test";
import { buildProblemDefinition } from "../worker/problem.ts";

const base = {
  id: "e1",
  problem_mechanism: "clue_interpretation",
  rationale: "The clue did not surface the target.",
  retrieval_outcome: "not_found",
  workaround: "manual timeline scroll",
  is_human_verified: 1,
  source_kind: "reddit",
  source_text: "I searched for the object but could not find the photo.",
  canonical_url: "https://example.org/e1",
};

test("builds a provisional focus from clue-interpretation evidence", () => {
  const result = buildProblemDefinition([
    base,
    { ...base, id: "e2", source_kind: "google_support", workaround: null },
    { ...base, id: "e3", problem_mechanism: "library_access" },
  ], 3);
  assert.equal(result.status, "provisional_focus");
  assert.equal(result.evidence.focusStories, 2);
  assert.deepEqual(result.evidence.sourceKinds.sort(), ["google_support", "reddit"]);
  assert.equal(result.evidence.workaroundStories, 1);
  assert.match(result.caveat, /not a market-sized conclusion/i);
});

test("keeps an empty focus transparent", () => {
  const result = buildProblemDefinition([{ ...base, problem_mechanism: "library_access" }], 1);
  assert.equal(result.evidence.focusStories, 0);
  assert.equal(result.evidence.examples.length, 0);
});
