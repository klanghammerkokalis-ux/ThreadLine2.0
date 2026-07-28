import Anthropic from "@anthropic-ai/sdk";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405 }
    );
  }

  try {
    const { resume = "", jobDescription = "" } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "ANTHROPIC_API_KEY is not configured."
        }),
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `
You are Threadline, an expert career strategist.

Compare this resume to the job description.

Think like an experienced recruiter.

Do NOT invent qualifications.

Reward transferable experience.

Respond ONLY with valid JSON.

Use this format:

{
  "overall": 84,
  "label": "Strong Match",
  "summary": "Two or three concise sentences.",
  "categories": {
    "skills": 88,
    "transferable": 94,
    "responsibilities": 86,
    "impact": 81,
    "ats": 72
  },
  "strengths": [
    "...",
    "...",
    "..."
  ],
  "gaps": [
    "...",
    "...",
    "..."
  ],
  "actions": [
    "...",
    "...",
    "..."
  ]
}

RESUME

${resume}

JOB DESCRIPTION

${jobDescription}
`;

    const response = await anthropic.messages.create({
      model:
        process.env.ANTHROPIC_MODEL ||
        "claude-sonnet-4-20250514",
      max_tokens: 1500,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const text = response.content
      .filter(c => c.type === "text")
      .map(c => c.text)
      .join("");

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const result = JSON.parse(cleaned);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (err) {
    console.error(err);

    return new Response(
      JSON.stringify({
        error: err.message
      }),
      {
        status: 500
      }
    );
  }
};
