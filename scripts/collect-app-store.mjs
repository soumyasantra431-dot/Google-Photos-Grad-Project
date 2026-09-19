const APP_ID = "962194608";
const STOREFRONTS = ["us", "gb", "in"];
const destination = process.env.DISCOVERY_ENGINE_URL
  ?? "https://google-photos-grad-project.soumyasantra431.workers.dev";
const triggerToken = process.env.COLLECTION_TRIGGER_TOKEN;

if (!triggerToken) {
  throw new Error("COLLECTION_TRIGGER_TOKEN must be provided in the process environment");
}

const reviews = [];
for (const storefront of STOREFRONTS) {
  const url = `https://itunes.apple.com/${storefront}/rss/customerreviews/page=1/id=${APP_ID}/sortby=mostrecent/json`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Apple feed ${storefront} returned ${response.status}`);
  const payload = await response.json();

  for (const entry of payload.feed?.entry ?? []) {
    const reviewId = entry.id?.label;
    const body = entry.content?.label?.trim();
    if (!reviewId || !body || body.length < 12) continue;
    const rating = Number(entry["im:rating"]?.label);
    reviews.push({
      reviewId,
      storefront,
      title: entry.title?.label?.trim() || "Untitled App Store review",
      body,
      publishedAt: entry.updated?.label ?? null,
      rating: Number.isFinite(rating) ? rating : null,
      appVersion: entry["im:version"]?.label ?? null,
    });
  }
}

const response = await fetch(`${destination}/api/internal/ingest/app-store`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${triggerToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(reviews),
});

const result = await response.json();
if (!response.ok) throw new Error(`Discovery engine returned ${response.status}: ${JSON.stringify(result)}`);
console.log(JSON.stringify({ fetchedReviews: reviews.length, ingestion: result.data }, null, 2));
