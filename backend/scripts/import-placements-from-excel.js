const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), override: false });

const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const COLUMN_MAP = {
  candidateId: ["Candidate ID", "Candidate Id", "Candidate Code", "Student ID", "Trainee ID"],
  candidateName: ["Candidate Name", "Full Name", "Trainee Name", "Student Name"],
  institutionName: ["Institution", "Institution Name", "College", "College Name"],
  skillDepartment: ["Skill Department", "Skill Dept", "Skill", "Skill Department Candidate"],
  assessmentStatus: ["Assessment Status", "Assessment"],
  ojtConfirmation: ["OJT Confirmation", "OJT", "OJT Confirmed"],
  ojtCompletion: ["OJT Completion", "OJT Completion Date"],
  companyName: ["Company Name", "Company", "Employer"],
  role: ["Role / Designation", "Role", "Designation", "Job Role"],
  package: ["Package (INR)", "Package", "CTC", "Salary Package"],
  placementDate: ["Date of Joining", "Joining Date", "Placement Date", "DOJ"],
  status: ["Status", "Placement Status"],
  month1Salary: ["1st Month Salary", "Month 1 Salary", "Salary Month 1"],
  month2Salary: ["2nd Month Salary", "Month 2 Salary", "Salary Month 2"],
  month3Salary: ["3rd Month Salary", "Month 3 Salary", "Salary Month 3"],
  month4Salary: ["4th Month Salary", "Month 4 Salary", "Salary Month 4"],
  month5Salary: ["5th Month Salary", "Month 5 Salary", "Salary Month 5"],
  month6Salary: ["6th Month Salary", "Month 6 Salary", "Salary Month 6"],
};

const REQUIRED_FIELDS = [
  "candidateId",
  "institutionName",
  "skillDepartment",
  "assessmentStatus",
  "ojtConfirmation",
  "companyName",
  "role",
  "package",
  "placementDate",
  "status",
];

const ALLOWED_STATUSES = {
  placed: "PLACED",
  interviewing: "INTERVIEWING",
  "offer pending": "OFFER_PENDING",
  offer_pending: "OFFER_PENDING",
  rejected: "REJECTED",
};

const MAX_SALARY_MONTHS = 6;

const parseArgs = () => {
  const args = {
    file: "",
    dryRun: false,
    execute: false,
    sheet: "",
  };

  process.argv.slice(2).forEach((arg) => {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--execute") args.execute = true;
    else if (arg.startsWith("--file=")) args.file = arg.slice("--file=".length);
    else if (arg.startsWith("--sheet=")) args.sheet = arg.slice("--sheet=".length);
  });

  if (!args.file) {
    throw new Error('Missing --file. Example: --file="./data/placements.xlsx"');
  }

  if (args.dryRun && args.execute) {
    throw new Error("Use either --dry-run or --execute, not both.");
  }

  if (!args.dryRun && !args.execute) {
    throw new Error("Choose --dry-run or --execute.");
  }

  return args;
};

const ensureDir = (directory) => fs.mkdirSync(directory, { recursive: true });
const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-");
const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
const toText = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};
const normalizeKey = (value) => toText(value).toLowerCase().replace(/\s+/g, " ");
const normalizeCandidateCode = (value) =>
  toText(value).toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");

const parseBoolean = (value) => {
  const normalized = normalizeKey(value);
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
    const day = Number(slashDate[1]);
    const month = Number(slashDate[2]);
    let year = Number(slashDate[3]);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

const parseMoney = (value) => {
  const normalized = toText(value).replace(/[₹,\s]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
};

const normalizeStatus = (value) => ALLOWED_STATUSES[normalizeKey(value)] || "";

const formatSalaryMonth = (date) =>
  date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

const buildSalaryRows = (placementDate, salaries) => {
  const date = new Date(`${placementDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return [];

  return Array.from({ length: MAX_SALARY_MONTHS }, (_, index) => {
    const monthDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + index, 1));
    return {
      slNo: index + 1,
      month: formatSalaryMonth(monthDate),
      salary: salaries[index],
    };
  });
};

const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const writeCsvReport = (reportRows, outputPath) => {
  const header = ["rowNumber", "status", "reason", "candidateId", "companyName", "field"];
  const lines = [header.join(",")];
  reportRows.forEach((row) => lines.push(header.map((key) => csvEscape(row[key])).join(",")));
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

const normalizeRow = ({ row, rowNumber }, mapping, lookups) => {
  const errors = [];
  const candidateCode = normalizeCandidateCode(getCell(row, mapping, "candidateId"));
  const institutionName = toText(getCell(row, mapping, "institutionName")).replace(/\s+/g, " ");
  const skillDepartment = parseBoolean(getCell(row, mapping, "skillDepartment"));
  const ojtConfirmation = parseBoolean(getCell(row, mapping, "ojtConfirmation"));
  const placementDate = parseDate(getCell(row, mapping, "placementDate"));
  const packageValue = parseMoney(getCell(row, mapping, "package"));
  const status = normalizeStatus(getCell(row, mapping, "status"));
  const salaryValues = Array.from({ length: MAX_SALARY_MONTHS }, (_, index) =>
    parseMoney(getCell(row, mapping, `month${index + 1}Salary`))
  );

  REQUIRED_FIELDS.forEach((field) => {
    if (!mapping[field]) errors.push({ field, reason: "Column is missing from Excel" });
    else if (!toText(getCell(row, mapping, field))) errors.push({ field, reason: "Value is required" });
  });

  const student = lookups.studentsByCandidateCode.get(candidateCode);
  const institution = lookups.institutionsByName.get(normalizeKey(institutionName));

  if (!candidateCode) errors.push({ field: "candidateId", reason: "Candidate ID is required" });
  if (!student) errors.push({ field: "candidateId", reason: "Candidate ID must match an existing trainee" });
  if (!institution) errors.push({ field: "institutionName", reason: "Institution Name must match an existing institution" });
  if (skillDepartment === null) errors.push({ field: "skillDepartment", reason: "Use Yes or No" });
  if (ojtConfirmation === null) errors.push({ field: "ojtConfirmation", reason: "Use Yes or No" });
  if (!placementDate) errors.push({ field: "placementDate", reason: "Date of Joining must be a valid date" });
  if (!packageValue || packageValue <= 0) errors.push({ field: "package", reason: "Package must be a positive number" });
  if (!status) errors.push({ field: "status", reason: "Status must be Placed, Interviewing, Offer Pending, or Rejected" });

  const ojtCompletion = ojtConfirmation ? parseDate(getCell(row, mapping, "ojtCompletion")) : "";
  if (ojtConfirmation && !ojtCompletion) {
    errors.push({ field: "ojtCompletion", reason: "OJT Completion is required when OJT Confirmation is Yes" });
  }

  if (skillDepartment) {
    salaryValues.forEach((salary, index) => {
      if (!salary || salary <= 0) {
        errors.push({ field: `month${index + 1}Salary`, reason: "Six salary month values are required for Skill Department Yes" });
      }
    });
  }

  const duplicateKey = [candidateCode, normalizeKey(institutionName), normalizeKey(getCell(row, mapping, "companyName")), normalizeKey(getCell(row, mapping, "role")), placementDate].join("|");
  if (lookups.existingPlacementKeys.has(duplicateKey)) {
    errors.push({ field: "duplicate", reason: "Placement already exists for same candidate, institution, company, role, and date" });
  }

  const salaryTracking = skillDepartment ? buildSalaryRows(placementDate, salaryValues) : [];
  const companyName = toText(getCell(row, mapping, "companyName")).replace(/\s+/g, " ");
  const role = toText(getCell(row, mapping, "role")).replace(/\s+/g, " ");
  const candidateName = toText(getCell(row, mapping, "candidateName")).replace(/\s+/g, " ") || student?.fullName || "";
  const studentProfile = student?.profileData && typeof student.profileData === "object" ? student.profileData : {};

  const details = {
    basicInfo: {
      candidateId: candidateCode,
      fullName: candidateName,
      fatherName: studentProfile.basicInfo?.fatherName || "",
      motherName: studentProfile.basicInfo?.motherName || "",
      mobileNumber: student?.phone || studentProfile.basicInfo?.mobileNumber || "",
      email: student?.email || studentProfile.basicInfo?.email || "",
      dateOfBirth: studentProfile.basicInfo?.dateOfBirth || "",
    },
    education: studentProfile.education || {},
    bank: studentProfile.bank || {},
    address: studentProfile.address || {},
    training: {
      assessmentStatus: toText(getCell(row, mapping, "assessmentStatus")).replace(/\s+/g, " "),
      ojtConfirmation,
      ojtCompletion,
    },
    placement: {
      candidateName,
      skillDepartment: skillDepartment ? "Yes" : "No",
      companyName,
      role,
      package: String(packageValue),
      dateOfJoining: placementDate,
      status,
    },
    salaryTracking,
  };

  return {
    rowNumber,
    duplicateKey,
    errors,
    data: {
      studentId: student?.id || "",
      institutionId: institution?.id || "",
      companyName,
      role,
      package: packageValue,
      placementDate: placementDate ? new Date(`${placementDate}T00:00:00.000Z`) : null,
      status,
      details,
    },
    summary: {
      candidateId: candidateCode,
      companyName,
      institutionName,
      role,
      status,
    },
  };
};

const buildLookups = async () => {
  const [students, institutions, placements] = await Promise.all([
    prisma.student.findMany({ select: { id: true, candidateCode: true, fullName: true, email: true, phone: true, profileData: true } }),
    prisma.institution.findMany({ select: { id: true, name: true } }),
    prisma.placement.findMany({
      select: {
        companyName: true,
        role: true,
        placementDate: true,
        student: { select: { candidateCode: true } },
        institution: { select: { name: true } },
      },
    }),
  ]);

  return {
    studentsByCandidateCode: new Map(students.map((student) => [normalizeCandidateCode(student.candidateCode), student])),
    institutionsByName: new Map(institutions.map((institution) => [normalizeKey(institution.name), institution])),
    existingPlacementKeys: new Set(
      placements.map((placement) =>
        [
          normalizeCandidateCode(placement.student?.candidateCode),
          normalizeKey(placement.institution?.name),
          normalizeKey(placement.companyName),
          normalizeKey(placement.role),
          placement.placementDate ? placement.placementDate.toISOString().slice(0, 10) : "",
        ].join("|")
      )
    ),
  };
};

const analyze = async (args) => {
  const filePath = path.resolve(process.cwd(), args.file);
  const { sheetName, mapping, dataRows } = readWorkbookRows(filePath, args.sheet);
  const lookups = await buildLookups();
  const seenKeys = new Set();
  const reportRows = [];
  const validRows = [];
  let duplicateRows = 0;
  let invalidRows = 0;

  dataRows.forEach((row) => {
    const normalized = normalizeRow(row, mapping, lookups);

    if (seenKeys.has(normalized.duplicateKey)) {
      normalized.errors.push({ field: "duplicate", reason: "Duplicate placement row inside Excel file" });
    }
    seenKeys.add(normalized.duplicateKey);

    if (normalized.errors.length) {
      if (normalized.errors.some((error) => error.field === "duplicate")) duplicateRows += 1;
      else invalidRows += 1;
      normalized.errors.forEach((error) => {
        reportRows.push({
          rowNumber: normalized.rowNumber,
          status: error.field === "duplicate" ? "duplicate" : "invalid",
          reason: error.reason,
          candidateId: normalized.summary.candidateId,
          companyName: normalized.summary.companyName,
          field: error.field,
        });
      });
      return;
    }

    validRows.push(normalized);
  });

  const reportDirectory = path.join(__dirname, "..", "import-reports");
  ensureDir(reportDirectory);
  const errorReport = path.join(reportDirectory, `placement-import-errors-${timestamp()}.csv`);
  writeCsvReport(reportRows, errorReport);

  return {
    sheetName,
    mapping,
    excelRowsProcessed: dataRows.length,
    validRows,
    invalidRows,
    duplicateRows,
    errorReport,
  };
};

const executeImport = async (validRows) => {
  if (!validRows.length) return { importedPlacements: 0 };

  const created = await prisma.$transaction(
    validRows.map((row) =>
      prisma.placement.create({
        data: row.data,
      })
    ),
    { timeout: 30000 }
  );

  return { importedPlacements: created.length };
};

const main = async () => {
  const args = parseArgs();
  const analysis = await analyze(args);
  const output = {
    mode: args.dryRun ? "dry-run" : "execute",
    databaseTarget: process.env.DATABASE_URL?.includes("neon.tech") ? "Neon/Postgres" : "Configured DATABASE_URL",
    sheet: analysis.sheetName,
    detectedColumnMapping: Object.fromEntries(
      Object.entries(analysis.mapping).map(([field, match]) => [field, match?.header || null])
    ),
    excelRowsProcessed: analysis.excelRowsProcessed,
    validRows: analysis.validRows.length,
    invalidRows: analysis.invalidRows,
    duplicateRows: analysis.duplicateRows,
    errorReport: path.relative(path.join(__dirname, ".."), analysis.errorReport),
    sampleValidRows: analysis.validRows.slice(0, 5).map((row) => row.summary),
  };

  console.log(JSON.stringify(output, null, 2));

  if (args.execute) {
    const result = await executeImport(analysis.validRows);
    const finalPlacementCount = await prisma.placement.count();
    console.log(JSON.stringify({ executed: true, ...result, finalPlacementCount }, null, 2));
  }
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
