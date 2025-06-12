// backend/routes/referralRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const Referral = require('../models/Referral');
const User = require('../models/User');

// GET /api/referrals/code  – Elite user retrieves or generates referral code
router.get('/code', isAuthenticated, async (req, res) => {
  try {
    // `isAuthenticated` middleware already attaches the user with the **derived**
    // subscription tier (based on active records in `user_subscriptions`).
    // Use that instead of loading the row again, otherwise anyone whose
    // `users.subscription_tier` column is still "Basic" will be rejected even if
    // they currently have an active Elite subscription.
    const tier = (req.user.subscription_tier || '').toString().toLowerCase();
    if (tier !== 'elite') {
      return res.status(403).json({ success: false, error: 'Only Elite users can access referral program.' });
    }
    const code = await Referral.getOrCreateCode(req.user.id);
    res.json({ success: true, code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to get referral code.' });
  }
});

// USER route: list their own referrals
router.get('/mine', isAuthenticated, async (req, res) => {
  try {
    const list = await Referral.listReferrals(req.user.id);
    res.json({ success: true, referrals: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch referrals' });
  }
});

// ADMIN route: list referrals by referrer_id
router.get('/admin/:id', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const list = await Referral.listReferrals(req.params.id);
    res.json({ success: true, referrals: list });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch referrals' });
  }
});

// ADMIN route: list all referrals
router.get('/admin', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const list = await Referral.listAll();
    res.json({ success: true, referrals: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch referrals' });
  }
});

module.exports = router;
