const studentService = require("../services/studentService");
const { buildStoredFilename, fileToDataUrl } = require("../utils/fileStorage");
const { validateStudentPayload } = require("../utils/validators");

const TRAINEE_DOCUMENT_LABELS = {
  qualificationCertificate: "Qualification Certificate",
  profilePhoto: "Profile Photo",
  aadharCard: "Aadhar Card",
  panCard: "PAN Card",
  bankPassbook: "Bank Passbook",
};

const parseProfileData = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
};

const serializeUploadedFile = (file, label) => ({
  label,
  originalName: file.originalname,
  fileName: buildStoredFilename(file, file.fieldname || label),
  mimeType: file.mimetype,
  size: file.size,
  url: fileToDataUrl(file),
  uploadedAt: new Date().toISOString(),
});

const attachUploadedDocuments = (body, files = {}) => {
  const profileData = parseProfileData(body.profileData);
  const documents = { ...(profileData.documents || {}) };

  Object.entries(TRAINEE_DOCUMENT_LABELS).forEach(([fieldName, label]) => {
    const [file] = files[fieldName] || [];
    if (file) {
      documents[fieldName] = serializeUploadedFile(file, label);
    }
  });

  body.profileData = JSON.stringify({
    ...profileData,
    documents,
  });

  return body;
};

const listStudents = async (req, res) => {
  const data = await studentService.listStudents();

  res.status(200).json({
    success: true,
    data,
  });
};

const createStudent = async (req, res) => {
  const payload = validateStudentPayload(attachUploadedDocuments(req.body, req.files), { requirePassword: true });
  const data = await studentService.createStudent(payload);

  res.status(201).json({
    success: true,
    message: "Student created successfully",
    data,
  });
};

const updateStudent = async (req, res) => {
  const payload = validateStudentPayload(attachUploadedDocuments(req.body, req.files));
  const data = await studentService.updateStudent(req.params.id, payload);

  res.status(200).json({
    success: true,
    message: "Student updated successfully",
    data,
  });
};

const deleteStudent = async (req, res) => {
  const data = await studentService.deleteStudent(req.params.id);

  res.status(200).json({
    success: true,
    message: "Student deleted successfully",
    data,
  });
};

const getMyProfile = async (req, res) => {
  const data = await studentService.getStudentProfile(req.auth.id);

  res.status(200).json({
    success: true,
    data,
  });
};

module.exports = {
  createStudent,
  deleteStudent,
  getMyProfile,
  listStudents,
  updateStudent,
};
