/** Marker symbols supported by Plotly's WebGL scatter, in default assignment order. */
export const SHAPES = [
    "circle",
    "square",
    "triangle-up",
    "diamond",
    "cross",
    "x",
    "triangle-down",
    "pentagon",
    "hexagon",
    "star",
] as const;

export const DEFAULT_SHAPE = SHAPES[0];

export const SHAPE_GLYPHS: { [shape: string]: string } = {
    circle: "●",
    square: "■",
    "triangle-up": "▲",
    diamond: "◆",
    cross: "✚",
    x: "✖",
    "triangle-down": "▼",
    pentagon: "⬟",
    hexagon: "⬢",
    star: "★",
};

/** Default shape for the category at `position` in its column's option order; reused once shapes run out. */
export const defaultShapeAt = (position: number): string => SHAPES[position % SHAPES.length];

export interface ShapeLegendRow {
    /** Option key in the column's definition (value stored per cell). */
    key: string;
    name: string;
    shape: string;
    isCustom: boolean;
    /** False when hidden from the plot through the legend. */
    visible: boolean;
    total: number;
}
