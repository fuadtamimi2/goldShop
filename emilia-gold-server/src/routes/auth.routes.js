const express = require("express");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const asyncHandler = require("../utils/asyncHandler");
const protect = require("../middleware/auth");

const router = express.Router();



// LOGIN

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Email and password required");
    }

    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const token = generateToken(user);

    res.json({
      message: "Login success",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
      },
    });
  })
);



// GET CURRENT USER

router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    res.json({
      user: req.user,
    });
  })
);

module.exports = router;