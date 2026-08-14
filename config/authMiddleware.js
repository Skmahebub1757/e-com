const jwt = require('jsonwebtoken');

function verify(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// Blocks the request unless a valid token is present.
function requireAuth(req, res, next) {
  const payload = verify(req);
  if (!payload) return res.status(401).json({ error: 'Please sign in to continue.' });
  req.user = payload; // { id, name, email, role }
  next();
}

// Blocks unless signed in AND has the given role ('buyer' or 'seller').
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
    if (req.user.role !== role) {
      return res.status(403).json({ error: `This action is only available to ${role} accounts.` });
    }
    next();
  };
}

// Attaches req.user if a valid token is present, but never blocks the request.
// Used on checkout so guests can still buy, but signed-in buyers get order history.
function optionalAuth(req, res, next) {
  req.user = verify(req);
  next();
}

module.exports = { requireAuth, requireRole, optionalAuth };
