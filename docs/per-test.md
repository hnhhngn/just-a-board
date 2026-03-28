# Báo cáo Test Hiệu năng & Sửa lỗi Server

## 1. Các công việc đã hoàn thành
- **Sửa lỗi Server:** Khắc phục lỗi `op_Addition` trong PowerShell bằng cách chuẩn hóa mảng trong [server.ps1](file:///d:/Dev/Web/just-a-board/server/server.ps1) và sửa định dạng [index.json](file:///d:/Dev/Web/just-a-board/server/data/index.json).
- **Sinh dữ liệu Test:** Inject thành công 1000 ghi chú và 100 ảnh ([test-img.png](file:///d:/Dev/Web/just-a-board/client/test-img.png)) vào board "Board 1".
- **Kiểm tra tương tác:** Thực hiện Pan, Zoom, Marquee Select và Drag trên 1100 đối tượng.

## 2. Kết quả Test Hiệu năng

### Case 1: Trước khi Save (1100 đối tượng)
- **Pan & Zoom:** Khá mượt nhờ cơ chế [grid.js](file:///d:/Dev/Web/just-a-board/client/app/grid.js) (culling). Khi zoom out toàn cảnh, FPS giảm nhẹ do số lượng element trong DOM tăng.
- **Marquee Selection:** Có độ trễ (delay) khi kéo chuột bao phủ toàn bộ 1100 đối tượng. Nguyên nhân do [SelectionOverlay.js](file:///d:/Dev/Web/just-a-board/client/app/hud/SelectionOverlay.js) phải render 1100 div selection-box cùng lúc.
- **Drag Selection:** **Rất chậm (Bottleneck chính)**. Việc di chuyển 1100 DOM elements đồng thời gây ra hiện tượng Layout Thrashing nghiêm trọng. Browser subagent đã bị timeout khi cố gắng thực hiện thao tác này.

### Case 2: Sau khi Save
- **Thao tác Lưu:** Diễn ra trong khoảng ~1-2 giây để đồng bộ 130KB JSON lên server.
- **Hiệu năng sau Save:** Không có sự khác biệt rõ rệt so với Case 1. Việc lưu trữ không làm ứng dụng chậm đi, vấn đề nằm ở số lượng layer DOM.

## 3. Phân tích điểm nghẽn (Bottlenecks)
1. **DOM Complexity:** 1100 objects = 1100+ DOM nodes. Khi di chuyển, browser phải tính toán lại style/layout cho toàn bộ nhóm này.
2. **Selection Overlay:** Việc duy trì hàng nghìn box highlight chồng lên object tiêu tốn nhiều tài nguyên render layer.

## 4. Đề xuất tối ưu
- **Virtualization:** Chỉ render các object nằm trong viewport (dự án đã có grid nhưng có vẻ cần tối ưu hơn khi zoom out).
- **Canvas Rendering:** Chuyển sang dùng `<canvas>` cho các object nếu số lượng vượt quá 500-1000.
- **Optimize Dragging:** Khi drag một nhóm lớn, có thể ẩn bớt nội dung object hoặc dùng ảnh ghost tạm thời để giảm tải cho Browser.
