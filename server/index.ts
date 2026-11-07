import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { analysisInputSchema } from '../shared/types';
import { analyzeLocal } from '../shared/analyzer';
import { analyzeAI } from './ai';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '3mb' }));
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const origin = req.get('origin');
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) { res.status(403).json({ error: 'Chỉ cho phép yêu cầu từ ứng dụng cục bộ.' }); return; }
    } catch { res.status(403).json({ error: 'Nguồn yêu cầu không hợp lệ.' }); return; }
  }
  next();
});
app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'ReviewLab', aiConfigured: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_API_KEY ? process.env.OPENAI_MODEL || 'gpt-4o-mini' : null }));

let aiBusy = false;
app.post('/api/analyze', async (req, res) => {
  const parsed = analysisInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Dữ liệu chưa hợp lệ. Cần 1–2.000 review, nội dung 3–5.000 ký tự và điểm sao 1–5 hoặc để trống.' }); return; }
  if (new Set(parsed.data.reviews.map(r => r.id)).size !== parsed.data.reviews.length) { res.status(400).json({ error: 'Mỗi review cần một ID riêng.' }); return; }
  if (parsed.data.mode === 'local') { res.json(analyzeLocal(parsed.data)); return; }
  if (aiBusy) { res.status(429).json({ error: 'Đang xử lý một yêu cầu AI. Chờ báo cáo hiện tại hoàn thành rồi thử lại.' }); return; }
  aiBusy = true;
  try { res.json(await analyzeAI(parsed.data)); }
  catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError' ? 'AI phản hồi quá lâu. Hãy thử với ít review hơn hoặc dùng chế độ cục bộ.' : error instanceof Error ? error.message : 'Chưa phân tích được dữ liệu.';
    res.status(502).json({ error: message });
  } finally { aiBusy = false; }
});
app.use('/api', (_req, res) => { res.status(404).json({ error: 'Không tìm thấy API.' }); });

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
if (existsSync(resolve(dist, 'index.html'))) {
  app.use(express.static(dist));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}
app.use((error: { type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: error.type === 'entity.too.large' ? 'Dữ liệu quá lớn. Chọn file nhỏ hơn 2 MB.' : 'Yêu cầu không hợp lệ. Hãy kiểm tra dữ liệu nhập.' });
});
const port = Number(process.env.PORT || 4387);
const server = app.listen(port, '127.0.0.1');
server.on('listening', () => console.log(`ReviewLab API: http://127.0.0.1:${port} · AI ${process.env.OPENAI_API_KEY ? 'configured' : 'not configured; local mode ready'}`));
server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(error.code === 'EADDRINUSE' ? `Cổng ${port} đang được sử dụng. Đổi PORT và Vite proxy trước khi chạy lại.` : `Không khởi động được API: ${error.message}`);
  process.exit(1);
});
