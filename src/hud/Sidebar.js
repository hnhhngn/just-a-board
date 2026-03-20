/**
 * Khởi tạo Sidebar (Panel Dropdown hiển thị danh sách Board).
 */
export function initSidebar({ getBoardIndex, currentBoardId, onBoardSelect, onBoardCreate, onBoardDelete, menuIcon }) {
  // --- Nút Toggle dạng Pill ngang ---
  const toggle = document.createElement('div');
  toggle.className = 'sidebar-toggle';
  toggle.title = 'Danh sách dự án';
  toggle.innerHTML = `
    <span class="sidebar-toggle-icon">${menuIcon}</span>
    <span class="sidebar-toggle-text">Loading...</span>
  `;
  document.body.appendChild(toggle);

  // --- Overlay vỗ hình để đóng dropdown ---
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  // --- Sidebar Dropdown Panel ---
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <button class="menu-item sidebar-create-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      <span>Tạo board mới</span>
    </button>
    <div class="sidebar-divider-horiz"></div>
    <div class="board-list" id="boardList"></div>
  `;
  document.body.appendChild(sidebar);

  let isOpen = false;
  let _currentBoardId = currentBoardId;

  function updateTitleText(title) {
    toggle.querySelector('.sidebar-toggle-text').textContent = title;
  }

  function openSidebar() {
    isOpen = true;
    sidebar.classList.add('open');
    overlay.classList.add('open');
    refreshList();
  }

  function closeSidebar() {
    isOpen = false;
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  }

  // Click vào toggle thì bật menu
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen ? closeSidebar() : openSidebar();
  });

  overlay.addEventListener('click', closeSidebar);

  // Sự kiện tạo board mới
  sidebar.querySelector('.sidebar-create-btn').addEventListener('click', () => {
    onBoardCreate();
    refreshList();
  });

  function refreshList() {
    const list = sidebar.querySelector('#boardList');
    const boards = getBoardIndex();
    list.innerHTML = '';

    const currentInfo = boards.find((b) => b.id === _currentBoardId);
    if (currentInfo) updateTitleText(currentInfo.name);

    boards.forEach((board) => {
      const item = document.createElement('div');
      item.className = 'board-item' + (board.id === _currentBoardId ? ' active' : '');

      item.innerHTML = `
        <div class="board-item-info">
          <span class="board-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
          </span>
          <span class="board-name">${escapeHtml(board.name)}</span>
        </div>
        <button class="board-delete" title="Xóa Board">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      `;

      // Click chọn board (bấm vào vùng trái)
      item.querySelector('.board-item-info').addEventListener('click', () => {
        if (board.id === _currentBoardId) return;
        onBoardSelect(board.id);
        _currentBoardId = board.id;
        refreshList();
        closeSidebar();
      });

      // Click xóa board
      item.querySelector('.board-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (boards.length <= 1) {
          alert('Không thể xóa Board cuối cùng!');
          return;
        }
        if (confirm(`Xóa "${board.name}"?`)) {
          onBoardDelete(board.id);
          refreshList();
        }
      });

      list.appendChild(item);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    refreshList,
    setCurrentBoard(id) {
      _currentBoardId = id;
      const boards = getBoardIndex();
      const currentInfo = boards.find((b) => b.id === id);
      if (currentInfo) {
        updateTitleText(currentInfo.name);
      }
    },
  };
}
