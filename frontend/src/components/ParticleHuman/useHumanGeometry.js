/**
 * useHumanGeometry.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Procedurally generates two flat Float32Array position buffers:
 *   1. ambientPositions – random "starfield" scatter across a large sphere
 *   2. bodyPositions    – structured full human body shape (head, neck, torso,
 *                        arms, hands, legs, feet) made from sampled primitives
 *
 * Also returns a bodyPartIndex Float32Array where:
 *   0.0 = head/neck region   (sensitive to high-frequency audio)
 *   0.5 = torso / arms        (mid-frequency wave)
 *   1.0 = legs / feet         (low-frequency bass pulse)
 *
 * Usage:
 *   const { ambientPositions, bodyPositions, bodyPartIndex, PARTICLE_COUNT }
 *     = useHumanGeometry();
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';

// ─── Tunable Constants ────────────────────────────────────────────────────────

/** Total number of particles. Keep ≤ 15 000 for comfortable 60fps on mid GPUs. */
export const PARTICLE_COUNT = 12000;

/** Scale of the whole figure in Three.js world units. */
const BODY_SCALE = 2.2;

// ─── Helper: uniform random in range [a, b] ───────────────────────────────────
const rnd = (a, b) => a + Math.random() * (b - a);

// ─── Helper: sample a random point ON the surface of a sphere ─────────────────
function randomOnSphere(radius, cx = 0, cy = 0, cz = 0) {
  const u = Math.random(), v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi   = Math.acos(2 * v - 1);
  return [
    cx + radius * Math.sin(phi) * Math.cos(theta),
    cy + radius * Math.sin(phi) * Math.sin(theta),
    cz + radius * Math.cos(phi),
  ];
}

// ─── Helper: sample a random point INSIDE a cylinder ─────────────────────────
function randomInCylinder(radiusX, radiusZ, height, cx = 0, cy = 0, cz = 0) {
  const angle = Math.random() * 2 * Math.PI;
  const r = Math.sqrt(Math.random()); // sqrt for uniform area distribution
  return [
    cx + r * radiusX * Math.cos(angle),
    cy + rnd(-height / 2, height / 2),
    cz + r * radiusZ * Math.sin(angle),
  ];
}

// ─── Helper: sample a random point INSIDE a box ───────────────────────────────
function randomInBox(w, h, d, cx = 0, cy = 0, cz = 0) {
  return [
    cx + rnd(-w / 2, w / 2),
    cy + rnd(-h / 2, h / 2),
    cz + rnd(-d / 2, d / 2),
  ];
}

// ─── Helper: sample a random point ON a torus ────────────────────────────────
function randomOnTorus(R, r, cx = 0, cy = 0, cz = 0) {
  const theta = Math.random() * 2 * Math.PI;
  const phi   = Math.random() * 2 * Math.PI;
  return [
    cx + (R + r * Math.cos(phi)) * Math.cos(theta),
    cy + r * Math.sin(phi),
    cz + (R + r * Math.cos(phi)) * Math.sin(theta),
  ];
}

// ─── Body Part Segment Definitions ───────────────────────────────────────────
/**
 * Each segment:
 *   ratio      – fraction of PARTICLE_COUNT to assign here
 *   audioGroup – 0.0 (head), 0.5 (torso/arms), 1.0 (legs)
 *   sample()   – function returning [x, y, z] in BODY_SCALE space
 *
 * Coordinate system:  Y-up, figure centered at origin.
 *   Head crown ≈ y = +3.8
 *   Feet soles ≈ y = -4.2
 */
const S = BODY_SCALE;

const BODY_SEGMENTS = [
  // ── HEAD (sphere) ──────────────────────────────────────────────────────────
  {
    name: 'head',
    ratio: 0.10,
    audioGroup: 0.0,
    sample: () => randomOnSphere(0.52 * S, 0, 3.35 * S, 0),
  },

  // ── NECK (slim cylinder) ───────────────────────────────────────────────────
  {
    name: 'neck',
    ratio: 0.03,
    audioGroup: 0.0,
    sample: () => randomInCylinder(0.14 * S, 0.14 * S, 0.40 * S, 0, 2.85 * S, 0),
  },

  // ── SHOULDERS (torus slice) ────────────────────────────────────────────────
  {
    name: 'shoulders',
    ratio: 0.04,
    audioGroup: 0.5,
    sample: () => {
      // Half-torus at top of torso
      const [x, y, z] = randomOnTorus(0.65 * S, 0.08 * S, 0, 2.55 * S, 0);
      return [x, y, z];
    },
  },

  // ── UPPER TORSO ────────────────────────────────────────────────────────────
  {
    name: 'upperTorso',
    ratio: 0.10,
    audioGroup: 0.5,
    sample: () => randomInBox(0.82 * S, 0.80 * S, 0.36 * S, 0, 2.15 * S, 0),
  },

  // ── LOWER TORSO / ABDOMEN ──────────────────────────────────────────────────
  {
    name: 'lowerTorso',
    ratio: 0.09,
    audioGroup: 0.5,
    sample: () => randomInBox(0.70 * S, 0.70 * S, 0.33 * S, 0, 1.45 * S, 0),
  },

  // ── PELVIS ─────────────────────────────────────────────────────────────────
  {
    name: 'pelvis',
    ratio: 0.06,
    audioGroup: 0.5,
    sample: () => randomInBox(0.72 * S, 0.36 * S, 0.32 * S, 0, 0.98 * S, 0),
  },

  // ── LEFT UPPER ARM ─────────────────────────────────────────────────────────
  {
    name: 'leftUpperArm',
    ratio: 0.05,
    audioGroup: 0.5,
    sample: () => randomInCylinder(0.17 * S, 0.17 * S, 0.80 * S, -0.95 * S, 1.95 * S, 0),
  },

  // ── RIGHT UPPER ARM ────────────────────────────────────────────────────────
  {
    name: 'rightUpperArm',
    ratio: 0.05,
    audioGroup: 0.5,
    sample: () => randomInCylinder(0.17 * S, 0.17 * S, 0.80 * S, 0.95 * S, 1.95 * S, 0),
  },

  // ── LEFT FOREARM ───────────────────────────────────────────────────────────
  {
    name: 'leftForearm',
    ratio: 0.04,
    audioGroup: 0.5,
    sample: () => randomInCylinder(0.13 * S, 0.13 * S, 0.75 * S, -1.05 * S, 1.17 * S, 0),
  },

  // ── RIGHT FOREARM ──────────────────────────────────────────────────────────
  {
    name: 'rightForearm',
    ratio: 0.04,
    audioGroup: 0.5,
    sample: () => randomInCylinder(0.13 * S, 0.13 * S, 0.75 * S, 1.05 * S, 1.17 * S, 0),
  },

  // ── LEFT HAND ──────────────────────────────────────────────────────────────
  {
    name: 'leftHand',
    ratio: 0.03,
    audioGroup: 0.5,
    sample: () => randomOnSphere(0.16 * S, -1.08 * S, 0.65 * S, 0),
  },

  // ── RIGHT HAND ─────────────────────────────────────────────────────────────
  {
    name: 'rightHand',
    ratio: 0.03,
    audioGroup: 0.5,
    sample: () => randomOnSphere(0.16 * S, 1.08 * S, 0.65 * S, 0),
  },

  // ── LEFT THIGH ─────────────────────────────────────────────────────────────
  {
    name: 'leftThigh',
    ratio: 0.08,
    audioGroup: 1.0,
    sample: () => randomInCylinder(0.22 * S, 0.22 * S, 0.90 * S, -0.28 * S, 0.38 * S, 0),
  },

  // ── RIGHT THIGH ────────────────────────────────────────────────────────────
  {
    name: 'rightThigh',
    ratio: 0.08,
    audioGroup: 1.0,
    sample: () => randomInCylinder(0.22 * S, 0.22 * S, 0.90 * S, 0.28 * S, 0.38 * S, 0),
  },

  // ── LEFT SHIN ──────────────────────────────────────────────────────────────
  {
    name: 'leftShin',
    ratio: 0.07,
    audioGroup: 1.0,
    sample: () => randomInCylinder(0.16 * S, 0.16 * S, 0.90 * S, -0.30 * S, -0.52 * S, 0),
  },

  // ── RIGHT SHIN ─────────────────────────────────────────────────────────────
  {
    name: 'rightShin',
    ratio: 0.07,
    audioGroup: 1.0,
    sample: () => randomInCylinder(0.16 * S, 0.16 * S, 0.90 * S, 0.30 * S, -0.52 * S, 0),
  },

  // ── LEFT FOOT ──────────────────────────────────────────────────────────────
  {
    name: 'leftFoot',
    ratio: 0.03,
    audioGroup: 1.0,
    sample: () => randomInBox(0.28 * S, 0.14 * S, 0.44 * S, -0.30 * S, -1.06 * S, 0.10 * S),
  },

  // ── RIGHT FOOT ─────────────────────────────────────────────────────────────
  {
    name: 'rightFoot',
    ratio: 0.03,
    audioGroup: 1.0,
    sample: () => randomInBox(0.28 * S, 0.14 * S, 0.44 * S, 0.30 * S, -1.06 * S, 0.10 * S),
  },
];

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * Generates all geometry buffers needed by the particle shader.
 *
 * @returns {{
 *   ambientPositions: Float32Array,   // xyz × PARTICLE_COUNT
 *   bodyPositions:    Float32Array,   // xyz × PARTICLE_COUNT (human body)
 *   bodyPartIndex:    Float32Array,   // 1 × PARTICLE_COUNT (0.0, 0.5, or 1.0)
 * }}
 */
export function generateHumanGeometry() {
  const bodyPos    = new Float32Array(PARTICLE_COUNT * 3);
  const ambientPos = new Float32Array(PARTICLE_COUNT * 3);
  const partIndex  = new Float32Array(PARTICLE_COUNT);

  // ── 1. Build body positions ──────────────────────────────────────────────
  let writeIdx = 0;
  const segments = [...BODY_SEGMENTS];

  // Normalise ratios so they sum to 1
  const totalRatio = segments.reduce((s, seg) => s + seg.ratio, 0);

  segments.forEach((seg) => {
    const count = Math.round((seg.ratio / totalRatio) * PARTICLE_COUNT);
    for (let i = 0; i < count && writeIdx < PARTICLE_COUNT; i++) {
      const [x, y, z] = seg.sample();
      const base = writeIdx * 3;
      bodyPos[base]     = x;
      bodyPos[base + 1] = y;
      bodyPos[base + 2] = z;
      partIndex[writeIdx] = seg.audioGroup;
      writeIdx++;
    }
  });

  // Fill any rounding leftovers with torso samples
  while (writeIdx < PARTICLE_COUNT) {
    const [x, y, z] = randomInBox(0.60 * S, 0.50 * S, 0.30 * S, 0, 1.80 * S, 0);
    const base = writeIdx * 3;
    bodyPos[base]     = x;
    bodyPos[base + 1] = y;
    bodyPos[base + 2] = z;
    partIndex[writeIdx] = 0.5;
    writeIdx++;
  }

  // ── 2. Build ambient positions (large dispersed sphere) ──────────────────
  const AMBIENT_RADIUS = 9;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const [x, y, z] = randomOnSphere(AMBIENT_RADIUS * (0.4 + Math.random() * 0.6));
    ambientPos[i * 3]     = x;
    ambientPos[i * 3 + 1] = y;
    ambientPos[i * 3 + 2] = z;
  }

  return {
    ambientPositions: ambientPos,
    bodyPositions:    bodyPos,
    bodyPartIndex:    partIndex,
  };
}

/**
 * React hook wrapper – memoises the geometry so it's computed only once.
 */
import { useMemo } from 'react';
export function useHumanGeometry() {
  return useMemo(() => generateHumanGeometry(), []);
}
