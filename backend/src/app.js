const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const path = require("path");
const rateLimit = require("express-rate-limit");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), override: true });

const apiRoutes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const requestLogger = require("./middleware/requestLogger");
const { galleryImageDirectory } = require("./middleware/upload");

const app = express();
const configuredOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const localOrigins = [
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5500",
  "null",
];

const allowedOrigins = new Set([...configuredOrigins, ...localOrigins]);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: false,
  })
);
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/gallery-images", express.static(galleryImageDirectory));
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use("/api", apiLimiter, apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
