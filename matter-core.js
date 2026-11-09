/* New from-scratch material core. Only instantiated while the intro is visible. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
export function startMatterCore(mount,{reducedMotion=false}={}){
  let renderer,frame=0,disposed=false,observer;
  const canvas=document.createElement('canvas');canvas.className='matter-webgl';canvas.setAttribute('aria-hidden','true');
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(40,1,.1,30);camera.position.z=6;
  const group=new THREE.Group();scene.add(group);
  const state={uTime:{value:0},uVoice:{value:0},uAccent:{value:0}};
  const material=new THREE.ShaderMaterial({
    uniforms:state,transparent:true,depthWrite:false,side:THREE.FrontSide,
    vertexShader:`
      uniform float uTime,uVoice,uAccent;
      varying vec3 vNormal;varying vec3 vLocal;varying vec3 vEye;
      void main(){
        vec3 p=position;vec3 n=normalize(position);
        float fluid=sin(n.x*9.0+uTime*1.3)*sin(n.y*7.0-uTime*.72)
                   +sin(n.z*13.0+n.y*5.0+uTime*.8)*.55;
        float displacement=(.038+.14*uVoice+.10*uAccent)*fluid;
        p+=n*displacement;
        vec4 view=modelViewMatrix*vec4(p,1.);
        vEye=normalize(-view.xyz);vNormal=normalize(normalMatrix*n);vLocal=p;
        gl_Position=projectionMatrix*view;
      }`,
    fragmentShader:`
      precision mediump float;
      uniform float uTime,uVoice,uAccent;
      varying vec3 vNormal,vLocal,vEye;
      void main(){
        float edge=pow(1.-abs(dot(normalize(vNormal),normalize(vEye))),2.3);
        float turbulence=sin(vLocal.y*9.0+sin(vLocal.x*6.0+uTime*.4)*2.+uTime*.7);
        float threads=sin(vLocal.x*16.-vLocal.z*12.+uTime*1.4+turbulence*2.);
        float luminous=smoothstep(.13,.85,turbulence*.37+threads*.23+.48);
        vec3 c=mix(vec3(.035,.20,.37),vec3(.42,.90,1.),luminous*.77+edge*.19);
        float alpha=.17+.24*luminous+.52*edge+.12*uVoice+.08*uAccent;
        gl_FragColor=vec4(c,min(alpha,.96));
      }`
  });
  const geometry=new THREE.SphereGeometry(1.37,96,64);
  const matter=new THREE.Mesh(geometry,material);group.add(matter);
  const haloMaterial=new THREE.MeshBasicMaterial({color:0x5fd9f5,transparent:true,opacity:.13,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending});
  const haloGeometry=new THREE.SphereGeometry(1.49,48,32);
  const halo=new THREE.Mesh(haloGeometry,haloMaterial);group.add(halo);
  // Delicate interior glow, with no artificial eyes or metal rings.
  const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;
  const ctx=glowCanvas.getContext('2d');
  if(ctx){
    const gradient=ctx.createRadialGradient(64,64,2,64,64,64);
    gradient.addColorStop(0,'rgba(239,255,255,1)');
    gradient.addColorStop(.18,'rgba(127,230,253,.75)');
    gradient.addColorStop(.5,'rgba(36,135,198,.24)');
    gradient.addColorStop(1,'rgba(12,50,108,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  }
  const texture=new THREE.CanvasTexture(glowCanvas);
  const glowMaterial=new THREE.SpriteMaterial({map:texture,transparent:true,opacity:.68,depthWrite:false,blending:THREE.AdditiveBlending});
  const light=new THREE.Sprite(glowMaterial);light.scale.set(2.7,2.7,1);light.position.z=.1;scene.add(light);
  let speaking=false,target=0,accent=0,t=0;
  mount.appendChild(canvas);
  const resize=()=>{if(disposed)return;const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera)};
  resize();
  observer=new ResizeObserver(resize);observer.observe(mount);
  const clock=new THREE.Clock();
  const render=()=>{
    if(disposed)return;frame=requestAnimationFrame(render);
    t+=Math.min(.05,clock.getDelta());
    const shimmer=speaking?.40+.36*(.5+.5*Math.sin(t*7.1)):0;
    target+=(shimmer-target)*.07;
    accent*=.93;
    state.uTime.value=t;state.uVoice.value=target;state.uAccent.value=accent;
    if(!reducedMotion){group.rotation.y=t*.075;group.rotation.x=Math.sin(t*.25)*.12;group.position.y=Math.sin(t*.68)*.035}
    light.scale.setScalar(2.65+target*.32+accent*.23);
    glowMaterial.opacity=.54+target*.24+accent*.14;
    if(!document.hidden)renderer.render(scene,camera);
  };
  if(!reducedMotion)render();else renderer.render(scene,camera);
  return {
    setSpeaking(value){speaking=!!value;if(reducedMotion){state.uVoice.value=speaking?.65:0;renderer.render(scene,camera)}},
    accent(){accent=1;if(reducedMotion){state.uAccent.value=1;renderer.render(scene,camera)}},
    dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer?.disconnect();geometry.dispose();haloGeometry.dispose();material.dispose();haloMaterial.dispose();glowMaterial.dispose();texture.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove()}
  };
}
