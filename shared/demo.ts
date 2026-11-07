import type { Review } from './types';

// Fictional data, explicitly labelled throughout the product.
const rows: Array<[number, string, string]> = [
  [5, 'Shopee', 'Serum thấm nhanh, bôi xong da nhẹ tênh, không bết dính. Rất hợp để dùng buổi sáng.'],
  [5, 'TikTok Shop', 'Da mình khô mà dùng thấy đủ ẩm, mềm mịn hơn. Chất serum mỏng nhẹ, không nhờn.'],
  [5, 'Shopee', 'Mua vì bạn giới thiệu cho da nhạy cảm. Dùng thấy dịu nhẹ, không kích ứng.'],
  [4, 'Website', 'Thấm nhanh, không bết. Giá hơi cao so với dung tích nhưng trải nghiệm dùng ổn.'],
  [5, 'Shopee', 'Thích nhất chất mỏng nhẹ, thấm nhanh. Sáng bôi trước kem chống nắng rất tiện.'],
  [4, 'TikTok Shop', 'Cấp ẩm tốt, da mềm. Mùi hơi nồng nên mình chưa thích lắm.'],
  [5, 'Website', 'Da nhạy cảm dùng không bị rát. Không mùi, mình thấy rất dễ chịu.'],
  [5, 'Shopee', 'Mua vì cần serum cấp ẩm. Dùng thấy đủ ẩm, không nhờn và không bết dính.'],
  [3, 'TikTok Shop', 'Chất thấm nhanh nhưng ống hút khó lấy hết sản phẩm ở đáy chai.'],
  [5, 'Shopee', 'Giá hợp lý khi mua combo, chất serum mỏng nhẹ và thấm nhanh.'],
  [4, 'Website', 'Da mềm mịn, đủ ẩm cả buổi. Bao bì đẹp và chai cầm chắc chắn.'],
  [2, 'Shopee', 'Da mình bị rát và hơi đỏ sau khi dùng. Mình đã ngừng sử dụng.'],
  [5, 'TikTok Shop', 'Chọn vì không hương liệu. Không mùi, thấm nhanh, không nhờn dính.'],
  [4, 'Shopee', 'Dịu nhẹ với da mình, không kích ứng. Chai nhỏ nên dùng hơi nhanh hết.'],
  [5, 'Website', 'Mình mua lại lần hai vì chất mỏng nhẹ, không bết và cấp ẩm tốt.'],
  [3, 'TikTok Shop', 'Serum đủ ẩm nhưng mùi nồng quá. Mong hãng có bản không mùi.'],
  [5, 'Shopee', 'Giao hàng nhanh, đóng gói chắc chắn. Chất serum thấm nhanh và da mềm.'],
  [4, 'Website', 'Mua vì muốn tìm serum nhẹ mặt. Thấm nhanh, không bết, đúng điều mình cần.'],
  [5, 'Shopee', 'Da khô dùng thấy cấp ẩm tốt, không bị căng da. Sẽ mua lại.'],
  [2, 'TikTok Shop', 'Vòi bơm bị hỏng sau vài ngày, sản phẩm bị rò rỉ. Khá thất vọng.'],
  [5, 'Website', 'Không mùi, dịu nhẹ. Da mình nhạy cảm mà dùng không bị kích ứng.'],
  [4, 'Shopee', 'Chất serum mỏng nhẹ, không bết dính. Giá cao nếu không có mã giảm.'],
  [5, 'TikTok Shop', 'Được bạn giới thiệu nên mua thử. Đủ ẩm, thấm nhanh, dùng thích.'],
  [3, 'Shopee', 'Shop giao hàng chậm, hộp móp. Serum thì cấp ẩm tốt.'],
  [5, 'Website', 'Bao bì đẹp, vòi bơm tiện dụng. Serum không mùi và thấm nhanh.'],
  [4, 'TikTok Shop', 'Da mình thấy mềm mịn, mùi dễ chịu. Muốn có chai dung tích lớn hơn.'],
  [5, 'Shopee', 'Mua vì đọc review về kết cấu nhẹ. Không nhờn, không bết, dùng ban ngày rất hợp.'],
  [4, 'Website', 'Đủ ẩm và dịu nhẹ, không bị rát. Giá hợp lý với trải nghiệm của mình.'],
  [2, 'TikTok Shop', 'Dùng xong nổi mụn li ti, mình không hợp sản phẩm này.'],
  [5, 'Shopee', 'Cấp ẩm tốt, thấm nhanh và không nhờn. Đóng gói chắc chắn.'],
  [4, 'Website', 'Chọn vì da nhạy cảm cần sản phẩm không mùi. Dùng không kích ứng.'],
  [3, 'Shopee', 'Ống hút khó lấy serum, mình phải mở nắp. Chất bên trong mỏng nhẹ.'],
  [5, 'TikTok Shop', 'Da mềm mịn, không bết dính. Thích kết cấu này hơn loại cũ mình dùng.'],
  [4, 'Website', 'Giá hơi cao nhưng đủ ẩm. Mình mua vì bạn giới thiệu.'],
  [5, 'Shopee', 'Mùi nhẹ, chất thấm nhanh. Bôi xong không có cảm giác nhờn.'],
  [3, 'TikTok Shop', 'Chưa có nhiều cảm nhận, mới nhận sản phẩm hôm qua.'],
];

export const demoProject = 'Serum dưỡng ẩm · Luma';
export const demoReviews: Review[] = rows.map(([rating, source, text], i) => ({
  id: `RV-${String(i + 1).padStart(3, '0')}`,
  rating, source, text,
  author: ['Minh Anh', 'Thảo Nguyên', 'Khánh Linh', 'Hà My', 'Phương Trần', 'Ngọc Mai'][i % 6],
  date: `2026-10-${String(1 + (i % 24)).padStart(2, '0')}`,
}));
