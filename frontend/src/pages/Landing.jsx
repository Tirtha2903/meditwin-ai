import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="logo">
          <span className="logo-icon">⬡</span>
          <span className="logo-text">MediTwin <span className="logo-accent">AI</span></span>
        </div>
        <Link to="/login" className="landing-login-btn">Sign in →</Link>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">Powered by Gemini · ElevenLabs · Presage · SuperPlane</div>
        <h1 className="hero-title">
          Your health,<br/>
          <span className="hero-accent">digitally twinned.</span>
        </h1>
        <p className="hero-sub">
          MediTwin AI creates a virtual model of your cardiovascular system,
          predicts risk with machine learning, and explains it in plain language —
          all in under 30 seconds.
        </p>
        <div className="hero-cta">
          <Link to="/login" className="cta-primary">Get started free</Link>
          <a href="https://github.com/Diptanil-Sen/meditwin" target="_blank" rel="noreferrer" className="cta-secondary">View on GitHub →</a>
        </div>
        <div className="hero-stat-row">
          <div className="hero-stat"><span className="hero-stat-num">10</span><span className="hero-stat-label">Vitals analyzed</span></div>
          <div className="hero-stat-div"/>
          <div className="hero-stat"><span className="hero-stat-num">98.7%</span><span className="hero-stat-label">Clinical accuracy</span></div>
          <div className="hero-stat-div"/>
          <div className="hero-stat"><span className="hero-stat-num">&lt;30s</span><span className="hero-stat-label">Time to insight</span></div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section">
        <div className="section-label">How it works</div>
        <h2 className="section-title">Three steps to your Digital Twin</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">01</div>
            <h3 className="step-title">Enter vitals</h3>
            <p className="step-desc">Input 10 key health metrics — or use Presage SDK to scan your heart rate contactlessly via camera.</p>
          </div>
          <div className="step-connector"/>
          <div className="step-card">
            <div className="step-num">02</div>
            <h3 className="step-title">Generate twin</h3>
            <p className="step-desc">Our ML model creates your Digital Twin and predicts cardiovascular risk with probability scoring.</p>
          </div>
          <div className="step-connector"/>
          <div className="step-card">
            <div className="step-num">03</div>
            <h3 className="step-title">Get AI report</h3>
            <p className="step-desc">Gemini AI explains your results. ElevenLabs reads your report aloud. SuperPlane automates follow-up.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-section">
        <div className="section-label">Features</div>
        <h2 className="section-title">Built for real impact</h2>
        <div className="features-grid">
          {[
            { icon: '⬡', title: 'Digital Twin Engine', desc: 'Virtual patient model built from 10 biomarkers. Tracks health score, risk drivers, and vitals classification.' },
            { icon: '🤖', title: 'Gemini AI Chat', desc: 'Ask anything about your results. Gemini 2.0 Flash answers in plain language with medical context.' },
            { icon: '🎙️', title: 'Voice Health Report', desc: 'ElevenLabs AI reads your full risk report aloud with a calm, medical-grade voice.' },
            { icon: '📷', title: 'Presage Camera SDK', desc: 'Contactless heart rate and breathing rate detection using just your laptop or phone camera.' },
            { icon: '⚡', title: 'SuperPlane Workflows', desc: 'Event-driven DevOps automation. High-risk scans trigger instant alerts and follow-up workflows.' },
            { icon: '📊', title: 'Risk Visualizations', desc: 'Cluster maps, risk heatmaps, and 7/30/90-day timeline projections powered by D3.js.' },
          ].map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="landing-section">
        <div className="section-label">Tech stack</div>
        <h2 className="section-title">Built with best-in-class tools</h2>
        <div className="stack-grid">
          {[
            { name: 'Gemini 2.0', role: 'AI Chat & Reports' },
            { name: 'ElevenLabs', role: 'Voice Synthesis' },
            { name: 'Presage SDK', role: 'Camera Vitals' },
            { name: 'SuperPlane', role: 'DevOps Automation' },
            { name: 'Supabase', role: 'Auth & Database' },
            { name: 'scikit-learn', role: 'ML Prediction' },
            { name: 'React + Vite', role: 'Frontend' },
            { name: 'Flask', role: 'Backend API' },
          ].map((s, i) => (
            <div className="stack-item" key={i}>
              <div className="stack-name">{s.name}</div>
              <div className="stack-role">{s.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-banner">
        <h2 className="cta-banner-title">Know your risk before it's too late.</h2>
        <p className="cta-banner-sub">Free to use. No hardware required. Results in 30 seconds.</p>
        <Link to="/login" className="cta-primary" style={{fontSize:'1rem', padding:'16px 40px'}}>
          Create your Digital Twin →
        </Link>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="logo" style={{marginBottom:8}}>
          <span className="logo-icon" style={{fontSize:'1.2rem'}}>⬡</span>
          <span className="logo-text" style={{fontSize:'1rem'}}>MediTwin <span className="logo-accent">AI</span></span>
        </div>
        <p style={{color:'var(--text-dim)', fontSize:'.75rem', fontFamily:'var(--font-mono)'}}>
          HackTropica 2026 · Not for clinical use · Built by Diptanil Sen
        </p>
      </footer>
    </div>
  )
}