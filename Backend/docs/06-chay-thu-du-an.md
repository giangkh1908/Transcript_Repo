# 06 — Chạy thử dự án

Mục tiêu: sau khi người dùng bấm **Chạy dự án**, họ thấy giao diện thật của dự án mình ngay trong khung xem trước, kèm hướng dẫn sử dụng.

Chạy **trên máy người dùng**, bằng runtime của chính họ. Không container mặc định, không máy chủ của chúng ta.

## 1. Nguyên tắc

1. **Chỉ chạy khi người dùng bấm.** Không có ngoại lệ — kể cả bước kiểm chứng smoke ở `docs/05` cũng phải được người dùng đồng ý trước.
2. **Nói trước sẽ chạy gì.** Màn Run đã hiện hai lệnh trước khi có nút Chạy — backend phải chạy **đúng những lệnh đã hiện**, không thêm lệnh ẩn. Lệnh có tham số sinh tự động (vd. `--port 5174`) phải xuất hiện trong `notes` trước khi chạy.
3. **Chạy trong `work/`**, không bao giờ trong `origin/`, không bao giờ ở thư mục nhà.
4. **Không cài gì vào hệ thống.** Phụ thuộc của dự án chỉ được cài trong thư mục làm việc (`.venv/`, `node_modules/`).
5. **Dọn sạch khi dừng.** Hết tiến trình con, hết cổng đang giữ, hết tệp tạm. Tắt app mà còn tiến trình treo là lỗi nặng.

## 2. Quét cách chạy

Đã làm ở `analyze/entrypoints.py` (`docs/04` §7) và tái dùng nguyên ở đây — **một nguồn sự thật**, không quét hai lần bằng hai đoạn code khác nhau. Kết quả `runScan` trả về ngay ở màn Result, và màn Run chỉ việc hiển thị.

Thiếu bằng chứng ⇒ `runAvailable: false`, màn Run chỉ hiện hướng dẫn và một câu: *"Mình chưa tìm thấy cách chạy dự án này trong các tệp của nó, nên chưa chạy thử được."*

## 3. Bốn bước — khớp đúng bốn dòng trên màn Run

Frontend đã có sẵn 4 bước trong `S.run.starting.steps`; backend phát `step.index` 0–3 tương ứng:

| `index` | Chuỗi trên giao diện | Backend làm gì |
|---|---|---|
| 0 | Đang cài các thư viện cần thiết | Tạo `.venv` (Python) hoặc cài `node_modules` (Node) theo lệnh đã tìm thấy |
| 1 | Đang chuẩn bị dữ liệu mẫu để bạn xem thử | Tạo `.env` từ `.env.example` (nếu thiếu), chạy migration, nạp seed/fixture nếu tìm thấy, tạo tài khoản mẫu nếu dự án không có sẵn |
| 2 | Đang khởi động dự án | Chạy lệnh khởi động, chờ cổng mở |
| 3 | Đang mở giao diện | Bật proxy `/preview/<id>/`, trả địa chỉ + hướng dẫn sử dụng |

Bước 1 chỉ chạy những gì có bằng chứng: `manage.py` ⇒ `migrate`; `prisma/` ⇒ `prisma migrate deploy`; `alembic.ini` ⇒ `alembic upgrade head`; `fixtures/*.json` hoặc `seeds/` ⇒ nạp; `db.sqlite3` đã có trong repo ⇒ dùng luôn. Không có gì ⇒ bỏ qua bước này trong 1 giây, không bịa.

**Tài khoản mẫu:** chỉ nêu khi có bằng chứng (fixture/seed chứa sẵn). Nếu backend tự tạo (Django `createsuperuser --noinput` với `DJANGO_SUPERUSER_*`), phải ghi rõ trong `notes`: *"Mình đã tạo một tài khoản quản trị mẫu `admin / admin123` để bạn xem được cả trang quản trị. Tài khoản này chỉ nằm trong bản chạy thử."* — và **không** dùng mật khẩu mặc định yếu trên bất cứ thứ gì người dùng có thể triển khai thật mà không nói.

## 4. Môi trường

| Việc | Cách làm | Khi thiếu |
|---|---|---|
| Python | `python -m venv work/.venv` → `work/.venv/Scripts/pip` (Windows) / `bin/pip` | `run.missing_runtime`: *"Máy bạn chưa có Python 3.11 trở lên, nên mình chưa chạy thử được dự án này."* + link hướng dẫn cài |
| Node | Chọn theo lockfile: `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `package-lock.json` → npm | như trên |
| Java/Go/Ruby | Dùng binary có sẵn trong PATH | như trên |
| Docker (dự án cần) | Chỉ khi có `docker-compose.yml` **và** Docker đang chạy | `notes`: *"Dự án này cần Docker. Mình chưa chạy thử được nếu Docker chưa bật."* |

Không bao giờ tự tải và cài runtime (không `apt`, không `choco`, không tải Node về). Đó là việc của người dùng, và tự làm là vượt quyền.

## 5. Cấp cổng

1. Ưu tiên cổng suy ra từ cấu hình dự án (`vite.config`, `--port`, `PORT=`, mặc định của framework).
2. Nếu cổng đó đang bận: thử cổng kế tiếp (tối đa 20 lần), ghi vào `notes` cổng thật sẽ dùng.
3. **Không bao giờ** dùng cổng của backend (8686) hay cổng đã cấp cho phiên khác.
4. `ports.py` giữ một sổ đăng ký cổng đang cấp phát cho các phiên; giải phóng khi tiến trình dừng.
5. Sau khi chạy, xác nhận cổng **thật sự** mở: thử `GET /` tối đa 60 giây. Dự án có thể tự đổi cổng (`Port 5173 is in use, trying 5174…`) — nếu log có dấu hiệu đó, đọc lại cổng từ log rồi kiểm lại.

## 6. Tiến trình con

- Spawn **không qua shell** khi có thể (`argv`), dùng `npm.cmd`/`pnpm.cmd` trên Windows.
- `cwd = work/<phiên>/work`, `env` = môi trường hiện tại + biến của dự án (từ `.env` tổng hợp), **trừ** các biến của chính app (`TROLYDUAN_*`) để không rò rỉ cấu hình nội bộ vào dự án người dùng.
- Gom log theo dòng (không theo byte), tách `stdout`/`stderr`, phát SSE `log`; giữ 5.000 dòng gần nhất trong bộ nhớ để client kết nối muộn vẫn thấy log.
- Phát hiện cổng mở bằng cách thử kết nối TCP mỗi 500 ms, song song với việc đọc log tìm dấu hiệu `Listening on` / `Running on` / `Development server`.
- Timeout: cài đặt 10 phút, khởi động 90 giây. Hết thời gian ⇒ `run.timeout` + 30 dòng log cuối để người dùng tự xem.
- Trạng thái: `stopped → installing → preparing → starting → running → exited | crashed`.
  Tiến trình con thoát ngay sau khi vào `running` ⇒ `crashed`, kèm 30 dòng log cuối.

## 7. Cổng xem trước (`run/proxy.py`)

`GET /preview/<id>/*` → chuyển tiếp sang `http://127.0.0.1:<port>/…`:

- Chỉ hoạt động khi phiên ở trạng thái `running`; còn lại trả trang nhỏ nói *"Dự án đang không chạy."*
- Thêm `base` vào `<head>` của HTML để đường dẫn tương đối hoạt động dưới tiền tố `/preview/<id>/`.
- Chuyển tiếp WebSocket (HMR của Vite, socket.io) — không có thì dự án Node gần như không dùng được.
- Không cache; giới hạn phản hồi 50 MB mỗi request; chặn `/preview` cho mọi thứ ngoài `127.0.0.1`.
- Chèn một dải nhỏ, không chặn thao tác: *"Đây là dự án của bạn đang chạy thử"* + nút đóng — để người dùng không nhầm với app thật.

⚠️ **Việc frontend phải sửa:** iframe trong `screens/Run.tsx` trỏ `previewSrc` = `/preview/<id>/` và **bỏ `allow-same-origin`** khỏi `sandbox`. Proxy đã cùng origin nên không cần cờ đó nữa, và bỏ đi thì code của dự án không chạm được vào `localStorage`/cookie của app — đúng như ghi chú `ponytail:` hiện có trong code.

## 8. Hướng dẫn sử dụng (`run/usage.py`)

Sinh 3–5 bước, **chỉ từ bằng chứng**:

| Nguồn | Suy ra |
|---|---|
| Route/urlpatterns/`pages/` | *"Trang đầu là danh sách sản phẩm."* |
| Model + admin đăng ký Django (`/admin`) | *"Trang quản trị nằm ở /admin."* |
| Fixture/seed | *"Dữ liệu mẫu có 4 sản phẩm và 2 đơn hàng."* |
| Tài khoản mẫu (bằng chứng hoặc tự tạo) | *"Đăng nhập bằng admin / admin123."* |
| `package.json` scripts, README "Usage" | các bước theo chức năng |

Nếu chưa có bằng chứng nào ngoài "dự án mở được ở địa chỉ X", trả về đúng một bước và một dòng: *"Mình chưa biết dự án này có những chức năng gì — bạn mở thử xem."* Thà một bước thật còn hơn năm bước bịa.

## 9. Dừng và dọn dẹp

- Dừng: gửi tín hiệu **cả cây tiến trình** (`taskkill /T /F` trên Windows, `killpg` trên POSIX) — chỉ kill tiến trình cha sẽ để lại con treo giữ cổng.
- Chờ tối đa 5 giây, sau đó kill cứng; xác nhận cổng đã đóng.
- Đăng ký `atexit` + handler SIGINT/SIGTERM: tắt app là dừng hết tiến trình con của mọi phiên.
- Xoá log tạm của phiên chạy khi dừng (log vẫn còn trong SQLite nếu người dùng muốn xem lại).
- `POST /run/stop` idempotent.

## 10. An toàn — nói thẳng giới hạn

Đây là **code của người dùng, chạy trên máy người dùng, do người dùng yêu cầu**. Rủi ro chính không phải "kẻ tấn công từ xa" mà là: (a) app tự chạy thứ người dùng không định chạy, (b) tiến trình treo ngốn tài nguyên, (c) rò rỉ khoá API vào log của dự án.

| Rủi ro | Cách chặn |
|---|---|
| Chạy ngoài ý muốn | `confirm: true` bắt buộc; lệnh đã hiện trước cho người dùng xem; không chạy lúc khởi động app |
| `postinstall` của npm chạy script lạ | Cảnh báo một lần: *"Cài thư viện có thể chạy script của gói bên thứ ba. Chỉ tiếp tục nếu bạn tin dự án này."* (hiện ở `notes`, không chặn cứng — người dùng đang chạy dự án của chính họ) |
| Lệnh lấy từ README | Đánh dấu rõ nguồn: `evidence: "README.md dòng 24"` — người dùng thấy được nó đến từ đâu |
| Khoá API rò vào log/env | Không truyền biến `TROLYDUAN_*` vào tiến trình con; lọc khoá khỏi log trước khi lưu và trước khi phát SSE |
| Tiến trình treo giữ tài nguyên | Timeout cứng ở §6; nút Dừng luôn hiện khi `installing/preparing/starting/running` |
| Docker (tuỳ chọn, giai đoạn sau) | `--isolate docker`: `--network none` trừ cổng xem trước, `--memory 1g --cpus 1`, mount chỉ `work/` |

## 11. Việc phải làm

- [ ] `run/detect.py`: tái dùng `analyze/entrypoints.py`, không viết lại logic quét.
- [ ] `run/ports.py`: cấp cổng, sổ đăng ký, tránh 8686, test "cổng bận thì nhảy cổng".
- [ ] `run/process.py`: spawn theo argv, gom log theo dòng, phát hiện cổng mở, timeout, kill cả cây tiến trình; test trên Windows **và** POSIX.
- [ ] `run/proxy.py`: chuyển tiếp HTTP + WebSocket + thêm `<base>` + dải thông báo; test bằng fixture Vite mini.
- [ ] `run/usage.py`: 5 nguồn bằng chứng ở §8; test "không có bằng chứng ⇒ trả 1 bước".
- [ ] `atexit`/signal handler dừng mọi tiến trình con; test: khởi động app, chạy dự án, kill app, kiểm không còn tiến trình con.
- [ ] Bước "chuẩn bị dữ liệu mẫu": nhận diện migrate/seed 4 loại (Django, Prisma, Alembic, fixture JSON).
- [ ] Fixture `tests/fixtures/web-py` (Flask 40 dòng) và `web-ts` (Vite mini) để test end-to-end không cần mạng.

**Tiêu chí nghiệm thu:** với fixture Flask: bấm Chạy → 4 bước hiện đúng → giao diện thật hiện trong khung xem trước → địa chỉ và hướng dẫn sử dụng có thật → bấm Dừng thì cổng đóng trong 5 giây và không còn tiến trình con; với dự án thiếu bằng chứng: màn Run **không** hiện nút Chạy mà nói rõ lý do; với dự án cần Docker mà Docker tắt: báo đúng câu, không treo.
