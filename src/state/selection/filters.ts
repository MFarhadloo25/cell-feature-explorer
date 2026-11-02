import { getCategoryString } from "../util";
import type { DataForPlot, MeasuredFeatureDef } from "../metadata/types";

import type { ColumnFilter } from "./types";

/** Pseudo-column for the "tracks with N timepoints" filter; uses `min` / `max` (exact: min === max). */
export const TIMEPOINT_COVERAGE_COLUMN = "__timepointCoverage";

export interface TrackColumns {
    track?: string;
    timepoint?: string;
    dataset?: string;
}

export interface TrackInfo {
    /** Per row: `dataset||track`, or null if the row has no track. */
    trackKeys: (string | null)[];
    /** Distinct non-null timepoints per track key. */
    timepointCounts: Map<string, number>;
}

/** Row count; the data is empty (no labels) until a dataset has loaded. */
const rowCount = (data: DataForPlot): number => data?.labels?.cellIds?.length ?? 0;

/** Auto-detects track / timepoint / dataset columns by name (shortcut: fixed names, upgrade to a user mapping if datasets differ). */
export function detectTrackColumns(defs: MeasuredFeatureDef[]): TrackColumns {
    const find = (re: RegExp) =>
        defs.find((def) => re.test(def.key) || re.test(def.displayName))?.key;
    return {
        track: find(/track/i),
        timepoint: find(/^(time ?point|time|frame)/i),
        dataset: find(/dataset/i),
    };
}

/** String shown to the user for a cell value; null for missing values. */
export function getCellString(
    def: MeasuredFeatureDef | undefined,
    value: number | null | undefined
): string | null {
    if (value === null || value === undefined) {
        return null;
    }
    if (def?.discrete) {
        const key = value.toString();
        return def.options && !def.options[key] ? null : getCategoryString(def, key) || null;
    }
    return String(value);
}

export function computeTrackInfo(data: DataForPlot, defs: MeasuredFeatureDef[]): TrackInfo {
    const { track, timepoint, dataset } = detectTrackColumns(defs);
    const byKey = (key?: string) => defs.find((def) => def.key === key);
    const n = rowCount(data);
    const trackKeys: (string | null)[] = [];
    const timepointsByTrack = new Map<string, Set<number>>();
    for (let i = 0; i < n; i++) {
        const trackName = track ? getCellString(byKey(track), data.values?.[track]?.[i]) : null;
        if (trackName === null) {
            trackKeys.push(null);
            continue;
        }
        const datasetName = dataset
            ? getCellString(byKey(dataset), data.values?.[dataset]?.[i])
            : "";
        const trackKey = `${datasetName ?? ""}||${trackName}`;
        trackKeys.push(trackKey);
        if (!timepointsByTrack.has(trackKey)) {
            timepointsByTrack.set(trackKey, new Set());
        }
        const t = timepoint ? data.values?.[timepoint]?.[i] : null;
        if (t !== null && t !== undefined) {
            timepointsByTrack.get(trackKey)?.add(t);
        }
    }
    const timepointCounts = new Map<string, number>();
    timepointsByTrack.forEach((set, key) => timepointCounts.set(key, set.size));
    return { trackKeys, timepointCounts };
}

/** A filter is inert if disabled, empty, or on a column the current dataset does not have. */
export function filterIsActive(filter: ColumnFilter, defs: MeasuredFeatureDef[]): boolean {
    if (!filter.enabled) {
        return false;
    }
    if (filter.column === TIMEPOINT_COVERAGE_COLUMN) {
        return filter.min !== undefined || filter.max !== undefined;
    }
    return !!filter.values?.length && defs.some((def) => def.key === filter.column);
}

/**
 * Returns a per-row pass/fail mask: AND across filters, OR within a filter's
 * values. Returns null when no filter is active (all rows pass). Missing
 * values never match a value filter.
 */
export function computeRowMask(
    data: DataForPlot,
    defs: MeasuredFeatureDef[],
    filters: ColumnFilter[],
    trackInfo: TrackInfo
): boolean[] | null {
    const active = filters.filter((filter) => filterIsActive(filter, defs));
    if (!active.length) {
        return null;
    }
    const n = rowCount(data);
    const mask: boolean[] = new Array(n).fill(true);
    for (const filter of active) {
        if (filter.column === TIMEPOINT_COVERAGE_COLUMN) {
            const { min = -Infinity, max = Infinity } = filter;
            for (let i = 0; i < n; i++) {
                const trackKey = trackInfo.trackKeys[i];
                const count =
                    trackKey === null ? undefined : trackInfo.timepointCounts.get(trackKey);
                mask[i] = mask[i] && count !== undefined && count >= min && count <= max;
            }
            continue;
        }
        const def = defs.find((d) => d.key === filter.column);
        const allowed = new Set(filter.values);
        const column = data.values?.[filter.column] ?? [];
        for (let i = 0; i < n; i++) {
            if (!mask[i]) {
                continue;
            }
            const str = getCellString(def, column[i]);
            mask[i] = str !== null && allowed.has(str);
        }
    }
    return mask;
}

/**
 * Distinct values of `column` among rows that pass every active filter
 * except the one on `column` itself, so options cascade from the other
 * filters regardless of the order filters were added in.
 */
export function computeAvailableValues(
    data: DataForPlot,
    defs: MeasuredFeatureDef[],
    filters: ColumnFilter[],
    trackInfo: TrackInfo,
    column: string
): Set<string> {
    const available = new Set<string>();
    const def = defs.find((d) => d.key === column);
    const values = data.values?.[column];
    if (!def || !values) {
        return available;
    }
    const mask = computeRowMask(
        data,
        defs,
        filters.filter((f) => f.column !== column),
        trackInfo
    );
    const n = rowCount(data);
    for (let i = 0; i < n; i++) {
        if (!mask || mask[i]) {
            const str = getCellString(def, values[i]);
            if (str !== null) {
                available.add(str);
            }
        }
    }
    return available;
}

export function summarizeMask(mask: boolean[] | null, trackInfo: TrackInfo, total: number) {
    if (!mask) {
        return { samples: total, tracks: trackInfo.timepointCounts.size };
    }
    const tracks = new Set<string>();
    let samples = 0;
    mask.forEach((pass, i) => {
        if (pass) {
            samples++;
            const trackKey = trackInfo.trackKeys[i];
            if (trackKey !== null) {
                tracks.add(trackKey);
            }
        }
    });
    return { samples, tracks: tracks.size };
}
