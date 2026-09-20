# 09 — Lộ trình

Nguyên tắc xếp thứ tự: (1) **giá trị sớm nhất** — phần chạy được không cần khoá AI làm trước, để bản phát hành đầu tiên đã có ích cho cộng đồng; (2) **rủi ro giảm dần** — làm phần dễ sai trước khi có người dùng thật; (3) **mỗi giai đoạn tự đứng được** — kết thúc giai đoạn nào là có thứ phát hành được ở đó.

Ước lượng là **ngày công của một người đã quen codebase**, không phải lịch. Cộng lại khoảng **45–60 ngày công** cho tới bản 1.0.

---

## Giai đoạn 0 — Khung chạy được (≈5–7 ngày)

**Mục tiêu:** mở được giao diện thật ở `127.0.0.1:8686`, có job giả chạy qua SSE. Chưa có nghiệp vụ gì.

| Việc | Ở đâu |
|---|---|
| `pyproject.toml`, package, entry point `trolyduan` | `README.md` §3 |
| `cli.py serve/doctor/version`, `app.py` + mount `Frontend/dist` | `docs/01` §7 |
| Middleware token + Origin + bind 127.0.0.1 | `docs/08` §4 |
| `core/{settings,paths,errors,logging}` | `docs/01` §2 |
| `store/db.py` + migration 001 | `docs/08` §1 |
| `jobs/runner.py` + SSE (job giả 3 bước, huỷ được) | `docs/08` §2 |

**Ra được:** một bản chạy được để cả nhóm nhìn thấy đường đi; frontend nối được SSE thật.

**Nghiệm thu:** `uv run trolyduan serve` mở giao diện; job giả hiện tiến trình trên màn Reading; bấm Huỷ dừng dưới 1 giây; gọi API từ Origin lạ bị 403.

---

## Giai đoạn 1 — Đọc hiểu dự án, không cần AI (≈12–16 ngày)

**Mục tiêu:** từ link GitHub / thư mục / `.zip` tới màn **Result** và **Clean** với số liệu **thật**, hoàn toàn bằng AST. Đây là giai đoạn có giá trị cộng đồng cao nhất trên mỗi ngày công, vì nó chạy được ngay cả khi người dùng chưa có khoá AI.

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
| Nối frontend: `demo.ts` → client API thật | danh sách ⚠️ bên dưới |

**Ra được:** bản phát hành đầu tiên cho cộng đồng — *"đưa dự án vào, biết ngay nó có bao nhiêu tên biến khó đọc, bao nhiêu chú thích cần dịch, chỗ nào chạm cấu hình máy chủ"*, không tốn một đồng API.

**Nghiệm thu:** fixture 500 tệp cho đúng 217 định danh / 1.842 chú thích / 12 mục rủi ro kèm bằng chứng; phân tích dưới 60 giây; `origin/` không đổi một byte; màn Result và Clean hiện số thật.

---

## Giai đoạn 2 — AI vào cuộc: tóm tắt, đổi tên, dịch, kiểm chứng (≈12–16 ngày)

**Mục tiêu:** màn **Working** và **Done** với kết quả thật, có kiểm chứng.

| Việc | Ở đâu |
|---|---|
| `llm/` 4 adapter + router + budget + cache + khám phá model | `docs/07` §4 |
| `llm/prompts/` 5 prompt có phiên bản + `sanitize` chống injection | `docs/07` §4.5–4.6 |
| Credential store thật + `redact()` + API credential | `docs/07` §3 |
| Config store thật + `/api/config` + import từ frontend | `docs/07` §2 |
| `transform/rename.py` (LibCST theo scope) | `docs/05` §2 |
| `transform/translate.py` (lô + 5 kiểm tra kết quả) | `docs/05` §3 |
| `writer.py` atomic + `before_text` + diff + `/revert` | `docs/05` §1, §6 |
| `verify/` 3 lớp + `summary` 4 giá trị | `docs/05` §7 |
| `GET …/changes`, `/verification`, `POST …/apply`, `/revert` | `docs/02` |
| Trạng thái suy giảm khi không có khoá AI (`analysis.degraded`) | `docs/07` §4.7 |

**Ra được:** sản phẩm đúng như lời hứa với người dùng — đổi tên, dịch chú thích, và nói thật về việc đã kiểm chứng được tới đâu.

**Nghiệm thu:** fixture Python chạy hết luồng tới màn Done; lớp 1 + lớp 2 đạt 100%; fixture "sửa hỏng" bị phát hiện (không được báo `passed`); `revert` khôi phục hash khớp `manifest.json`; fixture prompt injection không gây tác dụng phụ.

---

## Giai đoạn 3 — Chạy thử dự án (≈8–12 ngày)

**Mục tiêu:** màn **Run** chạy thật — quét lệnh, cài, khởi động, khung xem trước, hướng dẫn sử dụng, dừng sạch.

| Việc | Ở đâu |
|---|---|
| `run/ports.py`, `run/process.py` (log theo dòng, cổng mở, timeout, kill cây) | `docs/06` §5–6 |
| Bước "chuẩn bị dữ liệu mẫu" (venv/migrate/seed) | `docs/06` §3 |
| `run/proxy.py` (HTTP + WebSocket + `<base>` + dải thông báo) | `docs/06` §7 |
| `run/usage.py` (hướng dẫn từ bằng chứng) | `docs/06` §8 |
| Dừng/dọn dẹp + handler khi thoát app | `docs/06` §9 |
| Frontend: `previewSrc` + bỏ `allow-same-origin` | `docs/06` §7 ⚠️ |

**Ra được:** vòng tròn khép kín — sửa xong thì thấy dự án chạy, kèm hướng dẫn cho người không biết lập trình.

**Nghiệm thu:** fixture Flask và Vite mini chạy hết 4 bước, giao diện hiện trong khung xem trước, Dừng đóng cổng trong 5 giây, không sót tiến trình con; dự án thiếu bằng chứng thì **không** hiện nút Chạy mà nói rõ lý do.

---

## Giai đoạn 4 — Hoàn thiện cho cộng đồng (≈8–10 ngày)

| Việc | Ở đâu |
|---|---|
| `transform/docs.py` 8 tệp tài liệu tiếng Việt | `docs/05` §4 |
| `/export.zip` + `/report.html` (in ra PDF) + `CHANGES.md` | `docs/02` §2.13 |
| Lịch sử phiên, xoá phiên, `trolyduan clean` | `docs/08` §7 |
| Phản hồi người dùng thành dữ liệu (`feedback`, `proposals`) | `docs/08` §1 |
| `trolyduan doctor` + hiện ở lần chạy đầu | `docs/08` §9 |
| Đóng gói: wheel kèm static, CI 2 hệ điều hành, phát hành PyPI | `docs/08` §5 |
| README gốc repo + `LICENSE` + `CONTRIBUTING` | câu hỏi mở §5 |
| Ngôn ngữ thứ hai (TS/JS) ở mức đổi tên | `docs/04` §2 |

**Ra được:** bản 1.0 cài bằng một lệnh, có tài liệu, có giấy phép, có đường cho người đóng góp.

---

## 1. Tổng hợp

| Giai đoạn | Ngày công | Phát hành được gì | Phụ thuộc |
|---|---|---|---|
| 0 — Khung | 5–7 | Bản chạy nội bộ | — |
| 1 — Đọc hiểu (AST) | 12–16 | **Bản cộng đồng đầu tiên, không cần khoá AI** | GĐ 0 |
| 2 — AI + biến đổi + kiểm chứng | 12–16 | Sản phẩm đúng lời hứa | GĐ 1 |
| 3 — Chạy thử | 8–12 | Vòng tròn khép kín | GĐ 2 (dùng lại `entrypoints`) |
| 4 — Hoàn thiện | 8–10 | Bản 1.0 | GĐ 3 |

---

## 2. Việc phía frontend (phụ thuộc, không nằm trong ước lượng trên)

Rà soát toàn bộ giao diện hiện tại, đây là **tất cả** những gì frontend phải sửa để nối backend — không có gì khác:

| # | Việc | Vì sao |
|---|---|---|
| 1 | `demo.ts` → client gọi API (`landing` → `POST /sessions`, `projects` → `GET /projects`, `analysis` → `GET /analysis`, `riskyItems` → `analysis.riskyItems`, `demoRun` → `analysis.runScan`) | Toàn bộ dữ liệu mẫu là hợp đồng tạm |
| 2 | Ba dropdown ở `Landing.tsx` gửi kèm khi tạo phiên | Hiện là `useState` **không đi đâu cả** — người dùng chọn mà hệ thống không biết |
| 3 | `Project.statusLabel/tone` → map từ `state` + `riskyCount` trong `copy.ts` | Backend trả enum, frontend sở hữu câu chữ |
| 4 | `ProjectRun.install/start` bỏ `label`, thêm `evidence` | Nhãn là câu chữ của frontend; `evidence` là bằng chứng để mở "Vì sao?" |
| 5 | Màn Done: 4 nhánh theo `verification.summary` | Hiện hard-code *"dự án vẫn chạy tốt, không lỗi"* — sẽ nói sai khi `not_run` |
| 6 | `screens/Run.tsx`: `previewSrc` = `/preview/<id>/`, bỏ `allow-same-origin`, "Mở trong tab mới" dùng `directAddress` | Proxy cùng origin; bỏ cờ sandbox để code người dùng không chạm app |
| 7 | `config/store.ts`: cắm `ServerBackend` + import document `localStorage` cũ **một lần** | Không thì người dùng đang dùng bản demo mất hết cấu hình |
| 8 | Màn Result: hiện câu thông báo khi `analysis.degraded` (chưa có khoá AI) | Chế độ chỉ-AST là trạng thái bình thường, không phải lỗi |
| 9 | Sidebar: nút "Xoá phiên này" (tuỳ chọn) | Vòng đời dữ liệu trên máy người dùng |
| 10 | Dọn `index.html`: bỏ `?mode=expert` + `repo-agent.uiMode` | Tàn dư của chế độ Chuyên gia đã xoá |

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
| Người dùng không có git/node/python | Thấp | `trolyduan doctor` nói rõ thiếu gì, kèm câu giải thích; không tự cài runtime |

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
- [ ] Không màn hình nào phải sửa thêm ngoài 10 việc ở §2.
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
