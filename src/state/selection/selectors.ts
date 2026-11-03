import { filter, find, includes, isEmpty, keys, map, mapValues, reduce, values } from "lodash";
import { createSelector } from "reselect";

import {
    ARRAY_OF_CELL_IDS_KEY,
    CELL_ID_KEY,
    FOV_ID_KEY,
    GENERAL_PLOT_SETTINGS,
    GROUP_BY_KEY,
} from "../../constants";
import {
    getPerCellDataForPlot,
    getMeasuredFeaturesKeys,
    getCategoricalFeatureKeys,
    getMeasuredFeaturesDefs,
} from "../metadata/selectors";
import {
    DataForPlot,
    DiscreteMeasuredFeatureDef,
    FileInfo,
    MappingOfMeasuredValuesArrays,
    MeasuredFeatureDef,
    MeasuredFeaturesOption,
    MeasuredFeaturesWithCategoryNames,
    PerCellLabels,
} from "../metadata/types";
import { NumberOrString, SelectedGroups, State } from "../types";
import { findFeature, getCategoryString, getFileInfoDatumFromCellId, sortNumeric } from "../util";

import {
    combineMasks,
    computeAvailableValues,
    computeExcludedMask,
    computeHiddenMask,
    computeRowMask,
    computeTrackInfo,
    summarizeMask,
} from "./filters";
import { DEFAULT_SHAPE, defaultShapeAt, ShapeLegendRow } from "./shapes";
import { MISSING_CATEGORY_COLOR, MISSING_CATEGORY_LABEL } from "./constants";
import {
    ColorForPlot,
    ColumnFilter,
    DownloadConfig,
    LassoOrBoxSelectPointData,
    MainPlotSettings,
    MousePosition,
    SelectedPointData,
} from "./types";

// BASIC SELECTORS
export const getPlotByOnX = (state: State): string => state.selection.plotByOnX;
export const getPlotByOnY = (state: State): string => state.selection.plotByOnY;
export const getGroupByCategory = (state: State): string => state.selection.groupBy;
export const getConnectByCategory = (state: State): string => state.selection.connectByCategory;
export const getConnectByFeature = (state: State): string => state.selection.connectByFeature;
export const getShowConnectLines = (state: State): boolean => state.selection.showConnectLines;
export const getLineMovingAverageWindow = (state: State): number =>
    state.selection.connectLineMovingAverageWindow;
export const getLineWidth = (state: State): number => state.selection.connectLineWidth;
/** Returns the opacity of lines in the plot, in a [0, 1] range. */
export const getLineOpacity = (state: State): number => state.selection.connectLineOpacity;
export const getLineDefaultColor = (state: State): string =>
    state.selection.connectLineDefaultColor;
export const getClickedCellsFileInfo = (state: State): FileInfo[] => state.selection.selectedPoints;
export const getSelectedGroups = (state: State): SelectedGroups => state.selection.selectedGroups;
export const getColorBySelection = (state: State): keyof MappingOfMeasuredValuesArrays =>
    state.selection.colorBy;
export const getDefaultColors = (state: State): string[] => state.selection.defaultColors;
export const getColorOverrides = (state: State): (string | undefined)[] =>
    state.selection.colorOverrides;
/** Returns the radius of points in the plot, in pixels. */
export const getPointRadius = (state: State): number => state.selection.pointRadius;
/** Returns the opacity of points in the plot, in a [0, 1] range. */
export const getPointOpacity = (state: State): number => state.selection.pointOpacity;
export const getColorScale = (state: State): string => state.selection.colorScale;
export const getExcludedCellIds = (state: State): string[] => state.selection.excludedCellIds;
export const getSelectionSetColors = (state: State): { [key: string]: string } =>
    state.selection.selectedGroupColors;
export const getFiltersToExclude = (state: State): string[] => state.selection.filterExclude;
export const getShapeBy = (state: State): string => state.selection.shapeBy;
export const getShapeOverrides = (state: State) => state.selection.shapeOverrides;
export const getShapeHidden = (state: State) => state.selection.shapeHidden;
export const getSelected3DCell = (state: State): string => state.selection.cellSelectedFor3D;
export const getApplyColorToSelections = (state: State): boolean =>
    state.selection.applySelectionSetColoring;
export const getDownloadConfig = (state: State): DownloadConfig => state.selection.downloadConfig;
export const getMousePosition = (state: State): MousePosition => state.selection.mousePosition;
export const getHoveredPointData = (state: State): SelectedPointData | null =>
    state.selection.hoveredPointData;
export const getHoveredCardId = (state: State): string => state.selection.hoveredCardId;
export const getSelectedAlbum = (state: State): number => state.selection.selectedAlbum;
export const getGalleryCollapsed = (state: State): boolean => state.selection.galleryCollapsed;
export const getSelectedDataset = (state: State): string => state.selection.dataset;
export const getThumbnailRoot = (state: State): string => state.selection.thumbnailRoot;
export const getSelectedIdsFromUrl = (state: State): string[] => state.selection.initSelectedPoints;
export const getSelectedAlbumFileInfo = (state: State): FileInfo[] =>
    state.selection.selectedAlbumFileInfo;
export const getDownloadRoot = (state: State): string => state.selection.downloadRoot;
export const getVolumeViewerDataRoot = (state: State): string =>
    state.selection.volumeViewerDataRoot;
export const getAlignActive = (state: State): boolean => state.selection.alignActive;

export const getSelectedDatasetName = createSelector(
    [getSelectedDataset],
    (selectedDataset): string => {
        return selectedDataset.split("_v")[0];
    }
);
export const getCsvUrl = (state: State): string => state.selection.csvUrl;

// ===============================================================================================

// GROUP BY SELECTORS (For the checkbox panel)

export const getGroupByFeatureDef = createSelector(
    /**
     * Returns the full feature definition of the feature currently selected as the
     * "groupBy" feature. This is the feature that will dictate the checkboxes on the left
     * hand panel.
     */
    [getMeasuredFeaturesDefs, getGroupByCategory],
    (features: MeasuredFeatureDef[], categoryToGroupBy: string): DiscreteMeasuredFeatureDef => {
        const feature = findFeature(map(features), categoryToGroupBy);
        // the group by category is always going to point to a discrete feature,
        // this just ensures the downstream selectors of this know that.
        if (!feature || !feature.discrete) {
            return {} as DiscreteMeasuredFeatureDef;
        }
        return feature;
    }
);

export const getGroupByFeatureOptionsAsList = createSelector(
    /**
     * Returns the options of the currently selected "groupBy" feature as a sorted array.
     * Each of the options will correspond to a single checkbox in the selection panel.
     */
    [getGroupByFeatureDef],
    (feature: DiscreteMeasuredFeatureDef): MeasuredFeaturesOption[] => {
        if (isEmpty(feature)) {
            return [] as MeasuredFeaturesOption[];
        }
        const options = sortNumeric(values(feature.options), (option) => option.name);
        return options;
    }
);

export const getGroupingCategoryNames = createSelector(
    /**
     * Returns the just the names of the "groupBy" feature options.
     * Each of these names will be the label for the checkboxes.
     */
    [getGroupByFeatureOptionsAsList],
    (feature: MeasuredFeaturesOption[]): string[] => {
        return map(feature, "name");
    }
);

export const getCategoryGroupColorsAndNames = createSelector(
    /**
     * Returns array of objects that have the color mapping for each category in a colorBy
     * selection if the colorBy is a discrete feature.
     */
    [
        getColorBySelection,
        getGroupByCategory,
        getMeasuredFeaturesDefs,
        getCategoricalFeatureKeys,
        getColorOverrides,
    ],
    (
        categoryToColorBy: keyof MappingOfMeasuredValuesArrays,
        categoryToGroupBy: keyof MappingOfMeasuredValuesArrays,
        measuredFeaturesDefs: MeasuredFeatureDef[],
        categoricalFeatureKeys: string[],
        colorOverrides: (string | undefined)[]
    ): ColorForPlot[] => {
        /**
         * This data is used to both make the color legend and to tell the plot how to color
         * the data when a categorical (discrete) feature has been chosen from the "colorBy" menu
         */
        if (includes(categoricalFeatureKeys, categoryToColorBy)) {
            const feature = findFeature(measuredFeaturesDefs, categoryToColorBy as string);
            if (feature && feature.discrete) {
                const { options } = feature;
                const colorForPlot = map(options, (option: MeasuredFeaturesOption, key: string) => {
                    /**
                     * "key" is the numeral value in the features data. For categorical measured features
                     * this number can represent:
                     *   1. a number representing a boolean, ie, 1, 0, and -1 (for undefined)
                     *   2. an id to be mapped to the feature option. ie, a cell line number.
                     */
                    let id: string;
                    if (categoryToGroupBy === categoryToColorBy) {
                        /**
                         * For group by features, we're using the string name as the checkbox identifier instead of
                         * the numeral "key". We could change this in the future to reduce the complexity here.
                         */
                        id = option.key || option.name;
                    } else {
                        id = key;
                    }

                    return {
                        color: option.color,
                        name: id,
                        label: option.name,
                        key: Number.parseFloat(key),
                    };
                });

                // Sort so items are in the same order as the groupBy list
                sortNumeric(colorForPlot, (colorOption) => colorOption.label);

                // Apply override colors
                colorForPlot.forEach((colorOption, index) => {
                    const colorOverride = colorOverrides[index];
                    if (colorOverride) {
                        colorOption.color = colorOverride;
                    }
                });

                // Add a fallback color option for missing data; otherwise,
                // Plotly will automatically assign (unexpected) colors. As
                // noted above, options are keyed by string names when groupBy
                // and colorBy are the same, (ex: `["A", "B", "", "C"]`) and are
                // keyed by numeral IDs otherwise (ex: `[0, 1, null, 2]`).
                const missingColorOption: ColorForPlot = {
                    color: MISSING_CATEGORY_COLOR,
                    label: MISSING_CATEGORY_LABEL,
                    name: categoryToGroupBy === categoryToColorBy ? "" : "null",
                    key: NaN,
                };
                return [...colorForPlot, missingColorOption];
            }
        }
        return [];
    }
);

// ===============================================================================================

// MAIN PLOT SELECTORS
// ===================

// not truly a selector, it just seemed cleaner to make this one function instead of 3
// (2 for each axis and one for the color by)
// tooltip won't render if sent an empty string
export function getFeatureDefTooltip(key: string, options: MeasuredFeatureDef[]): string {
    const data = find(options, { key: key });
    if (data && data.tooltip) {
        return data.tooltip;
    }
    return "";
}

/**
 * Returns an array the length of the data that has the string representation of the
 * current `groupBy` category name for each cell in the data.
 * For example, if the the perCellDataForPlot
 * has `value["cell-line"] = [2, 2, 12, 12]`, and the `groupBy = "cell-line"`, then this will return
 * `["beta-actin", "beta-actin", "tom20", "tom20"]`
 */
export const getGroupingCategoryNamesAsArray = createSelector(
    [getPerCellDataForPlot, getGroupByFeatureDef],
    (
        perCellDataForPlot: DataForPlot,
        groupByCategoryFeatureDef: DiscreteMeasuredFeatureDef
    ): string[] => {
        const categoryKey: string = groupByCategoryFeatureDef.key;
        if (!categoryKey) {
            console.log("Missing groupBy category key");
            return [];
        }
        return map(perCellDataForPlot.values[categoryKey], (ele: number | null): string => {
            const numeralRepresentationOfTheCategory = ele !== null ? ele.toString() : "";
            return getCategoryString(groupByCategoryFeatureDef, numeralRepresentationOfTheCategory);
        });
    }
);

export const getMainPlotSettings = createSelector(
    [getPointOpacity, getPointRadius, getLineDefaultColor, getLineWidth, getLineOpacity],
    (
        pointOpacity: number,
        pointRadius: number,
        lineDefaultColor: string,
        lineWidth: number,
        lineOpacity: number
    ): MainPlotSettings => {
        return {
            ...GENERAL_PLOT_SETTINGS,
            circleRadius: pointRadius,
            unselectedCircleOpacity: pointOpacity,
            connectionLineDefaultColor: lineDefaultColor,
            connectionLineWidth: lineWidth,
            connectionLineOpacity: lineOpacity,
        };
    }
);

// UNFILTERED DATA
// ===================
/**
 * These selectors get the full x, y arrays for the currently selected features.
 * These arrays are the length of the data, regardless of whether any of the data has been filtered
 * by the checkboxes.
 */
export const getMeasuredValues = createSelector(
    [getPerCellDataForPlot],
    (dataForPlot: DataForPlot): MappingOfMeasuredValuesArrays => {
        return dataForPlot.values || {};
    }
);

export const getXValues = createSelector(
    [getMeasuredValues, getPlotByOnX],
    (measuredData: MappingOfMeasuredValuesArrays, plotByOnX: string): (number | null)[] => {
        if (measuredData[plotByOnX]) {
            return measuredData[plotByOnX];
        }
        return [];
    }
);

export const getYValues = createSelector(
    [getMeasuredValues, getPlotByOnY],
    (measuredData: MappingOfMeasuredValuesArrays, plotByOnY: string): (number | null)[] => {
        if (measuredData[plotByOnY]) {
            return measuredData[plotByOnY];
        }
        return [];
    }
);

export const getColorByCategoryCounts = createSelector(
    /**
     * Returns an array of numbers that correspond to the count of each
     * color by category
     */
    [getPerCellDataForPlot, getColorBySelection, getMeasuredFeaturesDefs],
    (
        measuredData: DataForPlot,
        categoryToColorBy: keyof MappingOfMeasuredValuesArrays,
        measuredFeatureDefs: MeasuredFeatureDef[]
    ): number[] => {
        const feature = findFeature(measuredFeatureDefs, categoryToColorBy as string);
        if (feature && feature.discrete) {
            const { options } = feature;
            const optionsList = values(options);
            sortNumeric(optionsList, (option) => option.name);
            let counts = map(optionsList, (option) => option.count);

            const numDefinedCounts = filter(counts, (count: number) => count !== undefined).length;
            if (numDefinedCounts === 0) {
                // Counts were not precalculated in the database, do it here
                const totals = reduce(
                    measuredData.values[categoryToColorBy],
                    (acc: { [key: string]: number }, cur) => {
                        // null values may still have a feature definition, IE "undetermined"
                        const key = cur !== null ? cur.toString() : "";
                        if (acc[key]) {
                            acc[key]++;
                        } else {
                            acc[key] = 1;
                        }
                        return acc;
                    },
                    {}
                );
                counts = values(totals);
            }

            // Calculate the number of cells that have no data for this
            // category, and append it to the end of the counts array. This is
            // the index corresponding with the missing category color option
            // returned by `getCategoryGroupColorsAndNames`, and allows the
            // total number of missing cells to be displayed in the legend.
            const totalCount = reduce(counts, (sum, count) => sum + (count ?? 0), 0);
            const missingCount = measuredData.indices.length - totalCount;

            return [...counts, missingCount] as number[];
        }
        return [];
    }
);

// FILTERED DATA
// =============

export const getFilters = (state: State): ColumnFilter[] => state.selection.filters;

/** Track key per row and timepoint counts per track; only recomputed when the data changes. */
export const getTrackInfo = createSelector(
    [getPerCellDataForPlot, getMeasuredFeaturesDefs],
    computeTrackInfo
);

/** Per-row pass/fail for the persistent filters, or null when none are active. */
const getColumnFilterRowMask = createSelector(
    [getPerCellDataForPlot, getMeasuredFeaturesDefs, getFilters, getTrackInfo],
    computeRowMask
);

const getExcludedMask = createSelector(
    [getPerCellDataForPlot, getExcludedCellIds],
    computeExcludedMask
);

/** Rows eligible under the column filters and not removed as outliers; counts and legends build on this. */
export const getFilterRowMask = createSelector(
    [getColumnFilterRowMask, getExcludedMask],
    combineMasks
);

/** How many cells of the loaded dataset are currently removed. */
export const getExcludedCount = createSelector([getExcludedMask], (mask) =>
    mask ? mask.filter((keep) => !keep).length : 0
);

/** Per filtered column, the values still available given the other filters (in the column's option order). */
export const getAvailableFilterValues = createSelector(
    [getPerCellDataForPlot, getMeasuredFeaturesDefs, getFilters, getTrackInfo],
    (data, defs, filters, trackInfo): { [column: string]: string[] } => {
        const result: { [column: string]: string[] } = {};
        filters.forEach(({ column }) => {
            const def = defs.find((d) => d.key === column);
            if (!def?.discrete || result[column]) {
                return;
            }
            const available = computeAvailableValues(data, defs, filters, trackInfo, column);
            result[column] = Object.keys(def.options)
                .map((key) => getCategoryString(def, key))
                .filter((name) => available.has(name));
        });
        return result;
    }
);

/** Rows hidden through the Shape By legend; separate from filters so options and counts for filters ignore it. */
const getHiddenMask = createSelector(
    [getPerCellDataForPlot, getMeasuredFeaturesDefs, getShapeBy, getShapeHidden],
    (data, defs, column, hidden) => computeHiddenMask(data, defs, column, hidden[column])
);

/** Rows that are both eligible under the filters and not hidden; this is what gets plotted. */
export const getRowMask = createSelector([getFilterRowMask, getHiddenMask], combineMasks);

export const getFilterSummary = createSelector(
    [getFilterRowMask, getTrackInfo, getPerCellDataForPlot],
    (mask, trackInfo, data) => summarizeMask(mask, trackInfo, data?.labels?.cellIds?.length ?? 0)
);

export const getFilteredCellData = createSelector(
    /**
     * Takes the full data and filters it based on the selected checkboxes and
     * augments the data with the array of "groupBy" category names per cell.
     */
    [
        getMeasuredFeaturesKeys,
        getFiltersToExclude,
        getPerCellDataForPlot,
        getGroupByCategory,
        getGroupingCategoryNamesAsArray,
        getRowMask,
    ],
    (
        measuredFeatureKeys,
        filtersToExclude,
        perCellDataForPlot: DataForPlot,
        categoryKey: string,
        groupingNames,
        rowMask
    ): DataForPlot => {
        // No cell ids yet means the dataset has not loaded, so there is nothing to filter.
        if ((!filtersToExclude.length && !rowMask) || !perCellDataForPlot.labels?.cellIds) {
            return {
                ...perCellDataForPlot,
                labels: {
                    ...perCellDataForPlot.labels,
                    [categoryKey]: groupingNames,
                },
            };
        }
        const categoryNameArray: string[] = [];
        const dataToReturn: MappingOfMeasuredValuesArrays = {};
        const cellIds: string[] = [];
        const thumbnails: string[] = [];
        const srcPaths: string[] = [];
        const indices: number[] = [];
        for (let i = 0; i < perCellDataForPlot.labels.cellIds.length; i++) {
            const categoryName: string = groupingNames[i];
            if (!includes(filtersToExclude, categoryName) && (!rowMask || rowMask[i])) {
                const cellId = perCellDataForPlot.labels.cellIds[i];
                cellIds.push(cellId);
                categoryNameArray.push(categoryName);
                thumbnails.push(perCellDataForPlot.labels.thumbnailPaths[i]);
                srcPaths.push(perCellDataForPlot.labels.sourcePaths?.[i] ?? "");
                indices.push(perCellDataForPlot.indices[i]);

                measuredFeatureKeys.forEach((featureKey) => {
                    if (!dataToReturn[featureKey]) {
                        dataToReturn[featureKey] = [];
                    }

                    dataToReturn[featureKey].push(
                        perCellDataForPlot.values[featureKey][i] as never
                    );
                });
            }
        }
        return {
            indices: indices,
            values: dataToReturn,
            labels: {
                [categoryKey]: categoryNameArray,
                [ARRAY_OF_CELL_IDS_KEY]: cellIds,
                thumbnailPaths: thumbnails,
                sourcePaths: srcPaths,
            },
        };
    }
);

export const getFilteredMeasuredValues = createSelector([getFilteredCellData], (plotForData) => {
    return plotForData.values || {};
});

export const getFilteredPerCellLabels = createSelector([getFilteredCellData], (plotForData) => {
    return plotForData.labels || {};
});

export const getFilteredXValues = createSelector(
    [getFilteredMeasuredValues, getPlotByOnX],
    (measuredData: MappingOfMeasuredValuesArrays, plotByOnX: string): (number | null)[] => {
        if (measuredData[plotByOnX]) {
            return measuredData[plotByOnX];
        }
        return [];
    }
);

export const getFilteredYValues = createSelector(
    [getFilteredMeasuredValues, getPlotByOnY],
    (measuredData: MappingOfMeasuredValuesArrays, plotByOnY: string): (number | null)[] =>
        measuredData[plotByOnY] || []
);

export const getFilteredConnectByCategoryValues = createSelector(
    [getFilteredMeasuredValues, getConnectByCategory],
    (measuredData: MappingOfMeasuredValuesArrays, connectByCategory: string): (number | null)[] =>
        measuredData[connectByCategory] || []
);

export const getFilteredConnectByFeatureValues = createSelector(
    [getFilteredMeasuredValues, getConnectByFeature],
    (measuredData: MappingOfMeasuredValuesArrays, connectByFeature: string): (number | null)[] =>
        measuredData[connectByFeature] || []
);

export const getFilteredIds = createSelector(
    [getFilteredPerCellLabels],
    (cellLabels: PerCellLabels): string[] => {
        return cellLabels[ARRAY_OF_CELL_IDS_KEY] || [];
    }
);

export const getFilteredColorByValues = createSelector(
    [getFilteredCellData, getColorBySelection, getGroupByCategory],
    (
        metaData: DataForPlot,
        categoryToColorBy: keyof MappingOfMeasuredValuesArrays,
        categoryToGroupBy: keyof MappingOfMeasuredValuesArrays
    ): string[] | (number | null)[] => {
        if (!metaData.labels) {
            return [];
        }
        const options: MeasuredFeaturesWithCategoryNames = {
            ...metaData.values,
            [categoryToGroupBy]: metaData.labels[categoryToGroupBy],
        };
        return options[categoryToColorBy] || [];
    }
);

// SHAPE BY
// ========

/**
 * One row per category of the Shape By column that exists under the active
 * filters (option order). Counts ignore legend visibility, so hidden
 * categories stay listed and can be reactivated.
 */
export const getShapeLegend = createSelector(
    [
        getShapeBy,
        getMeasuredFeaturesDefs,
        getShapeOverrides,
        getShapeHidden,
        getPerCellDataForPlot,
        getFilterRowMask,
    ],
    (shapeBy, defs, overrides, hidden, data, filterMask): ShapeLegendRow[] => {
        const def = defs.find((d) => d.key === shapeBy);
        if (!def?.discrete) {
            return [];
        }
        const counts: { [key: string]: number } = {};
        (data.values?.[shapeBy] ?? []).forEach((v, i) => {
            if (v !== null && (!filterMask || filterMask[i])) {
                counts[v] = (counts[v] ?? 0) + 1;
            }
        });
        const hiddenNames = new Set(hidden[shapeBy]);
        return Object.keys(def.options)
            .map((key, position) => {
                const name = getCategoryString(def, key);
                const custom = overrides[shapeBy]?.[name];
                return {
                    key,
                    name,
                    shape: custom ?? defaultShapeAt(position),
                    isCustom: !!custom,
                    visible: !hiddenNames.has(name),
                    total: counts[key] ?? 0,
                };
            })
            .filter((row) => row.total > 0);
    }
);

/** Marker symbol per filtered row, aligned with the plot's x/y arrays; undefined when Shape By is off. */
export const getFilteredShapeValues = createSelector(
    [getShapeLegend, getShapeBy, getFilteredCellData],
    (legend, shapeBy, filteredData): string[] | undefined => {
        if (!legend.length) {
            return undefined;
        }
        const shapeByKey = new Map(legend.map((row) => [row.key, row.shape]));
        return (filteredData.values?.[shapeBy] ?? []).map(
            (v) => (v === null ? undefined : shapeByKey.get(String(v))) ?? DEFAULT_SHAPE
        );
    }
);

export const getClickedScatterPoints = createSelector(
    [getClickedCellsFileInfo],
    (cells: FileInfo[]) => map(cells, CELL_ID_KEY)
);

// ===============================================================================================

// 3D VIEWER SELECTORS
export const getSelected3DCellFileInfo = createSelector(
    [
        getSelected3DCell,
        getClickedCellsFileInfo,
        getGroupingCategoryNamesAsArray,
        getPerCellDataForPlot,
    ],
    (
        selected3DCellId: string,
        fileInfoArray: FileInfo[],
        arrayOfCategoryNames,
        plotData
    ): FileInfo => {
        const fileInfo =
            getFileInfoDatumFromCellId(fileInfoArray, selected3DCellId) || ({} as FileInfo);
        let index = -1;
        if (isEmpty(fileInfo)) {
            return fileInfo;
        }
        if (fileInfo.index !== undefined) {
            index = fileInfo.index;
        } else {
            // only won't be present if this cell was selected via the url
            index = plotData.labels.cellIds.indexOf(selected3DCellId);
        }
        return {
            index,
            ...fileInfo,
            [GROUP_BY_KEY]: arrayOfCategoryNames[index],
        };
    }
);

export const getSelected3DCellFOV = createSelector(
    [getSelected3DCellFileInfo],
    (fileInfo: FileInfo): string => {
        return !isEmpty(fileInfo) ? fileInfo[FOV_ID_KEY].toString() : "";
    }
);

export const getSelected3DCellHasTransform = createSelector(
    [getSelected3DCellFileInfo],
    (fileInfo): boolean => !!fileInfo.transform
);

export const getSelected3DCellFeatureData = createSelector(
    [getSelected3DCellFileInfo, getMeasuredValues],
    ({ index }, values): { [key: string]: number | null } => {
        return index === undefined ? {} : mapValues(values, (data) => data[index]);
    }
);

// ===============================================================================================

// LASSOED or BOX SELECTED GROUPS SELECTORS
export const getSelectedGroupsData = createSelector(
    [getPerCellDataForPlot, getSelectedGroups, getPlotByOnX, getPlotByOnY, getSelectionSetColors],
    (
        metaData,
        selectedGroups,
        plotByOnX,
        plotByOnY,
        selectedGroupColorMapping
    ): {
        x: (number | null)[];
        y: (number | null)[];
        color: string[];
    } => {
        const colorArray: string[] = [];
        const xValues: (number | null)[] = [];
        const yValues: (number | null)[] = [];

        mapValues(selectedGroups, (value, key: string) => {
            // for each point index, get x, y, and color for the point.
            value.forEach((point: LassoOrBoxSelectPointData) => {
                colorArray.push(selectedGroupColorMapping[key]);
                xValues.push(metaData.values[plotByOnX][point.pointIndex]);
                yValues.push(metaData.values[plotByOnY][point.pointIndex]);
            });
        });
        return {
            color: colorArray,
            x: xValues,
            y: yValues,
        };
    }
);

export const getSelectedGroupKeys = createSelector(
    [getSelectedGroups],
    (selectedGroups: SelectedGroups): NumberOrString[] => {
        return keys(selectedGroups);
    }
);

export const getSelectedSetTotals = createSelector(
    [getSelectedGroups],
    (selectedGroups): number[] => {
        return map(selectedGroups, (group) => group.length);
    }
);
