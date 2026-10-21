# Responsive settlement totals

## Goal
Keep the “Total spent” and “To settle” figures bold and prominent while guaranteeing that formatted currency values remain inside their tiles.

## Confirmed issue
- At a 1280px viewport, `$210.00` renders at `89.6px` and measures about `343px` inside a `235px` tile.
- At a 390px viewport, the value renders at `56px` and measures about `215px` inside a `165px` tile.
- The cause is that `type-hsuper` scales from viewport width, while each result tile occupies only half of the narrower settlement column.

## Changes
1. Add a settlement-specific, container-aware value treatment rather than changing the shared `type-hsuper` scale globally.
2. Preserve Plus Jakarta Sans, bold weight, tight line-height, and tabular numerals; scale the value from the tile’s available width with a sensible large maximum and compact minimum.
3. Keep currency values on one line and prevent clipping or overlap, including longer amounts and currency symbols.
4. Keep the existing two-tile layout, teal glass styling, labels, count-up animation, and all calculation behavior unchanged.
5. Check representative short and long totals at desktop and mobile widths, then run the build, TypeScript check, and tests.

## Technical scope
- Limit implementation to the settlement result presentation and the shared result component only where a reusable opt-in is needed.
- No changes to bill calculations, URL state, persistence, chooser behavior, or other screens.
