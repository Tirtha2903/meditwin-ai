export default function TwinVisual({ twin }) {
  const color = twin.health_score >= 75 ? "#00f5a0" : twin.health_score >= 50 ? "#ffd700" : "#ff4d6d"
  const presage = twin.presage || null

  return (
    <div className="twin-visual">
      <div className="twin-header">
        <span className="twin-hex">⬡</span>
        <div>
          <div className="twin-id">{twin.twin_id}</div>
          <div className="twin-label">Digital Twin Active</div>
        </div>
      </div>

      {/* Core vitals */}
      <div className="twin-stats">
        {[
          ["Age",        `${twin.age} yrs`],
          ["Group",      twin.age_group],
          ["Heart Rate", `${twin.heart_rate} bpm`],
          ["HR Status",  twin.hr_status],
          ["Blood Pressure", `${twin.systolic_bp}/${twin.diastolic_bp}`],
          ["BP Status",  twin.bp_status],
          ["BMI",        `${twin.bmi}`],
          ["BMI Status", twin.bmi_status],
        ].map(([l, v]) => (
          <div className="stat-item" key={l}>
            <span className="stat-label">{l}</span>
            <span className="stat-value">{v}</span>
          </div>
        ))}
      </div>

      {/* Health score bar */}
      <div className="score-row">
        <span className="score-label">Health Score</span>
        <span style={{color}}>{twin.health_score}/100</span>
      </div>
      <div className="score-track">
        <div className="score-fill" style={{width:`${twin.health_score}%`, background:color}}/>
      </div>

      {/* Presage extras — only shown if Android app sent data */}
      {presage && (
        <div style={{marginTop: 16}}>
          <div style={{
            fontFamily:'var(--font-mono)', fontSize:'.65rem',
            letterSpacing:'.12em', textTransform:'uppercase',
            color:'var(--text-dim)', marginBottom:8,
            display:'flex', alignItems:'center', gap:6
          }}>
            <span style={{color:'var(--teal)'}}>●</span> Presage SmartSpectra Data
          </div>
          <div className="twin-stats">
            {presage.breathing_rate != null && (
              <div className="stat-item">
                <span className="stat-label">Breathing Rate</span>
                <span className="stat-value">{presage.breathing_rate} brpm</span>
              </div>
            )}
            {presage.stress_score != null && (
              <div className="stat-item">
                <span className="stat-label">Stress Level</span>
                <span className="stat-value" style={{
                  color: presage.stress_score > 60 ? 'var(--red)' : presage.stress_score > 30 ? '#ffd700' : 'var(--teal)'
                }}>
                  {presage.stress_score}/100 — {presage.stress_status}
                </span>
              </div>
            )}
            {presage.focus_score != null && (
              <div className="stat-item">
                <span className="stat-label">Focus</span>
                <span className="stat-value" style={{color:'var(--teal)'}}>
                  {presage.focus_score}/100 — {presage.focus_status}
                </span>
              </div>
            )}
            {presage.excitement_score != null && (
              <div className="stat-item">
                <span className="stat-label">Excitement</span>
                <span className="stat-value" style={{color:'#ffd700'}}>{presage.excitement_score}/100</span>
              </div>
            )}
            {presage.emotion && (
              <div className="stat-item">
                <span className="stat-label">Emotion</span>
                <span className="stat-value" style={{color:'#ffd700'}}>
                  {presage.emotion} ({presage.emotion_label})
                </span>
              </div>
            )}
            {presage.posture && (
              <div className="stat-item">
                <span className="stat-label">Posture</span>
                <span className="stat-value">{presage.posture} — {presage.posture_status}</span>
              </div>
            )}
            {presage.activity_level != null && (
              <div className="stat-item">
                <span className="stat-label">Activity</span>
                <span className="stat-value">{presage.activity_level}/100</span>
              </div>
            )}
            {presage.micro_expressions?.length > 0 && (
              <div className="stat-item" style={{gridColumn:'1/-1'}}>
                <span className="stat-label">Micro Expressions</span>
                <span className="stat-value" style={{fontSize:'.8rem'}}>{presage.micro_expressions.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}