const { initDb, query } = require('./db');

async function seed() {
  console.log('Resetting and seeding database for Khitmah...');
  await initDb();

  // Reset all juz to available
  await query("UPDATE juz_status SET status = 'available', completed_at = NULL");
  // Clear any existing cooldowns
  await query("DELETE FROM reader_cooldown");

  console.log('Database seeded: all 30 Juz are available, cooldowns cleared.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
