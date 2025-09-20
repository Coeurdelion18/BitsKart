const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors"); //cors allow to bridge different ports
require("dotenv").config()
const authRoutes = require("./routes/authRoutes");

const app = express();

//--Middleware--
app.use(cors()); // Use cors to allow frontend requests
app.use(express.json()); // Allow the server to accept JSON data in requests

//---Routes---
// Tell the app to use the authRoutes for any request to "/api/auth"
app.use("/api/auth", authRoutes);

// ---Database Connection---
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/bitskart";
mongoose
    .connect(MONGO_URL)
    .then(() => "MongoDB connected")
    .catch((err) => console.error(error));

//Start the Server
 const PORT = process.env.PORT || 5000;
 app.listen(PORT, () => console.log("Server started on http://localhost:" + PORT));