import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../supabase/client'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import ParticleHuman from '../components/ParticleHuman'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a human-readable health zone label and CSS class for a given score.
 */
function getHealthZone(score) {
  if (score == null) return { label: 'UNKNOWN', cls: 'health-zone-average', color: '#ffaa00' }
  if (score <= 30)   return { label: 'POOR HEALTH',    cls: 'health-zone-poor',    color: '#ff2244' }
  if (score <= 70)   return { label: 'AVERAGE HEALTH', cls: 'health-zone-average', color: '#ffaa00' }
  return               { label: 'OPTIMAL HEALTH', cls: 'health-zone-good',    color: '#00f5a0' }
}

/**
 * Builds a health summary sentence for ElevenLabs TTS.
 */
function buildHealthSummary(user, scan) {
  if (!scan) {
    return `Hello ${user.user_metadata?.full_name?.split(' ')[0] ?? 'there'}. Welcome to MediTwin AI. Please run your first health scan to activate your digital twin.`
  }
  const name  = user.user_metadata?.full_name?.split(' ')[0] ?? 'there'
  const zone  = getHealthZone(scan.health_score)
  const risk  = scan.risk_label === 'HIGH' ? 'elevated' : 'low'
  return (
    `Hello ${name}. Your MediTwin digital twin has analysed your latest scan. ` +
    `Your health score is ${scan.health_score} out of 100, which places you in the ${zone.label.toLowerCase()} zone. ` +
    `Your cardiac risk probability is ${scan.probability} percent, indicating ${risk} risk. ` +
    `${scan.probability > 50
      ? 'I recommend consulting a physician soon.'
      : 'Keep maintaining your healthy habits!'}`
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard({ user }) {
  const [scans, setScans]     = useState([])
  const [loading, setLoading] = useState(true)
  const [twinReady, setTwinReady] = useState(false)

  // Ref that ParticleHuman fills with its speak() function
  const speakRef = useRef(null)

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

  const latest          = scans[scans.length - 1]
  const healthScore     = latest?.health_score ?? 75
  const zone            = getHealthZone(latest?.health_score)
  const highRiskCount   = scans.filter(s => s.risk_label === 'HIGH').length
  const avgProbability  = scans.length
    ? Math.round(scans.reduce((a, b) => a + b.probability, 0) / scans.length)
    : 0

  const chartData = scans.map(s => ({
    date: new Date(s.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    probability:  s.probability,
    health_score: s.health_score,
  }))

  const handleSpeak = useCallback(() => {
    if (speakRef.current) {
      speakRef.current(buildHealthSummary(user, latest))
    }
  }, [user, latest])

  return (
    <div className="page">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, {user.user_metadata?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="page-sub">Your digital twin is active</p>
        </div>
        <Link to="/scan" className="submit-btn" style={{ textDecoration: 'none', padding: '12px 24px' }}>
          + New Scan
        </Link>
      </div>

      {/* ── Two-column hero layout: Twin left, data right ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', marginBottom: '24px' }}>

        {/* ── Left: 3D Particle Human Twin Card ──────────────────────── */}
        <div
          className="particle-twin-card"
          style={{ '--health-color': zone.color }}
        >
          {/* Canvas area */}
          <div className="particle-canvas-wrapper">
            <ParticleHuman
              healthScore={healthScore}
              width="100%"
              height="100%"
              onReady={() => setTwinReady(true)}
              onSpeakRef={speakRef}
            />

            {/* Overlay badge at bottom of canvas */}
            <div className="particle-overlay">
              <span className="particle-twin-id">
                MT-{user.id?.slice(-6)?.toUpperCase() ?? 'XXXXXX'}
              </span>
              <span
                className={`particle-health-badge ${zone.cls}`}
              >
                {zone.label}
              </span>
            </div>
          </div>

          {/* Controls below canvas */}
          <div className="particle-controls">
            <div className="particle-score-row">
              <span className="particle-score-label">Health Score</span>
              <span className={`particle-score-value ${zone.cls}`}>
                {healthScore}/100
              </span>
            </div>

            {/* Animated health bar */}
            <div className="particle-score-bar">
              <div
                className="particle-score-fill"
                style={{
                  width:      `${healthScore}%`,
                  background: zone.color,
                  color:      zone.color,
                }}
              />
            </div>

            {/* Speak button */}
            <button
              id="speakTwinBtn"
              className="speak-btn"
              onClick={handleSpeak}
              disabled={!twinReady}
              title="Hear your health summary from MediTwin AI"
            >
              <span className="speak-btn-icon">🎙</span>
              Ask MediTwin AI
            </button>
          </div>
        </div>

        {/* ── Right: Stats + Chart ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Stats grid */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', margin: 0 }}>
            <div className="stat-card">
              <div className="stat-card-label">Total Scans</div>
              <div className="stat-card-value">{scans.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">High Risk Scans</div>
              <div className="stat-card-value" style={{ color: 'var(--red)' }}>{highRiskCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Avg Risk %</div>
              <div className="stat-card-value">{avgProbability}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Latest Score</div>
              <div className="stat-card-value" style={{ color: zone.color }}>
                {latest?.health_score ?? '—'}
              </div>
            </div>
          </div>

          {/* Chart */}
          {scans.length > 1 ? (
            <div className="chart-card" style={{ flex: 1 }}>
              <div className="chart-title">Risk Probability Trend</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a3a52" />
                  <XAxis dataKey="date" stroke="#5a7a90" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#5a7a90" tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: '#0a1520', border: '1px solid #1a3a52', borderRadius: '8px' }}
                    labelStyle={{ color: '#d0e8f5' }}
                  />
                  <Line type="monotone" dataKey="probability"  stroke="#ff4d6d" strokeWidth={2} dot={{ fill: '#ff4d6d' }} name="Risk %" />
                  <Line type="monotone" dataKey="health_score" stroke="#00f5a0" strokeWidth={2} dot={{ fill: '#00f5a0' }} name="Health Score" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="chart-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📊</div>
                <p>Run 2+ scans to see your trend chart</p>
                <Link to="/scan" style={{ color: 'var(--teal)', textDecoration: 'none', fontSize: '.85rem' }}>
                  Run your first scan →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}