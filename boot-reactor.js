/* JARVIS / REACTOR HUD — animated cinematic circular hologram.
 * Three.js WebGL enhancement for boot screen only; CSS fallback stays in index.html.
 * Concentric luminous segments with realistic depth, no external image assets.
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
  // Cinematic circular HUD: multiple independently rotating concentric rings.
  // Three.js geometry renders real depth and subtle movement without an unsettling eye.
  const gyro=new THREE.Group();root.add(gyro);
  const cyan=track(new THREE.MeshBasicMaterial({color:0x7ceeff,transparent:true,opacity:.91,depthWrite:false,side:THREE.DoubleSide}));
  const blue=track(new THREE.MeshBasicMaterial({color:0x1c87b9,transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide}));
  const pale=track(new THREE.MeshBasicMaterial({color:0xc1f9ff,transparent:true,opacity:.96,depthWrite:false,side:THREE.DoubleSide}));
  const red=track(new THREE.MeshBasicMaterial({color:0xff7175,transparent:true,opacity:.82,depthWrite:false,side:THREE.DoubleSide}));
  const graphite=track(new THREE.MeshStandardMaterial({color:0x163340,metalness:.68,roughness:.42,side:THREE.DoubleSide}));
  const trackMesh=(geo,material,parent=gyro)=>{
    const mesh=new THREE.Mesh(track(geo),material);parent.add(mesh);return mesh;
  };
  const rotor=(depth=0)=>{
    const g=new THREE.Group();g.position.z=depth;gyro.add(g);return g;
  };
  const outer=rotor(-.22),middle=rotor(0),inner=rotor(.19),details=rotor(.25);
  const torus=(group,r,w,material)=>trackMesh(new THREE.TorusGeometry(r,w,8,144),material,group);
  torus(outer,1.87,.013,blue);torus(outer,1.66,.024,cyan);
  torus(middle,1.42,.027,graphite);torus(middle,1.27,.012,blue);
  torus(inner,1.06,.022,cyan);torus(inner,.86,.012,blue);
  torus(details,.69,.012,cyan);torus(details,.53,.024,graphite);
  // Segmented luminous arcs: original circular reactor motif.
  const segment=(parent,r,thickness,start,length,material)=>{
    const o=trackMesh(new THREE.RingGeometry(r,r+thickness,28,1,start,length),material,parent);
    return o;
  };
  for(let i=0;i<14;i++){
    const a=i*Math.PI*2/14;
    segment(outer,1.73,.092,a+.016,.19,i%5===0?red:i%3===0?pale:blue);
    segment(middle,1.34,.10,a+.06,.235,i%4===0?pale:cyan);
  }
  for(let i=0;i<12;i++){
    const a=i*Math.PI*2/12;
    segment(inner,.92,.13,a+.03,.27,i%4===0?pale:cyan);
  }
  // Dozens of delicate technical ticks, deliberately restrained brightness.
  const tickMat=track(new THREE.LineBasicMaterial({color:0x86d5e8,transparent:true,opacity:.39,depthWrite:false}));
  for(const [group,r,count,majorEvery] of [[outer,1.96,96,8],[middle,1.55,72,6],[details,.74,36,6]]){
    const vertices=[];
    for(let i=0;i<count;i++){
      const a=i*Math.PI*2/count;
      const len=i%majorEvery===0?.085:.035;
      vertices.push(Math.cos(a)*r,Math.sin(a)*r,0,Math.cos(a)*(r-len),Math.sin(a)*(r-len),0);
    }
    const g=track(new THREE.BufferGeometry());
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    group.add(new THREE.LineSegments(g,tickMat));
  }
  // Three shallow concentric discs to suggest a projected volume.
  const glass=track(new THREE.MeshBasicMaterial({color:0x167bac,transparent:true,opacity:.08,side:THREE.DoubleSide,depthWrite:false}));
  for(const [r,z] of [[1.53,-.32],[1.14,-.15],[.72,.08]]){
    const disc=trackMesh(new THREE.CircleGeometry(r,96),glass);
    disc.position.z=z;
  }
  const centerFrame=trackMesh(new THREE.TorusGeometry(.39,.028,12,96),pale,details);
  centerFrame.position.z=.09;
  const centerDisc=trackMesh(new THREE.CircleGeometry(.345,72),blue,details);
  centerDisc.position.z=.10;
  // Soft energy center: canvas-generated glow texture with no external assets.
  const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;
  const ctx=glowCanvas.getContext('2d');
  if(ctx){
    const gradient=ctx.createRadialGradient(64,64,1,64,64,64);
    gradient.addColorStop(0,'rgba(246,255,255,1)');
    gradient.addColorStop(.13,'rgba(167,251,255,.95)');
    gradient.addColorStop(.35,'rgba(60,193,239,.52)');
    gradient.addColorStop(1,'rgba(10,79,155,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  }
  const glowTex=track(new THREE.CanvasTexture(glowCanvas));
  const glowMat=track(new THREE.SpriteMaterial({
    map:glowTex,color:0x95f0ff,transparent:true,opacity:.85,
    depthWrite:false,blending:THREE.AdditiveBlending
  }));
  const glow=new THREE.Sprite(glowMat);glow.position.z=.58;glow.scale.set(1.44,1.44,1);root.add(glow);
  // Tiny light pulses along the reactor rings.
  const points=[];
  for(let i=0;i<40;i++){
    const a=i*2.39996,r=1.12+(i%3)*.19;
    points.push(Math.cos(a)*r,Math.sin(a)*r,.20);
  }
  const pointsGeo=track(new THREE.BufferGeometry());
  pointsGeo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  const pointsMat=track(new THREE.PointsMaterial({size:.023,color:0x9be8f9,transparent:true,opacity:.46,depthWrite:false}));
  details.add(new THREE.Points(pointsGeo,pointsMat));
  scene.add(new THREE.AmbientLight(0x7cbbe6,.7));
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
    const wave=voice?(Math.sin(elapsed*7.5)*.5+.5):0;
    if(!reducedMotion){
      outer.rotation.z=elapsed*.12;
      middle.rotation.z=-elapsed*.16;
      inner.rotation.z=elapsed*.21;
      details.rotation.z=-elapsed*.10;
      gyro.rotation.x=Math.sin(elapsed*.37)*.105;
      gyro.rotation.y=Math.cos(elapsed*.29)*.12;
      root.rotation.y+=(px-root.rotation.y)*.04;
      root.rotation.x+=(py-root.rotation.x)*.04;
      root.position.y=Math.sin(elapsed*.70)*.035;
      glow.scale.setScalar(1.35+.085*Math.sin(elapsed*1.5)+.17*wave+.15*(boost>0?1:0));
      glowMat.opacity=.66+.19*wave+.12*(boost>0?1:0);
    }
    if(!document.hidden)renderer.render(scene,camera);
  };
  if(!reducedMotion)animate();else renderer.render(scene,camera);
  return {
    pointer(x,y){px=THREE.MathUtils.clamp(x*.75,-.38,.38);py=THREE.MathUtils.clamp(y*.65,-.32,.32)},
    resetPointer(){px=0;py=0},
    pulse(){boost=1.2;if(reducedMotion){glowMat.opacity=.95;renderer.render(scene,camera)}},
    setVoiceActive(value){voice=!!value;if(reducedMotion){glowMat.opacity=voice?.92:.68;renderer.render(scene,camera)}},
    stop(){
      if(dead)return;
      dead=true;cancelAnimationFrame(raf);observer?.disconnect();
      for(const item of resources)item.dispose();
      renderer.dispose();renderer.forceContextLoss();canvas.remove();
      stage.classList.remove('boot-webgl-ready');
    }
  };
}
