import type { UnknownAction } from "redux";
import { describe, it, expect } from "vitest";

import { COLOR_BY_SELECTOR, SHAPE_BY_SELECTOR } from "../../../constants";
import UrlState from "../../../util/UrlState";
import { mockState } from "../../test/mocks";
import { State } from "../../types";
import {
    changeAxis,
    changeGroupByCategory,
    resetShapeOverrides,
    setShapeOverride,
    showAllShapeCategories,
    toggleShapeHidden,
} from "../actions";
import reducer from "../reducer";
import {
    getAvailableFilterValues,
    getFilteredCellData,
    getFilteredColorByValues,
    getFilteredShapeValues,
    getFilterSummary,
    getShapeLegend,
} from "../selectors";
import { SHAPES } from "../shapes";

// "anaphase-segmentation-complete": options 0=Incomplete, 1=Complete, -1=Not determined; rows are [1, 0]
const COLUMN = "anaphase-segmentation-complete";

const withSelection = (selection: Partial<State["selection"]>): State => ({
    ...mockState,
    selection: { ...mockState.selection, ...selection },
});
const run = (state: State["selection"], action: object) => reducer(state, action as UnknownAction);

describe("Shape By selectors", () => {
    it("is off by default: no legend and circle markers", () => {
        expect(getShapeLegend(mockState)).toEqual([]);
        expect(getFilteredShapeValues(mockState)).toBeUndefined();
    });

    it("assigns default shapes by option order, with counts, and one symbol per row", () => {
        const state = withSelection({ shapeBy: COLUMN });
        const legend = getShapeLegend(state);
        // "Not determined" has no rows, so it is not listed
        expect(legend.map((r) => [r.name, r.shape, r.total, r.isCustom, r.visible])).toEqual([
            ["Incomplete", SHAPES[0], 1, false, true],
            ["Complete", SHAPES[1], 1, false, true],
        ]);
        expect(getFilteredShapeValues(state)).toEqual([SHAPES[1], SHAPES[0]]);
    });

    it("applies custom shapes without changing colors", () => {
        const base = withSelection({ shapeBy: COLUMN });
        const custom = withSelection({
            shapeBy: COLUMN,
            shapeOverrides: { [COLUMN]: { Complete: "star" } },
        });
        expect(getFilteredShapeValues(custom)).toEqual(["star", SHAPES[0]]);
        expect(getShapeLegend(custom)[1]).toMatchObject({ shape: "star", isCustom: true });
        expect(getFilteredColorByValues(custom)).toEqual(getFilteredColorByValues(base));
    });

    it("keeps shapes when Color By or Group By change", () => {
        const state = withSelection({
            shapeBy: COLUMN,
            shapeOverrides: { [COLUMN]: { Complete: "star" } },
        });
        let selection = run(state.selection, changeAxis(COLOR_BY_SELECTOR, "cell-line"));
        selection = run(selection, changeGroupByCategory("cell-line"));
        expect(selection.shapeBy).toBe(COLUMN);
        expect(getFilteredShapeValues({ ...state, selection })).toEqual(["star", SHAPES[0]]);
    });

    it("lists only categories left by the filters and restores shapes when the filter is removed", () => {
        const filtered = withSelection({
            shapeBy: COLUMN,
            shapeOverrides: { [COLUMN]: { Complete: "star" } },
            filters: [{ column: "cell-line", values: ["Paxillin"], enabled: true }],
        });
        // only the first row (cell-line 5 = Paxillin, Complete) remains
        expect(getFilteredShapeValues(filtered)).toEqual(["star"]);
        expect(getShapeLegend(filtered).map((r) => r.name)).toEqual(["Complete"]);
        const restored = withSelection({ ...filtered.selection, filters: [] });
        expect(getFilteredShapeValues(restored)).toEqual(["star", SHAPES[0]]);
        expect(getShapeLegend(restored)).toHaveLength(2);
    });

    it("reuses shapes when there are more categories than shapes", () => {
        const options = Object.fromEntries(
            Array.from({ length: SHAPES.length + 2 }, (_, i) => [
                String(i),
                { name: `c${i}`, color: "#000" },
            ])
        );
        const base = mockState.metadata.measuredFeaturesDefs.find((d) => d.key === COLUMN);
        const def = { ...base, key: "many", options };
        const state = {
            ...withSelection({ shapeBy: "many" }),
            metadata: {
                ...mockState.metadata,
                measuredFeaturesDefs: [...mockState.metadata.measuredFeaturesDefs, def],
                featureData: {
                    ...mockState.metadata.featureData,
                    values: {
                        ...mockState.metadata.featureData.values,
                        many: Array.from({ length: SHAPES.length + 2 }, (_, i) => i),
                    },
                },
            },
        } as State;
        const legend = getShapeLegend(state);
        expect(legend).toHaveLength(SHAPES.length + 2);
        expect(legend[SHAPES.length].shape).toBe(legend[0].shape);
    });
});

describe("Shape By state", () => {
    const initial = mockState.selection;

    it("sets, clears and resets overrides per column; Shape By is independent of Color By", () => {
        let s = run(initial, changeAxis(SHAPE_BY_SELECTOR, COLUMN));
        expect(s.shapeBy).toBe(COLUMN);
        expect(s.colorBy).toBe(initial.colorBy);

        s = run(s, setShapeOverride({ column: COLUMN, category: "Complete", shape: "star" }));
        s = run(s, setShapeOverride({ column: "other", category: "x", shape: "square" }));
        expect(s.shapeOverrides[COLUMN]).toEqual({ Complete: "star" });

        s = run(s, setShapeOverride({ column: COLUMN, category: "Complete" }));
        expect(s.shapeOverrides[COLUMN]).toEqual({});

        s = run(s, setShapeOverride({ column: COLUMN, category: "Complete", shape: "star" }));
        s = run(s, resetShapeOverrides(COLUMN));
        expect(s.shapeOverrides[COLUMN]).toBeUndefined();
        expect(s.shapeOverrides.other).toEqual({ x: "square" });

        s = run(s, changeAxis(SHAPE_BY_SELECTOR, ""));
        expect(s.shapeBy).toBe("");
        expect(s.colorBy).toBe(initial.colorBy);
    });

    it("round-trips shape settings through the URL and drops malformed values", () => {
        const shapeOverrides = { [COLUMN]: { Complete: "star" } };
        const params = UrlState.toUrlSearchParameterMap({ shapeBy: COLUMN, shapeOverrides });
        expect(UrlState.toAppState(params)).toMatchObject({ shapeBy: COLUMN, shapeOverrides });
        expect(UrlState.toAppState({ shapeOverrides: "nope" }).shapeOverrides).toEqual({});
    });
});

describe("Shape legend visibility", () => {
    const hide = (category: string, column = COLUMN) => toggleShapeHidden({ column, category });
    const plotted = (state: State) => getFilteredCellData(state).labels.cellIds.length;

    it("hides a category's samples but keeps it listed, with its shape, so it can be reactivated", () => {
        const base = withSelection({
            shapeBy: COLUMN,
            shapeOverrides: { [COLUMN]: { Complete: "star" } },
        });
        const selection = run(base.selection, hide("Complete"));
        const state = { ...base, selection };
        expect(plotted(base)).toBe(2);
        expect(plotted(state)).toBe(1);
        const row = getShapeLegend(state).find((r) => r.name === "Complete");
        expect(row).toMatchObject({ visible: false, shape: "star", total: 1 });
        // shapes of the remaining rows are unchanged
        expect(getFilteredShapeValues(state)).toEqual([SHAPES[0]]);
    });

    it("is independent of filters: no change to filter state, counts, or cascading options", () => {
        const base = withSelection({
            shapeBy: COLUMN,
            filters: [{ column: "cell-line", values: ["Paxillin"], enabled: true }],
        });
        const hidden = { ...base, selection: run(base.selection, hide("Complete")) };
        expect(hidden.selection.filters).toEqual(base.selection.filters);
        expect(getFilterSummary(hidden)).toEqual(getFilterSummary(base));
        expect(getAvailableFilterValues(hidden)).toEqual(getAvailableFilterValues(base));
        expect(plotted(hidden)).toBe(0);
    });

    it("toggles back, is kept per column, and survives Color By / Group By / shape changes", () => {
        let selection = run(withSelection({ shapeBy: COLUMN }).selection, hide("Complete"));
        selection = run(selection, changeAxis(COLOR_BY_SELECTOR, "cell-line"));
        selection = run(selection, changeGroupByCategory("cell-line"));
        selection = run(
            selection,
            setShapeOverride({ column: COLUMN, category: "Complete", shape: "star" })
        );
        expect(selection.shapeHidden[COLUMN]).toEqual(["Complete"]);

        // another Shape By column ignores this column's hidden categories; switching back reapplies them
        const other = { ...mockState, selection: { ...selection, shapeBy: "cell-line" } };
        expect(plotted(other)).toBe(2);
        const back = { ...mockState, selection: { ...selection, shapeBy: COLUMN } };
        expect(plotted(back)).toBe(1);

        selection = run(selection, hide("Complete"));
        expect(selection.shapeHidden[COLUMN]).toEqual([]);
        expect(plotted({ ...mockState, selection: { ...selection, shapeBy: COLUMN } })).toBe(2);
    });

    it("show all clears only that column", () => {
        let selection = run(mockState.selection, hide("Complete"));
        selection = run(selection, hide("x", "other"));
        selection = run(selection, showAllShapeCategories(COLUMN));
        expect(selection.shapeHidden).toEqual({ other: ["x"] });
    });
});
