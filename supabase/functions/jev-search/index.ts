import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FN_NAME = "jev-search";
const TYPESAFE_API_KEY = Deno.env.get("TYPESAFE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const JEV_MODEL = "jev-1.13.0";
const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const MAX_RETRIES = 3;

// Request size limits
const MAX_BODY_CHARS = 200_000;
const MAX_STATE_CHARS = 60_000;
const MAX_INSTRUCTIONS_CHARS = 1_000;
const MAX_OPTIONS = 256;
const MAX_CRITERION_CHARS = 500;
const OPTION_KEY_RE = /^[A-Za-z0-9_-]{1,32}$/;

const DEMO_LIMIT_BODY = {
  error: "Daily demo limit reached - showing offline results",
  demo: true,
};

const admin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;

interface ChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
}

interface NoulQuestion {
  type: "noul";
  instructions: string;
  criteria: { true: string; false: string };
}

interface JevRequestBody {
  model: string;
  state: string;
  questions: { where?: ChoiceQuestion; exists?: NoulQuestion };
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

function onlyKeys(obj: Record<string, unknown>, allowed: string[], label: string) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) throw new BadRequest(`Unexpected field "${key}" in ${label}`);
  }
}

function boundedString(v: unknown, max: number, label: string): string {
  if (typeof v !== "string" || v.length === 0 || v.length > max) {
    throw new BadRequest(`${label} must be a non-empty string of at most ${max} characters`);
  }
  return v;
}

function parseWhere(raw: unknown): ChoiceQuestion {
  if (!isPlainObject(raw)) throw new BadRequest("questions.where must be an object");
  onlyKeys(raw, ["type", "instructions", "criteria"], "questions.where");
  if (raw.type !== "choice") throw new BadRequest('questions.where.type must be "choice"');
  const instructions = boundedString(raw.instructions, MAX_INSTRUCTIONS_CHARS, "questions.where.instructions");
  if (!isPlainObject(raw.criteria)) throw new BadRequest("questions.where.criteria must be an object");
  const entries = Object.entries(raw.criteria);
  if (entries.length === 0 || entries.length > MAX_OPTIONS) {
    throw new BadRequest(`questions.where.criteria must have 1-${MAX_OPTIONS} options`);
  }
  const criteria: Record<string, string | null> = {};
  for (const [key, value] of entries) {
    if (!OPTION_KEY_RE.test(key)) throw new BadRequest(`Invalid option id "${key.slice(0, 40)}"`);
    if (value !== null && (typeof value !== "string" || value.length > MAX_CRITERION_CHARS)) {
      throw new BadRequest(`Option "${key}" criteria must be null or a string of at most ${MAX_CRITERION_CHARS} characters`);
    }
    criteria[key] = value;
  }
  return { type: "choice", instructions, criteria };
}

function parseExists(raw: unknown): NoulQuestion {
  if (!isPlainObject(raw)) throw new BadRequest("questions.exists must be an object");
  onlyKeys(raw, ["type", "instructions", "criteria"], "questions.exists");
  if (raw.type !== "noul") throw new BadRequest('questions.exists.type must be "noul"');
  const instructions = boundedString(raw.instructions, MAX_INSTRUCTIONS_CHARS, "questions.exists.instructions");
  if (!isPlainObject(raw.criteria)) throw new BadRequest("questions.exists.criteria must be an object");
  onlyKeys(raw.criteria, ["true", "false"], "questions.exists.criteria");
  return {
    type: "noul",
    instructions,
    criteria: {
      true: boundedString(raw.criteria.true, MAX_CRITERION_CHARS, "questions.exists.criteria.true"),
      false: boundedString(raw.criteria.false, MAX_CRITERION_CHARS, "questions.exists.criteria.false"),
    },
  };
}

// Rebuilds the upstream request from validated fields only. The model is
// always pinned server-side; any client-supplied model is ignored.
function parseRequestBody(raw: unknown): JevRequestBody {
  if (!isPlainObject(raw)) throw new BadRequest("Missing requestBody");
  onlyKeys(raw, ["model", "state", "questions"], "requestBody");
  const state = boundedString(raw.state, MAX_STATE_CHARS, "requestBody.state");
  if (!isPlainObject(raw.questions)) throw new BadRequest("requestBody.questions must be an object");
  onlyKeys(raw.questions, ["where", "exists"], "requestBody.questions");

  const questions: JevRequestBody["questions"] = {};
  if (raw.questions.where !== undefined) questions.where = parseWhere(raw.questions.where);
  if (raw.questions.exists !== undefined) questions.exists = parseExists(raw.questions.exists);
  if (!questions.where && !questions.exists) {
    throw new BadRequest("requestBody.questions must include where and/or exists");
  }
  return { model: JEV_MODEL, state, questions };
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function callJev(body: JevRequestBody): Promise<Response> {
  return fetch(JEV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TYPESAFE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function callJevWithRetry(body: JevRequestBody): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Every attempt, retries included, is a paid call and counts against the cap.
    await reserveUpstreamCall();
    try {
      const resp = await callJev(body);
      if (resp.status === 429 || resp.status === 529) {
        await resp.body?.cancel();
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
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const raw = await readBody(req);
    if (!isPlainObject(raw)) throw new BadRequest("Missing requestBody");
    onlyKeys(raw, ["requestBody"], "request");
    const jevBody = parseRequestBody(raw.requestBody);

    if (!TYPESAFE_API_KEY) {
      return json(
        { error: "The Jev search service is not configured. Set TYPESAFE_API_KEY or enable Offline replay." },
        503,
      );
    }

    const resp = await callJevWithRetry(jevBody);
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
      return json({ error: userMessage }, resp.status);
    }

    const data = await resp.json();
    console.log("Jev response model:", data.model);

    return json(data);
  } catch (err) {
    if (err instanceof BadRequest) return json({ error: err.message }, 400);
    if (err instanceof UsageCapError) return json(DEMO_LIMIT_BODY, err.status);
    console.error("jev-search error:", err);
    const msg = err instanceof Error ? err.message : "The Jev search service encountered an unexpected error.";
    return json({ error: msg }, 500);
  }
});
