/**
 * particleFragmentShader.js
 * ─────────────────────────────────────────────────────────────────────────────
 * WebGL fragment shader for the MediTwin AI particle system.
 *
 * Renders each GL_POINT as a soft glowing disc with:
 *   – Smooth circular falloff (no hard-edged square sprites)
 *   – Additive bloom corona around the core for that "energy" look
 *   – Colour and alpha passed from the vertex shader
 *
 * Varyings received:
 *   vColor        – RGB from health score mapping
 *   vAlpha        – opacity (0–1)
 *   vGlowStrength – audio-driven extra bloom intensity
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fragmentShader = /* glsl */`
  // ── Precision ────────────────────────────────────────────────
  precision highp float;

  // ── Varyings from vertex shader ───────────────────────────────
  varying vec3  vColor;
  varying float vAlpha;
  varying float vGlowStrength;

  void main() {

    // ── 1. Compute distance from point centre ─────────────────────
    // gl_PointCoord ranges 0→1 from top-left to bottom-right of the square.
    // Convert to [-1, 1] centred space.
    vec2 uv   = gl_PointCoord * 2.0 - 1.0;
    float dist = length(uv);

    // ── 2. Discard pixels outside the circle radius ────────────────
    if (dist > 1.0) discard;

    // ── 3. Soft circular falloff ──────────────────────────────────
    // Produces a bright core that smoothly fades to transparent.
    // smoothstep(0.5, 1.0, dist): starts fading at 50% radius.
    float core = 1.0 - smoothstep(0.0, 0.65, dist);

    // ── 4. Bloom corona ───────────────────────────────────────────
    // A wider, dimmer halo that radiates beyond the core.
    // Larger when audio is active (vGlowStrength > 0).
    float haloWidth = 0.70 + vGlowStrength * 0.20;
    float halo = (1.0 - smoothstep(0.0, haloWidth, dist)) * 0.35;

    // Combine core + halo
    float brightness = core + halo;

    // ── 5. Final colour and alpha ──────────────────────────────────
    // Additive-style: multiply colour by brightness so the centre is
    // the most saturated and the halo just adds glow.
    vec3 finalColor = vColor * brightness;

    // Extra luminosity kick when audio is loud
    finalColor += vColor * vGlowStrength * 0.4 * core;

    // Alpha: combine computed fade with incoming per-particle alpha
    float finalAlpha = brightness * vAlpha;
    finalAlpha = clamp(finalAlpha, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

export default fragmentShader;
