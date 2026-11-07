import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeLocal, classifySentiment, getStats } from '../shared/analyzer';
import { parseReviews, toCsv } from '../shared/import';
import { demoReviews, demoProject } from '../shared/demo';
import { reportMarkdown, reviewsCsv } from '../shared/export';
import { analysisInputSchema, type AnalysisInput, type Review } from '../shared/types';
import { validateAIResult, analyzeAI } from '../server/ai';

const review = (text: string, rating: number | null = null, id = 'RV-001'): Review => ({ id, text, rating, source: 'CSV', author: 'Người thử nghiệm', date: null });
const input = (reviews: Review[]): AnalysisInput => ({ projectName: 'Serum thử nghiệm', reviews, mode: 'local', isDemo: false, importInfo: { duplicates: 0, skipped: 0 } });

test('CSV: quoted commas, multiline content, BOM and Vietnamese headers', () => {
  const data = parseReviews('\uFEFFNội dung,Điểm,Nguồn\r\n"Thấm nhanh, không bết\nDùng tốt",5,Shopee\r\n"Mùi nồng",2,Website', 'csv');
  assert.equal(data.reviews.length, 2);
  assert.equal(data.reviews[0].rating, 5);
  assert.match(data.reviews[0].text, /\n/);
  assert.equal(data.reviews[0].source, 'Shopee');
});
test('CSV: semicolon delimiter and unrated review', () => {
  const data = parseReviews('review;rating;source\nDùng khá ổn;;Website\nDa mềm mịn;8;Shopee', 'csv');
  assert.equal(data.reviews.length, 2);
  assert.equal(data.reviews[0].rating, null);
  assert.equal(data.reviews[1].rating, null);
  assert.equal(data.warnings.length, 1);
});
test('Import: deduplicate, preserve diacritics, discard empty/too short lines', () => {
  const data = parseReviews('Thấm nhanh\nthấm nhanh\nOK\n\nDa mềm\nĐã mềm', 'text');
  assert.equal(data.reviews.length, 3);
  assert.equal(data.duplicates, 1);
  assert.equal(data.skipped, 1);
});
test('Import: explicit failures for missing header, malformed CSV and oversized batches', () => {
  assert.throws(() => parseReviews('name,rating\nA,5', 'csv'), /cột nội dung/);
  assert.throws(() => parseReviews('review,rating\n"chưa đóng,5', 'csv'), /ngoặc kép/);
  assert.throws(() => parseReviews(Array.from({ length: 2001 }, (_, i) => `Review số ${i}`).join('\n'), 'text'), /2.000/);
  assert.equal(parseReviews('   ', 'text').reviews.length, 0);
});
test('Sentiment: Vietnamese negation and mixed opinions', () => {
  assert.equal(classifySentiment(review('Không kích ứng, không bết dính.')), 'positive');
  assert.equal(classifySentiment(review('Không hề bị kích ứng.')), 'positive');
  assert.equal(classifySentiment(review('Sản phẩm không tốt, không đáng tiền.')), 'negative');
  assert.equal(classifySentiment(review('Mình không hề thích.')), 'negative');
  assert.equal(classifySentiment(review('Thấm nhanh nhưng mùi nồng.')), 'mixed');
  assert.equal(classifySentiment(review('Mới nhận hôm qua.')), 'neutral');
});
test('Sentiment: rating is a fallback only when text has no signal', () => {
  assert.equal(classifySentiment(review('Mới nhận hôm qua.', 5)), 'positive');
  assert.equal(classifySentiment(review('Mới nhận hôm qua.', 1)), 'negative');
  assert.equal(classifySentiment(review('Thất vọng, sản phẩm không tốt.', 5)), 'negative');
});
test('Analysis: negated irritation is never a pain point', () => {
  const result = analyzeLocal(input([review('Không bị kích ứng, không bết dính.')]));
  assert.ok(result.insights.some(i => i.id === 'texture-praise'));
  assert.equal(result.insights.some(i => i.id === 'gentle-pain'), false);
  assert.equal(result.insights.some(i => i.id === 'texture-pain'), false);
});
test('Analysis: negative hydration does not become positive evidence', () => {
  const result = analyzeLocal(input([review('Da mình không đủ ẩm và không dịu nhẹ.')]));
  assert.ok(result.insights.some(i => i.id === 'hydration-pain'));
  assert.equal(result.insights.some(i => i.id === 'hydration-praise'), false);
  assert.equal(result.insights.some(i => i.id === 'gentle-praise'), false);
});
test('Analysis: does not infer buying motives from product praise', () => {
  const result = analyzeLocal(input([review('Thấm nhanh và đủ ẩm.')]));
  assert.equal(result.insights.some(i => i.kind === 'motivation'), false);
});
test('Analysis: negated repurchase is not a repurchase motivation', () => {
  const result = analyzeLocal(input([review('Mình không muốn mua lại.')]));
  assert.equal(result.insights.some(i => i.id === 'motivation-repeat'), false);
  assert.equal(result.reviews[0].sentiment, 'negative');
});
test('Analysis: shipping praise never becomes a skincare benefit angle', () => {
  const result = analyzeLocal(input([review('Giao hàng nhanh, đóng gói chắc chắn.')]));
  assert.ok(result.insights.some(i => i.id === 'delivery-praise'));
  assert.equal(result.angles.length, 0);
});
test('Analysis: insufficient text yields no fabricated themes or scripts', () => {
  const result = analyzeLocal(input([review('Mới nhận hôm qua.', 3)]));
  assert.equal(result.insights.length, 0);
  assert.equal(result.angles.length, 0);
  assert.match(result.summary, /Chưa đủ tín hiệu/);
});
test('Demo: every insight and angle refers to real input IDs', () => {
  const result = analyzeLocal({ ...input(demoReviews), isDemo: true, projectName: demoProject });
  const ids = new Set(demoReviews.map(r => r.id));
  assert.equal(result.reviews.length, 36);
  assert.ok(result.angles.length >= 3);
  for (const entity of [...result.insights, ...result.angles]) {
    assert.ok(entity.reviewIds.length > 0);
    assert.ok(entity.reviewIds.every(id => ids.has(id)));
    assert.equal(new Set(entity.reviewIds).size, entity.reviewIds.length);
  }
  assert.ok(result.insights.some(i => i.kind === 'pain'));
  assert.ok(result.reviews.some(r => r.sentiment === 'mixed'));
});
test('Statistics: ratings average excludes missing ratings; sentiment denominator is all reviews', () => {
  const result = analyzeLocal(input([review('Mới nhận hàng.', 4), review('Mới dùng hôm qua.', null, 'RV-002'), review('Mới mở hộp.', 2, 'RV-003')]));
  const stats = getStats(result);
  assert.equal(stats.averageRating, 3);
  assert.equal(stats.ratedCount, 2);
  assert.equal(stats.positivePercent, 33);
  assert.equal(Object.values(stats.counts).reduce((a, b) => a + b, 0), 3);
});
test('Export: preserves original evidence and labels simulated data', () => {
  const result = analyzeLocal({ ...input(demoReviews), isDemo: true });
  const md = reportMarkdown(result);
  assert.match(md, /DỮ LIỆU MẪU GIẢ LẬP/);
  assert.ok(md.includes(demoReviews[0].text));
  assert.ok(md.includes('RV-001'));
  assert.ok(reviewsCsv(result).startsWith('\uFEFF'));
  assert.match(toCsv([{ review: '=HYPERLINK("example")' }]), /'=HYPERLINK/);
});
test('Input schema: rejects invalid stars and too many reviews', () => {
  assert.equal(analysisInputSchema.safeParse(input([review('Nội dung hợp lệ.', 6)])).success, false);
  assert.equal(analysisInputSchema.safeParse(input([])).success, false);
});

function aiFixture() {
  return { summary: 'Một review về kết cấu.', classifications: [{ id: 'RV-001', sentiment: 'positive' }], insights: [{ id: 'texture', title: 'Thấm nhanh', kind: 'praise', description: 'Một review có nhắc.', reviewIds: ['RV-001'], recommendation: 'Quay kết cấu thật.' }], angles: [] };
}
test('AI validator: accepts grounded IDs, rejects nonexistent references', () => {
  const data = input([review('Thấm nhanh.')]);
  const fixture = aiFixture();
  assert.equal(validateAIResult(fixture, data).mode, 'ai');
  fixture.insights[0].reviewIds = ['RV-999'];
  assert.throws(() => validateAIResult(fixture, data), /không tồn tại/);
});
test('AI validator: refuses partial classification and duplicate insight IDs', () => {
  const data = input([review('Thấm nhanh.')]);
  const fixture = aiFixture();
  fixture.classifications = [];
  assert.throws(() => validateAIResult(fixture, data), /đầy đủ/);
  const duplicate = aiFixture(); duplicate.insights.push({ ...duplicate.insights[0] });
  assert.throws(() => validateAIResult(duplicate, data), /trùng lặp/);
});
test('AI request: mock transport checks Responses schema, privacy and incomplete response', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-only-never-sent';
  try {
    let captured: Record<string, unknown> | undefined;
    globalThis.fetch = (async (_url: unknown, options: RequestInit) => {
      captured = JSON.parse(String(options.body));
      return new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(aiFixture()) }] }] }), { status: 200 });
    }) as typeof fetch;
    const result = await analyzeAI(input([review('Thấm nhanh.')]));
    assert.equal(result.reviews.length, 1);
    assert.equal(captured?.store, false);
    assert.match(JSON.stringify(captured?.text), /json_schema/);
    assert.equal(JSON.stringify(captured?.input).includes('Người thử nghiệm'), false);
    globalThis.fetch = (async () => new Response(JSON.stringify({ status: 'incomplete', output: [] }), { status: 200 })) as typeof fetch;
    await assert.rejects(analyzeAI(input([review('Thấm nhanh.')])), /chưa hoàn thành/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  }
});
