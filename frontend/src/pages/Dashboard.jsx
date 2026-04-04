import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function Dashboard({ user }) {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchScans = async () => {
      const { data } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(10)
      setScans(data || [])
      setLoading(false)
    }
    fetchScans()
  }, [user.id])

  const latest = scans[scans.length - 1]
  const highRiskCount = scans.filter(s => s.risk_label === 'HIGH').length
  const avgProbability = scans.length
    ? Math.round(scans.reduce((a, b) => a + b.probability, 0) / scans.length)
    : 0

  const chartData = scans.map(s => ({
    date: new Date(s.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    probability: s.probability,
    health_score: s.health_score
  }))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user.user_metadata?.full_name?.split(' ')[0]} 👋</h1>
          <p className="page-sub">Here's your health overview</p>
        </div>
        <Link to="/scan" className="submit-btn" style={{textDecoration:'none', padding:'12px 24px'}}>
          + New Scan
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total Scans</div>
          <div className="stat-card-value">{scans.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">High Risk Scans</div>
          <div className="stat-card-value" style={{color:'var(--red)'}}>{highRiskCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Avg Risk %</div>
          <div className="stat-card-value">{avgProbability}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Latest Score</div>
          <div className="stat-card-value" style={{color:'var(--teal)'}}>{latest?.health_score ?? '—'}</div>
        </div>
      </div>

      {/* Chart */}
      {scans.length > 1 ? (
        <div className="chart-card">
          <div className="chart-title">Risk Probability Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a3a52"/>
              <XAxis dataKey="date" stroke="#5a7a90" tick={{fontSize:11}}/>
              <YAxis stroke="#5a7a90" tick={{fontSize:11}} domain={[0,100]}/>
              <Tooltip
                contentStyle={{background:'#0a1520', border:'1px solid #1a3a52', borderRadius:'8px'}}
                labelStyle={{color:'#d0e8f5'}}
              />
              <Line type="monotone" dataKey="probability" stroke="#ff4d6d" strokeWidth={2} dot={{fill:'#ff4d6d'}} name="Risk %"/>
              <Line type="monotone" dataKey="health_score" stroke="#00f5a0" strokeWidth={2} dot={{fill:'#00f5a0'}} name="Health Score"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-card" style={{display:'flex',alignItems:'center',justifyContent:'center',height:200}}>
          <div style={{textAlign:'center',color:'var(--text-dim)'}}>
            <div style={{fontSize:'2rem',marginBottom:8}}>📊</div>
            <p>Run 2+ scans to see your trend chart</p>
            <Link to="/scan" style={{color:'var(--teal)', textDecoration:'none', fontSize:'.85rem'}}>Run your first scan →</Link>
          </div>
        </div>
      )}
    </div>
  )
}