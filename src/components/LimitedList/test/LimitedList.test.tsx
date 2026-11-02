// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, it, expect } from "vitest";

import LimitedList from "..";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const NAMES = ["ABCA1", "abcb2", "TP53", ...Array.from({ length: 12 }, (_, i) => `gene${i}`)];

describe("LimitedList search", () => {
    let container: HTMLDivElement;
    let root: Root;
    let rendered: number[];

    beforeEach(() => {
        sessionStorage.clear();
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
        rendered = [];
        act(() => {
            root.render(
                <LimitedList
                    id="t"
                    items={NAMES}
                    getTotal={(_, i) => NAMES.length - i}
                    getName={(name) => name}
                    render={(name, i) => {
                        rendered.push(i);
                        return (
                            <div key={name} className="row">
                                {name}
                            </div>
                        );
                    }}
                />
            );
        });
    });
    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    const rows = () => [...container.querySelectorAll(".row")].map((el) => el.textContent);
    const type = (text: string) => {
        const input = container.querySelector("input") as HTMLInputElement;
        act(() => {
            const setter = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value"
            )?.set;
            setter?.call(input, text);
            input.dispatchEvent(new Event("input", { bubbles: true }));
        });
    };

    it("shows the top 10 by default and the full list once searched", () => {
        expect(rows()).toHaveLength(10);
        expect(container.textContent).toContain("Show all 15");
    });

    it("matches case-insensitively on partial text, keeping original indices", () => {
        type("AbC");
        expect(rows()).toEqual(["ABCA1", "abcb2"]);
        type("53");
        expect(rows()).toEqual(["TP53"]);
        expect(rendered[rendered.length - 1]).toBe(2); // index into the full list, so index-based handlers stay valid
    });

    it("shows a no-match message and restores the list when cleared", () => {
        type("zzz");
        expect(rows()).toEqual([]);
        expect(container.textContent).toContain("No matches");
        type("");
        expect(rows()).toHaveLength(10);
    });

    it("remembers Show all across a remount", () => {
        const click = (label: string) =>
            act(() => {
                [...container.querySelectorAll("button")]
                    .find((b) => b.textContent?.includes(label))
                    ?.click();
            });
        click("Show all 15");
        expect(rows()).toHaveLength(15);
        act(() => root.unmount());
        root = createRoot(container);
        act(() => {
            root.render(
                <LimitedList
                    id="t"
                    items={NAMES}
                    getTotal={(_, i) => NAMES.length - i}
                    getName={(name) => name}
                    render={(name) => (
                        <div key={name} className="row">
                            {name}
                        </div>
                    )}
                />
            );
        });
        expect(rows()).toHaveLength(15);
        expect(container.textContent).toContain("Show top 10");
    });
});
