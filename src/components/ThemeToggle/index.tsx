import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button } from "antd";
import React from "react";

import { useThemeMode } from "../../hooks";

import styles from "./style.module.css";

/** Dark/white switch for the whole window. Inline in the plot toolbar; `floating` pins it to the corner. */
const ThemeToggle: React.FC<{ floating?: boolean }> = ({ floating }) => {
    const [mode, toggle] = useThemeMode();
    const toLight = mode === "dark";
    return (
        <Button
            className={floating ? styles.floating : undefined}
            size={floating ? "middle" : "small"}
            shape={floating ? "circle" : "default"}
            icon={toLight ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggle}
            title={toLight ? "Switch to white background" : "Switch to dark background"}
            aria-label="Toggle dark and white background"
        />
    );
};

export default ThemeToggle;
