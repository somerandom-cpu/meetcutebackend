// backend/models/Referral.js
const pool = require('../config/db');
const crypto = require('crypto');

class Referral {
  // Create or fetch an elite user's referral code
  static async getOrCreateCode(userId) {
    // Check if code exists
    const existing = await pool.query('SELECT code FROM referral_codes WHERE referrer_id = $1', [userId]);
    if (existing.rows.length) return existing.rows[0].code;

    // Generate unique code
    let code;
    let attempts = 0;
    do {
      code = crypto.randomBytes(6).toString('hex'); // 12-char code
      const chk = await pool.query('SELECT 1 FROM referral_codes WHERE code = $1', [code]);
      if (!chk.rows.length) break;
      attempts += 1;
    } while (attempts < 5);

    if (!code) throw new Error('Could not generate referral code');

    await pool.query('INSERT INTO referral_codes (referrer_id, code) VALUES ($1, $2)', [userId, code]);
    return code;
  }

  // Record a referral after referred user registers
  static async recordReferral(referrerCode, referredUserId) {
    // Find referrer_id by code
    const refRow = await pool.query('SELECT referrer_id FROM referral_codes WHERE code = $1', [referrerCode]);
    if (!refRow.rows.length) return null; // invalid / no referrer
    const referrerId = refRow.rows[0].referrer_id;

    // Insert into referrals, ignore duplicates
    await pool.query(
      `INSERT INTO referrals (referrer_id, referred_id)
       VALUES ($1, $2)
       ON CONFLICT (referrer_id, referred_id) DO NOTHING`,
      [referrerId, referredUserId]
    );
    return referrerId;
  }

  // Admin: list referrals for a given referrer
  static async listReferrals(referrerId) {
    const res = await pool.query(
      `SELECT r.id, u.email AS referred_email, r.created_at
       FROM referrals r
       JOIN users u ON u.id = r.referred_id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [referrerId]
    );
    return res.rows;
  }

  // Admin: list all referrals
  static async listAll() {
    const res = await pool.query(
      `SELECT r.id,
              r.referrer_id,
              ru.email AS referrer_email,
              r.referred_id,
              uu.email AS referred_email,
              r.created_at
       FROM referrals r
       JOIN users ru ON ru.id = r.referrer_id
       JOIN users uu ON uu.id = r.referred_id
       ORDER BY r.created_at DESC`
    );
    return res.rows;
  }
}
module.exports = Referral;
