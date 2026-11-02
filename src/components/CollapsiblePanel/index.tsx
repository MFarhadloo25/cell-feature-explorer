import { Button } from "antd";
import React, { ReactNode } from "react";

import { usePersistentState } from "../../hooks";

import styles from "./style.module.css";

interface CollapsiblePanelProps {
    /** Unique id; the minimized state is remembered under it. */
    id: string;
    title: string;
    /** Shown next to the title while minimized. */
    summary?: string;
    children: ReactNode;
}

/**
 * Title bar with a Minimize/Expand toggle. Children stay mounted while
 * minimized (only hidden), so their own state (Show more, search text) is kept.
 */
export default function CollapsiblePanel(props: CollapsiblePanelProps): React.ReactElement {
    const { id, title, summary, children } = props;
    const [minimized, setMinimized] = usePersistentState(`panel-minimized:${id}`, false);
    return (
        <div>
            <div className={styles.header}>
                <span>{title}</span>
                {minimized && summary ? (
                    <span className={styles.summary}>{summary}</span>
                ) : (
                    <span className={styles.spacer} />
                )}
                <Button
                    type="link"
                    size="small"
                    aria-expanded={!minimized}
                    onClick={() => setMinimized(!minimized)}
                >
                    {minimized ? "Expand" : "Minimize"}
                </Button>
            </div>
            <div style={{ display: minimized ? "none" : undefined }}>{children}</div>
        </div>
    );
}
