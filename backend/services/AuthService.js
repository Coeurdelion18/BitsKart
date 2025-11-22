//Contains logic for login

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserRepository = require("../repositories/UserRepository");

class AuthService {
    async login(email, password){
        const user = await UserRepository.findByEmail(email);
        if(!user) throw new Error("User Not Found");

        const isMatch = await bycrypt.compare(password, user.password);
        if(!isMatch) throw new Error("Invalid Credentials");

        const token = jwt.sign(
            {id: user._id, role: user.role},
            process.env.JWT_SECRET,
            {expiresIn: "1h"}
        );

        return { token, user: {id: user._id, email: user.email, role: user.role}}
    }
}

module.exports = new AuthService();