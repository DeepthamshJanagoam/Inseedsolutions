const fs = require("fs/promises");
const path = require("path");

const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");

const uploadsRoot = path.join(__dirname, "..", "..", "uploads");

const removeUploadedDocument = async (filePath) => {
  if (!filePath || !filePath.startsWith("/uploads/")) return;

  const absolutePath = path.join(uploadsRoot, filePath.replace(/^\/uploads[\\/]/, ""));

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

const normalizeAgreement = (agreement) => ({
  ...agreement,
  tags: Array.isArray(agreement.tags) ? agreement.tags : [],
  bullets: Array.isArray(agreement.bullets) ? agreement.bullets : [],
});

const listPartnershipAgreements = async ({ activeOnly = false } = {}) => {
  const agreements = await prisma.partnershipAgreement.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return agreements.map(normalizeAgreement);
};

const createPartnershipAgreement = async (payload) =>
  normalizeAgreement(
    await prisma.partnershipAgreement.create({
      data: payload,
    })
  );

const updatePartnershipAgreement = async (id, payload) => {
  const existing = await prisma.partnershipAgreement.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Partnership agreement not found");
  }

  if (payload.mouUrl && payload.mouUrl !== existing.mouUrl) {
    await removeUploadedDocument(existing.mouUrl);
  }

  return normalizeAgreement(
    await prisma.partnershipAgreement.update({
      where: { id },
      data: payload,
    })
  );
};

const deletePartnershipAgreement = async (id) => {
  const existing = await prisma.partnershipAgreement.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Partnership agreement not found");
  }

  await prisma.partnershipAgreement.delete({ where: { id } });
  await removeUploadedDocument(existing.mouUrl);
  return { deleted: true };
};

module.exports = {
  createPartnershipAgreement,
  deletePartnershipAgreement,
  listPartnershipAgreements,
  updatePartnershipAgreement,
};
