import { Button, Collapse, Divider, InputNumber, Switch } from "antd";
import React, { ReactElement, useState } from "react";
import { connect } from "react-redux";

import { usePersistentState } from "../../hooks";
import { State } from "../../state";
import { getMeasuredFeaturesDefs } from "../../state/metadata/selectors";
import { MeasuredFeatureDef } from "../../state/metadata/types";
import {
    clearFilters,
    removeFilter,
    setFilter,
    toggleFilterEnabled,
} from "../../state/selection/actions";
import { filterIsActive, TIMEPOINT_COVERAGE_COLUMN } from "../../state/selection/filters";
import {
    getAvailableFilterValues,
    getFilters,
    getFilterSummary,
} from "../../state/selection/selectors";
import { ColumnFilter } from "../../state/selection/types";
import { deselectMatching, matchesSearch, selectMatching } from "../../util/search";

import SearchableSelect from "../SearchableSelect";

import styles from "./style.module.css";

type StateProps = {
    filters: ColumnFilter[];
    defs: MeasuredFeatureDef[];
    summary: { samples: number; tracks: number };
    available: { [column: string]: string[] };
};

type DispatchProps = {
    handleSetFilter: (filter: ColumnFilter) => void;
    handleRemoveFilter: (column: string) => void;
    handleToggleEnabled: (column: string) => void;
    handleClear: () => void;
};

/** Available values first; selected values that no longer match other filters stay visible but flagged. */
const valueOptions = (available: string[] = [], selected: string[] = []) => [
    ...available.map((name) => ({ value: name, label: name })),
    ...selected
        .filter((name) => !available.includes(name))
        .map((name) => ({ value: name, label: `${name} (no match)` })),
];

/** Multi-select with Select all / Clear that act on what the search box currently matches. */
const ValueSelect = (props: {
    values: string[];
    available: string[];
    onChange: (values: string[]) => void;
}): ReactElement => {
    const { values, available, onChange } = props;
    const [search, setSearch] = useState("");
    const matches = available.filter((name) => matchesSearch(name, search)).length;
    // mouseDown is swallowed so clicking the buttons does not blur the select and close the list.
    const keepOpen = (e: React.MouseEvent) => e.preventDefault();
    return (
        <SearchableSelect
            size="small"
            mode="multiple"
            style={{ flex: "1 1 160px", minWidth: 0 }}
            value={values}
            options={valueOptions(available, values)}
            onChange={onChange}
            searchValue={search}
            onSearch={setSearch}
            onBlur={() => setSearch("")}
            autoClearSearchValue={false}
            dropdownRender={(menu) => (
                <>
                    <div style={{ padding: "4px 8px" }} onMouseDown={keepOpen}>
                        <Button
                            size="small"
                            type="link"
                            onClick={() => onChange(selectMatching(values, available, search))}
                        >
                            Select all{search.trim() ? " matching" : ""} ({matches})
                        </Button>
                        <Button
                            size="small"
                            type="link"
                            onClick={() => onChange(deselectMatching(values, search))}
                        >
                            {search.trim() ? "Unselect matching" : "Unselect all"}
                        </Button>
                    </div>
                    <Divider style={{ margin: 0 }} />
                    {menu}
                </>
            )}
        />
    );
};

const describe = (filter: ColumnFilter): string => {
    const { min, max } = filter;
    if (min !== undefined && min === max) {
        return `= ${min}`;
    }
    return [min !== undefined ? `≥ ${min}` : "", max !== undefined ? `≤ ${max}` : ""]
        .filter(Boolean)
        .join(" and ");
};

const ActiveFilters = (props: StateProps & DispatchProps): ReactElement => {
    const {
        filters,
        defs,
        summary,
        available,
        handleSetFilter,
        handleRemoveFilter,
        handleToggleEnabled,
    } = props;
    const [newColumn, setNewColumn] = useState<string | undefined>();
    const [open, setOpen] = usePersistentState("panel-open:active-filters", true);
    const discreteDefs = defs.filter((def) => def.discrete);
    const nothingMatches = filters.some((f) => filterIsActive(f, defs)) && summary.samples === 0;

    const content = (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.summary}>
                    {summary.samples} samples, {summary.tracks} tracks match
                </span>
                <Button size="small" disabled={!filters.length} onClick={props.handleClear}>
                    Clear all
                </Button>
            </div>
            {nothingMatches && (
                <div className={styles.warning}>
                    No samples match the active filters. Disable or remove a filter to continue.
                </div>
            )}
            {filters.map((filter) => {
                const isCoverage = filter.column === TIMEPOINT_COVERAGE_COLUMN;
                const def = defs.find((d) => d.key === filter.column);
                const missing = !isCoverage && !def;
                return (
                    <div className={styles.filterRow} key={filter.column}>
                        <Switch
                            size="small"
                            checked={filter.enabled}
                            onChange={() => handleToggleEnabled(filter.column)}
                        />
                        <span className={styles.filterLabel}>
                            {isCoverage ? "Timepoints/track" : def?.displayName ?? filter.column}
                        </span>
                        {isCoverage ? (
                            <>
                                <InputNumber
                                    size="small"
                                    min={0}
                                    placeholder="min"
                                    value={filter.min}
                                    onChange={(min) =>
                                        handleSetFilter({ ...filter, min: min ?? undefined })
                                    }
                                />
                                <InputNumber
                                    size="small"
                                    min={0}
                                    placeholder="max"
                                    value={filter.max}
                                    onChange={(max) =>
                                        handleSetFilter({ ...filter, max: max ?? undefined })
                                    }
                                />
                                <span>{describe(filter)}</span>
                            </>
                        ) : (
                            <ValueSelect
                                values={filter.values ?? []}
                                available={available[filter.column] ?? []}
                                onChange={(values) => handleSetFilter({ ...filter, values })}
                            />
                        )}
                        {missing && (
                            <span className={styles.warning}>not in this dataset (ignored)</span>
                        )}
                        <Button size="small" onClick={() => handleRemoveFilter(filter.column)}>
                            ✕
                        </Button>
                    </div>
                );
            })}
            <div className={styles.addRow}>
                <SearchableSelect
                    size="small"
                    style={{ flex: "1 1 160px", minWidth: 0 }}
                    placeholder="Filter by column..."
                    value={newColumn}
                    onChange={(column) => {
                        setNewColumn(undefined);
                        const existing = filters.find((f) => f.column === column);
                        if (!existing) {
                            handleSetFilter(
                                column === TIMEPOINT_COVERAGE_COLUMN
                                    ? { column, min: 1, enabled: true }
                                    : { column, values: [], enabled: true }
                            );
                        }
                    }}
                    options={[
                        { value: TIMEPOINT_COVERAGE_COLUMN, label: "Timepoints per track" },
                        ...discreteDefs.map((def) => ({
                            value: def.key,
                            label: def.displayName,
                        })),
                    ]}
                />
            </div>
        </div>
    );

    // Same accordion look as "Plot configuration"; minimized, the header still shows the counts.
    return (
        <Collapse
            activeKey={open ? ["filters"] : []}
            onChange={(keys) => setOpen(keys.length > 0)}
            items={[
                {
                    key: "filters",
                    label: (
                        <span>
                            Active Filters
                            {!open &&
                                ` (${filters.length} filters, ${summary.samples} samples, ${summary.tracks} tracks)`}
                        </span>
                    ),
                    children: content,
                },
            ]}
        />
    );
};

const mapStateToProps = (state: State): StateProps => ({
    filters: getFilters(state),
    defs: getMeasuredFeaturesDefs(state),
    summary: getFilterSummary(state),
    available: getAvailableFilterValues(state),
});

const mapDispatchToProps = {
    handleSetFilter: setFilter,
    handleRemoveFilter: removeFilter,
    handleToggleEnabled: toggleFilterEnabled,
    handleClear: clearFilters,
};

export default connect(mapStateToProps, mapDispatchToProps)(ActiveFilters);
