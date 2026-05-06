import { useState, useEffect } from 'react';
import api from './api';

const PRIORITY_CLASSES = { high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };

function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

export default function MyTasksPage({ setView }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner"/></div>;

  const myTasks = (data?.myTasks || []).filter(t => !filterStatus || t.status === filterStatus);

  const getStatusError = (err) => {
    const statusCode = err.response?.status;
    const serverMessage = err.response?.data?.error;
    if (!err.response) return 'Cannot reach server. Check API URL/CORS/backend.';
    if (statusCode === 401) return 'Unauthorized. Please log in again.';
    if (statusCode === 403) return serverMessage || 'You are not allowed to update this task.';
    if (statusCode >= 500) return serverMessage || 'Server error while updating task.';
    return serverMessage || `Failed to update task (HTTP ${statusCode}).`;
  };

  const updateStatus = async (task, newStatus) => {
    try {
      const endpoint = `/projects/${task.project_id}/tasks/${task.id}`;
      const payload = { status: newStatus };
      console.log('[MyTasks] status update request', { endpoint, payload, taskId: task.id });
      const response = await api.patch(endpoint, payload);
      console.log('[MyTasks] status update response', {
        status: response.status,
        taskId: response.data?.task?.id,
        updatedStatus: response.data?.task?.status,
      });
      setData(prev => ({
        ...prev,
        myTasks: prev.myTasks.map(t => t.id === task.id ? { ...t, ...response.data.task } : t)
      }));
    } catch (err) {
      console.error('[MyTasks] status update failed', {
        statusCode: err.response?.status,
        response: err.response?.data,
        message: err.message,
      });
      alert(getStatusError(err));
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">My Tasks</div>
          <div className="page-subtitle">{data?.myTasks?.length || 0} tasks assigned to you</div>
        </div>
      </div>
      <div className="page-body">
        <div className="filter-bar">
          {['','todo','in_progress','done'].map(s => (
            <button key={s} className="btn btn-ghost btn-sm"
              style={{background: filterStatus===s ? 'var(--bg3)' : 'transparent',
                color: filterStatus===s ? 'var(--text)' : 'var(--text2)'}}
              onClick={() => setFilterStatus(s)}>
              {s==='' ? 'All' : s==='in_progress' ? 'In Progress' : s==='done' ? 'Done' : 'To Do'}
            </button>
          ))}
        </div>

        {myTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <div className="empty-title">No tasks here</div>
            <div className="empty-text">Tasks assigned to you will appear here</div>
          </div>
        ) : (
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myTasks.map(t => {
                  const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';
                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{fontWeight:500,color:'var(--text)',marginBottom:2}}>{t.title}</div>
                        {t.description && <div style={{fontSize:12,color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:240}}>{t.description}</div>}
                      </td>
                      <td>
                        <span onClick={() => setView(`project-${t.project_id}`)}
                          style={{cursor:'pointer',color:'var(--accent)',fontWeight:500}}>
                          {t.project_name}
                        </span>
                      </td>
                      <td><span className={`priority-badge ${PRIORITY_CLASSES[t.priority]}`}>{t.priority}</span></td>
                      <td style={{color: isOverdue ? 'var(--red)' : 'var(--text2)'}}>
                        {t.due_date ? formatDate(t.due_date) : '—'}
                        {isOverdue && ' ⚠'}
                      </td>
                      <td>
                        <select value={t.status} onChange={e => updateStatus(t, e.target.value)}
                          style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:6,padding:'5px 10px',color:'var(--text)',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
