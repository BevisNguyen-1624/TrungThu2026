/* =============================================================================
   CONFIG.JS — CẤU HÌNH CHIẾN DỊCH
   Đây là file DUY NHẤT cần sửa để tái sử dụng minigame cho campaign khác:
   đổi tiêu đề, số mảnh, nội dung câu hỏi, phần thưởng, hoặc backend.
   Không cần đụng vào index.html / style.css / app.js.
   ============================================================================= */

const CONFIG = {
  // Tiêu đề hiển thị trên tab trình duyệt và thanh thương hiệu
  campaignTitle: "GHÉP TRĂNG ĐOÀN VIÊN",

  // Phần thưởng hiển thị khi người chơi hoàn thành đủ số mảnh
  reward: {
    code: "YODY-MOON-2026",
    note: "Đưa mã này cho ban tổ chức tại quầy sự kiện để nhận quà nhé."
  },

  // Để log tiến trình vào Google Sheet: deploy một Google Apps Script Web App
  // (xem hướng dẫn + script mẫu trong file BACKEND-google-apps-script.gs.txt
  // đi kèm) rồi dán URL /exec vào đây.
  // Để log tiến trình vào Google Sheet VÀ để kiểm tra mã nhân viên có trong
  // danh sách nhân sự hay không: deploy một Google Apps Script Web App (xem
  // hướng dẫn + script mẫu trong BACKEND-google-apps-script.md) rồi dán URL
  // /exec vào đây. URL này dùng chung cho cả log (POST) và tra cứu (GET).
  backend: {
    appsScriptUrl: "https://script.google.com/macros/s/AKfycby5nuugd-QX4XwyLeidEBHfEFWyalAvMeFAliL13_iSxs2SrTl70MHRqlmmB7VXvHSz/exec", // VD: "https://script.google.com/macros/s/XXXX/exec"
    // true: bắt buộc mã nhân viên phải có trong Google Sheet mới được chơi.
    // Nếu appsScriptUrl để trống, hệ thống tự bỏ qua bước kiểm tra này (để
    // tiện demo/test khi chưa deploy backend) — không cần đổi giá trị này.
    requireVerification: true
  },

  // Danh sách mảnh ghép / câu đố. Có thể thêm/bớt phần tử để đổi số lượng
  // mảnh (đề xuất 8-12 mảnh cho trải nghiệm 5-10 phút).
  // type: "mcq"   -> trắc nghiệm, answer là INDEX (0-based) của đáp án đúng trong options
  // type: "short" -> nhập đáp án ngắn, answer là MẢNG các đáp án chấp nhận (không phân biệt hoa/thường)
  pieces: 
    [
  { id:1, type:"mcq", prompt:"Tết Trung Thu diễn ra vào ngày nào theo lịch âm?", options:["Rằm tháng 7","Rằm tháng 8","Mùng 1 tháng 8","Rằm tháng 10"], answer:1 },
  { id:2, type:"short", prompt:"Điền từ còn thiếu: 'Tết Trung Thu còn được gọi là Tết Đoàn _____.'", answer:["viên"] },
  { id:3, type:"mcq", prompt:"Hai loại bánh truyền thống không thể thiếu trong dịp Trung Thu là gì?", options:["Bánh chưng & Bánh giầy","Bánh dẻo & Bánh nướng","Bánh xèo & Bánh khọt","Bánh giò & Bánh tét"], answer:1 },
  { id:4, type:"mcq", prompt:"Theo truyền thuyết dân gian Việt Nam, ai là người sống trên Cung Trăng cùng chú Cuội?", options:["Thỏ Ngọc","Chị Hằng","Mẫu Cửu Trùng Thiên","Tây Vương Mẫu"], answer:1 },
  { id:5, type:"short", prompt:"Loại đèn truyền thống làm bằng giấy kiếng hình ngôi sao 5 cánh rất phổ biến dịp Trung Thu gọi là gì?", answer:["Đèn ông sao","Đèn sao"] },
  { id:6, type:"mcq", prompt:"Mây che trăng đêm Trung Thu thường được dân gian dự đoán điều gì cho năm sau?", options:["Mất mùa","Bội thu / Mùa màng bội thu","Hạn hán","Bão lớn"], answer:1 },
  { id:7, type:"mcq", prompt:"Hình ảnh con vật nào thường xuất hiện trong điệu múa sôi động vào đêm hội Trung Thu?", options:["Con Mèo","Con Lân","Con Ngựa","Con Phượng"], answer:1 },
  { id:8, type:"short", prompt:"Trái cây đặc trưng màu đỏ/màu xanh, vỏ dày, cúng rằm Trung Thu thường được tỉa thành hình con chó xù tên là quả gì?", answer:["Quả bưởi","Trái bưởi","Bưởi"] },
  { id:9, type:"mcq", prompt:"Mâm cỗ Trung Thu truyền thống thường gồm những gì?", options:["Bánh, ngũ quả và đèn lồng","Bánh chưng, dưa hành","Hoa đào, bánh tét","Trái cây mùa hè, hoa cúc"], answer:0 },
  { id:10, type:"mcq", prompt:"Đồ chơi dân gian Trung Thu làm bằng bột gạo nhuộm màu, nặn thành các hình thù đáng yêu gọi là gì?", answer:["Tè he","Tò he","Búp bê bột","Đồ chơi đất nặn"], answer:1 }
]
};
