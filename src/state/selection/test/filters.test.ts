import type { UnknownAction } from "redux";
import { describe, it, expect } from "vitest";

import type { DataForPlot, MeasuredFeatureDef } from "../../metadata/types";
import {
    changeGroupByCategory,
    clearFilters,
    removeFilter,
    setFilter,
    toggleFilterEnabled,
} from "../actions";
import {
    computeAvailableValues,
    computeRowMask,
    computeTrackInfo,
    summarizeMask,
    TIMEPOINT_COVERAGE_COLUMN,
} from "../filters";
import reducer, { initialState } from "../reducer";

const discrete = (key: string, names: string[]): MeasuredFeatureDef => ({
    discrete: true,
    key,
    displayName: key,
    description: "",
    tooltip: "",
    options: Object.fromEntries(names.map((name, i) => [String(i), { name, color: "#000" }])),
});
const continuous = (key: string): MeasuredFeatureDef => ({
    discrete: false,
    key,
    displayName: key,
    description: "",
    tooltip: "",
});

const defs: MeasuredFeatureDef[] = [
    discrete("gene", ["ABCA1", "TP53"]),
    discrete("dataset", ["A", "B"]),
    discrete("track", ["T1", "T2"]),
    continuous("timepoint"),
];

// Track T1 exists in both datasets (not globally unique): A||T1 has 3 timepoints, B||T1 has 1.
const data: DataForPlot = {
    indices: [0, 1, 2, 3, 4, 5],
    labels: { cellIds: ["a", "b", "c", "d", "e", "f"], thumbnailPaths: [] } as never,
    values: {
        gene: [0, 0, 0, 0, 1, null],
        dataset: [0, 0, 0, 1, 0, 0],
        track: [0, 0, 0, 0, 1, 1],
        timepoint: [0, 1, 2, 0, 0, null],
    },
};

const filter = (column: string, values: string[], enabled = true) => ({ column, values, enabled });
const mask = (filters: ReturnType<typeof filter>[] | any[]) =>
    computeRowMask(data, defs, filters, computeTrackInfo(data, defs));

describe("computeRowMask", () => {
    it("passes everything (null) when no filters are active", () => {
        expect(mask([])).toBeNull();
        expect(mask([filter("gene", ["ABCA1"], false)])).toBeNull();
        expect(mask([filter("gene", [])])).toBeNull();
    });

    it("ORs values within a column and ANDs across columns", () => {
        expect(mask([filter("gene", ["ABCA1", "TP53"])])).toEqual([
            true,
            true,
            true,
            true,
            true,
            false,
        ]);
        expect(mask([filter("gene", ["ABCA1"]), filter("dataset", ["A"])])).toEqual([
            true,
            true,
            true,
            false,
            false,
            false,
        ]);
    });

    it("never matches missing values and ignores filters on absent columns", () => {
        expect(mask([filter("gene", ["ABCA1", "TP53"])])?.[5]).toBe(false);
        expect(mask([filter("nope", ["x"])])).toBeNull();
    });
});

describe("before a dataset has loaded", () => {
    it("handles empty data without throwing", () => {
        const empty = {} as DataForPlot;
        const info = computeTrackInfo(empty, []);
        expect(computeRowMask(empty, [], [filter("gene", ["ABCA1"])], info)).toBeNull();
        expect(summarizeMask(null, info, 0)).toEqual({ samples: 0, tracks: 0 });
    });
});

describe("filtered data before a dataset has loaded", () => {
    it("does not throw when filters exist but the data is empty", async () => {
        const { getFilteredCellData } = await import("../selectors");
        const { mockState } = await import("../../test/mocks");
        const state = {
            ...mockState,
            selection: {
                ...mockState.selection,
                filterExclude: ["x"],
                filters: [filter("gene", ["ABCA1"])],
            },
            metadata: {
                ...mockState.metadata,
                featureData: { indices: [], values: {}, labels: {} } as never,
            },
        };
        expect(() => getFilteredCellData(state)).not.toThrow();
    });
});

describe("track coverage", () => {
    it("keys tracks by dataset so repeated ids do not collide", () => {
        const info = computeTrackInfo(data, defs);
        expect(info.timepointCounts.get("A||T1")).toBe(3);
        expect(info.timepointCounts.get("B||T1")).toBe(1);
        // T2 rows have one non-null timepoint and one missing one
        expect(info.timepointCounts.get("A||T2")).toBe(1);
    });

    it("supports min, max and exact; keeps all frames of qualifying tracks", () => {
        const coverage = (min?: number, max?: number) => ({
            column: TIMEPOINT_COVERAGE_COLUMN,
            min,
            max,
            enabled: true,
        });
        expect(mask([coverage(2)])).toEqual([true, true, true, false, false, false]);
        expect(mask([coverage(undefined, 1)])).toEqual([false, false, false, true, true, true]);
        expect(mask([coverage(3, 3)])).toEqual([true, true, true, false, false, false]);
    });

    it("summarizes samples and tracks", () => {
        const info = computeTrackInfo(data, defs);
        const m = computeRowMask(data, defs, [filter("dataset", ["A"])], info);
        expect(summarizeMask(m, info, 6)).toEqual({ samples: 5, tracks: 2 });
        expect(summarizeMask(null, info, 6)).toEqual({ samples: 6, tracks: 3 });
    });
});

describe("computeAvailableValues (cascading options)", () => {
    const info = computeTrackInfo(data, defs);
    const avail = (filters: any[], column: string) =>
        [...computeAvailableValues(data, defs, filters, info, column)].sort();

    it("lists every non-missing value when no other filter applies", () => {
        expect(avail([], "gene")).toEqual(["ABCA1", "TP53"]);
        expect(avail([], "track")).toEqual(["T1", "T2"]);
    });

    it("narrows other columns to the subset left by active filters", () => {
        expect(avail([filter("gene", ["TP53"])], "track")).toEqual(["T2"]);
        expect(avail([filter("gene", ["ABCA1"])], "dataset")).toEqual(["A", "B"]);
        expect(avail([filter("gene", ["TP53"])], "dataset")).toEqual(["A"]);
        expect(avail([filter("dataset", ["B"])], "gene")).toEqual(["ABCA1"]);
    });

    it("excludes a column's own filter so its selection can be widened", () => {
        expect(avail([filter("gene", ["ABCA1"])], "gene")).toEqual(["ABCA1", "TP53"]);
    });

    it("is independent of the order filters were added", () => {
        const a = filter("gene", ["ABCA1"]);
        const b = filter("dataset", ["A"]);
        expect(avail([a, b], "track")).toEqual(avail([b, a], "track"));
        expect(avail([a, b], "track")).toEqual(["T1"]);
    });

    it("applies the timepoint coverage filter and ignores disabled filters", () => {
        const coverage = { column: TIMEPOINT_COVERAGE_COLUMN, min: 2, enabled: true };
        expect(avail([coverage], "track")).toEqual(["T1"]);
        expect(avail([filter("gene", ["TP53"], false)], "track")).toEqual(["T1", "T2"]);
    });

    it("returns nothing for empty data or an unknown column", () => {
        const empty = {} as DataForPlot;
        expect(
            computeAvailableValues(empty, defs, [], computeTrackInfo(empty, defs), "gene").size
        ).toBe(0);
        expect(avail([], "nope")).toEqual([]);
    });
});

describe("filters reducer", () => {
    const run = (state: typeof initialState, action: object) =>
        reducer(state, action as UnknownAction);

    it("keeps filters when the group-by column changes", () => {
        const withFilter = run(initialState, setFilter(filter("gene", ["ABCA1"])));
        const regrouped = run(withFilter, changeGroupByCategory("track"));
        expect(regrouped.filters).toEqual(withFilter.filters);
    });

    it("replaces by column, toggles, removes and clears without touching others", () => {
        let state = run(initialState, setFilter(filter("gene", ["ABCA1"])));
        state = run(state, setFilter(filter("dataset", ["A"])));
        state = run(state, setFilter(filter("gene", ["TP53"])));
        expect(state.filters.map((f) => f.column).sort()).toEqual(["dataset", "gene"]);
        expect(state.filters.find((f) => f.column === "gene")?.values).toEqual(["TP53"]);

        state = run(state, toggleFilterEnabled("gene"));
        expect(state.filters.find((f) => f.column === "gene")).toMatchObject({
            enabled: false,
            values: ["TP53"],
        });

        state = run(state, removeFilter("dataset"));
        expect(state.filters.map((f) => f.column)).toEqual(["gene"]);
        expect(run(state, clearFilters()).filters).toEqual([]);
    });
});
