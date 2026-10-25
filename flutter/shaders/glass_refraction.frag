// Glass refraction as a backdrop filter (Impeller): the twin of the web kit's displacement map
// (src/glass/refraction.ts). Each pixel inside the bezel samples the backdrop from
// shift * (1 - t / bezel)^4 deeper inside, along the blended outline's inward normal. Our own
// profile, fitted to measurements of rendered Liquid Glass (ui/research/liquid-glass). The input
// already carries the material's colour; over the outer pixel the edge terms apply
// (x + k1 * x * E + k3 * E, glass/material.dart glassEdgeTerms, edgeMask).
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
// Toward the light (unit, y down) and the edge terms k1, k3.
uniform vec2 uLight;
uniform vec2 uEdge;
// A lens's magnification beyond 1 (0 none, 0.2 = 1.2x), about the first shape's centre: a lifted
// control lens enlarges what it covers (iOS 27's tab and segmented lens).
uniform float uMagnify;

uniform sampler2D uTexture;

out vec4 fragColor;

float boxDistance(vec2 p, vec4 rect, float radius) {
  vec2 hs = rect.zw * 0.5;
  float halfSide = min(hs.x, hs.y);
  float r = clamp(radius, 0.0, max(halfSide, 0.0));
  vec2 q = abs(p - (rect.xy + hs)) - hs + r;
  // Match glass/geometry.dart and brand/geometry.dart. A circular SDF here puts
  // the refracted edge inside the continuous-corner clip, drawing a second rim.
  float fill = halfSide > 0.0 ? r / halfSide : 1.0;
  float smoothing = 1.0 - smoothstep(0.75, 1.0, fill);
  float exponent = exp2(1.0 + smoothing * 0.5);
  vec2 outside = max(q, 0.0);
  float high = max(outside.x, outside.y);
  float low = min(outside.x, outside.y);
  float norm = high > 0.0
    ? high * pow(1.0 + pow(low / high, exponent), 1.0 / exponent)
    : 0.0;
  return norm + min(max(q.x, q.y), 0.0) - r;
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
  float edge = 0.0;
  if (d < 0.0 && -d < max(uBezel, 1.0)) {
    vec2 e = vec2(0.5, 0.0);
    vec2 n = vec2(unionDistance(p + e.xy) - unionDistance(p - e.xy), unionDistance(p + e.yx) - unionDistance(p - e.yx));
    float len = length(n);
    if (len > 1e-5) {
      float t = min(1.0, -d / max(uBezel, 1e-5));
      float bend = pow(1.0 - t, 4.0) * uShift;
      offset = -n / len * bend * uDpr;
      // Edge mask: 1 px wide, (1 - depth^3), 0.2 + 0.8 |cos a| against the light axis.
      float depth = -d;
      if (depth < 1.0) {
        float c = abs(dot(n / len, uLight));
        edge = (1.0 - depth * depth * depth) * (0.2 + 0.8 * min(c, 1.0));
      }
    }
  }
  if (d < 0.0 && uMagnify > 0.0) {
    vec2 centre = uRect0.xy + uRect0.zw * 0.5;
    offset += (centre + (p - centre) / (1.0 + uMagnify) - p) * uDpr;
  }
  vec2 uv = (frag + offset) / uSize;
#ifdef IMPELLER_TARGET_OPENGLES
  uv.y = 1.0 - uv.y;
#endif
  vec4 colour = texture(uTexture, clamp(uv, vec2(0.0), vec2(1.0)));
  // Premultiplied: the backdrop is opaque inside the glass, so treat rgb as straight colour.
  vec3 x = colour.rgb;
  colour.rgb = clamp(x + uEdge.x * x * edge + uEdge.y * edge * colour.a, vec3(0.0), vec3(colour.a));
  fragColor = colour;
}
