const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_BASE_URL = Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

interface TopLine {
  lineId: string;
  text: string;
  relevance: number;
}

interface AnswerPayload {
  query: string;
  verdict: string;
  topLines: TopLine[];
  neighborLines: { id: string; text: string }[];
}

function buildPrompt(payload: AnswerPayload): string {
  const { query, verdict, topLines, neighborLines } = payload;

  const verdictSentence =
    verdict === "answered"
      ? "The document answers the question."
      : verdict === "partial"
        ? "The document partially addresses the question."
        : "The document does not address this question.";

  const linesContext = neighborLines
    .map((l) => `${l.id}: ${l.text}`)
    .join("\n");

  const topLineIds = topLines.slice(0, 8).map((l) => l.lineId).join(", ");

  return `You are a precise document search assistant. A user asked: "${query}"

${verdictSentence}

Here are the relevant lines from the document (with neighbors for context):

${linesContext}

The most relevant line IDs are: ${topLineIds}

Write a concise answer to the user's question based ONLY on the lines above. Cite lines inline as [Lxxxx]. If the verdict is "not in this document", say so plainly. Do not make up information that is not in the lines provided. Keep the answer to 2-3 sentences.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as AnswerPayload;

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "The answer writer is not configured. Set OPENAI_API_KEY or use Mock writer mode." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = buildPrompt(payload);

    const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a precise document search assistant that answers only from provided document lines with inline citations.",
          },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 300,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`OpenAI API error ${resp.status}:`, errText);
      let userMessage = `The answer service returned an error (HTTP ${resp.status}).`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) userMessage = `Answer service error: ${errJson.error.message}`;
      } catch { /* not JSON */ }
      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content || "No answer generated.";

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("answer error:", err);
    const msg = err instanceof Error ? err.message : "The answer service encountered an unexpected error.";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
