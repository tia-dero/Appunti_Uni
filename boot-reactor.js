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
  const metal=mat(new THREE.MeshStandardMaterial({color:0x284a5c,metalness:.78,roughness:.28,side:THREE.DoubleSide}));
  const litMetal=mat(new THREE.MeshStandardMaterial({color:0x53899c,metalness:.7,roughness:.25,side:THREE.DoubleSide}));
  const accent=mat(new THREE.MeshBasicMaterial({color:0x75dffa,transparent:true,opacity:.86,depthWrite:false}));
  const faint=mat(new THREE.MeshBasicMaterial({color:0x5dc3e8,transparent:true,opacity:.34,depthWrite:false}));
  const bright=mat(new THREE.MeshBasicMaterial({color:0xbdf6ff,transparent:true,opacity:.94,depthWrite:false}));
  const lens=mat(new THREE.MeshPhysicalMaterial({color:0x236b89,metalness:.35,roughness:.13,transmission:.10,thickness:1.1,clearcoat:1,clearcoatRoughness:.12,emissive:0x146785,emissiveIntensity:.28}));
  const glow=mat(new THREE.MeshBasicMaterial({color:0x55c9f0,transparent:true,opacity:.11,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide}));
  const pivot=(rx,ry,rz)=>{const o=new THREE.Group();o.rotation.set(rx,ry,rz);rig.add(o);return o};
  const add=(parent,geo,material)=>{const o=new THREE.Mesh(geo,material);parent.add(o);return o};
  const ring=(parent,r,t,material)=>add(parent,geom(new THREE.TorusGeometry(r,t,14,128)),material);
  const gA=pivot(.65,.16,.16),gB=pivot(-.44,1.13,-.19),gC=pivot(1.17,-.38,.38);
  ring(gA,1.84,.073,metal);ring(gA,1.84,.018,accent);
  ring(gB,1.58,.055,litMetal);ring(gB,1.58,.014,accent);
  ring(gC,1.29,.052,metal);ring(gC,1.29,.014,faint);
  // Circular detailing along separate gyro planes.
  const dotGeo=geom(new THREE.SphereGeometry(.065,12,9));
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    const dot=add(gA,dotGeo,i%3===0?bright:litMetal);
    dot.position.set(Math.cos(a)*1.84,Math.sin(a)*1.84,0);
  }
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    const dot=add(gB,dotGeo,i%2===0?accent:metal);
    dot.position.set(Math.cos(a)*1.58,Math.sin(a)*1.58,0);
    dot.scale.setScalar(.76);
  }
  const housing=add(rig,geom(new THREE.SphereGeometry(1.03,48,32)),metal);
  housing.scale.z=.64;
  const innerRing=ring(rig,.96,.033,litMetal);innerRing.position.z=.49;
  const aperture=add(rig,geom(new THREE.CylinderGeometry(.83,.83,.1,96)),metal);
  aperture.rotation.x=Math.PI/2;aperture.position.z=.56;
  const lensSphere=add(rig,geom(new THREE.SphereGeometry(.72,48,32)),lens);lensSphere.position.z=.66;lensSphere.scale.z=.66;
  const iris=ring(rig,.55,.022,accent);iris.position.z=1.01;
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5;
    const tooth=add(rig,geom(new THREE.BoxGeometry(.075,.22,.045)),i%2?metal:litMetal);
    tooth.position.set(Math.cos(a)*.66,Math.sin(a)*.66,1.05);
    tooth.rotation.z=a-Math.PI/2;
  }
  const apertureGlow=add(rig,geom(new THREE.SphereGeometry(.46,32,24)),glow);
  apertureGlow.position.z=1.11;apertureGlow.scale.set(1.3,1.3,.32);
  const energy=add(rig,geom(new THREE.SphereGeometry(.22,32,24)),bright);energy.position.z=1.13;
  const halo=ring(rig,2.12,.009,faint);halo.rotation.x=.12;
  scene.add(new THREE.AmbientLight(0x7aafc9,.8));
  const key=new THREE.PointLight(0xb1efff,45,12,2);key.position.set(-2.8,3,4);scene.add(key);
  const side=new THREE.PointLight(0x236aaf,30,11,2);side.position.set(3,-2,-3);scene.add(side);
  const centerLight=new THREE.PointLight(0x48ccfc,8,5,2);centerLight.position.set(0,0,1.4);rig.add(centerLight);

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
    const velocity=reducedMotion?0:1+(boost>0?2.25:0)+(voiceActive?.24:0);
    if(!reducedMotion){
      gA.rotation.z+=.0028*velocity;
      gB.rotation.z-=.0037*velocity;
      gC.rotation.z+=.0019*velocity;
      rig.rotation.y+=(Math.sin(t*.27)*.26+dragX-rig.rotation.y)*.035;
      rig.rotation.x+=(Math.cos(t*.31)*.14+dragY-rig.rotation.x)*.035;
      rig.position.y=Math.sin(t*.85)*.045;
      // Voice animation: low-amplitude, non-strobing energy response while JARVIS speaks.
      const voiceWave=voiceActive?(Math.sin(t*8.2)*.5+.5):0;
      const brightness=.25+.22*(.5+.5*Math.sin(t*2.4));
      lens.emissiveIntensity=brightness+(boost>0?.38:0)+(voiceActive?.24+.26*voiceWave:0);
      energy.scale.setScalar(voiceActive?1+.13*voiceWave:1);
      centerLight.intensity=8+(boost>0?6:0)+(voiceActive?5+6*voiceWave:0);
      iris.scale.setScalar(voiceActive?1+.025*voiceWave:1);
    }
    if(!document.hidden)renderer.render(scene,camera);
  };
  if(!reducedMotion)animate();else renderer.render(scene,camera);
  return {
    pointer(x,y){dragX=THREE.MathUtils.clamp(x*1.1,-.55,.55);dragY=THREE.MathUtils.clamp(y*.8,-.45,.45)},
    resetPointer(){dragX=0;dragY=0},
    pulse(){boost=1.3},
    setVoiceActive(active){voiceActive=!!active;if(reducedMotion){lens.emissiveIntensity=voiceActive?.7:.28;renderer.render(scene,camera)}},
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
