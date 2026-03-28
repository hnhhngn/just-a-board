import { confirmAction } from '../overlays/dialogs/ConfirmDialog.js';
import { notify } from '../overlays/ToastManager.js';
import { setTooltip } from '../overlays/Tooltip.js';

/**
 * Khoi tao Sidebar (Panel Dropdown hien thi danh sach Board).
 */
export function initSidebar({ getIndex, currentBoardId, onBoardSelect, onBoardCreate, onBoardDelete, onBoardRename, menuIcon }) {
  const topNav = document.createElement('div');
  topNav.className = 'top-nav-container';
  topNav.innerHTML = `
    <button class="sidebar-toggle-btn" type="button" aria-label="Menu dự án" data-tooltip="Menu dự án" data-tooltip-placement="bottom">
      ${menuIcon}
    </button>
    <div class="board-title-group">
      <span class="board-title-text">Loading...</span>
      <input type="text" class="board-title-input" style="display:none" autocomplete="off" spellcheck="false" />
      <button class="board-rename-btn" type="button" aria-label="Đổi tên dự án" data-tooltip="Đổi tên dự án" data-tooltip-placement="bottom">
        <svg width="12" height="12"><use href="assets/icons/sprite.svg#icon-rename"></use></svg>
      </button>
    </div>
  `;
  document.body.appendChild(topNav);

  const toggleBtn = topNav.querySelector('.sidebar-toggle-btn');
  const titleText = topNav.querySelector('.board-title-text');
  const titleInput = topNav.querySelector('.board-title-input');
  const renameBtn = topNav.querySelector('.board-rename-btn');

  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <button class="menu-item sidebar-create-btn" type="button">
      <svg width="16" height="16"><use href="assets/icons/sprite.svg#icon-plus"></use></svg>
      <span>Tạo board mới</span>
    </button>
    <div class="sidebar-divider-horiz"></div>
    <div class="board-list" id="boardList"></div>
  `;
  document.body.appendChild(sidebar);

  let isOpen = false;
  let _currentBoardId = currentBoardId;
  let _currentIsDirty = false;
  let _dirtyBoardIds = new Set();

  function updateTitleText(title) {
    titleText.textContent = title;
  }

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

  function cancelEditTitle() {
    isEditingTitle = false;
    titleText.style.display = 'block';
    renameBtn.style.display = '';
    titleInput.style.display = 'none';
  }

  function endEditTitle() {
    if (!isEditingTitle) return;
    isEditingTitle = false;
    let newName = titleInput.value.trim();
    if (!newName) newName = 'Untitled Board';

    updateTitleText(newName);
    titleText.style.display = 'block';
    renameBtn.style.display = '';
    titleInput.style.display = 'none';

    if (onBoardRename && _currentBoardId) {
      onBoardRename(_currentBoardId, newName);
      refreshList();
    }
  }

  titleText.addEventListener('click', startEditTitle);
  renameBtn.addEventListener('click', startEditTitle);

  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') endEditTitle();
    if (e.key === 'Escape') cancelEditTitle();
  });

  titleInput.addEventListener('blur', endEditTitle);

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
    list.innerHTML = '<div class="board-item">Loading...</div>';

    const boards = await getIndex();
    list.innerHTML = '';

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
          <span class="board-name" data-basename="${escapeHtml(board.name)}">${escapeHtml(board.name)}${_dirtyBoardIds.has(board.id) ? ' *' : ''}</span>
        </div>
        <button class="board-delete" type="button" aria-label="Xóa board">
          <svg width="14" height="14"><use href="assets/icons/sprite.svg#icon-trash"></use></svg>
        </button>
      `;

      item.querySelector('.board-item-info').addEventListener('click', async () => {
        if (board.id === _currentBoardId) return;
        await onBoardSelect(board.id);
        _currentBoardId = board.id;
        await refreshList();
        closeSidebar();
      });

      const deleteBtn = item.querySelector('.board-delete');
      setTooltip(deleteBtn, { label: 'Xóa board', placement: 'left' });

      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (boards.length <= 1) {
          notify({
            tone: 'warning',
            title: 'Không thể xóa',
            message: 'Không thể xóa board cuối cùng.',
          });
          return;
        }

        const shouldDelete = await confirmAction({
          title: 'Xóa board?',
          message: `Board "${board.name}" sẽ bị xóa khỏi danh sách hiện tại.`,
          confirmLabel: 'Xóa board',
          cancelLabel: 'Hủy',
          tone: 'danger',
        });

        if (shouldDelete) {
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
      _currentIsDirty = false;
      const boards = await getIndex();
      const currentInfo = boards.find((b) => b.id === id);
      if (currentInfo && !isEditingTitle) {
        updateTitleText(currentInfo.name);
      }
    },
    setDirtyIndicator(isDirty) {
      _currentIsDirty = isDirty;
      const activeNameSpan = sidebar.querySelector('.board-item.active .board-name');
      if (activeNameSpan) {
        const base = activeNameSpan.getAttribute('data-basename');
        if (base) activeNameSpan.textContent = _dirtyBoardIds.has(_currentBoardId) ? base + ' *' : base;
      }
    },
    setDirtyBoards(boardIds) {
      _dirtyBoardIds = new Set(boardIds || []);
      if (isOpen) refreshList();
      const activeNameSpan = sidebar.querySelector('.board-item.active .board-name');
      if (activeNameSpan) {
        const base = activeNameSpan.getAttribute('data-basename');
        if (base) activeNameSpan.textContent = _dirtyBoardIds.has(_currentBoardId) ? base + ' *' : base;
      }
    },
  };
}
