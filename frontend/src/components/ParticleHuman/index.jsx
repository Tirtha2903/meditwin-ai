/**
 * ParticleHuman/index.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Main component: a self-contained Three.js WebGL canvas that renders the
 * MediTwin AI particle human.
 *
 * Props:
 *   healthScore  {number}  0–100. Controls particle colour via the GPU shader.
 *   height       {string}  CSS height of the canvas container. Default "100%".
 *   width        {string}  CSS width. Default "100%".
 *   onReady      {func}    Called when the morph animation completes.
 *   onSpeakRef   {React.MutableRefObject}  Optional ref that receives the
 *                          `speak(text)` function so a parent can call it.
 *
 * Architecture:
 *   1. Three.js scene, camera, renderer created in useEffect (never re-created)
 *   2. BufferGeometry has two sets of position data:
 *        `position`  → ambient scatter (flies freely)
 *        `aBodyPos`  → human body target
 *      The GLSL vertex shader lerps between them via `uMorph` uniform.
 *   3. GSAP animates `uMorph` from 0 → 1 after a 1.5s delay.
 *   4. Every rAF tick:
 *        – uTime advances (ambient drift)
 *        – uAudioData is refreshed from the AnalyserNode
 *        – uColorA / uColorB are updated from healthScore prop
 *   5. Auto-rotates the particle cloud slowly around Y-axis.
 *
 * Performance notes:
 *   – All per-particle work is done on the GPU (vertex shader).
 *   – JS per-frame cost = 1 uniform array upload (256 floats) + camera rotation.
 *   – requestAnimationFrame is paused when the canvas is not visible.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useCallback } from 'react';
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
const CAMERA_Z        = 12;    // distance from origin (human is ~8 units tall)
const AUTO_ROTATE_SPD = 0.12;  // degrees per frame

// ─── Component ────────────────────────────────────────────────────────────────

export default function ParticleHuman({
  healthScore = 75,
  height      = '100%',
  width       = '100%',
  onReady,
  onSpeakRef,
}) {
  // ── Canvas DOM ref ──────────────────────────────────────────────────────
  const canvasRef   = useRef(null);

  // ── Three.js objects – stored in refs so they persist across renders ────
  const sceneRef    = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef   = useRef(null);
  const materialRef = useRef(null);    // ShaderMaterial
  const rafRef      = useRef(null);    // requestAnimationFrame ID
  const clockRef    = useRef(new THREE.Clock());

  // ── Geometry data from our procedural generator ─────────────────────────
  const { ambientPositions, bodyPositions, bodyPartIndex } = useHumanGeometry();

  // ── Health colour (recomputed when healthScore changes) ─────────────────
  const { colorA, colorB } = useHealthColor(healthScore);

  // ── Audio reactivity ────────────────────────────────────────────────────
  const {
    getFrequencyData,
    connectAudioElement,
    frequencyDataRef,
  } = useAudioReactivity();

  // ── ElevenLabs TTS ──────────────────────────────────────────────────────
  const { speak, stop, isSpeaking, isLoading, audioRef } = useElevenLabsTTS();

  // ── Expose speak() to parent via ref ────────────────────────────────────
  useEffect(() => {
    if (onSpeakRef) {
      onSpeakRef.current = speak;
    }
  }, [speak, onSpeakRef]);

  // ── Connect audio element to the Web Audio graph (once mounted) ──────────
  useEffect(() => {
    if (audioRef.current) {
      connectAudioElement(audioRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioRef.current]);

  // ── Update health colours on the shader material when prop changes ──────
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uColorA.value.copy(colorA);
      materialRef.current.uniforms.uColorB.value.copy(colorB);
    }
  }, [colorA, colorB]);

  // ── Core Three.js setup (runs once on mount) ────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── 1. Renderer ───────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias:  false,  // not needed for points
      alpha:      true,   // transparent background
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap at 2×
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.setClearColor(0x000000, 0); // fully transparent
    rendererRef.current = renderer;

    // ── 2. Scene ──────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // ── 3. Camera ─────────────────────────────────────────────────────────
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, CAMERA_NEAR, CAMERA_FAR);
    camera.position.set(0, 0.5, CAMERA_Z); // slightly above origin for eye-level
    camera.lookAt(0, 0.5, 0);              // look at chest-height
    cameraRef.current = camera;

    // ── 4. Geometry ───────────────────────────────────────────────────────
    const geometry = new THREE.BufferGeometry();

    // `position` attribute = starting ambient scatter positions
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(ambientPositions, 3),
    );

    // `aBodyPos` attribute = body-space target position (read by vertex shader)
    geometry.setAttribute(
      'aBodyPos',
      new THREE.BufferAttribute(bodyPositions, 3),
    );

    // `aPartIndex` attribute = body region tag per particle (0, 0.5, or 1.0)
    geometry.setAttribute(
      'aPartIndex',
      new THREE.BufferAttribute(bodyPartIndex, 1),
    );

    // `aRandSeed` attribute = unique random offset per particle (for organic drift)
    const seeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) seeds[i] = Math.random();
    geometry.setAttribute('aRandSeed', new THREE.BufferAttribute(seeds, 1));

    // ── 5. Shader Material ────────────────────────────────────────────────
    const uniforms = {
      uMorph:     { value: 0.0 },          // morph progress (GSAP drives this)
      uTime:      { value: 0.0 },          // elapsed time
      uAudioData: { value: new Array(256).fill(0) }, // FFT bins
      uSize:      { value: 3.5 },          // base particle size in px
      uColorA:    { value: colorA.clone() }, // dim colour
      uColorB:    { value: colorB.clone() }, // accent colour
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent:    true,
      depthWrite:     false,      // prevents z-fighting between particles
      blending:       THREE.AdditiveBlending, // additive for "energy glow" look
      vertexColors:   false,
    });
    materialRef.current = material;

    // ── 6. Points mesh ────────────────────────────────────────────────────
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ── 7. GSAP morph animation ───────────────────────────────────────────
    // Wait 1.5s then animate uMorph from 0 → 1 over 3.5s with a nice ease.
    const morphTween = gsap.to(uniforms.uMorph, {
      value:    1.0,
      duration: 3.5,
      delay:    1.5,
      ease:     'power3.inOut',
      onComplete: () => {
        if (typeof onReady === 'function') onReady();
      },
    });

    // ── 8. Render loop ────────────────────────────────────────────────────
    let frameCount = 0;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      frameCount++;

      const elapsed = clockRef.current.getElapsedTime();

      // ── Update time uniform ────────────────────────────────────────────
      uniforms.uTime.value = elapsed;

      // ── Update audio data every 2 frames (saves ~0.2ms per tick) ───────
      if (frameCount % 2 === 0) {
        const fData = getFrequencyData(); // normalised Float32Array[256]
        // Upload as a flat array of floats (GLSL uniform float[256])
        for (let i = 0; i < 256; i++) {
          uniforms.uAudioData.value[i] = fData[i] ?? 0;
        }
      }

      // ── Auto-rotate around Y-axis ──────────────────────────────────────
      points.rotation.y += THREE.MathUtils.degToRad(AUTO_ROTATE_SPD);

      // ── Gentle bobbing on Y for breathing feel ─────────────────────────
      points.position.y = Math.sin(elapsed * 0.4) * 0.06;

      // ── Render ─────────────────────────────────────────────────────────
      renderer.render(scene, camera);
    };

    animate();

    // ── 9. Responsive resize ──────────────────────────────────────────────
    const resizeObserver = new ResizeObserver(() => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(canvas);

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      morphTween.kill();
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      sceneRef.current    = null;
      rendererRef.current = null;
      cameraRef.current   = null;
      materialRef.current = null;
    };
  // Intentionally empty deps – this effect only runs once on mount.
  // Health color and audio updates are handled by separate smaller effects.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Memoised speak handler for children ────────────────────────────────
  const handleSpeak = useCallback((text) => {
    speak(text);
  }, [speak]);

  // ── JSX ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
      }}
    >
      {/* ── Three.js canvas ─────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width:   '100%',
          height:  '100%',
        }}
        aria-label="MediTwin AI 3D particle human visualization"
      />

      {/* ── Hidden <audio> element for ElevenLabs TTS ─────────────────── */}
      {/*    Must be in the DOM for connectAudioElement to work.            */}
      <audio
        ref={audioRef}
        style={{ display: 'none' }}
        crossOrigin="anonymous"
        preload="none"
      />

      {/* ── Speaking indicator pulse ring ──────────────────────────────── */}
      {isSpeaking && (
        <div
          aria-live="polite"
          style={{
            position:     'absolute',
            bottom:       '12px',
            left:         '50%',
            transform:    'translateX(-50%)',
            display:      'flex',
            alignItems:   'center',
            gap:          '8px',
            background:   'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            borderRadius: '999px',
            padding:      '6px 16px',
            fontSize:     '12px',
            color:        '#00f5a0',
            letterSpacing: '0.05em',
            border:       '1px solid rgba(0,245,160,0.25)',
          }}
        >
          {/* Animated speaking dots */}
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display:         'inline-block',
                width:           '5px',
                height:          '5px',
                borderRadius:    '50%',
                background:      '#00f5a0',
                animation:       `speakPulse 0.9s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
          MediTwin Speaking
        </div>
      )}

      {/* ── Loading indicator for TTS fetch ──────────────────────────────── */}
      {isLoading && !isSpeaking && (
        <div
          style={{
            position:   'absolute',
            bottom:     '12px',
            left:       '50%',
            transform:  'translateX(-50%)',
            fontSize:   '11px',
            color:      'rgba(255,255,255,0.4)',
          }}
        >
          Generating speech…
        </div>
      )}

      {/* ── Keyframe styles (injected once per render – tiny) ────────────── */}
      <style>{`
        @keyframes speakPulse {
          0%, 100% { transform: scaleY(0.4); opacity: 0.4; }
          50%       { transform: scaleY(1.4); opacity: 1.0; }
        }
      `}</style>
    </div>
  );
}
