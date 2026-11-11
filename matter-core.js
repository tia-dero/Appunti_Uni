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
  camera.position.set(0,0,5.45);
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
        // Layered helical currents: particles travel in separate gently twisting streams.
        // Every position is recalculated from its original point, avoiding cumulative drift.
        float band=sin(p.y*5.6+atan(p.z,p.x)*2.0+uTime*.9);
        float spiralMix=smoothstep(.35,.91,band*.5+.5);
        float streamSpeed=mix(.23,.69,aSeed.x)+.12*spiralMix;
        float twist=sin(uTime*.44+p.y*5.8+aSeed.y*6.283)*(.10+.07*uVoice);
        phi+=uTime*streamSpeed+twist;
        float rXZ=length(p.xz);
        p.x=rXZ*cos(phi);
        p.z=rXZ*sin(phi);
        // Brighter, faster bands cross the surface as flowing energy, not rigid rings.
        float helix=sin(phi*3.0+p.y*9.0-uTime*2.4+aSeed.z*2.3);
        float helixMask=smoothstep(.56,.94,.5+.5*helix);
        float wave=sin(phi*5.0+p.y*7.0+uTime*1.55+aSeed.z*6.283);
        float ripple=sin(p.y*11.0-phi*3.0+uTime*2.05+aSeed.y*6.283);
        // The voice only raises surface ripples and brightness; the cloud never bursts.
        float voiceShape=uVoice*(.125*wave+.085*ripple);
        float radial=.028*wave+.025*ripple+.045*helixMask+voiceShape+uPulse*.030*ripple;
        p+=normalize(p+vec3(.0001))*radial;
        p.y+=sin(phi*3.0+uTime*1.20+aSeed.x*7.0)*(.052+.075*uVoice);
        p.x+=sin(uTime*1.0+p.y*4.0+aSeed.z*6.283)*(.031+.045*uVoice);
        vec4 view=modelViewMatrix*vec4(p,1.0);
        // Subtle independent micro-drift gives each particle its own 3D path.
        // Deterministic seed-based motion keeps the spherical silhouette intact.
        float driftPhase=uTime*(.22+.24*aSeed.z)+aSeed.y*6.283185;
        vec3 drift=vec3(
          sin(driftPhase*1.13+aSeed.x*9.0),
          cos(driftPhase*.89+aSeed.z*7.0),
          sin(driftPhase*1.31+aSeed.y*8.0)
        )*(.010+.018*aSeed.x);
        p+=drift;
        view=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*view;
        // Perspective and camera-space depth: foreground specks feel closer,
        // while those behind the center are smaller and more subdued.
        float nearDepth=smoothstep(-1.45,1.45,p.z);
        float perspective=6.3/max(2.0,-view.z);
        float twinklePhase=uTime*(.85+1.25*aSeed.x)+aSeed.y*37.7;
        float twinkle=.81+.19*sin(twinklePhase);
        float shimmer=.92+.08*sin(twinklePhase*.39+aSeed.z*19.0);
        float size=mix(.85,2.1,pow(aSeed.x,4.0))*uDensity*perspective;
        float depthSize=mix(.76,1.19,nearDepth);
        gl_PointSize=clamp(size*depthSize*(1.0+.24*uVoice+.10*uPulse+.22*helixMask)*twinkle,1.0,4.8);
        float core=1.0-smoothstep(.12,1.55,radius);
        float ribbonLight=.42*helixMask*(.60+.40*spiralMix);
        float depthLight=mix(.64,1.12,nearDepth);
        vTint=mix(vec3(.035,.36,.63),vec3(.69,.96,1.0),clamp(core*.48+aSeed.y*.22+ribbonLight+nearDepth*.10,0.0,1.0));
        vAlpha=(.28+.49*core+.24*ribbonLight)*(.72+.28*aSeed.z)*depthLight*shimmer*(1.0+.30*uVoice);
      }`,
    fragmentShader:`
      precision mediump float;
      varying vec3 vTint;
      varying float vAlpha;
      void main(){
        float d=length(gl_PointCoord-vec2(.5));
        // Soft particle disks with a tiny luminous heart: no harsh square pixels.
        float feather=1.0-smoothstep(.11,.49,d);
        float inner=1.0-smoothstep(.02,.22,d);
        if(feather<.025)discard;
        float luminosity=feather*(.82+.18*inner);
        gl_FragColor=vec4(vTint,luminosity*vAlpha);
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
  let speaking=false,voiceLevel=0,audioLevel=null,pulse=0,elapsed=0,dead=false,frame=0,observer;
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
    // Use measured microphone-free MP3 output amplitude when supplied; otherwise
    // retain the gentle synthetic motion for environments without Web Audio.
    const target=speaking?(audioLevel===null?.48+.20*(.5+.5*Math.sin(elapsed*6.7)):audioLevel):0;
    voiceLevel+=(Math.max(0,target)-voiceLevel)*Math.min(1,delta*(target>voiceLevel?19:9));
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
    light.scale.setScalar(2.1+.28*voiceLevel);
    glowMaterial.opacity=.30+.26*voiceLevel;
    if(!document.hidden)renderer.render(scene,camera);
  };
  if(!reducedMotion)animate();
  else renderer.render(scene,camera);
  return {
    setAudioLevel(value){
      audioLevel=value==null?null:THREE.MathUtils.clamp(Number(value)||0,0,1);
      if(reducedMotion){uniforms.uVoice.value=audioLevel||0;renderer.render(scene,camera);}
    },
    setSpeaking(value){
      speaking=!!value;
      if(!speaking)audioLevel=null;
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
