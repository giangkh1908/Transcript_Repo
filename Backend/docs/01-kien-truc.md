# 01 — Kiến trúc

## 1. Bức tranh tổng thể

Một tiến trình Python duy nhất chạy trên máy người dùng, phục vụ cả API và giao diện đã build. Không có máy chủ của chúng ta ở đâu trong đường đi này.

```
                        MÁY CỦA NGƯỜI DÙNG
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Trình duyệt                                                             │
│  http://127.0.0.1:8686  ─────────────┐                                   │
│                                      │  HTTP + SSE (token cục bộ)        │
│  ┌───────────────────────────────────▼──────────────────────────────┐    │
│  │  trolyduan serve  (FastAPI + uvicorn)                            │    │
│  │                                                                  │    │
│  │  API  ──►  Job runner (asyncio, 1 hàng đợi/phiên)  ──►  SQLite   │    │
│  │            │                                                     │    │
│  │            ├── ingest     nhận dự án → thư mục làm việc          │    │
│  │            ├── analyzer   AST + LLM → báo cáo hiểu dự án         │    │
│  │            ├── transformer AST + LLM → sửa trong thư mục làm việc│    │
│  │            ├── verifier   kiểm cú pháp/liên kết/chạy được        │    │
│  │            ├── runner     cài + khởi động dự án → cổng xem trước │    │
│  │            └── llm        4 adapter giao thức, khoá của người dùng│    │
│  │                                                                  │    │
│  │  static: Frontend/dist (đã build)  ·  /api/*  ·  /preview proxy  │    │
│  └──────────────┬───────────────────────────────┬───────────────────┘    │
│                 │                               │                        │
│        ~/.tro-ly-du-an/                  Dự án của người dùng           │
│        ├── config.yaml                   (ĐỌC, không bao giờ ghi)        │
│        ├── credentials.yaml (0600)               │                       │
│        ├── sessions.db (SQLite)                  │ copy vào             │
│        ├── logs/                                 ▼                       │
│        └── work/<phiên>/                  work/<phiên>/  (bản làm việc)   │
│                                           └── dự án đã sửa + .zip        │
│                                                                          │
│        Cổng xem trước: dự án chạy ở cổng riêng (vd. 5173), proxy qua     │
│        /preview/<phiên>/ để iframe cùng origin với app.                  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Vì sao proxy cổng xem trước?** Nếu iframe trỏ thẳng `http://127.0.0.1:5173`, đó là origin khác — được, nhưng sẽ vướng cookie/`X-Frame-Options` của dự án và không kiểm soát được. Proxy qua `/preview/<phiên>/` giữ một origin duy nhất, cho phép tiêm một dải nhỏ thông báo "đây là bản chạy thử", và là chỗ để ngắt kết nối khi người dùng bấm Dừng.

---

## 2. Thành phần

| Thành phần | Trách nhiệm | Không được làm |
|---|---|---|
| `api/` | Router, xác thực token cục bộ, kiểm Origin, dịch lỗi thành câu người đọc được | Không chứa logic nghiệp vụ, không tự gọi LLM |
| `jobs/` | Vòng đời job: tạo, chạy nền, phát sự kiện SSE, huỷ, dọn dẹp | Không biết chi tiết về AST hay LLM |
| `ingest/` | Nhận thư mục / `.zip` / link GitHub → thư mục làm việc; kiểm tra an toàn | Không sửa bản gốc, không parse code |
| `analyze/` | Quét tệp, nhận diện ngôn ngữ, AST, tìm định danh/chú thích/hợp đồng cấu hình, sinh kế hoạch thay đổi | Không gọi LLM cho việc đếm được bằng AST |
| `transform/` | Áp dụng thay đổi qua AST, gọi LLM theo lô cho chú thích/tài liệu, ghi vào bản làm việc | Không ghi vào bản gốc, không dùng regex để sửa code |
| `verify/` | Kiểm cú pháp, kiểm liên kết, thử chạy test/khởi động | Không tự sửa lỗi phát hiện được (chỉ báo cáo) |
| `run/` | Quét lệnh cài/khởi động, chạy tiến trình con, cấp cổng, thu log, dừng | Không chạy khi chưa được bấm; không chạy ngoài thư mục dự án |
| `llm/` | Adapter 4 giao thức, routing theo cấu hình, thử lại, đếm chi phí, chống prompt injection | Không tự chọn model khi người dùng đã chọn |
| `store/` | SQLite (phiên, tệp, thay đổi, quyết định), file config, file credential | Không giữ secret trong config |
| `core/` | Cấu hình tiến trình, log, lỗi chuẩn hoá, tiện ích tệp/đường dẫn | Không chứa nghiệp vụ |

---

## 3. Cấu trúc thư mục code

```
Backend/
├── pyproject.toml            uv + ruff + pytest + entry point `trolyduan`
├── README.md                 (đã có) tổng quan + chỉ mục
├── docs/                     (đã có) kế hoạch này
├── src/tro_ly_du_an/
│   ├── __init__.py
│   ├── cli.py                `trolyduan serve | doctor | version`
│   ├── app.py                dựng FastAPI, gắn router, static, middleware
│   ├── core/
│   │   ├── settings.py       cổng, thư mục dữ liệu, giới hạn, biến môi trường
│   │   ├── errors.py         AppError → câu tiếng Việt + mã máy đọc được
│   │   ├── logging.py        log ra tệp + SSE
│   │   ├── paths.py          ép mọi đường dẫn nằm trong thư mục cho phép
│   │   └── security.py       token cục bộ, kiểm Origin, quyền tệp 0600
│   ├── api/
│   │   ├── sessions.py       tạo/get/huỷ phiên, analysis, ask, apply, changes, verify
│   │   ├── running.py        scan/start/stop/logs phiên chạy thử
│   │   ├── export.py         .zip, báo cáo
│   │   ├── config.py         config doc + credential + provider discovery
│   │   └── events.py         SSE dùng chung
│   ├── jobs/
│   │   ├── runner.py         hàng đợi trong tiến trình, một job/phiên
│   │   ├── events.py         kênh sự kiện, đệm cho client kết nối muộn
│   │   └── cancel.py         huỷ mềm → cứng, dọn tiến trình con
│   ├── ingest/
│   │   ├── folder.py  zipfile.py  github.py
│   │   └── guard.py          giới hạn dung lượng/số tệp, chặn path traversal, symlink
│   ├── analyze/
│   │   ├── inventory.py      danh sách tệp, tôn trọng .gitignore, nhận diện ngôn ngữ
│   │   ├── parsers/          libcst_py.py · treesitter.py · fallback.py
│   │   ├── identifiers.py    định danh không phải tiếng Anh + đếm tham chiếu
│   │   ├── comments.py       chú thích cần dịch (chỉ chú thích, không đụng code)
│   │   ├── contracts.py      env key dùng bởi docker-compose/CI/.env → nhóm rủi ro
│   │   ├── entrypoints.py    cách cài + cách chạy (dùng chung với run/)
│   │   └── plan.py           kế hoạch thay đổi + lý do một câu + phân loại an toàn/rủi ro
│   ├── transform/
│   │   ├── rename.py         đổi tên qua AST theo scope
│   │   ├── translate.py      dịch chú thích theo lô
│   │   ├── docs.py           sinh tài liệu tiếng Việt
│   │   └── writer.py         ghi atomic, giữ nguyên định dạng, sinh diff
│   ├── verify/
│   │   ├── syntax.py  references.py  smoke.py   (khởi động thử / chạy test)
│   ├── run/
│   │   ├── detect.py         lệnh cài/khởi động, yêu cầu môi trường, cổng
│   │   ├── ports.py          cấp cổng còn trống, tránh cổng của backend
│   │   ├── process.py        spawn, thu log, phát hiện "đã mở cổng", dừng cây tiến trình
│   │   ├── usage.py          hướng dẫn sử dụng sinh từ phân tích
│   │   └── proxy.py          proxy /preview/<phiên>/
│   ├── llm/
│   │   ├── router.py         chọn provider/model theo config
│   │   ├── protocols/        openai.py anthropic.py google.py ollama.py
│   │   ├── discover.py       "Lấy danh sách mô hình"
│   │   ├── budget.py         ngân sách token/chi phí cho mỗi phiên
│   │   └── sanitize.py       chống prompt injection từ nội dung repo
│   └── store/
│       ├── db.py             kết nối SQLite, migration
│       ├── sessions.py  files.py  changes.py  decisions.py  feedback.py
│       ├── config.py         đọc/ghi config.yaml (ghi SPARSE như frontend)
│       └── credentials.py    đọc/ghi credentials.yaml, chmod 0600
└── tests/
    ├── unit/                 parser, guard, ports, sanitize…
    ├── fixtures/             repo mẫu nhỏ (py, ts, hỗn hợp, có .env.example)
    └── e2e/                  một phiên đầy đủ chạy trên fixture
```

---

## 4. Vòng đời một phiên

Trạng thái phiên (backend) và màn hình tương ứng (frontend):

```
POST /api/sessions
        │
        ▼
   ingesting ──────► lỗi ──────────────► failed          → màn Failed
        │                                   ▲
        ▼                                   │
   analyzing ──────────────► lỗi ───────────┘
        │                                   │
        ▼                                   │
   analyzed  ───────────────────────────────┤        → màn Result
   (kế hoạch thay đổi = 0 → màn Clean)      │
        │  POST …/apply                     │
        ▼                                   │
   transforming ───────────► lỗi ───────────┘        → màn Working
        │
        ▼
   verifying
        │
        ▼
   done ────────────────────────────────►            → màn Done

   Bất kỳ lúc nào: POST …/cancel → cancelled (giữ lại phần đã làm)
   Chạy thử: trạng thái riêng, độc lập với vòng trên (màn Run)
```

Hai trục trạng thái **độc lập**: phiên (vòng trên) và phiên chạy thử (`stopped | scanning | starting | running | exited | crashed`). Người dùng có thể chạy thử một dự án ở trạng thái `analyzed` mà chưa cần biến đổi gì.

**Khôi phục sau khi tắt máy:** mọi job đang chạy lúc tiến trình chết được đánh dấu `interrupted` khi khởi động lại; thư mục làm việc vẫn còn nên người dùng có thể xem lại kết quả dở, nhưng không tự chạy tiếp — không có chuyện backend âm thầm sửa code sau khi người dùng tắt app.

---

## 5. Các quyết định và lý do

| Quyết định | Chọn | Vì sao | Đổi được không |
|---|---|---|---|
| Nơi chạy | Một tiến trình local phục vụ cả API + static | Người dùng chỉ chạy một lệnh, một cổng; không có CORS, không có triển khai | Khó — nhưng đổi chỉ ảnh hưởng `app.py` |
| Giao tiếp tiến trình | **SSE** (không WebSocket) | Một chiều, tự kết nối lại, đi qua proxy dễ, đủ cho tiến trình + log | Dễ |
| Chạy nền | **asyncio trong cùng tiến trình** | Một người dùng, một máy; việc nặng đẩy sang process pool | Dễ (đổi sang worker riêng nếu cần) |
| Lưu trữ | **SQLite WAL** | Không cài gì, một tệp, đủ cho hàng nghìn phiên | Dễ (lớp `store/` đã che) |
| Sửa Python | **LibCST** | Giữ nguyên định dạng/comment; sửa được cả định danh và chú thích ở mức AST | Không nên đổi |
| Ngôn ngữ khác | **tree-sitter** | Một API, nhiều ngôn ngữ, không phải tự viết parser | Dễ — thêm grammar = thêm 1 dòng |
| Đoán lệnh chạy | **Bằng chứng từ tệp, không đoán mò** | `package.json` scripts, `requirements.txt`, `pyproject.toml`, `Makefile`, `README` — mỗi kết luận kèm tệp đã đọc | — |
| Cách ly khi chạy dự án | Mặc định: tiến trình con trong thư mục làm việc. Tuỳ chọn `--isolate docker` ở giai đoạn sau | Máy của chính người dùng; Docker làm tăng ma sát cài đặt | Dễ — `run/` tách sẵn một lớp thực thi |
| Khoá AI | Người dùng tự dán (BYO) | Không tốn chi phí của chủ dự án; người dùng kiểm soát chi tiêu | Không đổi |
| Chống lộ khoá | Credential store riêng, ghi một chiều, không bao giờ vào config/log | Đúng mô hình frontend đã dựng (`apiKeyEnv` chỉ là tên tham chiếu) | Không đổi |

---

## 6. Ranh giới với frontend

- Frontend là **client duy nhất**; backend không phục vụ client nào khác, không có API công khai cho bên thứ ba.
- Backend giữ **kiểu dữ liệu** khớp `Frontend/src/types.ts`; đổi kiểu thì đổi cả hai, có test hợp đồng.
- Backend **không** trả chuỗi hiển thị cuối cùng cho người dùng, trừ ba ngoại lệ có chủ đích: (1) lý do một câu cho mỗi chỗ rủi ro, (2) hướng dẫn sử dụng ở màn Chạy thử, (3) nội dung tài liệu tiếng Việt do hệ thống viết. Ba thứ này là *nội dung sinh ra*, không phải nhãn giao diện.
- Xác thực: một token sinh lúc khởi động, ghi vào `~/.tro-ly-du-an/token`, frontend đọc qua endpoint `/api/bootstrap` (chỉ chấp nhận request từ `localhost`) hoặc nhúng sẵn vào `index.html` khi phục vụ static. Chi tiết ở `docs/08` §Bảo mật.

---

## 7. Việc phải làm (giai đoạn 0)

- [ ] `pyproject.toml`: package `tro-ly-du-an`, entry point `trolyduan`, Python ≥3.12, ruff + pytest cấu hình sẵn.
- [ ] `cli.py` với `serve` / `version` / `doctor` (doctor kiểm: Python, quyền ghi thư mục dữ liệu, git có trong PATH, cổng trống, frontend `dist` có chưa).
- [ ] `app.py`: FastAPI + middleware token/Origin + mount `Frontend/dist` + `/api/health`.
- [ ] `core/settings.py` + `core/paths.py` (ép đường dẫn trong thư mục cho phép) + `core/errors.py` (mọi lỗi ra tiếng Việt, có mã máy đọc được).
- [ ] `store/db.py` + migration đầu tiên (bảng rỗng, chạy được).
- [ ] `jobs/runner.py`: tạo job giả 3 bước, phát SSE, huỷ được — để frontend nối thử trước khi có phân tích thật.
- [ ] Log ra `~/.tro-ly-du-an/logs/app.log`, xoay vòng theo ngày.

**Tiêu chí nghiệm thu giai đoạn 0:** `uv run trolyduan serve` mở được giao diện thật ở `http://127.0.0.1:8686`; `GET /api/health` trả `{"ok": true, "version": "..."}`; gọi API từ Origin lạ bị từ chối 403; job giả chạy 3 bước và hiện tiến trình trên giao diện qua SSE; bấm Huỷ thì job dừng trong dưới 1 giây.
