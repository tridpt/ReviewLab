import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, FileDown, FileSpreadsheet, FileText, Info, LoaderCircle, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react';
import { Modal } from './Modal';
import { parseReviews, toCsv } from '../shared/import';
import { analyzeLocal } from '../shared/analyzer';
import { demoReviews } from '../shared/demo';
import type { Analysis, AnalysisInput } from '../shared/types';
import { download, number } from './lib';

interface Props { onClose: () => void; onComplete: (analysis: Analysis) => void; aiConfigured: boolean; projectName: string }
export function ImportModal({ onClose, onComplete, aiConfigured, projectName }: Props) {
  const [tab, setTab] = useState<'csv' | 'text'>('csv');
  const [raw, setRaw] = useState('');
  const [fileName, setFileName] = useState('');
  const [name, setName] = useState(projectName);
  const [mode, setMode] = useState<'local' | 'ai'>('local');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const parsed = useMemo(() => {
    try { return { ...parseReviews(raw, tab, tab === 'csv' ? 'CSV' : 'Nhập thủ công'), error: '' }; }
    catch (e) { return { reviews: [], duplicates: 0, skipped: 0, warnings: [], error: e instanceof Error ? e.message : 'Chưa đọc được file.' }; }
  }, [raw, tab]);

  async function readFile(file?: File) {
    if (!file) return;
    setError('');
    if (!/\.(csv|txt)$/i.test(file.name)) { setError('Chọn file .csv hoặc .txt (UTF-8).'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('File vượt quá 2 MB. Hãy chia thành các phần nhỏ hơn.'); return; }
    try {
      const content = await file.text();
      if (content.includes('\uFFFD')) { setError('File có ký tự không đọc được. Hãy lưu dưới dạng CSV UTF-8 rồi thử lại.'); return; }
      setTab(file.name.toLowerCase().endsWith('.txt') ? 'text' : 'csv'); setRaw(content); setFileName(file.name);
    } catch { setError('Không đọc được file. Hãy thử chọn lại.'); }
  }

  async function submit() {
    if (!name.trim() || !parsed.reviews.length || busy) return;
    setBusy(true); setError('');
    const input: AnalysisInput = { projectName: name.trim(), reviews: parsed.reviews, mode, isDemo: false, importInfo: { duplicates: parsed.duplicates, skipped: parsed.skipped } };
    try {
      if (mode === 'local') { onComplete(analyzeLocal(input)); return; }
      controller.current = new AbortController();
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: controller.current.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Chưa phân tích được dữ liệu.');
      onComplete(data as Analysis);
    } catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) setError(e instanceof Error ? e.message : 'Không kết nối được máy chủ. Chế độ cục bộ vẫn sử dụng được.'); }
    finally { setBusy(false); }
  }

  function close() { controller.current?.abort(); onClose(); }
  return <Modal title="Thêm review, tìm insight mới." subtitle="Bắt đầu từ những điều khách hàng thực sự nói." onClose={close} wide>
    <div className="import-body">
      <label className="field-label" htmlFor="project-name">Tên sản phẩm / dự án</label>
      <input id="project-name" className="text-input" maxLength={120} value={name} onChange={e => setName(e.target.value)} disabled={busy} placeholder="Ví dụ: Serum dưỡng ẩm Luma" />
      <div className="segmented import-tabs">
        <button disabled={busy} className={tab === 'csv' ? 'selected' : ''} onClick={() => { setTab('csv'); setRaw(''); setFileName(''); setError(''); }}><FileSpreadsheet size={16} />Tải file CSV</button>
        <button disabled={busy} className={tab === 'text' ? 'selected' : ''} onClick={() => { setTab('text'); setRaw(''); setFileName(''); setError(''); }}><FileText size={16} />Dán nội dung</button>
      </div>
      {tab === 'csv' ? <>
        <input type="file" accept=".csv,.txt" ref={fileRef} className="visually-hidden" aria-label="Chọn file review CSV hoặc TXT" onChange={e => { void readFile(e.target.files?.[0]); e.target.value = ''; }} disabled={busy} />
        <button disabled={busy} className={`dropzone ${dragging ? 'dragging' : ''} ${fileName ? 'has-file' : ''}`} onClick={() => fileRef.current?.click()} onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!busy) void readFile(e.dataTransfer.files[0]); }}>
          <span className="upload-icon">{fileName ? <Check size={25} /> : <UploadCloud size={27} />}</span>
          <strong>{fileName || 'Kéo thả file review vào đây'}</strong><span>{fileName ? 'Bấm để chọn file khác' : 'hoặc bấm để chọn file trên máy'}</span><small>CSV UTF-8 · Tối đa 2 MB / 2.000 review</small>
        </button>
        <button className="text-button template-button" onClick={() => download(toCsv(demoReviews.slice(0, 3).map(r => ({ review: r.text, rating: r.rating, source: r.source, author: r.author }))), 'reviewlab-mau-gia-lap.csv', 'text/csv;charset=utf-8')}><FileDown size={15} />Tải CSV mẫu (dữ liệu giả lập)</button>
        <p className="field-hint">Cột bắt buộc: <code>review</code> hoặc <code>nội dung</code>. Tùy chọn: rating, source, author, date.</p>
      </> : <><label className="field-label" htmlFor="review-text">Mỗi review một dòng</label><textarea id="review-text" className="review-textarea" disabled={busy} value={raw} onChange={e => { setRaw(e.target.value); setError(''); }} placeholder={'Serum thấm nhanh, không bết dính.\nMua vì bạn giới thiệu, dùng thấy đủ ẩm.\nMùi hơi nồng, mình mong có bản không mùi.'} /><p className="field-hint">Nội dung 3–5.000 ký tự / review. Các dòng trùng nhau sẽ được loại bỏ.</p></>}
      {parsed.reviews.length > 0 && <div className="preview-box"><div className="preview-heading"><span><Check size={15} /> {number(parsed.reviews.length)} review sẵn sàng</span><small>{parsed.duplicates > 0 && `Bỏ ${parsed.duplicates} trùng · `}{parsed.skipped > 0 && `Bỏ ${parsed.skipped} dòng không hợp lệ`}</small></div>{parsed.reviews.slice(0, 2).map(r => <p key={r.id}><span>{r.id}</span>{r.text}</p>)}{parsed.warnings.map(w => <p className="warning-text" key={w}>{w}</p>)}</div>}
      <div className="mode-options">
        <label className={`mode-option ${mode === 'local' ? 'chosen' : ''}`}><input type="radio" name="mode" value="local" checked={mode === 'local'} onChange={() => setMode('local')} disabled={busy} /><ShieldCheck size={20} /><span><strong>Phân tích cục bộ</strong><small>Từ khóa & điểm sao · Không cần API key</small></span></label>
        <label className={`mode-option ${mode === 'ai' ? 'chosen' : ''} ${!aiConfigured ? 'unavailable' : ''}`}><input type="radio" name="mode" value="ai" checked={mode === 'ai'} onChange={() => setMode('ai')} disabled={busy || !aiConfigured} /><Sparkles size={20} /><span><strong>Phân tích bằng AI</strong><small>{aiConfigured ? 'Hiểu ngữ cảnh · Tối đa 200 review' : 'Cấu hình API key trong Cài đặt'}</small></span></label>
      </div>
      {mode === 'ai' && <div className="inline-note"><Info size={17} /><span>Khi bấm phân tích, nội dung review, điểm sao, nguồn và tên dự án sẽ được gửi đến OpenAI. Tên người viết không được gửi. Chi phí tính theo tài khoản API của bạn.</span></div>}
      {(error || parsed.error) && <div className="form-error" role="alert">{error || parsed.error}</div>}
    </div>
    <div className="modal-footer"><span className="footer-note"><ShieldCheck size={15} />{busy ? 'Bạn có thể đóng cửa sổ để ngừng chờ.' : 'Chế độ cục bộ xử lý ngay trong trình duyệt.'}</span><button className="button primary" onClick={() => void submit()} disabled={!parsed.reviews.length || !name.trim() || Boolean(parsed.error) || busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}{busy ? 'Đang đọc và phân tích…' : 'Phân tích review'}{!busy && <ArrowRight size={17} />}</button></div>
  </Modal>;
}
