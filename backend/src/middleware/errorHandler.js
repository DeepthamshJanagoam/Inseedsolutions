const ApiError = require("../utils/apiError");

const errorHandler = (error, req, res, next) => {
  const isUploadValidationError =
    error?.code === "LIMIT_FILE_SIZE" ||
    /Only PDF files are allowed for MOU upload|Only the allowed PDF, JPG, and PNG trainee document formats|Only JPG, JPEG, PNG, and WEBP images are allowed/i.test(
      error?.message || ""
    );

  const statusCode = error instanceof ApiError ? error.statusCode : error.statusCode || (isUploadValidationError ? 400 : 500);
  const message =
    statusCode === 500
      ? "We could not complete that request right now. Please try again after the server is configured."
      : error.message || "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(error.details ? { details: error.details } : {}),
  });
};

module.exports = errorHandler;
