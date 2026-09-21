import { useEffect, useState, type CSSProperties } from "react";

type CorpusStats = {
  source_count: number;
  document_count: number;
  evidence_count: number;
  verified_count: number;
};

type Evidence = {
  id: string;
  retrieval_target: string;
  evidence_excerpt: string;
  remembered_clues_json: string;
  forgotten_context_json: string;
  search_attempt: string | null;
  failure_stage: string;
  retrieval_outcome: string;
  extraction_confidence: number;
  model_name: string;
  is_human_verified: number;
  audit_verdict: string | null;
  audit_notes: string | null;
  source_kind: string;
  platform: string;
  canonical_url: string;
  published_at: string | null;
};

type CollectionRun = {
  id: string;
  source_kind: string;
  status: string;
  records_seen: number;
  records_stored: number;
  completed_at: string | null;
};

type Breakdown = { source_kind?: string; failure_stage?: string; evidence_count: number };

type ResearchQuestions = {
  coverage: { admittedEpisodes: number; codedEpisodes: number; humanVerifiedEpisodes: number; sourceKinds: string[]; truncated: boolean };
  questions: Array<{
    id: string;
    question: string;
    caveat: string;
    observedEpisodes: number;
    evidenceState: "not_observed" | "early_directional" | "multi_source_directional";
    patterns: Array<{
      code: string;
      episodes: number;
      examples: Array<{ id: string; source_text: string; canonical_url: string; source_kind: string }>;
    }>;
    reportedExactQueries?: Array<{ query: string; id: string; canonical_url: string }>;
  }>;
};

type SourceCoverage = {
  sources: Array<{
    sourceKind: string;
    status: "attempted" | "not_connected";
    runCount: number;
    recordsProcessedAcrossRuns: number;
    initiallyRetainedAcrossRuns: number;
    uniqueCandidates: number;
    modelScreenedCandidates: number;
    admittedEpisodes: number;
  }>;
  note: string;
};

type OpportunityMap = {
  metric: {
    businessMetric: string;
    productOutcome: string;
    journey: Array<{ code: string; journeyStep: string; productOutcome: string; leadingMetric: string }>;
  };
  coverage: { admittedEpisodes: number; mechanismCodedEpisodes: number; uncodedEpisodes: number; humanVerifiedEpisodes: number };
  comparison: {
    mostObservedMechanism: { code: string; episodes: number; sourceKinds: string[] } | null;
    caveat: string;
  };
  areas: Array<{
    code: string;
    journeyStep: string;
    userProblem: string;
    productOutcome: string;
    leadingMetric: string;
    diagnosticMetrics: string[];
    episodes: number;
    sourceKinds: string[];
    unresolvedEpisodes: number;
    workaroundEpisodes: number;
    humanVerifiedEpisodes: number;
    evidenceStrength: "not_observed" | "early_directional" | "multi_source_directional";
    examples: Array<{ id: string; source_text: string; canonical_url: string; source_kind: string; rationale: string }>;
  }>;
};

type ProblemDefinition = {
  status: "provisional_focus";
  decision: string;
  targetSegment: string;
  retrievalScenario: string;
  rootCause: string;
  problemStatement: string;
  currentWorkarounds: string[];
  userValue: string;
  businessValue: string;
  productOutcome: string;
  leadingMetric: string;
  evidence: {
    includedStories: number;
    focusStories: number;
    sourceKinds: string[];
    unresolvedStories: number;
    workaroundStories: number;
    humanCheckedStories: number;
    examples: Array<{ id: string; source_text: string; canonical_url: string; source_kind: string; rationale: string }>;
  };
  openQuestions: string[];
  caveat: string;
};

type AnalysisTemplateId = "photo_types" | "remembered_clues" | "forgotten_context" | "search_language" | "compare_breakdowns" | "choose_opportunity";

type GroundedAnalysis = {
  templateId: AnalysisTemplateId;
  question: string;
  analysis: {
    answer: string;
    insights: Array<{ label: string; finding: string; evidenceIds: string[]; implication: string }>;
    caveat: string;
  };
  evidence: Array<{ id: string; sourceText: string; sourceKind: string; canonicalUrl: string }>;
  provenance: {
    model: string;
    includedStories: number;
    generatedAt: string;
    cacheStatus: "hit" | "generated";
    method: string;
  };
};

type AnalysisState =
  | { kind: "idle" }
  | { kind: "loading"; templateId: AnalysisTemplateId }
  | { kind: "ready"; data: GroundedAnalysis }
  | { kind: "error"; message: string };

type SystemState =
  | { kind: "loading" }
  | {
      kind: "online";
      checkedAt: string;
      corpus: CorpusStats;
      simulatedExcluded: number;
      publicExcluded: number;
      evidence: Evidence[];
      runs: CollectionRun[];
      bySource: Breakdown[];
      byFailureStage: Breakdown[];
      research: ResearchQuestions;
      sourceCoverage: SourceCoverage;
      opportunity: OpportunityMap;
      problem: ProblemDefinition;
    }
  | { kind: "offline" };

const stages = [
  { number: "01", title: "Collect evidence", description: "Bring public conversations into one traceable research corpus." },
  { number: "02", title: "Structure memory clues", description: "Separate what people remember, forget, try, and experience." },
  { number: "03", title: "Compare where people get stuck", description: "Compare failures in describing, searching, scanning, retrying, and reaching the photo." },
  { number: "04", title: "Prioritise an opportunity", description: "Connect evidence to a focused product outcome and validation plan." },
];

const emptyStats: CorpusStats = { source_count: 0, document_count: 0, evidence_count: 0, verified_count: 0 };

const analysisTemplates: Array<{ id: AnalysisTemplateId; label: string; shortLabel: string }> = [
  { id: "photo_types", label: "What kinds of old photos do users struggle to retrieve?", shortLabel: "Hard-to-find photo types" },
  { id: "remembered_clues", label: "What information do people actually remember about a photo?", shortLabel: "Remembered clues" },
  { id: "forgotten_context", label: "What information have they forgotten?", shortLabel: "Forgotten details" },
  { id: "search_language", label: "How do users formulate searches when memory is incomplete?", shortLabel: "Search language" },
  { id: "compare_breakdowns", label: "How do the five retrieval problems compare?", shortLabel: "Compare breakdowns" },
  { id: "choose_opportunity", label: "Which opportunity should we validate first?", shortLabel: "Choose an opportunity" },
];

const opportunityColors: Record<string, string> = {
  clue_expression: "#e8710a",
  clue_interpretation: "#1a73e8",
  result_evaluation: "#9334e6",
  search_refinement: "#0097a7",
  library_access: "#5f6368",
};

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function friendlyLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const breakdownLabels: Record<string, string> = {
  clue_expression: "Clue cannot be entered",
  clue_interpretation: "Search misunderstands the clue",
  result_evaluation: "Right photo is hard to spot",
  search_refinement: "No useful next step after a miss",
  library_access: "Photo exists but is hard to reach",
};

const failureLabels: Record<string, string> = {
  expression: "Could not use the remembered clue",
  interpretation: "Search misunderstood the clue",
  evaluation: "Could not spot the right result",
  refinement: "Could not improve the failed search",
  unknown: "Breakdown unclear",
};

function evidenceStrengthLabel(value: "not_observed" | "early_directional" | "multi_source_directional"): string {
  if (value === "multi_source_directional") return "Repeated across source types";
  if (value === "early_directional") return "Early signal";
  return "No verified example yet";
}

function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function conicGradient(items: Array<{ value: number; color: string }>): string {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!total) return "conic-gradient(#e8eaed 0deg 360deg)";
  let cursor = 0;
  const stops = items.map((item) => {
    const start = cursor;
    cursor += (item.value / total) * 360;
    return `${item.color} ${start}deg ${cursor}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function App() {
  const [system, setSystem] = useState<SystemState>({ kind: "loading" });
  const [analysis, setAnalysis] = useState<AnalysisState>({ kind: "idle" });
  const [activeOpportunity, setActiveOpportunity] = useState("clue_interpretation");

  useEffect(() => {
    const controller = new AbortController();

    async function loadSystem() {
      try {
        const [healthResponse, statsResponse, evidenceResponse, runsResponse, researchResponse, coverageResponse, opportunityResponse, problemResponse] = await Promise.all([
          fetch("/api/health", { signal: controller.signal }),
          fetch("/api/stats", { signal: controller.signal }),
          fetch("/api/evidence?limit=12", { signal: controller.signal }),
          fetch("/api/collection-runs", { signal: controller.signal }),
          fetch("/api/research-questions", { signal: controller.signal }),
          fetch("/api/source-coverage", { signal: controller.signal }),
          fetch("/api/opportunity-map", { signal: controller.signal }),
          fetch("/api/problem-definition", { signal: controller.signal }),
        ]);
        if (![healthResponse, statsResponse, evidenceResponse, runsResponse, researchResponse, coverageResponse, opportunityResponse, problemResponse].every((response) => response.ok)) {
          throw new Error("System check failed");
        }

        const health = (await healthResponse.json()) as { checkedAt: string; database: string };
        const stats = (await statsResponse.json()) as {
          corpus?: CorpusStats;
          simulatedEvidenceExcluded?: number;
          publicEvidenceExcluded?: number;
          bySource?: Breakdown[];
          byFailureStage?: Breakdown[];
        };
        const evidence = (await evidenceResponse.json()) as { data?: Evidence[] };
        const runs = (await runsResponse.json()) as { data?: CollectionRun[] };
        const research = (await researchResponse.json()) as ResearchQuestions;
        const sourceCoverage = (await coverageResponse.json()) as SourceCoverage;
        const opportunity = (await opportunityResponse.json()) as OpportunityMap;
        const problem = (await problemResponse.json()) as ProblemDefinition;
        if (health.database !== "connected") throw new Error("Database unavailable");

        setSystem({
          kind: "online",
          checkedAt: health.checkedAt,
          corpus: stats.corpus ?? emptyStats,
          simulatedExcluded: stats.simulatedEvidenceExcluded ?? 0,
          publicExcluded: stats.publicEvidenceExcluded ?? 0,
          evidence: evidence.data ?? [],
          runs: (runs.data ?? []).filter((run) => run.status === "completed").slice(0, 4),
          bySource: stats.bySource ?? [],
          byFailureStage: stats.byFailureStage ?? [],
          research,
          sourceCoverage,
          opportunity,
          problem,
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
  const evidence = system.kind === "online" ? system.evidence : [];
  const runs = system.kind === "online" ? system.runs : [];
  const screenedCandidates = system.kind === "online"
    ? system.sourceCoverage.sources.reduce((total, source) => total + source.uniqueCandidates, 0)
    : 0;
  const opportunityTotal = system.kind === "online"
    ? system.opportunity.areas.reduce((total, area) => total + area.episodes, 0)
    : 0;
  const selectedOpportunity = system.kind === "online"
    ? system.opportunity.areas.find((area) => area.code === activeOpportunity) ?? system.opportunity.areas[0]
    : undefined;
  const opportunityDonut = system.kind === "online"
    ? conicGradient(system.opportunity.areas.map((area) => ({ value: area.episodes, color: opportunityColors[area.code] ?? "#9aa0a6" })))
    : conicGradient([]);
  const sourceDonut = system.kind === "online"
    ? conicGradient(system.bySource.map((source, index) => ({ value: source.evidence_count, color: ["#1a73e8", "#e8710a", "#9334e6", "#0097a7"][index] ?? "#5f6368" })))
    : conicGradient([]);
  const includedRate = percent(corpus.evidence_count, screenedCandidates);

  async function askEvidence(templateId: AnalysisTemplateId) {
    setAnalysis({ kind: "loading", templateId });
    try {
      const response = await fetch(`/api/grounded-analysis?template=${encodeURIComponent(templateId)}`);
      if (!response.ok) throw new Error("The AI analysis could not be generated right now.");
      setAnalysis({ kind: "ready", data: await response.json() as GroundedAnalysis });
    } catch (error) {
      setAnalysis({ kind: "error", message: error instanceof Error ? error.message : "The AI analysis could not be generated right now." });
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Photo Recall home">
          <span className="brand-mark" aria-hidden="true">
            <span className="petal petal-blue" />
            <span className="petal petal-red" />
            <span className="petal petal-yellow" />
            <span className="petal petal-green" />
          </span>
          <span>Photo Recall Lab</span>
        </a>
        <div className={`status status-${system.kind}`} aria-live="polite">
          <span className="status-dot" />
          {system.kind === "loading" && "Checking discovery engine"}
          {system.kind === "online" && "Discovery engine online"}
          {system.kind === "offline" && "Discovery engine unavailable"}
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">AI-powered product discovery</p>
            <h1>Understand why remembered photos still feel impossible to find.</h1>
            <p className="hero-intro">
              See what people remember, what they try, where finding breaks, and the exact public
              conversation behind every finding.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#ask-evidence">Ask the evidence</a>
              <a className="button button-secondary" href="#opportunity-map">Compare retrieval problems</a>
              <a className="text-link" href="/api/evidence.csv" download>Download evidence for Excel ↓</a>
            </div>
          </div>

          <div className="memory-card" aria-label="Example memory clues">
            <div className="memory-card-header">
              <span className="memory-icon" aria-hidden="true">?</span>
              <span>A half-remembered moment</span>
            </div>
            <blockquote>“That tiny café from our Goa trip—the one with blue chairs.”</blockquote>
            <div className="clue-list">
              <span>Place · Goa</span><span>Object · blue chairs</span><span>Context · trip</span>
              <span className="clue-missing">Forgotten · exact date</span>
            </div>
          </div>
        </section>

        {system.kind === "online" && (
          <section className="evidence-snapshot" aria-labelledby="snapshot-title">
            <div className="section-heading compact-heading">
              <p className="eyebrow">Start here</p>
              <h2 id="snapshot-title">One glance shows the strongest signal—and how carefully it was filtered.</h2>
              <p>Percentages below describe the {corpus.evidence_count} included stories only. They are not estimates of all Google Photos users.</p>
            </div>
            <div className="snapshot-grid">
              <article className="visual-card">
                <div className="visual-card-copy">
                  <span className="visual-kicker">Retrieval breakdowns</span>
                  <strong>{percent(system.opportunity.comparison.mostObservedMechanism?.episodes ?? 0, opportunityTotal)}%</strong>
                  <p>of included stories point to search misunderstanding the remembered clue—the largest observed breakdown.</p>
                </div>
                <div className="donut-wrap">
                  <div className="donut" style={{ background: opportunityDonut } as CSSProperties}><span>{opportunityTotal}<small>stories</small></span></div>
                  <div className="chart-legend">
                    {system.opportunity.areas.map((area) => (
                      <button type="button" key={area.code} onClick={() => { setActiveOpportunity(area.code); document.getElementById("opportunity-map")?.scrollIntoView(); }}>
                        <i style={{ background: opportunityColors[area.code] }} />
                        <span>{breakdownLabels[area.code]}</span>
                        <strong>{percent(area.episodes, opportunityTotal)}%</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </article>

              <article className="visual-card">
                <div className="visual-card-copy">
                  <span className="visual-kicker">Evidence funnel</span>
                  <strong>{includedRate}%</strong>
                  <p>of screened public items met the strict definition of a remembered-photo retrieval story.</p>
                </div>
                <div className="funnel" aria-label={`${screenedCandidates} screened, ${corpus.evidence_count} included, ${corpus.verified_count} human checked`}>
                  <div className="funnel-row"><span>Screened</span><strong>{screenedCandidates.toLocaleString()}</strong><i style={{ width: "100%" }} /></div>
                  <div className="funnel-row"><span>Included</span><strong>{corpus.evidence_count}</strong><i style={{ width: `${Math.max(includedRate, 3)}%` }} /></div>
                  <div className="funnel-row"><span>Human checked</span><strong>{corpus.verified_count}</strong><i style={{ width: `${Math.max(percent(corpus.verified_count, screenedCandidates), 3)}%` }} /></div>
                </div>
                <p className="chart-note">A small inclusion rate is a quality control result—not weak collection volume.</p>
              </article>

              <article className="visual-card source-card">
                <div className="visual-card-copy">
                  <span className="visual-kicker">Included source mix</span>
                  <strong>{system.bySource.length}</strong>
                  <p>public source types currently contribute admissible retrieval evidence.</p>
                </div>
                <div className="donut-wrap compact-donut">
                  <div className="donut" style={{ background: sourceDonut } as CSSProperties}><span>{corpus.evidence_count}<small>stories</small></span></div>
                  <div className="source-list">
                    {system.bySource.map((source, index) => (
                      <div key={source.source_kind ?? `source-${index}`}><i style={{ background: ["#1a73e8", "#e8710a", "#9334e6", "#0097a7"][index] ?? "#5f6368" }} /><span>{friendlyLabel(source.source_kind ?? "unknown")}</span><strong>{percent(source.evidence_count, corpus.evidence_count)}%</strong></div>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </section>
        )}

        {system.kind === "online" && (
          <section className="ask-evidence" id="ask-evidence">
            <div className="section-heading">
              <p className="eyebrow">Ask the evidence</p>
              <h2>Choose a research question. Groq answers only from the included, source-linked stories.</h2>
              <p>This is guided qualitative analysis—not a general chatbot. Fixed D1 queries calculate counts; the LLM explains patterns and must cite valid evidence IDs.</p>
            </div>
            <div className="ask-layout">
              <div className="template-panel">
                <span className="panel-label">Ready-made questions</span>
                {analysisTemplates.map((template, index) => (
                  <button
                    type="button"
                    className={analysis.kind === "ready" && analysis.data.templateId === template.id ? "template-button template-button-active" : "template-button"}
                    key={template.id}
                    onClick={() => void askEvidence(template.id)}
                    disabled={analysis.kind === "loading"}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><strong>{template.shortLabel}</strong><small>{template.label}</small></div>
                    <b aria-hidden="true">→</b>
                  </button>
                ))}
              </div>

              <div className="answer-panel" aria-live="polite">
                {analysis.kind === "idle" && (
                  <div className="answer-empty">
                    <span aria-hidden="true">✦</span>
                    <h3>Start with one of the four required research questions.</h3>
                    <p>The answer will show AI synthesis, product implications, and the exact public evidence behind it.</p>
                    <button type="button" className="button button-primary" onClick={() => void askEvidence("photo_types")}>Analyze hard-to-find photo types</button>
                  </div>
                )}
                {analysis.kind === "loading" && (
                  <div className="answer-empty"><span className="analysis-spinner" /><h3>Reading the evidence…</h3><p>Groq is comparing the human-checked retrieval stories. It cannot search outside this corpus.</p></div>
                )}
                {analysis.kind === "error" && (
                  <div className="answer-empty"><span aria-hidden="true">!</span><h3>Analysis is temporarily unavailable.</h3><p>{analysis.message}</p><button type="button" className="button button-secondary" onClick={() => setAnalysis({ kind: "idle" })}>Choose another question</button></div>
                )}
                {analysis.kind === "ready" && (
                  <div className="answer-content">
                    <div className="answer-provenance"><span>AI analysis · {friendlyLabel(analysis.data.provenance.model)}</span><span>{analysis.data.provenance.includedStories} included stories · {analysis.data.provenance.cacheStatus === "hit" ? "saved analysis" : "generated now"}</span></div>
                    <h3>{analysis.data.question}</h3>
                    <p className="answer-summary">{analysis.data.analysis.answer}</p>
                    <div className="insight-list">
                      {analysis.data.analysis.insights.map((insight, index) => (
                        <article key={`${insight.label}-${index}`}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <div>
                            <h4>{insight.label}</h4>
                            <p>{insight.finding}</p>
                            <strong>Product implication</strong><p>{insight.implication}</p>
                            <details>
                              <summary>Open {insight.evidenceIds.length} cited {insight.evidenceIds.length === 1 ? "source" : "sources"}</summary>
                              {insight.evidenceIds.flatMap((id) => analysis.data.evidence.filter((item) => item.id === id)).map((item) => (
                                <blockquote key={item.id}>“{item.sourceText}” <a href={item.canonicalUrl} target="_blank" rel="noreferrer">{friendlyLabel(item.sourceKind)} source ↗</a></blockquote>
                              ))}
                            </details>
                          </div>
                        </article>
                      ))}
                    </div>
                    <div className="analysis-caveat"><strong>What this answer cannot claim</strong><p>{analysis.data.analysis.caveat}</p></div>
                    <details className="method-detail"><summary>How this AI answer was produced</summary><p>{analysis.data.provenance.method}</p><small>Generated {new Date(analysis.data.provenance.generatedAt).toLocaleString()}</small></details>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {system.kind === "online" && (
          <section className="research-questions" id="research-questions">
            <div className="section-heading">
              <p className="eyebrow">Question-led findings</p>
              <h2>Four research questions, answered in plain language from real user stories.</h2>
              <p>
                {screenedCandidates.toLocaleString()} public posts and reviews screened · {system.research.coverage.codedEpisodes} relevant stories included · {system.research.coverage.humanVerifiedEpisodes} human checked · {system.research.coverage.sourceKinds.length} {system.research.coverage.sourceKinds.length === 1 ? "source type" : "source types"}. These are research signals, not percentages of all Google Photos users.
              </p>
              {system.research.coverage.truncated && <p>Only the first 1,000 included stories are summarized here.</p>}
            </div>
            <div className="question-grid">
              {system.research.questions.map((finding, index) => (
                <article className="question-card" key={finding.id}>
                  <div className="question-topline"><span>QUESTION {index + 1}</span><span>{evidenceStrengthLabel(finding.evidenceState)}</span></div>
                  <h3>{finding.question}</h3>
                  <div className="question-share">
                    <strong>{percent(finding.observedEpisodes, system.research.coverage.codedEpisodes)}%</strong>
                    <div><span>{finding.observedEpisodes} of {system.research.coverage.codedEpisodes} included stories mention this clearly</span><i><b style={{ width: `${percent(finding.observedEpisodes, system.research.coverage.codedEpisodes)}%` }} /></i></div>
                  </div>
                  {finding.patterns.length > 0 ? (
                    <div className="pattern-list">
                      {finding.patterns.slice(0, 5).map((pattern) => (
                        <details key={pattern.code}>
                          <summary><span>{friendlyLabel(pattern.code)}</span><strong>{pattern.episodes} {pattern.episodes === 1 ? "story" : "stories"}</strong></summary>
                          {pattern.examples.map((example) => (
                            <p key={example.id}>“{example.source_text}” <a href={example.canonical_url} target="_blank" rel="noreferrer">Source ↗</a></p>
                          ))}
                        </details>
                      ))}
                    </div>
                  ) : <p className="question-unknown">{finding.id === "forgotten" ? "The included posts do not clearly say what was forgotten. A missing detail is not automatically treated as forgotten." : "The included posts do not yet show a clear pattern for this question."}</p>}
                  {finding.id === "searches" && <p className="exact-query-note">Exact user-reported queries: {finding.reportedExactQueries?.length ? finding.reportedExactQueries.map((item) => `“${item.query}”`).join(", ") : "none in the current corpus"}.</p>}
                  <p className="question-caveat">{finding.caveat}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {system.kind === "online" && (
          <section className="opportunity-section" id="opportunity-map">
            <div className="section-heading">
              <p className="eyebrow">Where finding breaks</p>
              <h2>Finding a remembered photo has five steps—and each can fail differently.</h2>
              <p>{system.opportunity.metric.productOutcome}</p>
            </div>
            <div className="metric-chain" aria-label="Choose a retrieval breakdown to compare">
              {system.opportunity.metric.journey.map((step, index) => (
                <button type="button" className={activeOpportunity === step.code ? "metric-chain-step metric-chain-step-active" : "metric-chain-step"} key={step.code} onClick={() => setActiveOpportunity(step.code)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step.journeyStep}</strong>
                  <p>{step.productOutcome}</p>
                  {(() => {
                    const stories = system.opportunity.areas.find((area) => area.code === step.code)?.episodes ?? 0;
                    return <small>{stories} {stories === 1 ? "story" : "stories"} · {percent(stories, opportunityTotal)}%</small>;
                  })()}
                </button>
              ))}
            </div>

            <div className="comparison-summary">
              <div>
                <span>Most common breakdown in the included stories</span>
                <strong>{system.opportunity.comparison.mostObservedMechanism ? breakdownLabels[system.opportunity.comparison.mostObservedMechanism.code] : "No breakdown observed"}</strong>
              </div>
              <div>
                <span>Stories checked against the five steps</span>
                <strong>{system.opportunity.coverage.mechanismCodedEpisodes} of {system.opportunity.coverage.admittedEpisodes} stories</strong>
              </div>
              <p>{system.opportunity.comparison.caveat}</p>
            </div>

            {selectedOpportunity && (
              <div className="opportunity-focus">
                <article className={`opportunity-card ${selectedOpportunity.episodes === 0 ? "opportunity-card-empty" : ""}`}>
                  <div className="opportunity-topline">
                    <span>{selectedOpportunity.journeyStep}</span>
                    <span>{evidenceStrengthLabel(selectedOpportunity.evidenceStrength)}</span>
                  </div>
                  <h3>{breakdownLabels[selectedOpportunity.code]}</h3>
                  <p className="opportunity-problem">{selectedOpportunity.userProblem}</p>
                  <div className="opportunity-counts">
                    <div><strong>{selectedOpportunity.episodes}</strong><span>{selectedOpportunity.episodes === 1 ? "real user story" : "real user stories"}</span></div>
                    <div><strong>{percent(selectedOpportunity.episodes, opportunityTotal)}%</strong><span>of included stories</span></div>
                    <div><strong>{selectedOpportunity.unresolvedEpisodes}</strong><span>still not found</span></div>
                  </div>
                  <div className="outcome-box">
                    <span>What must improve</span>
                    <strong>{selectedOpportunity.productOutcome}</strong>
                    <small>How we would measure it · {selectedOpportunity.leadingMetric}</small>
                  </div>
                  <details className="diagnostic-note"><summary>Technical measurement details</summary><p>{selectedOpportunity.diagnosticMetrics.join(" · ")}</p></details>
                </article>
                <aside className="opportunity-evidence-drawer">
                  <div><span>Evidence drawer</span><strong>{selectedOpportunity.examples.length} linked examples</strong></div>
                  {selectedOpportunity.examples.length > 0 ? selectedOpportunity.examples.map((example) => (
                    <blockquote key={example.id}>
                      “{example.source_text}”
                      <small>{example.rationale}</small>
                      <a href={example.canonical_url} target="_blank" rel="noreferrer">Open public source ↗</a>
                    </blockquote>
                  )) : <p>No verified example for this breakdown yet. That absence is preserved rather than filled with synthetic evidence.</p>}
                </aside>
              </div>
            )}
          </section>
        )}

        {system.kind === "online" && (
          <section className="problem-section" id="problem-definition">
            <div className="section-heading">
              <p className="eyebrow">Provisional product focus</p>
              <h2>Focus on people who remember the photo’s content—but search does not turn those clues into a useful shortlist.</h2>
              <p>{system.problem.caveat}</p>
            </div>

            <article className="problem-statement">
              <span>Problem statement</span>
              <p>{system.problem.problemStatement}</p>
            </article>

            <div className="problem-evidence-strip">
              <div><strong>{system.problem.evidence.focusStories}</strong><span>supporting stories</span></div>
              <div><strong>{system.problem.evidence.sourceKinds.length}</strong><span>source types</span></div>
              <div><strong>{system.problem.evidence.unresolvedStories}</strong><span>still unresolved</span></div>
              <div><strong>{system.problem.evidence.humanCheckedStories}</strong><span>human checked</span></div>
            </div>

            <div className="problem-grid">
              <article><span>Who we are focusing on</span><p>{system.problem.targetSegment}</p></article>
              <article><span>The moment to solve</span><p>{system.problem.retrievalScenario}</p></article>
              <article><span>Why finding fails</span><p>{system.problem.rootCause}</p></article>
              <article><span>What people do today</span><p>{system.problem.currentWorkarounds.length ? system.problem.currentWorkarounds.join(" · ") : "No workaround was stated in the focus stories."}</p></article>
              <article><span>Value to the user</span><p>{system.problem.userValue}</p></article>
              <article><span>Why it matters to Google Photos</span><p>{system.problem.businessValue}</p></article>
            </div>

            <div className="problem-outcome">
              <div><span>Product outcome</span><strong>{system.problem.productOutcome}</strong></div>
              <div><span>Leading metric</span><strong>{system.problem.leadingMetric}</strong></div>
            </div>

            <details className="open-questions">
              <summary>What primary research still needs to prove</summary>
              <ul>{system.problem.openQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
            </details>
          </section>
        )}

        <section className="principle-strip" aria-label="Research principles">
          <div><strong>Evidence first</strong><span>Every finding traces back to a public source.</span></div>
          <div><strong>Beyond sentiment</strong><span>We code memory, behavior, failure, and workaround.</span></div>
          <div><strong>Honest confidence</strong><span>Patterns in these stories are not percentages of all users.</span></div>
        </section>

        <section className="evidence-foundation" id="evidence">
          <div className="section-heading">
            <p className="eyebrow">What is in the research database</p>
            <h2>Many items are screened; only true remembered-photo retrieval stories are included.</h2>
            <p>The live D1 database excludes generic app complaints, simulations, and posts without a clear retrieval attempt. Download the included rows for Excel if you want to audit them yourself.</p>
          </div>

          <div className="metric-grid" aria-live="polite">
            <article className="metric-card"><span>Public items screened</span><strong>{screenedCandidates.toLocaleString()}</strong><small>Reviews, posts, and comments checked</small></article>
            <article className="metric-card"><span>Included user stories</span><strong>{corpus.evidence_count}</strong><small>Directly relevant to remembered-photo retrieval</small></article>
            <article className="metric-card"><span>Source types represented</span><strong>{system.kind === "online" ? system.bySource.length : 0}</strong><small>Independent public platforms with evidence</small></article>
            <article className="metric-card"><span>Human checked</span><strong>{corpus.verified_count}</strong><small>Compared with the original source</small></article>
          </div>

          <div className="integrity-note">
            <span className="integrity-icon" aria-hidden="true">✓</span>
            <div>
              <strong>Why the included number is smaller</strong>
              <p>
                {system.kind === "online" ? system.publicExcluded : 0} out-of-scope public records and {system.kind === "online" ? system.simulatedExcluded : 0} illustrative records are excluded from findings.
              </p>
            </div>
          </div>
        </section>

        {system.kind === "online" && (
          <section className="coverage-section" id="source-coverage">
            <div className="section-heading">
              <p className="eyebrow">Source coverage</p>
              <h2>What we tried to collect—and what produced useful retrieval stories.</h2>
              <p>“Attempted” means the collector ran. It does not mean the source contained a relevant remembered-photo story.</p>
            </div>
            <div className="coverage-list">
              {system.sourceCoverage.sources.map((source) => (
                <div className="coverage-row" key={source.sourceKind}>
                  <strong>{friendlyLabel(source.sourceKind)}</strong>
                  <span>{source.status === "attempted" ? `${source.uniqueCandidates} unique candidates · ${source.runCount} runs` : "Not connected"}</span>
                  <span>{source.admittedEpisodes} included {source.admittedEpisodes === 1 ? "story" : "stories"}</span>
                </div>
              ))}
            </div>
            <p className="coverage-note">{system.sourceCoverage.note} Public discussion volume is not a population estimate.</p>
          </section>
        )}

        <section className="explorer" id="explorer">
          <div className="section-heading">
            <p className="eyebrow">Read the real user stories</p>
            <h2>See the user’s words before accepting the AI’s interpretation.</h2>
            <p>Every card pairs an exact source excerpt with structured memory clues and a direct source link.</p>
          </div>

          {evidence.length > 0 ? (
            <div className="evidence-grid">
              {evidence.map((item) => {
                const clues = parseStringArray(item.remembered_clues_json);
                const forgotten = parseStringArray(item.forgotten_context_json);
                return (
                  <article className="evidence-card" key={item.id}>
                    <div className="evidence-meta">
                      <span>{item.platform}</span>
                      <span>{item.is_human_verified ? "Human reviewed" : "Awaiting human review"}</span>
                    </div>
                    <blockquote>“{item.evidence_excerpt}”</blockquote>
                    <h3>{item.retrieval_target}</h3>
                    <div className="evidence-tags">
                      {clues.map((clue) => <span key={`clue-${clue}`}>Remembered · {clue}</span>)}
                      {forgotten.map((detail) => <span className="tag-forgotten" key={`forgotten-${detail}`}>Forgotten · {detail}</span>)}
                    </div>
                    <div className="evidence-footer">
                      <span>{failureLabels[item.failure_stage] ?? friendlyLabel(item.failure_stage)} · {friendlyLabel(item.retrieval_outcome)}</span>
                      <a href={item.canonical_url} target="_blank" rel="noreferrer">Open source ↗</a>
                    </div>
                    {item.audit_notes && (
                      <details className="audit-detail">
                        <summary>Why this evidence was retained</summary>
                        <p>{item.audit_notes}</p>
                        <small>{item.model_name === "human_source_coding" ? "Human-coded after no valid model output" : `AI extraction confidence before review: ${Math.round(item.extraction_confidence * 100)}%`} · Audit: {friendlyLabel(item.audit_verdict ?? "unknown")}</small>
                      </details>
                    )}
                  </article>
                );
              })}
            </div>
          ) : <p className="empty-state">No relevant user stories have been included yet.</p>}
        </section>

        <section className="runs-section">
          <div className="section-heading">
            <p className="eyebrow">Collection diagnostics</p>
            <h2>See how much was scanned—and how much truly matched the question.</h2>
            <p>This prevents a large review count from being mistaken for strong retrieval evidence.</p>
          </div>
          <div className="run-list">
            {runs.map((run) => (
              <div className="run-row" key={run.id}>
                <div><strong>{friendlyLabel(run.source_kind)}</strong><span>{run.completed_at ? new Date(run.completed_at).toLocaleString() : "In progress"}</span></div>
                <div><strong>{run.records_seen}</strong><span>scanned</span></div>
                <div><strong>{run.records_stored}</strong><span>initially retained</span></div>
              </div>
            ))}
          </div>
        </section>

        <section className="architecture" id="architecture">
          <div className="section-heading">
            <p className="eyebrow">Evidence chain</p>
            <h2>One auditable path from public conversation to product opportunity</h2>
            <p>Raw user words stay separate from Groq’s interpretation, and fixed database rules calculate every count.</p>
          </div>
          <div className="stage-grid">
            {stages.map((stage) => <article className="stage-card" key={stage.number}><span className="stage-number">{stage.number}</span><h3>{stage.title}</h3><p>{stage.description}</p></article>)}
          </div>
        </section>

        <section className="next-step">
          <div><p className="eyebrow">Next research gate</p><h2>Validate the observed interpretation breakdown before choosing a solution.</h2></div>
          <p>The 17 stories now support a provisional focus, not market sizing. Test real retrieval tasks before treating clue misunderstanding as the final product opportunity.</p>
        </section>
      </main>

      <footer>
        <span>Photo Recall Discovery Engine</span>
        <span>{system.kind === "online" ? `Database checked ${new Date(system.checkedAt).toLocaleTimeString()}` : "Evidence system"}</span>
      </footer>
    </div>
  );
}

export default App;
