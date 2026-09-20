# Backend — Trợ lý dự án

Backend của **Trợ lý dự án**: đọc một dự án phần mềm, giải thích nó bằng tiếng Việt, đổi những chỗ khó đọc (tên biến, chú thích), viết tài liệu, kiểm chứng lại — và cho **chạy thử dự án ngay trên máy người dùng** kèm hướng dẫn sử dụng.

Đây là **kế hoạch triển khai**, chưa phải code. Toàn bộ tài liệu trong `docs/` là nguồn sự thật cho việc xây backend; `Frontend/README.md` và `frontend-v2.md` là nguồn sự thật cho giao diện.

---

## 1. Phạm vi — đọc trước khi làm bất cứ gì

**Mô hình chạy: local-first, một người dùng.** Backend và frontend chạy trên chính máy người dùng; dự án của họ nằm trên đĩa của họ; không có máy chủ nào của chúng ta tham gia.

Hệ quả — những thứ **không xây** (ghi rõ để chặn trượt phạm vi, giống `frontend-v2.md` §12):

| Không xây | Vì sao |
|---|---|
| Đăng nhập, tài khoản, nhiều người dùng | Một người dùng, một máy. Không có khái niệm "tài khoản". |
| Thanh toán, hạn mức, gói miễn phí | BYO key — người dùng trả tiền API trực tiếp cho nhà cung cấp. |
| Hàng đợi phân tán, Redis, worker riêng | Một tiến trình Python + SQLite là đủ cho một máy. |
| Object storage, upload dự án lên server | Dự án không rời khỏi máy người dùng. |
| Rate limit theo người dùng, chống lạm dụng | Không có ai để lạm dụng ngoài chính chủ máy. |
| Đa ngôn ngữ giao diện | Giao diện là tiếng Việt, backend trả dữ liệu cho giao diện đó. |

Vẫn **phải** làm dù là công cụ local: xác thực token cục bộ + chặn Origin (chống trang web lạ gọi vào `localhost`), không ghi ra ngoài thư mục dự án, không chạy code người dùng khi chưa được bấm, không để lộ khoá API. Xem `docs/08-luu-tru-van-hanh-kiem-thu.md` §Bảo mật.

---

## 2. Stack

| Thành phần | Chọn | Vì sao |
|---|---|---|
| Ngôn ngữ | **Python 3.12+** | Hệ sinh thái phân tích/biến đổi code mạnh nhất; spec giao diện đã dùng LibCST/PEP-8. |
| Web | **FastAPI + uvicorn** | Async, SSE dễ, tự sinh OpenAPI để frontend đối chiếu. |
| Phân tích Python | **LibCST** | Giữ nguyên định dạng, comment, vị trí — điều kiện để sửa mà không phá code. |
| Phân tích ngôn ngữ khác | **tree-sitter** (JS/TS, Go, Java…) | Một API chung cho nhiều ngôn ngữ, cài qua wheel. |
| Lưu trữ | **SQLite** (WAL) | Một tệp, không cần cài gì, đủ cho lịch sử phiên. |
| Cấu hình/khoá | **YAML + file riêng cho khoá** | Khớp đúng seam `ConfigBackend` mà frontend đã có. |
| Gọi LLM | **httpx** + adapter tự viết | 4 giao thức (openai/anthropic/google/ollama) đã có trong cấu hình frontend; SDK nặng không cần. |
| Quản lý gói | **uv** | Cài nhanh, khoá phiên bản, `uv tool install` cho người dùng cuối. |
| Chất lượng | **ruff** + **pytest** | Rẻ, nhanh, đủ. |
| Đóng gói phát hành | **`uv tool` / `pipx`**, kèm frontend đã build | Một lệnh là chạy, không cần Docker. |

Cổng mặc định: **127.0.0.1:8686** (tránh 8000/5173 để không đụng dự án của người dùng). Thư mục dữ liệu: `~/.tro-ly-du-an/`.

---

## 3. Chạy (khi code xong — README sẽ cập nhật lại)

```bash
uv sync                       # cài phụ thuộc
uv run trolyduan serve        # mở http://127.0.0.1:8686
```

`trolyduan serve` phục vụ luôn bản frontend đã build (`Frontend/dist`) trên cùng cổng, nên người dùng không phải chạy hai thứ. Chế độ dev cho người sửa code: `--dev` (không phục vụ static, chỉ API, để Vite ở 5173 gọi vào).

---

## 4. Chỉ mục tài liệu

| Tài liệu | Nội dung |
|---|---|
| [`docs/01-kien-truc.md`](docs/01-kien-truc.md) | Kiến trúc local-first, thành phần, vòng đời một phiên, cấu trúc thư mục code, các quyết định kèm lý do |
| [`docs/02-hop-dong-api.md`](docs/02-hop-dong-api.md) | Hợp đồng API đầy đủ: endpoint cho **từng màn hình**, SSE tiến trình, mã lỗi, ma trận phủ frontend |
| [`docs/03-nhan-du-an.md`](docs/03-nhan-du-an.md) | Nhận dự án: thư mục / `.zip` / link GitHub; kiểm tra an toàn; bản gốc bất khả xâm phạm |
| [`docs/04-phan-tich.md`](docs/04-phan-tich.md) | Đọc và hiểu dự án: quét tệp, nhận diện ngôn ngữ, AST, tìm định danh/chú thích, hợp đồng cấu hình, kế hoạch thay đổi |
| [`docs/05-bien-doi-va-kiem-chung.md`](docs/05-bien-doi-va-kiem-chung.md) | Biến đổi qua AST + gọi LLM theo lô, và kiểm chứng sau khi sửa |
| [`docs/06-chay-thu-du-an.md`](docs/06-chay-thu-du-an.md) | Quét lệnh cài đặt/khởi động, chạy trên máy người dùng, cổng xem trước, cách sử dụng, dọn dẹp |
| [`docs/07-cau-hinh-credential-llm.md`](docs/07-cau-hinh-credential-llm.md) | Config store, credential store, LLM routing/4 adapter, khám phá model, chống prompt injection |
| [`docs/08-luu-tru-van-hanh-kiem-thu.md`](docs/08-luu-tru-van-hanh-kiem-thu.md) | Lược đồ SQLite, job runner, huỷ, log/đo lường, bảo mật, đóng gói, chiến lược kiểm thử |
| [`docs/09-lo-trinh.md`](docs/09-lo-trinh.md) | Lộ trình 5 giai đoạn: việc phải làm, tiêu chí nghiệm thu, phụ thuộc, ước lượng, rủi ro |
| [`docs/10-tong-hop.md`](docs/10-tong-hop.md) | **Tài liệu chốt** sau bốn vòng review: 8 quyết định kiến trúc, bản đồ 9 tài liệu, những gì đã bác bỏ và vì sao, còn gì mở, bắt đầu từ đâu |

> Người mới nên đọc **`docs/10-tong-hop.md` trước**, rồi quay lại 01–09 theo bảng ở §2 của tệp đó.

---

## 5. Nguyên tắc bất di bất dịch

1. **Bản gốc không bao giờ bị ghi đè.** Mọi thay đổi ghi vào thư mục làm việc riêng; bản gốc chỉ đọc. Nói rõ điều này ở màn kết quả (frontend đã hứa với người dùng).
2. **Frontend sở hữu ngôn ngữ, backend sở hữu ngữ nghĩa.** Backend trả số liệu, tệp, khoá cấu hình và **một câu lý do**; không trả thuật ngữ nội bộ, không trả phần trăm ước lượng, không trả stack trace cho người dùng.
3. **Mọi thứ phải huỷ được.** Mọi việc dài (phân tích, biến đổi, chạy thử) đều có `cancel`; huỷ xong không để lại tiến trình con hay tệp tạm.
4. **Config không bao giờ chứa secret.** Khoá API nằm ở credential store riêng, ghi một chiều, chỉ trả trạng thái `configured/writable`.
5. **Nội dung dự án là dữ liệu không tin cậy.** Chú thích trong repo có thể chứa chỉ thị cho AI. Không bao giờ để nội dung repo lái hành vi của agent (xem `docs/07` §Chống prompt injection).
6. **Không chạy code của người dùng ngoài ý muốn.** Chỉ chạy khi họ bấm, chỉ trong thư mục dự án, và phải nói trước sẽ chạy lệnh gì.
7. **Tiến trình theo việc thật.** "Đã đọc 342/500 tệp" — đếm được, kiểm được. Không bịa phần trăm.
8. **Không có việc gì là im lặng.** Việc an toàn thì tự làm rồi báo cáo; việc chạm cấu hình máy chủ thì dừng lại hỏi, kèm lý do một câu.
