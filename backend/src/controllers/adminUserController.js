const adminUserService = require("../services/adminUserService");
const {
  validateAdminUserPayload,
  validateResetPasswordPayload,
} = require("../utils/validators");

const listAdminUsers = async (req, res) => {
  const data = await adminUserService.listAdminUsers();

  res.status(200).json({
    success: true,
    data,
  });
};

const createAdminUser = async (req, res) => {
  const payload = validateAdminUserPayload(req.body, { requirePassword: true });
  const data = await adminUserService.createAdminUser(payload);

  res.status(201).json({
    success: true,
    message: "User created successfully",
    data,
  });
};

const updateAdminUser = async (req, res) => {
  const payload = validateAdminUserPayload(req.body, { requirePassword: false });
  delete payload.password;
  const data = await adminUserService.updateAdminUser(req.params.id, payload);

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data,
  });
};

const resetAdminUserPassword = async (req, res) => {
  const { password } = validateResetPasswordPayload(req.body);
  const data = await adminUserService.resetAdminUserPassword(req.params.id, password);

  res.status(200).json({
    success: true,
    message: "Password reset successfully",
    data,
  });
};

module.exports = {
  createAdminUser,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
};
