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
