import pg from 'pg';

// Register PostgreSQL type parsers for Neon compatibility
// Type ID 1700 (NUMERIC/DECIMAL) -> JavaScript number
pg.types.setTypeParser(1700, (val: string) => (val === null ? null : parseFloat(val)));
// Type ID 20 (BIGINT/INT8) -> JavaScript number
pg.types.setTypeParser(20, (val: string) => (val === null ? null : parseInt(val, 10)));

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

export function getPostgresPool(): pg.Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!poolInstance) {
    const isSslDisabled = process.env.PGSSLMODE === 'disable' || process.env.DATABASE_URL.includes('sslmode=disable');
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.PG_POOL_MAX) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // 10s for Neon cold-start wake-up
      ssl: isSslDisabled ? false : { rejectUnauthorized: false }
    });

    poolInstance.on('error', (err: any) => {
      console.error('[PostgreSQL] Unexpected error on idle client:', err);
    });
  }

  return poolInstance;
}

export async function checkPostgresHealth(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
  const pool = getPostgresPool();
  if (!pool) {
    return { connected: false, error: 'DATABASE_URL is not configured' };
  }

  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return { connected: true, latencyMs: Date.now() - start };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return { connected: false, error: err.message || 'Failed to connect to PostgreSQL' };
  }
}

/**
 * Executes additive DDL migrations to ensure all production PostgreSQL tables exist
 */
export async function runPostgresMigrations(): Promise<boolean> {
  const pool = getPostgresPool();
  if (!pool) {
    console.log('[PostgreSQL Migration] No DATABASE_URL set. Running in local persistence mode.');
    return false;
  }

  console.log('[PostgreSQL Migration] Connecting to managed PostgreSQL database...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        public_id VARCHAR(64) UNIQUE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(64),
        role VARCHAR(32) NOT NULL DEFAULT 'PROPERTY_SEEKER',
        avatar TEXT,
        organization VARCHAR(255),
        wallet_balance NUMERIC(14, 2) DEFAULT 0.00,
        is_verified SMALLINT DEFAULT 0,
        email_verified SMALLINT DEFAULT 0,
        phone_verified SMALLINT DEFAULT 0,
        account_status VARCHAR(32) DEFAULT 'ACTIVE',
        must_change_password SMALLINT DEFAULT 0,
        assigned_properties TEXT DEFAULT '[]',
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_email ON users(LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);

    // 2. Sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL,
        is_revoked SMALLINT DEFAULT 0,
        user_agent TEXT,
        ip_address VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `);

    // 3. OTP verification table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id VARCHAR(64) PRIMARY KEY,
        target VARCHAR(255) NOT NULL,
        type VARCHAR(64) NOT NULL,
        otp_hash VARCHAR(128) NOT NULL,
        otp_raw VARCHAR(32),
        expires_at BIGINT NOT NULL,
        attempt_count SMALLINT DEFAULT 0,
        is_verified SMALLINT DEFAULT 0,
        consumed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_otps_target_type ON otps(target, type);
    `);

    // 4. Immutable Audit Logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        actor_id VARCHAR(64) NOT NULL,
        actor_email VARCHAR(255) NOT NULL,
        actor_role VARCHAR(32) NOT NULL,
        action VARCHAR(64) NOT NULL,
        target_id VARCHAR(64),
        target_email VARCHAR(255),
        details TEXT,
        ip_address VARCHAR(64),
        status VARCHAR(32) DEFAULT 'SUCCESS',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `);

    // 5. Communities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS communities (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        description TEXT NOT NULL,
        category VARCHAR(128) NOT NULL,
        location VARCHAR(255),
        created_by_id VARCHAR(64),
        created_by_name VARCHAR(255),
        status VARCHAR(32) DEFAULT 'PENDING_APPROVAL',
        rejection_reason TEXT,
        member_count INTEGER DEFAULT 1,
        icon TEXT,
        banner_image TEXT,
        rules TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_communities_status ON communities(status);
      CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
    `);

    // 6. Community Posts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_posts (
        id VARCHAR(64) PRIMARY KEY,
        author_id VARCHAR(64),
        author_name VARCHAR(255) NOT NULL,
        author_role VARCHAR(32) NOT NULL,
        community_id VARCHAR(64),
        community_name VARCHAR(255),
        property_id VARCHAR(64),
        property_name VARCHAR(255),
        topic VARCHAR(128) NOT NULL,
        title VARCHAR(512) NOT NULL,
        content TEXT NOT NULL,
        links TEXT DEFAULT '[]',
        attachments TEXT DEFAULT '[]',
        media_type VARCHAR(32) DEFAULT 'POST',
        media_url TEXT,
        thumbnail_url TEXT,
        duration VARCHAR(32),
        status VARCHAR(32) DEFAULT 'PUBLISHED',
        upvotes INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        is_pinned SMALLINT DEFAULT 0,
        is_flagged SMALLINT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_community_posts_community_id ON community_posts(community_id);
      CREATE INDEX IF NOT EXISTS idx_community_posts_status ON community_posts(status);
      CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at);
    `);

    // 7. Post Likes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id VARCHAR(64) PRIMARY KEY,
        post_id VARCHAR(64) NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_post_user_like UNIQUE(post_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
      CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
    `);

    // 8. Community Comments & Nested Replies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_comments (
        id VARCHAR(64) PRIMARY KEY,
        post_id VARCHAR(64) NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
        parent_id VARCHAR(64) REFERENCES community_comments(id) ON DELETE CASCADE,
        author_id VARCHAR(64) NOT NULL,
        author_name VARCHAR(255) NOT NULL,
        author_role VARCHAR(32) NOT NULL,
        content TEXT NOT NULL,
        likes_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_community_comments_parent_id ON community_comments(parent_id);
    `);

    // 9. Comment Likes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id VARCHAR(64) PRIMARY KEY,
        comment_id VARCHAR(64) NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_comment_user_like UNIQUE(comment_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);

      -- Defensive constraint checks for existing installations
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_post_likes_user'
        ) THEN
          BEGIN
            ALTER TABLE post_likes ADD CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_comment_likes_user'
        ) THEN
          BEGIN
            ALTER TABLE comment_likes ADD CONSTRAINT fk_comment_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END IF;
      END $$;
    `);

    // 10. Community Replies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_replies (
        id VARCHAR(64) PRIMARY KEY,
        post_id VARCHAR(64) NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
        author_id VARCHAR(64),
        author_name VARCHAR(255) NOT NULL,
        author_role VARCHAR(32) NOT NULL,
        is_verified_builder SMALLINT DEFAULT 0,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_community_replies_post_id ON community_replies(post_id);
    `);

    // 11. Moderation Reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS moderation_reports (
        id VARCHAR(64) PRIMARY KEY,
        reporter_id VARCHAR(64) NOT NULL,
        reporter_name VARCHAR(255) NOT NULL,
        target_type VARCHAR(32) NOT NULL,
        target_id VARCHAR(64) NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(32) DEFAULT 'PENDING',
        reviewed_by VARCHAR(64),
        resolution_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_mod_reports_status ON moderation_reports(status);
    `);

    // 11. Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        actor_id VARCHAR(64) NOT NULL,
        actor_name VARCHAR(255) NOT NULL,
        type VARCHAR(32) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link_url TEXT,
        is_read SMALLINT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read);
    `);

    // 12. Community Events table (For cross-instance SSE sync)
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_events (
        id VARCHAR(64) PRIMARY KEY,
        event_type VARCHAR(64) NOT NULL,
        payload TEXT NOT NULL,
        target_user_id VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_community_events_created_at ON community_events(created_at);
    `);

    // 13. Auxiliary tables (Media, Leads, Conference, Metadata)
    await client.query(`
      CREATE TABLE IF NOT EXISTS media_items (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        summary TEXT NOT NULL,
        video_url TEXT NOT NULL,
        thumbnail TEXT NOT NULL,
        type VARCHAR(32) NOT NULL,
        duration VARCHAR(32) DEFAULT '15:00',
        views INTEGER DEFAULT 0,
        author_name VARCHAR(255) DEFAULT 'Swamy Reddy Javidi',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS buyer_leads (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(64) NOT NULL,
        email VARCHAR(255),
        budget VARCHAR(128) NOT NULL,
        property_type VARCHAR(128) NOT NULL,
        micro_market VARCHAR(128) NOT NULL,
        tier VARCHAR(32) NOT NULL,
        price NUMERIC(14, 2) NOT NULL,
        requirements TEXT,
        status VARCHAR(32) DEFAULT 'AVAILABLE',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS conference_details (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255) NOT NULL,
        date VARCHAR(64) NOT NULL,
        time VARCHAR(64) NOT NULL,
        stream_url TEXT,
        status VARCHAR(32) DEFAULT 'UPCOMING',
        agenda TEXT DEFAULT '[]',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS system_metadata (
        key VARCHAR(128) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('[PostgreSQL Migration] All PostgreSQL tables, indexes, and constraints migrated successfully.');
    return true;
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[PostgreSQL Migration] Error applying PostgreSQL migrations:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute parameterized query on PostgreSQL pool.
 * Fails clearly if DATABASE_URL is missing or connection fails.
 */
export async function queryPostgres<T extends pg.QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<pg.QueryResult<T>> {
  const pool = getPostgresPool();
  if (!pool) {
    throw new Error('PostgreSQL connection unavailable: DATABASE_URL is not configured.');
  }
  return pool.query<T>(text, params);
}

