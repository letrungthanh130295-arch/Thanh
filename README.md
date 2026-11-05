# Dashboard giá xăng dầu · Trung Thành

Trang tiếng Việt, chỉ đọc công khai. Kiến trúc: GitHub Actions → Node.js → `dist/snapshot.json` → trang tĩnh. Trình duyệt chỉ tải snapshot cùng origin; không có proxy CORS, API key, tài khoản hay mật khẩu.

## Trạng thái bàn giao 04/11/2026

- Đã sửa giá trần từ công bố Bộ Công Thương **03/11/2026, 22:00** và giá trụ bơm từ ảnh Petrolimex Vũng Tàu do chủ trạm gửi.
- E5/E10 III/DO 0,05S/FO: trần 23.203 / 23.231 / 28.876 / 23.974; trụ bơm 23.200 / 23.230 / 28.870 / 23.970. E10 V 24.230; DO 0,001S-V 30.270; dầu hỏa 29.010; FO 180S-0,5S 29.590. Không trộn phẩm cấp.
- Chạy lấy nguồn thật thành công trên máy chủ phát triển. Xem timestamp/status trong snapshot cho từng lần lấy. Nếu Yahoo 429 hoặc cấu trúc Chợ Giá thay đổi, giữ số thành công trước đó và ghi lỗi.
- Bản test được xuất bản trên Sites. Chưa có repo GitHub Private hoặc Actions đang chạy do GitHub chưa kết nối. Không có tiến trình nền trên Sites.
- Bản tin dự báo Chợ Giá ngày thành phẩm 02/11 cũ hơn điều chỉnh ngoài kỳ 03/11. Hiển thị mức nguồn cùng phép cộng minh họa nhưng cảnh báo, không chấm độ chính xác trên mốc chưa xác nhận.

## Chạy phía server

Yêu cầu Node.js 22 trở lên:

```bash
npm ci --ignore-scripts
npm test
node scripts/fetch-snapshot.mjs
```

Phục vụ `dist/` qua HTTP. Không mở `index.html` bằng `file://` vì fetch JSON cần HTTP.

Chỉ 3 nguồn tự động:
1. `https://chogia.vn/gia-xang-dau-singapore-hom-nay-38348/`
2. `https://chogia.vn/du-bao-gia-xang-dau-37804/`
3. `https://query2.finance.yahoo.com/v8/finance/chart/CL=F`, lỗi mới thử query1.

Thông báo Bộ Công Thương chỉ là dữ liệu nhập tay đã đối chiếu trong lần bàn giao, **không** thêm vào danh sách tự fetch. Petro Connect, User, T-Roo và doanh nghiệp qua báo chí chỉ nhập tay khi có bản tin; không truy cập trang đăng nhập.

Parser kiểm tra đủ tên/cột, chọn ngày mới nhất, đổi 0 thành null, dùng đúng phiên trước. Forecast đọc từng sản phẩm trong thẻ `cg-card`, bỏ WTI nhúng của Chợ Giá. Nếu không khớp cấu trúc, không phỏng đoán bằng đoạn văn khác. `pageUpdatedAt` phân biệt giờ bảng giá và metadata bài viết; metadata có thể cũ, không coi là giờ bản tin.

## Kích hoạt trên một repo GitHub Private riêng

1. Tạo repo mới **Private**, đưa toàn bộ gói mã nguồn này lên nhánh `main`, gồm `.github/` và `package-lock.json`. Không đưa `node_modules/`, `.run/` hoặc credential vào repo.
2. Trong repo Settings → Actions, cho phép workflow đọc/ghi nội dung. Nếu có branch protection, cấu hình cho bot ghi snapshot hoặc dùng nhánh riêng; không tự tắt bảo vệ.
3. Settings → Pages → Source: **GitHub Actions**. Repo vẫn Private, trang Pages là công khai theo yêu cầu. Tài khoản/gói GitHub phải hỗ trợ Pages cho private repo; nếu không, cần hosting tương thích. Không đổi repo thành Public để lách giới hạn.
4. Actions → “Snapshot xăng dầu” → Run workflow với `force_deploy=true` cho lần đầu. Kiểm tra log và URL deployment thành công trước khi phát cho nhân viên.
5. Sau khi xác nhận lịch thật đã chạy và trang Pages hoạt động, sửa `operations.schedulerActive=true`, `operations.hosting` và ghi chú trong snapshot. Không gắn nhãn đã kích hoạt khi chỉ có file YAML.

Lịch hằng giờ (24 lần/ngày): tác vụ Snapshot Chợ Giá đọc web vào phút 00 theo Asia/Ho_Chi_Minh; GitHub Actions lấy Yahoo WTI vào phút 05, cron UTC `5 * * * *` (cũng là phút 05 ở Việt Nam). Chợ Giá không gọi trực tiếp từ runner do HTTP 403. Schedule chạy trên nhánh mặc định; lịch có thể chạy trễ, không bảo đảm chính xác từng phút.

Mỗi lần chạy lưu snapshot vào repo, kể cả WTI đổi <1 USD. **Chỉ deploy khi** ngày/giá Platts đổi, mức/kỳ dự báo đổi, hoặc WTI đổi >=1 USD so lần kiểm tra **thành công trước** (không so lần deploy). Lần đầu thay số mẫu bằng số thật cũng deploy. Việc sửa code hoặc bấm force deploy là thao tác xuất bản chủ động. Không có kênh thông báo riêng.

WTI nhỏ hơn ngưỡng chỉ lưu trong repo; trang công khai vẫn giữ snapshot đã xuất bản tới lần deploy tiếp. Đây là hệ quả có chủ ý của yêu cầu không deploy với thay đổi nhỏ. Lỗi nguồn chỉ ghi log, summary, artifact và snapshot repo; hiện trên trang ở lần xuất bản tiếp theo, không thêm trigger deploy ngoài yêu cầu.

`netlify.toml` hỗ trợ upload thủ công thư mục `dist` nếu dùng Netlify. Không bật tự deploy mọi commit snapshot trên Netlify vì sẽ phá quy tắc ngưỡng WTI. Workflow bàn giao đang nhắm GitHub Pages; Netlify tự động cần thêm thiết lập deploy riêng.

## Nhập tay và cột Giá thật

Mọi thao tác quản trị ở repo/local, không nằm trong trang công khai.

- Sao chép `config/petro-connect.example.json` ra file riêng, điền giờ nhận có múi giờ, tên ảnh bản tin và 4 mức E5/E10 III/DO 0,05S/FO 3,5S (null = chưa có). Chỉ đặt `baselineConfirmed=true` khi đã xác nhận bản tin so với đúng mốc giá hiện hành. Không điền mật khẩu.
- Chạy `node scripts/admin.mjs <file-input.json>`, xem `git diff`, commit và xuất bản. Cùng mẫu này dùng được cho User/T-Roo/doanh nghiệp qua báo chí, đổi đúng `source`.
- Sau công bố, dùng `config/official.example.json`, điền 4 giá thật, hiệu lực, giờ công bố và link văn bản. `nextPeriod` do chủ trạm chọn theo lịch thực tế, kể cả điều chỉnh ngoài kỳ hoặc nghỉ lễ. Có thể bỏ `nextPeriod` để tiếp tục hiển thị hàng Giá thật kỳ hiện tại.
- Admin script cập nhật lịch sử và giữ **đúng 10 kỳ**, gồm kỳ ngoài lịch. Trước giờ chốt, dự kiến hợp lệ được đóng băng theo từng nguồn. Sau công bố, chỉ so các dự kiến đã lưu trước thời điểm công bố, không dựng lại quá khứ. Sai lệch có dấu = thật − dự kiến; MAE trung bình trị tuyệt đối E5/E10/DO; nguồn thiếu sản phẩm không được xếp hạng. Đồng hạng hiển thị đủ tên.
- Tác vụ theo lịch tuyệt đối không sửa `official`, `pump`, `history`, `forecast.actual` hay mốc giá cơ sở.
- Giá ngày 29/10 trong lịch sử vẫn có nhãn mẫu do chủ trạm cung cấp, chưa dùng để tính độ chính xác. Ngày 03/11 có số chính thức, các dự báo chưa theo dõi để “—”.

## Quy ước còn cần xác minh

15:30 Singapore = 14:30 Việt Nam. Không tự suy ra phiên thứ Năm nằm sau giờ công bố 15:00. Bình quân trên app chỉ là quan sát theo khoảng ngày, có nhãn chưa xác minh quy ước chốt phiên, không phải bình quân Liên Bộ. Sau điều chỉnh ngoài kỳ, mốc quan sát chuyển theo kỳ thực tế (hiện 03/11), không tiếp tục dùng bình quân từ 29/10 như cùng một kỳ.

Không dùng công thức dự báo mazut nếu dữ liệu FO không tái tạo được bình quân Liên Bộ. Thuế/phương pháp là chú thích, chưa là mô hình tính giá cơ sở. Kiểm tra thời hạn thuế trước khi xây dựng mô hình chính thức.

## Kiểm tra

`npm test` kiểm tra parser bằng bảng/thẻ trích từ HTML đã lấy ngày 04/11, lỗi cấu trúc, 0/null, fallback Yahoo, lỗi nguồn giữ số cũ, mốc >=1 USD, bảo vệ Giá thật, cửa sổ 10 kỳ, chấm sai lệch, nhập tay và quy đổi lịch UTC. Không gọi mạng trong test. `node scripts/fetch-snapshot.mjs` là kiểm tra tích hợp thật và sẽ cập nhật snapshot.
