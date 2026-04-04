import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../supabase/client'

export default function Navbar({ user }) {
  const location = useLocation()
  const handleLogout = () => supabase.auth.signOut()

  return (
    <nav className="navbar">
      <div className="nav-logo">
        <span className="logo-icon" style={{fontSize:'1.3rem'}}>⬡</span>
        <span className="logo-text" style={{fontSize:'1.1rem'}}>MediTwin <span className="logo-accent">AI</span></span>
      </div>
      <div className="nav-links">
        <Link className={`nav-link ${location.pathname==='/dashboard'?'active':''}`} to="/dashboard">Dashboard</Link>
        <Link className={`nav-link ${location.pathname==='/dashboard-ai'?'active':''}`} to="/dashboard-ai">AI Twin</Link>
        <Link className={`nav-link ${location.pathname==='/scan'?'active':''}`} to="/scan">New Scan</Link>
        <Link className={`nav-link ${location.pathname==='/history'?'active':''}`} to="/history">History</Link>
      </div>
      <div className="nav-right">
        <img className="nav-avatar" src={user.user_metadata?.avatar_url} alt="avatar" referrerPolicy="no-referrer"/>
        <button className="nav-logout" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}
