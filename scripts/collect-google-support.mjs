// A bounded, researcher-curated set of public Google Photos community threads.
// Search results are discovery leads, not evidence; the source page is fetched again here.
const threadIds = [
  "373711674", // classic search, remembered object clues
  "332668136", // remembered person, face grouping
  "215192767", // search result to surrounding day
  "308953776", // basic search terms, no result
  "333561993", // no results despite known dates and people
  "299038372", // similar-photo request
  "7790344",   // finding an old zoo photo
  "53479685",  // noisy visual search results
  "309151160", // exact-word video search
  "253259985", // remembered memory card, cannot navigate back
  "457424484", // browsing a long library
  "132485024", // shared-album search
];
const replySeeds = [
  { threadId: "299038372", messageId: "299568087" }, // daughter at beach, same sweater
  { threadId: "55525345", messageId: "55543494" },   // unnamed bathroom photo, searched folders
  { threadId: "332668136", messageId: "333104606" }, // name search failed because second face was not indexed
  { threadId: "5343478", messageId: "25656087" },   // remembered location, explicitly forgot when
];

const endpoint = process.env.DISCOVERY_URL ?? "https://google-photos-grad-project.soumyasantra431.workers.dev";
const triggerToken = process.env.COLLECTION_TRIGGER_TOKEN;
const dryRun = process.argv.includes("--dry-run");
const repliesOnly = process.argv.includes("--replies-only");

if (!dryRun && !triggerToken) {
  throw new Error("COLLECTION_TRIGGER_TOKEN must be provided in the process environment");
}

function decodePageText(value) {
  return value
    .replace(/\\\\/g, "\\")
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractOriginalPost(html, threadId) {
  const anchor = html.indexOf(`[[${threadId},`);
  if (anchor < 0) throw new Error("thread identifier not found in public page");

  const field = /\\x22,(?:\d+|null),null,\[[^\r\n]{1,100}?\],\\x22/.exec(html.slice(anchor, anchor + 1500));
  if (!field) throw new Error("original-post field not found");
  const titleEnd = anchor + field.index;

  const bodyStart = titleEnd + field[0].length;
  const bodyEnd = html.indexOf("\\x22,\\x22en\\x22", bodyStart);
  if (bodyEnd < 0 || bodyEnd > bodyStart + 15000) throw new Error("original-post body boundary not found");

  const pageTitle = /<title>([^<]+)<\/title>/i.exec(html)?.[1];
  if (!pageTitle?.includes("Google Photos Community")) throw new Error("unexpected support-page title");
  const title = decodePageText(pageTitle.replace(/\s*-\s*Google Photos Community\s*$/, ""));
  const body = decodePageText(html.slice(bodyStart, bodyEnd));
  if (!title || body.length < 12 || body.length > 4000) throw new Error("original-post text outside expected bounds");
  return { threadId, postId: threadId, title, body, publishedAt: null };
}

function extractReply(html, threadId, messageId) {
  const anchor = html.indexOf(`[${messageId},\\x22`);
  if (anchor < 0) throw new Error("reply identifier not found in public page");
  if (!html.slice(anchor, anchor + 120).includes(`,${threadId},`)) {
    throw new Error("reply is not linked to the expected thread");
  }
  const field = /\],null,\d+,\\x22/.exec(html.slice(anchor, anchor + 300));
  if (!field) throw new Error("reply-body field not found");
  const bodyStart = anchor + field.index + field[0].length;
  const bodyEnd = html.indexOf("\\x22,[", bodyStart);
  if (bodyEnd < 0 || bodyEnd > bodyStart + 15000) throw new Error("reply-body boundary not found");
  const pageTitle = /<title>([^<]+)<\/title>/i.exec(html)?.[1];
  if (!pageTitle?.includes("Google Photos Community")) throw new Error("unexpected support-page title");
  const title = decodePageText(pageTitle.replace(/\s*-\s*Google Photos Community\s*$/, ""));
  const body = decodePageText(html.slice(bodyStart, bodyEnd));
  if (!title || body.length < 12 || body.length > 4000) throw new Error("reply text outside expected bounds");
  return { threadId, postId: messageId, title, body, publishedAt: null };
}

const posts = [];
const failures = [];
const targets = [
  ...(!repliesOnly ? threadIds.map((threadId) => ({ threadId })) : []),
  ...replySeeds,
];
for (const { threadId, messageId } of targets) {
  try {
    const url = `https://support.google.com/photos/thread/${threadId}?hl=en${messageId ? `&msgid=${messageId}` : ""}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`public page returned ${response.status}`);
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > 4_000_000) throw new Error("public page exceeds size limit");
    const html = await response.text();
    if (html.length > 4_000_000) throw new Error("public page exceeds size limit");
    posts.push(messageId ? extractReply(html, threadId, messageId) : extractOriginalPost(html, threadId));
  } catch (error) {
    failures.push({ threadId, messageId: messageId ?? null, reason: String(error) });
  }
}

if (dryRun) {
  console.log(JSON.stringify({ extracted: posts.map(({ threadId, postId, title, body }) => ({ threadId, postId, title, bodyLength: body.length, preview: body.slice(0, 120) })), failures }, null, 2));
} else {
  if (posts.length === 0) throw new Error("No source posts could be verified; nothing was sent");
  const response = await fetch(`${endpoint}/api/internal/ingest/google-support`, {
    method: "POST",
    headers: { Authorization: `Bearer ${triggerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(posts),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Discovery engine returned ${response.status}: ${JSON.stringify(result)}`);
  console.log(JSON.stringify({ fetchedPosts: posts.length, failedFetches: failures, ingestion: result.data }, null, 2));
}
