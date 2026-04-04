import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabase/client'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewScan from './pages/NewScan'
import History from './pages/History'
import Navbar from './components/Navbar'
import './index.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    // Listen for login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="loading-state" style={{height:'100vh'}}>
      <div className="spinner"/>
      <p>Loading MediTwin…</p>
    </div>
  )

  return (
    <div className="app">
      {user && <Navbar user={user} />}
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/scan" element={user ? <NewScan user={user} /> : <Navigate to="/login" />} />
        <Route path="/history" element={user ? <History user={user} /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </div>
  )
}