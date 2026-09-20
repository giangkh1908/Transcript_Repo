# 08 — Lưu trữ, vận hành, bảo mật, kiểm thử

## 1. SQLite

Một tệp `~/.tro-ly-du-an/sessions.db`, `PRAGMA journal_mode=WAL`, `foreign_keys=ON`. Migration bằng `PRAGMA user_version` + thư mục `store/migrations/00X_*.sql` (không cần Alembic cho quy mô này).

```sql
sessions(id TEXT PK, name TEXT, source_kind TEXT, source_value TEXT,
         state TEXT, options_json TEXT, created_at TEXT, updated_at TEXT,
         error_code TEXT, error_message TEXT, error_technical TEXT, work_dir TEXT)

files(id INTEGER PK, session_id TEXT FK, path TEXT, language TEXT, encoding TEXT,
      lines INTEGER, sha256 TEXT, generated INTEGER, skipped INTEGER, skip_reason TEXT)

changes(id INTEGER PK, session_id TEXT FK, kind TEXT, path TEXT, start_line INTEGER,
        end_line INTEGER, old_text TEXT, new_text TEXT, before_text TEXT,
        risk TEXT, why TEXT, evidence_json TEXT, applied INTEGER)

decisions(session_id TEXT FK, item_key TEXT, choice TEXT, decided_at TEXT,
          PK(session_id, item_key))

feedback(id INTEGER PK, session_id TEXT FK, change_id INTEGER, kind TEXT,
         note TEXT, created_at TEXT)          -- nút "Báo cáo vấn đề" của spec §9

run_logs(id INTEGER PK, session_id TEXT FK, stream TEXT, line TEXT, at TEXT)
run_state(session_id TEXT PK FK, state TEXT, port INTEGER, pid INTEGER,
          direct_address TEXT, started_at TEXT, stopped_at TEXT)

llm_cache(hash TEXT PK, model TEXT, prompt_version TEXT, response_json TEXT,
          prompt_tokens INTEGER, completion_tokens INTEGER, created_at TEXT)
llm_usage(session_id TEXT FK, prompt_tokens INTEGER, completion_tokens INTEGER, calls INTEGER)

proposals(id INTEGER PK, session_id TEXT FK, fingerprint TEXT UNIQUE, title TEXT,
          body TEXT, status TEXT, created_at TEXT)   -- phản hồi người dùng thành dữ liệu (spec §9)
```

Ghi chú thiết kế:

- `changes.before_text` là nội dung tệp **trước khi sửa**, lưu để **sinh diff nhanh**. Nó **không** phải cơ chế hoàn tác: `/revert` đọc từ `.backup/`, nơi **mọi** tệp bị sửa đều có bản sao, không phân biệt kích thước (`docs/05` §1). Tệp lớn (> 1 MB) vì thế vẫn hoàn tác được; chỉ cột `before_text` là bỏ trống cho chúng.
- `files.sha256` là bản sao của `manifest.json` trong thư mục làm việc, để truy vấn nhanh.
- `run_logs` chỉ giữ 5.000 dòng/phiên, dòng cũ bị xoá khi ghi thêm.
- Không có bảng người dùng, không có bảng tổ chức, không có bảng thanh toán.

## 2. Job runner

- **Một job cho mỗi phiên** tại một thời điểm. Gọi `apply` khi đang chạy ⇒ `409` + `jobId` hiện tại.
- **Đồng thời toàn cục:** tối đa 2 phiên chạy nền cùng lúc (một người dùng, một máy); phiên thứ ba xếp hàng và SSE phát `state: queued` kèm vị trí.
- **Huỷ mềm trước, cứng sau:** đặt cờ, job kiểm ở các điểm dừng (mỗi tệp, mỗi lô LLM); quá 5 giây không dừng thì `task.cancel()`. Huỷ xong phải dọn tiến trình con và tệp `.tmp`.
- **Không có job sống sót qua lần khởi động app.** Khi khởi động, `jobs/sweeper.py` chạy một lượt dọn dẹp (chi tiết ở `docs/01` §4): đánh dấu `interrupted`, xoá `.tmp` còn sót, kill tiến trình con mồ côi (kiểm theo PID **và** thời điểm bắt đầu), giải phóng sổ cổng, kiểm `integrity_check` của SQLite. Không tự chạy tiếp job cũ — người dùng phải bấm.
- Việc CPU nặng (parse AST) chạy trong `ProcessPoolExecutor`; việc I/O (LLM, git) chạy async trong tiến trình chính.
- **Kênh SSE: một chính sách duy nhất** — vòng đệm **500 sự kiện**/phiên, mỗi sự kiện có `id:` tăng đơn điệu; `Last-Event-ID` cũ hơn mức đệm ⇒ phát `resync` để client gọi lại `/api/sessions/{id}` (không cố phát lại); keep-alive 15 giây; đóng khi job kết thúc. Log dài **không** đi qua kênh này mà qua `GET /run/logs?tail=5000`. Con số 5.000 dòng ở §`run_logs` là giới hạn lưu trong DB, không phải kích thước đệm sự kiện — đừng trộn hai con số.

## 3. Log và đo lường

| Ghi gì | Ở đâu | Ghi bao lâu |
|---|---|---|
| Vòng đời job (bắt đầu, kết thúc, huỷ, lỗi) | `logs/app.log`, xoay theo ngày, giữ 14 ngày | — |
| Mỗi lời gọi LLM: model, token vào/ra, thời gian, cache hit/miss | `logs/llm.log` + `llm_usage` | 14 ngày / vĩnh viễn trong DB |
| Ghi tệp: đường dẫn, số dòng đổi | `logs/app.log` | — |
| Tiến trình con: dòng lệnh, pid, mã thoát | `logs/run.log` + `run_logs` | — |

**Không bao giờ ghi:** nội dung tệp của người dùng, giá trị khoá API, nội dung prompt/response đầy đủ (chỉ độ dài và hash). `redact()` chạy trên mọi bản ghi.

**Không gửi số liệu đi đâu cả.** Không telemetry, không analytics, không gọi về máy chủ nào của chủ dự án. Với một công cụ miễn phí chạy trên máy người dùng, đây là điều phải nói rõ trong README. Số liệu duy nhất là ở `/api/doctor` (cho người dùng tự xem) và trong log tại máy họ.

## 4. Bảo mật

Mô hình mối đe doạ của một **công cụ local một người dùng**:

| Mối đe doạ | Cách chặn |
|---|---|
| Trang web lạ trong trình duyệt gọi vào `localhost:8686` (DNS rebinding / CSRF) | Bắt buộc `X-Local-Token`; kiểm `Origin`/`Host` khớp chính xác `127.0.0.1:8686`; `Sec-Fetch-Site: cross-site` ⇒ từ chối; **chỉ bind 127.0.0.1**, không bao giờ 0.0.0.0 (trừ khi người dùng tự truyền `--host`, kèm cảnh báo in ra terminal). Token **không bao giờ trả qua HTTP**: nhúng vào `index.html` lúc backend phục vụ static, lưu ở `~/.tro-ly-du-an/token` (0600), **ổn định giữa các lần chạy** — token đổi mỗi lần `serve` sẽ làm giao diện đang mở 401 hàng loạt. Chế độ `--dev` **không nới lỏng token**, chỉ chấp nhận thêm `Origin: http://localhost:5173`, và token đi qua **Vite dev proxy** chứ không vào trình duyệt (chi tiết `docs/01` §6) |
| Đọc/ghi ra ngoài thư mục cho phép | `core/paths.py`: mọi đường dẫn đi qua `resolve()` rồi `is_relative_to(work_dir)`; áp dụng cho cả đường dẫn đến từ API và từ nội dung zip |
| Tiêm lệnh shell | Spawn bằng `argv`, không `shell=True`; tham số sinh tự động (cổng) là số nguyên đã kiểm |
| Zip slip / symlink / zip bomb | `ingest/guard.py` (`docs/03` §3) |
| Rò khoá API | Credential store 0600 + `redact()` + không đưa vào prompt/env của tiến trình con |
| Prompt injection từ repo | `docs/07` §4.6 — backend không có agent tự trị; LLM chỉ trả văn bản đã qua kiểm tra |
| Chạy code người dùng ngoài ý muốn | `confirm: true` + hiện lệnh trước + không chạy lúc khởi động (`docs/06` §10) |
| Đọc tệp bí mật của người dùng ngoài dự án | Chỉ đọc trong `work/`; từ chối nguồn là ổ hệ thống/thư mục nhà |
| Tệp cấu hình bị người khác đọc | `credentials.yaml` 0600 (POSIX) / ACL hạn chế (Windows); kiểm và sửa quyền mỗi lần ghi |

**Từ chối phục vụ tĩnh ngoài `Frontend/dist`:** route tĩnh chỉ phục vụ trong thư mục đã cấu hình, không có tính năng "mở tệp bất kỳ".

## 5. Đóng gói và phát hành

| Việc | Cách làm |
|---|---|
| Cài cho người dùng | `uv tool install tro-ly-du-an` hoặc `pipx install tro-ly-du-an` ⇒ có lệnh `trolyduan` |
| Frontend đi kèm | CI build `Frontend/dist` → copy vào `src/tro_ly_du_an/static/` → khai báo `package-data` trong `pyproject.toml`. Người dùng **không** cần Node để dùng app (chỉ cần Node nếu dự án của họ cần) |
| Phiên bản | `pyproject.toml` là nguồn duy nhất; `trolyduan version` in ra; `/api/health` trả cùng số |
| Cập nhật | Thủ công, có chủ đích. `trolyduan doctor` báo nếu có bản mới hơn trên PyPI, **không** tự cập nhật |
| Nền tảng | Windows 10+, macOS 12+, Linux; Python 3.12+; `git` chỉ cần cho nguồn GitHub |
| Gỡ cài | `uv tool uninstall` + `trolyduan clean --all` (xoá thư mục dữ liệu nếu người dùng muốn) |

Chưa có Docker image ở giai đoạn này. Nếu cộng đồng cần, thêm `Dockerfile` ở giai đoạn 4 — nhưng Docker phá vỡ mô hình "chạy thử dự án trên máy người dùng", nên chỉ nên là lựa chọn phụ cho ai muốn cô lập.

## 6. Chiến lược kiểm thử

| Loại | Nội dung | Chạy khi nào |
|---|---|---|
| Unit | `guard` (12 tấn công), `ports`, `redact`, `sanitize`, parser LibCST, `plan` phân loại rủi ro, prompt schema | mọi lần commit |
| Hợp đồng | Sinh `openapi.json` → so với `Frontend/src/types.ts`; khẳng định mọi trường frontend đọc đều có trong schema | mọi lần commit |
| Tích hợp | Job runner với LLM giả (`MockTransport`), SSE có `Last-Event-ID`, huỷ giữa lô, revert | mọi lần commit |
| End-to-end | Fixture repo thật (Flask 40 dòng, Vite mini, Django mini, repo có prompt injection, repo "sửa hỏng") — chạy hết luồng tới màn Done | trước mỗi lần phát hành |
| Hiệu năng | Fixture 500 tệp: phân tích AST < 60 giây, RAM < 1 GB | trước mỗi lần phát hành |
| Không có mạng | Toàn bộ test phải chạy offline (LLM và git đều được giả lập) | mọi lần commit |

CI: GitHub Actions, ma trận `ubuntu-latest` + `windows-latest`, các bước: `ruff check` → `pytest` → build frontend (`pnpm build`) → build wheel → cài wheel trong môi trường sạch và chạy `trolyduan doctor`. **Dựng CI tối thiểu (ruff + pytest + doctor) ngay ở giai đoạn 0** — để tới giai đoạn 4 mới dựng nghĩa là bốn giai đoạn code không có lưới an toàn, và các khác biệt Windows/POSIX (kill tiến trình, quyền tệp, đường dẫn dài) sẽ nổ muộn.

**Ma trận tấn công bắt buộc có test** (không chỉ liệt kê trong tài liệu): 12 ca ở `ingest/guard.py` (`docs/03` §3) gồm cả UNC, tên dành riêng Windows, tên có dấu chấm/khoảng trắng cuối, junction, zip bomb theo tỉ lệ nén; 5 ca trình duyệt ở `core/security.py` (`docs/08` §4); 2 ca rò rỉ (`redact` theo danh sách + theo mẫu); 1 ca prompt injection ghi ra ngoài kế hoạch.

Mục tiêu độ phủ: ≥ 80% cho `ingest/`, `analyze/`, `transform/`, `run/`; adapter LLM kiểm bằng HTTP giả, không cần phủ cao.

## 7. Vòng đời dữ liệu trên máy người dùng

- Mỗi phiên chiếm một thư mục `work/<id>/` gồm 2 bản dự án (origin + work) **cộng bản sao lưu các tệp đã sửa** (`.backup/`) — với dự án lớn, đây là điểm tốn đĩa nhất. Trước khi nhận dự án, backend **kiểm dung lượng trống** (cần khoảng 3× dung lượng nguồn) và từ chối kèm câu rõ ràng nếu thiếu — hết đĩa giữa chừng có thể làm hỏng cả SQLite lẫn bản làm việc. `/api/doctor` hiện dung lượng đã dùng và số phiên còn giữ; `trolyduan clean` xoá thư mục cũ, **mặc định 7 ngày** và luôn hỏi trước khi xoá (không tự xoá).
- Nút "Xoá phiên này" ở sidebar (frontend chưa có — ghi vào danh sách việc frontend) ⇒ xoá thư mục + hàng trong DB.
- Không có sao lưu tự động: bản gốc của người dùng vẫn nguyên ở chỗ cũ, đó chính là sao lưu.

## 8. Chính sách lỗi

Mọi lỗi đi qua `AppError(code, message, technical, retryable)`:

- `message` là câu tiếng Việt cho người dùng — không có từ tiếng Anh, không có mã lỗi, không có stack trace (`docs/02` §1 có bảng đầy đủ).
- `technical` là chi tiết cho mục thu gọn `Xem chi tiết kỹ thuật`.
- Traceback đầy đủ chỉ vào log.
- Không bao giờ trả `200` kèm thân báo lỗi — lỗi là lỗi.
- Lỗi trong một phiên **không** làm sập tiến trình: job bắt mọi ngoại lệ, ghi vào phiên, phát SSE `error`, và để app tiếp tục phục vụ phiên khác.

## 9. Việc phải làm

- [ ] `store/db.py` + migration 001 với đúng lược đồ ở §1; test tạo DB từ số 0 và nâng cấp từ bản cũ. **Quy ước migration:** `user_version` tăng một đơn vị mỗi tệp `00X_*.sql`, chạy trong một transaction, **sao lưu `sessions.db` trước khi nâng cấp** (giữ 3 bản gần nhất); không có migration lùi — DB mới hơn phiên bản app ⇒ từ chối chạy và nói rõ, thay vì đọc sai lược đồ. Test: DB hỏng ⇒ sweeper đổi tên thành `sessions.db.corrupt-<ngày>` và app vẫn khởi động được.
- [ ] `jobs/runner.py`: hàng đợi 2 phiên (`queued`), huỷ mềm/cứng, khoá tệp theo phiên; test huỷ giữa lô và test hai job cùng phiên bị chặn.
- [ ] `jobs/sweeper.py`: 5 bước ở `docs/01` §4; test "khởi động lại sau khi bị kill cứng ⇒ không còn tiến trình con, không còn `.tmp`, cổng được giải phóng".
- [ ] `api/events.py`: `id:` tăng đơn điệu + vòng đệm 500 sự kiện + `resync` khi `Last-Event-ID` quá cũ + keep-alive; test client kết nối lại sau khi hết đệm.
- [ ] `core/logging.py` + xoay vòng log + `redact()` hai tầng (danh sách + mẫu) + rule "không ghi nội dung tệp/khoá"; test rò rỉ ở `docs/07` §3.
- [ ] `core/security.py`: token **ổn định** ở `~/.tro-ly-du-an/token` (0600), nhúng vào `index.html`, kiểm Origin/Host/Sec-Fetch-Site; test 5 kịch bản tấn công từ trình duyệt + test "`/api/bootstrap` không trả token".
- [ ] `cli.py doctor`: Python, git, node, quyền ghi, **dung lượng trống**, cổng 8686/8687 trống, frontend `dist` có và **đúng phiên bản** (`/api/health` trả `frontendBuilt: true|false` để không phục vụ một bản `dist` cũ mà không ai biết), bản mới trên PyPI.
- [ ] CI 2 hệ điều hành + build wheel có kèm static; test cài trong môi trường sạch. **Dựng CI ngay giai đoạn 0.**
- [ ] Bộ fixture repo (5 loại) + test end-to-end; bộ test hiệu năng 500 tệp; ma trận tấn công ở §6.
- [ ] Test hợp đồng OpenAPI ↔ `Frontend/src/types.ts` (**sinh stub OpenAPI từ giai đoạn 0** để việc nối frontend ở giai đoạn 1 không phải chờ).

**Tiêu chí nghiệm thu:** CI xanh trên Windows và Linux; 12 test tấn công + 5 kịch bản trình duyệt đều bị chặn; test hợp đồng bắt được lỗi nếu backend đổi tên một trường mà frontend đang đọc; `pipx install` rồi `trolyduan serve` mở được giao diện mà máy đó **không** có Node; tắt app giữa lúc đang chạy thử dự án thì không còn tiến trình con nào.
