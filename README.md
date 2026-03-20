# Just A Board

## 1. System Overview

**Just A Board** is a Vanilla JS DOM-based infinite canvas application.

- **NO FRAMEWORKS**: Plain HTML, CSS, JavaScript (ES Modules).
- **DOM-based Canvas**: Instead of the `<canvas>` API, the app uses a mega-container (`div#world`) inside a fixed `div#viewport`. Objects are just HTML Nodes.
- **Hardware Acceleration**: uses `transform: translate3d()` and `scale()` on the `div#world` container to achieve 60FPS fluid pan/zoom.

## 2. Core Architecture

### App State (`src/state.js`)

Serves as the central mutable store (Single Source of Truth) for the entire app.

- **Viewport State**: `currentX`, `currentY`, `currentScale`, `targetX`, `targetY`, `targetScale`.
- **Anchor Math**: `anchorMouseX`, `anchorWorldX` (used to zoom towards the mouse cursor or screen center).
- **Engine State**: `isLoopRunning`, `isDirty` (controls requestAnimationFrame).
- **App Data**: `objects` (array of all widget instances), `activeTool`, `currentBoardId`.

### Render Engine (`src/engine.js`)

The `engine.js` module runs an optimized rendering loop.

- **WakeUp / Sleep cycle**: To save CPU, `requestAnimationFrame` only runs when `state.isDirty = true`.
- **Lerp**: Smoothly interpolates `currentX/Y/Scale` towards `targetX/Y/Scale` using `settings.pansEase` and `zoomEase`.
- **Culling (Spatial Hashing)**: During the render loop, it calculates the visible boundaries. It uses `src/grid.js` to get a subset of objects potentially in view. Elements completely outside the viewport are assigned `display: none` to conserve DOM rendering performance.

### Spatial Grid (`src/grid.js`)

Implements a 2D spatial hash map to handle DOM culling.

- Maps continuous space into chunks (e.g., `500x500` pixels per cell).
- Objects are dynamically registered/unregistered as they move or resize.
- **Query**: Engine calls `getVisibleCandidates(left, top, right, bottom)` to grab elements overlapping the viewport bounds.

### Viewport Interaction (`src/viewport.js`)

Listens to mouse/pointer events on the main container.

- **Right Click / Mouse Wheel Drag / Space+Drag**: Updates `state.targetX/Y` (Pan).
- **Scroll Wheel**: Updates `state.targetScale` and calculates zoom anchors (Zoom).
- **Delegation**: Ensures panning only occurs when the `select` tool is active or when explicitly using pan hotkeys.

## 3. Object & Interaction System

### Event Delegation (`src/objects.js`)

Handles object creation, selection, dragging, and deletion.

- **Delegation basis**: Listens on `div#world`. Translates screen coordinates (`e.clientX`) to world coordinates (`(clientX - currentX) / currentScale`).
- **Tools**:
  - `note`: Single-clicking empty space creates a `NoteWidget`.
  - `shape`: Single-clicking empty space creates a Shape (or calls `ShapeWidget`).
  - `select`: Allows dragging elements or double-clicking to trigger their native edit mode.

### Widget Abstraction (`src/widgets/`)

Common interface for items attached to the board.

- **Required interface**:
  - `createElement()`: Returns DOM node.
  - `exportData()`: Returns JSON representation.
  - `attach()`, `detach()`: Injects or removes from `#world`.
  - `x`, `y`, `width`, `height`: Getters/setters that physically move/size the DOM and simultaneously update their position in the Spatial `grid.js`.

## 4. Storage & State Persistence

### Command Manager / Machine (`src/commands/CommandManager.js`)

Implements the Command Pattern for Undo/Redo.

- **Stack**: Maintains `undoStack` and `redoStack`.
- Commands strictly implement: `execute()` and `undo()`.

### Multi-board Manager (`src/storage/LocalAdapter.js`)

Manages persistence via `localStorage`.

- **Index**: `jab-boards-index` (Array of `{id, name, updatedAt}`).
- **Data storage**: `jab-board-{id}` (JSON stringified array of objects).
- Supports seamless switching across multiple boards by tearing down (`detach`) the current world and hydrating the new board context.

## 5. User Interface (HUD)

- Uses CSS Custom Properties (`var(--bg-color)`) heavily to support `[data-theme='light']` and Dark mode seamlessly. (See `style.css` > Theme Variables).
- **Sidebar (`src/hud/Sidebar.js`)**: Floating dropdown overlay handling the multi-board UI. Allows inline-renaming of boards.
- **Floating Toolbar (`src/hud/FloatingToolbar.js`)**: Static pill containing core tools (Select, Note, Shape, Save) interacting with `state.activeTool`.
- **Bottom Controls (`src/hud/BottomBar.js`)**: Controls global scale (Zoom Fit, Zoom In/Out, 100%) and the toggle switch for Dark/Light mode overrides.

## 6. AI Contributor Guidelines

1. **Keep it Vanilla**: Do not introduce React/Vue/Svelte or heavy libraries. Use standard DOM manipulating patterns like `document.createElement`.
2. **Respect the Render Loop**: ALL structural shifts to the `world` transform must be passed to `state.targetX`, `state.targetY`, and `state.targetScale`. Call `wakeUp()` to visually apply the changes. NEVER manipulate `world.style.transform` directly outside `engine.js`.
3. **Scale factor logic**: Always differentiate between screen space (px relative to viewport) and world space (relative to infinite canvas point `0,0`).
   - `World = (Screen - currentX) / currentScale`
   - `Screen = World * currentScale + currentX`
4. **Theme styling**: Always use `var(--var-name)` strings for colors. If creating a new HUD component, use the defined `--panel-bg`, `--text-color`, `--btn-hover-bg`, `--divider`. Do NOT hardcode standard colors in CSS.
5. **Culling maintenance**: Ensure any newly created object is properly bound to `grid.js` upon mounting and unmounted upon deletion. If an object moves, call `updateObjectInGrid(obj, oldBounds)`.
