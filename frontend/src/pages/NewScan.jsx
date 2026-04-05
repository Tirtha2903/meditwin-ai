import { useState } from 'react'
import { supabase } from '../supabase/client'
import { predictHealth, scanCameraVitals } from '../api/predict'
import TwinVisual from '../components/TwinVisual'
import ResultCard from '../components/ResultCard'
import GeminiChat from '../components/GeminiChat'
import PresagePanel from '../components/PresagePanel'

export default function NewScan({ user }) {
  const [form, setForm] = useState({
    age:'', heart_rate:'', systolic_bp:'', diastolic_bp:'',
    bmi:'', cholesterol:'', glucose:'', smoking:'0',
    diabetes:'0', family_history:'0'
  })
  const [presageData, setPresageData] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isScanningCamera, setIsScanningCamera] = useState(false)
  const [scanMessage, setScanMessage] = useState('')

  const handleCameraScan = async () => {
    setIsScanningCamera(true)
    setScanMessage('📸 Camera active. Stay still for 30 seconds...')
    setError('')
    try {
      const data = await scanCameraVitals()
      setForm(prev => ({
        ...prev,
        heart_rate: data.heart_rate || prev.heart_rate
      }))
      setScanMessage(`✅ Scan complete! Heart Rate: ${data.heart_rate} bpm (Respiration: ${data.breathing_rate} breaths/min)`)
      setTimeout(() => setScanMessage(''), 8000)
    } catch(err) {
      setError(err.message)
      setScanMessage('')
    } finally {
      setIsScanningCamera(false)
    }
  }

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  // Called by PresagePanel when vitals arrive from Android app
  const handlePresageReceived = (data) => {
    setPresageData(data)
    // Auto-fill whatever fields Presage sends
    setForm(prev => ({
      ...prev,
      ...(data.heart_rate   && { heart_rate:   String(data.heart_rate) }),
      ...(data.systolic_bp  && { systolic_bp:   String(data.systolic_bp) }),
      ...(data.diastolic_bp && { diastolic_bp:  String(data.diastolic_bp) }),
    }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError(''); setResult(null); setSaved(false)
    try {
      // Merge form + presage extras into one payload
      const payload = {
        ...form,
        ...(presageData && {
          breathing_rate:   presageData.breathing_rate,
          stress_score:     presageData.stress_score,
          focus_score:      presageData.focus_score,
          excitement_score: presageData.excitement_score,
          emotion:          presageData.emotion,
          micro_expressions: presageData.micro_expressions,
          posture:          presageData.posture,
          activity_level:   presageData.activity_level,
        })
      }

      const data = await predictHealth(payload)
      setResult(data)

      await supabase.from('scans').insert({
        user_id:        user.id,
        age:            Number(form.age),
        heart_rate:     Number(form.heart_rate),
        systolic_bp:    Number(form.systolic_bp),
        diastolic_bp:   Number(form.diastolic_bp),
        bmi:            Number(form.bmi),
        cholesterol:    Number(form.cholesterol),
        glucose:        Number(form.glucose),
        smoking:        Number(form.smoking),
        diabetes:       Number(form.diabetes),
        family_history: Number(form.family_history),
        risk_label:     data.prediction.risk_label,
        probability:    data.prediction.probability,
        health_score:   data.digital_twin.health_score
      })
      setSaved(true)
    } catch(err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">New Health Scan</h1>
      <p className="page-sub">Enter your vitals to generate your Digital Twin</p>

      {/* Presage panel — full width above the grid */}
      <PresagePanel user={user} onVitalsReceived={handlePresageReceived} />

      <div className="scan-grid">
        {/* Left: Form */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className="panel-title" style={{ margin: 0 }}><span className="step-num">01</span> Patient Vitals</h2>
            <button 
              type="button" 
              className="submit-btn" 
              style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8rem', background: '#0a2540', border: '1px solid #00f5a0', color: '#00f5a0' }}
              onClick={handleCameraScan}
              disabled={isScanningCamera}
            >
              {isScanningCamera ? '⏳ Scanning (30s)...' : '📸 Camera Scan'}
            </button>
          </div>
          {scanMessage && <div className="success-box" style={{ marginBottom: 16, background: 'rgba(0, 245, 160, 0.1)', border: '1px solid rgba(0,245,160,0.3)', color: '#00f5a0' }}>{scanMessage}</div>}
          
          <form className="input-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="field">
                <label className="field-label">Age <span className="unit">years</span></label>
                <input className="field-input" name="age" type="number" placeholder="45" min="1" max="120" value={form.age} onChange={handleChange} required/>
              </div>
              <div className="field">
                <label className="field-label">Heart Rate <span className="unit">bpm</span></label>
                <input className="field-input" name="heart_rate" type="number" placeholder="80" min="30" max="220" value={form.heart_rate} onChange={handleChange} required/>
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field-label">Systolic BP <span className="unit">mmHg</span></label>
                <input className="field-input" name="systolic_bp" type="number" placeholder="120" min="70" max="250" value={form.systolic_bp} onChange={handleChange} required/>
              </div>
              <div className="field">
                <label className="field-label">Diastolic BP <span className="unit">mmHg</span></label>
                <input className="field-input" name="diastolic_bp" type="number" placeholder="80" min="40" max="150" value={form.diastolic_bp} onChange={handleChange} required/>
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field-label">BMI</label>
                <input className="field-input" name="bmi" type="number" placeholder="24.5" step="0.1" min="10" max="60" value={form.bmi} onChange={handleChange} required/>
              </div>
              <div className="field">
                <label className="field-label">Cholesterol <span className="unit">mg/dL</span></label>
                <input className="field-input" name="cholesterol" type="number" placeholder="200" min="100" max="400" value={form.cholesterol} onChange={handleChange} required/>
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field-label">Glucose <span className="unit">mg/dL</span></label>
                <input className="field-input" name="glucose" type="number" placeholder="90" min="50" max="400" value={form.glucose} onChange={handleChange} required/>
              </div>
              <div className="field">
                <label className="field-label">Smoking</label>
                <select className="field-input" name="smoking" value={form.smoking} onChange={handleChange}>
                  <option value="0">Non-Smoker</option>
                  <option value="1">Smoker</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field-label">Diabetes</label>
                <select className="field-input" name="diabetes" value={form.diabetes} onChange={handleChange}>
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">Family History</label>
                <select className="field-input" name="family_history" value={form.family_history} onChange={handleChange}>
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
            </div>
            <button className="submit-btn" type="submit" disabled={loading}>
              <span className="btn-inner">{loading ? '⏳ Analyzing…' : '⬡ Generate Digital Twin'}</span>
            </button>
            {error && <div className="error-box">⚠ {error}</div>}
            {saved && <div className="success-box">✅ Scan saved to your history</div>}
          </form>
        </div>

        {/* Right: Results */}
        <div className="panel">
          <h2 className="panel-title"><span className="step-num">02</span> Digital Twin Analysis</h2>
          {!result && !loading && (
            <div className="placeholder">
              <div className="placeholder-icon">⬡</div>
              <p>Enter vitals to generate your digital twin</p>
            </div>
          )}
          {loading && <div className="loading-state"><div className="spinner"/><p>Generating Digital Twin…</p></div>}
          {result && (
            <>
              <TwinVisual twin={result.digital_twin}/>
              <ResultCard result={result}/>
            </>
          )}
        </div>
      </div>

      {result && <GeminiChat result={result} form={form}/>}
    </div>
  )
}