// backend/controllers/matchController.js

const pool = require('../config/db');
const Match = require('../models/Match');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Like = require('../models/Like');
const { incrementSwipeCountForUser } = require('../middleware/usageLimits');

exports.getPotentialMatches = async (req, res) => {
  try {
    const matches = await Profile.getPotentialMatches(req.user.id);
    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get matches' });
  }
};

exports.likeProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const likedUserId = req.params.id;
    
    if (userId === likedUserId) {
      return res.status(400).json({ error: 'Cannot like yourself' });
    }
    
    const userExists = await User.findById(likedUserId);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const existingLike = await pool.query(
      'SELECT * FROM likes WHERE user_id = $1 AND liked_user_id = $2',
      [userId, likedUserId]
    );
    
    if (existingLike.rows.length > 0) {
      const isMutual = await Match.checkMutualLike(userId, likedUserId);
      return res.json({ 
        match: isMutual,
        alreadyLiked: true,
        message: 'You have already liked this profile' 
      });
    }
    
    await Match.createLike({ userId, likedUserId });
    
    // --- Create a 'liked' notification for the target user if they are Basic tier (best effort) ---
    try {
      const targetUser = await User.findById(likedUserId);
      const targetTier = targetUser?.tier_level || targetUser?.subscription_tier || 'Basic';
      if (targetTier === 'Basic') {
        await pool.query(
          `INSERT INTO notifications (user_id, type, payload) VALUES ($1, 'like', jsonb_build_object('from', $2)) ON CONFLICT DO NOTHING`,
          [likedUserId, userId]
        );
      }
    } catch (notifErr) {
      console.error('Failed to create like notification:', notifErr);
    }
    
    await incrementSwipeCountForUser(req);
    
    const isMutual = await Match.checkMutualLike(userId, likedUserId);
    
    if (isMutual) {
      await Match.createMatch(userId, likedUserId);
      return res.json({ match: true });
    }
    
    res.json({ match: false });
  } catch (err) {
    if (err.limitExceeded && err.limitType === 'swipe') {
      return res.status(err.statusCode || 429).json({
        success: false,
        error: err.message || 'Daily swipe limit reached.',
        limitExceeded: true,
        limitType: 'swipe',
      });
    }
    
    console.error('Full error in likeProfile:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to like profile',
      message: err.message
    });
  }
};

exports.getMatches = async (req, res) => {
  try {
    const matches = await Match.getUserMatches(req.user.id);
    
    const transformedMatches = matches.map(match => {
      const isUser1 = match.user1_id === req.user.id;
      return {
        id: match.id,
        matchedUser: {
          id: isUser1 ? match.user2_id : match.user1_id,
          firstName: isUser1 ? match.user2_first_name : match.user1_first_name,
          lastName: isUser1 ? match.user2_last_name : match.user1_last_name,
          // --- FIX: Use a consistent property name ---
          profile_picture: isUser1 ? match.user2_profile_pic : match.user1_profile_pic
        },
        createdAt: match.created_at
      };
    });

    res.json(transformedMatches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get matches' });
  }
};

exports.checkAndCreateMatch = async (req, res) => {
  try {
    const { likedUserId } = req.body;
    if (!likedUserId) {
      return res.status(400).json({ error: 'likedUserId is required' });
    }

    await Like.createLike(req.user.id, likedUserId);
    const otherUserLike = await Like.checkLike(likedUserId, req.user.id);
    
    if (otherUserLike) {
      const existingMatch = await Match.checkMatch(req.user.id, likedUserId);
      if (!existingMatch) {
        const match = await Match.createMatch(req.user.id, likedUserId);
        res.json({ match, message: "It's a match!" });
      } else {
        res.json({ match: existingMatch, message: 'Match already exists' });
      }
    } else {
      res.json({ message: 'Like recorded, waiting for the other person to like back' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process match' });
  }
};

exports.unmatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const deletedMatch = await Match.deleteMatch(matchId, req.user.id);
    
    if (!deletedMatch) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    const match = deletedMatch;
    await Like.deleteLike(match.user1_id, match.user2_id);
    await Like.deleteLike(match.user2_id, match.user1_id);
    
    res.json({ message: 'Successfully unmatched' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to unmatch' });
  }
};

// --- New feature: Likes You list (Premium+ tiers) ---
exports.getLikesYou = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch users who have liked the current user but whom the current user has NOT liked and are not yet matched
    const query = `
      SELECT p.*, u.id as user_id
      FROM likes l
      JOIN users u ON u.id = l.user_id
      JOIN profiles p ON p.user_id = u.id
      WHERE l.liked_user_id = $1
        AND u.profile_complete = true
        AND u.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM likes l2
          WHERE l2.user_id = $1 AND l2.liked_user_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM matches m
          WHERE (m.user1_id = $1 AND m.user2_id = u.id) OR (m.user1_id = u.id AND m.user2_id = $1)
        )
      ORDER BY l.created_at DESC
      LIMIT 100;
    `;

    const result = await pool.query(query, [userId]);

    // Determine tier level (assuming req.user has tier_level or subscription_tier)
    const tier = req.user.tier_level || req.user.subscription_tier || 'Basic';

    if (tier === 'Premium' || tier === 'Elite') {
      return res.status(200).json({ success: true, likes: result.rows });
    }

    // Basic users – only send count, not identities
    return res.status(200).json({ success: true, likes: [], count: result.rows.length });
  } catch (err) {
    console.error('Error fetching Likes You list:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch Likes You list' });
  }
};