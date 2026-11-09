import ExcelJS from "exceljs";

export type ExcelValue = string | number | Date | null;

export type ExcelSheetInput = {
  name: string;
  title: string;
  subtitle: string;
  headers: string[];
  rows: ExcelValue[][];
  widths?: number[];
  currencyColumns?: number[];
  dateColumns?: number[];
  currencyLabels?: string[];
  percentColumns?: number[];
  percentLabels?: string[];
  totalLabels?: string[];
  sectionLabels?: string[];
};

export type ExcelWorkbookInput = {
  filename: string;
  sheets: ExcelSheetInput[];
};

const NAVY = "172B4D";
const BLUE = "4263C7";
const PALE_BLUE = "EAF0FF";
const LIGHT = "F4F7FB";
const BORDER = "DCE4EF";
const MUTED = "64748B";
const GREEN = "E8F5EF";

function safeSheetName(value: string): string {
  return value.replace(/[\\/?*:[\]]/g, " ").slice(0, 31) || "Report";
}

export async function buildExcelWorkbook(input: ExcelWorkbookInput): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "EnterpriseOS";
  workbook.subject = "Financial management report";
  workbook.title = input.filename.replace(/\.xlsx$/i, "");
  workbook.company = "EnterpriseOS";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  for (const definition of input.sheets) {
    const columnCount = Math.max(definition.headers.length, 2);
    const sheet = workbook.addWorksheet(safeSheetName(definition.name), {
      properties: { defaultRowHeight: 19, tabColor: { argb: BLUE } },
      views: [{ state: "frozen", ySplit: 4, xSplit: 1, showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    sheet.columns = definition.headers.map((header, index) => ({
      header,
      key: `column${index + 1}`,
      width: definition.widths?.[index] ?? (index === 0 ? 34 : 20),
    }));

    sheet.mergeCells(1, 1, 1, columnCount);
    const title = sheet.getCell(1, 1);
    title.value = definition.title;
    title.font = { name: "Aptos Display", size: 17, bold: true, color: { argb: "FFFFFFFF" } };
    title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    title.alignment = { vertical: "middle", horizontal: "left" };
    sheet.getRow(1).height = 34;

    sheet.mergeCells(2, 1, 2, columnCount);
    const subtitle = sheet.getCell(2, 1);
    subtitle.value = definition.subtitle;
    subtitle.font = { name: "Aptos", size: 10, italic: true, color: { argb: MUTED } };
    subtitle.alignment = { vertical: "middle" };
    sheet.getRow(2).height = 23;
    sheet.getRow(3).height = 8;

    const headerRow = sheet.getRow(4);
    definition.headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
      cell.alignment = { vertical: "middle", horizontal: index === 0 ? "left" : "right" };
      cell.border = { bottom: { style: "medium", color: { argb: NAVY } } };
    });
    headerRow.height = 25;

    definition.rows.forEach((values, rowIndex) => {
      const row = sheet.getRow(rowIndex + 5);
      values.forEach((value, columnIndex) => {
        const cell = row.getCell(columnIndex + 1);
        cell.value = value;
        cell.font = { name: "Aptos", size: 10, color: { argb: "263449" } };
        cell.alignment = {
          vertical: "middle",
          horizontal: typeof value === "number" ? "right" : "left",
        };
        cell.border = { bottom: { style: "hair", color: { argb: BORDER } } };

        if (value instanceof Date && definition.dateColumns?.includes(columnIndex + 1)) {
          cell.numFmt = "dd-mmm-yyyy";
        }

        if (typeof value === "number") {
          const rowLabel = String(values[0] ?? "");
          if (definition.percentLabels?.includes(rowLabel) || definition.percentColumns?.includes(columnIndex + 1)) {
            cell.numFmt = '0.0%;[Red](0.0%);–';
          } else if ((definition.currencyColumns?.includes(columnIndex + 1) || definition.currencyLabels?.includes(rowLabel))) {
            cell.numFmt = '€#,##0.00;[Red](€#,##0.00);–';
          } else {
            cell.numFmt = '#,##0.00;[Red](#,##0.00);–';
          }
        }
      });

      const label = String(values[0] ?? "");
      if (definition.sectionLabels?.includes(label)) {
        row.height = 22;
        row.eachCell((cell) => {
          cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: NAVY } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PALE_BLUE } };
          cell.border = { top: { style: "thin", color: { argb: BLUE } }, bottom: { style: "thin", color: { argb: BORDER } } };
        });
      } else if (definition.totalLabels?.includes(label)) {
        row.eachCell((cell) => {
          cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: NAVY } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
          cell.border = { top: { style: "thin", color: { argb: "A8D5BD" } }, bottom: { style: "thin", color: { argb: BORDER } } };
        });
      } else if (rowIndex % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
        });
      }
    });

    if (definition.rows.length > 0) {
      sheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + definition.rows.length, column: definition.headers.length },
      };
    }
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { ...cell.alignment, vertical: "middle" };
      });
    });
    sheet.pageSetup.printTitlesRow = "1:4";
    sheet.headerFooter.oddFooter = "&LEnterpriseOS | Illustrative management model&RPAGE &P OF &N";
  }

  return workbook;
}

export async function downloadExcelWorkbook(input: ExcelWorkbookInput): Promise<void> {
  const workbook = await buildExcelWorkbook(input);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = input.filename.endsWith(".xlsx") ? input.filename : `${input.filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
