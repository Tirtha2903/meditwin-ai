import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function History({ user }) {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('scans').select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setScans(data || [])
      setLoading(false)
    }
    fetch()
  }, [user.id])

  const chartData = [...scans].reverse().map(s => ({
    date: new Date(s.created_at).toLocaleDateString('en-IN', { month:'short', day:'numeric' }),
    risk: s.probability,
    score: s.health_score
  }))

  if (loading) return <div className="loading-state" style={{height:'60vh'}}><div className="spinner"/></div>

  return (
    <div className="page">
      <h1 className="page-title">Scan History</h1>
      <p className="page-sub">Your health timeline across all scans</p>

      {scans.length > 1 && (
        <div className="chart-card" style={{marginBottom:24}}>
          <div className="chart-title">Risk % Over Time</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4d6d" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a3a52"/>
              <XAxis dataKey="date" stroke="#5a7a90" tick={{fontSize:11}}/>
              <YAxis stroke="#5a7a90" tick={{fontSize:11}} domain={[0,100]}/>
              <Tooltip contentStyle={{background:'#0a1520',border:'1px solid #1a3a52',borderRadius:'8px'}}/>
              <Area type="monotone" dataKey="risk" stroke="#ff4d6d" fill="url(#riskGrad)" strokeWidth={2} name="Risk %"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="history-list">
        {scans.length === 0 && (
          <div className="placeholder"><div className="placeholder-icon">📋</div><p>No scans yet</p></div>
        )}
        {scans.map(scan => (
          <div key={scan.id} className={`history-item ${scan.risk_label === 'HIGH' ? 'risk-high' : 'risk-low'}`}>
            <div className="history-left">
              <div className="risk-badge">
                <span className="risk-dot"/>
                {scan.risk_label} RISK
              </div>
              <div className="history-date">{new Date(scan.created_at).toLocaleString('en-IN')}</div>
            </div>
            <div className="history-stats">
              <span>Age: <b>{scan.age}</b></span>
              <span>HR: <b>{scan.heart_rate}</b></span>
              <span>BP: <b>{scan.systolic_bp}/{scan.diastolic_bp}</b></span>
              <span>Risk: <b>{scan.probability}%</b></span>
              <span>Score: <b>{scan.health_score}</b></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}