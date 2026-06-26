const fs = require("fs/promises");

const partnershipService = require("../services/partnershipService");
const { validatePartnershipPayload } = require("../utils/validators");

const removeRequestFile = async (req) => {
  if (!req.file?.path) return;

  try {
    await fs.unlink(req.file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(error);
    }
  }
};

const withUploadedDocument = (req, payload) => {
  if (!req.file) {
    const normalizedBody = req.body || {};
    if (!Object.prototype.hasOwnProperty.call(normalizedBody, "mouUrl")) {
      const { mouUrl, ...payloadWithoutMouUrl } = payload;
      return payloadWithoutMouUrl;
    }

    return payload;
  }

  return {
    ...payload,
    mouUrl: `/uploads/mous/${req.file.filename}`,
  };
};

const listPublicPartnerships = async (req, res) => {
  const data = await partnershipService.listPartnershipAgreements({ activeOnly: true });

  res.status(200).json({
    success: true,
    data,
  });
};

const listAdminPartnerships = async (req, res) => {
  const data = await partnershipService.listPartnershipAgreements();

  res.status(200).json({
    success: true,
    data,
  });
};

const createPartnership = async (req, res) => {
  let data;

  try {
    const payload = withUploadedDocument(req, validatePartnershipPayload(req.body));
    data = await partnershipService.createPartnershipAgreement(payload);
  } catch (error) {
    await removeRequestFile(req);
    throw error;
  }

  res.status(201).json({
    success: true,
    message: "Partnership agreement created successfully",
    data,
  });
};

const updatePartnership = async (req, res) => {
  let data;

  try {
    const payload = withUploadedDocument(req, validatePartnershipPayload(req.body));
    data = await partnershipService.updatePartnershipAgreement(req.params.id, payload);
  } catch (error) {
    await removeRequestFile(req);
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "Partnership agreement updated successfully",
    data,
  });
};

const deletePartnership = async (req, res) => {
  const data = await partnershipService.deletePartnershipAgreement(req.params.id);

  res.status(200).json({
    success: true,
    message: "Partnership agreement deleted successfully",
    data,
  });
};

module.exports = {
  createPartnership,
  deletePartnership,
  listAdminPartnerships,
  listPublicPartnerships,
  updatePartnership,
};
