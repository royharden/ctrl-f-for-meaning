import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FN_NAME = "embed-search";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_BASE_URL = Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1";
const OPENAI_EMBED_MODEL = Deno.env.get("OPENAI_EMBED_MODEL") || "text-embedding-3-small";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const EMBED_COST_PER_M_INPUT = 0.02;
const BATCH_SIZE = 100;

// Request size limits
const MAX_BODY_CHARS = 2_500_000;
const MAX_LINES = 2_000;
const MAX_LINE_CHARS = 500;
const MAX_LINE_ID_CHARS = 32;
const MAX_QUERY_CHARS = 500;

const DEMO_LIMIT_BODY = {
  error: "Daily demo limit reached - showing offline results",
  demo: true,
};

const admin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;

interface DocLine {
  id: string;
  text: string;
}

interface EmbedSearchPayload {
  lines: DocLine[];
  query: string;
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

// Only `lines` and `query` are used. A client-supplied `model` (or anything
// else) is ignored: the embedding model comes from OPENAI_EMBED_MODEL only.
function parsePayload(raw: unknown): EmbedSearchPayload {
  if (!isPlainObject(raw)) throw new BadRequest("Request body must be an object");
  const { query, lines } = raw;
  if (typeof query !== "string" || query.trim().length === 0 || query.length > MAX_QUERY_CHARS) {
    throw new BadRequest(`query must be a non-empty string of at most ${MAX_QUERY_CHARS} characters`);
  }
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > MAX_LINES) {
    throw new BadRequest(`lines must be an array of 1-${MAX_LINES} lines`);
  }
  const parsed: DocLine[] = lines.map((l, i) => {
    if (
      !isPlainObject(l) ||
      typeof l.id !== "string" || l.id.length === 0 || l.id.length > MAX_LINE_ID_CHARS ||
      typeof l.text !== "string" || l.text.length === 0 || l.text.length > MAX_LINE_CHARS
    ) {
      throw new BadRequest(`lines[${i}] must be { id, text } with text of 1-${MAX_LINE_CHARS} characters`);
    }
    return { id: l.id, text: l.text };
  });
  return { query, lines: parsed };
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

async function embed(input: string | string[]): Promise<Response> {
  // Each embeddings request (the query and every batch) counts against the cap.
  await reserveUpstreamCall();
  return fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_EMBED_MODEL,
      input,
    }),
  });
}

async function embeddingsError(resp: Response, label: string): Promise<Response> {
  const errText = await resp.text();
  console.error(`${label} ${resp.status}:`, errText);
  let userMessage = `The embeddings service returned an error (HTTP ${resp.status}).`;
  try {
    const errJson = JSON.parse(errText);
    if (errJson.error?.message) userMessage = `Embeddings error: ${errJson.error.message}`;
  } catch { /* not JSON */ }
  return json({ error: userMessage }, resp.status);
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { lines, query } = parsePayload(await readBody(req));
    const model = OPENAI_EMBED_MODEL;

    if (!OPENAI_API_KEY) {
      return json(
        { error: "The embeddings baseline is not configured. Set OPENAI_API_KEY or disable the comparison toggle." },
        503,
      );
    }

    const startTime = performance.now();

    // Get query embedding
    const queryResp = await embed(query);
    if (!queryResp.ok) return await embeddingsError(queryResp, "Embedding API error");

    const queryData = await queryResp.json();
    const queryEmbedding = queryData.data[0].embedding as number[];
    let totalInputTokens = queryData.usage?.total_tokens || 0;

    // Get line embeddings in batches
    const lineEmbeddings: { lineId: string; embedding: number[] }[] = [];
    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
      const batch = lines.slice(i, i + BATCH_SIZE);
      const batchResp = await embed(batch.map((l) => l.text));
      if (!batchResp.ok) return await embeddingsError(batchResp, "Embedding batch error");

      const batchData = await batchResp.json();
      totalInputTokens += batchData.usage?.total_tokens || 0;
      for (let j = 0; j < batch.length; j++) {
        lineEmbeddings.push({
          lineId: batch[j].id,
          embedding: batchData.data[j].embedding as number[],
        });
      }
    }

    // Compute cosine similarity and rank
    const scored = lineEmbeddings.map((le) => ({
      lineId: le.lineId,
      text: lines.find((l) => l.id === le.lineId)?.text || "",
      score: cosineSim(queryEmbedding, le.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    const topLines = scored.slice(0, 8);

    const latencyMs = Math.round(performance.now() - startTime);
    const costUsd = (totalInputTokens * EMBED_COST_PER_M_INPUT) / 1_000_000;

    return json({
      topLines,
      latencyMs,
      costUsd,
      model,
      inputTokens: totalInputTokens,
    });
  } catch (err) {
    if (err instanceof BadRequest) return json({ error: err.message }, 400);
    if (err instanceof UsageCapError) return json(DEMO_LIMIT_BODY, err.status);
    console.error("embed-search error:", err);
    const msg = err instanceof Error ? err.message : "The embeddings service encountered an unexpected error.";
    return json({ error: msg }, 500);
  }
});
