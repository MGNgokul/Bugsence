export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export function isStrongPassword(password) {
  return typeof password === "string" && password.trim().length >= 6;
}

export function isValidName(name) {
  return typeof name === "string" && name.trim().length >= 2;
}

export function isValidRole(role) {
  return ["Admin", "Developer", "Tester"].includes(role);
}

export function hasTrackedVersion(value, trackedVersions = []) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) return true;

  const normalizedVersions = trackedVersions
    .map((item) => (typeof item === "string" ? item : item?.version))
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (normalizedVersions.length === 0) return true;

  return normalizedVersions.includes(normalizedValue);
}

export function validateBugForm(form, trackedVersions = []) {
  const errors = {};

  if (!form.title || form.title.trim().length < 5) {
    errors.title = "Title must be at least 5 characters.";
  }

  if (!form.description || form.description.trim().length < 15) {
    errors.description = "Description must be at least 15 characters.";
  }

  if (!form.stepsToReproduce || form.stepsToReproduce.trim().length < 10) {
    errors.stepsToReproduce = "Add at least one clear reproduction step.";
  }

  if (!form.expectedResult || form.expectedResult.trim().length < 3) {
    errors.expectedResult = "Expected result is required.";
  }

  if (!form.actualResult || form.actualResult.trim().length < 3) {
    errors.actualResult = "Actual result is required.";
  }

  if (!hasTrackedVersion(form.versionIntroduced, trackedVersions)) {
    errors.versionIntroduced = "Version introduced must match a tracked version.";
  }

  if (!hasTrackedVersion(form.versionFixed, trackedVersions)) {
    errors.versionFixed = "Version fixed must match a tracked version.";
  }

  return errors;
}

export function validateVersionForm(form) {
  const errors = {};
  const version = String(form.version || "").trim();
  const changes = String(form.changes || "").trim();
  const releaseDate = String(form.releaseDate || "").trim();

  if (!version) {
    errors.version = "Version name is required.";
  } else if (version.length > 50) {
    errors.version = "Version name must be 50 characters or fewer.";
  }

  if (releaseDate && Number.isNaN(new Date(releaseDate).getTime())) {
    errors.releaseDate = "Release date must be a valid date.";
  }

  if (changes.length > 2000) {
    errors.changes = "Release notes must be 2000 characters or fewer.";
  }

  return errors;
}
