import { useState } from "react";
export default function InputForm({ onSubmit, loading }) {
  const [age, setAge] = useState("");
  const [heartRate, setHR] = useState("");
  const handleSubmit = (e) => { e.preventDefault(); if (age && heartRate) onSubmit({ age, heartRate }); };
  return (
    <form className="input-form" onSubmit={handleSubmit}>
      <div className="field">
        <label className="field-label">Age <span className="unit">years</span></label>
        <input className="field-input" type="number" min="1" max="120" placeholder="e.g. 45"
          value={age} onChange={e => setAge(e.target.value)} required />
      </div>
      <div className="field">
        <label className="field-label">Heart Rate <span className="unit">bpm</span></label>
        <input className="field-input" type="number" min="30" max="220" placeholder="e.g. 82"
          value={heartRate} onChange={e => setHR(e.target.value)} required />
      </div>
      <button className="submit-btn" type="submit" disabled={loading}>
        <span className="btn-inner">{loading ? "⏳ Analyzing…" : "⬡ Generate Digital Twin"}</span>
      </button>
    </form>
  );
}
