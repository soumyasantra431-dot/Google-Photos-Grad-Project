import type { OpportunityRow } from "./opportunity";

export function buildProblemDefinition(rows: OpportunityRow[], totalAdmitted: number) {
  const focus = rows.filter((row) => row.problem_mechanism === "clue_interpretation");
  const sourceKinds = [...new Set(focus.map((row) => row.source_kind))];
  const workarounds = [...new Set(focus.map((row) => row.workaround).filter((value): value is string => Boolean(value)))];
  return {
    status: "provisional_focus" as const,
    decision: "Validate clue misunderstanding as the first product opportunity.",
    targetSegment: "People trying to retrieve one known old photo using remembered details—such as a person, object, appearance, place, or text—without a reliable date to browse.",
    retrievalScenario: "The user wants to show, reuse, or revisit a specific old photo now. They know it exists and remember what is in it, but the first search does not produce a trustworthy shortlist.",
    rootCause: "Useful memory clues are sometimes matched too broadly, interpreted as the wrong theme, or missed because the person, text, or object was not indexed. The user cannot tell which clue failed.",
    problemStatement: "When someone remembers meaningful details of one old photo but not its date, they need those details to produce a small, trustworthy set of candidates. Today the wanted photo can be missing or buried, forcing manual scrolling, repeated query guessing, or abandonment.",
    currentWorkarounds: workarounds,
    userValue: "Finding the photo in the moment preserves the reason the user searched—showing someone, retrieving a document, revisiting a memory, or reusing visual information—without a long timeline hunt.",
    businessValue: "Reliable re-access strengthens trust in Google Photos as a long-term memory home and makes its search intelligence meaningfully different from storage alone. Repeated failures risk pushing users toward alternate galleries or manual archives.",
    productOutcome: "More known-photo tasks surface the wanted photo in the first useful result set from the clues the user actually remembers.",
    leadingMetric: "Known-photo retrieval success within the first two search attempts",
    evidence: {
      includedStories: totalAdmitted,
      focusStories: focus.length,
      sourceKinds,
      unresolvedStories: focus.filter((row) => row.retrieval_outcome !== "found").length,
      workaroundStories: focus.filter((row) => Boolean(row.workaround)).length,
      humanCheckedStories: focus.filter((row) => row.is_human_verified === 1).length,
      examples: focus.slice(0, 4).map(({ id, source_text, canonical_url, source_kind, rationale }) => ({
        id, source_text, canonical_url, source_kind, rationale,
      })),
    },
    openQuestions: [
      "In real libraries, is the target absent because of indexing, ranking, query interpretation, or a mix?",
      "Which remembered details are easiest for people to express without prompting?",
      "Does a guided second attempt improve success, or merely add more search effort?",
      "How does the failure differ for people who have Ask Photos versus classic search?",
    ],
    caveat: "This is a product focus to validate, not a market-sized conclusion. It is based on selected public stories from two source types and still needs real retrieval-task research.",
  };
}
