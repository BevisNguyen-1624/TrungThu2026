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
    code: "QUÁ XUẤT SẮC ĐI THUIIIIII!!!!!",
    note: "CHÚC MỪNG BẠN ĐÃ THÀNH CÔNG HÓA PHÉP CUNG TRĂNGGG"
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

  // Tính điểm dựa trên thời gian hoàn thành (giây), tính từ lúc bắt đầu vào
  // màn puzzle (KHÔNG tính thời gian xem hoạt ảnh trăng vỡ) đến lúc mở khoá
  // xong 10/10 mảnh. Công thức: điểm = baseScore - (số giây) x penaltyPerSecond,
  // không thấp hơn minScore. Chỉnh 3 số này để đổi độ khó ghi điểm.
  scoring: {
    baseScore: 1000,
    penaltyPerSecond: 3,
    minScore: 100
  },

  // Danh sách mảnh ghép / câu đố. Có thể thêm/bớt phần tử để đổi số lượng
  // mảnh (đề xuất 8-12 mảnh cho trải nghiệm 5-10 phút).
  // type: "mcq"   -> trắc nghiệm, answer là INDEX (0-based) của đáp án đúng trong options
  // type: "short" -> nhập đáp án ngắn, answer là MẢNG các đáp án chấp nhận (không phân biệt hoa/thường)
  pieces: [
  { id:1, type:"mcq", prompt:"Trung Thu truyền thống gắn liền với hai nhân vật cổ tích quen thuộc nào?", options:["Chú Cuội và Chị Hằng","Thạch Sanh và Lí Thông","Sơn Tinh và Thủy Tinh","Sọ Dừa và Cô Út"], answer:0 },
  { id:2, type:"mcq", prompt:"Loại đèn truyền thống trở thành biểu tượng cho dịp lễ Trung thu được gọi là đèn gì?", options:["Đèn giao thông","Đèn ông sao","Đèn mặt trời","Đèn ông trăng"], answer:1 },
  { id:3, type:"mcq", prompt:"Đêm Trung thu hàng năm là ngày nào?", options:["15/08 hằng năm","15/7 hằng năm","15/8 âm lịch hằng năm","15/9 âm lịch hằng năm"], answer:2 },
  { id:4, type:"mcq", prompt:"Chú Cuội trong sự tích Trung Thu đã bay lên Cung Trăng cùng với cây gì?", options:["Cây đa thần","Cây tre trăm đốt","Cây táo thần","Cây gậy thần"], answer:0 },
  { id:5, type:"mcq", prompt:"Tết Trung thu còn được gọi là?", options:["Tết Nguyên Đán","Tết Đoan Ngọ","Tết Đoàn Viên","Tết Hàn Thực"], answer:2 },
  { id:6, type:"mcq", prompt:"Loại bánh truyền thống hình tròn hoặc hình vuông, có nhân thập cẩm hoặc đậu xanh tượng trưng cho sự viên mãn đêm Trung Thu là gì?", options:["Bánh chưng","Bánh trôi bánh chay","Bánh bao","Bánh nướng / Bánh dẻo"], answer:3 },
  { id:7, type:"mcq", prompt:"Chị H có hẹn đi chơi Trung thu vào buổi tối, nhưng buổi chiều chị vẫn phải đi làm văn phòng và không kịp thời gian về nhà thay đồ. Dòng sản phẩm nào của YODY vừa lịch sự sự khi đi làm, vừa thoái mái khi đi chơi giúp chị H giải quyết được tình huống trên?", options:["Dòng Áo gió đa năng","Dòng Áo chống nắng","Dòng Áo Polo Chạm thu","Dòng Áo Blazer"], answer:2 },
  { id:8, type:"mcq", prompt:"Nhân dịp Trung thu, Chị H dẫn bé 5 tuổi ghé YODY Outlet mua đồ. Bé mải chơi chạy quanh cửa hàng. Các bạn CGTV nên xử lý tình huống này như thế nào?", options:["Nhẹ nhàng quan sát, hỗ trợ trông bé an toàn và có thể gửi tặng bé chiếc lồng đèn","Quát to yêu cầu bé ngồi yên","Bỏ mặc bé để chị H tự quản lý","Yêu cầu Chị H đi về"], answer:0 },
  { id:9, type:"mcq", prompt:"Anh T bước vào cửa hàng YODY để lựa đồ đi chơi Trung Thu. Anh muốn tìm một chiếc áo có thể làm ấm cơ thể trong thời tiết se se của mùa thu Hà Nội, không quá dày mà vẫn thời trang. Anh T sẽ phù hợp với loại sản phẩm nào của YODY?", options:["Áo Polo","Áo giữ nhiệt 1 lớp","Áo Blazer","Áo gió"], answer:1 },
  { id:10, type:"mcq", prompt:"Anh K đến cửa hàng YODY tìm áo gió đi chơi Trung Thu với bạn gái. Thời tiết thu hay có mưa rào bất chợt, anh cần áo bền, khóa kéo mượt, trượt nước tốt. Bạn sẽ tư vấn cho anh ấy dòng sản phẩm nào?", options:["Áo chống nắng","Áo Polo Casual","Áo gió đa năng 4C","Áo sơ mi công sở"], answer:2 }
]
};
