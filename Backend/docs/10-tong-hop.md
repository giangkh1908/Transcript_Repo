# 10 — Tổng hợp chốt

> Trạng thái: **bản chốt, vòng 4/4** (viết → review chéo 3 lượt độc lập → sửa → chốt).
> Đọc tệp này trước, rồi mới đọc 9 tệp `01-kien-truc.md` … `09-lo-trinh.md` theo bảng ở §2.

Tài liệu này nói rõ ba điều: dự án đã chốt cái gì (§1), ba vòng review đã đổi gì và đã bác gì (§3–§4),
và còn gì mở (§5–§6). Mọi con số dưới đây lấy nguyên từ 9 tệp gốc; chỗ nào đối chiếu với code
thật trong `Frontend/src/` mà thấy vênh sẽ ghi rõ "chưa khớp code".

## 1. Dự án chốt cái gì

Tám quyết định kiến trúc, mỗi cái kèm một dòng lý do:

| # | Quyết định | Vì sao |
|---|---|---|
| 1 | Local-first tuyệt đối: một tiến trình Python phục vụ cả API + static, không máy chủ trung gian | Người dùng chạy một lệnh, dự án không rời khỏi máy họ |
| 2 | Stack: Python 3.12 + FastAPI + SQLite (WAL); app ở cổng 8686, xem trước ở cổng riêng 8687/n | Một tệp DB, không cài gì thêm; cổng lạ để không đụng dự án của người dùng |
| 3 | BYO key: người dùng tự dán khoá API, backend chỉ giữ 4 adapter giao thức (openai/anthropic/google/ollama) | Chủ dự án không gánh chi phí LLM; tiền của ai người đó kiểm soát |
| 4 | AST trước LLM: cái gì đếm/sửa được bằng parser (LibCST/tree-sitter) thì không gọi AI | Chính xác, miễn phí, và là nền cho chế độ chỉ-AST khi chưa có khoá |
| 5 | Bản gốc bất khả xâm phạm: copy sang `origin/` chỉ đọc, mọi sửa ghi ở `work/`, hash manifest kiểm sau mỗi job | Đúng lời hứa của giao diện "bản gốc không bị ghi đè", kiểm được bằng máy |
| 6 | Khung xem trước ở cổng riêng, giữ `allow-same-origin` trong iframe | Cùng origin thì JS của dự án đọc được token của app; khác cổng thì trình duyệt tự cách ly |
| 7 | Token không qua HTTP: nhúng vào `index.html`, lưu `~/.tro-ly-du-an/token` (0600), ổn định giữa các lần chạy | `/api/bootstrap` mà trả token thì mọi tiến trình trên máy đều mạo danh được app |
| 8 | Không telemetry, không analytics, không gọi ra ngoài ngoài git và nhà cung cấp LLM | Công cụ miễn phí chạy trên máy người dùng thì thu số liệu là vượt quyền |

## 2. Bản đồ 9 tài liệu — cần X thì đọc Y

Bảng thực dụng: cột trái là việc bạn đang làm, cột phải là tệp trả lời nó.

| Khi bạn cần | Đọc |
|---|---|
| Hiểu toàn cục: thành phần, vòng đời phiên, hai enum trạng thái, ranh giới với frontend | `01-kien-truc.md` |
| Viết endpoint, sự kiện SSE, mã lỗi; biết mỗi màn hình cần trường nào | `02-hop-dong-api.md` |
| Nhận dự án (thư mục/`.zip`/GitHub), chặn path traversal, giữ bản gốc | `03-nhan-du-an.md` |
| Quét tệp, nhận diện ngôn ngữ, tìm tên/chú thích, hợp đồng cấu hình, kế hoạch thay đổi | `04-phan-tich.md` |
| Đổi tên, dịch chú thích, sinh tài liệu, kiểm chứng 3 lớp, quay lại bản gốc | `05-bien-doi-va-kiem-chung.md` |
| Quét lệnh chạy, cấp cổng, kill cây tiến trình, proxy xem trước, dọn dẹp | `06-chay-thu-du-an.md` |
| Config sparse, credential store, routing LLM, prompt, chống prompt injection | `07-cau-hinh-credential-llm.md` |
| Lược đồ SQLite, job runner, sweeper, bảo mật token/Origin, đóng gói, chiến lược test | `08-luu-tru-van-hanh-kiem-thu.md` |
| Thứ tự làm, ước lượng 57–79 ngày công, 17 việc frontend, câu hỏi mở | `09-lo-trinh.md` |

## 3. Ba vòng trước đã đổi gì

Mỗi dòng là một phát hiện nặng và cách xử lý đã chốt — không thêm cái mới ngoài danh sách này.

| Phát hiện nặng | Cách xử lý |
|---|---|
| Token trả qua HTTP (`/api/bootstrap` trả token) | Nhúng vào `index.html`, lưu file token 0600, ổn định giữa các lần chạy; bootstrap chỉ trả capabilities |
| Xem trước cùng origin với app, viết lại `<base>`, gỡ `allow-same-origin` | Chuyển sang cổng riêng 8687/n; bỏ viết lại `<base>`; giữ `allow-same-origin` |
| Chỉ kill tiến trình cha, con detach treo giữ cổng (đúng kiểu `npm run dev` bọc `node`) | Job Object (Windows) / process group (POSIX), huỷ hai pha, xác nhận cổng đóng |
| Tiến trình con kế thừa env, khoá AI lọt vào log dự án | Env dựng từ allowlist; chặn `*_API_KEY`/`*_SECRET`, không truyền `TROLYDUAN_*` |
| Quyền chỉ đọc được coi là bảo đảm cho `origin/` | Hash manifest mới là bảo đảm thật; quyền chỉ là lớp cản nhẹ (Windows không ngăn được chủ sở hữu) |
| `/revert` dựa vào cột `before_text`, tệp lớn không hoàn tác được | Sao lưu `.backup/` cho mọi tệp bị sửa, không ngoại lệ; hết đĩa thì dừng phiên và báo |
| Nhiều bộ trạng thái rời rạc giữa các tài liệu | Một enum phiên (10 giá trị) + một enum chạy thử (7 giá trị), kèm bảng map sang màn hình |
| SSE thiếu `id:`, không chính sách đệm, log dài không lối thoát | Mọi sự kiện có `id:`; đệm 500 sự kiện; hết đệm phát `resync`; log dài đi endpoint riêng |
| Thiếu endpoint: huỷ job, quay lại, import config, chi phí AI | Thêm `/cancel`, `/revert`, `/config/import`, `/usage` |
| Thiếu endpoint chạy thử đầy đủ dữ liệu chặng 1 | `/run` trả đủ kết quả quét hai lệnh + địa chỉ, thêm `runScan.address` |
| Kiểm chứng smoke đặt ở giai đoạn 2, tạo phụ thuộc vòng GĐ2↔GĐ3 | Dời lớp 3 (smoke) sang giai đoạn 3; GĐ2 nghiệm thu với lớp 1+2 |
| Prompt không kiểm tra đầu ra; tên do AI đặt đi thẳng vào code | Cả 5 prompt có `validate()` + nhánh dự phòng; luật tên cứng; escape HTML cho `report.html` |
| `redact()` một tầng, `.env` của dự án lọt vào `.zip` xuất ra | Hai tầng (danh sách khoá + mẫu `sk-`/`AKIA`/`Bearer`/giá trị `.env`); `.env` không vào `.zip` |
| `guard.py` thiếu ca tấn công Windows và zip bomb theo tỉ lệ | Thêm UNC, tên dành riêng Windows, tên kết thúc `.`/khoảng trắng, junction, tỉ lệ nén 200:1 |
| Crash để lại job treo, `.tmp`, tiến trình mồ côi, cổng bị giữ | `jobs/sweeper.py` chạy mỗi lần khởi động: đánh dấu `interrupted`, xoá `.tmp`, kill mồ côi, `integrity_check` |
| Ước lượng 45–60 ngày công quá lạc quan ở GĐ1–GĐ2 | Đổi thành 57–79 ngày công; việc frontend đổi từ 10 thành 17 việc |

## 4. Những gì đã bị bác bỏ và vì sao

Để người sau không "tối ưu" lại những ý đã bị loại có lý do.

| Đề xuất đã bác | Vì sao bác |
|---|---|
| Cắt 4 adapter LLM xuống 2 cho gọn | UI đã ship 4 provider (openai/anthropic/google/ollama); cắt là vỡ `ModelsSettings` |
| Bỏ cache và ngân sách token cho đỡ phức tạp | Người dùng tự trả tiền API — không ước lượng trước và chặn trần là đốt tiền của họ |
| Dùng proxy cùng origin cho đơn giản | Cùng origin thì JS của dự án đọc được token của app; an toàn ở đây không phải chi tiết trang trí |
| Bỏ sinh tài liệu và bảng phản hồi | Màn Clean hứa 8 tệp tài liệu; spec yêu cầu phản hồi lưu thành dữ liệu (`feedback`, `proposals`) |

Ai đề xuất lại một trong bốn ý trên thì đọc lại cột "Vì sao" trước khi mở thảo luận.

## 5. Còn mở — 8 câu hỏi cần người quyết (từ `09-lo-trinh.md` §5)

| # | Câu hỏi | Chặn gì nếu chưa quyết |
|---|---|---|
| 1 | Repo riêng tư: hỗ trợ ngay GĐ1 bằng `GITHUB_TOKEN` hay để GĐ4? | Chặn phạm vi `ingest/github.py` ở GĐ1 |
| 2 | Ngưỡng 500 MB / 50.000 tệp / 10 MB mỗi tệp đã hợp lý? | Chặn `guard.py` và câu chữ của mã `source.too_big` |
| 3 | `An toàn: Cân bằng` có được tự đổi chỗ rủi ro không, hay luôn hỏi? | Chặn logic phân loại `safe`/`risky` trong `plan.py` |
| 4 | Có cần `--isolate docker` hay tiến trình con là đủ cho GĐ3? | Chặn thiết kế lớp thực thi trong `run/` |
| 5 | Giấy phép (MIT/Apache-2.0) + `CONTRIBUTING.md` + README gốc repo? | Chặn phát hành bản cộng đồng ở GĐ4 |
| 6 | Ngôn ngữ thứ hai sau Python: TypeScript/JavaScript hay Go? | Chặn thứ tự thêm parser ở GĐ4 |
| 7 | Tên package `tro-ly-du-an` / lệnh `trolyduan` có giữ không? | Chặn phát hành PyPI — đổi sau là vỡ link cài đặt |
| 8 | Giữ tuỳ chọn "Tài liệu: Song ngữ" ở màn đầu? | Giữ thì thêm nhánh sinh song ngữ ở `transform/docs.py`; bỏ thì xoá khỏi `copy.ts` |

## 6. Rủi ro còn lại

- Đổi tên sai làm hỏng code người dùng — **chấp nhận có kiểm soát**: AST theo scope, 2 lớp kiểm chứng luôn chạy, `/revert`, bản gốc chỉ đọc; không hứa "không bao giờ sai" trong UI.
- Chi phí LLM vượt dự kiến — **phải theo dõi**: ước lượng trước khi chạy, trần 2M token/phiên, cache theo hash.
- Kỳ vọng hỗ trợ mọi ngôn ngữ — **phải theo dõi**: bảng mức hỗ trợ công khai, chưa hỗ trợ thì nói rõ thay vì im lặng bỏ qua.
- Khác biệt Windows/POSIX (kill cây, quyền tệp, đường dẫn dài) — **phải theo dõi**: CI hai hệ điều hành dựng từ GĐ0.
- Prompt injection trong repo — **chấp nhận được**: không agent tự trị, LLM chỉ trả văn bản qua kiểm tra hình dạng.
- Tiến trình treo giữ cổng và tài nguyên — **phải theo dõi**: timeout cứng, nút Dừng luôn hiện, sweeper dọn mỗi lần khởi động.

Không rủi ro nào ở trên chặn phát hành GĐ1 (chỉ-AST, không gọi AI) — rủi ro 1 và 2 chỉ có trọng lượng từ GĐ2.

## 7. Bắt đầu từ đâu — 5 bước cho người mới

1. Đọc `Backend/README.md`, tệp này, rồi `01-kien-truc.md` §4 (vòng đời phiên) và `02-hop-dong-api.md` §3 (ma trận phủ màn hình).
   Hiểu hai enum trạng thái trước khi chạm code — mọi thứ khác treo trên đó.
2. Dựng GĐ0: `pyproject.toml`, `cli.py`, `app.py` + middleware token/Origin, migration SQLite 001, job giả 3 bước qua SSE.
   Nghiệm thu: giao diện thật mở ở 8686, Origin lạ bị 403, huỷ job dưới 1 giây.
3. Dựng CI (Windows + Linux) và stub `openapi.json` ngay trong GĐ0, trước mọi nghiệp vụ.
   Không có lưới này thì khác biệt nền tảng nổ muộn ở GĐ3, khi sửa đắt gấp nhiều lần.
4. Tuần đầu làm xong ingest + inventory Python (khung GĐ1): copy an toàn, manifest hash, quét `.gitignore`, nhận diện ngôn ngữ.
   Đây là đường đi mà mọi giai đoạn sau dùng lại, nên làm chắc trước khi làm nhanh.
5. Nối frontend song song từ khi có `/api/health` + job giả, theo đúng 17 việc ở `09-lo-trinh.md` §2 — bắt đầu từ việc #7 (ConfigBackend, chi phí ẩn lớn nhất của GĐ1), #14 (SSE thật) và #2 (dropdown tạo phiên).
   Không sửa gì trong `screens/` ngoài danh sách đó; phát sinh việc mới thì cập nhật ma trận phủ trước khi code.

Hết tuần 1, bạn phải tự trả lời được: phiên đi qua những trạng thái nào; số liệu màn Result đến từ đâu;
vì sao xem trước phải khác cổng; và token đi vào app bằng đường nào.

## 8. Cách xác nhận dự án vẫn đúng hướng (từ `09-lo-trinh.md` §4)

Năm tiêu chí máy kiểm được — đạt cả năm mới gọi là xong một phiên trên dự án Python thật:

- `origin/` không đổi một byte sau mọi phiên (so hash với `manifest.json`).
- Mọi số trên báo cáo là số đếm thật từ AST, sai số 0 trên fixture đã khoá hash.
- Kiểm chứng lớp 1+2 đạt 100%; fixture "sửa hỏng" cố ý không bao giờ ra `summary: passed`.
- Bấm Chạy thấy giao diện thật ở cổng proxy; bấm Dừng thì 0 tiến trình con còn sống, cổng đóng dưới 5 giây.
- Không log nào chứa khoá API; CI xanh Windows + Linux; toàn bộ test chạy offline, không cần mạng.
