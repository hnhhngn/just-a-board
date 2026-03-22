# Z-Index Layering Guide

This project uses a token-based z-index system. Do not use raw numeric `z-index` values for global UI layers.

## Global Layers

Defined in `client/css/tokens.css`:

- `--z-canvas-base`: Base board objects.
- `--z-canvas-highlight`: Temporary object highlight over regular board objects.
- `--z-selection-overlay`: Selection/hover/marquee overlay above canvas content.
- `--z-hud-dock`: Main HUD anchors (top nav, bottom controls, object list).
- `--z-hud-floating`: Floating HUD elements that should sit above docked HUD.
- `--z-hud-screen-overlay`: Full-screen HUD overlays (click-catcher, modal backdrop).
- `--z-hud-panel`: Open HUD panels/dropdowns.
- `--z-menu`: Highest transient layer such as context menu.

## Rules

1. Use `var(--z-...)` for all cross-component layering.
2. Local visual ordering inside one component (for example tooltip arrow border/fill) can use small local variables like `--z-tooltip-border`.
3. If a new global layer is needed, add a new token in `tokens.css` and update this guide.
