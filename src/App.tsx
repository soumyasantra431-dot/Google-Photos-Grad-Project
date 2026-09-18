import { useEffect, useState } from "react";

type CorpusStats = {
  source_count: number;
  document_count: number;
  evidence_count: number;
  verified_count: number;
};

type SystemState =
  | { kind: "loading" }
  | { kind: "online"; checkedAt: string; corpus: CorpusStats; simulatedExcluded: number }
  | { kind: "offline" };

const stages = [
  {
    number: "01",
    title: "Collect evidence",
    description: "Bring public conversations into one traceable research corpus.",
  },
  {
    number: "02",
    title: "Structure memory clues",
    description: "Separate what people remember, forget, try, and experience.",
  },
  {
    number: "03",
    title: "Compare breakdowns",
    description: "Find where expression, interpretation, evaluation, or recovery fails.",
  },
  {
    number: "04",
    title: "Prioritise an opportunity",
    description: "Connect evidence to a focused product outcome and validation plan.",
  },
];

const emptyStats: CorpusStats = {
  source_count: 0,
  document_count: 0,
  evidence_count: 0,
  verified_count: 0,
};

function App() {
  const [system, setSystem] = useState<SystemState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadSystem() {
      try {
        const [healthResponse, statsResponse] = await Promise.all([
          fetch("/api/health", { signal: controller.signal }),
          fetch("/api/stats", { signal: controller.signal }),
        ]);
        if (!healthResponse.ok || !statsResponse.ok) throw new Error("System check failed");

        const health = (await healthResponse.json()) as { checkedAt: string; database: string };
        const stats = (await statsResponse.json()) as {
          corpus?: CorpusStats;
          simulatedEvidenceExcluded?: number;
        };
        if (health.database !== "connected") throw new Error("Database unavailable");

        setSystem({
          kind: "online",
          checkedAt: health.checkedAt,
          corpus: stats.corpus ?? emptyStats,
          simulatedExcluded: stats.simulatedEvidenceExcluded ?? 0,
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
          {system.kind === "loading" && "Checking evidence system"}
          {system.kind === "online" && "Evidence database connected"}
          {system.kind === "offline" && "Evidence system unavailable"}
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">AI-powered product discovery</p>
            <h1>Understand why remembered photos still feel impossible to find.</h1>
            <p className="hero-intro">
              A research system for turning public conversations into traceable evidence about
              vague-memory photo retrieval—not another generic sentiment dashboard.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#evidence">
                Inspect the evidence layer
              </a>
              <span className="build-label">Stage 2 · Traceable evidence foundation</span>
            </div>
          </div>

          <div className="memory-card" aria-label="Example memory clues">
            <div className="memory-card-header">
              <span className="memory-icon" aria-hidden="true">?</span>
              <span>A half-remembered moment</span>
            </div>
            <blockquote>“That tiny café from our Goa trip—the one with blue chairs.”</blockquote>
            <div className="clue-list">
              <span>Place · Goa</span>
              <span>Object · blue chairs</span>
              <span>Context · trip</span>
              <span className="clue-missing">Forgotten · exact date</span>
            </div>
          </div>
        </section>

        <section className="principle-strip" aria-label="Research principles">
          <div>
            <strong>Evidence first</strong>
            <span>Every finding traces back to a source.</span>
          </div>
          <div>
            <strong>Beyond sentiment</strong>
            <span>We code memory, behavior, failure, and workaround.</span>
          </div>
          <div>
            <strong>Honest confidence</strong>
            <span>Corpus patterns are not population prevalence.</span>
          </div>
        </section>

        <section className="evidence-foundation" id="evidence">
          <div className="section-heading">
            <p className="eyebrow">Live research corpus</p>
            <h2>The evidence layer is connected and ready for real public conversations.</h2>
            <p>
              These counts include only admissible research evidence. Simulated records used to
              test the system are stored separately and automatically excluded from findings.
            </p>
          </div>

          <div className="metric-grid" aria-live="polite">
            <article className="metric-card">
              <span>Public sources</span>
              <strong>{corpus.source_count}</strong>
              <small>Traceable URLs admitted</small>
            </article>
            <article className="metric-card">
              <span>Raw conversations</span>
              <strong>{corpus.document_count}</strong>
              <small>Original text preserved</small>
            </article>
            <article className="metric-card">
              <span>Evidence units</span>
              <strong>{corpus.evidence_count}</strong>
              <small>Structured retrieval episodes</small>
            </article>
            <article className="metric-card">
              <span>Human verified</span>
              <strong>{corpus.verified_count}</strong>
              <small>Extraction quality audited</small>
            </article>
          </div>

          <div className="integrity-note">
            <span className="integrity-icon" aria-hidden="true">✓</span>
            <div>
              <strong>Research-integrity guardrail active</strong>
              <p>
                {system.kind === "online" ? system.simulatedExcluded : 0} illustrative evidence
                records are available for testing and excluded from all reported findings.
              </p>
            </div>
          </div>
        </section>

        <section className="architecture" id="architecture">
          <div className="section-heading">
            <p className="eyebrow">How the system will grow</p>
            <h2>One evidence chain from conversation to product opportunity</h2>
            <p>
              Raw material and provenance now have a stable home. Collection and Groq-based
              classification can be added without mixing generated interpretation with user voice.
            </p>
          </div>

          <div className="stage-grid">
            {stages.map((stage) => (
              <article className="stage-card" key={stage.number}>
                <span className="stage-number">{stage.number}</span>
                <h3>{stage.title}</h3>
                <p>{stage.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="next-step">
          <div>
            <p className="eyebrow">Next implementation gate</p>
            <h2>Collect a small, defensible public evidence set.</h2>
          </div>
          <p>
            Stage 3 will add the first compliant source collector, deduplication, and an auditable
            import run. Groq will then structure retrieval episodes while preserving every source.
          </p>
        </section>
      </main>

      <footer>
        <span>Photo Recall Discovery Engine</span>
        <span>
          {system.kind === "online"
            ? `Database checked ${new Date(system.checkedAt).toLocaleTimeString()}`
            : "Evidence foundation build"}
        </span>
      </footer>
    </div>
  );
}

export default App;

