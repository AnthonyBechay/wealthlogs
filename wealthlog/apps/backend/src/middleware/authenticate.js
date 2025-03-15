// src/middleware/authenticate.js
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY || 'some-secret-key';

/**
 * Bearer-token-based middleware.
 * Expects "Authorization: Bearer <token>"
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  // authHeader should be like "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Malformed Authorization header' });
  }

  const scheme = parts[0]; // "Bearer"
  const token = parts[1];

  if (scheme !== 'Bearer') {
    return res.status(401).json({ error: 'Expected Bearer token' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    // decoded should have { userId: ... }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
