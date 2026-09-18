import { useEffect, useState } from "react";

type HealthState =
  | { kind: "loading" }
  | { kind: "online"; checkedAt: string }
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

function App() {
  const [health, setHealth] = useState<HealthState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth() {
      try {
        const response = await fetch("/api/health", { signal: controller.signal });
        if (!response.ok) throw new Error("Health check failed");
        const body = (await response.json()) as { checkedAt: string };
        setHealth({ kind: "online", checkedAt: body.checkedAt });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHealth({ kind: "offline" });
      }
    }

    void checkHealth();
    return () => controller.abort();
  }, []);

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
        <div className={`status status-${health.kind}`} aria-live="polite">
          <span className="status-dot" />
          {health.kind === "loading" && "Checking foundation"}
          {health.kind === "online" && "Foundation online"}
          {health.kind === "offline" && "Foundation unavailable"}
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
              <a className="button button-primary" href="#architecture">
                Explore the foundation
              </a>
              <span className="build-label">Stage 1 · Architecture foundation</span>
            </div>
          </div>

          <div className="memory-card" aria-label="Example memory clues">
            <div className="memory-card-header">
              <span className="memory-icon" aria-hidden="true">✦</span>
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

        <section className="architecture" id="architecture">
          <div className="section-heading">
            <p className="eyebrow">How the foundation will grow</p>
            <h2>One evidence chain from conversation to product opportunity</h2>
            <p>
              The current build proves the interface and Worker API operate as one deployable
              Cloudflare application. Data and AI are added only after this foundation is stable.
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
            <h2>Make evidence traceable before making it intelligent.</h2>
          </div>
          <p>
            Stage 2 will introduce the D1 evidence schema and a small, auditable import path. Groq
            classification comes only after raw evidence and provenance are stored correctly.
          </p>
        </section>
      </main>

      <footer>
        <span>Photo Recall Discovery Engine</span>
        <span>
          {health.kind === "online"
            ? `API checked ${new Date(health.checkedAt).toLocaleTimeString()}`
            : "Foundation build"}
        </span>
      </footer>
    </div>
  );
}

export default App;

