# Nhạc nền Trung thu

File hiện tại: **bgm-trungthu.mp3** — cắt từ bài "Rước Đèn Trung Thu (Remix)"
bạn cung cấp, đoạn ~100 giây đầu bài, nén 128kbps (~1.5MB, đủ nhẹ để tải
nhanh), có fade-in/fade-out ở đầu-cuối để lặp lại (loop) mượt hơn.

Nhạc sẽ tự động lặp lại (loop) liên tục suốt quá trình giải đố.

## Muốn đổi đoạn nhạc khác (ví dụ đoạn điệp khúc thay vì đoạn đầu)

File gốc bạn gửi khá dài (~95 phút, dạng liên khúc nhiều bài nối nhau), nên
mình chỉ cắt 100 giây đầu để làm nhạc nền — nếu đoạn đó không phải đoạn bạn
thích, cho mình biết đoạn nhạc bạn muốn dùng (ví dụ "phút thứ 5 đến 6:40")
và mình sẽ cắt lại đúng đoạn đó, kèm fade in/out cho lặp mượt.

Muốn tự cắt bằng ffmpeg (nếu có sẵn công cụ):
```
ffmpeg -i "file-nhac-goc.mp3" -ss 00:05:00 -t 100 \
  -af "afade=t=in:st=0:d=1.5,afade=t=out:st=95:d=5" \
  -codec:a libmp3lame -b:a 128k assets/audio/bgm-trungthu.mp3
```
(`-ss` là thời điểm bắt đầu cắt, `-t 100` là lấy 100 giây từ đó)

Nếu xoá file này đi, trang vẫn chạy bình thường — chỉ đơn giản là không có
nhạc nền (không lỗi, không cảnh báo với người chơi).

