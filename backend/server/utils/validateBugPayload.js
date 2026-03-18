function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateBugPayload(payload = {}) {
  const errors = {};

  if (normalize(payload.title).length < 5) {
    errors.title = "Title must be at least 5 characters.";
  }

  if (normalize(payload.description).length < 15) {
    errors.description = "Description must be at least 15 characters.";
  }

  if (normalize(payload.stepsToReproduce).length < 10) {
    errors.stepsToReproduce = "Add at least one clear reproduction step.";
  }

  if (normalize(payload.expectedResult).length < 3) {
    errors.expectedResult = "Expected result is required.";
  }

  if (normalize(payload.actualResult).length < 3) {
    errors.actualResult = "Actual result is required.";
  }

  return errors;
}

module.exports = { validateBugPayload };
