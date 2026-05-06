const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authenticate, requireProjectAdmin, requireProjectMember } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects - list user's projects
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT p.*, u.name as admin_name,
              (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
              (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
              pm2.role
            FROM projects p
            JOIN users u ON u.id = p.admin_id
            JOIN project_members pm2 ON pm2.project_id = p.id AND pm2.user_id = ?
            ORDER BY p.created_at DESC`,
      args: [req.user.id],
    });
    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects - create project
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    const id = uuidv4();
    await db.executeMultiple(
      `INSERT INTO projects (id, name, description, admin_id) VALUES ('${id}', '${name.trim().replace(/'/g, "''")}', '${(description || '').trim().replace(/'/g, "''")}', '${req.user.id}');
       INSERT INTO project_members (project_id, user_id, role) VALUES ('${id}', '${req.user.id}', 'admin');`
    );

    res.status(201).json({ project: { id, name: name.trim(), description, admin_id: req.user.id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:projectId - get project details
router.get('/:projectId', authenticate, requireProjectMember, async (req, res) => {
  try {
    const project = await db.execute({
      sql: `SELECT p.*, u.name as admin_name FROM projects p JOIN users u ON u.id = p.admin_id WHERE p.id = ?`,
      args: [req.params.projectId],
    });
    const members = await db.execute({
      sql: `SELECT u.id, u.name, u.email, pm.role, pm.joined_at
            FROM project_members pm JOIN users u ON u.id = pm.user_id
            WHERE pm.project_id = ? ORDER BY pm.joined_at ASC`,
      args: [req.params.projectId],
    });
    res.json({ project: project.rows[0], members: members.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/projects/:projectId - update project (admin only)
router.put('/:projectId', authenticate, requireProjectAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const trimmedName = String(name || '').trim();
    const trimmedDescription = String(description || '').trim();

    if (!trimmedName) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    await db.execute({
      sql: 'UPDATE projects SET name = ?, description = ? WHERE id = ?',
      args: [trimmedName, trimmedDescription, req.params.projectId],
    });

    const updatedProject = await db.execute({
      sql: `SELECT p.*, u.name as admin_name
            FROM projects p
            JOIN users u ON u.id = p.admin_id
            WHERE p.id = ?`,
      args: [req.params.projectId],
    });

    if (updatedProject.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json({ project: updatedProject.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects/:projectId/members - add member (admin only)
router.post('/:projectId/members', authenticate, requireProjectAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const userResult = await db.execute({ sql: 'SELECT id, name, email FROM users WHERE email = ?', args: [email.toLowerCase().trim()] });
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userResult.rows[0];
    const existing = await db.execute({
      sql: 'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?',
      args: [req.params.projectId, user.id],
    });
    if (existing.rows.length > 0) return res.status(409).json({ error: 'User is already a member' });

    await db.execute({
      sql: 'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      args: [req.params.projectId, user.id, 'member'],
    });
    res.status(201).json({ member: { ...user, role: 'member' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:projectId/members/:userId - remove member (admin only)
router.delete('/:projectId/members/:userId', authenticate, requireProjectAdmin, async (req, res) => {
  try {
    const project = await db.execute({ sql: 'SELECT admin_id FROM projects WHERE id = ?', args: [req.params.projectId] });
    if (project.rows[0].admin_id === req.params.userId) {
      return res.status(400).json({ error: 'Cannot remove the project admin' });
    }
    await db.execute({
      sql: 'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
      args: [req.params.projectId, req.params.userId],
    });
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:projectId - delete project (admin only)
router.delete('/:projectId', authenticate, requireProjectAdmin, async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM projects WHERE id = ?', args: [req.params.projectId] });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
