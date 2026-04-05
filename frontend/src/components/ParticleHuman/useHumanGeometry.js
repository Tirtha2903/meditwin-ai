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
import { useMemo } from 'react';

export const PARTICLE_COUNT = 15000; // Increased slightly for smooth SDF volumes
const BODY_SCALE = 2.4;

const rnd = (a, b) => a + Math.random() * (b - a);

// ─── Mathematical SDF Primitives for Biological Curves ───────────────────────

function length(v) {
  return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
}
function dot(v1, v2) {
  return v1.x*v2.x + v1.y*v2.y + v1.z*v2.z;
}
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
function mix(x, y, a) {
  return x * (1.0 - a) + y * a;
}
// Smooth minimum - organically blends shapes like muscle/flesh
function smin(a, b, k) {
  const h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
function sdSphere(p, c, r) {
  return length({x: p.x - c.x, y: p.y - c.y, z: p.z - c.z}) - r;
}
function sdCapsule(p, a, b, r1, r2) {
  const pa = {x: p.x - a.x, y: p.y - a.y, z: p.z - a.z};
  const ba = {x: b.x - a.x, y: b.y - a.y, z: b.z - a.z};
  const baba = dot(ba, ba);
  const paba = dot(pa, ba);
  const h = clamp(paba / (baba || 1e-8), 0.0, 1.0);
  const r = mix(r1, r2, h); // Tapered radius along the capsule
  return length({x: pa.x - ba.x*h, y: pa.y - ba.y*h, z: pa.z - ba.z*h}) - r;
}

// Ellipsoid approximation for more realistic, non-spherical volumes like the head and torso muscles
function sdEllipsoid(p, c, r) {
  const dx = (p.x - c.x) / r.x;
  const dy = (p.y - c.y) / r.y;
  const dz = (p.z - c.z) / r.z;
  const k0 = length({x: dx, y: dy, z: dz});
  return (k0 - 1.0) * Math.min(r.x, Math.min(r.y, r.z));
}

// ─── Human Body Signed Distance Function (SDF) ────────────────────────────────

function humanSDF(x, y, z) {
  const p = {x, y, z};
  const S = BODY_SCALE;
  
  // X-symmetry: fold limbs across X axis so we only define them once
  const px = Math.abs(x);
  const pSym = {x: px, y, z};
  
  // Head & Neck (Ellipsoid for a realistic human cranium, not a perfect lollipop sphere)
  const head = sdEllipsoid(p, {x:0, y:3.25*S, z:0.02*S}, {x:0.25*S, y:0.35*S, z:0.28*S});
  const neck = sdCapsule(p, {x:0, y:2.95*S, z:0.0}, {x:0, y:2.5*S, z:-0.05*S}, 0.12*S, 0.16*S);

  // Torso & V-Taper (Athletic build)
  const chest = sdCapsule(p, {x:0, y:2.4*S, z:0.02*S}, {x:0, y:1.6*S, z:0.05*S}, 0.38*S, 0.28*S);
  const belly = sdCapsule(p, {x:0, y:1.6*S, z:0.05*S}, {x:0, y:0.9*S, z:0.0*S}, 0.28*S, 0.26*S);
  const pelvis = sdCapsule(pSym, {x:0, y:0.9*S, z:0}, {x:0.18*S, y:0.75*S, z:-0.02*S}, 0.28*S, 0.25*S);
  
  // Clavicle / Shoulders (Broad shoulders tapering outward)
  const shoulders = sdCapsule(pSym, {x:0, y:2.38*S, z:-0.02*S}, {x:0.45*S, y:2.25*S, z:-0.05*S}, 0.20*S, 0.12*S);
  
  // Subtle Organic Volume (Pecs and Glutes)
  const pecs = sdEllipsoid(pSym, {x:0.16*S, y:2.15*S, z:0.18*S}, {x:0.18*S, y:0.14*S, z:0.10*S});
  const glutes = sdEllipsoid(pSym, {x:0.12*S, y:0.80*S, z:-0.18*S}, {x:0.14*S, y:0.16*S, z:0.12*S});
  
  // Arms (Muscular Deltoids, tapered biceps/triceps)
  const deltoid = sdSphere(pSym, {x:0.48*S, y:2.2*S, z:-0.05*S}, 0.18*S);
  
  const shoulderJoint = {x: 0.50*S, y: 2.15*S, z: -0.05*S};
  const elbow = {x: 0.65*S, y: 1.1*S, z: -0.05*S}; 
  const wrist = {x: 0.72*S, y: 0.1*S, z: -0.02*S};
  const hand = {x: 0.75*S, y: -0.2*S, z: 0.0};
  
  const upperArm = sdCapsule(pSym, shoulderJoint, elbow, 0.14*S, 0.10*S);
  const lowerArm = sdCapsule(pSym, elbow, wrist, 0.11*S, 0.07*S);
  const handVol = sdEllipsoid(pSym, hand, {x:0.06*S, y:0.10*S, z:0.04*S});
  
  // Legs (Athletic thighs, defined calves)
  const hipJoint = {x: 0.22*S, y: 0.75*S, z: 0.0};
  const knee = {x: 0.26*S, y: -0.6*S, z: 0.04*S}; 
  const ankle = {x: 0.30*S, y: -2.0*S, z: 0.0};
  
  const heel = {x: 0.30*S, y: -2.05*S, z:-0.05*S};
  const toe = {x: 0.34*S, y: -2.25*S, z: 0.25*S}; 
  
  const thigh = sdCapsule(pSym, hipJoint, knee, 0.24*S, 0.14*S);
  const calf = sdCapsule(pSym, knee, ankle, 0.16*S, 0.09*S); 
  const foot = sdCapsule(pSym, heel, toe, 0.08*S, 0.07*S);
  
  // Blend Operations 
  let d = head;
  d = smin(d, neck, 0.06*S);
  
  let torso = chest;
  torso = smin(torso, belly, 0.12*S);
  torso = smin(torso, pelvis, 0.10*S);
  torso = smin(torso, shoulders, 0.10*S);
  torso = smin(torso, pecs, 0.08*S);
  torso = smin(torso, glutes, 0.08*S);
  
  d = smin(d, torso, 0.08*S);
  
  // Arms
  d = smin(d, deltoid, 0.06*S);
  d = smin(d, upperArm, 0.05*S);
  d = smin(d, lowerArm, 0.04*S);
  d = smin(d, handVol, 0.03*S);
  
  d = smin(d, thigh, 0.05*S);
  d = smin(d, calf, 0.04*S);
  d = smin(d, foot, 0.03*S);
  
  return d;
}

// ─── Main Generator ──────────────────────────────────────────────────────────

export function generateHumanGeometry() {
  const bodyPos    = new Float32Array(PARTICLE_COUNT * 3);
  const ambientPos = new Float32Array(PARTICLE_COUNT * 3);
  const partIndex  = new Float32Array(PARTICLE_COUNT);

  const S = BODY_SCALE;
  
  // 1. Build body positions using Rim-Weighted Lattice Sampling
  // Guaranteed coverage across the anatomy, with high density on the surface edges
  const minX = -1.5 * S, maxX = 1.5 * S; 
  const minY = -2.5 * S, maxY = 3.8 * S;
  const minZ = -0.7 * S, maxZ = 0.7 * S;

  const validVoxels = [];
  
  // Ultra-fine grid so we have millions of potential candidate coordinates
  const stepX = (maxX - minX) / 150;
  const stepY = (maxY - minY) / 200;
  const stepZ = (maxZ - minZ) / 50;
  
  const CORE_DEPTH = 0.16 * S; 

  for (let y = minY; y <= maxY; y += stepY) {
    for (let x = minX; x <= maxX; x += stepX) {
      for (let z = minZ; z <= maxZ; z += stepZ) {
        
        const d = humanSDF(x, y, z);
        
        // Strict boundary to capture the surface (0.02 margin for bloom)
        if (d <= 0.02 && d > -CORE_DEPTH) {
          
          // Outer shell = 0.0, Deep core = 1.0
          const depthRatio = Math.abs(d) / CORE_DEPTH;
          
          // Probability curve: ~100% chance at the edge, very low in the core
          const probability = Math.pow(1.0 - depthRatio, 4.0) + 0.02; 
          
          if (Math.random() < probability) {
             // Add micro-jitter so it feels organic, not like Minecraft blocks
             const jx = x + (Math.random()-0.5) * stepX;
             const jy = y + (Math.random()-0.5) * stepY;
             const jz = z + (Math.random()-0.5) * stepZ;
             validVoxels.push({x: jx, y: jy, z: jz});
          }
        }
      }
    }
  }

  // Shuffle the harvested points
  for (let i = validVoxels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [validVoxels[i], validVoxels[j]] = [validVoxels[j], validVoxels[i]];
  }

  // Handle edge case if sampling didn't gather enough points
  // Instead of exact overlaps (which disappear), we clone them slightly offset.
  let cloneIdx = 0;
  while (validVoxels.length < PARTICLE_COUNT && validVoxels.length > 0) {
     const src = validVoxels[cloneIdx % validVoxels.length];
     validVoxels.push({
       x: src.x + (Math.random() - 0.5) * 0.06,
       y: src.y + (Math.random() - 0.5) * 0.06,
       z: src.z + (Math.random() - 0.5) * 0.06
     });
     cloneIdx++;
  }

  // Assign to arrays
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // If we gathered more than 15,000, we simply truncate since it's shuffled
    const vox = validVoxels[i];
    bodyPos[i * 3]     = vox.x;
    bodyPos[i * 3 + 1] = vox.y;
    bodyPos[i * 3 + 2] = vox.z;
    
    // Assign audio groups
    if (vox.y > 2.2 * S) {
      partIndex[i] = 0.0;
    } else if (vox.y > 0.0) {
      partIndex[i] = 0.5;
    } else {
      partIndex[i] = 1.0;
    }
  }

  // 2. Build ambient positions (Massive screen-wide Nebula)
  // Instead of a localized DNA column, a massive galaxy sweep that flies in
  for (let j = 0; j < PARTICLE_COUNT; j++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    // Huge radius that spans aggressively off screen for dramatic incoming sweep
    const rParam = Math.pow(Math.random(), 0.3) * 45.0; 
    
    ambientPos[j * 3]     = rParam * Math.sin(phi) * Math.cos(theta);
    ambientPos[j * 3 + 1] = rParam * Math.sin(phi) * Math.sin(theta);
    ambientPos[j * 3 + 2] = rParam * Math.cos(phi);
  }

  return { ambientPositions: ambientPos, bodyPositions: bodyPos, bodyPartIndex: partIndex };
}

export function useHumanGeometry() {
  return useMemo(() => generateHumanGeometry(), []);
}
