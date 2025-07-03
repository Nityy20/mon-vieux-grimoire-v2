const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const authRoutes = require("./routes/auth");
const bookRoutes = require("./routes/book");

const app = express();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connexion à MongoDB réussie !"))
  .catch((err) => console.error("❌ Connexion à MongoDB échouée :", err));

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  next();
});

app.use(
  "/" + process.env.MEDIA_FOLDER,
  express.static(path.join(__dirname, process.env.MEDIA_FOLDER))
);

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);

module.exports = app;
