import assert from "node:assert/strict";
import test from "node:test";
import { evaluateLabChoice, keywordRank, labPhotos, labTasks, publicLabCatalog, safeRankedIds, validatedRankHistory } from "../worker/recallLab.ts";

test("synthetic tasks have unique known targets but public catalog does not expose target IDs", () => {
  assert.equal(labPhotos.length, 27);
  assert.equal(labTasks.length, 4);
  assert.equal(new Set(labPhotos.map((photo) => photo.id)).size, 27);
  for (const task of labTasks) assert.ok(labPhotos.some((photo) => photo.id === task.targetId));
  assert.equal(publicLabCatalog().tasks.some((task) => "targetId" in task), false);
});

test("specific remembered clues rank their synthetic targets first without the model", () => {
  assert.equal(keywordRank("brown dog yellow collar by lake")[0], "P07");
  assert.equal(keywordRank("man yellow shirt blue boat beach")[0], "T04");
  assert.equal(keywordRank("family blue cake silver balloons")[0], "E08");
  assert.equal(keywordRank("friends seaside cafe")[0], "T05");
});

test("controlled café task starts buried and a visual clue moves the actual target into view", () => {
  const task = labTasks.find((item) => item.id === "cafe");
  assert.equal(task?.fixedFirstQuery, true);
  assert.equal(keywordRank(task.seedQuery).indexOf(task.targetId) + 1, 14);
  assert.equal(keywordRank("trip friends seaside cafe").indexOf(task.targetId) + 1, 1);
});

test("rank history derives target positions from complete synthetic result lists", () => {
  const first = keywordRank("trip");
  const second = keywordRank("trip friends seaside cafe");
  assert.deepEqual(validatedRankHistory([first, second], ["keyword", "keyword"], 2, second.slice(0, 5), "keyword", "T05"), {
    targetRanks: [14, 1], attemptModes: ["keyword", "keyword"],
  });
  assert.equal(validatedRankHistory([first.slice(0, 10), second], ["keyword", "keyword"], 2, second.slice(0, 5), "keyword", "T05"), null);
  assert.equal(validatedRankHistory([first, second], ["keyword", "keyword"], 2, first.slice(0, 5), "keyword", "T05"), null);
  assert.equal(validatedRankHistory([first, second], ["keyword", "keyword"], 2, second.slice(0, 5), "groq", "T05"), null);
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
