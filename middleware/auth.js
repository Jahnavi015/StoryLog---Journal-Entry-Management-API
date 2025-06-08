const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'your_secret_key';

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ status: false, message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ status: false, message: 'Invalid token' });
  }
};

