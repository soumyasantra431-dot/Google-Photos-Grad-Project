const APP_ID = "962194608";
const STOREFRONTS = ["us", "gb", "in"];
const PAGES_PER_STOREFRONT = 10;
const destination = process.env.DISCOVERY_ENGINE_URL
  ?? "https://google-photos-grad-project.soumyasantra431.workers.dev";
const triggerToken = process.env.COLLECTION_TRIGGER_TOKEN;
const dryRun = process.argv.includes("--dry-run");
const startBatchArg = process.argv.find((arg) => arg.startsWith("--start-batch="));
const startBatch = startBatchArg ? Number(startBatchArg.split("=")[1]) : 1;
if (!Number.isInteger(startBatch) || startBatch < 1) throw new Error("--start-batch must be a positive integer");

if (!dryRun && !triggerToken) {
  throw new Error("COLLECTION_TRIGGER_TOKEN must be provided in the process environment");
}

const reviews = [];
const failures = [];
for (const storefront of STOREFRONTS) {
  for (let page = 1; page <= PAGES_PER_STOREFRONT; page++) {
    const url = `https://itunes.apple.com/${storefront}/rss/customerreviews/page=${page}/id=${APP_ID}/sortby=mostrecent/json`;
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`public feed returned ${response.status}`);
      const payload = await response.json();
      const entries = payload.feed?.entry ?? [];
      if (!Array.isArray(entries) || entries.length === 0) break;

      for (const entry of entries) {
        const reviewId = entry.id?.label;
        const body = entry.content?.label?.trim();
        if (!reviewId || !body || body.length < 12) continue;
        const rating = Number(entry["im:rating"]?.label);
        reviews.push({
          reviewId,
          storefront,
          feedUrl: url,
          title: entry.title?.label?.trim() || "Untitled App Store review",
          body,
          publishedAt: entry.updated?.label ?? null,
          rating: Number.isFinite(rating) ? rating : null,
          appVersion: entry["im:version"]?.label ?? null,
        });
      }
    } catch (error) {
      failures.push({ storefront, page, reason: String(error) });
      break;
    }
  }
}

const uniqueReviews = [...new Map(reviews.map((review) => [`${review.storefront}:${review.reviewId}`, review])).values()];
if (dryRun) {
  console.log(JSON.stringify({ fetchedReviews: reviews.length, uniqueReviews: uniqueReviews.length, failures }, null, 2));
} else {
  const ingestions = [];
  for (let offset = 0; offset < uniqueReviews.length; offset += 50) {
    if (offset / 50 + 1 < startBatch) continue;
    const response = await fetch(`${destination}/api/internal/ingest/app-store`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${triggerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(uniqueReviews.slice(offset, offset + 50)),
      signal: AbortSignal.timeout(120000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(`Discovery engine batch ${offset / 50 + 1} returned ${response.status}: ${JSON.stringify(result)}`);
    ingestions.push(result.data);
  }
  console.log(JSON.stringify({ fetchedReviews: reviews.length, uniqueReviews: uniqueReviews.length, failures, ingestions }, null, 2));
}
