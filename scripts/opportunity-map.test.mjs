import assert from "node:assert/strict";
import test from "node:test";
import { buildOpportunityMap } from "../worker/opportunity.ts";

const base = {
  id: "e1",
  problem_mechanism: "clue_interpretation",
  rationale: "The supplied clue does not surface the target.",
  retrieval_outcome: "not_found",
  workaround: null,
  is_human_verified: 1,
  source_kind: "reddit",
  source_text: "I searched for the remembered object but did not find it.",
  canonical_url: "https://example.org/e1",
};

test("compares every journey mechanism, including mechanisms not yet observed", () => {
  const result = buildOpportunityMap([base], 2);
  assert.equal(result.areas.length, 5);
  assert.equal(result.coverage.mechanismCodedEpisodes, 1);
  assert.equal(result.coverage.uncodedEpisodes, 1);
  assert.equal(result.areas.find((area) => area.code === "result_evaluation")?.evidenceStrength, "not_observed");
});

test("multi-source evidence is directional only after three episodes across two source families", () => {
  const rows = [
    base,
    { ...base, id: "e2", source_kind: "google_support" },
    { ...base, id: "e3", source_kind: "reddit", retrieval_outcome: "found", workaround: "timeline scan" },
  ];
  const result = buildOpportunityMap(rows, 3);
  const interpretation = result.areas.find((area) => area.code === "clue_interpretation");
  assert.equal(interpretation?.evidenceStrength, "multi_source_directional");
  assert.equal(interpretation?.unresolvedEpisodes, 2);
  assert.equal(interpretation?.workaroundEpisodes, 1);
  assert.equal(result.comparison.mostObservedMechanism?.code, "clue_interpretation");
});
