/* JARVIS / AURORA CORE — translucent animated energy sphere.
 * Three.js WebGL enhancement for boot screen only; CSS fallback stays in index.html.
 * No mechanical shells, iris, or heavy gyroscopic hardware.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

export function startBootReactor(stage,{reducedMotion=false}={}){
  const canvas=document.createElement('canvas');
  canvas.className='boot-core-canvas';
  canvas.setAttribute('aria-hidden','true');
  let renderer,raf=0,observer,dead=false,voice=false,boost=0,px=0,py=0;
  try{
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.22;
  }catch(error){canvas.remove();throw error}
  const resources=[];
  const track=x=>(resources.push(x),x);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(40,1,.1,30);
  camera.position.z=7.1;
  const root=new THREE.Group();scene.add(root);
  const sphereGroup=new THREE.Group();root.add(sphereGroup);
  const state={time:{value:0},activity:{value:0},pulse:{value:0}};
  // Two-sided glass shell with edge lighting, dim at the center so the inner light remains visible.
  const glass=track(new THREE.ShaderMaterial({
    uniforms:state,transparent:true,depthWrite:false,side:THREE.FrontSide,
    vertexShader:`
      varying vec3 vNormal; varying vec3 vView; varying vec3 vObject;
      void main(){
        vec4 mv=modelViewMatrix*vec4(position,1.);
        vNormal=normalize(normalMatrix*normal);
        vView=normalize(-mv.xyz);vObject=position;
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`
      precision mediump float;
      uniform float time,activity,pulse;
      varying vec3 vNormal,vView,vObject;
      void main(){
        float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),2.7);
        float aurora=sin(vObject.y*5.7+sin(vObject.x*3.4+time*.33)*1.7+time*.28);
        float sweep=sin(vObject.x*8.4-vObject.z*4.2+time*.38+aurora);
        float stream=smoothstep(.35,1.,aurora*.57+sweep*.28+.48);
        vec3 cold=vec3(.055,.29,.50);
        vec3 bright=vec3(.34,.87,1.);
        vec3 col=mix(cold,bright,stream*.58+rim*.36);
        float a=.055+stream*.14+rim*(.36+activity*.12+pulse*.07);
        gl_FragColor=vec4(col,min(a,.76));
      }`
  }));
  const glassSphere=new THREE.Mesh(track(new THREE.SphereGeometry(1.43,72,52)),glass);
  sphereGroup.add(glassSphere);
  // A subtle second shell creates a soft, continuous atmospheric silhouette.
  const outer=track(new THREE.MeshBasicMaterial({
    color:0x69d8f5,transparent:true,opacity:.045,depthWrite:false,
    side:THREE.BackSide,blending:THREE.AdditiveBlending
  }));
  sphereGroup.add(new THREE.Mesh(track(new THREE.SphereGeometry(1.51,56,36)),outer));
  // Soft glow sprite texture; generated locally, no external assets.
  const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;
  const ctx=glowCanvas.getContext('2d');
  if(ctx){
    const grad=ctx.createRadialGradient(64,64,2,64,64,64);
    grad.addColorStop(0,'rgba(242,255,255,1)');
    grad.addColorStop(.12,'rgba(135,243,255,.88)');
    grad.addColorStop(.36,'rgba(57,184,238,.38)');
    grad.addColorStop(1,'rgba(25,91,168,0)');
    ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
  }
  const glowTex=track(new THREE.CanvasTexture(glowCanvas));
  const spriteMat=(opacity)=>track(new THREE.SpriteMaterial({
    map:glowTex,color:0x9aeaff,transparent:true,opacity,depthWrite:false,
    blending:THREE.AdditiveBlending
  }));
  const bigGlow=new THREE.Sprite(spriteMat(.47));bigGlow.scale.set(3.15,3.15,1);sphereGroup.add(bigGlow);
  const heartGlow=new THREE.Sprite(spriteMat(.95));heartGlow.scale.set(1.35,1.35,1);heartGlow.position.z=.18;sphereGroup.add(heartGlow);
  const innerGlow=new THREE.Sprite(spriteMat(.72));innerGlow.scale.set(.65,.65,1);innerGlow.position.z=.32;sphereGroup.add(innerGlow);
  // Long flowing 3D aurora strands. Curves are not rigid rings and pass around the light source.
  const ribbons=new THREE.Group();sphereGroup.add(ribbons);
  const ribbonColors=[0x89f1fa,0x2aafe8,0x7abcf7,0x86e6fa,0x5e80eb,0x36cde9];
  const ribbonMeshes=[];
  for(let k=0;k<6;k++){
    const points=[];
    const phase=k*Math.PI/3;
    for(let i=0;i<=120;i++){
      const t=i/120,theta=t*Math.PI*2.1+phase*.24;
      const radial=.73+.31*Math.sin(t*Math.PI*2.2+phase)+.12*Math.sin(t*Math.PI*5+phase);
      const y=.95*Math.sin(theta+phase)+.15*Math.sin(theta*2.3+phase);
      const x=radial*Math.cos(theta*1.11+phase);
      const z=radial*Math.sin(theta*1.11+phase)*.85;
      points.push(new THREE.Vector3(x,y,z));
    }
    const curve=new THREE.CatmullRomCurve3(points,false,'centripetal',.48);
    const material=track(new THREE.MeshBasicMaterial({
      color:ribbonColors[k],transparent:true,opacity:k%2?.28:.47,
      depthWrite:false,blending:THREE.AdditiveBlending
    }));
    const ribbon=new THREE.Mesh(track(new THREE.TubeGeometry(curve,180,k%2?.009:.014,5,false)),material);
    ribbons.add(ribbon);ribbonMeshes.push(ribbon);
  }
  // Two extremely fine orbital streaks to suggest three-dimensional motion, not a mechanical cage.
  const orbitLines=new THREE.Group();root.add(orbitLines);
  const lineMaterial=track(new THREE.LineBasicMaterial({
    color:0x7adaf8,transparent:true,opacity:.22,depthWrite:false
  }));
  for(const [rx,ry,radius] of [[.42,.35,1.67],[-.5,.8,1.62]]){
    const verts=[];
    for(let i=0;i<=140;i++){const a=i*Math.PI*2/140;verts.push(Math.cos(a)*radius,Math.sin(a)*radius,0)}
    const geometry=track(new THREE.BufferGeometry());
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    const line=new THREE.Line(geometry,lineMaterial);
    line.rotation.set(rx,ry,0);orbitLines.add(line);
  }
  // Small number of light motes floating on the sphere's exterior.
  const positions=[],sizes=100;
  for(let i=0;i<sizes;i++){
    const a=i*2.399963,b=1-2*(i+.5)/sizes,rad=1.54+(i%5)*.07,rr=Math.sqrt(1-b*b);
    positions.push(Math.cos(a)*rr*rad,b*rad,Math.sin(a)*rr*rad);
  }
  const starsGeo=track(new THREE.BufferGeometry());
  starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const starsMat=track(new THREE.PointsMaterial({
    color:0x8ad9f2,transparent:true,opacity:.43,size:.025,
    depthWrite:false,blending:THREE.AdditiveBlending
  }));
  sphereGroup.add(new THREE.Points(starsGeo,starsMat));
  stage.append(canvas);stage.classList.add('boot-webgl-ready');
  const resize=()=>{
    if(dead)return;
    const width=Math.max(1,stage.clientWidth),height=Math.max(1,stage.clientHeight);
    renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();renderer.render(scene,camera);
  };
  resize();
  observer=new ResizeObserver(resize);observer.observe(stage);
  const clock=new THREE.Clock();let elapsed=0;
  const animate=()=>{
    if(dead)return;
    raf=requestAnimationFrame(animate);
    const dt=Math.min(clock.getDelta(),.06);elapsed+=dt;
    if(boost>0)boost=Math.max(0,boost-dt);
    const target=voice?.65:0;
    state.activity.value+=(target-state.activity.value)*.08;
    state.pulse.value+=((boost>0?.75:0)-state.pulse.value)*.09;
    state.time.value=elapsed;
    if(!reducedMotion){
      sphereGroup.rotation.y=elapsed*.09;
      sphereGroup.rotation.x=Math.sin(elapsed*.18)*.095;
      ribbons.rotation.y=elapsed*-.18;
      ribbons.rotation.z=elapsed*.075;
      orbitLines.rotation.z=elapsed*.055;
      orbitLines.rotation.y=Math.sin(elapsed*.22)*.23;
      root.rotation.y+=(px+Math.sin(elapsed*.25)*.12-root.rotation.y)*.03;
      root.rotation.x+=(py+Math.cos(elapsed*.20)*.08-root.rotation.x)*.03;
      root.position.y=Math.sin(elapsed*.68)*.045;
      const wave=voice?(Math.sin(elapsed*8.1)*.5+.5):0;
      heartGlow.scale.setScalar(1.25+.1*Math.sin(elapsed*1.5)+.25*wave+.16*state.pulse.value);
      innerGlow.material.opacity=.66+.24*wave;
      bigGlow.material.opacity=.34+.10*Math.sin(elapsed*.86)+.12*state.activity.value;
      for(let i=0;i<ribbonMeshes.length;i++){
        ribbonMeshes[i].material.opacity=(i%2?.25:.41)+.08*Math.sin(elapsed*(.7+i*.05)+i)+.1*state.activity.value;
      }
    }
    if(!document.hidden)renderer.render(scene,camera);
  };
  if(!reducedMotion)animate();else renderer.render(scene,camera);
  return {
    pointer(x,y){px=THREE.MathUtils.clamp(x*.75,-.38,.38);py=THREE.MathUtils.clamp(y*.65,-.32,.32)},
    resetPointer(){px=0;py=0},
    pulse(){boost=1.2;if(reducedMotion){state.pulse.value=.6;renderer.render(scene,camera)}},
    setVoiceActive(value){voice=!!value;if(reducedMotion){state.activity.value=voice?.6:0;renderer.render(scene,camera)}},
    stop(){
      if(dead)return;
      dead=true;cancelAnimationFrame(raf);observer?.disconnect();
      for(const item of resources)item.dispose();
      renderer.dispose();renderer.forceContextLoss();canvas.remove();
      stage.classList.remove('boot-webgl-ready');
    }
  };
}
