# Frontend Plan v2 — Hai chế độ: Đơn giản & Chuyên gia

> **Trạng thái:** bản viết lại, thay thế `frontend.md` cũ (đã xoá).
> **Người dùng chính:** khách hàng / người ngoài hoàn toàn không biết lập trình.
> **Mockup tham chiếu:** `mockups/01-man-hinh-dau-light.png` … `mockups/05-loi-khong-mo-duoc-light.png` (mặc định sáng), bản tối cùng tên với hậu tố `-dark`.
> **Palette chung:** `mockups/_theme.css` — file token duy nhất cho cả hai theme, giữ lại làm tham chiếu khi code. Các file HTML dựng mockup đã xoá; ảnh PNG là bản chốt.
> **Giao diện mặc định: SÁNG** (xem §10).

---

## 1. Vì sao viết lại

Bản spec cũ dài 2.252 dòng, 87 mục, và giao diện triển khai đúng theo nó: **9 tab ngang hàng** (Overview · Code · Diff · Architecture · Changes · Validation · Trace · Metrics · Documentation), 3 panel, 5 chế độ sơ đồ, một modal Settings hỏi model AI và PEP-8. Kết quả là một sản phẩm cho **kỹ sư**, không phải cho khách hàng.

Điểm đáng chú ý: bản cũ **tự nó đã biết** phải giấu phần kỹ thuật (§2: *"Advanced observability exists, but normal UX should not be dominated by agent internals"*, *"Progressive disclosure"*). Nhưng nó chỉ ghi điều đó bằng chữ — không có persona, không có tier, không có cơ chế nào bắt buộc. §11 xếp Trace/Metrics vào nhóm "Advanced" mà không định nghĩa "Advanced" nghĩa là gì, nên khi code thì chúng thành tab ngang hàng Overview.

**Kết luận cho bản v2:** vấn đề không phải "quá kỹ thuật" mà là **thiếu phân tầng người dùng**. Bản v2 sửa đúng chỗ đó: hai chế độ, một codebase.

---

## 2. Nguyên tắc

1. **Mặc định là Đơn giản.** Người dùng không phải chọn gì để bắt đầu. Chuyên gia là lựa chọn chủ động.
2. **Một codebase, không fork.** Hai giao diện dùng chung state, chung API, chung component; khác nhau ở **thứ được hiển thị** và **ngôn ngữ hiển thị**.
3. **Không rò rỉ thuật ngữ.** Ở chế độ Đơn giản, không có AST, token, latency, cost, confidence, reference count, trace, IR, wave, checkpoint, PEP-8.
4. **Chỉ hỏi khi thật sự rủi ro.** Việc an toàn thì tự làm và báo cáo sau. Việc có thể làm hỏng máy chủ thì mới hỏi.
5. **Không có màn hình cụt.** Mọi trạng thái — kể cả rỗng, lỗi, thành công một phần — đều phải có việc để bấm tiếp.
6. **Không có con số vô nghĩa.** "12.482 symbols" hay "confidence 91.4%" không giúp người dùng ra quyết định. Đổi thành câu.
7. **Bản gốc không bao giờ bị ghi đè.** Luôn nói rõ điều này ở màn kết quả.
8. **Tiến trình phải thật.** Đếm theo đơn vị việc ("342/500 tệp"), không dùng "AI đang nghĩ… 63%".

---

## 3. Hai chế độ

### 3.1 Ai dùng chế độ nào

| | **Đơn giản** | **Chuyên gia** |
|---|---|---|
| Người dùng | Khách hàng, người ngoài hoàn toàn | Kỹ sư, người review code |
| Biết code? | Không | Có |
| Mục tiêu | "Làm cho dự án này dễ hiểu và sạch hơn" | "Kiểm soát từng thay đổi và xem bằng chứng" |
| Ngôn ngữ UI | **Tiếng Việt 100%** (kể cả nhãn nút) | Thuật ngữ tiếng Anh được phép |
| Số màn hình | 7 | 9 tab + panel |

### 3.2 Chuyển chế độ

- Nút gạt ở góc phải header: `Đơn giản | Chuyên gia` (đã có trong mockup).
- Lưu vào `localStorage`; mặc định `simple` khi chưa có gì.
- Hỗ trợ `?mode=expert` cho dev/demo và deep-link.
- Đổi chế độ **không làm mất** trạng thái đang xem (cùng dự án, cùng mục đang chọn).
- Chế độ Chuyên gia **không được** tự bật. Không có "bạn có muốn thử chế độ chuyên gia?" làm phiền người dùng phổ thông.

### 3.3 Bảng đối chiếu

| Khu vực | Đơn giản | Chuyên gia |
|---|---|---|
| Nhập dự án | Kéo–thả thư mục / `.zip` / dán link GitHub | + đường dẫn nội bộ, branch, chọn engine |
| Cấu hình | 3 dropdown ngay trên màn hình đầu | + model AI, thinking effort, retry, guard rules |
| Tiến trình | 1 progress bar + checklist tiếng Việt | + log thô, AST/LibCST, graph confidence |
| Kết quả phân tích | 3–4 câu văn + số việc cụ thể | + bảng thống kê, phân bố rủi ro theo số |
| Duyệt thay đổi | Tự duyệt nhóm an toàn; chỉ hỏi nhóm rủi ro | Từng item, kèm references/tests count |
| Sơ đồ kiến trúc | 1 sơ đồ, không confidence | 5 chế độ (Architecture/Workflow/Sequence/Data Flow/Lifecycle) + evidence |
| Trace / Metrics | **Ẩn hoàn toàn** | Đầy đủ |
| Chi tiết kỹ thuật | Thu gọn sau `Xem chi tiết kỹ thuật ▾` | Mở sẵn |
| Override trạng thái | Không có | Có (đặt tên "Demo/QA") |

---

## 4. Capability registry — nguồn sự thật duy nhất

Mọi màn hình, tab, nút đều khai báo tier trong **một** file cấu hình. Component không tự quyết định ẩn/hiện.

```ts
// src/config/capabilities.ts
export type Tier = 'core' | 'advanced' | 'expert';

export const CAPABILITIES = {
  landing:            { tier: 'core' },
  analysisProgress:   { tier: 'core' },
  resultSummary:      { tier: 'core' },
  changeReview:       { tier: 'core' },
  exportZip:          { tier: 'core' },
  chat:               { tier: 'core' },

  fileTree:           { tier: 'advanced' },
  codeViewer:         { tier: 'advanced' },
  diffViewer:         { tier: 'advanced' },
  validationSummary:  { tier: 'advanced' },

  architectureModes:  { tier: 'expert' },   // 5 chế độ sơ đồ
  archConfidence:     { tier: 'expert' },
  evidencePanel:      { tier: 'expert' },
  traceViewer:        { tier: 'expert' },
  metricsDashboard:   { tier: 'expert' },
  rawLogs:            { tier: 'expert' },
  modelSettings:      { tier: 'expert' },
  statusOverride:     { tier: 'expert' },   // QA/demo
} as const;
```

Quy tắc render: `<CapabilityGate tier="expert">…</CapabilityGate>`. Ở chế độ Đơn giản, tính năng `expert` **không được render** — không dùng cách làm mờ hay disable, vì vẫn gây nhiễu.

`uiMode` nằm trong `AppContext`:

```ts
uiMode: 'simple' | 'expert'   // mặc định 'simple'
```

---

## 5. Chế độ Đơn giản — 7 màn hình

> Số liệu trong mockup (428 tệp, 217 tên biến, 1.842 chú thích, 12 chỗ rủi ro) là **dữ liệu mẫu** của dự án demo `awesome-api`, không phải hằng số của spec.

### 5.1 Màn hình đầu — `mockups/01-man-hinh-dau.png`

Bố cục chat-first, học từ DeepSeek Harness: sidebar lịch sử bên trái, cột nội dung giữa, không dashboard.

- Sidebar: `＋ Dự án mới`, danh sách dự án gần đây kèm trạng thái bằng chữ (`Đã xong`, `Đang chạy`, `Cần bạn xem 12 chỗ`).
- Tiêu đề: *"Bạn muốn làm gì với dự án này?"* — một câu, không phải khẩu hiệu marketing.
- Ô nhập: `Dán link GitHub, hoặc kéo thả thư mục dự án vào đây…`
- **Settings nằm ngay đây**, không có wizard nhiều bước:
  | Dropdown | Lựa chọn | Mặc định |
  |---|---|---|
  | Tài liệu | Tiếng Việt / Song ngữ / Giữ nguyên | Tiếng Việt |
  | Chú thích | Tiếng Việt / Giữ nguyên | Tiếng Việt |
  | An toàn | Cao nhất / Cân bằng | Cao nhất |
- 3 thẻ việc nhanh, một cú nhấp là chạy:
  1. Dịch chú thích và viết tài liệu tiếng Việt
  2. Đổi tên biến tiếng Trung sang tiếng Anh *(ghi rõ: có 12 chỗ sẽ hỏi bạn trước)*
  3. **Làm tất cả** — gắn nhãn `KHUYÊN DÙNG`, được chọn sẵn
- Dòng trấn an cuối: *"Bạn không cần cấu hình gì thêm — hệ thống sẽ hỏi bạn trước khi làm việc gì có rủi ro."*

**Đã bỏ so với bản cũ:** wizard cấu hình, modal Settings (model AI, PEP-8, guard rules), 5 checkbox pipeline, badge "v2.4 AST Engine", mô tả "Ground-truth AST analysis, reference-safe renaming…".

### 5.2 Đang xử lý — `mockups/02-dang-xu-ly.png` (nửa trên)

- Bong bóng người dùng: link vừa dán.
- Thẻ tiến trình: `Đang đọc dự án của bạn…`
  - 1 progress bar + `Đã đọc 342 / 500 tệp` + `Còn khoảng 1 phút`
  - Checklist tiếng Việt: `✓ Đã mở và đọc toàn bộ tệp` / `✓ Đã nhận ra dự án viết bằng gì` / `◐ Đang tìm những tên biến cần đổi…` / `○ Sắp xếp lại chú thích và viết tài liệu` / `○ Xem cách cài đặt và khởi động để bạn chạy thử được`
- **Không có** console log thô, không AST parser progress, không "Graph confidence: 91.4%".

### 5.3 Kết quả phân tích — `mockups/02-dang-xu-ly.png` (nửa dưới)

- Tiêu đề: *"Mình đã hiểu dự án của bạn"*.
- 3 gạch đầu dòng bằng văn xuôi, mỗi dòng nói **việc cần làm**, không nói chỉ số:
  - Dự án là gì và làm được gì
  - Có bao nhiêu tên biến cần đổi, vì sao khó đọc
  - Có bao nhiêu chú thích cần dịch, trong đó bao nhiêu chỗ sẽ hỏi trước
- Nút chính: `Bắt đầu xử lý — an toàn`. Nút phụ: `Xem chi tiết`.
- Ô chat dưới cùng: `Hỏi về dự án này…` kèm gợi ý câu hỏi thật.

### 5.4 Xong & tải về — `mockups/03-xong-va-tai-ve.png`

- Thẻ thành công: *"Xong rồi! Dự án của bạn đã sẵn sàng."* + 4 dòng kết quả và **1 dòng quan trọng nhất**: `✓ Đã kiểm tra: dự án vẫn chạy tốt, không lỗi`.
- Khối `Còn 12 chỗ cần bạn quyết định` — chỉ những chỗ đã chạm vào cấu hình/máy chủ:
  - Hiện tên khoá, tệp, và **lý do bằng một câu**: *"Tên này đang được 3 tệp cấu hình máy chủ dùng để kết nối cơ sở dữ liệu. Nếu đổi tên, máy chủ có thể không kết nối được nữa."*
  - Hai nút: `Giữ nguyên (khuyên dùng)` / `Vẫn đổi tên`. Mặc định nghiêng về giữ nguyên.
  - `Xem 10 chỗ còn lại ›` — không đổ hết một lúc.
- Khối `Xem lại từng thay đổi mình đã làm` (217 thay đổi) — tuỳ chọn, có ghi *"không cần xem nếu bạn tin mình"*.
- Nút chính `Tải dự án về máy (.zip)`, phụ `Mở báo cáo chi tiết (PDF)`, kèm dòng `Bản gốc vẫn được giữ nguyên, không bị ghi đè`.

**Đã bỏ:** bảng phân bố rủi ro `184 Low / 21 Med / 12 High`, danh sách 217 thay đổi đổ ra ngay, `AST Syntax Integrity`, `Reference Integrity 100%`, `Validation timeline`, `Transformation waves`.

### 5.5 Trạng thái rỗng — `mockups/04-khong-co-gi-can-sua.png`

Bắt buộc phải có, vì đây là kết quả rất thường gặp và nếu để trắng thì người dùng tưởng app lỗi.

- *"Dự án của bạn đã sạch rồi!"* + *"Mình đã đọc hết 428 tệp và không tìm thấy gì cần sửa. Bạn không cần làm gì cả."*
- 4 dòng đã kiểm: đọc toàn bộ tệp / tên biến đã là tiếng Anh / chú thích đã rõ ràng / cấu hình an toàn.
- **Luôn có ít nhất một việc để bấm tiếp.** Ở mockup là: `Viết tài liệu tiếng Việt cho dự án` (8 tệp, không sửa một dòng code) + `Hỏi mình về dự án này`.
- Kết: *"Mình không sửa những thứ không cần sửa — dự án của bạn vốn đã tốt."*

### 5.6 Trạng thái lỗi — `mockups/05-loi-khong-mo-duoc.png`

- Không stack trace, không mã lỗi ở chỗ dễ thấy.
- Nguyên nhân bằng tiếng thường: *"Link bạn dán đang ở chế độ riêng tư (private), nên mình không có quyền xem nội dung bên trong."*
- Trấn an ngay dưới: *"Dự án của bạn không bị ảnh hưởng gì — mình chỉ chưa đọc được nó thôi."*
- Ba đường thoát: `Thử lại` / `Chọn thư mục trên máy` / `Dán link khác`.
- Khối trợ giúp: *"Không chắc link của bạn đang ở chế độ nào? Mở link đó bằng trình duyệt bình thường. Nếu bạn xem được nội dung thì mình cũng xem được."*
- Chi tiết kỹ thuật thu gọn sau `Xem chi tiết kỹ thuật ▾` (`HTTP 403 · repository is private · …`).
- Kết: *"Không có gì bị hỏng cả. Dự án của bạn vẫn nguyên vẹn ở chỗ cũ."*

**Thành công một phần** (đọc được 425/428 tệp) dùng cùng khuôn: một dòng nói thiếu bao nhiêu tệp, một câu khẳng định *"không ảnh hưởng kết quả"*, và hai nút `Tiếp tục` / `Xem tệp bị bỏ qua`.

### 5.7 Chạy thử dự án — `tools/screens/11-run-ready.png`, `12-run-live.png`

Lối vào: thẻ `Chạy thử dự án ngay trên trình duyệt` nằm ngay dưới thẻ thành công ở màn §5.4 — chỗ mắt người dùng dừng lại sau khi đọc *"dự án vẫn chạy tốt, không lỗi"*. Một màn, ba chặng:

**Chặng 1 — kết quả quét.** Hệ thống đọc tệp hướng dẫn và tệp cấu hình trong dự án để trả lời ba câu, bằng tiếng Việt, không thuật ngữ:

| Hiển thị | Ví dụ (dữ liệu mẫu) |
|---|---|
| Dự án viết bằng | `Python · Django` |
| Máy cần có | `Python 3.11 trở lên` |
| Cài đặt | `pip install -r requirements.txt` — kèm nút `Sao chép` |
| Khởi động | `python manage.py runserver` — kèm nút `Sao chép` |
| Mở ở đâu | `http://127.0.0.1:8000` |

Hai dòng cảnh báo chỉ hiện khi có thật: tệp `.env` chỉ có bản mẫu (nên dữ liệu nhìn thấy là dữ liệu mẫu), chưa có tài khoản quản trị (nên hệ thống tạo một tài khoản mẫu). Không giấu chỗ này — người dùng phải biết cái gì là tạm.

**Chặng 2 — đang chạy.** Cùng khuôn với màn §5.2: checklist theo việc thật (`Đang cài các thư viện cần thiết` → `Đang chuẩn bị dữ liệu mẫu` → `Đang khởi động dự án` → `Đang mở giao diện`), có `Huỷ`, không phần trăm ước lượng.

**Chặng 3 — giao diện + cách sử dụng.** Khung giả lập cửa sổ trình duyệt chứa giao diện dự án đang chạy, kèm `Mở trong tab mới` và `Dừng dự án`. Dưới khung là `Cách sử dụng` — 3–4 bước viết cho người dùng cuối (mở địa chỉ nào, bấm gì, tài khoản mẫu, trang quản trị ở đâu), lấy từ chính kết quả quét chứ không phải văn bản chung.

Chạy thử **không sửa gì** trong dự án; dòng trấn an cuối màn nói rõ điều đó.

> **Hiện trạng code:** chưa nối backend, nên chặng 2 mô phỏng bằng timer và khung xem trước trỏ vào trang mẫu `public/preview-demo.html`. Khi nối API: thay bằng trạng thái thật từ server, và phục vụ bản xem trước từ **một cổng khác** với app (backend cấp, ví dụ `http://127.0.0.1:8687`) rồi **giữ nguyên** `allow-same-origin` trong `sandbox` của iframe — khác origin thì trình duyệt đã tách app khỏi dự án, còn bỏ cờ đó sẽ làm chính dự án mất `localStorage`. Cùng origin mà vẫn `allow-same-origin` thì JS của dự án đọc được token và cấu hình của app, nên tuyệt đối tránh (`src/screens/Run.tsx`).

---

## 6. Chế độ Chuyên gia

Giữ nguyên những gì đã có trong `Frontend/src`, bổ sung phần bị cắt khỏi chế độ Đơn giản:

- 9 tab: `Overview · Code · Diff · Architecture · Changes · Validation · Trace · Metrics · Documentation`.
- Panel trái (chat/session/task/activity), panel phải (Inspector: symbol, config, impact, evidence), Focus mode + chat drawer.
- Architecture: 5 chế độ sơ đồ, confidence + evidence, quan hệ `verified` / `inferred` / `draft`.
- Trace: cây thực thi, model, token, retry, artifact.
- Metrics: LLM calls, latency, estimated cost.
- Chi tiết kỹ thuật mở sẵn, `Override Status` (đặt tên `Demo/QA`), chọn model AI và mức suy luận.

Nguyên tắc giữ nguyên từ bản cũ: **frontend không tự suy luận ngữ nghĩa repo**. Backend/knowledge layer là nguồn sự thật; frontend chỉ hiển thị, lọc, điều hướng, đồng bộ vùng chọn và xin giải thích.

---

## 7. Luồng

### 7.1 Đơn giản

```
Màn hình đầu
   │  (kéo thả / dán link / bấm 1 trong 3 thẻ)
   ▼
Đang đọc dự án        ← progress theo tệp, có nút Huỷ
   │
   ├── Không mở được ──────────► Màn lỗi ──► Thử lại / chọn thư mục / link khác
   │
   ▼
Mình đã hiểu dự án của bạn
   │
   ├── Không có gì cần sửa ────► Màn rỗng ──► Viết tài liệu tiếng Việt
   │
   ▼  [Bắt đầu xử lý — an toàn]
Đang xử lý
   │
   ▼
Xong rồi!
   ├── Nhóm an toàn: đã tự làm xong
   └── Nhóm rủi ro: chỉ hỏi những chỗ chạm cấu hình/máy chủ
   │
   ├── [Chạy thử dự án] ──► Đang chạy dự án ──► Giao diện đang chạy + Cách sử dụng (§5.7)
   │
   ▼
[Tải dự án về máy (.zip)]  ·  [Mở báo cáo chi tiết]
```

### 7.2 Chuyên gia

Giữ luồng của bản cũ: `Landing → Analyzing → Analysis Review → Planning → Transforming → Verifying → Documentation → Complete → Export`, nhưng điều hướng tự do bằng tab thay vì bắt buộc theo tuần tự.

---

## 8. Quy tắc ngôn ngữ (chế độ Đơn giản)

Đây là phần dễ sai nhất khi code, nên bắt buộc tuân theo bảng dưới. Chuỗi hiển thị nằm trong `src/copy.ts` (đối tượng `S`); **không** nhét chuỗi trực tiếp trong JSX.

| Đừng viết | Viết |
|---|---|
| AST analysis, LibCST parsing | Đang đọc và hiểu code của bạn |
| Non-English identifiers | Tên biến và hàm viết bằng tiếng Trung |
| Reference integrity 100% | Đã kiểm tra: không chỗ nào bị lỗi liên kết |
| Risk: HIGH / MEDIUM / LOW | Rủi ro cao / Cần xem lại / An toàn |
| Confidence 91.4% | (bỏ hẳn — không có con số này ở chế độ Đơn giản) |
| Configuration contract | Cấu hình máy chủ / biến môi trường |
| External exposure: YES | Đang được máy chủ bên ngoài dùng |
| Transformation pipeline | Việc sẽ làm |
| Validation wave / checkpoint | (bỏ hẳn) |
| Agent swarm execution trace | (chỉ có ở chế độ Chuyên gia) |
| Đóng (Cancel) | Huỷ |
| Lưu Cấu Hình (Save) | Lưu |

Thêm ba quy tắc:

1. **Không trộn hai ngôn ngữ trong một nhãn.** Bản cũ có nút ghi `Đóng (Cancel)` và `Lưu Cấu Hình (Save)`.
2. **Không lộ tên trạng thái nội bộ.** Bản cũ có nhãn `State C: Decision Review` hiện ra cho người dùng.
3. **Xưng hô thống nhất:** hệ thống gọi mình là *"mình"*, gọi người dùng là *"bạn"*. Không "quý khách", không "người dùng".

---

## 9. Niềm tin & an toàn

- **Nhóm an toàn tự làm, nhóm rủi ro mới hỏi.** Ngưỡng do backend quyết định và trả về nhóm, frontend không tự đoán.
- **Mặc định nghiêng về an toàn.** Nút khuyên dùng luôn là `Giữ nguyên`.
- **Giải thích được.** Mỗi đề xuất và mỗi mục rủi ro đều có `Vì sao?` mở ra một câu lý do cụ thể, không phải một điểm số.
- **Bản gốc bất khả xâm phạm.** Nói rõ ở màn kết quả; và luôn xuất kèm báo cáo thay đổi.
- **Có thể phản đối.** Mỗi thay đổi có `Báo cáo vấn đề` với các lựa chọn: dịch sai / đặt tên sai / không nên đổi / phân tích tác động sai / cần giải thích thêm / khác. Phản hồi được lưu thành dữ liệu của dự án, không phải tin nhắn chat trôi mất.

---

## 10. Giao diện sáng / tối

**Mặc định là SÁNG.** Lý do: persona chính là khách hàng / người ngoài hoàn toàn — nền tối mặc định vừa xa lạ, vừa gợi cảm giác "công cụ của dev". Đây cũng là khác biệt lớn nhất so với code hiện tại: `Frontend/src` đang **hard-code toàn bộ palette tối**.

### Quy tắc

- Hai theme: `light` (mặc định) và `dark`.
- Nút đổi theme nằm cạnh công tắc `Đơn giản | Chuyên gia` trên header (đã có trong mockup).
- Lưu lựa chọn vào `localStorage`. Chưa có lựa chọn → dùng `light`. **Không** tự chạy theo `prefers-color-scheme`, vì mặc định phải xác định được, không phụ thuộc máy người dùng.
- **Chống nhấp nháy:** gắn `data-theme` lên `<html>` bằng script inline trong `<head>`, chạy **trước** khi render. Không đặt theme trong `useEffect` — sẽ thấy một nháy trắng hoặc đen khi tải trang.
- Theme độc lập với chế độ: cả 4 tổ hợp (sáng/tối × đơn giản/chuyên gia) đều phải đúng. Không có chuyện "tối chỉ dành cho dev".
- Cả hai theme dùng chung bố cục và chung kích thước; chỉ đổi màu.

### Design tokens — bắt buộc

Không viết mã màu trực tiếp trong component. Khai báo token một lần, hai bộ giá trị:

```css
:root{
  --bg:#ffffff; --panel:#ffffff; --soft:#f6f8fa;
  --border:#d8dee4; --text:#1f2328; --text-3:#6e7781;
  --accent:#4f46e5; --green:#1a7f37; --amber:#9a6700; --red:#cf222e;
}
:root[data-theme="dark"]{
  --bg:#0d1117; --panel:#161b22; --soft:#0d1117;
  --border:#30363d; --text:#e6edf3; --text-3:#8b949e;
  --accent:#4f46e5; --green:#3fb950; --amber:#e3b341; --red:#f85149;
}
```

Mockup đã được render đúng theo cách này: chỉ đổi `data-theme` trên `<html>` là ra hai theme, không sửa một dòng bố cục nào. `mockups/_theme.css` được giữ lại làm tham chiếu token cho lúc code.

### Hiện trạng phải sửa

| Đo trên `Frontend/src` | Số |
|---|---|
| Mã màu hex hard-code | **797** |
| Trong đó viết dưới dạng Tailwind arbitrary value (`bg-[#...]`, `border-[#...]`) | **740** |
| Chỉ 4 mã màu đã chiếm | **737 lần** — `#30363d`, `#0d1117`, `#21262d`, `#161b22` |

Nghĩa là: thêm light mode **không phải thêm một file CSS**, mà là thay 797 chỗ bằng token. Tin tốt: vì 737 lần chỉ thuộc 4 mã màu nền/viền, việc thay thế mang tính cơ học, làm theo từng file được, không phải viết lại component.

### Yêu cầu tương phản

- Chữ thường ≥ 4.5:1, chữ lớn ≥ 3:1 (WCAG AA) — kiểm tra **cả hai** theme, không chỉ theme mới.
- Màu ngữ nghĩa phải có hai giá trị khác nhau, không dùng chung một mã: xanh lá `#3fb950` trên nền tối nhưng `#1a7f37` trên nền sáng; vàng `#e3b341` / `#9a6700`; đỏ `#f85149` / `#cf222e`.
- **Không dùng màu làm kênh thông tin duy nhất.** Trạng thái phải kèm chữ — mockup đã làm vậy: `Đã xong`, `Cần bạn xem 12 chỗ`, `Không mở được`. Người khó phân biệt màu vẫn đọc được.
- **Kiểm icon/emoji trên nền sáng.** Emoji phẳng của Windows bị nhạt trên nền trắng; ở mockup, 🌐 và 🔤 hơi nhạt so với nền. Chỗ nào nhạt thì thay bằng icon SVG nét thay vì emoji.

---

## 11. Kiến trúc frontend

Cây thư mục thật của `Frontend/src` — mỗi tệp một trách nhiệm, tên tệp nói đúng việc nó làm:

```
src/
├── main.tsx                 điểm vào
├── App.tsx                  UiProvider + khung luồng + modal Cài đặt
├── index.css                design token — nguồn màu duy nhất
│
├── types.ts                 kiểu dữ liệu của luồng (Stage, Project, ProjectRun…)
├── copy.ts                  toàn bộ chuỗi hiển thị (S) — không viết chuỗi trong JSX
├── demo.ts                  dữ liệu mẫu; nối backend thì thay bằng API
│
├── screens/                 8 màn hình, mỗi màn hình một tệp
│   Landing · Reading · Result · Working · Done · Run · Clean · Failed
│
├── components/
│   ├── ProjectFlow.tsx      khung luồng: stage + thanh trên + danh sách dự án
│   ├── Header.tsx           thanh trên cùng (nút Cài đặt, đổi theme)
│   ├── Sidebar.tsx          danh sách dự án gần đây
│   ├── TopControls.tsx      nút đổi giao diện sáng/tối
│   ├── ui.tsx               primitive dùng chung: Btn, Note, Spinner, Sel
│   └── settings/            modal Cài đặt + phần Mô hình & Nhà cung cấp
│       SettingsModal · ModelsSettings · ProviderCard · AddProviderCard
│       ModelPickerPanel · ModelRowEditor · bits
│
├── config/
│   ├── schema.ts            CONFIG KEY đăng ký một lần: kiểu, mặc định, mô tả
│   ├── store.ts             nơi DUY NHẤT ghi config (localStorage → DB/file)
│   ├── credentials.ts       credential store — giá trị key, tách khỏi config
│   ├── prefs.ts             tuỳ chọn chung, đọc/ghi qua store
│   └── providers.ts         nghiệp vụ provider/model: validate, khám phá model
│
└── context/UiContext.tsx    theme + trạng thái mở/đóng modal Cài đặt
```

- **Một luồng, không fork UI.** `ProjectFlow` giữ `stage`; mỗi màn hình là một tệp nhận prop, không tự đọc store.
- **Chuỗi hiển thị tập trung ở `copy.ts`**, dữ liệu mẫu tập trung ở `demo.ts` — nối backend chỉ đổi `demo.ts` sang API, kiểu dữ liệu ở `types.ts` giữ nguyên.
- **`config/` là ranh giới dữ liệu.** `schema.ts` là nguồn sự thật của mọi tuỳ chọn; không component nào tự chạm localStorage.
- Ranh giới giữ nguyên như bản cũ: frontend hiển thị – lọc – điều hướng – đồng bộ vùng chọn – xin giải thích – thu phản hồi. Backend sở hữu ngữ nghĩa.

> **Lệch giữa spec và code:** chế độ Chuyên gia (§3, §6) hiện **chưa có** trong code — không có `uiMode`, `CapabilityGate`, `config/capabilities.ts`. Phần duy nhất còn lại của nó là modal Cài đặt (Mô hình & Nhà cung cấp). Cây ở trên là những gì đang chạy thật.

---

## 12. Những gì KHÔNG xây

Ghi rõ để chặn trượt phạm vi, vì đây chính là thứ đã làm bản cũ phình ra:

- Không engine vẽ sơ đồ mới. Dùng Archify qua adapter; knowledge layer mới là nguồn sự thật.
- Không dashboard metrics cho người dùng phổ thông.
- Không trace viewer, không LLM cost, không token counter ở chế độ Đơn giản.
- Không wizard cấu hình nhiều bước.
- Không hỏi hàng loạt từng thay đổi. Nhóm an toàn tự duyệt.
- Không percentage cho tiến trình và không điểm số cho rủi ro.
- Không modal Settings hiển thị tên model AI cho người dùng phổ thông.
- Không hiển thị stack trace. Không bao giờ.
- Không deep-link tới 5 chế độ sơ đồ ở chế độ Đơn giản.

---

## 13. Phân loại lại bản spec cũ

| Mục bản cũ | Số phận |
|---|---|
| §3–5 Landing, Analysis, Review | Viết lại thành §5.1–5.3, bỏ toàn bộ thuật ngữ |
| §6 Dynamic Transformation Configuration | Bỏ wizard → 3 thẻ việc nhanh + 3 dropdown |
| §7 Explainability | Giữ, đổi thành `Vì sao?` bằng một câu tiếng Việt |
| §8–18 Workspace, Sidebar, Tree, Code, Inspector, Impact | **Chuyên gia** |
| §19–24, §68–87 Archify, Architecture, Impact visualization | **Chuyên gia** (Đơn giản chỉ 1 sơ đồ tĩnh) |
| §25–28 Diff, Change review, Report | Diff → Chuyên gia; Report giữ ở cả hai dạng rút gọn |
| §29–30 Validation, timeline | **Chuyên gia** |
| §31 Activity | Đơn giản: gộp vào checklist tiến trình |
| §32 Trace | **Chuyên gia** |
| §33 Metrics | **Chuyên gia** |
| §34–38 Ask AI, Q&A, đồng bộ vùng chọn | Giữ; Đơn giản chỉ dùng chat + ngữ cảnh đang chọn |
| §39–40 Focus mode | **Chuyên gia** |
| §41 Documentation | Giữ; Đơn giản chỉ hiện tài liệu tiếng Việt đã tạo |
| §42–43 Export | Giữ, rút gọn còn 2 nút + 1 dòng trấn an |
| §44–45 Progress UX | Giữ nguyên tắc (đếm việc thật), bỏ mọi % giả |
| §46 Global status | Đơn giản: đổi thành chữ trong sidebar (`Đã xong`, `Cần bạn xem 12 chỗ`) |
| §47 Error / partial success | Viết lại thành §5.6 + biến thể một phần |
| §48 Risk UX | Giữ nguyên tắc: luôn kèm lý do, không có `Risk: 82%` |
| §49–51 Responsive, Visual semantics | Giữ |
| §52 User review before transformation | Giữ, thu gọn thành 1 nút chính |
| §53 Context reset vô hình | Giữ nguyên tắc |
| §54–57 Living model, IA, journey | Giữ phần kiến trúc; journey viết lại theo §7 |
| §58–60 MVP / Phase 2 / Phase 3 | Viết lại theo §13, tách theo chế độ |
| §61 FE/BE boundary | Giữ |
| §62–63 Core interaction model | Giữ, nhưng định vị lại: Đơn giản ≈ ChatGPT + Google Drive; Chuyên gia ≈ GitHub + IDE |

---

## 14. Lộ trình

### MVP

**Đơn giản (làm trước):**
- Màn hình đầu với 3 dropdown + 3 thẻ.
- Tiến trình theo tệp, có huỷ.
- Màn kết quả phân tích + nút bắt đầu.
- Màn xong: kết quả, nhóm rủi ro, tải `.zip`.
- Màn rỗng và màn lỗi (bắt buộc, không được hoãn).
- Chat có ngữ cảnh theo dự án.

**Chuyên gia:**
- Giữ 9 tab + 3 panel hiện có, nối API thật, gỡ mock.
- Ẩn theo capability tier thay vì hard-code.

### Sau MVP

- Đồng bộ vùng chọn giữa sơ đồ ↔ cây tệp ↔ code ↔ inspector.
- Báo cáo vấn đề lưu thành dữ liệu dự án, có màn tổng hợp.
- Lịch sử theo dự án và so sánh trước/sau.
- Duyệt theo nhóm và tuỳ chỉnh mức an toàn ở chế độ Chuyên gia.

### Chưa làm

- Cộng tác nhóm, bình luận theo dòng.
- So sánh nhiều snapshot.
- Guided architecture story, share snapshot.

---

## 15. Checklist nghiệm thu chế độ Đơn giản

Một màn hình **không đạt** nếu còn bất kỳ điều nào sau đây:

- [ ] Có chữ nào thuộc danh sách cấm ở §8.
- [ ] Có một con số không kèm câu giải thích nó nghĩa là gì.
- [ ] Có nhãn trộn hai ngôn ngữ.
- [ ] Có màn hình trắng không nút bấm tiếp.
- [ ] Có phần hiển thị giá trị mặc định `undefined` / `NaN` / `0` khi chưa có dữ liệu.
- [ ] Tiến trình dùng phần trăm ước lượng thay vì đơn vị việc thật.
- [ ] Người dùng phải mở quá 1 lớp để biết **việc gì đang xảy ra**.
- [ ] Người dùng phải quyết định nhiều hơn 1 lần trước khi thấy kết quả đầu tiên.
- [ ] Có mã màu hex viết trực tiếp trong component thay vì dùng token.
- [ ] Đổi theme gây nháy trắng/đen khi tải trang.
- [ ] Màn hình chỉ đúng ở một theme (phải kiểm cả sáng và tối).
- [ ] Trạng thái chỉ phân biệt bằng màu, không kèm chữ.
- [ ] Chữ hoặc viền không đạt tương phản 4.5:1 ở một trong hai theme.
