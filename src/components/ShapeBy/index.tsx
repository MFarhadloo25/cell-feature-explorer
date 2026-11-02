import { Button, Collapse } from "antd";
import classNames from "classnames";
import React, { ReactElement } from "react";
import { connect } from "react-redux";

import { SHAPE_BY_SELECTOR } from "../../constants";
import { usePersistentState } from "../../hooks";
import { State } from "../../state";
import { getMeasuredFeaturesDefs } from "../../state/metadata/selectors";
import { MeasuredFeatureDef } from "../../state/metadata/types";
import {
    changeAxis,
    resetShapeOverrides,
    setShapeOverride,
    showAllShapeCategories,
    toggleShapeHidden,
} from "../../state/selection/actions";
import { SHAPE_GLYPHS, SHAPES, ShapeLegendRow } from "../../state/selection/shapes";
import { getShapeBy, getShapeLegend } from "../../state/selection/selectors";
import LimitedList from "../LimitedList";
import SearchableSelect from "../SearchableSelect";

import styles from "./style.module.css";

const NONE = "";
const MAX_VISIBLE = 10;

type StateProps = {
    shapeBy: string;
    defs: MeasuredFeatureDef[];
    legend: ShapeLegendRow[];
};

type DispatchProps = {
    handleChangeShapeBy: (column: string) => void;
    handleSetShape: (payload: { column: string; category: string; shape?: string }) => void;
    handleResetShapes: (column: string) => void;
    handleToggleHidden: (payload: { column: string; category: string }) => void;
    handleShowAll: (column: string) => void;
};

const shapeOptions = SHAPES.map((shape) => ({
    value: shape,
    label: `${SHAPE_GLYPHS[shape]} ${shape}`,
}));

const ShapeBy = (props: StateProps & DispatchProps): ReactElement => {
    const {
        shapeBy,
        defs,
        legend,
        handleChangeShapeBy,
        handleSetShape,
        handleResetShapes,
        handleToggleHidden,
        handleShowAll,
    } = props;
    const hiddenCount = legend.filter((row) => !row.visible).length;
    const columnName = defs.find((def) => def.key === shapeBy)?.displayName ?? shapeBy;
    const [open, setOpen] = usePersistentState("panel-open:shape-by", true);
    const summary = legend.length
        ? `${columnName}: ${legend.length} categories${
              hiddenCount ? `, ${hiddenCount} hidden` : ""
          }`
        : "no shape column";

    const content = (
        <div className={styles.container}>
            <div className={styles.row}>
                <span className={styles.label}>Shape by:</span>
                <SearchableSelect
                    className={styles.grow}
                    value={shapeBy}
                    onChange={handleChangeShapeBy}
                    options={[
                        { value: NONE, label: "None (circles)" },
                        ...defs
                            .filter((def) => def.discrete)
                            .map((def) => ({ value: def.key, label: def.displayName })),
                    ]}
                />
            </div>
            {legend.length > 0 && (
                <React.Fragment>
                    <div className={styles.row}>
                        <span className={styles.grow}>Click a category to show or hide it</span>
                        <Button
                            size="small"
                            disabled={!hiddenCount}
                            onClick={() => handleShowAll(shapeBy)}
                        >
                            Show all
                        </Button>
                        <Button
                            size="small"
                            disabled={!legend.some((row) => row.isCustom)}
                            onClick={() => handleResetShapes(shapeBy)}
                        >
                            Reset shapes
                        </Button>
                    </div>
                    {legend.length > SHAPES.length && (
                        <div className={styles.note}>
                            {legend.length} categories but only {SHAPES.length} shapes, so shapes
                            repeat across categories.
                        </div>
                    )}
                    <LimitedList
                        id="shape-legend"
                        items={legend}
                        getTotal={(row) => row.total}
                        getName={(row) => row.name}
                        limit={MAX_VISIBLE}
                        render={(row) => {
                            const toggle = () =>
                                handleToggleHidden({ column: shapeBy, category: row.name });
                            return (
                                <div
                                    key={row.key}
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={row.visible}
                                    className={classNames(
                                        styles.row,
                                        styles.legendRow,
                                        row.visible ? styles.active : styles.inactive
                                    )}
                                    onClick={toggle}
                                    onKeyDown={(e) => {
                                        if (
                                            e.target === e.currentTarget &&
                                            (e.key === "Enter" || e.key === " ")
                                        ) {
                                            e.preventDefault();
                                            toggle();
                                        }
                                    }}
                                >
                                    <span className={styles.glyph}>{SHAPE_GLYPHS[row.shape]}</span>
                                    <span
                                        className={classNames(styles.grow, styles.name)}
                                        title={row.name}
                                    >
                                        {row.name}
                                    </span>
                                    <span className={styles.count}>{row.total}</span>
                                    {/* Stops clicks (also from the portaled dropdown) from toggling the row. */}
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <SearchableSelect
                                            size="small"
                                            value={row.shape}
                                            options={shapeOptions}
                                            style={{ width: 130 }}
                                            onChange={(shape) =>
                                                handleSetShape({
                                                    column: shapeBy,
                                                    category: row.name,
                                                    shape,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            );
                        }}
                    />
                </React.Fragment>
            )}
        </div>
    );

    // Own accordion box, same look as "Plot configuration" and "Active Filters".
    return (
        <Collapse
            activeKey={open ? ["shape"] : []}
            onChange={(keys) => setOpen(keys.length > 0)}
            items={[
                {
                    key: "shape",
                    label: (
                        <span>
                            Shape by
                            {!open && summary && ` (${summary})`}
                        </span>
                    ),
                    children: content,
                },
            ]}
        />
    );
};

const mapStateToProps = (state: State): StateProps => ({
    shapeBy: getShapeBy(state),
    defs: getMeasuredFeaturesDefs(state),
    legend: getShapeLegend(state),
});

const mapDispatchToProps = {
    handleChangeShapeBy: (column: string) => changeAxis(SHAPE_BY_SELECTOR, column),
    handleSetShape: setShapeOverride,
    handleResetShapes: resetShapeOverrides,
    handleToggleHidden: toggleShapeHidden,
    handleShowAll: showAllShapeCategories,
};

export default connect(mapStateToProps, mapDispatchToProps)(ShapeBy);
