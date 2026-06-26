const authService = require("../services/authService");
const { validateChangePasswordPayload, validateLoginPayload } = require("../utils/validators");

const adminLogin = async (req, res) => {
  const payload = validateLoginPayload(req.body);
  const result = await authService.loginAdmin(payload);

  res.status(200).json({
    success: true,
    message: "Admin login successful",
    data: result,
  });
};

const studentLogin = async (req, res) => {
  const payload = validateLoginPayload(req.body);
  const result = await authService.loginStudent(payload);

  res.status(200).json({
    success: true,
    message: "Student login successful",
    data: result,
  });
};

const changeAdminPassword = async (req, res) => {
  const payload = validateChangePasswordPayload(req.body);
  const result = await authService.changeAdminPassword(req.auth.id, payload);

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
    data: result,
  });
};

module.exports = {
  adminLogin,
  changeAdminPassword,
  studentLogin,
};
