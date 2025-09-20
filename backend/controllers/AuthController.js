const AuthService = require("../services/AuthService");

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();