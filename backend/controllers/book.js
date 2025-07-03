const Book = require("../models/Book");
const fs = require("fs");

exports.createBook = (req, res) => {
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
};

exports.getAllBooks = (req, res) => {
  Book.find()
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(400).json({ error }));
};

exports.getBookById = (req, res) => {
  Book.findById(req.params.id)
    .then((book) => {
      if (!book) return res.status(404).json({ message: "Livre non trouvé" });
      res.status(200).json(book);
    })
    .catch((error) => res.status(400).json({ error }));
};

exports.updateBook = (req, res) => {
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
};

exports.deleteBook = (req, res) => {
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
};

exports.rateBook = (req, res) => {
  const userId = req.auth.userId;
  const grade = req.body.rating;

  if ((!grade && grade !== 0) || grade < 0 || grade > 5)
    return res.status(400).json({ message: "La note doit être entre 0 et 5" });

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
};

exports.getBestRatedBooks = (req, res) => {
  Book.find()
    .sort({ averageRating: -1 })
    .limit(3)
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(400).json({ error }));
};
