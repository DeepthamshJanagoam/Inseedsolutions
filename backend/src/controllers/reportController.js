const reportService = require("../services/reportService");
const reportExportService = require("../services/reportExportService");

const getAdminReports = async (req, res) => {
  const data = await reportService.getAdminReports(req.query);

  res.status(200).json({
    success: true,
    data,
  });
};

const getAdminReportOptions = async (req, res) => {
  const data = await reportService.getReportOptions();

  res.status(200).json({
    success: true,
    data,
  });
};

const getPublicReports = async (req, res) => {
  const data = await reportService.getAdminReports(req.query);

  res.status(200).json({
    success: true,
    data,
  });
};

const exportAdminReport = async (req, res) => {
  const file = await reportExportService.buildReportExport(req.query);

  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
  res.setHeader("Content-Length", file.buffer.length);
  res.status(200).send(file.buffer);
};

module.exports = {
  exportAdminReport,
  getAdminReportOptions,
  getAdminReports,
  getPublicReports,
};
