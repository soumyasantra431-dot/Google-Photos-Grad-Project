# From evidence to MVP: task and test plan

23 September 2026 · PM decision document · Status: ready to guide prototype build; no usability tests claimed.

## 1. Decision to test

**Business goal → product outcome:** Increase successful retrieval of a remembered photo when the search starts with incomplete memory → the person recognizes and opens the intended photo without needing an exact date or album.

**Chosen behavioral segment:** Current Photos users seeking one known older image from subject, appearance, place, or event clues, whose first search returns unrelated or overly broad results. We do not have evidence to segment by age, device, library size, or subscription tier.

**Problem hypothesis:** The user has a useful partial clue, but the retrieval experience does not consistently turn it into a trustworthy shortlist; if the first attempt fails, the user has little guidance on which remembered clue to try next. Whether the underlying cause is indexing, ranking, or query understanding is unknown.

**Why this and not a general search redesign:** The [research synthesis](2026-09-23-alternative-research-synthesis.md) found 9/20 selected public episodes coded as clue-interpretation failure across three source types. Two of seven survey retrieval episodes had unrelated first results. The adjacent library-access opportunity has five public episodes, all from one source type; forgetting an album is not itself an access defect. Counts guide our *test priority*, not population prevalence.

## 2. Test tasks derived from real episodes

The task *failure pattern* comes from real responses. Any particular image, person, color, or place in the prototype library will be **synthetic** unless a participant explicitly supplies it; these invented details are not quotations or respondent facts.

| Task | Evidence seed | Participant setup | What this diagnoses |
| --- | --- | --- | --- |
| A. Photo of a pet | Survey R01: pet/animal, visual and place clues, unrelated first results, found after multiple attempts | “You know this one photo of a pet is in this library. You remember some visual/setting details, but not its date or album. Find that exact image.” Supply an actual representative target plus similar pet-image distractors. | Can partial subject + visual clues produce a small relevant set? Can a second clue rescue a bad first attempt? |
| B. Trip/person image | Survey R08: trip/person episode; the recalled first query was “Man,” first results unrelated, eventual success after changing path | “You remember a person in a trip photo. Your first thought is ‘Man,’ but you may remember more if asked. Find the exact image.” Use several people/trip distractors. | Does the interaction help elicit a *discriminating* clue instead of merely repeating a broad word? |
| C. Event look-alikes | Survey R07: event clue, plausible matches hard to identify, close alternative instead of exact target | “You can see several event images that look plausible. Find the exact one you have in mind.” Use visually similar event-image distractors. | Competing hypothesis: the result may already be present, but identification is the bottleneck. Do not automatically count this as a clue-understanding failure. |

For each task, the test set must record a unique target image ID, 2–4 clues available to the participant, clues deliberately withheld (such as date/album), and at least 6–8 plausible distractors. The person must not see the target ID before completing the task. The first built prototype uses 27 synthetic images; expanding to 30–50 would add distractor variety, but neither size is enough to claim large-library scalability.

## 3. Narrow MVP hypothesis and scope

**Current-product checkpoint:** [Google's Ask Photos help](https://support.google.com/photos/answer/15318661?hl=en-GB) says it already supports natural-language searches, follow-up questions, and suggestion chips; availability varies by region and eligibility. Therefore, “a chatbot for photos” is **not** a defensible novelty claim. Before final positioning, observe whether target users have Ask Photos, whether they use it for a failed known-photo search, and what remains difficult after its first result. Our prototype tests *explicit recovery from an unhelpful result and visible clue-to-result reasoning*, not the mere existence of conversational search.

**Hypothesis:** After a broad or failed first search, a clue-guided second attempt that asks for one additional remembered detail and makes the clue-to-result match visible will help the user reach the intended photo more often than another unguided query in the same representative library. This must be tested against users' current behavior, including Ask Photos where available.

**Intelligence is needed at two points:** (1) convert ordinary memory language into candidate photo attributes without inventing facts; (2) choose one useful follow-up question when candidates are too broad. Showing and selecting image cards, preserving source/target IDs, counting attempts, and recording outcomes should be deterministic. The model must be allowed to say “not enough information.”

**First prototype should include:** a seeded, non-personal photo library; one free-text “what do you remember?” input; visible result cards; one contextual follow-up clue; updated shortlist; and a way to mark “this is it,” “none of these,” or “I stopped.” It should log only task ID, attempt count, elapsed time, result IDs, and outcome—not participants' private photo contents.

**Explicitly outside first scope:** Google account connection, ingesting a personal Photos library, claims of better underlying Google Photos indexing, social sharing, auto-tagging the whole library, and a fully open-ended chatbot. These are unnecessary for testing the first interaction hypothesis and would add privacy/technical risk.

**Technical reason for representative data:** Google's [Photos API update](https://developers.google.com/photos/support/updates) limits Library API listing/searching to app-created content; the Picker API is for user-selected items, not background search across an entire personal library. The standalone MVP should therefore use a clearly labeled synthetic or licensed corpus, not imply that it can search a participant's whole Google Photos account.

## 4. How to evaluate it quickly

**Baseline proxy:** On the *same* representative library, provide a simple keyword-search interface with image cards and no guided follow-up. This is a controlled prototype baseline, **not** a measurement of the real Google Photos product. Separately record each participant's access to and prior use of classic Search or Ask Photos; if feasible, ask them to show a comparable real-library retrieval attempt without copying private photos into the prototype.

**Pilot:** Ask at least three willing prior survey respondents to complete a 10–15 minute asynchronous test. Because the original form was anonymous and collected no contact information, they must be invited again through the original sharing channel; we cannot honestly claim to have recontacted specific respondents until they opt in. Rotate A/B task order and which interface comes first; do not have a person search for the same target twice. Use task C as a diagnostic check for the rival result-evaluation problem.

**Observe:** What clues they actually enter, what they believe the system understood, which results they inspect, whether the intended image appears, whether they recognize it, how they change course, and where they stop. Follow with three short questions: “What were you remembering?”, “What did you try next and why?”, and “What, if anything, felt misleading?” Do not ask for a generic satisfaction rating in place of task evidence.

**Leading measure:** Correct target opened within two attempts. **Diagnostics:** target in top 5 after first and second attempt; correct target selected when it is visible; time to target; unrelated-card inspection count; whether the follow-up question produced a new discriminating clue; abandonment; and model-added details that the participant never supplied. Report raw counts for this tiny pilot, not percentages as if they were population effects.

**Diagnostic distinction before another feature build (24 September addendum):** A [six-scenario simulated snapshot audit](../simulated-research/2026-09-24-six-scenario-segmentation-audit.md) usefully separates a buried target, a visible but hard-to-select target, and an unknown target. Its fabricated ranks are not results from this prototype. For each *actual* pilot attempt, record the target's rank or absence from the **complete synthetic catalog**, top-five presence after attempt one and two, whether a visible target was chosen, and the number of cards opened. The current app stores only final top-five presence, attempts, elapsed time, selection, and model/fallback state; first-attempt rank and card-open count require observer notes or explicit instrumentation. Do not equate “not in the first ten shown” with “not in the library.”

**Actual keyword-baseline preflight:** Running the current task seed queries against the current 27-image catalog on 24 September placed the pet target at rank 6 (`dog`), trip target at rank 4 (`man`), and event target at rank 5 (`birthday`). These are deterministic code outputs, not Groq or participant outcomes. The trip and event targets are already in the initial top five; therefore the current task pack cannot by itself demonstrate recovery of a deeply buried target. Before the pilot, retain one visible-target task for recognition and create or revise one buried-target task with a real catalog target ID and plausible distractors. Do not use the attachment's invented rank 18/24 as a baseline.

**Completed controlled-task revision:** A fourth café task now uses existing synthetic image `T05`. Its fixed first keyword query `trip` ranks the target 14/27, below the initial 12-card view; `trip friends seaside cafe` ranks it 1/27. The fixed query and synthetic target make this a *mechanism test*, not observed search formulation. The app reveals target rank after every attempt only when the task ends and optionally stores derived rank history without storing raw query text. Guided Groq positions must be measured separately; they are not assumed to match keyword positions.

Test one mechanism at a time. The three proposed changes in the simulated attachment (guided follow-up, OCR tokens, thumbnail snippets) should **not** be bundled into a single 30-task experiment before the real task bottleneck is known. The attachment's percentage targets are uncalibrated because there is no measured baseline. Choose an intervention only after the retrieval-versus-recognition diagnosis, and treat the basic keyword mode as a prototype control rather than Google Photos itself.

**Decision rule for the next iteration:**

- If target-in-top-5 improves but users still choose the wrong image, prioritize result-card differentiation and evaluation cues.
- If users provide good clues yet the target stays absent, inspect retrieval/indexing and ranking; do not add more conversational prompts.
- If the model asks irrelevant or leading questions, constrain it to known clue categories and permit “skip.”
- If the guided flow adds time without improving correct selection, simplify or drop the extra step.

## 5. Next build handoff

Build the representative image corpus and a standalone prototype around tasks A–C. Use a synthetic or appropriately licensed library, not private survey respondents' photos. The prototype should expose the baseline and guided experiences so the same task pack can be run with real users. After testing, revise the problem definition if task C or library-access failures dominate; the opportunity choice is deliberately falsifiable.

The graduation brief's 5–6 interviews and return-to-3-users requirement remain unmet until actual participants take part. This document specifies an efficient alternative research route and the subsequent usability test; it does not relabel simulated walkthroughs as interviews.
