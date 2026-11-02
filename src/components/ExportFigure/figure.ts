import { omit } from "lodash";
import type { Data, Layout } from "plotly.js";

export interface ExportOptions {
    format: "png" | "svg";
    widthIn: number;
    heightIn: number;
    dpi: number;
    /** Font size in points. */
    fontSize: number;
    /** Multiplier on the on-screen marker size. */
    pointScale: number;
    includeLegend: boolean;
    whiteBackground: boolean;
    title: string;
}

export interface LegendEntry {
    name: string;
    color?: string;
    symbol?: string;
}

export interface LegendSection {
    title: string;
    entries: LegendEntry[];
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
    format: "png",
    widthIn: 12,
    heightIn: 8,
    dpi: 300,
    fontSize: 14,
    pointScale: 1,
    includeLegend: true,
    whiteBackground: true,
    title: "",
};

// shortcut: a legend longer than this is cut to its first entries, upgrade to multi-column legends if posters need more.
export const MAX_LEGEND_ENTRIES = 40;

// Browsers refuse canvases past roughly this size (Chrome: 16384 px per side, ~268 MP).
export const MAX_SIDE_PX = 16384;
export const MAX_MEGAPIXELS = 200;

const isNumber = (v: unknown) => typeof v === "number";
const CSS_DPI = 96;
const PT_TO_PX = CSS_DPI / 72;

export function outputSize(o: Pick<ExportOptions, "widthIn" | "heightIn" | "dpi">) {
    const width = Math.round(o.widthIn * o.dpi);
    const height = Math.round(o.heightIn * o.dpi);
    return { width, height, megapixels: (width * height) / 1e6 };
}

/** Returns a message when the requested output cannot be produced, otherwise undefined. */
export function validateOptions(o: ExportOptions): string | undefined {
    if (!(o.widthIn > 0 && o.heightIn > 0 && o.dpi > 0 && o.fontSize > 0 && o.pointScale > 0)) {
        return "Size, DPI, font size and point size must be positive.";
    }
    const { width, height, megapixels } = outputSize(o);
    if (o.format === "png" && (width > MAX_SIDE_PX || height > MAX_SIDE_PX)) {
        return `PNG sides are limited to ${MAX_SIDE_PX}px (requested ${width} x ${height}). Lower the DPI or size, or export SVG.`;
    }
    if (o.format === "png" && megapixels > MAX_MEGAPIXELS) {
        return `PNG is limited to ${MAX_MEGAPIXELS} megapixels (requested ${megapixels.toFixed(
            0
        )}). Lower the DPI or size, or export SVG.`;
    }
    return undefined;
}

interface BuildArgs {
    traces: Data[];
    layout: Partial<Layout>;
    xTitle: string;
    yTitle: string;
    /** Name of the color-by column, used to title the color bar. */
    colorByTitle: string;
    legendSections: LegendSection[];
    options: ExportOptions;
}

/**
 * Builds an offscreen Plotly figure for export. Layout is in CSS pixels at 96 dpi;
 * `scale` (dpi / 96) multiplies it to the requested pixel size. WebGL traces become
 * SVG scatter traces so the export does not depend on the on-screen canvas.
 */
export function buildExportFigure({
    traces,
    layout,
    xTitle,
    yTitle,
    colorByTitle,
    legendSections,
    options,
}: BuildArgs) {
    const fg = options.whiteBackground ? "#000000" : "#ffffff";
    const bg = options.whiteBackground ? "#ffffff" : "#000000";
    const grid = options.whiteBackground ? "#e5e5e5" : "#333333";
    const fontPx = options.fontSize * PT_TO_PX;

    let hasColorbar = false;
    const data: any[] = traces.map((trace: any) => {
        const out = { ...trace, type: trace.type === "scattergl" ? "scatter" : trace.type };
        if (typeof trace.marker?.size === "number") {
            out.marker = { ...trace.marker, size: trace.marker.size * options.pointScale };
        }
        // Numeric color-by: Plotly maps the values onto its colorscale, so show that scale as a color bar.
        const numeric = Array.isArray(trace.marker?.color) && trace.marker.color.some(isNumber);
        if (options.includeLegend && numeric && !hasColorbar) {
            hasColorbar = true;
            out.marker = {
                ...out.marker,
                showscale: true,
                colorbar: {
                    title: { text: colorByTitle, side: "right", font: { size: fontPx, color: fg } },
                    tickfont: { size: fontPx, color: fg },
                    outlinewidth: 0,
                    thickness: 20,
                    // Above the legend, which sits in the same right-hand margin.
                    x: 1.02,
                    xanchor: "left",
                    y: 1,
                    yanchor: "top",
                    len: 0.4,
                },
            };
        }
        // Group-by traces are split by the groupby transform; their legend entries are the group names.
        out.showlegend = options.includeLegend && !!trace.transforms?.length;
        return out;
    });

    const hasGroupLegend = data.some((t) => t.showlegend);
    if (options.includeLegend) {
        legendSections.forEach((section) => {
            section.entries.slice(0, MAX_LEGEND_ENTRIES).forEach((entry) =>
                data.push({
                    type: "scatter",
                    mode: "markers",
                    x: [null],
                    y: [null],
                    name: entry.name,
                    legendgroup: section.title,
                    legendgrouptitle: { text: section.title, font: { size: fontPx, color: fg } },
                    showlegend: true,
                    hoverinfo: "skip",
                    marker: {
                        color: entry.color ?? "#888888",
                        symbol: entry.symbol ?? "circle",
                        size: 10 * options.pointScale,
                    },
                })
            );
        });
    }

    const axis = (base: any, text: string) => ({
        ...base,
        title: { text, font: { size: fontPx * 1.1, color: fg } },
        color: fg,
        tickcolor: fg,
        linecolor: fg,
        gridcolor: grid,
        zerolinecolor: grid,
        tickfont: { size: fontPx, color: fg },
    });

    const rest: any = omit(layout, ["annotations", "uirevision"]);
    const out: Partial<Layout> = {
        ...rest,
        autosize: false,
        width: Math.round(options.widthIn * CSS_DPI),
        height: Math.round(options.heightIn * CSS_DPI),
        paper_bgcolor: bg,
        plot_bgcolor: bg,
        font: { size: fontPx, color: fg },
        margin: { l: 90, r: 40, t: options.title ? 80 : 30, b: 80 },
        showlegend: options.includeLegend && (hasGroupLegend || legendSections.length > 0),
        legend: {
            ...(hasColorbar ? { x: 1.02, xanchor: "left", y: 0.55, yanchor: "top" } : {}),
            font: { size: fontPx, color: fg },
            bgcolor: "rgba(0,0,0,0)",
            itemsizing: "constant",
        },
        xaxis: axis(rest.xaxis, xTitle),
        yaxis: axis(rest.yaxis, yTitle),
        ...(options.title
            ? { title: { text: options.title, font: { size: fontPx * 1.4, color: fg } } }
            : {}),
    };
    return { data, layout: out, scale: options.dpi / CSS_DPI };
}
