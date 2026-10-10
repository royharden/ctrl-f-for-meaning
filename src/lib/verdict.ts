import type { Verdict, VerdictThresholds } from '@/types';

export function computeVerdict(
  exists: number,
  thresholds: VerdictThresholds,
): Verdict {
  if (exists >= thresholds.found) return 'answered';
  if (exists < thresholds.absent) return 'not_in_document';
  return 'partial';
}

export function verdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case 'answered':
      return 'Answered';
    case 'partial':
      return 'Partially addressed';
    case 'not_in_document':
      return 'Not in this document';
  }
}

export function verdictColor(verdict: Verdict): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (verdict) {
    case 'answered':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'partial':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'not_in_document':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-300',
        dot: 'bg-slate-400',
      };
  }
}

export function noulConfidence(noul: number): number {
  return Math.abs(2 * noul - 1);
}
