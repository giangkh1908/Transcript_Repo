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
| 3 | Đang mở giao diện | Bật proxy ở cổng riêng, trả địa chỉ + cách sử dụng |

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
2. **Kiểm cổng bằng cách bind thật**, không phải bằng cách thử kết nối: mở socket bind `127.0.0.1:<port>` rồi đóng ngay. Cách này mới phát hiện được cổng bị giữ bởi tiến trình chỉ lắng nghe trên IPv6 (`::1`) — chuyện rất thường gặp: Vite bind `::1` nên `localhost` vào được mà `127.0.0.1` thì không, đúng như đã gặp khi chạy bộ test của frontend.
3. Kiểm **cả hai** họ địa chỉ (`127.0.0.1` và `::1`) trước khi kết luận cổng trống; ghi lại địa chỉ bind được để dùng cho `directAddress` (dùng `localhost` khi dự án chỉ nghe IPv6).
4. Nếu cổng đó đang bận: thử cổng kế tiếp (tối đa 20 lần), ghi vào `notes` cổng thật sẽ dùng.
5. **Không bao giờ** dùng cổng của backend (8686) hay cổng proxy (8687+) hay cổng đã cấp cho phiên khác.
6. `ports.py` cấp **hai** cổng cho mỗi phiên chạy (cổng dự án + cổng proxy) và giữ sổ đăng ký **trong bộ nhớ** (cấp phát + lấy sổ là một thao tác khoá `asyncio.Lock` để hai phiên không nhận trùng cổng). Không cần tệp sổ trên đĩa: bảng `run_state` trong SQLite đã ghi phiên nào đang giữ cổng nào, và `jobs/sweeper.py` dùng nó để giải phóng khi khởi động lại (`docs/01` §4).
7. Sau khi chạy, xác nhận cổng **thật sự** mở: thử kết nối TCP (không phải `GET /`) trên cả hai họ địa chỉ, tối đa 60 giây, **một deadline duy nhất** dùng chung với timeout khởi động ở §6 — không có hai đồng hồ chồng nhau. Việc đọc log tìm `Listening on`/`Port 5173 is in use, trying 5174` chỉ là **gợi ý bổ sung** để biết dự án đổi cổng, không phải căn cứ chính: log của mỗi framework một kiểu, và có dự án không in gì cả.

## 6. Tiến trình con

- Spawn **không qua shell** khi có thể (`argv`), dùng `npm.cmd`/`pnpm.cmd` trên Windows.
- `cwd = work/<phiên>/work`.
- `env` **không** phải môi trường kế thừa. Dựng từ allowlist tối thiểu: `PATH`, `HOME`/`USERPROFILE`, `LANG`/`LC_ALL`, `TMPDIR`/`TEMP`, `SystemRoot`, `COMSPEC`, `PYTHONIOENCODING`, cộng biến của dự án (từ `.env`). **Không bao giờ** truyền tiếp `TROLYDUAN_*`, và **không bao giờ** truyền bất kỳ biến nào khớp `*_API_KEY`/`*_TOKEN`/`*_SECRET` hay tên trong credential store — nếu không, khoá AI của người dùng sẽ nằm trong môi trường của dự án họ chạy, rồi lọt vào `pip freeze`, log, hay ảnh chụp lỗi.
- Gom log theo dòng (không theo byte), tách `stdout`/`stderr`, phát SSE `log`; giữ 5.000 dòng gần nhất trong bộ nhớ để client kết nối muộn vẫn thấy log. Log đi qua `redact()` **trước khi** lưu và trước khi phát.
- Phát hiện cổng mở bằng cách thử kết nối TCP mỗi 500 ms, song song với việc đọc log tìm dấu hiệu `Listening on` / `Running on` / `Development server`.
- Timeout: cài đặt 10 phút, khởi động 90 giây. Hết thời gian ⇒ `run.timeout` + 30 dòng log cuối để người dùng tự xem.
- Trạng thái: `stopped → installing → preparing → starting → running → exited | crashed`.
  Tiến trình con thoát ngay sau khi vào `running` ⇒ `crashed`, kèm 30 dòng log cuối.

## 7. Cổng xem trước (`run/proxy.py`)

**Proxy chạy trên một cổng riêng:** `127.0.0.1:8687` (khác cổng app 8686). Đây không phải chi tiết cho đẹp — nó là ranh giới an toàn:

> Nếu khung xem trước cùng origin với app, JS của dự án người dùng (kể cả XSS có sẵn trong dự án đó) chạy được trong origin của app: đọc `localStorage`, gọi `/api/config`, gọi `/api/credentials/*`. Thêm `sandbox` mà vẫn giữ `allow-same-origin` **không** cứu được gì, vì cùng origin thì frame tự gỡ được sandbox của nó.
>
> Tách sang cổng riêng thì Same-Origin Policy của trình duyệt tự lo việc cách ly, và lúc đó giữ `allow-same-origin` là **đúng**: dự án mới dùng được `localStorage`/cookie của chính nó (rất nhiều dự án cần), mà vẫn không chạm được vào app.

Mỗi phiên đang chạy được phục vụ ở **gốc một cổng riêng**: `http://127.0.0.1:8687/` chuyển tiếp sang `http://127.0.0.1:<cổng dự án>/…` (phiên thứ hai dùng 8688). Vì phục vụ ở gốc, **không cần viết lại `<base>`** — SPA routing, đường dẫn tương đối và `import` của dự án vẫn đúng như khi chạy trực tiếp. Đây là lý do chọn "một cổng cho mỗi phiên chạy" thay vì tiền tố đường dẫn trên cổng app.

- Chỉ hoạt động khi phiên ở trạng thái `running`; còn lại trả trang nhỏ nói *"Dự án đang không chạy."*
- **Chuyển tiếp WebSocket thật** (HMR của Vite, socket.io): `httpx` không làm được WebSocket, nên dùng `websockets`/`wsproto` làm client và bắc cầu hai chiều với WebSocket của Starlette.
  **Kế hoạch dự phòng, quyết trước khi code:** nếu bắc cầu WS không xong trong ngân sách giai đoạn 3, **bỏ HMR, giữ reload thường** — proxy vẫn phục vụ được HTTP, dự án vẫn chạy và vẫn sửa/xem được, chỉ mất cập nhật nóng. Khi đó màn Run hiện một dòng nhỏ: *"Chế độ xem trước không hỗ trợ cập nhật nóng — bấm F5 sau khi sửa."* Điều **không** được phép: để câu "hỗ trợ WebSocket" nằm trên giấy mà code không có, vì người sau sẽ tin và không kiểm.
- Gỡ `X-Frame-Options` và `Content-Security-Policy: frame-ancestors` khỏi phản hồi HTML (đây là lý do tồn tại của proxy — Django mặc định `DENY`).
- Không cache; giới hạn phản hồi 50 MB mỗi request; chỉ bind `127.0.0.1`.
- Chèn một dải nhỏ, không chặn thao tác: *"Đây là dự án của bạn đang chạy thử"* + nút đóng — để người dùng không nhầm với app thật. Dải này chèn bằng cấu trúc DOM, **không `innerHTML`** nội dung do dự án sinh ra.
- Không bao giờ đặt hay chuyển tiếp cookie/`Authorization` của app sang cổng proxy.

⚠️ **Việc frontend phải sửa:** `previewSrc` = `http://127.0.0.1:8687/` (origin khác — giá trị thật do backend trả, không hard-code), `sandbox` **giữ nguyên** `allow-scripts allow-forms allow-same-origin allow-popups` vì đã khác origin; nút "Mở trong tab mới" mở `directAddress`. Ghi chú `ponytail:` trong `screens/Run.tsx` và mục "Nối backend thì đổi ở đâu" của `Frontend/README.md` **đã được sửa lại** cho khớp quyết định này (trước đây cả hai khuyên bỏ `allow-same-origin` — lời khuyên đó nguy hiểm khi proxy cùng origin, và không cần thiết khi đã tách cổng).

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
| Chạy ngoài ý muốn | `confirm: true` bắt buộc; **hiện đầy đủ mọi lệnh sẽ chạy** trước khi chạy (kể cả lệnh do backend thêm vào, vd. `pip install`), kèm nguồn; không chạy lúc khởi động app |
| `postinstall` của npm chạy script lạ | Ba lớp: (1) nếu `package.json` có `scripts.postinstall`/`preinstall`, hiện nguyên văn script đó cho người dùng xem trước; (2) hộp kiểm *"Tôi tin dự án này"* bắt buộc ở lần chạy đầu tiên của mỗi nguồn, ghi lại vào phiên; (3) khi phát hiện script cài đặt, đưa ra lựa chọn chạy kèm `--ignore-scripts` — nói rõ đổi lại một số dự án sẽ không chạy được vì thiếu bước build gốc |
| Lệnh lấy từ README | Đánh dấu rõ nguồn: `evidence: "README.md dòng 24"` — người dùng thấy được nó đến từ đâu. Lệnh lấy từ README **không** được chạy ở chế độ tự động, chỉ khi người dùng bấm |
| Khoá API rò vào log/env | Env allowlist ở §6 (không truyền `*_API_KEY`/`*_SECRET`); `redact()` chạy trước khi lưu log và trước khi phát SSE |
| Bí mật của chính dự án rò ra log/`.zip` | `redact()` theo **mẫu** (giá trị trong `.env` của dự án, `sk-…`, `AKIA…`, `Bearer …`, chuỗi dài entropy cao) chứ không chỉ theo credential store; `.env` không được đưa vào `.zip` xuất ra (chỉ giữ `.env.example`) |
| Tiến trình treo giữ tài nguyên | Timeout cứng ở §6; nút Dừng luôn hiện khi `installing/preparing/starting/running` |
| Docker (tuỳ chọn, giai đoạn sau) | `--isolate docker`: `--network none` trừ cổng xem trước, `--memory 1g --cpus 1`, mount chỉ `work/` |

**Cách kill cây tiến trình — nói cụ thể, đây là chỗ dễ làm sai nhất:**

| Nền tảng | Cách làm | Cái **không** dùng |
|---|---|---|
| Windows | Tạo **Job Object** (`CreateJobObject` + `AssignProcessToJobObject`, qua `pywin32` hoặc `ctypes`) với `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`; kill = `TerminateJobObject`. Cách này không phụ thuộc PID còn sống hay không | `taskkill /T /PID <pid>`: PID có thể đã được cấp lại cho tiến trình khác, và `/T` chỉ đi theo cây cha-con hiện tại — tiến trình đã `setsid`/detach sẽ thoát lưới |
| POSIX | `start_new_session=True` khi spawn ⇒ có process group riêng; kill bằng `os.killpg(pgid, SIGTERM)` | `os.kill(pid)` trần: chỉ giết tiến trình cha (`npm run dev` giết xong vẫn còn `node` con giữ cổng) |
| Cả hai | Huỷ **hai pha**: SIGTERM/tín hiệu mềm → chờ 5 giây → kill cứng. Sau đó xác nhận cổng đã đóng và không còn tiến trình con | Tin rằng `pip`/`npm` sẽ tự thoát khi nhận SIGINT — chúng thường giữ tiến trình con và bỏ qua tín hiệu |

## 11. Việc phải làm

- [ ] `run/detect.py`: tái dùng `analyze/entrypoints.py`, không viết lại logic quét.
- [ ] `run/ports.py`: cấp cổng, sổ đăng ký, tránh 8686 và 8687, test "cổng bận thì nhảy cổng".
- [ ] `run/process.py`: spawn theo argv, **env allowlist**, gom log theo dòng, phát hiện cổng mở, timeout, kill cây bằng Job Object (Windows) / process group (POSIX); test trên Windows **và** POSIX, có test riêng "tiến trình con detach vẫn bị giết".
- [ ] `run/detect.py`: phát hiện `scripts.postinstall`/`preinstall` trong `package.json` và đưa vào `notes` + lựa chọn `--ignore-scripts`.
- [ ] `run/proxy.py`: phục vụ trên cổng riêng 8687/n, gỡ `X-Frame-Options`/`frame-ancestors`, chuyển tiếp HTTP + **WebSocket thật**, chèn dải thông báo bằng DOM (không `innerHTML`); **không** viết lại `<base>` (đã phục vụ ở gốc cổng); test bằng fixture Vite mini, gồm cả ca HMR qua WebSocket.
- [ ] `run/usage.py`: 5 nguồn bằng chứng ở §8; test "không có bằng chứng ⇒ trả 1 bước".
- [ ] `atexit`/signal handler dừng mọi tiến trình con; test: khởi động app, chạy dự án, kill app, kiểm không còn tiến trình con.
- [ ] Bước "chuẩn bị dữ liệu mẫu": nhận diện migrate/seed 4 loại (Django, Prisma, Alembic, fixture JSON).
- [ ] Fixture `tests/fixtures/web-py` (Flask 40 dòng) và `web-ts` (Vite mini) để test end-to-end không cần mạng.

**Tiêu chí nghiệm thu:** với fixture Flask: bấm Chạy → 4 bước hiện đúng → giao diện thật hiện trong khung xem trước → địa chỉ và hướng dẫn sử dụng có thật → bấm Dừng thì cổng đóng trong 5 giây và không còn tiến trình con; **fixture có tiến trình con detach (`npm run dev` bị bọc) vẫn bị dọn sạch**; với dự án thiếu bằng chứng: màn Run **không** hiện nút Chạy mà nói rõ lý do; với dự án cần Docker mà Docker tắt: báo đúng câu, không treo.
