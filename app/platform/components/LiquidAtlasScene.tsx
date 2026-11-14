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

mat2 rot(float a) { float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float hash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float noise(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float scene(vec3 p) {
  p.xz=rot(0.36+u_pointer.x*0.42+sin(u_time*0.18)*0.07)*p.xz;
  p.xy=rot(-0.38+(u_pointer.y-0.5)*0.28)*p.xy;
  float n=noise(p*3.8+vec3(0.0,u_time*0.12,0.0));
  p.y += sin(p.x*3.4+u_time*0.45)*0.035 + cos(p.z*4.2-u_time*0.34)*0.025 + (n-0.5)*0.045;
  float major=0.78 + 0.035*sin(atan(p.z,p.x)*3.0+u_time*0.24);
  return length(vec2(length(p.xz)-major,p.y))-0.205;
}
vec3 normalAt(vec3 p) {
  vec2 e=vec2(0.0015,0.0);
  return normalize(vec3(scene(p+e.xyy)-scene(p-e.xyy),scene(p+e.yxy)-scene(p-e.yxy),scene(p+e.yyx)-scene(p-e.yyx)));
}
void main() {
  vec2 uv=(v_uv-0.5)*vec2(u_resolution.x/u_resolution.y,1.0);
  vec3 ro=vec3(0.0,0.0,3.25);
  vec3 rd=normalize(vec3(uv,-1.72));
  float travel=0.0; float hit=0.0; vec3 pos=ro;
  for(int i=0;i<76;i++) {
    pos=ro+rd*travel;
    float d=scene(pos);
    if(d<0.0018) { hit=1.0; break; }
    travel+=max(d*0.72,0.006);
    if(travel>7.0) break;
  }
  vec3 bgA=vec3(0.035,0.075,0.13);
  vec3 bgB=vec3(0.12,0.22,0.34);
  float halo=exp(-length(uv-vec2(-0.05,0.02))*3.0);
  vec3 color=mix(bgA,bgB,halo*0.42);
  float alpha=halo*0.18;
  if(hit>0.5) {
    vec3 n=normalAt(pos);
    vec3 viewDir=normalize(ro-pos);
    vec3 lightDir=normalize(vec3(-0.55,0.8,1.2));
    vec3 halfDir=normalize(lightDir+viewDir);
    float diffuse=max(dot(n,lightDir),0.0);
    float spec=pow(max(dot(n,halfDir),0.0),72.0);
    float fresnel=pow(1.0-max(dot(n,viewDir),0.0),2.4);
    float bands=0.5+0.5*sin(pos.y*8.0+atan(pos.z,pos.x)*2.0+u_time*0.3);
    vec3 titanium=vec3(0.42,0.62,0.82);
    vec3 cyan=vec3(0.18,0.86,0.78);
    vec3 violet=vec3(0.66,0.53,1.0);
    vec3 iridescence=mix(cyan,violet,smoothstep(0.12,0.9,bands));
    vec3 material=mix(titanium,iridescence,0.48+fresnel*0.4);
    color=material*(0.22+diffuse*0.72)+vec3(0.68,0.82,1.0)*spec*1.35+iridescence*fresnel*0.72;
    color+=vec3(0.22,0.55,0.95)*pow(max(dot(reflect(-lightDir,n),viewDir),0.0),18.0)*0.22;
    alpha=0.96;
  }
  gl_FragColor=vec4(color,alpha);
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
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 0.85 : 1.15);
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
    let lastFrame = 0;\n    const animate = (now: number) => { if (now - lastFrame >= 33) { draw(); lastFrame = now; } frame = window.requestAnimationFrame(animate); };
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
