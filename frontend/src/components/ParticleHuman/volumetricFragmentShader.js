export default `
  uniform vec3 uColorA;
  uniform float uPulse; 
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    // Calculate view direction towards the camera
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    
    // Fresnel calculation (the rim lighting effect)
    float dotProduct = dot(vNormal, viewDirection);
    // Invert the dot product: edges face perpendicular (dot=0 -> fresnel=1)
    float fresnel = max(0.0, 1.0 - abs(dotProduct));
    
    // Sharpen the rim into a hard glowing line
    float rimGlow = pow(fresnel, 3.5) * 1.5;
    
    // Faint semi-transparent interior body volume (like X-ray tissue)
    float coreGlow = pow(fresnel, 1.0) * 0.10; 
    
    // Audio-reactive pulse wave traveling vertically up the body
    float pulseEffect = 0.0;
    if (uPulse > 0.01) {
      pulseEffect = sin(vPosition.y * 12.0 - uTime * 8.0) * 0.5 + 0.5;
      pulseEffect *= uPulse * 2.0; // scale heavily by the mic volume
    }
    
    // Merge elements and render Additive holographic pixels
    float totalGlow = rimGlow + coreGlow + (pulseEffect * fresnel);
    
    // Enforce transparency bounds
    totalGlow = clamp(totalGlow, 0.0, 1.0);
    
    gl_FragColor = vec4(uColorA, totalGlow);
  }
`;
