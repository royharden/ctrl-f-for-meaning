import type {
  DocLine,
  DocSection,
  SearchResult,
  BaselineResult,
  TopLine,
  VerdictThresholds,
  WriterMode,
  SearchRecord,
} from '@/types';
import { EMBED_COST_PER_M_INPUT } from '@/types';
import { callJevSearch, callAnswer, callEmbedSearch, verdictSentenceFor } from '@/lib/edgeClient';
import { bm25Rank, fallbackExists, tfidfCosineRank } from '@/lib/fallback';
import { findFixture } from '@/fixtures/recorded';
import { computeVerdict } from '@/lib/verdict';
import { getNeighborLines } from '@/lib/documentPrep';
import { supabase } from '@/lib/supabase';

export interface SearchParams {
  documentId: string;
  docDbId: string | null;
  docTitle: string;
  docSource: string;
  docIsSample: boolean;
  docTokenEstimate: number;
  lines: DocLine[];
  sections: DocSection[];
  query: string;
  thresholds: VerdictThresholds;
  compareEmbeddings: boolean;
  writerMode: WriterMode;
  offlineReplay: boolean;
  docSourceId: string;
}

export interface SearchOutcome {
  result: SearchResult;
  baseline: BaselineResult | null;
  verdict: ReturnType<typeof computeVerdict>;
  answer: string;
  isReplay: boolean;
  isFallback: boolean;
  searchRecord: SearchRecord | null;
  warning: string | null;
  docDbId: string | null;
}

export async function runSearch(params: SearchParams): Promise<SearchOutcome> {
  const { lines, sections, query, thresholds, compareEmbeddings, writerMode, offlineReplay, docSourceId, docDbId, docTitle, docSource, docIsSample, docTokenEstimate } = params;

  // Try offline replay first if enabled
  if (offlineReplay) {
    return replaySearch(params);
  }

  let result: SearchResult;
  let baseline: BaselineResult | null = null;
  let isFallback = false;
  let isReplay = false;
  let warning: string | null = null;

  try {
    result = await callJevSearch({ lines, sections, query });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    warning = `Jev search failed: ${errMsg}. Showing fallback results.`;
    // Try recorded fixture
    const fixture = findFixture(query, docSourceId);
    if (fixture) {
      result = { ...fixture.jev, mode: 'replay' };
      isReplay = true;
      warning = `Jev search failed: ${errMsg}. Showing recorded replay.`;
    } else {
      // Fallback to BM25
      const topLines = bm25Rank(lines, query);
      const exists = fallbackExists(topLines, query);
      result = {
        where: topLines[0]?.lineId ?? null,
        exists,
        topLines,
        requests: [],
        responses: [],
        model: 'fallback-bm25',
        usage: { input_tokens: 0, output_tokens: 0 },
        latencyMs: 0,
        costUsd: 0,
        mode: 'fallback',
      };
      isFallback = true;
    }
  }

  // Get baseline if requested
  if (compareEmbeddings && !isFallback) {
    try {
      if (docDbId) {
        baseline = await callEmbedSearch({
          documentId: docDbId,
          lines,
          query,
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      warning = warning ?? `Embeddings baseline failed: ${errMsg}. Showing TF-IDF fallback.`;
      baseline = tfidfBaseline(lines, query);
    }
  } else if (compareEmbeddings && isFallback) {
    baseline = tfidfBaseline(lines, query);
  }

  const verdict = computeVerdict(result.exists, thresholds);

  // Get answer
  let answer: string;
  if (isFallback) {
    answer = mockAnswerFromLines(query, verdict, result.topLines);
  } else if (writerMode === 'mock') {
    answer = mockAnswerFromLines(query, verdict, result.topLines);
  } else if (writerMode === 'offline') {
    answer = mockAnswerFromLines(query, verdict, result.topLines);
  } else {
    try {
      const neighborLines: { id: string; text: string }[] = [];
      for (const tl of result.topLines.slice(0, 8)) {
        const neighbors = getNeighborLines(lines, tl.lineId, 1);
        for (const n of neighbors) {
          if (!neighborLines.find((nl) => nl.id === n.id)) {
            neighborLines.push(n);
          }
        }
      }
      answer = await callAnswer({
        query,
        verdict,
        topLines: result.topLines,
        neighborLines,
        writerMode: 'live',
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      warning = warning ?? `LLM writer failed: ${errMsg}. Showing extractive answer.`;
      answer = mockAnswerFromLines(query, verdict, result.topLines);
    }
  }

  // Persist to database — upsert document first to satisfy the FK on searches
  let searchRecord: SearchRecord | null = null;
  let resolvedDocDbId = docDbId;
  try {
    if (!resolvedDocDbId) {
      const { data: docData, error: docErr } = await supabase
        .from('documents')
        .insert({
          title: docTitle,
          source: docSource,
          is_sample: docIsSample,
          line_count: lines.length,
          token_estimate: docTokenEstimate,
          lines,
          sections,
        })
        .select('id')
        .maybeSingle();
      if (!docErr && docData) {
        resolvedDocDbId = docData.id;
      }
    } else {
      const { error: docErr } = await supabase
        .from('documents')
        .upsert({
          id: resolvedDocDbId,
          title: docTitle,
          source: docSource,
          is_sample: docIsSample,
          line_count: lines.length,
          token_estimate: docTokenEstimate,
          lines,
          sections,
        }, { onConflict: 'id' });
      if (docErr) {
        // upsert failed — try a fresh insert instead
        const { data: docData, error: docErr2 } = await supabase
          .from('documents')
          .insert({
            title: docTitle,
            source: docSource,
            is_sample: docIsSample,
            line_count: lines.length,
            token_estimate: docTokenEstimate,
            lines,
            sections,
          })
          .select('id')
          .maybeSingle();
        if (!docErr2 && docData) {
          resolvedDocDbId = docData.id;
        }
      }
    }

    if (resolvedDocDbId) {
      const { data, error } = await supabase
        .from('searches')
        .insert({
          document_id: resolvedDocDbId,
          query,
          mode: isReplay ? 'replay' : isFallback ? 'fallback' : result.mode,
          exists_p: result.exists,
          verdict,
          top_lines: result.topLines,
          jev_requests: result.requests,
          jev_responses: result.responses,
          model: result.model,
          latency_ms: result.latencyMs,
          input_tokens: result.usage.input_tokens,
          cost_usd: result.costUsd,
          answer,
          writer_mode: isFallback ? 'mock' : writerMode,
          baseline: baseline ?? {},
        })
        .select('*')
        .maybeSingle();
      if (!error && data) {
        searchRecord = data as SearchRecord;
      }
    }
  } catch {
    // Persist failure is non-fatal
  }

  return { result, baseline, verdict, answer, isReplay, isFallback, searchRecord, warning, docDbId: resolvedDocDbId };
}

async function replaySearch(params: SearchParams): Promise<SearchOutcome> {
  const { lines, query, thresholds, compareEmbeddings, docSourceId } = params;

  const fixture = findFixture(query, docSourceId);
  if (fixture) {
    const result = { ...fixture.jev, mode: 'replay' as const };
    const verdict = computeVerdict(result.exists, thresholds);
    const answer = mockAnswerFromLines(query, verdict, result.topLines);

    let baseline: BaselineResult | null = null;
    if (compareEmbeddings) {
      baseline = fixture.baseline;
    }

    return { result, baseline, verdict, answer, isReplay: true, isFallback: false, searchRecord: null, warning: null, docDbId: params.docDbId ?? null };
  }

  // No fixture for this query — use fallback
  const topLines = bm25Rank(lines, query);
  const exists = fallbackExists(topLines, query);
  const result: SearchResult = {
    where: topLines[0]?.lineId ?? null,
    exists,
    topLines,
    requests: [],
    responses: [],
    model: 'fallback-bm25',
    usage: { input_tokens: 0, output_tokens: 0 },
    latencyMs: 0,
    costUsd: 0,
    mode: 'fallback',
  };
  const verdict = computeVerdict(result.exists, thresholds);
  const answer = mockAnswerFromLines(query, verdict, result.topLines);
  const baseline = compareEmbeddings ? tfidfBaseline(lines, query) : null;

  return { result, baseline, verdict, answer, isReplay: false, isFallback: true, searchRecord: null, warning: null, docDbId: params.docDbId ?? null };
}

function mockAnswerFromLines(
  query: string,
  verdict: string,
  topLines: TopLine[],
): string {
  const sentence = verdictSentenceFor(verdict, query);
  if (topLines.length === 0) {
    return `${sentence}\n\nNo specific lines were identified in the document.`;
  }
  const quotes = topLines
    .slice(0, 5)
    .filter((l) => l.relevance >= 0.05)
    .map((l) => `[${l.lineId}] "${l.text}"`)
    .join('\n\n');
  return `${sentence}${quotes ? '\n\n' + quotes : ''}`;
}

function tfidfBaseline(lines: DocLine[], query: string): BaselineResult {
  const topLines = tfidfCosineRank(lines, query, 5);
  const inputTokens = Math.ceil(lines.reduce((s, l) => s + l.text.length, 0) / 4);
  return {
    topLines,
    latencyMs: 0,
    costUsd: (inputTokens * EMBED_COST_PER_M_INPUT) / 1_000_000,
    model: 'tfidf-fallback',
  };
}

export async function loadSearchHistory(docDbId: string | null): Promise<SearchRecord[]> {
  if (!docDbId) return [];
  const { data, error } = await supabase
    .from('searches')
    .select('*')
    .eq('document_id', docDbId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data as SearchRecord[];
}

export interface SearchStats {
  totalSearches: number;
  avgJevLatency: number;
  jevCost: number;
  embedCost: number;
  llmReadCost: number;
}

export async function loadStats(
  docDbId: string | null,
  lines: DocLine[],
  llmReadCostPerM: number,
): Promise<SearchStats> {
  const history = await loadSearchHistory(docDbId);
  const totalSearches = history.length;
  const jevSearches = history.filter((s) => s.mode === 'single' || s.mode === 'two_pass');
  const avgJevLatency = jevSearches.length > 0
    ? Math.round(jevSearches.reduce((s, r) => s + r.latency_ms, 0) / jevSearches.length)
    : 0;
  const jevCost = history.reduce((s, r) => s + Number(r.cost_usd), 0);
  const embedCost = history.reduce((s, r) => {
    const baseline = r.baseline as BaselineResult | null;
    return s + (baseline?.costUsd ?? 0);
  }, 0);
  const fullDocTokens = Math.ceil(lines.reduce((s, l) => s + l.text.length, 0) / 4);
  const llmReadCost = (fullDocTokens * llmReadCostPerM) / 1_000_000;

  return { totalSearches, avgJevLatency, jevCost, embedCost, llmReadCost };
}
