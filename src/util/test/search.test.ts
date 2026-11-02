import { describe, it, expect } from "vitest";

import { searchFilter } from "../../components/SearchableSelect";
import type { DataForPlot, MeasuredFeatureDef } from "../../state/metadata/types";
import { computeAvailableValues, computeTrackInfo } from "../../state/selection/filters";
import { deselectMatching, matchesSearch, selectMatching } from "../search";

describe("matchesSearch", () => {
    it("is case-insensitive and matches anywhere in the text", () => {
        for (const q of ["abca", "ABCA", "AbCa", "bca", "a1"]) {
            expect(matchesSearch("ABCA1", q)).toBe(true);
        }
        expect(matchesSearch("TP53", "abc")).toBe(false);
    });

    it("treats an empty or blank query as match-all and ignores regex characters", () => {
        expect(matchesSearch("ABCA1", "")).toBe(true);
        expect(matchesSearch("ABCA1", "  ")).toBe(true);
        expect(matchesSearch("ABCA1", ".*")).toBe(false);
    });
});

describe("searchFilter (antd filterOption)", () => {
    it("matches on the option label, falling back to the value", () => {
        expect(searchFilter("abc", { label: "ABCA1", value: "x" })).toBe(true);
        expect(searchFilter("x", { value: "x" })).toBe(true);
        expect(searchFilter("zz", { label: "ABCA1" })).toBe(false);
    });
});

describe("search over cascading options", () => {
    const def = (key: string, names: string[]): MeasuredFeatureDef => ({
        discrete: true,
        key,
        displayName: key,
        description: "",
        tooltip: "",
        options: Object.fromEntries(names.map((name, i) => [String(i), { name, color: "#000" }])),
    });
    const defs = [def("gene", ["ABCA1", "TP53"]), def("well", ["C01", "C02", "D05"])];
    // ABCA1 is in wells C01, D05; TP53 is in C02
    const data: DataForPlot = {
        indices: [0, 1, 2],
        labels: { cellIds: ["a", "b", "c"], thumbnailPaths: [] } as never,
        values: { gene: [0, 0, 1], well: [0, 2, 1] },
    };

    it("searches only among values left by the other filters", () => {
        const filters = [{ column: "gene", values: ["ABCA1"], enabled: true }];
        const available = [
            ...computeAvailableValues(data, defs, filters, computeTrackInfo(data, defs), "well"),
        ];
        expect(available.filter((v) => matchesSearch(v, "c0"))).toEqual(["C01"]);
        expect(available.filter((v) => matchesSearch(v, "d"))).toEqual(["D05"]);
    });
});

describe("select / unselect matching", () => {
    const available = ["ABCA1", "ABCB1", "TP53"];

    it("selects everything on a blank query, keeping existing picks without duplicates", () => {
        expect(selectMatching(["TP53"], available, "")).toEqual(["TP53", "ABCA1", "ABCB1"]);
    });

    it("selects only the matches, then lets a few be unselected", () => {
        const picked = selectMatching([], available, "abc");
        expect(picked).toEqual(["ABCA1", "ABCB1"]);
        expect(deselectMatching(picked, "abcb")).toEqual(["ABCA1"]);
    });

    it("unselects all on a blank query", () => {
        expect(deselectMatching(["ABCA1", "TP53"], "  ")).toEqual([]);
    });
});
