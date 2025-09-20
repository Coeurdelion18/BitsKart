const express = require("express");
const AuthController = require("../controllers/AuthController");

const router = express.Router();

router.post("/login", (req, res, next) => authController.login(req, res, next));

module.exports = router;