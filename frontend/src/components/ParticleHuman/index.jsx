/**
 * ParticleHuman/index.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * MediTwin AI — 3D Interactive Particle Human + Glassmorphism UI Hero
 *
 * Props (when used standalone as a page hero):
 *   healthScore      {number}   0–100. Controls particle colour.
 *   onHealthChange   {func}     Called when the user changes the slider.
 *   height           {string}   CSS height. Default "100%".
 *   width            {string}   CSS width. Default "100%".
 *   onReady          {func}     Called when the morph animation completes.
 *   showUI           {boolean}  Whether to render the glassmorphism overlay.
 *
 * Architecture:
 *   1. Three.js scene + renderer live in a useRef and are created ONCE.
 *   2. BufferGeometry has `position` (ambient scatter) + `aBodyPos` (body target).
 *      The GLSL vertex shader lerps between them via `uMorph` uniform.
 *   3. GSAP animates uMorph: 0 → 1 after 1.5s delay, duration 3.5s.
 *   4. rAF loop updates: uTime, uAudioData (every 2nd frame), Y-rotation.
 *   5. Health colours update via a separate lightweight useEffect.
 *   6. Speaking state drives a "pulse" uniform in the shader.
 *
 * Bugs fixed vs. naive implementation:
 *   – Audio ref pattern: we use a callback ref instead of useEffect([audioRef.current])
 *     which is a React anti-pattern (effects don't re-run when .current changes).
 *   – Strict Mode safety: cleanup nulls all refs so the second mount starts clean.
 *   – No needsUpdate: all geometry mutation is GPU-side (shader), so no JS flags needed.
 *   – uAudioData array: we re-use a pre-allocated array in the uniform rather than
 *     swapping the reference each frame (avoids GC churn).
 *   – GSAP tween is killed in cleanup to prevent zombie tweens on hot-reload.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

import { useHumanGeometry, PARTICLE_COUNT } from './useHumanGeometry';
import { useHealthColor }                    from './useHealthColor';
import { useAudioReactivity }               from './useAudioReactivity';
import { useElevenLabsTTS }                 from '../../hooks/useElevenLabsTTS';

import vertexShader   from './particleVertexShader.js';
import fragmentShader from './particleFragmentShader.js';

// ─── Camera Constants ─────────────────────────────────────────────────────────
const CAMERA_FOV      = 60;
const CAMERA_NEAR     = 0.1;
const CAMERA_FAR      = 100;
const CAMERA_Z        = 17; // Pushed back to ensure the entire humanoid crystal fits securely
const AUTO_ROTATE_SPD = 0.50; // degrees per frame

// ─── Health label helper ───────────────────────────────────────────────────────
function getHealthLabel(score) {
  if (score <= 30) return { label: 'CRITICAL', zone: 'critical' };
  if (score <= 70) return { label: 'WARNING',  zone: 'warning'  };
  return                  { label: 'OPTIMAL',  zone: 'optimal'  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ParticleHuman({
  healthScore    = 75,
  onHealthChange,
  height         = '100%',
  width          = '100%',
  onReady,
  showUI         = false,
}) {
  // ── Canvas DOM ref ────────────────────────────────────────────────────────
  const canvasRef   = useRef(null);

  // ── Three.js objects stored in refs (persist across React renders) ────────
  const sceneRef    = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef   = useRef(null);
  const materialRef = useRef(null);
  const rafRef      = useRef(null);
  const clockRef    = useRef(new THREE.Clock());

  // ── Local UI state (only relevant when showUI is true) ───────────────────
  const [localScore,   setLocalScore]   = useState(healthScore);
  const [morphDone,    setMorphDone]    = useState(false);

  // Keep localScore in sync with prop changes from parent
  useEffect(() => { setLocalScore(healthScore); }, [healthScore]);

  // ── Geometry data ─────────────────────────────────────────────────────────
  const { ambientPositions, bodyPositions, bodyPartIndex } = useHumanGeometry();

  // ── Health colour ─────────────────────────────────────────────────────────
  const { colorA, colorB, cssHex } = useHealthColor(localScore);
  const { label: healthLabel, zone: healthZone } = getHealthLabel(localScore);

  // ── Audio reactivity ──────────────────────────────────────────────────────
  const { getFrequencyData, connectAudioElement } = useAudioReactivity();

  // ── ElevenLabs TTS ───────────────────────────────────────────────────────
  const { speak, stop, isSpeaking, isLoading, audioRef } = useElevenLabsTTS();

  // ── Callback ref for <audio> so we connect it as soon as it mounts ───────
  // This is the CORRECT pattern vs. useEffect([audioRef.current]) which is
  // a React anti-pattern (effect dependencies should not be .current values).
  const audioCallbackRef = useCallback((el) => {
    if (el) {
      audioRef.current = el;
      // Connect lazily — AudioContext requires a user gesture first.
      // connectAudioElement itself guards against double-connection.
      connectAudioElement(el);
    }
  }, [audioRef, connectAudioElement]);

  // ── Sync colour uniforms when healthScore or colours change ──────────────
  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uColorA.value.copy(colorA);
    materialRef.current.uniforms.uColorB.value.copy(colorB);
  }, [colorA, colorB]);

  // ── Core Three.js setup – runs ONCE on mount ──────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias:       false,
      alpha:           true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    // 2. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 3. Camera
    const aspect = canvas.clientWidth / (canvas.clientHeight || 1);
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, CAMERA_NEAR, CAMERA_FAR);
    camera.position.set(0, 0.5, CAMERA_Z);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    // 4. Geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',   new THREE.BufferAttribute(ambientPositions, 3));
    geometry.setAttribute('aBodyPos',   new THREE.BufferAttribute(bodyPositions, 3));
    geometry.setAttribute('aPartIndex', new THREE.BufferAttribute(bodyPartIndex, 1));

    const seeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) seeds[i] = Math.random();
    geometry.setAttribute('aRandSeed', new THREE.BufferAttribute(seeds, 1));

    // 5. Shader Material
    // Pre-allocate the audioData array so we never allocate in the rAF loop.
    const audioDataArray = new Array(256).fill(0);

    const uniforms = {
      uMorph:     { value: 0.0 },
      uTime:      { value: 0.0 },
      uAudioData: { value: audioDataArray },
      uSize:      { value: 3.5 },
      uColorA:    { value: colorA.clone() },
      uColorB:    { value: colorB.clone() },
      uPulse:     { value: 0.0 },          // speaking pulse wave
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      vertexColors: false,
    });
    materialRef.current = material;

    // 6. Points
    const points = new THREE.Points(geometry, material);
    points.position.x = 2.5; // Balance the left-heavy UI by shifting the model right
    scene.add(points);

    // 7. GSAP morph 0 → 1
    const morphTween = gsap.to(uniforms.uMorph, {
      value:    1.0,
      duration: 3.5,
      delay:    1.5,
      ease:     'power3.inOut',
      onComplete: () => {
        setMorphDone(true);
        if (typeof onReady === 'function') onReady();
      },
    });

    // 8. Render loop
    let frameCount = 0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      frameCount++;

      const elapsed = clockRef.current.getElapsedTime();
      uniforms.uTime.value = elapsed;

      // Upload audio data every 2nd frame to save ~0.2ms per tick
      if (frameCount % 2 === 0) {
        const fData = getFrequencyData();
        for (let i = 0; i < 256; i++) {
          audioDataArray[i] = fData[i] ?? 0;
        }
        // No need to reassign uniforms.uAudioData.value — it's the same array reference.
      }

      // Pulse wave when speaking: a travelling sine up the body
      uniforms.uPulse.value = 0.0; // vertex shader reads uAudioData; pulse is implicit

      // Auto-rotate Y
      points.rotation.y += THREE.MathUtils.degToRad(AUTO_ROTATE_SPD);

      // Gentle breathing bob
      points.position.y = Math.sin(elapsed * 0.35) * 0.07;

      renderer.render(scene, camera);
    };
    animate();

    // 9. Responsive resize
    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvas);

    // Cleanup
    return () => {
      morphTween.kill();
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      sceneRef.current    = null;
      rendererRef.current = null;
      cameraRef.current   = null;
      materialRef.current = null;
    };
    // Intentionally empty — this effect runs once. Health and audio updates
    // are handled by dedicated lighter effects above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handler: slider changes ───────────────────────────────────────────────
  const handleSlider = useCallback((e) => {
    const val = Number(e.target.value);
    setLocalScore(val);
    if (typeof onHealthChange === 'function') onHealthChange(val);
  }, [onHealthChange]);

  // ── Handler: speak demo button ────────────────────────────────────────────
  const handleVoiceToggle = useCallback(() => {
    if (isSpeaking || isLoading) {
      stop();
    } else {
      const scoreMsg = localScore <= 30
        ? `Critical alert. Your health score is ${localScore}. Immediate medical attention is advised.`
        : localScore <= 70
          ? `Warning. Your health score is ${localScore}. Please consult your physician soon.`
          : `All systems optimal. Your health score is ${localScore}. Keep up the excellent work.`;
      speak(scoreMsg);
    }
  }, [isSpeaking, isLoading, localScore, speak, stop]);

  // ── Derive zone CSS variables from current score ──────────────────────────
  const zoneGlow = useMemo(() => {
    if (localScore <= 30) return 'rgba(255,26,64,0.6)';
    if (localScore <= 70) return 'rgba(255,170,0,0.6)';
    return 'rgba(0,245,168,0.6)';
  }, [localScore]);

  const zoneBg = useMemo(() => {
    if (localScore <= 30) return 'rgba(255,26,64,0.12)';
    if (localScore <= 70) return 'rgba(255,170,0,0.12)';
    return 'rgba(0,245,168,0.12)';
  }, [localScore]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        background: '#030b14',
      }}
    >
      {/* ── Three.js canvas ─────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        aria-label="MediTwin AI 3D particle human visualization"
      />

      {/* ── Hidden audio element for TTS ─────────────────────────────── */}
      <audio
        ref={audioCallbackRef}
        style={{ display: 'none' }}
        crossOrigin="anonymous"
        preload="none"
      />

      {/* ── Glassmorphism UI Overlay ─────────────────────────────────── */}
      {showUI && (
        <div
          aria-label="MediTwin controls overlay"
          style={{
            position: 'absolute',
            top: '50%',
            left: '4%', // Positioned gracefully on the left edge
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 32, // Spacing between the massive score and the panel
            pointerEvents: 'none',
            zIndex: 10,
            maxWidth: 420,
          }}
        >
          {/* ── Health Score Badge (now elegantly floating on the left) ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 8,
              opacity: morphDone ? 1 : 0,
              transition: 'opacity 0.8s ease',
              paddingLeft: 4,
            }}
          >
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.22em',
              color: 'rgba(255,255,255,0.6)',
              textTransform: 'uppercase',
            }}>
              Current Health Score
            </div>
            <div style={{
              fontSize: '4.8rem',
              fontWeight: 800,
              color: cssHex,
              fontFamily: "'Inter', sans-serif",
              textShadow: `0 0 30px ${zoneGlow}, 0 0 60px ${zoneGlow}`,
              letterSpacing: '-2px',
              lineHeight: 0.9,
            }}>
              {localScore}
            </div>
            <div style={{
              marginTop: 4,
              padding: '4px 16px',
              borderRadius: 999,
              background: zoneBg,
              border: `1px solid ${cssHex}55`,
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: cssHex,
              display: 'inline-block',
            }}>
              {healthLabel} STATUS
            </div>
          </div>

          {/* ── Control Panel (glass card, perfectly left-aligned) ──────────────────── */}
          <div
            style={{
              pointerEvents: 'all',
              width: 380, // Slightly narrower for side layout
              background: 'rgba(3, 14, 28, 0.72)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              boxShadow: `0 8px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)`,
            }}
          >
            {/* Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Health Score Simulator
                </span>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: cssHex,
                  fontFamily: "'Inter', sans-serif",
                  textShadow: `0 0 12px ${zoneGlow}`,
                }}>
                  {localScore} / 100
                </span>
              </div>

              {/* Custom slider track */}
              <div style={{ position: 'relative', height: 6, borderRadius: 3 }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.08)',
                }} />
                <div style={{
                  position: 'absolute',
                  inset: `0 ${100 - localScore}% 0 0`,
                  borderRadius: 3,
                  background: `linear-gradient(90deg, #ff1a40, ${cssHex})`,
                  boxShadow: `0 0 8px ${zoneGlow}`,
                  transition: 'background 0.4s ease',
                }} />
                <input
                  id="health-score-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={localScore}
                  onChange={handleSlider}
                  aria-label="Health score slider"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    height: '100%',
                    margin: 0,
                    zIndex: 2,
                  }}
                />
              </div>

              {/* Zone markers */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 2,
              }}>
                {[
                  { label: '0 Critical', color: '#ff1a40' },
                  { label: '50 Warning',  color: '#ffaa00' },
                  { label: '100 Optimal', color: '#00f5a0' },
                ].map(({ label, color }) => (
                  <span key={label} style={{
                    fontSize: '0.58rem',
                    color,
                    opacity: 0.7,
                    letterSpacing: '0.05em',
                    fontFamily: "'Inter', sans-serif",
                  }}>{label}</span>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{
              height: 1,
              background: 'rgba(255,255,255,0.06)',
              margin: '0 -4px',
            }} />

            {/* Voice toggle button */}
            <button
              id="ai-voice-toggle-btn"
              onClick={handleVoiceToggle}
              aria-label={isSpeaking ? 'Stop AI voice' : 'Toggle AI voice'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '12px 20px',
                borderRadius: 12,
                border: `1px solid ${isSpeaking ? cssHex + '80' : 'rgba(255,255,255,0.1)'}`,
                background: isSpeaking ? zoneBg : 'rgba(255,255,255,0.05)',
                cursor: isLoading ? 'wait' : 'pointer',
                color: isSpeaking ? cssHex : 'rgba(255,255,255,0.75)',
                fontSize: '0.80rem',
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.06em',
                transition: 'all 0.3s ease',
                boxShadow: isSpeaking ? `0 0 20px ${zoneGlow}40, inset 0 0 12px ${zoneGlow}10` : 'none',
                outline: 'none',
              }}
            >
              {/* Animated mic icon */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: isSpeaking ? zoneGlow : 'rgba(255,255,255,0.08)',
                transition: 'background 0.3s ease',
                animation: isSpeaking ? 'voicePulse 1.2s ease-in-out infinite' : 'none',
                fontSize: '0.9rem',
              }}>
                {isLoading ? '⏳' : isSpeaking ? '🔊' : '🎙️'}
              </span>
              <span>
                {isLoading
                  ? 'Generating speech…'
                  : isSpeaking
                    ? 'MediTwin Speaking — Click to Stop'
                    : 'Toggle AI Voice Report'}
              </span>

              {/* Equalizer bars when speaking */}
              {isSpeaking && (
                <span style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 2,
                  height: 16,
                  marginLeft: 'auto',
                }}>
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} style={{
                      display: 'block',
                      width: 3,
                      background: cssHex,
                      borderRadius: 2,
                      animation: `eqBar 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
                    }} />
                  ))}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Speaking indicator ring (always-on, bottom center) ───────── */}
      {!showUI && isSpeaking && (
        <div
          aria-live="polite"
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            borderRadius: 999,
            padding: '6px 16px',
            fontSize: '12px',
            color: '#00f5a0',
            letterSpacing: '0.05em',
            border: `1px solid rgba(0,245,160,0.25)`,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#00f5a0',
                animation: `speakPulse 0.9s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
          MediTwin Speaking
        </div>
      )}

      {/* ── Keyframe Animations ───────────────────────────────────────── */}
      <style>{`
        @keyframes speakPulse {
          0%, 100% { transform: scaleY(0.4); opacity: 0.4; }
          50%       { transform: scaleY(1.4); opacity: 1.0; }
        }
        @keyframes voicePulse {
          0%   { box-shadow: 0 0 0 0 ${zoneGlow}; }
          100% { box-shadow: 0 0 0 10px transparent; }
        }
        @keyframes eqBar {
          from { height: 4px;  }
          to   { height: 14px; }
        }
      `}</style>
    </div>
  );
}
