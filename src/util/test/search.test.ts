import { describe, it, expect } from "vitest";

import { searchFilter } from "../../components/SearchableSelect";
import { matchesSearch } from "../search";

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
