# Just A Board - Kỹ thuật Tối ưu Hiệu suất (Performance Optimizations)

Dự án này là một bảng vô hạn (Infinite Canvas/Board) sử dụng kiến trúc hoàn toàn DOM thuần (Vanilla JS/HTML/CSS). Để đảm bảo trải nghiệm mượt mà 60fps kể cả khi có hàng ngàn đối tượng trên bảng, dự án đã áp dụng các nguyên lý tối ưu hóa hiệu suất cường độ cao dưới đây.

## 1. Tối ưu Rendering: Chuyển giao sức mạnh cho GPU
Trình duyệt có 3 bước chính để vẽ giao diện: `Layout -> Paint -> Composite`. Nếu thay đổi `top/left` liên tục khi kéo thả, trình duyệt buộc phải chạy lại cả 3 bước này (vô cùng chậm).
* **Giải pháp áp dụng:** 
  * Sử dụng thuộc tính `transform: translate3d(x, y, 0) scale(s);` cho toàn bộ cử động Zoom và Pan của bảng (#world). Điều này chỉ kích hoạt bước `Composite` (bước cuối cùng) và giao toàn bộ phần tính toán cho **GPU**.
  * Cập nhật `will-change: transform;` trong CSS để ép trình duyệt cấp phát trước slot bộ nhớ GPU, ngăn chặn hiện tượng giật cục trong lần kéo thẻ đầu tiên.

## 2. Vòng lặp Render (Render Loop) với requestAnimationFrame (rAF)
Sự kiện `mousemove` hoặc `wheel` bắn ra hàng trăm lần mỗi giây. Nếu tính toán UI trực tiếp trong đó sẽ gây quá tải CPU và giật lag (1 giây chỉ hiển thị 60 khung hình).
* **Giải pháp áp dụng:** Tách biệt hoàn toàn việc "nhận Input" và việc "Vẽ UI".
  * Các Event Listener chỉ có duy nhất một nhiệm vụ: **Cập nhật tọa độ biến trạng thái (`targetX`, `targetY`)**.
  * Hàm `animate()` chạy trên `requestAnimationFrame` sẽ tự động hỏi trình duyệt khi nào rảnh để lấy tọa độ đó ra vẽ. Chỉ vẽ khi biến cờ `isDirty = true`. Nếu người dùng không làm gì, engine tự động chuyển sang chế độ ngủ (Idle).

## 3. Lưới Không gian & Culling (Grid Spatial Partitioning + Viewport Culling)
Đây là kỹ thuật chuyên dùng trong các game engine lớn (như Unity/Unreal).
* **Vấn đề:** Khi có 5,000 ảnh/ghi chú, dù có dùng rAF, nếu vòng lặp `render` phải tính toán vị trí của cả 5,000 vật thể mỗi khung hình 16ms thì vẫn nghẽn.
* **Giải pháp áp dụng:** 
  * **(Viewport Culling):** Chỉ những đối tượng nằm lọt vào ống kính camera (Viewport) của người dùng mới giữ `display: block`. Đối tượng nào ngoài camera sẽ bị thêm `display: none` để trình duyệt bỏ qua việc sơn vẽ đổ bóng.
  * **(Grid Spatial Partitioning):** Thay vì quét toàn bộ 5,000 vật thể xem cái nào nằm trong Viewport, bảng sẽ được chia thành lưới (Ví dụ: `500x500px`). Mỗi vật thể sinh ra sẽ được đăng ký hộ khẩu vào các ô lưới (Cell). Khi di chuyển, thuật toán sẽ tra xem Viewport đang đè lên những ô lưới nào, và chỉ quét giới hạn các vật thể nằm trong các ô lưới đó. Biến $O(N)$ thành $O(Vật\_thể\_hiển\_thị)$.

## 4. Dọn dẹp DOM Read tốn kém trong rAF
Đọc trực tiếp từ cấu trúc DOM (ví dụ: `if (el.style.display === 'none')`) tốn rất nhiều thời gian so với đọc biến JS thuần.
* **Giải pháp áp dụng:** Lưu trạng thái hiển thị vào chính cấu trúc dữ liệu JS (`obj.isVisible`). Trình duyệt chỉ thay đổi DOM đúng duy nhất 1 lần khi trạng thái của `isVisible` đảo ngược từ `false` sang `true` và ngược lại.

## 5. Event Delegation (Chống Rò rỉ Kẹt Sự Kiện)
Khi dự án mới phát triển, hàm `makeDraggable` gán sự kiện `mousemove` và `mouseup` lên `window` mỗi khi có ghi chú mới. Có 100 ghi chú có nghĩa là có 100 hàm `mousemove` chạy ẩn, gây tê liệt CPU.
* **Giải pháp áp dụng:** Chuyển sang Event Delegation.
  * Chỉnh gắn duy nhất 1 sự kiện `mousemove` trên tài liệu (`window`).
  * Chỉ duy trì 1 biến con trỏ toàn cục: `let activeDragObject = null;`. Khi click/mousedown vào ghi chú nào, con trỏ đó sẽ trỏ vào ghi chú đó và di chuyển nó. Lợi ích bộ nhớ là cực kỳ lớn.

## 6. Sửa lỗi kẹt trạng thái chuột (Failsafe Event)
Trong các dự án Drag & Drop, đôi lúc thao tác chọn văn bản (Text Selection) hoặc mở Context Menu khiến trình duyệt "nuốt" mất sự kiện `mouseup`, khiến đồ vật cứ dính chặt vào con trỏ dù đã nhả tay ra.
* **Giải pháp áp dụng:** Trong vòng lặp `mousemove`, kiểm tra xem nút bấm vật lý của chuột thực sự có đang giữ hay không thông qua `e.buttons === 0`. Nếu chuột đang hụt `mouseup`, tự ép hệ thống nhả đồ vật (`reset activeDragObject và isPanning`).
* Đồng thời thêm `e.preventDefault()` cho mousedown vào `#world` để ngăn chặn khối lượng lớn lệnh chọn/nháy văn bản khi di chuyển bảng.

## 7. Nội suy Tuyến tính Lượt (Lerp) & Anchor Pinned
* Mượt chuyển động: Áp dụng công thức Smooth Chase (Lerp) cho `targetX` đuổi theo `currentX` để cảm giác lăn chuột mượt tựa như lướt qua mặt phẳng đá.
* Ghim điểm neo (Anchor Pinned): Vị trí World X, Y phải được tính trực tiếp từ quy chuẩn `Scale` hiện tại ngay trong quá trình Lerp, thay vì Lerp 3 biến độc lập, nhờ đó khi Zoom con trỏ ở gốc nào, bức hình sẽ Zoom đúng vào gốc đó mà không bị giật, lệch hình.

## 8. Quản lí Bộ nhớ Blob Hình Ảnh
* Khi sao chép và dán hình ảnh (Clipboard API), dữ liệu nhị phân của ảnh tạo ra qua `URL.createObjectURL(blob)` tiêu thụ bộ nhớ RAM. Do đó, nếu sau này người dùng được cấp phép xóa ghi chú, hãy luôn nhớ gọi `URL.revokeObjectURL(url)` để trình duyệt dọn dẹp RAM rác.
