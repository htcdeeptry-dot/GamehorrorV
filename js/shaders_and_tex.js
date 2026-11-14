(function (G) {
  'use strict';
  G.TextureFactory = class TextureFactory {
    constructor(quality) {
      this.size = G.Config.quality[quality || 'high'].textureSize;
      this.cache = new Map(); this.materials = new Map(); this.owned = new Set();
    }
    canvas(width, height) {
      const c = document.createElement('canvas'); c.width = width; c.height = height || width; return c;
    }
    texture(canvas, repeat) {
      const t = new THREE.CanvasTexture(canvas);
      t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
      if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
      this.owned.add(t); return t;
    }
    get(name) {
      if (this.cache.has(name)) return this.cache.get(name);
      const c = this.canvas(this.size), ctx = c.getContext('2d'), n = c.width;
      const seed = Array.from(name).reduce((a, ch) => Math.imul(a, 31) + ch.charCodeAt(0), G.Config.seed);
      const r = G.Utils.seededRandom(seed);
      const palettes = { wood: [66, 48, 35], wall: [105, 107, 87], stone: [94, 98, 99], ground: [50, 47, 39], roof: [64, 64, 68], cloth: [173, 168, 147], blood: [96, 12, 20], paper: [188, 151, 84] };
      const base = palettes[name] || [120, 116, 104];
      const pixels = ctx.createImageData(n, n);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const i = (y * n + x) * 4;
        let grain = (r() - .5) * 27 + Math.sin(x * .031) * Math.sin(y * .046) * 9;
        if (name === 'wood') grain += Math.sin(x * .13 + Math.sin(y * .014) * 2) * 13 + Math.sin(x * .8 + Math.sin(y * .02)) * 5;
        if (name === 'cloth') grain += (x % 4 === 0 || y % 4 === 0) ? -18 : 4;
        for (let k = 0; k < 3; k++) pixels.data[i + k] = base[k] + grain;
        pixels.data[i + 3] = 255;
      }
      ctx.putImageData(pixels, 0, 0);
      if (name === 'wood') {
        for (let i = 0; i < 8; i++) {
          const x = i * n / 8; ctx.fillStyle = '#17120d'; ctx.fillRect(x, 0, Math.max(2, n / 256), n);
          ctx.fillStyle = '#99806455'; ctx.fillRect(x + 3, 0, 2, n);
          for (const y of [n * .08, n * .92]) { ctx.fillStyle = '#191c1d'; ctx.beginPath(); ctx.arc(x + n / 16, y, n / 220, 0, Math.PI * 2); ctx.fill(); }
        }
        for (let i = 0; i < 24; i++) {
          const x = r() * n, y = r() * n;
          ctx.strokeStyle = '#130d0870'; ctx.lineWidth = 1;
          for (let j = 1; j < 5; j++) { ctx.beginPath(); ctx.ellipse(x, y, n / 220 * j, n / 55 * j, .05, 0, Math.PI * 2); ctx.stroke(); }
        }
      }
      if (name === 'stone' || name === 'roof' || name === 'wall') {
        const rows = name === 'roof' ? 12 : 5, h = n / rows, w = n / (name === 'roof' ? 9 : 4);
        ctx.strokeStyle = '#242729'; ctx.lineWidth = name === 'roof' ? 3 : 5;
        for (let row = 0; row < rows; row++) for (let col = -1; col < 5 + (name === 'roof' ? 6 : 0); col++) {
          const x = col * w + (row % 2) * w / 2, y = row * h;
          ctx.strokeRect(x, y, w, h); ctx.fillStyle = 'rgba(0,0,0,' + (r() * .17) + ')'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
        }
        for (let i = 0; i < 450; i++) { ctx.fillStyle = 'rgba(29,49,24,' + r() * .24 + ')'; ctx.beginPath(); ctx.ellipse(r() * n, r() * n, r() * n / 30, r() * n / 60, r() * 6, 0, 7); ctx.fill(); }
        for (let i = 0; i < 18; i++) {
          let x = r() * n, y = r() * n; ctx.beginPath(); ctx.moveTo(x, y);
          for (let j = 0; j < 6; j++) { x += (r() - .5) * n / 20; y += r() * n / 30; ctx.lineTo(x, y); }
          ctx.strokeStyle = '#181c1b99'; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      if (name === 'ground') {
        for (let i = 0; i < 850; i++) { const x = r() * n, y = r() * n, s = 1 + r() * n / 150; ctx.fillStyle = r() < .4 ? '#242922' : '#555449'; ctx.beginPath(); ctx.ellipse(x, y, s, s * .6, r() * 6, 0, 7); ctx.fill(); }
      }
      if (name === 'blood') {
        ctx.clearRect(0, 0, n, n);
        for (let i = 0; i < 65; i++) { ctx.fillStyle = 'rgba(87,4,12,' + (.25 + r() * .65) + ')'; ctx.beginPath(); ctx.ellipse(n * (.2 + r() * .6), n * (.2 + r() * .6), n * r() * .14, n * r() * .13, r() * 6, 0, 7); ctx.fill(); }
        for (let i = 0; i < 12; i++) { const x = n * (.25 + r() * .5), y = n * .5; ctx.strokeStyle = '#660915bb'; ctx.lineWidth = n * (.003 + r() * .009); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + n * .015, n * (.65 + r() * .3)); ctx.stroke(); }
      }
      if (['wall', 'wood', 'stone', 'roof'].includes(name)) {
        for (let i = 0; i < 2200; i++) {
          const x = r() * n, y = n * (.45 + r() * .55), radius = n * (.001 + r() * .012);
          ctx.fillStyle = 'rgba(' + (24 + Math.floor(r() * 23)) + ',' + (42 + Math.floor(r() * 24)) + ',21,' + (.12 + r() * .35) + ')';
          ctx.beginPath(); ctx.ellipse(x, y, radius, radius * .55, r() * 6, 0, 7); ctx.fill();
        }
        for (let i = 0; i < 26; i++) { ctx.fillStyle = '#18231a25'; ctx.fillRect(r() * n, r() * n * .7, n * (.002 + r() * .008), n * (.1 + r() * .3)); }
      }
      const map = this.texture(c, !['blood', 'paper'].includes(name)); this.cache.set(name, map); return map;
    }
    foliage() {
      if (this.cache.has('foliage')) return this.cache.get('foliage');
      const c = this.canvas(512), ctx = c.getContext('2d'), r = G.Utils.seededRandom(8712);
      for (let i = 0; i < 280; i++) {
        const a = r() * Math.PI * 2, radius = Math.sqrt(r()) * 225, x = 256 + Math.cos(a) * radius, y = 256 + Math.sin(a) * radius;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + r()); ctx.fillStyle = ['#354630', '#435238', '#25392c', '#5b6440'][i % 4];
        ctx.beginPath(); ctx.moveTo(0, -26); ctx.quadraticCurveTo(23, -2, 0, 26); ctx.quadraticCurveTo(-23, 2, 0, -26); ctx.fill();
        ctx.strokeStyle = '#7b80533d'; ctx.beginPath(); ctx.moveTo(0, -23); ctx.lineTo(0, 23); ctx.stroke(); ctx.restore();
      }
      const t = this.texture(c); this.cache.set('foliage', t); return t;
    }
    surface(name) {
      const key = name + ':surface'; if (this.cache.has(key)) return this.cache.get(key);
      const diffuse = this.get(name), c = diffuse.image, n = c.width;
      const source = c.getContext('2d').getImageData(0, 0, n, n).data;
      const bumpCanvas = this.canvas(n), normalCanvas = this.canvas(n);
      const bctx = bumpCanvas.getContext('2d'), nctx = normalCanvas.getContext('2d');
      const bump = bctx.createImageData(n, n), normal = nctx.createImageData(n, n);
      const height = (x, y) => source[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const i = (y * n + x) * 4, dx = (height(x - 1, y) - height(x + 1, y)) * 1.8, dy = (height(x, y - 1) - height(x, y + 1)) * 1.8;
        const length = Math.hypot(dx, dy, 1);
        bump.data[i] = bump.data[i + 1] = bump.data[i + 2] = height(x, y) * 255; bump.data[i + 3] = 255;
        normal.data[i] = (dx / length * .5 + .5) * 255; normal.data[i + 1] = (dy / length * .5 + .5) * 255; normal.data[i + 2] = (1 / length * .5 + .5) * 255; normal.data[i + 3] = 255;
      }
      bctx.putImageData(bump, 0, 0); nctx.putImageData(normal, 0, 0);
      const bumpMap = this.texture(bumpCanvas, true), normalMap = this.texture(normalCanvas, true);
      bumpMap.encoding = normalMap.encoding = THREE.LinearEncoding;
      const result = { map: diffuse, bumpMap: bumpMap, normalMap: normalMap }; this.cache.set(key, result); return result;
    }
    material(name, color) {
      const key = name + ':' + (color === undefined ? 'base' : color);
      if (this.materials.has(key)) return this.materials.get(key);
      const s = this.surface(name), m = new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, normalScale: new THREE.Vector2(.35, .35), roughness: name === 'blood' ? .22 : .88, color: color === undefined ? 0xffffff : color });
      this.materials.set(key, m); return m;
    }
    label(lines, options) {
      options = options || {}; const c = this.canvas(options.width || 512, options.height || 256), ctx = c.getContext('2d');
      ctx.fillStyle = options.background || '#28241f'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = options.border || '#8d7652'; ctx.lineWidth = 5; ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
      ctx.fillStyle = options.color || '#d6c6a2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = (options.fontSize || 36) + 'px "LeThon Noto", Arial, sans-serif';
      lines.forEach((line, i) => ctx.fillText(String(line).normalize('NFC'), c.width / 2, c.height * (i + 1) / (lines.length + 1), c.width - 40));
      return this.texture(c, false);
    }
    talisman() {
      if (this.cache.has('talisman')) return this.cache.get('talisman');
      const c = this.canvas(256, 512), ctx = c.getContext('2d'); ctx.drawImage(this.get('paper').image, 0, 0, 256, 512);
      ctx.strokeStyle = '#872722'; ctx.lineWidth = 7; ctx.strokeRect(18, 16, 220, 480);
      ctx.fillStyle = '#8c211e'; ctx.textAlign = 'center'; ctx.font = 'bold 58px serif'; ['護', '命', '鎮', '魂'].forEach((s, i) => ctx.fillText(s, 128, 100 + i * 95));
      ctx.beginPath(); ctx.moveTo(48, 453); ctx.lineTo(100, 430); ctx.lineTo(153, 470); ctx.lineTo(209, 432); ctx.stroke();
      const t = this.texture(c); this.cache.set('talisman', t); return t;
    }
    face(ghost) {
      const key = ghost ? 'ghost_face' : 'human_face'; if (this.cache.has(key)) return this.cache.get(key);
      const c = this.canvas(512), ctx = c.getContext('2d'); ctx.fillStyle = ghost ? '#c4c9c0' : '#bba58b'; ctx.fillRect(0, 0, 512, 512);
      const shade = ctx.createRadialGradient(256, 225, 40, 256, 255, 280); shade.addColorStop(0, '#ffffff12'); shade.addColorStop(1, '#283028aa'); ctx.fillStyle = shade; ctx.fillRect(0, 0, 512, 512);
      [175, 337].forEach((x, i) => { ctx.fillStyle = '#262323'; ctx.beginPath(); ctx.ellipse(x, 224, 43, ghost ? 23 : 13, (i ? 1 : -1) * .12, 0, 7); ctx.fill(); ctx.fillStyle = i ? '#b78446' : '#799f96'; ctx.beginPath(); ctx.arc(x, 224, 13, 0, 7); ctx.fill(); ctx.fillStyle = '#090909'; ctx.beginPath(); ctx.arc(x, 224, 6, 0, 7); ctx.fill(); if (ghost) { ctx.strokeStyle = '#7f1b2dcc'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x, 245); ctx.bezierCurveTo(x - 12, 285, x + 15, 320, x - 4, 390); ctx.stroke(); } });
      ctx.fillStyle = ghost ? '#381d21' : '#775047'; ctx.beginPath(); ctx.ellipse(256, 352, ghost ? 26 : 34, ghost ? 32 : 5, 0, 0, 7); ctx.fill();
      const t = this.texture(c); this.cache.set(key, t); return t;
    }
    skinMicro() {
      if(this.cache.has('skin-micro'))return this.cache.get('skin-micro');const canvas=this.canvas(512),ctx=canvas.getContext('2d'),r=G.Utils.seededRandom(4408);ctx.fillStyle='#888888';ctx.fillRect(0,0,512,512);
      for(let i=0;i<38000;i++){const v=105+Math.floor(r()*40);ctx.fillStyle='rgb('+v+','+v+','+v+')';ctx.fillRect(r()*512,r()*512,.7+r(),.7+r());}const t=this.texture(canvas,true);t.encoding=THREE.LinearEncoding;this.cache.set('skin-micro',t);return t;
    }
    hairStrands() {
      if(this.cache.has('hair-strands'))return this.cache.get('hair-strands');const canvas=this.canvas(256,512),ctx=canvas.getContext('2d'),r=G.Utils.seededRandom(2728);ctx.clearRect(0,0,256,512);const mass=ctx.createLinearGradient(0,0,256,0);mass.addColorStop(0,'#a5a5a500');mass.addColorStop(.22,'#a5a5a520');mass.addColorStop(.78,'#a5a5a520');mass.addColorStop(1,'#a5a5a500');ctx.fillStyle=mass;ctx.fillRect(0,0,256,450);
      for(let i=0;i<80;i++){const x=r()*256;ctx.strokeStyle='rgba('+(150+Math.floor(r()*100))+','+(145+Math.floor(r()*90))+','+(140+Math.floor(r()*80))+','+(.4+r()*.5)+')';ctx.lineWidth=.6+r()*1.5;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+14,140,x-8,330,x+(r()-.5)*22,450+r()*62);ctx.stroke();}const t=this.texture(canvas,false);this.cache.set('hair-strands',t);return t;
    }
    roadSurface() {
      if(this.cache.has('road-surface'))return this.cache.get('road-surface');const c=this.canvas(1024),ctx=c.getContext('2d'),r=G.Utils.seededRandom(688);ctx.fillStyle='#343a32';ctx.fillRect(0,0,1024,1024);
      for(let i=0;i<32000;i++){const x=r()*1024,y=r()*1024,v=40+Math.floor(r()*45);ctx.fillStyle='rgb('+v+','+(v+3)+','+(v-5)+')';ctx.beginPath();ctx.ellipse(x,y,.6+r()*4,.7+r()*3,r()*6,0,7);ctx.fill();}
      [.28,.72].forEach(x=>{const g=ctx.createLinearGradient((x-.11)*1024,0,(x+.11)*1024,0);g.addColorStop(0,'#171c1800');g.addColorStop(.5,'#121a19bb');g.addColorStop(1,'#171c1800');ctx.fillStyle=g;ctx.fillRect((x-.11)*1024,0,225,1024);});
      for(let i=0;i<220;i++){ctx.fillStyle=i%2?'#82774c':'#514f2e';ctx.beginPath();ctx.ellipse(r()*1024,r()*1024,2+r()*4,1+r()*2,r()*6,0,7);ctx.fill();}const t=this.texture(c,true);this.cache.set('road-surface',t);return t;
    }
    skin(ghost) {
      const key = 'skin-surface:' + ghost; if (this.cache.has(key)) return this.cache.get(key);
      const c = this.canvas(512), ctx = c.getContext('2d'), r = G.Utils.seededRandom(ghost ? 671 : 991);
      ctx.fillStyle = ghost ? '#c5c6be' : '#e2d6c8'; ctx.fillRect(0, 0, 512, 512);
      for (let i=0;i<14000;i++) { const light = r() > .5; ctx.fillStyle = light ? '#fff4dd16' : '#53443b12'; ctx.fillRect(r()*512,r()*512,1+r(),1+r()); }
      for (let i=0;i<30;i++) { const x=r()*512,y=r()*512,g=ctx.createRadialGradient(x,y,0,x,y,25+r()*25);g.addColorStop(0,ghost?'#596c5b25':'#ac65501a');g.addColorStop(1,'#00000000');ctx.fillStyle=g;ctx.fillRect(x-60,y-60,120,120); }
      const texture=this.texture(c,true);this.cache.set(key,texture);return texture;
    }
    particle() {
      if (this.cache.has('particle')) return this.cache.get('particle');
      const c = this.canvas(64), ctx = c.getContext('2d'), g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, '#ffffffff'); g.addColorStop(.25, '#ffffffa0'); g.addColorStop(1, '#ffffff00'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
      const t = this.texture(c); this.cache.set('particle', t); return t;
    }
    dispose() { this.materials.forEach(m => m.dispose()); this.owned.forEach(t => t.dispose()); this.cache.clear(); this.materials.clear(); this.owned.clear(); }
  };

  G.Shaders = Object.freeze({
    waterVertex: 'varying vec2 vUv; uniform float uTime; void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*4.0+uTime)*0.018+cos(p.y*3.0-uTime)*0.018;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',
    waterFragment: 'varying vec2 vUv; uniform float uTime; void main(){vec2 p=vUv-0.5;float rings=sin(length(p)*95.0-uTime*2.3);float glint=pow(max(0.0,sin(p.x*31.0+p.y*18.0+uTime)),18.0);vec3 c=mix(vec3(0.025,0.013,0.022),vec3(0.18,0.035,0.05),rings*0.5+0.5);gl_FragColor=vec4(c+glint*0.07,0.94);}',
    postVertex: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
    postFragment: [
      'uniform sampler2D tScene;uniform sampler2D tDepth;uniform mat4 uProjectionInverse;uniform mat4 uCameraWorld;uniform vec3 uCameraPosition;uniform vec4 uHouses[6];uniform float uFog;uniform float uThreat;uniform float uTime;uniform float uSanity;uniform float uDamage;uniform float uMotion;varying vec2 vUv;',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
      'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}',
      'float fogDensity(vec3 p){float height=exp(-max(p.y,0.0)*1.9)*smoothstep(-0.15,0.1,p.y);vec2 drift=vec2(uTime*.08,uTime*-.045);float n=noise(p.xz*.19+drift)*.65+noise(p.xz*.52-drift)*.35;float inside=0.;for(int i=0;i<6;i++){vec2 d=abs(p.xz-uHouses[i].xy)-uHouses[i].zw;inside=max(inside,(1.-smoothstep(-.1,.7,max(d.x,d.y))));}return height*smoothstep(.28,.8,n)*.15*(1.-inside);}',
      'vec3 groundFog(vec3 color,vec2 uv){float depth=texture2D(tDepth,uv).x;vec4 view=uProjectionInverse*vec4(uv*2.-1.,depth*2.-1.,1.);view/=view.w;vec3 endPoint=(uCameraWorld*view).xyz;vec3 delta=endPoint-uCameraPosition;float distance=min(length(delta),55.);vec3 direction=normalize(delta);float stepSize=distance/18.;float transmission=1.;for(int i=0;i<18;i++){vec3 p=uCameraPosition+direction*(float(i)+.5)*stepSize;float density=fogDensity(p);transmission*=exp(-density*stepSize);}return mix(vec3(.026,.044,.048),color,transmission);}',
      'void main(){vec2 uv=vUv;float band=step(0.985,hash(vec2(floor(uv.y*60.0),floor(uTime*8.0))));',
      'float interference=max(uSanity,uThreat);uv.x+=band*sin(uTime*31.0)*interference*0.014*uMotion;uv.x+=sin(uv.y*170.+uTime*9.)*.0006*uThreat*uMotion;float shift=interference*0.0025;',
      'vec3 col=vec3(texture2D(tScene,uv+vec2(shift,0.)).r,texture2D(tScene,uv).g,texture2D(tScene,uv-vec2(shift,0.)).b);',
      'if(uFog>.5)col=groundFog(col,uv);col*=1.-sin(vUv.y*850.)*.035*uThreat;col+=vec3(hash(vUv+floor(uTime*18.)*uMotion)-.5)*uThreat*.022;',
      'float vignette=1.0-smoothstep(0.2,0.75,length(vUv-0.5));col*=mix(0.48,1.0,vignette);',
      'col+=vec3(hash(vUv+fract(uTime))-0.5)*0.003;col=mix(col,vec3(col.r*1.3,col.g*.55,col.b*.6),uDamage*(1.0-vignette)*0.7);',
      'col=max(col,vec3(0.0));col=mix(col*12.92,1.055*pow(col,vec3(1.0/2.4))-0.055,step(vec3(0.0031308),col));gl_FragColor=vec4(col,1.0);}'
    ].join('\n')
  });

  G.PostProcessor = class PostProcessor {
    constructor(renderer) {
      this.renderer = renderer; this.target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat });
      this.depthSupported = renderer.capabilities.isWebGL2 || renderer.extensions.has('WEBGL_depth_texture');
      if (this.depthSupported) { this.target.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedShortType); this.target.depthBuffer = true; }
      this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
      this.material = new THREE.ShaderMaterial({ vertexShader: G.Shaders.postVertex, fragmentShader: G.Shaders.postFragment, depthTest: false, depthWrite: false, uniforms: { tScene: { value: this.target.texture }, uTime: { value: 0 }, uSanity: { value: 0 }, uDamage: { value: 0 }, uMotion: { value: 1 } } });
      Object.assign(this.material.uniforms, { tDepth: { value: this.target.depthTexture || this.target.texture }, uProjectionInverse: { value: new THREE.Matrix4() }, uCameraWorld: { value: new THREE.Matrix4() }, uCameraPosition: { value: new THREE.Vector3() }, uThreat: { value: 0 }, uFog: { value: this.depthSupported ? 1 : 0 }, uHouses: { value: G.WorldLayout.houses.map(h => new THREE.Vector4(h.position[0], h.position[2], h.width / 2, h.depth / 2)) } });
      this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material); this.scene.add(this.quad);
    }
    resize(w, h) { this.target.setSize(w, h); }
    render(scene, camera, time, sanity, damage, reducedMotion, threat) {
      const u = this.material.uniforms; u.uTime.value = time; u.uSanity.value = sanity; u.uDamage.value = damage; u.uMotion.value = reducedMotion ? 0 : 1;
      camera.updateMatrixWorld(); u.uProjectionInverse.value.copy(camera.projectionMatrixInverse); u.uCameraWorld.value.copy(camera.matrixWorld); u.uCameraPosition.value.copy(camera.position); u.uThreat.value = threat || 0;
      this.renderer.setRenderTarget(this.target); this.renderer.render(scene, camera); this.renderer.setRenderTarget(null); this.renderer.render(this.scene, this.camera);
    }
    dispose() { this.target.dispose(); this.quad.geometry.dispose(); this.material.dispose(); }
  };
}(window.Game = window.Game || {}));
