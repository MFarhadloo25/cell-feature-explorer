# Persistent filters

Filtering is independent of Group By. Changing Group By or Color By never changes the filters.

## How it behaves
- State: `selection.filters` — a list of `{ column, values?, min?, max?, enabled }`, one entry per column (`state/selection/types.ts`).
- Logic: **AND across filters, OR within a filter's values.** Applied once, in `getFilteredCellData` (`state/selection/selectors.ts`), so the plot, gallery and counts all see the same rows. The pure logic lives in `state/selection/filters.ts`.
- The legend checkboxes (`filterExclude`) still work and combine with these filters (AND).
- Disabled filters keep their values but have no effect. Removing or clearing never touches other filters.
- Missing/null values never match a value filter. Filters on a column the current dataset does not have are ignored and flagged in the panel (they are not deleted, so switching datasets is safe).
- Selections are never auto-erased; if nothing matches, the panel says so.
- Filters are saved in the URL as one JSON `filters` param.

## Active Filters panel
It is an accordion like "Plot configuration" (click the header to minimize/expand; remembered per browser tab). Minimized, the header shows the filter count and the samples/tracks that match. It sits between Plot configuration and Selected sets, followed by Shape By.

## Cascading options
Each filter's value picker lists only values present in rows that pass **all other** active filters (including timepoints per track), so gene -> well -> track narrow progressively regardless of the order filters were added. A filter's own selection is excluded from its own constraint, so you can still widen it. Selected values that stop matching after another filter changes stay selected and are marked "(no match)"; nothing is removed automatically. Implemented in `computeAvailableValues` / `getAvailableFilterValues`.

## Tracks and timepoints
Track, timepoint and dataset columns are auto-detected by name (`track`, `timepoint`/`time`/`frame`, `dataset`) in `detectTrackColumns`. A track is identified by `dataset||track`, so ids reused across datasets do not collide. A track's timepoint count is its number of distinct non-null timepoints. The **Timepoints per track** filter (min, max, or both equal for exact) keeps every frame of qualifying tracks. Rows with no track never pass a coverage filter.

## Example
Add `gene = ABCA1`, `dataset = A`, and `Timepoints per track ≥ 5` in the Active Filters panel, then switch Group By to Track: all three stay active.

## Limitations (first version)
- Fixed-name column detection; no per-dataset mapping UI.
- There is no per-track include/exclude list.
- Samples/tracks counts in the panel reflect these filters only, not legend-checkbox exclusions.
- Tests cover logic, reducer and URL round-trip; there are no React component tests.

## Searching and selecting categories
- **Semantics:** Typing only narrows what is listed. A filter value (or category) changes only when you pick an option; clearing or changing the search never removes selections. In a multi-select filter, earlier picks stay while you search for more. Multiple values in one filter are OR; separate filters are AND.
- **Where:** every column dropdown (X, Y, Color By, Group By, Connect By, Shape By, "Filter by column...") and each filter's value picker use `components/SearchableSelect` (antd `Select` with type-to-search, case-insensitive substring match, "No matches", arrow/Enter/Escape keys, virtual scrolling). Filter value options are the cascading ones, so search runs over only the currently eligible values.
- **Legends** (Group By, Color, Shape): lists over 10 categories get a "Search categories" box (`components/LimitedList`). Searching shows matching categories from the whole list (up to 200) and does not change checkboxes, colors or shapes. Escape clears it.
- Matching: `util/search.ts` (`matchesSearch`).
- Limits: legend search is a plain substring match on the displayed name; the multi-select has no "clear all" button on purpose (it would wipe every selection).
