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

export function validateBugForm(form) {
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

  return errors;
}
