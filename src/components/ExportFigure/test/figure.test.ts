import { describe, it, expect } from "vitest";

import {
    buildExportFigure,
    DEFAULT_EXPORT_OPTIONS,
    MAX_LEGEND_ENTRIES,
    outputSize,
    validateOptions,
} from "../figure";

const traces: any[] = [
    {
        type: "scattergl",
        x: [1, 2],
        y: [3, 4],
        marker: { size: 6 },
        transforms: [{ type: "groupby" }],
    },
    { type: "scattergl", mode: "lines", x: [1, 2], y: [3, 4] },
];
const build = (options = {}, legendSections: any[] = []) =>
    buildExportFigure({
        traces,
        layout: { annotations: [{}] as any, xaxis: {}, yaxis: {} },
        xTitle: "X",
        yTitle: "Y",
        legendSections,
        options: { ...DEFAULT_EXPORT_OPTIONS, ...options },
    });

describe("export figure", () => {
    it("converts WebGL traces to SVG scatter, scales markers, drops annotations", () => {
        const { data, layout } = build({ pointScale: 2 });
        expect(data.map((t) => t.type)).toEqual(["scatter", "scatter"]);
        expect(data[0].marker.size).toBe(12);
        expect((layout as any).annotations).toBeUndefined();
    });

    it("shows the group legend only for grouped traces and only when requested", () => {
        expect(build().data.map((t) => t.showlegend)).toEqual([true, false]);
        expect(build({ includeLegend: false }).data.map((t) => t.showlegend)).toEqual([
            false,
            false,
        ]);
    });

    it("adds legend entries as dummy traces, capped", () => {
        const entries = Array.from({ length: 100 }, (_, i) => ({ name: `c${i}`, color: "#f00" }));
        const { data } = build({}, [{ title: "Color", entries }]);
        expect(data.length).toBe(2 + MAX_LEGEND_ENTRIES);
        expect(data[2]).toMatchObject({ name: "c0", legendgroup: "Color", showlegend: true });
    });

    it("sets pixel size from inches and dpi, and uses a white or dark theme", () => {
        const white = build({ widthIn: 10, heightIn: 5, dpi: 300 });
        expect(white.scale).toBeCloseTo(300 / 96);
        expect((white.layout as any).width).toBe(960);
        expect((white.layout as any).paper_bgcolor).toBe("#ffffff");
        expect((build({ whiteBackground: false }).layout as any).paper_bgcolor).toBe("#000000");
        expect(outputSize({ widthIn: 10, heightIn: 5, dpi: 300 })).toEqual({
            width: 3000,
            height: 1500,
            megapixels: 4.5,
        });
    });

    it("rejects sizes browsers cannot render as PNG but allows SVG", () => {
        const huge = { ...DEFAULT_EXPORT_OPTIONS, widthIn: 60, dpi: 600 };
        expect(validateOptions(huge)).toMatch(/limited/);
        expect(validateOptions({ ...huge, format: "svg" })).toBeUndefined();
        expect(validateOptions({ ...DEFAULT_EXPORT_OPTIONS, dpi: 0 })).toMatch(/positive/);
        expect(validateOptions(DEFAULT_EXPORT_OPTIONS)).toBeUndefined();
    });
});
