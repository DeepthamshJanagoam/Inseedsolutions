const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");

const formatStatus = (status) =>
  status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");

const formatPlacementRow = (placement, index) => ({
  id: index + 1,
  placementId: placement.id,
  student: placement.student.fullName,
  institution: placement.institution.name,
  company: placement.companyName,
  package: placement.package,
  course: placement.student.course,
  status: formatStatus(placement.status),
  contact: placement.student.email,
  role: placement.role,
  placementDate: placement.placementDate,
});

const getPublicPlacements = async () => {
  const placements = await prisma.placement.findMany({
    include: {
      student: true,
      institution: true,
    },
    orderBy: {
      placementDate: "asc",
    },
  });

  return placements.map(formatPlacementRow);
};

const listPlacements = async () =>
  prisma.placement.findMany({
    include: {
      student: true,
      institution: true,
    },
    orderBy: {
      placementDate: "desc",
    },
  });

const createPlacement = async (payload) =>
  prisma.placement.create({
    data: payload,
    include: {
      student: true,
      institution: true,
    },
  });

const updatePlacement = async (id, payload) => {
  const existing = await prisma.placement.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Placement record not found");
  }

  return prisma.placement.update({
    where: { id },
    data: payload,
    include: {
      student: true,
      institution: true,
    },
  });
};

const deletePlacement = async (id) => {
  const existing = await prisma.placement.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Placement record not found");
  }

  await prisma.placement.delete({ where: { id } });
  return { deleted: true };
};

const getPlacementsForStudent = async (studentId) => {
  const placements = await prisma.placement.findMany({
    where: { studentId },
    include: {
      institution: true,
    },
    orderBy: {
      placementDate: "desc",
    },
  });

  return placements;
};

module.exports = {
  createPlacement,
  deletePlacement,
  getPlacementsForStudent,
  getPublicPlacements,
  listPlacements,
  updatePlacement,
};
