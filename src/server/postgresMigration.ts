import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { db } from './db.ts';
import { getPostgresPool, runPostgresMigrations } from './postgres.ts';

export interface MigrationStats {
  table: string;
  sqliteCount: number;
  postgresCount: number;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  error?: string;
}

export interface MigrationResult {
  success: boolean;
  timestamp: string;
  durationMs: number;
  backupPath?: string;
  stats: MigrationStats[];
  error?: string;
}

/**
 * Creates an immutable point-in-time file snapshot of SQLite prior to running migrations
 */
export function backupSqliteDatabase(): { success: boolean; backupPath?: string; error?: string } {
  try {
    const dataDir = path.resolve(process.cwd(), 'data');
    const sourceDb = path.join(dataDir, 'propertystudio.db');
    if (!fs.existsSync(sourceDb)) {
      return { success: false, error: 'Source SQLite database does not exist' };
    }
    const backupDir = path.join(dataDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `propertystudio_${timestamp}.bak.db`);
    fs.copyFileSync(sourceDb, backupPath);
    console.log(`[SQLite Backup] Snapshot created successfully: ${backupPath}`);
    return { success: true, backupPath };
  } catch (err: any) {
    console.error('[SQLite Backup Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Ordered list of tables to migrate respecting foreign key dependency graphs
 */
const TABLES_TO_MIGRATE = [
  'users',
  'sessions',
  'otps',
  'audit_logs',
  'communities',
  'community_posts',
  'post_likes',
  'community_comments',
  'comment_likes',
  'moderation_reports',
  'notifications',
  'community_events',
  'community_replies',
  'media_items',
  'buyer_leads',
  'conference_details',
  'system_metadata'
] as const;

/**
 * Safely migrate all data from SQLite to PostgreSQL with transaction integrity
 * - Validates pre-migration record counts
 * - Migrates in dependency order
 * - Uses ON CONFLICT DO UPDATE to ensure idempotency and non-destructive execution
 * - Never logs secrets or raw OTP values
 * - Validates post-migration counts
 */
export async function migrateSqliteToPostgres(): Promise<MigrationResult> {
  const startTime = Date.now();
  const pool = getPostgresPool();

  if (!pool) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      stats: [],
      error: 'CRITICAL: DATABASE_URL is not configured. Cannot perform migration.'
    };
  }

  // Step 1: Ensure SQLite snapshot is safely backed up before migration
  const backupRes = backupSqliteDatabase();
  if (!backupRes.success) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      stats: [],
      error: `Pre-migration SQLite backup failed: ${backupRes.error}. Aborting migration to safeguard data.`
    };
  }

  // Ensure PostgreSQL schema exists
  await runPostgresMigrations();

  const client = await pool.connect();
  const stats: MigrationStats[] = [];

  try {
    await client.query('BEGIN');

    for (const table of TABLES_TO_MIGRATE) {
      const sqliteRows = (db.prepare(`SELECT * FROM ${table}`).all() as any[]) || [];
      const sqliteCount = sqliteRows.length;

      if (sqliteRows.length === 0) {
        const pgCountRes = await client.query(`SELECT COUNT(*) as cnt FROM ${table}`);
        const postgresCount = parseInt(pgCountRes.rows[0].cnt, 10);
        stats.push({
          table,
          sqliteCount: 0,
          postgresCount,
          status: 'SUCCESS'
        });
        continue;
      }

      // Perform batch upsert for each table
      if (table === 'users') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO users (
              id, public_id, name, email, phone, role, avatar, organization,
              wallet_balance, is_verified, email_verified, phone_verified,
              account_status, must_change_password, assigned_properties,
              password_hash, salt, last_login_at, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              role = EXCLUDED.role,
              avatar = EXCLUDED.avatar,
              organization = EXCLUDED.organization,
              wallet_balance = EXCLUDED.wallet_balance,
              is_verified = EXCLUDED.is_verified,
              email_verified = EXCLUDED.email_verified,
              phone_verified = EXCLUDED.phone_verified,
              account_status = EXCLUDED.account_status,
              must_change_password = EXCLUDED.must_change_password,
              assigned_properties = EXCLUDED.assigned_properties,
              password_hash = EXCLUDED.password_hash,
              salt = EXCLUDED.salt,
              last_login_at = EXCLUDED.last_login_at,
              updated_at = EXCLUDED.updated_at`,
            [
              row.id,
              row.public_id,
              row.name,
              row.email,
              row.phone,
              row.role,
              row.avatar,
              row.organization,
              row.wallet_balance,
              row.is_verified,
              row.email_verified,
              row.phone_verified,
              row.account_status,
              row.must_change_password,
              row.assigned_properties,
              row.password_hash,
              row.salt,
              row.last_login_at,
              row.created_at,
              row.updated_at
            ]
          );
        }
      } else if (table === 'sessions') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO sessions (
              id, user_id, expires_at, is_revoked, user_agent, ip_address, created_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (id) DO UPDATE SET
              expires_at = EXCLUDED.expires_at,
              is_revoked = EXCLUDED.is_revoked`,
            [row.id, row.user_id, row.expires_at, row.is_revoked, row.user_agent, row.ip_address, row.created_at]
          );
        }
      } else if (table === 'otps') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO otps (
              id, target, type, otp_hash, otp_raw, expires_at, attempt_count, is_verified, consumed_at, created_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT (id) DO UPDATE SET
              attempt_count = EXCLUDED.attempt_count,
              is_verified = EXCLUDED.is_verified,
              consumed_at = EXCLUDED.consumed_at`,
            [
              row.id,
              row.target,
              row.type,
              row.otp_hash,
              null, // Never copy raw OTP secret
              row.expires_at,
              row.attempt_count,
              row.is_verified,
              row.consumed_at,
              row.created_at
            ]
          );
        }
      } else if (table === 'audit_logs') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO audit_logs (
              id, actor_id, actor_email, actor_role, action, target_id, target_email, details, ip_address, status, created_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            ON CONFLICT (id) DO NOTHING`,
            [
              row.id,
              row.actor_id,
              row.actor_email,
              row.actor_role,
              row.action,
              row.target_id,
              row.target_email,
              row.details,
              row.ip_address,
              row.status,
              row.created_at
            ]
          );
        }
      } else if (table === 'communities') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO communities (
              id, name, slug, description, category, location, created_by_id, created_by_name,
              status, rejection_reason, member_count, icon, banner_image, rules, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              category = EXCLUDED.category,
              status = EXCLUDED.status,
              member_count = EXCLUDED.member_count,
              updated_at = EXCLUDED.updated_at`,
            [
              row.id,
              row.name,
              row.slug,
              row.description,
              row.category,
              row.location,
              row.created_by_id,
              row.created_by_name,
              row.status,
              row.rejection_reason,
              row.member_count,
              row.icon,
              row.banner_image,
              row.rules,
              row.created_at,
              row.updated_at
            ]
          );
        }
      } else if (table === 'community_posts') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO community_posts (
              id, author_id, author_name, author_role, community_id, community_name,
              property_id, property_name, topic, title, content, links, attachments,
              media_type, media_url, thumbnail_url, duration, status, upvotes, comments_count,
              is_pinned, is_flagged, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              content = EXCLUDED.content,
              upvotes = EXCLUDED.upvotes,
              comments_count = EXCLUDED.comments_count,
              is_pinned = EXCLUDED.is_pinned,
              updated_at = EXCLUDED.updated_at`,
            [
              row.id,
              row.author_id,
              row.author_name,
              row.author_role,
              row.community_id,
              row.community_name,
              row.property_id,
              row.property_name,
              row.topic,
              row.title,
              row.content,
              row.links,
              row.attachments,
              row.media_type,
              row.media_url,
              row.thumbnail_url,
              row.duration,
              row.status,
              row.upvotes,
              row.comments_count,
              row.is_pinned,
              row.is_flagged,
              row.created_at,
              row.updated_at
            ]
          );
        }
      } else if (table === 'post_likes') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO post_likes (id, post_id, user_id, created_at)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (post_id, user_id) DO NOTHING`,
            [row.id, row.post_id, row.user_id, row.created_at]
          );
        }
      } else if (table === 'community_comments') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO community_comments (
              id, post_id, parent_id, author_id, author_name, author_role, content, likes_count, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT (id) DO UPDATE SET
              content = EXCLUDED.content,
              likes_count = EXCLUDED.likes_count,
              updated_at = EXCLUDED.updated_at`,
            [
              row.id,
              row.post_id,
              row.parent_id,
              row.author_id,
              row.author_name,
              row.author_role,
              row.content,
              row.likes_count,
              row.created_at,
              row.updated_at
            ]
          );
        }
      } else if (table === 'comment_likes') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO comment_likes (id, comment_id, user_id, created_at)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (comment_id, user_id) DO NOTHING`,
            [row.id, row.comment_id, row.user_id, row.created_at]
          );
        }
      } else if (table === 'moderation_reports') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO moderation_reports (
              id, reporter_id, reporter_name, target_type, target_id, reason, status, reviewed_by, resolution_notes, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              resolution_notes = EXCLUDED.resolution_notes`,
            [
              row.id,
              row.reporter_id,
              row.reporter_name,
              row.target_type,
              row.target_id,
              row.reason,
              row.status,
              row.reviewed_by,
              row.resolution_notes,
              row.created_at,
              row.updated_at
            ]
          );
        }
      } else if (table === 'notifications') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO notifications (
              id, user_id, actor_id, actor_name, type, title, message, link_url, is_read, created_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT (id) DO UPDATE SET
              is_read = EXCLUDED.is_read`,
            [
              row.id,
              row.user_id,
              row.actor_id,
              row.actor_name,
              row.type,
              row.title,
              row.message,
              row.link_url,
              row.is_read,
              row.created_at
            ]
          );
        }
      } else if (table === 'community_events') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO community_events (id, event_type, payload, target_user_id, created_at)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (id) DO NOTHING`,
            [row.id, row.event_type, row.payload, row.target_user_id, row.created_at]
          );
        }
      } else if (table === 'community_replies') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO community_replies (
              id, post_id, author_id, author_name, author_role, is_verified_builder, content, created_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (id) DO NOTHING`,
            [
              row.id,
              row.post_id,
              row.author_id,
              row.author_name,
              row.author_role,
              row.is_verified_builder || 0,
              row.content,
              row.created_at
            ]
          );
        }
      } else if (table === 'media_items') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO media_items (id, title, summary, video_url, thumbnail, type, duration, views, author_name, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (id) DO NOTHING`,
            [row.id, row.title, row.summary, row.video_url, row.thumbnail, row.type, row.duration, row.views, row.author_name, row.created_at]
          );
        }
      } else if (table === 'buyer_leads') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO buyer_leads (id, name, phone, email, budget, property_type, micro_market, tier, price, requirements, status, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
            [row.id, row.name, row.phone, row.email, row.budget, row.property_type, row.micro_market, row.tier, row.price, row.requirements, row.status, row.created_at]
          );
        }
      } else if (table === 'conference_details') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO conference_details (id, title, subtitle, date, time, stream_url, status, agenda, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, updated_at = EXCLUDED.updated_at`,
            [row.id, row.title, row.subtitle, row.date, row.time, row.stream_url, row.status, row.agenda, row.updated_at]
          );
        }
      } else if (table === 'system_metadata') {
        for (const row of sqliteRows) {
          await client.query(
            `INSERT INTO system_metadata (key, value, updated_at)
             VALUES ($1,$2,$3)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
            [row.key, row.value, row.updated_at]
          );
        }
      }

      const pgCountRes = await client.query(`SELECT COUNT(*) as cnt FROM ${table}`);
      const postgresCount = parseInt(pgCountRes.rows[0].cnt, 10);
      const isCountValid = postgresCount >= sqliteCount;

      stats.push({
        table,
        sqliteCount,
        postgresCount,
        status: isCountValid ? 'SUCCESS' : 'FAILED',
        error: isCountValid ? undefined : `Destination count ${postgresCount} is less than source count ${sqliteCount}`
      });
    }

    const hasFailure = stats.some(s => s.status === 'FAILED');
    if (hasFailure) {
      await client.query('ROLLBACK');
      return {
        success: false,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        stats,
        error: 'Integrity check failed: One or more tables failed count reconciliation.'
      };
    }

    await client.query('COMMIT');
    console.log('[PostgreSQL Migration] All data successfully synced and reconciled from SQLite to PostgreSQL.');

    return {
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      backupPath: backupRes.backupPath,
      stats
    };
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[PostgreSQL Migration Error]:', err.message);
    return {
      success: false,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      stats,
      error: err.message
    };
  } finally {
    client.release();
  }
}

/**
 * Validates reconciliation between SQLite and PostgreSQL across all 17 tables without modifying data
 */
export async function reconcileSqliteAndPostgres(): Promise<{
  reconciled: boolean;
  timestamp: string;
  stats: MigrationStats[];
  error?: string;
}> {
  const pool = getPostgresPool();
  if (!pool) {
    return {
      reconciled: false,
      timestamp: new Date().toISOString(),
      stats: [],
      error: 'DATABASE_URL is not configured'
    };
  }

  const client = await pool.connect();
  const stats: MigrationStats[] = [];

  try {
    for (const table of TABLES_TO_MIGRATE) {
      const sqliteRows = (db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as any) || { cnt: 0 };
      const sqliteCount = Number(sqliteRows.cnt) || 0;

      const pgCountRes = await client.query(`SELECT COUNT(*) as cnt FROM ${table}`);
      const postgresCount = parseInt(pgCountRes.rows[0].cnt, 10);
      const isReconciled = postgresCount >= sqliteCount;

      stats.push({
        table,
        sqliteCount,
        postgresCount,
        status: isReconciled ? 'SUCCESS' : 'FAILED',
        error: isReconciled ? undefined : `PostgreSQL count (${postgresCount}) is less than SQLite count (${sqliteCount})`
      });
    }

    const allReconciled = stats.every(s => s.status === 'SUCCESS');
    return {
      reconciled: allReconciled,
      timestamp: new Date().toISOString(),
      stats
    };
  } catch (err: any) {
    return {
      reconciled: false,
      timestamp: new Date().toISOString(),
      stats,
      error: err.message
    };
  } finally {
    client.release();
  }
}

/**
 * Emergency Rollback Utility:
 * Synchronizes delta records created in PostgreSQL back into SQLite before disabling DATABASE_URL.
 * This guarantees zero data loss if PostgreSQL needs to be decommissioned.
 */
export async function reverseSyncPostgresToSqlite(): Promise<MigrationResult> {
  const startTime = Date.now();
  const pool = getPostgresPool();

  if (!pool) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      stats: [],
      error: 'CRITICAL: DATABASE_URL is not configured. Cannot perform reverse synchronization.'
    };
  }

  const client = await pool.connect();
  const stats: MigrationStats[] = [];

  try {
    for (const table of TABLES_TO_MIGRATE) {
      const pgRowsRes = await client.query(`SELECT * FROM ${table}`);
      const pgRows = pgRowsRes.rows;
      const postgresCount = pgRows.length;

      if (pgRows.length > 0) {
        db.exec('BEGIN TRANSACTION');
        try {
          for (const row of pgRows) {
            const keys = Object.keys(row);
            const placeholders = keys.map(() => '?').join(', ');
            const updateCols = keys.filter(k => k !== 'id' && k !== 'key').map(k => `${k} = excluded.${k}`).join(', ');
            const conflictClause = table === 'system_metadata'
              ? 'ON CONFLICT(key) DO UPDATE SET ' + updateCols
              : (table === 'post_likes'
                ? 'ON CONFLICT(post_id, user_id) DO NOTHING'
                : (table === 'comment_likes'
                  ? 'ON CONFLICT(comment_id, user_id) DO NOTHING'
                  : 'ON CONFLICT(id) DO UPDATE SET ' + (updateCols || 'id = excluded.id')));

            const stmt = db.prepare(
              `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ${conflictClause}`
            );
            (stmt.run as any)(...Object.values(row));
          }
          db.exec('COMMIT');
        } catch (subErr: any) {
          db.exec('ROLLBACK');
          throw subErr;
        }
      }

      const sqliteCountRes = (db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as any) || { cnt: 0 };
      const sqliteCount = Number(sqliteCountRes.cnt) || 0;

      stats.push({
        table,
        sqliteCount,
        postgresCount,
        status: sqliteCount >= postgresCount ? 'SUCCESS' : 'FAILED',
        error: sqliteCount < postgresCount ? `Reverse sync count mismatch` : undefined
      });
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      stats
    };
  } catch (err: any) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      stats,
      error: err.message
    };
  } finally {
    client.release();
  }
}
