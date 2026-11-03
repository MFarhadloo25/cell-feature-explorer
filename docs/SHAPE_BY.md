# Shape By

Marker shape shows a second categorical column next to Color By (e.g. Color By `Timepoint`, Shape By `Gene`). It only changes how points look, never which points are shown.

## Behavior
- **Independent state:** `selection.shapeBy` (column, `""` = all circles) and `selection.shapeOverrides` (`{column: {category: shape}}`). Changing Color By, Group By or filters never touches them, and the same color category keeps the same color on every shape.
- **Defaults:** categories get shapes in option order from `SHAPES` (`state/selection/shapes.ts`). With more categories than shapes, shapes repeat and the legend says so.
- **Custom shapes** are stored by column and category *name*, so they survive filtering out and restoring a category, and switching Shape By to another column and back.
- **Reset:** "Reset shapes" clears the current column's custom shapes (back to the default cycle). Choosing "None" shows circles but keeps custom shapes for later. Loading a different dataset via the landing page clears everything.
- **Legend:** lists the categories of the column that exist under the active filters (cascading), with counts. Shows the top 10 by count with a Show all / Show top 10 toggle, and a search box that searches the whole list.
- **Visibility:** clicking a legend row (or Enter/Space on it) hides that category's samples from the plot; click again to show them. Hidden rows are dimmed and struck through but stay listed and searchable. "Show all" reactivates every hidden category. Hidden state is kept per column (`selection.shapeHidden`), separate from filters, shapes and search, so changing Color By / Group By / filters never resets it. It only affects what is plotted; filter counts and cascading options ignore it. Switching Shape By to "None" shows everything again but remembers the hidden categories for that column. Not saved in the URL.
- **Order in the sidebar:** Plot configuration (Color By / Group By / legends), Active Filters, Shape By, then Selected sets.
- **URL:** `shapeBy` and `shapeOverrides` (JSON) params.

## Rendering
The scatter is one Plotly `scattergl` trace. `marker.symbol` is given as a per-point array (built in `getFilteredShapeValues`, aligned with the filtered rows); Plotly's groupby transform splits it per color group. No extra traces and no embedding recomputation.

## Limitations
- The selected-sets overlay trace still draws circles.
- `cross` and `x` are line-style symbols in Plotly and may render thinner/lighter than filled shapes; not visually verified.
- Shapes are keyed by category name; renaming a category in the data drops its custom shape.
- Tests cover state, selectors and URL; there are no component or visual tests.

## Panels
The Group by and Color legends have a Minimize/Expand toggle (`components/CollapsiblePanel`) that is independent of Show all / Show top 10. Shape By is its own accordion box (same look as Plot configuration and Active Filters), also independent of Show all; minimized it shows `Shape by (column: N categories, H hidden)`. Minimized panels show their title and a one-line summary; their contents stay mounted, so Show all and search text are kept. Both states are remembered per browser tab (sessionStorage, `hooks/usePersistentState`), so they survive reloads.
