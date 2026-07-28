import OpenAI from "openai";

const allowed = ["skills", "transferable", "responsibilities", "impact", "ats"];

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const { resume = "", jobDescription = "" } = await request.json();
  if (resume.length < 100 || jobDescription.length < 100) {
    return new Response(JSON.stringify({ error: "Please provide a full resume and job description." }), { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "OpenAI is not configured." }), { status: 503 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `
You are Threadline, an honest career-strategy engine. Compare the resume and job description.
Look beyond exact keywords. Reward transferable evidence, scope, systems, regulated work,
cross-functional ownership, outcomes, and adjacent experience. Never invent qualifications.
Return ONLY valid JSON in this exact shape:
{
  "overall": number 0-100,
  "label": "Weak match" | "Possible match" | "Strong potential" | "Excellent match",
  "summary": "2-3 concise sentences",
  "categories": {
    "skills": number,
    "transferable": number,
    "responsibilities": number,
    "impact": number,
    "ats": number
  },
  "strengths": ["3 concise evidence-based items"],
  "gaps": ["3 concise truthful gaps or presentation weaknesses"],
  "actions": ["3 prioritized, fact-safe resume improvements"]
}

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}
`;

  try {
    const result = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
      temperature: 0.2
    });
    const parsed = JSON.parse(result.output_text);
    for (const key of allowed) {
      parsed.categories[key] = Math.max(0, Math.min(100, Number(parsed.categories[key]) || 0));
    }
    parsed.overall = Math.max(0, Math.min(100, Number(parsed.overall) || 0));
    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "The analysis could not be completed." }), { status: 500 });
  }
};
