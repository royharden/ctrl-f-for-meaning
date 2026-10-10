import type { DocLine, TopLine } from '@/types';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export function bm25Rank(
  lines: DocLine[],
  query: string,
  opts: { k1?: number; b?: number; maxResults?: number } = {},
): TopLine[] {
  const { k1 = 1.5, b = 0.75, maxResults = 8 } = opts;
  const queryTerms = new Set(tokenize(query));
  if (queryTerms.size === 0 || lines.length === 0) return [];

  const N = lines.length;
  const docTokens = lines.map((l) => tokenize(l.text));
  const avgdl = docTokens.reduce((s, t) => s + t.length, 0) / N;

  const df: Record<string, number> = {};
  for (const tokens of docTokens) {
    const seen = new Set(tokens);
    for (const t of seen) {
      df[t] = (df[t] || 0) + 1;
    }
  }

  const scored: TopLine[] = lines.map((line, i) => {
    const tokens = docTokens[i];
    const tf: Record<string, number> = {};
    for (const t of tokens) {
      tf[t] = (tf[t] || 0) + 1;
    }
    let score = 0;
    for (const qt of queryTerms) {
      if (tf[qt] && df[qt]) {
        const idf = Math.log(1 + (N - df[qt] + 0.5) / (df[qt] + 0.5));
        const dl = tokens.length;
        const tfNorm = (tf[qt] * (k1 + 1)) / (tf[qt] + k1 * (1 - b + b * (dl / avgdl)));
        score += idf * tfNorm;
      }
    }
    return { lineId: line.id, text: line.text, relevance: score };
  });

  const sorted = scored.sort((a, b) => b.relevance - a.relevance);
  const maxScore = sorted[0]?.relevance || 1;
  const normalized = sorted
    .filter((s) => s.relevance > 0)
    .slice(0, maxResults)
    .map((s) => ({ ...s, relevance: maxScore > 0 ? s.relevance / maxScore : 0 }));
  return normalized;
}

export function tfidfCosineRank(
  lines: DocLine[],
  query: string,
  maxResults = 8,
): TopLine[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || lines.length === 0) return [];

  const N = lines.length;
  const docTokens = lines.map((l) => tokenize(l.text));

  const df: Record<string, number> = {};
  for (const tokens of docTokens) {
    const seen = new Set(tokens);
    for (const t of seen) df[t] = (df[t] || 0) + 1;
  }

  function tfidfVector(tokens: string[]): Map<string, number> {
    const tf: Record<string, number> = {};
    for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
    const vec = new Map<string, number>();
    for (const [term, count] of Object.entries(tf)) {
      const idf = Math.log(1 + N / (df[term] || 1));
      vec.set(term, (count / tokens.length) * idf);
    }
    return vec;
  }

  function cosine(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (const [k, v] of a) {
      magA += v * v;
      if (b.has(k)) dot += v * (b.get(k) || 0);
    }
    for (const v of b.values()) magB += v * v;
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  const queryVec = tfidfVector(queryTokens);
  const scored: TopLine[] = lines.map((line, i) => {
    const lineVec = tfidfVector(docTokens[i]);
    const sim = cosine(queryVec, lineVec);
    return { lineId: line.id, text: line.text, relevance: sim };
  });

  return scored
    .sort((a, b) => b.relevance - a.relevance)
    .filter((s) => s.relevance > 0)
    .slice(0, maxResults);
}

export function fallbackExists(topLines: TopLine[], query: string): number {
  if (topLines.length === 0) return 0;
  const queryTokens = new Set(tokenize(query));
  let bestOverlap = 0;
  for (const line of topLines.slice(0, 3)) {
    const lineTokens = new Set(tokenize(line.text));
    let overlap = 0;
    for (const qt of queryTokens) {
      if (lineTokens.has(qt)) overlap++;
    }
    const ratio = overlap / queryTokens.size;
    if (ratio > bestOverlap) bestOverlap = ratio;
  }
  return Math.min(0.95, bestOverlap);
}
