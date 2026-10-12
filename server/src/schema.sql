CREATE TABLE IF NOT EXISTS khitmah_counter (
  id INT PRIMARY KEY DEFAULT 1,
  total_completed INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS juz_status (
  juz_number INT PRIMARY KEY,
  status VARCHAR(20) NOT NULL DEFAULT 'available', -- 'available' or 'completed'
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reader_cooldown (
  device_id VARCHAR(64) PRIMARY KEY,
  ip_address VARCHAR(45),
  last_read_at TIMESTAMP NOT NULL
);

-- Drop legacy tables if they exist
DROP TABLE IF EXISTS completion_log CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Custom khitmahs feature
CREATE TABLE IF NOT EXISTS khitmahs (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(16) UNIQUE NOT NULL,
  person_name VARCHAR(100) NOT NULL,
  dedication VARCHAR(400) DEFAULT '',
  manage_token_hash VARCHAR(128) NOT NULL,
  creator_device_id VARCHAR(64),
  creator_ip VARCHAR(45),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS khitmah_juz (
  khitmah_id INT NOT NULL,
  juz_number INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  completed_at TIMESTAMP,
  PRIMARY KEY (khitmah_id, juz_number)
);

CREATE TABLE IF NOT EXISTS khitmah_counters (
  khitmah_id INT PRIMARY KEY,
  total_completed INT NOT NULL DEFAULT 0
);

-- Global community stats
CREATE TABLE IF NOT EXISTS global_stats (
  id INTEGER PRIMARY KEY,
  custom_completed INTEGER NOT NULL DEFAULT 0,
  khitmahs_created INTEGER NOT NULL DEFAULT 0
);

-- Ensure a single row exists (id=1) and seed values if missing
INSERT INTO global_stats (id, custom_completed, khitmahs_created)
SELECT 1,
       COALESCE((SELECT SUM(total_completed) FROM khitmah_counters),0),
       COALESCE((SELECT COUNT(*) FROM khitmahs),0)
ON CONFLICT (id) DO NOTHING;

-- Bilingual names for custom khitmahs
ALTER TABLE khitmahs ADD COLUMN IF NOT EXISTS person_name_ar TEXT;
ALTER TABLE khitmahs ADD COLUMN IF NOT EXISTS person_name_en TEXT;
UPDATE khitmahs SET person_name_ar = person_name WHERE person_name_ar IS NULL OR person_name_ar = '';
UPDATE khitmahs SET person_name_en = person_name WHERE person_name_en IS NULL OR person_name_en = '';
