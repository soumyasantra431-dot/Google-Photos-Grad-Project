# Photo Recall Lab MVP — implementation and test boundaries

Built 23 September 2026. Public route: `/recall-lab` on the same Worker as the discovery engine. This is an **unofficial standalone concept**, not a Google Photos integration.

## What a tester can do

Choose one of three evidence-seeded tasks, search a 27-image synthetic library, add a remembered clue, inspect ranked photo cards, choose the intended image or stop, and see their result. The task patterns come from anonymous survey R01 (pet, unrelated first results), R08 (trip/person, broad “Man” query), and R07 (event, hard-to-identify candidates). Every person, pet, setting, and visual detail in the prototype images was generated for testing; none is respondent data.

The tester can choose **guided** or **basic keyword** mode before the first query. Guided mode sends only the typed clue and synthetic catalog captions to Groq's `openai/gpt-oss-20b` model through the Worker. The model ranks valid catalog IDs; the Worker validates IDs, removes duplicates, and falls back to deterministic keyword ranking if the model fails. A bounded, task-specific follow-up asks for one more remembered detail. The basic mode uses deterministic word overlap on the same catalog. We show the actual model/fallback state in the UI, so a fallback is never silently presented as AI.

The intended task photo ID stays on the Worker. The model does not receive it. The public catalog contains synthetic photo descriptions and the task scenario, but not the answer key. A participant's own personal Photos library is never accessed.

## Measures available now

The completion screen shows correct-photo selection, attempts, elapsed time, and whether the intended photo appeared in the last top five. Testers may **optionally** submit an anonymous record containing task ID, mode, attempts, elapsed time, selected synthetic photo ID, correctness, top-five presence, and whether Groq or fallback ran. No name, email, personal image, or raw search text is saved. Results are exploratory pilot records; they must not be called user-testing findings until people outside the builder complete tasks.

## Validity and risk limits

- The scripted clues are richer than many real partial memories. This prototype evaluates interaction feasibility, not true long-term memory retrieval or improvement over Google Photos.
- The catalog has 27 images, not thousands. Search speed or ranking quality here cannot establish large-library performance.
- The basic mode is a controlled proxy, not classic Google Photos Search. [Ask Photos](https://support.google.com/photos/answer/15318661?hl=en-GB) already supports natural-language search and follow-ups. A real-product observation remains necessary before claiming differentiated value.
- Caption-based AI ranking cannot prove visual understanding or fix missing indexes. Model failure is visible and uses a keyword fallback.
- The public LLM route accepts only a selected synthetic task and at most 160 characters, and has a Worker rate-limit binding. The global limiter is not an exact usage cap; monitor if usage grows.
- Google’s [Photos API update](https://developers.google.com/photos/support/updates) prevents a standalone third-party prototype from searching an entire personal Photos library through the Library API. The synthetic corpus keeps the prototype testable without implying such access.

## Synthetic image provenance

The three image contact sheets were generated with the built-in image-generation tool, one prompt per asset, and copied into `public/recall-lab/`. Each is a fixed 3×3 grid. The app uses CSS cell positioning to display the nine photos separately; it does not alter the source images. Prompt subjects, in cell order:

- `pets-sheet.png`: retriever on blue blanket; retriever on beach with red collar; retriever on red sofa; black kitchen cat; calico cat/yellow chair; brown dog/garden gate; brown dog/yellow collar/lake; white dog/tennis ball; puppy/car seat.
- `trips-sheet.png`: man/mountain lookout; woman/blue beach boat; man/red beach boat; man/yellow shirt/blue beach boat; friends/seaside cafe; man/blue car; woman/market umbrellas; man/river boat; woman/beach sunset.
- `events-sheet.png`: chocolate cake/gold balloons; white cake/silver balloons; friends toasting; child/candles/gold balloons; family/white cake/silver balloons; outdoor picnic birthday; chocolate cake/silver balloons; family/small blue cake/silver balloons; family/blue cake/gold balloons.

All prompts specified photorealistic candid snapshots, a fixed 3×3 grid with white gutters, and no text or logos. The generated cells were visually inspected before use. These assets should never be described as user-submitted photos.

## Next validation step

Recruit at least three willing users (ideally respondents who opt in again through the original sharing channel), give each a short asynchronous task set with rotated mode/task order, and collect both task outcomes and the three short follow-up questions in the [test plan](../primary-research/2026-09-23-mvp-task-and-test-plan.md). Do not describe simulated task completion by the builder as a real user test. Revise the product direction if real-world observation shows Ask Photos already resolves the target failure or if the event task reveals result evaluation to be the larger bottleneck.
