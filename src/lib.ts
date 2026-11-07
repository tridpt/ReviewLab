import { z } from 'zod';
import { reviewSchema } from '../shared/types';
import type { Analysis } from '../shared/types';

const insight = z.object({ id: z.string(), title: z.string(), kind: z.enum(['praise', 'pain', 'motivation']), description: z.string(), reviewIds: z.array(z.string()), recommendation: z.string() });
const angle = z.object({ id: z.string(), title: z.string(), hook: z.string(), rationale: z.string(), reviewIds: z.array(z.string()), script: z.object({ hook: z.string(), problem: z.string(), solution: z.string(), proof: z.string(), cta: z.string() }) });
const storedReport = z.object({
  id: z.string(), projectName: z.string(), createdAt: z.string(), mode: z.enum(['local', 'ai']), isDemo: z.boolean(), summary: z.string(),
  reviews: z.array(reviewSchema.extend({ sentiment: z.enum(['positive', 'negative', 'mixed', 'neutral']) })).min(1).max(2000),
  insights: z.array(insight), angles: z.array(angle), importInfo: z.object({ duplicates: z.number(), skipped: z.number() }),
});
const storageKey = 'reviewlab.reports.v1';
export function readHistory(): Analysis[] {
  try {
    const result = z.array(storedReport).max(5).safeParse(JSON.parse(localStorage.getItem(storageKey) || '[]'));
    return result.success ? result.data : [];
  } catch { return []; }
}
export function saveHistory(history: Analysis[]): boolean {
  try {
    const trimmed = history.slice(0, 5);
    while (trimmed.length > 1 && JSON.stringify(trimmed).length > 1400000) trimmed.pop();
    localStorage.setItem(storageKey, JSON.stringify(trimmed));
    return true;
  } catch { return false; }
}
export function download(content: string, filename: string, type = 'text/markdown;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const number = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
export const percent = (count: number, total: number) => total ? Math.round(count / total * 100) : 0;
export const sourceClass = (source: string) => source.toLowerCase().includes('shopee') ? 'shopee' : source.toLowerCase().includes('tiktok') ? 'tiktok' : 'other';
export const sentimentLabel = { positive: 'Tích cực', negative: 'Tiêu cực', mixed: 'Trái chiều', neutral: 'Trung tính' };
