/**
 * useHealthColor.js
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook that maps a numeric healthScore (0–100) to two Three.js Color
 * objects suitable for direct use as ShaderMaterial uniforms.
 *
 * Color zones:
 *   0 – 30   → deep crimson glow   (#ff1a40 → #ff2244)
 *   31 – 70  → amber / golden      (#ffaa00 → #ff8c00)
 *   71 – 100 → teal / vivid green  (#00f5a0 → #00e676)
 *
 * Returns:
 *   {
 *     colorA : THREE.Color,  // "dim" background particle color
 *     colorB : THREE.Color,  // "bright" health accent color
 *     cssHex : string,       // CSS hex string for UI elements
 *   }
 *
 * Usage:
 *   const { colorA, colorB, cssHex } = useHealthColor(healthScore);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { useMemo } from 'react';

// ─── Zone Constants ───────────────────────────────────────────────────────────

/** Keyframe stops: [scoreNormalized 0-1, THREE.Color] */
const COLOR_KEYFRAMES = [
  { t: 0.00, hex: '#7a0018' }, // deep crimson dark   (very poor)
  { t: 0.30, hex: '#ff1a40' }, // bright crimson       (poor)
  { t: 0.50, hex: '#ff8c00' }, // orange pivot         (average)
  { t: 0.70, hex: '#ffd500' }, // yellow               (good average)
  { t: 0.85, hex: '#39ff14' }, // neon green           (good)
  { t: 1.00, hex: '#00f5c8' }, // cyan-teal            (optimal)
];

// Pre-build Three.js Color objects from keyframes
const KF_COLORS = COLOR_KEYFRAMES.map(k => ({
  t:   k.t,
  col: new THREE.Color(k.hex),
}));

/**
 * Smooth multi-stop colour interpolation.
 * @param {number} score – health score 0–100
 * @returns {{ accent: THREE.Color, dim: THREE.Color, cssHex: string }}
 */
function scoreToColor(score) {
  const t = Math.max(0, Math.min(100, score)) / 100;

  // Find the two surrounding keyframes
  let lo = KF_COLORS[0];
  let hi = KF_COLORS[KF_COLORS.length - 1];

  for (let i = 0; i < KF_COLORS.length - 1; i++) {
    if (t >= KF_COLORS[i].t && t <= KF_COLORS[i + 1].t) {
      lo = KF_COLORS[i];
      hi = KF_COLORS[i + 1];
      break;
    }
  }

  // Remap t into the [lo.t, hi.t] range
  const span   = hi.t - lo.t;
  const localT = span < 1e-6 ? 0 : (t - lo.t) / span;

  // Smooth-step easing for a pleasant gradient
  const eased = localT * localT * (3 - 2 * localT);

  // Interpolate the accent (bright) colour
  const accent = new THREE.Color().lerpColors(lo.col, hi.col, eased);

  // Dim version: darken the accent by ~65% for the background particles
  const dim = accent.clone().multiplyScalar(0.35);

  // CSS string for UI elements (the bright accent)
  const cssHex = '#' + accent.getHexString();

  return { accent, dim, cssHex };
}

/**
 * Memoised React hook.
 * Re-computes only when `healthScore` changes.
 *
 * @param {number} healthScore – 0 to 100
 * @returns {{
 *   colorA: THREE.Color,
 *   colorB: THREE.Color,
 *   cssHex: string,
 * }}
 */
export function useHealthColor(healthScore) {
  return useMemo(() => {
    const { accent, dim, cssHex } = scoreToColor(healthScore);
    return {
      colorA: dim,     // used for uColorA uniform (soft background glow)
      colorB: accent,  // used for uColorB uniform (health-accent glow)
      cssHex,
    };
  }, [healthScore]);
}

export default useHealthColor;
