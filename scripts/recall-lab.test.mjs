import assert from "node:assert/strict";
import test from "node:test";
import { evaluateLabChoice, keywordRank, labPhotos, labTasks, publicLabCatalog, safeRankedIds } from "../worker/recallLab.ts";

test("synthetic tasks have unique known targets but public catalog does not expose target IDs", () => {
  assert.equal(labPhotos.length, 27);
  assert.equal(labTasks.length, 3);
  assert.equal(new Set(labPhotos.map((photo) => photo.id)).size, 27);
  for (const task of labTasks) assert.ok(labPhotos.some((photo) => photo.id === task.targetId));
  assert.equal(publicLabCatalog().tasks.some((task) => "targetId" in task), false);
});

test("specific remembered clues rank their synthetic targets first without the model", () => {
  assert.equal(keywordRank("brown dog yellow collar by lake")[0], "P07");
  assert.equal(keywordRank("man yellow shirt blue boat beach")[0], "T04");
  assert.equal(keywordRank("family blue cake silver balloons")[0], "E08");
});

test("model IDs are restricted to the known corpus and de-duplicated", () => {
  const fallback = keywordRank("dog");
  const ranked = safeRankedIds(["P07", "P07", "UNKNOWN", "T04", "E08"], fallback);
  assert.deepEqual(ranked.slice(0, 3), ["P07", "T04", "E08"]);
  assert.equal(ranked.length, 27);
  assert.equal(safeRankedIds(["UNKNOWN"], fallback), fallback);
});

test("evaluation uses server-side target IDs", () => {
  assert.deepEqual(evaluateLabChoice("pet", "P07"), { correct: true, targetId: "P07" });
  assert.deepEqual(evaluateLabChoice("pet", "P02"), { correct: false, targetId: "P07" });
  assert.equal(evaluateLabChoice("not-a-task", "P07"), null);
});
