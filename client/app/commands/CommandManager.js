/**
 * Quản lý Undo/Redo stack theo Command Pattern.
 */
export class CommandManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Thực thi một command và đẩy vào undo stack.
   */
  execute(command) {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Hành động mới → xóa sạch redo
  }

  /**
   * Ghi nhận một command đã xảy ra (không gọi execute).
   * Dùng cho các hành động đã thực hiện rồi (ví dụ: kéo thả).
   */
  record(command) {
    this.undoStack.push(command);
    this.redoStack = [];
  }

  undo() {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    cmd.undo();
    this.redoStack.push(cmd);
  }

  redo() {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    cmd.execute();
    this.undoStack.push(cmd);
  }

  /**
   * Xóa toàn bộ lịch sử — dùng khi chuyển Board.
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
