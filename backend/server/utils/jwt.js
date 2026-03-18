const jwt = require("jsonwebtoken");

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "change_me", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

module.exports = { signToken };
