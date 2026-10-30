// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, it, expect } from "vitest";

import LimitedList from "../../LimitedList";
import CollapsiblePanel from "..";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const NAMES = Array.from({ length: 15 }, (_, i) => `cat${i}`);

describe("CollapsiblePanel", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        sessionStorage.clear();
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => {
            root.render(
                <CollapsiblePanel id="p" title="Legend" summary="gene: 15 categories">
                    <LimitedList
                        id="p"
                        items={NAMES}
                        getTotal={() => 1}
                        getName={(n) => n}
                        render={(n) => (
                            <div key={n} className="row">
                                {n}
                            </div>
                        )}
                    />
                </CollapsiblePanel>
            );
        });
    });
    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    const click = (label: string) =>
        act(() => {
            [...container.querySelectorAll("button")]
                .find((b) => b.textContent?.includes(label))
                ?.click();
        });
    const rows = () => container.querySelectorAll(".row").length;
    const body = () => container.querySelector(".row")?.parentElement as HTMLElement;

    it("minimizes to title + summary and restores the previous Show more state", () => {
        expect(rows()).toBe(10);
        expect(container.textContent).not.toContain("gene: 15 categories");

        click("Show all 15");
        expect(rows()).toBe(15);

        click("Minimize");
        expect(body().style.display).toBe("none");
        expect(container.textContent).toContain("gene: 15 categories");
        expect(container.textContent).toContain("Expand");

        click("Expand");
        expect(body().style.display).toBe("");
        expect(rows()).toBe(15); // still expanded: the two controls are independent
        expect(container.textContent).not.toContain("gene: 15 categories");
    });

    it("minimizing does not touch the list's own state", () => {
        click("Minimize");
        click("Expand");
        expect(rows()).toBe(10);
        expect(container.textContent).toContain("Show all 15");
    });
});
