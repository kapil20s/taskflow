import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import ProjectsPage from './ProjectsPage';
import ProjectDetail from './ProjectDetail';
import MyTasksPage from './MyTasksPage';
import api from './api';
import './index.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [authPage, setAuthPage] = useState('login');
  const [view, setView] = useState('dashboard');
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProjectsLoading(true);
      api.get('/projects').then(r => setProjects(r.data.projects || [])).catch(console.error).finally(() => setProjectsLoading(false));
    }
  }, [user]);

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div className="spinner"/>
    </div>
  );

  if (!user) {
    return authPage === 'login'
      ? <LoginPage onNavigate={setAuthPage}/>
      : <SignupPage onNavigate={setAuthPage}/>;
  }

  const handleProjectCreated = (project) => {
    setProjects(prev => [project, ...prev]);
  };

  const handleProjectUpdated = (project) => {
    setProjects(prev => prev.map(p => (p.id === project.id ? { ...p, ...project } : p)));
  };

  const renderMain = () => {
    if (view === 'dashboard') return <Dashboard setView={setView}/>;
    if (view === 'projects') return <ProjectsPage projects={projects} onProjectCreated={handleProjectCreated} setView={setView} loading={projectsLoading}/>;
    if (view === 'my-tasks') return <MyTasksPage setView={setView}/>;
    if (view.startsWith('project-')) {
      const projectId = view.replace('project-', '');
      return <ProjectDetail key={projectId} projectId={projectId} setView={setView} onProjectUpdated={handleProjectUpdated}/>;
    }
    return <Dashboard setView={setView}/>;
  };

  return (
    <div className="app-layout">
      <Sidebar view={view} setView={setView} projects={projects} onNewProject={() => setView('projects')}/>
      <div className="main-content">
        {renderMain()}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
