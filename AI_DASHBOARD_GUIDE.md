# MediTwin AI Dashboard - Implementation Guide

## Overview

The MediTwin AI Dashboard (`/dashboard-ai`) is a futuristic health monitoring interface featuring a 3D particle visualization system with interactive glassmorphism UI controls. This feature showcases advanced 3D graphics, real-time health score simulation, and audio-reactive visual effects.

## Architecture

### Components

1. **DashboardAI.jsx** (`src/pages/DashboardAI.jsx`)
   - Main dashboard container managing state (healthScore, isSpeaking)
   - Integrates ParticleHuman 3D visualization
   - Orchestrates data flow between UI controls and particle system
   - Handles health summary text generation for text-to-speech

2. **ParticleHuman** (`src/components/ParticleHuman/`)
   - Existing sophisticated Three.js shader-based particle system
   - Renders 3D human silhouette made of ~4000 particles
   - Features smooth morph animation from scattered to body form
   - Supports color-based health score mapping
   - Audio-reactive effects via Web Audio API integration
   - ElevenLabs TTS integration for speaking functionality

3. **DashboardAI.css** (`src/pages/DashboardAI.css`)
   - Glassmorphism UI styling with backdrop blur effects
   - Responsive grid layout positioning for panels
   - Smooth animations and transitions
   - Health score color coding (red: critical, amber: warning, green: optimal)

### Key Features

#### 1. 3D Particle Visualization
- **Full-screen canvas background** displaying 4000+ particles forming human body
- **Smooth morphing animation** - particles start scattered and coalesce into body shape over 2 seconds
- **Dynamic color coding**:
  - Red (#ff2244) for health scores 0-30 (Critical)
  - Amber (#ffaa00) for health scores 40-70 (Warning)
  - Green (#00f5a0) for health scores 80-100 (Optimal)
- **Auto-rotation** - particle cloud gently rotates around Y-axis
- **Bobbing motion** - subtle vertical breathing animation for realism

#### 2. Glassmorphism UI
- **Frosted glass effect** with 20px blur and semi-transparent backgrounds
- **Layered positioning**:
  - Top: Header with title and subtitle
  - Sides: Metric cards (Heart Rate, System Status, Diagnostic)
  - Sides: Info panels (Health Status, AI Analysis)
  - Bottom: Control panel with health score slider and buttons
- **Smooth animations**: Staggered slide-in effects on load
- **Interactive hover effects**: Cards lift and glow on hover

#### 3. Interactive Controls
- **Health Score Slider** (0-100)
  - Real-time visual feedback
  - Dynamic color matching current health zone
  - Glowing thumb with shadow effects
  - Updates particle color and metrics instantly

- **Voice Button** - "Ask MediTwin"
  - Triggers ElevenLabs TTS for health summary
  - Disables until 3D twin is ready (after morph animation)
  - Shows speaking state indicator with pulsing dots
  - Auto-dismisses after 5 seconds

- **Health Metrics Display**
  - Heart Rate (simulated, varies with score)
  - System Status percentage
  - Diagnostic accuracy percentage
  - Dynamic color updates based on current score

#### 4. State Management
```javascript
const [healthScore, setHealthScore] = useState(75)  // 0-100
const [isSpeaking, setIsSpeaking] = useState(false) // boolean
const [twinReady, setTwinReady] = useState(false)   // animation complete
```

## Styling System

### Color Scheme
- **Background**: Dark gradient (#050b12 to #0a1520)
- **Primary accent**: Teal (#00f5a0)
- **Secondary accent**: Cyan (#00d4ff)
- **Critical color**: Red (#ff2244)
- **Warning color**: Amber (#ffaa00)
- **Glass**: rgba(255, 255, 255, 0.08) with blur

### Responsive Breakpoints
- **Desktop** (1024px+): Full layout with side panels
- **Tablet** (768px-1024px): Flexbox row layout for panels
- **Mobile** (<768px): Stacked layout, full-width controls

## Integration Points

### With ParticleHuman
```javascript
<ParticleHuman
  healthScore={healthScore}        // 0-100 controls particle color
  width="100%"
  height="100%"
  onReady={() => setTwinReady(true)}        // Called when morph completes
  onSpeakRef={speakRef}            // Receives speak() function
/>
```

### With Supabase
- Fetches user's scan history on mount
- Uses latest scan's health_score as default if available
- Can extend to save custom health assessments

### With ElevenLabs TTS
- Generates natural speech for health summaries
- Triggered via `speakRef.current(text)`
- Audio element connected to Web Audio API for reactivity

## User Flow

1. **Page Load**
   - User navigates to `/dashboard-ai` via navbar "AI Twin" link
   - Component fetches scan history from Supabase
   - Sets healthScore from latest scan (or default 75)
   - ParticleHuman begins rendering

2. **Animation Phase** (1.5-5s)
   - Particles start scattered in 3D space
   - After 1.5s delay, GSAP animates morph to 0 → 1 over 3.5s
   - Particles smoothly coalesce into human body shape
   - "Ask MediTwin" button enables on completion

3. **Interaction Phase**
   - User adjusts health score slider
   - Particle color updates dynamically
   - Metrics cards update values
   - User can click "Ask MediTwin" for voice summary
   - Pulsing indicator shows audio reactivity

4. **Audio Phase**
   - TTS generates health summary based on score
   - Particles react to audio frequencies
   - Speaking indicator visible with animated dots

## Technical Details

### Particle System (Three.js)
- **Geometry**: BufferGeometry with dual position attributes
  - `position`: ambient scatter points (animated per-frame)
  - `aBodyPos`: body-space target positions
  - `aPartIndex`: region tags for selective animation
  - `aRandSeed`: unique random per particle for organic motion

- **Material**: Custom ShaderMaterial
  - Vertex shader: handles position interpolation, morphing, drift
  - Fragment shader: color mapping, glow effects, additive blending
  - Uniforms: uMorph (0-1 animation progress), uTime, uAudioData

- **Performance**:
  - All per-particle work done on GPU
  - Audio data updated every 2 frames (~60 FPS)
  - Auto-rotation smooth via incremental angle
  - ResizeObserver for responsive canvas resizing

### CSS Animations
- **slideDown**, **slideUp**, **slideInLeft**, **slideInRight**: 0.8s ease-out with staggered delays
- **pulse**: 1s ease-in-out infinite for speaking indicator dots
- **fadeIn**: 0.3s ease for speaking indicator container

### Accessibility
- Semantic HTML with ARIA labels
- Health slider has `aria-label="Adjust health score"`
- Speak button has `aria-label="Ask MediTwin AI"`
- Speaking indicator has `aria-live="polite"`
- Canvas has descriptive `aria-label`

## Future Enhancements

1. **Real-time Biometric Integration**
   - Connect to wearable devices (Apple Watch, Fitbit)
   - Update health score from actual vital signs
   - Real-time particle color changes

2. **Advanced Audio Reactivity**
   - Frequency-based particle animation
   - Beat detection for synchronized effects
   - Multiple audio input sources

3. **Custom Body Shapes**
   - Option to customize particle body configuration
   - Anatomically accurate visualizations
   - Pose detection and mirroring

4. **Extended AI Features**
   - Custom health recommendations
   - Predictive health trend analysis
   - Multi-language TTS support

5. **Visualization Options**
   - Temperature map overlay
   - Stress zone highlighting
   - Energy distribution heatmap

## Debugging

### Check 3D Rendering
```javascript
// In browser console
// Verify canvas is visible
document.querySelector('canvas').getBoundingClientRect()

// Check Three.js renderer
window.__THREE__ && window.__THREE__.WebGLRenderer
```

### Check Audio
```javascript
// Verify Web Audio context is running
// Check browser console for ElevenLabs API errors
// Ensure microphone/audio permissions granted
```

### Check Animations
```javascript
// GSAP timeline info
console.log(gsap.globalTimeline)

// ResizeObserver events
console.log('Canvas resize events firing')
```

## Browser Support

- **Chrome/Edge**: Full support (WebGL, Web Audio, modern CSS)
- **Firefox**: Full support
- **Safari**: Good support (may have GPU rendering caveats)
- **Mobile**: Responsive design, reduced particle count for performance

## Performance Tips

1. **For Low-End Devices**: Reduce particle count in `useHumanGeometry` hook
2. **For High-End Devices**: Increase particle count and audio analysis resolution
3. **Network**: TTS requests may be slow on poor connections
4. **Battery**: Auto-stop animations when tab is not visible (already implemented with rAF pause detection)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Particles not appearing | Check Three.js WebGL support, GPU drivers |
| Color not updating | Verify healthScore state changes, check shader uniforms |
| Audio not playing | Check browser audio permissions, ElevenLabs API key |
| Slider not responsive | Verify `twinReady` state, check event handlers |
| Layout broken on mobile | Check CSS media queries, test with DevTools device emulation |

## Related Files

- `/frontend/src/pages/DashboardAI.jsx` - Main component
- `/frontend/src/pages/DashboardAI.css` - Styling
- `/frontend/src/components/ParticleHuman/` - 3D visualization
- `/frontend/src/hooks/useElevenLabsTTS.js` - Voice synthesis
- `/frontend/src/App.jsx` - Route registration
- `/frontend/src/components/Navbar.jsx` - Navigation link

