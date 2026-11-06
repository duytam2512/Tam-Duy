# 🌸 Nhà Chúng Mình - Kho Kỷ Niệm Thơ Mộng Làng Quê

> Ứng dụng web lưu giữ hình ảnh & video kỷ niệm với chủ đề làng quê thanh bình, tích hợp bảo mật mật khẩu cá nhân, đồng bộ Google Photos, tối ưu hóa Google SEO & Google Search Console, sẵn sàng triển khai 1-click lên Vercel và GitHub.

![Nhà Chúng Mình Banner](https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&h=600&q=80)

---

## ✨ Tính Năng Nổi Bật

- 🌾 **Tải ảnh & video đa tệp**: Hỗ trợ kéo thả nhiều ảnh cùng lúc, xem trước trực quan, chọn máy ảnh trên điện thoại.
- 🔒 **Bảo mật mật khẩu (SHA-256)**: Khóa từng kỷ niệm riêng tư bằng mật khẩu hoặc mã PIN tổng cho toàn bộ kho.
- 💌 **Chia sẻ cá nhân**: Tạo liên kết chia sẻ bảo vệ bằng mật khẩu, hẹn giờ hết hạn (1h, 24h, 7 ngày, vĩnh viễn) và cho phép/ngăn chặn tải về.
- 🖼️ **Đồng bộ Google Photos**: Kết nối tài khoản Google để duyệt và tải nhanh ảnh từ Google Drive / Google Photos.
- 🌸 **Giao diện Xanh - Hồng (Emerald & Rose)**: Thiết kế thơ mộng với cảnh sắc làng quê Việt Nam: đồng lúa chín, đầm sen, lũy tre làng, hoàng hôn êm đềm.
- 🔍 **Chuẩn Google SEO & Google Search Console**: Đầy đủ thẻ Meta SEO, OpenGraph cards, Twitter cards, Schema.org JSON-LD, `sitemap.xml` và `robots.txt`.
- 🚀 **Sẵn sàng triển khai Vercel & GitHub**: Cấu hình `vercel.json` định tuyến SPA chuẩn xác.

---

## 🚀 Hướng Dẫn Đẩy Lên GitHub

Chạy các lệnh sau trong terminal để đẩy mã nguồn lên kho lưu trữ GitHub của bạn:

```bash
# 1. Khởi tạo Git repository (nếu chưa có)
git init

# 2. Thêm toàn bộ mã nguồn
git add .

# 3. Tạo commit đầu tiên
git commit -m "feat: Khởi tạo dự án Nhà Chúng Mình - Kho kỷ niệm thơ mộng làng quê"

# 4. Đổi tên nhánh chính thành main
git branch -M main

# 5. Liên kết với kho lưu trữ GitHub của bạn (thay USERNAME/REPO bằng thông tin của bạn)
git remote add origin https://github.com/USERNAME/nha-chung-minh.git

# 6. Đẩy mã nguồn lên GitHub
git push -u origin main
```

---

## ⚡ Hướng Dẫn Triển Khai Lên Vercel (1-Click Deploy)

Dự án đã có sẵn tệp `vercel.json` tối ưu cho Single Page Application (SPA).

### Cách 1: Qua giao diện Vercel Dashboard
1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub.
2. Chọn **"Add New..."** -> **"Project"**.
3. Chọn repository `nha-chung-minh` vừa tạo ở bước trên.
4. Cấu hình tự động nhận diện:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Nhấp **Deploy** và chờ ~30 giây để hoàn tất!

### Cách 2: Qua Vercel CLI
```bash
npm i -g vercel
vercel
```

---

## 🔍 Cấu Hình Google Search Console (Google SEO)

1. Truy cập [Google Search Console](https://search.google.com/search-console).
2. Nhập URL trang web của bạn (ví dụ: `https://your-domain.vercel.app`).
3. Chọn phương thức xác minh **"Thẻ HTML" (HTML tag)**.
4. Sao chép chuỗi mã trong `content="..."` và dán vào cài đặt **"Google Search Console"** trong ứng dụng hoặc trong tệp `index.html`.
5. Trong mục **Sitemaps**, nhập `sitemap.xml` và nhấn **Gửi (Submit)** để Googlebot lập chỉ mục toàn bộ hình ảnh.

---

## 🛠️ Cài Đặt Cục Bộ (Local Development)

```bash
# Cài đặt thư viện
npm install

# Khởi chạy server phát triển (Port 3000)
npm run dev

# Kiểm tra lỗi TypeScript
npm run lint

# Đóng gói sản phẩm (Build for production)
npm run build
```

---

© 2026 Nhà Chúng Mình • Kho lưu giữ kỷ niệm thơ mộng quê hương.
