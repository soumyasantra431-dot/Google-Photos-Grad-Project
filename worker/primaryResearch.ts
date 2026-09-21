import survey from "../research/primary-research/google-photos-survey-2026-09-21.json" with { type: "json" };

type SurveyResponse = (typeof survey.responses)[number];

const labels: Record<string, string> = {
  person_or_pet: "Person or pet", visual_detail: "Visual detail", place: "Place or setting",
  event: "Event or activity", rough_time: "Rough time", other: "Something else",
  date: "Exact date or year", album_or_folder: "Album or folder", account_owner: "Who stored it",
  person_place_or_category: "Person, place, or category search",
  long_description_or_ask_photos: "Long description or Ask Photos", typed_short_query: "Short typed query",
  timeline_browse: "Timeline browsing", album_or_folder_browse: "Album or folder browsing",
  exact_photo: "Exact photo appeared", unrelated_results: "Many unrelated results",
  likely_matches_uncertain: "Likely matches, but hard to identify",
  change_words: "Changed words or added a clue", scroll_more: "Scrolled more",
  check_library_locations: "Checked albums, folders, archive, or another account",
  search_person_place_date: "Searched by person, place, date, or category",
  first_attempt_worked: "First attempt worked", found_quickly: "Found exact photo quickly",
  found_after_attempts: "Found after several attempts", close_alternative: "Found a close alternative",
  stopped_may_retry: "Stopped and may try later", not_applicable: "Not sure or not applicable",
  people: "Person or family", place_or_event: "Trip, place, or event", animal: "Pet or animal",
  object: "Object or item", unknown: "Other or not sure",
};

function countCodes(responses: SurveyResponse[], key: "remembered" | "forgotten" | "nextActions") {
  const counts: Record<string, number> = {};
  for (const response of responses) {
    for (const code of new Set(response[key])) counts[code] = (counts[code] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([code, count]) => ({ code, label: labels[code] ?? code.replaceAll("_", " "), count }));
}

function countSingle(responses: SurveyResponse[], key: "targetType" | "firstMethod" | "firstResult" | "finalOutcome") {
  const counts: Record<string, number> = {};
  for (const response of responses) {
    const code = response[key];
    if (code) counts[code] = (counts[code] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([code, count]) => ({ code, label: labels[code] ?? code.replaceAll("_", " "), count }));
}

export function buildPrimaryResearchSummary() {
  const allResponses = survey.responses;
  const currentUsers = allResponses.filter((response) => response.currentUse !== "no");
  const episodes = allResponses.filter((response) => response.recentRetrieval !== "none");
  const effortEpisodes = episodes.filter((response) => response.recentRetrieval === "effort_or_not_found");
  return {
    study: {
      title: survey.title,
      instrumentUrl: survey.instrumentUrl,
      sampleType: survey.sampleType,
      privacyNote: survey.privacyNote,
      responseCount: allResponses.length,
      currentUserCount: currentUsers.length,
      recentEpisodeCount: episodes.length,
      effortOrFailureCount: effortEpisodes.length,
      caveat: "This small convenience sample is directional. Several responses are incomplete or internally inconsistent, so structured counts are shown separately from qualitative interpretation.",
    },
    patterns: {
      targetTypes: countSingle(episodes, "targetType"),
      remembered: countCodes(episodes, "remembered"),
      forgotten: countCodes(episodes, "forgotten"),
      firstMethods: countSingle(episodes, "firstMethod"),
      firstResults: countSingle(episodes, "firstResult"),
      nextActions: countCodes(episodes, "nextActions"),
      finalOutcomes: countSingle(episodes, "finalOutcome"),
    },
    episodes: episodes.map((response) => ({
      id: response.id,
      targetType: response.targetType ? labels[response.targetType] ?? response.targetType : "Not stated",
      targetSummary: response.targetSummary,
      remembered: response.remembered.map((code) => labels[code] ?? code),
      forgotten: response.forgotten.map((code) => labels[code] ?? code),
      firstMethod: response.firstMethod ? labels[response.firstMethod] ?? response.firstMethod : "Not stated",
      exactQuery: response.exactQuery,
      firstResult: response.firstResult ? labels[response.firstResult] ?? response.firstResult : "Not stated",
      nextActions: response.nextActions.map((code) => labels[code] ?? code),
      finalOutcome: response.finalOutcome ? labels[response.finalOutcome] ?? response.finalOutcome : "Not stated",
      qualityFlags: response.qualityFlags,
    })),
  };
}
