// The ambient pixel field (brand/pixel_shader.dart, web PixelShader) on the GPU: a wave band of
// 3 × 3 squares on a 4 px grid at CSS resolution, ordered-dithered with the 8 × 8 Bayer matrix,
// rippling out from presses and fading in over the outer 9 % of the field. Same formulas as the
// Dart painter, cell by cell.
#version 460 core
#include <flutter/runtime_effect.glsl>

precision highp float;

// The field's size (logical px) and its grid at CSS resolution (at most 1200 wide).
uniform vec2 uSize;
uniform vec2 uGrid;
uniform float uTime;
// min(1.35, density).
uniform float uDensity;
// Ink, straight alpha (opacity folded in).
uniform vec4 uInk;
// Up to eight ripples: x, y (grid px), start time; count in uCount.
uniform float uCount;
uniform vec4 uRipple0;
uniform vec4 uRipple1;
uniform vec4 uRipple2;
uniform vec4 uRipple3;
uniform vec4 uRipple4;
uniform vec4 uRipple5;
uniform vec4 uRipple6;
uniform vec4 uRipple7;

out vec4 fragColor;

float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x * 0.5 + a.y * a.y * 0.75);
}

float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

// The 8 × 8 Bayer matrix / 64, exactly the kit's table.
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

float ripple(vec4 r, vec2 cell, float time) {
  float age = time - r.z;
  vec2 d = (cell - r.xy) / uGrid;
  float w = (length(d) - age * 0.16) / 0.045;
  return exp(-w * w) * exp(-age * 2.0) * 0.35;
}

void main() {
  vec2 g = FlutterFragCoord().xy * uGrid / uSize;
  vec2 index = floor(g / 4.0);
  vec2 inCell = g - index * 4.0;
  if (inCell.x >= 3.0 || inCell.y >= 3.0) {
    fragColor = vec4(0.0);
    return;
  }
  vec2 cell = index * 4.0;
  float u = cell.x / uGrid.x;
  float v = cell.y / uGrid.y;
  float crest = 0.48 + 0.22 * sin(u * 7.2 + uTime) + 0.11 * sin(u * 13.1 - uTime * 0.63);
  float b = (v - crest) / 0.22;
  float band = exp(-b * b);
  float fold = 0.5 + 0.5 * sin(u * 11.0 + v * 5.0 - uTime * 0.42);
  float s = band * (0.23 + fold * 0.38) * uDensity;
  if (uCount > 0.5) s += ripple(uRipple0, cell, uTime);
  if (uCount > 1.5) s += ripple(uRipple1, cell, uTime);
  if (uCount > 2.5) s += ripple(uRipple2, cell, uTime);
  if (uCount > 3.5) s += ripple(uRipple3, cell, uTime);
  if (uCount > 4.5) s += ripple(uRipple4, cell, uTime);
  if (uCount > 5.5) s += ripple(uRipple5, cell, uTime);
  if (uCount > 6.5) s += ripple(uRipple6, cell, uTime);
  if (uCount > 7.5) s += ripple(uRipple7, cell, uTime);
  float threshold = bayer8(index) + 0.5 / 64.0;
  if (s <= threshold) {
    fragColor = vec4(0.0);
    return;
  }
  float edge = min(min(u, v), min(1.0 - u, 1.0 - v));
  float a = uInk.a * min(1.0, edge / 0.09);
  fragColor = vec4(uInk.rgb * a, a);
}
