const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), override: true });

const bcrypt = require("bcrypt");
const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.TRAINEE_IMPORT_DEFAULT_PASSWORD || "ChangeMe@12345";
const GENERATED_EMAIL_DOMAIN = process.env.TRAINEE_IMPORT_EMAIL_DOMAIN || "trainees.inseed.local";

const COLUMN_MAP = {
  candidateId: ["Candidate ID", "Candidate Id", "Candidate Code", "Student ID", "Trainee ID"],
  fullName: ["Full Name", "Candidate Name", "Student Name", "Name"],
  fatherName: ["Father Name", "Father's Name", "Father"],
  motherName: ["Mother Name", "Mother's Name", "Mother"],
  mobileNumber: ["Mobile Number", "Mobile", "Phone", "Phone Number", "Contact Number"],
  email: ["Email", "Email Address", "Mail ID", "Email ID"],
  dateOfBirth: ["Date of Birth", "DOB", "Birth Date"],
  course: ["Course", "Program", "Training Course"],
  education: ["Education", "Education Level", "Qualification"],
  religion: ["Religion"],
  category: ["Category", "Caste Category"],
  disability: ["Disability", "Disabled", "PwD"],
  typeOfDisability: ["Type of Disability", "Disability Type"],
  bankAccountNumber: ["Bank Account Number", "Account Number", "Bank A/C Number"],
  bankName: ["Bank Name"],
  bankBranch: ["Bank Branch", "Branch"],
  ifscCode: ["IFSC Code", "IFSC"],
  city: ["City", "Village/Town", "Town"],
  mandal: ["Mandal"],
  district: ["District"],
  state: ["State"],
  pincode: ["Pincode", "Pin Code", "PIN"],
  assessmentStatus: ["Assessment Status", "Assessment"],
  ojtConfirmation: ["OJT Confirmation", "OJT", "OJT Confirmed"],
  ojtCompletion: ["OJT Completion", "OJT Completion Date"],
  temporaryPassword: ["Temporary Password", "Password", "Login Password"],
};

const REQUIRED_FIELDS = [
  "candidateId",
  "fullName",
  "fatherName",
  "motherName",
  "mobileNumber",
  "dateOfBirth",
  "course",
  "education",
  "religion",
  "category",
  "disability",
  "bankAccountNumber",
  "bankName",
  "bankBranch",
  "ifscCode",
  "city",
  "mandal",
  "district",
  "state",
  "pincode",
  "assessmentStatus",
  "ojtConfirmation",
];

const parseArgs = () => {
  const args = {
    file: "",
    dryRun: false,
    execute: false,
    deleteTestData: false,
    sheet: "",
  };

  process.argv.slice(2).forEach((arg) => {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--execute") args.execute = true;
    else if (arg === "--delete-test-data") args.deleteTestData = true;
    else if (arg.startsWith("--file=")) args.file = arg.slice("--file=".length);
    else if (arg.startsWith("--sheet=")) args.sheet = arg.slice("--sheet=".length);
  });

  if (!args.file) {
    throw new Error('Missing --file. Example: --file="./data/Inseed 1293 Data.xlsx"');
  }

  if (args.dryRun && args.execute) {
    throw new Error("Use either --dry-run or --execute, not both.");
  }

  if (!args.dryRun && !args.execute) {
    throw new Error("Choose --dry-run or --execute.");
  }

  return args;
};

const ensureDir = (directory) => {
  fs.mkdirSync(directory, { recursive: true });
};

const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-");

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const toText = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

const normalizeEmail = (value) => toText(value).toLowerCase();

const normalizeMobile = (value) => {
  const text = toText(value);
  if (!text) return "";
  return text.replace(/[^\d]/g, "");
};

const normalizeCandidateCode = (value) =>
  toText(value)
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const generatedCandidateCode = (rowNumber) => `INS-GEN-${String(rowNumber).padStart(5, "0")}`;

const generatedEmailForCandidate = (candidateCode) =>
  `${candidateCode.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")}@${GENERATED_EMAIL_DOMAIN}`;

const parseBoolean = (value) => {
  const normalized = toText(value).toLowerCase();
  if (["yes", "y", "true", "1", "confirmed", "completed"].includes(normalized)) return true;
  if (["no", "n", "false", "0", "not confirmed", "not completed"].includes(normalized)) return false;
  return null;
};

const parseDate = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return "";
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).toISOString().slice(0, 10);
  }

  const text = toText(value);
  if (!text) return "";

  const slashDate = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(text);
  if (slashDate) {
    const month = Number(slashDate[1]);
    const day = Number(slashDate[2]);
    let year = Number(slashDate[3]);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

const looksLikeDateInput = (value) => {
  if (value instanceof Date || typeof value === "number") return true;
  return /\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/.test(toText(value));
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
const isValidMobile = (value) => /^\d{10,15}$/.test(String(value || ""));
const isValidPincode = (value) => /^\d{6}$/.test(String(value || ""));
const isValidIfsc = (value) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(value || ""));

const maskEmail = (email) => String(email || "").replace(/^(.{2}).*(@.*)$/, "$1***$2");
const maskMobile = (mobile) => String(mobile || "").replace(/\d(?=\d{3})/g, "*");

const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const writeCsvReport = (reportRows, outputPath) => {
  const header = ["rowNumber", "status", "reason", "candidateCode", "field"];
  const lines = [header.join(",")];
  reportRows.forEach((row) => {
    lines.push(header.map((key) => csvEscape(row[key])).join(","));
  });
  fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
};

const buildHeaderMapping = (headers) => {
  const normalizedHeaders = new Map(headers.map((header, index) => [normalizeHeader(header), { header, index }]));
  const mapping = {};

  Object.entries(COLUMN_MAP).forEach(([field, aliases]) => {
    const match = aliases.map(normalizeHeader).map((alias) => normalizedHeaders.get(alias)).find(Boolean);
    mapping[field] = match ? { header: match.header, index: match.index } : null;
  });

  return mapping;
};

const getCell = (row, mapping, field) => {
  const mapped = mapping[field];
  return mapped ? row[mapped.index] : "";
};

const readWorkbookRows = (filePath, requestedSheet) => {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = requestedSheet || workbook.SheetNames[0];
  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Sheet "${sheetName}" was not found. Available sheets: ${workbook.SheetNames.join(", ")}`);
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null, raw: true });
  const headerIndex = rows.findIndex((row) => row.some((cell) => toText(cell)));
  if (headerIndex < 0) throw new Error("No header row found in workbook.");

  const headers = rows[headerIndex].map(toText);
  const mapping = buildHeaderMapping(headers);
  const dataRows = rows
    .slice(headerIndex + 1)
    .map((row, index) => ({ row, rowNumber: headerIndex + index + 2 }))
    .filter(({ row }) => row.some((cell) => toText(cell)));

  return { sheetName, headers, mapping, dataRows };
};

const normalizeRow = ({ row, rowNumber }, mapping) => {
  const errors = [];
  const candidateCode = normalizeCandidateCode(getCell(row, mapping, "candidateId")) || generatedCandidateCode(rowNumber);
  const disability = parseBoolean(getCell(row, mapping, "disability"));
  const ojtConfirmation = parseBoolean(getCell(row, mapping, "ojtConfirmation"));
  const ojtCompletionRaw = getCell(row, mapping, "ojtCompletion");
  const mobileNumber = normalizeMobile(getCell(row, mapping, "mobileNumber"));
  const emailFromSheet = normalizeEmail(getCell(row, mapping, "email"));
  const email = emailFromSheet || generatedEmailForCandidate(candidateCode);
  const dateOfBirth = parseDate(getCell(row, mapping, "dateOfBirth"));
  const ojtCompletion = looksLikeDateInput(ojtCompletionRaw) ? parseDate(ojtCompletionRaw) : "";
  const ojtCompletionStatus = parseBoolean(ojtCompletionRaw);
  const password = toText(getCell(row, mapping, "temporaryPassword")) || DEFAULT_PASSWORD;

  const data = {
    candidateCode,
    fullName: toText(getCell(row, mapping, "fullName")).replace(/\s+/g, " "),
    email,
    phone: mobileNumber,
    course: toText(getCell(row, mapping, "course")).replace(/\s+/g, " "),
    password,
    profileData: {
      basicInfo: {
        candidateId: candidateCode,
        fullName: toText(getCell(row, mapping, "fullName")).replace(/\s+/g, " "),
        fatherName: toText(getCell(row, mapping, "fatherName")).replace(/\s+/g, " "),
        motherName: toText(getCell(row, mapping, "motherName")).replace(/\s+/g, " "),
        mobileNumber,
        email,
        dateOfBirth,
      },
      education: {
        course: toText(getCell(row, mapping, "course")).replace(/\s+/g, " "),
        education: toText(getCell(row, mapping, "education")).replace(/\s+/g, " "),
        religion: toText(getCell(row, mapping, "religion")).replace(/\s+/g, " "),
        category: toText(getCell(row, mapping, "category")).replace(/\s+/g, " "),
        disability,
      },
      bank: {
        accountNumber: toText(getCell(row, mapping, "bankAccountNumber")).replace(/[^\d]/g, ""),
        bankName: toText(getCell(row, mapping, "bankName")).replace(/\s+/g, " "),
        branch: toText(getCell(row, mapping, "bankBranch")).replace(/\s+/g, " "),
        ifscCode: toText(getCell(row, mapping, "ifscCode")).toUpperCase().replace(/\s+/g, ""),
      },
      address: {
        city: toText(getCell(row, mapping, "city")).replace(/\s+/g, " "),
        mandal: toText(getCell(row, mapping, "mandal")).replace(/\s+/g, " "),
        district: toText(getCell(row, mapping, "district")).replace(/\s+/g, " "),
        state: toText(getCell(row, mapping, "state")).replace(/\s+/g, " "),
        pincode: toText(getCell(row, mapping, "pincode")).replace(/[^\d]/g, ""),
      },
      training: {
        assessmentStatus: toText(getCell(row, mapping, "assessmentStatus")).replace(/\s+/g, " "),
        ojtConfirmation,
        ojtCompletion: ojtConfirmation ? ojtCompletion : "",
        ojtCompletionStatus,
      },
      placement: {},
      salary: [],
      documents: {},
      auth: {
        mustChangePassword: true,
        defaultPasswordUsed: !toText(getCell(row, mapping, "temporaryPassword")),
      },
      importMeta: {
        source: "excel",
        importedAt: new Date().toISOString(),
        sourceRow: rowNumber,
      },
    },
  };

  if (disability) {
    data.profileData.education.disabilityType = toText(getCell(row, mapping, "typeOfDisability")).replace(/\s+/g, " ");
  }

  REQUIRED_FIELDS.forEach((field) => {
    if (field === "candidateId") return;
    const value = getCell(row, mapping, field);
    if (!toText(value)) errors.push({ field, reason: "Required field is empty" });
  });

  if (!data.fullName || data.fullName.length < 2) errors.push({ field: "fullName", reason: "Full name is required" });
  if (!isValidEmail(data.email)) errors.push({ field: "email", reason: "Email is invalid or could not be generated" });
  if (!isValidMobile(data.phone)) errors.push({ field: "mobileNumber", reason: "Mobile number must contain 10 to 15 digits" });
  if (!dateOfBirth) errors.push({ field: "dateOfBirth", reason: "Date of birth is invalid" });
  if (disability === null) errors.push({ field: "disability", reason: "Disability must be Yes or No" });
  if (disability && !data.profileData.education.disabilityType) {
    errors.push({ field: "typeOfDisability", reason: "Type of Disability is required when Disability is Yes" });
  }
  if (ojtConfirmation === null) errors.push({ field: "ojtConfirmation", reason: "OJT Confirmation must be Yes or No" });
  if (looksLikeDateInput(ojtCompletionRaw) && ojtConfirmation && !ojtCompletion) {
    errors.push({ field: "ojtCompletion", reason: "OJT Completion date is invalid" });
  }
  if (!isValidPincode(data.profileData.address.pincode)) errors.push({ field: "pincode", reason: "Pincode must contain exactly 6 digits" });
  if (!isValidIfsc(data.profileData.bank.ifscCode)) errors.push({ field: "ifscCode", reason: "IFSC code is invalid" });
  if (!data.course) errors.push({ field: "course", reason: "Course is required" });
  if (password.length < 8) errors.push({ field: "temporaryPassword", reason: "Temporary password must be at least 8 characters" });

  return { rowNumber, data, errors };
};

const isTestStudent = (student) => {
  const email = String(student.email || "").toLowerCase();
  const code = String(student.candidateCode || "").toUpperCase();
  const phone = String(student.phone || "");
  const profileData = student.profileData || {};

  return (
    email.endsWith("@example.com") ||
    /^TRN-\d+$/i.test(code) ||
    /98765\s?000\d+/.test(phone) ||
    profileData?.importMeta?.source === "test-seed"
  );
};

const getCurrentStudents = () =>
  prisma.student.findMany({
    include: {
      placements: true,
    },
    orderBy: { createdAt: "asc" },
  });

const analyzeRows = async (normalizedRows) => {
  const currentStudents = await getCurrentStudents();
  const existingCandidateCodes = new Set(currentStudents.map((student) => String(student.candidateCode || "").toUpperCase()).filter(Boolean));
  const existingEmails = new Set(currentStudents.map((student) => String(student.email || "").toLowerCase()).filter(Boolean));
  const existingPhones = new Set(currentStudents.map((student) => normalizeMobile(student.phone)).filter(Boolean));
  const seenCandidateCodes = new Set();
  const seenEmails = new Set();
  const seenPhones = new Set();

  const valid = [];
  const invalid = [];
  const duplicates = [];
  const reportRows = [];

  normalizedRows.forEach((item) => {
    const candidateKey = String(item.data.candidateCode || "").toUpperCase();
    const emailKey = String(item.data.email || "").toLowerCase();
    const phoneKey = normalizeMobile(item.data.phone);
    const reasons = [...item.errors];

    if (seenCandidateCodes.has(candidateKey)) reasons.push({ field: "candidateId", reason: "Duplicate Candidate ID inside Excel file" });
    if (seenEmails.has(emailKey)) reasons.push({ field: "email", reason: "Duplicate email inside Excel file" });
    if (seenPhones.has(phoneKey)) reasons.push({ field: "mobileNumber", reason: "Duplicate mobile number inside Excel file" });

    if (existingCandidateCodes.has(candidateKey)) reasons.push({ field: "candidateId", reason: "Candidate ID already exists in database" });
    if (existingEmails.has(emailKey)) reasons.push({ field: "email", reason: "Email already exists in database" });
    if (existingPhones.has(phoneKey)) reasons.push({ field: "mobileNumber", reason: "Mobile number already exists in database" });

    seenCandidateCodes.add(candidateKey);
    seenEmails.add(emailKey);
    seenPhones.add(phoneKey);

    if (reasons.length) {
      const hasDuplicate = reasons.some((entry) => /duplicate|already exists/i.test(entry.reason));
      const target = hasDuplicate ? duplicates : invalid;
      target.push({ ...item, errors: reasons });
      reasons.forEach((entry) => {
        reportRows.push({
          rowNumber: item.rowNumber,
          status: hasDuplicate ? "duplicate" : "invalid",
          reason: entry.reason,
          candidateCode: item.data.candidateCode,
          field: entry.field,
        });
      });
      return;
    }

    valid.push(item);
  });

  return { currentStudents, valid, invalid, duplicates, reportRows };
};

const backupStudents = (students, backupPath) => {
  const payload = {
    exportedAt: new Date().toISOString(),
    count: students.length,
    students,
  };
  fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2), "utf8");
};

const insertRows = async (rows) => {
  const passwordHashes = new Map();
  const getPasswordHash = async (password) => {
    if (!passwordHashes.has(password)) {
      passwordHashes.set(password, await bcrypt.hash(password, 12));
    }
    return passwordHashes.get(password);
  };

  let created = 0;

  await prisma.$transaction(
    async (tx) => {
      for (const row of rows) {
        const passwordHash = await getPasswordHash(row.data.password);
        const { password, ...studentData } = row.data;
        await tx.student.create({
          data: {
            ...studentData,
            passwordHash,
          },
        });
        created += 1;
      }
    },
    { timeout: 120000 }
  );

  return created;
};

const deleteTestData = async (students) => {
  const testStudents = students.filter(isTestStudent);
  const testIds = testStudents.map((student) => student.id);
  const placementCount = testStudents.reduce((sum, student) => sum + student.placements.length, 0);

  if (!testIds.length) {
    return { deletedStudents: 0, deletedPlacements: 0, testStudents };
  }

  await prisma.$transaction(async (tx) => {
    await tx.placement.deleteMany({ where: { studentId: { in: testIds } } });
    await tx.student.deleteMany({ where: { id: { in: testIds } } });
  });

  return { deletedStudents: testIds.length, deletedPlacements: placementCount, testStudents };
};

const summarizeMapping = (mapping) =>
  Object.fromEntries(
    Object.entries(mapping).map(([field, match]) => [field, match ? match.header : null])
  );

const main = async () => {
  const args = parseArgs();
  const filePath = path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(filePath)) throw new Error(`Excel file not found: ${filePath}`);

  const reportsDir = path.join(__dirname, "..", "import-reports");
  const backupsDir = path.join(__dirname, "..", "backups");
  ensureDir(reportsDir);
  ensureDir(backupsDir);

  const workbookData = readWorkbookRows(filePath, args.sheet);
  const normalizedRows = workbookData.dataRows.map((row) => normalizeRow(row, workbookData.mapping));
  const analysis = await analyzeRows(normalizedRows);
  const testStudents = analysis.currentStudents.filter(isTestStudent);
  const reportPath = path.join(reportsDir, `trainee-import-errors-${timestamp()}.csv`);
  writeCsvReport(analysis.reportRows, reportPath);

  console.log(
    JSON.stringify(
      {
        mode: args.dryRun ? "dry-run" : "execute",
        databaseTarget: process.env.DATABASE_URL?.includes("neon.tech")
          ? "Neon/Postgres"
          : process.env.DATABASE_URL?.includes("localhost")
          ? "local Postgres"
          : "configured Postgres",
        sheet: workbookData.sheetName,
        detectedColumnMapping: summarizeMapping(workbookData.mapping),
        currentTraineeCount: analysis.currentStudents.length,
        identifiedTestTrainees: testStudents.length,
        excelRowsProcessed: workbookData.dataRows.length,
        validRows: analysis.valid.length,
        invalidRows: analysis.invalid.length,
        duplicateRows: analysis.duplicates.length,
        errorReport: path.relative(process.cwd(), reportPath),
        generatedEmailsUsed: normalizedRows.filter((row) => !toText(getCell(workbookData.dataRows.find((item) => item.rowNumber === row.rowNumber)?.row || [], workbookData.mapping, "email"))).length,
        sampleValidRows: analysis.valid.slice(0, 3).map((row) => ({
          rowNumber: row.rowNumber,
          candidateCode: row.data.candidateCode,
          name: row.data.fullName,
          email: maskEmail(row.data.email),
          mobile: maskMobile(row.data.phone),
        })),
        sampleProblemRows: [...analysis.invalid, ...analysis.duplicates].slice(0, 10).map((row) => ({
          rowNumber: row.rowNumber,
          candidateCode: row.data.candidateCode,
          reasons: row.errors.map((entry) => `${entry.field}: ${entry.reason}`),
        })),
      },
      null,
      2
    )
  );

  if (args.dryRun) return;

  if (!args.deleteTestData) {
    throw new Error("Refusing to execute without --delete-test-data. Run with --delete-test-data --execute after reviewing dry-run output.");
  }

  const backupPath = path.join(backupsDir, `students-backup-before-import-${timestamp()}.json`);
  backupStudents(analysis.currentStudents, backupPath);
  const deletion = await deleteTestData(analysis.currentStudents);
  const created = await insertRows(analysis.valid);
  const finalCount = await prisma.student.count();
  const verificationRows = await prisma.student.findMany({
    select: { candidateCode: true, fullName: true, email: true, phone: true, course: true, profileData: true },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  console.log(
    JSON.stringify(
      {
        executed: true,
        backup: path.relative(process.cwd(), backupPath),
        deletedTestTrainees: deletion.deletedStudents,
        deletedRelatedPlacements: deletion.deletedPlacements,
        importedTrainees: created,
        finalTraineeCount: finalCount,
        verificationSample: verificationRows.map((student) => ({
          candidateCode: student.candidateCode,
          name: student.fullName,
          email: maskEmail(student.email),
          mobile: maskMobile(student.phone),
          course: student.course,
          disability: student.profileData?.education?.disability,
          typeOfDisabilityPresent: Boolean(student.profileData?.education?.disabilityType),
        })),
      },
      null,
      2
    )
  );
};

main()
  .catch((error) => {
    console.error(`Import failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
