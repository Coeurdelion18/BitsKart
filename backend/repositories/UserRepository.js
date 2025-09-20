const User = require("../models/User");

class UserRepository{
    async findByEmail(email) {
        return await User.findOne({email});
    }
}

module.exports = new UserRepository();