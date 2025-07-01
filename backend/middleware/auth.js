const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "Requête non authentifiée (token manquant)" });
    }

    const token = authHeader.split(" ")[1];
    // @ts-ignore
    const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET);
    req.auth = { userId: decodedToken.userId };

    next();
  } catch (error) {
    res
      .status(401)
      .json({ message: "Requête non authentifiée (token invalide)", error });
  }
};
