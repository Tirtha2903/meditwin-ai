import { useState } from 'react'

export default function PresagePanel({ user, onVitalsReceived }) {
  const [polling, setPolling] = useState(false)
  const [status, setStatus] = useState('')
  const [received, setReceived] = useState(null)

  const startPolling = () => {
    setPolling(true)
    setStatus('Waiting for Android app to send vitals...')
    setReceived(null)

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/presage/latest?user_id=${user.id}`)
        const data = await res.json()
        if (data.status === 'ready') {
          clearInterval(interval)
          setPolling(false)
          setReceived(data.data)
          setStatus('Vitals received from Presage')
          onVitalsReceived(data.data)
          // Clear from server so next scan starts fresh
          fetch('http://localhost:5000/api/presage/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id })
          })
        }
      } catch {
        clearInterval(interval)
        setPolling(false)
        setStatus('Connection failed — is backend running?')
      }
    }, 2000)

    // Stop after 3 minutes
    setTimeout(() => {
      clearInterval(interval)
      setPolling(false)
      if (!received) setStatus('Timed out — no data received')
    }, 180000)
  }

  // What to display for each Presage field
  const fields = received ? [
    received.heart_rate      && { label: 'Heart Rate',   value: `${received.heart_rate} bpm`,      color: 'var(--teal)' },
    received.breathing_rate  && { label: 'Breathing',    value: `${received.breathing_rate} brpm`,  color: 'var(--teal)' },
    received.systolic_bp     && { label: 'Systolic BP',  value: `${received.systolic_bp} mmHg`,     color: 'var(--teal)' },
    received.diastolic_bp    && { label: 'Diastolic BP', value: `${received.diastolic_bp} mmHg`,    color: 'var(--teal)' },
    received.stress_score != null && { label: 'Stress',  value: `${received.stress_score}/100`,     color: received.stress_score > 60 ? 'var(--red)' : 'var(--teal)' },
    received.focus_score  != null && { label: 'Focus',   value: `${received.focus_score}/100`,      color: 'var(--teal)' },
    received.excitement_score != null && { label: 'Excitement', value: `${received.excitement_score}/100`, color: '#ffd700' },
    received.emotion         && { label: 'Emotion',      value: received.emotion,                   color: '#ffd700' },
    received.posture         && { label: 'Posture',      value: received.posture,                   color: 'var(--teal)' },
    received.activity_level != null && { label: 'Activity', value: `${received.activity_level}/100`, color: 'var(--teal)' },
    received.micro_expressions?.length && { label: 'Expressions', value: received.micro_expressions.join(', '), color: '#ffd700' },
  ].filter(Boolean) : []

  return (
    <div className="presage-box" style={{marginBottom: 24}}>
      <div className="presage-header">
        <span style={{fontSize:'1.4rem'}}>📱</span>
        <div>
          <div style={{fontWeight:600, fontSize:'.95rem'}}>Presage SmartSpectra</div>
          <div style={{fontSize:'.75rem', color:'var(--text-dim)'}}>
            Receive contactless vitals from Android app
          </div>
        </div>
        <button
          className="voice-btn"
          style={{marginLeft:'auto'}}
          onClick={startPolling}
          disabled={polling}
        >
          {polling ? '⏳ Waiting...' : '📱 Start Presage Scan'}
        </button>
      </div>

      {status && (
        <div style={{
          fontFamily:'var(--font-mono)', fontSize:'.75rem',
          color: received ? 'var(--teal)' : 'var(--text-dim)',
          marginBottom: fields.length ? 12 : 0
        }}>
          {received ? '✅' : '⏳'} {status}
        </div>
      )}

      {fields.length > 0 && (
        <div className="twin-stats" style={{marginTop: 8}}>
          {fields.map(f => (
            <div className="stat-item" key={f.label}>
              <span className="stat-label">{f.label}</span>
              <span className="stat-value" style={{color: f.color}}>{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {!received && !polling && (
        <div style={{fontSize:'.8rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)'}}>
          Tell your friend to open the Android app and scan → vitals will auto-fill here.
          <br/>
          Android app should POST to: <span style={{color:'var(--teal)'}}>http://YOUR_IP:5000/api/presage/vitals</span>
        </div>
      )}
    </div>
  )
}