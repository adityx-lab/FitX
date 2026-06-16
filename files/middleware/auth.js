const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ─── What this file does ──────────────────────────────────────
// This is a "middleware" function — it runs between a request arriving
// and the route handler processing it.
//
// Think of it like a bouncer at a club:
//   - Request arrives at a protected route (e.g. GET /api/data/workouts)
//   - This middleware checks: "Do you have a valid wristband (JWT)?"
//   - If YES → lets the request through, attaches the user to req.user
//   - If NO  → sends back a 401 Unauthorized error immediately

const protect = async (req, res, next) => {
  // JWT is sent in the Authorization header like:
  // Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith('Bearer ')
  ) {
    return res.status(401).json({ message: 'No token — access denied' });
  }

  try {
    // 1. Extract the token (strip "Bearer " prefix)
    const token = req.headers.authorization.split(' ')[1];

    // 2. Verify the token using our secret key
    //    If the token is fake or expired, this throws an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find the user this token belongs to
    //    We attach them to req.user so route handlers can use it
    //    .select('-password') means: fetch everything EXCEPT the password
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    // 4. Pass control to the actual route handler
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

module.exports = { protect };
