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
    journeyStep: "Express memory",
    userProblem: "The clue exists in memory, but the available input cannot represent it.",
    productOutcome: "More remembered clues become usable retrieval inputs.",
    leadingMetric: "Clue-to-query conversion rate",
    diagnosticMetrics: ["Unsupported clue-modality rate", "Abandonment before results"],
  },
  {
    code: "clue_interpretation",
    journeyStep: "Interpret clues",
    userProblem: "The user supplies meaningful clues, but the system maps them to the wrong candidates.",
    productOutcome: "A relevant photo enters the candidate set for the clues provided.",
    leadingMetric: "Relevant-photo recall in the first result set",
    diagnosticMetrics: ["Irrelevant-result rate", "Literal metadata miss rate"],
  },
  {
    code: "result_evaluation",
    journeyStep: "Evaluate candidates",
    userProblem: "Potential matches may exist, but the user cannot efficiently recognize the target.",
    productOutcome: "Users can identify the remembered photo among plausible candidates.",
    leadingMetric: "Candidate recognition rate within the first result set",
    diagnosticMetrics: ["Result scanning time", "Backtracking rate"],
  },
  {
    code: "search_refinement",
    journeyStep: "Refine failure",
    userProblem: "An unsuccessful attempt gives the user no productive way to narrow or change course.",
    productOutcome: "A failed first search converges toward the target on the next attempt.",
    leadingMetric: "Second-attempt retrieval success",
    diagnosticMetrics: ["Attempts per task", "Reformulation abandonment rate"],
  },
  {
    code: "library_access",
    journeyStep: "Reach the item",
    userProblem: "The target is known or was previously surfaced, but library state or navigation blocks access.",
    productOutcome: "Known photos remain reachable across memories, hidden states, folders, and timelines.",
    leadingMetric: "Cross-surface retrieval success",
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
      caveat: "Most observed means most frequent in this selected qualitative corpus. It is not market prevalence, user value, or a prioritization score.",
    },
    areas,
  };
}
