function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseOptionalDate(value) {
  if (value === undefined || value === null) {
    return { value: null, error: "" };
  }

  const normalized = typeof value === "string" ? value.trim() : value;

  if (normalized === "") {
    return { value: null, error: "" };
  }

  const parsed = normalized instanceof Date ? normalized : new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return { value: null, error: "Release date must be a valid date." };
  }

  return { value: parsed, error: "" };
}

function normalizeVersionPayload(payload = {}) {
  const releaseDate = parseOptionalDate(payload.releaseDate);

  return {
    version: normalizeText(payload.version),
    releaseDate: releaseDate.value,
    releaseDateError: releaseDate.error,
    changes: normalizeText(payload.changes)
  };
}

function validateVersionPayload(payload = {}) {
  const errors = {};

  if (!payload.version) {
    errors.version = "Version name is required.";
  } else if (payload.version.length > 50) {
    errors.version = "Version name must be 50 characters or fewer.";
  }

  if (payload.releaseDateError) {
    errors.releaseDate = payload.releaseDateError;
  }

  if (payload.changes && payload.changes.length > 2000) {
    errors.changes = "Release notes must be 2000 characters or fewer.";
  }

  return errors;
}

function normalizeBugVersionFields(payload = {}) {
  return {
    versionIntroduced: normalizeText(payload.versionIntroduced),
    versionFixed: normalizeText(payload.versionFixed)
  };
}

async function validateTrackedVersionFields(payload = {}) {
  const Version = require("../models/Version");
  const normalized = normalizeBugVersionFields(payload);
  const providedEntries = Object.entries(normalized).filter(([, value]) => value);

  if (providedEntries.length === 0) {
    return {};
  }

  const trackedVersions = await Version.find({
    version: { $in: [...new Set(providedEntries.map(([, value]) => value))] }
  }).select("version");

  const knownVersionNames = new Set(trackedVersions.map((item) => item.version));
  const errors = {};

  for (const [field, value] of providedEntries) {
    if (!knownVersionNames.has(value)) {
      errors[field] = `${field === "versionFixed" ? "Version fixed" : "Version introduced"} must match a tracked version.`;
    }
  }

  return errors;
}

module.exports = {
  normalizeVersionPayload,
  validateVersionPayload,
  normalizeBugVersionFields,
  validateTrackedVersionFields
};
