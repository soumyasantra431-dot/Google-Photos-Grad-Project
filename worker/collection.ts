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
};

export type GoogleSupportCollectionSummary = {
  runId: string;
  postsScanned: number;
  postsAnalyzed: number;
  evidenceStored: number;
  model: string;
};

async function fetchJson<T>(url: URL | string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const errorBody = (await response.text()).slice(0, 500);
    throw new Error(`External API returned ${response.status}: ${errorBody}`);
  }
  return response.json<T>();
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
    reviews.push({
      reviewId: review.reviewId,
      storefront: review.storefront,
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
          },
          required: [
            "index", "relevant", "retrieval_target", "evidence_excerpt", "remembered_clues",
            "forgotten_context", "search_attempt", "failure_stage", "workaround",
            "retrieval_outcome", "confidence",
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
    && typeof item.failure_stage === "string"
    && typeof item.retrieval_outcome === "string"
    && typeof item.confidence === "number";
}

async function extractBatch(apiKey: string, candidates: Array<{ body: string }>): Promise<Extraction[]> {
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
            "Deletion, trash, recovery, backup, upload, sync, missing-file, and storage problems are always irrelevant.",
            "General complaints, feature requests without a retrieval episode, tutorials, praise, and unrelated comments are not relevant.",
            "Do not infer details absent from the source text. evidence_excerpt must be an exact contiguous quote from the source text.",
            "Failure stages: expression = cannot formulate remembered clues; interpretation = system misunderstands clues; evaluation = results are hard to scan or compare; refinement = user cannot recover after poor results; unknown = evidence is insufficient.",
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
  return (parsed.items ?? []).filter(isExtraction);
}

async function executeInChunks(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  for (let index = 0; index < statements.length; index += 50) {
    await db.batch(statements.slice(index, index + 50));
  }
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

  return true;
}

async function storeAppStoreExtraction(
  db: D1Database,
  runId: string,
  review: AppStoreCandidate,
  extraction: Extraction,
): Promise<boolean> {
  if (!extraction.relevant || extraction.confidence < 0.8) return false;
  if (!extraction.retrieval_target || !extraction.evidence_excerpt) return false;
  if (!review.body.toLocaleLowerCase().includes(extraction.evidence_excerpt.toLocaleLowerCase())) return false;

  const identityHash = await sha256Hex(`app-store:${review.storefront}:${review.reviewId}`);
  const sourceId = `src_${identityHash.slice(0, 24)}`;
  const documentId = `doc_${identityHash.slice(0, 24)}`;
  const evidenceId = `ev_${identityHash.slice(0, 24)}`;
  const reviewed = await db.prepare("SELECT is_human_verified FROM evidence_units WHERE id = ?")
    .bind(evidenceId).first<{ is_human_verified: number }>();
  if (reviewed?.is_human_verified === 1) return false;
  const contentHash = await sha256Hex(review.body);
  const canonicalUrl = `https://itunes.apple.com/${review.storefront}/rss/customerreviews/id=${APP_STORE_APP_ID}/json#review-${encodeURIComponent(review.reviewId)}`;
  const now = new Date().toISOString();
  const metadata = JSON.stringify({
    appId: APP_STORE_APP_ID,
    storefront: review.storefront,
    rating: review.rating,
    appVersion: review.appVersion,
    reviewTitle: review.title,
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

  return true;
}

async function storeGoogleSupportExtraction(
  db: D1Database,
  runId: string,
  post: GoogleSupportCandidate,
  extraction: Extraction,
): Promise<boolean> {
  if (!extraction.relevant || extraction.confidence < 0.8) return false;
  if (!extraction.retrieval_target || !extraction.evidence_excerpt) return false;
  if (!post.body.toLocaleLowerCase().includes(extraction.evidence_excerpt.toLocaleLowerCase())) return false;

  const identityHash = await sha256Hex(post.postId === post.threadId
    ? `google-support:${post.threadId}`
    : `google-support:${post.threadId}:reply:${post.postId}`);
  const sourceId = `src_${identityHash.slice(0, 24)}`;
  const documentId = `doc_${identityHash.slice(0, 24)}`;
  const evidenceId = `ev_${identityHash.slice(0, 24)}`;
  const reviewed = await db.prepare("SELECT is_human_verified FROM evidence_units WHERE id = ?")
    .bind(evidenceId).first<{ is_human_verified: number }>();
  if (reviewed?.is_human_verified === 1) return false;
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

  return true;
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

    for (let offset = 0; offset < postsForAnalysis.length; offset += GROQ_BATCH_SIZE) {
      const batch = postsForAnalysis.slice(offset, offset + GROQ_BATCH_SIZE);
      const extractions = await extractBatch(env.GROQ_API_KEY, batch);
      for (const extraction of extractions) {
        const post = batch[extraction.index];
        if (!post) continue;
        if (await storeGoogleSupportExtraction(env.DB, runId, post, extraction)) evidenceStored += 1;
      }
    }

    await env.DB.prepare(`
      UPDATE collection_runs
      SET completed_at = ?, status = 'completed', records_seen = ?, records_stored = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), posts.length, evidenceStored, runId).run();

    const summary: GoogleSupportCollectionSummary = {
      runId, postsScanned: posts.length, postsAnalyzed: postsForAnalysis.length,
      evidenceStored, model: GROQ_MODEL,
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

    for (let offset = 0; offset < reviewsForAnalysis.length; offset += GROQ_BATCH_SIZE) {
      const batch = reviewsForAnalysis.slice(offset, offset + GROQ_BATCH_SIZE);
      const extractions = await extractBatch(env.GROQ_API_KEY, batch);
      for (const extraction of extractions) {
        const review = batch[extraction.index];
        if (!review) continue;
        if (await storeAppStoreExtraction(env.DB, runId, review, extraction)) evidenceStored += 1;
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
      const extractions = await extractBatch(env.GROQ_API_KEY, batch);
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
