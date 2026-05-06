const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-super-secret-key-change-in-production';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await db.execute({
      sql: 'SELECT id, name, email FROM users WHERE id = ?',
      args: [decoded.userId],
    });
    if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    req.user = result.rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function requireProjectAdmin(req, res, next) {
  const projectId = req.params.projectId || req.body.projectId;
  const result = await db.execute({
    sql: 'SELECT admin_id FROM projects WHERE id = ?',
    args: [projectId],
  });
  if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
  if (result.rows[0].admin_id !== req.user.id) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  req.project = result.rows[0];
  next();
}

async function requireProjectMember(req, res, next) {
  const projectId = req.params.projectId;
  const result = await db.execute({
    sql: `SELECT pm.role, p.admin_id FROM project_members pm
          JOIN projects p ON p.id = pm.project_id
          WHERE pm.project_id = ? AND pm.user_id = ?`,
    args: [projectId, req.user.id],
  });
  if (result.rows.length === 0) return res.status(403).json({ error: 'Not a project member' });
  req.membership = result.rows[0];
  req.isAdmin = result.rows[0].admin_id === req.user.id;
  next();
}

module.exports = { generateToken, authenticate, requireProjectAdmin, requireProjectMember, JWT_SECRET };
