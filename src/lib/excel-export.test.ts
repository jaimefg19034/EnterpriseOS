import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildExcelWorkbook } from "./excel-export";

describe("Excel workbook export", () => {
  it("builds a formatted workbook with frozen headers and numeric formats", async () => {
    const workbook = await buildExcelWorkbook({
      filename: "enterpriseos-test.xlsx",
      sheets: [{
        name: "Income Statement",
        title: "EnterpriseOS — Income Statement",
        subtitle: "FY 2026 · EUR · Illustrative",
        headers: ["Line item", "Amount (EUR)"],
        widths: [36, 22],
        currencyColumns: [2],
        totalLabels: ["EBITDA"],
        rows: [
          ["Revenue", 125000],
          ["EBITDA", 42000],
        ],
      }],
    });

    const sheet = workbook.getWorksheet("Income Statement");
    expect(sheet).toBeDefined();
    expect(sheet?.getCell("A1").value).toBe("EnterpriseOS — Income Statement");
    expect(sheet?.getCell("B5").numFmt).toContain("€");
    expect(sheet?.getCell("A6").font.bold).toBe(true);
    expect(sheet?.views[0]?.state).toBe("frozen");
  });

  it("serializes to a valid XLSX buffer that can be read back", async () => {
    const workbook = await buildExcelWorkbook({
      filename: "round-trip.xlsx",
      sheets: [{
        name: "Summary",
        title: "Summary",
        subtitle: "FY 2026",
        headers: ["Metric", "Value"],
        rows: [["Revenue", 1000]],
      }],
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(buffer);
    expect(reopened.getWorksheet("Summary")?.getCell("B5").value).toBe(1000);
  });
});
