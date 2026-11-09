/* JARVIS BOOT REACTOR — real-time WebGL, lightweight Three.js module.
 * Progressive enhancement: legacy CSS core remains if WebGL/CDN is unavailable.
 * The scene exists only while the boot dialog is visible.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

export function startBootReactor(stage,{reducedMotion=false}={}){
  const canvas=document.createElement('canvas');
  canvas.className='boot-core-canvas';
  canvas.setAttribute('aria-hidden','true');
  let renderer,scene,camera,raf=0,resizeObserver,dead=false,dragX=0,dragY=0,boost=0,voiceActive=false;
  try{
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.35;
  }catch(error){canvas.remove();throw error}

  const disposables=[];
  const geom=g=>{disposables.push(g);return g};
  const mat=m=>{disposables.push(m);return m};
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(38,1,.1,30);
  camera.position.set(0,0,7.7);
  const rig=new THREE.Group();scene.add(rig);
  // Energy-only 3D sphere: translucent flowing cyan plasma, no mechanical plates or eye-like iris.
  const orb=new THREE.Group();rig.add(orb);
  const uniforms={uTime:{value:0},uVoice:{value:0},uPulse:{value:0}};
  const plasma=mat(new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,side:THREE.FrontSide,
    vertexShader:`
      varying vec3 vNormal; varying vec3 vPosition;
      void main(){
        vNormal=normalize(normalMatrix*normal);
        vec4 eye=modelViewMatrix*vec4(position,1.0);
        vPosition=position;
        gl_Position=projectionMatrix*eye;
      }`,
    fragmentShader:`
      precision mediump float;
      varying vec3 vNormal; varying vec3 vPosition;
      uniform float uTime,uVoice,uPulse;
      void main(){
        vec3 n=normalize(vNormal);
        float edge=pow(1.0-max(n.z,0.0),2.2);
        float swirl=sin(vPosition.y*8.0+sin(vPosition.x*4.0+uTime*.22)*2.5+uTime*.39);
        float filaments=sin(vPosition.x*15.0-vPosition.z*9.0+uTime*.6+swirl*2.0);
        float field=smoothstep(.15,.92,swirl*.36+filaments*.23+.52);
        vec3 base=mix(vec3(.018,.085,.145),vec3(.10,.40,.55),field);
        vec3 hue=mix(base,vec3(.48,.91,1.0),edge*.65);
        float energy=(.06+.19*field+.30*edge)*(1.0+.22*uVoice+.25*uPulse);
        gl_FragColor=vec4(hue*1.24,energy);
      }`
  }));
  const sphere=add(orb,geom(new THREE.SphereGeometry(1.36,72,52)),plasma);
  const mist=mat(new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,
    vertexShader:`
      varying vec3 vNorm;
      void main(){vNorm=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`
      precision mediump float;
      varying vec3 vNorm;uniform float uTime,uVoice,uPulse;
      void main(){
        float f=pow(1.0-abs(normalize(vNorm).z),2.7);
        float breathe=.82+.10*sin(uTime*.9)+uVoice*.16+uPulse*.22;
        gl_FragColor=vec4(.12,.60,.87,f*.34*breathe);
      }`
  }));
  add(orb,geom(new THREE.SphereGeometry(1.43,64,40)),mist);
  const inner=mat(new THREE.MeshBasicMaterial({color:0x5bcce9,transparent:true,opacity:.10,depthWrite:false,blending:THREE.AdditiveBlending}));
  const center=add(orb,geom(new THREE.SphereGeometry(.61,48,32)),inner);
  const heart=mat(new THREE.MeshBasicMaterial({color:0xc2faff,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending}));
  add(orb,geom(new THREE.SphereGeometry(.24,32,24)),heart);
  // Very thin energy trails; just two to preserve the calm, mysterious look.
  const lineMat=mat(new THREE.LineBasicMaterial({color:0x7bdff5,transparent:true,opacity:.26,depthWrite:false}));
  const trail=new THREE.Group();rig.add(trail);
  for(const [rx,ry,radius] of [[.57,.13,1.66],[-.42,.82,1.55]]){
    const pts=[];
    for(let i=0;i<=140;i++){const angle=i*Math.PI*2/140;pts.push(Math.cos(angle)*radius,Math.sin(angle)*radius,0);}
    const geo=geom(new THREE.BufferGeometry());
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
    const orbit=new THREE.Group();orbit.rotation.set(rx,ry,0);orbit.add(new THREE.Line(geo,lineMat));trail.add(orbit);
  }
  // Sparse suspended particles, not a dense HUD grid.
  const count=85,positions=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const a=i*2.3999632297, z=1-2*(i+.5)/count, q=Math.sqrt(1-z*z),radius=1.55+(i%7)*.042;
    positions[i*3]=Math.cos(a)*q*radius;
    positions[i*3+1]=z*radius;
    positions[i*3+2]=Math.sin(a)*q*radius;
  }
  const dotsGeo=geom(new THREE.BufferGeometry());dotsGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const dotsMat=mat(new THREE.PointsMaterial({size:.025,color:0x9bdeed,transparent:true,opacity:.42,depthWrite:false}));
  const dots=new THREE.Points(dotsGeo,dotsMat);orb.add(dots);
  scene.add(new THREE.AmbientLight(0x96d6ed,.4));
  stage.append(canvas);
  stage.classList.add('boot-webgl-ready');
  const resize=()=>{
    if(dead)return;
    const width=Math.max(stage.clientWidth,1),height=Math.max(stage.clientHeight,1);
    renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();
    renderer.render(scene,camera);
  };
  resize();
  resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
  const clock=new THREE.Clock();let elapsed=0;
  const animate=()=>{
    if(dead)return;
    raf=requestAnimationFrame(animate);
    const dt=Math.min(clock.getDelta(),.06);elapsed+=dt;const t=elapsed;
    if(boost>0)boost=Math.max(0,boost-dt);
    const voiceWave=voiceActive?(0.5+0.5*Math.sin(t*7.0)):0;
    const voiceTarget=voiceActive?(0.45+0.30*voiceWave):0;
    uniforms.uTime.value=t;
    uniforms.uVoice.value+=(voiceTarget-uniforms.uVoice.value)*.075;
    uniforms.uPulse.value+=((boost>0?0.9:0)-uniforms.uPulse.value)*.09;
    if(!reducedMotion){
      orb.rotation.y=t*.075;
      orb.rotation.z=Math.sin(t*.21)*.085;
      trail.rotation.z=t*.065;
      trail.rotation.x=Math.sin(t*.24)*.20;
      rig.rotation.y+=(Math.sin(t*.28)*.13+dragX-rig.rotation.y)*.035;
      rig.rotation.x+=(Math.cos(t*.23)*.09+dragY-rig.rotation.x)*.035;
      rig.position.y=Math.sin(t*.70)*.052;
      center.scale.setScalar(1+.045*Math.sin(t*1.4)+.035*voiceWave);
      heart.opacity=.32+.045*Math.sin(t*1.5)+.07*voiceWave;
    }
    if(!document.hidden)renderer.render(scene,camera);
  };
  if(!reducedMotion)animate();else renderer.render(scene,camera);
  return {
    pointer(x,y){dragX=THREE.MathUtils.clamp(x*1.1,-.55,.55);dragY=THREE.MathUtils.clamp(y*.8,-.45,.45)},
    resetPointer(){dragX=0;dragY=0},
    pulse(){boost=1.3;if(reducedMotion){uniforms.uPulse.value=.7;renderer.render(scene,camera)}},
    setVoiceActive(active){voiceActive=!!active;if(reducedMotion){uniforms.uVoice.value=voiceActive?.5:0;renderer.render(scene,camera)}},
    stop(){
      if(dead)return;
      dead=true;cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      for(const o of disposables)o.dispose();
      renderer.dispose();renderer.forceContextLoss();canvas.remove();
      stage.classList.remove('boot-webgl-ready');
    }
  };
}
