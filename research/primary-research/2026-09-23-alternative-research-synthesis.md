# Primary-research alternative: choosing a retrieval problem

23 September 2026 · Decision status: provisional · Evidence: 8 anonymous Google Form responses (7 recent retrieval attempts) plus 20 human-reviewed public retrieval stories.

This is a rapid PM synthesis of *reported retrieval episodes*, not a replacement for observing a user search their own library. The [survey instrument](https://docs.google.com/forms/d/e/1FAIpQLSeSDsH9-vX1iG4PAUSFG52rkDHjZ9GfO_Xx_-j13iOVo68ZQA/viewform) and [anonymized response coding](google-photos-survey-2026-09-21.json) are separate from the [public-evidence opportunity map](https://google-photos-grad-project.soumyasantra431.workers.dev/api/opportunity-map). The form's live response count was checked on 23 September: still 8. Public stories are selected complaints, not a representative sample; their percentages must not be combined with survey percentages.

## What the real respondents reported

- **The target was specific, even when the query was not.** The seven episodes concerned a pet, an object, family/friends, scenery, an event, or a trip image. Four remembered an event and four remembered a place/setting; three remembered a person/pet and two a visual detail. These are multi-select counts, not mutually exclusive segments.
- **They often lacked the metadata used for fallback browsing.** Five of seven did not remember the album/folder; three did not remember an exact date/year; three did not remember an exact place. Remembering an approximate setting while forgetting the exact place is possible, but the survey did not probe the distinction.
- **The first attempt was not uniformly broken.** Four reported the exact photo appearing, two reported many unrelated results, and one saw plausible results but could not identify the right one. The two unrelated-result cases were R01 (animal photo, later found after attempts) and R08 (trip/person photo, query “Man,” later found quickly). R07 saw plausible candidates but found only a close alternative.
- **When people continued, they often left the search path.** Four of seven selected checking albums, folders, archive, or another account; three scrolled more; two changed words or added a clue. These choices include respondents whose first attempt reportedly worked, so they cannot all be treated as confirmed reactions to failure.
- **Exact search language is a gap in this instrument.** Five supplied a free-text answer; only “Man” and “Date” resemble query words, and neither gives enough context to reconstruct a reliable query-formulation pattern.

Responses R02, R04, R05, and R06 have sequence or outcome inconsistencies flagged in the coded data. Their structured choices remain in the descriptive counts; they are not used as clean proof of a failure mechanism. R03 was screened out because the respondent does not currently use Photos and reported no recent retrieval episode.

## Compare the opportunities before choosing

| Retrieval breakdown | Public stories, selected corpus | Survey signal | PM read |
| --- | ---: | --- | --- |
| Photos misses or misreads a useful clue | 9/20, across forum, Reddit, and Google support; 6 unresolved | R01 and R08 first saw unrelated results | Best-supported *search-journey* candidate, though the survey cannot distinguish indexing from ranking or query interpretation. |
| A remembered clue cannot be expressed | 4/20, across three source types | No respondent selected “words that describe it well” as forgotten; exact query data sparse | Real opportunity, but the current survey does not establish it as the main bottleneck. |
| The right result is hard to recognize | 1/20 | R07 saw likely matches, then settled for a close alternative | Potentially painful, but limited evidence so far. |
| Recovery after a bad first search is weak | 1/20 | R01 scrolled and checked library locations; R08 switched to a person/place/date search | Likely a compounding behavior, not yet proven as the initiating failure. |
| A known photo is hard to reopen across surfaces | 5/20, all Google support | 5/7 forgot album/folder, 4/7 checked library locations | Serious alternative, but forgetting an album is **not** proof of an access defect. Public evidence is concentrated in one source. |

The public-story examples are linked directly in the [opportunity map](https://google-photos-grad-project.soumyasantra431.workers.dev/api/opportunity-map). Particularly diagnostic examples are the [yellow sticky note / tattoo description](https://support.google.com/photos/thread/373711674?hl=en), the [dog and BBQ searches falling back to date scrolling](https://www.reddit.com/r/googlephotos/comments/1px47il/googleif_youre_listening_your_photos_app_is_a/), and the [photo seen in an album but hard to isolate](https://www.reddit.com/r/googlephotos/comments/1vcu3cs/finding_specific_photo_in_a_large_album/). Source claims describe those authors' experiences only.

## Provisional product decision

**Target behavioral segment:** Current Google Photos users trying to retrieve **one known older photo** from a partial memory of its subject, appearance, event, or setting, without a reliable date or album, whose first attempt produces unrelated or overly broad results. This is a task-based segment, not a demographic or library-size segment; the survey did not measure library size.

**Retrieval scenario:** The user remembers enough to recognize the photo if shown it, but not the metadata needed to navigate directly to it. They try a broad content/context search, inspect results, then guess another query or browse the timeline/library.

**Problem definition:** When a person supplies a meaningful but incomplete clue for one known older photo, Photos sometimes fails to produce a small, trustworthy candidate set. Because the person also lacks the exact date or album, a weak first result forces manual scanning or repeated guessing. This is more precise than “old photos are hard to search.”

**Root-cause hypothesis, not technical finding:** The retrieval journey does not reliably turn partial remembered clues into discriminating candidates, nor reveal which clue failed. We do **not** yet know whether the underlying cause is indexing, ranking, query interpretation, absent metadata, or a missing cross-surface path.

**Why this candidate wins for now:** It has the broadest cross-source public signal (9 selected stories, three source types), two survey episodes independently report irrelevant first results, and failure is directly upstream of the business goal. The library-access opportunity remains a serious alternative, but its current public evidence is narrower and the survey's missing-album answer alone does not establish access failure. No prevalence or causal effect is inferred from these counts.

**Existing workarounds:** Scroll more; search by person, place, date, or category; change wording; check albums, archive, folders, or another account. Public stories also describe reverting to date-based timeline browsing when object searches fail. These actions consume time precisely because the remembered date/album may be weak.

**Intended product outcome:** In a known-photo task where initial memory is incomplete, the wanted photo becomes recognizable in the first useful shortlist—or in a clearly guided next attempt—without requiring the exact date or album. This is a proposed outcome, not a measured improvement.

**User and business value:** The user can show, reuse, or revisit the intended image in the moment. For Photos, dependable re-access reinforces the value of keeping years of memories in one library and trust in the product's intelligence. The business link is a hypothesis to test, not a quantified retention claim.

## Fast next step before designing the MVP

Use the existing episodes as **retrieval-task seeds**, not as invented interview transcripts: (1) a pet photo with visual/place clues and irrelevant first results (R01), (2) a trip/person photo initially searched as “Man” (R08), and (3) an event photo with plausible-but-indistinguishable matches (R07). Prepare a consented representative photo set or synthetic library, record the intended target and available clues, and test whether a guided second attempt improves target-in-shortlist and correct-photo selection versus the current-style first query. A simulated walkthrough can expose design assumptions, but it must be labeled simulated and not counted as another participant.

The original graduation brief explicitly asks for 5–6 user interviews and three return-user MVP tests. This rapid alternative supports a **provisional** problem choice and test design; it does not claim those research deliverables have been completed.
