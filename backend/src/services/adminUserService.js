const bcrypt = require("bcrypt");

const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");

const sanitizeAdminUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  mustChangePassword: user.mustChangePassword,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const listAdminUsers = async () => {
  const users = await prisma.admin.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  return users.map(sanitizeAdminUser);
};

const createAdminUser = async ({ password, ...payload }) => {
  const existing = await prisma.admin.findUnique({ where: { email: payload.email } });
  if (existing) {
    throw new ApiError(409, "A user with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return sanitizeAdminUser(
    await prisma.admin.create({
      data: {
        ...payload,
        passwordHash,
      },
    })
  );
};

const updateAdminUser = async (id, payload) => {
  const existing = await prisma.admin.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "User not found");
  }

  if (payload.email && payload.email !== existing.email) {
    const duplicate = await prisma.admin.findUnique({ where: { email: payload.email } });
    if (duplicate) {
      throw new ApiError(409, "A user with this email already exists");
    }
  }

  return sanitizeAdminUser(
    await prisma.admin.update({
      where: { id },
      data: payload,
    })
  );
};

const resetAdminUserPassword = async (id, password) => {
  const existing = await prisma.admin.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "User not found");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return sanitizeAdminUser(
    await prisma.admin.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    })
  );
};

module.exports = {
  createAdminUser,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
};
