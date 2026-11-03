import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button } from "antd";
import React from "react";

import { useThemeMode } from "../../hooks";

import styles from "./style.module.css";

/** Floating dark/white switch for the whole window; sits on every page, including the landing page. */
const ThemeToggle: React.FC = () => {
    const [mode, toggle] = useThemeMode();
    const toLight = mode === "dark";
    return (
        <Button
            className={styles.toggle}
            shape="circle"
            icon={toLight ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggle}
            title={toLight ? "Switch to white background" : "Switch to dark background"}
            aria-label="Toggle dark and white background"
        />
    );
};

export default ThemeToggle;
