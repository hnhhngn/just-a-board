/**
 * Khởi tạo Sidebar (Panel Dropdown hiển thị danh sách Board).
 */
export function initSidebar({ getIndex, currentBoardId, onBoardSelect, onBoardCreate, onBoardDelete, onBoardRename, menuIcon }) {
  // --- Container Top Nav ---
  const topNav = document.createElement('div');
  topNav.className = 'top-nav-container';
  topNav.innerHTML = `
    <button class="sidebar-toggle-btn" title="Menu dự án">
      ${menuIcon}
    </button>
    <div class="board-title-group">
      <span class="board-title-text" title="Đổi tên dự án">Loading...</span>
      <input type="text" class="board-title-input" style="display:none" autocomplete="off" spellcheck="false" />
      <button class="board-rename-btn">
        <svg width="12" height="12"><use href="assets/icons/sprite.svg#icon-rename"></use></svg>
        <div class="rename-tooltip">Đổi tên dự án</div>
      </button>
    </div>
  `;
  document.body.appendChild(topNav);

  const toggleBtn = topNav.querySelector('.sidebar-toggle-btn');
  const titleText = topNav.querySelector('.board-title-text');
  const titleInput = topNav.querySelector('.board-title-input');
  const renameBtn = topNav.querySelector('.board-rename-btn');

  // --- Bảng Overlay để bấm ra ngoài tắt Dropdown ---
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  // --- Sidebar Dropdown Menu ---
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <button class="menu-item sidebar-create-btn">
      <svg width="16" height="16"><use href="assets/icons/sprite.svg#icon-plus"></use></svg>
      <span>Tạo board mới</span>
    </button>
    <div class="sidebar-divider-horiz"></div>
    <div class="board-list" id="boardList"></div>
  `;
  document.body.appendChild(sidebar);

  let isOpen = false;
  let _currentBoardId = currentBoardId;

  function updateTitleText(title) {
    titleText.textContent = title;
  }

  // --- Logic Rename ---
  let isEditingTitle = false;
  function startEditTitle() {
    isEditingTitle = true;
    const currentName = titleText.textContent;
    titleText.style.display = 'none';
    renameBtn.style.display = 'none';
    titleInput.style.display = 'block';
    titleInput.value = currentName;
    titleInput.focus();
    titleInput.select();
  }

  function endEditTitle() {
    if (!isEditingTitle) return;
    isEditingTitle = false;
    let newName = titleInput.value.trim();
    if (!newName) newName = "Untitled Board";

    updateTitleText(newName);
    titleText.style.display = 'block';
    renameBtn.style.display = '';
    titleInput.style.display = 'none';

    if (onBoardRename && _currentBoardId) {
      onBoardRename(_currentBoardId, newName);
      refreshList(); // Update UI in sidebar too
    }
  }

  titleText.addEventListener('click', startEditTitle);
  renameBtn.addEventListener('click', startEditTitle);

  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') endEditTitle();
    if (e.key === 'Escape') {
      isEditingTitle = false;
      titleText.style.display = 'block';
      renameBtn.style.display = '';
      titleInput.style.display = 'none';
    }
  });

  titleInput.addEventListener('blur', endEditTitle);

  // --- Sidebar Logic ---
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

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen ? closeSidebar() : openSidebar();
  });

  overlay.addEventListener('click', closeSidebar);

  sidebar.querySelector('.sidebar-create-btn').addEventListener('click', async () => {
    await onBoardCreate();
    await refreshList();
  });

  async function refreshList() {
    const list = sidebar.querySelector('#boardList');
    list.innerHTML = '<div class="board-item">Loading...</div>'; // Loading indicator
    
    const boards = await getIndex();
    list.innerHTML = ''; // Xóa loading

    const currentInfo = boards.find((b) => b.id === _currentBoardId);
    if (currentInfo && !isEditingTitle) updateTitleText(currentInfo.name);

    boards.forEach((board) => {
      const item = document.createElement('div');
      item.className = 'board-item' + (board.id === _currentBoardId ? ' active' : '');

      item.innerHTML = `
        <div class="board-item-info">
          <span class="board-icon">
            <svg width="14" height="14"><use href="assets/icons/sprite.svg#icon-board"></use></svg>
          </span>
          <span class="board-name">${escapeHtml(board.name)}</span>
        </div>
        <button class="board-delete" title="Xóa Board">
          <svg width="14" height="14"><use href="assets/icons/sprite.svg#icon-trash"></use></svg>
        </button>
      `;

      item.querySelector('.board-item-info').addEventListener('click', () => {
        if (board.id === _currentBoardId) return;
        onBoardSelect(board.id);
        _currentBoardId = board.id;
        refreshList();
        closeSidebar();
      });

      item.querySelector('.board-delete').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (boards.length <= 1) {
          alert('Không thể xóa Board cuối cùng!');
          return;
        }
        if (confirm(`Xóa "${board.name}"?`)) {
          await onBoardDelete(board.id);
          await refreshList();
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
    async setCurrentBoard(id) {
      _currentBoardId = id;
      const boards = await getIndex();
      const currentInfo = boards.find((b) => b.id === id);
      if (currentInfo && !isEditingTitle) {
        updateTitleText(currentInfo.name);
      }
    },
  };
}
