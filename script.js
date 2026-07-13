const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: false });

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resize);

const vertSrc = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const fragSrc = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform vec2 u_texSize;
uniform float u_time;
#define MAX_PTS 24
uniform vec2 u_pts[MAX_PTS];
uniform float u_ages[MAX_PTS];
uniform int u_count;
uniform vec2 u_mouse;
uniform float u_mouseActive;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
}

vec2 coverUV(vec2 uv, vec2 res, vec2 texSize) {
  float resAR = res.x / res.y;
  float texAR = texSize.x / texSize.y;
  vec2 scale = vec2(1.0);
  if (resAR > texAR) { scale.y = texAR / resAR; }
  else { scale.x = resAR / texAR; }
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 uv = coverUV(v_uv, u_resolution, u_texSize);
  vec2 pixel = v_uv * u_resolution;
  vec2 displace = vec2(0.0);

  for (int i = 0; i < MAX_PTS; i++) {
    if (i >= u_count) break;
    vec2 p = u_pts[i];
    float age = u_ages[i];
    vec2 diff = pixel - p;
    float dist = length(diff);
    float lifespan = 2.1;
    float t = age / lifespan;
    if (t > 1.0) continue;

    float radius = 300.0 + age * 360.0;
    float falloff = smoothstep(radius, 0.0, dist);
    float ring = sin(dist * 0.022 - age * 3.4);
    float decay = pow(1.0 - t, 2.4);
    float amp = 6.0 * decay * falloff;

    vec2 dir = dist > 0.001 ? diff / dist : vec2(0.0);
    displace += dir * ring * amp;
  }

  vec2 dispUV = displace / u_resolution;
  vec2 sampleUV = uv + dispUV;
  vec3 color = texture2D(u_tex, clamp(sampleUV, 0.0, 1.0)).rgb;

  float dispMag = length(displace);
  if (dispMag > 0.001) {
    vec2 off = dispUV * 0.18;
    float r = texture2D(u_tex, clamp(uv + dispUV + off, 0.0, 1.0)).r;
    float b = texture2D(u_tex, clamp(uv + dispUV - off, 0.0, 1.0)).b;
    color.r = mix(color.r, r, 0.35);
    color.b = mix(color.b, b, 0.35);
  }

  float mdist = length(pixel - u_mouse);
  float spot = smoothstep(360.0, 0.0, mdist) * u_mouseActive;
  color += spot * 0.11;

  float grain = rand(v_uv * u_resolution + u_time * 60.0);
  color += (grain - 0.5) * 0.022;

  vec2 vc = v_uv - 0.5;
  float vig = 1.0 - dot(vc, vc) * 0.4;
  color *= vig;

  gl_FragColor = vec4(color, 1.0);
}`;

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
  }
  return s;
}

const prog = gl.createProgram();
gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertSrc));
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
gl.linkProgram(prog);
gl.useProgram(prog);

const quad = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
const aPos = gl.getAttribLocation(prog, 'a_pos');
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

const u_tex = gl.getUniformLocation(prog, 'u_tex');
const u_resolution = gl.getUniformLocation(prog, 'u_resolution');
const u_texSize = gl.getUniformLocation(prog, 'u_texSize');
const u_time = gl.getUniformLocation(prog, 'u_time');
const u_pts = gl.getUniformLocation(prog, 'u_pts');
const u_ages = gl.getUniformLocation(prog, 'u_ages');
const u_count = gl.getUniformLocation(prog, 'u_count');
const u_mouse = gl.getUniformLocation(prog, 'u_mouse');
const u_mouseActive = gl.getUniformLocation(prog, 'u_mouseActive');

const tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([26,28,20,255]));
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

let texW = 1, texH = 1;
const img = new Image();
img.onload = () => {
  texW = img.width; texH = img.height;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  resize();
};
img.onerror = () => {
  console.error('Не удалось загрузить hero.jpg — проверь, что файл лежит в корне репозитория и назван именно hero.jpg');
};
img.src = 'hero.jpg';

const MAX_PTS = 24;
let points = [];
let lastEmit = 0;

function addPoint(x, y) {
  const now = performance.now() / 1000;
  if (now - lastEmit < 0.035) return;
  lastEmit = now;
  points.push({ x, y, t0: now });
  if (points.length > MAX_PTS) points.shift();
}

let mouseX = 0, mouseY = 0, mouseActive = 0;
let lastMoveTime = 0;

function toCanvasCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const dpr = canvas.width / rect.width;
  return [ (clientX - rect.left) * dpr, canvas.height - (clientY - rect.top) * dpr ];
}

canvas.addEventListener('mousemove', (e) => {
  const [x, y] = toCanvasCoords(e.clientX, e.clientY);
  mouseX = x; mouseY = y;
  lastMoveTime = performance.now() / 1000;
  addPoint(x, y);
});
canvas.addEventListener('mouseleave', () => { lastMoveTime = 0; });

canvas.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  if (!t) return;
  const [x, y] = toCanvasCoords(t.clientX, t.clientY);
  mouseX = x; mouseY = y;
  lastMoveTime = performance.now() / 1000;
  addPoint(x, y);
}, { passive: true });

const ptsFlat = new Float32Array(MAX_PTS * 2);
const agesFlat = new Float32Array(MAX_PTS);

function frame() {
  const now = performance.now() / 1000;
  points = points.filter(p => now - p.t0 < 2.1);

  for (let i = 0; i < MAX_PTS; i++) {
    if (i < points.length) {
      ptsFlat[i*2] = points[i].x;
      ptsFlat[i*2+1] = points[i].y;
      agesFlat[i] = now - points[i].t0;
    } else {
      ptsFlat[i*2] = 0; ptsFlat[i*2+1] = 0; agesFlat[i] = 999.0;
    }
  }

  mouseActive += ((now - lastMoveTime < 0.5 ? 1 : 0) - mouseActive) * 0.08;

  gl.uniform1i(u_tex, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform2f(u_resolution, canvas.width, canvas.height);
  gl.uniform2f(u_texSize, texW, texH);
  gl.uniform1f(u_time, now);
  gl.uniform2fv(u_pts, ptsFlat);
  gl.uniform1fv(u_ages, agesFlat);
  gl.uniform1i(u_count, points.length);
  gl.uniform2f(u_mouse, mouseX, mouseY);
  gl.uniform1f(u_mouseActive, mouseActive);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(frame);
}

resize();
requestAnimationFrame(frame);

let idleT = 0;
setInterval(() => {
  if (performance.now()/1000 - lastMoveTime > 1.2) {
    idleT += 1;
    const x = canvas.width * (0.3 + 0.4 * Math.sin(idleT * 0.7));
    const y = canvas.height * (0.5 + 0.15 * Math.cos(idleT * 0.5));
    addPoint(x, y);
  }
}, 1600);
