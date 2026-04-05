import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { useHealthColor }                    from './useHealthColor';
import { useAudioReactivity }               from './useAudioReactivity';
import { useElevenLabsTTS }                 from '../../hooks/useElevenLabsTTS';

import volumetricVertexShader   from './volumetricVertexShader.js';
import volumetricFragmentShader from './volumetricFragmentShader.js';

const CAMERA_FOV      = 60;
const CAMERA_NEAR     = 0.1;
const CAMERA_FAR      = 100;
const CAMERA_Z        = 18;    // Fits the scaled human body

const AUTO_ROTATE_SPD = 0.12;

function getHealthLabel(score) {
  if (score <= 30) return { label: 'CRITICAL', zone: 'critical' };
  if (score <= 70) return { label: 'WARNING',  zone: 'warning'  };
  return                  { label: 'OPTIMAL',  zone: 'optimal'  };
}

export default function ParticleHuman({
  healthScore    = 75,
  onHealthChange,
  height         = '100%',
  width          = '100%',
  onReady,
  showUI         = true,
}) {
  const canvasRef   = useRef(null);
  const sceneRef    = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef   = useRef(null);
  const materialRef = useRef(null);
  const rafRef      = useRef(null);
  const clockRef    = useRef(new THREE.Clock());

  const [localScore,   setLocalScore]   = useState(healthScore);
  const [morphDone,    setMorphDone]    = useState(false);

  useEffect(() => { setLocalScore(healthScore); }, [healthScore]);

  const { colorA, colorB, cssHex } = useHealthColor(localScore);
  const { label: healthLabel, zone: healthZone } = getHealthLabel(localScore);

  const { getFrequencyData, connectAudioElement } = useAudioReactivity();
  const { speak, stop, isSpeaking, isLoading, audioRef } = useElevenLabsTTS();

  const audioCallbackRef = useCallback((el) => {
    if (el) {
      audioRef.current = el;
      connectAudioElement(el);
    }
  }, [audioRef, connectAudioElement]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uColorA.value.copy(colorA);
    materialRef.current.uniforms.uColorB.value.copy(colorB);
  }, [colorA, colorB]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias:       true, // Critical for smooth mesh silhouette
      alpha:           true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const aspect = canvas.clientWidth / (canvas.clientHeight || 1);
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, CAMERA_NEAR, CAMERA_FAR);
    camera.position.set(0, 0.5, CAMERA_Z);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false; 
    controls.enablePan = false;
    controls.autoRotate = true; 
    controls.autoRotateSpeed = 0.8;

    const uniforms = {
      uTime:      { value: 0.0 },
      uPulse:     { value: 0.0 },
      uColorA:    { value: colorA.clone() },
      uColorB:    { value: colorB.clone() },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: volumetricVertexShader,
      fragmentShader: volumetricFragmentShader,
      transparent: true,
      depthWrite: true, // TRUE: Write depth so the outer shell occludes the mouth cavity!
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide
    });
    materialRef.current = material;

    let gltfScene = null;
    const loader = new OBJLoader();
    
    loader.load('/makehuman.obj', (object) => {
      let largestMesh = null;
      let maxVertices = 0;

      // Extract exactly the single continuous skin layer to get the buttery glass look.
      object.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry.attributes.position.count > maxVertices) {
            maxVertices = child.geometry.attributes.position.count;
            largestMesh = child;
          }
        }
      });

      if (!largestMesh) return;

      // Extract the largest mesh (the skin)
      let geom = largestMesh.geometry.clone();
      
      // UVs create seams that break normal smoothing. Drop them!
      if (geom.attributes.uv) delete geom.attributes.uv;

      // Weld all vertices so normal calculation applies across polygons smoothly
      geom = BufferGeometryUtils.mergeVertices(geom, 1e-4);
      geom.computeVertexNormals();
      
      const pristineMesh = new THREE.Mesh(geom, material);

      // Auto-scale and center the mesh regardless of its fundamental unit size
      const box = new THREE.Box3().setFromObject(pristineMesh);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      const targetHeight = 14; 
      const scaleFactor = targetHeight / (size.y || 1);
      
      pristineMesh.scale.setScalar(scaleFactor);
      
      // Compute the new scaled bounding box to center it perfectly
      const scaledBox = new THREE.Box3().setFromObject(pristineMesh);
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
      
      pristineMesh.position.x += (0 - scaledCenter.x) + 2.5; 
      pristineMesh.position.y += (0 - scaledCenter.y);
      pristineMesh.position.z += (0 - scaledCenter.z);
      
      scene.add(pristineMesh);
      gltfScene = pristineMesh;

      setMorphDone(true);
      if (typeof onReady === 'function') onReady();
    });

    let frameCount = 0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      frameCount++;
      const elapsed = clockRef.current.getElapsedTime();
      if (uniforms) uniforms.uTime.value = elapsed;

      // Pulse processing from UI
      if (frameCount % 2 === 0) {
        const fData = getFrequencyData();
        let sum = 0;
        for (let i = 0; i < 32; i++) {
          sum += (fData[i] || 0);
        }
        uniforms.uPulse.value = sum / (32.0 * 255.0); 
      }

      controls.update();
      
      // Subtle hovering animation offset from the auto-centered position
      if (gltfScene) {
          gltfScene.position.y = Math.sin(elapsed * 0.35) * 0.15;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvas);

    return () => {
      controls.dispose();
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      if (material) material.dispose();
      renderer.dispose();
      sceneRef.current    = null;
      rendererRef.current = null;
      cameraRef.current   = null;
      materialRef.current = null;
    };
  }, []);

  const handleSlider = useCallback((e) => {
    const val = Number(e.target.value);
    setLocalScore(val);
    if (typeof onHealthChange === 'function') onHealthChange(val);
  }, [onHealthChange]);

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
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab' }}
        onMouseDown={(e) => { e.target.style.cursor = 'grabbing'; }}
        onMouseUp={(e) => { e.target.style.cursor = 'grab'; }}
        aria-label="MediTwin AI 3D smooth volumetric human visualization"
      />

      {/* Anatomy Interactive Overlays */}
      <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, zIndex: 5 }}>
        {/* Brain HUD */}
        <div style={{
          position: 'absolute', top: '12%', right: '18%',
          background: 'rgba(3,14,28,0.7)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 245, 160, 0.4)', borderRadius: '12px',
          padding: '12px 16px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '4px',
          boxShadow: '0 8px 32px rgba(0,245,160,0.15)',
        }}>
          <span style={{ fontSize: '0.65rem', color: '#00f5a0', letterSpacing: '0.1em', fontWeight: 600 }}>NEUROLOGICAL</span>
          <span style={{ fontSize: '1rem', fontWeight: 700 }}>Cognitive Baseline</span>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Optimal Synaptic Response</span>
        </div>

        {/* Heart HUD */}
        <div style={{
          position: 'absolute', top: '32%', right: '12%',
          background: 'rgba(3,14,28,0.7)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 170, 0, 0.4)', borderRadius: '12px',
          padding: '12px 16px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '4px',
          boxShadow: '0 8px 32px rgba(255,170,0,0.15)',
        }}>
          <span style={{ fontSize: '0.65rem', color: '#ffaa00', letterSpacing: '0.1em', fontWeight: 600 }}>CARDIOVASCULAR</span>
          <span style={{ fontSize: '1rem', fontWeight: 700 }}>BPM: 78 Average</span>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Stable Rhythm Detected</span>
        </div>

        {/* Lungs HUD */}
        <div style={{
          position: 'absolute', top: '52%', right: '18%',
          background: 'rgba(3,14,28,0.7)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 245, 160, 0.4)', borderRadius: '12px',
          padding: '12px 16px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '4px',
          boxShadow: '0 8px 32px rgba(0,245,160,0.15)',
        }}>
          <span style={{ fontSize: '0.65rem', color: '#00f5a0', letterSpacing: '0.1em', fontWeight: 600 }}>RESPIRATORY</span>
          <span style={{ fontSize: '1rem', fontWeight: 700 }}>98% SpO2 Level</span>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Efficient Gas Exchange</span>
        </div>

        {/* Health Quote Box */}
        <div style={{
          position: 'absolute', bottom: '8%', left: '42%',
          transform: 'translateX(-50%)', maxWidth: '380px', padding: '16px',
          borderLeft: '3px solid #00f5a0', background: 'linear-gradient(90deg, rgba(0,245,160,0.1) 0%, transparent 100%)',
        }}>
          <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
            "The digital twin perceives structural subtleties invisible to the stark surface of standard diagnostics."
          </p>
        </div>
      </div>

      <audio ref={audioCallbackRef} style={{ display: 'none' }} crossOrigin="anonymous" preload="none" />

      {showUI && (
        <div
          aria-label="MediTwin controls overlay"
          style={{
            position: 'absolute', top: '50%', left: '4%', transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 32, pointerEvents: 'none', zIndex: 10, maxWidth: 420,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, opacity: morphDone ? 1 : 0, transition: 'opacity 0.8s ease', paddingLeft: 4 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Current Health Score</div>
            <div style={{ fontSize: '4.8rem', fontWeight: 800, color: cssHex, fontFamily: "'Inter', sans-serif", textShadow: `0 0 30px ${zoneGlow}, 0 0 60px ${zoneGlow}`, letterSpacing: '-2px', lineHeight: 0.9 }}>{localScore}</div>
            <div style={{ marginTop: 4, padding: '4px 16px', borderRadius: 999, background: zoneBg, border: `1px solid ${cssHex}55`, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', color: cssHex, display: 'inline-block' }}>{healthLabel} STATUS</div>
          </div>

          <div style={{
            pointerEvents: 'all', width: 380, background: 'rgba(3, 14, 28, 0.72)', backdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px', display: 'flex', flexDirection: 'column', gap: 24,
            boxShadow: '0 8px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>Health Score Simulator</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: cssHex, fontFamily: "'Inter', sans-serif", textShadow: `0 0 12px ${zoneGlow}` }}>{localScore} / 100</span>
              </div>
              <div style={{ position: 'relative', height: 6, borderRadius: 3 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ position: 'absolute', inset: `0 ${100 - localScore}% 0 0`, borderRadius: 3, background: `linear-gradient(90deg, #ff1a40, ${cssHex})`, boxShadow: `0 0 8px ${zoneGlow}`, transition: 'background 0.4s ease' }} />
                <input id="health-score-slider" type="range" min={0} max={100} step={1} value={localScore} onChange={handleSlider} aria-label="Health score slider" style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', height: '100%', margin: 0, zIndex: 2 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 2 }}>
                {[ { label: '0 Critical', color: '#ff1a40' }, { label: '50 Warning', color: '#ffaa00' }, { label: '100 Optimal', color: '#00f5a0' } ].map(({ label, color }) => (
                  <span key={label} style={{ fontSize: '0.58rem', color, opacity: 0.7, letterSpacing: '0.05em', fontFamily: "'Inter', sans-serif" }}>{label}</span>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 -4px' }} />

            <button
              onClick={handleVoiceToggle}
              aria-label={isSpeaking ? 'Stop AI voice' : 'Toggle AI voice'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 20px', borderRadius: 12,
                border: `1px solid ${isSpeaking ? cssHex + '80' : 'rgba(255,255,255,0.1)'}`, background: isSpeaking ? zoneBg : 'rgba(255,255,255,0.05)',
                cursor: isLoading ? 'wait' : 'pointer', color: isSpeaking ? cssHex : 'rgba(255,255,255,0.75)', fontSize: '0.80rem', fontWeight: 600,
                fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em', transition: 'all 0.3s ease',
                boxShadow: isSpeaking ? `0 0 20px ${zoneGlow}40, inset 0 0 12px ${zoneGlow}10` : 'none', outline: 'none',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: isSpeaking ? zoneGlow : 'rgba(255,255,255,0.08)', transition: 'background 0.3s ease', animation: isSpeaking ? 'voicePulse 1.2s ease-in-out infinite' : 'none', fontSize: '0.9rem' }}>
                {isLoading ? '⏳' : isSpeaking ? '🔊' : '🎙️'}
              </span>
              <span>{isLoading ? 'Generating speech…' : isSpeaking ? 'MediTwin Speaking — Click to Stop' : 'Toggle AI Voice Report'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Speaking indicator ring */}
      {!showUI && isSpeaking && (
        <div
          aria-live="polite"
          style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '6px 16px', fontSize: '12px', color: '#00f5a0', letterSpacing: '0.05em', border: `1px solid rgba(0,245,160,0.25)` }}
        >
          MediTwin Speaking
        </div>
      )}
      <style>{`
        @keyframes speakPulse { 0%, 100% { transform: scaleY(0.4); opacity: 0.4; } 50% { transform: scaleY(1.4); opacity: 1.0; } }
        @keyframes voicePulse { 0% { box-shadow: 0 0 0 0 ${zoneGlow}; } 100% { box-shadow: 0 0 0 10px transparent; } }
      `}</style>
    </div>
  );
}
