import Papa from "papaparse";

/** The original CSV rows (all columns, original order) for the given cell ids, as CSV text. */
export function rowsToCsv(
    csvData: Record<string, string>[],
    idToIndex: Record<string, number>,
    cellIds: string[]
): string {
    const rows = cellIds.map((id) => csvData[idToIndex[id.trim()]]).filter(Boolean);
    const columns = Object.keys(csvData[0] ?? {});
    // Papa writes nothing for zero rows; keep the header so the file is still a valid empty CSV.
    return rows.length ? Papa.unparse(rows, { columns }) : Papa.unparse([columns]);
}

export function downloadText(filename: string, text: string): void {
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
