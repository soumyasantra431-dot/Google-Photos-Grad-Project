const SEARCH_QUERIES = [
  '"Google Photos search" remember photo',
  '"Google Photos" search by description',
  '"Ask Photos" find old photos',
] as const;

const GROQ_MODEL = "openai/gpt-oss-20b";
const COLLECTOR_VERSION = "youtube-v1";
const MAX_VIDEOS = 6;
const COMMENTS_PER_VIDEO = 25;
const GROQ_BATCH_SIZE = 15;
const APP_STORE_APP_ID = "962194608";
const APP_STORE_STOREFRONTS = ["us", "gb", "in"] as const;
const APP_STORE_CANDIDATE_LIMIT = 90;

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: { title?: string; channelTitle?: string; publishedAt?: string };
  }>;
};

type YouTubeCommentsResponse = {
  items?: Array<{
    snippet?: {
      videoId?: string;
      topLevelComment?: {
        id?: string;
        snippet?: {
          textOriginal?: string;
          publishedAt?: string;
          updatedAt?: string;
          likeCount?: number;
        };
      };
    };
  }>;
};

type VideoCandidate = {
  videoId: string;
  title: string;
  channelTitle: string;
  searchQuery: string;
};

type CommentCandidate = VideoCandidate & {
  commentId: string;
  body: string;
  publishedAt: string | null;
  updatedAt: string | null;
  likeCount: number | null;
};

type AppStoreCandidate = {
  reviewId: string;
  storefront: string;
  feedUrl: string;
  title: string;
  body: string;
  publishedAt: string | null;
  rating: number | null;
  appVersion: string | null;
};

type GoogleSupportCandidate = {
  threadId: string;
  postId: string;
  title: string;
  body: string;
  publishedAt: string | null;
};

type CuratedPublicCandidate = {
  sourceKind: "reddit" | "forum" | "social";
  canonicalUrl: string;
  externalId: string;
  title: string;
  body: string;
  publishedAt: string | null;
};

type Extraction = {
  index: number;
  relevant: boolean;
  retrieval_target: string | null;
  evidence_excerpt: string | null;
  remembered_clues: string[];
  forgotten_context: string[];
  search_attempt: string | null;
  failure_stage: "expression" | "interpretation" | "evaluation" | "refinement" | "unknown";
  workaround: string | null;
  retrieval_outcome: "found" | "not_found" | "abandoned" | "unclear";
  confidence: number;
  photo_kind: "photo" | "video" | "screenshot" | "document_image" | "unknown";
  target_types: Array<"people" | "outdoor_place" | "indoor_place" | "object" | "animal" | "document" | "screenshot" | "event" | "other" | "unknown">;
  remembered_clue_types: Array<"person" | "place" | "object" | "appearance" | "event" | "approximate_time" | "text" | "animal" | "memory_surface" | "library_state" | "reference_image" | "other">;
  explicitly_forgotten: Array<"date" | "place" | "album" | "filename" | "search_words" | "other">;
  search_methods: Array<"typed_query" | "timeline_browse" | "album_browse" | "folder_browse" | "visual_scan" | "reference_image_request" | "map_browse_request" | "other">;
  exact_queries: string[];
  existence_status: "confirmed" | "uncertain";
};

type GroqResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

export type CollectionSummary = {
  runId: string;
  videosScanned: number;
  commentsScanned: number;
  commentsAnalyzed: number;
  evidenceStored: number;
  searchQueries: readonly string[];
  model: string;
};

export type AppStoreCollectionSummary = {
  runId: string;
  storefronts: readonly string[];
  reviewsScanned: number;
  reviewsAnalyzed: number;
  evidenceStored: number;
  model: string;
  decisions: Record<string, number>;
};

export type GoogleSupportCollectionSummary = {
  runId: string;
  postsScanned: number;
  postsAnalyzed: number;
  evidenceStored: number;
  model: string;
  decisions: Record<string, number>;
};

export type CuratedPublicCollectionSummary = {
  runId: string;
  sourceKind: CuratedPublicCandidate["sourceKind"];
  postsScanned: number;
  postsAnalyzed: number;
  evidenceStored: number;
  model: string;
  decisions: Record<string, number>;
};

async function fetchJson<T>(url: URL | string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, init);
    if (response.ok) return response.json<T>();
    const errorBody = (await response.text()).slice(0, 500);
    const malformedStructuredOutput = response.status === 400
      && errorBody.includes("Generated JSON does not match the expected schema")
      && String(url).includes("api.groq.com");
    if ((response.status !== 429 && !malformedStructuredOutput) || attempt === 4) {
      throw new Error(`External API returned ${response.status}: ${errorBody}`);
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    const delayMs = response.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 30000)
      : malformedStructuredOutput ? 300 * (attempt + 1) : Math.min(2000 * 2 ** attempt, 30000);
    console.warn(JSON.stringify({ event: malformedStructuredOutput ? "structured_output_retry" : "external_api_rate_limited", attempt: attempt + 1, retryAfterMs: delayMs }));
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("External API retry limit reached");
}

export function isClearlyOutOfScope(candidate: { body: string }): boolean {
  const text = candidate.body.toLocaleLowerCase();
  const recoveryProblem = /\b(delet(?:e|ed|ing)|trash|recycle|restore|recover|backup|back up|disappeared|storage|sync)\b/.test(text);
  const negatedRecovery = /\b(not|never|don't|do not|isn't|wasn't|no)\s+(?:to\s+)?(?:delete|deleted|deleting|recover|restore)\b/.test(text);
  const memorySignal = /\b(remember|recall|description|clue|trip|place|person|people|wearing|background|sometime|roughly)\b/.test(text);
  const genericTutorialReaction = /\b(thank you|thanks|this worked|saved my life|helped me)\b/.test(text);
  return (recoveryProblem && !memorySignal && !negatedRecovery) || (genericTutorialReaction && !memorySignal);
}

function hasRetrievalSignal(candidate: { body: string }): boolean {
  return /\b(find|found|search|searching|look(?:ing)? for|locate|remember|recall|specific photo|specific picture|old photo|old picture|years? ago|what date|where.*taken)\b/i.test(candidate.body);
}

function normalizeAppStoreReviews(value: unknown): AppStoreCandidate[] {
  if (!Array.isArray(value)) throw new Error("App Store payload must be an array");
  const allowedStorefronts = new Set<string>(APP_STORE_STOREFRONTS);
  const reviews: AppStoreCandidate[] = [];

  for (const item of value.slice(0, 200)) {
    if (!item || typeof item !== "object") continue;
    const review = item as Record<string, unknown>;
    if (typeof review.reviewId !== "string" || review.reviewId.length > 100) continue;
    if (typeof review.storefront !== "string" || !allowedStorefronts.has(review.storefront)) continue;
    if (typeof review.body !== "string" || review.body.trim().length < 12) continue;
    const expectedFeedPrefix = `https://itunes.apple.com/${review.storefront}/rss/customerreviews/`;
    if (typeof review.feedUrl !== "string" || !review.feedUrl.startsWith(expectedFeedPrefix) || !review.feedUrl.includes(`/id=${APP_STORE_APP_ID}/`)) continue;
    reviews.push({
      reviewId: review.reviewId,
      storefront: review.storefront,
      feedUrl: review.feedUrl.slice(0, 300),
      title: typeof review.title === "string" ? review.title.slice(0, 300) : "Untitled App Store review",
      body: review.body.trim().slice(0, 3000),
      publishedAt: typeof review.publishedAt === "string" ? review.publishedAt : null,
      rating: typeof review.rating === "number" && Number.isFinite(review.rating) ? review.rating : null,
      appVersion: typeof review.appVersion === "string" ? review.appVersion.slice(0, 50) : null,
    });
  }

  return [...new Map(reviews.map((review) => [`${review.storefront}:${review.reviewId}`, review])).values()];
}

function normalizeGoogleSupportPosts(value: unknown): GoogleSupportCandidate[] {
  if (!Array.isArray(value)) throw new Error("Google Support payload must be an array");
  const posts: GoogleSupportCandidate[] = [];

  for (const item of value.slice(0, 50)) {
    if (!item || typeof item !== "object") continue;
    const post = item as Record<string, unknown>;
    if (typeof post.threadId !== "string" || !/^\d{1,12}$/.test(post.threadId)) continue;
    if (typeof post.postId !== "string" || !/^\d{1,12}$/.test(post.postId)) continue;
    if (typeof post.title !== "string" || !post.title.trim()) continue;
    if (typeof post.body !== "string" || post.body.trim().length < 12) continue;
    posts.push({
      threadId: post.threadId,
      postId: post.postId,
      title: post.title.trim().slice(0, 300),
      body: post.body.trim().slice(0, 4000),
      publishedAt: typeof post.publishedAt === "string" ? post.publishedAt.slice(0, 40) : null,
    });
  }

  return [...new Map(posts.map((post) => [`${post.threadId}:${post.postId}`, post])).values()];
}

function normalizeCuratedPublicPosts(value: unknown): CuratedPublicCandidate[] {
  if (!Array.isArray(value)) throw new Error("Curated public payload must be an array");
  const posts: CuratedPublicCandidate[] = [];
  for (const item of value.slice(0, 25)) {
    if (!item || typeof item !== "object") continue;
    const post = item as Record<string, unknown>;
    if (post.sourceKind !== "reddit" && post.sourceKind !== "forum" && post.sourceKind !== "social") continue;
    if (typeof post.canonicalUrl !== "string" || post.canonicalUrl.length > 500) continue;
    let url: URL;
    try { url = new URL(post.canonicalUrl); } catch { continue; }
    if (url.protocol !== "https:") continue;
    if (post.sourceKind === "reddit" && !["reddit.com", "www.reddit.com"].includes(url.hostname)) continue;
    if (typeof post.externalId !== "string" || post.externalId.length > 120) continue;
    if (typeof post.body !== "string" || post.body.trim().length < 20 || post.body.length > 1800) continue;
    posts.push({
      sourceKind: post.sourceKind,
      canonicalUrl: url.toString(),
      externalId: post.externalId,
      title: typeof post.title === "string" ? post.title.slice(0, 300) : "Public discussion",
      body: post.body.trim(),
      publishedAt: typeof post.publishedAt === "string" ? post.publishedAt.slice(0, 40) : null,
    });
  }
  return [...new Map(posts.map((post) => [`${post.sourceKind}:${post.externalId}`, post])).values()];
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function searchVideos(apiKey: string): Promise<VideoCandidate[]> {
  const videos = new Map<string, VideoCandidate>();

  for (const searchQuery of SEARCH_QUERIES) {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "3");
    url.searchParams.set("relevanceLanguage", "en");
    url.searchParams.set("safeSearch", "moderate");
    url.searchParams.set("q", searchQuery);

    const response = await fetchJson<YouTubeSearchResponse>(url, {
      headers: { "X-Goog-Api-Key": apiKey },
    });

    for (const item of response.items ?? []) {
      const videoId = item.id?.videoId;
      if (!videoId || videos.has(videoId)) continue;
      videos.set(videoId, {
        videoId,
        title: item.snippet?.title ?? "Untitled YouTube video",
        channelTitle: item.snippet?.channelTitle ?? "Unknown channel",
        searchQuery,
      });
      if (videos.size >= MAX_VIDEOS) return [...videos.values()];
    }
  }

  return [...videos.values()];
}

async function getComments(apiKey: string, video: VideoCandidate): Promise<CommentCandidate[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("videoId", video.videoId);
  url.searchParams.set("maxResults", String(COMMENTS_PER_VIDEO));
  url.searchParams.set("order", "relevance");
  url.searchParams.set("textFormat", "plainText");

  try {
    const response = await fetchJson<YouTubeCommentsResponse>(url, {
      headers: { "X-Goog-Api-Key": apiKey },
    });

    return (response.items ?? []).flatMap((item) => {
      const comment = item.snippet?.topLevelComment;
      const commentId = comment?.id;
      const body = comment?.snippet?.textOriginal?.trim();
      if (!commentId || !body || body.length < 12) return [];

      return [{
        ...video,
        commentId,
        body: body.slice(0, 2000),
        publishedAt: comment.snippet?.publishedAt ?? null,
        updatedAt: comment.snippet?.updatedAt ?? null,
        likeCount: comment.snippet?.likeCount ?? null,
      }];
    });
  } catch (error) {
    console.warn(JSON.stringify({ event: "youtube_comments_skipped", videoId: video.videoId, error: String(error) }));
    return [];
  }
}

function extractionSchema() {
  return {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "integer" },
            relevant: { type: "boolean" },
            retrieval_target: { type: ["string", "null"] },
            evidence_excerpt: { type: ["string", "null"] },
            remembered_clues: { type: "array", items: { type: "string" } },
            forgotten_context: { type: "array", items: { type: "string" } },
            search_attempt: { type: ["string", "null"] },
            failure_stage: {
              type: "string",
              enum: ["expression", "interpretation", "evaluation", "refinement", "unknown"],
            },
            workaround: { type: ["string", "null"] },
            retrieval_outcome: {
              type: "string",
              enum: ["found", "not_found", "abandoned", "unclear"],
            },
            confidence: { type: "number" },
            photo_kind: { type: "string", enum: ["photo", "video", "screenshot", "document_image", "unknown"] },
            target_types: { type: "array", items: { type: "string" } },
            remembered_clue_types: { type: "array", items: { type: "string" } },
            explicitly_forgotten: { type: "array", items: { type: "string" } },
            search_methods: { type: "array", items: { type: "string" } },
            exact_queries: { type: "array", items: { type: "string" } },
            existence_status: { type: "string", enum: ["confirmed", "uncertain"] },
          },
          required: [
            "index", "relevant", "retrieval_target", "evidence_excerpt", "remembered_clues",
            "forgotten_context", "search_attempt", "failure_stage", "workaround",
            "retrieval_outcome", "confidence", "photo_kind", "target_types", "remembered_clue_types",
            "explicitly_forgotten", "search_methods", "exact_queries", "existence_status",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  };
}

function isExtraction(value: unknown): value is Extraction {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return Number.isInteger(item.index)
    && typeof item.relevant === "boolean"
    && Array.isArray(item.remembered_clues)
    && Array.isArray(item.forgotten_context)
    && Array.isArray(item.remembered_clue_types)
    && Array.isArray(item.target_types)
    && Array.isArray(item.explicitly_forgotten)
    && Array.isArray(item.search_methods)
    && Array.isArray(item.exact_queries)
    && typeof item.photo_kind === "string"
    && typeof item.existence_status === "string"
    && typeof item.failure_stage === "string"
    && typeof item.retrieval_outcome === "string"
    && typeof item.confidence === "number";
}

function keepAllowed<T extends string>(items: string[], allowed: readonly T[]): T[] {
  const values = new Set<string>(allowed);
  return items.filter((item): item is T => typeof item === "string" && values.has(item));
}

function sanitizeExtraction(item: Extraction): Extraction {
  return {
    ...item,
    target_types: keepAllowed(item.target_types, ["people", "outdoor_place", "indoor_place", "object", "animal", "document", "screenshot", "event", "other", "unknown"]),
    remembered_clue_types: keepAllowed(item.remembered_clue_types, ["person", "place", "object", "appearance", "event", "approximate_time", "text", "animal", "memory_surface", "library_state", "reference_image", "other"]),
    explicitly_forgotten: keepAllowed(item.explicitly_forgotten, ["date", "place", "album", "filename", "search_words", "other"]),
    search_methods: keepAllowed(item.search_methods, ["typed_query", "timeline_browse", "album_browse", "folder_browse", "visual_scan", "reference_image_request", "map_browse_request", "other"]),
    remembered_clues: item.remembered_clues.filter((value): value is string => typeof value === "string"),
    forgotten_context: item.forgotten_context.filter((value): value is string => typeof value === "string"),
    exact_queries: item.exact_queries.filter((value): value is string => typeof value === "string"),
    confidence: Number.isFinite(item.confidence) ? Math.max(0, Math.min(1, item.confidence)) : 0,
  };
}

async function extractBatch(apiKey: string, candidates: Array<{ body: string }>, retryMissing = false): Promise<Extraction[]> {
  const response = await fetchJson<GroqResponse>("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0,
      reasoning_effort: "low",
      max_completion_tokens: 5000,
      messages: [
        {
          role: "system",
          content: [
            "You code qualitative evidence about retrieving a specific remembered photo or video.",
            "Relevant evidence must describe a first-person retrieval attempt, failure, success, clue, or workaround.",
            "The photo or video must still exist; the problem is locating it with incomplete memory.",
            "A search-performance opinion with no concrete sought image, a request for metadata about an image already found, and uncertainty that files were ever backed up are not retrieval episodes.",
            "Deletion, trash, recovery, backup, upload, sync, missing-file, and storage problems are always irrelevant.",
            "General complaints, feature requests without a retrieval episode, tutorials, praise, and unrelated comments are not relevant.",
            "Do not infer details absent from the source text. evidence_excerpt must be an exact contiguous quote from the source text.",
            "Code photo_kind, target_types, and clue types only when grounded in the post. target_types describes what the sought image depicts, not the user's complaint. explicitly_forgotten is only for a detail the user says they cannot remember; an unmentioned detail is not forgotten.",
            "exact_queries contains only verbatim user-reported search strings, never suggested queries or paraphrases. Leave it empty if exact words were not stated.",
            "search_methods captures actions tried or methods explicitly requested; reference_image_request and map_browse_request are requests, not proof these features were used. Existence is confirmed only when the post says the specific image was seen or later found.",
            "Failure stages: expression = cannot formulate remembered clues; interpretation = system misunderstands clues; evaluation = results are hard to scan or compare; refinement = user cannot recover after poor results; unknown = evidence is insufficient.",
            "For coded arrays use only these values: target_types=people,outdoor_place,indoor_place,object,animal,document,screenshot,event,other,unknown; remembered_clue_types=person,place,object,appearance,event,approximate_time,text,animal,memory_surface,library_state,reference_image,other; explicitly_forgotten=date,place,album,filename,search_words,other; search_methods=typed_query,timeline_browse,album_browse,folder_browse,visual_scan,reference_image_request,map_browse_request,other.",
            "Return exactly one item for every input index, including irrelevant inputs. For an irrelevant input set relevant=false, retrieval_target and evidence_excerpt to null, arrays empty, failure_stage=unknown, retrieval_outcome=unclear, and explain nothing outside the JSON.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify(candidates.map((candidate, index) => ({ index, text: candidate.body }))),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "photo_retrieval_evidence",
          strict: true,
          schema: extractionSchema(),
        },
      },
    }),
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned no structured content");

  const parsed = JSON.parse(content) as { items?: unknown[] };
  const extracted = (parsed.items ?? []).filter(isExtraction).filter((item) => item.index >= 0 && item.index < candidates.length).map(sanitizeExtraction);
  if (!retryMissing || candidates.length === 1) return extracted;

  const returned = new Set(extracted.map((item) => item.index));
  for (let index = 0; index < candidates.length; index++) {
    if (returned.has(index)) continue;
    try {
      const single = await extractBatch(apiKey, [candidates[index]], false);
      if (single[0]) extracted.push({ ...single[0], index });
    } catch (error) {
      console.warn(JSON.stringify({ event: "groq_single_retry_failed", index, error: String(error).slice(0, 250) }));
    }
  }
  return extracted;
}

async function executeInChunks(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  for (let index = 0; index < statements.length; index += 50) {
    await db.batch(statements.slice(index, index + 50));
  }
}

async function storeCoding(db: D1Database, evidenceId: string, extraction: Extraction, sourceText: string): Promise<void> {
  const exactQueries = [...new Set(extraction.exact_queries
    .map((query) => query.trim())
    .filter((query) => query.length > 0 && query.length <= 120 && sourceText.toLocaleLowerCase().includes(query.toLocaleLowerCase())))];
  await db.prepare(`
    UPDATE evidence_units SET photo_kind = ?, target_types_json = ?, remembered_clue_types_json = ?,
      explicitly_forgotten_json = ?, search_methods_json = ?, exact_queries_json = ?,
      existence_status = ?, coding_status = 'ai_v2'
    WHERE id = ? AND is_human_verified = 0
  `).bind(
    extraction.photo_kind,
    JSON.stringify([...new Set(extraction.target_types)]),
    JSON.stringify([...new Set(extraction.remembered_clue_types)]),
    JSON.stringify([...new Set(extraction.explicitly_forgotten)]),
    JSON.stringify([...new Set(extraction.search_methods)]),
    JSON.stringify(exactQueries),
    extraction.existence_status,
    evidenceId,
  ).run();
}

async function storeExtraction(
  db: D1Database,
  runId: string,
  comment: CommentCandidate,
  extraction: Extraction,
): Promise<boolean> {
  if (!extraction.relevant || extraction.confidence < 0.8) return false;
  if (!extraction.retrieval_target || !extraction.evidence_excerpt) return false;
  if (!comment.body.toLocaleLowerCase().includes(extraction.evidence_excerpt.toLocaleLowerCase())) return false;

  const identityHash = await sha256Hex(`youtube:${comment.commentId}`);
  const sourceId = `src_${identityHash.slice(0, 24)}`;
  const documentId = `doc_${identityHash.slice(0, 24)}`;
  const evidenceId = `ev_${identityHash.slice(0, 24)}`;
  const reviewed = await db.prepare("SELECT is_human_verified FROM evidence_units WHERE id = ?")
    .bind(evidenceId).first<{ is_human_verified: number }>();
  if (reviewed?.is_human_verified === 1) return false;
  const contentHash = await sha256Hex(comment.body);
  const canonicalUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(comment.videoId)}&lc=${encodeURIComponent(comment.commentId)}`;
  const now = new Date().toISOString();
  const metadata = JSON.stringify({
    videoId: comment.videoId,
    videoTitle: comment.title,
    channelTitle: comment.channelTitle,
    searchQuery: comment.searchQuery,
    commentUpdatedAt: comment.updatedAt,
  });

  await executeInChunks(db, [
    db.prepare(`
      INSERT INTO sources (
        id, source_kind, platform, canonical_url, author_handle, published_at,
        collected_at, language, is_simulated, include_in_findings, metadata_json
      ) VALUES (?, 'youtube', 'YouTube', ?, NULL, ?, ?, 'en', 0, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        published_at = excluded.published_at,
        collected_at = excluded.collected_at,
        metadata_json = excluded.metadata_json
    `).bind(sourceId, canonicalUrl, comment.publishedAt, now, metadata),
    db.prepare(`
      INSERT INTO raw_documents (
        id, source_id, collection_run_id, external_id, title, body, content_hash,
        reply_to_external_id, engagement_count, collected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        collection_run_id = excluded.collection_run_id,
        title = excluded.title,
        body = excluded.body,
        content_hash = excluded.content_hash,
        engagement_count = excluded.engagement_count,
        collected_at = excluded.collected_at
    `).bind(
      documentId, sourceId, runId, comment.commentId, comment.title, comment.body,
      contentHash, comment.likeCount, now,
    ),
    db.prepare(`
      INSERT INTO evidence_units (
        id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json,
        forgotten_context_json, search_attempt, failure_stage, workaround,
        retrieval_outcome, model_name, schema_version, extraction_confidence,
        extracted_at, is_human_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1.0', ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        retrieval_target = excluded.retrieval_target,
        evidence_excerpt = excluded.evidence_excerpt,
        remembered_clues_json = excluded.remembered_clues_json,
        forgotten_context_json = excluded.forgotten_context_json,
        search_attempt = excluded.search_attempt,
        failure_stage = excluded.failure_stage,
        workaround = excluded.workaround,
        retrieval_outcome = excluded.retrieval_outcome,
        model_name = excluded.model_name,
        schema_version = excluded.schema_version,
        extraction_confidence = excluded.extraction_confidence,
        extracted_at = excluded.extracted_at
    `).bind(
      evidenceId, documentId, extraction.retrieval_target, extraction.evidence_excerpt,
      JSON.stringify(extraction.remembered_clues), JSON.stringify(extraction.forgotten_context),
      extraction.search_attempt, extraction.failure_stage, extraction.workaround,
      extraction.retrieval_outcome, GROQ_MODEL, extraction.confidence, now,
    ),
  ]);

  await storeCoding(db, evidenceId, extraction, comment.body);
  return true;
}

async function storeAppStoreExtraction(
  db: D1Database,
  runId: string,
  review: AppStoreCandidate,
  extraction: Extraction,
): Promise<string> {
  if (!extraction.relevant) return "model_out_of_scope";
  if (extraction.confidence < 0.8) return "low_confidence";
  if (!extraction.retrieval_target || !extraction.evidence_excerpt) return "missing_target_or_quote";
  if (!review.body.toLocaleLowerCase().includes(extraction.evidence_excerpt.toLocaleLowerCase())) return "quote_not_verbatim";

  const identityHash = await sha256Hex(`app-store:${review.storefront}:${review.reviewId}`);
  const sourceId = `src_${identityHash.slice(0, 24)}`;
  const documentId = `doc_${identityHash.slice(0, 24)}`;
  const evidenceId = `ev_${identityHash.slice(0, 24)}`;
  const reviewed = await db.prepare("SELECT is_human_verified FROM evidence_units WHERE id = ?")
    .bind(evidenceId).first<{ is_human_verified: number }>();
  if (reviewed?.is_human_verified === 1) return "already_human_reviewed";
  // Preserve distinct reviewers who happen to use identical wording.
  const contentHash = await sha256Hex(`${review.storefront}:${review.reviewId}:${review.body}`);
  const canonicalUrl = `${review.feedUrl}#review-${encodeURIComponent(review.reviewId)}`;
  const now = new Date().toISOString();
  const metadata = JSON.stringify({
    appId: APP_STORE_APP_ID,
    storefront: review.storefront,
    rating: review.rating,
    appVersion: review.appVersion,
    reviewTitle: review.title,
    reviewId: review.reviewId,
    feedUrl: review.feedUrl,
  });

  await executeInChunks(db, [
    db.prepare(`
      INSERT INTO sources (
        id, source_kind, platform, canonical_url, author_handle, published_at,
        collected_at, language, is_simulated, include_in_findings, metadata_json
      ) VALUES (?, 'app_store', 'Apple App Store', ?, NULL, ?, ?, 'en', 0, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        published_at = excluded.published_at,
        collected_at = excluded.collected_at,
        metadata_json = excluded.metadata_json
    `).bind(sourceId, canonicalUrl, review.publishedAt, now, metadata),
    db.prepare(`
      INSERT INTO raw_documents (
        id, source_id, collection_run_id, external_id, title, body, content_hash,
        reply_to_external_id, engagement_count, collected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)
      ON CONFLICT(id) DO UPDATE SET
        collection_run_id = excluded.collection_run_id,
        title = excluded.title,
        body = excluded.body,
        content_hash = excluded.content_hash,
        collected_at = excluded.collected_at
    `).bind(documentId, sourceId, runId, review.reviewId, review.title, review.body, contentHash, now),
    db.prepare(`
      INSERT INTO evidence_units (
        id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json,
        forgotten_context_json, search_attempt, failure_stage, workaround,
        retrieval_outcome, model_name, schema_version, extraction_confidence,
        extracted_at, is_human_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1.0', ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        retrieval_target = excluded.retrieval_target,
        evidence_excerpt = excluded.evidence_excerpt,
        remembered_clues_json = excluded.remembered_clues_json,
        forgotten_context_json = excluded.forgotten_context_json,
        search_attempt = excluded.search_attempt,
        failure_stage = excluded.failure_stage,
        workaround = excluded.workaround,
        retrieval_outcome = excluded.retrieval_outcome,
        model_name = excluded.model_name,
        schema_version = excluded.schema_version,
        extraction_confidence = excluded.extraction_confidence,
        extracted_at = excluded.extracted_at
    `).bind(
      evidenceId, documentId, extraction.retrieval_target, extraction.evidence_excerpt,
      JSON.stringify(extraction.remembered_clues), JSON.stringify(extraction.forgotten_context),
      extraction.search_attempt, extraction.failure_stage, extraction.workaround,
      extraction.retrieval_outcome, GROQ_MODEL, extraction.confidence, now,
    ),
  ]);

  await storeCoding(db, evidenceId, extraction, review.body);
  return "stored";
}

async function recordAppStoreDecision(
  db: D1Database,
  runId: string,
  review: AppStoreCandidate,
  extraction: Extraction | null,
  decision: string,
): Promise<void> {
  const identityHash = await sha256Hex(`app-store-review:${review.storefront}:${review.reviewId}`);
  await db.prepare(`
    INSERT INTO review_candidates (
      id, source_kind, canonical_url, external_id, title, body,
      model_output_json, decision, model_confidence, collection_run_id, collected_at
    ) VALUES (?, 'app_store', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, body = excluded.body,
      model_output_json = excluded.model_output_json, decision = excluded.decision,
      model_confidence = excluded.model_confidence,
      collection_run_id = excluded.collection_run_id, collected_at = excluded.collected_at
    WHERE review_candidates.reviewed_at IS NULL
  `).bind(
    `rev_${identityHash.slice(0, 24)}`, `${review.feedUrl}#review-${encodeURIComponent(review.reviewId)}`,
    `${review.storefront}:${review.reviewId}`, review.title, review.body,
    extraction ? JSON.stringify(extraction) : null, decision, extraction?.confidence ?? null,
    runId, new Date().toISOString(),
  ).run();
}

async function storeGoogleSupportExtraction(
  db: D1Database,
  runId: string,
  post: GoogleSupportCandidate,
  extraction: Extraction,
): Promise<string> {
  if (!extraction.relevant) return "model_out_of_scope";
  if (extraction.confidence < 0.8) return "low_confidence";
  if (!extraction.retrieval_target || !extraction.evidence_excerpt) return "missing_target_or_quote";
  if (!post.body.toLocaleLowerCase().includes(extraction.evidence_excerpt.toLocaleLowerCase())) return "quote_not_verbatim";

  const identityHash = await sha256Hex(post.postId === post.threadId
    ? `google-support:${post.threadId}`
    : `google-support:${post.threadId}:reply:${post.postId}`);
  const sourceId = `src_${identityHash.slice(0, 24)}`;
  const documentId = `doc_${identityHash.slice(0, 24)}`;
  const evidenceId = `ev_${identityHash.slice(0, 24)}`;
  const reviewed = await db.prepare("SELECT is_human_verified FROM evidence_units WHERE id = ?")
    .bind(evidenceId).first<{ is_human_verified: number }>();
  if (reviewed?.is_human_verified === 1) return "already_human_reviewed";
  const contentHash = await sha256Hex(post.body);
  const now = new Date().toISOString();
  const canonicalUrl = `https://support.google.com/photos/thread/${post.threadId}?hl=en${post.postId === post.threadId ? "" : `&msgid=${post.postId}`}`;

  await executeInChunks(db, [
    db.prepare(`
      INSERT INTO sources (
        id, source_kind, platform, canonical_url, author_handle, published_at,
        collected_at, language, is_simulated, include_in_findings, metadata_json
      ) VALUES (?, 'google_support', 'Google Photos Community', ?, NULL, ?, ?, 'en', 0, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        published_at = excluded.published_at,
        collected_at = excluded.collected_at,
        metadata_json = excluded.metadata_json
    `).bind(sourceId, canonicalUrl, post.publishedAt, now, JSON.stringify({ threadId: post.threadId, postId: post.postId, extractionMethod: post.postId === post.threadId ? "public_original_post" : "public_reply" })),
    db.prepare(`
      INSERT INTO raw_documents (
        id, source_id, collection_run_id, external_id, title, body, content_hash,
        reply_to_external_id, engagement_count, collected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)
      ON CONFLICT(id) DO UPDATE SET
        collection_run_id = excluded.collection_run_id,
        title = excluded.title,
        body = excluded.body,
        content_hash = excluded.content_hash,
        collected_at = excluded.collected_at
    `).bind(documentId, sourceId, runId, post.postId, post.title, post.body, contentHash, now),
    db.prepare(`
      INSERT INTO evidence_units (
        id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json,
        forgotten_context_json, search_attempt, failure_stage, workaround,
        retrieval_outcome, model_name, schema_version, extraction_confidence,
        extracted_at, is_human_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1.0', ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        retrieval_target = excluded.retrieval_target,
        evidence_excerpt = excluded.evidence_excerpt,
        remembered_clues_json = excluded.remembered_clues_json,
        forgotten_context_json = excluded.forgotten_context_json,
        search_attempt = excluded.search_attempt,
        failure_stage = excluded.failure_stage,
        workaround = excluded.workaround,
        retrieval_outcome = excluded.retrieval_outcome,
        model_name = excluded.model_name,
        schema_version = excluded.schema_version,
        extraction_confidence = excluded.extraction_confidence,
        extracted_at = excluded.extracted_at
    `).bind(
      evidenceId, documentId, extraction.retrieval_target, extraction.evidence_excerpt,
      JSON.stringify(extraction.remembered_clues), JSON.stringify(extraction.forgotten_context),
      extraction.search_attempt, extraction.failure_stage, extraction.workaround,
      extraction.retrieval_outcome, GROQ_MODEL, extraction.confidence, now,
    ),
  ]);

  await storeCoding(db, evidenceId, extraction, post.body);
  return "stored";
}

async function recordGoogleSupportDecision(
  db: D1Database,
  runId: string,
  post: GoogleSupportCandidate,
  extraction: Extraction | null,
  decision: string,
): Promise<void> {
  const identityHash = await sha256Hex(`google-support-review:${post.threadId}:${post.postId}`);
  const url = `https://support.google.com/photos/thread/${post.threadId}?hl=en${post.postId === post.threadId ? "" : `&msgid=${post.postId}`}`;
  await db.prepare(`
    INSERT INTO review_candidates (
      id, source_kind, canonical_url, external_id, title, body,
      model_output_json, decision, model_confidence, collection_run_id, collected_at
    ) VALUES (?, 'google_support', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, body = excluded.body,
      model_output_json = excluded.model_output_json, decision = excluded.decision,
      model_confidence = excluded.model_confidence,
      collection_run_id = excluded.collection_run_id, collected_at = excluded.collected_at
    WHERE review_candidates.reviewed_at IS NULL
  `).bind(
    `rev_${identityHash.slice(0, 24)}`, url, `${post.threadId}:${post.postId}`,
    post.title, post.body, extraction ? JSON.stringify(extraction) : null,
    decision, extraction?.confidence ?? null, runId, new Date().toISOString(),
  ).run();
}

async function recordCuratedDecision(
  db: D1Database, runId: string, post: CuratedPublicCandidate,
  extraction: Extraction | null, decision: string,
): Promise<void> {
  const identityHash = await sha256Hex(`curated-review:${post.sourceKind}:${post.externalId}`);
  await db.prepare(`
    INSERT INTO review_candidates (
      id, source_kind, canonical_url, external_id, title, body,
      model_output_json, decision, model_confidence, collection_run_id, collected_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, body = excluded.body,
      model_output_json = excluded.model_output_json, decision = excluded.decision,
      model_confidence = excluded.model_confidence,
      collection_run_id = excluded.collection_run_id, collected_at = excluded.collected_at
    WHERE review_candidates.reviewed_at IS NULL
  `).bind(
    `rev_${identityHash.slice(0, 24)}`, post.sourceKind, post.canonicalUrl,
    post.externalId, post.title, post.body, extraction ? JSON.stringify(extraction) : null,
    decision, extraction?.confidence ?? null, runId, new Date().toISOString(),
  ).run();
}

async function storeCuratedExtraction(
  db: D1Database, runId: string, post: CuratedPublicCandidate, extraction: Extraction,
): Promise<string> {
  if (!extraction.relevant) return "model_out_of_scope";
  if (extraction.confidence < 0.8) return "low_confidence";
  if (!extraction.retrieval_target || !extraction.evidence_excerpt) return "missing_target_or_quote";
  if (!post.body.toLocaleLowerCase().includes(extraction.evidence_excerpt.toLocaleLowerCase())) return "quote_not_verbatim";
  const identityHash = await sha256Hex(`curated:${post.sourceKind}:${post.externalId}`);
  // Several useful comments can come from the same public discussion. Reuse the
  // URL-level source record while keeping one document/evidence record per post.
  const existingSource = await db.prepare("SELECT id FROM sources WHERE canonical_url = ?")
    .bind(post.canonicalUrl).first<{ id: string }>();
  const sourceHash = await sha256Hex(`curated-source:${post.sourceKind}:${post.canonicalUrl}`);
  const sourceId = existingSource?.id ?? `src_${sourceHash.slice(0, 24)}`;
  const documentId = `doc_${identityHash.slice(0, 24)}`;
  const evidenceId = `ev_${identityHash.slice(0, 24)}`;
  const reviewed = await db.prepare("SELECT is_human_verified FROM evidence_units WHERE id = ?")
    .bind(evidenceId).first<{ is_human_verified: number }>();
  if (reviewed?.is_human_verified === 1) return "already_human_reviewed";
  const now = new Date().toISOString();
  const contentHash = await sha256Hex(`${post.sourceKind}:${post.externalId}:${post.body}`);
  const platform = post.sourceKind === "reddit" ? "Reddit" : post.sourceKind === "forum" ? "Public forum" : "Public social post";
  await executeInChunks(db, [
    db.prepare(`
      INSERT INTO sources (
        id, source_kind, platform, canonical_url, author_handle, published_at,
        collected_at, language, is_simulated, include_in_findings, metadata_json
      ) VALUES (?, ?, ?, ?, NULL, ?, ?, 'en', 0, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        published_at = excluded.published_at, collected_at = excluded.collected_at,
        metadata_json = excluded.metadata_json
    `).bind(sourceId, post.sourceKind, platform, post.canonicalUrl, post.publishedAt, now,
      JSON.stringify({ curationMethod: "public_search_verified_excerpt", externalId: post.externalId })),
    db.prepare(`
      INSERT INTO raw_documents (
        id, source_id, collection_run_id, external_id, title, body, content_hash,
        reply_to_external_id, engagement_count, collected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)
      ON CONFLICT(id) DO UPDATE SET
        collection_run_id = excluded.collection_run_id, title = excluded.title,
        body = excluded.body, content_hash = excluded.content_hash,
        collected_at = excluded.collected_at
    `).bind(documentId, sourceId, runId, post.externalId, post.title, post.body, contentHash, now),
    db.prepare(`
      INSERT INTO evidence_units (
        id, document_id, retrieval_target, evidence_excerpt, remembered_clues_json,
        forgotten_context_json, search_attempt, failure_stage, workaround,
        retrieval_outcome, model_name, schema_version, extraction_confidence,
        extracted_at, is_human_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1.0', ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        retrieval_target = excluded.retrieval_target,
        evidence_excerpt = excluded.evidence_excerpt,
        remembered_clues_json = excluded.remembered_clues_json,
        forgotten_context_json = excluded.forgotten_context_json,
        search_attempt = excluded.search_attempt,
        failure_stage = excluded.failure_stage,
        workaround = excluded.workaround,
        retrieval_outcome = excluded.retrieval_outcome,
        model_name = excluded.model_name,
        schema_version = excluded.schema_version,
        extraction_confidence = excluded.extraction_confidence,
        extracted_at = excluded.extracted_at
    `).bind(evidenceId, documentId, extraction.retrieval_target, extraction.evidence_excerpt,
      JSON.stringify(extraction.remembered_clues), JSON.stringify(extraction.forgotten_context),
      extraction.search_attempt, extraction.failure_stage, extraction.workaround,
      extraction.retrieval_outcome, GROQ_MODEL, extraction.confidence, now),
  ]);
  await storeCoding(db, evidenceId, extraction, post.body);
  return "stored";
}

export async function ingestCuratedPublicEvidence(env: Env, payload: unknown): Promise<CuratedPublicCollectionSummary> {
  const posts = normalizeCuratedPublicPosts(payload);
  if (posts.length === 0) throw new Error("Curated payload contained no valid public posts");
  const sourceKind = posts[0].sourceKind;
  if (posts.some((post) => post.sourceKind !== sourceKind)) throw new Error("One source kind per curated batch is required");
  const runId = `run_${crypto.randomUUID()}`;
  await env.DB.prepare(`
    INSERT INTO collection_runs (id, source_kind, collector_version, started_at, status, records_seen, records_stored)
    VALUES (?, ?, 'curated-public-v1', ?, 'running', 0, 0)
  `).bind(runId, sourceKind, new Date().toISOString()).run();
  try {
    const postsForAnalysis = posts.filter((post) => hasRetrievalSignal(post) && !isClearlyOutOfScope(post));
    const decisions: Record<string, number> = { prefiltered_out: posts.length - postsForAnalysis.length };
    let evidenceStored = 0;
    for (const post of posts) {
      if (!postsForAnalysis.includes(post)) await recordCuratedDecision(env.DB, runId, post, null, "prefiltered_out");
    }
    for (let offset = 0; offset < postsForAnalysis.length; offset += GROQ_BATCH_SIZE) {
      const batch = postsForAnalysis.slice(offset, offset + GROQ_BATCH_SIZE);
      const extractions = await extractBatch(env.GROQ_API_KEY, batch, true);
      const byIndex = new Map(extractions.map((item) => [item.index, item]));
      for (let index = 0; index < batch.length; index++) {
        const post = batch[index];
        const extraction = byIndex.get(index) ?? null;
        const decision = extraction ? await storeCuratedExtraction(env.DB, runId, post, extraction) : "no_model_output";
        await recordCuratedDecision(env.DB, runId, post, extraction, decision);
        decisions[decision] = (decisions[decision] ?? 0) + 1;
        if (decision === "stored") evidenceStored++;
      }
    }
    await env.DB.prepare(`
      UPDATE collection_runs SET completed_at = ?, status = 'completed', records_seen = ?, records_stored = ? WHERE id = ?
    `).bind(new Date().toISOString(), posts.length, evidenceStored, runId).run();
    return { runId, sourceKind, postsScanned: posts.length, postsAnalyzed: postsForAnalysis.length,
      evidenceStored, model: GROQ_MODEL, decisions };
  } catch (error) {
    await env.DB.prepare(`
      UPDATE collection_runs SET completed_at = ?, status = 'failed', error_summary = ? WHERE id = ?
    `).bind(new Date().toISOString(), String(error).slice(0, 1000), runId).run();
    throw error;
  }
}

export async function ingestGoogleSupportEvidence(env: Env, payload: unknown): Promise<GoogleSupportCollectionSummary> {
  const runId = `run_${crypto.randomUUID()}`;
  await env.DB.prepare(`
    INSERT INTO collection_runs (
      id, source_kind, collector_version, started_at, status, records_seen, records_stored
    ) VALUES (?, 'google_support', 'google-support-v1', ?, 'running', 0, 0)
  `).bind(runId, new Date().toISOString()).run();

  try {
    const posts = normalizeGoogleSupportPosts(payload);
    if (posts.length === 0) throw new Error("Google Support payload contained no valid posts");
    const postsForAnalysis = posts.filter((post) => hasRetrievalSignal(post) && !isClearlyOutOfScope(post));
    let evidenceStored = 0;
    const decisions: Record<string, number> = { prefiltered_out: posts.length - postsForAnalysis.length };

    for (const post of posts) {
      if (!postsForAnalysis.includes(post)) await recordGoogleSupportDecision(env.DB, runId, post, null, "prefiltered_out");
    }

    for (let offset = 0; offset < postsForAnalysis.length; offset += GROQ_BATCH_SIZE) {
      const batch = postsForAnalysis.slice(offset, offset + GROQ_BATCH_SIZE);
      const extractions = await extractBatch(env.GROQ_API_KEY, batch, true);
      const extractionByIndex = new Map(extractions.map((item) => [item.index, item]));
      for (let index = 0; index < batch.length; index++) {
        const post = batch[index];
        const extraction = extractionByIndex.get(index) ?? null;
        const decision = extraction ? await storeGoogleSupportExtraction(env.DB, runId, post, extraction) : "no_model_output";
        await recordGoogleSupportDecision(env.DB, runId, post, extraction, decision);
        decisions[decision] = (decisions[decision] ?? 0) + 1;
        if (decision === "stored") evidenceStored += 1;
      }
    }

    await env.DB.prepare(`
      UPDATE collection_runs
      SET completed_at = ?, status = 'completed', records_seen = ?, records_stored = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), posts.length, evidenceStored, runId).run();

    const summary: GoogleSupportCollectionSummary = {
      runId, postsScanned: posts.length, postsAnalyzed: postsForAnalysis.length,
      evidenceStored, model: GROQ_MODEL, decisions,
    };
    console.log(JSON.stringify({ event: "google_support_collection_completed", ...summary }));
    return summary;
  } catch (error) {
    await env.DB.prepare(`
      UPDATE collection_runs
      SET completed_at = ?, status = 'failed', error_summary = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), String(error).slice(0, 1000), runId).run();
    throw error;
  }
}

export async function ingestAppStoreEvidence(env: Env, payload: unknown): Promise<AppStoreCollectionSummary> {
  const runId = `run_${crypto.randomUUID()}`;
  const startedAt = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO collection_runs (
      id, source_kind, collector_version, started_at, status, records_seen, records_stored
    ) VALUES (?, 'app_store', 'app-store-v1', ?, 'running', 0, 0)
  `).bind(runId, startedAt).run();

  try {
    const reviews = normalizeAppStoreReviews(payload);
    if (reviews.length === 0) throw new Error("App Store payload contained no valid reviews");
    const reviewsForAnalysis = reviews
      .filter((review) => hasRetrievalSignal(review) && !isClearlyOutOfScope(review))
      .slice(0, APP_STORE_CANDIDATE_LIMIT);
    let evidenceStored = 0;
    const decisions: Record<string, number> = { prefiltered_out: reviews.length - reviewsForAnalysis.length };

    for (const review of reviews) {
      if (!reviewsForAnalysis.includes(review)) await recordAppStoreDecision(env.DB, runId, review, null, "prefiltered_out");
    }

    for (let offset = 0; offset < reviewsForAnalysis.length; offset += GROQ_BATCH_SIZE) {
      const batch = reviewsForAnalysis.slice(offset, offset + GROQ_BATCH_SIZE);
      const extractions = await extractBatch(env.GROQ_API_KEY, batch, true);
      const extractionByIndex = new Map(extractions.map((item) => [item.index, item]));
      for (let index = 0; index < batch.length; index++) {
        const review = batch[index];
        const extraction = extractionByIndex.get(index) ?? null;
        const decision = extraction ? await storeAppStoreExtraction(env.DB, runId, review, extraction) : "no_model_output";
        await recordAppStoreDecision(env.DB, runId, review, extraction, decision);
        decisions[decision] = (decisions[decision] ?? 0) + 1;
        if (decision === "stored") evidenceStored += 1;
      }
    }

    await env.DB.prepare(`
      UPDATE collection_runs
      SET completed_at = ?, status = 'completed', records_seen = ?, records_stored = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), reviews.length, evidenceStored, runId).run();

    const summary: AppStoreCollectionSummary = {
      runId,
      storefronts: APP_STORE_STOREFRONTS,
      reviewsScanned: reviews.length,
      reviewsAnalyzed: reviewsForAnalysis.length,
      evidenceStored,
      model: GROQ_MODEL,
      decisions,
    };
    console.log(JSON.stringify({ event: "app_store_collection_completed", ...summary }));
    return summary;
  } catch (error) {
    await env.DB.prepare(`
      UPDATE collection_runs
      SET completed_at = ?, status = 'failed', error_summary = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), String(error).slice(0, 1000), runId).run();
    throw error;
  }
}

export async function collectYouTubeEvidence(env: Env): Promise<CollectionSummary> {
  const runId = `run_${crypto.randomUUID()}`;
  const startedAt = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO collection_runs (
      id, source_kind, collector_version, started_at, status, records_seen, records_stored
    ) VALUES (?, 'youtube', ?, ?, 'running', 0, 0)
  `).bind(runId, COLLECTOR_VERSION, startedAt).run();

  try {
    const videos = await searchVideos(env.YOUTUBE_API_KEY);
    const comments: CommentCandidate[] = [];
    for (const video of videos) {
      comments.push(...await getComments(env.YOUTUBE_API_KEY, video));
    }

    const uniqueComments = [...new Map(comments.map((comment) => [comment.commentId, comment])).values()];
    const commentsForAnalysis = uniqueComments.filter((comment) => !isClearlyOutOfScope(comment));
    let evidenceStored = 0;

    for (let offset = 0; offset < commentsForAnalysis.length; offset += GROQ_BATCH_SIZE) {
      const batch = commentsForAnalysis.slice(offset, offset + GROQ_BATCH_SIZE);
      const extractions = await extractBatch(env.GROQ_API_KEY, batch, true);
      for (const extraction of extractions) {
        const comment = batch[extraction.index];
        if (!comment) continue;
        if (await storeExtraction(env.DB, runId, comment, extraction)) evidenceStored += 1;
      }
    }

    await env.DB.prepare(`
      UPDATE collection_runs
      SET completed_at = ?, status = 'completed', records_seen = ?, records_stored = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), uniqueComments.length, evidenceStored, runId).run();

    const summary: CollectionSummary = {
      runId,
      videosScanned: videos.length,
      commentsScanned: uniqueComments.length,
      commentsAnalyzed: commentsForAnalysis.length,
      evidenceStored,
      searchQueries: SEARCH_QUERIES,
      model: GROQ_MODEL,
    };
    console.log(JSON.stringify({ event: "youtube_collection_completed", ...summary }));
    return summary;
  } catch (error) {
    await env.DB.prepare(`
      UPDATE collection_runs
      SET completed_at = ?, status = 'failed', error_summary = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), String(error).slice(0, 1000), runId).run();
    throw error;
  }
}

export async function timingSafeSecretMatch(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(providedDigest);
  const right = new Uint8Array(expectedDigest);
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}
