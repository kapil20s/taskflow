const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authenticate, requireProjectMember } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
const STATUS_ALIASES = {
  'to do': 'todo',
  todo: 'todo',
  'in progress': 'in_progress',
  in_progress: 'in_progress',
  inprogress: 'in_progress',
  done: 'done',
};

function normalizeStatus(value) {
  if (value === undefined || value === null) return value;
  const normalized = STATUS_ALIASES[String(value).trim().toLowerCase()];
  return normalized || null;
}

// GET /api/projects/:projectId/tasks
router.get('/', authenticate, requireProjectMember, async (req, res) => {
  try {
    const { status, assignee, priority } = req.query;
    let sql = `SELECT t.*, u.name as assignee_name, u2.name as creator_name
               FROM tasks t
               LEFT JOIN users u ON u.id = t.assignee_id
               JOIN users u2 ON u2.id = t.created_by
               WHERE t.project_id = ?`;
    const args = [req.params.projectId];

    if (status) { sql += ` AND t.status = ?`; args.push(status); }
    if (assignee) { sql += ` AND t.assignee_id = ?`; args.push(assignee); }
    if (priority) { sql += ` AND t.priority = ?`; args.push(priority); }
    sql += ` ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, t.due_date ASC`;

    const result = await db.execute({ sql, args });
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects/:projectId/tasks - create task
router.post('/', authenticate, requireProjectMember, async (req, res) => {
  try {
    if (!req.isAdmin) return res.status(403).json({ error: 'Only admins can create tasks' });

    const { title, description, due_date, priority, assignee_id } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const validPriorities = ['low', 'medium', 'high'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Priority must be low, medium, or high' });
    }

    if (assignee_id) {
      const member = await db.execute({
        sql: 'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?',
        args: [req.params.projectId, assignee_id],
      });
      if (member.rows.length === 0) return res.status(400).json({ error: 'Assignee is not a project member' });
    }

    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO tasks (id, project_id, title, description, due_date, priority, status, assignee_id, created_by)
            VALUES (?, ?, ?, ?, ?, ?, 'todo', ?, ?)`,
      args: [id, req.params.projectId, title.trim(), description || null, due_date || null, priority || 'medium', assignee_id || null, req.user.id],
    });

    const task = await db.execute({
      sql: `SELECT t.*, u.name as assignee_name, u2.name as creator_name FROM tasks t
            LEFT JOIN users u ON u.id = t.assignee_id JOIN users u2 ON u2.id = t.created_by WHERE t.id = ?`,
      args: [id],
    });
    res.status(201).json({ task: task.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/projects/:projectId/tasks/:taskId - update task
router.patch('/:taskId', authenticate, requireProjectMember, async (req, res) => {
  try {
    const task = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ? AND project_id = ?', args: [req.params.taskId, req.params.projectId] });
    if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const currentTask = task.rows[0];
    const isAssignee = currentTask.assignee_id === req.user.id;

    if (!req.isAdmin && !isAssignee) {
      return res.status(403).json({ error: 'You can only update tasks assigned to you' });
    }

    const { title, description, due_date, priority, status, assignee_id } = req.body;
    const normalizedStatus = normalizeStatus(status);
    const validStatuses = ['todo', 'in_progress', 'done'];
    const validPriorities = ['low', 'medium', 'high'];

    console.log('[tasks.patch] request', {
      projectId: req.params.projectId,
      taskId: req.params.taskId,
      userId: req.user.id,
      status,
      normalizedStatus,
    });

    if (status !== undefined && !normalizedStatus) {
      return res.status(400).json({ error: 'Invalid status. Use todo, in_progress, or done.' });
    }
    if (normalizedStatus && !validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ error: 'Invalid status. Use todo, in_progress, or done.' });
    }
    if (priority && !req.isAdmin) return res.status(403).json({ error: 'Only admins can change priority' });
    if (priority && !validPriorities.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
    if (assignee_id && !req.isAdmin) return res.status(403).json({ error: 'Only admins can reassign tasks' });

    const updates = {
      title: req.isAdmin && title ? title.trim() : currentTask.title,
      description: req.isAdmin && description !== undefined ? description : currentTask.description,
      due_date: req.isAdmin && due_date !== undefined ? due_date : currentTask.due_date,
      priority: req.isAdmin && priority ? priority : currentTask.priority,
      status: normalizedStatus || currentTask.status,
      assignee_id: req.isAdmin && assignee_id !== undefined ? assignee_id : currentTask.assignee_id,
    };

    await db.execute({
      sql: `UPDATE tasks SET title=?, description=?, due_date=?, priority=?, status=?, assignee_id=?, updated_at=datetime('now') WHERE id=?`,
      args: [updates.title, updates.description, updates.due_date, updates.priority, updates.status, updates.assignee_id, req.params.taskId],
    });

    const updated = await db.execute({
      sql: `SELECT t.*, u.name as assignee_name, u2.name as creator_name FROM tasks t
            LEFT JOIN users u ON u.id = t.assignee_id JOIN users u2 ON u2.id = t.created_by WHERE t.id = ?`,
      args: [req.params.taskId],
    });
    console.log('[tasks.patch] success', {
      taskId: req.params.taskId,
      previousStatus: currentTask.status,
      updatedStatus: updated.rows[0]?.status,
    });
    res.json({ task: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:projectId/tasks/:taskId - delete task (admin only)
router.delete('/:taskId', authenticate, requireProjectMember, async (req, res) => {
  try {
    if (!req.isAdmin) return res.status(403).json({ error: 'Only admins can delete tasks' });
    await db.execute({ sql: 'DELETE FROM tasks WHERE id = ? AND project_id = ?', args: [req.params.taskId, req.params.projectId] });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
