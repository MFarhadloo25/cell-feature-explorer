# Cell Feature Explorer — Codebase Overview

Reference for feature development. Based on a quick survey of v1.9.2 (2026-10-28): package.json, vite.config.js, READMEs, `docs/data-flow.md` and file/line indexes were read; most component bodies were not. **Line numbers are approximate — verify before relying on them.** See also `docs/data-flow.md` and `src/state/README.md`.

## 1. Tech stack and commands

- **Framework:** React 18.3, TypeScript ^4.3.5 (old). UI: antd ^5.17, CSS modules (`*.module.css`, camelCase locals), a little less (`src/styles/ant-vars.less`).
- **State:** Redux (react-redux ^9.2), redux-logic ^5 for async side effects, reselect ^3. `redux` core is not in package.json (transitive). Store: `src/state/configure-store.ts` (devtools via `VITE_USE_REDUX_DEVTOOLS`). Redux Toolkit is not used — actions/reducers/constants are hand-written.
- **Plot:** plotly.js ^2.35 via react-plotly.js ^2.3.
- **3D viewer:** `@aics/vole-app` ^3.2.2 (`ImageViewerApp`), ome-zarr.js.
- **Data libs:** firebase ^9.23, papaparse, axios, lodash, qs, history ^4.
- **Build:** Vite ^8.3 + `@vitejs/plugin-react` ^6 (`vite.config.js`, dev port 9002; forces `optimizeDeps.include: ["@aics/vole-core > geotiff"]`). Leftover `.babelrc` and Babel devDeps (likely dead); `core-js@2`.
- **Tests:** vitest ^3.2.4. Legacy `enzyme`, `sinon@4`, `jsdom-global` still in devDeps. ESLint 8 + @typescript-eslint 5, prettier 2.
- **CI:** `.github/workflows` — ci, deploy, manual-deploy, promote, pr-preview. Also `Docker/` and gradle files.

| Script | Purpose |
|---|---|
| `npm start` / `npm run dev` | dev server |
| `npm run build` | build |
| `npm test` | vitest (watch) |
| `npm run typeCheck` | tsc |
| `npm run lint` | eslint |
| `npm run all-checks` | test + typeCheck + lint |
| `start:internal` / `build:internal` | sets `VITE_USE_JSON_DATASET=true` |
| `start:dev` / `staging-db-build` | sets `VITE_USE_DEV_DB=true` |
| `update-viewer` | update vole-app |

Env flags are read in `src/constants/index.ts` (lines ~4-6): `VITE_USE_DEV_DB`, `VITE_USE_JSON_DATASET`, `VITE_USE_REDUX_DEVTOOLS`.
**README mismatch:** README mentions `npm run start:dev-db`; the real script is `start:dev`.

## 2. Layout (`src/`)

- `index.tsx` — entry.
- `containers/` (Redux-connected):
  - `App` — routing landing page ↔ main view, URL/CSV bootstrapping, antd theme.
  - `Cfe` — main layout (plot + gallery + viewer); `selectors.ts` builds vole props.
  - `MainPlotContainer` — builds Plotly traces, colors, lines, controls (`index.tsx` ~422 lines, `selectors.ts` ~767 lines).
  - `ColorByMenu` — color-by / group-by panel (`selectors.ts` ~246 lines).
  - `ThumbnailGallery`, `CsvInput`.
- `components/` (presentational): MainPlot (react-plotly wrapper), CellViewer (vole-app wrapper), LandingPage, DatasetCard, MegasetCard, GalleryCard, ColorLegend, InteractiveLegend, FeatureSelectDropdown, DownloadDropDownMenu, PlotSettings, PlotLineSettings, ConnectByControl, AlignControl, ColorBySwitcher, AppHeader, MouseFollower, PopoverCard, SmallScreenWarning, LoadingOverlay, ResettableColorPicker, etc.
- `state/` — three branches, each with actions, reducer, logics, selectors, constants, types:
  - `metadata/` — available datasets, feature data, feature defs, albums, viewer channel settings.
  - `selection/` — axes, colorBy, groupBy, connectBy, selected points, filters, color overrides, point size/opacity, dataset, album, csvUrl, hover, download config.
  - `image-dataset/` — active backend object; `ImageDataset` interface in `types.ts`.
  - Also `state/types.ts`, `plotlyjs-types.ts`, `README.md` (Redux conventions).
- `util/` — `UrlState.ts` (~358 lines), `math.ts`, `thumbnails.ts`, `index.ts` (path rewriting, `fetchCsvText`). `hooks/useDebouncedSetter`.
- `constants/index.ts` — IDs, keys, palette, plot settings.
- `data/` — ~81 MB of JSON (`cell-feature-analysis.json` 28 MB, `cell_feature_analysis.json` 52 MB). Hyphen/underscore duplicates; looks like stale local fixtures, not obviously referenced by code.
- `docs/data-flow.md` (good architecture doc), `docs/superpowers/{plans,specs}`.

## 3. Features → implementing files

| Feature | Where |
|---|---|
| Dataset selection / landing page | `components/LandingPage`, `MegasetCard`, `DatasetCard`; `changeDataset` in `state/selection/logics.ts:~56`; available datasets in `state/metadata/logics.ts:~39` |
| Scatter plot, X/Y pickers, point size/opacity | `components/MainPlot/index.tsx`, `containers/MainPlotContainer`, `FeatureSelectDropdown` (IDs `plotByOnX`/`plotByOnY`), `PlotSettings` |
| Color-by / group-by, legends, filtering, overrides | `containers/ColorByMenu`, `ColorBySwitcher`, `ResettableColorPicker`, `ColorLegend`, `InteractiveLegend`; `toggleFilterByCategoryName`, `setColorOverride(s)`, `toggleApplySelectionSetColors` |
| Connect-by lines (moving average, width, color, opacity) | `ConnectByControl`, `PlotLineSettings`, `selection/actions.ts` |
| Selection (lasso/box/click/deselect/clear) | `lassoOrBoxSelectGroup`; `selection/reducer.ts` (~449 lines), `selection/selectors.ts` (~613 lines) |
| Albums + thumbnail gallery | `selectAlbum`, `containers/ThumbnailGallery`, `GalleryCard` |
| Hover | `MouseFollower`, `PopoverCard`, hovered-point actions |
| 3D viewer | `components/CellViewer` (vole-app `ImageViewerApp`); `containers/Cfe/selectors.ts` builds URL/params; `selectCellFor3DViewer`, `alignActive` (`AlignControl`) |
| Downloads | `DownloadDropDownMenu`, `LandingPage/download-data.ts`, `changeDownloadSettings` |
| Custom CSV upload / URL | `containers/CsvInput`, `state/image-dataset/csv-dataset/index.ts` (~617 lines), `LOAD_CSV_DATASET` in `image-dataset/logics.ts` |
| URL state | `util/UrlState.ts` — `URLSearchParam` enum (~lines 48-72): dataset, axes, colorBy, groupBy, connectBy, line settings, selectedPoint, selectedAlbum, galleryCollapsed, csvUrl, colorOverrides, ptRadius, ptOpacity, cellSelectedFor3D. Sync entry: `syncStateWithURL` (`selection/logics.ts:~41`) |

## 4. Data flow

**Backends** — three implementations of `ImageDataset` (`state/image-dataset/types.ts:~75`; methods: `selectDataset`, `getAvailableDatasets`, `getViewerChannelSettings`, `getFeatureData`, `getAlbumData`, `getMeasuredFeatureDefs`, `getFileInfoByCellId` + array variant):
- **Firebase** (`image-dataset/firebase/`) — production. Config hard-coded in `configure-firebase.ts` (`databaseURL: allen-cell-resource.firebaseio.com`); `USE_DEV_DB` switches to staging.
- **JSON flat files** (`image-dataset/json-dataset/index.ts`) — internal use. Base URL hard-coded (~line 96) to `http://dev-aics-dtp-001.corp.alleninstitute.org/cfedata/cell-feature-data/datasets.json`; megasets unhandled (TODO ~line 114).
- **CSV** (`image-dataset/csv-dataset/`) — uploaded text or `csvUrl`. Column conventions in `csv-dataset/constants.ts`; vole params can be embedded per row (`VOLE_PARAMS`).

Dataset format spec: the cell-feature-data repo's Handoff Specification (linked from README).

**Load sequence**
1. `App` bootstraps → `requestAvailableDatasets` (`metadata/logics.ts`) → `getAvailableDatasets`.
2. `changeDataset` → `selectDataset(manifest)` → `InitialDatasetSelections` (default axes/colors; thumbnail, download, volume-viewer roots).
3. `requestFeatureDataLogic` (`metadata/logics.ts:~84`) loads feature data into `metadata`; `requestAlbumData` and `requestViewerChannelSettings` run alongside.
4. Per-cell file info fetched lazily on selection (`selection/logics.ts:~139`, `~180`).
5. Path rewriting (`/allen/aics/` → `https://vast-files.int.allencell.org/`) in `util/index.ts:~6`.

**To the UI:** reselect selectors combine `selection` + `metadata`. `MainPlotContainer/selectors.ts` builds Plotly traces; `Cfe/selectors.ts` builds vole props; passed as props to `MainPlot` / `CellViewer`. Selection changes mirror back to the URL via `UrlState`.

## 5. Extension points

- **New data source:** implement `ImageDataset`, register via `changeImageDatasetType` (`image-dataset/logics.ts`). `csv-dataset` is the simplest template.
- **New dataset:** add a manifest to the Firebase DB or JSON `datasets.json` per the Handoff spec — no code change.
- **New URL-synced setting:** add enum entry + mapping in `util/UrlState.ts`; action + reducer in `state/selection`; a control component.
- **New plot type / metric:** plot is hard-wired to one Plotly scatter (built in `MainPlotContainer/selectors.ts`, rendered in `components/MainPlot`). A new chart type = new selector + component alongside, plus a toggle in `PlotTab`/`PlotSettings`. Derived metrics go in `util/math.ts` and metadata selectors.
- **Viewer options:** vole props in `containers/Cfe/selectors.ts`.
- **Constants / palette:** `constants/index.ts`.

## 6. Pain points and tech debt

- **Outdated tooling:** TS 4.3, ESLint 8, prettier 2, `core-js@2`, enzyme, sinon 4, history 4, reselect 3, 2017-18-era `@types/*` (`@types/jsdom@11`, `@types/sinon@2`, `@types/classnames`), dead Babel setup.
- **Firebase coupling:** `image-dataset/types.ts:~63` imports a firebase `Timestamp` type (acknowledged TODO) — leaks the dependency app-wide.
- **Hard-coded values:** firebase config, internal dev-aics-dtp URL, vast-files path mapping, glossary URL (`MainPlotContainer/index.tsx:~343`), `MITOTIC_STAGE_KEY` special case (`constants/index.ts:~46`, TODO), `DEFAULT_CSV_DATASET_KEY`.
- **Large mixed-concern files:** `MainPlotContainer/selectors.ts` (trace-building, color logic, filtering), `selection/selectors.ts`.
- **Robustness gaps:** `csv-dataset/index.ts` doesn't handle blank values (~line 238); no error UI for load failures (`App/index.tsx:~109-116`); `CsvInput` doesn't abort loading when its modal closes.
- **Known bugs / TODOs:** plotly modebar click bug (`MainPlot/index.tsx:~274`); plot retyping (`MainPlotContainer/index.tsx:~135`, `~188`); use "exclude" for measured features (`MainPlotContainer/selectors.ts:~597`); line-settings selector (`~462`); download menu overflow (`DownloadDropDownMenu/index.tsx:~124`).
- **Tests:** vitest covers pure logic only — selectors (`selection`, `metadata`, `Cfe`, `ColorByMenu`, `MainPlotContainer`, `ThumbnailGallery`), `metadata/logics`, `UrlState`, `math`, `util`, `CsvRequest`. **Untested:** FirebaseRequest, JsonRequest, selection/image-dataset logics, reducers, all React components. No integration tests.
- **Stale data:** ~81 MB JSON in `src/data` with duplicated names.

## 7. Open questions / not yet verified

- Component bodies were not read; behavior details (e.g. how selections interact with filters) need a targeted read before changing them.
- Whether `src/data/*.json` is referenced anywhere (candidate for removal).
- Which of the three backends the planned feature work should target.
