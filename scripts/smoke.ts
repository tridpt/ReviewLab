import assert from 'node:assert/strict';
import { demoReviews } from '../shared/demo';
import { getStats } from '../shared/analyzer';
import type { Analysis } from '../shared/types';

const api = process.env.SMOKE_API_URL || 'http://127.0.0.1:4387';
const web = process.env.SMOKE_WEB_URL || 'http://127.0.0.1:5188';
const health = await fetch(`${api}/api/health`).then(r => r.json()) as { app: string; aiConfigured: boolean };
assert.equal(health.app, 'ReviewLab');
console.log('PASS API health identifies ReviewLab');
const proxied = await fetch(`${web}/api/health`).then(r => r.json()) as { app: string };
assert.equal(proxied.app, 'ReviewLab');
console.log('PASS Vite proxy reaches the correct API');
const homepage = await fetch(web);
assert.equal(homepage.status, 200);
assert.match(await homepage.text(), /ReviewLab/);
console.log('PASS Web entry serves HTML');

const input = { projectName: 'Smoke test · Dữ liệu giả lập', reviews: demoReviews, mode: 'local', isDemo: true, importInfo: { duplicates: 0, skipped: 0 } };
const response = await fetch(`${api}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
assert.equal(response.status, 200);
const report = await response.json() as Analysis;
assert.equal(report.reviews.length, 36);
assert.equal(report.mode, 'local');
assert.ok(report.insights.length > 0);
assert.ok(report.angles.length >= 3);
assert.equal(getStats(report).total, 36);
console.log(`PASS Analysis endpoint: ${report.insights.length} insights, ${report.angles.length} angles, all 36 reviews`);

const invalid = await fetch(`${api}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, reviews: [] }) });
assert.equal(invalid.status, 400);
console.log('PASS Invalid input returns 400');
const duplicate = await fetch(`${api}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, reviews: [demoReviews[0], demoReviews[0]] }) });
assert.equal(duplicate.status, 400);
console.log('PASS Duplicate IDs are rejected');
const foreign = await fetch(`${api}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://foreign.example' }, body: JSON.stringify(input) });
assert.equal(foreign.status, 403);
console.log('PASS Requests from foreign origins are rejected');
const malformed = await fetch(`${api}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
assert.equal(malformed.status, 400);
assert.match((await malformed.json() as { error: string }).error, /không hợp lệ/);
console.log('PASS Malformed JSON returns a readable error');
if (!health.aiConfigured) {
  const noKey = await fetch(`${api}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, mode: 'ai' }) });
  assert.equal(noKey.status, 502);
  assert.match((await noKey.json() as { error: string }).error, /OPENAI_API_KEY/);
  console.log('PASS Unconfigured AI returns an explicit error; no provider request made');
}
console.log('All HTTP smoke checks passed.');
