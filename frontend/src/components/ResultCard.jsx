export default function ResultCard({ result }) {
  const { prediction, future_risk } = result;
  const isHigh = prediction.risk_label === "HIGH";
  return (
    <div className={`result-card ${isHigh ? "risk-high" : "risk-low"}`}>
      <div className="risk-badge"><span className="risk-dot"/><span>{isHigh ? "HIGH RISK" : "LOW RISK"}</span></div>
      <div className="prob-section">
        <div className="prob-circle">
          <svg viewBox="0 0 100 100" className="prob-svg">
            <circle cx="50" cy="50" r="40" className="prob-track"/>
            <circle cx="50" cy="50" r="40" className="prob-arc"
              strokeDasharray={`${prediction.probability*2.51} 251`}
              style={{stroke: isHigh?"#ff4d6d":"#00f5a0"}}/>
          </svg>
          <div className="prob-label"><span className="prob-num">{prediction.probability}%</span><span className="prob-sub">risk</span></div>
        </div>
        <div className="confidence-row">Confidence: <strong>{prediction.confidence}%</strong></div>
      </div>
      <div className="forecast-box">
        <div className="forecast-title">7-Day Risk Forecast</div>
        <p className="forecast-msg">{future_risk}</p>
      </div>
    </div>
  );
}
