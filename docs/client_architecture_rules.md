# Client Architecture & Coding Rules
Tài liệu này định nghĩa cấu trúc thư mục, trách nhiệm của từng module và quy ước mã nguồn (Coding Convention) cho dự án phần mềm Frontend (Client) "Just a board". Bất kỳ tính năng hoặc sửa đổi nào mới đều phải tuân thủ nghiêm ngặt cẩm nang này.

---

## 1. Cấu Trúc Thư Mục (Directory Structure)

Thư mục `client/` được chia thành các Layer độc lập dựa trên nguyên tắc **Clean Architecture**:

```text
client/
├── css/                   # Chỉ chứa cấu trúc Styling (Vanilla CSS)
│   ├── core/              # Global variables (tokens), Reset styles, System interactions
│   └── components/        # CSS đi kèm riêng cho từng Component UI tương ứng
├── src/
│   ├── index.js           # Entry point của toàn bộ ứng dụng (chạy Bootstrap)
│   ├── app.js             # File kết nối (Wiring/Inject) tất cả các dependencies, UI với Core
│   │
│   ├── core/              # Trái tim của ứng dụng: Xử lý logic nghiệp vụ, render và trạng thái toàn cục
│   │   ├── state.js             # Global state (Single Source of Truth)
│   │   ├── engine.js            # Animation/Render Loop (vẽ lại canvas dựa trên State)
│   │   ├── grid.js              # Xử lý tối ưu hóa render (Spatial Hash Grid)
│   │   ├── layerManager.js      # Tính toán tọa độ và thứ tự hiển thị Z-Index
│   │   ├── interactionManager.js# Xử lý các sự kiện chuột trên Canvas (Kéo tự do, Marquee select, v.v)
│   │   ├── boardManager.js      # Xử lý tổng hợp việc tải, lưu, đổi, tạo các Board
│   │   └── keyboardShortcuts.js # Phím tắt toàn cục (bàn phím)
│   │
│   ├── components/        # Tổng hợp mọi thứ liên quan đến giao diện hiển thị HTML/DOM
│   │   ├── layout/        # Cố định luôn hiện diện trên màn hình (Sidebar, Toolbars, BottomBar)
│   │   ├── overlays/      # UI tạm thời, phủ lên trên giao diện (ContextMenu, Tooltip, ToastManager)
│   │   │   └── dialogs/   # Các Pop-up modal có tương tác (ConfirmDialog)
│   │   └── widgets/       # Các đối tượng vẽ trực tiếp bên trong Viewport của Canvas (Image, Note, Shape...)
│   │
│   ├── commands/          # Các thao tác của User được đóng gói (Command Pattern) phục vụ tính năng Undo/Redo
│   │
│   ├── services/          # Thao tác với bên thứ ba / Side Effect (API Server, LocalStorage, Clipboard)
│   │
│   └── utils/             # Các Helper thuần túy (Toán học hình học, xử lý mảng), KHÔNG bao giờ nạp state (Stateless)
```

---

## 2. Quy Ước Đặt Tên (Naming Conventions)

- **Tên File Component / Class**: Sử dụng chuẩn **PascalCase** (`NameComponent.js`).
  - *Ví dụ:* `Sidebar.js`, `BottomBar.js`, `ImageWidget.js`, `InsertObjectsCmd.js`.
- **Tên File Logic / Utils / Service / Core**: Sử dụng chuẩn **camelCase** (`moduleName.js`).
  - *Ví dụ:* `engine.js`, `boardManager.js`, `geometry.js`, `clipboard.js`.
- **Tên Hàm Khởi Tạo Thành Phần (Initialization)**: Luôn bắt đầu bằng `init...`
  - *Ví dụ:* `export function initSidebar({ ...deps })`. Mọi Component phụ thuộc vào Core/Storage thì phải truyền tham số Inject thông qua hàm `init`.

---

## 3. Quy Tắc Ứng Dụng Chặt Chẽ Hiện Hành

### A. Thêm Một Đối Tượng Mới / Layer Vẽ Lên Board 
- Nếu bạn muốn thêm 1 hình vẽ đồ thị, video, con dấu, v.v vào trong bảng vẽ, hãy tạo 1 file kiểu lớp thừa kế từ BaseWidget tại `src/components/widgets/`.
- Tiền tố hậu tố thường là `[Loại]Widget.js`.

### B. Thêm Chức Năng Cần Undo/Redo 
- Bắt buộc phải đóng gói toàn bộ logic State vào một Class Command nằm tại `src/commands/`.
- Lệnh được thực thi phải được truyền từ UI xuống cho `commandManager.execute(new YourCommand())`. 

### C. Giao Tiếp Giữa Logic và Cấu Hình (Decoupling)
- Các file ở `components/` **hạn chế tối đa việc gọi thẳng đến Database/Storage**. Nếu 1 Component như `Sidebar` cần gọi Xóa Board, bạn hãy truyền tham số function từ `app.js` cho nó. (Dependency Injection).
- UI chỉ thao tác với State, và Render chỉ lấy thông tin từ State. Việc tính toán vị trí, kích thước, zoom bắt buộc nằm ở `src/utils/geometry.js`.

### D. System Alerts & Confirmations (Tương tác giao tiếp User)
- Mọi cảnh báo, thông báo dạng nhỏ phải đi qua Component `src/components/overlays/ToastManager.js` (bằng hàm `notify()`).
- Mọi chức năng yêu cầu rủi ro (Xóa, v.v) phải đi qua hệ thống `src/components/overlays/dialogs/ConfirmDialog.js` (bằng block `await confirmAction()`).

Quy trình này đảm bảo dự án luôn **Clean, Dễ Maintain** và có khả năng tích hợp Plugin / Registry Widget độc lập mà không can thiệp dẫm chân lên code cũ.
