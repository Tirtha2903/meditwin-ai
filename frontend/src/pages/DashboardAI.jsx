import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../supabase/client'
import ParticleHuman from '../components/ParticleHuman'
import './DashboardAI.css'

/**
 * Get health zone color based on score
 */
function getHealthZone(score) {
  if (score == null) return { label: 'UNKNOWN', color: '#ffaa00', textClass: 'zone-avg' }
  if (score <= 30) return { label: 'CRITICAL', color: '#ff2244', textClass: 'zone-poor' }
  if (score <= 70) return { label: 'WARNING', color: '#ffaa00', textClass: 'zone-avg' }
  return { label: 'OPTIMAL', color: '#00f5a0', textClass: 'zone-good' }
}

/**
 * Enhanced AI health dashboard with 3D particles, glassmorphism UI,
 * and interactive health score controls with audio reactivity
 */
export default function DashboardAI({ user }) {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [twinReady, setTwinReady] = useState(false)
  const [healthScore, setHealthScore] = useState(75)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const speakRef = useRef(null)

  // Fetch scans on mount
  useEffect(() => {
    const fetchScans = async () => {
      const { data } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(10)
      const scanData = data || []
      setScans(scanData)
      if (scanData.length > 0) {
        setHealthScore(scanData[scanData.length - 1].health_score)
      }
      setLoading(false)
    }
    fetchScans()
  }, [user.id])

  const latest = scans[scans.length - 1]
  const zone = getHealthZone(healthScore)

  const handleHealthScoreChange = useCallback((e) => {
    const score = parseInt(e.target.value)
    setHealthScore(Math.max(0, Math.min(100, score)))
  }, [])

  const handleSpeakClick = useCallback(() => {
    setIsSpeaking(true)
    if (speakRef.current) {
      const summary = buildHealthSummary(user, { health_score: healthScore })
      speakRef.current(summary)
    }
    // Auto-stop speaking after 5 seconds
    setTimeout(() => setIsSpeaking(false), 5000)
  }, [user, healthScore])

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading MediTwin AI…</p>
      </div>
    )
  }

  return (
    <div className="dashboard-ai">
      {/* ── Full-Screen 3D Particle Background ──────────────────────────── */}
      <div className="particle-bg">
        <ParticleHuman
          healthScore={healthScore}
          width="100%"
          height="100%"
          onReady={() => setTwinReady(true)}
          onSpeakRef={speakRef}
        />
      </div>

      {/* ── Glassmorphism Overlay Panels ─────────────────────────────────── */}
      <div className="dashboard-overlay">
        {/* ─ Top Header with Title ─ */}
        <div className="header-panel glass">
          <h1 className="ai-title">MediTwin AI</h1>
          <p className="ai-subtitle">Digital Twin Health Assessment</p>
        </div>

        {/* ─ Left Data Panels ─ */}
        <div className="left-panels">
          <div className="metric-card glass" style={{ '--card-color': '#00f5a0' }}>
            <span className="metric-icon">❤️</span>
            <div className="metric-content">
              <span className="metric-label">Heart Rate</span>
              <span className="metric-value">72 BPM</span>
            </div>
          </div>
          <div className="metric-card glass" style={{ '--card-color': '#ffa500' }}>
            <span className="metric-icon">⚡</span>
            <div className="metric-content">
              <span className="metric-label">System Status</span>
              <span className="metric-value">85%</span>
            </div>
          </div>
          <div className="metric-card glass" style={{ '--card-color': '#00d4ff' }}>
            <span className="metric-icon">🧬</span>
            <div className="metric-content">
              <span className="metric-label">Diagnostic</span>
              <span className="metric-value">98%</span>
            </div>
          </div>
        </div>

        {/* ─ Right Data Panels ─ */}
        <div className="right-panels">
          <div className="info-card glass">
            <h3 className="card-title">Health Status</h3>
            <div className="status-badge" style={{ '--status-color': zone.color }}>
              {zone.label}
            </div>
            <p className="card-text">
              Your digital twin is actively monitoring your vital signs
            </p>
          </div>

          <div className="info-card glass">
            <h3 className="card-title">AI Analysis</h3>
            <p className="card-text small">
              Real-time health metrics processed by MediTwin AI neural networks
            </p>
          </div>
        </div>

        {/* ─ Bottom Control Panel ─ */}
        <div className="control-panel glass">
          {/* Score display */}
          <div className="control-section">
            <label className="control-label">Health Score</label>
            <div className="score-display">
              <span className={`score-value ${zone.textClass}`}>{healthScore}</span>
              <span className="score-max">/100</span>
            </div>
          </div>

          {/* Score slider */}
          <div className="control-section">
            <input
              type="range"
              min="0"
              max="100"
              value={healthScore}
              onChange={handleHealthScoreChange}
              className="health-slider"
              disabled={!twinReady}
              style={{
                '--slider-color': zone.color,
              }}
              aria-label="Adjust health score"
            />
            <div className="slider-labels">
              <span>Critical</span>
              <span>Optimal</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="control-section">
            <button
              className="action-btn speak-btn"
              onClick={handleSpeakClick}
              disabled={!twinReady}
              style={{ '--btn-color': zone.color }}
              aria-label="Ask MediTwin AI"
            >
              <span className="btn-icon">🎙️</span>
              {isSpeaking ? 'Speaking...' : 'Ask MediTwin'}
            </button>
          </div>

          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="speaking-indicator">
              <span className="pulse-dot" />
              <span className="pulse-dot" />
              <span className="pulse-dot" />
              <span className="indicator-text">Audio reactivity active</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Build health summary for text-to-speech
 */
function buildHealthSummary(user, scan) {
  const name = user.user_metadata?.full_name?.split(' ')[0] ?? 'there'
  const score = scan.health_score
  let zone = 'unknown'

  if (score <= 30) zone = 'critical'
  else if (score <= 70) zone = 'warning'
  else zone = 'optimal'

  return (
    `Hello ${name}. Your MediTwin digital twin has analyzed your health status. ` +
    `Your current health score is ${score} out of 100, indicating ${zone} health. ` +
    `Continue monitoring your vital signs and maintain healthy habits.`
  )
}
