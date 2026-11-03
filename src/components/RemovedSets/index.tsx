import { Button, Collapse, Switch } from "antd";
import React, { ReactElement } from "react";
import { connect } from "react-redux";

import { usePersistentState } from "../../hooks";
import { State, SelectedGroups } from "../../state";
import {
    addRemovedSet,
    deleteRemovedSet,
    deselectGroupOfPoints,
    toggleRemovedSet,
} from "../../state/selection/actions";
import {
    getExcludedCount,
    getRemovedSets,
    getSelectedGroups,
} from "../../state/selection/selectors";
import { RemovedSet } from "../../state/selection/types";

import styles from "./style.module.css";

type StateProps = { selected: SelectedGroups; removed: RemovedSet[]; hiddenCount: number };

type DispatchProps = {
    handleAdd: (set: Omit<RemovedSet, "active">) => void;
    handleDeselect: (key: string) => void;
    handleToggle: (id: string) => void;
    handleDelete: (id: string) => void;
};

const RemovedSets = (props: StateProps & DispatchProps): ReactElement => {
    const {
        selected,
        removed,
        hiddenCount,
        handleAdd,
        handleDeselect,
        handleToggle,
        handleDelete,
    } = props;
    const [open, setOpen] = usePersistentState("panel-open:removed-sets", false);
    const selectedEntries = Object.entries(selected);

    const content = (
        <div className={styles.container}>
            <div className={styles.hint}>
                Box or lasso select points on the plot, then remove them here. A switched-on set is
                hidden and the axes refit to the remaining points; switch it off to bring the points
                back.
            </div>
            {selectedEntries.map(([key, points], i) => (
                <div className={styles.row} key={key}>
                    <span className={styles.name}>
                        Selected set {i + 1} ({points.length} points)
                    </span>
                    <Button
                        size="small"
                        onClick={() => {
                            handleAdd({
                                id: `removed-${key}`,
                                name: `Removed set ${removed.length + 1}`,
                                cellIds: points.map((p) => p.cellId),
                            });
                            handleDeselect(key);
                        }}
                    >
                        Remove from plot
                    </Button>
                </div>
            ))}
            {removed.map((set) => (
                <div className={styles.row} key={set.id}>
                    <Switch
                        size="small"
                        checked={set.active}
                        onChange={() => handleToggle(set.id)}
                        title="On = hidden from the plot"
                    />
                    <span className={set.active ? styles.name : styles.inactive}>
                        {set.name} ({set.cellIds.length} points)
                    </span>
                    <Button size="small" onClick={() => handleDelete(set.id)}>
                        ✕
                    </Button>
                </div>
            ))}
        </div>
    );

    return (
        <Collapse
            activeKey={open ? ["removed"] : []}
            onChange={(keys) => setOpen(keys.length > 0)}
            items={[
                {
                    key: "removed",
                    label: (
                        <span>
                            Removed sets
                            {hiddenCount > 0 && ` (${hiddenCount} points hidden)`}
                        </span>
                    ),
                    children: content,
                },
            ]}
        />
    );
};

const mapStateToProps = (state: State): StateProps => ({
    selected: getSelectedGroups(state),
    removed: getRemovedSets(state),
    hiddenCount: getExcludedCount(state),
});

const mapDispatchToProps = {
    handleAdd: addRemovedSet,
    handleDeselect: deselectGroupOfPoints,
    handleToggle: toggleRemovedSet,
    handleDelete: deleteRemovedSet,
};

export default connect(mapStateToProps, mapDispatchToProps)(RemovedSets);
