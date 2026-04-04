import { useState } from 'react'

const GEMINI_KEY = 'AIzaSyCsXBhPCQlo7RmH6vxOUPVbMJJGCh1viQ0'
const ELEVENLABS_KEY = 'sk_08c0de3515ab66d6b6651ff161fb1a4ba2a2947134ef3e9b'
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM' // Rachel — calm, medical

export default function GeminiChat({ result, form }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const systemContext = `
    You are an AI health assistant. The patient's Digital Twin data:
    - Age: ${form.age}, Heart Rate: ${form.heart_rate} bpm
    - Blood Pressure: ${form.systolic_bp}/${form.diastolic_bp} mmHg
    - BMI: ${form.bmi}, Cholesterol: ${form.cholesterol} mg/dL
    - Glucose: ${form.glucose} mg/dL
    - Smoking: ${form.smoking==='1'?'Yes':'No'}, Diabetes: ${form.diabetes==='1'?'Yes':'No'}
    - Family History of Heart Disease: ${form.family_history==='1'?'Yes':'No'}
    - Risk Level: ${result.prediction.risk_label} (${result.prediction.probability}%)
    - Health Score: ${result.digital_twin.health_score}/100
    - 7-Day Forecast: ${result.future_risk}
    - Top Risk Factors: ${result.explanation?.top_factors?.join(', ')}
    Answer health questions clearly. Always remind you're not a substitute for a real doctor. Keep answers under 100 words.
  `

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', text: input }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: systemContext
        })
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Server error')
      }
      setMessages([...history, { role: 'ai', text: data.reply || 'No response.' }])
    } catch (err) {
      setMessages([...history, { role: 'ai', text: `Error: ${err.message}` }])
    }
    setLoading(false)
  }

  const speakReport = async () => {
    setSpeaking(true)
    const reportText = `Hello. I am your MediTwin AI health assistant.
      Your risk level is ${result.prediction.risk_label}.
      Your cardiovascular risk probability is ${result.prediction.probability} percent.
      Your health score is ${result.digital_twin.health_score} out of 100.
      ${result.future_risk.replace(/[^\w\s.,!?]/g, '')}
      Please remember this is a predictive model and not a substitute for professional medical advice.`

    try {
      const res = await fetch('http://localhost:5000/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reportText })
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.play()
      audio.onended = () => setSpeaking(false)
    } catch {
      setSpeaking(false)
      alert('Voice error. Check backend.')
    }
  }

  return (
    <div className="panel" style={{marginTop:24}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <h2 className="panel-title" style={{margin:0}}>
          <span className="step-num">03</span> AI Health Assistant
        </h2>
        <button
          className="voice-btn"
          onClick={speakReport}
          disabled={speaking}
        >
          {speaking ? '🔊 Speaking…' : '🎙️ Hear My Report'}
        </button>
      </div>

      <div className="chat-box">
        {messages.length === 0 && (
          <div className="chat-placeholder">
            Ask me anything about your results — "Why am I high risk?", "What should I eat?", "Is my BP normal?"
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <span className="chat-label">{m.role === 'user' ? 'You' : '🤖 MediTwin AI'}</span>
            <p>{m.text}</p>
          </div>
        ))}
        {loading && (
          <div className="chat-msg ai">
            <span className="chat-label">🤖 MediTwin AI</span>
            <p className="typing">Thinking<span>.</span><span>.</span><span>.</span></p>
          </div>
        )}
      </div>

      <div className="chat-input-row">
        <input
          className="field-input"
          style={{flex:1, fontSize:'1rem', padding:'12px 16px'}}
          placeholder="Ask about your health results…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button className="submit-btn" style={{width:'auto', padding:'12px 20px'}} onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  )
}