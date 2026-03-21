/**
 * Quản lý Undo/Redo stack theo Command Pattern.
 */
export class CommandManager {
  constructor(onChange) {
    this.undoStack = [];
    this.redoStack = [];
    this.saveCursor = 0;
    this.onChange = onChange;
  }

  isDirty() {
    return this.undoStack.length !== this.saveCursor;
  }

  markSaved() {
    this.saveCursor = this.undoStack.length;
    this._notify();
  }

  markUnsaved() {
    this.saveCursor = -1; // Cắm mốc giả -1 để lúc nào file cũng trạng thái bị móp cờ Dirty
    this._notify();
  }

  _notify() {
    if (this.onChange) this.onChange(this.isDirty());
  }

  /**
   * Thực thi một command và đẩy vào undo stack.
   */
  execute(command) {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Hành động mới → xóa sạch redo
    this._notify();
  }

  /**
   * Ghi nhận một command đã xảy ra (không gọi execute).
   * Dùng cho các hành động đã thực hiện rồi (ví dụ: kéo thả).
   */
  record(command) {
    this.undoStack.push(command);
    this.redoStack = [];
    this._notify();
  }

  undo() {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    cmd.undo();
    this.redoStack.push(cmd);
    this._notify();
  }

  redo() {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    cmd.execute();
    this.undoStack.push(cmd);
    this._notify();
  }

  /**
   * Xóa toàn bộ lịch sử — dùng khi chuyển Board.
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.saveCursor = 0;
    this._notify();
  }
}
