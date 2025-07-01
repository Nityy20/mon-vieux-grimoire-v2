const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");
dotenv.config();

const Book = require("./models/Book");
const authRoutes = require("./routes/auth");
const auth = require("./middleware/auth");
const multer = require("./middleware/multer-config");

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

app.post("/api/books", auth, multer, (req, res) => {
  const bookObject = JSON.parse(req.body.book);
  const book = new Book({
    ...bookObject,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get("host")}/${
      process.env.MEDIA_FOLDER
    }/${req.file.filename}`,
    ratings: [],
    averageRating: 0,
  });

  book
    .save()
    .then(() => res.status(201).json({ message: "Livre enregistré !" }))
    .catch((error) => res.status(400).json({ error }));
});

app.get("/api/books", (req, res) => {
  Book.find()
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(400).json({ error }));
});

app.get("/api/books/bestrating", (req, res) => {
  Book.find()
    .sort({ averageRating: -1 })
    .limit(3)
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(400).json({ error }));
});

app.get("/api/books/:id", (req, res) => {
  Book.findById(req.params.id)
    .then((book) => {
      if (!book) return res.status(404).json({ message: "Livre non trouvé" });
      res.status(200).json(book);
    })
    .catch((error) => res.status(400).json({ error }));
});

app.put("/api/books/:id", auth, multer, (req, res) => {
  Book.findById(req.params.id)
    .then((book) => {
      if (!book) return res.status(404).json({ message: "Livre non trouvé" });
      if (book.userId !== req.auth.userId)
        return res
          .status(403)
          .json({ message: "Non autorisé à modifier ce livre" });

      const bookObject = req.file
        ? {
            ...JSON.parse(req.body.book),
            imageUrl: `${req.protocol}://${req.get("host")}/${
              process.env.MEDIA_FOLDER
            }/${req.file.filename}`,
          }
        : { ...req.body };

      Book.updateOne(
        { _id: req.params.id },
        { ...bookObject, _id: req.params.id }
      )
        .then(() => res.status(200).json({ message: "Livre modifié !" }))
        .catch((error) => res.status(400).json({ error }));
    })
    .catch((error) => res.status(400).json({ error }));
});

app.delete("/api/books/:id", auth, (req, res) => {
  Book.findById(req.params.id)
    .then((book) => {
      if (!book) return res.status(404).json({ message: "Livre non trouvé" });
      if (book.userId !== req.auth.userId)
        return res.status(403).json({ message: "Requête non autorisée" });

      const filename = book.imageUrl.split(`/${process.env.MEDIA_FOLDER}/`)[1];
      fs.unlink(`${process.env.MEDIA_FOLDER}/${filename}`, () => {
        Book.deleteOne({ _id: req.params.id })
          .then(() => res.status(200).json({ message: "Livre supprimé !" }))
          .catch((error) => res.status(400).json({ error }));
      });
    })
    .catch((error) => res.status(500).json({ error }));
});

app.post("/api/books/:id/rating", auth, (req, res) => {
  const userId = req.auth.userId;
  const grade = req.body.rating;

  if ((!grade && grade !== 0) || grade < 0 || grade > 5) {
    return res.status(400).json({ message: "La note doit être entre 0 et 5" });
  }

  Book.findById(req.params.id)
    .then((book) => {
      if (!book) return res.status(404).json({ message: "Livre non trouvé" });

      const alreadyRated = book.ratings.find(
        (rating) => rating.userId === userId
      );
      if (alreadyRated)
        return res
          .status(403)
          .json({ message: "Vous avez déjà noté ce livre" });

      book.ratings.push({ userId, grade });

      const total = book.ratings.reduce((acc, r) => acc + r.grade, 0);
      const avg = total / book.ratings.length;
      book.set("averageRating", avg);

      return book.save();
    })
    .then((updatedBook) => res.status(200).json(updatedBook))
    .catch((error) => res.status(400).json({ error }));
});

module.exports = app;
