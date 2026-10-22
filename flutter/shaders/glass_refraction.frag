// Glass refraction as a backdrop filter (Impeller): the twin of the web kit's displacement map
// (src/glass/refraction.ts). Each pixel inside the bezel samples the backdrop from
// shift * (1 - t / bezel)^4 deeper inside, along the blended outline's inward normal. Our own
// profile, fitted to measurements of rendered Liquid Glass (ui/research/liquid-glass).
#version 460 core
#include <flutter/runtime_effect.glsl>

precision highp float;

// Set by the engine: the size of the filter input (physical px).
uniform vec2 uSize;
// Where the glass's local (0, 0) lies in the input, physical px, and the device pixel ratio.
uniform vec2 uOrigin;
uniform float uDpr;
// Bend: bezel width and largest shift (logical px, already scaled to the cluster's size).
uniform float uBezel;
uniform float uShift;
uniform float uCount;
// Up to six shapes: x, y, width, height (logical px), corner radius, blend width against the
// shapes before it (glass/geometry.dart mergeWidth).
uniform vec4 uRect0;
uniform vec4 uRect1;
uniform vec4 uRect2;
uniform vec4 uRect3;
uniform vec4 uRect4;
uniform vec4 uRect5;
uniform vec4 uRadiusA;
uniform vec4 uRadiusB;
uniform vec4 uBlendA;
uniform vec4 uBlendB;

uniform sampler2D uTexture;

out vec4 fragColor;

float boxDistance(vec2 p, vec4 rect, float radius) {
  vec2 hs = rect.zw * 0.5;
  float r = min(radius, min(hs.x, hs.y));
  vec2 q = abs(p - (rect.xy + hs)) - hs + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float smoothMin(float a, float b, float k) {
  if (k <= 0.0) return min(a, b);
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

float shapeAt(int i, vec2 p) {
  if (i == 0) return boxDistance(p, uRect0, uRadiusA.x);
  if (i == 1) return boxDistance(p, uRect1, uRadiusA.y);
  if (i == 2) return boxDistance(p, uRect2, uRadiusA.z);
  if (i == 3) return boxDistance(p, uRect3, uRadiusA.w);
  if (i == 4) return boxDistance(p, uRect4, uRadiusB.x);
  return boxDistance(p, uRect5, uRadiusB.y);
}

float blendAt(int i) {
  if (i == 1) return uBlendA.y;
  if (i == 2) return uBlendA.z;
  if (i == 3) return uBlendA.w;
  if (i == 4) return uBlendB.x;
  if (i == 5) return uBlendB.y;
  return 0.0;
}

float unionDistance(vec2 p) {
  float d = shapeAt(0, p);
  for (int i = 1; i < 6; i++) {
    if (float(i) >= uCount) break;
    d = smoothMin(d, shapeAt(i, p), blendAt(i));
  }
  return d;
}

void main() {
  vec2 frag = FlutterFragCoord().xy;
  vec2 p = (frag - uOrigin) / uDpr;
  float d = unionDistance(p);
  vec2 offset = vec2(0.0);
  if (d < 0.0 && -d < uBezel) {
    vec2 e = vec2(0.5, 0.0);
    vec2 n = vec2(unionDistance(p + e.xy) - unionDistance(p - e.xy), unionDistance(p + e.yx) - unionDistance(p - e.yx));
    float len = length(n);
    if (len > 1e-5) {
      float t = -d / uBezel;
      float bend = pow(1.0 - t, 4.0) * uShift;
      offset = -n / len * bend * uDpr;
    }
  }
  vec2 uv = (frag + offset) / uSize;
#ifdef IMPELLER_TARGET_OPENGLES
  uv.y = 1.0 - uv.y;
#endif
  fragColor = texture(uTexture, clamp(uv, vec2(0.0), vec2(1.0)));
}
