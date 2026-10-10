const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TYPESAFE_API_KEY = Deno.env.get("TYPESAFE_API_KEY");
const JEV_MODEL = "jev-1.13.0";
const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_COST_PER_M_INPUT = 0.042;
const MAX_RETRIES = 3;

interface JevRequestBody {
  model: string;
  state: string;
  questions: Record<string, unknown>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callJev(body: JevRequestBody): Promise<Response> {
  const resp = await fetch(JEV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TYPESAFE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if ((resp.status === 429 || resp.status === 529) && MAX_RETRIES > 0) {
    return resp;
  }
  return resp;
}

async function callJevWithRetry(body: JevRequestBody): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const resp = await callJev(body);
      if (resp.status === 429 || resp.status === 529) {
        const backoff = Math.pow(2, attempt) * 500;
        await sleep(backoff);
        continue;
      }
      return resp;
    } catch (err) {
      lastError = err;
      const backoff = Math.pow(2, attempt) * 500;
      await sleep(backoff);
    }
  }
  throw lastError || new Error("Max retries exceeded");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { requestBody } = await req.json();
    if (!requestBody) {
      return new Response(
        JSON.stringify({ error: "Missing requestBody" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!TYPESAFE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "The Jev search service is not configured. Set TYPESAFE_API_KEY or enable Offline replay." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resp = await callJevWithRetry(requestBody as JevRequestBody);
    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`Jev API error ${resp.status}:`, errText);
      let userMessage = `The Jev search service returned an error (HTTP ${resp.status}).`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) userMessage = `Jev search error: ${errJson.error.message}`;
        else if (errJson.error) userMessage = `Jev search error: ${errJson.error}`;
        else if (errJson.message) userMessage = `Jev search error: ${errJson.message}`;
      } catch { /* not JSON */ }
      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    console.log("Jev response model:", data.model);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("jev-search error:", err);
    const msg = err instanceof Error ? err.message : "The Jev search service encountered an unexpected error.";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
