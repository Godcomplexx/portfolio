// Neon grid floor (Act 1 and Act 3)
export const neonGridVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const neonGridFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uDensity;
varying vec2 vUv;

void main() {
  vec2 coord = vUv * uDensity;
  vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
  float line = min(grid.x, grid.y);
  float alpha = 1.0 - min(line, 1.0);
  float dist = length(vUv - 0.5) * 2.0;
  alpha *= smoothstep(1.0, 0.3, dist);
  alpha *= 0.35 + 0.1 * sin(uTime * 0.8);
  gl_FragColor = vec4(uColor, alpha);
}
`;

// Tunnel particles (Act 2)
export const tunnelParticleVertex = /* glsl */ `
attribute float aSize;
uniform float uTime;
varying float vAlpha;

void main() {
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vAlpha = smoothstep(30.0, 0.0, -mvPos.z);
  gl_PointSize = aSize * (200.0 / -mvPos.z);
  gl_Position = projectionMatrix * mvPos;
}
`;

export const tunnelParticleFragment = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float soft = 1.0 - smoothstep(0.2, 0.5, d);
  gl_FragColor = vec4(uColor, soft * vAlpha * 0.7);
}
`;

// Arena floor grid (Act 3)
export const arenaGridFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uDensity;
varying vec2 vUv;

void main() {
  vec2 coord = vUv * uDensity;
  vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
  float line = min(grid.x, grid.y);
  float alpha = 1.0 - min(line, 1.0);
  float dist = length(vUv - 0.5) * 2.0;
  alpha *= smoothstep(1.0, 0.4, dist);
  alpha *= 0.32;
  gl_FragColor = vec4(uColor, alpha);
}
`;

export const projectPlateVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const projectPlateFragment = /* glsl */ `
uniform sampler2D uTexture;
uniform float uOpacity;
uniform float uLift;
uniform float uGain;
uniform float uWarmth;
varying vec2 vUv;

vec3 srgbToLinear(vec3 color) {
  return pow(max(color, vec3(0.0)), vec3(2.2));
}

void main() {
  vec4 tex = texture2D(uTexture, vUv);
  vec3 color = srgbToLinear(tex.rgb);
  color = mix(color, vec3(1.0), uLift * (1.0 - color));
  color *= uGain;
  color = mix(color, color * vec3(1.0, 0.992, 0.97), uWarmth);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), tex.a * uOpacity);
}
`;

// Particle-image project surface (Act 3)
export const projectParticleVertex = /* glsl */ `
uniform float uTime;
uniform vec2 uInteractionPoint;
uniform float uInteractionRadius;
uniform float uInteractionStrength;
uniform float uRecovery;
uniform float uPointScale;
attribute float aRandom;
attribute float aSize;
varying vec2 vUv;
varying float vInfluence;

void main() {
  vUv = uv;

  vec3 displaced = position;
  vec2 delta = position.xz - uInteractionPoint;
  float dist = length(delta);
  float influence = smoothstep(uInteractionRadius, 0.0, dist) * uInteractionStrength;
  vInfluence = influence;

  vec2 dir = normalize(delta + vec2(
    sin(aRandom * 17.13 + uTime * 0.65),
    cos(aRandom * 11.71 - uTime * 0.58)
  ) * 0.22 + vec2(0.0001));

  displaced.xz += dir * influence * (0.48 + aRandom * 0.52);
  displaced.y += influence * (0.24 + aRandom * 0.46);
  displaced.y += sin(uTime * 2.1 + aRandom * 19.0) * influence * 0.045;

  displaced = mix(displaced, position, clamp(uRecovery, 0.0, 1.0));

  vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
  float size = aSize * uPointScale * mix(1.0, 1.45, influence);
  gl_PointSize = clamp(size * (336.0 / max(-mvPos.z, 0.001)), 1.35, 14.0);
  gl_Position = projectionMatrix * mvPos;
}
`;

export const projectParticleFragment = /* glsl */ `
uniform sampler2D uTexture;
uniform float uOpacity;
varying vec2 vUv;
varying float vInfluence;

void main() {
  vec2 centered = gl_PointCoord - 0.5;
  float d = length(centered);
  if (d > 0.5) discard;

  vec4 tex = texture2D(uTexture, vUv);
  float soft = 1.0 - smoothstep(0.14, 0.5, d);
  float glow = smoothstep(0.5, 0.0, d) * vInfluence * 0.14;
  vec3 color = tex.rgb + glow;
  float alpha = tex.a * soft * uOpacity;
  if (alpha < 0.02) discard;

  gl_FragColor = vec4(color, alpha);
}
`;

// Fullscreen transition layer (Act 2 -> Act 3)
export const transitionVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const transitionFragment = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform float uWhite;
uniform float uReveal;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec2 centered = vUv - 0.5;
  float radius = length(centered);
  float angle = atan(centered.y, centered.x);
  vec2 dir = normalize(centered + vec2(0.0001));

  float progress = smoothstep(0.0, 1.0, uProgress);
  float white = clamp(uWhite, 0.0, 1.0);
  float reveal = clamp(uReveal, 0.0, 1.0);

  float swirl = progress * (1.0 - smoothstep(0.05, 0.76, radius));
  vec2 warpedUv = vUv + dir * swirl * 0.038 + vec2(cos(angle * 2.0 + uTime * 0.7), sin(angle * 2.0 - uTime * 0.65)) * swirl * 0.012;
  float grain = noise(warpedUv * 7.5 + vec2(uTime * 0.12, -uTime * 0.09)) - 0.5;

  float aperture = mix(0.34, 0.05, progress);
  float ring = smoothstep(0.075, 0.0, abs(radius - aperture)) * (0.18 + progress * 0.26);
  float halo = smoothstep(0.86, 0.16, radius) * (0.06 + progress * 0.12);
  float core = smoothstep(0.42, 0.0, radius) * (0.05 + progress * 0.34 + white * 0.26);
  float streak = smoothstep(0.24, 0.0, abs(sin(angle * 2.0 + uTime * 0.45))) * smoothstep(0.72, 0.1, radius) * progress * 0.08;

  vec3 cold = vec3(0.82, 0.93, 1.0);
  vec3 warm = vec3(1.0, 0.95, 0.88);
  vec3 edgeTint = mix(cold, warm, 0.6 + 0.2 * sin(uTime * 0.25));
  vec3 color = edgeTint * (halo + ring + streak);
  color += vec3(1.0, 0.98, 0.94) * core;

  float alpha = (halo + ring + core + streak + grain * 0.035 * progress) * (1.0 - reveal);
  alpha += white * smoothstep(1.0, 0.0, radius * 1.15) * 0.92;
  alpha = clamp(alpha, 0.0, 1.0);

  gl_FragColor = vec4(color, alpha);
}
`;

// Fullscreen postprocess for grain, vignette, and subtle RGB separation
export const postFxVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const postFxFragment = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uNoiseStrength;
uniform float uVignetteStrength;
uniform float uAberration;
uniform float uWarmth;
uniform float uFogAmount;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec2 centered = vUv - 0.5;
  float radius = length(centered);
  vec2 dir = normalize(centered + vec2(0.0001));
  vec2 shift = dir * uAberration * radius * radius;

  vec3 color;
  color.r = texture2D(tDiffuse, vUv + shift).r;
  color.g = texture2D(tDiffuse, vUv).g;
  color.b = texture2D(tDiffuse, vUv - shift).b;

  float grainA = noise(vUv * vec2(1280.0, 720.0) + vec2(uTime * 15.7, -uTime * 11.3)) - 0.5;
  float grainB = noise(vUv * vec2(680.0, 420.0) + vec2(-uTime * 6.8, uTime * 8.4)) - 0.5;
  float grain = (grainA * 0.65 + grainB * 0.35) * uNoiseStrength;

  // cinematic vignette — tighter falloff, darker edges
  float vignette = smoothstep(1.1, 0.18, radius);
  color *= mix(1.0 - uVignetteStrength, 1.0, vignette);

  // warm cinematic color grading (amber/sepia push)
  vec3 warmTint = vec3(1.08, 0.97, 0.82);
  color = mix(color, color * warmTint, uWarmth);
  // lift shadows slightly warm
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  vec3 shadowTint = vec3(0.12, 0.06, 0.0) * (1.0 - smoothstep(0.0, 0.35, lum)) * uWarmth;
  color += shadowTint;

  // soft atmospheric fog overlay (screen-space haze)
  float fogNoise = noise(vUv * 3.0 + vec2(uTime * 0.02, -uTime * 0.015));
  float fogMask = smoothstep(0.0, 0.7, 1.0 - vUv.y) * 0.6 + 0.4;
  fogMask += (fogNoise - 0.5) * 0.3;
  vec3 fogColor = vec3(0.14, 0.11, 0.09);
  color = mix(color, fogColor, clamp(fogMask * uFogAmount, 0.0, 1.0));

  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
`;

// Photo-mesh project surface (Act 3)
export const photoMeshVertex = /* glsl */ `
uniform float uTime;
uniform float uActive;
varying vec2 vUv;
varying float vLift;
varying float vShardSeam;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vUv = uv;
  vec3 pos = position;
  vec2 shardGrid = vec2(11.0, 8.0);
  vec2 shardId = floor(uv * shardGrid);
  vec2 shardLocal = fract(uv * shardGrid) - 0.5;
  float shardNoise = hash(shardId);
  float shardEdge = smoothstep(0.34, 0.5, max(abs(shardLocal.x), abs(shardLocal.y)));
  vShardSeam = shardEdge;

  pos.x += shardLocal.x * (0.028 + uActive * 0.018) * (0.3 + shardNoise);
  pos.y += shardLocal.y * (0.02 + uActive * 0.015) * (0.3 + shardNoise);
  pos.z += shardEdge * (0.05 + uActive * 0.035) * (0.4 + shardNoise);

  float edge = 1.0 - smoothstep(
    0.0,
    0.22,
    min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y))
  );
  float n = noise(uv * 9.0 + vec2(uTime * 0.18, -uTime * 0.12));
  pos.z += edge * (0.045 + uActive * 0.03) * (0.35 + n);
  pos.z += (0.01 + uActive * 0.008) * sin((uv.x + uv.y * 0.7) * 12.0 + uTime * 0.9);
  vLift = pos.z;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const photoMeshFragment = /* glsl */ `
uniform sampler2D uTexture;
uniform float uTime;
uniform float uActive;
varying vec2 vUv;
varying float vLift;
varying float vShardSeam;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec2 shardGrid = vec2(11.0, 8.0);
  vec2 shardId = floor(vUv * shardGrid);
  vec2 shardLocal = fract(vUv * shardGrid) - 0.5;
  float shardNoise = hash(shardId);
  float shardMask = 1.0 - smoothstep(0.44, 0.5, max(abs(shardLocal.x), abs(shardLocal.y)));
  float seam = smoothstep(0.38, 0.5, max(abs(shardLocal.x), abs(shardLocal.y)));
  float shardInset = 0.9 - uActive * 0.04;
  vec2 sampleUv = (shardId + 0.5 + shardLocal * shardInset) / shardGrid;
  sampleUv += vec2(
    (hash(shardId + vec2(1.7, 2.3)) - 0.5) * 0.0028,
    (hash(shardId + vec2(4.1, 0.8)) - 0.5) * 0.0028
  ) * (0.45 + uActive * 0.35);

  vec4 tex = texture2D(uTexture, sampleUv);
  float edgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float n = noise(vUv * 14.0 + vec2(uTime * 0.12, -uTime * 0.08));
  float dissolve = smoothstep(0.008 + n * 0.035, 0.13 + n * 0.06, edgeDist);
  float fringe = (1.0 - smoothstep(0.02, 0.16, edgeDist)) * (0.14 + uActive * 0.18);

  vec3 edgeTint = mix(vec3(0.88, 0.96, 1.0), vec3(1.0, 0.97, 0.89), 0.48);
  vec3 color = tex.rgb;
  color = mix(color, edgeTint, fringe + seam * 0.18 + vShardSeam * 0.08);
  color += fringe * 0.18 + max(vLift, 0.0) * 0.65;
  color += seam * 0.08;

  float alpha = tex.a * dissolve * shardMask * (0.94 + fringe * 0.4);
  if (alpha < 0.02) discard;

gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
`;
