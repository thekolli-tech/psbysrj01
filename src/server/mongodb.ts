import { MongoClient, Db } from 'mongodb';
import type { UserRole } from '../types/index.js';

export interface MongoUserDocument {
  id: string;
  public_id?: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  organization?: string;
  wallet_balance: number;
  email_verified: boolean;
  phone_verified: boolean;
  account_status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  password_hash: string;
  salt: string;
  created_at: string;
  updated_at: string;
}

export interface MongoRegistrationRecord {
  registration_id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  organization?: string;
  verification: {
    email_verified: boolean;
    phone_verified: boolean;
    email_channel: string;
    phone_channel?: string;
    verified_at: string;
  };
  client_metadata: {
    ip_address?: string;
    user_agent?: string;
  };
  created_at: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
}

export interface MongoPostDocument {
  id: string;
  author_id?: string;
  author_name: string;
  author_role: string;
  community_id?: string;
  community_name?: string;
  property_id?: string;
  property_name?: string;
  topic: string;
  title: string;
  content: string;
  links: any[];
  attachments: any[];
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  duration?: string;
  status: string;
  upvotes: number;
  comments_count: number;
  is_pinned: boolean;
  is_flagged: boolean;
  created_at: string;
  updated_at: string;
}

export interface SanitizedMongoError {
  category: 'ATLAS_NETWORK_ACCESS_BLOCKED' | 'AUTH_FAILURE' | 'DNS_FAILURE' | 'TIMEOUT' | 'NOT_CONFIGURED' | 'UNKNOWN';
  message: string;
  configurationAttention: string;
}

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnecting = false;
let lastSanitizedError: SanitizedMongoError | null = null;

const DEFAULT_DB_NAME = 'property_studio';

/**
 * Strips sensitive credentials, passwords, and URIs from any error text.
 */
export function sanitizeMongoErrorMessage(rawMsg: string): SanitizedMongoError {
  const safeText = String(rawMsg || '')
    .replace(/mongodb(\+srv)?:\/\/[^@]+@/gi, 'mongodb+srv://[REDACTED_CREDENTIALS]@')
    .replace(/:([^\s:@/]+)@/g, ':[REDACTED]@');

  if (
    safeText.includes('SSL alert number 80') ||
    safeText.includes('tlsv1 alert internal error') ||
    safeText.includes('ssl3_read_bytes')
  ) {
    return {
      category: 'ATLAS_NETWORK_ACCESS_BLOCKED',
      message: 'MongoDB Atlas TLS handshake rejected (SSL alert 80). The outbound IP address of this runtime environment is not in your MongoDB Atlas IP Access List.',
      configurationAttention: 'Log in to MongoDB Atlas Console -> Security -> Network Access -> IP Access List -> Click "Add IP Address" -> Select "Allow Access from Anywhere" (0.0.0.0/0) or add current Cloud Run outbound IP.'
    };
  }

  if (safeText.includes('bad auth') || safeText.includes('AuthenticationFailed')) {
    return {
      category: 'AUTH_FAILURE',
      message: 'MongoDB authentication failed. Credentials in MONGODB_URI were rejected by the cluster.',
      configurationAttention: 'Verify database user credentials in MongoDB Atlas Console -> Security -> Database Access.'
    };
  }

  if (safeText.includes('ENOTFOUND') || safeText.includes('querySrv')) {
    return {
      category: 'DNS_FAILURE',
      message: 'DNS lookup for MongoDB SRV host failed.',
      configurationAttention: 'Check the cluster hostname in MONGODB_URI.'
    };
  }

  if (safeText.includes('timed out') || safeText.includes('ServerSelectionTimeoutError')) {
    return {
      category: 'TIMEOUT',
      message: 'Connection to MongoDB cluster timed out.',
      configurationAttention: 'Check cluster network accessibility and Atlas cluster status.'
    };
  }

  return {
    category: 'UNKNOWN',
    message: safeText.substring(0, 200),
    configurationAttention: 'Check server logs and MONGODB_URI configuration.'
  };
}

/**
 * Initializes and connects to the MongoDB cluster.
 * Reads MONGODB_URI or MONGO_URI from server environment.
 */
export async function connectMongoDB(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    lastSanitizedError = {
      category: 'NOT_CONFIGURED',
      message: 'MONGODB_URI environment variable is not defined.',
      configurationAttention: 'Configure MONGODB_URI in server environment variables.'
    };
    return null;
  }

  if (db && client) {
    return db;
  }

  if (isConnecting) {
    return null;
  }

  isConnecting = true;

  try {
    const mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 8000,
      maxPoolSize: 20
    });

    await mongoClient.connect();
    client = mongoClient;
    const dbName = process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME;
    db = client.db(dbName);
    lastSanitizedError = null;

    console.log(`[MongoDB] Connected successfully to database: ${db.databaseName}`);

    // Ensure collections and unique indexes
    await ensureMongoIndexes(db);

    return db;
  } catch (err: any) {
    lastSanitizedError = sanitizeMongoErrorMessage(err?.message || 'Failed to connect');
    console.warn(`[MongoDB Status] ${lastSanitizedError.message}`);
    return null;
  } finally {
    isConnecting = false;
  }
}

/**
 * Creates essential indexes across all persistent application collections.
 * Safe and non-destructive: never drops collections or data.
 */
export async function ensureMongoIndexes(database: Db): Promise<void> {
  try {
    // 1. Users
    const usersCol = database.collection<MongoUserDocument>('users');
    await usersCol.createIndex({ email: 1 }, { unique: true });
    await usersCol.createIndex({ role: 1 });
    await usersCol.createIndex({ account_status: 1 });
    await usersCol.createIndex({ created_at: -1 });

    // 2. Registrations (Audit of public registrations)
    const registrationsCol = database.collection<MongoRegistrationRecord>('registrations');
    await registrationsCol.createIndex({ email: 1 });
    await registrationsCol.createIndex({ role: 1 });
    await registrationsCol.createIndex({ 'verification.phone_verified': 1 });
    await registrationsCol.createIndex({ created_at: -1 });

    // 3. Sessions
    const sessionsCol = database.collection('sessions');
    await sessionsCol.createIndex({ id: 1 }, { unique: true });
    await sessionsCol.createIndex({ user_id: 1 });
    await sessionsCol.createIndex({ expires_at: 1 });

    // 4. OTP Metadata
    const otpsCol = database.collection('otps');
    await otpsCol.createIndex({ target: 1, type: 1 });
    await otpsCol.createIndex({ expires_at: 1 });

    // 5. Community Posts
    const postsCol = database.collection<MongoPostDocument>('community_posts');
    await postsCol.createIndex({ id: 1 }, { unique: true });
    await postsCol.createIndex({ topic: 1 });
    await postsCol.createIndex({ community_id: 1 });
    await postsCol.createIndex({ is_pinned: -1, created_at: -1 });

    // 6. Post Likes (Unique post_id + user_id prevents duplicate likes)
    const postLikesCol = database.collection('post_likes');
    await postLikesCol.createIndex({ post_id: 1, user_id: 1 }, { unique: true });

    // 7. Community Comments
    const commentsCol = database.collection('community_comments');
    await commentsCol.createIndex({ id: 1 }, { unique: true });
    await commentsCol.createIndex({ post_id: 1, created_at: 1 });

    // 8. Comment Likes
    const commentLikesCol = database.collection('comment_likes');
    await commentLikesCol.createIndex({ comment_id: 1, user_id: 1 }, { unique: true });

    // 9. Buyer Leads
    const leadsCol = database.collection('buyer_leads');
    await leadsCol.createIndex({ id: 1 }, { unique: true });
    await leadsCol.createIndex({ tier: 1 });
    await leadsCol.createIndex({ status: 1 });
    await leadsCol.createIndex({ created_at: -1 });

    // 10. Media & Podcasts
    const mediaCol = database.collection('media_items');
    await mediaCol.createIndex({ id: 1 }, { unique: true });
    await mediaCol.createIndex({ type: 1 });
    await mediaCol.createIndex({ created_at: -1 });

    // 11. Notifications
    const notifsCol = database.collection('notifications');
    await notifsCol.createIndex({ user_id: 1, is_read: 1 });
    await notifsCol.createIndex({ created_at: -1 });

    // 12. Audit Logs
    const auditCol = database.collection('audit_logs');
    await auditCol.createIndex({ created_at: -1 });
    await auditCol.createIndex({ action: 1 });
    await auditCol.createIndex({ actor_id: 1 });

    // 13. Communities
    const commCol = database.collection('communities');
    await commCol.createIndex({ slug: 1 }, { unique: true });
    await commCol.createIndex({ status: 1 });

    console.log('[MongoDB] All collections and production indexes initialized safely.');
  } catch (err: any) {
    console.warn('[MongoDB Index Warning]:', err.message);
  }
}

/**
 * Check MongoDB connection status
 */
export function isMongoConnected(): boolean {
  return Boolean(client && db);
}

/**
 * Get detailed MongoDB health, readiness, and configuration status
 */
export async function getMongoHealth(): Promise<{
  connected: boolean;
  configured: boolean;
  databaseName?: string;
  collections?: string[];
  totalRegistrations?: number;
  totalUsers?: number;
  errorCategory?: string;
  configurationAttention?: string;
  error?: string | null;
}> {
  const uriConfigured = Boolean(process.env.MONGODB_URI || process.env.MONGO_URI);

  if (!db) {
    if (uriConfigured && !isConnecting) {
      await connectMongoDB().catch(() => {});
    }
  }

  if (!db) {
    return {
      connected: false,
      configured: uriConfigured,
      errorCategory: lastSanitizedError?.category || (uriConfigured ? 'ATLAS_NETWORK_ACCESS_BLOCKED' : 'NOT_CONFIGURED'),
      configurationAttention: lastSanitizedError?.configurationAttention || 'Configure MONGODB_URI in server environment and allow IP access in MongoDB Atlas.',
      error: lastSanitizedError?.message || (uriConfigured ? 'Connecting to MongoDB Atlas...' : 'MONGODB_URI not configured in server environment')
    };
  }

  try {
    const collectionsList = await db.listCollections().toArray();
    const regCount = await db.collection('registrations').countDocuments();
    const userCount = await db.collection('users').countDocuments();

    return {
      connected: true,
      configured: true,
      databaseName: db.databaseName,
      collections: collectionsList.map(c => c.name),
      totalRegistrations: regCount,
      totalUsers: userCount,
      error: null
    };
  } catch (err: any) {
    const sanitized = sanitizeMongoErrorMessage(err?.message || 'Query error');
    return {
      connected: false,
      configured: true,
      errorCategory: sanitized.category,
      configurationAttention: sanitized.configurationAttention,
      error: sanitized.message
    };
  }
}

/**
 * Persists an account registration to MongoDB.
 * Dual-persists into both 'users' and 'registrations' collections.
 */
export async function saveRegistrationToMongo(
  user: {
    id: string;
    public_id?: string;
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    avatar?: string;
    organization?: string;
    wallet_balance: number;
    email_verified: number | boolean;
    phone_verified: number | boolean;
    account_status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
    password_hash: string;
    salt: string;
    created_at: string;
    updated_at: string;
  },
  metadata?: {
    ip_address?: string;
    user_agent?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    await connectMongoDB().catch(() => {});
  }

  if (!db) {
    return { success: false, error: lastSanitizedError?.message || 'MongoDB connection not active' };
  }

  try {
    const now = new Date().toISOString();

    // 1. Upsert into 'users' collection in MongoDB
    const usersCol = db.collection<MongoUserDocument>('users');
    await usersCol.updateOne(
      { email: user.email.toLowerCase() },
      {
        $set: {
          id: user.id,
          public_id: user.public_id,
          name: user.name,
          email: user.email.toLowerCase(),
          phone: user.phone || '',
          role: user.role,
          avatar: user.avatar,
          organization: user.organization || '',
          wallet_balance: user.wallet_balance || 0,
          email_verified: Boolean(user.email_verified),
          phone_verified: Boolean(user.phone_verified),
          account_status: user.account_status,
          password_hash: user.password_hash,
          salt: user.salt,
          updated_at: now
        },
        $setOnInsert: {
          created_at: user.created_at || now
        }
      },
      { upsert: true }
    );

    // 2. Insert immutable registration log into 'registrations' collection in MongoDB
    const registrationsCol = db.collection<MongoRegistrationRecord>('registrations');
    const registrationRecord: MongoRegistrationRecord = {
      registration_id: `mreg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: user.id,
      name: user.name,
      email: user.email.toLowerCase(),
      phone: user.phone || '',
      role: user.role,
      organization: user.organization || '',
      verification: {
        email_verified: Boolean(user.email_verified),
        phone_verified: Boolean(user.phone_verified),
        email_channel: 'RESEND_EMAIL_OTP',
        phone_channel: user.role === 'PROPERTY_SEEKER' ? 'SMS_CARRIER_OTP' : undefined,
        verified_at: now
      },
      client_metadata: {
        ip_address: metadata?.ip_address,
        user_agent: metadata?.user_agent
      },
      created_at: now,
      status: 'ACTIVE'
    };

    await registrationsCol.insertOne(registrationRecord as any);

    console.log(`[MongoDB] Registration record saved successfully for ${user.email} (Role: ${user.role}, PhoneVerified: ${Boolean(user.phone_verified)})`);
    return { success: true };
  } catch (err: any) {
    const sanitized = sanitizeMongoErrorMessage(err?.message || 'Save error');
    console.warn(`[MongoDB Error] Failed to persist registration to MongoDB:`, sanitized.message);
    return { success: false, error: sanitized.message };
  }
}

/**
 * Retrieve recent registration documents from MongoDB
 */
export async function getRecentMongoRegistrations(limit = 50): Promise<MongoRegistrationRecord[]> {
  if (!db) {
    await connectMongoDB().catch(() => {});
  }
  if (!db) return [];

  try {
    const col = db.collection<MongoRegistrationRecord>('registrations');
    return await col.find().sort({ created_at: -1 }).limit(limit).toArray() as any;
  } catch (err: any) {
    console.warn('[MongoDB Query Error]:', err.message);
    return [];
  }
}
