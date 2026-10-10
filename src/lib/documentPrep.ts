import type { DocLine, DocSection, Window } from '@/types';
import {
  MAX_LINE_CHARS,
  MAX_WINDOW_LINES,
  MAX_WINDOW_TOKENS,
} from '@/types';

function splitLongLine(text: string): string[] {
  if (text.length <= MAX_LINE_CHARS) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > MAX_LINE_CHARS) {
    const slice = remaining.slice(0, MAX_LINE_CHARS);
    const lastSentenceEnd = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf('? '),
      slice.lastIndexOf('; '),
    );
    let cut: number;
    if (lastSentenceEnd > MAX_LINE_CHARS * 0.4) {
      cut = lastSentenceEnd + 1;
    } else {
      const lastSpace = slice.lastIndexOf(' ');
      cut = lastSpace > 0 ? lastSpace : MAX_LINE_CHARS;
    }
    parts.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining.length > 0) parts.push(remaining);
  return parts;
}

export function splitIntoLines(rawText: string): DocLine[] {
  const rawLines = rawText.split(/\r?\n/);
  const result: DocLine[] = [];
  let lineNum = 1;
  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    const subParts = splitLongLine(trimmed);
    for (const part of subParts) {
      result.push({
        id: `L${String(lineNum).padStart(4, '0')}`,
        text: part,
      });
      lineNum++;
    }
  }
  return result;
}

export function estimateTokens(lines: DocLine[]): number {
  const totalChars = lines.reduce((sum, l) => sum + l.text.length, 0);
  return Math.ceil(totalChars / 4);
}

const HEADING_PATTERNS = [
  /^#{1,6}\s+/,
  /^\d+(\.\d+)*\.\s+/,
  /^\d+(\.\d+)*\s+/,
  /^[A-Z]\.\s+/,
  /^[IVXLC]+\.\s+/i,
];

function isHeading(text: string): boolean {
  if (text.length > 80) return false;
  for (const pat of HEADING_PATTERNS) {
    if (pat.test(text)) return true;
  }
  const upperRatio = text.replace(/[^A-Za-z]/g, '').length;
  if (
    upperRatio > 0 &&
    text === text.toUpperCase() &&
    text.length >= 3 &&
    !/^\d+$/.test(text)
  ) {
    return true;
  }
  return false;
}

export function buildSections(lines: DocLine[]): DocSection[] {
  const sections: DocSection[] = [];
  let sectionNum = 0;
  let currentHeading: string | null = null;
  let currentStart = 0;

  for (let i = 0; i < lines.length; i++) {
    if (isHeading(lines[i].text)) {
      if (currentHeading !== null) {
        sections.push({
          id: `S${String(sectionNum).padStart(2, '0')}`,
          heading: currentHeading,
          startLine: currentStart,
          endLine: i - 1,
        });
      }
      sectionNum++;
      currentHeading = lines[i].text;
      currentStart = i;
    }
  }
  if (currentHeading !== null) {
    sections.push({
      id: `S${String(sectionNum).padStart(2, '0')}`,
      heading: currentHeading,
      startLine: currentStart,
      endLine: lines.length - 1,
    });
  }
  if (sections.length === 0) {
    sections.push({
      id: 'S01',
      heading: 'Document',
      startLine: 0,
      endLine: lines.length - 1,
    });
  }
  return sections;
}

export function estimateWindowTokens(lines: DocLine[]): number {
  return estimateTokens(lines);
}

export function splitIntoWindows(lines: DocLine[]): Window[] {
  const windows: Window[] = [];
  let i = 0;
  while (i < lines.length) {
    let end = Math.min(i + MAX_WINDOW_LINES, lines.length);
    let tokenEst = estimateWindowTokens(lines.slice(i, end));
    while (tokenEst > MAX_WINDOW_TOKENS && end > i + 1) {
      end--;
      tokenEst = estimateWindowTokens(lines.slice(i, end));
    }
    windows.push({ lines: lines.slice(i, end), startIdx: i, endIdx: end - 1 });
    i = end;
  }
  return windows;
}

export function linesToTaggedString(lines: DocLine[]): string {
  return lines.map((l) => `${l.id}| ${l.text}`).join('\n');
}

export function outlineToTaggedString(
  lines: DocLine[],
  sections: DocSection[],
): string {
  return sections
    .map((s) => {
      const headingLine = lines[s.startLine]?.text ?? s.heading;
      const preview = headingLine.slice(0, 160);
      return `${s.id}| ${preview}`;
    })
    .join('\n');
}

export function sectionToTaggedString(
  lines: DocLine[],
  section: DocSection,
): string {
  const sectionLines = lines.slice(section.startLine, section.endLine + 1);
  return linesToTaggedString(sectionLines);
}

export function sectionToWindows(
  lines: DocLine[],
  section: DocSection,
): { window: Window; taggedState: string }[] {
  const sectionLines = lines.slice(section.startLine, section.endLine + 1);
  const windows = splitIntoWindows(sectionLines);
  return windows.map((w) => ({
    window: {
      ...w,
      startIdx: w.startIdx + section.startLine,
      endIdx: w.endIdx + section.startLine,
    },
    taggedState: linesToTaggedString(w.lines),
  }));
}

export function buildChoiceOptions(
  lines: DocLine[],
): Record<string, null> {
  const options: Record<string, null> = {};
  for (const l of lines) {
    options[l.id] = null;
  }
  return options;
}

export function buildSectionChoiceOptions(
  sections: DocSection[],
): Record<string, string> {
  const options: Record<string, string> = {};
  for (const s of sections) {
    options[s.id] = null as unknown as string;
  }
  options['none'] = 'No section is likely to answer the question.';
  return options as Record<string, string>;
}

export function prepareDocument(rawText: string): {
  lines: DocLine[];
  sections: DocSection[];
  tokenEstimate: number;
} {
  const lines = splitIntoLines(rawText);
  const sections = buildSections(lines);
  const tokenEstimate = estimateTokens(lines);
  return { lines, sections, tokenEstimate };
}

export function getNeighborLines(
  lines: DocLine[],
  lineId: string,
  neighborCount = 1,
): { id: string; text: string }[] {
  const idx = lines.findIndex((l) => l.id === lineId);
  if (idx === -1) return [];
  const start = Math.max(0, idx - neighborCount);
  const end = Math.min(lines.length - 1, idx + neighborCount);
  return lines.slice(start, end + 1).map((l) => ({ id: l.id, text: l.text }));
}

export function isTwoPass(lines: DocLine[], sections: DocSection[]): boolean {
  const tokenEst = estimateTokens(lines);
  return tokenEst > MAX_WINDOW_TOKENS || (sections.length > 1 && lines.length > 250);
}
