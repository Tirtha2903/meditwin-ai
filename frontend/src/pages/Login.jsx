/**
 * Login.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * MediTwin AI — Hero Login Page
 *
 * Layout (Z-axis):
 *   z=0  ParticleHuman WebGL canvas (full-viewport 3D particle human)
 *   z=10 Glassmorphism UI overlay:
 *          – Animated brand header (top-left)
 *          – Feature pills (top-right)
 *          – Health Score badge (top-center, driven by slider)
 *          – Main login card (bottom-center glassmorphism panel)
 *          – Control panel (health slider + voice toggle)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback } from 'react';
import { supabase } from '../supabase/client';
import ParticleHuman from '../components/ParticleHuman';

// Initial demo health score shown on load
const DEMO_SCORE = 78;

// Pre-built feature pill data
const FEATURES = [
  { icon: '🧬', label: '10-Vital Digital Twin'    },
  { icon: '🤖', label: 'Gemini AI Health Chat'    },
  { icon: '🎙️', label: 'AI Doctor Voice Report'  },
  { icon: '📈', label: 'Predictive Risk Timeline' },
];

export default function Login() {
  const [healthScore, setHealthScore] = useState(DEMO_SCORE);
  const [ready, setReady]             = useState(false);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' },
    });
  };

  const handleHealthChange = useCallback((val) => {
    setHealthScore(val);
  }, []);

  const handleReady = useCallback(() => {
    setReady(true);
  }, []);

  const cssHex = scoreToHex(healthScore);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#030b14',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── 3D Particle Canvas (fills entire viewport) ──────────────── */}
      <ParticleHuman
        healthScore={healthScore}
        onHealthChange={handleHealthChange}
        onReady={handleReady}
        showUI={true}
        width="100%"
        height="100%"
      />

      {/* ── Glassmorphism HUD Overlay ───────────────────────────────── */}
      {/* This layer sits on top of the canvas (pointer-events: none on
          the wrapper; individual interactive elements restore pointer-events) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Top bar ───────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '28px 32px 0',
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: ready ? 1 : 0,
              transform: ready ? 'translateY(0)' : 'translateY(-12px)',
              transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
            }}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `linear-gradient(135deg, #0a2540, ${cssHex}33)`,
              border: `1px solid ${cssHex}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: `0 4px 20px ${cssHex}30`,
            }}>
              ⬡
            </div>
            <div>
              <div style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '-0.5px',
                lineHeight: 1.1,
              }}>
                MediTwin <span style={{ color: cssHex }}>AI</span>
              </div>
              <div style={{
                fontSize: '0.58rem',
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}>
                Predictive Healthcare Twin
              </div>
            </div>
          </div>

          {/* Feature pills */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              alignItems: 'flex-end',
              opacity: ready ? 1 : 0,
              transform: ready ? 'translateY(0)' : 'translateY(-12px)',
              transition: 'opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s',
            }}
          >
            {FEATURES.map(({ icon, label }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  fontSize: '0.68rem',
                  color: 'rgba(255,255,255,0.6)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom: Login card (right side) ───────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            padding: '0 32px 40px',
          }}
        >
          <div
            style={{
              pointerEvents: 'all',
              width: 340,
              background: 'rgba(3, 14, 28, 0.78)',
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 24,
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              boxShadow: `0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
              opacity: ready ? 1 : 0,
              transform: ready ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s',
            }}
          >
            {/* Card Header */}
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-0.5px',
                  lineHeight: 1.2,
                }}
              >
                Welcome to{' '}
                <span style={{
                  background: `linear-gradient(90deg, ${cssHex}, #00b4d8)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  transition: 'background 0.5s ease',
                }}>
                  MediTwin
                </span>
              </h1>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: '0.78rem',
                  color: 'rgba(255,255,255,0.4)',
                  lineHeight: 1.5,
                }}
              >
                Your AI-powered healthcare digital twin. Sign in to begin your personalised health journey.
              </p>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

            {/* Google sign-in */}
            <button
              id="google-signin-btn"
              className="google-btn"
              onClick={handleGoogleLogin}
              aria-label="Sign in with Google"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '13px 20px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.9)',
                fontSize: '0.88rem',
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                transition: 'background 0.2s ease, border-color 0.2s ease',
                outline: 'none',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            >
              <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              Continue with Google
            </button>

            {/* Disclaimer */}
            <p
              style={{
                margin: 0,
                textAlign: 'center',
                fontSize: '0.62rem',
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.05em',
              }}
            >
              Not for clinical use · Hackathon Demo · Data encrypted
            </p>
          </div>
        </div>
      </div>

      {/* ── Google Fonts ─────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

// ── Colour helper (mirrors useHealthColor logic for JSX dynamic colours) ──────
function scoreToHex(score) {
  const stops = [
    [0,   '#7a0018'],
    [30,  '#ff1a40'],
    [50,  '#ff8c00'],
    [70,  '#ffd500'],
    [85,  '#39ff14'],
    [100, '#00f5c8'],
  ];
  const t = Math.max(0, Math.min(100, score));
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      lo = stops[i]; hi = stops[i + 1]; break;
    }
  }
  const span = hi[0] - lo[0];
  const frac = span < 1e-4 ? 0 : (t - lo[0]) / span;
  return lerpHex(lo[1], hi[1], frac);
}

function lerpHex(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab_ = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t).toString(16).padStart(2, '0');
  const g = Math.round(ag + (bg - ag) * t).toString(16).padStart(2, '0');
  const bl = Math.round(ab_ + (bb - ab_) * t).toString(16).padStart(2, '0');
  return `#${r}${g}${bl}`;
}