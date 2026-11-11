# Dashboard giá xăng dầu · Trung Thành

GitHub Pages phục vụ `dist/`. Push vào `main` chạy kiểm thử và xuất bản. Workflow chỉ gọi Chợ Giá khi chọn **Refresh** trên Dashboard rồi chọn **Run workflow** bằng tài khoản GitHub có quyền trên repo. Khi giá, phiên hoặc dữ liệu dự báo thay đổi, workflow lưu snapshot rồi xuất bản. Chạy lại với cùng dữ liệu không tạo commit. Nếu nguồn trả lỗi, xem kết quả chạy trên GitHub.

**Cập nhật giá** lưu dữ liệu nhập và các lần sửa theo ngày trên trình duyệt hiện tại. Nhập giá bán lẻ dự kiến theo đồng/lít và Platts theo USD/thùng. Ô trống dùng giá Chợ Giá cùng phiên nếu có. Với T-Roo, DO 10ppm nhập tay được ưu tiên, kế đến DO 50ppm nhập tay, rồi DO 0,05%S từ snapshot. Bảng Platts vẫn hiển thị riêng từng phẩm cấp.

Phiên Platts chốt 15:30 của ngày điều hành thuộc kỳ mới. Công thức T-Roo so bình quân kỳ mới với bình quân kỳ hình thành giá bán lẻ đang áp dụng.

Kiểm thử bằng `npm ci --ignore-scripts` và `npm test` trên Node.js 22 trở lên. Để xem giao diện tại máy, phục vụ thư mục `dist/` qua HTTP.

## Nhập giá thật và quản trị lịch sử

Giá thật và lịch sử chính thức được quản trị trong repo.

- Sao chép `config/petro-connect.example.json` ra file riêng, điền giờ nhận có múi giờ, tên ảnh bản tin và 4 mức E5/E10 III/DO 0,05S/FO 3,5S (null = chưa có). Chỉ đặt `baselineConfirmed=true` khi đã xác nhận bản tin so với đúng mốc giá hiện hành. Không điền mật khẩu.
- Chạy `node scripts/admin.mjs <file-input.json>`, xem `git diff`, commit và xuất bản. Cùng mẫu này dùng được cho User/T-Roo/doanh nghiệp qua báo chí, đổi đúng `source`.
- Sau công bố, dùng `config/official.example.json`, điền 4 giá thật, hiệu lực, giờ công bố và link văn bản. `nextPeriod` do chủ trạm chọn theo lịch thực tế, kể cả điều chỉnh ngoài kỳ hoặc nghỉ lễ. Có thể bỏ `nextPeriod` để tiếp tục hiển thị hàng Giá thật kỳ hiện tại.
- Admin script cập nhật lịch sử và giữ **đúng 10 kỳ**, gồm kỳ ngoài lịch. Trước giờ chốt, dự kiến hợp lệ được đóng băng theo từng nguồn. Sau công bố, chỉ so các dự kiến đã lưu trước thời điểm công bố, không dựng lại quá khứ. Sai lệch có dấu = thật − dự kiến; MAE trung bình trị tuyệt đối E5/E10/DO; nguồn thiếu sản phẩm không được xếp hạng. Đồng hạng hiển thị đủ tên.
- Refresh tuyệt đối không sửa `official`, `pump`, `history`, `forecast.actual` hay mốc giá cơ sở.
- Giá ngày 29/10 trong lịch sử vẫn có nhãn mẫu do chủ trạm cung cấp, chưa dùng để tính độ chính xác. Ngày 03/11 có số chính thức, các dự báo chưa theo dõi để “—”.
