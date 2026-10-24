# MoriBox

Cửa hàng mô hình Gunpla (Gundam) bằng Next.js 16, dữ liệu và đăng nhập chạy trên Supabase.

## Tính năng

**Khách hàng**
- Danh mục theo hạng (PG, MG, RG, HG, EG, SD), trang chi tiết sản phẩm, Flash Sale, hàng mới về, bán chạy
- Tìm kiếm không cần gõ dấu với gợi ý ngay khi gõ, bộ lọc (khoảng giá, cấp độ, series, còn hàng, đang giảm giá), trang Yêu thích
- Giỏ hàng và yêu thích đồng bộ theo tài khoản, đổi máy vẫn còn (khách chưa đăng nhập lưu trong trình duyệt)
- Đánh giá sao và nhận xét (chỉ khách đã nhận hàng), sổ địa chỉ giao hàng, mua lại đơn cũ, dòng thời gian trạng thái đơn
- Giỏ hàng, mã giảm giá, thanh toán COD hoặc chuyển khoản QR (VietQR)
- **Đơn hàng của tôi** với các tab trạng thái, tự hủy đơn chưa thanh toán, yêu cầu hủy và hoàn tiền
- Đăng ký, đăng nhập, quên mật khẩu, cài đặt (giao diện sáng/tối "Hangar", cỡ chữ, ngôn ngữ Việt/Anh, bảo mật)

**Quản trị** (mỗi vai trò chỉ thấy phần của mình)

| Vai trò | Quyền |
|---|---|
| Quản trị hệ thống | Tất cả: đơn hàng, đóng gói, kho, khuyến mãi, doanh thu, người dùng, nhật ký, cài đặt cửa hàng |
| Thủ kho | Đóng gói và giao đơn, sản phẩm, tồn kho, nhập hàng, lịch sử biến động |
| Kế toán | Đơn hàng, doanh thu, lợi nhuận, xác nhận đã nhận tiền, hoàn tiền, xác nhận đã giao |

- Luồng đơn: chờ xử lý → đã đóng gói → đang giao → đã giao (hoặc đã hủy)
- Kho: nhập hàng, lịch sử biến động, ngưỡng sắp hết riêng từng sản phẩm, giá vốn, nhập/xuất CSV, ảnh lên Supabase Storage
- Doanh thu: chọn kỳ hoặc khoảng ngày, so kỳ trước, lợi nhuận gộp, theo phương thức thanh toán, sản phẩm bán chạy, xuất CSV
- Khuyến mãi: mã giảm theo % hoặc số tiền, thời gian, đơn tối thiểu, giới hạn lượt dùng
- Nhật ký thao tác, xác thực hai bước (TOTP) cho nhân viên, khóa tài khoản, email nhân viên cấp quyền trước
- Thông báo đơn mới theo thời gian thực

## Cài đặt

```bash
npm install
cp .env.example .env.local   # điền URL và publishable key của dự án Supabase
npm run dev
```

### Thiết lập Supabase (một lần)

1. Tạo dự án trên [supabase.com](https://supabase.com), lấy **Project URL** và **publishable key** (Connect hoặc Project Settings → API Keys) điền vào `.env.local`.
2. SQL Editor → chạy toàn bộ [`supabase/schema.sql`](supabase/schema.sql). File chạy lại an toàn, hãy chạy lại mỗi khi cập nhật code.
   Hoặc để máy chạy giúp: tạo mã truy cập tại https://supabase.com/dashboard/account/tokens, ghi `SUPABASE_ACCESS_TOKEN=sbp_...` vào `.env.local`, chạy `npm run db:apply` (thêm `-- --seed` để nạp cả sản phẩm mẫu), rồi **xóa mã đó** trên trang trên.
3. Chạy [`supabase/seed.sql`](supabase/seed.sql) để có sản phẩm mẫu (tạo lại bằng `node scripts/generate-seed.mjs`).
4. Authentication → Sign In / Providers → Email: tắt **Confirm email** khi phát triển, **bật lại khi bán thật**.
5. Đăng ký một tài khoản trong app, rồi cấp quyền admin bằng SQL:
   ```sql
   update public.profiles set role = 'admin' where email = 'email-cua-ban@gmail.com';
   ```
   Sau đó thêm nhân viên ngay trong app: Quản trị → Người dùng.
6. Vào **Cài đặt cửa hàng** để khai báo phí vận chuyển và tài khoản ngân hàng nhận chuyển khoản.

## Bảo mật

- Mọi quyền được ép ở cơ sở dữ liệu bằng Row Level Security và các hàm SQL kiểm tra vai trò; giao diện chỉ ẩn/hiện cho tiện.
- Giá, tồn kho và mã giảm giá được tính lại phía server trong `place_order()`, không tin dữ liệu từ trình duyệt.
- Giá vốn nằm trong bảng riêng chỉ nhân viên đọc được; báo cáo lợi nhuận tính bằng hàm phía server.
- Không bao giờ đưa khóa `service_role` vào `NEXT_PUBLIC_*` hoặc vào Git. `.env.local` đã bị `.gitignore` chặn.

## Chưa có

- Cổng thanh toán MoMo, ZaloPay, VNPay, thẻ (cần tài khoản thương nhân và code phía server nhận callback)
- Tự đối soát chuyển khoản (cần dịch vụ như SePay hoặc Casso), thông báo qua email hoặc Telegram
- Giao diện tiếng Anh mới phủ cửa hàng (đăng nhập, danh mục, sản phẩm, tìm kiếm, yêu thích); giỏ hàng, thanh toán, đơn hàng và trang quản trị vẫn chỉ có tiếng Việt

## Lệnh

```bash
npm run dev        # chạy môi trường phát triển
npm run build      # build production
npm run typecheck  # kiểm tra kiểu
npm run lint       # eslint
```
