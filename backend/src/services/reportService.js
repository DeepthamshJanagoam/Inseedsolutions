const prisma = require("../prisma/client");

const REPORT_TYPES = {
  trainee: "TRAINEE",
  placement: "PLACEMENT",
  institution: "INSTITUTION",
  "skill-placement": "SKILL_PLACEMENT",
};

const STATUS_LABELS = {
  PLACED: "Placed",
  INTERVIEWING: "Interviewing",
  OFFER_PENDING: "Offer Pending",
  REJECTED: "Rejected",
};

const normalizeReportType = (value) => {
  const normalized = String(value || "trainee").trim().toLowerCase();
  return REPORT_TYPES[normalized] ? normalized : "trainee";
};

const normalizeDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeString = (value) => String(value || "").trim();
const normalizeLower = (value) => normalizeString(value).toLowerCase();
const normalizeSkillDepartment = (value) => normalizeLower(value) === "yes";
const uniqueSorted = (values) => [...new Set(values.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right)));

const safeObject = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});
const safeArray = (value) => (Array.isArray(value) ? value : []);

const formatStatus = (value) => STATUS_LABELS[value] || String(value || "").replaceAll("_", " ");

const buildStudentSnapshot = (student) => {
  const profile = safeObject(student.profileData);
  const basicInfo = safeObject(profile.basicInfo);
  const education = safeObject(profile.education);
  const address = safeObject(profile.address);

  return {
    id: student.id,
    candidateCode: student.candidateCode || basicInfo.candidateId || "-",
    name: student.fullName,
    fatherName: basicInfo.fatherName || "-",
    motherName: basicInfo.motherName || "-",
    dob: basicInfo.dateOfBirth || "-",
    qualification: education.education || "-",
    course: student.course || education.course || "-",
    mobile: student.phone || basicInfo.mobileNumber || "-",
    email: student.email || basicInfo.email || "-",
    city: address.city || "-",
    district: address.district || "-",
    state: address.state || "-",
  };
};

const buildSalaryEntries = (placement) => {
  const details = safeObject(placement.details);
  const salary = safeArray(details.salaryTracking).length ? safeArray(details.salaryTracking) : safeArray(details.salary);

  return salary
    .map((row) => {
      const normalizedRow = safeObject(row);
      const month = normalizeString(normalizedRow.month);
      const salaryValue = Number(normalizedRow.salary);

      if (!month && !Number.isFinite(salaryValue)) {
        return null;
      }

      return {
        slNo: Number(normalizedRow.slNo) || 0,
        month: month || "-",
        salary: Number.isFinite(salaryValue) ? salaryValue : 0,
      };
    })
    .filter(Boolean)
    .sort((left, right) => (left.slNo || 0) - (right.slNo || 0))
    .slice(0, 6);
};

const buildPlacementRows = (students) =>
  students.flatMap((student) => {
    const snapshot = buildStudentSnapshot(student);

    return safeArray(student.placements).map((placement) => {
      const details = safeObject(placement.details);
      const placementDetails = safeObject(details.placement);
      const salaryEntries = buildSalaryEntries(placement);
      const skillDepartment = normalizeString(
        placementDetails.skillDepartment || details.skillDepartment || details.placement?.skillDepartment
      );

      const salaryColumns = Object.fromEntries(
        Array.from({ length: 6 }, (_, index) => {
          const entry = salaryEntries[index];
          return [
            [`month${index + 1}Name`, entry?.month || "-"],
            [`month${index + 1}Salary`, Number.isFinite(entry?.salary) ? entry.salary : 0],
          ];
        }).flat()
      );

      return {
        id: placement.id,
        candidateCode: snapshot.candidateCode,
        trainee: snapshot.name,
        qualification: snapshot.qualification,
        course: snapshot.course,
        institution: placement.institution?.name || "-",
        company: placement.companyName || "-",
        role: placement.role || "-",
        package: placement.package || 0,
        status: placement.status || "-",
        statusLabel: formatStatus(placement.status),
        dateOfJoining: placement.placementDate,
        email: snapshot.email,
        mobile: snapshot.mobile,
        city: snapshot.city,
        district: snapshot.district,
        state: snapshot.state,
        salaryEntries,
        skillDepartment,
        isSkillDepartmentYes: normalizeSkillDepartment(skillDepartment),
        ...salaryColumns,
      };
    });
  });

const matchesCommonFilters = (row, filters) => {
  const matchesCourse = !filters.course || row.course === filters.course;
  const matchesQualification = !filters.qualification || row.qualification === filters.qualification;
  const matchesInstitution = !filters.institution || row.institution === filters.institution;
  const matchesCompany = !filters.company || row.company === filters.company;
  const matchesDate =
    !filters.dateOfJoining ||
    (row.dateOfJoining && new Date(row.dateOfJoining).toDateString() === filters.dateOfJoining.toDateString());
  const matchesSearch =
    !filters.search ||
    [
      row.candidateCode,
      row.trainee,
      row.company,
      row.role,
      row.institution,
      row.course,
      row.qualification,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(filters.search);

  return (
    matchesCourse &&
    matchesQualification &&
    matchesInstitution &&
    matchesCompany &&
    matchesDate &&
    matchesSearch
  );
};

const buildTraineeRows = (students, placementRows, filters) =>
  students
    .map((student) => {
      const snapshot = buildStudentSnapshot(student);
      const placements = placementRows.filter((row) => row.id && row.email === snapshot.email);
      const latestPlacement = [...placements].sort(
        (left, right) => new Date(right.dateOfJoining || 0) - new Date(left.dateOfJoining || 0)
      )[0];

      return {
        ...snapshot,
        latestPlacement,
        placements,
      };
    })
    .filter((row) => {
      const matchesCourse = !filters.course || row.course === filters.course;
      const matchesQualification = !filters.qualification || row.qualification === filters.qualification;
      const matchesDate =
        !filters.dateOfJoining ||
        (row.latestPlacement &&
          new Date(row.latestPlacement.dateOfJoining).toDateString() === filters.dateOfJoining.toDateString());
      const matchesInstitution =
        !filters.institution || row.placements.some((placement) => placement.institution === filters.institution);
      const matchesCompany =
        !filters.company || row.placements.some((placement) => placement.company === filters.company);
      const matchesSearch =
        !filters.search ||
        [
          row.candidateCode,
          row.name,
          row.course,
          row.qualification,
          ...row.placements.flatMap((placement) => [placement.company, placement.role]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(filters.search);

      return (
        matchesCourse &&
        matchesQualification &&
        matchesDate &&
        matchesInstitution &&
        matchesCompany &&
        matchesSearch
      );
    });

const buildInstitutionRows = (placementRows) =>
  Object.values(
    placementRows.reduce((accumulator, row) => {
      if (!accumulator[row.institution]) {
        accumulator[row.institution] = {
          institution: row.institution,
          trainees: 0,
          placed: 0,
          packages: [],
          topCompany: "-",
        };
      }

      const group = accumulator[row.institution];
      group.trainees += 1;
      if (row.status === "PLACED") {
        group.placed += 1;
      }
      group.packages.push(row.package || 0);
      if (group.topCompany === "-" || row.package >= Math.max(...group.packages)) {
        group.topCompany = row.company;
      }

      return accumulator;
    }, {})
  ).map((group) => ({
    institution: group.institution,
    trainees: group.trainees,
    placed: group.placed,
    averagePackage: group.packages.length
      ? Math.round(group.packages.reduce((sum, value) => sum + value, 0) / group.packages.length)
      : 0,
    topCompany: group.topCompany,
  }));

const buildCountItems = (rows, key) =>
  Object.entries(
    rows.reduce((accumulator, row) => {
      const label = row[key];
      if (!label || label === "-") return accumulator;
      accumulator[label] = (accumulator[label] || 0) + 1;
      return accumulator;
    }, {})
  )
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);

const buildStatusItems = (rows) =>
  Object.entries(
    rows.reduce((accumulator, row) => {
      const label = row.statusLabel || formatStatus(row.status);
      accumulator[label] = (accumulator[label] || 0) + 1;
      return accumulator;
    }, {})
  )
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);

const buildSalaryTrendItems = (rows) =>
  Array.from({ length: 6 }, (_, index) => {
    const entries = rows
      .map((row) => row.salaryEntries[index])
      .filter((entry) => entry && Number.isFinite(entry.salary) && entry.salary > 0);

    const average = entries.length
      ? Math.round(entries.reduce((sum, entry) => sum + entry.salary, 0) / entries.length)
      : 0;

    const fallbackLabel = `${index + 1}${index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"} Month`;
    const label = entries.find((entry) => entry.month && entry.month !== "-")?.month || fallbackLabel;

    return { label, value: average };
  }).filter((item) => item.value > 0 || item.label);

const buildAverageSalaryItems = (rows) => {
  const salaryValues = rows.flatMap((row) =>
    row.salaryEntries.map((entry) => entry.salary).filter((value) => value > 0)
  );
  const average = salaryValues.length
    ? Math.round(salaryValues.reduce((sum, value) => sum + value, 0) / salaryValues.length)
    : 0;

  return average ? [{ label: "Average 6-month salary", value: average }] : [];
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const getTopItem = (items) => items[0] || { label: "-", value: 0 };

const buildSummary = (reportType, traineeRows, placementRows, institutionRows, skillRows) => {
  if (reportType === "skill-placement") {
    const placedCount = skillRows.filter((row) => row.status === "PLACED").length;
    const salaryValues = skillRows.flatMap((row) => row.salaryEntries.map((entry) => entry.salary).filter((value) => value > 0));
    const averageSalary = salaryValues.length
      ? Math.round(salaryValues.reduce((sum, value) => sum + value, 0) / salaryValues.length)
      : 0;

    const growthRows = skillRows
      .map((row) => {
        const numericEntries = row.salaryEntries.filter((entry) => entry.salary > 0);
        if (numericEntries.length < 2) {
          return null;
        }

        return {
          row,
          growth: numericEntries[numericEntries.length - 1].salary - numericEntries[0].salary,
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.growth - left.growth);

    const topGrowth = growthRows[0];
    const topCompany = getTopItem(buildCountItems(skillRows, "company"));
    const topInstitution = getTopItem(buildCountItems(skillRows, "institution"));

    return {
      totalRecords: skillRows.length,
      placedCount,
      averagePackage: averageSalary,
      topLabel: topCompany.label,
      topLabelCaption: "Top hiring company",
      cards: [
        {
          label: "Total Skill Candidates Placed",
          value: String(placedCount),
          subtext: "Skill department candidates with confirmed placement outcomes",
        },
        {
          label: "Average Salary (6 months)",
          value: formatCurrency(averageSalary),
          subtext: "Average take-home salary across tracked monthly entries",
        },
        {
          label: "Highest Salary Growth",
          value: formatCurrency(topGrowth?.growth || 0),
          subtext: topGrowth
            ? `${topGrowth.row.trainee} · ${topGrowth.row.company}`
            : "No multi-month salary growth data yet",
        },
        {
          label: "Top Hiring Company",
          value: topCompany.label,
          subtext: `${topCompany.value} skill placement record${topCompany.value === 1 ? "" : "s"}`,
        },
        {
          label: "Top Institution",
          value: topInstitution.label,
          subtext: `${topInstitution.value} skill placement record${topInstitution.value === 1 ? "" : "s"}`,
        },
      ],
    };
  }

  if (reportType === "institution") {
    const topInstitution = getTopItem(
      institutionRows.map((row) => ({ label: row.institution, value: row.placed }))
    );
    const topCompany = getTopItem(buildCountItems(placementRows, "company"));
    const averagePackage = placementRows.length
      ? Math.round(placementRows.reduce((sum, row) => sum + row.package, 0) / placementRows.length)
      : 0;
    const placedCount = placementRows.filter((row) => row.status === "PLACED").length;

    return {
      totalRecords: institutionRows.length,
      placedCount,
      averagePackage,
      topLabel: topInstitution.label,
      topLabelCaption: "Top institution",
      cards: [
        {
          label: "Institutions Covered",
          value: String(institutionRows.length),
          subtext: "Partner institutions represented in this report",
        },
        {
          label: "Placed Candidates",
          value: String(placedCount),
          subtext: "Confirmed placements across visible institutions",
        },
        {
          label: "Average Package",
          value: formatCurrency(averagePackage),
          subtext: "Average offer value across visible placement rows",
        },
        {
          label: "Top Institution",
          value: topInstitution.label,
          subtext: `${topInstitution.value} placed candidate${topInstitution.value === 1 ? "" : "s"}`,
        },
        {
          label: "Top Hiring Company",
          value: topCompany.label,
          subtext: `${topCompany.value} placement record${topCompany.value === 1 ? "" : "s"}`,
        },
      ],
    };
  }

  if (reportType === "placement") {
    const placedCount = placementRows.filter((row) => row.status === "PLACED").length;
    const averagePackage = placementRows.length
      ? Math.round(placementRows.reduce((sum, row) => sum + row.package, 0) / placementRows.length)
      : 0;
    const topCompany = getTopItem(buildCountItems(placementRows, "company"));
    const topInstitution = getTopItem(buildCountItems(placementRows, "institution"));

    return {
      totalRecords: placementRows.length,
      placedCount,
      averagePackage,
      topLabel: topCompany.label,
      topLabelCaption: "Top company",
      cards: [
        {
          label: "Total Placement Records",
          value: String(placementRows.length),
          subtext: "Placement entries currently visible in this report",
        },
        {
          label: "Placed Candidates",
          value: String(placedCount),
          subtext: "Confirmed candidate outcomes",
        },
        {
          label: "Average Package",
          value: formatCurrency(averagePackage),
          subtext: "Across visible placement rows",
        },
        {
          label: "Top Hiring Company",
          value: topCompany.label,
          subtext: `${topCompany.value} placement record${topCompany.value === 1 ? "" : "s"}`,
        },
        {
          label: "Top Institution",
          value: topInstitution.label,
          subtext: `${topInstitution.value} placement record${topInstitution.value === 1 ? "" : "s"}`,
        },
      ],
    };
  }

  const placementReady = traineeRows.filter((row) => row.latestPlacement).length;
  const topCourse = getTopItem(buildCountItems(traineeRows, "course"));
  const topDistrict = getTopItem(buildCountItems(traineeRows, "district"));
  const averagePackage = placementRows.length
    ? Math.round(placementRows.reduce((sum, row) => sum + row.package, 0) / placementRows.length)
    : 0;

  return {
    totalRecords: traineeRows.length,
    placedCount: placementReady,
    averagePackage,
    topLabel: topCourse.label,
    topLabelCaption: "Top course",
    cards: [
      {
        label: "Total Trainees",
        value: String(traineeRows.length),
        subtext: "Visible trainee records in the current report view",
      },
      {
        label: "Placement Ready",
        value: String(placementReady),
        subtext: "Trainees already linked to placement records",
      },
      {
        label: "Average Package",
        value: formatCurrency(averagePackage),
        subtext: "Average offer value across linked placements",
      },
      {
        label: "Top Course",
        value: topCourse.label,
        subtext: `${topCourse.value} trainee record${topCourse.value === 1 ? "" : "s"}`,
      },
      {
        label: "Top District",
        value: topDistrict.label,
        subtext: `${topDistrict.value} trainee record${topDistrict.value === 1 ? "" : "s"}`,
      },
    ],
  };
};

const buildChartPanels = (reportType, traineeRows, placementRows, institutionRows, skillRows) => {
  if (reportType === "skill-placement") {
    return [
      {
        title: "Salary Growth Trend",
        items: buildSalaryTrendItems(skillRows),
        formatter: "currency",
        emptyText: "No monthly salary data available.",
      },
      {
        title: "Average 6-month Salary",
        items: buildAverageSalaryItems(skillRows),
        formatter: "currency",
        emptyText: "No salary entries available.",
      },
      {
        title: "Company-wise Hiring Count",
        items: buildCountItems(skillRows, "company").slice(0, 6),
        emptyText: "No company hiring distribution available.",
      },
      {
        title: "Institution-wise Skill Placement Chart",
        items: buildCountItems(skillRows, "institution").slice(0, 6),
        emptyText: "No institution placement distribution available.",
      },
    ];
  }

  if (reportType === "institution") {
    return [
      {
        title: "Institution Placement Spread",
        items: institutionRows.map((row) => ({ label: row.institution, value: row.placed })).slice(0, 6),
        emptyText: "No institution placement spread available.",
      },
      {
        title: "Company-wise Hiring Count",
        items: buildCountItems(placementRows, "company").slice(0, 6),
        emptyText: "No hiring company distribution available.",
      },
      {
        title: "Course Distribution",
        items: buildCountItems(placementRows, "course").slice(0, 6),
        emptyText: "No course distribution available.",
      },
      {
        title: "Status Distribution",
        items: buildStatusItems(placementRows).slice(0, 6),
        emptyText: "No status distribution available.",
      },
    ];
  }

  if (reportType === "placement") {
    return [
      {
        title: "Status Distribution",
        items: buildStatusItems(placementRows).slice(0, 6),
        emptyText: "No placement status data available.",
      },
      {
        title: "Course Distribution",
        items: buildCountItems(placementRows, "course").slice(0, 6),
        emptyText: "No course distribution available.",
      },
      {
        title: "Company-wise Hiring Count",
        items: buildCountItems(placementRows, "company").slice(0, 6),
        emptyText: "No company hiring distribution available.",
      },
      {
        title: "Institution-wise Placement Chart",
        items: buildCountItems(placementRows, "institution").slice(0, 6),
        emptyText: "No institution placement distribution available.",
      },
    ];
  }

  return [
    {
      title: "Course Distribution",
      items: buildCountItems(traineeRows, "course").slice(0, 6),
      emptyText: "No course distribution available.",
    },
    {
      title: "Qualification Distribution",
      items: buildCountItems(traineeRows, "qualification").slice(0, 6),
      emptyText: "No qualification distribution available.",
    },
    {
      title: "Status Distribution",
      items: buildStatusItems(placementRows).slice(0, 6),
      emptyText: "No status distribution available.",
    },
    {
      title: "Institution-wise Placement Chart",
      items: buildCountItems(placementRows, "institution").slice(0, 6),
      emptyText: "No institution placement distribution available.",
    },
  ];
};

const buildTable = (reportType, traineeRows, placementRows, institutionRows, skillRows) => {
  if (reportType === "institution") {
    return {
      columns: [
        { key: "institution", label: "Institution" },
        { key: "trainees", label: "Records" },
        { key: "placed", label: "Placed" },
        { key: "averagePackage", label: "Average Package", format: "currency" },
        { key: "topCompany", label: "Top Company" },
      ],
      rows: institutionRows,
    };
  }

  if (reportType === "placement") {
    return {
      columns: [
        { key: "candidateCode", label: "Candidate ID" },
        { key: "trainee", label: "Trainee" },
        { key: "course", label: "Course" },
        { key: "institution", label: "Institution" },
        { key: "company", label: "Company" },
        { key: "role", label: "Role" },
        { key: "package", label: "Package", format: "currency" },
        { key: "status", label: "Status", format: "status" },
        { key: "dateOfJoining", label: "Date of Joining", format: "date" },
      ],
      rows: placementRows,
    };
  }

  if (reportType === "skill-placement") {
    return {
      columns: [
        { key: "candidateCode", label: "Candidate ID" },
        { key: "trainee", label: "Trainee Name" },
        { key: "course", label: "Course" },
        { key: "company", label: "Company" },
        { key: "role", label: "Role" },
        { key: "month1Name", label: "1st Month" },
        { key: "month1Salary", label: "Salary", format: "currency" },
        { key: "month2Name", label: "2nd Month" },
        { key: "month2Salary", label: "Salary", format: "currency" },
        { key: "month3Name", label: "3rd Month" },
        { key: "month3Salary", label: "Salary", format: "currency" },
        { key: "month4Name", label: "4th Month" },
        { key: "month4Salary", label: "Salary", format: "currency" },
        { key: "month5Name", label: "5th Month" },
        { key: "month5Salary", label: "Salary", format: "currency" },
        { key: "month6Name", label: "6th Month" },
        { key: "month6Salary", label: "Salary", format: "currency" },
      ],
      rows: skillRows,
    };
  }

  return {
    columns: [
      { key: "candidateCode", label: "Candidate ID" },
      { key: "name", label: "Name" },
      { key: "fatherName", label: "Father Name" },
      { key: "qualification", label: "Qualification" },
      { key: "course", label: "Course" },
      { key: "mobile", label: "Mobile" },
      { key: "email", label: "Email" },
      { key: "city", label: "City" },
      { key: "district", label: "District" },
    ],
    rows: traineeRows,
  };
};

const getAdminReports = async ({ reportType, course, qualification, dateOfJoining, institution, company, search }) => {
  const normalizedType = normalizeReportType(reportType);
  const normalizedDate = normalizeDate(dateOfJoining);
  const normalizedFilters = {
    course: normalizeString(course),
    qualification: normalizeString(qualification),
    dateOfJoining: normalizedDate,
    institution: normalizeString(institution),
    company: normalizeString(company),
    search: normalizeLower(search),
  };

  const students = await prisma.student.findMany({
    include: {
      placements: {
        include: {
          institution: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const placementRows = buildPlacementRows(students).filter((row) => matchesCommonFilters(row, normalizedFilters));
  const traineeRows = buildTraineeRows(students, placementRows, normalizedFilters);
  const institutionRows = buildInstitutionRows(placementRows);
  const skillRows = placementRows.filter((row) => row.isSkillDepartmentYes);

  return {
    reportType: normalizedType,
    options: {
      reportTypes: [
        { value: "trainee", label: "Trainee Details" },
        { value: "placement", label: "Placement Details" },
        { value: "institution", label: "Institution Summary" },
        { value: "skill-placement", label: "Skill Placement Details" },
      ],
      courses: uniqueSorted(students.map((student) => student.course)),
      qualifications: uniqueSorted(students.map((student) => safeObject(student.profileData).education?.education)),
      institutions: uniqueSorted(buildPlacementRows(students).map((row) => row.institution)),
      companies: uniqueSorted(buildPlacementRows(students).map((row) => row.company)),
    },
    summary: buildSummary(normalizedType, traineeRows, placementRows, institutionRows, skillRows),
    charts: {
      statusDistribution: buildStatusItems(
        normalizedType === "skill-placement" ? skillRows : normalizedType === "trainee" ? placementRows : placementRows
      ),
      courseDistribution: buildCountItems(
        normalizedType === "skill-placement" ? skillRows : normalizedType === "placement" ? placementRows : traineeRows,
        "course"
      ),
      institutionDistribution: buildCountItems(
        normalizedType === "institution" ? institutionRows.map((row) => ({ institution: row.institution })) : normalizedType === "skill-placement" ? skillRows : placementRows,
        "institution"
      ),
      companyDistribution: buildCountItems(
        normalizedType === "skill-placement" ? skillRows : placementRows,
        "company"
      ),
      salaryGrowthTrend: buildSalaryTrendItems(skillRows),
      panels: buildChartPanels(normalizedType, traineeRows, placementRows, institutionRows, skillRows),
    },
    table: buildTable(normalizedType, traineeRows, placementRows, institutionRows, skillRows),
    export: {
      generatedAt: new Date().toISOString(),
      totalRows:
        normalizedType === "institution"
          ? institutionRows.length
          : normalizedType === "placement"
          ? placementRows.length
          : normalizedType === "skill-placement"
          ? skillRows.length
          : traineeRows.length,
    },
  };
};

module.exports = {
  getAdminReports,
};
