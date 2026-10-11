const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { getAllJuzMetadata } = require('../quranService');
const { broadcast } = require('../websocket');

const router = express.Router();
const COOLDOWN_SECONDS = 45 * 60; // 45 minutes

// --- Helpers ---

function generateSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(8);
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars[bytes[i] % chars.length];
  }
  return slug;
}

function generateManageToken() {
  return crypto.randomBytes(18).toString('base64url'); // 24 chars
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length === 0 || b.length === 0) {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function getClientIdentifier(req) {
  let deviceId = req.headers['x-device-id'];
  if (!deviceId && req.headers.cookie) {
    const match = req.headers.cookie.match(/khitmah_device_id=([^;]+)/);
    if (match) deviceId = decodeURIComponent(match[1]);
  }
  if (!deviceId && req.query.device_id) {
    deviceId = req.query.device_id;
  }
  deviceId = (deviceId || '').trim();

  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  if (typeof ip === 'string' && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  return { deviceId, ip };
}

async function checkCooldown(deviceId, ip) {
  if (!deviceId) {
    return { active: false, remainingSeconds: 0 };
  }

  const queryConditions = [];
  const queryParams = [];

  if (deviceId) {
    queryParams.push(deviceId);
    queryConditions.push(`device_id = $${queryParams.length}`);
  }
  

  const sql = `
    SELECT last_read_at, EXTRACT(EPOCH FROM (NOW() - last_read_at)) AS elapsed_seconds
    FROM reader_cooldown
    WHERE ${queryConditions.join(' OR ')}
    ORDER BY last_read_at DESC
    LIMIT 1
  `;

  const res = await db.query(sql, queryParams);
  if (res.rows.length === 0) {
    return { active: false, remainingSeconds: 0 };
  }

  const elapsed = parseFloat(res.rows[0].elapsed_seconds) || 0;
  if (elapsed < COOLDOWN_SECONDS) {
    const remainingSeconds = Math.ceil(COOLDOWN_SECONDS - elapsed);
    return { active: true, remainingSeconds };
  }

  return { active: false, remainingSeconds: 0 };
}

function sanitizePlainText(str) {
  if (typeof str !== 'string') return '';
  // Strip HTML tags and trim
  return str.replace(/<[^>]*>/g, '').trim();
}

// --- Routes ---

// POST /api/k — Create a custom khitmah
router.post('/', async (req, res) => {
  try {
    const headerDeviceId = (req.headers['x-device-id'] || '').toString().trim();
    if (!headerDeviceId) {
      return res.status(400).json({ error: 'Device identifier required' });
    }

    const { deviceId, ip } = getClientIdentifier(req);

    // Validate input
    let personName = sanitizePlainText(req.body.personName || '');
    let dedication = sanitizePlainText(req.body.dedication || '');

    if (personName.length < 1 || personName.length > 80) {
      return res.status(400).json({
        error: 'اسم المتوفى مطلوب (١-٨٠ حرفاً) / Name is required (1-80 characters)'
      });
    }

    if (dedication.length > 300) {
      return res.status(400).json({
        error: 'الإهداء يجب ألا يتجاوز ٣٠٠ حرف / Dedication must be 300 characters or fewer'
      });
    }

    // Rate limiting: max 5 per device per 24h, 20 per IP per 24h
    if (deviceId) {
      const deviceCountRes = await db.query(
        `SELECT COUNT(*) as cnt FROM khitmahs
         WHERE creator_device_id = $1
         AND created_at > NOW() - INTERVAL '24 hours'`,
        [deviceId]
      );
      if (parseInt(deviceCountRes.rows[0].cnt, 10) >= 5) {
        return res.status(429).json({
          error: 'لقد تجاوزت الحد الأقصى لإنشاء الختمات (٥ ختمات خلال ٢٤ ساعة). حاول لاحقاً. / You have reached the limit of 5 khitmahs per 24 hours. Try again later.'
        });
      }
    }

    if (ip) {
      const ipCountRes = await db.query(
        `SELECT COUNT(*) as cnt FROM khitmahs
         WHERE creator_ip = $1
         AND created_at > NOW() - INTERVAL '24 hours'`,
        [ip]
      );
      if (parseInt(ipCountRes.rows[0].cnt, 10) >= 20) {
        return res.status(429).json({
          error: 'لقد تجاوزت الحد الأقصى لإنشاء الختمات من هذا العنوان (٢٠ ختمة خلال ٢٤ ساعة). / You have reached the limit of 20 khitmahs per IP per 24 hours.'
        });
      }
    }

    // Generate slug (retry on collision) and manage token
    let slug;
    let attempts = 0;
    do {
      slug = generateSlug();
      const existing = await db.query('SELECT id FROM khitmahs WHERE slug = $1', [slug]);
      if (existing.rows.length === 0) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return res.status(500).json({ error: 'Failed to generate unique slug' });
    }

    const manageToken = generateManageToken();
    const manageTokenHash = hashToken(manageToken);

    // Create khitmah + 30 juz + counter in a single transaction
    await db.transaction(async (tx) => {
      const insertRes = await tx.query(
        `INSERT INTO khitmahs (slug, person_name, dedication, manage_token_hash, creator_device_id, creator_ip)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [slug, personName, dedication, manageTokenHash, deviceId || null, ip || null]
      );
      const khitmahId = insertRes.rows[0].id;

      // Insert 30 juz rows
      for (let i = 1; i <= 30; i++) {
        await tx.query(
          `INSERT INTO khitmah_juz (khitmah_id, juz_number, status) VALUES ($1, $2, 'available')`,
          [khitmahId, i]
        );
      }

      // Insert counter row
      await tx.query(
        `INSERT INTO khitmah_counters (khitmah_id, total_completed) VALUES ($1, 0)`,
        [khitmahId]
      );
    });

    res.status(201).json({ slug, manageToken });
  } catch (err) {
    console.error('Error creating custom khitmah:', err);
    res.status(500).json({ error: 'Failed to create khitmah' });
  }
});

// GET /api/k/:slug — Get custom khitmah board
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { deviceId, ip } = getClientIdentifier(req);

    // Find the khitmah
    const khitmahRes = await db.query(
      'SELECT id, person_name, dedication FROM khitmahs WHERE slug = $1',
      [slug]
    );
    if (khitmahRes.rows.length === 0) {
      return res.status(404).json({ error: 'Khitmah not found' });
    }

    const khitmah = khitmahRes.rows[0];
    const khitmahId = khitmah.id;

    // Cooldown check (shared across all khitmahs)
    const cooldownInfo = await checkCooldown(deviceId, ip);

    // Get juz statuses for this khitmah
    const juzRes = await db.query(
      `SELECT juz_number, status, completed_at
       FROM khitmah_juz
       WHERE khitmah_id = $1
       ORDER BY juz_number ASC`,
      [khitmahId]
    );

    // Get counter
    const counterRes = await db.query(
      'SELECT total_completed FROM khitmah_counters WHERE khitmah_id = $1',
      [khitmahId]
    );
    const totalCompletedKhitmahs = counterRes.rows[0] ? counterRes.rows[0].total_completed : 0;

    // Merge with metadata
    const metadata = getAllJuzMetadata();
    const list = juzRes.rows.map(row => {
      const meta = metadata[row.juz_number] || {};
      return {
        ...row,
        arabicName: meta.arabicName || `الجزء ${row.juz_number}`,
        englishName: meta.englishName || `Juz ${row.juz_number}`,
        startPage: meta.start,
        endPage: meta.end
      };
    });

    const completedCount = list.filter(j => j.status === 'completed').length;
    const availableCount = list.filter(j => j.status === 'available').length;

    res.json({
      juzList: list,
      counter: {
        totalCompleted: totalCompletedKhitmahs,
        currentProgress: completedCount,
        availableCount,
        totalJuz: 30
      },
      cooldown: cooldownInfo,
      serverTime: new Date().toISOString(),
      personName: khitmah.person_name,
      dedication: khitmah.dedication || ''
    });
  } catch (err) {
    console.error('Error fetching custom khitmah:', err);
    res.status(500).json({ error: 'Failed to fetch khitmah' });
  }
});

// POST /api/k/:slug/juz/:id/read — Mark juz as read in custom khitmah
router.post('/:slug/juz/:id/read', async (req, res) => {
  const { slug } = req.params;
  const juzId = parseInt(req.params.id, 10);
  const { deviceId, ip } = getClientIdentifier(req);

  if (isNaN(juzId) || juzId < 1 || juzId > 30) {
    return res.status(400).json({ error: 'Invalid Juz number. Must be between 1 and 30.' });
  }

  if (!deviceId) {
    return res.status(400).json({ error: 'Device identifier required' });
  }

  try {
    // Find khitmah
    const khitmahRes = await db.query('SELECT id FROM khitmahs WHERE slug = $1', [slug]);
    if (khitmahRes.rows.length === 0) {
      return res.status(404).json({ error: 'Khitmah not found' });
    }
    const khitmahId = khitmahRes.rows[0].id;

    // Check cooldown (shared across all khitmahs)
    const cooldown = await checkCooldown(deviceId, ip);
    if (cooldown.active) {
      return res.status(429).json({
        error: 'cooldown_active',
        message: 'عذراً، يجب الانتظار ٤٥ دقيقة بين كل قراءة وأخرى لمنح الفرصة للجميع',
        remainingSeconds: cooldown.remainingSeconds
      });
    }

    // Perform conditional atomic update
    const result = await db.transaction(async (tx) => {
      const updateRes = await tx.query(
        `UPDATE khitmah_juz
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE khitmah_id = $1 AND juz_number = $2 AND status = 'available'
         RETURNING *`,
        [khitmahId, juzId]
      );

      if (updateRes.rowCount === 0) {
        throw {
          status: 409,
          message: 'هذا الجزء تم إتمامه بالفعل من قِبل قارئ آخر للتو. تقبل الله من الجميع!'
        };
      }

      // Record cooldown (shared table)
      await tx.query(
        `INSERT INTO reader_cooldown (device_id, ip_address, last_read_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (device_id)
         DO UPDATE SET ip_address = $2, last_read_at = CURRENT_TIMESTAMP`,
        [deviceId, ip]
      );

      // Check if all 30 juz of THIS khitmah are completed
      const countRes = await tx.query(
        `SELECT COUNT(*) as completed_count FROM khitmah_juz WHERE khitmah_id = $1 AND status = 'completed'`,
        [khitmahId]
      );
      const completedCount = parseInt(countRes.rows[0].completed_count, 10);

      let khitmahFinished = false;
      const counterRes = await tx.query(
        'SELECT total_completed FROM khitmah_counters WHERE khitmah_id = $1',
        [khitmahId]
      );
      let newTotalKhitmahs = counterRes.rows[0]?.total_completed || 0;

      if (completedCount === 30) {
        khitmahFinished = true;
        const incRes = await tx.query(
          'UPDATE khitmah_counters SET total_completed = total_completed + 1 WHERE khitmah_id = $1 RETURNING total_completed',
          [khitmahId]
        );
        newTotalKhitmahs = incRes.rows[0].total_completed;

        // Reset only THIS khitmah's juz
        await tx.query(
          `UPDATE khitmah_juz SET status = 'available', completed_at = NULL WHERE khitmah_id = $1`,
          [khitmahId]
        );
        console.log(`🎉 Custom Khitmah "${slug}" #${newTotalKhitmahs} COMPLETED! Resetting its 30 Juz.`);
      }

      return {
        khitmahFinished,
        totalCompletedKhitmahs: newTotalKhitmahs,
        completedCount: khitmahFinished ? 0 : completedCount
      };
    });

    // Broadcast with slug field so clients can filter
    broadcast('BOARD_UPDATE', {
      slug,
      action: result.khitmahFinished ? 'KHITMAH_RESET' : 'COMPLETED',
      juzNumber: juzId,
      khitmahFinished: result.khitmahFinished,
      totalCompletedKhitmahs: result.totalCompletedKhitmahs
    });

    res.json({
      message: result.khitmahFinished
        ? 'مبارك! أتمت الختمة بنجاح، وتم بدء ختمة جديدة تلقائياً'
        : 'تقبل الله! تم تسجيل إتمام قراءة الجزء بنجاح',
      juzNumber: juzId,
      khitmahFinished: result.khitmahFinished,
      totalCompletedKhitmahs: result.totalCompletedKhitmahs,
      remainingSeconds: COOLDOWN_SECONDS
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Custom khitmah read error:', err);
    res.status(500).json({ error: 'Internal server error while marking juz as read' });
  }
});

// DELETE /api/k/:slug — Delete a custom khitmah
router.delete('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const manageToken = req.headers['x-manage-token'];
    const adminToken = req.headers['x-admin-token'];
    const envAdminToken = (process.env.ADMIN_TOKEN || '').trim();
    const adminEnabled = envAdminToken.length > 0;

    // Find khitmah
    const khitmahRes = await db.query(
      'SELECT id, manage_token_hash FROM khitmahs WHERE slug = $1',
      [slug]
    );
    if (khitmahRes.rows.length === 0) {
      return res.status(404).json({ error: 'Khitmah not found' });
    }

    const khitmah = khitmahRes.rows[0];

    // Authorize: manage token or admin token
    let authorized = false;

    if (manageToken && safeEqual(hashToken(String(manageToken)), khitmah.manage_token_hash)) {
      authorized = true;
    }

    if (adminEnabled && adminToken && safeEqual(String(adminToken), envAdminToken)) {
      authorized = true;
    }

    if (!authorized) {
      return res.status(403).json({ error: 'Unauthorized: invalid manage or admin token' });
    }

    // Delete in transaction
    await db.transaction(async (tx) => {
      await tx.query('DELETE FROM khitmah_juz WHERE khitmah_id = $1', [khitmah.id]);
      await tx.query('DELETE FROM khitmah_counters WHERE khitmah_id = $1', [khitmah.id]);
      await tx.query('DELETE FROM khitmahs WHERE id = $1', [khitmah.id]);
    });

    res.json({ message: 'Khitmah deleted successfully' });
  } catch (err) {
    console.error('Error deleting custom khitmah:', err);
    res.status(500).json({ error: 'Failed to delete khitmah' });
  }
});

module.exports = {
  router
};
