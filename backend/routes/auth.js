const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { generateToken, authenticate } = require('../middleware/auth');

const router = express.Router();
const normalizeEmail = (email = '') => String(email).toLowerCase().trim();

function getRequestMeta(req) {
  return {
    ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  };
}

function logFailedLogin(req, email, reason) {
  const meta = getRequestMeta(req);
  console.warn(
    `[auth] login failed reason=${reason} email=${normalizeEmail(email)} ip=${meta.ip} ua=${meta.userAgent}`
  );
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [normalizedEmail] });
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 12);
    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
      args: [id, name.trim(), normalizedEmail, hashed],
    });

    const token = generateToken(id);
    res.status(201).json({ token, user: { id, name: name.trim(), email: normalizedEmail } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      logFailedLogin(req, email, 'missing_credentials');
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS',
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [normalizedEmail],
    });
    if (result.rows.length === 0) {
      logFailedLogin(req, normalizedEmail, 'user_not_found');
      return res.status(401).json({
        error: 'No account found with this email address',
        code: 'USER_NOT_FOUND',
      });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      logFailedLogin(req, normalizedEmail, 'password_mismatch');
      return res.status(401).json({
        error: 'Incorrect password',
        code: 'INVALID_PASSWORD',
      });
    }

    const token = generateToken(user.id);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
