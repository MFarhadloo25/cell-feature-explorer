import { MenuFoldOutlined, MenuUnfoldOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button, Layout } from "antd";
import { uniq } from "lodash";
import * as React from "react";

import ColorByMenu from "../../containers/ColorByMenu";
import MainPlotContainer from "../../containers/MainPlotContainer";

const { Content, Sider } = Layout;

import styles from "./style.module.css";

class PlotTab extends React.Component {
    private static panelKeys = ["groupings", "selections"];
    public state = {
        defaultActiveKey: [PlotTab.panelKeys[0]],
        openKeys: [PlotTab.panelKeys[0]],
        width: window.innerWidth,
        panelHidden: false,
        lightMode: PlotTab.readLightMode(),
    };

    public onSelectionToolUsed = () => {
        this.setState({ openKeys: uniq([...this.state.openKeys, PlotTab.panelKeys[1]]) });
    };

    public onPanelClicked = (value: string[]) => {
        this.setState({ openKeys: value });
    };

    private static readLightMode(): boolean {
        try {
            return sessionStorage.getItem(PlotTab.LIGHT_MODE_KEY) === "true";
        } catch {
            return false;
        }
    }

    private static LIGHT_MODE_KEY = "cfe:plot-light-mode";

    public toggleLightMode = () => {
        const lightMode = !this.state.lightMode;
        this.setState({ lightMode });
        try {
            sessionStorage.setItem(PlotTab.LIGHT_MODE_KEY, String(lightMode));
        } catch {
            // storage can be blocked; the choice then lasts until reload
        }
    };

    public togglePanel = () => {
        this.setState({ panelHidden: !this.state.panelHidden });
    };

    public render() {
        const { openKeys, defaultActiveKey, panelHidden, lightMode } = this.state;
        return (
            <Layout>
                <Sider
                    className={`${styles.colorMenu} ${panelHidden ? styles.hidden : ""}`}
                    width={500}
                    collapsible={false}
                    collapsedWidth={250}
                >
                    <ColorByMenu
                        panelKeys={PlotTab.panelKeys}
                        openKeys={openKeys}
                        defaultActiveKey={defaultActiveKey}
                        onPanelClicked={this.onPanelClicked}
                    />
                </Sider>
                <Content className={`${styles.content} ${lightMode ? styles.light : ""}`}>
                    <div>
                        <MainPlotContainer
                            handleSelectionToolUsed={this.onSelectionToolUsed}
                            lightMode={lightMode}
                            leadingControls={
                                <>
                                    <Button
                                        size="small"
                                        icon={
                                            panelHidden ? (
                                                <MenuUnfoldOutlined />
                                            ) : (
                                                <MenuFoldOutlined />
                                            )
                                        }
                                        onClick={this.togglePanel}
                                    >
                                        {panelHidden ? "Show panel" : "Hide panel"}
                                    </Button>
                                    <Button
                                        size="small"
                                        icon={lightMode ? <MoonOutlined /> : <SunOutlined />}
                                        onClick={this.toggleLightMode}
                                        title={
                                            lightMode
                                                ? "Switch to dark background"
                                                : "Switch to white background"
                                        }
                                        aria-label="Toggle plot background"
                                    />
                                </>
                            }
                        />
                    </div>
                </Content>
            </Layout>
        );
    }
}

export default PlotTab;
