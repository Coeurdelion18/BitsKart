const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true}, //hashed
    role: { type: String, enum: ["customer", "retailer", "wholesaler"], default: "customer"}
})

module.exports = mongoose.model("User", userSchema);