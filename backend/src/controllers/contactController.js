const contactService = require("../services/contactService");
const { validateContactPayload } = require("../utils/validators");

const submitContactForm = async (req, res) => {
  const payload = validateContactPayload(req.body);
  const submission = await contactService.createContactSubmission(payload);

  res.status(201).json({
    success: true,
    message: "Thank you. Your inquiry has been sent successfully.",
    data: {
      id: submission.id,
      createdAt: submission.createdAt,
    },
  });
};

module.exports = {
  submitContactForm,
};
