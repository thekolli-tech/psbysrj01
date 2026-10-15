/**
 * Additive schema for production PostgreSQL and explicit local SQLite.
 * Statements create missing objects only. They do not drop, truncate, or import data.
 */

export const REQUIRED_TABLES = [
  'users',
  'sessions',
  'otps',
  'audit_logs',
  'communities',
  'community_posts',
  'professional_profiles',
  'property_listings',
  'buyer_leads',
  'lead_unlocks',
  'wallet_ledger',
  'payment_transactions',
  'moderation_actions',
  'system_metadata'
] as const;

export const POSTGRES_ADDITIVE_SQL = `
ALTER TABLE community_posts ALTER COLUMN status SET DEFAULT 'PENDING_APPROVAL';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS moderation_note TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS change_request TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS capabilities TEXT DEFAULT '[]';
ALTER TABLE buyer_leads ADD COLUMN IF NOT EXISTS seeker_id VARCHAR(64);
ALTER TABLE buyer_leads ADD COLUMN IF NOT EXISTS property_id VARCHAR(64);
ALTER TABLE buyer_leads ADD COLUMN IF NOT EXISTS consent_granted SMALLINT DEFAULT 0;
ALTER TABLE buyer_leads ADD COLUMN IF NOT EXISTS consent_version VARCHAR(64);
ALTER TABLE buyer_leads ADD COLUMN IF NOT EXISTS consent_purpose TEXT;
ALTER TABLE buyer_leads ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS professional_profiles (
  user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  professional_role VARCHAR(32) NOT NULL,
  rera_number VARCHAR(64),
  organization VARCHAR(255),
  verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  reviewed_by VARCHAR(64),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_status ON professional_profiles(verification_status);

CREATE TABLE IF NOT EXISTS property_listings (
  id VARCHAR(64) PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  publication_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  payload TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_property_listings_status ON property_listings(publication_status);
CREATE INDEX IF NOT EXISTS idx_property_listings_owner ON property_listings(owner_id);

CREATE TABLE IF NOT EXISTS lead_unlocks (
  id VARCHAR(64) PRIMARY KEY,
  lead_id VARCHAR(64) NOT NULL,
  professional_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key VARCHAR(160) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  ledger_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_lead_professional UNIQUE (lead_id, professional_id),
  CONSTRAINT uq_lead_unlock_idempotency UNIQUE (idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_lead_unlocks_professional ON lead_unlocks(professional_id);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_type VARCHAR(32) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  balance_after NUMERIC(14, 2) NOT NULL,
  reference_type VARCHAR(32),
  reference_id VARCHAR(64),
  idempotency_key VARCHAR(160) UNIQUE,
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user ON wallet_ledger(user_id, created_at);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  provider VARCHAR(64) NOT NULL,
  provider_ref VARCHAR(128),
  amount NUMERIC(14, 2) NOT NULL,
  purpose VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  idempotency_key VARCHAR(160) UNIQUE,
  metadata TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id VARCHAR(64) PRIMARY KEY,
  target_type VARCHAR(32) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  action VARCHAR(32) NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target ON moderation_actions(target_type, target_id);
`;

export const ESSENTIAL_CONFIG_SQL = `
INSERT INTO system_metadata (key, value, updated_at) VALUES
  ('consent_version', '2026-10-15', NOW()),
  ('consent_purpose', 'Share my contact details with eligible verified professionals solely to respond to this property enquiry.', NOW()),
  ('lead_price_STANDARD', '300', NOW()),
  ('lead_price_PREMIUM', '750', NOW()),
  ('lead_price_HNI', '2000', NOW()),
  ('credit_packages', '[{"id":"credits_5","credits":5,"priceInr":1500},{"id":"credits_20","credits":20,"priceInr":5000}]', NOW())
ON CONFLICT (key) DO NOTHING;
`;

const SQLITE_COLUMN_STATEMENTS = [
  'ALTER TABLE community_posts ADD COLUMN rejection_reason TEXT',
  'ALTER TABLE community_posts ADD COLUMN moderation_note TEXT',
  'ALTER TABLE communities ADD COLUMN suspension_reason TEXT',
  'ALTER TABLE communities ADD COLUMN change_request TEXT',
  'ALTER TABLE users ADD COLUMN capabilities TEXT DEFAULT \'[]\'',
  'ALTER TABLE buyer_leads ADD COLUMN seeker_id TEXT',
  'ALTER TABLE buyer_leads ADD COLUMN property_id TEXT',
  'ALTER TABLE buyer_leads ADD COLUMN consent_granted INTEGER DEFAULT 0',
  'ALTER TABLE buyer_leads ADD COLUMN consent_version TEXT',
  'ALTER TABLE buyer_leads ADD COLUMN consent_purpose TEXT',
  'ALTER TABLE buyer_leads ADD COLUMN consented_at TEXT'
];

const SQLITE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS professional_profiles (
  user_id TEXT PRIMARY KEY,
  professional_role TEXT NOT NULL,
  rera_number TEXT,
  organization TEXT,
  verification_status TEXT NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS property_listings (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  publication_status TEXT NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lead_unlocks (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  professional_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  amount REAL NOT NULL,
  ledger_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(lead_id, professional_id)
);
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  idempotency_key TEXT UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  amount REAL NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  metadata TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS moderation_actions (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);
`;

export function applySqliteAdditiveSchema(database: { exec: (sql: string) => void }): void {
  database.exec(SQLITE_TABLE_SQL);
  for (const statement of SQLITE_COLUMN_STATEMENTS) {
    try {
      database.exec(statement);
    } catch (err: any) {
      const message = String(err?.message || err);
      if (!/duplicate column/i.test(message)) throw err;
    }
  }
  database.exec(`
    INSERT OR IGNORE INTO system_metadata (key, value, updated_at) VALUES
      ('consent_version', '2026-10-15', datetime('now')),
      ('consent_purpose', 'Share my contact details with eligible verified professionals solely to respond to this property enquiry.', datetime('now')),
      ('lead_price_STANDARD', '300', datetime('now')),
      ('lead_price_PREMIUM', '750', datetime('now')),
      ('lead_price_HNI', '2000', datetime('now')),
      ('credit_packages', '[{"id":"credits_5","credits":5,"priceInr":1500},{"id":"credits_20","credits":20,"priceInr":5000}]', datetime('now'));
  `);
}

export function schemaSqlIsNonDestructive(sql: string): boolean {
  const forbidden = /\b(DROP\s+TABLE|TRUNCATE|DELETE\s+FROM|INSERT\s+INTO\s+(users|communities|community_posts|buyer_leads|sessions|otps|payment_transactions)\b)/i;
  return !forbidden.test(sql);
}
