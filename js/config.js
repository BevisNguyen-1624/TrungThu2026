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
  { id:1, type:"short", prompt:"Tại YODY, ấn phẩm truyền thông được đăng tải mỗi thứ 2 hằng tuần giúp nhân sự cập nhật những thông tin đáng chú ý trong tuần vừa qua có tên là gì?", answer:["News","YODY News"] },
  { id:2, type:"short", prompt:"Trong bánh chưng truyền thống của người Việt, loại lá nào thường được dùng phổ biến nhất để gói bánh?", answer:["Lá dong"] },
  { id:3, type:"short", prompt:"Chất khí nào chiếm tỉ lệ phần trăm thể tích lớn nhất trong không khí Trái Đất (khoảng 78%)?", answer:["Khí Nitơ (N2)","Khí Nitơ","Nitơ","N2"] },
  { id:4, type:"short", prompt:"YODY Buôn Ma Thuột - Showroom lớn nhất Tây Nguyên với diện tích 3200m2 được khai trương vào năm nào?", answer:["Năm 2021","2021"] },
  { id:5, type:"short", prompt:"Chiến dịch 'Bức tường lông ngỗng' được ra đời vào thời điểm nào? Và năm đó được gọi với tên chủ đề là gì?", answer:["Tháng 4/2022"] },
  { id:6, type:"short", prompt:"YODY thay đổi màu logo từ đen trắng sang xanh vàng vào năm 2020. Vậy cửa hàng YODY đầu tiên khai trương với nhận diện mới là cửa hàng nào?", answer:["YODY Lê Chân"] },
  { id:7, type:"short", prompt:"Nếu 5 chiếc máy may riêng biệt tại xưởng dệt may mất đúng 5 phút để hoàn thành 5 chiếc áo Polo, thì 100 chiếc máy may cùng năng suất sẽ mất bao lâu để may xong 100 chiếc áo Polo?", answer:["5 phút"] },
  { id:8, type:"short", prompt:"Di sản thiên nhiên thế giới đầu tiên của Việt Nam được UNESCO công nhận (năm 1994) là địa danh nào?", answer:["Vịnh Hạ Long"] },
  { id:9, type:"short", prompt:"Dòng sông nào dài nhất thế giới theo ghi nhận phổ biến của địa lý học truyền thống?", answer:["Sông Nile (Sông Niên)","Sông Nile","Sông Niên"] },
  { id:10, type:"short", prompt:"Hành tinh nào trong Hệ Mặt Trời có thời gian tự quay một vòng quanh trục lâu hơn thời gian nó quay quanh Mặt Trời?", answer:["Sao Kim (Venus)","Sao Kim","Venus"] }
]
};
