import Anthropic from "@anthropic-ai/sdk";

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });

const limitText = (value, maxLength) =>
  String(value || "").trim().slice(0, maxLength);

const extractJson = (text) => {
  const cleaned = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Claude did not return a valid JSON object.");
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
};

const clampScore = (value, fallback = 0) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, Math.round(number)));
};

const normalizeStringArray = (value, maximum = 6) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim())
    .slice(0, maximum);
};

const normalizeResult = (result) => {
  const categories = result?.categories || {};

  return {
    // These fields preserve compatibility with the current Threadline screen.
    overall: clampScore(result?.overall),
    label: String(result?.label || "Potential Match"),
    summary: String(
      result?.summary ||
        "Threadline completed the comparison but could not produce a detailed summary."
    ),
    categories: {
      skills: clampScore(categories.skills),
      transferable: clampScore(categories.transferable),
      responsibilities: clampScore(categories.responsibilities),
      impact: clampScore(categories.impact),
      ats: clampScore(categories.ats),
    },
    strengths: normalizeStringArray(result?.strengths, 5),
    gaps: normalizeStringArray(result?.gaps, 5),
    actions: normalizeStringArray(result?.actions, 5),

    // These fields will power the upgraded premium report.
    interviewProbability: clampScore(result?.interviewProbability),
    recruiterFirstImpression: String(
      result?.recruiterFirstImpression || ""
    ),
    biggestRisk: String(result?.biggestRisk || ""),
    positioningDiagnosis: String(result?.positioningDiagnosis || ""),

    careerDNA: Array.isArray(result?.careerDNA)
      ? result.careerDNA.slice(0, 6).map((item) => ({
          capability: String(item?.capability || ""),
          confidence: clampScore(item?.confidence),
          evidence: String(item?.evidence || ""),
          relevance: String(item?.relevance || ""),
        }))
      : [],

    hiddenTransferableSkills: Array.isArray(
      result?.hiddenTransferableSkills
    )
      ? result.hiddenTransferableSkills.slice(0, 6).map((item) => ({
          skill: String(item?.skill || ""),
          evidence: String(item?.evidence || ""),
          application: String(item?.application || ""),
        }))
      : [],

    atsAnalysis: {
      score: clampScore(result?.atsAnalysis?.score, categories.ats),
      matchedKeywords: normalizeStringArray(
        result?.atsAnalysis?.matchedKeywords,
        12
      ),
      missingKeywords: Array.isArray(
        result?.atsAnalysis?.missingKeywords
      )
        ? result.atsAnalysis.missingKeywords
            .slice(0, 12)
            .map((item) => ({
              keyword: String(item?.keyword || ""),
              importance: String(item?.importance || "Medium"),
              safeToAdd: Boolean(item?.safeToAdd),
              guidance: String(item?.guidance || ""),
            }))
        : [],
    },

    recruiterObjections: Array.isArray(result?.recruiterObjections)
      ? result.recruiterObjections.slice(0, 5).map((item) => ({
          objection: String(item?.objection || ""),
          severity: String(item?.severity || "Medium"),
          counterargument: String(item?.counterargument || ""),
          requiredEvidence: String(item?.requiredEvidence || ""),
        }))
      : [],

    resumeRewrites: Array.isArray(result?.resumeRewrites)
      ? result.resumeRewrites.slice(0, 6).map((item) => ({
          section: String(item?.section || ""),
          original: String(item?.original || ""),
          rewrite: String(item?.rewrite || ""),
          reason: String(item?.reason || ""),
        }))
      : [],

    interviewQuestions: Array.isArray(result?.interviewQuestions)
      ? result.interviewQuestions.slice(0, 8).map((item) => ({
          question: String(item?.question || ""),
          whyAsked: String(item?.whyAsked || ""),
          answerStrategy: String(item?.answerStrategy || ""),
        }))
      : [],

    thirtyMinutePlan: Array.isArray(result?.thirtyMinutePlan)
      ? result.thirtyMinutePlan.slice(0, 6).map((item) => ({
          priority: clampScore(item?.priority),
          minutes: Math.max(
            1,
            Math.min(30, Math.round(Number(item?.minutes) || 5))
          ),
          action: String(item?.action || ""),
          expectedImpact: String(item?.expectedImpact || ""),
        }))
      : [],

    careerPivotRoles: Array.isArray(result?.careerPivotRoles)
      ? result.careerPivotRoles.slice(0, 6).map((item) => ({
          role: String(item?.role || ""),
          fitScore: clampScore(item?.fitScore),
          rationale: String(item?.rationale || ""),
          gap: String(item?.gap || ""),
        }))
      : [],

    scoreAfterChanges: clampScore(
      result?.scoreAfterChanges,
      result?.overall
    ),
    truthCheck: normalizeStringArray(result?.truthCheck, 5),
  };
};

export default async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return jsonResponse(
        {
          error:
            "ANTHROPIC_API_KEY is missing from the Netlify environment variables.",
        },
        500
      );
    }

    const requestBody = await request.json();

    const resume = limitText(requestBody?.resume, 40000);
    const jobDescription = limitText(
      requestBody?.jobDescription,
      40000
    );

    if (resume.length < 100) {
      return jsonResponse(
        {
          error:
            "Please paste a more complete resume before running the analysis.",
        },
        400
      );
    }

    if (jobDescription.length < 100) {
      return jsonResponse(
        {
          error:
            "Please paste a more complete job description before running the analysis.",
        },
        400
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const systemPrompt = `
You are Threadline, a rigorous senior recruiter, ATS strategist,
career-transition expert, resume writer, and hiring manager.

Your job is to compare a candidate's resume with one target job and
produce an evidence-based career analysis.

THREADLINE'S STANDARD

The report must feel more insightful than a generic resume scanner.
Identify what the candidate has actually done, what is transferable,
how a recruiter will interpret it, what is missing, and what exact
changes would improve the application.

NONNEGOTIABLE ACCURACY RULES

1. Never invent experience, credentials, software, metrics, job titles,
   direct reports, industries, responsibilities, or accomplishments.

2. Clearly distinguish among:
   - documented evidence
   - reasonable transferable experience
   - missing or unproven experience

3. Do not tell a candidate to add a keyword as though they possess the
   skill when the resume does not support it.

4. When a job requirement is unsupported, explain how the candidate can:
   - provide truthful adjacent evidence,
   - learn the skill,
   - or address the gap during an interview.

5. A high score must be earned. Do not inflate scores to encourage the
   candidate.

6. Treat job titles as imperfect signals. Analyze actual responsibilities,
   scope, complexity, outcomes, stakeholders, systems, and progression.

7. Resume rewrites must preserve the candidate's truth. Never fabricate
   numbers or outcomes.

8. Do not make legal, demographic, medical, or personality assumptions.

SCORING FRAMEWORK

Calculate the overall score using this approximate weighting:

- Skills and systems: 20%
- Transferable experience: 20%
- Responsibility alignment: 25%
- Evidence and measurable impact: 15%
- ATS and keyword alignment: 20%

Interpret scores as:

90–100: Exceptional Match
80–89: Strong Match
70–79: Competitive With Gaps
60–69: Possible Stretch
Below 60: Significant Gap

Interview probability is not the same as job-fit score. Estimate it
conservatively based only on the resume as currently written. Consider
positioning, competition, direct requirements, evidence, and ATS clarity.

ANALYSIS REQUIREMENTS

Evaluate:

- Recruiter's likely first impression within 10–15 seconds
- Directly relevant experience
- Hidden transferable capabilities
- Career progression and scope
- Systems, tools, methods, and domain knowledge
- Cross-functional and stakeholder leadership
- Analytical and reporting evidence
- Process improvement and automation evidence
- Customer or employee experience evidence
- Measurable outcomes
- Missing required qualifications
- ATS terminology
- The candidate's biggest positioning problem
- Likely recruiter objections
- Exact truthful resume improvements
- Likely interview questions
- Adjacent career-pivot opportunities

OUTPUT RULES

Return only one valid JSON object.

Do not use markdown.
Do not use code fences.
Do not include comments.
Do not include text before or after the JSON.
Use double quotes for all property names and string values.
Do not return null.
Use empty arrays or empty strings when necessary.
Keep sentences specific and concise.

Return this exact structure:

{
  "overall": 0,
  "label": "",
  "summary": "",
  "categories": {
    "skills": 0,
    "transferable": 0,
    "responsibilities": 0,
    "impact": 0,
    "ats": 0
  },
  "strengths": [
    "",
    "",
    ""
  ],
  "gaps": [
    "",
    "",
    ""
  ],
  "actions": [
    "",
    "",
    ""
  ],
  "interviewProbability": 0,
  "recruiterFirstImpression": "",
  "biggestRisk": "",
  "positioningDiagnosis": "",
  "careerDNA": [
    {
      "capability": "",
      "confidence": 0,
      "evidence": "",
      "relevance": ""
    }
  ],
  "hiddenTransferableSkills": [
    {
      "skill": "",
      "evidence": "",
      "application": ""
    }
  ],
  "atsAnalysis": {
    "score": 0,
    "matchedKeywords": [""],
    "missingKeywords": [
      {
        "keyword": "",
        "importance": "High",
        "safeToAdd": false,
        "guidance": ""
      }
    ]
  },
  "recruiterObjections": [
    {
      "objection": "",
      "severity": "High",
      "counterargument": "",
      "requiredEvidence": ""
    }
  ],
  "resumeRewrites": [
    {
      "section": "",
      "original": "",
      "rewrite": "",
      "reason": ""
    }
  ],
  "interviewQuestions": [
    {
      "question": "",
      "whyAsked": "",
      "answerStrategy": ""
    }
  ],
  "thirtyMinutePlan": [
    {
      "priority": 1,
      "minutes": 5,
      "action": "",
      "expectedImpact": ""
    }
  ],
  "careerPivotRoles": [
    {
      "role": "",
      "fitScore": 0,
      "rationale": "",
      "gap": ""
    }
  ],
  "scoreAfterChanges": 0,
  "truthCheck": [
    ""
  ]
}

FIELD-SPECIFIC INSTRUCTIONS

summary:
Write two or three sentences explaining the candidate's genuine fit,
main advantage, and main limitation.

strengths:
Provide three to five strengths supported by resume evidence.

gaps:
Provide three to five meaningful gaps. Distinguish between a true
experience gap and a resume-positioning gap.

actions:
Provide the three to five highest-impact application improvements.

careerDNA:
Identify four to six durable professional capabilities. Cite concrete
resume evidence in each evidence field.

hiddenTransferableSkills:
Reveal capabilities whose relevance may be obscured by the candidate's
past titles.

atsAnalysis.missingKeywords:
Include only important language from the job description.
Set safeToAdd to true only when the resume contains supporting evidence.
If false, guidance must say not to claim it without real experience.

recruiterObjections:
Write objections a skeptical recruiter might genuinely have, followed by
truthful counterarguments or the evidence still needed.

resumeRewrites:
Quote the candidate's original wording when possible, then provide an
improved version. Do not create unsupported claims or placeholders.
Prioritize the headline, summary, skills, and most relevant bullets.

interviewQuestions:
Predict questions that arise from the candidate's strengths and gaps.
The answer strategy must use only available experience and may recommend
that the candidate prepare a real example.

thirtyMinutePlan:
Create a practical plan totaling no more than 30 minutes.
Order it by importance.

careerPivotRoles:
Recommend adjacent roles grounded in demonstrated capabilities.
Do not imply the candidate is qualified for unrelated occupations.

scoreAfterChanges:
Estimate the fit score after implementing only the truthful resume
positioning improvements suggested in this report. Do not assume the
candidate gains new experience.

truthCheck:
List claims or keywords the candidate should not add unless they can
truthfully verify them.
`;

    const userPrompt = `
Analyze the following candidate for the following role.

RESUME

${resume}

TARGET JOB DESCRIPTION

${jobDescription}
`;

    const response = await anthropic.messages.create({
      model:
        process.env.ANTHROPIC_MODEL ||
        "claude-sonnet-4-20250514",
      max_tokens: 7000,
      temperature: 0.1,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    if (response.stop_reason === "max_tokens") {
      throw new Error(
        "The analysis exceeded the output limit. Please try again."
      );
    }

    const responseText = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsedResult = extractJson(responseText);
    const normalizedResult = normalizeResult(parsedResult);

    return jsonResponse(normalizedResult);
  } catch (error) {
    console.error("Threadline job-fit error:", error);

    if (error instanceof SyntaxError) {
      return jsonResponse(
        {
          error:
            "The request or Claude response contained invalid JSON. Please try the analysis again.",
        },
        500
      );
    }

    return jsonResponse(
      {
        error:
          error?.message ||
          "Threadline could not complete the analysis.",
      },
      500
    );
  }
};
