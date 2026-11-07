import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Clipboard, Clock3, Database, Download, FileText, FlaskConical, FolderOpen, Heart, History, Info, Layers3, Leaf, Lightbulb, Menu, MessageSquareQuote, MoreHorizontal, Plus, Quote, Search, Settings2, ShieldCheck, Smile, Sparkles, Star, Target, TrendingUp, X } from 'lucide-react';
import { analyzeLocal, getStats } from '../shared/analyzer';
import { demoProject, demoReviews } from '../shared/demo';
import { reportMarkdown, reviewsCsv, scriptMarkdown } from '../shared/export';
import { normalize } from '../shared/import';
import type { Analysis, Angle, ClassifiedReview, Insight, InsightKind, Sentiment } from '../shared/types';
import { ImportModal } from './ImportModal';
import { Modal } from './Modal';
import { download, number, percent, readHistory, saveHistory, sentimentLabel, sourceClass } from './lib';

type View = 'overview' | 'insights' | 'angles' | 'scripts' | 'reviews' | 'history';
type Evidence = { title: string; ids: string[]; detail?: string };
const kindLabels: Record<InsightKind, string> = { praise: 'Được yêu thích', pain: 'Còn băn khoăn', motivation: 'Lý do mua' };
const newDemo = () => analyzeLocal({ projectName: demoProject, reviews: demoReviews, mode: 'local', isDemo: true, importInfo: { duplicates: 0, skipped: 0 } });
const navItems: Array<{ id: View; label: string; icon: typeof BarChart3 }> = [
  { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { id: 'insights', label: 'Insight khách hàng', icon: Lightbulb },
  { id: 'angles', label: 'Góc quảng cáo', icon: Target },
  { id: 'scripts', label: 'Thư viện kịch bản', icon: BookOpen },
];

function BrandMark({ small = false }: { small?: boolean }) {
  return <span className={`brand-mark ${small ? 'small' : ''}`} aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M20 3c2.7 9.5 7.5 14.3 17 17-9.5 2.7-14.3 7.5-17 17C17.3 27.5 12.5 22.7 3 20 12.5 17.3 17.3 12.5 20 3Z" fill="currentColor"/><circle cx="31" cy="8" r="3" fill="currentColor" opacity=".55"/></svg></span>;
}

function SourceTag({ source }: { source: string }) {
  return <span className={`source-tag ${sourceClass(source)}`}><span />{source}</span>;
}

function Stars({ rating }: { rating: number | null }) {
  return rating === null ? <span className="muted">Chưa có điểm</span> : <span className="stars" aria-label={`${rating} trên 5 sao`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={12} fill={i < rating ? 'currentColor' : 'none'} className={i >= rating ? 'empty-star' : ''} />)}</span>;
}

function ReviewItem({ review }: { review: ClassifiedReview }) {
  return <article className="review-item"><div className="review-item-top"><span className="review-avatar">{review.author.split(' ').map(s => s[0]).slice(-2).join('')}</span><div><strong>{review.author}</strong><span className="review-id">{review.id}{review.date && ` · ${review.date}`}</span></div><SourceTag source={review.source} /></div><Stars rating={review.rating} /><p>“{review.text}”</p><span className={`sentiment-tag ${review.sentiment}`}>{sentimentLabel[review.sentiment]}</span></article>;
}

function Metric({ label, value, note, icon, accent = '', children }: { label: string; value: ReactNode; note: string; icon: ReactNode; accent?: string; children?: ReactNode }) {
  return <article className={`metric ${accent}`}><div className="metric-heading"><span>{label}</span><span className="metric-icon">{icon}</span></div><div className="metric-value">{value}{children}</div><p>{note}</p></article>;
}

function RatingSparkline({ reviews }: { reviews: ClassifiedReview[] }) {
  const binCount = Math.min(10, reviews.length);
  const bins = Array.from({ length: binCount }, (_, i) => {
    const part = reviews.slice(Math.floor(i * reviews.length / binCount), Math.floor((i + 1) * reviews.length / binCount)).filter(r => r.rating !== null);
    return part.length ? part.reduce((sum, r) => sum + r.rating!, 0) / part.length : 3;
  });
  return <svg className="sparkline" viewBox="0 0 100 34" aria-label="Điểm sao theo thứ tự review"><polyline points={bins.map((n, i) => `${i * 100 / Math.max(1, bins.length - 1)},${33 - n * 5}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-state"><span><MessageSquareQuote size={28} /></span><h3>{title}</h3><p>{detail}</p>{action}</div>;
}

export default function App() {
  const [history, setHistory] = useState<Analysis[]>(readHistory);
  const [analysis, setAnalysis] = useState<Analysis>(() => history[0] || newDemo());
  const [view, setView] = useState<View>('overview');
  const [modal, setModal] = useState<'import' | 'settings' | 'help' | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [script, setScript] = useState<Angle | null>(null);
  const [toast, setToast] = useState('');
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [connection, setConnection] = useState<'checking' | 'online' | 'offline'>('checking');
  const [kind, setKind] = useState<InsightKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [sentiment, setSentiment] = useState<Sentiment | 'all'>('all');
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saved, setSaved] = useState(Boolean(history[0]));
  const stats = useMemo(() => getStats(analysis), [analysis]);
  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    analysis.reviews.forEach(r => counts.set(r.source, (counts.get(r.source) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [analysis]);
  const filteredInsights = analysis.insights.filter(i => kind === 'all' || i.kind === kind);
  const bestAngle = analysis.angles[0];
  const filteredReviews = useMemo(() => analysis.reviews.filter(r => (source === 'all' || r.source === source) && (sentiment === 'all' || r.sentiment === sentiment) && (!query || normalize(`${r.text} ${r.author} ${r.id}`).includes(normalize(query)))), [analysis, source, sentiment, query]);
  const pageCount = Math.max(1, Math.ceil(filteredReviews.length / 12));

  async function checkHealth(notify = false) {
    setConnection('checking');
    try {
      const response = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.app !== 'ReviewLab') throw new Error('Máy chủ không phải ReviewLab.');
      setAiConfigured(Boolean(data.aiConfigured)); setAiModel(data.model); setConnection('online');
      if (notify) setToast(data.aiConfigured ? 'Kết nối AI đã sẵn sàng.' : 'Máy chủ sẵn sàng. Chưa cấu hình API key.');
    } catch { setConnection('offline'); setAiConfigured(false); if (notify) setToast('Chưa kết nối máy chủ. Bạn vẫn có thể phân tích cục bộ.'); }
  }
  useEffect(() => { void checkHealth(); }, []);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => { setPage(1); }, [query, source, sentiment, analysis.id]);
  useEffect(() => {
    if (!exportOpen) return;
    const close = () => setExportOpen(false);
    const keydown = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('click', close); document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', keydown); };
  }, [exportOpen]);

  function navigate(next: View) { setView(next); setSidebarOpen(false); setExportOpen(false); }
  function complete(report: Analysis) {
    setAnalysis(report); setModal(null); setKind('all'); setSource('all'); setSentiment('all'); setQuery(''); setView('overview');
    const next = [report, ...history.filter(r => r.id !== report.id)].slice(0, 5);
    const success = saveHistory(next); setSaved(success); setHistory(success ? readHistory() : next);
    setToast(success ? `Đã phân tích ${number(report.reviews.length)} review và lưu trên máy.` : 'Đã phân tích. Bộ nhớ trình duyệt đầy; hãy xuất báo cáo để giữ kết quả.');
  }
  function demo() { setAnalysis(newDemo()); setSaved(false); setSource('all'); setSentiment('all'); setQuery(''); setKind('all'); navigate('overview'); setToast('Đang xem 36 review giả lập. Nhập review của bạn để có kết quả thực tế.'); }
  function showEvidence(item: Insight | Angle) { setEvidence({ title: item.title, ids: item.reviewIds, detail: 'recommendation' in item ? item.recommendation : item.rationale }); }
  function exportReport(type: 'md' | 'csv') {
    download(type === 'md' ? reportMarkdown(analysis) : reviewsCsv(analysis), `reviewlab-${type === 'md' ? 'bao-cao.md' : 'reviews.csv'}`, type === 'md' ? 'text/markdown;charset=utf-8' : 'text/csv;charset=utf-8');
    setExportOpen(false); setToast('Đã xuất file.');
  }
  async function copyScript(angle: Angle) {
    try { await navigator.clipboard.writeText(scriptMarkdown(angle, analysis.projectName)); setToast('Đã sao chép kịch bản kèm nguồn dẫn chứng.'); }
    catch { setToast('Trình duyệt chưa cho phép sao chép. Bạn có thể tải kịch bản xuống.'); }
  }

  function angleCard(angle: Angle, index: number) {
    const first = analysis.reviews.find(r => r.id === angle.reviewIds[0]);
    return <article className="angle-card" key={angle.id}>
      <div className="angle-card-top"><span className={`angle-label label-${index % 3}`}><span />{index === 0 ? 'Tín hiệu nổi bật' : 'Góc đáng thử'}</span><span className="angle-number">0{index + 1}</span></div>
      <h3>{angle.title}</h3><p className="angle-hook">{angle.hook}</p>
      <button className="angle-quote" onClick={() => showEvidence(angle)}><Quote size={16} /><span>“{first?.text || 'Mở các review làm cơ sở cho góc quảng cáo này.'}”</span></button>
      <div className="angle-proof"><span><MessageSquareQuote size={14} />{angle.reviewIds.length} review dẫn chứng</span><span>{percent(angle.reviewIds.length, stats.total)}% bộ dữ liệu</span></div>
      <button className="button angle-button" onClick={() => setScript(angle)}><FileText size={15} />Xem kịch bản<ArrowUpRight size={15} /></button>
    </article>;
  }

  const titles: Record<View, [string, string]> = {
    overview: ['Lắng nghe khách hàng. Tìm ý tưởng mới.', 'Biến những review rời rạc thành thông điệp quảng cáo có cơ sở.'],
    insights: ['Hiểu điều khách hàng thực sự quan tâm.', 'Mỗi insight đều bắt đầu từ một trải nghiệm có thể kiểm chứng.'],
    angles: ['Một review thật. Nhiều góc sáng tạo.', 'Chọn thông điệp có cơ sở và đọc cả những ý kiến trái chiều.'],
    scripts: ['Từ insight đến kịch bản đầu tiên.', 'Bản nháp video có trích dẫn, sẵn sàng để bạn biên tập.'],
    reviews: ['Trở về với lời khách hàng.', 'Tìm kiếm, lọc và đọc nguyên văn toàn bộ dữ liệu đã nhập.'],
    history: ['Những lần lắng nghe trước.', 'Tối đa 5 báo cáo gần nhất được lưu trong trình duyệt này.'],
  };

  return <div className="app-shell">
    {sidebarOpen && <button aria-label="Đóng menu" className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      <button className="brand" onClick={() => navigate('overview')} aria-label="ReviewLab - Tổng quan"><BrandMark /><span>reviewlab<span className="brand-dot">.</span></span></button>
      <div className="workspace-picker"><span className="workspace-icon"><Leaf size={18} /></span><div><strong>Beauty workspace</strong><span>Không gian mỹ phẩm</span></div><span className="workspace-dot" /></div>
      <span className="nav-caption">KHÔNG GIAN LÀM VIỆC</span>
      <nav aria-label="Điều hướng chính">{navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)} className={`nav-item ${view === id ? 'active' : ''}`} aria-current={view === id ? 'page' : undefined}><Icon size={18} /><span>{label}</span>{id === 'angles' && analysis.angles.length > 0 && <span className="nav-count">{analysis.angles.length}</span>}{view === id && <span className="active-dot" />}</button>)}</nav>
      <span className="nav-caption second-caption">DỮ LIỆU CỦA BẠN</span>
      <button className={`nav-item ${view === 'reviews' ? 'active' : ''}`} onClick={() => navigate('reviews')}><Database size={18} /><span>Review gốc</span><span className="subtle-count">{number(stats.total)}</span></button>
      <button className={`nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => navigate('history')}><History size={18} /><span>Lịch sử phân tích</span></button>
      <div className="sidebar-bottom"><div className="sidebar-tip"><span className="tip-orbit"><Sparkles size={23} /></span><h3>Ý tưởng hay bắt đầu<br />từ việc lắng nghe.</h3><p>Thêm review để khám phá điều khách hàng cần.</p><button onClick={() => setModal('import')}>Khám phá insight mới<ArrowUpRight size={15} /></button><svg viewBox="0 0 200 70" aria-hidden="true"><path d="M-10 65C35-30 70 130 115 40S180 30 215 0M-15 78C35-17 70 143 115 53S180 43 215 13" fill="none" stroke="currentColor" strokeWidth="1"/></svg></div><button className="nav-item bottom-nav" onClick={() => setModal('settings')}><Settings2 size={17} /><span>Cài đặt</span></button><div className="sidebar-user"><span className="user-avatar">B</span><div><strong>Beauty studio</strong><span>Local workspace</span></div><ShieldCheck size={16} /></div></div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs"><button className="icon-button mobile-menu" aria-label="Mở menu" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button><span>Workspace</span><ChevronRight size={13} /><strong>Phân tích review</strong></div><div className="topbar-actions"><span className="local-status"><span />{analysis.mode === 'ai' ? 'Phân tích AI' : 'Phân tích cục bộ'}</span><span className="topbar-divider" /><button className="icon-button" aria-label="Hướng dẫn sử dụng" title="Hướng dẫn sử dụng" onClick={() => setModal('help')}><CircleHelp size={19} /></button><button className="top-avatar" title="Cài đặt workspace" aria-label="Cài đặt workspace" onClick={() => setModal('settings')}>B</button></div></header>
      <main>
        <div className="page-heading"><div><div className="page-eyebrow"><span /> CUSTOMER VOICE, CREATIVE CHOICE</div><h1>{titles[view][0]}</h1><p>{titles[view][1]}</p></div><button className="button primary import-main" onClick={() => setModal('import')}><Plus size={18} />Nhập review mới</button></div>

        <div className="project-strip"><div className="project-label"><span className="product-icon"><FlaskConical size={18} /></span><div><span className="project-category">DỰ ÁN MỸ PHẨM</span><strong title={analysis.projectName}>{analysis.projectName}</strong></div><span className={`data-badge ${analysis.isDemo ? 'demo' : ''}`}>{analysis.isDemo ? 'Dữ liệu mẫu' : 'Dữ liệu đã nhập'}</span></div><div className="project-actions"><span className="save-status">{saved ? <CheckCheck size={14} /> : <Info size={14} />}{saved ? 'Đã lưu trên máy' : analysis.isDemo ? '36 review giả lập' : 'Chưa lưu trên máy'}</span><div className="export-wrap"><button className="button outline compact" aria-expanded={exportOpen} aria-haspopup="menu" onClick={e => { e.stopPropagation(); setExportOpen(!exportOpen); }}><ArrowDownToLine size={15} /><span>Xuất báo cáo</span><ChevronDown size={13} /></button>{exportOpen && <div className="export-menu" role="menu"><button role="menuitem" onClick={() => exportReport('md')}><FileText size={16} />Báo cáo & kịch bản (.md)</button><button role="menuitem" onClick={() => exportReport('csv')}><Database size={16} />Review đã phân loại (.csv)</button></div>}</div></div></div>

        {analysis.isDemo && <div className="demo-notice"><Info size={14} /><span>Bạn đang khám phá dữ liệu giả lập. <button onClick={() => setModal('import')}>Nhập review của bạn<ArrowRight size={12} /></button> để nhận insight thực tế.</span></div>}

        {view === 'overview' && <>
          <section className="metrics-grid" aria-label="Số liệu tổng quan">
            <Metric label="Review đã phân tích" value={number(stats.total)} note={`Từ ${stats.sourceCount} nguồn dữ liệu`} icon={<MessageSquareQuote size={18} />}><span className="metric-mini-label">review</span></Metric>
            <Metric label="Cảm xúc tích cực" value={<>{stats.positivePercent}<span className="value-unit">%</span></>} note={`${stats.counts.positive} review được phân loại tích cực`} icon={<Smile size={18} />} accent="positive-metric"><span className="metric-progress"><i style={{ width: `${stats.positivePercent}%` }} /></span></Metric>
            <Metric label="Điểm đánh giá" value={<>{stats.averageRating === null ? '—' : stats.averageRating.toFixed(1).replace('.', ',')}<span className="value-unit">/5</span></>} note={`Tính từ ${stats.ratedCount} review có điểm sao`} icon={<Star size={18} />}><RatingSparkline reviews={analysis.reviews} /></Metric>
            <Metric label="Insight tìm thấy" value={analysis.insights.length} note={`${analysis.angles.length} góc quảng cáo có dẫn chứng`} icon={<Lightbulb size={18} />} accent="insight-metric"><span className="metric-stars"><Sparkles size={29} /></span></Metric>
          </section>

          <div className="overview-grid">
            <section className="panel themes-panel"><div className="panel-heading"><div><span className="section-kicker">TIẾNG NÓI KHÁCH HÀNG</span><h2>Điều gì được nhắc đến nhiều nhất?</h2></div><button className="icon-button" title="Xem tất cả insight" aria-label="Xem tất cả insight" onClick={() => navigate('insights')}><MoreHorizontal size={20} /></button></div>
              <div className="filter-pills">{(['all', 'praise', 'pain', 'motivation'] as const).map(k => <button key={k} className={kind === k ? 'selected' : ''} onClick={() => setKind(k)}>{k === 'all' ? 'Tất cả' : kindLabels[k]}{k === 'pain' && <span className="pill-dot" />}</button>)}</div>
              <div className="theme-list">{filteredInsights.length ? filteredInsights.slice(0, 5).map((insight, i) => <button className={`theme-row kind-${insight.kind}`} key={insight.id} onClick={() => showEvidence(insight)}><span className="theme-index">0{i + 1}</span><span className="theme-body"><span className="theme-row-label"><strong>{insight.title}</strong><span>{insight.reviewIds.length} <small>review</small></span></span><span className="theme-track"><i style={{ width: `${percent(insight.reviewIds.length, stats.total)}%` }} /></span></span><span className="theme-percent">{percent(insight.reviewIds.length, stats.total)}%</span><ChevronRight size={14} /></button>) : <EmptyState title="Chưa có tín hiệu trong nhóm này" detail="Thử chọn nhóm khác hoặc bổ sung review chi tiết hơn." />}</div>
              <div className="panel-footnote"><Info size={13} /><span>Một review có thể nhắc đến nhiều chủ đề. Bấm để xem dẫn chứng.</span></div>
            </section>

            <section className="panel sentiment-panel"><div className="panel-heading"><div><span className="section-kicker">BỨC TRANH TỔNG THỂ</span><h2>Cảm xúc trong review</h2></div><span className="soft-icon"><Heart size={17} /></span></div><div className="sentiment-visual"><div className="donut" role="img" aria-label={Object.entries(stats.counts).map(([s, count]) => `${sentimentLabel[s as Sentiment]}: ${count}`).join(', ')} style={{ background: `conic-gradient(#2f6d58 0 ${stats.counts.positive / stats.total * 100}%, #e0a45e ${stats.counts.positive / stats.total * 100}% ${(stats.counts.positive + stats.counts.mixed) / stats.total * 100}%, #cd786b ${(stats.counts.positive + stats.counts.mixed) / stats.total * 100}% ${(stats.counts.positive + stats.counts.mixed + stats.counts.negative) / stats.total * 100}%, #dfe5df ${(stats.counts.positive + stats.counts.mixed + stats.counts.negative) / stats.total * 100}% 100%)` }}><div><strong>{stats.positivePercent}<small>%</small></strong><span>Tích cực</span><Smile size={16} /></div></div><div className="sentiment-legend">{(['positive', 'mixed', 'negative', 'neutral'] as const).map(s => <button key={s} onClick={() => { setSentiment(s); navigate('reviews'); }}><span className={`legend-dot ${s}`} /><span>{sentimentLabel[s]}</span><strong>{stats.counts[s]}</strong><small>{percent(stats.counts[s], stats.total)}%</small></button>)}</div></div><div className="sentiment-note"><ShieldCheck size={15} /><span>{analysis.mode === 'local' ? 'Nhận diện từ khóa và điểm sao. Review trái chiều giữ cả điểm tốt và chưa tốt.' : 'AI phân loại theo ngữ cảnh. Đối chiếu review gốc trước khi ra quyết định.'}</span></div></section>

            <section className="opportunity-panel"><div className="opportunity-copy"><span className="opportunity-badge"><Sparkles size={13} /> TỪ INSIGHT ĐẾN Ý TƯỞNG</span><h2>{bestAngle ? bestAngle.title : 'Ý tưởng tốt cần đủ dữ liệu.'}<span className="heading-period">.</span></h2><p>{bestAngle ? bestAngle.rationale : 'Thêm review mô tả trải nghiệm cụ thể để tìm góc quảng cáo có dẫn chứng.'}</p><button className="button dark" onClick={() => bestAngle ? setScript(bestAngle) : setModal('import')}>{bestAngle ? 'Khám phá kịch bản' : 'Nhập thêm review'}<ArrowUpRight size={16} /></button></div><div className="opportunity-art" aria-hidden="true"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-quote"><Quote size={30} /><span>review</span><i /><i /><i /></div><div className="art-spark"><Sparkles size={29} /></div><span className="art-dot dot-a" /><span className="art-dot dot-b" /><span className="art-plus">+</span></div></section>

            <section className="panel sources-panel"><div className="panel-heading"><div><span className="section-kicker">DỮ LIỆU ĐẦU VÀO</span><h2>Review đến từ đâu?</h2></div><button className="text-button" onClick={() => { setSource('all'); navigate('reviews'); }}>Xem review<ArrowUpRight size={14} /></button></div><div className="source-list">{sourceCounts.slice(0, 4).map(([s, count]) => <button className="source-row" key={s} onClick={() => { setSource(s); navigate('reviews'); }}><SourceTag source={s} /><span className="source-track"><i style={{ width: `${percent(count, stats.total)}%` }} /></span><strong>{count}</strong></button>)}</div></section>
          </div>

          <section className="angles-section"><div className="section-heading"><div><h2>Góc quảng cáo đáng thử <span className="count-badge">{analysis.angles.length}</span></h2><p>Ý tưởng từ review, kèm dẫn chứng để bạn tự kiểm chứng.</p></div><button className="text-button" onClick={() => navigate('angles')}>Xem tất cả<ArrowRight size={15} /></button></div><div className="angles-grid">{analysis.angles.slice(0, 3).map(angleCard)}</div>{!analysis.angles.length && <EmptyState title="Chưa đủ căn cứ để tạo góc quảng cáo" detail="Hãy nhập thêm review có mô tả trải nghiệm. Mọi ý tưởng cần có review gốc làm cơ sở." action={<button className="button primary" onClick={() => setModal('import')}><Plus size={16} />Thêm review</button>} />}</section>
        </>}

        {view === 'insights' && <section className="panel detail-panel"><div className="detail-toolbar"><div className="filter-pills">{(['all', 'praise', 'pain', 'motivation'] as const).map(k => <button key={k} className={kind === k ? 'selected' : ''} onClick={() => setKind(k)}>{k === 'all' ? 'Tất cả insight' : kindLabels[k]}</button>)}</div><span className="muted">{filteredInsights.length} insight</span></div><div className="insights-grid">{filteredInsights.map(insight => <article className={`insight-card kind-${insight.kind}`} key={insight.id}><span className={`insight-kind ${insight.kind}`}>{insight.kind === 'praise' ? <Smile size={14} /> : insight.kind === 'pain' ? <Info size={14} /> : <TrendingUp size={14} />}{kindLabels[insight.kind]}</span><h3>{insight.title}</h3><p>{insight.description}</p><div className="insight-meter"><span style={{ width: `${percent(insight.reviewIds.length, stats.total)}%` }} /></div><p className="insight-advice">{insight.recommendation}</p><button className="text-button" onClick={() => showEvidence(insight)}>{insight.reviewIds.length} review làm dẫn chứng<ArrowUpRight size={15} /></button></article>)}</div>{!filteredInsights.length && <EmptyState title="Chưa có insight trong nhóm này" detail={analysis.summary} />}</section>}

        {view === 'angles' && <><div className="inline-note page-note"><Lightbulb size={18} /><span>Các góc quảng cáo là giả thuyết sáng tạo từ bộ review đã nhập. Đọc dẫn chứng và xác minh thông tin sản phẩm trước khi sử dụng.</span></div><div className="angles-grid full-angles">{analysis.angles.map(angleCard)}</div>{!analysis.angles.length && <EmptyState title="Chưa tìm thấy góc quảng cáo có cơ sở" detail={analysis.summary} action={<button className="button primary" onClick={() => setModal('import')}>Bổ sung review<Plus size={16} /></button>} />}</>}

        {view === 'scripts' && <section className="panel script-library"><div className="panel-heading"><div><span className="section-kicker">SÁNG TẠO CÓ CƠ SỞ</span><h2>{analysis.angles.length} kịch bản từ bộ review hiện tại</h2></div><span className="soft-icon"><BookOpen size={19} /></span></div>{analysis.angles.map((angle, index) => <article className="script-library-row" key={angle.id}><span className="script-library-icon"><FileText size={24} /></span><div><span className="section-kicker">KỊCH BẢN 0{index + 1} · VIDEO NGẮN</span><h3>{angle.title}</h3><p>{angle.reviewIds.length} review dẫn chứng · Bản nháp khoảng 30 giây</p></div><button className="button outline" onClick={() => setScript(angle)}>Mở kịch bản<ArrowUpRight size={15} /></button></article>)}{!analysis.angles.length && <EmptyState title="Chưa có kịch bản" detail="Kịch bản sẽ xuất hiện khi tìm được góc quảng cáo có review hỗ trợ." />}</section>}

        {view === 'reviews' && <section className="panel reviews-panel"><div className="review-toolbar"><label className="search-box"><Search size={17} /><input aria-label="Tìm trong review" placeholder="Tìm nội dung, tên hoặc ID review…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button className="icon-button" aria-label="Xóa tìm kiếm" onClick={() => setQuery('')}><X size={15} /></button>}</label><select aria-label="Lọc theo nguồn" value={source} onChange={e => setSource(e.target.value)}><option value="all">Tất cả nguồn</option>{sourceCounts.map(([s]) => <option key={s} value={s}>{s}</option>)}</select><select aria-label="Lọc theo cảm xúc" value={sentiment} onChange={e => setSentiment(e.target.value as Sentiment | 'all')}><option value="all">Tất cả cảm xúc</option>{Object.entries(sentimentLabel).map(([s, label]) => <option key={s} value={s}>{label}</option>)}</select><button className="icon-button export-reviews" aria-label="Xuất review CSV" title="Xuất toàn bộ review đã phân loại" onClick={() => exportReport('csv')}><Download size={18} /></button></div><div className="review-table-meta"><span><strong>{filteredReviews.length}</strong> / {stats.total} review</span><span>{analysis.importInfo.duplicates} trùng đã bỏ · {analysis.importInfo.skipped} dòng không hợp lệ đã bỏ</span></div><div className="review-table"><div className="table-head"><span>KHÁCH HÀNG / NGUỒN</span><span>NỘI DUNG REVIEW</span><span>CẢM XÚC</span></div>{filteredReviews.slice((page - 1) * 12, page * 12).map(review => <article className="table-row" key={review.id}><div className="table-customer"><strong>{review.author}</strong><span className="review-id">{review.id}</span><SourceTag source={review.source} /></div><div className="table-content"><Stars rating={review.rating} /><p>{review.text}</p></div><div><span className={`sentiment-tag ${review.sentiment}`}>{sentimentLabel[review.sentiment]}</span></div></article>)}</div>{!filteredReviews.length && <EmptyState title="Không tìm thấy review phù hợp" detail="Thử từ khóa khác hoặc chọn lại bộ lọc." action={<button className="button outline" onClick={() => { setQuery(''); setSource('all'); setSentiment('all'); }}>Xóa bộ lọc</button>} />}<div className="pagination"><span>Trang {Math.min(page, pageCount)} / {pageCount}</span><div><button className="button outline compact" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button><button className="button outline compact" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>Tiếp<ChevronRight size={14} /></button></div></div></section>}

        {view === 'history' && <section className="panel history-panel"><div className="panel-heading"><div><span className="section-kicker">LƯU TRONG TRÌNH DUYỆT</span><h2>Báo cáo gần đây</h2></div><Clock3 size={20} /></div>{history.map(item => <button className="history-row" key={item.id} onClick={() => { setAnalysis(item); setSaved(true); setSource('all'); setQuery(''); setSentiment('all'); setKind('all'); navigate('overview'); }}><span className="history-icon"><FolderOpen size={23} /></span><span><strong>{item.projectName}</strong><small>{new Date(item.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' })} · {item.reviews.length} review · {item.mode === 'ai' ? 'AI' : 'Cục bộ'}{item.isDemo ? ' · Giả lập' : ''}</small></span><ArrowUpRight size={18} /></button>)}{!history.length && <EmptyState title="Chưa có báo cáo đã lưu" detail="Nhập review và phân tích lần đầu. Báo cáo sẽ được lưu trên máy này; dữ liệu mẫu hiện tại chưa được lưu." action={<button className="button primary" onClick={() => setModal('import')}><Plus size={16} />Phân tích đầu tiên</button>} />}</section>}

        <footer className="page-footer"><span><BrandMark small />Được tạo từ tiếng nói khách hàng.</span><button onClick={demo}><FlaskConical size={13} />Khám phá dữ liệu mẫu</button><span><ShieldCheck size={13} />{analysis.mode === 'ai' ? 'AI · Có review gốc để đối chiếu' : 'Cục bộ · Không gửi review ra ngoài'}</span></footer>
      </main>
    </div>

    {modal === 'import' && <ImportModal onClose={() => setModal(null)} onComplete={complete} aiConfigured={aiConfigured} projectName={analysis.isDemo ? '' : analysis.projectName} />}
    {evidence && <Modal title={evidence.title} subtitle={`${evidence.ids.length} review gốc làm cơ sở cho nhận định này.`} onClose={() => setEvidence(null)}><div className="evidence-body">{evidence.detail && <div className="inline-note"><Lightbulb size={18} /><span>{evidence.detail}</span></div>}{analysis.isDemo && <p className="demo-evidence-note"><Info size={14} />Các review dưới đây là dữ liệu giả lập để trải nghiệm.</p>}{analysis.reviews.filter(r => evidence.ids.includes(r.id)).map(r => <ReviewItem review={r} key={r.id} />)}</div><div className="modal-footer"><span className="footer-note">Trích nguyên văn từ bộ dữ liệu đã nhập.</span><button className="button outline" onClick={() => setEvidence(null)}>Đóng</button></div></Modal>}
    {script && <Modal title={script.title} subtitle="Kịch bản video ngắn · Bản nháp khoảng 30 giây" onClose={() => setScript(null)} wide><div className="script-body"><div className="script-context"><span><Target size={16} />GÓC QUẢNG CÁO</span><p>{script.rationale}</p><button className="text-button" onClick={() => { setScript(null); showEvidence(script); }}>{script.reviewIds.length} review dẫn chứng<ArrowUpRight size={14} /></button></div><div className="storyboard">{([
      ['hook', '00–03s', 'Mở đầu thu hút', '01'], ['problem', '03–08s', 'Đặt vấn đề', '02'], ['solution', '08–16s', 'Trải nghiệm sản phẩm', '03'], ['proof', '16–25s', 'Lời khách hàng', '04'], ['cta', '25–30s', 'Kêu gọi hành động', '05'],
    ] as const).map(([key, time, label, order]) => <div className="storyboard-row" key={key}><div className="scene-order">{order}<span /></div><div><div className="scene-heading"><h3>{label}</h3><span>{time}</span></div><p>{script.script[key]}</p></div></div>)}</div><div className="inline-note"><Info size={17} /><span>Đọc thử và rút gọn theo tốc độ nói. Xác minh thông tin sản phẩm, giữ đúng lời trích và điều chỉnh trước khi phát hành.</span></div></div><div className="modal-footer"><button className="button outline" onClick={() => download(scriptMarkdown(script, analysis.projectName), 'reviewlab-kich-ban.md')}><Download size={16} />Tải kịch bản</button><button className="button primary" onClick={() => void copyScript(script)}><Clipboard size={16} />Sao chép kịch bản</button></div></Modal>}
    {modal === 'settings' && <Modal title="Cài đặt workspace" subtitle="Mọi cấu hình và báo cáo thuộc về máy của bạn." onClose={() => setModal(null)}><div className="settings-body"><div className="settings-section"><span className="soft-icon"><ShieldCheck size={21} /></span><div><h3>Chế độ cục bộ luôn sẵn sàng</h3><p>Nhận diện chủ đề theo từ khóa tiếng Việt, xử lý một số phủ định và tham khảo điểm sao. Review không rời trình duyệt. Kết quả cần được đối chiếu với nội dung gốc.</p></div></div><div className="settings-section"><span className="soft-icon"><Sparkles size={21} /></span><div><h3>Phân tích bằng AI <span className={`connection-badge ${aiConfigured ? 'ready' : ''}`}>{aiConfigured ? 'Đã cấu hình' : 'Chưa cấu hình'}</span></h3><p>Để bật AI, tạo file <code>.env</code> trong thư mục ReviewLab từ <code>.env.example</code>, thêm API key rồi khởi động lại máy chủ.</p><pre>OPENAI_API_KEY=your_api_key{'\n'}OPENAI_MODEL=gpt-4o-mini</pre><p>API key chỉ nằm trên máy chủ. Khi chọn AI và bấm phân tích, nội dung review sẽ gửi đến OpenAI. Chưa có API key vẫn dùng được toàn bộ chế độ cục bộ.</p>{aiModel && <p>Model đang cấu hình: <strong>{aiModel}</strong></p>}<a className="text-link" href="https://developers.openai.com/api/docs/guides/structured-outputs" target="_blank" rel="noreferrer">OpenAI Docs · Structured Outputs<ArrowUpRight size={13} /></a></div></div><div className="settings-section"><span className="soft-icon"><Database size={21} /></span><div><h3>Lưu trữ trên máy</h3><p>Lịch sử giữ tối đa 5 báo cáo gần đây trong trình duyệt, tùy dung lượng khả dụng. Xuất báo cáo Markdown hoặc CSV để lưu lâu dài. Dữ liệu không đồng bộ giữa các thiết bị.</p></div></div></div><div className="modal-footer"><span className="footer-note"><span className={`connection-dot ${connection}`} />{connection === 'online' ? 'Máy chủ đang hoạt động' : connection === 'checking' ? 'Đang kiểm tra kết nối…' : 'Máy chủ chưa kết nối'}</span><button className="button outline" onClick={() => void checkHealth(true)}>Kiểm tra kết nối</button></div></Modal>}
    {modal === 'help' && <Modal title="Từ review đến ý tưởng, trong 3 bước." subtitle="Bắt đầu với một sản phẩm và những trải nghiệm cụ thể." onClose={() => setModal(null)}><div className="help-body">{[
      ['01', 'Nhập lời khách hàng', 'Tải CSV có cột review hoặc dán nội dung, mỗi review một dòng. Có thể thêm điểm sao, nguồn và tên người viết.'],
      ['02', 'Đọc insight có dẫn chứng', 'Xem điểm khen, băn khoăn và lý do mua. Bấm vào từng insight để đọc review gốc. Một review có thể thuộc nhiều chủ đề.'],
      ['03', 'Chọn góc, biên tập kịch bản', 'Mở góc quảng cáo phù hợp, đọc các cảnh gợi ý, sao chép hoặc xuất kịch bản. Xác minh thông tin sản phẩm trước khi phát hành.'],
    ].map(([step, title, detail]) => <div className="help-step" key={step}><span>{step}</span><div><h3>{title}</h3><p>{detail}</p></div></div>)}<div className="inline-note"><Info size={18} /><span>Chế độ cục bộ là bộ quy tắc từ khóa và điểm sao, có thể bỏ sót cách diễn đạt lạ. Chế độ AI cần API key riêng và vẫn cần người đọc kiểm tra.</span></div></div><div className="modal-footer"><button className="text-button" onClick={() => { setModal(null); demo(); }}>Xem dữ liệu mẫu<ArrowUpRight size={15} /></button><button className="button primary" onClick={() => setModal('import')}>Bắt đầu với review của bạn<ArrowRight size={15} /></button></div></Modal>}
    {toast && <div className="toast" role="status"><span><Check size={17} /></span><p>{toast}</p><button aria-label="Đóng thông báo" onClick={() => setToast('')}><X size={16} /></button></div>}
  </div>;
}
