'use client'

import {installFoPixelFallback} from './pixel-fallback';
import { reducedMotionQuery } from '../physics/motion-value'
/** PixelBlast shader adapted from the user-supplied React Bits source.
 * Native WebGL keeps this decorative layer within the react-live code budget.
 * Transparent, green tinted, capped resolution; no postprocessing dependency. */
const fragment = `#version 300 es

precision highp float;

uniform vec3  uColor;
uniform vec2  uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform int   uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;

const int   MAX_CLICKS = 10;

uniform vec2  uClickPos  [MAX_CLICKS];
uniform float uClickTimes[MAX_CLICKS];

out vec4 fragColor;

float Bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2. + a.y * a.y * .75);
}
#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))

#define FBM_OCTAVES     5
#define FBM_LACUNARITY  1.25
#define FBM_GAIN        1.0

float hash11(float n){ return fract(sin(n)*43758.5453); }

float vnoise(vec3 p){
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n100 = hash11(dot(ip + vec3(1.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n010 = hash11(dot(ip + vec3(0.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n110 = hash11(dot(ip + vec3(1.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n001 = hash11(dot(ip + vec3(0.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n101 = hash11(dot(ip + vec3(1.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n011 = hash11(dot(ip + vec3(0.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  float n111 = hash11(dot(ip + vec3(1.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);
  float x00 = mix(n000, n100, w.x);
  float x10 = mix(n010, n110, w.x);
  float x01 = mix(n001, n101, w.x);
  float x11 = mix(n011, n111, w.x);
  float y0  = mix(x00, x10, w.y);
  float y1  = mix(x01, x11, w.y);
  return mix(y0, y1, w.z) * 2.0 - 1.0;
}

float fbm2(vec2 uv, float t){
  vec3 p = vec3(uv * uScale, t);
  float amp = 1.0;
  float freq = 1.0;
  float sum = 1.0;
  for (int i = 0; i < FBM_OCTAVES; ++i){
    sum  += amp * vnoise(p * freq);
    freq *= FBM_LACUNARITY;
    amp  *= FBM_GAIN;
  }
  return sum * 0.5 + 0.5;
}

void main(){
  float pixelSize = uPixelSize;
  vec2 fragCoord = gl_FragCoord.xy - uResolution * .5;
  float aspectRatio = uResolution.x / uResolution.y;

  vec2 pixelId = floor(fragCoord / pixelSize);
  vec2 pixelUV = fract(fragCoord / pixelSize);

  float cellPixelSize = 8.0 * pixelSize;
  vec2 cellId = floor(fragCoord / cellPixelSize);
  vec2 cellCoord = cellId * cellPixelSize;
  vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);

  float base = fbm2(uv, uTime * 0.05);
  base = base * 0.5 - 0.65;

  float feed = base + (uDensity - 0.5) * 0.3;

  float speed     = uRippleSpeed;
  float thickness = uRippleThickness;
  const float dampT     = 1.0;
  const float dampR     = 10.0;

  if (uEnableRipples == 1) {
    for (int i = 0; i < MAX_CLICKS; ++i){
      vec2 pos = uClickPos[i];
      if (pos.x < 0.0) continue;
      float cellPixelSize = 8.0 * pixelSize;
      vec2 cuv = (((pos - uResolution * .5 - cellPixelSize * .5) / (uResolution))) * vec2(aspectRatio, 1.0);
      float t = max(uTime - uClickTimes[i], 0.0);
      float r = distance(uv, cuv);
      float waveR = speed * t;
      float ring  = exp(-pow((r - waveR) / thickness, 2.0));
      float atten = exp(-dampT * t) * exp(-dampR * r);
      feed = max(feed, ring * atten * uRippleIntensity);
    }
  }

  float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
  float bw = step(0.5, feed + bayer);

  float h = fract(sin(dot(floor(fragCoord / uPixelSize), vec2(127.1, 311.7))) * 43758.5453);
  float jitterScale = 1.0 + (h - 0.5) * uPixelJitter;
  float coverage = bw * jitterScale;
  float M = coverage;

  if (uEdgeFade > 0.0) {
    vec2 norm = gl_FragCoord.xy / uResolution;
    float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
    float fade = smoothstep(0.0, uEdgeFade, edge);
    M *= fade;
  }

  vec3 color = uColor;

  // sRGB gamma correction - convert linear to sRGB for accurate color output
  vec3 srgbColor = mix(
    color * 12.92,
    1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, color)
  );

  fragColor = vec4(srgbColor, M);
}
`;
export function installFoPixelShading(canvas: HTMLCanvasElement, options: {density?:number;speed?:number} = {}) {
  const settings={alpha:true,antialias:false,depth:false,powerPreference:'low-power' as const};
  const gl:WebGLRenderingContext|null=(canvas.getContext('webgl2',settings) as WebGL2RenderingContext|null)||(canvas.getContext('webgl',settings) as WebGLRenderingContext|null);
  if (!gl) return installFoPixelFallback(canvas,options);
  const modern=typeof WebGL2RenderingContext!=='undefined'&&gl instanceof WebGL2RenderingContext;
  const program = gl.createProgram();
  if (!program) return installFoPixelFallback(canvas,options);
  const shaders: WebGLShader[] = [];
  function compile(type: number, source: string) {
    const shader = gl!.createShader(type)!; shaders.push(shader);
    gl!.shaderSource(shader, source); gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) throw new Error('Pixel shading shader unavailable');
    gl!.attachShader(program!, shader);
  }
  let buffer: WebGLBuffer | null = null;
  try {
    compile(gl.VERTEX_SHADER, modern?'#version 300 es\nin vec2 position;void main(){gl_Position=vec4(position,0.,1.);}':'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}');
    compile(gl.FRAGMENT_SHADER, modern?fragment:fragment.replace('#version 300 es','').replace('out vec4 fragColor;','').replace(/fragColor/g,'gl_FragColor'));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Pixel shading unavailable');
    gl.useProgram(program);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  } catch (_) {
    shaders.forEach(shader=>gl.deleteShader(shader)); gl.deleteProgram(program); if(buffer)gl.deleteBuffer(buffer);
    return installFoPixelFallback(canvas,options);
  }
  const uniform=(name:string)=>gl.getUniformLocation(program,name);
  gl.uniform3f(uniform('uColor'),.32,.56,.22);
  gl.uniform1f(uniform('uScale'),3); gl.uniform1f(uniform('uDensity'),options.density ?? 1.05);
  gl.uniform1f(uniform('uPixelJitter'),.3);
  gl.uniform1f(uniform('uRippleSpeed'),.24); gl.uniform1f(uniform('uRippleThickness'),.065);
  gl.uniform1f(uniform('uRippleIntensity'),.65); gl.uniform1f(uniform('uEdgeFade'),.16);
  const clicks=new Float32Array(20).fill(-1), times=new Float32Array(10);
  const reduced=reducedMotionQuery();
  const fine=window.matchMedia('(hover: hover) and (pointer: fine)');
  const globalLayer=canvas.classList.contains('fo-pixel-shading');
  let fallbackCleanup:(()=>void)|undefined;
  let visible=true;
  let frame=0, last=0, elapsed=120, clickIndex=0, disposed=false, lost=false;
  function draw() {
    gl!.uniform1f(uniform('uTime'),elapsed);
    gl!.uniform1i(uniform('uEnableRipples'),reduced.matches?0:1);
    gl!.uniform2fv(uniform('uClickPos[0]'),clicks); gl!.uniform1fv(uniform('uClickTimes[0]'),times);
    gl!.drawArrays(gl!.TRIANGLES,0,6);
    canvas.dataset.foPixelReady='true';canvas.dataset.foPixelRenderer=modern?'webgl2':'webgl';if(globalLayer)document.documentElement.classList.add('fo-pixel-enabled');
  }
  function resize() {
    const rect=canvas.getBoundingClientRect();
    const ratio=Math.min(window.devicePixelRatio||1,1,1400/Math.max(rect.width,1));
    canvas.width=Math.max(1,Math.round(rect.width*ratio)); canvas.height=Math.max(1,Math.round(rect.height*ratio));
    gl!.viewport(0,0,canvas.width,canvas.height); gl!.uniform2f(uniform('uResolution'),canvas.width,canvas.height);
    gl!.uniform1f(uniform('uPixelSize'),3*ratio); if(!lost)draw();
  }
  function animate(now:number) {
    frame=0; if(disposed||lost||document.hidden||!visible||reduced.matches)return;
    if(now-last>=1000/24){elapsed+=Math.min((now-last)/1000,.1)*(options.speed ?? .3);last=now;draw();}
    frame=requestAnimationFrame(animate);
  }
  function resume() {
    cancelAnimationFrame(frame);frame=0;last=performance.now();
    if(!disposed&&!lost&&!document.hidden&&visible){draw();if(!reduced.matches)frame=requestAnimationFrame(animate);}
  }
  function ripple(event:PointerEvent) {
    if(reduced.matches||!fine.matches||event.pointerType==='touch')return;
    const rect=canvas.getBoundingClientRect();
    clicks[clickIndex*2]=(event.clientX-rect.left)*canvas.width/rect.width;
    clicks[clickIndex*2+1]=(rect.bottom-event.clientY)*canvas.height/rect.height;
    times[clickIndex]=elapsed; clickIndex=(clickIndex+1)%10;
  }
  function contextLost(event:Event){event.preventDefault();lost=true;cancelAnimationFrame(frame);canvas.dataset.foPixelReady='false';if(globalLayer)document.documentElement.classList.remove('fo-pixel-enabled');fallbackCleanup??=installFoPixelFallback(canvas,options);}
  const visibility=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;resume();});visibility.observe(canvas);
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  resize();resume();
  document.addEventListener('pointerdown',ripple,{passive:true});
  document.addEventListener('visibilitychange',resume);reduced.addEventListener('change',resume);
  canvas.addEventListener('webglcontextlost',contextLost);
  return ()=>{
    disposed=true;fallbackCleanup?.();if(globalLayer)document.documentElement.classList.remove('fo-pixel-enabled');cancelAnimationFrame(frame);observer.disconnect();visibility.disconnect();
    document.removeEventListener('pointerdown',ripple);document.removeEventListener('visibilitychange',resume);
    reduced.removeEventListener('change',resume);canvas.removeEventListener('webglcontextlost',contextLost);
    gl.deleteBuffer(buffer);shaders.forEach(shader=>gl.deleteShader(shader));gl.deleteProgram(program);
  };
}
