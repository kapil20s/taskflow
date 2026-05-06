const { createClient } = require('@libsql/client');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = createClient({
  url: process.env.DATABASE_URL || `file:${path.join(__dirname, 'taskflow.db')}`,
});

const DEMO_EMAIL = 'demo@taskflow.app';
const DEMO_PASSWORD = 'demo123';
const DEMO_NAME = 'TaskFlow Demo';

async function ensureDemoUser() {
  const normalizedEmail = DEMO_EMAIL.toLowerCase().trim();
  const existing = await db.execute({
    sql: 'SELECT id, password, name FROM users WHERE email = ?',
    args: [normalizedEmail],
  });

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  if (existing.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
      args: [uuidv4(), DEMO_NAME, normalizedEmail, hashedPassword],
    });
    console.log(`[auth] demo user created: ${normalizedEmail}`);
    return;
  }

  const demoUser = existing.rows[0];
  const hasExpectedPassword = await bcrypt.compare(DEMO_PASSWORD, demoUser.password);

  if (!hasExpectedPassword || demoUser.name !== DEMO_NAME) {
    await db.execute({
      sql: 'UPDATE users SET name = ?, password = ? WHERE id = ?',
      args: [DEMO_NAME, hashedPassword, demoUser.id],
    });
    console.log(`[auth] demo user password reset: ${normalizedEmail}`);
  }
}

async function initDB() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      admin_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'todo',
      assignee_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);
  await ensureDemoUser();
  console.log('Database initialized');
}

module.exports = { db, initDB };
