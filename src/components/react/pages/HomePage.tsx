import {
  BarChart3,
  Bot,
  Check,
  Code2,
  Headphones,
  ListChecks,
  Workflow,
} from "lucide-react";
import { homeContent } from "../../../data/home";
import type { Locale } from "../../../types/ui";
import { Button } from "../ui/Button";
import { SectionHead } from "../ui/SectionHead";

interface Props { locale: Locale }

const problemIcons = [Workflow, ListChecks, BarChart3] as const;
const solutionIcons = [Workflow, Bot, Code2] as const;

export function HomePage({ locale }: Props) {
  const content = homeContent[locale];
  const isEn = locale === "en";
  const assessmentNow = isEn ? "/en/assessment/now" : "/evaluacion/ahora";
  const assessmentSchedule = isEn ? "/en/assessment/schedule" : "/evaluacion/agendar";
  const aboutPath = isEn ? "/en/about" : "/nosotros";
  const resourcesPath = isEn ? "/en/recursos" : "/recursos";

  return (
    <>
      <section className="hero-orchestration">
        <div className="dawn-stage" aria-hidden="true">
          <div className="dawn-halo dawn-halo-amber" />
          <div className="dawn-halo dawn-halo-larimar" />
          <div className="dawn-beam" />
          <div className="dawn-grain" />
        </div>
        <div className="container">
          <div className="hero-support" style={{ "--hero-delay": ".02s" } as React.CSSProperties}>
            <span className="eyebrow">{content.hero.eyebrow}</span>
          </div>
          <h1 className="kinetic-heading" aria-label={content.hero.ariaLabel}>
            <span className="kinetic-mask"><span className="kinetic-primary">{content.hero.primary}</span></span>
            <span className="kinetic-secondary" aria-hidden="true">
              {content.hero.secondaryWords.map((word, index) => (
                <span className="kinetic-mask" key={`${word}-${index}`}>
                  <span
                    className="kinetic-word"
                    style={{
                      "--word-index": index,
                      "--word-direction": index % 2 === 0 ? -1 : 1,
                    } as React.CSSProperties}
                  >{word}</span>
                </span>
              ))}
            </span>
          </h1>
          <p className="hero-lede hero-support" style={{ "--hero-delay": ".6s" } as React.CSSProperties}>{content.hero.lede}</p>
          <div className="hero-actions hero-support" style={{ "--hero-delay": ".72s" } as React.CSSProperties}>
            <Button href={assessmentNow} size="lg">{content.hero.primaryCta}</Button>
            <Button href={assessmentSchedule} variant="outline">{content.hero.secondaryCta}</Button>
          </div>
          <div className="hero-notes hero-support" style={{ "--hero-delay": ".82s" } as React.CSSProperties}>
            {content.hero.notes.map((note) => <span className="hero-note" key={note}><Check className="check-icon" aria-hidden="true" />{note}</span>)}
          </div>
          <div className="system-flow" aria-hidden="true">
            <svg className="system-flow-lines" viewBox="0 0 1000 150" preserveAspectRatio="none">
              <path d="M110 28 C160 95 360 84 500 124" />
              <path d="M500 28 C500 68 500 88 500 124" />
              <path d="M890 28 C840 95 640 84 500 124" />
              <circle className="flow-signal flow-signal-amber" r="5"><animateMotion dur="5.8s" begin="1.25s" repeatCount="indefinite" path="M110 28 C160 95 360 84 500 124" /></circle>
              <circle className="flow-signal flow-signal-blue" r="5"><animateMotion dur="5.8s" begin="2.7s" repeatCount="indefinite" path="M500 28 C500 68 500 88 500 124" /></circle>
              <circle className="flow-signal flow-signal-amber" r="5"><animateMotion dur="5.8s" begin="4.1s" repeatCount="indefinite" path="M890 28 C840 95 640 84 500 124" /></circle>
            </svg>
            <div className="system-flow-sources">
              <span className="system-node system-node-source"><Workflow aria-hidden="true" />{content.hero.sources[0]}</span>
              <span className="system-node system-node-source"><Bot aria-hidden="true" />{content.hero.sources[1]}</span>
              <span className="system-node system-node-source"><Code2 aria-hidden="true" />{content.hero.sources[2]}</span>
            </div>
            <span className="system-node system-node-output">{content.hero.output}</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow={content.problem.eyebrow} title={content.problem.title} description={content.problem.description} />
          <div className="home-grid">
            {content.problem.cards.map((card, index) => {
              const Icon = problemIcons[index];
              return <article className="interactive-card" key={card.title}><div className="card-icon"><Icon aria-hidden="true" /></div><h3>{card.title}</h3><p>{card.body}</p></article>;
            })}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <SectionHead eyebrow={content.solutions.eyebrow} title={content.solutions.title} description={content.solutions.description} />
          <div className="home-grid">
            {content.solutions.cards.map((card, index) => {
              const Icon = solutionIcons[index];
              return <a className="interactive-card" href={card.href} key={card.title}><div className="card-icon dark-icon"><Icon aria-hidden="true" /></div><h3>{card.title}</h3><p>{card.body}</p><span className="card-link">{content.solutions.linkLabel} →</span></a>;
            })}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container assessment-panel">
          <div className="assessment-copy">
            <span className="eyebrow dark">{content.assessment.eyebrow}</span>
            <h2>{content.assessment.title}</h2>
            <p>{content.assessment.description}</p>
            <div className="hero-actions">
              <Button href={assessmentNow} size="lg">{content.hero.primaryCta}</Button>
              <Button href={assessmentSchedule} variant="dark-outline">{content.hero.secondaryCta}</Button>
            </div>
          </div>
          <div className="voice-card">
            <div className="voice-title"><span><Headphones aria-hidden="true" /></span><div>{content.assessment.voiceTitle}<br/><small>{content.assessment.voiceMeta}</small></div></div>
            <ul>{content.assessment.bullets.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow={content.process.eyebrow} title={content.process.title} />
          <div className="steps">
            {content.process.steps.map((step) => <article className="step" key={step.number}><span className="step-number">{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container founder">
          <img src="/team/julio-marte.jpeg" alt="Julio Alberto Marte Balbuena" loading="lazy" />
          <div className="section-head">
            <span className="eyebrow">{content.founder.eyebrow}</span>
            <h2>{content.founder.title}</h2>
            <p>{content.founder.description}</p>
            <p className="founder-name"><strong>Julio Alberto Marte Balbuena</strong><br/>{content.founder.role}</p>
            <div><Button href={aboutPath} variant="outline">{content.founder.cta}</Button></div>
          </div>
        </div>
      </section>

      <section className="section resources-cta">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">{content.resources.eyebrow}</span>
            <h2>{content.resources.title}</h2>
            <p>{content.resources.description}</p>
            <div><Button href={resourcesPath} variant="outline">{content.resources.cta}</Button></div>
          </div>
        </div>
      </section>

      <section className="section section-dark signature-cta">
        <div className="container">
          <h2>{content.finalCta.title}</h2>
          <p>{content.finalCta.description}</p>
          <div className="hero-actions">
            <Button href={assessmentNow} size="lg">{content.hero.primaryCta}</Button>
            <Button href={assessmentSchedule} variant="dark-outline">{content.hero.secondaryCta}</Button>
          </div>
        </div>
      </section>
    </>
  );
}
