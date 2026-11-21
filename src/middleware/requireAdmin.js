const { ForbiddenError } = require("../errors/AppError");

function requireAdmin(req, _res, next) {
  if (req.user?.role !== "ADMIN") {
    return next(new ForbiddenError("Administrator role required"));
  }

  next();
}

module.exports = requireAdmin;
