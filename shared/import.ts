import Papa from 'papaparse';
import type { Review } from './types';

export function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
}

const textKeys = ['review', 'reviewtext', 'text', 'content', 'comment', 'body', 'noidung', 'noidungdanhgia', 'danhgia', 'binhluan', 'reviewcontent'];
const key = (s: string) => normalize(s).replace(/[^a-z0-9]/g, '');
const get = (row: Record<string, string>, keys: string[]) => Object.entries(row).find(([k]) => keys.includes(key(k)))?.[1]?.trim() || '';

export interface ImportResult {
  reviews: Review[];
  duplicates: number;
  skipped: number;
  warnings: string[];
}

export function parseReviews(raw: string, format: 'csv' | 'text', source = 'Nhập thủ công'): ImportResult {
  if (!raw.trim()) return { reviews: [], duplicates: 0, skipped: 0, warnings: [] };
  let rows: Array<Record<string, string>>;
  const warnings: string[] = [];
  if (format === 'csv') {
    const result = Papa.parse<Record<string, string>>(raw.replace(/^\uFEFF/, ''), {
      header: true, skipEmptyLines: 'greedy', transformHeader: s => s.trim(),
    });
    if (!result.meta.fields?.some(k => textKeys.includes(key(k)))) {
      throw new Error('Không tìm thấy cột nội dung review. Dùng tên cột review, content, text hoặc nội dung.');
    }
    if (result.errors.some(e => e.code === 'MissingQuotes')) throw new Error('File CSV có dấu ngoặc kép chưa đóng. Hãy kiểm tra file rồi nhập lại.');
    if (result.errors.length) warnings.push(`${result.errors.length} dòng CSV có cấu trúc chưa chuẩn; kiểm tra bản xem trước.`);
    rows = result.data;
  } else {
    rows = raw.split(/\r?\n/).filter(s => s.trim()).map(text => ({ text: text.trim() }));
  }
  if (rows.length > 10000) throw new Error('File quá nhiều dòng. Mỗi lần nhập tối đa 2.000 review hợp lệ.');
  const reviews: Review[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let skipped = 0;
  let invalidRatings = 0;
  for (const row of rows) {
    const text = get(row, textKeys);
    if (text.length < 3 || text.length > 5000) { skipped++; continue; }
    // Preserve accents: "da" and "đã" can carry different meanings.
    const fingerprint = text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(fingerprint)) { duplicates++; continue; }
    seen.add(fingerprint);
    const ratingRaw = get(row, ['rating', 'stars', 'star', 'score', 'sosao', 'sao', 'diem', 'diemdanhgia']);
    const ratingNumber = Number(ratingRaw.replace(',', '.'));
    const rating = ratingRaw && Number.isFinite(ratingNumber) && ratingNumber >= 1 && ratingNumber <= 5 ? ratingNumber : null;
    if (ratingRaw && rating === null) invalidRatings++;
    reviews.push({
      id: `RV-${String(reviews.length + 1).padStart(3, '0')}`,
      text,
      rating,
      source: get(row, ['source', 'platform', 'nguon', 'san', 'kenh']).slice(0, 80) || source,
      author: get(row, ['author', 'name', 'customer', 'ten', 'khachhang', 'nguoimua']).slice(0, 100) || 'Khách hàng',
      date: get(row, ['date', 'createdat', 'ngay', 'ngaydanhgia']).slice(0, 60) || null,
    });
  }
  if (reviews.length > 2000) throw new Error('Mỗi lần phân tích tối đa 2.000 review. Hãy chia file thành các phần nhỏ hơn.');
  if (invalidRatings) warnings.push(`${invalidRatings} điểm sao không hợp lệ được để trống, không dùng tính điểm trung bình.`);
  return { reviews, duplicates, skipped, warnings };
}

export function toCsv(rows: Record<string, unknown>[]): string {
  // Prevent spreadsheet formulas when an exported cell starts with a formula marker.
  return '\uFEFF' + Papa.unparse(rows, { escapeFormulae: true, newline: '\r\n' });
}
