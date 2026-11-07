import { z } from 'zod';

export const reviewSchema = z.object({
  id: z.string().min(1).max(80),
  text: z.string().trim().min(3).max(5000),
  rating: z.number().min(1).max(5).nullable(),
  source: z.string().max(80),
  author: z.string().max(100),
  date: z.string().max(60).nullable(),
});
export type Review = z.infer<typeof reviewSchema>;
export type Sentiment = 'positive' | 'negative' | 'mixed' | 'neutral';
export type InsightKind = 'praise' | 'pain' | 'motivation';
export interface ClassifiedReview extends Review { sentiment: Sentiment }
export interface Insight {
  id: string;
  title: string;
  kind: InsightKind;
  description: string;
  reviewIds: string[];
  recommendation: string;
}
export interface Script {
  hook: string;
  problem: string;
  solution: string;
  proof: string;
  cta: string;
}
export interface Angle {
  id: string;
  title: string;
  hook: string;
  rationale: string;
  reviewIds: string[];
  script: Script;
}
export interface Analysis {
  id: string;
  projectName: string;
  createdAt: string;
  mode: 'local' | 'ai';
  isDemo: boolean;
  summary: string;
  reviews: ClassifiedReview[];
  insights: Insight[];
  angles: Angle[];
  importInfo: { duplicates: number; skipped: number };
}
export const analysisInputSchema = z.object({
  projectName: z.string().trim().min(1).max(120),
  reviews: z.array(reviewSchema).min(1).max(2000),
  mode: z.enum(['local', 'ai']).default('local'),
  isDemo: z.boolean().default(false),
  importInfo: z.object({ duplicates: z.number().nonnegative(), skipped: z.number().nonnegative() }).default({ duplicates: 0, skipped: 0 }),
});
export type AnalysisInput = z.infer<typeof analysisInputSchema>;
