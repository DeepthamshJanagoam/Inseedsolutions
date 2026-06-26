const ApiError = require("./apiError");

const ALLOWED_INSTITUTION_TYPES = ["COLLEGE", "UNIVERSITY", "FOUNDATION", "TRAINING_CENTER"];
const ALLOWED_PLACEMENT_STATUSES = ["PLACED", "INTERVIEWING", "OFFER_PENDING", "REJECTED"];
const ALLOWED_ADMIN_ROLES = ["ADMIN", "TRAINEE_OPERATOR", "PLACEMENT_OPERATOR"];

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
const isUrl = (value) => /^https?:\/\/.+/i.test(String(value || "").trim());
const isLocalUploadPdfPath = (value) => /^\/uploads\/[\w./-]+\.pdf(?:[?#].*)?$/i.test(String(value || "").trim());

const requiredString = (value, field, min = 1) => {
  const normalized = String(value || "").trim();
  if (normalized.length < min) {
    throw new ApiError(400, `${field} is required`);
  }
  return normalized;
};

const optionalString = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const optionalJson = (value, field) => {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new ApiError(400, `${field} must be valid JSON`);
    }
  }

  throw new ApiError(400, `${field} must be a JSON object`);
};

const validateLoginPayload = (body) => {
  const email = requiredString(body.email, "Email").toLowerCase();
  const password = requiredString(body.password, "Password", 6);

  if (!isEmail(email)) {
    throw new ApiError(400, "A valid email address is required");
  }

  return { email, password };
};

const validateChangePasswordPayload = (body) => {
  const currentPassword = requiredString(body.currentPassword, "Current password", 8);
  const newPassword = requiredString(body.newPassword, "New password", 8);

  if (currentPassword === newPassword) {
    throw new ApiError(400, "New password must be different from the current password");
  }

  return { currentPassword, newPassword };
};

const validateContactPayload = (body) => {
  const name = requiredString(body.name, "Name", 2);
  const email = requiredString(body.email, "Email").toLowerCase();
  const phone = requiredString(body.phone, "Phone number", 7);
  const inquiryType = requiredString(body.inquiryType, "Inquiry type", 2);
  const message = requiredString(body.message, "Message", 10);

  if (!isEmail(email)) {
    throw new ApiError(400, "A valid email address is required");
  }

  return { name, email, phone, inquiryType, message };
};

const validateInstitutionPayload = (body) => {
  const name = requiredString(body.name, "Institution name", 2);
  const location = requiredString(body.location, "Location", 2);
  const type = requiredString(body.type, "Institution type").toUpperCase();
  const website = optionalString(body.website);

  if (website && !isUrl(website)) {
    throw new ApiError(400, "Website must be a valid URL starting with http:// or https://");
  }

  if (!ALLOWED_INSTITUTION_TYPES.includes(type)) {
    throw new ApiError(400, `Institution type must be one of: ${ALLOWED_INSTITUTION_TYPES.join(", ")}`);
  }

  return { name, location, type, website };
};

const validateStudentPayload = (body, { requirePassword = false } = {}) => {
  const profileData = optionalJson(body.profileData, "Profile data");
  const basicInfo = profileData?.basicInfo || {};
  const educationInfo = profileData?.education || {};

  const fullName = requiredString(body.fullName || basicInfo.fullName, "Full name", 2);
  const email = requiredString(body.email || basicInfo.email, "Email").toLowerCase();
  const phone = optionalString(body.phone || basicInfo.mobileNumber);
  const course = requiredString(body.course || educationInfo.course, "Course", 2);
  const candidateCode = optionalString(body.candidateCode || basicInfo.candidateId);
  const password = body.password ? requiredString(body.password, "Password", 8) : null;

  if (!isEmail(email)) {
    throw new ApiError(400, "A valid email address is required");
  }

  if (requirePassword && !password) {
    throw new ApiError(400, "Password is required");
  }

  return { candidateCode, fullName, email, phone, course, profileData, password };
};

const validatePlacementPayload = (body) => {
  const details = optionalJson(body.details, "Placement details") || {};
  const studentId = requiredString(body.studentId, "Student ID");
  const institutionId = requiredString(body.institutionId, "Institution ID");
  const skillDepartment = requiredString(body.skillDepartment || details?.placement?.skillDepartment, "Skill department", 2);
  const companyName = requiredString(body.companyName, "Company name", 2);
  const role = requiredString(body.role, "Role", 2);
  const packageValue = Number(body.package);
  const placementDate = new Date(body.placementDate);
  const status = requiredString(body.status, "Status").toUpperCase();

  if (!Number.isFinite(packageValue) || packageValue <= 0) {
    throw new ApiError(400, "Package must be a positive number");
  }

  if (Number.isNaN(placementDate.getTime())) {
    throw new ApiError(400, "Placement date must be a valid date");
  }

  if (!ALLOWED_PLACEMENT_STATUSES.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${ALLOWED_PLACEMENT_STATUSES.join(", ")}`);
  }

  const salaryTrackingSource = Array.isArray(body.salaryTracking)
    ? body.salaryTracking
    : Array.isArray(details.salaryTracking)
    ? details.salaryTracking
    : [];
  const salaryTracking =
    String(skillDepartment).trim().toLowerCase() === "yes"
      ? salaryTrackingSource.map((row, index) => {
          const month = requiredString(row?.month, `Salary month ${index + 1}`);
          const salary = Number(row?.salary);

          if (!Number.isFinite(salary) || salary <= 0) {
            throw new ApiError(400, `Salary for month ${index + 1} must be a positive number`);
          }

          return {
            slNo: index + 1,
            month,
            salary: Math.round(salary),
          };
        })
      : [];

  if (String(skillDepartment).trim().toLowerCase() === "yes" && salaryTracking.length !== 6) {
    throw new ApiError(400, "Skill department placements require all 6 salary tracking entries");
  }

  const normalizedDetails = {
    ...details,
    placement: {
      ...(details.placement || {}),
      skillDepartment,
    },
    salaryTracking,
  };

  return {
    studentId,
    institutionId,
    companyName,
    role,
    package: Math.round(packageValue),
    placementDate,
    status,
    details: normalizedDetails,
  };
};

const normalizeStringArray = (value, field, minItems = 1) => {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

  if (source.length < minItems) {
    throw new ApiError(400, `${field} is required`);
  }

  return source.map((item) => requiredString(item, field, 2));
};

const validatePartnershipPayload = (body) => {
  const name = requiredString(body.name, "Institution name", 2);
  const shortCode = requiredString(body.shortCode, "Short code", 2).toUpperCase().slice(0, 4);
  const tags = normalizeStringArray(body.tags, "Tags", 1);
  const bullets = normalizeStringArray(body.bullets, "Highlights", 1);
  const mouLabel = optionalString(body.mouLabel) || "View MOU";
  const mouUrl = optionalString(body.mouUrl);
  const summary = optionalString(body.summary);
  const sortOrder = Number(body.sortOrder ?? 0);
  const isActive =
    typeof body.isActive === "boolean"
      ? body.isActive
      : String(body.isActive ?? "true").toLowerCase() !== "false";

  if (mouUrl && !isUrl(mouUrl) && !isLocalUploadPdfPath(mouUrl)) {
    throw new ApiError(400, "MOU URL must be a valid absolute URL or local uploaded PDF path");
  }

  if (!Number.isFinite(sortOrder)) {
    throw new ApiError(400, "Sort order must be a valid number");
  }

  return {
    name,
    shortCode,
    tags,
    bullets,
    mouLabel,
    mouUrl,
    summary,
    sortOrder: Math.round(sortOrder),
    isActive,
  };
};

const validateAdminUserPayload = (body, { requirePassword = true } = {}) => {
  const name = requiredString(body.name, "Name", 2);
  const email = requiredString(body.email, "Email").toLowerCase();
  const role = requiredString(body.role, "Role").toUpperCase();
  const password = body.password ? requiredString(body.password, "Temporary password", 8) : null;
  const isActive =
    body.isActive === undefined
      ? true
      : typeof body.isActive === "boolean"
      ? body.isActive
      : String(body.isActive).toLowerCase() !== "false";
  const mustChangePassword =
    body.mustChangePassword === undefined
      ? true
      : typeof body.mustChangePassword === "boolean"
      ? body.mustChangePassword
      : String(body.mustChangePassword).toLowerCase() !== "false";

  if (!isEmail(email)) {
    throw new ApiError(400, "A valid email address is required");
  }

  if (!ALLOWED_ADMIN_ROLES.includes(role)) {
    throw new ApiError(400, `Role must be one of: ${ALLOWED_ADMIN_ROLES.join(", ")}`);
  }

  if (requirePassword && !password) {
    throw new ApiError(400, "Temporary password is required");
  }

  return { name, email, role, password, isActive, mustChangePassword };
};

const validateResetPasswordPayload = (body) => {
  const password = requiredString(body.password, "Temporary password", 8);
  return { password };
};

module.exports = {
  validateAdminUserPayload,
  validateChangePasswordPayload,
  validateContactPayload,
  validateInstitutionPayload,
  validateLoginPayload,
  validatePartnershipPayload,
  validatePlacementPayload,
  validateResetPasswordPayload,
  validateStudentPayload,
};
