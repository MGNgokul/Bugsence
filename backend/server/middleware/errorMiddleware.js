const ErrorLog = require("../models/ErrorLog");

function notFound(req, res, _next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

async function errorHandler(err, req, res, _next) {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  try {
    await ErrorLog.create({
      route: req.originalUrl,
      method: req.method,
      message: err.message,
      stack: err.stack,
      statusCode
    });
  } catch (_logErr) {
    // Avoid masking original errors.
  }

  res.status(statusCode).json({
    message: err.message || "Internal server error"
  });
}

module.exports = { notFound, errorHandler };
