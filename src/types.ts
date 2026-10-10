export interface DocLine {
  id: string;
  text: string;
}

export interface DocSection {
  id: string;
  heading: string;
  startLine: number;
  endLine: number;
}

export interface DocumentData {
  id: string;
  title: string;
  source: string;
  isSample: boolean;
  lineCount: number;
  tokenEstimate: number;
  lines: DocLine[];
  sections: DocSection[];
}

export interface Window {
  lines: DocLine[];
  startIdx: number;
  endIdx: number;
}

export type Verdict = 'answered' | 'partial' | 'not_in_document';

export interface TopLine {
  lineId: string;
  text: string;
  relevance: number;
  sectionId?: string;
  sectionProb?: number;
}

export interface JevRequest {
  model: string;
  state: string;
  questionType: 'where' | 'exists' | 'section' | 'where+exists';
  instructions: string;
  options: Record<string, string | null>;
}

export interface JevResponse {
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
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface SearchResult {
  where: string | null;
  exists: number;
  sections?: { id: string; heading: string; probability: number }[];
  topLines: TopLine[];
  requests: JevRequest[];
  responses: JevResponse[];
  model: string;
  usage: { input_tokens: number; output_tokens: number };
  latencyMs: number;
  costUsd: number;
  mode: 'single' | 'two_pass' | 'replay' | 'fallback';
}

export interface BaselineResult {
  topLines: TopLine[];
  latencyMs: number;
  costUsd: number;
  model: string;
}

export interface SearchRecord {
  id: string;
  document_id: string;
  query: string;
  mode: string;
  exists_p: number;
  verdict: string;
  top_lines: TopLine[];
  jev_requests: JevRequest[];
  jev_responses: JevResponse[];
  model: string | null;
  latency_ms: number;
  input_tokens: number;
  cost_usd: number;
  answer: string | null;
  writer_mode: string;
  baseline: BaselineResult | null;
  created_at: string;
}

export interface VerdictThresholds {
  found: number;
  absent: number;
}

export type WriterMode = 'live' | 'mock' | 'offline';

export const JEV_MODEL = 'jev-1.13.0';
export const JEV_COST_PER_M_INPUT = 0.042;
export const EMBED_COST_PER_M_INPUT = 0.02;
export const MAX_WINDOW_LINES = 250;
export const MAX_WINDOW_TOKENS = 24000;
export const MAX_LINE_CHARS = 400;
export const MAX_SECTION_KEEP = 3;
export const SECTION_PROB_CUTOFF = 0.9;
export const MAX_OPTIONS = 255;
