# 09 — Lộ trình

Nguyên tắc xếp thứ tự: (1) **giá trị sớm nhất** — phần chạy được không cần khoá AI làm trước, để bản phát hành đầu tiên đã có ích cho cộng đồng; (2) **rủi ro giảm dần** — làm phần dễ sai trước khi có người dùng thật; (3) **mỗi giai đoạn tự đứng được** — kết thúc giai đoạn nào là có thứ phát hành được ở đó.

Ước lượng là **ngày công của một người đã quen codebase**, không phải lịch. Cộng lại khoảng **57–79 ngày công** cho tới bản 1.0. Phần việc phía frontend ở §2 **không** nằm trong con số này.

---

## Giai đoạn 0 — Khung chạy được (≈6–9 ngày)

**Mục tiêu:** mở được giao diện thật ở `127.0.0.1:8686`, có job giả chạy qua SSE. Chưa có nghiệp vụ gì.

| Việc | Ở đâu |
|---|---|
| `pyproject.toml`, package, entry point `trolyduan` | `README.md` §3 |
| `cli.py serve/doctor/version`, `app.py` + mount `Frontend/dist` | `docs/01` §7 |
| Middleware token (nhúng `index.html`) + Origin + bind 127.0.0.1 | `docs/08` §4 |
| `core/{settings,paths,errors,logging}` | `docs/01` §2 |
| `store/db.py` + migration 001 | `docs/08` §1 |
| `jobs/runner.py` + `jobs/sweeper.py` + SSE (job giả 3 bước, huỷ được) | `docs/08` §2 |
| **CI tối thiểu** (ruff + pytest + `doctor` + build wheel) trên Windows và Linux | `docs/08` §6 |
| **Sinh `openapi.json` + stub kiểu TypeScript** | `docs/02` §4 |

**Ra được:** một bản chạy được để cả nhóm nhìn thấy đường đi; frontend nối được SSE thật; việc nối API ở giai đoạn 1 không phải chờ hợp đồng.

**Nghiệm thu (máy kiểm được, không nhìn bằng mắt):** `uv run trolyduan serve` trả `GET /api/health` `200`; trang giao diện có `<meta name="trolyduan-token">`; gọi `/api/*` từ Origin lạ trả `403` và thiếu token trả `401` (2 test); job giả phát đúng 3 sự kiện `step` có `id:` liên tục; thời gian từ `POST /cancel` tới sự kiện `state: cancelled` **< 1 giây** (assert trong test, đo bằng đồng hồ); CI xanh trên cả hai hệ điều hành.

---

## Giai đoạn 1 — Đọc hiểu dự án, không cần AI (≈18–25 ngày)

**Mục tiêu:** từ link GitHub / thư mục / `.zip` tới màn **Result** và **Clean** với số liệu **thật**, hoàn toàn bằng AST, **chỉ với dự án Python**. Đây là giai đoạn có giá trị cộng đồng cao nhất trên mỗi ngày công, vì nó chạy được ngay cả khi người dùng chưa có khoá AI.

| Việc | Ở đâu |
|---|---|
| `ingest/` 3 nguồn + `guard` + manifest + `skipped.json` | `docs/03` |
| `inventory.py` (quét, .gitignore, ngôn ngữ, mã hoá) | `docs/04` §1 |
| `parsers/libcst_py.py` (định danh, chú thích, import, route, model) | `docs/04` §2 |
| `identifiers.py` (điểm + đếm tham chiếu + 4 điều kiện loại trừ) | `docs/04` §3 |
| `comments.py` (tách, loại chỉ thị tool, phân loại) | `docs/04` §4 |
| `contracts.py` (hợp đồng cấu hình → nhóm rủi ro + bằng chứng) | `docs/04` §5 |
| `entrypoints.py` (quét lệnh cài/khởi động, có bằng chứng) | `docs/04` §7 |
| `plan.py` (kế hoạch + phân loại safe/risky theo `safety`) | `docs/04` §8 |
| `GET /api/projects`, `POST /api/sessions`, `/analysis`, SSE | `docs/02` |
| `summary.py` **không dùng LLM**: câu 1 suy từ manifest + routes theo mẫu câu cố định | `docs/04` §6 |
| Nối frontend: 17 việc ở §2 | §2 |

**Ra được:** bản phát hành đầu tiên cho cộng đồng — *"đưa dự án vào, biết ngay nó có bao nhiêu tên biến khó đọc, bao nhiêu chú thích cần dịch, chỗ nào chạm cấu hình máy chủ"*, không tốn một đồng API.

**Nghiệm thu:** trên fixture đã **khoá hash trong `tests/fixtures/`** (500 tệp, 217 định danh tiếng Trung, 1.842 chú thích, 12 khoá cấu hình): báo cáo khớp **từng con số, sai số 0** — không dùng số "khoảng"; phân tích AST **< 60 giây** (đo bằng test, không phải cảm nhận); hash của `origin/` sau phiên **khớp `manifest.json` byte-for-byte**; ngôn ngữ ngoài Python bị báo đúng là chưa hỗ trợ đổi tên; màn Result và Clean hiện số thật.

---

## Giai đoạn 2 — AI vào cuộc: tóm tắt, đổi tên, dịch, kiểm chứng lớp 1+2 (≈14–18 ngày)

**Mục tiêu:** màn **Working** và **Done** với kết quả thật. Kiểm chứng gồm **lớp 1 (cú pháp) + lớp 2 (liên kết)**; lớp 3 (chạy thử) đi cùng giai đoạn 3 vì nó dùng lại máy móc của màn Run — nếu làm ở đây sẽ tạo phụ thuộc vòng giữa hai giai đoạn.

| Việc | Ở đâu |
|---|---|
| `llm/` 4 adapter + router + budget + cache + khám phá model | `docs/07` §4 |
| `llm/prompts/` 5 prompt có phiên bản + `validate()` cho **cả 5** + `sanitize` chống injection | `docs/07` §4.5–4.6 |
| Credential store thật + `redact()` hai tầng + API credential | `docs/07` §3 |
| Config store thật + `/api/config` + `/api/config/import` | `docs/07` §2 |
| `transform/rename.py` (LibCST theo scope + luật tên ở §2) | `docs/05` §2 |
| `transform/translate.py` (lô + 5 kiểm tra kết quả + nhánh song ngữ) | `docs/05` §3 |
| `writer.py` atomic + `.backup/` + diff + `/revert` | `docs/05` §1, §6 |
| `verify/syntax.py` + `verify/references.py` + `summary` 4 giá trị | `docs/05` §7 |
| `GET …/changes`, `/verification`, `/usage`, `POST …/apply`, `/cancel`, `/revert` | `docs/02` |
| Trạng thái suy giảm khi không có khoá AI (`analysis.degraded`) | `docs/07` §4.7 |

**Ra được:** sản phẩm đúng như lời hứa với người dùng — đổi tên, dịch chú thích, và nói thật về việc đã kiểm chứng được tới đâu.

**Nghiệm thu:** fixture Python chạy hết luồng tới màn Done; **100% tệp đã chạm parse lại được** và **0 tham chiếu gãy** (hai assert); fixture "sửa hỏng" cố ý ⇒ `summary == "failed"`, không bao giờ `passed`; `/revert` xong thì hash toàn bộ `work/` khớp `manifest.json`; fixture prompt injection ⇒ **assert không tệp nào bị ghi ngoài kế hoạch và không lệnh nào được chạy**; LLM giả trả JSON vỡ ⇒ phiên vẫn hoàn thành, `summary` và `warnings` nói đúng sự thật.

---

## Giai đoạn 3 — Chạy thử dự án + kiểm chứng lớp 3 (≈11–15 ngày)

**Mục tiêu:** màn **Run** chạy thật — quét lệnh, cài, khởi động, khung xem trước ở cổng riêng, hướng dẫn sử dụng, dừng sạch. Kèm **kiểm chứng lớp 3 (smoke)**, vì nó dùng chính `run/process.py`.

| Việc | Ở đâu |
|---|---|
| `run/ports.py` (bind thật, IPv4+IPv6, cấp 2 cổng/phiên), `run/process.py` (env allowlist, log theo dòng, timeout, kill cây bằng Job Object/process group) | `docs/06` §5–6 |
| Bước "chuẩn bị dữ liệu mẫu" (venv/migrate/seed) | `docs/06` §3 |
| `run/proxy.py` (cổng riêng 8687/n, gỡ `X-Frame-Options`, WebSocket thật) | `docs/06` §7 |
| `run/usage.py` (hướng dẫn từ bằng chứng) | `docs/06` §8 |
| `verify/smoke.py` (dùng lại `run/`) | `docs/05` §7 |
| Dừng/dọn dẹp + handler khi thoát app + dọn ở sweeper | `docs/06` §9 |
| Frontend: việc #6, #13, #14 ở §2 | `docs/06` §7 ⚠️ |

**Ra được:** vòng tròn khép kín — sửa xong thì thấy dự án chạy, kèm hướng dẫn cho người không biết lập trình.

**Nghiệm thu (máy kiểm được):** fixture Flask và Vite mini: `GET http://127.0.0.1:8687/` trả **HTTP 200** và thân trang chứa nội dung của dự án; sau `POST /run/stop`, **kết nối TCP tới cổng dự án và cổng proxy đều thất bại trong < 5 giây**; **số tiến trình con còn sống = 0** (đếm bằng Job Object trên Windows / process group trên POSIX, kể cả fixture cố tình detach); dự án thiếu bằng chứng ⇒ `runAvailable == false` và API từ chối `POST /run`; dự án cần Docker mà Docker tắt ⇒ trả `notes` đúng câu, không treo.

---

## Giai đoạn 4 — Hoàn thiện cho cộng đồng (≈8–12 ngày)

| Việc | Ở đâu |
|---|---|
| `transform/docs.py` 8 tệp tài liệu tiếng Việt | `docs/05` §4 |
| `/export.zip` (không có `.env`) + `/report.html` (đã escape) + `CHANGES.md` | `docs/02` §2.13 |
| Lịch sử phiên, xoá phiên, `trolyduan clean` | `docs/08` §7 |
| Phản hồi người dùng thành dữ liệu (`feedback`, `proposals`) | `docs/08` §1 |
| `trolyduan doctor` + hiện ở lần chạy đầu | `docs/08` §9 |
| Đóng gói: wheel kèm static (kiểm `frontendBuilt`), phát hành PyPI | `docs/08` §5 |
| README gốc repo + `LICENSE` + `CONTRIBUTING` | câu hỏi mở §5 |
| Ngôn ngữ thứ hai (TS/JS) ở mức đổi tên | `docs/04` §2 |

**Ra được:** bản 1.0 cài bằng một lệnh, có tài liệu, có giấy phép, có đường cho người đóng góp.

**Nghiệm thu:** `pipx install` wheel trong một máy ảo **không có Node** rồi `trolyduan serve` mở được giao diện (assert `GET /` 200 + có `<meta name="trolyduan-token">`); `export.zip` giải nén ra đúng cây tệp, **không có tệp `.env` nào**, có `CHANGES.md`; `report.html` mở được và **không chạy script nào** (mở bằng trình duyệt headless, assert không có `alert`/lỗi CSP); `trolyduan doctor` báo đúng khi thiếu git/node/cổng bị chiếm; tài liệu 8 tệp đọc được và **không tệp nào chứa giá trị thật của một khoá cấu hình** (assert theo mẫu).

---

## 1. Tổng hợp

| Giai đoạn | Ngày công | Phát hành được gì | Phụ thuộc |
|---|---|---|---|
| 0 — Khung (+ CI, OpenAPI stub) | 6–9 | Bản chạy nội bộ | — |
| 1 — Đọc hiểu (AST, chỉ Python) | 18–25 | **Bản cộng đồng đầu tiên, không cần khoá AI** | GĐ 0 |
| 2 — AI + biến đổi + kiểm chứng lớp 1+2 | 14–18 | Sản phẩm đúng lời hứa (trừ phần chạy thử) | GĐ 1 |
| 3 — Chạy thử + kiểm chứng lớp 3 (smoke) | 11–15 | Vòng tròn khép kín | GĐ 2 (dùng lại `entrypoints`) |
| 4 — Hoàn thiện, đa ngôn ngữ, phát hành | 8–12 | Bản 1.0 | GĐ 3 |

**Tổng: ≈57–79 ngày công.** Con số này đã tính lại sau review: ước lượng đầu tiên (45–60) lạc quan ở giai đoạn 1 và 2 — LibCST theo scope + import graph + hợp đồng cấu hình + heuristic tiếng Việt không dấu là phần khó nhất của cả dự án, không phải phần dễ.

Ước lượng là **ngày công của một người đã quen codebase**, không phải lịch. Phần việc phía frontend (§2) **không** nằm trong bảng này.

---

## 2. Việc phía frontend (phụ thuộc, không nằm trong ước lượng trên)

Rà soát toàn bộ giao diện hiện tại, đây là **tất cả** những gì frontend phải sửa để nối backend — không có gì khác:

| # | Việc | Vì sao |
|---|---|---|
| 1 | `demo.ts` → client gọi API (`landing` → `POST /sessions`, `projects` → `GET /projects`, `analysis` → `GET /analysis`, `riskyItems` → `analysis.riskyItems`, `demoRun` → `GET /sessions/{id}/run`) | Toàn bộ dữ liệu mẫu là hợp đồng tạm |
| 2 | Ba dropdown ở `Landing.tsx` gửi kèm khi tạo phiên | Hiện là `useState` **không đi đâu cả** — người dùng chọn mà hệ thống không biết |
| 3 | `Project.statusLabel/tone` → map từ `state` + `riskyCount` trong `copy.ts`; `Project.stage` bỏ khỏi dữ liệu (backend không trả) | Backend trả enum, frontend sở hữu câu chữ |
| 4 | `ProjectRun.install/start` bỏ `label`, thêm `evidence`; **`needs` đổi từ `string` sang `string[]`** | Nhãn là câu chữ của frontend; `evidence` để mở "Vì sao?"; một dự án có thể cần nhiều thứ (Python + Node + Docker) |
| 5 | Màn Done: 4 nhánh theo `verification.summary` **và** đọc `verification.applied` thay cho số hard-code (`217`/`1.842`/`8`, câu *"trong 4 phút"*) | Hiện hard-code *"dự án vẫn chạy tốt, không lỗi"* — sẽ nói sai khi `not_run`, và số đã làm thật khác số đã lên kế hoạch |
| 6 | `screens/Run.tsx`: `previewSrc` lấy từ API (`http://127.0.0.1:8687`, **origin khác**) và **giữ nguyên** `allow-same-origin`; "Mở trong tab mới" dùng `directAddress`; đánh số bước 1/2 lấy từ dữ liệu; `runScan.address` cho dòng "Chạy xong, mở vào …" | Proxy phải khác origin. Ghi chú trong code + `Frontend/README.md` đã sửa lại cho khớp; việc còn lại là nối dữ liệu thật |
| 7 | `config/store.ts`: `ConfigBackend` **đồng bộ → nạp một lần + ghi nền**, cắm `ServerBackend`, import document `localStorage` cũ **một lần** | HTTP là bất đồng bộ; cắm thẳng vào là vỡ mọi `getConfig`/`setConfig`. Đây là việc 1–2 ngày, không phải một dòng |
| 8 | Màn Result: hiện câu thông báo khi `analysis.degraded` (chưa có khoá AI) | Chế độ chỉ-AST là trạng thái bình thường, không phải lỗi |
| 9 | Sidebar: nút "Xoá phiên này" (tuỳ chọn) | Vòng đời dữ liệu trên máy người dùng |
| 10 | Dọn `index.html`: bỏ `?mode=expert` + `repo-agent.uiMode` | Tàn dư của chế độ Chuyên gia đã xoá — **vẫn còn trong code** (`Frontend/index.html` dòng 15–19), chưa dọn |
| 11 | `Failed.tsx` nhận `error` prop (hiện `message` + `technical` + 3 đường thoát), `ProjectFlow` truyền vào từ trạng thái `failed` | Hiện màn Failed đọc chuỗi hard-code trong `copy.ts`, không có đường nhận lỗi thật |
| 12 | `types.ts`: `RiskyItem` thêm `kind` + `evidence`; màn Done mở được "Vì sao?" | Bằng chứng là thứ biến "12 chỗ rủi ro" từ con số thành thông tin dùng được |
| 13 | `copy.ts`: `S.done.report` → *"(HTML, in ra PDF được)"*; `S.reading.about` ("Còn khoảng 1 phút") → theo `progress.etaSeconds` | Nhãn đang sai định dạng thật; ETA đang là số bịa |
| 14 | `Reading.tsx`/`Working.tsx`/`Run.tsx`: bỏ `setInterval` mô phỏng, đọc SSE thật | Ba màn này hiện tự chạy bằng timer |
| 15 | `demo.ts`: thống nhất `totalFiles` (500) với `copy.ts` (`428`) | Hai con số khác nhau cho cùng một dự án demo — sẽ lộ ngay khi nối API thật |
| 16 | `credentials.ts`: `CredentialInfo` thêm `source` (nhận `store` hoặc `env`) và trường hợp `writable: false`; `ModelsSettings` hiện trạng thái chỉ-đọc | Backend có thể lấy khoá từ biến môi trường; UI phải nói được điều đó |
| 17 | **Dev proxy**: `vite.config.ts` thêm `server.proxy['/api']` → `127.0.0.1:8686` kèm header `X-Local-Token` lấy từ `process.env.TROLYDUAN_TOKEN`; client đọc token từ `<meta name="trolyduan-token">` khi có (bản build) và không gửi gì khi ở dev | Chỉ chạy dev mới cần; giữ token ra khỏi trình duyệt thay vì nới lỏng xác thực backend |

> **Việc #7 (ConfigBackend đồng bộ → bất đồng bộ) là chi phí ẩn lớn nhất của giai đoạn 1** — 1–2 ngày công, và nếu làm ẩu thì **toàn bộ màn Cài đặt vỡ** (`getConfig`/`setConfig` đang được gọi ở `prefs.ts`, `providers.ts`, `ModelsSettings`, `SettingsModal`). Nên làm **trước** khi nối bất kỳ thứ gì khác cần cấu hình; cách làm sạch ở `docs/02` §2.14.

Việc #1 là lớn nhất (khoảng 2–3 ngày công) và nên làm song song với giai đoạn 1 khi backend đã có `/api/health` và job giả.

---

## 3. Rủi ro và cách giảm

| Rủi ro | Mức | Giảm thế nào |
|---|---|---|
| Đổi tên sai làm hỏng code người dùng | **Cao** | AST theo scope, 2 lớp kiểm chứng luôn chạy, `/revert`, bản gốc chỉ đọc, `CHANGES.md`. Không hứa "không bao giờ sai" ở bất kỳ đâu trong UI |
| Chi phí LLM vượt dự kiến của người dùng | Cao | Ước lượng trước khi chạy, trần ngân sách mỗi phiên, cache theo hash, chế độ chỉ-AST |
| Kỳ vọng hỗ trợ mọi ngôn ngữ | Cao | Bảng mức hỗ trợ công khai (`docs/04` §2); chưa hỗ trợ thì **nói rõ**, không im lặng bỏ qua |
| Đa dạng cách chạy dự án (Maven, .NET, Ruby…) | Trung | Bằng chứng + degrade rõ ràng: không có bằng chứng thì không hiện nút Chạy |
| Khác biệt Windows/POSIX (kill cây, quyền tệp, đường dẫn dài) | Trung | CI 2 hệ điều hành; `core/paths.py` dùng `pathlib`; test kill tiến trình trên cả hai |
| Repo monorepo rất lớn | Trung | Ngưỡng 500 MB / 50k tệp + thông báo rõ; đo hiệu năng ở giai đoạn 1 |
| Chất lượng dịch chú thích kỹ thuật | Trung | 5 kiểm tra kết quả; không đạt thì giữ nguyên bản gốc và ghi cảnh báo |
| Prompt injection trong repo | Trung | Backend không có agent tự trị; đầu ra qua kiểm tra hình dạng; fixture test riêng |
| **Người dùng mục tiêu không có Python/Node/git** | **Cao** | Đây là rào cản nhập môn lớn nhất, không phải chi tiết nhỏ: `uv tool install` cần Python có sẵn, chạy thử dự án cần đúng runtime của dự án. Giai đoạn 4 **phải** có đường cài không cần Python (bundle hoặc trình cài tự kiểm tra từng bước) và test trên máy Windows trắng. Trước đó `trolyduan doctor` chỉ nói rõ thiếu gì — không tự cài runtime |
| **Chi phí thật trên repo lớn** | Trung | Ngưỡng nhận là 50.000 tệp nhưng test hiệu năng mới ở 500 tệp; 1.842 chú thích ≈ 46 lô LLM. Cần (a) đo trên fixture 5.000 tệp ngay ở GĐ1, (b) trần chi phí **theo chặng** + ước lượng tiền trước khi bấm, không chỉ trần token cho cả phiên |

---

## 4. Định nghĩa "xong" cho cả dự án

Một phiên được coi là đạt khi, với một dự án Python thật:

- [ ] `origin/` **không đổi một byte** — có test khẳng định.
- [ ] Mọi số trên báo cáo là số đếm thật, kiểm lại được bằng AST.
- [ ] Mỗi chục chỗ rủi ro đều có **một câu lý do** cụ thể và **bằng chứng** (tệp + dòng).
- [ ] Lớp 1 + lớp 2 của kiểm chứng đạt 100%, và `verification.summary` nói đúng sự thật.
- [ ] Người dùng bấm Chạy thì thấy **giao diện thật** của dự án, kèm hướng dẫn sử dụng có thật.
- [ ] Huỷ bất cứ lúc nào đều dừng trong 5 giây và không sót tiến trình con.
- [ ] Không log nào chứa khoá API; không gọi API nào ra ngoài `localhost` ngoài git và nhà cung cấp LLM mà người dùng đã cấu hình.
- [ ] Không màn hình nào phải sửa thêm ngoài **17 việc ở §2**.
- [ ] CI xanh trên Windows và Linux, không cần mạng.

---

## 5. Câu hỏi cần người quyết

1. **Repo riêng tư:** có hỗ trợ ngay ở giai đoạn 1 bằng `GITHUB_TOKEN` trong credential store không, hay để giai đoạn 4?
2. **Ngưỡng kích thước:** 500 MB / 50.000 tệp / 10 MB mỗi tệp đã hợp lý chưa?
3. **`An toàn: Cân bằng`** có được phép tự đổi một số chỗ thuộc nhóm rủi ro không, hay luôn hỏi (mặc định hiện tại: luôn hỏi)?
4. **Docker isolation** (`--isolate docker`) có cần không, hay tiến trình con trên máy người dùng là đủ cho giai đoạn 3?
5. **Giấy phép:** repo chưa có tệp `LICENSE`. Với định hướng miễn phí cho cộng đồng, nên thêm (MIT hoặc Apache-2.0) trước khi mời người ngoài đóng góp — và thêm `CONTRIBUTING.md` + README ở gốc repo.
6. **Ngôn ngữ thứ hai:** sau Python là TypeScript/JavaScript hay Go? (TS/JS nhiều người dùng hơn nhưng tree-sitter khó chính xác bằng LibCST.)
7. **Tên package:** `tro-ly-du-an` / lệnh `trolyduan` có ổn không, hay muốn tên khác trước khi phát hành PyPI?
8. **Tuỳ chọn "Tài liệu: Song ngữ"** ở màn hình đầu: giữ thì phải viết nhánh sinh tài liệu song ngữ (thêm việc ở `transform/docs.py`), bỏ thì xoá khỏi `copy.ts`. Hiện kế hoạch mặc định **giữ** cả hai chế độ vì giao diện đã có sẵn lựa chọn đó.
9. **Ai cài Python cho người không biết lập trình?** Nếu câu trả lời là "tự họ cài" thì persona mục tiêu không còn đúng — và bản cộng đồng đầu tiên nên giới hạn ở "repo Python chạy được bằng Python đã đóng gói sẵn". Câu này chặn phạm vi đóng gói ở GĐ4.
10. **Đo thành công bằng gì khi đã tuyên bố không telemetry?** Không đo được tỉ lệ bỏ cuộc ở màn hình đầu và tỉ lệ chạy thử thành công thì dựa vào đâu để biết GĐ1 đáng phát hành? (Gợi ý không xâm phạm: một dòng trong `CHANGES.md` mời người dùng tự gửi phản hồi, cộng số liệu họ tự xem trong `/api/doctor`.)
11. **Có chấp nhận "không đổi tên" làm sản phẩm chính?** Nếu đổi tên trên Python động là rủi ro cao nhất mà giá trị với người không đọc code là thấp nhất, vì sao nó vẫn ở GĐ2 thay vì sau 1.0 — và có nên để mặc định là **chỉ đọc báo cáo**, còn sửa code là lựa chọn chủ động?
