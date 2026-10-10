const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_BASE_URL = Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1";
const OPENAI_EMBED_MODEL = Deno.env.get("OPENAI_EMBED_MODEL") || "text-embedding-3-small";
const EMBED_COST_PER_M_INPUT = 0.02;
const BATCH_SIZE = 100;

interface DocLine {
  id: string;
  text: string;
}

interface EmbedSearchPayload {
  documentId: string;
  lines: DocLine[];
  query: string;
  model?: string;
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

  try {
    const payload = (await req.json()) as EmbedSearchPayload;
    const { documentId, lines, query } = payload;
    const model = payload.model || OPENAI_EMBED_MODEL;

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "The embeddings baseline is not configured. Set OPENAI_API_KEY or disable the comparison toggle." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const startTime = performance.now();

    // Get query embedding
    const queryResp = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: query,
      }),
    });

    if (!queryResp.ok) {
      const errText = await queryResp.text();
      console.error(`Embedding API error ${queryResp.status}:`, errText);
      let userMessage = `The embeddings service returned an error (HTTP ${queryResp.status}).`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) userMessage = `Embeddings error: ${errJson.error.message}`;
      } catch { /* not JSON */ }
      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: queryResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const queryData = await queryResp.json();
    const queryEmbedding = queryData.data[0].embedding as number[];
    let totalInputTokens = queryData.usage?.total_tokens || 0;

    // Get line embeddings in batches
    const lineEmbeddings: { lineId: string; embedding: number[] }[] = [];
    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
      const batch = lines.slice(i, i + BATCH_SIZE);
      const batchResp = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: batch.map((l) => l.text),
        }),
      });

      if (!batchResp.ok) {
        const errText = await batchResp.text();
        console.error(`Embedding batch error ${batchResp.status}:`, errText);
        let userMessage = `The embeddings service returned an error (HTTP ${batchResp.status}).`;
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error?.message) userMessage = `Embeddings error: ${errJson.error.message}`;
        } catch { /* not JSON */ }
        return new Response(
          JSON.stringify({ error: userMessage }),
          { status: batchResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

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

    return new Response(
      JSON.stringify({
        topLines,
        latencyMs,
        costUsd,
        model,
        inputTokens: totalInputTokens,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("embed-search error:", err);
    const msg = err instanceof Error ? err.message : "The embeddings service encountered an unexpected error.";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
