const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken } = require("../utils/jwt");

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || "Tester"
    });

    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token: signToken(user._id)
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token: signToken(user._id)
    });
  } catch (err) {
    next(err);
  }
}

async function profile(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, profile };
