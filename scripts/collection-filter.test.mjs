import assert from "node:assert/strict";
import test from "node:test";
import { isClearlyOutOfScope } from "../worker/collection.ts";

test("negated deletion is not mistaken for a recovery complaint", () => {
  assert.equal(isClearlyOutOfScope({ body: "My intention is not to delete photos. I am looking for a certain photo of my daughter at the beach and tried all sorts of search terms." }), false);
});

test("straight deletion and backup complaints are still excluded", () => {
  assert.equal(isClearlyOutOfScope({ body: "I deleted my photos and need to restore them from trash." }), true);
  assert.equal(isClearlyOutOfScope({ body: "My backup stopped syncing and all my photos disappeared." }), true);
});

test("specific remembered visual clues keep a mixed post for AI review", () => {
  assert.equal(isClearlyOutOfScope({ body: "I remember the bathroom photo but it disappeared from the usual folders." }), false);
});
