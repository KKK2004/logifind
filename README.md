# LogiFind v3 — Logistics Career Intelligence

Một website React/Vite dành cho việc làm Logistics & Supply Chain tại Việt Nam. **Ứng dụng chưa tự lấy tin từ Facebook, TopCV hoặc LinkedIn**. Liên kết tìm kiếm mở trang nguồn; tin thực có thể được người dùng gửi kèm URL và phải được quản trị xác minh. Dữ liệu 6 công ty trong demo hoàn toàn giả lập.

## 1. Chạy thử trên máy

Cài Node.js 20.19+ (hoặc 22+), mở terminal tại thư mục dự án:

```bash
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị (thường `http://localhost:5173`). Nếu chưa có `.env`, app chạy **demo mode**: tìm/lọc/chấm điểm trên tin giả; đăng nhập, lưu và tracking chỉ hoạt động khi kết nối Supabase.

## 2. Tạo Supabase và các bảng

1. Vào https://supabase.com/dashboard tạo một Project.
2. **SQL Editor** → dán toàn bộ `supabase/migrations/001_init.sql` → Run (chạy trên database mới).
3. **Project Settings → API / Connect**: lấy Project URL và public `anon`/publishable key (không phải `service_role`).
4. Sao chép `.env.example` thành `.env`, nhập:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
   ```
5. Supabase → Authentication → Providers → Email: bật Email OTP/magic link. URL Configuration: Site URL = localhost khi thử, và bổ sung `http://localhost:5173/**` trong Redirect URLs. Khi deploy, cập nhật Site URL và redirect URLs thành domain thật.
6. Chạy `npm run dev` lại, nhập email và bấm link đăng nhập từ hộp thư.

RLS phân quyền: ai cũng đọc tin; user đã đăng nhập chỉ được lưu/sửa trạng thái của bản thân, chỉ được đề xuất tin **chưa xác minh**. Không bao giờ đưa `service_role` key vào biến `VITE_` hoặc mã frontend.

**Quan trọng:** Với cấu hình mặc định, tin người dùng gửi hiển thị ngay với nhãn *Chưa xác minh*. Trước khi dùng rộng rãi, bổ sung kiểm duyệt trước khi công khai, CAPTCHA, giới hạn tần suất/anti-spam và quy trình xử lý URL độc hại. Chỉ tin đã được duyệt mới gắn `verified=true` bởi quản trị viên trong dashboard Supabase.

## 3. AI phân tích sâu (tùy chọn, có thể phát sinh phí)

Bộ chấm điểm ở trang danh sách là **rule-based scoring**, có giải thích, không phải mô hình học máy. Nút **AI phân tích sâu** dùng Supabase Edge Function gọi OpenAI khi có API key. Khóa chỉ giữ phía server, không đưa vào frontend.

Cài Supabase CLI và đăng nhập (tham khảo https://supabase.com/docs/guides/functions):

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY
npx supabase functions deploy ai-match
```

Đảm bảo JWT verification bật (mặc định) cho `ai-match`. Function còn kiểm tra user đăng nhập và chỉ đọc các tin có trong bảng jobs. Có thể đặt `OPENAI_MODEL` trong Supabase Secrets để thay model. **Bật rate limiting và giới hạn quota/budget trước khi mở công khai**; nút này hiện chưa có quota nên không nên public rộng rãi khi đã cấp API key.

Không bắt buộc cấu hình AI trả phí để dùng chức năng tìm việc và điểm phù hợp mặc định.

## 4. Đưa lên Vercel

1. Đẩy thư mục lên GitHub (không commit `.env`).
2. Vercel → Add New → Project → Import GitHub repo.
3. Framework = Vite, Build Command = `npm run build`, Output Directory = `dist`.
4. Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public key).
5. Deploy. Lấy domain dạng `https://...vercel.app`.
6. Thêm domain thật vào Supabase Auth Site URL + Redirect URLs rồi deploy lại nếu cần.
7. Gửi đường link cho bạn bè cùng sử dụng.

## 5. Lấy dữ liệu tuyển dụng hợp lệ

- **Người dùng đề xuất tin**: bấm `Đề xuất tin`, nhập URL HTTPS nguồn, nội dung, phụ cấp; hệ thống lưu và đánh dấu chưa xác minh. Chỉ chia sẻ dữ liệu có quyền sử dụng.
- **Tin doanh nghiệp đăng trực tiếp**: có thể làm trang tuyển dụng đối tác và quy trình xác minh.
- **API/RSS/feeds chính thức**: kết nối khi nhà cung cấp chấp thuận; chạy bộ đồng bộ phía máy chủ có kiểm soát, không để API secrets ở trình duyệt.
- **TopCV/Facebook/LinkedIn**: chỉ tìm kiếm và mở trang gốc trong bản này; không scrape bài riêng tư, không vượt đăng nhập/CAPTCHA, không tuyên bố có API không được cấp phép.
- Dùng `source_url` để chống tin trùng; phải kiểm tra tính mới và hạn tuyển bằng nguồn gốc trước khi đánh dấu đã xác minh.

## 6. Tính năng và giới hạn

Đã có: thiết kế responsive, tìm kiếm/tinh lọc, điểm phù hợp có lý do, email magic link, Supabase RLS, lưu việc, trạng thái ứng tuyển, gửi tin có URL, API phân tích AI tùy chọn và link trang tìm kiếm đa nguồn.

Chưa có: crawler tự động mọi nguồn, tin tuyển dụng real-time được bảo đảm, kiểm duyệt trước khi hiển thị, cảnh báo/notification, trang quản trị riêng, giới hạn tần suất AI, thống kê phân tích nâng cao. Không nên coi website là nền tảng production-scale khi chưa bổ sung những phần này.

## 7. Kiểm thử

```bash
npm run build
```

Kiểm thử thủ công: demo mode; lọc; đăng nhập và đăng xuất; hai tài khoản khác nhau không xem được saved/applications của nhau; đề xuất tin; kiểm tra chống insert `verified=true` bằng quyền user; gọi AI khi chưa đăng nhập; deploy rồi xác nhận email redirect.
