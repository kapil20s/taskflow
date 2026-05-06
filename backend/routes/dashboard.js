const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard - global dashboard for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Tasks assigned to me
    const myTasks = await db.execute({
      sql: `SELECT t.*, p.name as project_name FROM tasks t
            JOIN projects p ON p.id = t.project_id
            JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
            WHERE t.assignee_id = ?
            ORDER BY t.due_date ASC`,
      args: [userId, userId],
    });

    // Task counts by status
    const statusCounts = await db.execute({
      sql: `SELECT status, COUNT(*) as count FROM tasks t
            JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
            GROUP BY status`,
      args: [userId],
    });

    // Overdue tasks
    const overdue = await db.execute({
      sql: `SELECT t.*, p.name as project_name, u.name as assignee_name FROM tasks t
            JOIN projects p ON p.id = t.project_id
            JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
            LEFT JOIN users u ON u.id = t.assignee_id
            WHERE t.due_date < date('now') AND t.status != 'done'
            ORDER BY t.due_date ASC`,
      args: [userId],
    });

    // Tasks per user (across my projects)
    const tasksPerUser = await db.execute({
      sql: `SELECT u.id, u.name, COUNT(t.id) as task_count,
              SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_count,
              SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
              SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) as todo_count
            FROM users u
            JOIN tasks t ON t.assignee_id = u.id
            JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
            GROUP BY u.id, u.name
            ORDER BY task_count DESC`,
      args: [userId],
    });

    // Project summary
    const projects = await db.execute({
      sql: `SELECT p.id, p.name,
              COUNT(DISTINCT t.id) as total_tasks,
              SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_tasks,
              COUNT(DISTINCT pm2.user_id) as member_count
            FROM projects p
            JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
            LEFT JOIN tasks t ON t.project_id = p.id
            LEFT JOIN project_members pm2 ON pm2.project_id = p.id
            GROUP BY p.id, p.name
            ORDER BY p.created_at DESC`,
      args: [userId],
    });

    // Priority breakdown
    const priorityCounts = await db.execute({
      sql: `SELECT priority, COUNT(*) as count FROM tasks t
            JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
            WHERE t.status != 'done'
            GROUP BY priority`,
      args: [userId],
    });

    res.json({
      myTasks: myTasks.rows,
      statusCounts: statusCounts.rows,
      overdueTasks: overdue.rows,
      tasksPerUser: tasksPerUser.rows,
      projects: projects.rows,
      priorityCounts: priorityCounts.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
