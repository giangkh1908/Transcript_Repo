# 03 — Nhận dự án

Mục tiêu: đưa dự án của người dùng vào một **thư mục làm việc riêng**, an toàn, và **không bao giờ chạm vào bản gốc** sau khi đã copy.

## 1. Thư mục làm việc

```
~/.tro-ly-du-an/work/<sessionId>/
├── origin/        bản gốc đã copy — CHỈ ĐỌC (quyền 0444/0555), backend không ghi vào đây nữa
├── work/          bản làm việc — mọi thay đổi ghi ở đây
├── manifest.json  SHA-256 + kích thước + số dòng của từng tệp trong origin
├── skipped.json   tệp bỏ qua và lý do (nhị phân, quá lớn, không đọc được…)
└── session.json   nguồn, tuỳ chọn người dùng, thời điểm, phiên bản backend
```

Ba lý do phải copy chứ không sửa tại chỗ:

1. Frontend đã hứa với người dùng: *"Bản gốc vẫn được giữ nguyên, không bị ghi đè"* — phải đúng theo nghĩa đen.
2. `manifest.json` là **bằng chứng** kiểm được: so hash `origin/` trước và sau khi chạy xong, có test khẳng định không tệp nào đổi.
3. Người dùng có thể đang mở dự án trong IDE; sửa tại chỗ sẽ đánh nhau với họ.

Bản `work/` là bản duy nhất bị sửa. `.zip` xuất ra cũng lấy từ `work/`.

## 2. Ba nguồn và cách xử lý

### 2.1 Thư mục trên máy (`kind: "folder"`)

```
POST /api/sessions  {"source":{"kind":"folder","value":"D:\\du-an\\website"}}
```

1. Kiểm đường dẫn tồn tại, là thư mục, **đọc được**; từ chối nếu là ổ hệ thống (`C:\Windows`, `/`, `/etc`, `~`) — tránh người dùng chọn nhầm và backend đi quét cả máy.
2. Từ chối nếu thư mục là gốc của một ổ đĩa hoặc chứa hơn `maxFiles` tệp.
3. Copy sang `origin/` theo kiểu **stream từng tệp**, bỏ: `.git/`, `node_modules/`, `vendor/`, `.venv/`, `__pycache__/`, `dist/`, `build/`, `.next/`, `target/` (danh sách ở `ingest/guard.py`, có thể nới bằng cấu hình `ingest.skipDirs`).
4. Sau khi copy: đặt cờ chỉ đọc cho `origin/` — trên POSIX là `chmod 0444/0555`, trên Windows là thuộc tính `ReadOnly` + ACL từ chối ghi (`icacls origin /deny "%USERNAME%":(W)`).

   **Biết rõ giới hạn:** trên Windows, cờ chỉ đọc không ngăn được chủ sở hữu tệp — người dùng (và mọi tiến trình chạy dưới tài khoản họ) vẫn ghi được. Vì vậy **bảo đảm thật không phải quyền tệp mà là hash**: `manifest.json` được so lại sau mỗi job và sau mỗi lần chạy thử; lệch ⇒ phiên chuyển `failed` với câu *"Mình phát hiện bản gốc đã bị thay đổi trong lúc chạy — mình dừng lại để không làm hỏng gì thêm."* Quyền chỉ đọc là lớp cản nhẹ, hash là lớp kiểm chứng.

Không copy thì không an toàn; copy bằng hardlink thì nhanh nhưng phá tính "chỉ đọc" (ghi vào hardlink là ghi vào bản gốc) ⇒ **copy thật**.

### 2.2 Tệp `.zip` (`kind: "zip"`)

1. Mở bằng `zipfile`, **không** dùng `extractall`.
2. Với từng entry, kiểm trước khi ghi:
   - chuẩn hoá đường dẫn, từ chối `..`, đường dẫn tuyệt đối, ký tự ổ đĩa (`C:`), ADS trên Windows (`file.txt:stream`);
   - **từ chối UNC và đường dẫn thiết bị**: `\\server\share`, `\\?\C:\…`, `\\.\…` — đây là đường ghi thẳng ra ngoài thư mục làm việc, kể cả khi phần còn lại của đường dẫn trông hợp lệ;
   - **từ chối tên dành riêng của Windows**: `CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9` (kể cả khi có đuôi, `NUL.txt` vẫn là thiết bị);
   - **từ chối tên kết thúc bằng dấu chấm hoặc khoảng trắng** (`evil. `, `evil.`) — Windows cắt chúng đi, tạo ra hai đường dẫn khác nhau cho cùng một tệp;
   - từ chối symlink/hardlink/junction entry (zip có cờ symlink; junction trong thư mục nguồn thì kiểm ở `ingest/folder.py` và không đi theo);
   - chuẩn hoá **cả hai** loại dấu phân cách: zip có thể chứa `\` dù chuẩn là `/`, nên tách theo cả hai trước khi kiểm từng thành phần;
   - tổng kích thước giải nén ≤ `maxUncompressed` (chống zip bomb: kiểm cả **tỉ lệ nén** > 200:1 ⇒ từ chối);
   - tên tệp dài bất thường, tên rỗng, tên chỉ có dấu chấm.
3. Nếu mọi tệp nằm trong **một** thư mục gốc duy nhất (`website/`) thì bóc lớp đó ra (người dùng nén cả thư mục là chuyện thường).
4. Ghi vào `origin/` với đường dẫn đã kiểm; sau đó chạy cùng bước 3–4 như trên.

Mã lỗi: `source.unsafe_archive` (kèm đường dẫn vi phạm trong `technical`).

### 2.3 Link GitHub (`kind: "github"`)

1. Chỉ nhận `https://github.com/<owner>/<repo>` (cho phép hậu tố `.git`, `/tree/<branch>`, `?ref=`). Không nhận `git://`, `ssh://`, `file://` — từ chối kèm câu giải thích.
2. Clone bằng **git có sẵn trên máy**: `git clone --depth 1 --no-tags --single-branch [--branch <ref>] <url> origin/`.
   - `--depth 1`: lịch sử không cần cho việc phân tích, và repo lớn sẽ tải rất lâu.
   - Không `--recurse-submodules`; nếu repo có submodule thì ghi một dòng cảnh báo vào `skipped.json`.
   - Git LFS: nếu phát hiện `.gitattributes` có `filter=lfs` mà file thực tế là pointer ⇒ ghi cảnh báo "tệp lớn chưa được tải về".
3. Ánh xạ lỗi git → mã lỗi người đọc được:
   | Đầu ra git | `code` |
   |---|---|
   | `Authentication failed` / `could not read Username` / `terminal prompts disabled` | `source.private` |
   | `Could not resolve host` / `unable to access` + mạng | `source.no_network` |
   | `Remote branch ... not found` | `source.not_found` |
   | `repository not found` | `source.not_found` |
4. Sau khi clone: **xoá `.git/`**. Ta không dùng lịch sử; diff do ta tự sinh từ `manifest.json`; giữ `.git` chỉ tốn dung lượng và mở thêm bề mặt tấn công (hooks).
5. Biến `GIT_TERMINAL_PROMPT=0` và `GIT_ASKPASS=` để git **không bao giờ** treo chờ nhập mật khẩu.
6. Repo riêng tư: giai đoạn sau mới hỗ trợ, bằng token trong credential store (`ref: GITHUB_TOKEN`), truyền qua `http.extraheader` — **không** nhét token vào URL (sẽ lộ trong `ps`/log).

## 3. Kiểm tra an toàn (`ingest/guard.py`)

| Kiểm | Ngưỡng mặc định | Khi vượt |
|---|---|---|
| Số tệp | 50.000 | `source.too_big` |
| Tổng dung lượng | 500 MB | `source.too_big` |
| Một tệp | 10 MB | bỏ qua tệp, ghi vào `skipped.json` |
| Độ sâu thư mục | 40 | bỏ qua nhánh, ghi cảnh báo |
| Tên tệp | 255 ký tự | bỏ qua, ghi cảnh báo |
| Đường dẫn tuyệt đối dài trên Windows | 260 ký tự (chưa bật long path) | bật `\\?\` cho thao tác tệp khi cần, và **báo** nếu hệ thống không cho phép — không im lặng bỏ qua cả một nhánh thư mục |
| Thư mục nguồn là gốc ổ đĩa (`C:\`, `D:\`) hoặc `/` | luôn từ chối | phát hiện bằng so sánh với `os.path.splitdrive(path)[1] in ('', os.sep)` và danh sách điểm gắn kết của hệ thống, không đoán theo độ dài chuỗi |
| Thư mục nguồn là thư mục nhà, thư mục hệ thống, hay thư mục dữ liệu của chính app | luôn từ chối | tránh quét nhầm cả máy hoặc tự đọc chính mình |
| Đường dẫn ra ngoài thư mục làm việc | mọi trường hợp | `source.unsafe_archive` |
| Tệp nhị phân (đo bằng 8 KB đầu) | — | bỏ qua, ghi `skipped.json` |
| Không phải UTF-8 | — | thử `utf-8-sig`, `cp1258`, `latin-1`; không được thì bỏ qua + ghi lý do |

Mọi ngưỡng đọc từ `core/settings.py`, ghi đè được bằng biến môi trường `TROLYDUAN_MAX_FILES`…

**Thành công một phần là trạng thái bình thường, không phải lỗi.** Spec giao diện (§5.6) yêu cầu: đọc được 425/428 tệp thì vẫn đi tiếp, hiện một dòng nói thiếu bao nhiêu, một câu khẳng định *"không ảnh hưởng kết quả"*, và hai nút `Tiếp tục` / `Xem tệp bị bỏ qua`. Vì vậy `analysis.counts.skippedFiles` và `skipped.json` là dữ liệu bắt buộc, không phải ghi chú.

## 4. Danh sách bỏ qua khi quét

`analyze/inventory.py` quét `work/` và **tôn trọng `.gitignore`** của dự án (dùng thư viện `pathspec`), cộng thêm danh sách cứng ở trên. Tệp bị bỏ qua không tính vào `totalFiles` — người dùng thấy "500 tệp", không thấy "500 tệp + 12.000 tệp trong node_modules".

Ngoại lệ có chủ đích: **các tệp cấu hình luôn được đọc kể cả khi bị ignore** — `.env.example`, `docker-compose.yml`, `Dockerfile`, `.github/workflows/*` — vì đó chính là chỗ phát hiện nhóm rủi ro (`docs/04` §5).

## 5. Việc phải làm

- [ ] `ingest/guard.py`: hàm `safe_relpath()` + test cho 12 trường hợp tấn công (zip slip, ADS, symlink, `..`, đường dẫn tuyệt đối, tên rỗng, zip bomb).
- [ ] `ingest/folder.py`: copy có bỏ qua thư mục rác, đặt chỉ đọc, ghi manifest.
- [ ] `ingest/zipfile.py`: giải nén từng entry qua `safe_relpath`, bóc thư mục gốc chung, giới hạn tỉ lệ nén.
- [ ] `ingest/github.py`: clone depth 1, tắt prompt, ánh xạ lỗi git sang mã lỗi, xoá `.git` sau khi clone.
- [ ] `manifest.py`: hash + so sánh trước/sau; test khẳng định `origin/` không đổi sau một phiên đầy đủ.
- [ ] `skipped.json` + đếm `skippedFiles`, có test với fixture chứa tệp nhị phân và tệp quá lớn.
- [ ] Dọn dẹp: `trolyduan clean --older-than 30d` xoá thư mục `work/` cũ (người dùng phải chạy, không tự xoá).

**Tiêu chí nghiệm thu:** 12 test tấn công ở `guard` đều bị từ chối; một thư mục 5.000 tệp copy xong dưới 20 giây; một `.zip` 200 MB giải nén đúng và bị chặn khi vượt ngưỡng; link GitHub private cho ra đúng câu *"Link bạn dán đang ở chế độ riêng tư…"*; sau một phiên đầy đủ, hash của `origin/` y hệt lúc đầu.
