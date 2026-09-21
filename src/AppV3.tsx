import { useEffect, useMemo, useState, type CSSProperties } from "react";

type View = "overview" | "ask" | "compare" | "library";
type LibraryView = "sources" | "stories";
type CorpusStats = { source_count: number; document_count: number; evidence_count: number; verified_count: number };
type Breakdown = { source_kind?: string; evidence_count: number };
type Evidence = {
  id: string; retrieval_target: string; evidence_excerpt: string; remembered_clues_json: string;
  forgotten_context_json: string; failure_stage: string; retrieval_outcome: string;
  source_kind: string; platform: string; canonical_url: string;
};
type ResearchQuestion = {
  id: string; question: string; caveat: string; observedEpisodes: number;
  patterns: Array<{ code: string; episodes: number; examples: Array<{ id: string; source_text: string; canonical_url: string; source_kind: string }> }>;
  reportedExactQueries?: Array<{ query: string; id: string; canonical_url: string }>;
};
type ResearchQuestions = {
  coverage: { admittedEpisodes: number; codedEpisodes: number; humanVerifiedEpisodes: number; sourceKinds: string[]; truncated: boolean };
  questions: ResearchQuestion[];
};
type SourceCoverage = {
  sources: Array<{
    sourceKind: string; status: "attempted" | "not_connected"; runCount: number;
    recordsProcessedAcrossRuns: number; initiallyRetainedAcrossRuns: number;
    uniqueCandidates: number; modelScreenedCandidates: number; admittedEpisodes: number;
  }>;
  note: string;
};
type OpportunityArea = {
  code: string; journeyStep: string; userProblem: string; productOutcome: string; leadingMetric: string;
  diagnosticMetrics: string[]; episodes: number; sourceKinds: string[]; unresolvedEpisodes: number;
  workaroundEpisodes: number; humanVerifiedEpisodes: number;
  examples: Array<{ id: string; source_text: string; canonical_url: string; source_kind: string; rationale: string }>;
};
type OpportunityMap = {
  metric: { businessMetric: string; productOutcome: string };
  comparison: { mostObservedMechanism: { code: string; episodes: number; sourceKinds: string[] } | null; caveat: string };
  areas: OpportunityArea[];
};
type ProblemDefinition = {
  targetSegment: string; retrievalScenario: string; rootCause: string; problemStatement: string;
  currentWorkarounds: string[]; userValue: string; businessValue: string; productOutcome: string;
  leadingMetric: string; caveat: string;
};
type AnalysisTemplateId = "photo_types" | "remembered_clues" | "forgotten_context" | "search_language" | "compare_breakdowns" | "choose_opportunity";
type GroundedAnalysis = {
  templateId: AnalysisTemplateId; question: string;
  analysis: { answer: string; insights: Array<{ label: string; finding: string; evidenceIds: string[]; implication: string }>; caveat: string };
  evidence: Array<{ id: string; sourceText: string; sourceKind: string; canonicalUrl: string }>;
  provenance: { includedStories: number; cacheStatus: "hit" | "generated" };
};
type AnalysisState = { kind: "idle" } | { kind: "loading"; templateId: AnalysisTemplateId } | { kind: "ready"; data: GroundedAnalysis } | { kind: "error"; message: string };
type SystemState = { kind: "loading" } | { kind: "offline" } | {
  kind: "online"; checkedAt: string; corpus: CorpusStats; simulatedExcluded: number; publicExcluded: number;
  evidence: Evidence[]; bySource: Breakdown[]; research: ResearchQuestions; sourceCoverage: SourceCoverage;
  opportunity: OpportunityMap; problem: ProblemDefinition;
};

const emptyStats: CorpusStats = { source_count: 0, document_count: 0, evidence_count: 0, verified_count: 0 };
const navItems: Array<{ id: View; label: string; icon: string; hash: string }> = [
  { id: "overview", label: "Overview", icon: "⌂", hash: "overview" },
  { id: "ask", label: "Ask the evidence", icon: "✦", hash: "ask-evidence" },
  { id: "compare", label: "Compare problems", icon: "◫", hash: "opportunity-map" },
  { id: "library", label: "Evidence library", icon: "▤", hash: "evidence" },
];
const analysisTemplates: Array<{ id: AnalysisTemplateId; label: string; helper: string }> = [
  { id: "photo_types", label: "Which old photos are hard to find?", helper: "See the photo types mentioned in real retrieval stories." },
  { id: "remembered_clues", label: "What do people still remember?", helper: "See the people, objects, places, and visual details they recall." },
  { id: "forgotten_context", label: "What have people forgotten?", helper: "Count only details users explicitly say they cannot remember." },
  { id: "search_language", label: "How do people try to search?", helper: "See typed queries, browsing, and reference-image requests." },
  { id: "compare_breakdowns", label: "Where does retrieval break most often?", helper: "Compare five distinct failure points in the journey." },
  { id: "choose_opportunity", label: "What should we validate first?", helper: "Use evidence strength and product value—not sentiment alone." },
];
const opportunityColors: Record<string, string> = {
  clue_expression: "#f9ab00", clue_interpretation: "#1a73e8", result_evaluation: "#a142f4",
  search_refinement: "#12b5cb", library_access: "#34a853",
};
const breakdownLabels: Record<string, string> = {
  clue_expression: "Cannot use the clue", clue_interpretation: "Search misunderstands it",
  result_evaluation: "Right photo is hard to spot", search_refinement: "No useful next step",
  library_access: "Photo is hard to reach",
};
const questionSummaries: Record<string, string> = {
  photo_types: "People, pets, objects, documents, food, and places appear in the included stories.",
  remembered: "People remember content and context—often a person, appearance, object, place, or rough time.",
  forgotten: "Only the date is explicitly described as forgotten in the current evidence.",
  searches: "People type clue combinations, browse timelines or folders, and ask to search with another image.",
};
const sourceMethods: Record<string, { name: string; method: string; api: string; note: string }> = {
  google_support: { name: "Google Photos Community", method: "Public-page collector", api: "No API key needed", note: "A bounded list of public threads is fetched, screened, and kept with the original link." },
  reddit: { name: "Reddit", method: "Verified public excerpt import", api: "No API key used", note: "Relevant public posts are manually verified and imported with their original URLs." },
  app_store: { name: "Apple App Store", method: "Public review feed", api: "No API key needed", note: "Public reviews are collected locally because the feed is unreliable from the Cloudflare edge." },
  youtube: { name: "YouTube comments", method: "YouTube Data API", api: "API key connected", note: "Comments were scanned, but no story met the strict retrieval-evidence test yet." },
  google_play: { name: "Google Play reviews", method: "Not connected", api: "Owner access unavailable", note: "The official developer API only exposes reviews for apps you manage; we do not own Google Photos." },
  social: { name: "Social conversations", method: "Not connected", api: "Optional platform approval", note: "Official access varies by platform. Public, source-linked imports can be added without inventing data." },
  forum: { name: "Other public forums", method: "Ready for curated import", api: "No key required", note: "Public excerpts can be added when they have a clear retrieval attempt and a working source URL." },
};

function friendlyLabel(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function percent(part: number, total: number) { return total > 0 ? Math.round((part / total) * 100) : 0; }
function precisePercent(part: number, total: number) { if (!total) return "0%"; const value = part / total * 100; return `${value < 10 ? value.toFixed(1) : Math.round(value)}%`; }
function parseStringArray(value: string): string[] { try { const parsed = JSON.parse(value) as unknown; return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; } catch { return []; } }
function conicGradient(items: Array<{ value: number; color: string }>) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!total) return "conic-gradient(#e8eaed 0deg 360deg)";
  let cursor = 0;
  return `conic-gradient(${items.map((item) => { const start = cursor; cursor += item.value / total * 360; return `${item.color} ${start}deg ${cursor}deg`; }).join(", ")})`;
}
function initialView(): View {
  const hash = window.location.hash.slice(1);
  if (hash === "ask-evidence") return "ask";
  if (hash === "opportunity-map" || hash === "problem-definition") return "compare";
  if (["evidence", "source-coverage", "explorer", "architecture"].includes(hash)) return "library";
  return "overview";
}

export default function AppV3() {
  const [view, setView] = useState<View>(initialView);
  const [libraryView, setLibraryView] = useState<LibraryView>("sources");
  const [system, setSystem] = useState<SystemState>({ kind: "loading" });
  const [analysis, setAnalysis] = useState<AnalysisState>({ kind: "idle" });
  const [activeOpportunity, setActiveOpportunity] = useState("clue_interpretation");
  const [storySearch, setStorySearch] = useState("");
  const [storySource, setStorySource] = useState("all");

  useEffect(() => {
    const controller = new AbortController();
    const request = (path: string) => fetch(path, { signal: controller.signal, cache: "no-store" });
    async function loadSystem() {
      try {
        const responses = await Promise.all([
          request("/api/health"), request("/api/stats"), request("/api/evidence?limit=50"),
          request("/api/research-questions"), request("/api/source-coverage"),
          request("/api/opportunity-map"), request("/api/problem-definition"),
        ]);
        if (!responses.every((response) => response.ok)) throw new Error("System check failed");
        const [health, stats, evidence, research, sourceCoverage, opportunity, problem] = await Promise.all(responses.map((response) => response.json())) as [
          { checkedAt: string; database: string },
          { corpus?: CorpusStats; simulatedEvidenceExcluded?: number; publicEvidenceExcluded?: number; bySource?: Breakdown[] },
          { data?: Evidence[] }, ResearchQuestions, SourceCoverage, OpportunityMap, ProblemDefinition,
        ];
        if (health.database !== "connected") throw new Error("Database unavailable");
        setSystem({
          kind: "online", checkedAt: health.checkedAt, corpus: stats.corpus ?? emptyStats,
          simulatedExcluded: stats.simulatedEvidenceExcluded ?? 0, publicExcluded: stats.publicEvidenceExcluded ?? 0,
          evidence: evidence.data ?? [], bySource: stats.bySource ?? [], research, sourceCoverage, opportunity, problem,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSystem({ kind: "offline" });
      }
    }
    void loadSystem();
    return () => controller.abort();
  }, []);

  const corpus = system.kind === "online" ? system.corpus : emptyStats;
  const screenedCandidates = system.kind === "online" ? system.sourceCoverage.sources.reduce((sum, source) => sum + source.uniqueCandidates, 0) : 0;
  const opportunityTotal = system.kind === "online" ? system.opportunity.areas.reduce((sum, area) => sum + area.episodes, 0) : 0;
  const selectedOpportunity = system.kind === "online" ? system.opportunity.areas.find((area) => area.code === activeOpportunity) ?? system.opportunity.areas[0] : undefined;
  const opportunityDonut = system.kind === "online" ? conicGradient(system.opportunity.areas.map((area) => ({ value: area.episodes, color: opportunityColors[area.code] }))) : conicGradient([]);
  const sourceDonut = system.kind === "online" ? conicGradient(system.bySource.map((source, index) => ({ value: source.evidence_count, color: ["#1a73e8", "#34a853", "#f9ab00", "#a142f4"][index] ?? "#5f6368" }))) : conicGradient([]);
  const filteredEvidence = useMemo(() => {
    if (system.kind !== "online") return [];
    const query = storySearch.trim().toLowerCase();
    return system.evidence.filter((item) => (storySource === "all" || item.source_kind === storySource) && (!query || [item.retrieval_target, item.evidence_excerpt, item.platform, item.failure_stage].some((value) => value.toLowerCase().includes(query))));
  }, [system, storySearch, storySource]);

  function navigate(next: View) {
    setView(next);
    window.history.replaceState(null, "", `#${navItems.find((item) => item.id === next)?.hash ?? "overview"}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openOpportunity(code: string) { setActiveOpportunity(code); navigate("compare"); }
  async function askEvidence(templateId: AnalysisTemplateId) {
    setAnalysis({ kind: "loading", templateId });
    try {
      const response = await fetch(`/api/grounded-analysis?template=${encodeURIComponent(templateId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("The evidence answer could not be generated right now.");
      setAnalysis({ kind: "ready", data: await response.json() as GroundedAnalysis });
    } catch (error) { setAnalysis({ kind: "error", message: error instanceof Error ? error.message : "The evidence answer could not be generated right now." }); }
  }
  function templateForQuestion(id: string): AnalysisTemplateId {
    if (id === "remembered") return "remembered_clues";
    if (id === "forgotten") return "forgotten_context";
    if (id === "searches") return "search_language";
    return "photo_types";
  }

  return <div className="app-shell-v3">
    <header className="topbar-v3">
      <button className="brand-v3" type="button" onClick={() => navigate("overview")} aria-label="Photo Recall overview">
        <span className="brand-mark-v3" aria-hidden="true"><i className="petal blue"/><i className="petal red"/><i className="petal yellow"/><i className="petal green"/></span><span>Photo Recall</span>
      </button>
      <nav className="top-navigation-v3" aria-label="Primary navigation">{navItems.map((item) => <button className={view === item.id ? "nav-v3 active" : "nav-v3"} type="button" key={item.id} onClick={() => navigate(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>
      <div className="build-status-v3"><i className={`status-dot-v3 ${system.kind}`}/><span>{system.kind === "online" ? "Live evidence" : system.kind === "loading" ? "Loading" : "Offline"}</span><small>Build 3</small></div>
    </header>

    <main className="workspace-v3">
      {system.kind === "loading" && <section className="loading-v3"><div className="loader-v3"/><h1>Loading the research evidence…</h1><p>Connecting public stories, human checks, and AI analysis.</p></section>}
      {system.kind === "offline" && <section className="loading-v3"><span className="offline-v3">!</span><h1>The evidence service is unavailable.</h1><p>Please refresh in a moment. No findings are shown without a live database connection.</p></section>}

      {system.kind === "online" && view === "overview" && <section className="page-v3">
        <div className="hero-v3">
          <div className="hero-copy-v3"><span className="kicker-v3">AI-powered discovery engine</span><h1>Why remembered photos still stay hard to find</h1><p>People often remember who or what was in a photo—but not its exact date. This engine shows where retrieval breaks, using traceable public evidence.</p><div className="actions-v3"><button className="primary-v3" onClick={() => navigate("ask")}>Ask the evidence →</button><button className="secondary-v3" onClick={() => navigate("compare")}>Compare the 5 problems</button></div></div>
          <article className="lead-v3"><span>● Strongest current signal</span><b>{percent(system.opportunity.comparison.mostObservedMechanism?.episodes ?? 0, opportunityTotal)}%</b><h2>Search misunderstands a clue the user can already express.</h2><p>{system.opportunity.comparison.mostObservedMechanism?.episodes ?? 0} of {opportunityTotal} classified breakdowns in this selected evidence set.</p><button onClick={() => openOpportunity("clue_interpretation")}>See the user stories →</button></article>
        </div>
        <div className="metrics-v3"><article><strong>{screenedCandidates.toLocaleString()}</strong><span>public items screened</span><small>across attempted sources</small></article><article><strong>{corpus.evidence_count}</strong><span>relevant retrieval stories</span><small>passed the strict inclusion rule</small></article><article><strong>{precisePercent(corpus.evidence_count, screenedCandidates)}</strong><span>of screened items included</span><small>quality filter, not prevalence</small></article><article><strong>{percent(corpus.verified_count, corpus.evidence_count)}%</strong><span>human checked</span><small>against original source text</small></article></div>

        <div className="overview-grid-v3">
          <article className="panel-v3 chart-panel-v3"><div className="panel-head-v3"><div><span className="section-label-v3">Where retrieval breaks</span><h2>Five problems, compared in one view</h2></div><button onClick={() => navigate("compare")}>Open comparison →</button></div><div className="chart-layout-v3"><div className="donut-v3 large" style={{background: opportunityDonut} as CSSProperties}><span><strong>{opportunityTotal}</strong><small>classified<br/>breakdowns</small></span></div><div className="legend-v3">{system.opportunity.areas.map((area) => <button key={area.code} onClick={() => openOpportunity(area.code)}><i style={{background: opportunityColors[area.code]}}/><span>{breakdownLabels[area.code]}</span><strong>{percent(area.episodes, opportunityTotal)}%</strong><small>{area.episodes} {area.episodes === 1 ? "story" : "stories"}</small></button>)}</div></div><p className="caveat-v3">Percentages describe 17 selected public stories. They do not estimate how common each problem is among all Google Photos users.</p></article>
          <article className="panel-v3 source-panel-v3"><div className="panel-head-v3"><div><span className="section-label-v3">Evidence mix</span><h2>Every finding links to a public source</h2></div></div><div className="source-chart-v3"><div className="donut-v3 source" style={{background: sourceDonut} as CSSProperties}><span><strong>{corpus.evidence_count}</strong><small>stories</small></span></div><div className="source-legend-v3">{system.bySource.map((source, index) => { const sourceKind = source.source_kind ?? "unknown"; return <div key={sourceKind}><i style={{background: ["#1a73e8", "#34a853", "#f9ab00"][index]}}/><span>{sourceMethods[sourceKind]?.name ?? friendlyLabel(sourceKind)}</span><strong>{percent(source.evidence_count, corpus.evidence_count)}%</strong></div>; })}</div></div><button className="wide-v3" onClick={() => { setLibraryView("sources"); navigate("library"); }}>See how each source is collected →</button></article>
        </div>

        <div className="section-intro-v3"><div><span className="section-label-v3">The four required questions</span><h2>The engine gives a direct, evidence-linked answer to each one</h2></div><button className="secondary-v3" onClick={() => navigate("ask")}>Ask a deeper question</button></div>
        <div className="question-grid-v3">{system.research.questions.map((question, index) => <article key={question.id}><span>0{index + 1}</span><h3>{question.question}</h3><p>{questionSummaries[question.id]}</p><div className="question-numbers-v3"><strong>{question.patterns.length}</strong><small>themes found</small><strong>{percent(question.observedEpisodes, system.research.coverage.codedEpisodes)}%</strong><small>of stories say this clearly</small></div><div className="chips-v3">{question.patterns.slice(0,4).map((pattern) => <span key={pattern.code}>{friendlyLabel(pattern.code)} · {pattern.episodes}</span>)}</div><button onClick={() => { navigate("ask"); void askEvidence(templateForQuestion(question.id)); }}>See AI answer →</button></article>)}</div>
      </section>}

      {system.kind === "online" && view === "ask" && <section className="page-v3">
        <div className="page-heading-v3"><span className="kicker-v3">Ask the evidence</span><h1>Choose a research question. Get an answer with proof.</h1><p>Groq summarizes only the included stories. Every answer keeps its evidence links and a clear limitation.</p></div>
        <div className="ask-layout-v3"><aside className="question-menu-v3">{analysisTemplates.map((template,index) => { const active = analysis.kind === "loading" ? analysis.templateId === template.id : analysis.kind === "ready" ? analysis.data.templateId === template.id : false; return <button className={active ? "active" : ""} key={template.id} onClick={() => void askEvidence(template.id)}><span>0{index+1}</span><div><strong>{template.label}</strong><small>{template.helper}</small></div><i>→</i></button>; })}</aside><div className="answer-space-v3" aria-live="polite">
          {analysis.kind === "idle" && <div className="answer-empty-v3"><span>✦</span><h2>Select a question to begin</h2><p>You will see a short answer, the main insights, and the public evidence behind them.</p><div><i>AI synthesis</i><i>Human-checked evidence</i><i>Direct source links</i></div></div>}
          {analysis.kind === "loading" && <div className="answer-empty-v3"><div className="loader-v3"/><h2>Reading the included stories…</h2><p>Connecting repeated patterns to the original user words.</p></div>}
          {analysis.kind === "error" && <div className="answer-empty-v3"><span>!</span><h2>Answer unavailable</h2><p>{analysis.message}</p></div>}
          {analysis.kind === "ready" && <article className="answer-v3"><div className="answer-top-v3"><span>✦ AI answer grounded in {analysis.data.provenance.includedStories} stories</span><small>{analysis.data.provenance.cacheStatus === "hit" ? "Saved analysis" : "New analysis"}</small></div><h2>{analysis.data.question}</h2><p className="answer-lead-v3">{analysis.data.analysis.answer}</p><div className="insights-v3">{analysis.data.analysis.insights.map((insight,index) => <section key={`${insight.label}-${index}`}><span>{String(index+1).padStart(2,"0")}</span><div><h3>{insight.label}</h3><p>{insight.finding}</p><aside><strong>Why it matters</strong>{insight.implication}</aside></div></section>)}</div><details className="evidence-drawer-v3" open><summary><span>Evidence used</span><strong>{analysis.data.evidence.length} linked excerpts</strong></summary><div>{analysis.data.evidence.map((item) => <blockquote key={item.id}><p>“{item.sourceText}”</p><footer><span>{sourceMethods[item.sourceKind]?.name ?? friendlyLabel(item.sourceKind)}</span><a href={item.canonicalUrl} target="_blank" rel="noreferrer">Open source ↗</a></footer></blockquote>)}</div></details><div className="answer-caveat-v3"><strong>Keep in mind</strong><p>{analysis.data.analysis.caveat}</p></div></article>}
        </div></div>
      </section>}

      {system.kind === "online" && view === "compare" && <section className="page-v3">
        <div className="page-heading-v3 split"><div><span className="kicker-v3">Compare retrieval problems</span><h1>Finding a remembered photo can break in five different places</h1><p>Choose a step to see the user problem, outcome, metric, and source-linked examples.</p></div><aside><strong>Directional evidence</strong><span>17 selected stories · not market sizing</span></aside></div>
        <div className="problem-tabs-v3">{system.opportunity.areas.map((area,index) => <button className={activeOpportunity === area.code ? "active" : ""} key={area.code} onClick={() => setActiveOpportunity(area.code)} style={{"--accent": opportunityColors[area.code]} as CSSProperties}><span>0{index+1}</span><strong>{area.journeyStep}</strong><small>{percent(area.episodes, opportunityTotal)}% · {area.episodes} {area.episodes===1?"story":"stories"}</small></button>)}</div>
        {selectedOpportunity && <div className="selected-v3"><article className="problem-detail-v3" style={{"--accent":opportunityColors[selectedOpportunity.code]} as CSSProperties}><div className="problem-top-v3"><span>{selectedOpportunity.journeyStep}</span><strong>{selectedOpportunity.sourceKinds.length>1?"Seen across multiple sources":"Early signal"}</strong></div><h2>{breakdownLabels[selectedOpportunity.code]}</h2><p className="problem-lead-v3">{selectedOpportunity.userProblem}</p><div className="problem-stats-v3"><div><strong>{percent(selectedOpportunity.episodes,opportunityTotal)}%</strong><span>of classified breakdowns</span></div><div><strong>{selectedOpportunity.unresolvedEpisodes}</strong><span>still unresolved</span></div><div><strong>{selectedOpportunity.workaroundEpisodes}</strong><span>used a workaround</span></div></div><div className="measure-v3"><span>What must improve</span><strong>{selectedOpportunity.productOutcome}</strong><small>Leading metric: {selectedOpportunity.leadingMetric}</small></div><div className="bars-v3">{system.opportunity.areas.map((area) => <button key={area.code} onClick={() => setActiveOpportunity(area.code)}><span>{breakdownLabels[area.code]}</span><i><b style={{width:`${percent(area.episodes,opportunityTotal)}%`,background:opportunityColors[area.code]}}/></i><strong>{percent(area.episodes,opportunityTotal)}%</strong></button>)}</div></article><aside className="stories-v3"><div className="drawer-head-v3"><div><span>Real user evidence</span><h2>{selectedOpportunity.examples.length} linked examples</h2></div><small>Click a source to verify it</small></div>{selectedOpportunity.examples.length ? selectedOpportunity.examples.map((example) => <blockquote key={example.id}><p>“{example.source_text}”</p><strong>{example.rationale}</strong><footer><span>{sourceMethods[example.source_kind]?.name}</span><a href={example.canonical_url} target="_blank" rel="noreferrer">Open public source ↗</a></footer></blockquote>) : <div className="no-evidence-v3"><span>0</span><p>No verified story is available for this problem yet.</p></div>}</aside></div>}
        <article className="focus-v3"><span className="section-label-v3">Provisional problem definition</span><h2>{system.problem.problemStatement}</h2><div><p><strong>Target segment</strong>{system.problem.targetSegment}</p><p><strong>Root cause</strong>{system.problem.rootCause}</p><p><strong>Workarounds today</strong>{system.problem.currentWorkarounds.join(" · ") || "No workaround stated."}</p></div><small>{system.problem.caveat}</small></article>
      </section>}

      {system.kind === "online" && view === "library" && <section className="page-v3">
        <div className="page-heading-v3 split library-head-v3"><div><span className="kicker-v3">Evidence library</span><h1>See the source before trusting the insight</h1><p>Inspect how data enters the engine, or read the exact stories behind the analysis.</p></div><a className="secondary-v3 download-v3" href="/api/evidence.csv" download>Download included stories ↓</a></div>
        <div className="toggle-v3"><button className={libraryView === "sources" ? "active" : ""} onClick={() => setLibraryView("sources")}>How data gets here</button><button className={libraryView === "stories" ? "active" : ""} onClick={() => setLibraryView("stories")}>Read {corpus.evidence_count} user stories</button></div>
        {libraryView === "sources" && <><section className="pipeline-panel-v3"><div className="panel-head-v3"><div><span className="section-label-v3">The evidence pipeline</span><h2>AI organizes evidence. It does not invent the evidence.</h2></div></div><div className="pipeline-v3"><div><span>1</span><i>◎</i><strong>Public conversation</strong><small>Review, post, comment, or support thread</small></div><b>→</b><div><span>2</span><i>⇩</i><strong>Collector or import</strong><small>Original text, URL, platform, and date</small></div><b>→</b><div><span>3</span><i>✦</i><strong>Groq structures it</strong><small>Memory clues, behavior, and failure point</small></div><b>→</b><div><span>4</span><i>✓</i><strong>Human checks it</strong><small>Compared with the original public source</small></div><b>→</b><div><span>5</span><i>▥</i><strong>D1 powers insights</strong><small>Counts use database rules, not AI guesses</small></div></div></section><div className="source-cards-v3">{system.sourceCoverage.sources.map((source) => { const description=sourceMethods[source.sourceKind]; return <article className={source.admittedEpisodes>0?"included":""} key={source.sourceKind}><div className="source-head-v3"><span className={source.status === "attempted"?"attempted":""}>{source.status === "attempted"?"Attempted":"Not connected"}</span><strong>{description?.name ?? friendlyLabel(source.sourceKind)}</strong></div><p>{description?.note}</p><div className="source-counts-v3"><div><strong>{source.uniqueCandidates.toLocaleString()}</strong><span>unique items screened</span></div><div><strong>{source.admittedEpisodes}</strong><span>stories included</span></div></div><footer><span>{description?.method}</span><strong>{description?.api}</strong></footer></article>; })}</div><div className="integrity-v3"><div><span>✓</span><p><strong>{corpus.verified_count} of {corpus.evidence_count} stories are human checked.</strong> Raw source, AI interpretation, and audit stay separate.</p></div><div><span>−</span><p><strong>{system.publicExcluded} public items and {system.simulatedExcluded} illustrative records are excluded.</strong> Generic complaints do not become evidence.</p></div><div><span>!</span><p><strong>Large review volume is not relevant evidence by itself.</strong> The App Store supplied many candidates but no qualifying story.</p></div></div></>}
        {libraryView === "stories" && <><div className="story-tools-v3"><label><span>⌕</span><input value={storySearch} onChange={(event)=>setStorySearch(event.target.value)} placeholder="Search people, passport, pet, place…"/></label><select value={storySource} onChange={(event)=>setStorySource(event.target.value)}><option value="all">All public sources</option>{system.bySource.map((source)=>{ const sourceKind = source.source_kind ?? "unknown"; return <option key={sourceKind} value={sourceKind}>{sourceMethods[sourceKind]?.name ?? friendlyLabel(sourceKind)}</option>; })}</select><span>{filteredEvidence.length} {filteredEvidence.length===1?"story":"stories"}</span></div><div className="evidence-grid-v3">{filteredEvidence.map((item)=>{const clues=parseStringArray(item.remembered_clues_json); const forgotten=parseStringArray(item.forgotten_context_json); return <article key={item.id}><div className="evidence-top-v3"><span>{sourceMethods[item.source_kind]?.name ?? item.platform}</span><strong>✓ Human checked</strong></div><blockquote>“{item.evidence_excerpt}”</blockquote><h2>{item.retrieval_target}</h2><div className="tags-v3">{clues.slice(0,4).map((clue)=><span key={clue}>Remembered · {clue}</span>)}{forgotten.map((detail)=><span className="forgotten" key={detail}>Forgotten · {detail}</span>)}</div><footer><span>{friendlyLabel(item.failure_stage)} · {friendlyLabel(item.retrieval_outcome)}</span><a href={item.canonical_url} target="_blank" rel="noreferrer">Open source ↗</a></footer></article>;})}</div>{!filteredEvidence.length&&<div className="no-results-v3"><span>⌕</span><h2>No story matches this filter</h2><p>Try a broader word or choose all public sources.</p></div>}</>}
      </section>}
    </main>
    <nav className="mobile-nav-v3">{navItems.map((item)=><button className={view===item.id?"active":""} key={item.id} onClick={()=>navigate(item.id)}><span>{item.icon}</span><small>{item.label.replace(" the evidence","")}</small></button>)}</nav>
  </div>;
}
