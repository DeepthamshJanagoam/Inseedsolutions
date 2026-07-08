const partnershipService = require("../services/partnershipService");
const { fileToDataUrl } = require("../utils/fileStorage");
const { validatePartnershipPayload } = require("../utils/validators");

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
    mouUrl: fileToDataUrl(req.file),
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
  const payload = withUploadedDocument(req, validatePartnershipPayload(req.body));
  const data = await partnershipService.createPartnershipAgreement(payload);

  res.status(201).json({
    success: true,
    message: "Partnership agreement created successfully",
    data,
  });
};

const updatePartnership = async (req, res) => {
  const payload = withUploadedDocument(req, validatePartnershipPayload(req.body));
  const data = await partnershipService.updatePartnershipAgreement(req.params.id, payload);

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
