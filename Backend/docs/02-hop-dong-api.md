# 02 — Hợp đồng API

Nguyên tắc: **backend trả dữ liệu và ngữ nghĩa, frontend trả câu chữ.** Ngoại lệ duy nhất là nội dung do hệ thống sinh ra (lý do một câu cho mỗi chỗ rủi ro, hướng dẫn sử dụng, tài liệu tiếng Việt) — ba thứ đó là *sản phẩm*, không phải nhãn giao diện.

## 1. Quy ước chung

| Mục | Quy ước |
|---|---|
| Base | `http://127.0.0.1:8686/api` (cùng origin với giao diện) |
| Định dạng | JSON **`camelCase`** — khớp thẳng `Frontend/src/types.ts`, không có lớp đổi tên nào. Kiểu trong Python vẫn `snake_case`, chỉ lớp serialize đổi tên khi ra JSON |
| Xác thực | Header `X-Local-Token: <token>` bắt buộc cho mọi `/api/*` trừ `/api/health` và `/api/bootstrap` |
| Chống CSRF | Chỉ chấp nhận `Origin` là chính `127.0.0.1:8686`/`localhost:8686`; thiếu header `Origin` (curl) thì vẫn phải có token |
| Việc dài | Trả `202` + `jobId`, theo dõi qua SSE |
| Huỷ | `POST …/cancel` — idempotent, gọi lại vẫn `200` |
| Lỗi | `{"error": {"code": "...", "message": "<câu tiếng Việt cho người dùng>", "technical": "<chi tiết cho mục thu gọn>", "retryable": true}}` |
| Phân trang | `?limit=&cursor=` cho danh sách thay đổi/lịch sử |

Bảng mã lỗi — mỗi mã ánh xạ thẳng vào màn **Failed** của giao diện (`message` là câu hiện to, `technical` là dòng trong `Xem chi tiết kỹ thuật`):

| `code` | `message` (ví dụ) | `technical` |
|---|---|---|
| `source.private` | "Link bạn dán đang ở chế độ riêng tư (private), nên mình không có quyền xem nội dung bên trong." | `HTTP 403 · repository is private · <url>` |
| `source.not_found` | "Mình không tìm thấy dự án ở link này." | `HTTP 404 · <url>` |
| `source.no_network` | "Máy bạn đang không kết nối được ra ngoài, nên mình chưa tải được dự án về." | `<lỗi mạng gốc>` |
| `source.too_big` | "Dự án này lớn hơn mức mình xử lý được (giới hạn 500 MB / 50.000 tệp)." | số đo thật |
| `source.unsafe_archive` | "Tệp .zip này chứa đường dẫn không an toàn nên mình dừng lại để tránh ghi ra ngoài thư mục dự án." | đường dẫn vi phạm |
| `source.empty` | "Trong thư mục này không có tệp nào mình đọc được." | số tệp đã bỏ qua |
| `perm.unreadable` / `perm.unwritable` | "Mình không có quyền đọc/ghi trong thư mục này." | đường dẫn + mã lỗi hệ điều hành |
| `llm.no_key` | "Chưa có khoá API cho mô hình bạn chọn, nên mình chưa gọi AI được." | `provider=<id> apiKeyEnv=<TÊN>` (không bao giờ có giá trị khoá) |
| `llm.auth` | "Khoá API bị nhà cung cấp từ chối." | `HTTP 401 · <provider>` |
| `llm.rate_limit` | "Nhà cung cấp đang giới hạn tốc độ, mình thử lại sau ít giây." | `HTTP 429 · retry-after=<n>` |
| `internal` | "Có lỗi ngoài dự tính. Dự án của bạn không bị ảnh hưởng gì." | traceback (chỉ trong log + mục thu gọn) |

---

## 2. Endpoint

### 2.1 Khởi động

| Method | Đường dẫn | Việc |
|---|---|---|
| `GET` | `/api/health` | `{"ok": true, "version": "0.1.0", "uptimeSeconds": 12}` |
| `GET` | `/api/bootstrap` | Frontend lấy cấu hình khởi động: `{"token": "...", "defaults": {...}, "capabilities": {"treeSitter": ["js","ts","go"], "docker": false}}` |
| `GET` | `/api/doctor` | Kiểm môi trường: git, quyền ghi, cổng trống, frontend dist, có `node`/`python` để chạy dự án — dùng cho lần chạy đầu |

### 2.2 Danh sách dự án (sidebar)

`GET /api/projects?limit=20`

```json
{ "items": [
  { "id": "ses_8f3a", "name": "website-ban-hang",
    "state": "needs_review", "riskyCount": 12, "changedCount": 217,
    "source": {"kind": "github", "value": "https://github.com/congty/website-ban-hang"},
    "updatedAt": "2026-03-04T09:12:00+07:00" }
] }
```

`state` là **enum**, không phải câu chữ: `reading` · `needs_review` · `clean` · `done` · `failed` · `interrupted`.
Frontend dựng nhãn từ enum + `riskyCount` → `needs_review` + 12 ⇒ *"Cần bạn xem 12 chỗ"*.
⚠️ **Việc frontend phải sửa:** `Project.statusLabel/tone` hiện là câu chữ trong `demo.ts`; chuyển sang map `state → {nhãn, màu}` trong `copy.ts`.

### 2.3 Tạo phiên (màn Landing)

`POST /api/sessions`

```json
{
  "source": { "kind": "github", "value": "https://github.com/congty/website-ban-hang" },
  "options": {
    "docsLanguage": "vi-VN",
    "commentLanguage": "vi-VN",
    "safety": "highest",
    "path": null
  }
}
```

`source.kind`: `github` | `folder` | `zip`. `folder`/`zip` nhận đường dẫn trên máy người dùng (`value` là đường dẫn tuyệt đối, backend kiểm quyền đọc).
`options`: ba lựa chọn người dùng đã chọn ở màn hình đầu.

⚠️ **Việc frontend phải sửa:** ba dropdown ở `Landing.tsx` (`Tài liệu`, `Chú thích`, `An toàn`) hiện là `useState` **không đi đâu cả**. Chúng phải được gửi kèm khi tạo phiên. `An toàn: Cao nhất/Cân bằng` ⇒ `safety: highest|balanced` (quyết định ngưỡng tự làm vs hỏi).

Trả về `202`:

```json
{ "id": "ses_8f3a", "state": "ingesting", "createdAt": "..." }
```

### 2.4 Trạng thái phiên

`GET /api/sessions/{id}` → `{ "id", "state", "job": {...}, "counts": {...}, "error": null }`

### 2.5 Sự kiện tiến trình (SSE)

`GET /api/sessions/{id}/events` — `text/event-stream`. Kết nối muộn vẫn nhận đủ: kênh giữ 500 sự kiện gần nhất và gửi lại từ `Last-Event-ID`.

```
event: state      data: {"state":"analyzing"}
event: step       data: {"phase":"language","index":1,"done":true}
event: progress   data: {"unit":"files","done":342,"total":500,"currentFile":"src/services/user_service.py"}
event: progress   data: {"unit":"symbols","done":1923,"total":2431}
event: log        data: {"level":"info","text":"Đã đọc xong requirements.txt"}
event: artifact   data: {"kind":"analysis","ready":true}
event: error      data: {"code":"source.private","message":"..."}
```

Từng màn hình dùng gì:

| Màn hình | Sự kiện | Ghi chú |
|---|---|---|
| Reading | `step` (5 bước) + `progress.unit=files` | 5 bước khớp đúng `S.reading.steps`: đọc tệp → nhận diện ngôn ngữ → tìm tên biến → chú thích/tài liệu → **xem cách cài đặt và khởi động** |
| Working | `progress.unit=files` (biến đổi) + `progress.unit=symbols` + `currentFile` | Frontend hiện đọc `demoNumbers.transformFiles/transformSymbols` — thay bằng số thật |
| Run | `state` của phiên chạy + `log` | Log cài đặt/khởi động đổ về đây |

### 2.6 Báo cáo phân tích (màn Result, màn Clean)

`GET /api/sessions/{id}/analysis`

```json
{
  "project": {
    "name": "website-ban-hang",
    "kind": "website bán hàng",
    "language": "Python",
    "framework": "Django",
    "summary": "Khách xem sản phẩm, bỏ vào giỏ rồi thanh toán; đơn hàng được lưu vào cơ sở dữ liệu."
  },
  "counts": { "totalFiles": 500, "readFiles": 500, "skippedFiles": 0,
              "identifiers": 217, "comments": 1842, "docsToWrite": 8 },
  "plannedChanges": { "safe": 229, "risky": 12, "total": 241 },
  "riskyItems": [
    { "key": "DATABASE_URL", "file": ".env.example", "kind": "env_contract",
      "reason": "Tên này đang được 3 tệp cấu hình máy chủ dùng để kết nối cơ sở dữ liệu. Nếu đổi tên, máy chủ có thể không kết nối được nữa.",
      "evidence": ["docker-compose.yml:12", ".env.example:3", "deploy.yaml:27"] }
  ],
  "runScan": { "kind": "Python · Django", "needs": ["Python 3.11 trở lên"],
               "install": {"command": "pip install -r requirements.txt", "evidence": "requirements.txt"},
               "start": {"command": "python manage.py runserver", "evidence": "README.md dòng 24"},
               "envFile": {"required": true, "found": ".env.example", "missing": ".env"},
               "notes": ["Dự án cần tệp .env …"] }
}
```

- `plannedChanges.safe == 0 && risky == 0` ⇒ frontend mở màn **Clean**.
- `reason` là **một câu tiếng Việt** do backend viết (ngoại lệ được phép — nội dung sinh ra); đây chính là chỗ màn Done hiển thị.
- `evidence` để mục "Vì sao?" mở ra được bằng chứng cụ thể, không phải điểm số.
- `runScan.install.label` / `start.label` **không** do backend trả: frontend đã có nhãn cố định ("Cài các thư viện cần thiết" / "Khởi động dự án") trong `copy.ts`. Backend chỉ trả `command` + `evidence`.
  ⚠️ **Việc frontend phải sửa:** `ProjectRun.install/start` bỏ trường `label`, thêm `evidence`.

### 2.7 Hỏi đáp về dự án (màn Result, màn Clean)

`POST /api/sessions/{id}/ask` `{"question": "Phần thanh toán nằm ở đâu?"}`

```json
{ "answer": "Phần thanh toán nằm trong thư mục services…", "sources": [{"file":"src/services/payment.py","lines":[1,120]}], "cost": {"tokens": 1840} }
```

Trả lời phải kèm `sources` — frontend hiện chưa hiện, nhưng giữ sẵn để sau này mở "Vì sao?" mà không phải đổi API.

### 2.8 Bắt đầu xử lý (màn Result → Working)

`POST /api/sessions/{id}/apply`

```json
{ "decisions": { "DATABASE_URL": "keep", "REDIS_HOST": "change" },
  "options": { "docsLanguage": "vi-VN", "commentLanguage": "vi-VN" } }
```

- Thiếu quyết định ⇒ mặc định `keep` (đúng nguyên tắc "nghiêng về an toàn").
- Trả `202` + job; SSE chuyển `transforming` → `verifying` → `done`.
- Gọi lại khi đang chạy ⇒ `409` kèm `jobId` hiện tại (không tạo hai job sửa cùng một thư mục).

### 2.9 Danh sách thay đổi (màn Done, mục "Xem lại từng thay đổi")

`GET /api/sessions/{id}/changes?limit=50&cursor=`

```json
{ "items": [ { "id": 1, "file": "src/services/user_service.py", "kind": "rename_identifier",
               "from": "获取用户", "to": "get_user", "lines": [12, 48], "references": 3,
               "why": "Tên tiếng Trung, đã đổi sang tiếng Anh." } ],
  "nextCursor": "50", "total": 217 }
```

### 2.10 Kiểm chứng (dòng "Đã kiểm tra: dự án vẫn chạy tốt, không lỗi")

`GET /api/sessions/{id}/verification`

```json
{ "syntax": {"ok": true, "checkedFiles": 500, "failed": []},
  "references": {"ok": true, "broken": []},
  "smoke": {"ran": true, "kind": "start_command", "ok": true, "logTail": "…"},
  "summary": "passed",
  "warnings": ["Không chạy được bộ test vì dự án không khai báo test."] }
```

`summary`: `passed` | `passed_with_warnings` | `failed` | `not_run`.
Frontend **không** được hiện "vẫn chạy tốt" nếu `summary != passed` — cần sửa `copy.ts` cho hai trường hợp còn lại (hiện đang hard-code câu khẳng định).

### 2.11 Chạy thử dự án (màn Run)

| Method | Đường dẫn | Việc |
|---|---|---|
| `GET` | `/api/sessions/{id}/run` | Trạng thái: `{"state":"stopped","address":null,"usage":null}` |
| `POST` | `/api/sessions/{id}/run` | Bắt đầu: `202` + job. Body `{"confirm": true}` — bắt buộc, để không ai chạy code người dùng ngoài ý muốn |
| `POST` | `/api/sessions/{id}/run/stop` | Dừng tiến trình con, dọn cổng |
| `GET` | `/api/sessions/{id}/run/events` | SSE: `starting` → `installing` → `port_open` → `running` · kèm `log` |
| `GET` | `/preview/{id}/` | Proxy sang cổng của dự án đang chạy (dùng cho iframe) |

Khi `running`:

```json
{ "state": "running", "address": "http://127.0.0.1:8686/preview/ses_8f3a/",
  "directAddress": "http://127.0.0.1:5173", "port": 5173, "pid": 18422,
  "usage": [ "Mở địa chỉ trên bằng trình duyệt…", "…" ],
  "credentialsNote": "Tài khoản mẫu: admin / admin123 (dữ liệu mẫu)." }
```

⚠️ **Việc frontend phải sửa:** `ProjectRun.previewSrc` trỏ vào `/preview/<id>/` (cùng origin) và **bỏ `allow-same-origin`** khỏi `sandbox` của iframe — xem `docs/06` §Bảo mật. Nút "Mở trong tab mới" mở `directAddress`.

### 2.12 Viết tài liệu (màn Clean)

`POST /api/sessions/{id}/docs` → `202` + job. Sinh 8 tệp: `docs/vi/gioi-thieu.md`, `cai-dat.md`, `su-dung.md`, `kien-truc.md`… (danh sách thật lấy từ `analysis.counts.docsToWrite`).

### 2.13 Xuất và báo cáo (màn Done)

| Method | Đường dẫn | Việc |
|---|---|---|
| `GET` | `/api/sessions/{id}/export.zip` | Tải bản đã sửa (kèm `CHANGES.md` + báo cáo) |
| `GET` | `/api/sessions/{id}/report.html` | Báo cáo chi tiết, in ra PDF được bằng trình duyệt (không cần thư viện PDF) |

Chọn HTML in-được thay vì sinh PDF trực tiếp: bớt một phụ thuộc nặng, chữ tiếng Việt không lỗi font, và người dùng vẫn "Lưu thành PDF" được từ hộp thoại in.

### 2.14 Cấu hình, khoá API, khám phá mô hình

| Method | Đường dẫn | Việc |
|---|---|---|
| `GET` | `/api/config` | Document cấu hình **sparse** (chỉ key người dùng đã đặt) |
| `PUT` | `/api/config` | Ghi sparse, chỉ nhận key đã đăng ký trong `config/schema.ts` |
| `GET` | `/api/credentials/{ref}` | `{"configured":true,"source":"store","writable":true}` — **không bao giờ** trả giá trị |
| `PUT` | `/api/credentials/{ref}` | `{"value":"..."}` — từ chối giá trị rỗng; ghi file 0600 |
| `DELETE` | `/api/credentials/{ref}` | Bỏ khoá (idempotent) |
| `POST` | `/api/providers/discover` | `{"baseURL":"...","protocol":"openai"}` → danh sách model thật (`GET {baseURL}/models`) |

Cấu hình khớp đúng seam frontend đang có (`config/store.ts` với `readDoc/writeDoc` sparse): frontend chỉ cần cắm `ServerBackend` gọi các endpoint trên thay cho `localBackend`.

---

## 3. Ma trận phủ — mỗi màn hình cần gì

| Màn hình | Endpoint | Trường bắt buộc có |
|---|---|---|
| Landing | `POST /api/sessions` | nhận 3 lựa chọn + nguồn |
| Sidebar | `GET /api/projects` | `state`, `riskyCount` (đủ để dựng nhãn) |
| Reading | `GET …/events` | `step` 5 bước, `progress.files` |
| Result | `GET …/analysis` | `project.*`, `counts.*`, `plannedChanges.*` |
| Result (hỏi đáp) | `POST …/ask` | `answer` |
| Working | `GET …/events` | `progress.files/symbols`, `currentFile` |
| Done | `GET …/analysis` + `GET …/verification` + `GET …/changes` | `riskyItems`, `summary`, `total` |
| Done (quyết định) | `POST …/apply` | nhận `decisions` |
| Done (xuất) | `/export.zip`, `/report.html` | tệp |
| Run | `GET/POST …/run`, `…/run/events`, `/preview/{id}/` | `state`, `address`, `usage`, `notes` |
| Clean | `GET …/analysis` (`plannedChanges.total == 0`) + `POST …/docs` + `POST …/ask` | `counts.totalFiles`, `docsToWrite` |
| Failed | mọi lỗi | `error.code`, `error.message`, `error.technical` |
| Cài đặt → Mô hình | `/api/config`, `/api/credentials/*`, `/api/providers/discover` | khớp `ModelsSettings` hiện có |

**Không màn hình nào cần endpoint nằm ngoài bảng này.** Nếu phát sinh, cập nhật bảng này trước khi code.

---

## 4. Việc phải làm

- [ ] Sinh OpenAPI + một tệp kiểu TypeScript (`openapi-typescript`) để `types.ts` của frontend không lệch backend; thêm test hợp đồng so schema với `Frontend/src/types.ts`.
- [ ] `api/events.py`: SSE có `Last-Event-ID`, keep-alive 15 giây, đóng khi job kết thúc.
- [ ] `core/errors.py`: bảng mã lỗi trên, kèm test cho từng mã (không rò traceback ra `message`).
- [ ] Middleware token + Origin (test: Origin lạ ⇒ 403; thiếu token ⇒ 401).
- [ ] `/api/doctor` cho lần chạy đầu (frontend chưa dùng, nhưng CLI dùng — và sẽ hiện ở màn hình đầu nếu thiếu git/node).
- [ ] Ba thay đổi phía frontend đã đánh dấu ⚠️ ở trên: gửi lựa chọn ở Landing, bỏ `label` khỏi `install/start`, `previewSrc` + bỏ `allow-same-origin`, và `Project.statusLabel` → map từ enum.

**Tiêu chí nghiệm thu:** chạy một phiên thật từ link GitHub tới màn Done mà **không phải sửa một dòng nào trong `screens/`** ngoài bốn việc ⚠️ đã liệt kê; mọi lỗi trong bảng mã lỗi đều dựng lại được bằng test.
