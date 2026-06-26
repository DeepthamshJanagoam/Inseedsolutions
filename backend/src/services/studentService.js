const bcrypt = require("bcrypt");

const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");

const listStudents = async () =>
  prisma.student.findMany({
    include: {
      placements: {
        include: {
          institution: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

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
  updateStudent,
};
