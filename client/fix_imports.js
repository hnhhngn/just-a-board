const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const rawOldToNewMap = {
  'app/engine.js': 'src/core/engine.js',
  'app/grid.js': 'src/core/grid.js',
  'app/viewport.js': 'src/core/viewport.js',
  'app/state.js': 'src/core/state.js',
  'app/selection.js': 'src/core/selection.js',
  'app/objectStore.js': 'src/core/layerManager.js',
  'app/objects.js': 'src/core/interactionManager.js',
  
  'app/hud/Sidebar.js': 'src/components/layout/Sidebar.js',
  'app/hud/BottomBar.js': 'src/components/layout/BottomBar.js',
  'app/hud/FloatingToolbar.js': 'src/components/layout/FloatingToolbar.js',
  'app/hud/ObjectList.js': 'src/components/layout/ObjectList.js',
  
  'app/hud/ContextMenu.js': 'src/components/overlays/ContextMenu.js',
  'app/hud/SelectionOverlay.js': 'src/components/overlays/SelectionOverlay.js',
  'app/feedback/confirm.js': 'src/components/overlays/dialogs/ConfirmDialog.js',
  'app/feedback/notifications.js': 'src/components/overlays/ToastManager.js',
  'app/ui/tooltip.js': 'src/components/overlays/Tooltip.js',
  
  'app/clipboard.js': 'src/services/clipboard.js',
};

const oldToNewMap = {};
for (const [k, v] of Object.entries(rawOldToNewMap)) {
  oldToNewMap[path.normalize(k)] = path.normalize(v);
}

const newToOldMap = {};
for (const [oldP, newP] of Object.entries(oldToNewMap)) {
  newToOldMap[path.normalize(newP)] = path.normalize(oldP);
}

function getOldPath(currentNewPath) {
  const normNewPath = path.normalize(currentNewPath);
  const relPath = path.relative(__dirname, normNewPath);
  
  if (newToOldMap[relPath]) return newToOldMap[relPath];
  
  if (relPath.startsWith(path.normalize('src/components/widgets/'))) {
    return relPath.replace(path.normalize('src/components/widgets/'), path.normalize('app/widgets/'));
  }
  if (relPath.startsWith(path.normalize('src/commands/'))) {
    return relPath.replace(path.normalize('src/commands/'), path.normalize('app/commands/'));
  }
  if (relPath.startsWith(path.normalize('src/services/storage/'))) {
    return relPath.replace(path.normalize('src/services/storage/'), path.normalize('app/storage/'));
  }
  
  return null;
}

function getNewPath(oldRelPath) {
  const normOldPath = path.normalize(oldRelPath);
  if (oldToNewMap[normOldPath]) return oldToNewMap[normOldPath];
  
  if (normOldPath.startsWith(path.normalize('app/widgets/'))) {
    return normOldPath.replace(path.normalize('app/widgets/'), path.normalize('src/components/widgets/'));
  }
  if (normOldPath.startsWith(path.normalize('app/commands/'))) {
    return normOldPath.replace(path.normalize('app/commands/'), path.normalize('src/commands/'));
  }
  if (normOldPath.startsWith(path.normalize('app/storage/'))) {
    return normOldPath.replace(path.normalize('app/storage/'), path.normalize('src/services/storage/'));
  }
  
  return null;
}

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const importRegex = /(import\s+.*?from\s+['"])(.*?)(['"])/g;

walkDir(srcDir, (filePath) => {
  if (!filePath.endsWith('.js')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Manual fixing for the explicitly modified files that we don't map normally via script
  if (filePath.endsWith('app.js') || 
      filePath.endsWith('index.js') || 
      filePath.endsWith('boardManager.js') || 
      filePath.endsWith('keyboardShortcuts.js') ||
      filePath.endsWith('geometry.js') ||
      filePath.endsWith('arrayUtils.js')) {
    return;
  }

  const oldSelfPath = getOldPath(filePath);
  if (!oldSelfPath) {
    console.log(`Bỏ qua: ${filePath} (không có old map)`);
    return;
  }

  let changed = false;

  content = content.replace(importRegex, (match, p1, importPath, p3) => {
    if (!importPath.startsWith('.')) return match; 

    const oldSelfDir = path.dirname(path.join(__dirname, oldSelfPath));
    const oldImportAbsPath = path.resolve(oldSelfDir, importPath);
    const oldImportRelToRoot = path.relative(__dirname, oldImportAbsPath);

    if (oldImportRelToRoot === path.normalize('app/objectActions.js')) {
      const isGeometry = match.includes('screenToWorld') || match.includes('getViewportCenterWorld') || match.includes('getObjectsBounds') || match.includes('zoomToObject');
      const isArrayUtils = match.includes('moveOrder');
      
      let newImportTarget = 'src/utils/geometry.js';
      if (isArrayUtils && !isGeometry) newImportTarget = 'src/utils/arrayUtils.js';
      
      const currentNewDir = path.dirname(filePath);
      const newImportAbs = path.join(__dirname, newImportTarget);
      let newRelative = path.relative(currentNewDir, newImportAbs).replace(/\\/g, '/');
      if (!newRelative.startsWith('.')) newRelative = './' + newRelative;
      
      changed = true;
      return `${p1}${newRelative}${p3}`;
    }
    
    if (oldImportRelToRoot === path.normalize('app/feedback/index.js')) {
      let newRelative = path.relative(path.dirname(filePath), path.join(__dirname, 'src/components/overlays/ToastManager.js')).replace(/\\/g, '/');
      if (!newRelative.startsWith('.')) newRelative = './' + newRelative;
      changed = true;
      return `${p1}${newRelative}${p3}`;
    }

    if (oldImportRelToRoot === path.normalize('app/feedback/confirm.js')) {
      let newRelative = path.relative(path.dirname(filePath), path.join(__dirname, 'src/components/overlays/dialogs/ConfirmDialog.js')).replace(/\\/g, '/');
      if (!newRelative.startsWith('.')) newRelative = './' + newRelative;
      changed = true;
      return `${p1}${newRelative}${p3}`;
    }

    if (oldImportRelToRoot === path.normalize('app/feedback/notifications.js')) {
      let newRelative = path.relative(path.dirname(filePath), path.join(__dirname, 'src/components/overlays/ToastManager.js')).replace(/\\/g, '/');
      if (!newRelative.startsWith('.')) newRelative = './' + newRelative;
      changed = true;
      return `${p1}${newRelative}${p3}`;
    }

    const newImportRelToRoot = getNewPath(oldImportRelToRoot);
    if (!newImportRelToRoot) {
      console.log(`Không tìm thấy map cho: ${oldImportRelToRoot} (từ ${filePath})`);
      return match;
    }

    const currentNewDir = path.dirname(filePath);
    const newImportAbs = path.join(__dirname, newImportRelToRoot);
    let newRelativePath = path.relative(currentNewDir, newImportAbs).replace(/\\/g, '/');
    if (!newRelativePath.startsWith('.')) newRelativePath = './' + newRelativePath;

    if (newRelativePath !== importPath) {
      changed = true;
      return `${p1}${newRelativePath}${p3}`;
    }
    
    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Đã cập nhật imports: ${filePath}`);
  }
});

console.log('Update imports hoàn tất!');
