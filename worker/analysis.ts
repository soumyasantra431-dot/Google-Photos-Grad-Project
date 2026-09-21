const GROQ_MODEL = "openai/gpt-oss-20b";
const DETERMINISTIC_MODEL = "deterministic-evidence-v1";
const ANALYSIS_VERSION = "v2";

export const ANALYSIS_TEMPLATES = {
  photo_types: {
    label: "What kinds of old photos are hard to retrieve?",
    instruction: "Identify the kinds of remembered photos or videos people were trying to retrieve. Compare patterns without treating this purposive corpus as population prevalence.",
  },
  remembered_clues: {
    label: "What do people still remember about the photo?",
    instruction: "Identify the clues people retained, including people, place, objects, appearance, events, approximate time, text, and where they remember seeing the image.",
  },
  forgotten_context: {
    label: "What information have people actually forgotten?",
    instruction: "Identify only details users explicitly said they forgot or could not recall. Treat the supplied deterministic counts as current. State plainly when no other forgotten-detail pattern is observed. Do not convert an unmentioned detail—or a detail the user remembers, such as location—into a forgotten detail.",
  },
  search_language: {
    label: "How do people search with incomplete memory?",
    instruction: "Explain how people formulate or describe searches when memory is incomplete. Separate exact reported query words from paraphrases and feature requests.",
  },
  compare_breakdowns: {
    label: "Compare the five retrieval breakdowns",
    instruction: "Compare clue expression, clue interpretation, result evaluation, search refinement, and library access. Explain how the mechanisms differ and which are better supported by the included stories.",
  },
  choose_opportunity: {
    label: "Which opportunity should we validate first?",
    instruction: "Recommend one retrieval problem for primary-research validation. Use the supplied current counts, evidence breadth, unresolved outcomes, workarounds, and closeness to the target product outcome. Compare the leading mechanism with the next-best alternative. Do not claim product-market prevalence or make a final solution decision.",
  },
} as const;

export type AnalysisTemplateId = keyof typeof ANALYSIS_TEMPLATES;

type AnalysisRow = {
  id: string;
  source_text: string;
  evidence_excerpt: string;
  source_kind: string;
  canonical_url: string;
  retrieval_target: string;
  target_types_json: string | null;
  remembered_clue_types_json: string | null;
  explicitly_forgotten_json: string | null;
  search_methods_json: string | null;
  exact_queries_json: string | null;
  failure_stage: string;
  retrieval_outcome: string;
  workaround: string | null;
  problem_mechanism: string | null;
  rationale: string | null;
};

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

type GeneratedAnalysis = {
  answer: string;
  insights: Array<{
    label: string;
    finding: string;
    evidenceIds: string[];
    implication: string;
  }>;
  caveat: string;
};

function parseStringArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function analysisSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["answer", "insights", "caveat"],
    properties: {
      answer: { type: "string" },
      insights: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "finding", "evidenceIds", "implication"],
          properties: {
            label: { type: "string" },
            finding: { type: "string" },
            evidenceIds: { type: "array", minItems: 1, maxItems: 12, items: { type: "string" } },
            implication: { type: "string" },
          },
        },
      },
      caveat: { type: "string" },
    },
  };
}

function safeGeneratedAnalysis(value: unknown, allowedIds: Set<string>): GeneratedAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<GeneratedAnalysis>;
  if (typeof candidate.answer !== "string" || typeof candidate.caveat !== "string" || !Array.isArray(candidate.insights)) return null;
  const insights = candidate.insights.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const insight = item as GeneratedAnalysis["insights"][number];
    if (typeof insight.label !== "string" || typeof insight.finding !== "string" || typeof insight.implication !== "string" || !Array.isArray(insight.evidenceIds)) return [];
    const evidenceIds = [...new Set(insight.evidenceIds.filter((id) => typeof id === "string" && allowedIds.has(id)))].slice(0, 4);
    if (evidenceIds.length === 0) return [];
    return [{ ...insight, evidenceIds }];
  }).slice(0, 3);
  if (insights.length === 0) return null;
  return { answer: candidate.answer, caveat: candidate.caveat, insights };
}

function deterministicSummary(rows: AnalysisRow[]) {
  const count = (values: Array<string | null>, match: string) => values.filter((value) => value === match).length;
  const countCodes = (values: Array<string | null>) => values.reduce<Record<string, number>>((totals, value) => {
    for (const code of new Set(parseStringArray(value))) totals[code] = (totals[code] ?? 0) + 1;
    return totals;
  }, {});
  const mechanisms = rows.map((row) => row.problem_mechanism);
  return {
    includedStories: rows.length,
    humanReviewPolicy: "All included stories are human checked against their public source.",
    mechanismCounts: {
      clue_expression: count(mechanisms, "clue_expression"),
      clue_interpretation: count(mechanisms, "clue_interpretation"),
      result_evaluation: count(mechanisms, "result_evaluation"),
      search_refinement: count(mechanisms, "search_refinement"),
      library_access: count(mechanisms, "library_access"),
    },
    sourceCounts: rows.reduce<Record<string, number>>((totals, row) => {
      totals[row.source_kind] = (totals[row.source_kind] ?? 0) + 1;
      return totals;
    }, {}),
    targetTypeCounts: countCodes(rows.map((row) => row.target_types_json)),
    rememberedClueCounts: countCodes(rows.map((row) => row.remembered_clue_types_json)),
    explicitlyForgottenCounts: countCodes(rows.map((row) => row.explicitly_forgotten_json)),
    searchMethodCounts: countCodes(rows.map((row) => row.search_methods_json)),
    reportedExactQueryCount: rows.reduce((total, row) => total + parseStringArray(row.exact_queries_json).length, 0),
  };
}

const codeLabels: Record<string, string> = {
  people: "people", outdoor_place: "places", indoor_place: "indoor places", object: "objects",
  animal: "animals", document: "documents", screenshot: "screenshots", event: "events",
  person: "people", place: "places", appearance: "appearance", approximate_time: "rough time",
  text: "visible text", memory_surface: "where it resurfaced", library_state: "where it lives",
  date: "date", album: "album", filename: "filename", search_words: "search words",
  typed_query: "typed queries", timeline_browse: "timeline browsing", album_browse: "album browsing",
  folder_browse: "folder browsing", visual_scan: "visual scanning", reference_image_request: "reference-image requests",
  map_browse_request: "map browsing", clue_expression: "using a remembered clue",
  clue_interpretation: "search understanding the clue", result_evaluation: "spotting the right result",
  search_refinement: "recovering after a bad result", library_access: "reaching the photo again",
};

function formatCounts(counts: Record<string, number>, limit = 4): string {
  return Object.entries(counts)
    .filter(([code, count]) => code !== "unknown" && count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([code, count]) => `${codeLabels[code] ?? code.replaceAll("_", " ")} (${count})`)
    .join(", ");
}

function citedIds(rows: AnalysisRow[], predicate: (row: AnalysisRow) => boolean): string[] {
  const matches = rows.filter(predicate).slice(0, 4).map((row) => row.id);
  return matches.length ? matches : rows.slice(0, 4).map((row) => row.id);
}

export function buildDeterministicAnalysis(templateId: AnalysisTemplateId, rows: AnalysisRow[]): GeneratedAnalysis {
  if (rows.length === 0) throw new Error("No included evidence is available for analysis");
  const summary = deterministicSummary(rows);
  const caveat = "This is a directional reading of selected public stories, not a measure of prevalence among all Google Photos users.";
  if (templateId === "photo_types") {
    const top = formatCounts(summary.targetTypeCounts) || "no repeated photo type";
    return {
      answer: `The ${rows.length} included stories span several retrieval targets rather than one single photo category. The most repeated coded types are ${top}.`,
      insights: [{
        label: "Retrieval targets vary",
        finding: `The coded target mix is ${top}. One story may carry more than one type, so these counts should not be added into a prevalence estimate.`,
        evidenceIds: citedIds(rows, (row) => parseStringArray(row.target_types_json).some((code) => code !== "unknown")),
        implication: "Design for partial clues across target types instead of optimizing only for one content category.",
      }], caveat,
    };
  }
  if (templateId === "remembered_clues") {
    const top = formatCounts(summary.rememberedClueCounts);
    return {
      answer: `People retain usable fragments of the photo: ${top}. The clue often describes content or context even when a date is unavailable.`,
      insights: [{
        label: "Memory is partial, not empty",
        finding: `Across the included stories, the most repeated coded memory clues are ${top}.`,
        evidenceIds: citedIds(rows, (row) => parseStringArray(row.remembered_clue_types_json).length > 0),
        implication: "The product should accept the clue a person still has and show how it narrowed the candidates.",
      }], caveat,
    };
  }
  if (templateId === "forgotten_context") {
    const forgotten = formatCounts(summary.explicitlyForgottenCounts);
    const forgottenRows = rows.filter((row) => parseStringArray(row.explicitly_forgotten_json).length > 0);
    return {
      answer: forgotten
        ? `Only explicitly stated forgetting is counted. In this corpus the observed forgotten detail is ${forgotten}; unmentioned date, place, album, or filename is kept as unknown.`
        : "No repeated forgotten detail is explicitly stated in the included stories. Unmentioned context remains unknown rather than being labelled forgotten.",
      insights: [{
        label: "Unknown is not forgotten",
        finding: forgotten
          ? `${forgottenRows.length} included stories explicitly name something forgotten: ${forgotten}. Other absent details are not inferred.`
          : "The evidence does not support a repeated explicitly forgotten detail.",
        evidenceIds: citedIds(rows, (row) => parseStringArray(row.explicitly_forgotten_json).length > 0),
        implication: "Ask for missing context only when useful; do not assume what the user has forgotten.",
      }], caveat,
    };
  }
  if (templateId === "search_language") {
    const methods = formatCounts(summary.searchMethodCounts);
    const exactRows = rows.filter((row) => parseStringArray(row.exact_queries_json).length > 0);
    return {
      answer: `People combine typed words with browsing and visual strategies. The coded methods are ${methods}; exact query words are preserved only when the user reports them.`,
      insights: [
        {
          label: "Search is more than a text box",
          finding: `The included stories use or request ${methods}.`,
          evidenceIds: citedIds(rows, (row) => parseStringArray(row.search_methods_json).length > 0),
          implication: "Evaluate retrieval across query, browse, map, and reference-image behaviors.",
        },
        {
          label: "Exact wording is scarce but valuable",
          finding: `${summary.reportedExactQueryCount} exact reported query phrases are preserved. Paraphrased researcher summaries are kept separate.`,
          evidenceIds: exactRows.length ? exactRows.slice(0, 4).map((row) => row.id) : rows.slice(0, 4).map((row) => row.id),
          implication: "Use verbatim query language to test whether search understands real clue combinations.",
        },
      ], caveat,
    };
  }
  const mechanismText = formatCounts(summary.mechanismCounts, 5);
  const topMechanism = Object.entries(summary.mechanismCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "clue_interpretation";
  if (templateId === "compare_breakdowns") {
    return {
      answer: `The five breakdowns are distinct product problems. In this evidence set their coded counts are ${mechanismText}.`,
      insights: [{
        label: "Do not collapse the journey into search quality",
        finding: `The strongest current signal is ${codeLabels[topMechanism] ?? topMechanism}, but the corpus also contains failures before, within, and after results.`,
        evidenceIds: citedIds(rows, (row) => row.problem_mechanism === topMechanism),
        implication: "Choose metrics and interventions for the specific broken step.",
      }], caveat,
    };
  }
  return {
    answer: `Validate ${codeLabels[topMechanism] ?? topMechanism} first because it has the strongest current evidence signal, while treating that choice as a research hypothesis rather than a final product decision.`,
    insights: [{
      label: "Strongest evidence, still provisional",
      finding: `The mechanism counts are ${mechanismText}. The leading signal should be tested with real retrieval tasks before solution selection.`,
      evidenceIds: citedIds(rows, (row) => row.problem_mechanism === topMechanism),
      implication: "Use interviews and prototype tasks to test cause, value, and whether the wanted photo becomes easier to retrieve.",
    }], caveat,
  };
}

function promptRows(rows: AnalysisRow[]) {
  return rows.map((row) => ({
    id: row.id,
    sourceType: row.source_kind,
    userWords: row.evidence_excerpt,
    soughtPhoto: row.retrieval_target,
    photoTypes: parseStringArray(row.target_types_json),
    rememberedClueTypes: parseStringArray(row.remembered_clue_types_json),
    explicitlyForgotten: parseStringArray(row.explicitly_forgotten_json),
    searchMethods: parseStringArray(row.search_methods_json),
    exactQueries: parseStringArray(row.exact_queries_json),
    failureStage: row.failure_stage,
    outcome: row.retrieval_outcome,
    workaround: row.workaround,
    problemMechanism: row.problem_mechanism,
    codingRationale: row.rationale,
  }));
}

async function generateAnalysis(apiKey: string, templateId: AnalysisTemplateId, rows: AnalysisRow[]): Promise<GeneratedAnalysis> {
  const template = ANALYSIS_TEMPLATES[templateId];
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0,
      reasoning_effort: "low",
      max_completion_tokens: 1000,
      messages: [
        {
          role: "system",
          content: [
            "You are a product-research synthesis assistant for remembered-photo retrieval.",
            "Use only the supplied included evidence. Never invent a user, quote, count, query, or source.",
            "Do not say a photo was deleted, recovered, lost, or backed up; deletion and recovery cases are excluded from this corpus. Do not introduce archived states, features, workarounds, or user actions unless they appear in the supplied evidence.",
            "Treat deterministic counts as authoritative. Describe shares as shares of included stories, never as prevalence among all Google Photos users.",
            "Distinguish direct user words from researcher coding. Every insight must cite one or more supplied evidence IDs.",
            "Every insight object must include an evidenceIds array with one to four exact IDs copied from the supplied evidence. Never omit evidenceIds and never use a URL in that field.",
            "Go beyond sentiment: explain behavior, remembered and forgotten clues, failure mechanism, outcome, workaround, and product implication when supported.",
            "If evidence is thin or absent, say so plainly.",
            "Keep the answer under 80 words. Return no more than two concise insights; keep each finding under 60 words, each implication under 35 words, and the caveat under 40 words.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({ question: template.label, task: template.instruction, fixedCounts: deterministicSummary(rows), evidence: promptRows(rows) }),
        },
      ],
      response_format: { type: "json_schema", json_schema: { name: "grounded_retrieval_analysis", strict: true, schema: analysisSchema() } },
    }),
  });
  if (!response.ok) {
    const errorBody = (await response.text()).slice(0, 600);
    console.warn(JSON.stringify({ event: "groq_analysis_failed", status: response.status, response: errorBody }));
    throw new Error(`Groq request failed with ${response.status}`);
  }
  const payload = await response.json() as GroqResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned no analysis");
  const parsed = safeGeneratedAnalysis(JSON.parse(content), new Set(rows.map((row) => row.id)));
  if (!parsed) throw new Error("Groq returned analysis without valid evidence citations");
  return parsed;
}

async function corpusSignature(db: D1Database): Promise<string> {
  const row = await db.prepare(`
    SELECT COUNT(DISTINCT e.id) AS evidence_count,
      MAX(e.extracted_at) AS latest_extraction,
      MAX(a.audited_at) AS latest_audit,
      MAX(o.coded_at) AS latest_opportunity_coding
    FROM evidence_units e
    JOIN raw_documents d ON d.id = e.document_id
    JOIN sources s ON s.id = d.source_id
    LEFT JOIN human_audits a ON a.evidence_id = e.id
    LEFT JOIN opportunity_codings o ON o.evidence_id = e.id
    WHERE s.include_in_findings = 1 AND s.is_simulated = 0
  `).first<Record<string, string | number | null>>();
  return [ANALYSIS_VERSION, row?.evidence_count ?? 0, row?.latest_extraction ?? "", row?.latest_audit ?? "", row?.latest_opportunity_coding ?? ""].join("|");
}

async function loadAnalysisRows(db: D1Database): Promise<AnalysisRow[]> {
  const result = await db.prepare(`
    SELECT e.id, d.body AS source_text, e.evidence_excerpt, s.source_kind, s.canonical_url,
      e.retrieval_target, e.target_types_json, e.remembered_clue_types_json,
      e.explicitly_forgotten_json, e.search_methods_json, e.exact_queries_json,
      e.failure_stage, e.retrieval_outcome, e.workaround,
      o.problem_mechanism, o.rationale
    FROM evidence_units e
    JOIN raw_documents d ON d.id = e.document_id
    JOIN sources s ON s.id = d.source_id
    LEFT JOIN opportunity_codings o ON o.evidence_id = e.id
    WHERE s.include_in_findings = 1 AND s.is_simulated = 0
    ORDER BY e.is_human_verified DESC, e.extracted_at DESC
    LIMIT 100
  `).all<AnalysisRow>();
  return result.results;
}

export async function getGroundedAnalysis(db: D1Database, apiKey: string, templateId: AnalysisTemplateId) {
  const signature = await corpusSignature(db);
  const cached = await db.prepare(`
    SELECT response_json, model_name, generated_at
    FROM analysis_snapshots
    WHERE template_id = ? AND corpus_signature = ?
  `).bind(templateId, signature).first<{ response_json: string; model_name: string; generated_at: string }>();
  const rows = await loadAnalysisRows(db);
  const byId = new Map(rows.map((row) => [row.id, row]));

  let analysis: GeneratedAnalysis;
  let generatedAt: string;
  let cacheStatus: "hit" | "generated";
  let modelName: string;
  if (cached) {
    const parsed = safeGeneratedAnalysis(JSON.parse(cached.response_json), new Set(rows.map((row) => row.id)));
    if (!parsed) throw new Error("Cached analysis contains invalid citations");
    analysis = parsed;
    generatedAt = cached.generated_at;
    cacheStatus = "hit";
    modelName = cached.model_name;
  } else {
    try {
      analysis = await generateAnalysis(apiKey, templateId, rows);
      modelName = GROQ_MODEL;
    } catch (error) {
      console.warn(JSON.stringify({ event: "grounded_analysis_fallback", templateId, error: String(error).slice(0, 300) }));
      analysis = buildDeterministicAnalysis(templateId, rows);
      modelName = DETERMINISTIC_MODEL;
    }
    generatedAt = new Date().toISOString();
    cacheStatus = "generated";
    await db.prepare(`
      INSERT INTO analysis_snapshots (template_id, corpus_signature, response_json, model_name, generated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(template_id, corpus_signature) DO UPDATE SET
        response_json = excluded.response_json,
        model_name = excluded.model_name,
        generated_at = excluded.generated_at
    `).bind(templateId, signature, JSON.stringify(analysis), modelName, generatedAt).run();
  }

  const citedIds = [...new Set(analysis.insights.flatMap((insight) => insight.evidenceIds))];
  return {
    templateId,
    question: ANALYSIS_TEMPLATES[templateId].label,
    analysis,
    evidence: citedIds.flatMap((id) => {
      const row = byId.get(id);
      return row ? [{ id, sourceText: row.source_text, sourceKind: row.source_kind, canonicalUrl: row.canonical_url }] : [];
    }),
    provenance: {
      model: modelName,
      synthesisMode: modelName === GROQ_MODEL ? "groq" : "deterministic_fallback",
      includedStories: rows.length,
      generatedAt,
      cacheStatus,
      method: "D1 supplies fixed counts and human-checked evidence; Groq synthesizes the answer and must cite supplied evidence IDs.",
    },
  };
}
