import { Select } from "antd";
import type { SelectProps } from "antd";
import React from "react";

import { matchesSearch } from "../../util/search";

/** antd `filterOption` that matches the typed text anywhere in an option's label (or value). */
export const searchFilter = (input: string, option?: { label?: unknown; value?: unknown }) =>
    matchesSearch(String(option?.label ?? option?.value ?? ""), input);

/**
 * antd Select with type-to-search by default. Typing only narrows the visible
 * options; selections change only when the user picks one. In multiple mode
 * earlier selections are kept while searching. (No allowClear by default: it would wipe every selection.)
 */
function SearchableSelect(props: SelectProps<any>): React.ReactElement {
    return (
        <Select showSearch filterOption={searchFilter} notFoundContent="No matches" {...props} />
    );
}

export default SearchableSelect;
