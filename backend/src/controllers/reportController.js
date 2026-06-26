const reportService = require("../services/reportService");

const getAdminReports = async (req, res) => {
  const data = await reportService.getAdminReports(req.query);

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

module.exports = {
  getAdminReports,
  getPublicReports,
};
