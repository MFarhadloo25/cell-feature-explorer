import { describe, it, expect } from "vitest";

import { rowsToCsv } from "../exportCsv";

describe("rowsToCsv", () => {
    const csvData = [
        { CellId: "a", x: "1", gene: "ABCA1" },
        { CellId: "b", x: "2", gene: "TP53, mutant" },
        { CellId: "c", x: "3", gene: "TP53" },
    ];
    const idToIndex = { a: 0, b: 1, c: 2 };

    it("keeps only the given cells, in the given order, with every original column", () => {
        expect(rowsToCsv(csvData, idToIndex, ["c", "a"]).split("\r\n")).toEqual([
            "CellId,x,gene",
            "c,3,TP53",
            "a,1,ABCA1",
        ]);
    });

    it("quotes values containing commas and skips unknown ids", () => {
        expect(rowsToCsv(csvData, idToIndex, ["b", "zzz"])).toContain('"TP53, mutant"');
        expect(rowsToCsv(csvData, idToIndex, ["zzz"])).toBe("CellId,x,gene");
    });
});
