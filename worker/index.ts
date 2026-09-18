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
  const [included, simulated, sourceBreakdown, failureBreakdown] = await db.batch([
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

  return jsonResponse({
    corpus: corpus ?? { source_count: 0, document_count: 0, evidence_count: 0, verified_count: 0 },
    simulatedEvidenceExcluded: simulatedRow?.evidence_count ?? 0,
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        const databaseCheck = await env.DB.prepare("SELECT 1 AS connected").first<{ connected: number }>();
        return jsonResponse({
          status: "ok",
          service: "photo-recall-discovery-engine",
          stage: "evidence-foundation",
          database: databaseCheck?.connected === 1 ? "connected" : "unavailable",
          checkedAt: new Date().toISOString(),
        });
      }

      if (request.method === "GET" && url.pathname === "/api/stats") {
        return await getStats(env.DB);
      }

      if (request.method === "GET" && url.pathname === "/api/evidence") {
        const filters = parseEvidenceFilters(url);
        if (filters instanceof Response) return filters;
        return await listEvidence(env.DB, filters);
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
