export type ProblemMechanism =
  | "clue_expression"
  | "clue_interpretation"
  | "result_evaluation"
  | "search_refinement"
  | "library_access";

export type OpportunityRow = {
  id: string;
  problem_mechanism: ProblemMechanism;
  rationale: string;
  retrieval_outcome: string;
  workaround: string | null;
  is_human_verified: number;
  source_kind: string;
  source_text: string;
  canonical_url: string;
};

const definitions: Array<{
  code: ProblemMechanism;
  journeyStep: string;
  userProblem: string;
  productOutcome: string;
  leadingMetric: string;
  diagnosticMetrics: string[];
}> = [
  {
    code: "clue_expression",
    journeyStep: "Tell Photos what they remember",
    userProblem: "The user remembers a useful detail, but has no clear way to use it in search.",
    productOutcome: "People can search with the details they genuinely remember.",
    leadingMetric: "Share of remembered details that users can enter",
    diagnosticMetrics: ["Unsupported clue-modality rate", "Abandonment before results"],
  },
  {
    code: "clue_interpretation",
    journeyStep: "Understand those details",
    userProblem: "The user gives a meaningful clue, but search returns the wrong photos or misses the target.",
    productOutcome: "The wanted photo appears among the first results for the clues provided.",
    leadingMetric: "Share of tasks where the wanted photo appears in the first results",
    diagnosticMetrics: ["Irrelevant-result rate", "Literal metadata miss rate"],
  },
  {
    code: "result_evaluation",
    journeyStep: "Spot the right photo",
    userProblem: "The wanted photo may be present, but it is too hard to recognize among many similar results.",
    productOutcome: "People can quickly identify the wanted photo among plausible matches.",
    leadingMetric: "Share of tasks where users recognize the target in the first results",
    diagnosticMetrics: ["Result scanning time", "Backtracking rate"],
  },
  {
    code: "search_refinement",
    journeyStep: "Recover after a bad result",
    userProblem: "After a failed search, the user gets no useful way to narrow the results or try a better clue.",
    productOutcome: "A failed first search moves closer to the wanted photo on the next attempt.",
    leadingMetric: "Success rate on the next search attempt",
    diagnosticMetrics: ["Attempts per task", "Reformulation abandonment rate"],
  },
  {
    code: "library_access",
    journeyStep: "Open the photo wherever it lives",
    userProblem: "The user knows the photo exists or recently saw it, but cannot reach it again from Memories, folders, or the timeline.",
    productOutcome: "Known photos remain reachable across Memories, hidden states, folders, and the timeline.",
    leadingMetric: "Success rate when moving between Photos surfaces",
    diagnosticMetrics: ["Index-to-library mismatch rate", "Dead-end navigation rate"],
  },
];

function evidenceStrength(episodes: number, sourceKinds: number) {
  if (episodes === 0) return "not_observed" as const;
  if (episodes >= 3 && sourceKinds >= 2) return "multi_source_directional" as const;
  return "early_directional" as const;
}

export function buildOpportunityMap(rows: OpportunityRow[], totalAdmitted: number) {
  const areas = definitions.map((definition) => {
    const matches = rows.filter((row) => row.problem_mechanism === definition.code);
    const sourceKinds = [...new Set(matches.map((row) => row.source_kind))];
    return {
      ...definition,
      episodes: matches.length,
      sourceKinds,
      unresolvedEpisodes: matches.filter((row) => row.retrieval_outcome !== "found").length,
      workaroundEpisodes: matches.filter((row) => Boolean(row.workaround)).length,
      humanVerifiedEpisodes: matches.filter((row) => row.is_human_verified === 1).length,
      evidenceStrength: evidenceStrength(matches.length, sourceKinds.length),
      examples: matches.slice(0, 3).map(({ id, source_text, canonical_url, source_kind, rationale }) => ({
        id, source_text, canonical_url, source_kind, rationale,
      })),
    };
  });
  const observed = areas.filter((area) => area.episodes > 0)
    .sort((a, b) => b.episodes - a.episodes || definitions.findIndex((item) => item.code === a.code) - definitions.findIndex((item) => item.code === b.code));
  const mostObserved = observed[0];
  return {
    metric: {
      businessMetric: "Successful retrieval of a remembered photo when the initial memory is incomplete",
      productOutcome: "The user recognizes and opens the intended photo without knowing its exact date, album, or query wording at the start.",
      journey: definitions.map(({ code, journeyStep, productOutcome, leadingMetric }) => ({ code, journeyStep, productOutcome, leadingMetric })),
    },
    coverage: {
      admittedEpisodes: totalAdmitted,
      mechanismCodedEpisodes: rows.length,
      uncodedEpisodes: Math.max(0, totalAdmitted - rows.length),
      humanVerifiedEpisodes: rows.filter((row) => row.is_human_verified === 1).length,
    },
    comparison: {
      mostObservedMechanism: mostObserved ? {
        code: mostObserved.code,
        episodes: mostObserved.episodes,
        sourceKinds: mostObserved.sourceKinds,
      } : null,
      caveat: "“Most common” applies only to these selected public stories. It does not show how common the problem is across all users, or decide what we should build first.",
    },
    areas,
  };
}
