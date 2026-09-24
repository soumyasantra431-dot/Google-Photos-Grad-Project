# Opportunity validation: segment first, then choose one retrieval failure

24 September 2026. **Decision: provisional; no observed user tasks or return-user MVP tests yet.** This memo audits the proposed segmentation framework against the real evidence available now. It does not treat synthetic personas or builder-run prototype tasks as user research.

## Evidence and unit of analysis

- [20 admitted, human-reviewed public retrieval stories](https://google-photos-grad-project.soumyasantra431.workers.dev/api/evidence?limit=50), purposively selected from Google Photos Community (9), Reddit (9), and forums (2). The [opportunity map](https://google-photos-grad-project.soumyasantra431.workers.dev/api/opportunity-map) codes 9 clue-to-candidate, 5 library/access, 4 clue-expression, 1 result-evaluation, and 1 refinement story. These are **story counts in this selected corpus**, not segment sizes, population prevalence, or proof of the technical cause.
- [Eight anonymized survey responses](google-photos-survey-2026-09-21.json), of which seven report a recent retrieval attempt. R03 is screened out. This is a friends-and-family convenience sample, separate from public posts. R01 and R08 report unrelated first results; R07 reports plausible results and a close alternative; four report the exact photo in their first results. Six of seven lack a retained exact first-query string. R02, R04, R05, and R06 have sequence/outcome quality flags, so their answers are not clean failure reconstructions.
- [Six supplied simulated scenarios](../simulated-research/2026-09-24-six-scenario-segmentation-audit.md) are excluded from counts and segment selection. The 27-image Recall Lab is a synthetic interaction test, not observed Google Photos behavior.

The **retrieval task**, not a person's demographic label, is the unit to segment. The same person can use a query for one task and browse an album for another. We need to know whether the target was a specific known photo and whether the result was opened and confirmed.

## Audit of the proposed five groups

1. **Travel/place-heavy** and **family/event archivist** are useful *recruitment and task-content strata*, but not yet distinct behavioral segments. Either person could search by text, browse a timeline, revisit Memories, or inspect look-alikes. Keep both as scenarios when testing a chosen mechanism.
2. **Professional photoshoot user** is unsupported by the seven eligible survey episodes and the current public opportunity comparison. SIM-P03 is fabricated, so this cannot be prioritized as a real segment. A professional workflow may also rely on a catalog outside Google Photos. Park it until real tasks justify inclusion.
3. **Utility/document seeker** is a legitimate candidate situation. The [passport/Global Entry account](https://www.reddit.com/r/googlephotos/comments/1fvq7hr/why_did_they_ruin_google_photos_search/) shows document-name searches returning irrelevant photos. Survey R02 is only an unspecified object, **not** a confirmed receipt, label, or OCR miss. Do not infer an OCR defect from the current evidence.
4. **Small-library user** is a useful negative/control case, not a high-friction target segment. No survey response recorded library size; SIM-P05 cannot establish that small libraries are easy.

## Four candidate *retrieval-task pathways*

- **A. Content-search-first personal-photo retriever.** Has one known photo in mind; starts with a subject, person, event, place, or visual clue rather than a reliable date/album. R01 and R08 are the cleanest survey signals of an unhelpful first result, though their targets and search sequences are incomplete. The public clue-to-candidate stories include a [tattoo-on-arm description](https://support.google.com/photos/thread/373711674?hl=en), [pet/object searches followed by timeline scrolling](https://www.reddit.com/r/googlephotos/comments/1px47il/googleif_youre_listening_your_photos_app_is_a/), and [a cat search with many reformulations](https://www.reddit.com/r/googlephotos/comments/1jbiao1/search_function_no_longer_optimal/). The 9/20 mechanism count includes other task types and **must not** be relabeled as nine segment-A users.
- **B. Browse-with-anchor retriever.** Starts in a timeline, known album, or event grouping rather than with a query. R06 reportedly found a scenery photo by timeline; R07 inspected plausible event results but chose a close alternative. A [1,400-photo album account](https://www.reddit.com/r/googlephotos/comments/1vcu3cs/finding_specific_photo_in_a_large_album/) shows a specific image hard to isolate even when the containing album is known. This pathway may require result recognition or within-album navigation, not better search wording.
- **C. Functional-artifact seeker.** Wants a specific receipt, screenshot, label, document, or similar item for a practical job. The public passport example supports the situation, but no survey task confirms it and no current episode proves OCR failure. Keep as a candidate, not a selected segment.
- **D. Resurfaced-photo returner.** Recently saw the image in Memories or a connected display but cannot reopen it; e.g. a [Memory image](https://support.google.com/photos/thread/444348665?hl=en) or [Google Hub photos](https://support.google.com/photos/thread/407763097?hl=en). The access cluster has 5/20 public stories, all Google support, and no survey match. This may be a cross-surface navigation problem rather than vague-query search.

Pathways are hypotheses, not mutually exclusive permanent personas. Content type (travel, family, document), first strategy (search, browse, resurface), and failure stage should remain separate coding fields.

## Provisional segment and single problem choice

**Choose A for the first validation round**, narrowed to current Google Photos users who start a *specific older personal-photo* task with a content/context clue and without a reliable date or album. This is not a claim that A is largest: its stronger case is cross-source examples of clue-to-candidate friction, two real survey reports of unrelated first results, and direct relevance to the business metric of opening the exact remembered photo. B's recognition problem is a serious rival; C and D remain distinct alternatives.

**Choose one product-level failure to investigate:** after an initial content/context query, the first result set is reportedly unrelated or too broad to make the known target findable. This is a **candidate-relevance/visibility hypothesis**. The present evidence does **not** tell us whether the photo was absent from the library, unindexed, poorly ranked, or visible but overlooked. The last possibility would redirect us to a *different* problem, result evaluation. R01/R08 support weak first results; R07 and the album case keep recognition as a serious rival.

The [Recall Lab](../mvp/recall-lab-implementation.md) already exists. It tests whether an additional remembered clue can improve a synthetic target's rank and help selection. That is one **solution hypothesis**, not evidence that real Photos users need another follow-up prompt. Google's current [Ask Photos help](https://support.google.com/photos/answer/15318661?co=GENIE.Platform%3DAndroid&hl=en-GB) already describes descriptive search and follow-up questions; availability and behavior vary. Any proposed guided-refinement feature must be compared with the participant's actual current Photos experience, not just with the Lab's keyword baseline.

## What to measure, and what AI can do

For *real retrieval tasks*, record confirmed exact-photo success, target visibility in the first useful result set (if safely observable), query/action sequence, result-inspection effort, time-to-confirm, and the workaround after the first miss. Satisfaction is a secondary debrief question, not a substitute for confirmed retrieval. Only measure top-5 rank where the target and result order are both known; the synthetic Lab's top-5 measure cannot be transferred to a participant's private library by assumption. At this sample size, report task-level cases and contradictions, not segment percentages, heatmaps, or statistically meaningful A/B effects.

AI may extract and cluster *genuine* consented survey/interview notes, compare them with source-linked public stories, and flag missing fields or contradictory cases for human review. It must not send personalized surveys on the researcher's behalf without recruitment/consent, invent segment responses, or call an AI simulation a user task. Simulations are useful only for checking that the prototype and instrumentation behave as designed.

## Decision rules for the next real retrieval tasks

For each safe, consented task, record: intended target, why now, all remembered and forgotten clues **before** search, initial surface and exact query, whether the exact target appeared in the initial visible set, where it ranked if known, whether the person recognized it, each subsequent clue/action, workaround, elapsed time, and confirmed outcome. Mark `unknown` rather than infer a stage from a complaint. Include both successes and failures.

- **Target absent after a useful clue:** focus on candidate availability, indexing, or ranking. A prompt-only MVP may be inadequate.
- **Target visible but not selected:** prioritize recognition/evaluation instead of candidate retrieval.
- **Target becomes visible and is confirmed after one user-supplied clue:** guided recovery is promising, but compare with Ask Photos and classic Search on the same task.
- **User starts from a known album or recently surfaced card:** reassess B or D rather than forcing the task into A.
- **Current Photos already completes the task quickly:** keep this as a counterexample and narrow the opportunity.

The graduation brief still calls for **5–6 real interviews** and **at least three return-user MVP tests**. No users are available for those sessions at present, so this memo completes a *directional evidence synthesis and provisional decision*, not validation of opportunity size, technical root cause, or MVP impact. AI may code and compare genuine responses; it cannot send unconsented surveys, fabricate participants, or turn simulations into measured segment outcomes. Do not run A/B tests or segment-level heatmaps until there are real task records with known targets and exposure to both conditions.
