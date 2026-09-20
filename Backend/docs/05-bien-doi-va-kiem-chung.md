# 05 — Biến đổi & kiểm chứng

Đầu vào: `work/` + kế hoạch thay đổi + quyết định của người dùng. Đầu ra: `work/` đã sửa, diff, `CHANGES.md`, và kết quả kiểm chứng.

## 1. Nguyên tắc

1. **Không regex để sửa code.** Mọi thay đổi định danh và chú thích đi qua AST (LibCST/tree-sitter), ghi lại tại đúng vị trí node. Regex chỉ dùng để *đọc* bằng chứng ở tệp cấu hình.
2. **Ghi atomic.** Ghi ra `<tệp>.tmp` cùng thư mục → `os.replace`. Không bao giờ để lại tệp nửa vời nếu tiến trình chết giữa lô.
3. **Giữ nguyên định dạng.** LibCST giữ được khoảng trắng, dấu ngoặc, thứ tự trường; đây là lý do chọn nó. Ngoại lệ duy nhất: chú thích bị dịch nên dài/ngắn hơn — chỉ ghi lại đúng dòng chú thích đó.
4. **Giữ mã hoá gốc** đã ghi ở `analyze/inventory.py` (tệp `cp1258` phải ở lại `cp1258`).
5. **Lưu bản trước khi sửa, ở dạng tệp chứ không chỉ trong DB.** Trước khi chạm vào một tệp, bản gốc được copy vào `work/<phiên>/.backup/<đường-dẫn-tương-đối>`; `changes.before_text` trong SQLite chỉ dùng để sinh diff nhanh, và **được phép bỏ trống với tệp lớn**. Lý do: nếu chỉ dựa vào `before_text`, một tệp >1 MB sẽ không hoàn tác được, và `/revert` sẽ khôi phục nửa vời — bản `work/` còn lẫn cả nội dung cũ và mới, đúng kiểu hỏng khó phát hiện nhất. Quy tắc: **tệp nào bị sửa thì tệp đó phải có bản sao trong `.backup/`**, không có ngoại lệ; hết dung lượng thì dừng phiên và báo, không sửa tiếp.
6. **Thứ tự cố định:** đổi tên → dịch chú thích → viết tài liệu → áp dụng thay đổi rủi ro đã được đồng ý → sinh diff. Đổi tên trước vì dịch chú thích sau đó sẽ dùng tên mới trong câu văn, tránh phải dịch hai lần.

---

## 2. Đổi tên an toàn (`transform/rename.py`)

Với mỗi phép `rename_identifier`, chỉ sửa những chỗ **thực sự trỏ tới cùng một định nghĩa**:

| Trường hợp | Xử lý |
|---|---|
| Biến/hàm cục bộ, tham số, biến lớp | Đổi theo scope đã phân tích, không đụng tên trùng ở scope khác |
| Hàm/lớp toàn cục trong một module | Đổi định nghĩa + mọi chỗ dùng trong dự án (đã đếm tham chiếu ở `analyze`) |
| `import x as y`, `from m import f as g` | Đổi phần alias; nếu là import từ thư viện ngoài thì **không** đổi |
| `__all__`, `export`, `pub` | Đổi cả hai vế để giữ API |
| Decorator, type hint, annotation, f-string | Đổi vì đều là node định danh |
| Thuộc tính dataclass / Pydantic / Django model | Đổi, **nhưng**: Django field ⇒ ghi cảnh báo "cần `makemigrations`" vào `CHANGES.md`; Pydantic field ⇒ cảnh báo nếu model có `alias` hoặc dùng trong response API |
| Route/URL name, tên lệnh CLI, tên biến môi trường | Không tự đổi ⇒ đã bị đẩy sang nhóm rủi ro từ `analyze` |
| Tên xuất hiện trong **chuỗi** | Không đổi (đã bị loại ở `analyze`) |

Sau khi đổi một định danh: **không** còn lần xuất hiện nào của tên cũ trong phạm vi đã xác định. Đây là một trong các bất biến được `verify/references.py` kiểm lại (§4).

Nếu hai phép đổi tên cho ra cùng một tên trong cùng scope (xung đột sau khi dịch): đổi phép sau thành tên có hậu tố nghĩa (`get_user_v2` → `fetch_user`), ghi lại quyết định vào log; không im lặng đổi tên khác.

**Tên do AI đề xuất phải qua kiểm tra trước khi dùng — không tin đầu ra của mô hình.** Đây là chỗ một prompt injection trong chú thích repo có thể biến thành hành động thật, nên luật phải cứng:

| Luật cho tên mới | Lý do |
|---|---|
| Khớp `^[A-Za-z_][A-Za-z0-9_]*$` | Chặn `../../evil`, `a/b`, `x;rm -rf`, tên có dấu cách, tên Unicode lạ |
| Không phải từ khoá Python (`keyword.iskeyword`) và không trùng tên builtin đang dùng | Tránh sinh code không chạy được |
| Không chứa `__` ở hai đầu trừ khi tên cũ cũng vậy | Tránh vô tình tạo tên đặc biệt của Python |
| Độ dài ≤ 64 ký tự | Tên dài là dấu hiệu mô hình đang trả về cả câu |
| Không đổi kiểu chữ giữa các tệp cùng một định danh | Nhất quán |

Tên nào vi phạm ⇒ **giữ nguyên tên cũ** cho định danh đó, ghi một dòng vào `verification.warnings`, và không thử lại quá 2 lần. Không bao giờ để tên do AI sinh ra đi thẳng vào đường dẫn hay lệnh.

## 3. Dịch chú thích (`transform/translate.py`)

- Gom chú thích theo tệp, mỗi lô ≤ 40 chú thích, gửi kèm **ngữ cảnh ngắn**: chữ ký hàm/lớp mà chú thích nằm trên, 3 dòng code ngay dưới.
- Prompt yêu cầu: giữ nguyên thụt lề và ký tự bắt đầu chú thích; **không** dịch tên định danh, đường dẫn, lệnh, tên khoá cấu hình, số liệu; không thêm/bớt nội dung; nếu không chắc thì trả lại nguyên văn.
- Kiểm tra kết quả trước khi ghi (rẻ, chạy tại chỗ):
  1. số dòng trả về == số dòng gửi đi;
  2. ký tự bắt đầu chú thích (`#`, `//`, `/*`, `"""`) không đổi;
  3. không xuất hiện từ khoá lạ ngoài dự kiến (`def `, `import `, `{}` mới, `<script`…);
  4. mọi URL, đường dẫn, số, và tên trong backtick giữ nguyên;
  5. văn bản không rỗng, không lẫn chỉ thị của mô hình ("Dưới đây là bản dịch…").
- Lô nào vi phạm ⇒ **giữ nguyên chú thích gốc** cho lô đó, ghi một dòng vào `verification.warnings`, không thử lại quá 2 lần (đừng đốt tiền của người dùng vì một chú thích).

## 4. Viết tài liệu (`transform/docs.py`)

Tám tệp trong `work/docs/vi/` (số lượng thật lấy từ `analysis.counts.docsToWrite`):

| Tệp | Nội dung | Nguồn |
|---|---|---|
| `gioi-thieu.md` | Dự án là gì, làm được gì, dành cho ai | 3 câu tóm tắt của `analyze/summary.py` |
| `cai-dat.md` | Cách cài, yêu cầu môi trường, biến cần đặt | `entrypoints.py` + `contracts.py` |
| `su-dung.md` | Cách chạy, các màn hình/chức năng chính, tài khoản mẫu nếu có | route/endpoint + `run/usage.py` |
| `kien-truc.md` | Các thư mục chính và việc chúng làm; luồng một yêu cầu đi qua đâu | cây thư mục + import graph |
| `du-lieu.md` | Các model/bảng và quan hệ giữa chúng | model definitions |
| `cau-hinh.md` | Mọi khoá cấu hình, ý nghĩa, giá trị mẫu — **không bao giờ** kèm giá trị thật | `contracts.py` |
| `quy-uoc.md` | Quy ước code đang dùng (đặt tên, cấu trúc tệp) | mẫu thực tế trong dự án |
| `thay-doi.md` | Bản dịch tiếng Việt của `CHANGES.md` | diff |

Quy tắc: **không bịa**. Thiếu dữ kiện thì ghi thẳng *"Mình chưa thấy thông tin về phần này trong dự án."* Mọi tệp tài liệu đều bắt đầu bằng một dòng nói rõ nó được sinh tự động từ phiên nào.

## 5. Thay đổi rủi ro đã được đồng ý

Người dùng chọn `"Vẫn đổi tên"` nghĩa là họ chấp nhận rủi ro — nên phải đổi **nhất quán ở mọi nơi trong repo**: định nghĩa, mọi tham chiếu trong code, tệp `.env.example`, `docker-compose.yml`, workflow CI, `deploy.yaml`. Đổi nửa vời là cách chắc chắn nhất để làm hỏng dự án.

Vì hạ tầng thật (biến môi trường trên máy chủ, secret trong CI) nằm **ngoài repo**, backend không thể sửa được — nên `CHANGES.md` phải có một mục riêng, in đậm:

> **Việc bạn phải làm sau khi tải về:** tên `DATABASE_URL` đã đổi thành `DB_URL` trong mã và trong các tệp cấu hình của dự án. Máy chủ của bạn có thể đang khai báo biến môi trường với tên cũ — hãy cập nhật ở đó trước khi triển khai, nếu không máy chủ sẽ không kết nối được cơ sở dữ liệu.

Không có mục này ⇒ phép biến đổi rủi ro không được phép chạy (test bắt buộc).

## 6. Diff, `CHANGES.md` và quay lại

- Diff: unified diff từng tệp (`before_text` vs nội dung mới) lưu vào `changes` và trả qua `GET /api/sessions/{id}/changes`, phục vụ mục *"Xem lại từng thay đổi mình đã làm"* (217 thay đổi).
- `CHANGES.md` (tiếng Việt) ở gốc bản xuất: số lượng theo loại, danh sách nhóm rủi ro và lựa chọn của người dùng, **việc cần làm sau khi tải về**, và dòng *"Bản gốc vẫn nguyên vẹn ở `<đường dẫn gốc>`."*
- `POST /api/sessions/{id}/revert` — ghi lại nội dung gốc từ SQLite cho mọi tệp đã đổi (dùng khi kiểm chứng hỏng). Chỉ hoạt động trước khi người dùng tải `.zip`; sau đó thư mục làm việc là nguồn sự thật.

---

## 7. Kiểm chứng (`verify/`)

Ba lớp, chạy theo thứ tự, dừng ở lớp nào hỏng thì vẫn chạy tiếp lớp nhẹ để báo cáo đầy đủ:

### Lớp 1 — Cú pháp (`syntax.py`, luôn chạy, không thực thi code)

- Parse lại **mọi** tệp đã chạm bằng đúng parser đã dùng để sửa; tệp nào không parse được ⇒ ghi vào `failed` kèm dòng lỗi.
- Với Python: thêm `compile()` để bắt lỗi cú pháp mà parser tha.
- Với TS/JS: nếu máy có `node`, chạy `node --check` trên tệp đã sửa (chỉ đọc, không thực thi).

### Lớp 2 — Liên kết (`references.py`, luôn chạy)

- Không còn tên cũ nào trong phạm vi đã xác định (đối chiếu với bất biến ở §2).
- Không tạo ra tên mới bị trùng trong cùng scope.
- Mọi import còn được dùng; không có import mới do máy sinh.
- `__all__`/`export` khớp với định nghĩa thật.
- Với Python: dựng import graph và kiểm không có vòng lặp import mới phát sinh.

### Lớp 3 — Chạy thử (`smoke.py`, chạy code người dùng — chỉ khi họ đồng ý)

> **Thứ tự triển khai:** lớp này **không** thuộc giai đoạn 2. Nó dùng lại `run/ports.py` + `run/process.py`, mà hai thứ đó chỉ có ở giai đoạn 3 (màn Run), nên lớp 3 đi cùng giai đoạn 3 — nếu không sẽ tạo phụ thuộc vòng giữa hai giai đoạn. Giai đoạn 2 nghiệm thu với lớp 1 + lớp 2, và trong thời gian đó `verification.summary` sẽ là `not_run` cho phần chạy thử (giao diện đã có nhánh hiển thị đúng cho trường hợp này).

- Hỏi một lần, ở bước `apply`, bằng một lựa chọn rõ nghĩa: *"Kiểm tra bằng cách chạy thử dự án (mình sẽ chạy đúng lệnh khởi động đã tìm thấy, trong thư mục làm việc)"* — mặc định bật.
- Cách chạy: dùng lại `run/detect.py` + `run/process.py` với chế độ `smoke`: chạy lệnh khởi động, chờ tối đa 45 giây, coi là đạt khi **cổng mở** hoặc log có dấu hiệu khởi động xong, rồi tắt tiến trình và dọn cổng.
- Nếu dự án có bộ test (`pytest`, `npm test`, `go test`): chạy bộ test thay cho smoke, timeout 300 giây, chỉ lấy kết quả tổng, không đổ log dài vào báo cáo.
- Không bật, hoặc không tìm thấy lệnh chạy, hoặc môi trường thiếu (không có `node`) ⇒ `summary: "not_run"` kèm lý do.

### Kết quả

```json
{ "syntax": {"ok": true, "checkedFiles": 500, "failed": []},
  "references": {"ok": true, "broken": []},
  "smoke": {"ran": true, "kind": "pytest", "ok": true, "seconds": 22, "logTail": "…"},
  "summary": "passed",
  "warnings": ["3 chú thích được giữ nguyên vì bản dịch không đạt kiểm tra."] }
```

`summary`: `passed` · `passed_with_warnings` · `failed` · `not_run`.

⚠️ **Việc frontend phải sửa:** màn Done hiện hard-code dòng *"✓ Đã kiểm tra: dự án vẫn chạy tốt, không lỗi"*. Phải đổi thành bốn nhánh theo `summary` (`copy.ts`), vì nói "vẫn chạy tốt" khi `not_run` là nói sai với người dùng.

### Khi hỏng

- Không tự sửa (tránh vòng lặp tự sửa sai).
- Trả về danh sách tệp lỗi + đoạn mã quanh lỗi; người dùng có ba lựa chọn: `Thử lại chỉ những phép này` · `Quay lại bản gốc` (`/revert`) · `Vẫn tải bản đã sửa`.
- Nếu lớp 1 hỏng ở một tệp: chỉ tệp đó bị loại khỏi bản xuất (quay về nội dung gốc), các tệp khác giữ nguyên thay đổi — và điều này phải hiện rõ trong báo cáo, không im lặng.

---

## 8. Việc phải làm

- [ ] `rename.py`: đổi theo scope trên LibCST; **luật tên ở §2 (regex, từ khoá Python, độ dài) có test riêng với đầu ra giả của mô hình gồm cả `../../evil` và tên rỗng**; 14 test tình huống (alias import, `__all__`, decorator, f-string, thuộc tính class, biến trùng tên khác scope, Django field, Pydantic alias).
- [ ] `translate.py`: lô + 5 kiểm tra kết quả + nhánh "giữ nguyên khi lô lỗi"; test bằng mô hình giả (không gọi mạng trong test).
- [ ] `docs.py`: 8 tệp, quy tắc "không bịa"; test khẳng định tệp `cau-hinh.md` không chứa giá trị thật của bất kỳ khoá nào.
- [ ] `writer.py`: ghi atomic + giữ mã hoá + **sao lưu `.backup/` cho mọi tệp bị sửa**; test ghi khi tệp đang bị IDE giữ (sharing violation trên Windows) ⇒ retry rồi báo `perm.unwritable`, không để lại `.tmp`.
- [ ] `verify/syntax.py`, `verify/references.py`: chạy trên fixture trước/sau; test bắt buộc có một fixture "sửa hỏng" để chắc chắn lớp 2 phát hiện được.
- [ ] `verify/smoke.py`: chế độ smoke + dùng bộ test nếu có + timeout + dọn tiến trình; test với fixture Flask nhỏ. **Thuộc giai đoạn 3** (§7).
- [ ] `/revert` + test "quay lại rồi hash khớp bản gốc".
- [ ] `CHANGES.md`: mục "việc bạn phải làm sau khi tải về" là **bắt buộc** khi có thay đổi rủi ro (test).

**Tiêu chí nghiệm thu:** chạy đổi tên + dịch trên fixture Python 500 tệp: lớp 1 và 2 đạt 100%; smoke đạt; diff hiển thị được từng thay đổi; `origin/` không đổi một byte; sau `/revert`, hash của toàn bộ `work/` khớp `manifest.json`; và **một dự án cố tình sửa hỏng phải bị phát hiện**, không được báo `passed`.
