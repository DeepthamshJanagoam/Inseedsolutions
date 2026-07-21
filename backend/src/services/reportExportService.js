const path = require("path");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const reportService = require("./reportService");

const REPORT_TITLES = {
  trainee: "Trainee Details Report",
  placement: "Placement Details Report",
  institution: "Institution Summary Report",
  "skill-placement": "Skill Placement Report",
};

const formatLabel = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());

const formatDate = (value) => {
  if (!value || value === "-") return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatCellValue = (column, row) => {
  const value = row[column.key];

  if (column.format === "currency") return formatCurrency(value);
  if (column.format === "date") return formatDate(value);
  if (column.format === "status") return formatLabel(value);
  return value ?? "-";
};

const sanitizeFilename = (value) =>
  String(value || "INSEED_Report")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 120);

const getReportTitle = (reportType) => REPORT_TITLES[reportType] || "Trainee Details Report";

const buildFilename = (reportType, extension) => {
  const date = new Date().toISOString().slice(0, 10);
  const label = getReportTitle(reportType).replace(/\s+Details/i, "").replace(/\s+Summary/i, "");
  return `${sanitizeFilename(`INSEED_${label}_${date}`)}.${extension}`;
};

const buildActiveFilterText = (query = {}) => {
  const entries = [
    ["Report Type", getReportTitle(query.reportType || "trainee").replace(" Report", "")],
    ["Course", query.course],
    ["Qualification", query.qualification],
    ["Date of Joining", query.dateOfJoining],
    ["Institution", query.institution],
    ["Company", query.company],
    ["Search", query.search],
  ];

  return entries
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join(" | ") || "No filters applied";
};

const collectPdfBuffer = (document) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });

const addPdfFooter = (document) => {
  const range = document.bufferedPageRange();

  for (let index = range.start; index < range.start + range.count; index += 1) {
    document.switchToPage(index);
    document
      .fontSize(8)
      .fillColor("#64748b")
      .text(`Page ${index + 1} of ${range.count}`, document.page.margins.left, document.page.height - 34, {
        align: "center",
        width: document.page.width - document.page.margins.left - document.page.margins.right,
      });
  }
};

const drawPdfHeader = (document, { title, generatedAt, filters, totalRows }) => {
  const logoPath = path.join(__dirname, "..", "..", "..", "frontend", "assets", "branding", "inseed-logo-wide.png");

  try {
    document.image(logoPath, document.page.margins.left, 24, { width: 118 });
  } catch (error) {
    document.fontSize(12).fillColor("#0b2345").text("INSEED Solutions Pvt. Ltd.");
  }

  document
    .fontSize(18)
    .fillColor("#0b2345")
    .text(title, document.page.margins.left, 82)
    .fontSize(9)
    .fillColor("#475569")
    .text(`Generated: ${generatedAt}`, { continued: false })
    .text(`Filters: ${filters}`)
    .text(`Total Records: ${totalRows}`);

  document.moveDown(0.8);
};

const drawPdfTable = (document, { columns, rows }) => {
  const marginLeft = document.page.margins.left;
  const usableWidth = document.page.width - document.page.margins.left - document.page.margins.right;
  const rowPadding = 5;
  const minRowHeight = 24;
  const columnWidth = usableWidth / Math.max(columns.length, 1);

  const drawHeader = () => {
    const y = document.y;
    document.rect(marginLeft, y, usableWidth, minRowHeight).fill("#0b2345");
    columns.forEach((column, index) => {
      document
        .fillColor("#ffffff")
        .fontSize(7)
        .font("Helvetica-Bold")
        .text(column.label, marginLeft + index * columnWidth + rowPadding, y + rowPadding, {
          width: columnWidth - rowPadding * 2,
          height: minRowHeight - rowPadding,
        });
    });
    document.y = y + minRowHeight;
  };

  drawHeader();

  rows.forEach((row, rowIndex) => {
    const values = columns.map((column) => String(formatCellValue(column, row)));
    const rowHeight = Math.max(
      minRowHeight,
      ...values.map((value) =>
        document.heightOfString(value, {
          width: columnWidth - rowPadding * 2,
          align: "left",
        }) + rowPadding * 2
      )
    );

    if (document.y + rowHeight > document.page.height - 52) {
      document.addPage();
      drawHeader();
    }

    const y = document.y;
    document.rect(marginLeft, y, usableWidth, rowHeight).fill(rowIndex % 2 === 0 ? "#ffffff" : "#f8fafc");
    columns.forEach((column, index) => {
      document
        .fillColor("#0f172a")
        .font("Helvetica")
        .fontSize(7)
        .text(String(formatCellValue(column, row)), marginLeft + index * columnWidth + rowPadding, y + rowPadding, {
          width: columnWidth - rowPadding * 2,
          height: rowHeight - rowPadding * 2,
          ellipsis: false,
        });
    });
    document.y = y + rowHeight;
  });
};

const buildPdf = async (report, query) => {
  const document = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 28,
    bufferPages: true,
  });
  const bufferPromise = collectPdfBuffer(document);
  const title = getReportTitle(report.reportType);

  drawPdfHeader(document, {
    title,
    generatedAt: new Date(report.export.generatedAt).toLocaleString("en-IN"),
    filters: buildActiveFilterText(query),
    totalRows: report.table.rows.length,
  });
  drawPdfTable(document, report.table);
  addPdfFooter(document);
  document.end();

  return bufferPromise;
};

const buildWorkbook = async (report, query) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "INSEED Admin";
  workbook.created = new Date(report.export.generatedAt);
  workbook.modified = new Date();

  const sheetName = getReportTitle(report.reportType).replace(/\s+Report$/, "").slice(0, 31);
  const worksheet = workbook.addWorksheet(sheetName || "Report", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = report.table.columns.map((column) => ({
    header: column.label,
    key: column.key,
    width: 14,
    style: { numFmt: "@" },
  }));

  report.table.rows.forEach((row) => {
    worksheet.addRow(
      Object.fromEntries(report.table.columns.map((column) => [column.key, String(formatCellValue(column, row))]))
    );
  });

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, worksheet.rowCount), column: Math.max(1, report.table.columns.length) },
  };

  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B2345" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });

  worksheet.columns.forEach((column) => {
    let maxLength = String(column.header || "").length;
    column.eachCell({ includeEmpty: true }, (cell) => {
      maxLength = Math.max(maxLength, String(cell.value || "").length);
      cell.alignment = { vertical: "top", wrapText: true };
    });
    column.width = Math.min(Math.max(maxLength + 2, 12), 36);
  });

  const metaSheet = workbook.addWorksheet("Report Info");
  metaSheet.addRows([
    ["INSEED Solutions Pvt. Ltd."],
    [getReportTitle(report.reportType)],
    [`Generated: ${new Date(report.export.generatedAt).toLocaleString("en-IN")}`],
    [`Filters: ${buildActiveFilterText(query)}`],
    [`Total Records: ${report.table.rows.length}`],
  ]);
  metaSheet.getColumn(1).width = 90;
  metaSheet.getRow(1).font = { bold: true, size: 14, color: { argb: "FF0B2345" } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

const buildReportExport = async (query = {}) => {
  const format = String(query.format || "").trim().toLowerCase();
  const report = await reportService.getAdminReports(query);

  if (format === "pdf") {
    return {
      buffer: await buildPdf(report, query),
      filename: buildFilename(report.reportType, "pdf"),
      contentType: "application/pdf",
    };
  }

  if (format === "xlsx") {
    return {
      buffer: await buildWorkbook(report, query),
      filename: buildFilename(report.reportType, "xlsx"),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  const error = new Error("Export format must be pdf or xlsx");
  error.statusCode = 400;
  throw error;
};

module.exports = {
  buildReportExport,
};
