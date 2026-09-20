# 02 — Hợp đồng API

Nguyên tắc: **backend trả dữ liệu và ngữ nghĩa, frontend trả câu chữ.** Ngoại lệ duy nhất là nội dung do hệ thống sinh ra (lý do một câu cho mỗi chỗ rủi ro, hướng dẫn sử dụng, tài liệu tiếng Việt) — ba thứ đó là *sản phẩm*, không phải nhãn giao diện.

## 1. Quy ước chung

| Mục | Quy ước |
|---|---|
| Base | `http://127.0.0.1:8686/api` (cùng origin với giao diện) |
| Định dạng | JSON **`camelCase`** — khớp thẳng `Frontend/src/types.ts`, không có lớp đổi tên nào. Kiểu trong Python vẫn `snake_case`, chỉ lớp serialize đổi tên khi ra JSON |
| Xác thực | Header `X-Local-Token: <token>` bắt buộc cho mọi `/api/*` trừ `/api/health`. Token nhúng vào `index.html` lúc backend trả trang (`<meta name="trolyduan-token">`); **`/api/bootstrap` cũng bắt buộc có token và không bao giờ trả token** |
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

`state` **dùng đúng enum trạng thái phiên ở `docs/01` §4** — không có bộ từ vựng thứ hai:
`ingesting` · `analyzing` · `analyzed` · `transforming` · `verifying` · `done` · `failed` · `cancelled` · `interrupted`.

Frontend dựng nhãn từ `state` + số đếm, ví dụ:

| `state` + số đếm | Nhãn hiện ra |
|---|---|
| `analyzed`, `riskyCount: 12` | *"Cần bạn xem 12 chỗ"* (màu vàng) |
| `analyzed`, `changedCount: 0` | *"Sạch — không cần sửa"* (màu xanh dương) |
| `done` | *"Đã xong"* (màu xanh lá) |
| `failed` | *"Không mở được"* (màu đỏ) |
| `ingesting` / `analyzing` | *"Đang chạy"* (màu xám) |
| `interrupted` | *"Dở dang — mở lại để xem"* (màu xám) |

⚠️ **Việc frontend phải sửa:** `Project.statusLabel/tone` hiện là câu chữ trong `demo.ts`; chuyển sang map `state → {nhãn, màu}` trong `copy.ts` theo bảng trên.

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

`GET /api/sessions/{id}/events` — `text/event-stream`.

**Mỗi sự kiện đều có `id:` tăng đơn điệu.** Không có `id:` thì `Last-Event-ID` vô nghĩa và kết nối lại sẽ mất sự kiện.

**Chính sách đệm — một con số duy nhất cho cả tài liệu:** kênh giữ **500 sự kiện** gần nhất cho mỗi phiên. Nếu client kết nối lại với `Last-Event-ID` cũ hơn mức đệm, backend **không** cố phát lại: nó phát một sự kiện `resync` để client gọi lại `GET /api/sessions/{id}` + `GET /api/sessions/{id}/analysis` lấy trạng thái đầy đủ. Đây là lý do không cần đệm lớn — trạng thái luôn lấy lại được bằng một lời gọi.

**Log dài đi đường riêng:** `GET /api/sessions/{id}/run/logs?tail=5000` trả log đã lưu trong SQLite (5.000 dòng gần nhất), còn SSE chỉ đẩy log mới. Client kết nối muộn gọi endpoint này thay vì trông vào đệm sự kiện.

```
id: 41
event: state      data: {"state":"analyzing"}
id: 42
event: step       data: {"index":1,"total":5,"done":true,"label":"language"}
id: 43
event: progress   data: {"phase":"read","unit":"files","done":342,"total":500,"currentFile":"src/services/user_service.py","etaSeconds":96}
id: 44
event: progress   data: {"phase":"transform","unit":"symbols","done":1923,"total":2431}
id: 45
event: log        data: {"level":"info","text":"Đã đọc xong requirements.txt"}
id: 46
event: artifact   data: {"kind":"analysis","ready":true}
id: 47
event: resync     data: {"reason":"buffer_overflow"}
id: 48
event: error      data: {"code":"source.private","message":"..."}
```

Từng màn hình dùng gì:

| Màn hình | Sự kiện | Ghi chú |
|---|---|---|
| Reading | `step` (5 bước, `index` 0–4) + `progress.phase=read` | 5 bước khớp đúng `S.reading.steps`: đọc tệp → nhận diện ngôn ngữ → tìm tên biến → chú thích/tài liệu → **xem cách cài đặt và khởi động**. `etaSeconds` để câu *"Còn khoảng 1 phút"* thành số thật (hiện đang hard-code trong `copy.ts`) |
| Working | `progress.phase=transform` với `unit=files` và `unit=symbols` + `currentFile` | `phase` là thứ phân biệt hai lần đếm tệp (đọc vs biến đổi) — thiếu nó thì frontend không biết đang ở giai đoạn nào. Frontend hiện đọc `demoNumbers.transformFiles/transformSymbols`, phải thay bằng số thật |
| Run | `state` của phiên chạy (`installing`/`preparing`/`starting`/`running`) + `log` | Bốn `state` khớp đúng bốn dòng bước trên màn Run, nên không cần thêm sự kiện `step` riêng |

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
               "notes": ["Dự án cần tệp .env …"] },
  "runAvailable": true,
  "degraded": [],
  "costEstimate": { "model": "deepseek/deepseek-chat", "calls": 42,
                    "promptTokens": 380000, "completionTokens": 90000 }
}
```

- `plannedChanges.safe == 0 && risky == 0` ⇒ frontend mở màn **Clean**.
- `runAvailable: false` ⇒ màn Run **không** hiện nút Chạy, chỉ hiện câu giải thích (`docs/06` §2).
- `degraded` liệt kê các bước cần AI đã bị bỏ vì chưa có khoá (`docs/07` §4.7); rỗng = không thiếu gì.
- `costEstimate` là ước lượng **trước khi** người dùng bấm "Bắt đầu xử lý" (`docs/04` §9) — không phải số đã tiêu.
- `reason` là **một câu tiếng Việt** do backend viết (ngoại lệ được phép — nội dung sinh ra); đây chính là chỗ màn Done hiển thị.
- `evidence` để mục "Vì sao?" mở ra được bằng chứng cụ thể, không phải điểm số.
- `runScan.install.label` / `start.label` **không** do backend trả: frontend đã có nhãn cố định ("Cài các thư viện cần thiết" / "Khởi động dự án") trong `copy.ts`. Backend chỉ trả `command` + `evidence`.
  ⚠️ **Việc frontend phải sửa:** `ProjectRun.install/start` bỏ trường `label`, thêm `evidence`.

### 2.7 Hỏi đáp về dự án (màn Result, màn Clean)

`POST /api/sessions/{id}/ask` `{"question": "Phần thanh toán nằm ở đâu?"}`

```json
{ "answer": "Phần thanh toán nằm trong thư mục services…",
  "sources": [{"file": "src/services/payment.py", "lines": [1, 120]}] }
```

Trả lời phải kèm `sources` — frontend hiện chưa hiện, nhưng giữ sẵn để sau này mở "Vì sao?" mà không phải đổi API. **Không** trả số token hay chi phí ở đây: giao diện Đơn giản không được hiện token (chi phí có endpoint riêng, §2.10b).

### 2.8 Bắt đầu xử lý (màn Result → Working)

`POST /api/sessions/{id}/apply`

```json
{ "decisions": { "DATABASE_URL": "keep", "REDIS_HOST": "change" },
  "options": { "docsLanguage": "vi-VN", "commentLanguage": "vi-VN" } }
```

- Thiếu quyết định ⇒ mặc định `keep` (đúng nguyên tắc "nghiêng về an toàn").
- Trả `202` + job; SSE chuyển `transforming` → `verifying` → `done`.
- Gọi lại khi đang chạy ⇒ `409` kèm `jobId` hiện tại (không tạo hai job sửa cùng một thư mục).
- Body nhận thêm header `Idempotency-Key` (tuỳ chọn): cùng key trong 10 phút ⇒ trả lại đúng job cũ thay vì tạo job mới. Cần thiết vì người dùng bấm nút hai lần hoặc mạng chập chờn.
- Trước khi ghi, backend lấy **khoá tệp** `work/<id>/.lock` (`os.O_CREAT|os.O_EXCL`, kèm PID + thời điểm). Khoá còn sống ⇒ `409`; khoá mồ côi (PID không còn, hoặc cũ hơn 6 giờ) thì sweeper dọn. Đây là lớp chặn thứ hai, độc lập với trạng thái trong bộ nhớ.

### 2.8b Huỷ và quay lại

| Method | Đường dẫn | Việc |
|---|---|---|
| `POST` | `/api/sessions/{id}/cancel` | Huỷ job đang chạy của phiên. Idempotent: gọi lại khi đã `cancelled` vẫn `200`. Không có job ⇒ `200` kèm `{"state":"analyzed"}`. Huỷ mềm trước (cờ + điểm dừng), quá 5 giây thì `task.cancel()`; sau đó dọn tiến trình con và `.tmp` |
| `POST` | `/api/sessions/{id}/revert` | Ghi lại bản gốc cho mọi tệp đã sửa, từ `.backup/` (`docs/05` §1). Body `{"paths": ["..."]}` — bỏ trống = tất cả. `409` nếu phiên đang `transforming`/`verifying`, hoặc nếu phiên đã được xuất `.zip` (lúc đó thư mục làm việc là nguồn sự thật). Trả `{"reverted": 187, "failed": []}` |

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
  "smoke": {"ran": true, "kind": "pytest", "ok": true, "seconds": 22, "logTail": "…",
            "started": {"command": "python manage.py runserver", "port": 8000}},
  "applied": {"renamed": 217, "commentsTranslated": 1842, "docsWritten": 8,
              "filesChanged": 187, "seconds": 241, "skippedByFailure": 3},
  "summary": "passed",
  "warnings": ["3 chú thích được giữ nguyên vì bản dịch không đạt kiểm tra."] }
```

`summary`: `passed` | `passed_with_warnings` | `failed` | `not_run`.
`smoke.kind`: `pytest` | `npm_test` | `go_test` | `start_command` | `none` — **dùng chung bộ giá trị với `docs/05` §7**, không được đặt tên khác.

Frontend **không** được hiện "vẫn chạy tốt" nếu `summary != passed` — cần sửa `copy.ts` cho ba trường hợp còn lại (hiện đang hard-code câu khẳng định).

⚠️ **Việc frontend phải sửa:** màn Done hiện hard-code `217` / `1.842` / `8` (trong `copy.ts` `S.done.checks`) và câu *"Mình đã làm xong trong 4 phút"* (`S.done.sub`). Đổi thành đọc `verification.applied` để không bao giờ hiện số sai.

### 2.10b Chi phí AI (dùng nội bộ, không hiện cho người dùng phổ thông)

`GET /api/sessions/{id}/usage` → `{"estimate": {...}, "spent": {"calls": 38, "promptTokens": 402100, "completionTokens": 88400, "cacheHits": 12}}`

Chỉ màn Cài đặt/chi tiết kỹ thuật đọc endpoint này. Nguyên tắc của giao diện là **không hiện token hay chi phí cho người dùng phổ thông** (`frontend-v2.md` §2.6, §12), nên đừng đưa số token vào payload của `/analysis` hay `/ask`.

### 2.11 Chạy thử dự án (màn Run)

| Method | Đường dẫn | Việc |
|---|---|---|
| `GET` | `/api/sessions/{id}/run` | Trạng thái **và** kết quả quét — trả đủ cho cả chặng 1 (kết quả quét + hai lệnh + địa chỉ) và chặng 3 (đang chạy), nên màn Run chỉ cần **một** lời gọi lúc mở |
| `POST` | `/api/sessions/{id}/run` | Bắt đầu: `202` + job. Body `{"confirm": true, "trustProject": true}` — cả hai bắt buộc (`docs/06` §10) |
| `POST` | `/api/sessions/{id}/run/stop` | Dừng tiến trình con, dọn cổng. Idempotent |
| `GET` | `/api/sessions/{id}/run/events` | SSE: chuỗi `state` `installing` → `preparing` → `starting` → `running` (đúng thứ tự 4 bước trên màn Run), kèm `log` |
| `GET` | `/api/sessions/{id}/run/logs?tail=5000` | Log đã lưu, cho client kết nối muộn |
| — | cổng `8687` (do backend cấp) | Proxy sang cổng dự án đang chạy — **origin khác** với app, xem `docs/06` §7 |

`GET …/run` khi chưa chạy — chặng 1 có đủ dữ liệu:

```json
{ "state": "stopped", "runAvailable": true, "previewSrc": null,
  "runScan": { "kind": "Python · Django", "needs": ["Python 3.11 trở lên"],
               "install": {"command": "pip install -r requirements.txt", "evidence": "requirements.txt"},
               "start": {"command": "python manage.py runserver", "evidence": "README.md dòng 24"},
               "address": "http://127.0.0.1:8000",
               "notes": ["Cần tệp .env, mình dùng .env.example"],
               "usage": ["Mở địa chỉ trên bằng trình duyệt…"] } }
```

`runScan.address` là **địa chỉ dự kiến** suy từ cấu hình dự án; sau khi chạy thật, địa chỉ có thể khác (dự án tự đổi cổng) — khi đó `GET …/run` trả thêm `actualAddress` và dùng nó cho mọi chỗ hiển thị. Đây là lý do `runScan` nằm trong endpoint này chứ không chỉ trong `/analysis`: màn Run cần địa chỉ chính xác kể cả khi nó đã đổi.

Khi `running`:

```json
{ "state": "running",
  "previewSrc": "http://127.0.0.1:8687/", "directAddress": "http://127.0.0.1:5174",
  "port": 5174, "proxyPort": 8687, "pid": 18422,
  "startedAt": "2026-03-04T09:20:11+07:00",
  "usage": [ "Mở địa chỉ trên bằng trình duyệt…", "…" ],
  "credentialsNote": "Tài khoản mẫu: admin / admin123 (dữ liệu mẫu)." }
```

⚠️ **Việc frontend phải sửa:** `previewSrc` lấy từ API (origin khác — cổng 8687, không phải `/preview/<id>/` cùng origin), **giữ nguyên** `allow-same-origin` trong `sandbox` vì đã khác origin; nút "Mở trong tab mới" mở `directAddress`.

### 2.12 Viết tài liệu (màn Clean)

`POST /api/sessions/{id}/docs` → `202` + job. Sinh 8 tệp trong `work/docs/vi/`: `gioi-thieu.md`, `cai-dat.md`, `su-dung.md`, `kien-truc.md`… (danh sách thật lấy từ `analysis.counts.docsToWrite`).

Theo dõi qua cùng kênh SSE của phiên (`state: transforming`, `progress.phase=docs`, `unit=files`), kết thúc bằng `artifact {"kind":"docs","ready":true}` rồi `state: done`. Tiến trình ở màn Clean vì thế không cần endpoint riêng — chỉ cần đọc thêm `unit=docs`.

**Nút "Hỏi mình về dự án này" ở màn Clean dùng lại `POST …/ask`** — không có endpoint chat riêng, không có phiên chat riêng. Nút "Viết tài liệu tiếng Việt" mới gọi `/docs`.

### 2.13 Xuất và báo cáo (màn Done)

| Method | Đường dẫn | Việc |
|---|---|---|
| `GET` | `/api/sessions/{id}/export.zip` | Tải bản đã sửa (kèm `CHANGES.md` + báo cáo) |
| `GET` | `/api/sessions/{id}/report.html` | Báo cáo chi tiết, in ra PDF được bằng trình duyệt (không cần thư viện PDF) |

Chọn HTML in-được thay vì sinh PDF trực tiếp: bớt một phụ thuộc nặng, chữ tiếng Việt không lỗi font, và người dùng vẫn "Lưu thành PDF" được từ hộp thoại in.

Hai ràng buộc của bản xuất:

- **`.env` không bao giờ nằm trong `.zip`** (chỉ giữ `.env.example`): tệp đó thường chứa mật khẩu thật, và bản xuất hay được gửi cho người khác. Nếu dự án có `.env`, ghi một dòng cảnh báo vào `CHANGES.md`.
- `report.html` sinh ra **phải escape toàn bộ** nội dung lấy từ dự án (đường dẫn, chú thích, diff). Diff chứa chú thích do AI sinh ra từ nội dung repo, nên không escape là mở đường cho stored XSS chạy trên chính máy người dùng khi họ mở báo cáo. ⚠️ **Việc frontend phải sửa:** `S.done.report` đang ghi *"Mở báo cáo chi tiết (PDF)"* — đổi thành *"(HTML, in ra PDF được)"* cho đúng định dạng thật.

### 2.14 Cấu hình, khoá API, khám phá mô hình

| Method | Đường dẫn | Việc |
|---|---|---|
| `GET` | `/api/config` | Document cấu hình **sparse** (chỉ key người dùng đã đặt) |
| `PUT` | `/api/config` | Ghi sparse, chỉ nhận key đã đăng ký trong `config/schema.ts`. Key lạ hoặc sai kiểu ⇒ `422` với `{"error":{"code":"config.invalid_key"},"rejected":[{"key":"...","reason":"..."}]}` — trả về **từng** key bị từ chối, không im lặng bỏ |
| `POST` | `/api/config/import` | Nhận document `localStorage` cũ của frontend, **một lần**, khi nối backend lần đầu. Chỉ nhận key đã đăng ký; trả về danh sách key đã nhận và bị bỏ |
| `GET` | `/api/credentials/{ref}` | `{"configured":true,"source":"store","writable":true}` — **không bao giờ** trả giá trị. `source` có thể là `store` hoặc `env`; `writable: false` khi giá trị đến từ biến môi trường |
| `PUT` | `/api/credentials/{ref}` | `{"value":"..."}` — từ chối giá trị rỗng; ghi file 0600 |
| `DELETE` | `/api/credentials/{ref}` | Bỏ khoá (idempotent) |
| `POST` | `/api/providers/discover` | `{"baseURL":"...","protocol":"openai"}` → danh sách model thật (`GET {baseURL}/models`) |

Cấu hình khớp đúng seam frontend đang có (`config/store.ts` với `readDoc/writeDoc` sparse).

⚠️ **Việc frontend phải sửa (dễ bị bỏ sót nhất):** `ConfigBackend` trong `config/store.ts` hiện là **đồng bộ** (`readDoc()`/`writeDoc()` trả về ngay), còn HTTP thì bất đồng bộ. Cắm `ServerBackend` thẳng vào là vỡ mọi lời gọi `getConfig`/`setConfig` (chúng đang dùng ở `prefs.ts`, `providers.ts`, `ModelsSettings`, `SettingsModal`). Cách làm sạch: nạp document **một lần** lúc khởi động vào một biến trong bộ nhớ, `getConfig` đọc từ biến đó (vẫn đồng bộ), `setConfig` cập nhật biến rồi ghi nền (debounce) và ghi lại khi đóng tab; lỗi ghi ⇒ hiện thông báo, không nuốt. Đây là việc ước lượng 1–2 ngày, không phải "đổi một dòng".

---

## 3. Ma trận phủ — mỗi màn hình cần gì

| Màn hình | Endpoint | Trường bắt buộc có |
|---|---|---|
| Landing | `POST /api/sessions` | nhận 3 lựa chọn + nguồn |
| Sidebar | `GET /api/projects` | `state`, `riskyCount` (đủ để dựng nhãn) |
| Reading | `GET …/events` | `step` 5 bước, `progress.files` |
| Result | `GET …/analysis` | `project.*`, `counts.*`, `plannedChanges.*`, `degraded`, `costEstimate` |
| Result (hỏi đáp) | `POST …/ask` | `answer` |
| Working | `GET …/events` | `progress.files/symbols`, `currentFile` |
| Done | `GET …/analysis` + `GET …/verification` + `GET …/changes` | `riskyItems`, `summary`, `applied.*`, `changes.total` |
| Done (quyết định) | `POST …/apply` | nhận `decisions` |
| Done (xuất) | `/export.zip`, `/report.html` | tệp |
| Run | `GET/POST …/run`, `…/run/events`, `/preview/{id}/`, `runAvailable` + `runScan` từ `/analysis` | `state`, `address`, `usage`, `notes` |
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
- [ ] Danh sách việc phía frontend: xem `docs/09-lo-trinh.md` §2 (16 việc, đầy đủ và có thứ tự ưu tiên) — mọi ⚠️ trong tài liệu này đều đã nằm trong danh sách đó.

**Tiêu chí nghiệm thu:** chạy một phiên thật từ link GitHub tới màn Done mà **không phải sửa một dòng nào trong `screens/`** ngoài danh sách ⚠️ đầy đủ ở `docs/09-lo-trinh.md` §2; mọi lỗi trong bảng mã lỗi đều dựng lại được bằng test; và một test hợp đồng so `openapi.json` với `Frontend/src/types.ts` phải **đỏ** khi backend đổi tên một trường mà frontend đang đọc.
