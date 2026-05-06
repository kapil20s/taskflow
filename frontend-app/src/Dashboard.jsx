import { useState, useEffect } from 'react';
import api from './api';

const initials = (name) => name ? name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : '?';

const isOverdue = (due) => due && new Date(due) < new Date() ;

export default function Dashboard({ setView }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner"/></div>;
  if (!data) return <div className="page-body"><div className="error-msg">Failed to load dashboard</div></div>;

  const statusMap = {};
  data.statusCounts.forEach(s => { statusMap[s.status] = Number(s.count); });
  const total = (statusMap.todo||0) + (statusMap.in_progress||0) + (statusMap.done||0);

  const priorityMap = {};
  data.priorityCounts.forEach(p => { priorityMap[p.priority] = Number(p.count); });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Your workspace overview</div>
        </div>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-label">Total Tasks</div>
            <div className="stat-value blue">{total}</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-label">In Progress</div>
            <div className="stat-value yellow">{statusMap.in_progress||0}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Completed</div>
            <div className="stat-value green">{statusMap.done||0}</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Overdue</div>
            <div className="stat-value red">{data.overdueTasks.length}</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-label">Projects</div>
            <div className="stat-value purple">{data.projects.length}</div>
          </div>
        </div>

        <div className="grid-2" style={{marginBottom:20}}>
          {/* Task Status Breakdown */}
          <div className="card">
            <div className="card-title">Tasks by Status</div>
            {total === 0 ? <div style={{color:'var(--text3)',fontSize:13}}>No tasks yet</div> : (
              <>
                <div className="chart-bar-row">
                  <div className="chart-bar-label" style={{color:'var(--text2)'}}>To Do</div>
                  <div className="chart-bar-track">
                    <div className="chart-bar-fill" style={{width:`${total?((statusMap.todo||0)/total*100):0}%`,background:'var(--text3)'}}/>
                  </div>
                  <div className="chart-bar-val">{statusMap.todo||0}</div>
                </div>
                <div className="chart-bar-row">
                  <div className="chart-bar-label" style={{color:'var(--yellow)'}}>In Progress</div>
                  <div className="chart-bar-track">
                    <div className="chart-bar-fill" style={{width:`${total?((statusMap.in_progress||0)/total*100):0}%`,background:'var(--yellow)'}}/>
                  </div>
                  <div className="chart-bar-val">{statusMap.in_progress||0}</div>
                </div>
                <div className="chart-bar-row">
                  <div className="chart-bar-label" style={{color:'var(--green)'}}>Done</div>
                  <div className="chart-bar-track">
                    <div className="chart-bar-fill" style={{width:`${total?((statusMap.done||0)/total*100):0}%`,background:'var(--green)'}}/>
                  </div>
                  <div className="chart-bar-val">{statusMap.done||0}</div>
                </div>
              </>
            )}
          </div>

          {/* Priority Breakdown */}
          <div className="card">
            <div className="card-title">Active Tasks by Priority</div>
            {Object.keys(priorityMap).length === 0 ? <div style={{color:'var(--text3)',fontSize:13}}>No active tasks</div> : (
              <>
                {['high','medium','low'].map(p => {
                  const pTotal = Object.values(priorityMap).reduce((a,b)=>a+b,0);
                  const pColors = {high:'var(--red)',medium:'var(--yellow)',low:'var(--green)'};
                  return (
                    <div key={p} className="chart-bar-row">
                      <div className="chart-bar-label" style={{color:pColors[p],textTransform:'capitalize'}}>{p}</div>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill" style={{width:`${pTotal?((priorityMap[p]||0)/pTotal*100):0}%`,background:pColors[p]}}/>
                      </div>
                      <div className="chart-bar-val">{priorityMap[p]||0}</div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div className="grid-2">
          {/* Overdue tasks */}
          <div className="card">
            <div className="card-title">
              <span>Overdue Tasks</span>
              {data.overdueTasks.length > 0 && <span style={{color:'var(--red)',fontSize:12}}>{data.overdueTasks.length} overdue</span>}
            </div>
            {data.overdueTasks.length === 0 ? (
              <div style={{color:'var(--green)',fontSize:13}}>No overdue tasks</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {data.overdueTasks.slice(0,5).map(t => (
                  <div key={t.id} style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>{t.title}</div>
                    <div style={{display:'flex',gap:12,fontSize:11,color:'var(--text3)'}}>
                      <span>📁 {t.project_name}</span>
                      <span style={{color:'var(--red)'}}>📅 {t.due_date}</span>
                      {t.assignee_name && <span>👤 {t.assignee_name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks per user */}
          <div className="card">
            <div className="card-title">Tasks per Team Member</div>
            {data.tasksPerUser.length === 0 ? (
              <div style={{color:'var(--text3)',fontSize:13}}>No assigned tasks</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {data.tasksPerUser.slice(0,6).map(u => (
                  <div key={u.id} style={{display:'flex',alignItems:'center',gap:10}}>
                    <div className="avatar avatar-sm">{initials(u.name)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.name}</span>
                        <span style={{fontSize:12,color:'var(--text2)',flexShrink:0,marginLeft:8}}>{u.task_count} tasks</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width:`${u.task_count?((u.done_count||0)/u.task_count*100):0}%`}}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Project summary */}
        {data.projects.length > 0 && (
          <div className="card" style={{marginTop:20}}>
            <div className="card-title">Project Overview</div>
            <div style={{overflowX:'auto'}}>
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Total Tasks</th>
                    <th>Done</th>
                    <th>Members</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projects.map(p => (
                    <tr key={p.id} style={{cursor:'pointer'}} onClick={() => setView(`project-${p.id}`)}>
                      <td style={{color:'var(--text)',fontWeight:500}}>{p.name}</td>
                      <td>{p.total_tasks||0}</td>
                      <td style={{color:'var(--green)'}}>{p.done_tasks||0}</td>
                      <td>{p.member_count||0}</td>
                      <td style={{width:120}}>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{width:`${p.total_tasks?((p.done_tasks||0)/p.total_tasks*100):0}%`}}/>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
