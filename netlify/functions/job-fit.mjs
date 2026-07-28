import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowRight, Check, Gauge, Menu, ShieldCheck, Sparkles, Target, X } from "lucide-react";
import "./styles.css";

type Report = {
  overall: number;
  label: string;
  summary: string;
  categories: { skills: number; transferable: number; responsibilities: number; impact: number; ats: number };
  strengths: string[];
  gaps: string[];
  actions: string[];
  interviewProbability?: number;
  recruiterFirstImpression?: string;
  biggestRisk?: string;
  positioningDiagnosis?: string;
  careerDNA?: { capability: string; confidence: number; evidence: string; relevance: string }[];
  hiddenTransferableSkills?: { skill: string; evidence: string; application: string }[];
  atsAnalysis?: {
    score: number;
    matchedKeywords: string[];
    missingKeywords: { keyword: string; importance: string; safeToAdd: boolean; guidance: string }[];
  };
  recruiterObjections?: { objection: string; severity: string; counterargument: string; requiredEvidence: string }[];
  resumeRewrites?: { section: string; original: string; rewrite: string; reason: string }[];
  thirtyMinutePlan?: { priority: number; minutes: number; action: string; expectedImpact: string }[];
  careerPivotRoles?: { role: string; fitScore: number; rationale: string; gap: string }[];
  scoreAfterChanges?: number;
  truthCheck?: string[];
};

const sample: Report = {
  overall: 91,
  label: "Exceptional Match",
  summary: "Your experience is stronger than your titles initially suggest. The main opportunity is positioning your operational leadership and measurable impact more clearly.",
  interviewProbability: 72,
  recruiterFirstImpression: "This candidate has credible operational and program leadership experience. The strongest evidence is cross-functional ownership, process improvement, reporting, and complex regulated work.",
  biggestRisk: "A recruiter may categorize you too quickly based on previous titles and overlook the broader operational scope of your work.",
  positioningDiagnosis: "Your experience is not the primary problem. The resume needs to translate your responsibilities into the language used by the target role.",
  categories: { skills: 89, transferable: 96, responsibilities: 88, impact: 80, ats: 84 },
  strengths: ["Strong cross-functional ownership", "Documented process-improvement experience", "Experience managing complex and regulated work"],
  gaps: ["Target-role terminology is not prominent enough", "Some accomplishments need clearer metrics", "The summary is not fully aligned with the target role"],
  actions: ["Rewrite the headline and summary", "Move the most relevant accomplishment higher", "Add one verified impact metric"],
  careerDNA: [
    { capability: "Operations Leadership", confidence: 96, evidence: "Owned complex programs and cross-functional workflows.", relevance: "Supports operations and program-management roles." },
    { capability: "Process Improvement", confidence: 94, evidence: "Built repeatable procedures, tools, and documentation.", relevance: "Shows an ability to improve efficiency and consistency." },
    { capability: "Cross-functional Influence", confidence: 95, evidence: "Partnered with leaders, external stakeholders, and internal teams.", relevance: "Shows influence without relying on authority." }
  ],
  hiddenTransferableSkills: [
    { skill: "Program Management", evidence: "Coordinated stakeholders, deadlines, documentation, and outcomes.", application: "Position this as end-to-end program ownership rather than administrative support." }
  ],
  atsAnalysis: {
    score: 84,
    matchedKeywords: ["cross-functional", "process improvement", "reporting", "operations"],
    missingKeywords: [
      { keyword: "automation", importance: "High", safeToAdd: true, guidance: "Use only where your real work involved workflow or process automation." },
      { keyword: "LLM pipelines", importance: "High", safeToAdd: false, guidance: "Do not claim this without direct experience." }
    ]
  },
  resumeRewrites: [
    { section: "Headline", original: "HR Operations Manager", rewrite: "Operations and HR Program Manager", reason: "Reflects broader operational scope without misrepresenting the background." }
  ],
  thirtyMinutePlan: [
    { priority: 1, minutes: 10, action: "Rewrite the headline and summary.", expectedImpact: "Clarifies target-role alignment immediately." },
    { priority: 2, minutes: 10, action: "Move the strongest accomplishment higher.", expectedImpact: "Prevents recruiters from overlooking your best evidence." },
    { priority: 3, minutes: 10, action: "Add one verified metric.", expectedImpact: "Improves credibility and impact." }
  ],
  careerPivotRoles: [
    { role: "Operations Manager", fitScore: 93, rationale: "Your background shows process ownership and stakeholder leadership.", gap: "Make operational results more prominent." },
    { role: "Program Manager", fitScore: 92, rationale: "You have relevant complex-program coordination experience.", gap: "Show more end-to-end outcomes." }
  ],
  scoreAfterChanges: 95,
  truthCheck: ["Do not claim direct LLM pipeline experience without evidence.", "Do not add tools you have not used."]
};

function Logo() {
  return <a className="logo" href="#top"><span>T</span>Threadline</a>;
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const score = Math.max(0, Math.min(100, value || 0));
  return <div className="score-row"><div><span>{label}</span><strong>{score}%</strong></div><div className="track"><i style={{ width: `${score}%` }} /></div></div>;
}

function Score({ value }: { value: number }) {
  const score = Math.max(0, Math.min(100, value || 0));
  return <div className="score" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}><div><strong>{score}</strong><span>/100</span></div></div>;
}

function Heading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return <div className="heading"><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{text && <p>{text}</p>}</div>;
}

function App() {
  const [mobile, setMobile] = useState(false);
  const [resume, setResume] = useState("");
  const [job, setJob] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [showSample, setShowSample] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");

  const canAnalyze = useMemo(() => resume.trim().length > 100 && job.trim().length > 100, [resume, job]);
  const active = showSample ? sample : report;

  async function analyze() {
    if (!canAnalyze || loading) return;
    setLoading(true);
    setError("");
    setReport(null);
    setShowSample(false);

    try {
      const response = await fetch("/.netlify/functions/job-fit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume,
          jobDescription: job,
        }),
      });

      const responseText = await response.text();

      let data: Report | { error?: string } | null = null;

      try {
        data = JSON.parse(responseText);
      } catch {
        data = null;
      }

      if (!response.ok) {
        console.error("Job Fit function error:", {
          status: response.status,
          responseText,
        });

        throw new Error(
          (data && "error" in data && data.error) ||
            responseText ||
            `Analysis failed with status ${response.status}.`
        );
      }

      if (!data || "error" in data) {
        throw new Error(
          data?.error ||
            "The Job Fit function returned an empty or invalid response."
        );
      }

      setReport(data);
      setTimeout(() => document.querySelector("#report")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Threadline could not complete the analysis.");
    } finally {
      setLoading(false);
    }
  }

  async function checkout() {
    setCheckoutLoading(true);
    try {
      const response = await fetch("/.netlify/functions/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" })
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data?.error || "Checkout unavailable.");
      window.location.href = data.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Checkout is not configured yet.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  function openSample() {
    setShowSample(true);
    setReport(null);
    setTimeout(() => document.querySelector("#sample-report")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return <>
    <header id="top">
      <Logo />
      <nav className={mobile ? "open" : ""}>
        <a href="#how-it-works" onClick={() => setMobile(false)}>How it works</a>
        <a href="#analyze" onClick={() => setMobile(false)}>Analyze</a>
        <a href="#pricing" onClick={() => setMobile(false)}>Pricing</a>
        <a className="nav-cta" href="#analyze" onClick={() => setMobile(false)}>Analyze my resume</a>
      </nav>
      <button className="menu" onClick={() => setMobile(!mobile)}>{mobile ? <X /> : <Menu />}</button>
    </header>

    <main>
      <section className="hero">
        <div>
          <Pill tone="accent">Recruiter-grade career analysis</Pill>
          <h1>See what recruiters <em>see.</em></h1>
          <p>Threadline finds the experience your resume is underselling and shows you exactly how to position it for the job you want.</p>
          <div className="actions">
            <a className="button primary" href="#analyze">Analyze my resume free <ArrowRight size={18} /></a>
            <button className="button ghost" onClick={openSample}>View sample report</button>
          </div>
          <div className="trust">
            <span><Check size={17} /> First analysis free</span>
            <span><ShieldCheck size={17} /> No credit card required</span>
            <span><Check size={17} /> Truthful recommendations</span>
          </div>
        </div>

        <div className="preview">
          <div className="preview-top"><span>Recruiter Analysis</span><Pill tone="success">Sample</Pill></div>
          <div className="preview-score"><Score value={91} /><div><Pill tone="success">Exceptional Match</Pill><h3>Your experience is stronger than your title suggests.</h3></div></div>
          <div className="preview-block"><small>Recruiter's first impression</small><p>Strong operational ownership, cross-functional leadership, and process-improvement experience.</p></div>
          <div className="preview-block"><small>Career DNA</small><ScoreBar label="Operations leadership" value={96} /><ScoreBar label="Process improvement" value={94} /></div>
        </div>
      </section>

      <section className="built-for"><span>Built for</span><strong>Career changers</strong><strong>Returning professionals</strong><strong>Nonlinear careers</strong><strong>People who are underselling themselves</strong></section>

      <section className="section" id="how-it-works">
        <Heading eyebrow="Why Threadline" title="More than a keyword score" text="Most tools tell you what is missing. Threadline explains what recruiters may be overlooking and what to do next." />
        <div className="features">
          <article><span>01</span><Target /><h3>Recruiter thinking</h3><p>See how a hiring manager is likely to interpret your resume during the first review.</p></article>
          <article><span>02</span><Sparkles /><h3>Career translation</h3><p>Find transferable experience hidden behind titles, industries, career changes, and nonlinear paths.</p></article>
          <article><span>03</span><ShieldCheck /><h3>Truth-first improvements</h3><p>Strengthen what is real. Threadline never tells you to fabricate experience.</p></article>
        </div>
      </section>

      <section className="section translation">
        <Heading eyebrow="Career translation" title="Your experience may already fit" text="The difference is often how clearly your resume connects your experience to the target role." />
        <div className="translation-grid">
          <article><small>Before</small><h3>HR Operations Manager</h3><p>Managed employee programs, documentation, reporting, and compliance.</p></article>
          <ArrowRight />
          <article className="after"><small>After Threadline</small><h3>Operations and HR Program Manager</h3><p>Led complex workforce programs, cross-functional operations, reporting, compliance, and process improvements.</p></article>
        </div>
      </section>

      <section className="section analyze" id="analyze">
        <Heading eyebrow="Free analysis" title="Compare your resume to a job" text="Paste both documents below. Threadline will analyze your real experience without inventing qualifications." />
        <div className="analyzer">
          <label><span><strong>1. Your resume</strong><small>{resume.length.toLocaleString()} characters</small></span><textarea value={resume} onChange={e => setResume(e.target.value)} placeholder="Paste your complete resume here..." /></label>
          <label><span><strong>2. Target job description</strong><small>{job.length.toLocaleString()} characters</small></span><textarea value={job} onChange={e => setJob(e.target.value)} placeholder="Paste the full job description here..." /></label>
          {error && <div className="error">{error}</div>}
          <div className="analyzer-footer"><p>Review every recommendation before using it in an application.</p><button className="button primary" disabled={!canAnalyze || loading} onClick={analyze}>{loading ? "Analyzing your career..." : "Run recruiter analysis"} <Gauge size={18} /></button></div>
        </div>
      </section>

      {loading && <section className="section"><div className="loading"><i /><h2>Threadline is reading your career.</h2><p>Comparing responsibilities, evidence, keywords, and likely recruiter objections.</p></div></section>}

      {active && !loading && <section className="report" id={showSample ? "sample-report" : "report"}>
        <Heading eyebrow={showSample ? "Sample report" : "Analysis complete"} title="Here is what a recruiter may see." />
        <div className="overview"><Score value={active.overall} /><div><div className="eyebrow">{active.label}</div><h2>{active.summary}</h2><div className="probability"><span>Estimated interview probability</span><strong>{active.interviewProbability ?? 0}%</strong><div><i style={{ width: `${active.interviewProbability ?? 0}%` }} /></div><small>Guidance only. Hiring decisions depend on competition and factors outside the resume.</small></div></div></div>

        <div className="report-layout">
          <div className="report-main">
            {active.recruiterFirstImpression && <article className="card featured-card"><div className="card-title"><span>15s</span><div><div className="eyebrow">Recruiter's first impression</div><h3>What stands out during the first review</h3></div></div><blockquote>{active.recruiterFirstImpression}</blockquote>{active.positioningDiagnosis && <aside><strong>Positioning diagnosis</strong><p>{active.positioningDiagnosis}</p></aside>}</article>}

            <div className="two">
              <article className="card"><h3>Why you fit</h3><ul>{active.strengths.map(x => <li key={x}><Check size={17} />{x}</li>)}</ul></article>
              <article className="card"><h3>What weakens the application</h3><ul>{active.gaps.map(x => <li key={x}><ArrowRight size={17} />{x}</li>)}</ul></article>
            </div>

            {!!active.careerDNA?.length && <article className="card"><div className="card-title"><span>DNA</span><div><div className="eyebrow">Career DNA</div><h3>The capabilities that travel with you</h3></div></div><div className="dna">{active.careerDNA.map(x => <div key={x.capability}><header><h4>{x.capability}</h4><strong>{x.confidence}%</strong></header><div className="track"><i style={{ width: `${x.confidence}%` }} /></div><p>{x.evidence}</p><small>{x.relevance}</small></div>)}</div></article>}

            {active.biggestRisk && <article className="risk"><Pill tone="warning">Biggest interview risk</Pill><h3>{active.biggestRisk}</h3><p>This may be a true gap or a positioning problem. Threadline separates the two.</p></article>}

            {!!active.hiddenTransferableSkills?.length && <article className="card"><div className="card-title"><span>↔</span><div><div className="eyebrow">Hidden transferable skills</div><h3>Experience your titles may be hiding</h3></div></div><div className="stack">{active.hiddenTransferableSkills.map(x => <div key={x.skill}><h4>{x.skill}</h4><p>{x.evidence}</p><aside><strong>How to position it</strong><span>{x.application}</span></aside></div>)}</div></article>}

            {active.atsAnalysis && <article className="card"><div className="card-title"><span>ATS</span><div><div className="eyebrow">ATS intelligence</div><h3>Keywords and screening alignment</h3></div></div><div className="ats"><strong>{active.atsAnalysis.score}%</strong><span>ATS alignment</span></div><h4>Matched language</h4><div className="pills">{active.atsAnalysis.matchedKeywords.map(x => <Pill tone="success" key={x}>{x}</Pill>)}</div><h4>Important missing language</h4><div className="keywords">{active.atsAnalysis.missingKeywords.map(x => <div key={x.keyword}><section><strong>{x.keyword}</strong><span>{x.guidance}</span></section><aside><Pill tone={x.importance === "High" ? "warning" : "neutral"}>{x.importance}</Pill><Pill tone={x.safeToAdd ? "success" : "danger"}>{x.safeToAdd ? "Supported" : "Do not claim"}</Pill></aside></div>)}</div></article>}

            {!!active.resumeRewrites?.length && <article className="card"><div className="card-title"><span>Aa</span><div><div className="eyebrow">Exact resume changes</div><h3>Translate your experience without inventing it</h3></div></div><div className="rewrites">{active.resumeRewrites.map((x, i) => <div key={`${x.section}-${i}`}><small>{x.section}</small><div><section><strong>Current</strong><p>{x.original || "No current wording identified."}</p></section><ArrowRight /><section className="recommended"><strong>Recommended</strong><p>{x.rewrite}</p></section></div><footer>{x.reason}</footer></div>)}</div></article>}

            <article className="card"><div className="card-title"><span>30</span><div><div className="eyebrow">Prioritized action plan</div><h3>Improve this application in 30 minutes</h3></div></div>{active.thirtyMinutePlan?.length ? <div className="plan">{active.thirtyMinutePlan.map((x, i) => <div key={`${x.action}-${i}`}><b>{i + 1}</b><section><header><strong>{x.action}</strong><Pill>{x.minutes} min</Pill></header><p>{x.expectedImpact}</p></section></div>)}</div> : <ul>{active.actions.map(x => <li key={x}><Sparkles size={17} />{x}</li>)}</ul>}<div className="score-change"><div><span>Current score</span><strong>{active.overall}</strong></div><ArrowRight /><div><span>Estimated after changes</span><strong>{active.scoreAfterChanges ?? active.overall}</strong></div></div></article>

            {!!active.careerPivotRoles?.length && <article className="card"><div className="card-title"><span>+</span><div><div className="eyebrow">Career pivot opportunities</div><h3>Adjacent roles supported by your experience</h3></div></div><div className="pivots">{active.careerPivotRoles.map(x => <div key={x.role}><header><h4>{x.role}</h4><strong>{x.fitScore}% fit</strong></header><p>{x.rationale}</p><small><strong>Primary gap:</strong> {x.gap}</small></div>)}</div></article>}

            {!!active.truthCheck?.length && <article className="card truth"><div className="card-title"><span>✓</span><div><div className="eyebrow">Truth check</div><h3>Claims that require real evidence</h3></div></div><ul>{active.truthCheck.map(x => <li key={x}>{x}</li>)}</ul></article>}
          </div>

          <aside className="sidebar">
            <article className="card"><h3>Score breakdown</h3><ScoreBar label="Skills and systems" value={active.categories.skills} /><ScoreBar label="Transferable experience" value={active.categories.transferable} /><ScoreBar label="Responsibilities" value={active.categories.responsibilities} /><ScoreBar label="Evidence and impact" value={active.categories.impact} /><ScoreBar label="ATS alignment" value={active.categories.ats} /></article>
            <article className="pro"><div className="eyebrow">Threadline Pro</div><h3>Turn analysis into finished applications.</h3><p>Tailored resumes, cover letters, interview preparation, and unlimited job comparisons.</p><button className="button primary full" onClick={checkout}>{checkoutLoading ? "Opening checkout..." : "Choose Pro"}</button></article>
          </aside>
        </div>
      </section>}

      <section className="section pricing" id="pricing">
        <Heading eyebrow="Simple pricing" title="Use what you need during your job search" text="Start free. Upgrade when you are ready to tailor more applications." />
        <div className="pricing-grid">
          <article><span>Free</span><h3>$0</h3><p>Understand your fit before you apply.</p><ul><li><Check />One recruiter analysis</li><li><Check />Job Fit Score</li><li><Check />Top strengths and gaps</li><li><Check />Prioritized improvements</li></ul><a className="button ghost full" href="#analyze">Start free</a></article>
          <article className="featured"><Pill tone="accent">Most popular</Pill><span>Pro Job Search</span><h3>$49 <small>/ 30 days</small></h3><p>Everything needed for an active search.</p><ul><li><Check />Unlimited analyses</li><li><Check />Career DNA profile</li><li><Check />Resume tailoring</li><li><Check />Cover letters</li><li><Check />Interview preparation</li></ul><button className="button primary full" onClick={checkout}>{checkoutLoading ? "Opening checkout..." : "Choose Pro"}</button></article>
        </div>
      </section>
    </main>

    <footer><div><Logo /><p>Make your experience make sense.</p></div><div className="footer-links"><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="mailto:support@threadlineresume.com">Support</a></div><small>© {new Date().getFullYear()} Threadline. Scores are guidance, not a guarantee of employment.</small></footer>
  </>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
