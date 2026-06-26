const institutionService = require("../services/institutionService");
const { validateInstitutionPayload } = require("../utils/validators");

const listInstitutions = async (req, res) => {
  const data = await institutionService.listInstitutions();

  res.status(200).json({
    success: true,
    data,
  });
};

const createInstitution = async (req, res) => {
  const payload = validateInstitutionPayload(req.body);
  const data = await institutionService.createInstitution(payload);

  res.status(201).json({
    success: true,
    message: "Institution created successfully",
    data,
  });
};

const updateInstitution = async (req, res) => {
  const payload = validateInstitutionPayload(req.body);
  const data = await institutionService.updateInstitution(req.params.id, payload);

  res.status(200).json({
    success: true,
    message: "Institution updated successfully",
    data,
  });
};

const deleteInstitution = async (req, res) => {
  const data = await institutionService.deleteInstitution(req.params.id);

  res.status(200).json({
    success: true,
    message: "Institution deleted successfully",
    data,
  });
};

module.exports = {
  createInstitution,
  deleteInstitution,
  listInstitutions,
  updateInstitution,
};
