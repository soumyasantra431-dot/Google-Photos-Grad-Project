# Segmentation audit of six simulated retrieval scenarios

24 September 2026 · Input: P01–P06 supplied as **simulated** interview answers in chat. These are scenario tests for the PM taxonomy and interview guide, **not six user interviews, real product observations, or additional evidence units**. Do not add them to public or survey counts, calculate percentages from them, or quote them as respondents in the deck.

## PM verdict: the names are personas, not the right segment boundaries

“Frequent Traveler,” “Parent Family Archivist,” “Professional Photographer,” and “Digital Minimalist” describe roles or lifestyles. The same person may look for a travel memory today and a receipt tomorrow. Segment the **retrieval task at its starting point** instead:

1. **Clue-led personal-memory retrievers:** seeking one known personal/event photo; remember subject, scene, or context; lack a reliable date/album. P01 and P02 illustrate different possible failure stages within this segment. P05 is a possible success counterexample. P03 is a specialized professional variant that should not define the initial target.
2. **Functional-artifact retrievers:** seeking a document, label, screenshot, or receipt for a practical action; may remember text or context but not the media type/date. P04 and P06 illustrate this *hypothesis*. Evidence of an OCR defect is not established by either simulation.
3. **Resurfaced-photo returners:** trying to reopen an image previously seen in Memories, a display, or another surface. None of P01–P06 covers this segment, although five selected public stories were coded as cross-surface access. This is a material gap in the simulated set.

Candidate retrieval, evaluation, expression, and refinement are **failure stages**, not segments. Cross-tab them with the task-based segments rather than defining a new user type for each stage. The initial PM focus remains clue-led personal-memory retrieval, but the specific failure to solve remains open.

## Scenario-by-scenario audit

| Scenario | Use in the research design | Coding correction or question | Decision impact |
| --- | --- | --- | --- |
| **P01 · Goa café** | Clue-led personal-memory task; useful for testing whether a distinctive scene detail enters the candidate set | “Target not visible” after `goa cafe` suggests retrieval/ranking, but many plausible photos also create overload. The simulated final outcome is unknown. Do not conclude that place indexing caused failure. | Good prototype task seed; ask whether the target appears before/after the blue-umbrella clue. |
| **P02 · birthday cake** | Same segment as P01, with a rival evaluation failure | The record says the exact photo was found after manual inspection, but does not say whether it was visible in the *first* result set or only after reformulation. | Measure target visibility separately from recognition. Do not assume a new segment is needed. |
| **P03 · client shoot** | Specialized professional workflow; hold outside first target unless real research supports it | “Target present but buried” could be ranking or recognition. “Refinement” names a possible remedy, not an established root cause. Advanced filtering and Lightroom make this a different workflow. | Prevents the MVP from drifting into pro asset management without evidence. |
| **P04 · medicine image** | Functional-artifact hypothesis; privacy-sensitive task | First action says query `medicine`, while “exact first query” says `medicine 500mg`. The target is called a screenshot but media type is also said to be forgotten. No simulated result can prove an OCR/indexing gap. | Resolve query/media-type wording before using as a test script; use a non-medical generic label in live tasks unless the participant volunteers a safe example. |
| **P05 · red jacket café** | Positive-control scenario within clue-led retrieval | Quick simulated success is useful for testing inclusion and measuring unnecessary friction. Two years of history is below the earlier three-year recruitment preference. “Small library caused success” is conjecture. | Keep as counterexample; do not count as a target-segment failure. |
| **P06 · hotel receipt** | Functional-artifact hypothesis | “No results or many unrelated receipts” is not one observed result. Expression, OCR/indexing, and ranking cannot be disentangled. The exact hotel text is uncertain. | Specify one initial outcome in any future script; seek a real artifact task before prioritizing OCR. |

All six “would return” responses are simulated and provide no evidence that real participants will return for prototype testing. The elapsed times and attempt counts are also invented scenario parameters, not measured baselines.

## Questions the real sessions must settle

- Can a participant name **one exact intended photo before searching**, and how will they confirm it was found?
- What is the **verbatim first query or action**? What clues were remembered *before* seeing suggestions or results?
- Was the target in the initial candidate set, below the first screen, present only after reformulation, or never found? Record unknown when the participant cannot confirm.
- If visible, what made it difficult or easy to recognize? If absent, which next clue was tried and why?
- Was the task a personal memory, a functional artifact, or a cross-surface return? Which stage failed *within* that task?
- Did the participant use classic Search, Ask Photos, an album, Memories, or a separate app? Do not assume the available product surface.

## Action based on this audit

Use P01/P02/P04/P05/P06 only as **fictional practice tasks** for the moderator and coding pipeline. Do not use P03 to drive the initial MVP. Add one practice scenario for cross-surface return because the supplied six omit it, but label that scenario simulated. Recruit 5–6 real participants across these task situations if feasible, with at least one successful search and one plausible-result/recognition case. Revisit the target segment and problem after those observed tasks; the current prototype may still be revised or discarded.

## Addendum: supplied ranked snapshots and Five Whys

A second user-pasted attachment supplied mock ranked snippets, Five Whys chains, proposed fixes, and a one-page synthesis for P01–P06. The leading JSON portion parses, but the file also contains prose after the JSON; it is **not a directly importable single JSON document**. Its status remains simulated. The snapshot yields these *scripted states*, not measured product results:

| Scenario | Claimed target state | What the supplied snapshot actually shows | Safe interpretation |
| --- | --- | --- | --- |
| P01 | Present, buried | Target annotated at rank 18; ranks 10–17 are not shown | Useful buried-target practice case; not a measured baseline |
| P02 | Present, ranked | Target annotated at rank 6 | Useful recognition-versus-ranking practice case; still outside top 5 |
| P03 | Present, buried | Target annotated at rank 24; ranks 10–23 are not shown | Pro-workflow stress case, not first-segment evidence |
| P04 | Absent | No target among ten shown snippets | **Unknown beyond the shown top 10**; cannot infer missing upload or OCR failure |
| P05 | Present, ranked | Target annotated at rank 1 | Quick-success control scenario |
| P06 | Absent | No target among ten shown snippets | **Unknown beyond the shown top 10**; cannot infer missing upload or OCR failure |

The “Five Whys” chains are **hypothesis chains**, not established root causes. In particular, statements about how the ranking model weights scene tags, OCR coverage, available filters, or missing UI affordances are not demonstrated by synthetic snippets. The proposed “high impact” labels and 50%/60%/30% acceptance thresholds have no empirical baseline; use them, at most, as discussion prompts after a measured benchmark. Counting two simulated scenarios as a “repeatable” root cause would be circular because the scripts were deliberately constructed to represent those causes.

The attachment cannot be replayed literally on the [current Recall Lab](../mvp/recall-lab-implementation.md): that prototype has 27 different synthetic images. The café with blue umbrella, pink birthday cake, bride, medical label, red jacket, and hotel receipt are not target images in that catalog. Its photo IDs `P01`–`P09` also refer to **pet images**, so P01–P06 persona IDs must be namespaced (e.g. `SIM-P01`) before any future fixture import. A fourth controlled task now uses the **existing seaside-café image T05** as an analogous buried-target case, not the attachment's invented image or rank.

As a read-only preflight on 24 September, the existing **deterministic keyword baseline** ranks the actual Recall Lab targets at **6** for `dog` (pet), **4** for `man` (trip), and **5** for `birthday` (event). These are code outputs on the 27-image synthetic catalog, not observed user behavior or Groq results. Two targets already appear in the first top five, so the present task pack is better at probing recognition than proving that a follow-up recovers a deeply buried item. The scenario text also reveals richer target details than a person may remember unaided.

### Actionable use

1. **Keep the PM decision focused.** Do not simultaneously build ClueAssist, OCR suggestions, and thumbnail overlays from these scripts. First determine whether the real bottleneck is candidate ranking, recognition, or missing content.
2. **Use the repaired task pack for a diagnostic pilot.** Keep a recognition task where the target is visible; the new café task fixes the broad first query to `trip`, which places T05 at rank 14/27 in the *keyword baseline*, while a second visual clue can move it to rank 1. The app now displays rank after each attempt and optionally stores the derived ranks. Correct selection, attempts, time, and AI/fallback mode are also recorded. Result-card preview counts still require observer notes; the current cards do not provide a separate full-preview action.
3. **Add a new scenario only with a real target image ID and distractors in the catalog.** Then calculate ranks from the actual ranking output, not from a scripted list. A P01-style buried café case is a candidate only after this setup.
4. **Route by observed stage:** if extra clues promote an existing target, test guided refinement; if the target is visible but misidentified, test evaluation cues; if absent from the complete library/index, diagnose availability or indexing. Investigate OCR only if real artifact tasks support it.
