const placementService = require("../services/placementService");
const { validatePlacementPayload } = require("../utils/validators");

const getPublicPlacements = async (req, res) => {
  const data = await placementService.getPublicPlacements();

  res.status(200).json(data);
};

const listPlacements = async (req, res) => {
  const data = await placementService.listPlacements();

  res.status(200).json({
    success: true,
    data,
  });
};

const createPlacement = async (req, res) => {
  const payload = validatePlacementPayload(req.body);
  const data = await placementService.createPlacement(payload);

  res.status(201).json({
    success: true,
    message: "Placement record created successfully",
    data,
  });
};

const updatePlacement = async (req, res) => {
  const payload = validatePlacementPayload(req.body);
  const data = await placementService.updatePlacement(req.params.id, payload);

  res.status(200).json({
    success: true,
    message: "Placement record updated successfully",
    data,
  });
};

const deletePlacement = async (req, res) => {
  const data = await placementService.deletePlacement(req.params.id);

  res.status(200).json({
    success: true,
    message: "Placement record deleted successfully",
    data,
  });
};

const getMyPlacements = async (req, res) => {
  const data = await placementService.getPlacementsForStudent(req.auth.id);

  res.status(200).json({
    success: true,
    data,
  });
};

module.exports = {
  createPlacement,
  deletePlacement,
  getMyPlacements,
  getPublicPlacements,
  listPlacements,
  updatePlacement,
};
