const nodemailer = require("nodemailer");

const CONTACT_RECIPIENT = process.env.CONTACT_TO_EMAIL || "hello@inseedsolutions.com";

const getTransportConfig = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP email settings are not configured");
  }

  return {
    host,
    port,
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465,
    auth: {
      user,
      pass,
    },
  };
};

const buildInquiryBody = ({ name, email, phone, inquiryType, message }) =>
  [
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Inquiry Type: ${inquiryType}`,
    "Message:",
    message,
  ].join("\n");

const sendContactInquiryEmail = async (payload) => {
  const transporter = nodemailer.createTransport(getTransportConfig());
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  await transporter.sendMail({
    from: process.env.SMTP_FROM_NAME
      ? `"${process.env.SMTP_FROM_NAME}" <${fromEmail}>`
      : fromEmail,
    to: CONTACT_RECIPIENT,
    replyTo: payload.email,
    subject: `New Website Inquiry - ${payload.inquiryType}`,
    text: buildInquiryBody(payload),
  });
};

module.exports = {
  sendContactInquiryEmail,
};
