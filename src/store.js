import { promisify } from 'node:util';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const scrypt = promisify(scryptCallback);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function passwordRecord(password, salt = randomBytes(16).toString('hex')) {
  const derived = await scrypt(String(password), salt, 32);
  return { salt, hash: Buffer.from(derived).toString('hex') };
}

export async function verifyPassword(password, salt, expectedHex) {
  const { hash } = await passwordRecord(password, salt);
  const actual = Buffer.from(hash, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function initializeStore() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meeting_users (
      id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS meeting_sessions (
      token_hash CHAR(64) PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES meeting_users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS meeting_ai_results (
      id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES meeting_users(id) ON DELETE CASCADE,
      feature TEXT NOT NULL, input JSONB NOT NULL, output TEXT NOT NULL, model TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  const email = String(process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || '');
  if (!email || password.length < 12) throw new Error('Configured administrator credentials of at least 12 characters are required');
  const record = await passwordRecord(password);
  await pool.query(
    `INSERT INTO meeting_users(email,name,password_salt,password_hash) VALUES($1,$2,$3,$4)
     ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password_salt=EXCLUDED.password_salt,password_hash=EXCLUDED.password_hash`,
    [email, 'Runtime Administrator', record.salt, record.hash]
  );
}

export async function login(email, password) {
  const result = await pool.query('SELECT * FROM meeting_users WHERE email=$1', [String(email || '').trim().toLowerCase()]);
  const user = result.rows[0];
  if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) return null;
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await pool.query('INSERT INTO meeting_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL \'8 hours\')', [tokenHash, user.id]);
  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

export async function identity(token) {
  if (!token) return null;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const result = await pool.query(
    `SELECT u.id,u.email,u.name FROM meeting_sessions s JOIN meeting_users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.expires_at>NOW()`, [tokenHash]
  );
  return result.rows[0] || null;
}

export async function saveAiResult(userId, input, output, model) {
  const result = await pool.query(
    'INSERT INTO meeting_ai_results(user_id,feature,input,output,model) VALUES($1,$2,$3,$4,$5) RETURNING id',
    [userId, 'meeting-brief', input, output, model]
  );
  return result.rows[0].id;
}

export async function closeStore() { await pool.end(); }
