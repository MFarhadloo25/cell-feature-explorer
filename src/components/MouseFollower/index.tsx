import React from "react";
import { createPortal } from "react-dom";

interface MouseFollowerProps {
    pageX: number;
    pageY: number;
    ref: React.RefObject<HTMLDivElement>;
}
const MouseFollower = React.forwardRef<HTMLDivElement, React.PropsWithChildren<MouseFollowerProps>>(
    (props, ref) => {
        // Rendered in <body>: pageX/pageY are document coordinates, so an absolutely positioned
        // ancestor (the plot area is one) would otherwise shift the thumbnail.
        return createPortal(
            <div
                ref={ref}
                style={{
                    left: `${props.pageX + 10}px`,
                    top: `${props.pageY}px`,
                    position: "absolute",
                }}
            >
                {props.children}
            </div>,
            document.body
        );
    }
);
MouseFollower.displayName = "MouseFollower";

export default MouseFollower;
