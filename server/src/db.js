const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config(); // fallback to current dir .env

let pool = null;
let pglite = null;
const isExternalPg = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '');

async function getClient() {
  if (isExternalPg) {
    if (!pool) {
      const { Pool } = require('pg');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
      });
      console.log('Connected to external PostgreSQL via pg driver.');
    }
    return {
      query: (text, params) => pool.query(text, params),
      isExternal: true
    };
  } else {
    if (!pglite) {
      const { PGlite } = require('@electric-sql/pglite');
      const dataDir = path.join(__dirname, '../data/pgdata');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      pglite = new PGlite(dataDir);
      console.log(`Initialized embedded PostgreSQL (PGlite) at ${dataDir}`);
    }
    return {
      query: async (text, params) => {
        const res = await pglite.query(text, params || []);
        return {
          rows: res.rows || [],
          rowCount: res.affectedRows !== undefined ? res.affectedRows : (res.rows ? res.rows.length : 0)
        };
      },
      isExternal: false
    };
  }
}

async function query(text, params = []) {
  const client = await getClient();
  return client.query(text, params);
}

async function transaction(callback) {
  if (isExternalPg) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txHelper = {
        query: (text, params = []) => client.query(text, params)
      };
      const result = await callback(txHelper);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    const client = await getClient();
    return pglite.transaction(async (tx) => {
      const txHelper = {
        query: async (text, params = []) => {
          const res = await tx.query(text, params);
          return {
            rows: res.rows || [],
            rowCount: res.affectedRows !== undefined ? res.affectedRows : (res.rows ? res.rows.length : 0)
          };
        }
      };
      return callback(txHelper);
    });
  }
}

async function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Split schema statements and run
  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await query(statement);
    } catch (e) {
      console.warn('Schema execution warning:', e.message);
    }
  }

  // Handle migration if juz_status had legacy columns
  try {
    await query(`
      ALTER TABLE juz_status DROP COLUMN IF EXISTS reserved_by;
      ALTER TABLE juz_status DROP COLUMN IF EXISTS reserved_at;
      ALTER TABLE juz_status DROP COLUMN IF EXISTS completed_by;
    `);
    // If any status was 'reserved', convert back to 'available'
    await query(`UPDATE juz_status SET status = 'available' WHERE status = 'reserved'`);
  } catch (e) {
    // ignore if columns don't exist
  }

  // Ensure counter is initialized
  const counterRes = await query('SELECT * FROM khitmah_counter WHERE id = 1');
  if (counterRes.rows.length === 0) {
    await query('INSERT INTO khitmah_counter (id, total_completed) VALUES (1, 0)');
    console.log('Initialized khitmah_counter (total_completed = 0)');
  }

  // Ensure 30 Juz entries exist
  const juzRes = await query('SELECT COUNT(*) as count FROM juz_status');
  const count = parseInt(juzRes.rows[0].count, 10);
  if (count < 30) {
    for (let i = 1; i <= 30; i++) {
      await query(
        `INSERT INTO juz_status (juz_number, status) 
         VALUES ($1, 'available') 
         ON CONFLICT (juz_number) DO NOTHING`,
        [i]
      );
    }
    console.log('Initialized all 30 Juz statuses as available.');
  }
}

module.exports = {
  query,
  transaction,
  initDb
};
