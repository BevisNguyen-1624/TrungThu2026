# Backend — Google Sheet làm database

Trình duyệt không thể ghi thẳng vào Google Sheet, nên cần một Google Apps
Script đóng vai trò API trung gian. Các bước:

1. Tạo một Google Sheet mới.
2. Vào **Extensions → Apps Script**, xoá nội dung mặc định, dán đoạn code bên dưới, bấm **Save**.
3. Bấm **Deploy → New deployment → chọn loại "Web app"**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Bấm **Deploy**, copy URL kết thúc bằng `/exec`.
5. Mở `js/config.js`, dán URL đó vào `CONFIG.backend.appsScriptUrl`.

Từ lúc đó, mỗi lượt đăng nhập / mở mảnh / hoàn thành campaign sẽ tự động
được ghi thành 1 dòng trong sheet tên "Log" (tự tạo nếu chưa có), với các
cột: `ts | type | employeeCode | pieceId | totalUnlocked | rewardCode`.

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log")
              || SpreadsheetApp.getActiveSpreadsheet().insertSheet("Log");
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    data.ts, data.type, data.employeeCode, data.pieceId || "",
    data.totalUnlocked || "", data.rewardCode || ""
  ]);
  return ContentService.createTextOutput(JSON.stringify({ok:true}))
         .setMimeType(ContentService.MimeType.JSON);
}
```

Nếu để trống `appsScriptUrl`, minigame vẫn chạy bình thường — chỉ là
tiến trình sẽ không được lưu lại sau khi người chơi đóng tab.
