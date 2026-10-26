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
// 0: container glass (the bezel profile above). 1 or 2: a control lens over the first shape, a
// pill (segmented control, tab bar) or a thumb (slider, switch), bent by the profile measured on
// iOS 26.2 (glass/refraction.dart lensBend, LENS-MEASURED.md §2) eased in by uShift (0 … 1), with
// the colour split lensDispersion; uBezel and the edge terms are unused.
uniform float uLens;

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

// The measured lens bend (px, positive inward) at depth d px: glass/refraction.dart lensBend.
float lensBend(bool thumb, float d) {
  if (thumb) {
    if (d <= 1.0) return 7.1;
    float t = 1.0 - (d - 1.0) / 6.5;
    return t > 0.0 ? 7.1 * pow(t, 2.2) : 0.0;
  }
  if (d < 0.6) return 6.0 * (1.0 - d / 0.6);
  if (d < 5.0) return -4.3 * min(1.0, (d - 0.6) / (5.0 - 1.0 - 0.6));
  return -4.3 * exp(-(d - 5.0) / 10.5);
}

vec4 sampleAt(vec2 frag) {
  vec2 uv = frag / uSize;
#ifdef IMPELLER_TARGET_OPENGLES
  uv.y = 1.0 - uv.y;
#endif
  return texture(uTexture, clamp(uv, vec2(0.0), vec2(1.0)));
}

// A control lens: the measured bend along the outline's normal (the pill's leaning away from the
// centre), red bending 6 % less and blue 6 % more than green. No colour change: the lens's
// material is painted over it.
vec4 lens(vec2 frag, vec2 p) {
  float d = boxDistance(p, uRect0, uRadiusA.x);
  if (d >= 0.0 || uShift <= 0.0) return sampleAt(frag);
  bool thumb = uLens > 1.5;
  vec2 e = vec2(0.5, 0.0);
  vec2 n = vec2(
    boxDistance(p + e.xy, uRect0, uRadiusA.x) - boxDistance(p - e.xy, uRect0, uRadiusA.x),
    boxDistance(p + e.yx, uRect0, uRadiusA.x) - boxDistance(p - e.yx, uRect0, uRadiusA.x)
  );
  float len = length(n);
  if (len < 1e-5) return sampleAt(frag);
  vec2 dir = n / len;
  vec2 hs = uRect0.zw * 0.5;
  if (!thumb) dir += 1.5 * (p - (uRect0.xy + hs)) / max(hs, vec2(1e-5));
  float dirLen = length(dir);
  if (dirLen < 1e-5) return sampleAt(frag);
  // A small lens can't bend further than half its shorter side.
  float limit = min(hs.x, hs.y);
  float bend = clamp(lensBend(thumb, -d), -limit, limit) * uShift;
  vec2 offset = -dir / dirLen * bend * uDpr;
  vec4 r = sampleAt(frag + offset * 0.94);
  vec4 g = sampleAt(frag + offset);
  vec4 b = sampleAt(frag + offset * 1.06);
  return vec4(r.r, g.g, b.b, g.a);
}

void main() {
  vec2 frag = FlutterFragCoord().xy;
  vec2 p = (frag - uOrigin) / uDpr;
  if (uLens > 0.5) {
    fragColor = lens(frag, p);
    return;
  }
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
  vec4 colour = sampleAt(frag + offset);
  // Premultiplied: the backdrop is opaque inside the glass, so treat rgb as straight colour.
  vec3 x = colour.rgb;
  colour.rgb = clamp(x + uEdge.x * x * edge + uEdge.y * edge * colour.a, vec3(0.0), vec3(colour.a));
  fragColor = colour;
}
