const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");
const { verifyToken } = require("../utils/jwt");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, "Authorization token is required"));
  }

  try {
    const decoded = verifyToken(token);
    req.auth = decoded;

    if (["ADMIN", "TRAINEE_OPERATOR", "PLACEMENT_OPERATOR"].includes(decoded.role)) {
      req.user = await prisma.admin.findUnique({ where: { id: decoded.id } });
    } else if (decoded.role === "STUDENT") {
      req.user = await prisma.student.findUnique({ where: { id: decoded.id } });
    }

    if (!req.user) {
      return next(new ApiError(401, "Authenticated user no longer exists"));
    }

    if (decoded.role !== "STUDENT" && req.user.isActive === false) {
      return next(new ApiError(403, "Your account is inactive"));
    }

    next();
  } catch (error) {
    next(new ApiError(401, "Invalid or expired token"));
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.auth || !roles.includes(req.auth.role)) {
    return next(new ApiError(403, "You do not have permission to access this resource"));
  }

  next();
};

module.exports = {
  authenticate,
  requireRole,
};
