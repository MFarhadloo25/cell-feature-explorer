import { DownloadOutlined } from "@ant-design/icons";
import { Button, Form, InputNumber, Input, Modal, Select, Switch, message } from "antd";
import type { Data, Layout } from "plotly.js";
import Plotly from "plotly.js/dist/plotly";
import React, { useState } from "react";

import {
    buildExportFigure,
    DEFAULT_EXPORT_OPTIONS,
    ExportOptions,
    LegendSection,
    outputSize,
    validateOptions,
} from "./figure";

interface ExportFigureProps {
    traces: Data[];
    layout: Partial<Layout>;
    xTitle: string;
    yTitle: string;
    legendSections: LegendSection[];
    className?: string;
}

const ExportFigure: React.FC<ExportFigureProps> = (props) => {
    const { traces, layout, xTitle, yTitle, legendSections, className } = props;
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
    const set = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) =>
        setOptions((prev) => ({ ...prev, [key]: value }));

    const problem = validateOptions(options);
    const { width, height, megapixels } = outputSize(options);

    const onExport = async () => {
        setBusy(true);
        try {
            const {
                data,
                layout: exportLayout,
                scale,
            } = buildExportFigure({
                traces,
                layout,
                xTitle,
                yTitle,
                legendSections,
                options,
            });
            await Plotly.downloadImage({ data, layout: exportLayout }, {
                format: options.format,
                width: exportLayout.width as number,
                height: exportLayout.height as number,
                scale,
                filename: "cell-feature-explorer-figure",
                // `scale` is supported by Plotly but missing from the bundled typings.
            } as any);
            setOpen(false);
        } catch (error) {
            message.error(`Export failed: ${(error as Error).message ?? error}`);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Button
                className={className}
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => setOpen(true)}
            >
                Export figure
            </Button>
            <Modal
                title="Export figure"
                open={open}
                onCancel={() => setOpen(false)}
                onOk={onExport}
                okText="Export"
                okButtonProps={{ disabled: !!problem, loading: busy }}
                destroyOnClose
            >
                <Form layout="horizontal" labelCol={{ span: 9 }} size="small">
                    <Form.Item label="Format">
                        <Select
                            value={options.format}
                            onChange={(v) => set("format", v)}
                            options={[
                                { value: "png", label: "PNG (raster)" },
                                { value: "svg", label: "SVG (vector, any size)" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label="Width (in)">
                        <InputNumber
                            min={1}
                            value={options.widthIn}
                            onChange={(v) => set("widthIn", v ?? 0)}
                        />
                    </Form.Item>
                    <Form.Item label="Height (in)">
                        <InputNumber
                            min={1}
                            value={options.heightIn}
                            onChange={(v) => set("heightIn", v ?? 0)}
                        />
                    </Form.Item>
                    <Form.Item label="Resolution (DPI)">
                        <Select
                            value={options.dpi}
                            onChange={(v) => set("dpi", v)}
                            options={[96, 150, 300, 600].map((v) => ({ value: v, label: `${v}` }))}
                        />
                    </Form.Item>
                    <Form.Item label="Font size (pt)">
                        <InputNumber
                            min={4}
                            value={options.fontSize}
                            onChange={(v) => set("fontSize", v ?? 0)}
                        />
                    </Form.Item>
                    <Form.Item label="Point size (x)">
                        <InputNumber
                            min={0.1}
                            step={0.25}
                            value={options.pointScale}
                            onChange={(v) => set("pointScale", v ?? 0)}
                        />
                    </Form.Item>
                    <Form.Item label="Title">
                        <Input
                            value={options.title}
                            onChange={(e) => set("title", e.target.value)}
                            allowClear
                        />
                    </Form.Item>
                    <Form.Item label="Include legend">
                        <Switch
                            checked={options.includeLegend}
                            onChange={(v) => set("includeLegend", v)}
                        />
                    </Form.Item>
                    <Form.Item label="White background">
                        <Switch
                            checked={options.whiteBackground}
                            onChange={(v) => set("whiteBackground", v)}
                        />
                    </Form.Item>
                </Form>
                {problem ? (
                    <div style={{ color: "#ff4d4f" }}>{problem}</div>
                ) : (
                    <div>
                        {options.format === "png"
                            ? `Output: ${width} x ${height} px (${megapixels.toFixed(1)} MP)`
                            : `Vector output, ${options.widthIn} x ${options.heightIn} in`}
                    </div>
                )}
            </Modal>
        </>
    );
};

export default ExportFigure;
