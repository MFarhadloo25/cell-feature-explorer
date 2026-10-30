import { CheckboxChangeEvent } from "antd/lib/checkbox";
import React from "react";

import { PanelData } from "../../containers/ColorByMenu/types";
import { DownloadConfig } from "../../state/selection/types";
import InteractiveRow from "../InteractiveRow";
import LimitedList from "../LimitedList";

interface InteractiveLegendProps {
    showTooltips: boolean;
    closeable: boolean;
    hideable: boolean;
    panelData: PanelData[];
    handleDownload: (key: string) => void;
    downloadUrls: string[];
    downloadConfig: DownloadConfig;
    downloadRoot: string;
    setColor?: (index: number, color: string | undefined) => void;
    onBarClicked?: (clicked: CheckboxChangeEvent) => void;
    handleCloseSelectionSet?: (id: number | string) => void;
    /** Rows shown before "Show all"; omit to always show every row. */
    maxVisible?: number;
    /** Id for remembering this legend's Show all state. */
    legendId?: string;
}

const InteractiveLegend: React.FunctionComponent<InteractiveLegendProps> = (props) => {
    const {
        showTooltips,
        closeable,
        downloadUrls,
        handleCloseSelectionSet,
        handleDownload,
        downloadConfig,
        downloadRoot,
        hideable,
        onBarClicked,
        setColor,
        panelData,
        maxVisible,
        legendId = "legend",
    } = props;
    const limit = maxVisible ?? Infinity;
    return (
        <React.Fragment>
            <LimitedList
                id={legendId}
                items={panelData}
                getTotal={(item) => item.total}
                getName={maxVisible === undefined ? undefined : (item) => item.name}
                limit={limit}
                render={(item, index) => (
                    <InteractiveRow
                        key={item.id}
                        showTooltips={showTooltips}
                        closeable={closeable}
                        checked={item.checked}
                        hideable={hideable}
                        disabled={item.disabled || false}
                        color={item.color as string}
                        setColor={setColor ? (color) => setColor(index, color) : undefined}
                        name={item.name}
                        total={item.total}
                        id={item.id}
                        onBarClicked={onBarClicked}
                        handleClose={handleCloseSelectionSet}
                        handleDownload={handleDownload}
                        downloadUrls={downloadUrls}
                        downloadConfig={downloadConfig}
                        downloadRoot={downloadRoot}
                    />
                )}
            />
        </React.Fragment>
    );
};

export default InteractiveLegend;
