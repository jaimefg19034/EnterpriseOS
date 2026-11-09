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

  it("exports a separate payment movement sheet with dated and undated records", async () => {
    const workbook = await buildExcelWorkbook({
      filename: "payment-ledger.xlsx",
      sheets: [
        { name: "Invoices", title: "Invoices", subtitle: "Open balances", headers: ["Invoice", "Paid"], rows: [["INV-1", 250]] },
        { name: "Payment movements", title: "Payment movements", subtitle: "User-entered records", headers: ["Date", "Type", "Amount"], currencyColumns: [3], rows: [
          ["2026-11-08", "Payment", 150],
          ["—", "Historical paid balance (undated)", 100],
        ] },
      ],
    });
    const sheet = workbook.getWorksheet("Payment movements");
    expect(sheet?.getCell("A5").value).toBe("2026-11-08");
    expect(sheet?.getCell("C5").value).toBe(150);
    expect(sheet?.getCell("B6").value).toBe("Historical paid balance (undated)");
    expect(sheet?.getCell("C6").numFmt).toContain("€");
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
