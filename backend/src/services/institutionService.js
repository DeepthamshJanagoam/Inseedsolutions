const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");

const listInstitutions = () =>
  prisma.institution.findMany({
    orderBy: { createdAt: "desc" },
  });

const createInstitution = async (payload) =>
  prisma.institution.create({
    data: payload,
  });

const updateInstitution = async (id, payload) => {
  const existing = await prisma.institution.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Institution not found");
  }

  return prisma.institution.update({
    where: { id },
    data: payload,
  });
};

const deleteInstitution = async (id) => {
  const existing = await prisma.institution.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Institution not found");
  }

  await prisma.institution.delete({ where: { id } });
  return { deleted: true };
};

module.exports = {
  createInstitution,
  deleteInstitution,
  listInstitutions,
  updateInstitution,
};
