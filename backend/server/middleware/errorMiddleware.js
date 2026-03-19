const ErrorLog = require("../models/ErrorLog");

function notFound(req, res, _next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

async function errorHandler(err, req, res, _next) {
  const uploadErrorMessage =
    err?.name === "MulterError"
      ? err.code === "LIMIT_FILE_SIZE"
        ? "Attachment files must be 10 MB or smaller."
        : err.message
      : "";
  const explicitStatus =
    err?.name === "MulterError" || String(err?.message || "").startsWith("Unsupported attachment type") ? 400 : null;
  const statusCode = explicitStatus || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  const responseMessage = uploadErrorMessage || err.message || "Internal server error";

  try {
    await ErrorLog.create({
      route: req.originalUrl,
      method: req.method,
      message: responseMessage,
      stack: err.stack,
      statusCode
    });
  } catch (_logErr) {
    // Avoid masking original errors.
  }

  res.status(statusCode).json({
    message: responseMessage
  });
}

module.exports = { notFound, errorHandler };
