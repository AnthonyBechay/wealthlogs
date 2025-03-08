// src/middleware/authenticate.js
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY;

/**
 * Cookie-based authenticate middleware.
 * Expects a JWT in req.cookies.token (set by /auth/login).
 * If valid, sets req.user = { userId: ... } and calls next().
 */
function authenticate(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - no token found in cookie' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    // decoded should have { userId: ... }, as we sign it in auth.js
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
