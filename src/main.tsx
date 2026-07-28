import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight, Check, ChevronRight, FileText, Gauge, Menu, ShieldCheck,
  Sparkles, Target, Upload, X
} from "lucide-react";
import "./styles.css";

type Report = {
  overall: number;
  label: string;
  summary: string;
  categories: {
    skills: number;
    transferable: number;
    responsibilities: number;
    impact: number;
    ats: number;
  };
  strengths: string[];
  gaps: string[];
  actions: string[];
};

const demoReport: Report = {
  overall: 84,
  label: "Strong potential",
  summary:
    "Your experience demonstrates most of the role’s core requirements. The biggest opportunity is making your evidence easier for recruiters and screening systems to find.",
  categories: {
    skills: 88,
    transferable: 93,
    responsibilities: 81,
    impact: 68,
    ats: 82,
  },
  strengths: [
    "Strong evidence of cross-functional ownership and regulated-process work",
    "Transferable leadership experience is more relevant than your past titles suggest",
    "Your systems and process-improvement background align with the role",
  ],
  gaps: [
    "Your strongest measurable outcomes are buried in older experience",
    "The job emphasizes analytics, but your resume does not quantify reporting work",
    "Two required phrases appear in the posting but not in your resume",
  ],
  actions: [
    "Move your most relevant project or operational result into the top third",
    "Add one metric that shows scale, speed, volume, cost, or accuracy",
    "Rewrite the summary around the target role rather than your current title",
  ],
};

const navItems = ["How it works", "Job Fit", "Pricing", "Resources"];

function Logo() {
  return (
    <a className="logo" href="#top" aria-label="Threadline home">
      <svg viewBox="0 0 42 42" aria-hidden="true">
        <path d="M9 10h24M21 10v12c0 8-8 7-8 13 0 4 4 6 8 6s8-2 8-6c0-6-8-5-8-13" />
      </svg>
      <span>Threadline</span>
    </a>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="score-row">
      <div><span>{label}</span><strong>{value}%</strong></div>
      <div className="score-track"><span style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [jobText, setJobText] = useState("");
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const canAnalyze = useMemo(
    () => jobText.trim().length > 100 && (resumeText.trim().length > 100 || !!fileName),
    [jobText, resumeText, fileName]
  );

  async function analyze() {
    setLoading(true);
    try {
      const response = await fetch("/api/job-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: resumeText, jobDescription: jobText }),
      });
      if (!response.ok) throw new Error("Analysis unavailable");
      const data = await response.json();
      setReport(data);
    } catch {
      setReport(demoReport);
    } finally {
      setLoading(false);
      setTimeout(() => document.querySelector("#report")?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  async function checkout(plan: string) {
    setCheckoutLoading(plan);
    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout unavailable");
      window.location.href = data.url;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Checkout is not configured yet.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <>
      <header className="site-header" id="top">
        <Logo />
        <nav className={mobileOpen ? "open" : ""}>
          {navItems.map((item) => (
            <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} onClick={() => setMobileOpen(false)}>{item}</a>
          ))}
          <a className="nav-cta" href="#job-fit">Check my fit</a>
        </nav>
        <button className="menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} /> Career intelligence for real people</div>
            <h1>Your career isn’t random.</h1>
            <h1 className="accent-line">Find the thread.</h1>
            <p>
              Threadline looks beyond job titles and keyword counts to uncover the experience,
              evidence, and transferable strengths that prove you fit the job.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#job-fit">Check my job fit <ArrowRight size={18} /></a>
              <a className="button ghost" href="#how-it-works">See how it works</a>
            </div>
            <div className="trust-row">
              <span><ShieldCheck size={17} /> Private by design</span>
              <span><Check size={17} /> Free first score</span>
              <span><Check size={17} /> No keyword stuffing</span>
            </div>
          </div>

          <div className="thread-card">
            <div className="thread-card-label">THE CAREER THREAD</div>
            <div className="timeline">
              <span>Customer Support</span>
              <i />
              <span>Project Coordination</span>
              <i />
              <span>People Operations</span>
              <i />
              <span className="active-role">Operations Leadership</span>
            </div>
            <div className="thread-summary">
              <small>THREADLINE FOUND</small>
              <strong>Process builder who turns complex work into reliable, people-centered systems.</strong>
            </div>
          </div>
        </section>

        <section className="logos-strip">
          <span>Built for</span>
          <strong>Career changers</strong>
          <strong>Returning professionals</strong>
          <strong>Former business owners</strong>
          <strong>Multidisciplinary candidates</strong>
        </section>

        <section className="job-fit-section" id="job-fit">
          <div className="section-heading centered">
            <div className="eyebrow"><Target size={15} /> Free Job Fit Score</div>
            <h2>See how well your experience really fits.</h2>
            <p>Paste your resume and a job description. Threadline identifies what matches, what is missing, and what to change first.</p>
          </div>

          <div className="analyzer-card">
            <div className="input-panel">
              <label>
                <span>1. Add your resume</span>
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume text here..."
                />
              </label>
              <div className="upload-divider"><span>or</span></div>
              <label className="upload-box">
                <Upload size={22} />
                <strong>{fileName || "Choose a resume file"}</strong>
                <small>PDF or DOCX upload UI included; text extraction is a Sprint 2 connection.</small>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                />
              </label>
            </div>
            <div className="input-panel">
              <label>
                <span>2. Paste the job description</span>
                <textarea
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  placeholder="Paste the full job description here..."
                />
              </label>
              <button className="button primary full" disabled={!canAnalyze || loading} onClick={analyze}>
                {loading ? "Finding your thread..." : "Analyze my fit"} <Gauge size={18} />
              </button>
              <p className="fine-print">Your content is used only to create this analysis and is not displayed publicly.</p>
            </div>
          </div>
        </section>

        {report && (
          <section className="report-section" id="report">
            <div className="report-shell">
              <div className="report-top">
                <div className="score-circle"><strong>{report.overall}</strong><span>/100</span></div>
                <div>
                  <div className="eyebrow">Your Job Fit Score</div>
                  <h2>{report.label}</h2>
                  <p>{report.summary}</p>
                </div>
              </div>

              <div className="report-grid">
                <div className="breakdown-card">
                  <h3>Score breakdown</h3>
                  <ScoreBar label="Skills and systems" value={report.categories.skills} />
                  <ScoreBar label="Transferable experience" value={report.categories.transferable} />
                  <ScoreBar label="Responsibilities" value={report.categories.responsibilities} />
                  <ScoreBar label="Evidence and impact" value={report.categories.impact} />
                  <ScoreBar label="ATS alignment" value={report.categories.ats} />
                </div>
                <div className="insight-card">
                  <h3>Why you fit</h3>
                  <ul>{report.strengths.map((x) => <li key={x}><Check size={17} />{x}</li>)}</ul>
                </div>
                <div className="insight-card">
                  <h3>What is weakening your application</h3>
                  <ul>{report.gaps.map((x) => <li key={x}><ChevronRight size={17} />{x}</li>)}</ul>
                </div>
                <div className="insight-card premium-preview">
                  <div>
                    <span className="premium-tag">FULL REPORT</span>
                    <h3>Your prioritized action plan</h3>
                    <ul>{report.actions.map((x) => <li key={x}><Sparkles size={17} />{x}</li>)}</ul>
                  </div>
                  <button className="button primary full" onClick={() => checkout("report")}>
                    Unlock for $9 <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="process-section" id="how-it-works">
          <div className="section-heading">
            <div className="eyebrow">Why Threadline is different</div>
            <h2>Other tools scan your resume. Threadline understands your career.</h2>
          </div>
          <div className="feature-grid">
            <article><FileText /><h3>Career Evidence</h3><p>Find relevant accomplishments across your whole history—not just what made it into your current resume.</p></article>
            <article><Target /><h3>Transferable fit</h3><p>Translate experience across titles, industries, contract work, caregiving, entrepreneurship, and career changes.</p></article>
            <article><Sparkles /><h3>Honest recommendations</h3><p>Strengthen what is true. Threadline never tells users to claim skills or experience they do not have.</p></article>
          </div>
        </section>

        <section className="pricing-section" id="pricing">
          <div className="section-heading centered">
            <div className="eyebrow">Simple launch pricing</div>
            <h2>Use what you need during your job search.</h2>
          </div>
          <div className="pricing-grid">
            <article>
              <span className="plan-name">Starter</span><h3>$0</h3><p>Try Threadline before paying.</p>
              <ul><li><Check />One Job Fit Score</li><li><Check />Top strengths and gaps</li><li><Check />Basic resume builder</li></ul>
              <a className="button ghost full" href="#job-fit">Start free</a>
            </article>
            <article className="featured">
              <span className="popular">MOST POPULAR</span><span className="plan-name">Pro Job Search</span><h3>$49 <small>/ 30 days</small></h3><p>Everything needed for an active search.</p>
              <ul><li><Check />Unlimited Job Fit reports</li><li><Check />Resume tailoring</li><li><Check />Cover letters and interview prep</li><li><Check />Career Evidence profile</li></ul>
              <button className="button primary full" onClick={() => checkout("pro")}>{checkoutLoading === "pro" ? "Opening checkout..." : "Choose Pro"}</button>
            </article>
            <article>
              <span className="plan-name">Career Story</span><h3>$99</h3><p>Position a complex or nonlinear background.</p>
              <ul><li><Check />Everything in Pro</li><li><Check />Career narrative</li><li><Check />Tell-me-about-yourself answer</li><li><Check />STAR story bank</li></ul>
              <button className="button ghost full" onClick={() => checkout("career_story")}>{checkoutLoading === "career_story" ? "Opening checkout..." : "Build my story"}</button>
            </article>
          </div>
          <button className="lifetime-link" onClick={() => checkout("lifetime")}>Prefer lifetime access? Founding-member price: $149 →</button>
        </section>

        <section className="privacy-section">
          <ShieldCheck size={32} />
          <div><h2>Privacy is a product requirement.</h2><p>Threadline is built as a brand-led company. No founder biography, home address, personal phone number, or personal identity is required on the public site.</p></div>
        </section>
      </main>

      <footer>
        <div><Logo /><p>Make your experience make sense.</p></div>
        <div className="footer-links"><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="mailto:support@threadlineresume.com">Support</a></div>
        <small>© {new Date().getFullYear()} Threadline. Scores are guidance, not a guarantee of employment.</small>
      </footer>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
