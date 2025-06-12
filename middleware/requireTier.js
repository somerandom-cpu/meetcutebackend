// backend/middleware/requireTier.js
// Thin re-export to maintain backward compatibility with older route files
const { requireTier } = require('./authSubscription');
module.exports = { requireTier };
