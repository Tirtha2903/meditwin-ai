export default function TwinVisual({ twin }) {
  const color = twin.health_score >= 75 ? "#00f5a0" : twin.health_score >= 50 ? "#ffd700" : "#ff4d6d";
  return (
    <div className="twin-visual">
      <div className="twin-header">
        <span className="twin-hex">⬡</span>
        <div><div className="twin-id">{twin.twin_id}</div><div className="twin-label">Digital Twin Active</div></div>
      </div>
      <div className="twin-stats">
        {[["Age", `${twin.age} yrs`], ["Group", twin.age_group], ["Heart Rate", `${twin.heart_rate} bpm`], ["HR Status", twin.hr_status]].map(([l,v]) => (
          <div className="stat-item" key={l}><span className="stat-label">{l}</span><span className="stat-value">{v}</span></div>
        ))}
      </div>
      <div className="score-row"><span className="score-label">Health Score</span><span style={{color}}>{twin.health_score}/100</span></div>
      <div className="score-track"><div className="score-fill" style={{width:`${twin.health_score}%`,background:color}} /></div>
    </div>
  );
}
