const bcrypt = require("bcrypt");

const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");

const clampInteger = (value, fallback, { min = 1, max = 100 } = {}) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const buildStudentWhere = ({ search = "", course = "all" } = {}) => {
  const normalizedSearch = String(search || "").trim();
  const normalizedCourse = String(course || "").trim();
  const where = {};

  if (normalizedCourse && normalizedCourse.toLowerCase() !== "all") {
    where.course = normalizedCourse;
  }

  if (normalizedSearch) {
    where.OR = [
      { candidateCode: { contains: normalizedSearch, mode: "insensitive" } },
      { fullName: { contains: normalizedSearch, mode: "insensitive" } },
      { email: { contains: normalizedSearch, mode: "insensitive" } },
      { phone: { contains: normalizedSearch, mode: "insensitive" } },
      { course: { contains: normalizedSearch, mode: "insensitive" } },
    ];
  }

  return where;
};

const buildStudentInclude = () => ({
  placements: {
    include: {
      institution: true,
    },
  },
});

const listStudents = async () =>
  prisma.student.findMany({
    include: buildStudentInclude(),
    orderBy: { createdAt: "desc" },
  });

const listStudentsPaginated = async (query = {}) => {
  const page = clampInteger(query.page, 1, { min: 1, max: 100000 });
  const limit = clampInteger(query.limit, 10, { min: 1, max: 100 });
  const where = buildStudentWhere(query);

  const totalRecords = await prisma.student.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
  const currentPage = Math.min(page, totalPages);
  const skip = (currentPage - 1) * limit;

  const [records, allCourses, totalTrainees, reachableRecords, placementReadyRows] = await Promise.all([
    prisma.student.findMany({
      where,
      include: buildStudentInclude(),
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.student.groupBy({
      by: ["course"],
      _count: { course: true },
      orderBy: { course: "asc" },
    }),
    prisma.student.count(),
    prisma.student.count({
      where: {
        email: { not: "" },
        phone: { not: null },
      },
    }),
    prisma.placement.findMany({
      distinct: ["studentId"],
      select: { studentId: true },
    }),
  ]);

  return {
    records,
    pagination: {
      currentPage,
      totalPages,
      totalRecords,
      limit,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
    filters: {
      courses: allCourses.map((row) => row.course).filter(Boolean),
    },
    metrics: {
      totalTrainees,
      activeCourses: allCourses.filter((row) => row.course).length,
      reachableRecords,
      placementReady: placementReadyRows.length,
    },
  };
};

const createStudent = async ({ password, ...payload }) => {
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.student.create({
    data: {
      ...payload,
      passwordHash,
    },
  });
};

const updateStudent = async (id, payload) => {
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Student not found");
  }

  const data = { ...payload };
  if (payload.password) {
    data.passwordHash = await bcrypt.hash(payload.password, 12);
  }

  delete data.password;

  return prisma.student.update({
    where: { id },
    data,
  });
};

const deleteStudent = async (id) => {
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Student not found");
  }

  await prisma.student.delete({ where: { id } });
  return { deleted: true };
};

const getStudentProfile = async (studentId) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      placements: {
        include: {
          institution: true,
        },
        orderBy: {
          placementDate: "desc",
        },
      },
    },
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  return student;
};

module.exports = {
  createStudent,
  deleteStudent,
  getStudentProfile,
  listStudents,
  listStudentsPaginated,
  updateStudent,
};
