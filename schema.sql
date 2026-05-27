CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT,
  provider TEXT NOT NULL DEFAULT 'local',
  google_id TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS payment_orders (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  order_name TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  customer_name TEXT,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'READY',
  confirm_token TEXT NOT NULL UNIQUE,
  payment_key TEXT UNIQUE,
  method TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at);
