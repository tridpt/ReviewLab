import type { Analysis, Angle } from './types';
import { toCsv } from './import';

export function scriptMarkdown(angle: Angle, project: string): string {
  return `# Kịch bản: ${angle.title}\n\nSản phẩm: ${project}\n\n${angle.rationale}\n\n## 0–3s · Mở đầu\n${angle.script.hook}\n\n## 3–8s · Đặt vấn đề\n${angle.script.problem}\n\n## 8–16s · Trải nghiệm sản phẩm\n${angle.script.solution}\n\n## 16–25s · Dẫn chứng\n${angle.script.proof}\n\n## 25–30s · Kêu gọi hành động\n${angle.script.cta}\n\nNguồn: ${angle.reviewIds.join(', ')}\n\nBản nháp khoảng 30 giây; cần đọc thử và biên tập theo tốc độ nói. Xác minh thông tin sản phẩm trước khi phát hành.\n`;
}

export function reportMarkdown(a: Analysis): string {
  return `# ReviewLab · ${a.projectName}\n\n${a.isDemo ? '**DỮ LIỆU MẪU GIẢ LẬP — không phải review khách hàng thật.**\n\n' : ''}Ngày phân tích: ${new Date(a.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' })}\nChế độ: ${a.mode === 'ai' ? 'AI' : 'Cục bộ · từ khóa và điểm sao'}\n\n${a.summary}\n\n## Insight\n\n${a.insights.map(i => `### ${i.title}\n${i.description}\n\nGợi ý: ${i.recommendation}\n\nDẫn chứng: ${i.reviewIds.join(', ')}\n`).join('\n')}\n## Góc quảng cáo & kịch bản\n\n${a.angles.map(angle => scriptMarkdown(angle, a.projectName)).join('\n---\n\n')}\n## Review gốc\n\n${a.reviews.map(r => `- **${r.id}** · ${r.source} · ${r.rating === null ? 'Không có điểm sao' : `${r.rating}/5`} · ${r.author}\n  > ${r.text.replace(/\n/g, '\n  > ')}`).join('\n\n')}\n`;
}

export function reviewsCsv(a: Analysis): string {
  return toCsv(a.reviews.map(r => ({ id: r.id, review: r.text, rating: r.rating ?? '', source: r.source, author: r.author, date: r.date ?? '', sentiment: r.sentiment })));
}
