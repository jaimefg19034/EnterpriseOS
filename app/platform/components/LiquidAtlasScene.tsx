"use client";

import { useEffect, useRef } from "react";

const vertexSource = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const fragmentSource = `
precision highp float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), f.x),
             mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x), f.y);
}
mat2 rotate2d(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}
void main() {
  vec2 uv = v_uv;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  vec2 pointer = (u_pointer - 0.5) * vec2(1.7, 1.0);
  float t = u_time * 0.16;
  p -= pointer * 0.10;
  float n = noise(p * 3.0 + vec2(t, -t)) - 0.5;
  vec2 q = p;
  q += 0.12 * vec2(sin(p.y * 5.0 + t * 2.0), cos(p.x * 4.0 - t)) + n * 0.09;
  q = rotate2d(-0.24 + sin(t) * 0.07) * q;
  float radius = length(q * vec2(0.92, 1.18));
  float angle = atan(q.y, q.x);
  float wave = sin(angle * 3.0 + t * 2.1 + n * 3.0) * 0.045;
  float ring = abs(radius - (0.245 + wave));
  float inner = smoothstep(0.105, 0.0, ring);
  float outer = exp(-ring * 18.0) * 0.30;
  float filament = exp(-abs(radius - (0.34 + sin(angle * 2.0 - t) * 0.035)) * 42.0) * 0.28;
  float core = exp(-length(q - vec2(-0.035, 0.025)) * 7.0) * 0.34;
  float light = max(inner * 0.42, max(outer, filament)) + core;
  float hue = 0.5 + 0.5 * sin(angle * 1.4 + t * 2.0 + n * 5.0);
  vec3 deep = vec3(0.12, 0.24, 0.43);
  vec3 ice = vec3(0.55, 0.72, 1.0);
  vec3 teal = vec3(0.22, 0.83, 0.72);
  vec3 violet = vec3(0.62, 0.52, 0.98);
  vec3 metal = mix(mix(ice, teal, smoothstep(0.15, 0.85, hue)), violet, smoothstep(0.72, 1.0, hue) * 0.52);
  float specular = pow(max(0.0, dot(normalize(vec3(q.x, q.y, 0.16)), normalize(vec3(-0.5, 0.7, 0.9)))), 22.0);
  vec3 color = deep * (0.12 + light * 0.5) + metal * light * 0.92 + ice * specular * 0.24;
  float halo = exp(-length(q) * 3.2) * 0.13;
  color += mix(teal, violet, hue) * halo;
  float vignette = smoothstep(0.88, 0.18, length((uv - 0.5) * vec2(1.1, 1.0)));
  float alpha = clamp((light * 0.9 + halo) * vignette, 0.0, 0.88);
  gl_FragColor = vec4(color, alpha);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function LiquidAtlasScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, "u_resolution");
    const pointer = gl.getUniformLocation(program, "u_pointer");
    const time = gl.getUniformLocation(program, "u_time");
    let pointerX = 0.5, pointerY = 0.5, frame = 0, start = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onPointer = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointerX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      pointerY = 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    };
    const onLeave = () => { pointerX = 0.5; pointerY = 0.5; };
    host.addEventListener("pointermove", onPointer, { passive: true });
    host.addEventListener("pointerleave", onLeave);

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      draw();
    };
    const draw = () => {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(pointer, pointerX, pointerY);
      gl.uniform1f(time, reduced ? 0 : (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const animate = () => { draw(); frame = window.requestAnimationFrame(animate); };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    if (!reduced) frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("pointermove", onPointer);
      host.removeEventListener("pointerleave", onLeave);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return <canvas ref={canvasRef} className="p-liquid-atlas" aria-hidden="true" />;
}
