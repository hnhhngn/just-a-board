# Tooltip Design System

This project uses a shared tooltip primitive from `client/app/ui/` for app-managed UI.

## Use tooltips when

- The control is icon-only.
- The control exposes a keyboard shortcut.
- The action is destructive and represented by an icon.
- The control is interactive but its affordance is not obvious from visible text alone.
- The visible label may be clipped or hidden in some states.

## Do not use tooltips when

- The control already has a clear visible text label.
- The content appears in context menus.
- The element is a structural UI part such as resize handles.
- The text is already always visible and self-explanatory.

## Current managed controls

- Floating toolbar tool buttons
- Sidebar menu toggle
- Sidebar rename button
- Sidebar board delete button
- Bottom save indicator
- Bottom settings button
- Bottom theme toggle button

## Implementation notes

- Managed elements should use `data-tooltip`, optional `data-tooltip-shortcut`, and optional `data-tooltip-placement`.
- Do not leave a `title` attribute on elements managed by the shared tooltip system.
- Keep `aria-label` on icon-only controls for accessibility.
