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
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float sdTorus(vec3 p,vec2 t){return length(vec2(length(p.xz)-t.x,p.y))-t.y;}
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.0)/k;return min(a,b)-h*h*k*.25;}
float mapScene(vec3 p){
 vec3 q=p;q.xz=rot(.34+u_pointer.x*.42+sin(u_time*.17)*.08)*q.xz;q.xy=rot(-.32+(u_pointer.y-.5)*.26)*q.xy;
 float warp=noise(q*3.4+vec3(0.,u_time*.13,0.))-.5;
 q.y+=sin(q.x*3.2+u_time*.38)*.045+cos(q.z*4.0-u_time*.28)*.035+warp*.035;
 vec3 a=q;a.xy=rot(.48+sin(u_time*.13)*.12)*a.xy;
 vec3 b=q;b.yz=rot(1.12+u_pointer.x*.18)*b.yz;b.xz=rot(-.58+u_time*.09)*b.xz;
 float ringA=sdTorus(a,vec2(.72,.145)),ringB=sdTorus(b,vec2(.55,.095));
 float core=length(q*vec3(1.0,.84,1.0))-.29;
 float sculpture=smin(smin(ringA,ringB,.22),core,.12);
 return sculpture+sin(atan(q.z,q.x)*19.0+q.y*22.0+u_time*.18)*.006;
}
vec3 normalAt(vec3 p){vec2 e=vec2(.0015,0.);return normalize(vec3(mapScene(p+e.xyy)-mapScene(p-e.xyy),mapScene(p+e.yxy)-mapScene(p-e.yxy),mapScene(p+e.yyx)-mapScene(p-e.yyx)));}
void main(){
 vec2 uv=(v_uv-.5)*vec2(u_resolution.x/u_resolution.y,1.);
 vec3 ro=vec3(0.,0.,3.35),rd=normalize(vec3(uv,-1.72)),pos=ro;
 float travel=0.,hit=0.,glow=0.;
 for(int i=0;i<112;i++){pos=ro+rd*travel;float d=mapScene(pos);glow+=.0018/(.035+abs(d)*abs(d)*28.);if(d<.0015){hit=1.;break;}travel+=max(d*.72,.004);if(travel>7.5)break;}
 vec3 deep=vec3(.018,.035,.047),haze=vec3(.11,.22,.23);
 float halo=exp(-length(uv-vec2(-.08,.04))*2.8);
 vec3 color=mix(deep,haze,halo*.45)+vec3(.18,.55,.48)*glow*.28;
 if(hit>.5){
  vec3 n=normalAt(pos),v=normalize(ro-pos),l1=normalize(vec3(-.62,.88,1.2)),l2=normalize(vec3(.9,-.4,.7));
  float diffuse=max(dot(n,l1),0.),rim=pow(1.-max(dot(n,v),0.),2.6);
  float spec=pow(max(dot(n,normalize(l1+v)),0.),96.),spec2=pow(max(dot(n,normalize(l2+v)),0.),34.);
  float ir=sin(pos.y*7.+atan(pos.z,pos.x)*3.+u_time*.24)*.5+.5;
  vec3 jade=vec3(.23,.78,.69),acid=vec3(.78,.96,.42),silver=vec3(.64,.76,.78);
  vec3 material=mix(silver,mix(jade,acid,smoothstep(.25,.9,ir)),.58+rim*.28);
  color=material*(.18+diffuse*.75)+vec3(.86,.97,.83)*spec*1.45+vec3(.4,.85,.79)*spec2*.52+vec3(.25,.8,.68)*rim*.72+vec3(.1,.32,.28)*glow*.16;
 }
 float vignette=1.-smoothstep(.45,1.05,length(uv));color*=.62+.38*vignette;
 gl_FragColor=vec4(color,hit>.5?1.0:.93);
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
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false, powerPreference: "low-power" });
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
    let pointerX = 0.5, pointerY = 0.5, frame = 0;
    const start = performance.now();
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
    let lastFrame = 0;
    const animate = (now: number) => { if (now - lastFrame >= 33) { draw(); lastFrame = now; } frame = window.requestAnimationFrame(animate); };
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
