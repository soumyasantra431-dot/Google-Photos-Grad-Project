import { useEffect, useState } from "react";

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

function App() {
  const [system, setSystem] = useState<SystemState>({ kind: "loading" });

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
              <a className="button button-primary" href="#research-questions">Explore the four research questions</a>
              <a className="button button-secondary" href="#opportunity-map">See where finding breaks</a>
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
                  <p className="question-count">{finding.observedEpisodes} of {system.research.coverage.codedEpisodes} included stories mention this clearly</p>
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
            <div className="metric-chain" aria-label="Retrieval outcome chain">
              {system.opportunity.metric.journey.map((step, index) => (
                <div className="metric-chain-step" key={step.code}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step.journeyStep}</strong>
                  <p>{step.productOutcome}</p>
                  <small>{step.leadingMetric}</small>
                </div>
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

            <div className="opportunity-grid">
              {system.opportunity.areas.map((area) => (
                <article className={`opportunity-card ${area.episodes === 0 ? "opportunity-card-empty" : ""}`} key={area.code}>
                  <div className="opportunity-topline">
                    <span>{area.journeyStep}</span>
                    <span>{evidenceStrengthLabel(area.evidenceStrength)}</span>
                  </div>
                  <h3>{breakdownLabels[area.code]}</h3>
                  <p className="opportunity-problem">{area.userProblem}</p>
                  <div className="opportunity-counts">
                    <div><strong>{area.episodes}</strong><span>{area.episodes === 1 ? "real user story" : "real user stories"}</span></div>
                    <div><strong>{area.sourceKinds.length}</strong><span>{area.sourceKinds.length === 1 ? "source type" : "source types"}</span></div>
                    <div><strong>{area.unresolvedEpisodes}</strong><span>still not found</span></div>
                  </div>
                  <div className="outcome-box">
                    <span>What must improve</span>
                    <strong>{area.productOutcome}</strong>
                    <small>How we would measure it · {area.leadingMetric}</small>
                  </div>
                  {area.examples.length > 0 && (
                    <details className="mechanism-evidence">
                      <summary>See the supporting user quotes</summary>
                      {area.examples.map((example) => (
                        <div key={example.id}>
                          <p>“{example.source_text}”</p>
                          <small>{example.rationale}</small>
                          <a href={example.canonical_url} target="_blank" rel="noreferrer">Source ↗</a>
                        </div>
                      ))}
                    </details>
                  )}
                  <details className="diagnostic-note"><summary>Technical measurement details</summary><p>{area.diagnosticMetrics.join(" · ")}</p></details>
                </article>
              ))}
            </div>
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
