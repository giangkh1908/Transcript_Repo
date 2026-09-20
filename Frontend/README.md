# Trợ lý dự án — giao diện

Giao diện web của **Trợ lý dự án**: người dùng dán link GitHub (hoặc kéo thả thư mục dự án), hệ thống đọc dự án, giải thích nó làm gì bằng tiếng Việt, sửa những chỗ khó đọc, rồi cho **chạy thử ngay trên trình duyệt** kèm hướng dẫn sử dụng.

Người dùng chính **không biết lập trình**. Vì vậy giọng văn, cách hiển thị tiến trình và cả các màn hình lỗi đều bị ràng buộc bởi [Quy tắc giao diện](#quy-tắc-giao-diện-bắt-buộc) bên dưới — đọc phần đó trước khi sửa bất kỳ màn hình nào.

> ### ⚠️ Trạng thái: bản demo, chưa nối backend
>
> Mọi dữ liệu đang hiển thị là **dữ liệu mẫu** trong `src/demo.ts`: số tệp, danh sách chỗ rủi ro, kết quả quét lệnh cài đặt/khởi động. Tiến trình chạy bằng `setTimeout`, khung xem trước trỏ vào một trang mẫu trong `public/`. Các nút cần backend thật (tải `.zip`, xuất PDF, viết tài liệu) hiện chỉ báo là bản demo.
>
> Nối API thì **không phải sửa màn hình nào** — xem [Nối backend thì đổi ở đâu](#nối-backend-thì-đổi-ở-đâu).

---

## Chạy thử

Cần **Node 20.19+ hoặc 22.12+** (yêu cầu của Vite 8) và pnpm — trong repo có `pnpm-lock.yaml`. npm cũng chạy được, chỉ đổi lệnh.

```bash
cd Frontend
pnpm install     # hoặc: npm install
pnpm dev         # hoặc: npm run dev
```

Mở **http://localhost:5173** — giao diện mặc định là **sáng**.

| Lệnh | Việc |
|---|---|
| `pnpm dev` | dev server + HMR |
| `pnpm build` | `tsc -b` (kiểm kiểu toàn bộ) rồi build ra `dist/` |
| `pnpm preview` | xem thử bản đã build |
| `pnpm lint` | oxlint |

Bộ test giao diện không nằm trong `package.json` (cần dev server đang chạy trước):

```bash
pnpm dev
node tools/uitest.mjs --url http://localhost:5173
```

---

## Luồng 8 màn hình

Người dùng luôn bắt đầu ở `landing`. Trạng thái `stage` nằm trong `src/components/ProjectFlow.tsx`.

| `stage` | Người dùng làm gì | Tệp |
|---|---|---|
| `landing` | dán link, kéo thả thư mục, hoặc bấm một trong 3 thẻ việc nhanh | `screens/Landing.tsx` |
| `reading` | chờ đọc dự án — tiến trình theo tệp, có Huỷ | `screens/Reading.tsx` |
| `result` | đọc 3 gạch đầu dòng giải thích dự án, hỏi đáp về dự án | `screens/Result.tsx` |
| `working` | chờ xử lý | `screens/Working.tsx` |
| `done` | quyết định những chỗ chạm cấu hình máy chủ, chạy thử, tải `.zip` | `screens/Done.tsx` |
| `run` | xem cách cài đặt/khởi động → chạy → giao diện đang chạy + cách sử dụng | `screens/Run.tsx` |
| `clean` | dự án không có gì cần sửa → lời mời viết tài liệu | `screens/Clean.tsx` |
| `failed` | không mở được dự án → ba đường thoát | `screens/Failed.tsx` |

---

## Cấu trúc thư mục

```
src/
├── main.tsx                 điểm vào
├── App.tsx                  UiProvider + khung luồng + modal Cài đặt
├── index.css                design token — nguồn màu duy nhất
│
├── types.ts                 kiểu dữ liệu của luồng (Stage, Project, ProjectRun…)
├── copy.ts                  toàn bộ chuỗi hiển thị (đối tượng S)
├── demo.ts                  dữ liệu mẫu — thay bằng API khi nối backend
│
├── screens/                 8 màn hình, mỗi màn hình một tệp
│
├── components/
│   ├── ProjectFlow.tsx      khung luồng: stage + thanh trên + danh sách dự án
│   ├── Header.tsx           thanh trên cùng (Cài đặt, đổi theme)
│   ├── Sidebar.tsx          danh sách dự án gần đây
│   ├── TopControls.tsx      nút đổi giao diện sáng/tối
│   ├── ui.tsx               primitive dùng chung: Btn, Note, Spinner, Sel
│   └── settings/            modal Cài đặt + phần Mô hình & Nhà cung cấp
│
├── config/
│   ├── schema.ts            CONFIG KEY đăng ký một lần: kiểu, mặc định, mô tả
│   ├── store.ts             nơi DUY NHẤT ghi config (localStorage → DB/file)
│   ├── credentials.ts       credential store — giá trị API key, tách khỏi config
│   ├── prefs.ts             tuỳ chọn chung, đọc/ghi qua store
│   └── providers.ts         nghiệp vụ provider/model: validate, khám phá model
│
└── context/UiContext.tsx    theme + trạng thái mở/đóng modal Cài đặt

public/                      favicon, icons, trang mẫu cho khung xem trước
tools/                       bộ test giao diện + ảnh chụp
```

Nguyên tắc: **mỗi tệp một trách nhiệm, tên tệp nói đúng việc nó làm**. Không màn hình nào tự chạm `localStorage` hay `config/` — cấu hình chỉ đi qua `config/store.ts`, và `ProjectFlow` truyền dữ liệu xuống màn hình bằng prop.

---

## Thêm một màn hình mới

1. `src/types.ts` — thêm tên màn hình mới vào `Stage` (ví dụ `run`).
2. `src/screens/` — thêm một tệp cho màn hình mới; component nhận prop, không tự đọc store.
3. `src/copy.ts` — thêm khối chuỗi cho màn hình đó; không viết chuỗi trong JSX.
4. `src/components/ProjectFlow.tsx` — thêm tên vào danh sách `known` (để `?stage=<tên>` dùng được khi phát triển) và thêm nhánh render.
5. Nếu màn hình cần dữ liệu mới: thêm kiểu vào `src/types.ts`, thêm dữ liệu mẫu vào `src/demo.ts`.

---

## Quy tắc giao diện (bắt buộc)

- **Tiếng Việt 100%.** Hệ thống gọi mình là *"mình"*, gọi người dùng là *"bạn"*. Không "quý khách", không "người dùng". Không trộn hai ngôn ngữ trong một nhãn — `Đóng (Cancel)` là sai.
- **Không rò rỉ thuật ngữ nội bộ.** Không AST, token, latency, cost, confidence %, "transformation pipeline", tên trạng thái nội bộ. Đổi thành câu người thường đọc được.
- **Không viết chuỗi trực tiếp trong JSX** — tất cả nằm ở `src/copy.ts`.
- **Không viết mã màu trong component** — dùng token trong `src/index.css` qua utility Tailwind (`bg-panel`, `border-line`, `text-ink3`…). Thêm màu mới = thêm token cho **cả hai** theme.
- **Không dùng phần trăm ước lượng** cho tiến trình. Đếm theo đơn vị việc thật: *"Đã đọc 342 / 500 tệp"*.
- **Không có màn hình cụt.** Kể cả trạng thái rỗng, trạng thái lỗi hay thành công một phần, luôn phải có ít nhất một việc để bấm tiếp.
- **Không dùng màu làm kênh thông tin duy nhất.** Trạng thái luôn kèm chữ (`Đã xong`, `Không mở được`), để người khó phân biệt màu vẫn đọc được.
- **Mặc định SÁNG**, và **không** chạy theo `prefers-color-scheme` — mặc định phải xác định được, không phụ thuộc máy người dùng. Theme gắn vào `<html data-theme>` trước khi render để không nháy trắng/đen.
- **Tương phản** chữ thường ≥ 4.5:1, chữ lớn ≥ 3:1 (WCAG AA) ở **cả hai** theme — bộ test kiểm tự động, đừng làm nhạt chữ mà không chạy lại test.

Chi tiết và lý do của từng quy tắc: `../frontend-v2.md` §8, §10.

---

## Kiểm thử giao diện

`tools/uitest.mjs` mở Chrome/Edge thật qua Chrome DevTools Protocol (không cần Playwright, không thêm phụ thuộc), **bấm chuột thật, đọc DOM thật, chụp ảnh thật** vào `tools/screens/`.

Nó kiểm: mặc định là giao diện sáng và nền trắng · đổi theme rồi tải lại vẫn nhớ · luồng 8 màn hình chạy hết · kết quả quét và khung xem trước của màn chạy thử tải được · không có lỗi console hay exception · **tương phản WCAG AA của mọi đoạn chữ ở cả hai theme** · modal Cài đặt (provider, credential store, migrate dữ liệu cũ).

Mở thẳng một màn hình khi đang phát triển:

```
http://localhost:5173/?stage=done        # màn Xong
http://localhost:5173/?stage=run&theme=dark
```

---

## Nối backend thì đổi ở đâu

| Việc | Sửa ở |
|---|---|
| Dữ liệu dự án, kết quả quét, danh sách chỗ rủi ro | `src/demo.ts` → thay bằng lời gọi API, giữ nguyên kiểu ở `src/types.ts` |
| Tiến trình thật thay cho timer | `setTimeout` trong `components/ProjectFlow.tsx`, `screens/Reading.tsx`, `screens/Working.tsx`, `screens/Run.tsx` |
| Khung xem trước dự án đang chạy | `demoRun.previewSrc` + thuộc tính `sandbox` của iframe trong `screens/Run.tsx` — phục vụ bản xem trước từ **tên miền khác** rồi bỏ `allow-same-origin` để code người dùng không chạm được vào app này |
| Nơi lưu cấu hình | `config/store.ts` — `setConfigBackend()` cắm backend DB/file, UI không đổi; key mới thì đăng ký ở `config/schema.ts` |
| Giá trị API key | `config/credentials.ts` — không bao giờ đi vào config document, chỉ mang tên tham chiếu |

---

## Lỗi hay gặp

- **`http://127.0.0.1:5173` không mở được, `localhost` thì được** — Vite bind IPv6 (`::1`). Dùng `localhost`, hoặc chạy `pnpm dev --host 127.0.0.1`. Bộ test cũng phải trỏ đúng host đang chạy.
- **`pnpm lint` báo `An Application Control policy has blocked this file`** — Windows chặn binary `.node` của oxlint, không phải lỗi code. `tsc -b` trong `pnpm build` vẫn kiểm kiểu đầy đủ.
- **Trắng trang khi chạy test** — `uitest.mjs` trỏ sai host (xem mục đầu).

---

## Đọc thêm

- `../frontend-v2.md` — spec chốt: kiến trúc, quy tắc ngôn ngữ, token màu, checklist nghiệm thu.
- `../mockups/` — ảnh thiết kế tham chiếu (bản chốt).
- `tools/screens/` — ảnh chụp thật do bộ test sinh ra.

Chưa có trong code, đừng tìm: **chế độ Chuyên gia** 9 tab, `CapabilityGate`, `config/capabilities.ts` — spec §3/§6 có mô tả nhưng code chưa xây.
