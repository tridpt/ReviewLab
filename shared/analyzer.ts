import { normalize } from './import';
import type { Analysis, AnalysisInput, Angle, ClassifiedReview, Insight, Review, Sentiment } from './types';

interface Theme {
  id: string;
  title: string;
  positive: string[];
  negative: string[];
  praise: string;
  pain: string;
  hook: string;
  advice: string;
  visual: string;
}

const themes: Theme[] = [
  { id: 'texture', title: 'Kết cấu & độ thẩm thấu', positive: ['tham nhanh', 'tham tot', 'mong nhe', 'nhe mat', 'nhe tenh', 'khong bet', 'khong nhon', 'khong dinh', 'khong co cam giac nhon'], negative: ['bet dinh', 'nhon dinh', 'lau tham', 'khong tham', 'kho tham', 'qua dac', 'nang mat'], praise: 'Mỏng nhẹ, thấm nhanh', pain: 'Bết dính, khó thẩm thấu', hook: 'Một kết cấu nhẹ tênh được khách hàng nhắc đến.', advice: 'Quay cận kết cấu và thao tác tán sản phẩm trên da, trong điều kiện ánh sáng thật.', visual: 'Cận cảnh giọt serum, tán trên mu bàn tay rồi quay bề mặt da dưới cùng ánh sáng.' },
  { id: 'hydration', title: 'Cảm nhận dưỡng ẩm', positive: ['du am', 'cap am tot', 'mem min', 'da mem', 'cang muot', 'bot kho', 'khong bi cang da'], negative: ['kho da', 'khong du am', 'khong cap am', 'bi cang da', 'bong troc'], praise: 'Da mềm, cảm giác đủ ẩm', pain: 'Chưa đủ ẩm với một số người', hook: 'Khách hàng nói gì về cảm giác ẩm trên da?', advice: 'Dùng lời kể có dẫn chứng về cảm nhận dưỡng ẩm; giữ rõ đây là trải nghiệm cá nhân.', visual: 'Người dùng mô tả cảm giác sau bước dưỡng; chèn nguyên văn review, tránh dựng ảnh trước–sau.' },
  { id: 'gentle', title: 'Độ dịu nhẹ & phù hợp làn da', positive: ['diu nhe', 'lanh tinh', 'khong kich ung', 'khong bi kich ung', 'khong rat', 'khong bi rat', 'khong nong', 'khong bi mun'], negative: ['kich ung', 'bi rat', 'nong rat', 'noi mun', 'bi do', 'hoi do', 'bi ngua', 'khong diu nhe'], praise: 'Cảm nhận dịu nhẹ', pain: 'Có phản hồi kích ứng, không hợp da', hook: 'Lắng nghe cả những làn da có trải nghiệm khác nhau.', advice: 'Trình bày cả trải nghiệm tốt và phản hồi không phù hợp. Gợi ý kiểm tra thành phần, thử trên vùng da nhỏ.', visual: 'Quay nhãn thành phần và hướng dẫn dùng; hiển thị review tích cực kèm lưu ý trải nghiệm khác nhau.' },
  { id: 'scent', title: 'Mùi hương', positive: ['khong mui', 'mui nhe', 'mui de chiu', 'khong huong lieu'], negative: ['mui nong', 'mui hac', 'mui manh', 'huong lieu manh', 'mui kho chiu'], praise: 'Ưa thích mùi nhẹ, không mùi', pain: 'Mùi hương khiến khách băn khoăn', hook: 'Mùi hương cũng là một phần của trải nghiệm.', advice: 'Mô tả cảm nhận về mùi qua trích dẫn; xác minh nhãn trước khi nói sản phẩm không hương liệu.', visual: 'Quay sản phẩm và nhãn thành phần, chèn lời khách về mùi với tên nguồn.' },
  { id: 'packaging', title: 'Bao bì & cách lấy sản phẩm', positive: ['bao bi dep', 'chai cam chac chan', 'voi bom tien dung', 'chai dep', 'thiet ke dep'], negative: ['ro ri', 'voi bom bi hong', 'ong hut kho lay', 'kho lay het', 'mo nap', 'chai nho'], praise: 'Thiết kế đẹp, sử dụng thuận tiện', pain: 'Bao bì, vòi bơm cần cải thiện', hook: 'Trải nghiệm bắt đầu từ lần mở nắp.', advice: 'Quay cách lấy sản phẩm thực tế và trả lời minh bạch các vướng mắc về bao bì.', visual: 'Cận cảnh thao tác mở nắp, nhấn vòi bơm và lấy phần sản phẩm gần đáy.' },
  { id: 'value', title: 'Giá & giá trị cảm nhận', positive: ['gia hop ly', 'gia tot', 'dang tien', 'hop tui tien', 'gia mem', 'tiet kiem'], negative: ['gia cao', 'gia hoi cao', 'khong dang tien', 'qua dat', 'dung hoi nhanh het'], praise: 'Giá trị xứng đáng với trải nghiệm', pain: 'Giá, dung tích còn là rào cản', hook: 'Điều gì khiến khách thấy đáng để mua?', advice: 'Hiển thị đúng dung tích và giá hiện tại. Chỉ đưa ưu đãi khi đã xác nhận thông tin bán hàng.', visual: 'Đặt chai, thông tin dung tích và giá được xác minh cạnh trích dẫn cảm nhận về giá trị.' },
  { id: 'delivery', title: 'Giao hàng & đóng gói', positive: ['giao hang nhanh', 'dung hen', 'dong goi chac chan'], negative: ['giao hang cham', 'giao cham', 'hop mop', 'ship cham', 'giao tre'], praise: 'Giao nhận, đóng gói được đánh giá tốt', pain: 'Trải nghiệm giao nhận chưa tốt', hook: 'Một trải nghiệm mua hàng trọn vẹn.', advice: 'Đưa phản hồi cho bộ phận vận hành; tách chất lượng giao nhận khỏi hiệu quả sản phẩm.', visual: 'Quay quy trình đóng gói thật, không cam kết tốc độ giao hàng khi chưa xác minh.' },
];

const contains = (text: string, phrase: string) => (` ${text.replace(/[^a-z0-9 ]/g, ' ')} `).includes(` ${phrase} `);
const positiveWords = ['rat tot', 'rat thich', 'dung thich', 'hai long', 'ung y', 'se mua lai', 'mua lai', 'du am', 'diu nhe', 'mem min', 'tham nhanh', 'mong nhe', 'gia hop ly', 'khong kich ung', 'khong bet', 'khong nhon', 'khong mui'];
const negativeWords = ['khong tot', 'khong thich', 'khong hai long', 'khong dang tien', 'that vong', 'khong hop', 'bi hong', 'ro ri', 'qua dat', 'gia cao', 'gia hoi cao', 'mui nong', 'mui hac', 'noi mun', 'bi rat', 'giao hang cham', 'khong du am', 'chua du am', 'kho lay', 'bet dinh', 'kich ung'];

function negativeText(text: string): string {
  return text
    .replace(/\b(?:khong|het|bot) (?:he )?(?:bi |con |co )?(?:kich ung|rat|nong rat|noi mun|bet(?: dinh)?|nhon(?: dinh)?|dinh|cang da|co cam giac nhon|kho da|bong troc|ro ri|mui nong|mui hac|mui kho chiu)\b/g, ' camnhantichcuc ')
    .replace(/\b(?:chua|khong) thay (?:bi )?(?:kich ung|rat|noi mun|kho da|ro ri)\b/g, ' camnhantichcuc ');
}

function positiveText(text: string): string {
  return text
    .replace(/\b(?:khong|chua) (?:he )?(?:du am|cap am tot|mem min|diu nhe|hai long|tham nhanh|thich|dang tien)\b/g, ' camnhantieucuc ')
    .replace(/\bkhong (?:(?:muon|dinh|se) )?mua lai\b/g, ' camnhantieucuc ')
    .replace(/\bkhong (?:he |thay )?tot\b/g, ' camnhantieucuc ');
}

export function classifySentiment(review: Review): Sentiment {
  const text = normalize(review.text);
  const good = positiveWords.some(p => contains(positiveText(text), p)) || negativeText(text).includes('camnhantichcuc');
  const bad = negativeWords.some(p => contains(negativeText(text), p)) || positiveText(text).includes('camnhantieucuc');
  if (good && bad) return 'mixed';
  if (bad) return 'negative';
  if (good) return 'positive';
  if (review.rating !== null && review.rating >= 4) return 'positive';
  if (review.rating !== null && review.rating <= 2) return 'negative';
  return 'neutral';
}

function quote(review: Review): string {
  const sentence = review.text.split(/(?<=[.!?])\s+/)[0];
  return sentence.length > 220 ? sentence.slice(0, 217) + '…' : sentence;
}

export function analyzeLocal(input: AnalysisInput): Analysis {
  const reviews: ClassifiedReview[] = input.reviews.map(r => ({ ...r, sentiment: classifySentiment(r) }));
  const insights: Insight[] = [];
  for (const theme of themes) {
    const positives = reviews.filter(r => theme.positive.some(p => contains(positiveText(normalize(r.text)), p)));
    const negatives = reviews.filter(r => theme.negative.some(p => contains(negativeText(normalize(r.text)), p)));
    if (positives.length) insights.push({
      id: `${theme.id}-praise`, title: theme.praise, kind: 'praise',
      description: `${positives.length} review đề cập tích cực đến ${theme.title.toLowerCase()}.`,
      reviewIds: positives.map(r => r.id), recommendation: theme.advice,
    });
    if (negatives.length) insights.push({
      id: `${theme.id}-pain`, title: theme.pain, kind: 'pain',
      description: `${negatives.length} review có băn khoăn về ${theme.title.toLowerCase()}.`,
      reviewIds: negatives.map(r => r.id), recommendation: theme.advice,
    });
  }
  const motives: Array<[string, string, string[]]> = [
    ['recommendation', 'Mua từ lời giới thiệu', ['ban gioi thieu', 'duoc gioi thieu']],
    ['need', 'Chọn mua để đáp ứng nhu cầu cụ thể', ['mua vi', 'chon vi', 'mua de', 'can serum', 'chon san pham vi']],
    ['repeat', 'Có ý định mua lại', ['mua lai', 'se mua lai', 'lan hai', 'lan thu hai']],
    ['social-proof', 'Tham khảo review trước khi mua', ['doc review', 'xem review', 'xem danh gia']],
  ];
  for (const [id, title, phrases] of motives) {
    const matches = reviews.filter(r => phrases.some(p => contains(positiveText(normalize(r.text)), p)));
    if (matches.length) insights.push({
      id: `motivation-${id}`, title, kind: 'motivation',
      description: `${matches.length} review nêu rõ tín hiệu này trong nội dung.`,
      reviewIds: matches.map(r => r.id),
      recommendation: 'Đọc nguyên văn để hiểu bối cảnh trước khi dùng thông điệp này cho một nhóm khách rộng hơn.',
    });
  }
  insights.sort((a, b) => b.reviewIds.length - a.reviewIds.length);
  const opportunities = insights.filter(i => i.kind === 'praise' && !i.id.startsWith('delivery')).slice(0, 4);
  const angles: Angle[] = opportunities.map((insight, i) => {
    const theme = themes.find(t => insight.id === `${t.id}-praise`)!;
    const evidence = reviews.find(r => r.id === insight.reviewIds[0])!;
    const counter = insights.find(x => x.id === `${theme.id}-pain`);
    return {
      id: `angle-${theme.id}`,
      title: insight.title,
      hook: theme.hook,
      rationale: `${insight.reviewIds.length}/${reviews.length} review có tín hiệu tích cực về chủ đề này.${counter ? ` Đồng thời có ${counter.reviewIds.length} review phản hồi trái chiều; cần đọc cùng bối cảnh.` : ''}`,
      reviewIds: insight.reviewIds,
      script: {
        hook: `“${quote(evidence)}” — một khách hàng đã viết về ${input.projectName}.`,
        problem: `Khi chọn mỹ phẩm, ${theme.title.toLowerCase()} có phải là điều bạn quan tâm?`,
        solution: `Cùng xem trải nghiệm thực tế với ${input.projectName}. [${theme.visual}]`,
        proof: `Trong ${reviews.length} review được nhập, ${insight.reviewIds.length} review nhắc tích cực đến chủ đề này. Trích ${evidence.id}: “${quote(evidence)}”${counter ? ` Có ${counter.reviewIds.length} phản hồi trái chiều trong cùng bộ dữ liệu.` : ''} Đây là cảm nhận cá nhân, trải nghiệm có thể khác nhau.`,
        cta: 'Xem thông tin sản phẩm, thành phần và hướng dẫn dùng để cân nhắc độ phù hợp với bạn.',
      },
    };
  });
  return {
    id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectName: input.projectName, createdAt: new Date().toISOString(), mode: 'local', isDemo: input.isDemo,
    summary: insights.length
      ? `Đã tìm thấy ${insights.filter(i => i.kind === 'praise').length} điểm được yêu thích, ${insights.filter(i => i.kind === 'pain').length} nhóm băn khoăn và ${insights.filter(i => i.kind === 'motivation').length} tín hiệu mua hàng từ ${reviews.length} review. Kết quả cục bộ dựa trên từ khóa và điểm sao; hãy đối chiếu review gốc.`
      : `Đã đọc ${reviews.length} review. Chưa đủ tín hiệu để đề xuất góc quảng cáo có cơ sở. Hãy bổ sung review mô tả trải nghiệm cụ thể hoặc dùng phân tích AI.`,
    reviews, insights, angles, importInfo: input.importInfo,
  };
}

export function getStats(analysis: Analysis) {
  const counts = { positive: 0, negative: 0, mixed: 0, neutral: 0 };
  analysis.reviews.forEach(r => counts[r.sentiment]++);
  const rated = analysis.reviews.filter((r): r is ClassifiedReview & { rating: number } => r.rating !== null);
  return {
    total: analysis.reviews.length, counts,
    positivePercent: analysis.reviews.length ? Math.round(counts.positive / analysis.reviews.length * 100) : 0,
    averageRating: rated.length ? rated.reduce((sum, r) => sum + r.rating, 0) / rated.length : null,
    ratedCount: rated.length,
    sourceCount: new Set(analysis.reviews.map(r => r.source)).size,
  };
}
