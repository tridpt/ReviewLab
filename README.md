# ReviewLab

Ứng dụng tiếng Việt giúp nhãn hàng mỹ phẩm và người làm quảng cáo biến review khách hàng thành insight, góc quảng cáo và kịch bản có review gốc để đối chiếu.

## Chạy trên Windows

Cần Node.js 20.19+ hoặc 22.12+ (đã kiểm tra với Node 22.11 tại máy hiện tại).

Mở terminal tại `D:\App\ReviewLab`:

```powershell
npm install
npm run dev
```

- Giao diện: http://127.0.0.1:5188
- API: http://127.0.0.1:4387
- Có thể nhấp đúp `start.cmd` để chạy.

Hai cổng được dùng riêng cho ReviewLab. Nếu đổi cổng API trong `.env`, cập nhật proxy ở `vite.config.ts` tương ứng. Máy chủ chỉ lắng nghe trên loopback, phục vụ sử dụng cục bộ.

## Có thể dùng ngay

1. Khám phá dashboard với 36 review **giả lập**, được gắn nhãn rõ ràng.
2. Bấm **Nhập review mới**; nhập tên sản phẩm rồi chọn CSV/TXT hoặc dán mỗi review một dòng.
3. Xem bản xem trước, số review trùng bị bỏ và các dòng không hợp lệ.
4. Chọn **Phân tích cục bộ** để xử lý ngay, không cần tài khoản hoặc API key.
5. Xem các nhóm được yêu thích, băn khoăn và lý do mua. Mỗi nhóm mở được review gốc.
6. Mở góc quảng cáo và kịch bản 5 cảnh; sao chép hoặc tải Markdown.
7. Tìm kiếm/lọc review theo nguồn, cảm xúc; xuất CSV hoặc báo cáo Markdown đầy đủ.

Báo cáo đã phân tích được lưu vào localStorage, tối đa 5 báo cáo gần nhất tùy dung lượng. Ứng dụng thông báo khi không thể lưu. Chưa có đồng bộ, tài khoản người dùng hay đăng nhập. Dữ liệu mẫu hiển thị ban đầu không tự lưu vào lịch sử.

## Định dạng CSV

CSV mã hóa UTF-8, tối đa 2 MB và 2.000 review hợp lệ/lần.

```csv
review,rating,source,author,date
"Thấm nhanh, không bết dính.",5,Shopee,Khách A,2026-10-20
"Mùi hơi nồng, mình chưa thích.",3,TikTok Shop,Khách B,2026-10-21
```

- Bắt buộc một cột nội dung: `review`, `content`, `text`, `nội dung`, `nội dung đánh giá`, `đánh giá` hoặc `bình luận`.
- Tùy chọn: `rating`/`điểm`/`số sao`, `source`/`nguồn`, `author`/`tên`, `date`/`ngày`.
- Điểm sao phải là số nguyên 1–5. Điểm thiếu/sai được để trống, không đưa vào trung bình.
- Nội dung 3–5.000 ký tự. Giữ nguyên nội dung hợp lệ, loại trùng theo chữ thường/khoảng trắng và giữ khác biệt dấu tiếng Việt.
- Hỗ trợ CSV có dấu phẩy, chấm phẩy, chuỗi có ngoặc kép và xuống dòng trong ô.
- Xuất CSV có BOM UTF-8 và chặn các giá trị có thể bị bảng tính coi là công thức.

## Hai chế độ phân tích

**Cục bộ:** Bộ quy tắc từ khóa tiếng Việt, một số phủ định và điểm sao. Tách kết cấu, dưỡng ẩm, độ dịu nhẹ, mùi hương, bao bì, giá, giao nhận và tín hiệu mua hàng có trong nội dung. Giao nhận không được biến thành lợi ích mỹ phẩm. Một review có thể thuộc nhiều chủ đề. Số lượng và tỷ lệ tính từ review thực sự được nhập. Khi không có căn cứ, không tạo góc quảng cáo.

Chế độ này chạy trong trình duyệt; endpoint `/api/analyze` cũng hỗ trợ cùng bộ phân tích cục bộ để tích hợp. Đây **không phải mô hình ngôn ngữ**; có thể bỏ sót cách diễn đạt, ngôn ngữ khác, mỉa mai hoặc phủ định phức tạp.

**AI (tùy chọn):** Sao chép `.env.example` thành `.env`, điền key rồi khởi động lại `npm run dev`:

```dotenv
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4o-mini
PORT=4387
```

AI dùng OpenAI Responses API với Structured Outputs và `store: false`. API key chỉ đọc phía máy chủ, không gửi vào bundle trình duyệt. Chỉ khi người dùng chọn AI và bấm phân tích, nội dung review, điểm sao, nguồn và tên dự án mới được gửi đến OpenAI; tên người viết và ngày review không được gửi. Chi phí theo tài khoản API của bạn. Tùy chọn này không tự kích hoạt hoặc tự dùng key từ dự án khác.

AI giới hạn 200 review và tổng 100.000 ký tự/lần, không tự cắt dữ liệu. Kiểm tra phân loại đầy đủ, ID duy nhất, dẫn chứng tồn tại, xử lý lỗi/timeout và ngăn yêu cầu AI đồng thời. Schema/ID hợp lệ chưa bảo đảm nội dung nhận định luôn đúng: vẫn cần người đọc kiểm tra trích dẫn, bối cảnh và thông tin sản phẩm. Prompt yêu cầu giữ ý kiến trái chiều, không biến cảm nhận cá nhân thành bằng chứng lâm sàng hay cam kết chữa trị.

Tài liệu: [OpenAI Docs — Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Kiểm tra và build

```powershell
npm test
npm run build
# Trong khi npm run dev đang chạy:
npm run smoke
```

Tests kiểm tra nhập CSV, phủ định tiếng Việt, dẫn chứng, review trái chiều, điểm trung bình, export, hợp đồng AI với transport giả lập và render dashboard. Smoke kiểm tra HTTP qua cả API và Vite proxy, từ chối dữ liệu lỗi và lỗi cấu hình AI. Không có cuộc gọi AI trả phí trong tests.

Để chạy bản build:

```powershell
npm run build
npm start
```

Mở http://127.0.0.1:4387. Express phục vụ cả giao diện đã build và API.

## Cấu trúc

- `src/`: React + TypeScript, giao diện responsive, dialog có focus trap, nhập dữ liệu và lưu lịch sử.
- `shared/`: bộ phân tích cục bộ, parser CSV, schema, dữ liệu giả lập và export.
- `server/`: Express và tích hợp OpenAI tùy chọn.
- `tests/`: kiểm tra nghiệp vụ và render.
- `scripts/smoke.ts`: kiểm tra HTTP cục bộ.

Đây là MVP chạy cục bộ. Chưa có thu thập review tự động, kết nối sàn, thanh toán, tài khoản hoặc triển khai công khai. Cần bổ sung xác thực và hạn mức theo người dùng trước khi mở dịch vụ cho nhiều khách hàng.
