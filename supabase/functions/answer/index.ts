import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FN_NAME = "answer";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_BASE_URL = Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Request size limits
const MAX_BODY_CHARS = 100_000;
const MAX_QUERY_CHARS = 500;
const MAX_TOP_LINES = 50;
const MAX_NEIGHBOR_LINES = 50;
const MAX_LINE_CHARS = 1_000;
const MAX_LINE_ID_CHARS = 32;
const VERDICTS = ["answered", "partial", "not_in_document"];

const DEMO_LIMIT_BODY = {
  error: "Daily demo limit reached - showing offline results",
  demo: true,
};

const admin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;

interface TopLine {
  lineId: string;
}

interface AnswerPayload {
  query: string;
  verdict: string;
  topLines: TopLine[];
  neighborLines: { id: string; text: string }[];
}

class BadRequest extends Error {}

class UsageCapError extends Error {
  constructor(readonly status: 429 | 503) {
    super("usage cap");
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isLineId(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= MAX_LINE_ID_CHARS;
}

async function readBody(req: Request): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_CHARS * 4) throw new BadRequest("Request body too large");
  const text = await req.text();
  if (text.length > MAX_BODY_CHARS) throw new BadRequest("Request body too large");
  try {
    return JSON.parse(text);
  } catch {
    throw new BadRequest("Request body must be valid JSON");
  }
}

// Keeps only the fields the prompt uses, with bounded sizes.
function parsePayload(raw: unknown): AnswerPayload {
  if (!isPlainObject(raw)) throw new BadRequest("Request body must be an object");
  const { query, verdict, topLines, neighborLines } = raw;
  if (typeof query !== "string" || query.trim().length === 0 || query.length > MAX_QUERY_CHARS) {
    throw new BadRequest(`query must be a non-empty string of at most ${MAX_QUERY_CHARS} characters`);
  }
  if (typeof verdict !== "string" || !VERDICTS.includes(verdict)) {
    throw new BadRequest(`verdict must be one of ${VERDICTS.join(", ")}`);
  }
  if (!Array.isArray(topLines) || topLines.length > MAX_TOP_LINES) {
    throw new BadRequest(`topLines must be an array of at most ${MAX_TOP_LINES} lines`);
  }
  if (!Array.isArray(neighborLines) || neighborLines.length > MAX_NEIGHBOR_LINES) {
    throw new BadRequest(`neighborLines must be an array of at most ${MAX_NEIGHBOR_LINES} lines`);
  }
  return {
    query,
    verdict,
    topLines: topLines.map((l, i) => {
      if (!isPlainObject(l) || !isLineId(l.lineId)) throw new BadRequest(`topLines[${i}].lineId is invalid`);
      return { lineId: l.lineId };
    }),
    neighborLines: neighborLines.map((l, i) => {
      if (
        !isPlainObject(l) || !isLineId(l.id) ||
        typeof l.text !== "string" || l.text.length > MAX_LINE_CHARS
      ) {
        throw new BadRequest(`neighborLines[${i}] must be { id, text } with text of at most ${MAX_LINE_CHARS} characters`);
      }
      return { id: l.id, text: l.text };
    }),
  };
}

// Counts one paid upstream fetch against the app-wide daily cap. Fails closed:
// a missing client, an RPC error, or a null/non-numeric result all block the
// call (503); -1 means the cap is reached (429).
async function reserveUpstreamCall(): Promise<void> {
  if (!admin) {
    console.error("usage cap: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
    throw new UsageCapError(503);
  }
  try {
    const { data, error } = await admin.rpc("increment_usage", { fn_name: FN_NAME });
    if (error) {
      console.error("usage cap: increment_usage failed:", error.message);
      throw new UsageCapError(503);
    }
    if (typeof data !== "number" || !Number.isFinite(data)) {
      console.error("usage cap: increment_usage returned no count");
      throw new UsageCapError(503);
    }
    if (data < 0) throw new UsageCapError(429);
  } catch (err) {
    if (err instanceof UsageCapError) throw err;
    console.error("usage cap: increment_usage threw:", err);
    throw new UsageCapError(503);
  }
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
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = parsePayload(await readBody(req));

    if (!OPENAI_API_KEY) {
      return json(
        { error: "The answer writer is not configured. Set OPENAI_API_KEY or use Mock writer mode." },
        503,
      );
    }

    const prompt = buildPrompt(payload);

    await reserveUpstreamCall();
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
      return json({ error: userMessage }, resp.status);
    }

    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content || "No answer generated.";

    return json({ answer });
  } catch (err) {
    if (err instanceof BadRequest) return json({ error: err.message }, 400);
    if (err instanceof UsageCapError) return json(DEMO_LIMIT_BODY, err.status);
    console.error("answer error:", err);
    const msg = err instanceof Error ? err.message : "The answer service encountered an unexpected error.";
    return json({ error: msg }, 500);
  }
});
