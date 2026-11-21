// Regular material adapted from liquid_glass_renderer 1.0.0-dev.2.
// Copyright 2025 Tim Lehmann for whynotmake.it. See licenses/liquid_glass_renderer.txt.
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
// 0: container glass (the bezel profile above). 1, 2 or 3: a control lens over the first shape, a
// pill (segmented control, tab bar; its rest pill is the second shape), a slider thumb or a switch
// thumb, bent by glass/refraction.dart lensBend eased in by uShift (0 … 1); uBezel and the edge
// terms are unused. The slider thumb also softens its band (lensSoftBlur, lensSoftWeight) and the
// switch thumb zooms its middle out (lensSwitchZoomX/Y).
uniform float uLens;
// Nonzero transmission selects the regular face. Emission is premultiplied.
uniform vec3 uFace; // transmission, luminance lift, chroma gain
uniform vec3 uEmission;
uniform float uRegularity;
uniform vec2 uGlint; // strength, width in logical px

uniform sampler2D uTexture;

out vec4 fragColor;

// Distance, outward unit normal and half the shorter side. Straight edges and
// circles take no powers. Blending these samples gives the optical normal and
// the local control size in the same pass as the distance.
vec4 boxField(vec2 p, vec4 rect, float radius) {
  vec2 hs = rect.zw * 0.5;
  float halfSide = min(hs.x, hs.y);
  float r = clamp(radius, 0.0, max(halfSide, 0.0));
  vec2 delta = p - (rect.xy + hs);
  vec2 q = abs(delta) - hs + r;
  float hi = max(q.x, q.y);
  float lo = min(q.x, q.y);
  vec2 n = q.x > q.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  if (lo <= 0.0) return vec4(hi - r, sign(delta) * n, halfSide);
  float smoothing = 1.0 - smoothstep(0.75, 1.0, r / max(halfSide, 1e-5));
  if (smoothing == 0.0) return vec4(length(q) - r, sign(delta) * normalize(q), halfSide);
  float exponent = exp2(1.0 + smoothing * 0.5);
  float ratio = lo / hi;
  float power = pow(ratio, exponent);
  float norm = hi * pow(1.0 + power, 1.0 / exponent);
  vec2 direction = n + (1.0 - n) * (power / ratio);
  return vec4(norm - r, sign(delta) * normalize(direction), halfSide);
}

float boxDistance(vec2 p, vec4 rect, float radius) {
  return boxField(p, rect, radius).x;
}

vec4 shapeAt(int i, vec2 p) {
  if (i == 0) return boxField(p, uRect0, uRadiusA.x);
  if (i == 1) return boxField(p, uRect1, uRadiusA.y);
  if (i == 2) return boxField(p, uRect2, uRadiusA.z);
  if (i == 3) return boxField(p, uRect3, uRadiusA.w);
  if (i == 4) return boxField(p, uRect4, uRadiusB.x);
  return boxField(p, uRect5, uRadiusB.y);
}

float blendAt(int i) {
  if (i == 1) return uBlendA.y;
  if (i == 2) return uBlendA.z;
  if (i == 3) return uBlendA.w;
  if (i == 4) return uBlendB.x;
  if (i == 5) return uBlendB.y;
  return 0.0;
}

vec4 unionField(vec2 p) {
  vec4 field = shapeAt(0, p);
  for (int i = 1; i < 6; i++) {
    if (float(i) >= uCount) break;
    vec4 next = shapeAt(i, p);
    float k = blendAt(i);
    if (k <= 0.0) {
      if (next.x < field.x) field = next;
    } else {
      float share = clamp(0.5 + 0.5 * (field.x - next.x) / k, 0.0, 1.0);
      field = mix(field, next, share);
      field.x -= k * share * (1.0 - share);
    }
  }
  return field;
}

// The lens bend (px, positive inward) at depth d px: glass/refraction.dart lensBend. The pill's is a
// dome bevel bounded below by its rest pill (`gap` = how far the lens reaches past it here,
// `halfMinor` = half its shorter side); the slider thumb's and the switch thumb's lip are iOS 26.2's
// measured profiles.
float lensBend(float kind, float d, float gap, float halfMinor) {
  if (kind < 1.5) {
    // A dome bevel (lensPillHeight 20, lensPillAmount 60, capped by the shorter side) over a floor
    // that never shows past the rest pill.
    float bevel = min(20.0, halfMinor * 0.5);
    float x = 1.0 - d / max(bevel, 1e-3);
    float dome = x > 0.0 ? min(60.0, halfMinor) * (1.0 - sqrt(1.0 - x * x)) : 0.0;
    float g = max(gap, 0.0) + 1.0;
    float t = 1.0 - d / (2.5 * g);
    return max(dome, t > 0.0 ? g * t * t : 0.0);
  }
  if (kind < 2.5) {
    if (d <= 1.0) return 7.1;
    float t = 1.0 - (d - 1.0) / 6.5;
    return t > 0.0 ? 7.1 * pow(t, 2.2) : 0.0;
  }
  if (d < 0.6) return 4.02 * (1.0 - d / 0.6);
  if (d < 5.0) return -2.881 * min(1.0, (d - 0.6) / (5.0 - 1.0 - 0.6));
  return -2.881 * exp(-(d - 5.0) / 10.5);
}

vec4 sampleAt(vec2 frag) {
  vec2 uv = frag / uSize;
#ifdef IMPELLER_TARGET_OPENGLES
  uv.y = 1.0 - uv.y;
#endif
  return texture(uTexture, clamp(uv, vec2(0.0), vec2(1.0)));
}

// The backdrop blurred (standard deviation `sigma`, physical px) around `frag`: 13 taps on a
// diamond (|i| + |j| <= 2) spaced 1.2 sigma apart, weights exp(-(i² + j²) / 2) — about a Gaussian
// of `sigma`.
vec4 blurredAt(vec2 frag, float sigma) {
  float s = 1.2 * sigma;
  vec4 sum = sampleAt(frag);
  float total = 1.0;
  const float w1 = 0.60653066; // exp(-0.5)
  const float wd = 0.36787944; // exp(-1)
  const float w2 = 0.13533528; // exp(-2)
  sum += w1 * (sampleAt(frag + vec2(s, 0.0)) + sampleAt(frag - vec2(s, 0.0)) +
    sampleAt(frag + vec2(0.0, s)) + sampleAt(frag - vec2(0.0, s)));
  sum += wd * (sampleAt(frag + vec2(s, s)) + sampleAt(frag + vec2(-s, s)) +
    sampleAt(frag + vec2(s, -s)) + sampleAt(frag - vec2(s, s)));
  sum += w2 * (sampleAt(frag + vec2(2.0 * s, 0.0)) + sampleAt(frag - vec2(2.0 * s, 0.0)) +
    sampleAt(frag + vec2(0.0, 2.0 * s)) + sampleAt(frag - vec2(0.0, 2.0 * s)));
  total += 4.0 * (w1 + wd + w2);
  return sum / total;
}

// A control lens: the bend along the outline's normal (the switch's leaning away from the centre,
// its middle zoomed out; a pill's bounded by its rest pill in uRect1 / uRadiusA.y), every colour by
// the same shift. The slider thumb's band mixes in the backdrop blurred, then bent (blurring after
// the bend would soften nothing: the band magnifies). No colour change: the lens's material is
// painted over it.
vec4 lens(vec2 frag, vec2 p) {
  float d = boxDistance(p, uRect0, uRadiusA.x);
  if (d >= 0.0 || uShift <= 0.0) return sampleAt(frag);
  bool pill = uLens < 1.5;
  bool thumb = uLens > 1.5 && uLens < 2.5;
  bool switchThumb = uLens > 2.5;
  vec2 hs = uRect0.zw * 0.5;
  vec2 fromCentre = p - (uRect0.xy + hs);
  // The switch shows the backdrop further out the further from its centre (lensSwitchZoomX/Y).
  vec2 shift = switchThumb ? fromCentre * vec2(0.04, 0.0) : vec2(0.0);
  vec2 e = vec2(0.5, 0.0);
  vec2 n = vec2(
    boxDistance(p + e.xy, uRect0, uRadiusA.x) - boxDistance(p - e.xy, uRect0, uRadiusA.x),
    boxDistance(p + e.yx, uRect0, uRadiusA.x) - boxDistance(p - e.yx, uRect0, uRadiusA.x)
  );
  float len = length(n);
  if (len > 1e-5) {
    vec2 dir = n / len;
    if (switchThumb) dir += 1.5 * fromCentre / max(hs, vec2(1e-5));
    float dirLen = length(dir);
    if (dirLen > 1e-5) {
      // A small lens can't bend further than half its shorter side.
      float limit = min(hs.x, hs.y);
      float gap = pill ? boxDistance(p, uRect1, uRadiusA.y) - d : 0.0;
      float bend = clamp(lensBend(uLens, -d, gap, limit), -limit, limit);
      shift += -dir / dirLen * bend;
    }
  }
  vec2 offset = shift * uShift * uDpr;
  vec4 sharp = sampleAt(frag + offset);
  // lensSoftWeight: 1 at the rim to 0 at lensThumbSoft (5 px) deep; blur lensSoftBlur (2 px).
  float soft = thumb ? max(0.0, 1.0 + d / 5.0) : 0.0;
  if (soft <= 0.0) return sharp;
  return mix(sharp, blurredAt(frag + offset, 2.0 * uDpr), soft);
}

vec4 containerGlass(vec2 frag, vec2 p) {
  vec4 field = unionField(p);
  float d = field.x;
  float bevel = uBezel, shift = uShift;
  if (uFace.x > 0.0) {
    float clearScale = min(1.0, field.w / 20.0);
    bevel = mix(20.0 * clearScale, min(20.0, field.w / 2.0), uRegularity);
    shift *= mix(50.0 * clearScale, min(60.0, field.w), uRegularity);
  }
  vec2 offset = vec2(0.0);
  float edge = 0.0;
  float glint = 0.0;
  float shade = 0.0;
  if (d < 0.0 && -d < max(max(bevel, 1.0), uFace.x > 0.0 ? max(22.0, 4.0 * uGlint.y) : 0.0)) {
    vec2 n = field.yz;
    float len = length(n);
    if (len > 1e-5) {
      float t = min(1.0, -d / max(bevel, 1e-5));
      float shoulder = 1.0 - t;
      float bend = (1.0 - sqrt(1.0 - shoulder * shoulder)) * shift * sqrt(min(len, 1.0));
      offset = -n / len * bend * uDpr;
      // Edge mask: 1 px wide, (1 - depth^3), 0.2 + 0.8 |cos a| against the light axis.
      float depth = -d;
      if (uFace.x > 0.0 && uGlint.y > 0.0 && depth < 4.0 * uGlint.y) {
        float tangency = abs(dot(n / len, vec2(-uLight.y, uLight.x)));
        float z = depth / uGlint.y;
        float profile = max(0.0, 1.0 - z) + 0.21 * max(0.0, 1.0 - z * 0.25);
        glint = clamp(0.1512 * uGlint.x * (1.0 - tangency) * profile, 0.0, 1.0);
      }
      if (uFace.x > 0.0 && uRegularity > 0.0) {
        float facing = dot(n / len, uLight);
        float castOffset = 6.0 * facing;
        float lead = castOffset > 0.0 ? smoothstep(0.0, 2.0 * castOffset, depth) : 1.0;
        shade = 0.036 * uRegularity * lead * (1.0 - smoothstep(0.0, 16.0, depth - castOffset))
            * (0.5 + 0.5 * smoothstep(-1.0, 1.0, facing));
      }
      if (uFace.x <= 0.0 && depth < 1.0) {
        float c = abs(dot(n / len, uLight));
        edge = (1.0 - depth * depth * depth) * (0.2 + 0.8 * min(c, 1.0));
      }
    }
  }
  vec4 colour = sampleAt(frag + offset);
  if (uFace.x > 0.0) {
    const vec3 luma = vec3(0.2126, 0.7152, 0.0722);
    vec3 rgb = colour.rgb / max(colour.a, 1e-5);
    float y = dot(rgb, luma);
    vec3 transmitted = uFace.x * y * (1.0 + uFace.y * (1.0 - y)) + uFace.z * (rgb - y);
    vec3 face = max(vec3(0.0), clamp(uEmission + transmitted, 0.0, 1.0) - shade * transmitted);
    vec3 target = vec3(mix(2.34, 1.6, uRegularity)) + 3.58 * (1.0 - uRegularity) * face
        + mix(0.78, 2.85, uRegularity) * (face - dot(face, luma));
    return vec4(clamp(mix(face, target, glint), 0.0, 1.0) * colour.a, colour.a);
  }
  // Premultiplied: the backdrop is opaque inside the glass, so treat rgb as straight colour.
  vec3 x = colour.rgb;
  colour.rgb = clamp(x + uEdge.x * x * edge + uEdge.y * edge * colour.a, vec3(0.0), vec3(colour.a));
  return colour;
}

void main() {
  vec2 frag = FlutterFragCoord().xy;
  vec2 p = (frag - uOrigin) / uDpr;
  if (uLens > 0.5) {
    fragColor = lens(frag, p);
  } else {
    fragColor = containerGlass(frag, p);
  }
}
