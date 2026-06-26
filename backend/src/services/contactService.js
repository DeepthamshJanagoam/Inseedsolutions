const prisma = require("../prisma/client");
const { sendContactInquiryEmail } = require("./mailService");

const createContactSubmission = async (payload) => {
  const submission = await prisma.contactSubmission.create({
    data: payload,
  });

  await sendContactInquiryEmail(payload);

  return submission;
};

module.exports = {
  createContactSubmission,
};
