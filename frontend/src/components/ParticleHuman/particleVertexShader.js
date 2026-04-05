/**
 * particleVertexShader.js
 * ─────────────────────────────────────────────────────────────────────────────
 * MediTwin AI — WebGL Vertex Shader for the particle human system.
 *
 * Uniforms:
 *   uMorph      – [0→1] ambient → body blend (GSAP-driven)
 *   uTime       – elapsed seconds
 *   uAudioData  – [256] FFT bins, 0-1 normalised
 *   uSize       – base point size in px
 *   uColorA     – dim/background color (Three.js vec3)
 *   uColorB     – health-score accent color (Three.js vec3)
 *
 * Attributes:
 *   position    – ambient scatter (default Three.js attribute)
 *   aBodyPos    – body-space target position
 *   aPartIndex  – 0.0=head, 0.5=torso, 1.0=legs
 *   aRandSeed   – unique per-particle random [0,1]
 *
 * Varyings:
 *   vColor        – interpolated colour → fragment shader
 *   vAlpha        – per-particle opacity
 *   vGlowStrength – audio-reactive brightness
 * ─────────────────────────────────────────────────────────────────────────────
 */

const vertexShader = /* glsl */`

  // ── Uniforms ─────────────────────────────────────────────────────────────
  uniform float uMorph;          // 0 = scatter, 1 = body form
  uniform float uTime;           // elapsed seconds
  uniform float uAudioData[256]; // FFT bins, normalised 0-1
  uniform float uSize;           // base point size
  uniform vec3  uColorA;         // dim/background colour
  uniform vec3  uColorB;         // health-score accent colour

  // ── Custom per-particle attributes ───────────────────────────────────────
  attribute vec3  aBodyPos;      // target body position for morphing
  attribute float aPartIndex;    // body zone: 0.0=head, 0.5=torso, 1.0=legs
  attribute float aRandSeed;     // unique random [0,1] per particle

  // ── Varyings → fragment shader ───────────────────────────────────────────
  varying vec3  vColor;
  varying float vAlpha;
  varying float vGlowStrength;

  // ── Hash: stable pseudo-random float from a seed ─────────────────────────
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  // ── Smooth 3D noise (value noise) for organic drift ──────────────────────
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep Hermite curve
    float n = i.x + i.y * 57.0 + i.z * 113.0;
    return mix(
      mix(mix(hash(n       ), hash(n +   1.0), f.x),
          mix(hash(n +  57.0), hash(n +  58.0), f.x), f.y),
      mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
          mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z
    );
  }

  void main() {

    // ── 0. DNA Helix Rotation (only affects ambient position) ──────────────
    // Slowly spins the ambient DNA double-helix state 
    float angle = uTime * 0.8;
    float s = sin(angle);
    float c = cos(angle);
    vec3 ambPos = position;
    ambPos.xz = mat2(c, -s, s, c) * ambPos.xz;

    // ── 1. Ambient drift (suppressed as uMorph → 1) ───────────────────────
    float driftAmt = (1.0 - uMorph) * 0.8; // Larger drift for cosmic feel
    vec3 drift = vec3(
      noise3(ambPos * 0.2 + vec3(uTime * 0.12, aRandSeed * 3.7, 0.0)) - 0.5,
      noise3(ambPos * 0.2 + vec3(0.0, uTime * 0.09, aRandSeed * 2.3)) - 0.5,
      noise3(ambPos * 0.2 + vec3(aRandSeed * 1.9, 0.0, uTime * 0.11)) - 0.5
    ) * driftAmt;

    // ── 2. Morph: lerp from ambient DNA → body position ───────────────────
    vec3 pos = mix(ambPos + drift, aBodyPos, uMorph);

    // ── 3. Audio reactivity (body-region-mapped FFT) ──────────────────────
    float audioDisplace = 0.0;
    float glowOut       = 0.0;

    if (uMorph > 0.5) {
      // Map body region → FFT frequency band
      int lowBin = int(aPartIndex * 160.0); // 0, 80, or 160
      float bandSum = 0.0;
      for (int b = 0; b < 40; b++) {
        int idx = clamp(lowBin + b, 0, 255);
        bandSum += uAudioData[idx];
      }
      float bandAvg = bandSum / 40.0;

      if (aPartIndex < 0.25) {
        // HEAD: radial vibration outward
        vec3 headCenter = vec3(0.0, 3.35 * 2.2, 0.0);
        vec3 radial = normalize(pos - headCenter);
        audioDisplace = bandAvg * 0.28;
        pos += radial * audioDisplace;

      } else if (aPartIndex < 0.75) {
        // TORSO/ARMS: travelling vertical energy wave + lateral sway
        float wave = sin(pos.y * 2.0 - uTime * 8.0) * bandAvg * 0.18;
        pos.x += wave;
        pos.z += wave * 0.5;
        audioDisplace = bandAvg;

      } else {
        // LEGS: bass-driven scale pulse from hip pivot
        float bass = bandAvg * 0.14;
        pos.xz *= (1.0 + bass * 0.25);
        audioDisplace = bass;
      }

      glowOut = bandAvg;
    }

    // ── 4. Subtle breathing surface offset (once morphed) ─────────────────
    // Adds micro-displacement to make the body feel "alive".
    float breath = sin(uTime * 1.8 + aRandSeed * 6.28) * 0.018 * uMorph;
    pos += normalize(aBodyPos + vec3(0.001)) * breath;

    // ── 5. Hologram Scanlines ─────────────────────────────────────────────
    // Continuous sweeping sine-wave spanning the Y-axis (gives a tech/scanner aesthetic)
    float scanline = sin(pos.y * 25.0 - uTime * 4.0) * 0.5 + 0.5;

    // ── 6. Clip-space projection ──────────────────────────────────────────
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // ── 7. Vivid Point Size (Rim-Density glow contour) ────────────────────
    // Size is increased to ensure brilliant overlapping glowing clusters.
    float audioSwell  = 1.0 + glowOut * 0.80;
    float baseSize    = uSize * audioSwell * 1.6; // Bump up from 1.2px
    gl_PointSize = baseSize * (400.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 2.0, 5.5); // Allow much larger sizes

    // ── 8. Colour: dim → accent blended by audio + morph + scanline ───────
    float brightness = 0.25 + (uMorph * 0.30) + (glowOut * 0.60) + (scanline * 0.25 * uMorph);
    vColor = mix(uColorA, uColorB, clamp(brightness, 0.0, 1.0));

    // ── 9. Alpha: particles fade in nicely, brighten on audio ─────────────
    vAlpha = 0.35 + (uMorph * 0.50) + (glowOut * 0.40);
    vAlpha = clamp(vAlpha, 0.0, 1.0);

    vGlowStrength = glowOut;
  }
`;

export default vertexShader;
