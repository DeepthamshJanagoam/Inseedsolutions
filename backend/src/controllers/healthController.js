const healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is healthy",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  healthCheck,
};
