/**
 * particleVertexShader.glsl
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom WebGL vertex shader for the MediTwin AI particle system.
 *
 * Uniforms:
 *   uMorph      – [0.0 → 1.0] blend factor from ambient → body (driven by GSAP)
 *   uTime       – elapsed seconds (for ambient floating drift)
 *   uAudioData  – [256] FFT frequency bins (0.0–1.0 normalised, from AudioAnalyser)
 *   uSize       – base point size in pixels
 *   uColorA     – "dim" particle color (Three.js vec3)
 *   uColorB     – "bright" particle color driven by health score (Three.js vec3)
 *
 * Attributes:
 *   position    – ambient position (the default Three.js geometry attribute)
 *   aBodyPos    – body-space target position
 *   aPartIndex  – body region tag: 0.0 head, 0.5 torso, 1.0 legs
 *   aRandSeed   – per-particle random offset for staggered ambient drift
 *
 * Varyings:
 *   vColor         – interpolated colour handed to fragment shader
 *   vAlpha         – per-particle opacity (fades ambient particles)
 *   vGlowStrength  – extra brightness from audio reactivity
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Noise helper: smooth pseudo-random from seed ─────────────────────────────
// Classic "hash" trick – gives a unique float per particle based on its seed.
// Good enough for subtle drift animation; not cryptographic.

const vertexShader = /* glsl */`
  // ↑ Using tagged template literal so Vite handles this as a plain JS string.
  //   Import this file as: import vertexShader from './particleVertexShader.glsl?raw'
  //   Alternatively, we embed it directly as a JS const (current approach).

  // ── Uniforms ────────────────────────────────────────────────
  uniform float uMorph;          // 0 = scatter, 1 = body form
  uniform float uTime;           // elapsed seconds
  uniform float uAudioData[256]; // FFT bins, normalised 0-1
  uniform float uSize;           // base point size
  uniform vec3  uColorA;         // dim/background color
  uniform vec3  uColorB;         // health-score accent color

  // ── Custom attributes ────────────────────────────────────────
  attribute vec3  aBodyPos;      // target body position
  attribute float aPartIndex;    // 0.0=head, 0.5=torso, 1.0=legs
  attribute float aRandSeed;     // unique per-particle random [0,1]

  // ── Varyings ─────────────────────────────────────────────────
  varying vec3  vColor;
  varying float vAlpha;
  varying float vGlowStrength;

  // ── Hash function (no external deps) ─────────────────────────
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  // ── 3D smooth-noise approximation for organic drift ───────────
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // Hermite smoothing
    float n = i.x + i.y * 57.0 + i.z * 113.0;
    return mix(
      mix(mix(hash(n       ), hash(n + 1.0   ), f.x),
          mix(hash(n + 57.0), hash(n + 58.0  ), f.x), f.y),
      mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
          mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z
    );
  }

  void main() {

    // ── 1. Ambient drift animation ───────────────────────────────
    // Each particle floats on a slowly-evolving noise field.
    // The drift is strongest when uMorph = 0 (ambient mode) and
    // fully suppressed when uMorph = 1 (body mode).
    float driftAmt = (1.0 - uMorph) * 0.35;
    vec3 drift = vec3(
      noise3(position * 0.4 + vec3(uTime * 0.12, aRandSeed * 3.7, 0.0)) - 0.5,
      noise3(position * 0.4 + vec3(0.0, uTime * 0.09, aRandSeed * 2.3)) - 0.5,
      noise3(position * 0.4 + vec3(aRandSeed * 1.9, 0.0, uTime * 0.11)) - 0.5
    ) * driftAmt;

    // ── 2. Interpolate between ambient and body positions ─────────
    vec3 pos = mix(position + drift, aBodyPos, uMorph);

    // ── 3. Audio reactivity ───────────────────────────────────────
    // Map body region → different FFT frequency bands.
    //   Head / neck (aPartIndex ≈ 0.0) → high-freq bins [160-220]
    //   Torso / arms (aPartIndex ≈ 0.5) → mid-freq bins [60-130]
    //   Legs / feet  (aPartIndex ≈ 1.0) → bass bins    [0-40]

    float audioDisplace = 0.0;
    float glowOut = 0.0;

    if (uMorph > 0.5) { // Only apply when body is mostly formed
      // Select audio bin based on body region
      int lowBin  = int(aPartIndex * 160.0);          // 0, 80, or 160
      int highBin = lowBin + 40;

      // Average a band of 40 bins
      float bandSum = 0.0;
      for (int b = 0; b < 40; b++) {
        int idx = lowBin + b;
        // Clamp idx to [0..255]
        idx = max(0, min(255, idx));
        bandSum += uAudioData[idx];
      }
      float bandAvg = bandSum / 40.0;

      // Head vibration: radial displacement away from body centre
      if (aPartIndex < 0.25) {
        vec3 radial = normalize(pos - vec3(0.0, 3.35 * 2.2, 0.0));
        audioDisplace = bandAvg * 0.28;
        pos += radial * audioDisplace;
      }
      // Torso energy wave: vertical pulse travelling from head down
      else if (aPartIndex < 0.75) {
        float wave = sin(pos.y * 2.0 - uTime * 8.0) * bandAvg * 0.18;
        pos.x += wave;
        pos.z += wave * 0.5;
        audioDisplace = bandAvg;
      }
      // Leg bass pulse: subtle scale around hip pivot
      else {
        float bass = bandAvg * 0.14;
        pos.xz *= (1.0 + bass * 0.25);
        audioDisplace = bass;
      }

      glowOut = bandAvg;
    }

    // ── 4. Project to clip space ────────────────────────────────
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // ── 5. Point size: perspective scaling + audio swell ─────────
    float audioSwell = 1.0 + glowOut * 0.7;
    gl_PointSize = uSize * audioSwell * (400.0 / -mvPosition.z);
    // Clamp to avoid GPU glitches on very close/large particles
    gl_PointSize = clamp(gl_PointSize, 1.0, 16.0);

    // ── 6. Colour: blend between dim and bright by audio glow ────
    float brightness = 0.3 + uMorph * 0.4 + glowOut * 0.5;
    vColor = mix(uColorA, uColorB, min(brightness, 1.0));

    // ── 7. Alpha: particles fade in as body forms ─────────────────
    vAlpha = 0.4 + uMorph * 0.55 + glowOut * 0.3;
    vAlpha = clamp(vAlpha, 0.0, 1.0);

    vGlowStrength = glowOut;
  }
`;

export default vertexShader;
