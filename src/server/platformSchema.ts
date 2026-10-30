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
ALTER TABLE otps ALTER COLUMN otp_hash TYPE VARCHAR(128);
ALTER TABLE sessions ALTER COLUMN expires_at TYPE BIGINT;
ALTER TABLE sessions ALTER COLUMN ip_address TYPE TEXT;
ALTER TABLE community_posts ALTER COLUMN status SET DEFAULT 'PENDING_APPROVAL';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS moderation_note TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS change_request TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS visibility VARCHAR(32) DEFAULT 'PUBLIC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS capabilities TEXT DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS town_city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests TEXT DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_restricted SMALLINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted_reason TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(32) DEFAULT 'POST';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS visibility VARCHAR(32) DEFAULT 'PUBLIC';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS poll_options TEXT DEFAULT '[]';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS poll_votes TEXT DEFAULT '[]';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS ama_host_name VARCHAR(255);
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS ama_host_role VARCHAR(128);
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS ama_status VARCHAR(32) DEFAULT 'LIVE';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS ama_start_time TIMESTAMPTZ;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS ama_end_time TIMESTAMPTZ;
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS is_ama_answer SMALLINT DEFAULT 0;
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS author_avatar TEXT;
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS is_deleted SMALLINT DEFAULT 0;
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(64);
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS original_content TEXT;
ALTER TABLE buyer_leads ADD COLUMN IF NOT EXISTS seeker_id VARCHAR(64);
ALTER TABLE buyer_leads ADD COLUMN IF NOT EXISTS property_id VARCHAR(64);
ALTER TABLE buyer_leads ADD COLUMN IF NOT EXISTS consent_granted SMALLINT DEFAULT 0;
ALTER TABLE buyer_leads ADD COLUMN IF NOT EXISTS consent_version VARCHAR(64);
ALTER TABLE buyer_leads ADD COLUMN IF NOT EXISTS consent_purpose TEXT;
ALTER TABLE buyer_leads ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ;
ALTER TABLE property_requirements ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'ACTIVE';
ALTER TABLE property_requirements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE property_requirements ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(64);
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS deletion_status VARCHAR(32) DEFAULT 'NONE';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS deletion_requested_by VARCHAR(64);
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS deletion_reviewed_at TIMESTAMPTZ;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS deletion_reviewed_by VARCHAR(64);
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS deletion_rejection_reason TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS previous_status VARCHAR(32);

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

CREATE TABLE IF NOT EXISTS community_post_votes (
  id VARCHAR(64) PRIMARY KEY,
  post_id VARCHAR(64) NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_post_votes_post ON community_post_votes(post_id);

CREATE TABLE IF NOT EXISTS community_post_follows (
  id VARCHAR(64) PRIMARY KEY,
  post_id VARCHAR(64) NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_post_follows_post ON community_post_follows(post_id);

CREATE TABLE IF NOT EXISTS user_follows (
  id VARCHAR(64) PRIMARY KEY,
  follower_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

CREATE TABLE IF NOT EXISTS community_bookmarks (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id VARCHAR(64) NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_community_bookmarks_user ON community_bookmarks(user_id);

CREATE TABLE IF NOT EXISTS property_requirements (
  id VARCHAR(64) PRIMARY KEY,
  seeker_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_type VARCHAR(80) NOT NULL,
  location TEXT,
  budget TEXT,
  details TEXT,
  status VARCHAR(32) DEFAULT 'ACTIVE',
  deleted_at TIMESTAMPTZ,
  deleted_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_property_requirements_seeker ON property_requirements(seeker_id, created_at);

CREATE TABLE IF NOT EXISTS entity_reviews (
  id VARCHAR(64) PRIMARY KEY,
  entity_type VARCHAR(32) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  author_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name VARCHAR(255) NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (entity_type, entity_id, author_id)
);
CREATE INDEX IF NOT EXISTS idx_entity_reviews_public ON entity_reviews(entity_type, entity_id, status);

CREATE TABLE IF NOT EXISTS media_likes (
  id VARCHAR(64) PRIMARY KEY,
  media_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (media_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_media_likes_media ON media_likes(media_id);
CREATE INDEX IF NOT EXISTS idx_media_likes_user ON media_likes(user_id);

CREATE TABLE IF NOT EXISTS media_reactions (
  id VARCHAR(64) PRIMARY KEY,
  media_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  reaction_type VARCHAR(32) NOT NULL DEFAULT 'THUMBS_UP',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (media_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_media_reactions_media ON media_reactions(media_id);

CREATE TABLE IF NOT EXISTS media_comments (
  id VARCHAR(64) PRIMARY KEY,
  media_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_role VARCHAR(128),
  author_avatar TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_media_comments_media ON media_comments(media_id);

CREATE TABLE IF NOT EXISTS media_shares (
  id VARCHAR(64) PRIMARY KEY,
  media_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64),
  platform VARCHAR(64) DEFAULT 'DIRECT_LINK',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_media_shares_media ON media_shares(media_id);

CREATE TABLE IF NOT EXISTS media_reposts (
  id VARCHAR(64) PRIMARY KEY,
  media_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(255),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (media_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_media_reposts_user ON media_reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_media_reposts_media ON media_reposts(media_id);

CREATE TABLE IF NOT EXISTS community_members (
  id VARCHAR(64) PRIMARY KEY,
  community_id VARCHAR(64) NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'MEMBER',
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (community_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_members_comm ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_status ON community_members(community_id, status);

CREATE TABLE IF NOT EXISTS community_post_reposts (
  id VARCHAR(64) PRIMARY KEY,
  post_id VARCHAR(64) NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_comm_reposts_post ON community_post_reposts(post_id);
CREATE INDEX IF NOT EXISTS idx_comm_reposts_user ON community_post_reposts(user_id);
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

export const SQLITE_COLUMN_STATEMENTS = [
  'ALTER TABLE community_posts ADD COLUMN rejection_reason TEXT',
  'ALTER TABLE community_posts ADD COLUMN moderation_note TEXT',
  'ALTER TABLE communities ADD COLUMN suspension_reason TEXT',
  'ALTER TABLE communities ADD COLUMN change_request TEXT',
  'ALTER TABLE communities ADD COLUMN visibility TEXT DEFAULT \'PUBLIC\'',
  'ALTER TABLE users ADD COLUMN capabilities TEXT DEFAULT \'[]\'',
  'ALTER TABLE users ADD COLUMN town_city TEXT',
  'ALTER TABLE users ADD COLUMN profession TEXT',
  'ALTER TABLE users ADD COLUMN interests TEXT DEFAULT \'[]\'',
  'ALTER TABLE users ADD COLUMN company TEXT',
  'ALTER TABLE users ADD COLUMN is_restricted INTEGER DEFAULT 0',
  'ALTER TABLE users ADD COLUMN restricted_reason TEXT',
  'ALTER TABLE community_posts ADD COLUMN post_type TEXT DEFAULT \'POST\'',
  'ALTER TABLE community_posts ADD COLUMN visibility TEXT DEFAULT \'PUBLIC\'',
  'ALTER TABLE community_posts ADD COLUMN poll_options TEXT DEFAULT \'[]\'',
  'ALTER TABLE community_posts ADD COLUMN poll_votes TEXT DEFAULT \'[]\'',
  'ALTER TABLE community_posts ADD COLUMN ama_host_name TEXT',
  'ALTER TABLE community_posts ADD COLUMN ama_host_role TEXT',
  'ALTER TABLE community_posts ADD COLUMN ama_status TEXT DEFAULT \'LIVE\'',
  'ALTER TABLE community_posts ADD COLUMN ama_start_time TEXT',
  'ALTER TABLE community_posts ADD COLUMN ama_end_time TEXT',
  'ALTER TABLE community_comments ADD COLUMN is_ama_answer INTEGER DEFAULT 0',
  'ALTER TABLE community_comments ADD COLUMN author_avatar TEXT',
  'ALTER TABLE community_comments ADD COLUMN is_deleted INTEGER DEFAULT 0',
  'ALTER TABLE community_comments ADD COLUMN deleted_at TEXT',
  'ALTER TABLE community_comments ADD COLUMN deleted_by TEXT',
  'ALTER TABLE community_comments ADD COLUMN original_content TEXT',
  'ALTER TABLE buyer_leads ADD COLUMN seeker_id TEXT',
  'ALTER TABLE buyer_leads ADD COLUMN property_id TEXT',
  'ALTER TABLE buyer_leads ADD COLUMN consent_granted INTEGER DEFAULT 0',
  'ALTER TABLE buyer_leads ADD COLUMN consent_version TEXT',
  'ALTER TABLE buyer_leads ADD COLUMN consent_purpose TEXT',
  'ALTER TABLE buyer_leads ADD COLUMN consented_at TEXT',
  'ALTER TABLE property_requirements ADD COLUMN status TEXT DEFAULT \'ACTIVE\'',
  'ALTER TABLE property_requirements ADD COLUMN deleted_at TEXT',
  'ALTER TABLE property_requirements ADD COLUMN deleted_by TEXT',
  'ALTER TABLE community_posts ADD COLUMN deletion_status TEXT DEFAULT \'NONE\'',
  'ALTER TABLE community_posts ADD COLUMN deletion_reason TEXT',
  'ALTER TABLE community_posts ADD COLUMN deletion_requested_at TEXT',
  'ALTER TABLE community_posts ADD COLUMN deletion_requested_by TEXT',
  'ALTER TABLE community_posts ADD COLUMN deletion_reviewed_at TEXT',
  'ALTER TABLE community_posts ADD COLUMN deletion_reviewed_by TEXT',
  'ALTER TABLE community_posts ADD COLUMN deletion_rejection_reason TEXT',
  'ALTER TABLE community_posts ADD COLUMN previous_status TEXT'
];

export const SQLITE_TABLE_SQL = `
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
CREATE TABLE IF NOT EXISTS community_post_votes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vote INTEGER NOT NULL CHECK (vote IN (1, -1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (post_id, user_id)
);
CREATE TABLE IF NOT EXISTS community_post_follows (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (post_id, user_id)
);
CREATE TABLE IF NOT EXISTS user_follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (follower_id, following_id)
);
CREATE TABLE IF NOT EXISTS community_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, post_id)
);
CREATE TABLE IF NOT EXISTS property_requirements (
  id TEXT PRIMARY KEY,
  seeker_id TEXT NOT NULL,
  property_type TEXT NOT NULL,
  location TEXT,
  budget TEXT,
  details TEXT,
  status TEXT DEFAULT 'ACTIVE',
  deleted_at TEXT,
  deleted_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS entity_reviews (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (entity_type, entity_id, author_id)
);

CREATE TABLE IF NOT EXISTS media_likes (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (media_id, user_id)
);
CREATE TABLE IF NOT EXISTS media_reactions (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'THUMBS_UP',
  created_at TEXT NOT NULL,
  UNIQUE (media_id, user_id)
);
CREATE TABLE IF NOT EXISTS media_comments (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT,
  author_avatar TEXT,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media_shares (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  user_id TEXT,
  platform TEXT DEFAULT 'DIRECT_LINK',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media_reposts (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (media_id, user_id)
);
CREATE TABLE IF NOT EXISTS community_members (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (community_id, user_id)
);
CREATE TABLE IF NOT EXISTS community_post_reposts (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (post_id, user_id)
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
