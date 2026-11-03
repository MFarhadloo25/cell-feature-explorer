import type { UnknownAction } from "redux";
import { describe, it, expect } from "vitest";

import { mockState } from "../../test/mocks";
import { deselectGroupOfPoints, lassoOrBoxSelectGroup } from "../actions";
import { INITIAL_SELECTION_COLORS } from "../constants";
import reducer, { initialState } from "../reducer";
import { getSelectedGroupsData } from "../selectors";

const run = (state: any, action: unknown) => reducer(state, action as unknown as UnknownAction);
const points = (id: string, pointIndex: number) => [{ cellId: id, pointIndex }];

describe("selection set colors", () => {
    it("gives every selection a color, even past the size of the palette", () => {
        let state: any = initialState;
        for (let i = 0; i < INITIAL_SELECTION_COLORS.length + 5; i++) {
            state = run(state, lassoOrBoxSelectGroup(`k${i}`, points("a", 0)));
        }
        const colors = Object.values(state.selectedGroupColors);
        expect(colors).toHaveLength(INITIAL_SELECTION_COLORS.length + 5);
        expect(colors.every((c) => typeof c === "string")).toBe(true);
    });

    it("reuses the color of a closed selection and never mutates the palette", () => {
        const palette = [...INITIAL_SELECTION_COLORS];
        let state: any = run(initialState, lassoOrBoxSelectGroup("k1", points("a", 0)));
        state = run(state, lassoOrBoxSelectGroup("k2", points("b", 1)));
        const first = state.selectedGroupColors.k1;
        state = run(state, deselectGroupOfPoints("k1"));
        state = run(state, lassoOrBoxSelectGroup("k3", points("c", 2)));
        expect(state.selectedGroupColors.k3).toBe(first);
        expect(INITIAL_SELECTION_COLORS).toEqual(palette);
    });
});

describe("selected set highlight vs removed sets", () => {
    const stateWith = (removedSets: any[]): any => ({
        ...mockState,
        metadata: {
            ...mockState.metadata,
            featureData: {
                indices: [],
                values: { x: [1, 2, 3], y: [4, 5, 6] },
                labels: { cellIds: ["a", "b", "c"] },
            },
        },
        selection: {
            ...mockState.selection,
            plotByOnX: "x",
            plotByOnY: "y",
            selectedGroups: { k: [...points("a", 0), ...points("b", 1)] },
            selectedGroupColors: { k: "#123456" },
            removedSets,
        },
    });

    it("highlights every selected point when nothing is removed", () => {
        expect(getSelectedGroupsData(stateWith([])).x).toEqual([1, 2]);
    });

    it("does not highlight selected points hidden by an active removed set, but does once it is off", () => {
        const set = { id: "r", name: "r", cellIds: ["b"], active: true };
        expect(getSelectedGroupsData(stateWith([set])).x).toEqual([1]);
        expect(getSelectedGroupsData(stateWith([{ ...set, active: false }])).x).toEqual([1, 2]);
    });
});
