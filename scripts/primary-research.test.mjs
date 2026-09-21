import assert from "node:assert/strict";
import test from "node:test";
import { buildPrimaryResearchSummary } from "../worker/primaryResearch.ts";

test("keeps survey evidence separate and uses episode-specific denominators", () => {
  const result = buildPrimaryResearchSummary();
  assert.equal(result.study.responseCount, 8);
  assert.equal(result.study.currentUserCount, 7);
  assert.equal(result.study.recentEpisodeCount, 7);
  assert.equal(result.study.effortOrFailureCount, 3);
  assert.equal(result.episodes.length, 7);
});

test("counts explicitly forgotten album context without inferring it", () => {
  const result = buildPrimaryResearchSummary();
  assert.deepEqual(result.patterns.forgotten[0], { code: "album_or_folder", label: "Album or folder", count: 5 });
  assert.equal(result.patterns.forgotten.find((item) => item.code === "date")?.count, 3);
  assert.equal(result.patterns.forgotten.find((item) => item.code === "place")?.count, 3);
});
