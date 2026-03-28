const registry = new Map();

export const WidgetRegistry = {
  /**
   * Đăng ký một loại Widget mới vào hệ thống.
   * @param {string} type - Tên định danh của widget (ví dụ: 'note', 'shape', 'image').
   * @param {Object} definition - Các cấu hình và hàm tạo cho widget.
   * @param {Function} definition.deserialize - Hàm để parse JSON/Object data thành instance của Widget.
   * @param {Function} definition.create - Hàm để trực tiếp khởi tạo trên màn hình (Interaction). Không cần thiết nếu widget dạng kéo thả/import.
   */
  register(type, definition) {
    if (registry.has(type)) {
      console.warn(`Widget type "${type}" đã được đăng ký! Ghi đè cấu hình mới.`);
    }
    registry.set(type, definition);
  },

  get(type) {
    return registry.get(type);
  },

  getAllTypes() {
    return Array.from(registry.keys());
  },

  create(type, x, y) {
    const plugin = this.get(type);
    if (!plugin || !plugin.create) {
      console.warn(`Widget type "${type}" không hỗ trợ khởi tạo trực tiếp qua tool.`);
      return null;
    }
    return plugin.create(x, y);
  },

  async deserialize(type, item, boardId) {
    const plugin = this.get(type);
    if (!plugin || !plugin.deserialize) {
      console.warn(`Không tìm thấy bộ giải mã (deserialize) cho widget loại: ${type}`);
      return null;
    }
    return await plugin.deserialize(item, boardId);
  }
};
