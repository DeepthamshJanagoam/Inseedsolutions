const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), override: true });

const bcrypt = require("bcrypt");
const { PrismaClient, AdminRole, InstitutionType, PlacementStatus } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin@123", 12);
  const studentPasswordHash = await bcrypt.hash("Student@123", 12);

  await prisma.contactSubmission.deleteMany();
  await prisma.placement.deleteMany();
  await prisma.partnershipAgreement.deleteMany();
  await prisma.student.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.admin.deleteMany();

  await prisma.admin.createMany({
    data: [
      {
        name: "Aarav Menon",
        email: "admin@inseedsolutions.com",
        passwordHash: adminPasswordHash,
        role: AdminRole.ADMIN,
        isActive: true,
        mustChangePassword: false,
      },
      {
        name: "Nisha Reddy",
        email: "operations@inseedsolutions.com",
        passwordHash: adminPasswordHash,
        role: AdminRole.ADMIN,
        isActive: true,
        mustChangePassword: false,
      },
      {
        name: "Kiran Trainee",
        email: "trainee.operator@inseedsolutions.com",
        passwordHash: adminPasswordHash,
        role: AdminRole.TRAINEE_OPERATOR,
        isActive: true,
        mustChangePassword: true,
      },
      {
        name: "Vikram Placement",
        email: "placement.operator@inseedsolutions.com",
        passwordHash: adminPasswordHash,
        role: AdminRole.PLACEMENT_OPERATOR,
        isActive: true,
        mustChangePassword: true,
      },
    ],
  });

  const institutions = await Promise.all([
    prisma.institution.create({
      data: {
        name: "New Science Degree College",
        location: "Hanamkonda, Telangana",
        type: InstitutionType.COLLEGE,
        website: "https://newscience.example.edu",
      },
    }),
    prisma.institution.create({
      data: {
        name: "Samatha Educational Society",
        location: "Hyderabad, Telangana",
        type: InstitutionType.COLLEGE,
        website: "https://samatha.example.edu",
      },
    }),
    prisma.institution.create({
      data: {
        name: "Sri Veenadhari Educational Society",
        location: "Hyderabad, Telangana",
        type: InstitutionType.TRAINING_CENTER,
        website: "https://sve.example.edu",
      },
    }),
    prisma.institution.create({
      data: {
        name: "Rural Development Foundation",
        location: "Hyderabad, Telangana",
        type: InstitutionType.FOUNDATION,
        website: "https://rdf.example.org",
      },
    }),
  ]);

  const students = await Promise.all([
    prisma.student.create({
      data: {
        candidateCode: "TRN-1001",
        fullName: "Ravi Kumar",
        email: "ravi.kumar@example.com",
        phone: "+91 98765 00001",
        course: "Java, Data Structures",
        profileData: {
          basicInfo: {
            candidateId: "TRN-1001",
            fullName: "Ravi Kumar",
            fatherName: "Suresh Kumar",
            motherName: "Lakshmi Kumar",
            mobileNumber: "+91 98765 00001",
            email: "ravi.kumar@example.com",
            dateOfBirth: "2001-08-15",
          },
          education: {
            course: "Java, Data Structures",
            education: "B.Tech",
            religion: "Hindu",
            category: "General",
            disability: false,
            disabilityType: "",
          },
          bank: {
            accountNumber: "12345678901",
            bankName: "State Bank of India",
            branch: "Hanamkonda",
            ifscCode: "SBIN0001234",
          },
          address: {
            city: "Hanamkonda",
            mandal: "Hanamkonda",
            district: "Warangal",
            state: "Telangana",
            pincode: "506001",
          },
          training: {
            assessmentStatus: "Completed",
            ojtConfirmation: true,
            ojtCompletion: "2026-01-05",
          },
          placement: {},
          salary: [],
        },
        passwordHash: studentPasswordHash,
      },
    }),
    prisma.student.create({
      data: {
        candidateCode: "TRN-1002",
        fullName: "Sita Reddy",
        email: "sita.reddy@example.com",
        phone: "+91 98765 00002",
        course: "Python, Web Development",
        profileData: {
          basicInfo: {
            candidateId: "TRN-1002",
            fullName: "Sita Reddy",
            fatherName: "Ramesh Reddy",
            motherName: "Anitha Reddy",
            mobileNumber: "+91 98765 00002",
            email: "sita.reddy@example.com",
            dateOfBirth: "2001-11-03",
          },
          education: {
            course: "Python, Web Development",
            education: "B.Sc",
            religion: "Hindu",
            category: "OBC",
            disability: false,
            disabilityType: "",
          },
          bank: {
            accountNumber: "22345678901",
            bankName: "HDFC Bank",
            branch: "Hyderabad",
            ifscCode: "HDFC0002345",
          },
          address: {
            city: "Hyderabad",
            mandal: "Uppal",
            district: "Medchal",
            state: "Telangana",
            pincode: "500039",
          },
          training: {
            assessmentStatus: "Completed",
            ojtConfirmation: true,
            ojtCompletion: "2026-01-12",
          },
          placement: {},
          salary: [],
        },
        passwordHash: studentPasswordHash,
      },
    }),
    prisma.student.create({
      data: {
        candidateCode: "TRN-1003",
        fullName: "Ajay Singh",
        email: "ajay.singh@example.com",
        phone: "+91 98765 00003",
        course: "Angular, Node.js",
        profileData: {
          basicInfo: {
            candidateId: "TRN-1003",
            fullName: "Ajay Singh",
            fatherName: "Mahesh Singh",
            motherName: "Kavita Singh",
            mobileNumber: "+91 98765 00003",
            email: "ajay.singh@example.com",
            dateOfBirth: "2000-12-21",
          },
          education: {
            course: "Angular, Node.js",
            education: "B.Tech",
            religion: "Sikh",
            category: "General",
            disability: false,
            disabilityType: "",
          },
          bank: {
            accountNumber: "32345678901",
            bankName: "ICICI Bank",
            branch: "Secunderabad",
            ifscCode: "ICIC0003456",
          },
          address: {
            city: "Secunderabad",
            mandal: "Malkajgiri",
            district: "Medchal",
            state: "Telangana",
            pincode: "500047",
          },
          training: {
            assessmentStatus: "Completed",
            ojtConfirmation: false,
            ojtCompletion: "",
          },
          placement: {},
          salary: [],
        },
        passwordHash: studentPasswordHash,
      },
    }),
    prisma.student.create({
      data: {
        candidateCode: "TRN-1004",
        fullName: "Meera Sharma",
        email: "meera.sharma@example.com",
        phone: "+91 98765 00004",
        course: "UI/UX, React",
        profileData: {
          basicInfo: {
            candidateId: "TRN-1004",
            fullName: "Meera Sharma",
            fatherName: "Vikram Sharma",
            motherName: "Nidhi Sharma",
            mobileNumber: "+91 98765 00004",
            email: "meera.sharma@example.com",
            dateOfBirth: "2001-05-09",
          },
          education: {
            course: "UI/UX, React",
            education: "B.Des",
            religion: "Hindu",
            category: "General",
            disability: false,
            disabilityType: "",
          },
          bank: {
            accountNumber: "42345678901",
            bankName: "Axis Bank",
            branch: "Hyderabad",
            ifscCode: "UTIB0004567",
          },
          address: {
            city: "Hyderabad",
            mandal: "Ghatkesar",
            district: "Medchal",
            state: "Telangana",
            pincode: "501301",
          },
          training: {
            assessmentStatus: "In Progress",
            ojtConfirmation: false,
            ojtCompletion: "",
          },
          placement: {},
          salary: [],
        },
        passwordHash: studentPasswordHash,
      },
    }),
  ]);

  await prisma.placement.createMany({
    data: [
      {
        studentId: students[0].id,
        institutionId: institutions[0].id,
        companyName: "Infosys",
        role: "Software Engineer Trainee",
        package: 600000,
        placementDate: new Date("2026-02-12"),
        status: PlacementStatus.PLACED,
        details: {
          basicInfo: {
            candidateId: "TRN-1001",
            fullName: "Ravi Kumar",
            mobileNumber: "+91 98765 00001",
            email: "ravi.kumar@example.com",
          },
          training: {
            assessmentStatus: "Completed",
            ojtConfirmation: true,
            ojtCompletion: "2026-01-05",
          },
          placement: {
            skillDepartment: "Yes",
            companyName: "Infosys",
            role: "Software Engineer Trainee",
            package: 600000,
            dateOfJoining: "2026-02-12",
            status: "PLACED",
          },
          salary: [
            { month: "February 2026", salary: "50000" },
            { month: "March 2026", salary: "52000" },
            { month: "April 2026", salary: "54000" },
            { month: "May 2026", salary: "56000" },
            { month: "June 2026", salary: "58000" },
          ],
        },
      },
      {
        studentId: students[1].id,
        institutionId: institutions[1].id,
        companyName: "TCS",
        role: "Associate Developer",
        package: 550000,
        placementDate: new Date("2026-01-28"),
        status: PlacementStatus.PLACED,
        details: {
          basicInfo: {
            candidateId: "TRN-1002",
            fullName: "Sita Reddy",
            mobileNumber: "+91 98765 00002",
            email: "sita.reddy@example.com",
          },
          training: {
            assessmentStatus: "Completed",
            ojtConfirmation: true,
            ojtCompletion: "2026-01-12",
          },
          placement: {
            skillDepartment: "Yes",
            companyName: "TCS",
            role: "Associate Developer",
            package: 550000,
            dateOfJoining: "2026-01-28",
            status: "PLACED",
          },
          salary: [
            { month: "January 2026", salary: "45833" },
            { month: "February 2026", salary: "47000" },
            { month: "March 2026", salary: "48500" },
            { month: "April 2026", salary: "50000" },
            { month: "May 2026", salary: "52000" },
          ],
        },
      },
      {
        studentId: students[2].id,
        institutionId: institutions[2].id,
        companyName: "Capgemini",
        role: "Analyst",
        package: 700000,
        placementDate: new Date("2026-02-03"),
        status: PlacementStatus.PLACED,
        details: {
          basicInfo: {
            candidateId: "TRN-1003",
            fullName: "Ajay Singh",
            mobileNumber: "+91 98765 00003",
            email: "ajay.singh@example.com",
          },
          training: {
            assessmentStatus: "Completed",
            ojtConfirmation: false,
            ojtCompletion: "",
          },
          placement: {
            skillDepartment: "No",
            companyName: "Capgemini",
            role: "Analyst",
            package: 700000,
            dateOfJoining: "2026-02-03",
            status: "PLACED",
          },
          salary: [{ month: "February 2026", salary: "58333" }],
        },
      },
      {
        studentId: students[3].id,
        institutionId: institutions[3].id,
        companyName: "Wipro",
        role: "Product Design Intern",
        package: 480000,
        placementDate: new Date("2026-03-15"),
        status: PlacementStatus.INTERVIEWING,
        details: {
          basicInfo: {
            candidateId: "TRN-1004",
            fullName: "Meera Sharma",
            mobileNumber: "+91 98765 00004",
            email: "meera.sharma@example.com",
          },
          training: {
            assessmentStatus: "In Progress",
            ojtConfirmation: false,
            ojtCompletion: "",
          },
          placement: {
            skillDepartment: "No",
            companyName: "Wipro",
            role: "Product Design Intern",
            package: 480000,
            dateOfJoining: "2026-03-15",
            status: "INTERVIEWING",
          },
          salary: [{ month: "March 2026", salary: "40000" }],
        },
      },
    ],
  });

  await prisma.contactSubmission.createMany({
    data: [
      {
        name: "Karthik Iyer",
        email: "karthik@bfsiworks.com",
        phone: "+91 99887 00123",
        message: "We need support for campus hiring and placement analytics across two partner institutions.",
      },
      {
        name: "Nandini Rao",
        email: "nandini@talentbridge.io",
        phone: "+91 99887 00456",
        message: "Looking to discuss staffing and skilling collaboration for a regional hiring program.",
      },
    ],
  });

  await prisma.partnershipAgreement.createMany({
    data: [
      {
        name: "New Science Degree College",
        shortCode: "NS",
        tags: ["Campus MOU", "Final-Year CRT"],
        bullets: [
          "Delivers CRT programs for final-year students in Hanamkonda.",
          "Strengthens aptitude, technical, and soft-skill capabilities.",
          "Improves readiness for high-quality placement opportunities.",
        ],
        mouLabel: "View MOU",
        mouUrl: "contact.html",
        summary: "Structured campus recruitment training for final-year students.",
        sortOrder: 1,
        isActive: true,
      },
      {
        name: "Rural Development Foundation",
        shortCode: "RD",
        tags: ["Rural Talent", "Placement Support"],
        bullets: [
          "Runs CRT workshops for RDF-affiliated institutions.",
          "Focuses on aptitude, technical basics, and communication confidence.",
          "Expands access to placement-focused training for rural graduates.",
        ],
        mouLabel: "View MOU",
        mouUrl: "contact.html",
        summary: "Placement-oriented skilling support for rural student communities.",
        sortOrder: 2,
        isActive: true,
      },
      {
        name: "Samatha Educational Society",
        shortCode: "SE",
        tags: ["Skill Bridge", "Career Readiness"],
        bullets: [
          "Builds technical and soft-skill readiness through structured CRT delivery.",
          "Bridges academic knowledge with practical industry expectations.",
          "Supports placement preparation for stronger student outcomes.",
        ],
        mouLabel: "View MOU",
        mouUrl: "contact.html",
        summary: "Career readiness and CRT collaboration aligned to placement outcomes.",
        sortOrder: 3,
        isActive: true,
      },
      {
        name: "Sri Veenadhari Educational Society",
        shortCode: "SV",
        tags: ["Multi-Campus", "Professional Skills"],
        bullets: [
          "Collaborates with Pragathi School of Business Management and Pragathi School of IT.",
          "Develops technical, communication, and placement-facing capabilities.",
          "Prepares students for competitive hiring and professional success.",
        ],
        mouLabel: "View MOU",
        mouUrl: "contact.html",
        summary: "Multi-campus partnership that connects students to professional hiring readiness.",
        sortOrder: 4,
        isActive: true,
      },
    ],
  });

  console.log("Database seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
