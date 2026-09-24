# PM opportunity decision gate — vague-memory photo retrieval

24 September 2026 · Decision status: **provisional focus for validation**, not a final problem/solution choice.

**Updated segmentation:** The later [framework audit and four task-pathway comparison](2026-09-24-segmentation-opportunity-validation.md) separates browse-first behavior from clue-first search. Use that memo as the current segmentation decision; the three candidate situations below record the earlier decision gate.

## Decision to make

The business outcome is the share of eligible attempts in which a person **opens and confirms the specific photo they had in mind**, having started without a reliable date, album, or exact searchable words. The discovery engine identifies possible breakdowns. The PM decision is which *user situation and failure mechanism* to solve first; the existing Recall Lab is a test instrument, not the answer to that decision.

## Evidence available now

- [Public discovery engine](https://google-photos-grad-project.soumyasantra431.workers.dev/): 20 included, human-checked retrieval stories from Google Photos support (9), Reddit (9), and forums (2). This is a deliberately selected complaint corpus, not a representative sample. [Opportunity map](https://google-photos-grad-project.soumyasantra431.workers.dev/api/opportunity-map) and [four-question analysis](https://google-photos-grad-project.soumyasantra431.workers.dev/api/research-questions) expose source-linked examples.
- [Anonymous survey coding](google-photos-survey-2026-09-21.json): 8 convenience-sample responses, including 7 recent retrieval attempts. R01 and R08 reported unrelated first results; R07 saw plausible results but selected a close alternative. Four other episodes have sequence or outcome limitations described in the [synthesis](2026-09-23-alternative-research-synthesis.md). The survey and public counts are never merged.
- The public corpus directly supports remembered clues more strongly than forgotten details or exact first-query sequences. Only 3/20 public stories explicitly say the date was forgotten; the survey reports 5/7 forgot the album/folder, but this does **not** establish an access defect.

## Candidate behavioral segments

| Candidate situation | What the person knows and tries | Relevant evidence | Critical uncertainty |
| --- | --- | --- | --- |
| **A. Clue-led personal-memory retriever** | Knows one older personal/event photo exists; remembers subject, appearance, event, or place; lacks a reliable date/album; begins with a content/context search. | Clue-to-results is the largest *coded mechanism* in the selected corpus (9/20 across three source types). Survey R01 and R08 reported unrelated first results; R07 suggests a recognition rival. This is not a measured segment size. | Was the target absent, poorly ranked, or present but overlooked? |
| **B. Functional-artifact retriever** | Needs a specific screenshot, label, receipt, or document for a practical task; may remember text or context but not the date/media type. | A [passport/document search account](https://www.reddit.com/r/googlephotos/comments/1fvq7hr/why_did_they_ruin_google_photos_search/) and one object-oriented survey response are adjacent signals; no observed OCR failure is established. | Is text recognition, candidate retrieval, expression, or another app's copy of the artifact the real bottleneck? |
| **C. Resurfaced-photo returner** | Recently saw a known photo in Memories, a display, or another Photos surface and tries to open it again. | 5/20 public stories coded as library access, all from Google support; e.g. a [previously surfaced image](https://support.google.com/photos/thread/444348665?hl=en). | Is the photo actually in the accessible library, and is cross-surface navigation—not search—the failure? |

These are task-context segments, not demographic labels such as traveler, parent, or photographer. They can overlap for one person across different retrieval attempts. Candidate retrieval, expression, evaluation, and refinement are **failure stages within a segment**, not separate user segments. Eligibility must be assessed per *task*, not per lifetime user label. The [six supplied mock scenarios](../simulated-research/2026-09-24-six-scenario-segmentation-audit.md) helped stress-test these definitions but do not add empirical support.

## Compare the failure opportunities

| Failure in the journey | Selected public stories | Evidence breadth | PM interpretation | Product outcome to test |
| --- | ---: | --- | --- | --- |
| A useful clue fails to produce the target candidate | 9/20 | Three source types; 6 unresolved | **First validation priority**, not proof that the model misunderstood language | Intended photo appears in a manageable first or second shortlist |
| Known photo cannot be reached across surfaces | 5/20 | Google support only; 5 unresolved | Strong rival, but currently source-concentrated | Person can reopen the known image from its surfacing context |
| Remembered clue cannot be expressed in available controls | 4/20 | Three source types; 4 unresolved | Distinct input/path problem; one case asks for a map and another for reference-image search | Person can use the clue they genuinely retain |
| Target is difficult to recognize among candidates | 1/20 | One source; survey R07 supports a rival hypothesis | Under-sampled, potentially high pain | Person correctly selects the target when it is visible |
| First miss offers no useful recovery path | 1/20 | One source; some survey workarounds | May compound other failures rather than initiate them | A second attempt increases target visibility and correct selection |

Counts describe this *selected* corpus only. They are not population prevalence, a RICE score, or a reason by themselves to prioritize investment.

## Provisional choice and the MVP mismatch to test

Start validation with **segment A** and the **clue-to-candidate failure** because it has the broadest cross-source public signal, two independent survey reports of irrelevant first results, and a direct link to the retrieval-success metric. Keep functional artifacts (B), cross-surface return (C), and result recognition *within A* as explicit rivals. The six simulated scenarios cannot be used to increase any opportunity's evidence count or decide which one wins.

The [existing Recall Lab](../mvp/recall-lab-implementation.md) tests whether an extra clue and visible matching help after an unhelpful first query. That is a **recovery interaction**. If real users supply useful clues but the photo is absent because the underlying image was not indexed or available, this interaction cannot solve the primary failure. We should retain, revise, or discard the prototype based on observed target visibility and correct selection—not defend it because it is already built.

## Fast, genuine primary-research validation

Recruit 5–6 current Google Photos users who can name a **recent, safe, specific older-photo retrieval attempt** that began with incomplete memory; preferably invite through the survey's original distribution channel, since the anonymous survey has no contacts. Aim for 15–20 minutes each. Include at least one successful case, one plausible-results/recognition case, and, if available, a functional-artifact or cross-surface case so that the leading segment has a genuine rival. A shorter focused session can still be a real interview; an invented transcript cannot.

For each participant, obtain consent and record one retrieval task as the unit of analysis:

1. **Before opening Photos:** “Which exact photo do you have in mind? What do you remember? What do you not know? Why do you need it?” Record their words without suggesting clue categories first.
2. **Observe a safe attempt:** capture the first action/query verbatim, result set, which cards they inspect, whether the target appears, reformulations, and any switch to albums, timeline, Memories, another app, or another person. Avoid storing private photos or screen recordings unless specifically consented.
3. **Debrief:** ask what they expected each search to do, why a result seemed promising, what they tried after the first miss, and whether they found and confirmed the *exact* photo.
4. **Optional return invitation:** ask permission to test a revised prototype later. Do not claim the brief's return-user requirement until at least three people actually use it.

Use the same task sheet for all six: participant code; target and reason; age of media; remembered/forgotten clues; exact first query; first-result relevance; target visible (yes/no/unknown); recognition if visible; second action; workaround; final outcome; surface used (classic Search/Ask Photos/other); researcher-observed failure stage; confidence/unknowns. Let participants choose a non-sensitive target.

### Decision rules after the sessions

- **Target absent despite a specific useful clue:** investigate candidate retrieval/indexing/ranking; a better prompt alone is not the solution.
- **Target visible but repeatedly missed:** move toward result evaluation and recognition cues.
- **First result weak, new clue reliably surfaces target:** guided refinement becomes a defensible solution hypothesis.
- **Photo seen in Memories/display but inaccessible later:** elevate segment B and cross-surface access.
- **Participants cannot express what they remember:** elevate expression/input modality.
- **Real Photos, especially Ask Photos where available, already solves the observed task:** narrow or abandon the prototype idea.

After this decision gate, write one final problem statement and segment rationale, adapt the prototype, test it with at least three real target users, then define solution-specific metrics, risks, and the deck. Mock interviews may be used to rehearse the interviewer or importer, but must be labeled simulated and excluded from research findings.
