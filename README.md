# Just A Board

## 1. Tổng quan hệ thống (System Overview)

**Just A Board** là một ứng dụng infinite canvas dựa trên DOM bằng Vanilla JS.
- **KHÔNG SỬ DỤNG FRAMEWORK**: Chỉ dùng HTML, CSS, JavaScript (ES Modules) thuần túy.
- **Canvas dựa trên DOM**: Thay vì sử dụng `<canvas>` API, ứng dụng dùng một mega-container (`div#world`) nằm trong một `div#viewport` cố định. Các đối tượng chỉ là các HTML Node.
- **Hardware Acceleration**: Sử dụng `transform: translate3d()` và `scale()` trên `div#world` container để đạt được khả năng pan/zoom mượt mà ở 60FPS.

## 2. Kiến trúc thư mục (Project Structure)

Dự án được chia thành 2 phần chính: `client` (Frontend) và `server` (Backend).

### Server (Backend)
Hệ thống backend lưu trữ dữ liệu (Persistence Server).
- Chạy bằng **PowerShell 5.1** (`server/server.ps1`).
- Phục vụ (serve) các file tĩnh (HTML, CSS, JS, hình ảnh) cho Frontend.
- Cung cấp REST API xử lý các phương thức GET, POST, PUT, PATCH, DELETE để lưu trữ dữ liệu các bảng (boards) đưới dạng file JSON (trong thư mục `server/data/`).

### Client (Frontend)
Toàn bộ mã nguồn giao diện nằm trong thư mục `client/app/`. Tệp entry html là `client/index.html`.

#### Trạng thái ứng dụng (`client/app/state.js`)
Đóng vai trò là trung tâm lưu trữ dữ liệu có thể thay đổi (Single Source of Truth) cho toàn bộ ứng dụng.
- **Viewport State**: `currentX`, `currentY`, `currentScale`, `targetX`, `targetY`, `targetScale`.
- **Anchor Math**: `anchorMouseX`, `anchorWorldX` (dùng để zoom hướng tới con trỏ chuột hoặc trung tâm màn hình).
- **Engine State**: `isLoopRunning`, `isDirty` (điều khiển requestAnimationFrame).
- **App Data**: `objects` (mảng chứa các widget instance), `activeTool`, `currentBoardId`.

#### Render Engine (`client/app/engine.js`)
Module `engine.js` chạy một vòng lặp render tối ưu.
- **WakeUp / Sleep cycle**: Để tiết kiệm CPU, `requestAnimationFrame` chỉ chạy khi `state.isDirty = true`.
- **Lerp**: Nội suy mượt mà tọa độ `currentX/Y/Scale` tới `targetX/Y/Scale` bằng parameter `settings.pansEase` và `zoomEase`.
- **Culling (Spatial Hashing)**: Lấy danh sách các đối tượng hiển thị trong khung nhìn thông qua `client/app/grid.js`. Các phần tử nằm ngoài viewport sẽ được gắn `display: none` để tiết kiệm hiệu năng render của DOM Tree.

#### Spatial Grid (`client/app/grid.js`)
Triển khai một spatial hash map 2D để tối ưu hóa việc quản lý DOM culling.
- Chia không gian viewport thành các chunk liên tục.
- Tự động đăng ký/hủy đăng ký đối tượng động khi chúng di chuyển hoặc thay đổi kích thước.

#### Tương tác Viewport (`client/app/viewport.js`)
Lắng nghe các sự kiện chuột/con trỏ trên container chính.
- **Click chuột phải / Kéo chuột giữa / Space+Drag**: Cập nhật `state.targetX/Y` (Tính năng Pan).
- **Scroll Wheel**: Cập nhật `state.targetScale` và tính toán anchor point để tính năng Zoom.

## 3. Hệ thống Đối tượng & Tương tác

#### Phân bổ Sự kiện (`client/app/objects.js`)
Xử lý khởi tạo, chọn, kéo và xóa đối tượng. Lắng nghe trên `div#world` bằng Event Delegation và chuyển đổi tọa độ màn hình sang tọa độ thế giới (world coordinates).

#### Trừu tượng hóa Widget (`client/app/widgets/`)
Interface chung cho các mục được gắn lên bảng mạch.
- Yêu cầu: Có các phương thức `createElement()`, `exportData()`, `attach()`, `detach()`, các getter/setter cho `x`, `y`, `width`, `height`.

## 4. Lưu trữ dữ liệu (Storage & Persistence)

#### Trình quản lý Lệnh (`client/app/commands/CommandManager.js`)
Triển khai Command Pattern áp dụng cho Undo/Redo actions.

#### Lớp trừu tượng Storage (`client/app/storage/`)
Hệ thống sử dụng Adapter Pattern để cho phép thay đổi nơi lưu trữ thông qua biến `MODE` nằm trong `client/app/storage/index.js`.
- **`LocalAdapter.js`**: Lưu trữ cục bộ trên máy client thông qua `localStorage`.
- **`ServerAdapter.js`**: Lưu trữ lâu dài trên máy chủ thông qua REST API giao tiếp với tệp `server.ps1` sử dụng `fetch()`.

## 5. Giao diện Người dùng (HUD)
Nằm trong kiến trúc thư mục `client/app/hud/`.
- Thay đổi light / dark theme thông qua CSS Custom Properties (e.g. `var(--bg-color)`).
- **Sidebar (`client/app/hud/Sidebar.js`)**: Quản lý UI điều khiển đa bảng (multi-board), cho phép thao tác bất đồng bộ chuyển/tạo/đổi tên/xóa board bằng Async/Await qua Storage Adapter.
- **Thanh công cụ (`client/app/hud/FloatingToolbar.js` và `BottomBar.js`)**: Chứa các chức năng tools.

## 6. Hướng dẫn chạy dự án
1. Mở root của dự án. Chạy file script: `run.bat` (Hoặc mở thư mục trong Terminal, chạy lệnh: `powershell -ExecutionPolicy Bypass -File .\server\server.ps1`).
2. Mở trình duyệt Web. Truy cập địa chỉ hiển thị trên Terminal (Mặc định cấu hình vào port **`http://localhost:2502/`**).
3. Đổi cơ chế định dạng lưu (Server Database / Local Cache) thông qua biến cấu trúc tại file `client/app/storage/index.js` (biến tham số `MODE`).

## 7. AI Contributor Guidelines

1. **Keep it Vanilla**: Do not introduce React/Vue/Svelte or heavy libraries. Use standard DOM manipulating patterns like `document.createElement`.
2. **Respect the Render Loop**: ALL structural shifts to the `world` transform must be passed to `state.targetX`, `state.targetY`, and `state.targetScale`. Call `wakeUp()` to visually apply the changes. NEVER manipulate `world.style.transform` directly outside `engine.js`.
3. **Scale factor logic**: Always differentiate between screen space (px relative to viewport) and world space (relative to infinite canvas point `0,0`).
   - `World = (Screen - currentX) / currentScale`
   - `Screen = World * currentScale + currentX`
4. **Theme styling**: Always use `var(--var-name)` strings for colors. If creating a new HUD component, use the defined `--panel-bg`, `--text-color`, `--btn-hover-bg`, `--divider`. Do NOT hardcode standard colors in CSS.
5. **Culling maintenance**: Ensure any newly created object is properly bound to `grid.js` upon mounting and unmounted upon deletion. If an object moves, call `updateObjectInGrid(obj, oldBounds)`.
