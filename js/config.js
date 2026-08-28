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
    appsScriptUrl: "", // VD: "https://script.google.com/macros/s/XXXX/exec"
    // true: bắt buộc mã nhân viên phải có trong Google Sheet mới được chơi.
    // Nếu appsScriptUrl để trống, hệ thống tự bỏ qua bước kiểm tra này (để
    // tiện demo/test khi chưa deploy backend) — không cần đổi giá trị này.
    requireVerification: true
  },

  // Danh sách mảnh ghép / câu đố. Có thể thêm/bớt phần tử để đổi số lượng
  // mảnh (đề xuất 8-12 mảnh cho trải nghiệm 5-10 phút).
  // type: "mcq"   -> trắc nghiệm, answer là INDEX (0-based) của đáp án đúng trong options
  // type: "short" -> nhập đáp án ngắn, answer là MẢNG các đáp án chấp nhận (không phân biệt hoa/thường)
  pieces: [
    { id:1, type:"mcq", prompt:"Trung thu là ngày lễ diễn ra vào ngày nào theo âm lịch?",
      options:["Rằm tháng 7","Rằm tháng 8","Mùng 1 tháng 9","Rằm tháng 10"], answer:1 },
    { id:2, type:"mcq", prompt:"Đâu là một trong những giá trị cốt lõi thường gắn với văn hoá YODY?",
      options:["Tận tâm với khách hàng","Chậm mà chắc, không cần đổi mới","Làm việc một mình","Giữ bí mật nội bộ tuyệt đối"], answer:0 },
    { id:3, type:"short", prompt:"Điền từ còn thiếu: 'Đoàn ___ là tinh thần của ngày Tết Trung thu.'", answer:["viên","đoàn viên"] },
    { id:4, type:"mcq", prompt:"Chiếc bánh không thể thiếu trong dịp Trung thu là gì?",
      options:["Bánh chưng","Bánh trung thu","Bánh mì","Bánh xèo"], answer:1 },
    { id:5, type:"mcq", prompt:"Con vật nào thường xuất hiện cùng chị Hằng trong truyện cổ tích Trung thu?",
      options:["Thỏ ngọc","Rồng vàng","Sư tử","Hạc trắng"], answer:0 },
    { id:6, type:"mcq", prompt:"Hoạt động nào sau đây gắn liền với đêm hội Trung thu?",
      options:["Rước đèn, phá cỗ","Đua thuyền","Thả diều mùa hè","Đón giao thừa"], answer:0 },
    { id:7, type:"short", prompt:"YODY là thương hiệu thời trang của Việt Nam — hãy điền chữ còn thiếu: 'Y_DY'.", answer:["O","o"] },
    { id:8, type:"mcq", prompt:"Điều gì thể hiện tinh thần 'đồng đội' trong công việc tại YODY?",
      options:["Giúp đỡ, hỗ trợ đồng nghiệp khi cần","Làm xong việc của mình là đủ","Cạnh tranh nội bộ gay gắt","Không chia sẻ thông tin"], answer:0 },
    { id:9, type:"mcq", prompt:"Chiếc đèn truyền thống trẻ em hay rước trong đêm Trung thu gọi là gì?",
      options:["Đèn ông sao","Đèn dầu","Đèn pin","Đèn led"], answer:0 },
    { id:10, type:"mcq", prompt:"Khi ghép đủ tất cả các mảnh, vầng trăng YODY tượng trưng cho điều gì?",
      options:["Sự chia cắt","Sự đoàn viên, gắn kết","Sự cạnh tranh","Sự nghỉ ngơi"], answer:1 }
  ]
};
