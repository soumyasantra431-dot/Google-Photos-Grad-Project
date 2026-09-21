import { collectYouTubeEvidence, ingestAppStoreEvidence, ingestCuratedPublicEvidence, ingestGoogleSupportEvidence, timingSafeSecretMatch } from "./collection";
import { buildOpportunityMap, type OpportunityRow } from "./opportunity";
import { buildProblemDefinition } from "./problem";
import { buildResearchQuestions, type ResearchRow } from "./research";
import { ANALYSIS_TEMPLATES, getGroundedAnalysis, type AnalysisTemplateId } from "./analysis";

type EvidenceFilters = {
  limit: number;
  failureStage?: string;
  sourceKind?: string;
  includeSimulated: boolean;
};

const FAILURE_STAGES = new Set(["expression", "interpretation", "evaluation", "refinement", "unknown"]);
const SOURCE_KINDS = new Set(["reddit", "google_play", "app_store", "google_support", "youtube", "forum", "social", "simulated"]);

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function badRequest(message: string): Response {
  return jsonResponse({ error: "bad_request", message }, 400);
}

function parseEvidenceFilters(url: URL): EvidenceFilters | Response {
  const rawLimit = url.searchParams.get("limit") ?? "20";
  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return badRequest("limit must be an integer from 1 to 50");
  }

  const failureStage = url.searchParams.get("failureStage") ?? undefined;
  if (failureStage && !FAILURE_STAGES.has(failureStage)) {
    return badRequest("failureStage is not recognized");
  }

  const sourceKind = url.searchParams.get("sourceKind") ?? undefined;
  if (sourceKind && !SOURCE_KINDS.has(sourceKind)) {
    return badRequest("sourceKind is not recognized");
  }

  return {
    limit,
    failureStage,
    sourceKind,
    includeSimulated: url.searchParams.get("includeSimulated") === "true",
  };
}

async function getStats(db: D1Database): Promise<Response> {
  const [included, simulated, excluded, sourceBreakdown, failureBreakdown] = await db.batch([
    db.prepare(`
      SELECT
        COUNT(DISTINCT s.id) AS source_count,
        COUNT(DISTINCT d.id) AS document_count,
        COUNT(DISTINCT e.id) AS evidence_count,
        COUNT(DISTINCT CASE WHEN e.is_human_verified = 1 THEN e.id END) AS verified_count
      FROM sources s
      LEFT JOIN raw_documents d ON d.source_id = s.id
      LEFT JOIN evidence_units e ON e.document_id = d.id
      WHERE s.include_in_findings = 1 AND s.is_simulated = 0
    `),
    db.prepare(`
      SELECT COUNT(DISTINCT e.id) AS evidence_count
      FROM evidence_units e
      JOIN raw_documents d ON d.id = e.document_id
      JOIN sources s ON s.id = d.source_id
      WHERE s.is_simulated = 1
    `),
    db.prepare(`
      SELECT COUNT(DISTINCT e.id) AS evidence_count
      FROM evidence_units e
      JOIN raw_documents d ON d.id = e.document_id
      JOIN sources s ON s.id = d.source_id
      WHERE s.include_in_findings = 0 AND s.is_simulated = 0
    `),
    db.prepare(`
      SELECT s.source_kind, COUNT(DISTINCT e.id) AS evidence_count
      FROM sources s
      JOIN raw_documents d ON d.source_id = s.id
      JOIN evidence_units e ON e.document_id = d.id
      WHERE s.include_in_findings = 1 AND s.is_simulated = 0
      GROUP BY s.source_kind
      ORDER BY evidence_count DESC, s.source_kind ASC
    `),
    db.prepare(`
      SELECT e.failure_stage, COUNT(*) AS evidence_count
      FROM evidence_units e
      JOIN raw_documents d ON d.id = e.document_id
      JOIN sources s ON s.id = d.source_id
      WHERE s.include_in_findings = 1 AND s.is_simulated = 0
      GROUP BY e.failure_stage
      ORDER BY evidence_count DESC, e.failure_stage ASC
    `),
  ]);

  const corpus = included.results[0] as
    | { source_count: number; document_count: number; evidence_count: number; verified_count: number }
    | undefined;
  const simulatedRow = simulated.results[0] as { evidence_count: number } | undefined;
  const excludedRow = excluded.results[0] as { evidence_count: number } | undefined;

  return jsonResponse({
    corpus: corpus ?? { source_count: 0, document_count: 0, evidence_count: 0, verified_count: 0 },
    simulatedEvidenceExcluded: simulatedRow?.evidence_count ?? 0,
    publicEvidenceExcluded: excludedRow?.evidence_count ?? 0,
    bySource: sourceBreakdown.results,
    byFailureStage: failureBreakdown.results,
    generatedAt: new Date().toISOString(),
  });
}

async function listEvidence(db: D1Database, filters: EvidenceFilters): Promise<Response> {
  const conditions = [filters.includeSimulated ? "1 = 1" : "s.include_in_findings = 1 AND s.is_simulated = 0"];
  const bindings: Array<string | number> = [];

  if (filters.failureStage) {
    conditions.push("e.failure_stage = ?");
    bindings.push(filters.failureStage);
  }
  if (filters.sourceKind) {
    conditions.push("s.source_kind = ?");
    bindings.push(filters.sourceKind);
  }
  bindings.push(filters.limit);

  const statement = db.prepare(`
    SELECT
      e.id, e.retrieval_target, e.evidence_excerpt, e.remembered_clues_json,
      e.forgotten_context_json, e.search_attempt, e.failure_stage, e.workaround,
      e.retrieval_outcome, e.extraction_confidence, e.is_human_verified,
      e.model_name,
      (SELECT a.verdict FROM human_audits a WHERE a.evidence_id = e.id ORDER BY a.audited_at DESC LIMIT 1) AS audit_verdict,
      (SELECT a.notes FROM human_audits a WHERE a.evidence_id = e.id ORDER BY a.audited_at DESC LIMIT 1) AS audit_notes,
      s.source_kind, s.platform, s.canonical_url, s.published_at, s.is_simulated
    FROM evidence_units e
    JOIN raw_documents d ON d.id = e.document_id
    JOIN sources s ON s.id = d.source_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY COALESCE(s.published_at, s.collected_at) DESC, e.id ASC
    LIMIT ?
  `).bind(...bindings);

  const result = await statement.all();
  return jsonResponse({ data: result.results, count: result.results.length, filters });
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

async function downloadEvidenceCsv(db: D1Database): Promise<Response> {
  const result = await db.prepare(`
    SELECT
      s.platform, s.source_kind, s.published_at, s.canonical_url,
      d.title, d.body AS source_text,
      e.retrieval_target, e.evidence_excerpt, e.remembered_clues_json,
      e.explicitly_forgotten_json, e.search_attempt, e.search_methods_json,
      e.exact_queries_json, e.failure_stage, e.workaround, e.retrieval_outcome,
      e.is_human_verified,
      (SELECT a.notes FROM human_audits a WHERE a.evidence_id = e.id ORDER BY a.audited_at DESC LIMIT 1) AS audit_notes
    FROM evidence_units e
    JOIN raw_documents d ON d.id = e.document_id
    JOIN sources s ON s.id = d.source_id
    WHERE s.include_in_findings = 1 AND s.is_simulated = 0
    ORDER BY COALESCE(s.published_at, s.collected_at) DESC, e.id ASC
    LIMIT 1000
  `).all<Record<string, unknown>>();
  const headers = [
    "platform", "source_type", "published_at", "source_url", "discussion_title",
    "source_text", "wanted_photo", "evidence_excerpt", "remembered_details",
    "explicitly_forgotten", "search_attempt", "search_methods", "exact_queries",
    "where_retrieval_failed", "workaround", "outcome", "human_checked", "audit_notes",
  ];
  const keys = [
    "platform", "source_kind", "published_at", "canonical_url", "title", "source_text",
    "retrieval_target", "evidence_excerpt", "remembered_clues_json", "explicitly_forgotten_json",
    "search_attempt", "search_methods_json", "exact_queries_json", "failure_stage", "workaround",
    "retrieval_outcome", "is_human_verified", "audit_notes",
  ];
  const rows = result.results.map((row) => keys.map((key) => csvCell(row[key])).join(","));
  const csv = `\uFEFF${headers.map(csvCell).join(",")}\r\n${rows.join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="photo-recall-evidence.csv"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function getEvidence(db: D1Database, id: string): Promise<Response> {
  const result = await db.prepare(`
    SELECT
      e.*, d.title AS document_title, d.body AS source_text,
      s.source_kind, s.platform, s.canonical_url, s.published_at,
      s.collected_at, s.is_simulated, s.include_in_findings
    FROM evidence_units e
    JOIN raw_documents d ON d.id = e.document_id
    JOIN sources s ON s.id = d.source_id
    WHERE e.id = ?
  `).bind(id).first();

  if (!result) {
    return jsonResponse({ error: "not_found", message: "Evidence record not found." }, 404);
  }
  return jsonResponse({ data: result });
}

async function listCollectionRuns(db: D1Database): Promise<Response> {
  const result = await db.prepare(`
    SELECT id, source_kind, collector_version, started_at, completed_at, status,
      records_seen, records_stored, error_summary
    FROM collection_runs
    ORDER BY started_at DESC
    LIMIT 10
  `).all();
  return jsonResponse({ data: result.results, count: result.results.length });
}

async function getResearchQuestions(db: D1Database): Promise<Response> {
  const [countResult, evidenceResult] = await db.batch([
    db.prepare(`
      SELECT COUNT(*) AS total FROM evidence_units e
      JOIN raw_documents d ON d.id = e.document_id
      JOIN sources s ON s.id = d.source_id
      WHERE s.include_in_findings = 1 AND s.is_simulated = 0
    `),
    db.prepare(`
      SELECT e.id, e.evidence_excerpt, d.body AS source_text, e.target_types_json, e.remembered_clue_types_json,
        e.explicitly_forgotten_json, e.search_methods_json, e.exact_queries_json,
        e.coding_status, e.is_human_verified, s.canonical_url, s.source_kind
      FROM evidence_units e
      JOIN raw_documents d ON d.id = e.document_id
      JOIN sources s ON s.id = d.source_id
      WHERE s.include_in_findings = 1 AND s.is_simulated = 0
      ORDER BY e.is_human_verified DESC, e.extracted_at DESC
      LIMIT 1000
    `),
  ]);
  const total = (countResult.results[0] as { total?: number } | undefined)?.total ?? 0;
  return jsonResponse(buildResearchQuestions(evidenceResult.results as ResearchRow[], total));
}

async function getOpportunityMap(db: D1Database): Promise<Response> {
  const [countResult, opportunityResult] = await db.batch([
    db.prepare(`
      SELECT COUNT(*) AS total FROM evidence_units e
      JOIN raw_documents d ON d.id = e.document_id
      JOIN sources s ON s.id = d.source_id
      WHERE s.include_in_findings = 1 AND s.is_simulated = 0
    `),
    db.prepare(`
      SELECT e.id, o.problem_mechanism, o.rationale, e.retrieval_outcome,
        e.workaround, e.is_human_verified, s.source_kind, d.body AS source_text,
        s.canonical_url
      FROM opportunity_codings o
      JOIN evidence_units e ON e.id = o.evidence_id
      JOIN raw_documents d ON d.id = e.document_id
      JOIN sources s ON s.id = d.source_id
      WHERE s.include_in_findings = 1 AND s.is_simulated = 0
      ORDER BY o.coded_at DESC, e.id ASC
      LIMIT 1000
    `),
  ]);
  const total = (countResult.results[0] as { total?: number } | undefined)?.total ?? 0;
  return jsonResponse(buildOpportunityMap(opportunityResult.results as OpportunityRow[], total));
}

async function getProblemDefinition(db: D1Database): Promise<Response> {
  const [countResult, evidenceResult] = await db.batch([
    db.prepare(`
      SELECT COUNT(*) AS total FROM evidence_units e
      JOIN raw_documents d ON d.id = e.document_id
      JOIN sources s ON s.id = d.source_id
      WHERE s.include_in_findings = 1 AND s.is_simulated = 0
    `),
    db.prepare(`
      SELECT e.id, o.problem_mechanism, o.rationale, e.retrieval_outcome,
        e.workaround, e.is_human_verified, s.source_kind, d.body AS source_text,
        s.canonical_url
      FROM opportunity_codings o
      JOIN evidence_units e ON e.id = o.evidence_id
      JOIN raw_documents d ON d.id = e.document_id
      JOIN sources s ON s.id = d.source_id
      WHERE s.include_in_findings = 1 AND s.is_simulated = 0
      ORDER BY o.coded_at DESC, e.id ASC
      LIMIT 1000
    `),
  ]);
  const total = (countResult.results[0] as { total?: number } | undefined)?.total ?? 0;
  return jsonResponse(buildProblemDefinition(evidenceResult.results as OpportunityRow[], total));
}

async function getSourceCoverage(db: D1Database): Promise<Response> {
  const [runs, admitted, candidates] = await db.batch([
    db.prepare(`
      SELECT source_kind, COUNT(*) AS run_count,
        SUM(records_seen) AS records_processed_across_runs,
        SUM(records_stored) AS initially_retained_across_runs,
        MAX(completed_at) AS latest_run_at
      FROM collection_runs GROUP BY source_kind
    `),
    db.prepare(`
      SELECT s.source_kind, COUNT(DISTINCT e.id) AS admitted_episodes
      FROM sources s JOIN raw_documents d ON d.source_id = s.id
      JOIN evidence_units e ON e.document_id = d.id
      WHERE s.include_in_findings = 1 AND s.is_simulated = 0
      GROUP BY s.source_kind
    `),
    db.prepare(`
      SELECT source_kind, COUNT(*) AS unique_candidates,
        SUM(CASE WHEN model_output_json IS NOT NULL THEN 1 ELSE 0 END) AS model_screened_candidates
      FROM review_candidates GROUP BY source_kind
    `),
  ]);
  const runRows = runs.results as Array<{
    source_kind: string;
    run_count: number;
    records_processed_across_runs: number;
    initially_retained_across_runs: number;
    latest_run_at: string | null;
  }>;
  const admittedRows = admitted.results as Array<{ source_kind: string; admitted_episodes: number }>;
  const candidateRows = candidates.results as Array<{ source_kind: string; unique_candidates: number; model_screened_candidates: number }>;
  const runByKind = new Map(runRows.map((row) => [row.source_kind, row]));
  const admittedByKind = new Map(admittedRows.map((row) => [row.source_kind, row.admitted_episodes]));
  const candidateByKind = new Map(candidateRows.map((row) => [row.source_kind, row]));
  const kinds = ["google_support", "youtube", "app_store", "google_play", "reddit", "social", "forum"];
  return jsonResponse({
    sources: kinds.map((sourceKind) => {
      const run = runByKind.get(sourceKind);
      return {
        sourceKind,
        status: run ? "attempted" : "not_connected",
        runCount: Number(run?.run_count ?? 0),
        recordsProcessedAcrossRuns: Number(run?.records_processed_across_runs ?? 0),
        initiallyRetainedAcrossRuns: Number(run?.initially_retained_across_runs ?? 0),
        uniqueCandidates: Number(candidateByKind.get(sourceKind)?.unique_candidates ?? 0),
        modelScreenedCandidates: Number(candidateByKind.get(sourceKind)?.model_screened_candidates ?? 0),
        admittedEpisodes: admittedByKind.get(sourceKind) ?? 0,
        latestRunAt: run?.latest_run_at ?? null,
      };
    }),
    note: "Processed totals can include repeat scans. Candidates are unique public items saved for review; included stories pass the stricter retrieval-evidence checks. Earlier YouTube runs did not save rejected comments.",
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        const databaseCheck = await env.DB.prepare("SELECT 1 AS connected").first<{ connected: number }>();
        return jsonResponse({
          status: "ok",
          service: "photo-recall-discovery-engine",
          stage: "problem-definition",
          database: databaseCheck?.connected === 1 ? "connected" : "unavailable",
          checkedAt: new Date().toISOString(),
        });
      }

      if (request.method === "GET" && url.pathname === "/api/stats") {
        return await getStats(env.DB);
      }

      if (request.method === "GET" && url.pathname === "/api/research-questions") {
        return await getResearchQuestions(env.DB);
      }

      if (request.method === "GET" && url.pathname === "/api/opportunity-map") {
        return await getOpportunityMap(env.DB);
      }

      if (request.method === "GET" && url.pathname === "/api/problem-definition") {
        return await getProblemDefinition(env.DB);
      }

      if (request.method === "GET" && url.pathname === "/api/source-coverage") {
        return await getSourceCoverage(env.DB);
      }

      if (request.method === "GET" && url.pathname === "/api/analysis-templates") {
        return jsonResponse({
          templates: Object.entries(ANALYSIS_TEMPLATES).map(([id, template]) => ({ id, label: template.label })),
          note: "Questions are intentionally limited so the public endpoint cannot be used as an unrestricted LLM proxy.",
        });
      }

      if (request.method === "GET" && url.pathname === "/api/grounded-analysis") {
        const templateId = url.searchParams.get("template") ?? "";
        if (!(templateId in ANALYSIS_TEMPLATES)) return badRequest("template is not recognized");
        return jsonResponse(await getGroundedAnalysis(env.DB, env.GROQ_API_KEY, templateId as AnalysisTemplateId));
      }

      if (request.method === "GET" && url.pathname === "/api/collection-runs") {
        return await listCollectionRuns(env.DB);
      }

      if (request.method === "POST" && url.pathname === "/api/internal/collect/youtube") {
        const authorization = request.headers.get("Authorization") ?? "";
        const providedToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
        if (!providedToken || !await timingSafeSecretMatch(providedToken, env.COLLECTION_TRIGGER_TOKEN)) {
          return jsonResponse({ error: "unauthorized", message: "A valid collection token is required." }, 401);
        }
        return jsonResponse({ data: await collectYouTubeEvidence(env) }, 201);
      }

      if (request.method === "POST" && url.pathname === "/api/internal/ingest/app-store") {
        const authorization = request.headers.get("Authorization") ?? "";
        const providedToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
        if (!providedToken || !await timingSafeSecretMatch(providedToken, env.COLLECTION_TRIGGER_TOKEN)) {
          return jsonResponse({ error: "unauthorized", message: "A valid collection token is required." }, 401);
        }
        const contentLength = Number(request.headers.get("Content-Length") ?? "0");
        if (!Number.isFinite(contentLength) || contentLength < 2 || contentLength > 750_000) {
          return jsonResponse({ error: "payload_too_large", message: "A bounded JSON payload is required." }, 413);
        }
        return jsonResponse({ data: await ingestAppStoreEvidence(env, await request.json()) }, 201);
      }

      if (request.method === "POST" && url.pathname === "/api/internal/ingest/google-support") {
        const authorization = request.headers.get("Authorization") ?? "";
        const providedToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
        if (!providedToken || !await timingSafeSecretMatch(providedToken, env.COLLECTION_TRIGGER_TOKEN)) {
          return jsonResponse({ error: "unauthorized", message: "A valid collection token is required." }, 401);
        }
        const contentLength = Number(request.headers.get("Content-Length") ?? "0");
        if (!Number.isFinite(contentLength) || contentLength < 2 || contentLength > 250_000) {
          return jsonResponse({ error: "payload_too_large", message: "A bounded JSON payload is required." }, 413);
        }
        return jsonResponse({ data: await ingestGoogleSupportEvidence(env, await request.json()) }, 201);
      }

      if (request.method === "POST" && url.pathname === "/api/internal/ingest/curated-public") {
        const authorization = request.headers.get("Authorization") ?? "";
        const providedToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
        if (!providedToken || !await timingSafeSecretMatch(providedToken, env.COLLECTION_TRIGGER_TOKEN)) {
          return jsonResponse({ error: "unauthorized", message: "A valid collection token is required." }, 401);
        }
        const contentLength = Number(request.headers.get("Content-Length") ?? "0");
        if (!Number.isFinite(contentLength) || contentLength < 2 || contentLength > 100_000) {
          return jsonResponse({ error: "payload_too_large", message: "A bounded JSON payload is required." }, 413);
        }
        return jsonResponse({ data: await ingestCuratedPublicEvidence(env, await request.json()) }, 201);
      }

      if (request.method === "GET" && url.pathname === "/api/evidence") {
        const filters = parseEvidenceFilters(url);
        if (filters instanceof Response) return filters;
        return await listEvidence(env.DB, filters);
      }

      if (request.method === "GET" && url.pathname === "/api/evidence.csv") {
        return await downloadEvidenceCsv(env.DB);
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/evidence/")) {
        const id = decodeURIComponent(url.pathname.slice("/api/evidence/".length));
        if (!id || id.length > 100) return badRequest("evidence id is invalid");
        return await getEvidence(env.DB, id);
      }

      if (url.pathname.startsWith("/api/")) {
        return jsonResponse({ error: "not_found", message: "The requested API route does not exist." }, 404);
      }

      return new Response("Not found", { status: 404 });
    } catch (error) {
      console.error("API request failed", error);
      return jsonResponse({ error: "internal_error", message: "The evidence service could not complete this request." }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
