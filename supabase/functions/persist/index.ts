import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// Insert-only writes for `documents` and `searches`. The browser no longer has
// write access to these tables; it calls this function instead. No AI calls,
// so no usage cap.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Request size limits
const MAX_BODY_CHARS = 4_000_000;
// save_document
const MAX_TITLE_CHARS = 300;
const MAX_SOURCE_CHARS = 300;
const MAX_DOC_LINES = 5_000;
const MAX_DOC_CHARS = 1_000_000;
const MAX_LINE_CHARS = 1_000;
const MAX_ID_CHARS = 32;
const MAX_SECTIONS = 1_000;
// save_search
const MAX_QUERY_CHARS = 500;
const MAX_TOP_LINES = 50;
const MAX_JEV_ITEMS = 128;
const MAX_MODEL_CHARS = 100;
const MAX_ANSWER_CHARS = 10_000;
const MAX_INT = 2_147_483_647;

const SEARCH_MODES = ["single", "two_pass", "replay", "fallback"];
const VERDICTS = ["answered", "partial", "not_in_document"];
const WRITER_MODES = ["live", "mock", "offline"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const admin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;

class BadRequest extends Error {}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, max: number, label: string, { allowEmpty = false } = {}): string {
  if (typeof v !== "string" || (!allowEmpty && v.length === 0) || v.length > max) {
    throw new BadRequest(`${label} must be a string of at most ${max} characters`);
  }
  return v;
}

function int(v: unknown, min: number, max: number, label: string): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw new BadRequest(`${label} must be an integer between ${min} and ${max}`);
  }
  return v;
}

function num(v: unknown, min: number, max: number, label: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
    throw new BadRequest(`${label} must be a number between ${min} and ${max}`);
  }
  return v;
}

function oneOf(v: unknown, allowed: string[], label: string): string {
  if (typeof v !== "string" || !allowed.includes(v)) {
    throw new BadRequest(`${label} must be one of ${allowed.join(", ")}`);
  }
  return v;
}

function bool(v: unknown, label: string): boolean {
  if (typeof v !== "boolean") throw new BadRequest(`${label} must be a boolean`);
  return v;
}

function arr(v: unknown, max: number, label: string): unknown[] {
  if (!Array.isArray(v) || v.length > max) {
    throw new BadRequest(`${label} must be an array of at most ${max} items`);
  }
  return v;
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

function parseDocument(raw: unknown) {
  if (!isPlainObject(raw)) throw new BadRequest("document must be an object");

  let totalChars = 0;
  const lines = arr(raw.lines, MAX_DOC_LINES, "document.lines").map((l, i) => {
    if (!isPlainObject(l)) throw new BadRequest(`document.lines[${i}] must be an object`);
    const text = str(l.text, MAX_LINE_CHARS, `document.lines[${i}].text`, { allowEmpty: true });
    totalChars += text.length;
    return { id: str(l.id, MAX_ID_CHARS, `document.lines[${i}].id`), text };
  });
  if (totalChars > MAX_DOC_CHARS) {
    throw new BadRequest(`Document is too large (max ${MAX_DOC_CHARS} characters)`);
  }

  const sections = arr(raw.sections, MAX_SECTIONS, "document.sections").map((s, i) => {
    if (!isPlainObject(s)) throw new BadRequest(`document.sections[${i}] must be an object`);
    return {
      id: str(s.id, MAX_ID_CHARS, `document.sections[${i}].id`),
      heading: str(s.heading, MAX_LINE_CHARS, `document.sections[${i}].heading`, { allowEmpty: true }),
      startLine: int(s.startLine, -1, MAX_DOC_LINES, `document.sections[${i}].startLine`),
      endLine: int(s.endLine, -1, MAX_DOC_LINES, `document.sections[${i}].endLine`),
    };
  });

  return {
    title: str(raw.title, MAX_TITLE_CHARS, "document.title"),
    source: str(raw.source, MAX_SOURCE_CHARS, "document.source"),
    is_sample: bool(raw.isSample, "document.isSample"),
    // Derived server-side rather than trusted from the client.
    line_count: lines.length,
    token_estimate: Math.ceil(totalChars / 4),
    lines,
    sections,
  };
}

function parseTopLines(v: unknown, label: string) {
  return arr(v, MAX_TOP_LINES, label).map((l, i) => {
    if (!isPlainObject(l)) throw new BadRequest(`${label}[${i}] must be an object`);
    const line: Record<string, unknown> = {
      lineId: str(l.lineId, MAX_ID_CHARS, `${label}[${i}].lineId`),
      text: str(l.text, MAX_LINE_CHARS, `${label}[${i}].text`, { allowEmpty: true }),
      relevance: num(l.relevance, -1e6, 1e6, `${label}[${i}].relevance`),
    };
    if (l.sectionId !== undefined) line.sectionId = str(l.sectionId, MAX_ID_CHARS, `${label}[${i}].sectionId`);
    if (l.sectionProb !== undefined) line.sectionProb = num(l.sectionProb, 0, 1, `${label}[${i}].sectionProb`);
    return line;
  });
}

function parseBaseline(v: unknown) {
  if (v === null || v === undefined) return {};
  if (!isPlainObject(v)) throw new BadRequest("search.baseline must be an object");
  if (Object.keys(v).length === 0) return {};
  return {
    topLines: parseTopLines(v.topLines, "search.baseline.topLines"),
    latencyMs: num(v.latencyMs, 0, MAX_INT, "search.baseline.latencyMs"),
    costUsd: num(v.costUsd, 0, 1e6, "search.baseline.costUsd"),
    model: str(v.model, MAX_MODEL_CHARS, "search.baseline.model"),
  };
}

function parseJevItems(v: unknown, label: string) {
  const items = arr(v, MAX_JEV_ITEMS, label);
  items.forEach((item, i) => {
    if (!isPlainObject(item)) throw new BadRequest(`${label}[${i}] must be an object`);
  });
  return items;
}

function parseSearch(raw: unknown) {
  if (!isPlainObject(raw)) throw new BadRequest("search must be an object");
  const documentId = str(raw.document_id, 36, "search.document_id");
  if (!UUID_RE.test(documentId)) throw new BadRequest("search.document_id must be a UUID");

  return {
    document_id: documentId,
    query: str(raw.query, MAX_QUERY_CHARS, "search.query"),
    mode: oneOf(raw.mode, SEARCH_MODES, "search.mode"),
    exists_p: num(raw.exists_p, 0, 1, "search.exists_p"),
    verdict: oneOf(raw.verdict, VERDICTS, "search.verdict"),
    top_lines: parseTopLines(raw.top_lines, "search.top_lines"),
    jev_requests: parseJevItems(raw.jev_requests, "search.jev_requests"),
    jev_responses: parseJevItems(raw.jev_responses, "search.jev_responses"),
    model: raw.model === null || raw.model === undefined ? null : str(raw.model, MAX_MODEL_CHARS, "search.model"),
    latency_ms: int(raw.latency_ms, 0, MAX_INT, "search.latency_ms"),
    input_tokens: int(raw.input_tokens, 0, MAX_INT, "search.input_tokens"),
    cost_usd: num(raw.cost_usd, 0, 1e6, "search.cost_usd"),
    answer: raw.answer === null || raw.answer === undefined
      ? null
      : str(raw.answer, MAX_ANSWER_CHARS, "search.answer", { allowEmpty: true }),
    writer_mode: oneOf(raw.writer_mode, WRITER_MODES, "search.writer_mode"),
    baseline: parseBaseline(raw.baseline),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    if (!admin) {
      console.error("persist: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
      return json({ error: "Storage is not available." }, 503);
    }

    const body = await readBody(req);
    if (!isPlainObject(body)) throw new BadRequest("Request body must be an object");

    if (body.action === "save_document") {
      const row = parseDocument(body.document);
      const { data, error } = await admin.from("documents").insert(row).select("id").single();
      if (error || !data) {
        console.error("persist save_document failed:", error?.message);
        return json({ error: "Could not save the document." }, 500);
      }
      return json({ id: data.id });
    }

    if (body.action === "save_search") {
      const row = parseSearch(body.search);

      const { data: doc, error: docErr } = await admin
        .from("documents")
        .select("id")
        .eq("id", row.document_id)
        .maybeSingle();
      if (docErr) {
        console.error("persist document lookup failed:", docErr.message);
        return json({ error: "Could not save the search." }, 500);
      }
      if (!doc) return json({ error: "Document not found." }, 404);

      const { data, error } = await admin.from("searches").insert(row).select("*").single();
      if (error || !data) {
        console.error("persist save_search failed:", error?.message);
        return json({ error: "Could not save the search." }, 500);
      }
      return json({ record: data });
    }

    throw new BadRequest('action must be "save_document" or "save_search"');
  } catch (err) {
    if (err instanceof BadRequest) return json({ error: err.message }, 400);
    console.error("persist error:", err);
    return json({ error: "The persist service encountered an unexpected error." }, 500);
  }
});
