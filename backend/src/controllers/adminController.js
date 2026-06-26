const prisma = require("../prisma/client");

const getAdminOverview = async (req, res) => {
  const [studentCount, institutionCount, placementCount, placedCount, recentContacts, partnershipCount] = await Promise.all([
    prisma.student.count(),
    prisma.institution.count(),
    prisma.placement.count(),
    prisma.placement.count({ where: { status: "PLACED" } }),
    prisma.contactSubmission.count(),
    prisma.partnershipAgreement.count({ where: { isActive: true } }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      admin: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        mustChangePassword: req.user.mustChangePassword,
      },
      metrics: {
        trainees: studentCount,
        institutions: institutionCount,
        placements: placementCount,
        successfulPlacements: placedCount,
        inquiries: recentContacts,
      },
      modules: [
        {
          id: "trainee-enrollment",
          title: "Trainee Enrollment",
          description: "Manage candidate onboarding, profile readiness, and program assignment.",
          action: "Review trainees",
          roles: ["ADMIN", "TRAINEE_OPERATOR"],
        },
        {
          id: "placement-details",
          title: "Placement Details",
          description: "Track company offers, placement status, and package outcomes across institutions.",
          action: "Review placements",
          roles: ["ADMIN", "PLACEMENT_OPERATOR"],
        },
        {
          id: "reports",
          title: "Reports",
          description: "Monitor pipeline trends, hiring outcomes, and partner performance snapshots.",
          action: "View reports",
          roles: ["ADMIN"],
        },
        {
          id: "users",
          title: "Users",
          description: "Administer internal access for operations, coordinators, and support teams.",
          action: "Manage users",
          roles: ["ADMIN"],
        },
        {
          id: "partnerships",
          title: "Partnerships",
          description: "Create, edit, and publish institutional agreement cards for the public partnerships page.",
          action: `Manage ${partnershipCount} agreements`,
          roles: ["ADMIN"],
        },
        {
          id: "gallery",
          title: "Gallery",
          description: "Manage and publish gallery images for the public gallery page.",
          action: "Manage Gallery",
          roles: ["ADMIN"],
        },
      ],
    },
  });
};

module.exports = {
  getAdminOverview,
};
