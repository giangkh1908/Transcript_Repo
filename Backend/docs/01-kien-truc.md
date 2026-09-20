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
│  │  static: Frontend/dist (đã build)  ·  /api/*  ·  cổng xem trước 8687 │    │
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
│        Cổng xem trước: dự án chạy ở cổng riêng (vd. 5173); proxy phục vụ   │
│        nó ở MỘT CỔNG KHÁC (8687) để iframe khác origin với app.          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Vì sao proxy cổng xem trước, và vì sao nó phải ở cổng khác?** Trỏ iframe thẳng vào cổng dự án (`127.0.0.1:5173`) là phương án đơn giản nhất và đúng về cách ly — nhưng một số dự án chặn nhúng bằng `X-Frame-Options`/`frame-ancestors` (Django mặc định `DENY`), nên vẫn cần một lớp proxy để gỡ header đó và thêm dải thông báo "đây là bản chạy thử".

Lớp proxy đó **phải chạy trên cổng riêng** (8687), không phải trên cổng app: cùng origin thì JS của dự án người dùng chạy trong origin của app, đọc được `localStorage` và token trong DOM rồi gọi toàn bộ API — kể cả credential store. Khác cổng thì Same-Origin Policy của trình duyệt tự lo việc cách ly, và dự án vẫn dùng được `localStorage`/cookie của chính nó. Vì phục vụ ở gốc cổng riêng, **không cần viết lại `<base>`** cho SPA — đường dẫn tương đối vẫn đúng.

Đánh đổi đã biết: `GET /api/health` không còn là chỗ duy nhất cần kiểm khi có nhiều phiên chạy song song — mỗi phiên chạy cần một cổng proxy riêng (8687, 8688, …), do `run/ports.py` cấp cùng lúc với cổng dự án.

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
│   │   ├── events.py         kênh sự kiện: id tăng dần, đệm 500, phát resync
│   │   ├── sweeper.py        dọn lúc khởi động: job treo, .tmp, tiến trình mồ côi, cổng, DB
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
│   │   └── proxy.py          proxy cổng 8687/n → cổng dự án (gỡ X-Frame-Options)
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

**Enum trạng thái phiên — nguồn sự thật duy nhất, mọi tài liệu khác phải dùng đúng bộ này:**

```
queued · ingesting · analyzing · analyzed · transforming · verifying · done · failed · cancelled · interrupted
```

Bảng map sang màn hình giao diện (để frontend rẽ nhánh một chỗ duy nhất):

| Trạng thái phiên | Màn hình |
|---|---|
| `queued`, `ingesting`, `analyzing` | Reading |
| `analyzed` (có việc để làm) | Result |
| `analyzed` (không có việc nào) | Clean |
| `transforming`, `verifying` | Working |
| `done` | Done |
| `failed` | Failed |
| `cancelled`, `interrupted` | mở lại phiên, tùy phần đã làm mà về Reading/Result/Done — kèm một câu giải thích |

**Enum trạng thái chạy thử:** `stopped · installing · preparing · starting · running · exited · crashed` (chi tiết `docs/06` §6).

**Hai trục trạng thái độc lập.** Người dùng có thể chạy thử một dự án ở trạng thái `analyzed` mà chưa cần biến đổi gì.

**Khôi phục sau khi tắt máy — có dọn dẹp, không chỉ đánh dấu.** Lúc khởi động, backend chạy một lượt quét (`jobs/sweeper.py`) theo thứ tự:

1. Mọi phiên đang ở trạng thái chạy (`queued`…`verifying`) ⇒ `interrupted`, kèm câu *"Phiên này bị dừng giữa chừng vì ứng dụng đã tắt. Bạn có thể xem lại phần đã làm."* Không tự chạy tiếp.
2. Xoá mọi tệp `*.tmp` còn sót trong các thư mục `work/` (ghi atomic bị cắt ngang để lại rác).
3. Đọc `run_state`: với mỗi phiên ghi là đang chạy, **kiểm tiến trình còn sống không** (theo PID *và* thời điểm bắt đầu, để không giết nhầm tiến trình khác đã được cấp lại PID đó) — còn sống thì kill cây, rồi đóng trạng thái về `exited`.
4. Giải phóng sổ đăng ký cổng; kiểm lại hai cổng của app (8686, 8687) có bị giữ bởi tiến trình cũ không.
5. Kiểm `PRAGMA integrity_check` trên SQLite; hỏng ⇒ đổi tên tệp DB thành `sessions.db.corrupt-<ngày>`, tạo DB mới, và báo cho người dùng biết lịch sử phiên đã được đặt sang một bên chứ không mất.

Sweeper chạy cả khi khởi động bình thường, không chỉ sau crash — chi phí gần bằng 0 và nó là thứ duy nhất bảo đảm không còn tiến trình treo giữ cổng.

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
- **Xác thực token — không bao giờ trả token qua HTTP.** Token sinh một lần khi cài, lưu ở `~/.tro-ly-du-an/token` (0600), **ổn định giữa các lần chạy** (token đổi mỗi lần `serve` sẽ làm giao diện đang mở bị 401 hàng loạt). Khi backend phục vụ static, nó **nhúng token vào `index.html`** lúc trả trang (`<meta name="trolyduan-token">`) — trang đó chỉ đến từ chính backend nên an toàn, không cần vòng gọi API nào.
  - `GET /api/bootstrap` **chỉ trả capabilities**, tuyệt đối không trả token. Nếu nó trả token thì mọi thứ khác vô nghĩa: bất kỳ tiến trình nào trên máy (hoặc trang web lọt qua kiểm Origin) đều lấy được token rồi gọi toàn bộ API.
  - **Chế độ `--dev` (trang do Vite ở 5173 phục vụ) — token không bao giờ vào trình duyệt.** Nhúng meta không làm được, nên dùng **Vite dev proxy** trong `vite.config.ts`:

    ```ts
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8686',
          headers: { 'X-Local-Token': process.env.TROLYDUAN_TOKEN ?? '' },
        },
      },
    }
    ```

    Trình duyệt chỉ nói chuyện với `localhost:5173` (same-origin), **Node của Vite** mới thêm header token; token nằm trong `Frontend/.env.development.local` (đã bị `.gitignore` chặn bởi `*.local`) hoặc biến môi trường khi chạy `pnpm dev`. Backend **vẫn bắt buộc token** trong dev — chỉ nới thêm một thứ duy nhất: chấp nhận `Origin: http://localhost:5173`, và **chỉ khi** cờ `--dev` được bật (in cảnh báo ra terminal lúc khởi động). SSE đi qua proxy bình thường (`ws` để `false`; SSE là HTTP một chiều).
  - Phía frontend chỉ cần một hàm nhỏ: `token = document.querySelector('meta[name="trolyduan-token"]')?.content` — có thì gửi kèm `X-Local-Token`, không có (chế độ dev) thì thôi, proxy lo.

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
