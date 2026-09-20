import { readFile } from "node:fs/promises";

const inputPath = process.argv.find((arg) => arg.endsWith(".json"));
if (!inputPath) throw new Error("Pass a curated public-post JSON file");
const posts = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(posts) || posts.length === 0 || posts.length > 25) {
  throw new Error("Expected 1–25 curated public posts");
}

if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(posts.map(({ sourceKind, externalId, canonicalUrl, body }) => ({
    sourceKind, externalId, canonicalUrl, words: body.trim().split(/\s+/).length,
  })), null, 2));
} else {
  const triggerToken = process.env.COLLECTION_TRIGGER_TOKEN;
  if (!triggerToken) throw new Error("COLLECTION_TRIGGER_TOKEN must be provided in the process environment");
  const endpoint = process.env.DISCOVERY_URL ?? "https://google-photos-grad-project.soumyasantra431.workers.dev";
  const response = await fetch(`${endpoint}/api/internal/ingest/curated-public`, {
    method: "POST",
    headers: { Authorization: `Bearer ${triggerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(posts),
    signal: AbortSignal.timeout(120000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Discovery engine returned ${response.status}: ${JSON.stringify(result)}`);
  console.log(JSON.stringify(result.data, null, 2));
}
