# Just A Board

Just A Board là một ứng dụng infinite canvas viết bằng Vanilla JS, HTML và CSS, dùng DOM làm render surface thay vì `<canvas>`. Dự án hiện hỗ trợ multi-board, draft theo từng board, thao tác chọn đối tượng kiểu desktop, context menu, undo/redo, và lưu dữ liệu qua local adapter hoặc server adapter.

## Hiện trạng tính năng

### Core canvas
- Pan/zoom trên `#world` bằng transform.
- Render loop tối ưu bằng `requestAnimationFrame`.
- Culling qua `grid.js` để giảm chi phí render DOM khi số object tăng.
- Multi-board với create, rename, delete, switch board.

### Object types
- `note`
- `shape`
- `image`

### Selection và interaction
- Select mặc định.
- Click để chọn một object.
- `Ctrl + click` để multi-select.
- Hover object hiện selection frame.
- Drag object để move, khi drag khung chuyển sang dashed.
- Resize bằng 8 handles.
- Marquee selection khi kéo trên vùng trống.
- `Delete` / `Backspace` để xóa selection.
- Arrow keys để nudge selection.
- `Shift + Arrow` để nudge nhanh hơn.
- `Ctrl + C` và `Ctrl + V` cho clipboard object.
- Double click object để zoom-to-fit.

### Pan, zoom, cursor, toolbar
- `Shift + drag`, `Space + drag`, hoặc chuột giữa để pan.
- Wheel để pan dọc.
- `Shift + Wheel` để pan ngang.
- `Ctrl + Wheel` để zoom.
- Toolbar và cursor được đồng bộ với tool hiện tại và trạng thái pan.

### Note editing
- Note không luôn ở trạng thái edit.
- `Enter` hoặc `F2` để vào edit note đang chọn.
- `Esc` để hủy edit.
- Blur để commit edit.

### Context menu
- Context menu trên object:
  delete, copy, bring to front, send to back, bring forward, send backward.
- Context menu trên vùng trống:
  paste, save, clear.

### Save, draft, dirty state
- Mỗi board có `saved snapshot` và `draft` riêng.
- Không auto-save bản chính khi chỉnh sửa hoặc khi chuyển board.
- Khi switch board:
  draft hiện tại được persist trước, board mới sẽ load draft nếu có, nếu không thì load bản saved.
- Dirty state được hiển thị trên sidebar và save indicator.
- `Ctrl + S` hoặc nút save để ghi bản chính.

### Image flow
- Ảnh dán từ clipboard được giữ ở draft store cục bộ trước.
- Khi save board, ảnh draft sẽ được upload và canonicalize thành saved URL.

## Kiến trúc chính

### Client
- Entry HTML: `client/index.html`
- App code: `client/app/`
- HUD components: `client/app/hud/`
- Widgets: `client/app/widgets/`
- Commands: `client/app/commands/`
- Storage: `client/app/storage/`

### Server
- File server + REST API: `server/server.ps1`
- Board data: `server/data/boards/`
- Uploaded images: `server/data/images/`

## Storage model

`client/app/storage/index.js` chọn adapter hiện tại bằng biến `MODE`:
- `server`: board metadata và board content lưu qua REST API.
- `local`: board metadata và board content lưu trong `localStorage`.

Ngoài ra dự án còn có draft store riêng trong `IndexedDB`:
- draft snapshot theo `boardId`
- asset ảnh draft theo `boardId`
- dirty board registry

Lưu ý:
- draft ảnh hiện được xử lý qua `DraftStore`
- khi save ảnh draft, app gọi `POST /api/images`
- vì vậy nếu bạn dùng image save flow, backend vẫn cần endpoint upload ảnh hoạt động

## Các file quan trọng
- `client/app/main.js`: wiring chính của app, board switching, save/draft flow, shortcuts, context menu.
- `client/app/objects.js`: selection, drag, marquee, note editing, paste handling.
- `client/app/hud/SelectionOverlay.js`: hover box, active selection box, multi-selection boxes, marquee box, resize handles.
- `client/app/selection.js`: selection state helpers.
- `client/app/viewport.js`: pan và zoom input.
- `client/app/storage/BoardSerializer.js`: deserialize, draft snapshot, save snapshot.
- `client/app/storage/DraftStore.js`: IndexedDB draft store và image asset draft.
- `client/app/widgets/`: implementation của note, shape, image.

## Cách chạy

### Cách nhanh
1. Chạy `run.bat`
2. Mở `http://localhost:2502/`

### Chạy trực tiếp bằng PowerShell
```powershell
powershell -ExecutionPolicy Bypass -File .\server\server.ps1
```

Server mặc định chạy ở:
- `http://localhost:2502/`

## Tùy chỉnh storage mode

Sửa `MODE` trong:
- `client/app/storage/index.js`

Giá trị hiện tại trong code:
- `server`

## Tài liệu nội bộ
- `docs/knowledge_performance_optimization.md`
- `docs/selection_interaction_update_2026-03-22.md`

## Ghi chú cho contributor
- Giữ dự án ở Vanilla JS, không thêm framework.
- Không cập nhật `world.style.transform` trực tiếp ngoài engine flow.
- Phân biệt rõ screen space và world space khi xử lý input.
- Khi object di chuyển hoặc resize, phải cập nhật grid.
- Khi thêm interaction mới, kiểm tra xung đột giữa select, pan, note editing, context menu, clipboard và draft persistence.
