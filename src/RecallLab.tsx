import { useEffect, useMemo, useState } from "react";

type Photo = { id: string; sheet: "pets" | "trips" | "events"; cell: number; alt: string; tags: string[] };
type Task = { id: string; title: string; scenario: string; seedQuery: string; evidenceSeed: string };
type Catalog = { note: string; photos: Photo[]; tasks: Task[] };
type Mode = "baseline" | "guided";
type SearchResult = { ids: string[]; mode: "groq" | "keyword_fallback" | "keyword"; followUp: string | null };
type Evaluation = { correct: boolean; targetId: string };

const photoStyle = (photo: Photo) => ({
  backgroundImage: `url(/recall-lab/${photo.sheet}-sheet.png)`,
  backgroundSize: "300% 300%",
  backgroundPosition: `${(photo.cell % 3) * 50}% ${Math.floor(photo.cell / 3) * 50}%`,
});

export default function RecallLab() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState("");
  const [taskId, setTaskId] = useState("");
  const [mode, setMode] = useState<Mode>("guided");
  const [query, setQuery] = useState("");
  const [extraClue, setExtraClue] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recorded, setRecorded] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/recall-lab/catalog", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("The sample library could not load.");
        setCatalog(await response.json() as Catalog);
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "The sample library could not load."); });
    return () => controller.abort();
  }, []);

  const task = catalog?.tasks.find((item) => item.id === taskId);
  const photosById = useMemo(() => new Map(catalog?.photos.map((photo) => [photo.id, photo]) ?? []), [catalog]);
  const visiblePhotos = result?.ids.slice(0, expanded ? undefined : 12).map((id) => photosById.get(id)).filter((photo): photo is Photo => Boolean(photo)) ?? [];
  const targetPhoto = evaluation ? photosById.get(evaluation.targetId) : undefined;

  function chooseTask(nextTask: Task) {
    setTaskId(nextTask.id);
    setQuery(nextTask.seedQuery);
    setExtraClue("");
    setResult(null);
    setAttempts(0);
    setStartedAt(null);
    setElapsedMs(0);
    setSelectedPhotoId(null);
    setEvaluation(null);
    setExpanded(false);
    setMessage("");
    setRecorded(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function search(phrase: string) {
    if (!task || phrase.trim().length < 2 || busy || evaluation) return;
    setBusy(true);
    setMessage("");
    setStartedAt((time) => time ?? performance.now());
    try {
      const response = await fetch("/api/recall-lab/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, mode, query: phrase.trim() }),
      });
      const payload = await response.json() as SearchResult & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Search could not run. Please retry.");
      setResult(payload);
      setAttempts((count) => count + 1);
      setExtraClue("");
      setExpanded(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Search could not run. Please retry.");
    } finally { setBusy(false); }
  }

  async function finish(photoId: string | null) {
    if (!task || !result || busy || evaluation || startedAt === null) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/recall-lab/evaluate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, selectedPhotoId: photoId, record: false }),
      });
      if (!response.ok) throw new Error("The result could not be checked.");
      setEvaluation(await response.json() as Evaluation);
      setSelectedPhotoId(photoId);
      setElapsedMs(Math.round(performance.now() - startedAt));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The result could not be checked.");
    } finally { setBusy(false); }
  }

  async function submitAnonymousResult() {
    if (!task || !result || !evaluation || recorded || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/recall-lab/evaluate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, selectedPhotoId, record: true, sessionId, mode, attempts, elapsedMs, topFiveIds: result.ids.slice(0, 5), aiMode: result.mode }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "The anonymous result could not be saved.");
      setRecorded(true);
      setMessage("Anonymous result saved. Thank you.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The anonymous result could not be saved.");
    } finally { setBusy(false); }
  }

  return <div className="lab-shell">
    <header className="lab-header"><a className="lab-brand" href="/"><span className="brand-mark-v3" aria-hidden="true"><i className="petal blue"/><i className="petal red"/><i className="petal yellow"/><i className="petal green"/></span><span>Photo Recall Lab</span></a><span>Unofficial concept prototype</span><a href="/">Discovery engine ↗</a></header>
    <main className="lab-main">
      <section className="lab-intro"><span className="lab-eyebrow">Test the proposed retrieval experience</span><h1>Can one better clue help you find the right photo?</h1><p>Try a scripted task in a 27-photo synthetic library. This tests the journey after a broad first search—not the real Google Photos search engine or your personal library.</p><div className="lab-method"><strong>What is real?</strong> The failure patterns came from anonymous survey responses R01, R08, and R07. <strong>What is invented?</strong> Every image and specific scene in these tasks was AI-generated for testing.</div></section>
      {loadError && <div className="lab-alert" role="alert">{loadError}</div>}
      {!catalog && !loadError && <p className="lab-loading">Loading the test library…</p>}
      {catalog && !task && <section className="lab-setup"><div className="lab-section-heading"><span>Step 1</span><h2>Choose a retrieval task</h2><p>Two tasks test clue-to-result matching; the third checks whether similar photos are hard to tell apart.</p></div><div className="lab-task-grid">{catalog.tasks.map((item, index) => <button key={item.id} className="lab-task" onClick={() => chooseTask(item)}><span className="lab-task-number">0{index + 1}</span><strong>{item.title}</strong><p>{item.scenario}</p><small>{item.evidenceSeed}</small><span className="lab-task-link">Start task →</span></button>)}</div><p className="lab-corpus-note">{catalog.note}</p></section>}
      {catalog && task && <>
        <div className="lab-task-toolbar"><button onClick={() => { setTaskId(""); setResult(null); setEvaluation(null); }}>← All tasks</button><span>{task.title}</span><small>{catalog.photos.length} synthetic photos</small></div>
        <section className="lab-context"><div><span className="lab-eyebrow">Your retrieval mission</span><h2>{task.scenario}</h2><p>Start with the broad clue shown below, then use what else you remember if the results are weak.</p></div><div className="lab-source-note">Based on {task.evidenceSeed}. The scene details are synthetic.</div></section>
        <section className="lab-search-area"><div className="lab-section-heading"><span>Step 2</span><h2>Try the first search</h2></div><div className="lab-mode" role="group" aria-label="Search experience"><button className={mode === "guided" ? "active" : ""} onClick={() => { if (!result) setMode("guided"); }} disabled={Boolean(result)}>Guided with AI</button><button className={mode === "baseline" ? "active" : ""} onClick={() => { if (!result) setMode("baseline"); }} disabled={Boolean(result)}>Basic keyword search</button></div><p className="lab-mode-note">{mode === "guided" ? "AI ranks the sample photos from your clue. If it cannot respond, the screen will say so and use basic matching." : "Basic matching uses only words in the sample photo descriptions. No AI guidance is provided."}</p><form className="lab-query-form" onSubmit={(event) => { event.preventDefault(); void search(query); }}><label htmlFor="lab-query">What do you remember?</label><div><input id="lab-query" value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={160} disabled={busy || Boolean(evaluation)} aria-describedby="lab-query-help"/><button type="submit" disabled={busy || Boolean(evaluation) || query.trim().length < 2}>{busy ? "Working…" : attempts ? "Search again" : "Find photos"}</button></div><small id="lab-query-help">The suggested first clue is intentionally broad. You can edit it before searching.</small></form>{message && !evaluation && <p className="lab-message" role="status">{message}</p>}</section>
        {result && <section className="lab-results"><div className="lab-results-head"><div><span className="lab-eyebrow">Step 3 · Look at the candidates</span><h2>Search results</h2><p>Attempt {attempts} · {result.mode === "groq" ? "Groq AI ranking" : result.mode === "keyword_fallback" ? "AI unavailable — basic matching used" : "Basic keyword matching"}</p></div><span>{visiblePhotos.length} of {catalog.photos.length} shown</span></div>{mode === "guided" && !evaluation && <div className="lab-refine"><div><strong>The shortlist is not right yet?</strong><p>{result.followUp}</p></div><form onSubmit={(event) => { event.preventDefault(); const next = `${query.trim()} ${extraClue.trim()}`.trim(); setQuery(next); void search(next); }}><input value={extraClue} onChange={(event) => setExtraClue(event.target.value)} placeholder="Add one remembered detail" maxLength={100} aria-label="Additional remembered detail" disabled={busy}/><button type="submit" disabled={busy || extraClue.trim().length < 2}>Use this clue</button></form></div>}
          <div className="lab-photo-grid">{visiblePhotos.map((photo, index) => <article className="lab-photo" key={photo.id}><div className="lab-photo-image" role="img" aria-label={photo.alt} style={photoStyle(photo)}/><div className="lab-photo-info"><span>Photo {photo.id}</span>{mode === "guided" && <div className="lab-photo-tags">{photo.tags.slice(0, 3).map((tag) => <small key={tag}>{tag}</small>)}</div>}<button onClick={() => void finish(photo.id)} disabled={busy || Boolean(evaluation)}>{evaluation ? "Task finished" : `Choose photo ${photo.id}`}</button></div>{index < 5 && <span className="lab-top-five">Top 5</span>}</article>)}</div>{!expanded && result.ids.length > 12 && <button className="lab-show-all" onClick={() => setExpanded(true)}>Show all {result.ids.length} photos</button>}{!evaluation && <button className="lab-stop" onClick={() => void finish(null)} disabled={busy}>I cannot find the photo</button>}</section>}
        {evaluation && <section className="lab-finish"><span className="lab-eyebrow">Task result</span><h2>{evaluation.correct ? "You found the intended photo" : "This was not the intended photo"}</h2><p>{evaluation.correct ? "That is the target for this synthetic task." : selectedPhotoId ? `You chose ${selectedPhotoId}. The target was ${evaluation.targetId}.` : `You stopped. The target was ${evaluation.targetId}.`}</p>{targetPhoto && <div className="lab-target"><div className="lab-photo-image" role="img" aria-label={targetPhoto.alt} style={photoStyle(targetPhoto)}/><span>Target: {targetPhoto.alt}</span></div>}<div className="lab-result-stats"><span><strong>{attempts}</strong> search {attempts === 1 ? "attempt" : "attempts"}</span><span><strong>{(elapsedMs / 1000).toFixed(1)}s</strong> elapsed</span><span><strong>{result?.ids.slice(0, 5).includes(evaluation.targetId) ? "Yes" : "No"}</strong> target in last top 5</span></div><p className="lab-privacy">Optional: share only task ID, search mode, attempts, time, selected photo ID, and success. No name, account, personal photo, or search words are saved.</p><button className="lab-primary" onClick={() => void submitAnonymousResult()} disabled={busy || recorded}>{recorded ? "Anonymous result saved" : "Share anonymous test result"}</button><button className="lab-secondary" onClick={() => { setTaskId(""); setResult(null); setEvaluation(null); }}>Try another task</button>{message && <p className="lab-message" role="status">{message}</p>}</section>}
      </>}
    </main>
    <footer className="lab-footer"><span>Photo Recall Lab · Evidence-seeded concept, not Google Photos</span><a href="/">How the problem was chosen</a></footer>
  </div>;
}
