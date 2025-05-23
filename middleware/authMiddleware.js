const jwt = require("jsonwebtoken");
 const JWT_SECRET = process.env.JWT_SECRET || "ai3ohPh3Aiy9eeThoh8caaM9voh5Aezaenai0Fae2Pahsh2Iexu7Qu/";
 
 module.exports = (req, res, next) => {
     const authHeader = req.headers.authorization;
     if (!authHeader) {
         return res.status(401).json({ message: "Токен не предоставлен" });
     }
 
     const token = authHeader.split(" ")[1];
     try {
         const decoded = jwt.verify(token, JWT_SECRET);
         req.user = decoded;
         next();
     } catch (err) {
         return res.status(401).json({ message: "Недействительный токен" });
     }
 };
