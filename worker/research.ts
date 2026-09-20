export type ResearchRow = {
  id: string;
  evidence_excerpt: string;
  source_text: string;
  canonical_url: string;
  source_kind: string;
  target_types_json: string;
  remembered_clue_types_json: string;
  explicitly_forgotten_json: string;
  search_methods_json: string;
  exact_queries_json: string;
  coding_status: string;
  is_human_verified: number;
};

type Dimension = "target_types_json" | "remembered_clue_types_json" | "explicitly_forgotten_json" | "search_methods_json";

function values(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? [...new Set(parsed.filter((value): value is string => typeof value === "string"))] : [];
  } catch {
    return [];
  }
}

function group(rows: ResearchRow[], dimension: Dimension) {
  const groups = new Map<string, ResearchRow[]>();
  for (const row of rows) {
    for (const value of values(row[dimension]).filter((item) => item !== "unknown")) {
      groups.set(value, [...(groups.get(value) ?? []), row]);
    }
  }
  return [...groups].map(([code, matches]) => ({
    code,
    episodes: matches.length,
    examples: matches.slice(0, 3).map(({ id, source_text, canonical_url, source_kind }) => ({ id, source_text, canonical_url, source_kind })),
  })).sort((a, b) => b.episodes - a.episodes || a.code.localeCompare(b.code));
}

export function buildResearchQuestions(rows: ResearchRow[], totalAdmitted: number) {
  const coded = rows.filter((row) => row.coding_status !== "legacy");
  const sources = [...new Set(coded.map((row) => row.source_kind))];
  const coverage = {
    admittedEpisodes: totalAdmitted,
    codedEpisodes: coded.length,
    humanVerifiedEpisodes: coded.filter((row) => row.is_human_verified === 1).length,
    sourceKinds: sources,
    truncated: rows.length < totalAdmitted,
  };
  const definitions: Array<{ id: string; question: string; dimension: Dimension; caveat: string }> = [
    { id: "photo_types", question: "What kinds of old photos do users struggle to retrieve?", dimension: "target_types_json", caveat: "Types describe only admitted retrieval episodes; one episode can have several types." },
    { id: "remembered", question: "What information do people actually remember about a photo?", dimension: "remembered_clue_types_json", caveat: "A clue is counted only if it appears in the user's account, not because the photo likely contains it." },
    { id: "forgotten", question: "What information have they forgotten?", dimension: "explicitly_forgotten_json", caveat: "Not stated is not the same as forgotten. This counts only explicit memory gaps." },
    { id: "searches", question: "How do users formulate searches when their memory is incomplete?", dimension: "search_methods_json", caveat: "Attempted methods and explicitly requested methods are distinct from exact typed queries or advice offered by others." },
  ];
  return {
    coverage,
    questions: definitions.map(({ id, question, dimension, caveat }) => {
      const patterns = group(coded, dimension);
      const observedEpisodes = coded.filter((row) => values(row[dimension]).some((value) => value !== "unknown")).length;
      return {
        id, question, caveat, observedEpisodes,
        evidenceState: patterns.length === 0 ? "not_observed" : coded.length < 20 || sources.length < 2 ? "early_directional" : "multi_source_directional",
        patterns,
        ...(id === "searches" ? {
          reportedExactQueries: coded.flatMap((row) => values(row.exact_queries_json).map((query) => ({
            query, id: row.id, canonical_url: row.canonical_url,
          }))),
        } : {}),
      };
    }),
  };
}
