const bcrypt = require("bcrypt");

const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");
const { signToken } = require("../utils/jwt");

const buildAuthResponse = (entity, role) => ({
  token: signToken({
    id: entity.id,
    email: entity.email,
    role,
  }),
  user: {
    id: entity.id,
    name: entity.name || entity.fullName,
    email: entity.email,
    role,
    isActive: entity.isActive ?? true,
    mustChangePassword: entity.mustChangePassword ?? false,
  },
});

const loginAdmin = async ({ email, password }) => {
  const admin = await prisma.admin.findUnique({ where: { email } });

  if (!admin) {
    throw new ApiError(401, "Invalid admin credentials");
  }

  if (!admin.isActive) {
    throw new ApiError(403, "Your account has been deactivated. Please contact an administrator.");
  }

  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid admin credentials");
  }

  return buildAuthResponse(admin, admin.role);
};

const loginStudent = async ({ email, password }) => {
  const student = await prisma.student.findUnique({ where: { email } });

  if (!student) {
    throw new ApiError(401, "Invalid student credentials");
  }

  const passwordMatches = await bcrypt.compare(password, student.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid student credentials");
  }

  return buildAuthResponse(student, "STUDENT");
};

const changeAdminPassword = async (adminId, { currentPassword, newPassword }) => {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });

  if (!admin) {
    throw new ApiError(404, "User not found");
  }

  const passwordMatches = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, "Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  const updated = await prisma.admin.update({
    where: { id: adminId },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });

  return buildAuthResponse(updated, updated.role);
};

module.exports = {
  changeAdminPassword,
  loginAdmin,
  loginStudent,
};
