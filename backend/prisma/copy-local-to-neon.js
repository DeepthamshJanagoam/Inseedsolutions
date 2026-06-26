const { PrismaClient } = require("@prisma/client");

const localUrl = process.env.LOCAL_DATABASE_URL;
const neonUrl = process.env.NEON_DATABASE_URL;

if (!localUrl || !neonUrl) {
  console.error("LOCAL_DATABASE_URL and NEON_DATABASE_URL are required.");
  process.exit(1);
}

const local = new PrismaClient({ datasources: { db: { url: localUrl } } });
const neon = new PrismaClient({ datasources: { db: { url: neonUrl } } });

const tables = [
  ["admin", "admins"],
  ["student", "students"],
  ["institution", "institutions"],
  ["partnershipAgreement", "partnerships"],
  ["placement", "placements"],
  ["contactSubmission", "contacts"],
];

async function counts(client) {
  const entries = await Promise.all(
    tables.map(async ([model, label]) => [label, await client[model].count()])
  );

  return Object.fromEntries(entries);
}

async function copyModel(model, orderBy = { createdAt: "asc" }) {
  const data = await local[model].findMany({ orderBy });

  if (data.length > 0) {
    await neon[model].createMany({ data, skipDuplicates: true });
  }

  return data.length;
}

async function copyContactSubmissions() {
  const data = await local.$queryRaw`
    SELECT id, name, email, phone, message, "createdAt", "updatedAt"
    FROM "ContactSubmission"
    ORDER BY "createdAt" ASC
  `;

  if (data.length > 0) {
    await neon.contactSubmission.createMany({
      data: data.map((submission) => ({
        ...submission,
        inquiryType: null,
      })),
      skipDuplicates: true,
    });
  }

  return data.length;
}

async function main() {
  const sourceCounts = await counts(local);
  const targetCounts = await counts(neon);

  console.log("Local source counts:", sourceCounts);
  console.log("Neon target counts before copy:", targetCounts);

  const copied = {};
  copied.admins = await copyModel("admin");
  copied.students = await copyModel("student");
  copied.institutions = await copyModel("institution");
  copied.partnerships = await copyModel("partnershipAgreement", { sortOrder: "asc" });
  copied.placements = await copyModel("placement");
  copied.contacts = await copyContactSubmissions();

  console.log("Copied rows:", copied);
  console.log("Neon target counts after copy:", await counts(neon));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await local.$disconnect();
    await neon.$disconnect();
  });
