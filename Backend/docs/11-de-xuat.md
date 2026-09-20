# 11 — Đề xuất của người phản biện cuối

> Đọc độc lập toàn bộ `Backend/README.md`, `docs/01`–`10`, `Frontend/README.md`, `frontend-v2.md` và đối chiếu `Frontend/src`. Không sửa tệp nào khác.

## 1. Đánh giá tổng thể

Đủ để bắt tay code GĐ0–GĐ1, chưa đủ để cam kết GĐ2–GĐ4 đúng hẹn.

| 3 điểm mạnh nhất | Bằng chứng |
|---|---|
| Ranh giới FE/BE + ma trận phủ từng màn hình, việc FE liệt kê hết (17 việc) | `docs/02-hop-dong-api.md:354`, `docs/09-lo-trinh.md:132-156` |
| Bảo mật local làm nghiêm túc: token không qua HTTP, proxy khác origin, kill cây tiến trình, env allowlist | `docs/01-kien-truc.md:223-239`, `docs/06-chay-thu-du-an.md:61-62,123-130` |
| Chế độ chỉ-AST + `degraded` + validate cả 5 prompt: bản không AI vẫn có giá trị | `docs/07-cau-hinh-credential-llm.md:150-176`, `docs/09-lo-trinh.md:30-50` |

| 3 điểm yếu nhất | Bằng chứng |
|---|---|
| Đổi tên AST quá tự tin trên Python động: `decorator`, `__all__`, f-string có nêu, nhưng `__slots__`, metaclass, `property` setter, `__getattr__`, gán ngoài class (monkey-patch), code sinh tự động (migration) không có luật nào | `docs/04-phan-tich.md:32-52`, `docs/05-bien-doi-va-kiem-chung.md:16-31` |
| Phễu người không biết lập trình bị xem nhẹ: BYO key + tự có Python/Node/git + `uv tool install` là 3 cú rơi liên tiếp, tài liệu coi `doctor` nói rõ là xong | `docs/06-chay-thu-du-an.md:38-45`, `docs/08-luu-tru-van-hanh-kiem-thu.md:84-93`, `docs/09-lo-trinh.md:162-174` |
| Chi phí thật của repo lớn chưa được tính: ngưỡng 50.000 tệp nhưng test hiệu năng chỉ 500 tệp/60 giây; 1.842 chú thích ≈ 46 lô LLM, chưa có trần tiền theo chặng hay ước lượng VND | `docs/03-nhan-du-an.md:78-92`, `docs/04-phan-tich.md:136-152`, `docs/07-cau-hinh-credential-llm.md:127-134` |

## 2. Mâu thuẫn hoặc lỗi còn lại

| Tệp:dòng | Vấn đề | Mức |
|---|---|---|
| `docs/08-luu-tru-van-hanh-kiem-thu.md:116` vs `docs/03-nhan-du-an.md:110` | Mặc định giữ `work/` cũ: một chỗ ghi 7 ngày, một chỗ ghi `--older-than 30d`. Chưa thống nhất con số và cờ lệnh | P1 |
| `Frontend/src/types.ts:47` vs `docs/02-hop-dong-api.md:165,273` | `ProjectRun.needs` trong code là `string`, hợp đồng API trả mảng `["Python 3.11…"]`. Việc FE #4 (`docs/09-lo-trinh.md:138`) không nhắc `needs`, nối vào là vỡ kiểu | P1 |
| `docs/02-hop-dong-api.md:300` | Viết tài liệu: `progress.phase=docs, unit=files` nhưng cùng dòng lại bảo FE "đọc thêm `unit=docs`". Không rõ `unit` là `files` hay `docs` | P1 |
| `docs/01-kien-truc.md:90-93` vs `docs/01-kien-truc.md:189`, `docs/08-luu-tru-van-hanh-kiem-thu.md:133` | Cây thư mục `jobs/` thiếu `sweeper.py` dù vòng đời và việc phải làm đều yêu cầu nó | P2 |
| `docs/07-cau-hinh-credential-llm.md:35` vs `docs/04-phan-tich.md`, `docs/05-bien-doi-va-kiem-chung.md` | Key `naming.strictNormalization` không có consumer nào trong logic phân tích/biến đổi. Config treo | P2 |
| `docs/02-hop-dong-api.md:202` vs `docs/08-luu-tru-van-hanh-kiem-thu.md:19` | `POST …/apply` key quyết định bằng tên khoá (`DATABASE_URL`), bảng `decisions` key bằng `item_key`, còn `changes` dùng `id` số. Chưa định nghĩa ánh xạ tên khoá → `id` thay đổi | P2 |

Không tìm thấy mâu thuẫn nào ở mức P0 (lỗi chặn GĐ0). Các mâu thuẫn P0 cũ (token qua HTTP, proxy cùng origin, kill cha bỏ con) đã sửa thật.

## 3. Đề xuất thêm (toàn bộ là việc mới, chưa có trong tài liệu)

### (a) Nên làm ngay ở GĐ0–GĐ1

| Vấn đề → Đề xuất → Vì sao → Chi phí → Không làm thì hỏng gì |
|---|
| AST đổi sai `__slots__`/metaclass/`property`/monkey-patch → Thêm deny-list: gặp các mẫu này thì auto `risky` hoặc bỏ qua + 1 fixture red-team cho mỗi mẫu → Vì đây là cách hỏng âm thầm nhất, lớp 1+2 không bắt được → ~2–3 ngày → Đổi tên làm hỏng runtime mà kiểm chứng vẫn `passed` |
| Copy 500 MB rồi mới báo hết đĩa/thiếu runtime → Preflight trước ingest: kiểm đĩa trống 3×, `doctor` (python/node/git), trạng thái khoá AI, trả một response duy nhất → Vì lỗi phát hiện càng muộn càng tốn thời gian user không chuyên → ~1 ngày → User chờ copy xong mới biết máy mình không chạy được |
| GĐ1 mặc định đã hứa "sửa" → Đặt chế độ mặc định là **chỉ đọc báo cáo + chạy thử**, nút sửa là chọn thêm rõ ràng → Vì giá trị GĐ1 nằm ở báo cáo AST, còn sửa là rủi ro → ~0.5 ngày (cờ + câu chữ) → Bản cộng đồng đầu tiên đã có thể phá code user |
| Máy user thiếu git hoặc `uv`/pip chậm trên Windows → Fallback: thiếu git thì hướng dẫn tải `.zip` thay vì báo lỗi khô; `uv` thất bại thì thử `pip`, timeout rõ từng bước → Vì GĐ1–GĐ3 sập hoàn toàn nếu 2 binary này thiếu/chậm → ~1–2 ngày → User kẹt ở ingest/cài đặt không lối thoát |
| Fixture 500 tệp không đại diện repo thật → Thêm fixture gai: repo lai Python+JS, `node_modules` lẫn, `.gitignore` sai, migration Django, file `cp1258` → Vì phân tích thật luôn gặp rác → ~1–2 ngày → GĐ1 pass fixture nhưng hỏng trên repo thật đầu tiên |

### (b) Nên làm trước khi phát hành bản cộng đồng

| Vấn đề → Đề xuất → Vì sao → Chi phí → Không làm thì hỏng gì |
|---|
| `uv tool install` đòi máy đã có Python — quả trứng con gà với người không biết lập trình → Đóng gói 1 lệnh thật (bundle Python hoặc trình cài có kiểm tra + link cài từng bước) và test trên máy Windows trắng không có Python → Vì đây là điều kiện cần của "miễn phí cho cộng đồng" → ~3–5 ngày → Tỉ lệ bỏ cuộc ở màn hình đầu ≈ 100% với đúng persona mục tiêu (chưa kiểm chứng được, cần đo) |
| Trần 2M token/phiên là tiền trừu tượng → Trần theo chặng + ước lượng VND trước nút "Bắt đầu xử lý", dừng khi vượt và hỏi tiếp → Vì user tự trả tiền, số token không giúp họ quyết định → ~1–2 ngày → Một repo 5.000 tệp đốt hết tiền túi user trong một phiên |
| Quy tắc "không bịa" chưa có cách đo → Blind test: repo thiếu README/route, assert `summary`/`usage` phải nói "chưa thấy" thay vì bịa → Vì LLM luôn muốn trả lời hay hơn thật → ~1 ngày → Tài liệu và hướng dẫn chứa chức năng không tồn tại |
| Người không chuyên không đọc được "cổng 8687/địa chỉ 127.0.0.1" → Thêm nút "Mở dự án trong trình duyệt" dùng `directAddress`, health-check proxy trước khi hiện khung, câu lỗi nói "trình duyệt chặn nhúng" thay vì mã cổng → Vì màn Run hiện phơi địa chỉ thô (`docs/02-hop-dong-api.md:286-292`) → ~1 ngày → User thấy khung trắng và bỏ cuộc dù dự án đã chạy |
| BYO key là rào cản lớn nhất mà tài liệu coi là xong → Hướng dẫn dán key từng bước trong app (mở đâu, copy đoạn nào, key mẫu trông thế nào) + nút "dùng thử không cần key" đưa về chế độ chỉ-AST → Vì `llm.no_key` (`docs/02-hop-dong-api.md:29`) là câu chặn, không phải lối đi → ~1–2 ngày → Đa số user cộng đồng rơi ngay trước GĐ2 |

### (c) Cân nhắc, có thể bỏ

| Vấn đề → Đề xuất → Vì sao → Chi phí → Không làm thì hỏng gì |
|---|
| Tuỳ chọn "Tài liệu: Song ngữ" (`docs/09-lo-trinh.md:198-203`) → Bỏ, chỉ giữ tiếng Việt → Vì nhân đôi việc `docs.py` cho nhu cầu chưa ai xác nhận → Tiết kiệm ~2–3 ngày → Không hỏng gì; thêm lại sau nếu cộng đồng đòi |
| Proxy WebSocket thật cho HMR (`docs/06-chay-thu-du-an.md:79`) → Fallback reload thường, ghi rõ giới hạn → Vì bắc cầu WS hai chiều là việc khó, ít giá trị với người không chuyên → Tiết kiệm ~2–4 ngày → Mất HMR mượt, không mất khả năng chạy thử |
| Bảng `feedback`/`proposals` (`docs/08-luu-tru-van-hanh-kiem-thu.md:22-34`) → Dời khỏi 1.0, dùng GitHub Issues → Vì thu phản hồi thành dữ liệu là tính năng của team sản phẩm, không phải của công cụ local miễn phí → Tiết kiệm ~2 ngày → Mất phân tích phản hồi tự động, không mất phản hồi |

## 4. Phần tôi cho là thừa

| Chỗ thừa | Lý do cắt |
|---|---|
| `--isolate docker` (`docs/09-lo-trinh.md:199`, `docs/06-chay-thu-du-an.md:121`) | Persona không biết Docker là gì; tiến trình con + allowlist đã đủ cho 1.0. Giữ một cờ thiết kế mở là đủ, đừng code |
| 8 tệp tài liệu bắt buộc (`docs/05-bien-doi-va-kiem-chung.md:61-74`) | Repo nhỏ không có gì để viết 8 tệp; sinh cố sẽ bịa. Đổi thành "tối đa 8, bỏ tệp nào thiếu dữ kiện" |
| Kiểm cổng 2 họ địa chỉ + sổ đăng ký trên đĩa (`docs/06-chay-thu-du-an.md:48-56`) | Đúng nhưng quá sâu cho 1 user/1 máy. GĐ1–GĐ3 chỉ cần bind thật + retry 20 cổng trong bộ nhớ |
| `proposals` + `feedback` + `llm_cache` version tay (`docs/08-luu-tru-van-hanh-kiem-thu.md:29-34`, `docs/07-cau-hinh-credential-llm.md:132`) | Hạ tầng của team có telemetry; tool này đã tuyên bố không telemetry (`docs/08-luu-tru-van-hanh-kiem-thu.md:64`). Cache giữ, nhưng quy ước version tay thay bằng hash nội dung prompt |

## 5. Ba câu hỏi ngược

1. Ai cài Python/Node/git cho người không biết lập trình — nếu câu trả lời là "tự họ cài", persona mục tiêu có còn đúng không, và bản cộng đồng đầu tiên có nên chỉ hỗ trợ repo Python chạy được bằng Python đã đóng gói sẵn?
2. Thành công đo bằng gì khi đã tuyên bố không telemetry (`docs/08-luu-tru-van-hanh-kiem-thu.md:64`) — nếu không đo được tỉ lệ bỏ cuộc ở màn đầu và tỉ lệ chạy thử thành công, làm sao biết GĐ1 có đáng phát hành?
3. Có chấp nhận "không đổi tên, chỉ dịch chú thích + viết tài liệu + chạy thử" làm sản phẩm chính không — nếu đổi tên Python động là rủi ro cao nhất mà giá trị với người không đọc code là thấp nhất, vì sao nó vẫn nằm ở GĐ2 thay vì sau 1.0?

## 6. Đã xử lý (người duyệt ghi lại, không phải tác giả tệp này)

| Mục | Quyết định |
|---|---|
| §2 — sáu mâu thuẫn | **Nhận 5 mục đúng**, đã sửa: `clean` mặc định 7 ngày (`03`), `needs` từ `string` → `string[]` + ghi vào việc frontend #4 (`02`, `09`), `unit=docs` tách khỏi `unit=files` (`02`), thêm `sweeper.py` vào cây thư mục (`01`), định nghĩa consumer cho `naming.strictNormalization` (`07`), ánh xạ `riskyItems[].key == changes[].itemKey == decisions.item_key` (`02`). Mục `feedback`/`proposals` không phải lỗi — đã ghi chú là tuỳ chọn ở 1.0 (`08`) |
| §3(a) deny-list Python động | **Nhận** — thêm bảng deny-list + yêu cầu fixture red-team vào `docs/04` §3 và `docs/05` §2 |
| §3(a) preflight trước ingest | **Nhận** — thêm §2.0 vào `docs/03` (đĩa, runtime, quyền ghi, cổng) |
| §3(a) mặc định "chỉ đọc báo cáo" | **Chuyển thành câu hỏi cho người quyết** — câu 11 ở `docs/09` §5; đây là quyết định sản phẩm, không phải kỹ thuật |
| §3(b) cài đặt không cần Python | **Nhận** — nâng rủi ro lên mức **Cao** ở `docs/09` §3, thêm câu hỏi 9 |
| §3(b) trần chi phí theo chặng + ước lượng tiền | **Nhận** — ghi vào `docs/09` §3 (rủi ro "chi phí thật trên repo lớn") |
| §3(b) blind test luật "không bịa" | **Nhận** — thêm vào bảng kiểm thử `docs/08` §6 |
| §4 bỏ `proposals`/`feedback` khỏi 1.0 | **Nhận một phần** — giữ bảng nhưng ghi rõ là tuỳ chọn, có thể bỏ nếu dùng GitHub Issues |
| §4 "8 tệp tài liệu bắt buộc" → tối đa 8 | **Nhận** — sửa `docs/05` §4 |
| §4 kiểm cổng quá sâu, sổ đăng ký trên đĩa | **Nhận một phần** — bỏ sổ trên đĩa (dùng `run_state`), **giữ** kiểm bind hai họ địa chỉ vì đã gặp lỗi thật (`localhost` vs `127.0.0.1`) |
| §4 `--isolate docker` | **Nhận** — đã là tuỳ chọn giai đoạn sau, không code ở 1.0 |
| §4 tăng phiên bản prompt bằng tay | **Nhận** — đổi sang hash toàn văn prompt trong cache key (`docs/07` §4.4) |
| §3(c) bỏ tuỳ chọn song ngữ | **Để người quyết** — câu 8 ở `docs/09` §5 |
| §3(c) fallback không WebSocket | **Nhận** — ghi rõ kế hoạch dự phòng "bỏ HMR, giữ reload thường" vào `docs/06` §7 |
