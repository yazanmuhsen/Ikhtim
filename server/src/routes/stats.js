// routes/stats.js
// Provides global community statistics endpoint
// GET /api/stats returns {globalCompleted, mainCompleted, customCompleted, khitmahsCreated}

const express = require('express');
const db = require('../db');

const router = express.Router();

// Simple in‑memory cache (max 5 seconds)
let cache = null;
let cacheAt = 0;
const CACHE_TTL = 5000; // ms

router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cacheAt < CACHE_TTL) {
      return res.json(cache);
    }

    // Main khitmah completed count
    const mainRes = await db.query('SELECT total_completed FROM khitmah_counter WHERE id = 1');
    const mainCompleted = mainRes.rows[0]?.total_completed || 0;

    // Custom stats from global_stats
    const globalRes = await db.query('SELECT custom_completed, khitmahs_created FROM global_stats WHERE id = 1');
    const customCompleted = globalRes.rows[0]?.custom_completed || 0;
    const khitmahsCreated = globalRes.rows[0]?.khitmahs_created || 0;

    const result = {
      globalCompleted: mainCompleted + customCompleted,
      mainCompleted,
      customCompleted,
      khitmahsCreated,
    };

    cache = result;
    cacheAt = now;
    res.json(result);
  } catch (err) {
    console.error('Error in /api/stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = { router };
