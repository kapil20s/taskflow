import { useAuth } from './AuthContext';

const initials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '?';

export default function Sidebar({ view, setView, projects, onNewProject }) {
  const { user, logout } = useAuth();

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon" style={{width:32,height:32,fontSize:16}}>⚡</div>
        <div className="logo-text" style={{fontSize:18}}>Task<span>Flow</span></div>
      </div>

      <div className="nav-section">
        <div className="nav-label">Main</div>
        <button className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
          <span>📊</span> Dashboard
        </button>
        <button className={`nav-item ${view === 'projects' ? 'active' : ''}`} onClick={() => setView('projects')}>
          <span>📁</span> Projects
        </button>
        <button className={`nav-item ${view === 'my-tasks' ? 'active' : ''}`} onClick={() => setView('my-tasks')}>
          <span>✅</span> My Tasks
        </button>
      </div>

      {projects.length > 0 && (
        <div className="nav-section" style={{flex:1}}>
          <div className="nav-label" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span>Projects</span>
            <button onClick={onNewProject} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:16,lineHeight:1}}>+</button>
          </div>
          {projects.slice(0,8).map(p => (
            <button key={p.id}
              className={`nav-item ${view === `project-${p.id}` ? 'active' : ''}`}
              onClick={() => setView(`project-${p.id}`)}
              style={{fontSize:13}}
            >
              <span style={{width:6,height:6,borderRadius:'50%',background:'var(--accent)',flexShrink:0,display:'inline-block'}}></span>
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="sidebar-footer">
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <div className="avatar"><span>{initials(user?.name)}</span></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name}</div>
            <div style={{fontSize:11,color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.email}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{width:'100%'}} onClick={logout}>Sign out</button>
      </div>
    </div>
  );
}
