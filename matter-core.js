/* JARVIS / PARTICLE MATTER CORE
 * A compact living nucleus made from GPU particles; no explosion or rigid shell.
 * Motion and deformation are computed in the vertex shader.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

export function startMatterCore(mount,{reducedMotion=false}={}){
  const canvas=document.createElement('canvas');
  canvas.className='matter-webgl';
  canvas.setAttribute('aria-hidden','true');
  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
  }catch(error){canvas.remove();throw error}
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(42,1,.1,30);
  camera.position.set(0,0,5.85);
  const group=new THREE.Group();
  scene.add(group);
  const mobile=window.matchMedia('(max-width:680px)').matches;
  const lowMemory=(navigator.deviceMemory||8)<=4;
  const count=reducedMotion?24000:mobile||lowMemory?52000:115000;
  const positions=new Float32Array(count*3);
  const seeds=new Float32Array(count*3);
  const TAU=Math.PI*2;
  // Dense spherical cloud: mix an outer swirling mantle and a luminous inner core.
  // Deterministic distribution prevents visible empty sectors and moving clumps.
  for(let i=0;i<count;i++){
    const u=(i+.5)/count;
    const angle=i*2.399963229728653;
    const y=1-2*u;
    const horizontal=Math.sqrt(Math.max(0,1-y*y));
    const f=Math.sin(i*12.9898)*43758.5453;
    const rand=f-Math.floor(f);
    const shell=i%6!==0;
    const radius=shell?(.72+.70*Math.pow(rand,.53)):(.09+.78*Math.pow(rand,.85));
    positions[i*3]=Math.cos(angle)*horizontal*radius;
    positions[i*3+1]=y*radius;
    positions[i*3+2]=Math.sin(angle)*horizontal*radius;
    seeds[i*3]=rand;
    seeds[i*3+1]=((i*37)%997)/997;
    seeds[i*3+2]=((i*113)%991)/991;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,3));
  geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),2.5);
  const uniforms={
    uTime:{value:0},
    uVoice:{value:0},
    uPulse:{value:0},
    uDensity:{value:Math.min(window.devicePixelRatio||1,1.5)}
  };
  const material=new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`
      precision highp float;
      attribute vec3 aSeed;
      uniform float uTime,uVoice,uPulse,uDensity;
      varying vec3 vTint;
      varying float vAlpha;
      void main(){
        vec3 p=position;
        float radius=length(p);
        float phi=atan(p.z,p.x);
        float drift=uTime*(.29+.43*aSeed.x);
        // Particles orbit smoothly at distinct speeds, without flying apart.
        phi+=drift+sin(uTime*.56+p.y*4.8+aSeed.y*6.283)*(.16+.13*uVoice);
        float rXZ=length(p.xz);
        p.x=rXZ*cos(phi);
        p.z=rXZ*sin(phi);
        float wave=sin(phi*5.0+p.y*7.0+uTime*1.28+aSeed.z*6.283);
        float ripple=sin(p.y*11.0-phi*3.0+uTime*1.85+aSeed.y*6.283);
        float voiceShape=uVoice*(.115*wave+.075*ripple);
        p+=normalize(p+vec3(.0001))*(.045*wave+.027*ripple+voiceShape+uPulse*.035*ripple);
        p.y+=sin(phi*3.0+uTime*1.10+aSeed.x*7.0)*(.055+.060*uVoice);
        // A second soft current adds visible circulation, but particles remain bound.
        p.x+=sin(uTime*.83+p.y*4.0+aSeed.z*6.283)*(.032+.035*uVoice);
        vec4 view=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*view;
        float distanceScale=6.3/max(2.0,-view.z);
        float twinkle=.78+.22*sin(uTime*1.2+aSeed.y*16.0);
        float size=mix(1.0,2.25,pow(aSeed.x,4.0))*uDensity*distanceScale;
        gl_PointSize=clamp(size*(1.0+.23*uVoice+.12*uPulse)*twinkle,1.0,5.0);
        float core=1.0-smoothstep(.12,1.55,radius);
        vTint=mix(vec3(.05,.48,.78),vec3(.70,.96,1.0),core*.50+aSeed.y*.30);
        vAlpha=(.28+.52*core)*(.72+.28*aSeed.z)*(1.0+.26*uVoice);
      }`,
    fragmentShader:`
      precision mediump float;
      varying vec3 vTint;
      varying float vAlpha;
      void main(){
        float d=length(gl_PointCoord-vec2(.5));
        float feather=1.0-smoothstep(.16,.49,d);
        if(feather<.025)discard;
        gl_FragColor=vec4(vTint,feather*vAlpha);
      }`
  });
  const points=new THREE.Points(geometry,material);
  group.add(points);
  // A subtle softly glowing heart, still made of light rather than solid matter.
  const glowCanvas=document.createElement('canvas');
  glowCanvas.width=96;glowCanvas.height=96;
  const ctx=glowCanvas.getContext('2d');
  if(ctx){
    const gradient=ctx.createRadialGradient(48,48,1,48,48,48);
    gradient.addColorStop(0,'rgba(220,255,255,.93)');
    gradient.addColorStop(.16,'rgba(79,220,248,.50)');
    gradient.addColorStop(.50,'rgba(16,123,197,.12)');
    gradient.addColorStop(1,'rgba(9,58,110,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,96,96);
  }
  const texture=new THREE.CanvasTexture(glowCanvas);
  const glowMaterial=new THREE.SpriteMaterial({
    map:texture,transparent:true,opacity:.38,depthWrite:false,blending:THREE.AdditiveBlending
  });
  const light=new THREE.Sprite(glowMaterial);
  light.scale.set(2.1,2.1,1);
  scene.add(light);
  let speaking=false,voiceLevel=0,pulse=0,elapsed=0,dead=false,frame=0,observer;
  const resize=()=>{
    if(dead)return;
    const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
    renderer.render(scene,camera);
  };
  mount.appendChild(canvas);
  resize();
  observer=new ResizeObserver(resize);
  observer.observe(mount);
  const clock=new THREE.Clock();
  const animate=()=>{
    if(dead)return;
    frame=requestAnimationFrame(animate);
    const delta=Math.min(clock.getDelta(),.06);
    elapsed+=delta;
    const target=speaking?.40+.28*(.5+.5*Math.sin(elapsed*6.5))+.08*Math.sin(elapsed*10.2):0;
    voiceLevel+=(Math.max(0,target)-voiceLevel)*Math.min(1,delta*5.5);
    pulse=Math.max(0,pulse-delta*.65);
    uniforms.uTime.value=elapsed;
    uniforms.uVoice.value=voiceLevel;
    uniforms.uPulse.value=pulse;
    if(!reducedMotion){
      group.rotation.y=elapsed*.13;
      group.rotation.x=Math.sin(elapsed*.35)*.18;
      group.rotation.z=Math.sin(elapsed*.23)*.095;
      group.position.y=Math.sin(elapsed*.90)*.045;
    }
    light.scale.setScalar(2.1+.18*voiceLevel);
    glowMaterial.opacity=.30+.18*voiceLevel;
    if(!document.hidden)renderer.render(scene,camera);
  };
  if(!reducedMotion)animate();
  else renderer.render(scene,camera);
  return {
    setSpeaking(value){
      speaking=!!value;
      if(reducedMotion){
        uniforms.uVoice.value=speaking?.32:0;
        renderer.render(scene,camera);
      }
    },
    accent(){
      // No blast: just a small temporary emphasis in brightness and surface motion.
      pulse=.45;
      if(reducedMotion){uniforms.uPulse.value=.20;renderer.render(scene,camera)}
    },
    dispose(){
      if(dead)return;
      dead=true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      geometry.dispose();material.dispose();glowMaterial.dispose();texture.dispose();
      renderer.dispose();renderer.forceContextLoss();canvas.remove();
    }
  };
}
