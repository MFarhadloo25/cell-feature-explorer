import { Button, Input } from "antd";
import React, { ReactNode, useState } from "react";

import { usePersistentState } from "../../hooks";
import { matchesSearch } from "../../util/search";

// shortcut: render at most this many search matches, upgrade to a virtual list if lists need more.
const MAX_SEARCH_RESULTS = 200;

interface LimitedListProps<T> {
    /** Unique id; the Show all/Show top state is remembered under it. */
    id: string;
    items: T[];
    /** Size used to rank items; the largest `limit` are shown until expanded. */
    getTotal: (item: T, index: number) => number | undefined;
    /** Category name; when given, the list gets a search box matching against it. */
    getName?: (item: T) => string;
    /** Receives the item's index in the full list, so callers' index-based handlers stay valid. */
    render: (item: T, index: number) => ReactNode;
    limit?: number;
}

/**
 * Shows the top `limit` items (original order kept) with a toggle to show
 * everything, and, for long lists, a search box. Searching only narrows what
 * is displayed; it never changes any selection.
 */
function LimitedList<T>(props: LimitedListProps<T>): React.ReactElement {
    const { id, items, getTotal, getName, render, limit = 10 } = props;
    const [expanded, setExpanded] = usePersistentState(`list-expanded:${id}`, false);
    const [query, setQuery] = useState("");
    const collapsible = items.length > limit;
    const searching = !!getName && query.trim() !== "";

    let visible = items.map((_, i) => i);
    if (searching) {
        visible = visible.filter((i) => matchesSearch(getName(items[i]), query));
    } else if (collapsible && !expanded) {
        const top = new Set(
            visible
                .slice()
                .sort(
                    (a, b) => (getTotal(items[b], b) ?? 0) - (getTotal(items[a], a) ?? 0) || a - b
                )
                .slice(0, limit)
        );
        visible = visible.filter((i) => top.has(i));
    }
    const matchCount = visible.length;
    visible = visible.slice(0, searching ? MAX_SEARCH_RESULTS : undefined);

    return (
        <React.Fragment>
            {getName && (
                <Input
                    size="small"
                    allowClear
                    placeholder="Search categories"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                />
            )}
            {/* above the rows so it stays reachable when the list is long */}
            {collapsible && !searching && (
                <Button type="link" size="small" onClick={() => setExpanded(!expanded)}>
                    {expanded ? `Show top ${limit}` : `Show all ${items.length}`}
                </Button>
            )}
            {searching && matchCount === 0 && <div>No matches</div>}
            {visible.map((i) => render(items[i], i))}
            {searching && matchCount > visible.length && (
                <div>
                    Showing {visible.length} of {matchCount} matches; type more to narrow.
                </div>
            )}
        </React.Fragment>
    );
}

export default LimitedList;
