# Selection Interaction Update - 2026-03-22

## Summary
This document records the interaction and HUD changes implemented in the current editing round for selection, pan, overlay, and related UI behavior in Just A Board.

## Source Planning Notes
This update did not come from ad-hoc implementation only. It was derived from the original planning notes for interaction, save/draft flow, context menu behavior, and later follow-up notes focused on select mode behavior.

The final implementation is broader than the original notes because several supporting fixes and UI corrections were required during execution.

## Traceability to Original TODOs

### From the original interaction and draft/save planning notes
- Context menu on object:
  implemented with delete, copy, layer ordering actions.
- Context menu on blank space:
  implemented with paste, save, clear.
- No auto save when switching board:
  implemented through saved snapshot plus board-local draft flow.
- Object interactions:
  implemented selection, keyboard move, resize, delete, copy, multi-select behavior.
- Board mouse interactions:
  implemented select as default, Ctrl multi-select, Shift pan, wheel pan, Shift + wheel horizontal pan, Ctrl + wheel zoom, and double click zoom-to-fit.

### From the later select mode refinement notes
- Hover object:
  implemented hover selection frame, removed object dimming, and switched cursor to move-style interaction in select mode.
- Click object:
  implemented visible resize handles for selected objects.
- Drag selected object:
  implemented dashed selection outline while moving.
- Marquee selection:
  implemented drag-on-empty-space marquee selection with multi-object hit testing.

### Expanded Beyond The TODO Notes
- Added explicit pan state to toolbar and cursor sync.
- Added dedicated hover, active, multi-select, and marquee overlay layers.
- Fixed stale primary selection and selection overlay misalignment issues.
- Reduced multi-selection overlay flicker by retaining and updating DOM nodes in place.
- Corrected selection overlay z-index so it stays below other HUD layers.
- Iterated handle styling from circular dots to square handles aligned to selection borders.

## Goals
- Make selection behavior closer to familiar desktop tools.
- Separate select behavior from pan behavior.
- Improve overlay stability and visual clarity.
- Add marquee selection.
- Keep toolbar and cursor states synchronized with the current interaction.

## Main Behavior Changes

### 1. Draft selection model improvements
- Added explicit selection state helpers in `client/app/selection.js`.
- Normalized primary selection fallback logic.
- Added hover state tracking for objects.

### 2. Pan vs select separation
- When the app is in a pan gesture (`Space + drag`, `Shift + drag`, or active pan), object dragging is blocked.
- Pan now affects only the world/camera, not board objects under the pointer.
- Toolbar and cursor now expose pan as a visible interaction state.

### 3. Toolbar and cursor sync
- Toolbar active state is now driven from `state.activeTool`.
- Cursor state is now derived from both tool state and interaction state.
- Added a pan status icon to the sprite and toolbar.
- `select`, `note`, `shape`, and temporary pan interaction now present different cursor behavior.

### 4. Selection overlay redesign
- Added a dedicated overlay layer in `client/app/hud/SelectionOverlay.js`.
- Hover, active selection, multi-selection, and marquee are now rendered as separate overlay concepts.
- Multi-selection no longer uses one giant union box; each selected object gets its own box.
- Single selection still supports resize handles.

### 5. Marquee selection
- Added drag-on-empty-space marquee selection in `client/app/objects.js`.
- Marquee supports selecting multiple objects by intersection with object client rects.
- Ctrl-modified marquee extends the previous selection set.

### 6. Drag feedback
- While selected objects are being moved, the selection outline switches to dashed.
- Hover-only state shows a clean box without resize handles.

## Visual Styling Changes

### 1. Selection box styling
- Selection box border was increased and then corrected with `box-sizing: border-box` so the overlay matches the object bounds.
- Selection overlay z-index was lowered so it stays under the main HUD layers.

### 2. Resize handle styling
- Handles were changed from circular dots to square handles.
- Handles keep the same 8 anchor positions.
- Handle positioning was adjusted so their centers align with the selection border lines.
- Browser default button styles were reset to avoid distorted rectangular rendering.

## Stability Fixes

### 1. Overlay stale selection fix
- Primary selection is normalized when stale references exist.
- Overlay geometry uses actual DOM `getBoundingClientRect()` rather than relying only on serialized object geometry.

### 2. Marquee visibility fix
- Marquee rendering now has its own priority path and is not accidentally hidden by the empty-selection branch.

### 3. Multi-selection flicker reduction
- Replaced per-frame `innerHTML` rebuilding of multi-selection boxes.
- Multi-selection boxes are now retained per object and updated in place.
- Avoided unnecessary DOM reordering and redundant style writes where possible.

## Files Touched Most Heavily
- `client/app/hud/SelectionOverlay.js`
- `client/app/objects.js`
- `client/app/selection.js`
- `client/app/state.js`
- `client/app/viewport.js`
- `client/app/hud/FloatingToolbar.js`
- `client/assets/icons/sprite.svg`
- `client/css/interactions.css`
- `client/css/base.css`
- `client/css/toolbar.css`
- `client/app/main.js`

## Notes and Follow-up
- Overlay rendering still runs on `requestAnimationFrame`, which is acceptable for now because object bounds must track pan/zoom/drag continuously.
- If any residual 1px drift appears at certain zoom levels, the next step should be rect rounding or pixel snapping before applying overlay style values.
- If DevTools still reports frequent mutations for multi-selection at some zoom levels, inspect sub-pixel `getBoundingClientRect()` drift under transforms before changing the architecture further.
