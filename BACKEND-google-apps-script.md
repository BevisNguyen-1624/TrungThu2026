# Backend — Google Sheet làm database

Trình duyệt không thể đọc/ghi thẳng vào Google Sheet, nên cần một Google Apps
Script đóng vai trò API trung gian, đảm nhận 2 việc:

1. **Tra cứu nhân sự** — kiểm tra mã nhân viên có trong danh sách được phép
   chơi hay không, trả về họ tên + chức danh cho màn hình xác nhận.
2. **Ghi log** — mỗi lượt đăng nhập / mở mảnh / hoàn thành sẽ được ghi lại.

## Bước 1 — Chuẩn bị Google Sheet

Tạo một Google Sheet mới, gồm 2 tab (sheet con):

**Tab "Nhân sự"** — danh sách người được phép chơi, đúng thứ tự cột:

| A: Mã NV | B: Họ tên      | C: Chức danh        |
|----------|----------------|----------------------|
| YD00123  | Nguyễn Văn A   | Nhân viên Kho vận    |
| YD00456  | Trần Thị B     | Trưởng phòng Marketing |

Dòng 1 là tiêu đề (header), dữ liệu bắt đầu từ dòng 2. Mã nhân viên nên nhập
đúng như cách người chơi sẽ gõ (script so khớp không phân biệt hoa/thường).

**Tab "Log"** — để trống, script sẽ tự tạo và ghi vào khi có người chơi.

## Bước 2 — Deploy Apps Script

1. Vào **Extensions → Apps Script**, xoá nội dung mặc định, dán đoạn code bên dưới, bấm **Save**.
2. Bấm **Deploy → New deployment → chọn loại "Web app"**.
   - Execute as: **Me**
   - Who has access: **Anyone**
3. Bấm **Deploy**, copy URL kết thúc bằng `/exec`.
4. Mở `js/config.js`, dán URL đó vào `CONFIG.backend.appsScriptUrl`.

```javascript
const SHEET_NHANSU = "Nhân sự";
const SHEET_LOG = "Log";

function doGet(e) {
  if (e.parameter.action === "lookup") {
    var code = String(e.parameter.code || "").trim().toLowerCase();
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NHANSU);
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var maNV = String(rows[i][0] || "").trim().toLowerCase();
      if (maNV && maNV === code) {
        return jsonOut({ found: true, name: rows[i][1] || "", title: rows[i][2] || "" });
      }
    }
    return jsonOut({ found: false });
  }
  return jsonOut({ ok: true });
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOG)
              || SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_LOG);
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    data.ts, data.type, data.employeeCode, data.pieceId || "",
    data.totalUnlocked || "", data.rewardCode || ""
  ]);
  return jsonOut({ ok: true });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
         .setMimeType(ContentService.MimeType.JSON);
}
```

## Ghi chú

- Sheet "Log" sẽ có các cột: `ts | type | employeeCode | pieceId | totalUnlocked | rewardCode`.
- Nếu để trống `appsScriptUrl` trong `config.js`, minigame **bỏ qua bước kiểm
  tra nhân sự** (ai điền mã gì cũng qua được màn xác nhận) — tiện để demo/test
  nhanh khi chưa deploy backend. Khi triển khai thật, nhớ dán URL vào để bật
  tính năng kiểm tra danh sách.
- Muốn tắt hẳn yêu cầu kiểm tra danh sách (kể cả khi đã có `appsScriptUrl`,
  ví dụ chỉ dùng backend để log mà không giới hạn người chơi): đổi
  `CONFIG.backend.requireVerification` trong `config.js` thành `false`.
- Mỗi lần sửa code trong Apps Script, phải bấm **Deploy → Manage deployments
  → Edit (biểu tượng bút chì) → Version: New version → Deploy** thì thay đổi
  mới có hiệu lực trên URL cũ (không tự cập nhật).

