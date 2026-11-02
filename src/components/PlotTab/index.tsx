import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
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
    };

    public onSelectionToolUsed = () => {
        this.setState({ openKeys: uniq([...this.state.openKeys, PlotTab.panelKeys[1]]) });
    };

    public onPanelClicked = (value: string[]) => {
        this.setState({ openKeys: value });
    };

    public togglePanel = () => {
        // Plotly only resizes on window resize, so nudge it once the layout has changed.
        this.setState({ panelHidden: !this.state.panelHidden }, () =>
            window.dispatchEvent(new Event("resize"))
        );
    };

    public render() {
        const { openKeys, defaultActiveKey, panelHidden } = this.state;
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
                <Content className={styles.content}>
                    <Button
                        className={styles.panelToggle}
                        size="small"
                        icon={panelHidden ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={this.togglePanel}
                    >
                        {panelHidden ? "Show panel" : "Hide panel"}
                    </Button>
                    <div>
                        <MainPlotContainer handleSelectionToolUsed={this.onSelectionToolUsed} />
                    </div>
                </Content>
            </Layout>
        );
    }
}

export default PlotTab;
