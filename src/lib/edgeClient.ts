import { supabase } from '@/lib/supabase';
import type {
  SearchResult,
  BaselineResult,
  TopLine,
  DocLine,
  JevRequest,
  JevResponse,
  SearchRecord,
} from '@/types';
import {
  JEV_MODEL,
  JEV_COST_PER_M_INPUT,
  EMBED_COST_PER_M_INPUT,
  MAX_EMBED_LINES,
} from '@/types';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';
import {
  splitIntoWindows,
  linesToTaggedString,
  buildChoiceOptions,
  sectionToWindows,
  outlineToTaggedString,
  buildSectionChoiceOptions,
} from '@/lib/documentPrep';
import type { DocSection } from '@/types';

interface JevSearchPayload {
  lines: DocLine[];
  sections: DocSection[];
  query: string;
}

interface JevApiResponse {
  model: string;
  answers: {
    where?: {
      type: 'choice';
      choice: string;
      confidence: number;
      probabilities: Record<string, number>;
    };
    exists?: {
      type: 'noul';
      noul: number;
    };
    section?: {
      type: 'choice';
      choice: string;
      confidence: number;
      probabilities: Record<string, number>;
    };
  };
  usage: { input_tokens: number; output_tokens: number };
}

export const DEMO_LIMIT_MESSAGE = 'Daily demo limit reached - showing offline results';

/** The daily demo cap was hit (or the cap check failed closed): no paid call was made. */
export class DemoLimitError extends Error {
  readonly demo = true;
  constructor(message = DEMO_LIMIT_MESSAGE) {
    super(message);
    this.name = 'DemoLimitError';
  }
}

export function isDemoLimitError(err: unknown): err is DemoLimitError {
  return err instanceof DemoLimitError;
}

async function extractEdgeError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.demo === true) {
        return new DemoLimitError(typeof body.error === 'string' ? body.error : DEMO_LIMIT_MESSAGE);
      }
      if (body?.error) return new Error(body.error);
      return new Error(`Edge function returned HTTP ${error.context.status}`);
    } catch {
      return new Error(`Edge function returned HTTP ${error.context.status}`);
    }
  }
  if (error instanceof FunctionsRelayError) {
    return new Error(`Relay error: ${error.message}`);
  }
  if (error instanceof FunctionsFetchError) {
    return new Error(`Network error reaching the edge function. Check your connection.`);
  }
  if (error instanceof Error) return error;
  return new Error('An unexpected error occurred.');
}

async function callJevSearch(payload: JevSearchPayload): Promise<SearchResult> {
  const { lines, sections, query } = payload;
  const startTime = performance.now();

  const singleWindow = splitIntoWindows(lines);
  const isSinglePass = singleWindow.length === 1;

  const requests: JevRequest[] = [];
  const responses: JevResponse[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  let topLines: TopLine[] = [];
  let existsValue = 0;
  let sectionProbs: { id: string; heading: string; probability: number }[] | undefined;

  if (isSinglePass) {
    const window = singleWindow[0];
    const state = linesToTaggedString(window.lines);
    const options = buildChoiceOptions(window.lines);

    const whereInstructions = `Which line of the document contains the answer to: "${query}"`;
    const existsInstructions = `Does any line of the document address or answer: "${query}"`;

    const body = {
      model: JEV_MODEL,
      state,
      questions: {
        where: {
          type: 'choice',
          instructions: whereInstructions,
          criteria: options,
        },
        exists: {
          type: 'noul',
          instructions: existsInstructions,
          criteria: {
            true: 'At least one line of the document states or directly implies the answer',
            false: 'No line of the document addresses this',
          },
        },
      },
    };

    const { data, error } = await supabase.functions.invoke('jev-search', {
      body: { requestBody: body },
    });

    if (error) throw await extractEdgeError(error);
    const resp = data as JevApiResponse;
    totalInputTokens += resp.usage.input_tokens;
    totalOutputTokens += resp.usage.output_tokens;

    responses.push({
      model: resp.model,
      answers: resp.answers,
      usage: resp.usage,
    });
    requests.push({
      model: JEV_MODEL,
      state,
      questionType: 'where+exists',
      instructions: `${whereInstructions} ${existsInstructions}`,
      options,
    });

    const whereProbs = resp.answers.where?.probabilities || {};
    const existsNoul = resp.answers.exists?.noul ?? 0;
    existsValue = existsNoul;

    topLines = Object.entries(whereProbs)
      .map(([lineId, prob]) => {
        const line = lines.find((l) => l.id === lineId);
        return line
          ? { lineId, text: line.text, relevance: prob }
          : null;
      })
      .filter((x): x is TopLine => x !== null)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 8);
  } else {
    // Two-pass: section selection
    const outlineState = outlineToTaggedString(lines, sections);
    const sectionOptions = buildSectionChoiceOptions(sections);

    const sectionReq: JevRequest = {
      model: JEV_MODEL,
      state: outlineState,
      questionType: 'section',
      instructions: `Which section of the document is most likely to contain the answer to: "${query}"`,
      options: sectionOptions,
    };

    // jev-search only accepts `where`/`exists` questions, so the section pass
    // is sent as a `where` choice over section IDs.
    const sectionBody = {
      model: JEV_MODEL,
      state: outlineState,
      questions: {
        where: {
          type: 'choice',
          instructions: sectionReq.instructions,
          criteria: sectionOptions,
        },
      },
    };

    const { data: sectionData, error: sectionError } = await supabase.functions.invoke('jev-search', {
      body: { requestBody: sectionBody },
    });

    if (sectionError) throw await extractEdgeError(sectionError);
    const sectionResp = sectionData as JevApiResponse;
    const sectionAnswer = sectionResp.answers.where;
    totalInputTokens += sectionResp.usage.input_tokens;
    totalOutputTokens += sectionResp.usage.output_tokens;
    responses.push({
      model: sectionResp.model,
      answers: { section: sectionAnswer },
      usage: sectionResp.usage,
    });
    requests.push(sectionReq);

    const sectionProbMap = sectionAnswer?.probabilities || {};
    const sortedSections = sections
      .map((s) => ({ id: s.id, heading: s.heading, probability: sectionProbMap[s.id] || 0 }))
      .sort((a, b) => b.probability - a.probability);

    let cumulative = 0;
    const keptSections: typeof sortedSections = [];
    for (const s of sortedSections) {
      if (s.id === 'none') continue;
      if (cumulative >= 0.9 || keptSections.length >= 3) break;
      if (s.probability <= 0) break;
      keptSections.push(s);
      cumulative += s.probability;
    }
    sectionProbs = sortedSections.slice(0, 5);

    // Pass 2: line search in each kept section
    for (const kept of keptSections) {
      const section = sections.find((s) => s.id === kept.id);
      if (!section) continue;
      const sectionWindows = sectionToWindows(lines, section);

      for (const { taggedState, window } of sectionWindows) {
        const options = buildChoiceOptions(
          lines.slice(window.startIdx, window.endIdx + 1),
        );

        const lineBody = {
          model: JEV_MODEL,
          state: taggedState,
          questions: {
            where: {
              type: 'choice',
              instructions: `Which line of the document contains the answer to: "${query}"`,
              criteria: options,
            },
            exists: {
              type: 'noul',
              instructions: `Does any line of the document address or answer: "${query}"`,
              criteria: {
                true: 'At least one line of the document states or directly implies the answer',
                false: 'No line of the document addresses this',
              },
            },
          },
        };

        const reqW: JevRequest = {
          model: JEV_MODEL,
          state: taggedState,
          questionType: 'where',
          instructions: `Which line contains the answer to: "${query}"`,
          options,
        };
        const reqE: JevRequest = {
          model: JEV_MODEL,
          state: taggedState,
          questionType: 'exists',
          instructions: `Does any line address: "${query}"`,
          options: {
            true: 'At least one line states or directly implies the answer',
            false: 'No line addresses this',
          },
        };

        const { data: lineData, error: lineError } = await supabase.functions.invoke('jev-search', {
          body: { requestBody: lineBody },
        });

        if (lineError) throw await extractEdgeError(lineError);
        const lineResp = lineData as JevApiResponse;
        totalInputTokens += lineResp.usage.input_tokens;
        totalOutputTokens += lineResp.usage.output_tokens;
        responses.push({
          model: lineResp.model,
          answers: lineResp.answers,
          usage: lineResp.usage,
        });
        requests.push(reqW, reqE);

        const whereProbs = lineResp.answers.where?.probabilities || {};
        const existsNoul = lineResp.answers.exists?.noul ?? 0;

        for (const [lineId, prob] of Object.entries(whereProbs)) {
          const line = lines.find((l) => l.id === lineId);
          if (line) {
            topLines.push({
              lineId,
              text: line.text,
              relevance: kept.probability * prob,
              sectionId: kept.id,
              sectionProb: kept.probability,
            });
          }
        }

        existsValue = Math.max(existsValue, existsNoul);
      }
    }

    topLines.sort((a, b) => b.relevance - a.relevance);
    topLines = topLines.slice(0, 8);
  }

  const latencyMs = Math.round(performance.now() - startTime);
  const costUsd = (totalInputTokens * JEV_COST_PER_M_INPUT) / 1_000_000;

  return {
    where: topLines[0]?.lineId ?? null,
    exists: existsValue,
    sections: sectionProbs,
    topLines,
    requests,
    responses,
    model: responses[0]?.model || JEV_MODEL,
    usage: { input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
    latencyMs,
    costUsd,
    mode: isSinglePass ? 'single' : 'two_pass',
  };
}

interface AnswerPayload {
  query: string;
  verdict: string;
  topLines: TopLine[];
  neighborLines: { id: string; text: string }[];
  writerMode: 'live' | 'mock';
}

export async function callAnswer(payload: AnswerPayload): Promise<string> {
  if (payload.writerMode === 'mock') {
    return mockAnswer(payload);
  }

  const { data, error } = await supabase.functions.invoke('answer', {
    body: payload,
  });

  if (error) throw await extractEdgeError(error);
  if (!data || typeof (data as { answer?: string }).answer !== 'string') {
    throw new Error('The answer service returned an unexpected response.');
  }
  return (data as { answer: string }).answer;
}

function mockAnswer(payload: AnswerPayload): string {
  const { query, verdict, topLines } = payload;
  const verdictSentence = verdictSentenceFor(verdict, query);

  if (topLines.length === 0) {
    return `${verdictSentence}\n\nNo specific lines were identified in the document.`;
  }

  const quotes = topLines
    .slice(0, 5)
    .map((l) => `[${l.lineId}] "${l.text}"`)
    .join('\n\n');

  return `${verdictSentence}\n\n${quotes}`;
}

export function verdictSentenceFor(verdict: string, query: string): string {
  switch (verdict) {
    case 'answered':
      return `The document answers your question: "${query}".`;
    case 'partial':
      return `The document partially addresses your question: "${query}".`;
    default:
      return `The document does not address your question: "${query}".`;
  }
}

interface EmbedPayload {
  documentId: string;
  lines: DocLine[];
  query: string;
}

export async function callEmbedSearch(payload: EmbedPayload): Promise<BaselineResult> {
  if (payload.lines.length > MAX_EMBED_LINES) {
    throw new Error(`The embeddings baseline supports documents up to ${MAX_EMBED_LINES} lines.`);
  }
  const startTime = performance.now();
  const { data, error } = await supabase.functions.invoke('embed-search', {
    body: payload,
  });

  if (error) throw await extractEdgeError(error);
  if (!data || !Array.isArray((data as { topLines?: unknown[] }).topLines)) {
    throw new Error('The embeddings service returned an unexpected response.');
  }
  const result = data as {
    topLines: { lineId: string; text: string; score: number }[];
    latencyMs: number;
    costUsd: number;
    model: string;
    inputTokens: number;
  };

  const topLines: TopLine[] = result.topLines.map((l) => ({
    lineId: l.lineId,
    text: l.text,
    relevance: l.score,
  }));

  return {
    topLines,
    latencyMs: Math.round(performance.now() - startTime),
    costUsd: result.costUsd,
    model: result.model,
  };
}

// Writes go through the `persist` edge function; the browser has read-only
// access to the tables.

export interface NewDocument {
  title: string;
  source: string;
  isSample: boolean;
  lines: DocLine[];
  sections: DocSection[];
}

/** Inserts a new document row and returns its id. */
export async function saveDocument(doc: NewDocument): Promise<string> {
  const { data, error } = await supabase.functions.invoke('persist', {
    body: {
      action: 'save_document',
      document: {
        title: doc.title,
        source: doc.source,
        isSample: doc.isSample,
        lines: doc.lines,
        sections: doc.sections,
      },
    },
  });
  if (error) throw await extractEdgeError(error);
  const id = (data as { id?: unknown } | null)?.id;
  if (typeof id !== 'string') throw new Error('The persist service returned an unexpected response.');
  return id;
}

export type NewSearch = Omit<SearchRecord, 'id' | 'created_at' | 'baseline'> & {
  baseline: BaselineResult | Record<string, never>;
};

/** Inserts a search row for an existing document and returns the stored record. */
export async function saveSearch(search: NewSearch): Promise<SearchRecord> {
  const { data, error } = await supabase.functions.invoke('persist', {
    body: { action: 'save_search', search },
  });
  if (error) throw await extractEdgeError(error);
  const record = (data as { record?: SearchRecord } | null)?.record;
  if (!record || typeof record.id !== 'string') {
    throw new Error('The persist service returned an unexpected response.');
  }
  return record;
}

export { callJevSearch };
