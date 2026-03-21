# Đặc tả Tối ưu Hiệu suất (Performance Knowledge)
Dự án "Just A Board" là một bảng vô hạn (Infinite Canvas) sử dụng kiến trúc hoàn toàn DOM thuần (Vanilla JS/HTML/CSS). Để đảm bảo trải nghiệm mượt mà 60fps kể cả khi có hàng ngàn đối tượng trên bảng, dự án áp dụng các nguyên lý tối ưu hóa hiệu suất cường độ cao dưới đây.

---

## 1. Tối ưu Rendering: Chuyển giao sức mạnh cho GPU
Trình duyệt có 3 bước chính để vẽ giao diện: `Layout -> Paint -> Composite`. Nếu thay đổi `top/left` liên tục khi kéo thả, trình duyệt buộc phải chạy lại cả 3 bước này (vô cùng chậm).
* **Quản lý Transform:** 
  Dùng `transform: translate3d(x, y, 0) scale(s);` cho toàn bộ cử động Zoom/Pan của `#world`. Lệnh này chỉ kích hoạt bước `Composite` và giao toàn bộ phần tính toán cho GPU.
* **Cấp phát GPU trước:**
  Cập nhật `will-change: transform;` trong CSS để ép trình duyệt cấp phát trước slot bộ nhớ GPU, ngăn chặn hiện tượng giật cục trong lần kéo đầu tiên.

## 2. Vòng lặp Render (Render Loop) với requestAnimationFrame (rAF)
Sự kiện `mousemove` hoặc `wheel` bắn ra hàng trăm lần mỗi giây. Việc tính toán UI trực tiếp trong callback sẽ gây nghẽn CPU.
* Giải pháp tách biệt:
  * Các Event Listener chỉ có một nhiệm vụ: **Cập nhật biến trạng thái (`targetX`, `targetY`)**. Đừng bao giờ update DOM trong Event Listener.
  * Hàm `animate()` chạy trên `requestAnimationFrame` sẽ tự động hỏi trình duyệt khi nào rảnh để lấy tọa độ ra vẽ. Chỉ vẽ khi biến cờ `isDirty = true`. Nếu người dùng không làm gì, engine ngủ (Idle).

## 3. Lưới Không gian & Culling (Grid Spatial Partitioning) 
Đây là kỹ thuật mấu chốt khi số lượng vật thể lớn (1.000 - 5.000 vật thể).
* **Viewport Culling (Loại bỏ ngoài khung hình):** 
  Chỉ những đối tượng lọt vào ống kính camera mới giữ `display: block`. Những đối tượng ngoài camera bị gắn `display: none` (hoặc class `.hidden`) để trình duyệt ngừng vẽ/đổ bóng. Cơ sở dựa vào thuật toán va chạm hình chữ nhật AABB.
* **Grid Spatial Partitioning (Phân mảnh không gian):**
  Tránh duyệt qua mảng 5.000 phần tử ở mỗi khung hình (gây nghẽn render loop). Bảng được chia thành các ô vuông (Cell), ví dụ `500x500px`. Các vật thể tự đăng ký hộ khẩu vào các ô lưới chứa chúng. Viewport chỉ truy xuất các ô lưới mà camera đang cắt qua để lấy danh sách "đối tượng hữu dụng".

## 4. Dọn dẹp DOM Read tốn kém trong rAF
Đọc cấu trúc DOM (vd: `if (el.style.display === 'none')`) cực kỳ chậm do nó ép trình duyệt kích hoạt quá trình Reflow/Layout.
* **Giải pháp:** Lưu mọi trạng thái (ví dụ `isVisible = true`) trong object dữ liệu JS tĩnh. Chỉ thay đổi DOM duy nhất 1 lần khi trạng thái của `isVisible` đảo ngược (biên giới cắt qua viewport).

## 5. Rò rỉ Logic và Event Delegation
* Khi dự án scale, thay vì gắn mỗi Object 1 cụm event `mousedown/mousemove/mouseup`, ta chỉ gắn **duy nhất 1 sự kiện chuột trên `#viewport` hoặc `window`**. Mọi tác vụ sẽ xác nhận qua tọa độ `e.clientX/Y` hoặc `e.target.closest('.board-object')`.
* Việc gán Event lên `window` còn giúp thao tác kéo thả không bị đứt đoạn khi chuột bị lia ra ngoài không gian mép màn hình.
* **Sửa lỗi kẹt sự kiện (Failsafe Event):** Hệ thống thỉnh thoảng khựng nút chuột do thao tác Text Selection hoặt Context Menu. Giải quyết bằng cách kiểm tra biến `e.buttons === 0` trong vòng lặp `mousemove` để tự động kích hoạt `mouseup`.

## 6. Tính toán Toán Học (Engine Math)
* **Smooth Chase (Lerp) & Anchor Pinned:** Áp dụng Lerp để camera đuổi theo chuột mượt mà. Trong quá trình zoom, biến số `targetScale` sẽ lerp mượt, thay vì lerp độc lập `targetX` và `targetY`, hệ thống sẽ tính lại hệ quy chiếu $X, Y$ theo `targetScale` từng frame để "ghim" dính đúng tọa độ vật thể tại vị trí trỏ chuột.
* **Quy đổi Screen Coordinate sang World Coordinate:**
  Mọi tác động lấy từ input chuột (Screen Space) phải đổi ra World Space bằng công thức chia cho Scale hiện thời:
  $$WorldX = \frac{ScreenX - currentX}{scale}$$

## 7. Quản lý Bộ Nhớ Ảnh (Blob RAM Cache)
* Khi nạp ảnh bằng dán Clipboard, `URL.createObjectURL(blob)` tạo URL chiếm RAM vĩnh viễn trong phiên. Kể cả xóa bỏ thẻ `<img>`, nó vẫn ở đó. Buộc phải gọi hàm `URL.revokeObjectURL()` khi Xóa (Delete) Ghi chú.

## Khuyến nghị Kiến trúc theo scale
| Quy mô | Kiến trúc áp dụng |
|---|---|
| Dưới 100 đối tượng | Vanilla DOM + CSS Transitions |
| Trái 500 đối tượng | DOM + rAF Render Loop + Dirty Flag (Hiện tại) |
| Tới 5.000 đối tượng | Culling + Grid Spatial Partitioning (Hiện tại) |
| Hơn 5.000 đối tượng | Cần cân nhắc dịch chuyển gốc render sang thẻ `<canvas>` vẽ WebGL kết hợp Web Workers |
