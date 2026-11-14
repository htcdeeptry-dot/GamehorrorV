(function (G) {
  'use strict';
  G.WorldBuilder = class WorldBuilder {
    constructor(scene, textures, models, bus, settings) {
      this.scene = scene; this.textures = textures; this.models = models; this.bus = bus; this.settings = settings;
      this.root = new THREE.Group(); scene.add(this.root); this.colliders = []; this.interactions = new Map(); this.targets = []; this.doors = []; this.companions = new Map(); this.pickups = new Map(); this.hideSpots = new Map(); this.chains = [];
      this.random = G.Utils.seededRandom(G.Config.seed); this.time = 0; this.lightningTimer = 16; this.flash = 0; this.navRevision = 0; this.navCache = new Map(); this.session = null;
      this.temp = new THREE.Vector3();
      this.decorHouses = []; this.echoes = []; this.outageRemaining = 0; this.cinematic = null;
      this.volumetricBeams = []; this.instancedExtras = []; this.skyDome = null;
    }
    box(size, position, material, collision, parent) {
      const m = this.models.box(parent || this.root, size, position, material);
      if (collision) this.collider(m, size); return m;
    }
    collider(mesh, size, options) {
      mesh.updateWorldMatrix(true, false); const b = new THREE.Box3().setFromObject(mesh);
      const c = Object.assign({ minX: b.min.x, maxX: b.max.x, minY: b.min.y, maxY: b.max.y, minZ: b.min.z, maxZ: b.max.z, enabled: true, mesh: mesh, opaque: true, navigation: true }, options || {});
      this.colliders.push(c); return c;
    }
    register(id, root, data) {
      const entry = Object.assign({ id: id, root: root, enabled: true, label: 'Tương tác', type: 'inspect' }, data);
      root.userData.interactionId = id; this.interactions.set(id, entry); this.targets.push(root); return entry;
    }
    sign(parent, text, position, width, height, options) {
      const map = this.textures.label(Array.isArray(text) ? text : [text], options); const material = new THREE.MeshStandardMaterial({ map: map, roughness: .85, side: THREE.DoubleSide });
      this.models.materials.set('sign:' + this.models.materials.size, material);
      return this.models.mesh(parent, 'PlaneGeometry', [width, height], material, position);
    }
    addVolumetricBeam(parent, pos, radiusBottom, height, colorHex, opacity) {
      const geo = new THREE.CylinderGeometry(.08, radiusBottom, height, 18, 1, true);
      const mat = this.textures.createBeamMaterial(colorHex || 0xff7744, opacity || .11);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1] - height * .5, pos[2]);
      mesh.castShadow = mesh.receiveShadow = false;
      mesh.renderOrder = 2;
      mesh.visible = this.settings.volumetricBeams !== false;
      parent.add(mesh);
      this.volumetricBeams.push(mesh);
      return mesh;
    }
    setBeamsVisible(visible) {
      (this.volumetricBeams || []).forEach(m => { m.visible = !!visible && !(this.outageRemaining > 0); });
    }
    buildSkyAndMountains() {
      const moonDir = new THREE.Vector3(-45, 75, -80);
      const skyMat = this.textures.createSkyDome(moonDir);
      this.models.materials.set('sky-dome', skyMat);
      this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(168, 36, 20), skyMat);
      this.skyDome.castShadow = this.skyDome.receiveShadow = false;
      this.skyDome.frustumCulled = false;
      this.root.add(this.skyDome);

      // Northern Vietnam limestone karst mountain silhouette ring with eroded ridges & rounded summits
      const mtnMatFar = this.models.sharedMaterial('karst-horizon-far', { color: 0x0b1315, roughness: .96, metalness: 0 });
      const mtnMatMid = this.models.sharedMaterial('karst-horizon-mid', { color: 0x101c1d, roughness: .96, metalness: 0 });
      const ridgeGeos = [0, 1, 2].map(v => {
        const key = 'karst-ridge:' + v;
        if (this.models.geometries.has(key)) return this.models.geometries.get(key);
        const geo = new THREE.CylinderGeometry(4.2 + v * .8, 17.5, 22, 16, 6, false);
        const p = geo.attributes.position;
        for (let vi = 0; vi < p.count; vi++) {
          const x = p.getX(vi), y = p.getY(vi), z = p.getZ(vi);
          const ang = Math.atan2(z, x), t = (y + 11) / 22;
          const ridge = Math.sin(ang * 3 + v * 1.7) * 2.2 + Math.cos(ang * 5 - t * 4 + v) * 1.3 + Math.sin(t * 7 + ang * 2) * .9;
          const crest = t > .75 ? Math.sin(ang * 2 + v * 2.1) * 2.8 : 0;
          const s = Math.max(.35, 1 + ridge * (1 - t * .55) * .08);
          p.setXYZ(vi, x * s, y + crest * Math.max(0, t - .45), z * s);
        }
        geo.computeVertexNormals();
        this.models.geometries.set(key, geo);
        return geo;
      });
      const mr = G.Utils.seededRandom(9051);
      for (let i = 0; i < 32; i++) {
        const far = i % 2 === 0;
        const ang = (i / 32) * Math.PI * 2 + (mr() - .5) * .12;
        const dist = far ? 132 + mr() * 18 : 112 + mr() * 16;
        const m = new THREE.Mesh(ridgeGeos[i % 3], far ? mtnMatFar : mtnMatMid);
        const hScale = far ? .95 + mr() * .85 : .55 + mr() * .48;
        m.scale.set(1.1 + mr() * .7, hScale, .85 + mr() * .5);
        m.position.set(Math.cos(ang) * dist, 11 * hScale - 2.2, Math.sin(ang) * dist);
        m.rotation.y = mr() * Math.PI * 2;
        m.castShadow = false; m.receiveShadow = false;
        this.root.add(m);
      }
    }
    build() {
      const cfg = G.Config.world; this.scene.background = new THREE.Color(0x070f13); this.scene.fog = new THREE.FogExp2(cfg.fog.color, cfg.fog.density);
      const gSurf = this.textures.surface('ground');
      const gMap = gSurf.map.clone(); gMap.repeat.set(28, 28); gMap.needsUpdate = true; this.textures.owned.add(gMap);
      const gNorm = gSurf.normalMap.clone(); gNorm.repeat.set(28, 28); gNorm.needsUpdate = true; this.textures.owned.add(gNorm);
      const gRough = gSurf.roughnessMap.clone(); gRough.repeat.set(28, 28); gRough.needsUpdate = true; this.textures.owned.add(gRough);
      const groundMat = new THREE.MeshStandardMaterial({ map: gMap, normalMap: gNorm, normalScale: new THREE.Vector2(.75, .75), roughnessMap: gRough, roughness: .92 });
      this.models.materials.set('ground-large', groundMat);
      this.box([144, .4, 148], [0, -.25, 0], groundMat, false);
      const ambient = new THREE.HemisphereLight(0x6c8791, 0x20271e, .42); this.root.add(ambient);
      this.moonLight = new THREE.DirectionalLight(0x88a2a0, .54); this.moonLight.position.set(-35, 65, -25); this.moonLight.castShadow = this.settings.shadowQuality !== 'off';
      const smSize = { off: 512, low: 512, medium: 1024, high: 2048 }[this.settings.shadowQuality || 'medium'] || 1024;
      this.moonLight.shadow.mapSize.set(smSize, smSize); Object.assign(this.moonLight.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 150 }); this.moonLight.shadow.bias = -.0003; this.moonLight.shadow.normalBias = .04; this.root.add(this.moonLight);
      const moonMat = new THREE.MeshBasicMaterial({ map: this.textures.moon(), color: 0xffffff, fog: false });
      this.moon = this.models.mesh(this.root, 'SphereGeometry', [8.5, 36, 24], moonMat, [-45, 75, -80]);
      this.moon.rotation.y = .45; this.models.materials.set('moon', moonMat); this.moon.castShadow = false;
      const haloMat = new THREE.SpriteMaterial({ map: this.textures.halo(), color: 0xa21b28, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      this.models.materials.set('moon-halo', haloMat);
      const moonHalo = new THREE.Sprite(haloMat); moonHalo.position.set(-45, 75, -81); moonHalo.scale.set(38, 38, 1); this.root.add(moonHalo);
      this.stormLight = new THREE.DirectionalLight(0xc1ceff, 0); this.stormLight.position.set(15, 45, 0); this.root.add(this.stormLight);
      this.buildSkyAndMountains();
      this.buildPaths(); this.buildGate(); this.buildWell(); G.WorldLayout.houses.forEach(h => this.buildHouse(h)); this.buildCemetery(); this.buildVillageDetails(); this.buildForest(); this.buildPickups(); this.buildWeather(); this.buildNotes(); this.buildEchoes();
      G.WorldLayout.companions.forEach(c => { const model = this.models.person(c.id, false); model.position.fromArray(c.position); this.root.add(model); this.companions.set(c.id, { model: model, config: c, path: [], repath: 0, arrived: false }); this.register('friend_' + c.id, model, { type: 'rescue', puzzle: c.rescueInteraction, label: 'Cứu ' + G.Lore.characters[c.id].name }); });
      this.buildGroundDressing();this.buildApproach();this.interactions.forEach(e=>this.models.bakeRigid(e.root)); this.root.updateMatrixWorld(true); this.batchStaticMeshes(); return this;
    }
    batchStaticMeshes() {
      // Gộp vật thể tĩnh theo vật liệu. Cửa, đồ nhặt, nhân vật và đèn đung đưa
      // giữ nguyên cây scene để raycast, hoạt ảnh và ID lưu game không đổi.
      const moving = new Set([...this.interactions.values()].map(e => e.root));
      this.models.animations.forEach(a => moving.add(a.root));
      this.echoes.forEach(e => moving.add(e.model));
      this.ritualRelics.forEach(model => moving.add(model));
      if (this.secretDrawer) moving.add(this.secretDrawer);
      const groups = new Map();
      this.root.traverse(mesh => {
        if (!mesh.isMesh || mesh.isInstancedMesh || Array.isArray(mesh.material) || mesh.material.isShaderMaterial) return;
        let node = mesh; while (node) { if (moving.has(node) || !node.visible) return; node = node.parent; }
        mesh.getWorldPosition(this.temp);
        const key = mesh.material.uuid + ':' + mesh.castShadow + ':' + mesh.receiveShadow + ':' + Math.floor(this.temp.x / 28) + ':' + Math.floor(this.temp.z / 28);
        if (!groups.has(key)) groups.set(key, []); groups.get(key).push(mesh);
      });
      let batchIndex = 0;
      groups.forEach(meshes => {
        if (meshes.length < 2) return;
        let vertices = 0, indices = 0;
        meshes.forEach(m => { vertices += m.geometry.attributes.position.count; indices += m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count; });
        const positions = new Float32Array(vertices * 3), normals = new Float32Array(vertices * 3), uv = new Float32Array(vertices * 2), index = new Uint32Array(indices);
        const point = new THREE.Vector3(), normal = new THREE.Vector3(), normalMatrix = new THREE.Matrix3(); let offset = 0, indexOffset = 0;
        meshes.forEach(mesh => {
          const geometry = mesh.geometry, p = geometry.attributes.position, n = geometry.attributes.normal, tex = geometry.attributes.uv;
          normalMatrix.getNormalMatrix(mesh.matrixWorld);
          for (let i = 0; i < p.count; i++) {
            point.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld); point.toArray(positions, (offset + i) * 3);
            if (n) normal.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize(); else normal.set(0, 1, 0);
            normal.toArray(normals, (offset + i) * 3); if (tex) { uv[(offset + i) * 2] = tex.getX(i); uv[(offset + i) * 2 + 1] = tex.getY(i); }
          }
          const count = geometry.index ? geometry.index.count : p.count;
          for (let i = 0; i < count; i++) index[indexOffset++] = offset + (geometry.index ? geometry.index.getX(i) : i);
          offset += p.count; mesh.parent.remove(mesh);
        });
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3)); geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geometry.setIndex(new THREE.BufferAttribute(index, 1)); geometry.computeBoundingSphere();
        this.models.geometries.set('static-batch:' + batchIndex++, geometry);
        const mesh = new THREE.Mesh(geometry, meshes[0].material); mesh.castShadow = meshes[0].castShadow; mesh.receiveShadow = meshes[0].receiveShadow; this.root.add(mesh);
      });
    }
    buildApproach() {
      // A continuous wet cart track connects the village spine to the wooded pass.
      const roadCurve=new THREE.CatmullRomCurve3([[0,.012,5],[0,.012,30],[0,.012,58],[0,.012,67],[3,.012,82],[-5,.012,102],[2,.012,125],[-8,.012,147]].map(p=>new THREE.Vector3(...p))),positions=[],uv=[],indices=[];
      for(let i=0;i<=220;i++){const t=i/220,p=roadCurve.getPoint(t),dir=roadCurve.getTangent(t),side=new THREE.Vector3(dir.z,0,-dir.x).normalize(),width=t<.4?1.65:2.6;for(let edge=-1;edge<=1;edge+=2){positions.push(p.x+side.x*width*edge,p.y,p.z+side.z*width*edge);uv.push(edge===-1?0:1,t*25);}if(i){const n=i*2;indices.push(n-2,n,n-1,n-1,n,n+1);}}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();this.models.geometries.set('approach-road',geometry);const material=this.models.sharedMaterial('approach-road',{map:this.textures.roadSurface(),roughness:.58,metalness:.04,side:THREE.DoubleSide});const road=new THREE.Mesh(geometry,material);road.receiveShadow=true;this.root.add(road);
      this.box([105,.35,90],[0,-.25,112],this.textures.material('ground',0x9ba894),false);
      const r=G.Utils.seededRandom(7801),prototypes=[];
      for(let i=0;i<4;i++){const root=new THREE.Group();this.gnarledTree(root,6.5+i*.65,170+i);this.addCanopy(root,5.9+i*.65,4.5);this.models.bakeRigid(root);prototypes.push(root);}
      const clusters=new Map(),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);let count=0;
      const add=(x,z,variant)=>{const key=Math.floor(x/38)+':'+Math.floor(z/38)+':'+variant;if(!clusters.has(key))clusters.set(key,{variant,transforms:[]});const size=.78+r()*.5;q.setFromAxisAngle(up,r()*Math.PI*2);matrix.compose(new THREE.Vector3(x,0,z),q,scale.setScalar(size));clusters.get(key).transforms.push(matrix.clone());count++;if(z<70)this.colliders.push({minX:x-.34,maxX:x+.34,minZ:z-.34,maxZ:z+.34,minY:0,maxY:9,enabled:true,navigation:true,opaque:true});};
      for(let i=0;i<114;i++){const z=65+r()*82,center=roadCurve.getPoint(G.Utils.clamp((z-5)/142,0,1)).x,side=i%2?1:-1,x=center+side*(7+r()*31);add(x,z,i%4);}
      for(let i=0;i<42;i++){const z=8+r()*47,x=(i%2?1:-1)*(8+r()*13);if(this.blocked(x,z,2.5,2)||G.WorldLayout.houses.concat(this.decorHouses).some(h=>Math.abs(x-h.position[0])<h.width/2+3&&Math.abs(z-h.position[2])<h.depth/2+3))continue;add(x,z,i%4);}
      clusters.forEach(cluster=>{const prototype=prototypes[cluster.variant];prototype.updateMatrixWorld(true);prototype.traverse(source=>{if(!source.isMesh)return;const mesh=new THREE.InstancedMesh(source.geometry,source.material,cluster.transforms.length);cluster.transforms.forEach((transform,i)=>mesh.setMatrixAt(i,transform.clone().multiply(source.matrixWorld)));mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;mesh.userData.forestCluster=true;const center=new THREE.Vector3();cluster.transforms.forEach(t=>center.add(new THREE.Vector3().setFromMatrixPosition(t)));center.divideScalar(cluster.transforms.length);mesh.userData.clusterCenter=center;this.root.add(mesh);if(!this.forestClusters)this.forestClusters=[];this.forestClusters.push(mesh);});});
      this.approachTreeCount=count;
      // Roadside boundary granite boulders and haunted bamboo groves framing the foggy ravine
      const stone=this.textures.material('stone',0x7e887a);
      for(let i=0;i<24;i++){
        const z=66+i*3.1;
        [-1,1].forEach(side=>{
          const rock=new THREE.Mesh(this.models.rockGeometry(.24+r()*.22, i*7+side), this.textures.material('ground',0x585f56));
          rock.position.set(side*(4.3+r()*1.1), .10, z);
          rock.rotation.y=r()*6; rock.castShadow=rock.receiveShadow=true;
          this.root.add(rock);
        });
      }
      for(let i=0;i<18;i++){
        const z=67+i*4.2, side=i%2?1:-1, x=side*(6.8+r()*5.5);
        const clump=this.models.bambooClump(6.5+r()*2.5, i);
        clump.position.set(x, 0, z); clump.rotation.y=r()*6;
        this.root.add(clump);
      }
    }
    buildPaths() {
      const fSurf = this.textures.surface('flagstone');
      const fMap = fSurf.map.clone(); fMap.repeat.set(2, 6); fMap.needsUpdate = true; this.textures.owned.add(fMap);
      const fNorm = fSurf.normalMap.clone(); fNorm.repeat.set(2, 6); fNorm.needsUpdate = true; this.textures.owned.add(fNorm);
      const fRough = fSurf.roughnessMap.clone(); fRough.repeat.set(2, 6); fRough.needsUpdate = true; this.textures.owned.add(fRough);
      const paverMat = new THREE.MeshStandardMaterial({ map: fMap, normalMap: fNorm, normalScale: new THREE.Vector2(.88, .88), roughnessMap: fRough, roughness: .88, color: 0x8f9686 });
      this.models.materials.set('path-pavers', paverMat);
      const curbMat = this.textures.material('stone', 0x626a5d);
      G.WorldLayout.paths.forEach(path => {
        for (let i = 1; i < path.length; i++) {
          const a = new THREE.Vector3().fromArray(path[i - 1]), b = new THREE.Vector3().fromArray(path[i]);
          const delta = b.clone().sub(a), center = a.clone().add(b).multiplyScalar(.5), len = delta.length(), yaw = Math.atan2(delta.x, delta.z);
          const road = this.box([2.85, .045, len], [center.x, .005, center.z], paverMat, false);
          road.rotation.y = yaw;
          const curbGroup = new THREE.Group(); curbGroup.position.set(center.x, .03, center.z); curbGroup.rotation.y = yaw; this.root.add(curbGroup);
          [-1.48, 1.48].forEach(ox => this.models.box(curbGroup, [.18, .07, len], [ox, 0, 0], curbMat));
        }
      });
    }
    buildGate() {
      const stone = this.textures.material('stone'), mossStone = this.textures.material('flagstone', 0x6c7566), wood = this.textures.material('wood'), iron = this.textures.material('iron'), brass = this.models.mat(0x9b8048, .35, .82);
      // Flagstone gate threshold apron + twin secondary flanking perimeter columns (Tứ Trụ Tam Quan)
      this.box([10.4, .06, 4.4], [0, .01, 61], mossStone, false);
      [-4.5, 4.5].forEach((x, idx) => {
        const sgn = idx ? 1 : -1;
        this.box([2.05, .26, 2.15], [x, .13, 61], mossStone, false);
        this.box([1.72, .38, 1.82], [x, .42, 61], stone, false);
        this.box([1.15, 6, 1.3], [x, 3, 61], stone, true);
        this.box([1.48, .22, 1.62], [x, 4.85, 61], stone, false);
        this.box([1.35, .14, 1.5], [x, 5.15, 61], wood, false);
        this.box([1.78, .42, 1.88], [x, 6.02, 61], stone, false);
        // Sculpted parallel vertical couplet plaques ('câu đối cổng làng') facing village & approach
        const coupletTxt = idx === 0
          ? ['TRỜI ĐẤT', 'CHỨNG TRI', 'OAN HỒN', 'KHÓ SIÊU']
          : ['GIẾNG CỔ', 'SOI TÂM', 'CHUÔNG RUNG', 'ĐOẠN TRƯỜNG'];
        const backP = this.sign(this.root, coupletTxt, [x, 2.95, 60.31], .62, 2.35, { width: 256, height: 768, fontSize: 38, background: '#261412', border: '#a38148', color: '#e3cc98' });
        backP.rotation.y = Math.PI;
        this.sign(this.root, coupletTxt, [x, 2.95, 61.69], .62, 2.35, { width: 256, height: 768, fontSize: 38, background: '#261412', border: '#a38148', color: '#e3cc98' });
        // Flanking auxiliary Tam Quan pillars topped with sculpted lotus-bud finials
        const px = sgn * 7.6;
        this.box([1.18, .35, 1.24], [px, .175, 61], stone, false);
        this.box([.78, 4.15, .82], [px, 2.1, 61], stone, false);
        this.box([1.05, .24, 1.08], [px, 4.28, 61], stone, false);
        this.models.loft(this.root, [[4.40, .28, .28], [4.54, .34, .34], [4.76, .22, .22], [5.02, .05, .05]], mossStone, 12, .02).position.set(px, 0, 61);
        this.box([2.2, .12, .38], [sgn * 6.05, 4.05, 61], wood, false);
      });
      this.box([10.6, 1.05, 1.55], [0, 5.5, 61], wood, true);
      // Monumental Two-Tier Curved Yin-Yang Tam Quan Roof + Sweeping Dragon Corner Eaves ('đầu đao')
      const gateRoof = new THREE.Group(); gateRoof.position.set(0, 6.18, 61); this.root.add(gateRoof);
      [-1, 1].forEach(side => {
        const lower = this.box([12.2, .16, 1.55], [0, .22, side * .96], this.textures.material('roof'), false, gateRoof);
        lower.rotation.x = side * .38;
        const upper = this.box([8.4, .18, 1.28], [0, 1.02, side * .74], this.textures.material('roof'), false, gateRoof);
        upper.rotation.x = side * .46;
      });
      this.box([12.6, .24, .32], [0, .74, 0], stone, false, gateRoof);
      this.box([8.8, .26, .34], [0, 1.52, 0], stone, false, gateRoof);
      // Central sacred orb & twin stylized roof horn crest
      this.models.mesh(gateRoof, 'SphereGeometry', [.24, 14, 12], brass, [0, 1.88, 0]);
      this.models.mesh(gateRoof, 'TorusGeometry', [.32, .045, 8, 16, Math.PI], brass, [0, 1.86, 0], [0, 0, Math.PI]);
      [-1, 1].forEach(side => {
        this.models.curve(gateRoof, [[side * 5.7, .74, 0], [side * 6.3, .88, 0], [side * 6.7, 1.18, 0]], .10, stone, 10);
        this.models.curve(gateRoof, [[side * 3.9, 1.52, 0], [side * 4.4, 1.68, 0], [side * 4.75, 1.98, 0]], .09, stone, 10);
      });
      // Inner sign rotated PI so text reads left-to-right from inside village; outer plaque faces road
      const innerSign = this.sign(this.root, ['LỆ THÔN', 'Đừng uống nước giếng sau khi nghe chuông'], [0, 5.45, 60.20], 5.6, .82, { width: 1024, height: 256, fontSize: 42 });
      innerSign.rotation.y = Math.PI;
      this.sign(this.root, ['LỆ THÔN', 'Đất Cũ · 1994'], [0, 5.45, 61.80], 4.8, .72, { width: 1024, height: 256, fontSize: 40 });

      this.gate = new THREE.Group(); this.gate.position.set(0, 0, 61); this.root.add(this.gate);
      [-1.95, 1.95].forEach(dx => {
        this.box([3.86, 4.8, .24], [dx, 2.4, 0], wood, false, this.gate);
        for (let r = 0; r < 3; r++) this.box([3.7, .12, .28], [dx, .7 + r * 1.65, 0], iron, false, this.gate);
        for (let s = -1; s <= 1; s++) for (let r = 0; r < 3; r++) this.models.ellipsoid(this.gate, [dx + s * 1.1, .7 + r * 1.65, -.16], [.045, .045, .035], iron);
      });
      [-.28, .28].forEach(dx => this.models.mesh(this.gate, 'TorusGeometry', [.14, .022, 8, 18], brass, [dx, 2.1, -.18]));
      this.gateCollider = this.collider(this.gate, null); this.register('gate', this.gate, { type: 'gate', label: 'Kiểm tra Cổng Làng' });

      // Interlocked forged iron + blood-cursed chain links across gate
      const chainMat = new THREE.MeshStandardMaterial({ color: 0x5c1820, emissive: 0x7b111c, emissiveIntensity: .46, metalness: .78, roughness: .38 });
      this.models.materials.set('chains', chainMat);
      for (let row = 0; row < 3; row++) {
        const chain = new THREE.Group();
        for (let i = 0; i < 40; i++) {
          const x = -3.7 + i * .19, sag = Math.abs(x) * .12 - (1 - Math.abs(x) / 3.8) * .18;
          const link = this.models.mesh(chain, 'TorusGeometry', [.135, .024, 6, 12], chainMat, [x, 1.15 + row * 1.08 + sag, -.24], [i % 2 * 1.25, .25, 0]);
          link.scale.x = 1.22; link.scale.y = .72;
        }
        this.gate.add(chain); this.chains.push(chain);
      }

      // Continuous perimeter stone walls overlap pillar edges so no side gap can be bypassed
      [-1, 1].forEach(side => {
        this.box([60.2, 3.3, .65], [side * 34.9, 1.65, 61], stone, true);
        this.models.box(this.root, [.08, .08, .48], [side * 4.5, 4.35, 59.82], iron);
        const l = this.models.lantern(); l.position.set(side * 4.5, 4, 59.6); this.root.add(l);
        this.addVolumetricBeam(this.root, [side * 4.5, 3.82, 59.6], 1.45, 3.7, 0xff6f44, .11);
      });
      this.box([.5, 4, 130], [-65, 2, -3], stone, true); this.box([.5, 4, 130], [65, 2, -3], stone, true); this.box([130, 4, .5], [0, 2, -68], stone, true);

      // Two offering benches flanking the clear 3.2m central path so pickups/notes rest physically with collision
      [[-2.35, 0, 49], [2.55, 0, 49]].forEach(pos => {
        const bench = this.models.roadsideBench();
        bench.position.fromArray(pos);
        this.root.add(bench);
        this.collider(bench, null, { opaque: false });
      });
      [-7.2, 7.5].forEach((sx, i) => {
        const shrine = this.models.stoneShrine();
        shrine.position.set(sx, 0, i === 0 ? 32 : -3.5);
        shrine.rotation.y = i === 0 ? .55 : -.65;
        this.root.add(shrine);
        this.collider(shrine, null, { opaque: false });
      });
    }
    buildWell() {
      const stone = this.textures.material('stone'), plazaStone = this.textures.material('flagstone', 0x7a8376), r = 2.25;
      // Two-tiered octagonal carved mossy flagstone ceremonial well plaza + stone bollards & jars
      this.models.cylinder(this.root, 5.6, 5.9, .06, [0, .025, 0], plazaStone, 8);
      this.models.cylinder(this.root, 3.45, 3.65, .08, [0, .085, 0], stone, 8);
      [-3.5, 3.5].forEach(bx => [-3.5, 3.5].forEach(bz => {
        this.box([.34, .46, .34], [bx, .23, bz], stone, false);
        this.models.mesh(this.root, 'SphereGeometry', [.14, 10, 8], stone, [bx, .52, bz]);
      }));
      const jar1 = this.models.ceramicJar(.95); jar1.position.set(-2.9, .05, -2.2); this.root.add(jar1);
      const jar2 = this.models.ceramicJar(.78); jar2.position.set(2.8, .05, -2.1); this.root.add(jar2);
      for (let row = 0; row < 3; row++) for (let i = 0; i < 18; i++) {
        const a = (i + row % 2 * .5) / 18 * Math.PI * 2;
        const m = this.box([.74, .36, .46], [Math.sin(a) * r, .22 + row * .35, Math.cos(a) * r], stone, false);
        m.rotation.y = a;
      }
      this.colliders.push({ minX: -2.5, maxX: 2.5, minY: -5, maxY: 1.2, minZ: -2.5, maxZ: 2.5, enabled: true, navigation: true, opaque: true });
      const canopy = this.models.wellCanopy();
      this.root.add(canopy);
      [-2.55, 2.55].forEach(px => {
        this.colliders.push({ minX: px - .28, maxX: px + .28, minY: 0, maxY: 3.6, minZ: -.3, maxZ: .3, enabled: true, navigation: true, opaque: false });
      });
      this.waterMaterial = new THREE.ShaderMaterial({ vertexShader: G.Shaders.waterVertex, fragmentShader: G.Shaders.waterFragment, uniforms: { uTime: { value: 0 } }, side: THREE.DoubleSide, transparent: true });
      this.models.materials.set('well-water', this.waterMaterial);
      this.models.mesh(this.root, 'CircleGeometry', [2.05, 48], this.waterMaterial, [0, -.36, 0], [-Math.PI / 2, 0, 0]);
      const altar = this.models.altar(); altar.position.set(0, 0, 4.2); this.root.add(altar); this.collider(altar, null); this.register('well_ritual', altar, { type: 'puzzle', puzzle: 'well_ritual', label: 'Đàn Tế · Trả lại tên em' });
      this.ritualRelics = [];
      ['truth_mirror', 'soul_bell', 'linh_pendant'].forEach((id, i) => { const item = this.models.item(id); item.position.set((i - 1) * .65, .97, 4.2); item.visible = false; this.root.add(item); this.ritualRelics.push(item); });
      const stainMat = new THREE.MeshStandardMaterial({ map: this.textures.get('blood'), transparent: true, depthWrite: false }); this.models.materials.set('blood-ground', stainMat); this.models.mesh(this.root, 'PlaneGeometry', [4, 4], stainMat, [2, .008, 1], [-Math.PI / 2, 0, 0]);
    }
    buildHouse(h) {
      const house = new THREE.Group(); house.position.fromArray(h.position); house.rotation.y = h.yaw; this.root.add(house);
      const wall = this.textures.material('wall'), wood = this.textures.material('wood'), roof = this.textures.material('roof'); const w = h.width, d = h.depth, y = h.height, door = h.doorWidth;
      this.box([w, .14, d], [0, 0, 0], wood, false, house);
      this.box([w, y, .28], [0, y / 2, -d / 2], wall, true, house);
      [-1, 1].forEach(side => {
        this.box([.28, y, d], [side * w / 2, y / 2, 0], wall, true, house);
        this.box([(w - door) / 2, y, .28], [side * (w + door) / 4, y / 2, d / 2], wall, true, house);
        this.box([.24, y, .28], [side * door / 2, y / 2, d / 2 + .14], wood, false, house);
        this.tiledRoof(house, w / 2 + .6, d + 1.4, [side * w / 4, y + .7, 0], -side * .28);
        const lantern = this.models.lantern(); lantern.position.set(side * (door / 2 + .75), y - .75, d / 2 + .65); house.add(lantern);
        if (!h.id.startsWith('abandoned_') && side === 1) {
          this.addVolumetricBeam(house, [side * (door / 2 + .75), y - .92, d / 2 + .65], 1.15, 2.5, 0xff7744, .08);
        }
        const winEm = (h.id === 'elder_house' || h.id === 'healer_house') ? 0x4b2912 : 0x162428;
        const winPaneMat = this.models.sharedMaterial('win-pane:' + winEm, {
          color: 0x141b1e, emissive: winEm, emissiveIntensity: .65, roughness: .22, metalness: .15
        });
        this.box([1.5, 1.05, .07], [side * w * .34, 1.8, d / 2 + .18], winPaneMat, false, house);
        [-.72, .72].forEach(offset => this.box([.09, 1.18, .1], [side * w * .34 + offset, 1.8, d / 2 + .23], wood, false, house));
        for (let slat = 0; slat < 5; slat++) this.box([.055, 1.05, .08], [side * w * .34 - .55 + slat * .275, 1.8, d / 2 + .25], wood, false, house);
        [1.25, 2.35].forEach(height => this.box([1.6, .10, .12], [side * w * .34, height, d / 2 + .23], wood, false, house));
        this.box([1.72, .08, .18], [side * w * .34, 1.18, d / 2 + .24], wood, false, house);
      });
      this.box([.18, .22, d + 1.6], [0, y + 1.55, 0], wood, false, house);
      this.box([w + .4, .18, .2], [0, y - .1, d / 2 + .2], wood, false, house);
      this.architecturalDetails(house, h);
      this.box([door, y - 2.35, .28], [0, 2.35 + (y - 2.35) / 2, d / 2], wall, true, house);
      this.sign(house, h.name.toLocaleUpperCase('vi'), [0, y - .3, d / 2 + .2], Math.min(4, w * .5), .48, { fontSize: 38 });
      this.addDoor('door_' + h.id, house, [-door / 2 + .08, 0, d / 2], door - .16, 2.32, h.id === 'elder_house', h.id === 'elder_house' ? 'elder_entry' : null);
      h.furniture.forEach(f => {
        if (f.type === 'prison_partition') {
          const localZ = f.position[2];
          [-1, 1].forEach(side => this.box([(w - 1.5) / 2, 2.7, .15], [side * (w + 1.5) / 4, 1.35, localZ], wood, true, house));
          this.addDoor(f.interaction, house, [-.75, 0, localZ], 1.5, 2.7, true, f.interaction); return;
        }
        const model = this.models.furniture(f.type); model.position.fromArray(f.position); house.add(model);
        if (f.type === 'locked_box') this.box([.8, f.position[1], .65], [f.position[0], f.position[1] / 2, f.position[2]], wood, true, house);
        if (!['ancestral_painting', 'locked_box'].includes(f.type)) this.collider(model, null, { opaque: !['table', 'shelves', 'medicine_shelf', 'workbench'].includes(f.type), navigation: true });
        if (f.interaction) this.register(f.interaction, model, { type: 'puzzle', puzzle: f.interaction, label: G.Puzzles[f.interaction].title });
        if (f.interaction === 'truth_incense') {
          this.secretDrawer = this.models.joint(model, [0, .6, .22]); this.models.box(this.secretDrawer, [.65, .17, .5], [0, 0, 0]);
          const mirror = this.models.item('truth_mirror'); mirror.scale.setScalar(.5); mirror.position.set(0, .1, 0); mirror.rotation.x = -Math.PI / 2; this.secretDrawer.add(mirror); mirror.visible = false; this.drawerMirror = mirror;
        }
        const hide = h.hidingSpots.find(s => s.position.every((v, i) => v === f.position[i]));
        if (hide) { const position = house.localToWorld(new THREE.Vector3().fromArray(hide.position)), exit = house.localToWorld(new THREE.Vector3().fromArray(hide.exit)); const spot = { id: hide.id, type: hide.type, position: position, exit: exit, model: model }; this.hideSpots.set(hide.id, spot); this.register(hide.id, model, { type: 'hide', label: hide.type === 'cabinet' ? 'Nấp trong tủ gỗ' : 'Nấp dưới gầm bàn', spot: spot }); }
      });
    }
    addDoor(id, parent, position, width, height, locked, puzzle) {
      const hinge = this.models.joint(parent, position), panel = this.box([width, height, .12], [width / 2, height / 2, 0], this.textures.material('wood'), false, hinge);
      const paper = this.models.sharedMaterial('door-seals', { map: this.textures.talisman(), side: THREE.DoubleSide, roughness: .9 });
      const seal = this.models.mesh(hinge, 'PlaneGeometry', [.18, .5], paper, [width * .6, 1.65, .067]); seal.rotation.z = -.12;
      const stain = this.models.sharedMaterial('dry-blood', { map: this.textures.get('blood'), color: 0x65422c, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, roughness: 1 });
      this.models.mesh(hinge, 'PlaneGeometry', [.5, .8], stain, [width * .33, .8, .07]);
      this.box([.045, .13, .08], [width - .15, 1.1, .1], this.models.mat(0xa78d5b, .35, .7), false, hinge);
      const wood=this.textures.material('wood'), iron=this.models.mat(0x3a3f39,.6,.65);
      [.26,height-.26].forEach(y=>{this.models.box(hinge,[width-.1,.10,.055],[width/2,y,.085],wood);[.13,width-.13].forEach(x=>this.models.ellipsoid(hinge,[x,y,.119],[.018,.018,.009],iron));});
      for(let i=1;i<Math.floor(width/.18);i++)this.models.box(hinge,[.009,height-.1,.015],[i*.18,height/2,.068],this.models.mat(0x292923));
      this.models.mesh(hinge,'TorusGeometry',[.058,.009,8,20],iron,[width-.16,1.04,.14]);
      const collider = this.collider(panel, null, { navigation: locked });
      const record = { id: id, hinge: hinge, panel: panel, collider: collider, open: false, locked: locked, angle: 0, width: width, height: height };
      this.doors.push(record); this.register(id, hinge, { type: locked ? 'rescue' : 'door', label: locked ? G.Puzzles[puzzle].title : 'Mở / đóng cửa', door: record, puzzle: puzzle }); return record;
    }
    doorShape(door,angle) {
      door.hinge.parent.updateWorldMatrix(true,false);const matrix=door.hinge.parent.matrixWorld.clone().multiply(new THREE.Matrix4().compose(door.hinge.position,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),door.hinge.scale));
      const center=new THREE.Vector3(door.width/2,door.height/2,0).applyMatrix4(matrix),axis=new THREE.Vector3(1,0,0).transformDirection(matrix),other=new THREE.Vector3(0,0,1).transformDirection(matrix),hw=door.width/2,hd=.075,ex=Math.abs(axis.x)*hw+Math.abs(other.x)*hd,ez=Math.abs(axis.z)*hw+Math.abs(other.z)*hd;
      return {minX:center.x-ex,maxX:center.x+ex,minZ:center.z-ez,maxZ:center.z+ez,minY:center.y-door.height/2,maxY:center.y+door.height/2,obb:{x:center.x,z:center.z,ux:axis.x,uz:axis.z,vx:other.x,vz:other.z,hw,hd}};
    }
    circleHits(x,z,radius,c) {
      let px=x,pz=z,minX=c.minX,maxX=c.maxX,minZ=c.minZ,maxZ=c.maxZ;
      if(c.obb){const o=c.obb,dx=x-o.x,dz=z-o.z;px=dx*o.ux+dz*o.uz;pz=dx*o.vx+dz*o.vz;minX=-o.hw;maxX=o.hw;minZ=-o.hd;maxZ=o.hd;}
      const dx=px-G.Utils.clamp(px,minX,maxX),dz=pz-G.Utils.clamp(pz,minZ,maxZ);return dx*dx+dz*dz<radius*radius;
    }
    doorSweepClear(door,target) {
      const actors=[...this.companions.values()].filter(c=>c.model.visible).map(c=>({position:c.model.position,radius:.37}));if(this.player&&!this.player.hiddenSpot)actors.push({position:this.player.position,radius:G.Config.player.radius});
      const steps=Math.max(1,Math.ceil(Math.abs(target-door.angle)/.07));for(let i=1;i<=steps;i++){const shape=this.doorShape(door,G.Utils.lerp(door.angle,target,i/steps));if(actors.some(a=>this.circleHits(a.position.x,a.position.z,a.radius+.04,shape)))return false;}return true;
    }
    refreshDoorCollider(door) {Object.assign(door.collider,this.doorShape(door,door.angle));door.collider.enabled=true;door.collider.navigation=true;door.collider.navShape=door.locked?null:this.doorShape(door,door.openAngle||-Math.PI/2);}
    setDoor(door,open,silent) {
      if(door.locked&&open)return false;let target=open?(door.id.indexOf('rescue_')===0?Math.PI:-Math.PI/2):0;if(this.session&&!this.doorSweepClear(door,target)){if(open&&this.doorSweepClear(door,-target))target=-target;else return false;}door.open=open;if(open)door.openAngle=target;
      if(!this.session){door.angle=target;door.hinge.rotation.y=target;}this.refreshDoorCollider(door);
      if(!silent){const p=door.hinge.getWorldPosition(new THREE.Vector3());this.bus.emit(G.EventNames.NOISE,{position:p,loudness:.35,kind:'door'});this.bus.emit('sound:cue',{name:'door',position:p});}return true;
    }
    buildCemetery() {
      const soil = this.textures.material('ground', 0x3b4034), borderStone = this.textures.material('flagstone', 0x6c7364);
      G.Lore.graves.forEach(grave => {
        const g = new THREE.Group(); g.position.fromArray(grave.position); this.root.add(g);
        const stele = this.models.graveStele(grave.emblem === 'plum', 1.0, 0x9aa294);
        stele.position.set(0, 0, -.35);
        g.add(stele);
        this.box([.88, 1.35, .24], [0, .72, -.47], this.textures.material('stone'), true, g).visible = false;
        // Carved granite burial border curb framing low grave earth mound
        [-.62, .62].forEach(bx => this.box([.11, .14, 1.72], [bx, .07, .54], borderStone, false, g));
        this.box([1.35, .14, .11], [0, .07, 1.36], borderStone, false, g);
        this.models.box(g, [1.06, .12, 1.48], [0, .06, .54], soil);
        const marker = grave.emblem === 'plum' ? '✿ HOA MẬN ✿' : '• LỆ THÔN •';
        this.sign(g, [marker, grave.name, grave.born ? grave.born + ' — ' + grave.died : 'Không rõ năm sinh', grave.age ? 'Hưởng dương ' + grave.age + ' tuổi' : 'Xin hãy nhớ'], [0, .86, -.355], .72, .96, { width: 512, height: 512, fontSize: 33, background: '#464a46' });
        this.register(grave.id, g, { type: 'grave', label: 'Đọc bia · ' + grave.name, grave: grave });
      });
    }
    tiledRoof(parent, width, depth, position, slope) {
      const sx=Math.ceil(width/.09),sz=Math.ceil(depth/.08),vertices=[],uv=[],indices=[];
      for(let x=0;x<=sx;x++)for(let z=0;z<=sz;z++){
        const px=x/sx*width-width/2,pz=z/sz*depth-depth/2;
        const wave=Math.cos(pz*Math.PI*2/.32)*.045, row=(px+width/2)/.48, overlap=(row-Math.floor(row))*.033;
        vertices.push(px,wave+overlap,pz);uv.push((px+width/2)/2,(pz+depth/2)/2);
        if(x&&z){const b=x*(sz+1)+z;indices.push(b-1,b-sz-2,b,b,b-sz-2,b-sz-1);}
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();this.models.geometries.set('roof-tiles:'+this.models.geometries.size,geometry);
      const material=this.textures.material('roof',0x777e75);material.side=THREE.DoubleSide;const mesh=new THREE.Mesh(geometry,material);mesh.position.fromArray(position);mesh.rotation.z=slope;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
      const underside=this.models.box(parent,[width,.12,depth],position,this.textures.material('wood',0x706854));underside.position.y-=.10;underside.rotation.z=slope;
    }
    architecturalDetails(parent, h) {
      const w = h.width, d = h.depth, y = h.height, wood = this.textures.material('wood', 0x918575), stone = this.textures.material('stone', 0x848778), wall = this.textures.material('wall'), dadoMat = this.textures.material('flagstone', 0x62675c);
      // Seal triangular front & back roof gables + timber king-post trusses so no open gap appears beneath roofs
      const apexY = y + .72 + (w / 4) * Math.tan(.28);
      const gableKey = 'gable:' + w + ':' + y;
      let gableGeo = this.models.geometries.get(gableKey);
      if (!gableGeo) {
        const hw = w / 2 + .06;
        const pos = new Float32Array([-hw, y - .04, 0, hw, y - .04, 0, 0, apexY, 0]);
        const uv = new Float32Array([0, 0, 1, 0, .5, 1]);
        gableGeo = new THREE.BufferGeometry();
        gableGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        gableGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        gableGeo.computeVertexNormals();
        this.models.geometries.set(gableKey, gableGeo);
      }
      const gableMat = this.models.sharedMaterial('gable-wall', { map: wall.map, normalMap: wall.normalMap, roughnessMap: wall.roughnessMap, roughness: .94, side: THREE.DoubleSide });
      [-d / 2, d / 2].forEach(gz => {
        const gm = new THREE.Mesh(gableGeo, gableMat); gm.position.z = gz; gm.castShadow = gm.receiveShadow = true; parent.add(gm);
        this.models.box(parent, [w * .94, .14, .18], [0, y + .04, gz], wood);
        this.models.box(parent, [.16, apexY - y, .20], [0, (y + apexY) / 2, gz], wood);
      });
      // Stone foundation plinth, weathered damp masonry dado wainscot & stepped veranda apron
      this.models.box(parent, [w + .38, .20, d + .38], [0, .10, 0], stone);
      this.models.box(parent, [w + .04, .54, .06], [0, .37, -d / 2 - .14], dadoMat);
      this.models.box(parent, [h.doorWidth + 1.8, .12, 1.45], [0, .06, d / 2 + .72], dadoMat);
      this.models.box(parent, [w + .35, .06, 1.35], [0, .03, d / 2 + .65], stone);
      const verandaJar = this.models.ceramicJar(.74);
      verandaJar.position.set(w / 2 - .82, .05, d / 2 + .50);
      parent.add(verandaJar);
      [-1, 1].forEach(side => {
        this.models.box(parent, [.06, .54, d + .04], [side * (w / 2 + .14), .37, 0], dadoMat);
        this.models.box(parent, [(w - h.doorWidth) / 2, .54, .06], [side * (w + h.doorWidth) / 4, .37, d / 2 + .14], dadoMat);
        for (let i = 0; i < 5; i++) { const z = -d / 2 + i * d / 4; this.models.box(parent, [.15, y, .15], [side * (w / 2 - .09), y / 2, z], wood); this.models.box(parent, [.28, .28, .28], [side * (w / 2 - .09), .14, z], stone); }
        this.models.box(parent, [.16, .22, d], [side * (w / 2 - .1), y - .2, 0], wood);
        this.models.box(parent, [(w - h.doorWidth) / 2, .28, .12], [side * (w + h.doorWidth) / 4, .14, d / 2 + .15], stone);
        const post = this.models.cylinder(parent, .085, .11, y - .2, [side * (w / 2 - .3), (y - .2) / 2, d / 2 + .5], wood, 16); this.collider(post, null);
        this.models.cylinder(parent, .16, .18, .20, [side * (w / 2 - .3), .10, d / 2 + .5], stone, 12);
        this.models.curve(parent, [[side * (w / 2 - .3), y - .75, d / 2 + .5], [side * (w / 2 - .65), y - .25, d / 2 + .5], [side * (w / 2 - 1.25), y - .16, d / 2 + .5]], .055, wood, 12);
        // Sculpted upturned roof corner eaves ('đầu đao') on all 4 roof corners
        [-1, 1].forEach(ez => this.models.curve(parent, [[side * (w / 2 + .15), y + .12, ez * (d / 2 + .45)], [side * (w / 2 + .42), y + .18, ez * (d / 2 + .65)], [side * (w / 2 + .55), y + .42, ez * (d / 2 + .78)]], .045, stone, 6));
        const shutter = this.models.joint(parent, [side * w * .34 + side * .72, 1.8, d / 2 + .25]); shutter.rotation.y = side * .45;
        for (let i = 0; i < 5; i++) this.models.box(shutter, [.12, 1.05, .045], [-side * (.07 + i * .13), 0, 0], wood);
        [-.4, .4].forEach(py => this.models.box(shutter, [.65, .07, .055], [-side * .33, py, .03], wood));
      });
      for (let i = 0; i < Math.ceil(w / .55); i++) { const x = -w / 2 + i * .55; this.models.box(parent, [.065, .10, d + 1.2], [x, y - .08, 0], wood); }
      for (let i = 0; i < Math.ceil(d / .45); i++) this.models.mesh(parent, 'CylinderGeometry', [.12, .12, .46, 12, 1, false, 0, Math.PI], stone, [0, apexY + .06, -d / 2 + i * .45], [Math.PI / 2, 0, Math.PI / 2]);
      [-1, 1].forEach(side => this.models.curve(parent, [[0, apexY, side * d / 2], [0, apexY + .15, side * (d / 2 + .6)], [0, apexY + .45, side * (d / 2 + .85)]], .10, stone, 16));
      const mat = this.models.sharedMaterial('hanging-cloth', { map: this.textures.get('cloth'), color: 0x6b7160, side: THREE.DoubleSide, roughness: 1 });
      if (h.style === 'humble' || h.style === 'healer') {
        const cloth = this.models.mesh(parent, 'PlaneGeometry', [.65, .9, 8, 10], mat, [-w / 2 + .8, 1.8, d / 2 + .33]);
        const p = cloth.geometry.clone(); this.models.geometries.set('cloth-wave:' + this.models.geometries.size, p); cloth.geometry = p;
        const a = p.attributes.position; for (let i = 0; i < a.count; i++) a.setZ(i, Math.sin(a.getX(i) * 22) * .025); p.computeVertexNormals();
      }
    }
    gnarledTree(parent,height,seed) {
      const r=G.Utils.seededRandom(381+seed),bark=this.textures.material('bark',0x6c6a5d);
      const trunk=this.models.loft(parent,[[0,.36,.34],[.3,.32,.30],[height*.3,.21,.19,.09],[height*.6,.15,.14,-.06],[height*.85,.09,.08,.11],[height,.025,.023,.14]],bark,18,.09);
      for(let i=0;i<7;i++){
        const angle=i*2.399+r(),reach=.75+r()*.7;
        this.models.curve(parent,[[0,.26,0],[Math.sin(angle)*.52,.14,Math.cos(angle)*.52],[Math.sin(angle)*reach,.015,Math.cos(angle)*reach]],.078,bark,10);
      }
      for(let i=0;i<8;i++){
        const angle=i*2.399,base=height*(.4+i*.045),reach=1.15+r()*1.6;
        const tip=[Math.sin(angle)*reach,base+1.1+r(),Math.cos(angle)*reach];
        this.models.curve(parent,[[0,base,0],[Math.sin(angle)*reach*.4,base+.35,Math.cos(angle)*reach*.4],tip],.055+(7-i)*.006,bark,12);
        for(let j=0;j<2;j++){const a=angle+(j?-.55:.55);this.models.curve(parent,[[tip[0]*.65,base+.8,tip[2]*.65],tip,[tip[0]+Math.sin(a)*.75,tip[1]+.45,tip[2]+Math.cos(a)*.75]],.018,bark,8);}
        // Hanging tropical banyan aerial root tendrils on lower strong boughs
        if(i<3&&height>4.5){
          const ax=Math.sin(angle)*reach*.72,az=Math.cos(angle)*reach*.72,ay=base+.48;
          this.models.curve(parent,[[ax,ay,az],[ax+(r()-.5)*.14,ay*.52,az+(r()-.5)*.14],[ax*.92,.35+r()*.9,az*.92]],.012,bark,6);
        }
      }
    }
    buildGroundDressing() {
      const r=G.Utils.seededRandom(4319),wood=this.textures.material('wood',0x77735f);
      // Instanced 3D multi-blade wild grass tufts & mossy granite rocks (keeping doors, exits & road clear)
      const grassMat=this.models.sharedMaterial('wild-grass-3d',{color:0x22321e,roughness:.84,side:THREE.DoubleSide});
      const tuftVariants=[0,1,2].map(v=>this.models.grassTuftGeometry(11,v+1));
      const tuftMatrices=[[],[],[]],mat4=new THREE.Matrix4(),quat=new THREE.Quaternion(),scl=new THREE.Vector3(),pos=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
      for(let i=0;i<420;i++){
        const x=(r()-.5)*118,z=(r()-.5)*118;
        if(Math.abs(x)<4.4||this.blocked(x,z,.55,1.7)||G.WorldLayout.houses.concat(this.decorHouses).some(h=>Math.abs(x-h.position[0])<h.width/2+.65&&Math.abs(z-h.position[2])<h.depth/2+.95))continue;
        const sc=.75+r()*.85;
        quat.setFromAxisAngle(up,r()*Math.PI*2);
        mat4.compose(pos.set(x,0,z),quat,scl.set(sc,sc*(.85+r()*.45),sc));
        tuftMatrices[i%3].push(mat4.clone());
        if(i%12===0&&!this.blocked(x+.4,z-.3,.7,1.4)){
          const rock=new THREE.Mesh(this.models.rockGeometry(.26+r()*.26,i),this.textures.material('ground',0x525a50));
          rock.position.set(x+.4,.08,z-.3); rock.rotation.y=r()*6; rock.castShadow=false; rock.receiveShadow=true;
          this.root.add(rock);
        }
      }
      tuftMatrices.forEach((list,v)=>{
        if(!list.length)return;
        const im=new THREE.InstancedMesh(tuftVariants[v],grassMat,list.length);
        list.forEach((m,idx)=>im.setMatrixAt(idx,m));
        im.instanceMatrix.needsUpdate=true; im.receiveShadow=true; im.castShadow=false;
        this.root.add(im); this.instancedExtras.push(im);
      });
      // Village bamboo clumps framing perimeter shrines & courtyard corners
      [[-24,26],[25,24],[-28,-28],[22,-27],[-41,38],[42,-16]].forEach(([bx,bz],bi)=>{
        if(!this.blocked(bx,bz,1.1,2.0)){
          const bClump=this.models.bambooClump(6.0+r()*2.0, 200+bi);
          bClump.position.set(bx,0,bz); bClump.rotation.y=r()*6;
          this.root.add(bClump);
        }
      });
      [[-19,35],[20,36],[-19,-18],[18,-36],[-38,5],[35,4]].forEach((p,i)=>{
        const g=new THREE.Group();g.position.set(p[0],0,p[1]);this.root.add(g);
        for(let j=0;j<7;j++){const stake=this.models.box(g,[.09,.8+(j%3)*.09,.08],[(j-3)*.3,.43,0],wood);stake.rotation.z=Math.sin(j+i)*.09;}
        [.27,.62].forEach(y=>this.models.box(g,[2.05,.07,.07],[0,y,.04],wood));this.collider(g,null);
        const basket=this.models.pottery(g,[1.5,0,.3],.85,this.models.mat(0x685b3c));
        for(let k=0;k<7;k++)this.models.mesh(g,'TorusGeometry',[.17+k*.003,.008,5,16],wood,[1.5,.08+k*.055,.3],[Math.PI/2,0,0]);
      });
      const puddle=this.models.sharedMaterial('wet-mud',{color:0x142220,roughness:.10,metalness:.36,transparent:true,opacity:.76,depthWrite:false});
      for(let i=0;i<24;i++){const x=(r()-.5)*75,z=(r()-.5)*100;if(this.isIndoors(new THREE.Vector3(x,0,z)))continue;const mesh=this.models.mesh(this.root,'CircleGeometry',[.5+r()*1.1,18],puddle,[x,.004,z],[-Math.PI/2,0,r()*6]);mesh.scale.y=.3+r()*.5;mesh.castShadow=false;}
      // Well stone rim cap completes the courtyard well silhouette
      this.models.mesh(this.root, 'TorusGeometry', [2.25, .16, 10, 48], this.textures.material('stone'), [0, 1.15, 0], [Math.PI / 2, 0, 0]);
    }
    buildForest() {
      const r = this.random;
      for (let i = 0; i < G.Config.world.forest.treeCount; i++) {
        const angle = r() * Math.PI * 2, radius = 46 + r() * 16, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
        if ((Math.abs(x) < 7 && z > 35) || G.WorldLayout.houses.concat(this.decorHouses).some(h => Math.abs(x - h.position[0]) < h.width / 2 + 4 && Math.abs(z - h.position[2]) < h.depth / 2 + 4) || (x > 31 && z < -23 && z > -43)) continue;
        const tree = new THREE.Group(); tree.position.set(x, 0, z); this.root.add(tree); const height = 5 + r() * 6;
        this.gnarledTree(tree,height,i);
        this.colliders.push({ minX: x - .35, maxX: x + .35, minZ: z - .35, maxZ: z + .35, minY: 0, maxY: height, enabled: true, navigation: true, opaque: true });
        if (i % 3 !== 0) this.addCanopy(tree, height - 1, 3.8);
      }
    }
    addCanopy(parent, height, size) {
      const outerMat = this.models.sharedMaterial('leaf-canopy-outer', { map: this.textures.foliage(), alphaTest: .42, side: THREE.DoubleSide, roughness: .88, color: 0x7b8c72 });
      const innerMat = this.models.sharedMaterial('leaf-canopy-inner', { map: this.textures.foliage(), alphaTest: .42, side: THREE.DoubleSide, roughness: .94, color: 0x4b5946 });
      // Multi-tiered arched overlapping bough clusters eliminate flat billboard square cross seams
      for (let i = 0; i < 26; i++) {
        const a = i * 2.3999, tier = i < 10 ? 0 : i < 20 ? 1 : 2;
        const rad = size * (tier === 0 ? (.38 + (i % 3) * .08) : tier === 1 ? (.24 + (i % 3) * .07) : .08);
        const yOff = height + (tier === 0 ? -.15 : tier === 1 ? .42 : .88) + Math.sin(i * 1.7) * size * .08;
        const cardS = size * (tier === 2 ? .52 : .42 + (i % 4) * .06);
        const mat = (i % 2 === 0 || tier === 0) ? innerMat : outerMat;
        const tilt = tier === 2 ? -1.15 : -.55 - (i % 3) * .22;
        const leaf = this.models.mesh(parent, 'PlaneGeometry', [cardS, cardS * .88], mat, [Math.sin(a) * rad, yOff, Math.cos(a) * rad], [tilt, a + (i % 2) * .6, Math.sin(i) * .35]);
        leaf.castShadow = tier === 2;
      }
    }
    buildVillageDetails() {
      const abandoned = [[-47, 15], [-47, -12], [-35, -50], [25, -51], [47, 14], [47, 39]];
      abandoned.forEach((p, i) => {
        const h = { id: 'abandoned_' + i, name: ['Nhà Thợ Mộc', 'Quán Trà Cũ', 'Nhà Người Dệt', 'Nhà Đỡ Đẻ', 'Quán Gạo', 'Nhà Chài'][i], position: [p[0], 0, p[1]], yaw: 0, width: 8, depth: 7, height: 3, doorWidth: 1.8, hidingSpots: [], furniture: [{ type: 'table', position: [-2, 0, 0] }, { type: 'crates', position: [2, 0, -2] }, { type: 'bed', position: [-2, 0, -2] }] };
        this.decorHouses.push(h); this.buildHouse(h); const door = this.doors.find(d => d.id === 'door_' + h.id); this.setDoor(door, true, true);
        this.sign(this.root, ['NHÀ VẮNG TỪ MÙA DỊCH', '1994'], [p[0] + 2.5, 1.6, p[1] + 3.68], 1.4, .65, { fontSize: 26 });
      });
      const r = this.random;
      let planted = 0;
      for (let trial = 0; trial < 450 && planted < 42; trial++) {
        const x = (r() - .5) * 112, z = (r() - .5) * 112;
        if (Math.abs(x) < 7 || Math.hypot(x, z) < 10 || (x > 28 && z < -22 && z > -44)) continue;
        if (G.WorldLayout.houses.concat(this.decorHouses).some(h => Math.abs(x - h.position[0]) < h.width / 2 + 3 && Math.abs(z - h.position[2]) < h.depth / 2 + 3)) continue;
        if (G.WorldLayout.paths.some(path => path.some((p, i) => { if (!i) return false; const a = path[i - 1], dx = p[0] - a[0], dz = p[2] - a[2], t = G.Utils.clamp(((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(x - a[0] - dx * t, z - a[2] - dz * t) < 3.8; }))) continue;
        const tree = new THREE.Group(); tree.position.set(x, 0, z); this.root.add(tree); const height = 5.4 + r() * 3;
        this.gnarledTree(tree,height,planted+40); this.colliders.push({ minX: x - .34, maxX: x + .34, minZ: z - .34, maxZ: z + .34, minY: 0, maxY: height, enabled: true, opaque: true, navigation: true }); this.addCanopy(tree, height - .7, 4.4); planted++;
      }
      this.foliageTreeCount = planted;
      const grassSideMat = this.models.sharedMaterial('wild-grass-3d', { color: 0x22321e, roughness: .84, side: THREE.DoubleSide });
      const tuftGeo = this.models.grassTuftGeometry(11, 2);
      G.WorldLayout.houses.concat(this.decorHouses).forEach((h, i) => {
        const x = h.position[0] + h.width / 2 + 1.1, z = h.position[2] + 1.5;
        const props = new THREE.Group(); props.position.set(x, 0, z); this.root.add(props);
        for (let j = 0; j < 3; j++) {
          const jar = this.models.ceramicJar(.85 + (j % 2) * .18);
          jar.position.set(0, 0, j * .68);
          props.add(jar);
        }
        this.collider(props, null);
        const sideClump = new THREE.Group(); sideClump.position.set(h.position[0] - h.width / 2 - 1.15, 0, h.position[2] + 1); this.root.add(sideClump);
        for (let t = 0; t < 4; t++) {
          const gMesh = new THREE.Mesh(tuftGeo, grassSideMat);
          gMesh.position.set((t % 2 - .5) * .45, 0, (Math.floor(t / 2) - .5) * .55);
          gMesh.rotation.y = t * 1.4;
          sideClump.add(gMesh);
        }
        const sideRock = new THREE.Mesh(this.models.rockGeometry(.30, i), this.textures.material('ground', 0x545c52));
        sideRock.position.set(-.1, .09, 0);
        sideClump.add(sideRock);
        if (i % 2 === 0) {
          const cart = new THREE.Group(); cart.position.set(x + 1.5, 0, z - 3); this.root.add(cart); this.models.box(cart, [1.2, .15, 1.8], [0, .55, 0]);
          [-.75, .75].forEach(side => { this.models.mesh(cart, 'TorusGeometry', [.46, .055, 6, 16], this.textures.material('wood'), [side, .47, 0], [0, Math.PI / 2, 0]); for (let k = 0; k < 4; k++) this.models.box(cart, [.07, .04, .85], [side, .47, 0]).rotation.x = k * Math.PI / 4; });
          this.models.box(cart, [.08, .08, 2], [-.45, .5, 1.4]); this.models.box(cart, [.08, .08, 2], [.45, .5, 1.4]); this.collider(cart, null);
        }
      });
      [[-14, 15], [17, -16], [-47, -34]].forEach(p => {
        const g = new THREE.Group(); g.position.set(p[0], 0, p[1]); this.root.add(g);
        for (let row = 0; row < 2; row++) for (let i = 0; i < 14; i++) { const a = (i + row * .5) * Math.PI * 2 / 14; const stone = this.models.box(g, [.43, .32, .3], [Math.sin(a), .16 + row * .32, Math.cos(a)], this.textures.material('stone')); stone.rotation.y = a; }
        this.models.cylinder(g, .84, .84, .04, [0, .07, 0], this.models.mat(0x101817), 24);
        [-1.25, 1.25].forEach(x => this.models.box(g, [.14, 2.2, .14], [x, 1.1, 0])); this.models.box(g, [2.7, .16, .16], [0, 2.1, 0]);
        this.models.cylinder(g, .012, .012, 1.5, [0, 1.3, 0], this.models.mat(0x948260), 5); this.models.cylinder(g, .21, .16, .35, [0, .46, 0], this.textures.material('wood'), 10);
        this.colliders.push({ minX: p[0] - 1.4, maxX: p[0] + 1.4, minZ: p[1] - 1.2, maxZ: p[1] + 1.2, minY: 0, maxY: 2.2, enabled: true, opaque: true, navigation: true });
      });
    }
    buildNotes() {
      G.ExplorationNotes.forEach(note => {
        this.addSupport(note.position); const root = new THREE.Group(); root.position.fromArray(note.position); this.root.add(root);
        const material = this.models.sharedMaterial(note.id, { map: this.textures.label([note.author, note.title], { width: 512, height: 512, background: '#bdad7e', color: '#342820', fontSize: 32 }), side: THREE.DoubleSide });
        this.models.mesh(root, 'PlaneGeometry', [.35, .4], material, [0, .025, 0], [-Math.PI / 2 + .15, 0, 0]); this.register(note.id, root, { type: 'note', note: note, label: 'Ghi chú · ' + note.author }); this.addGlint(root);
      });
    }
    buildEchoes() {
      [[-43, 19], [44, 17], [23, -46], [-32, -44]].forEach((p, i) => {
        const model = this.models.person('hung', false), material = this.models.sharedMaterial('echo_' + i, { skinning: true, color: 0x819187, emissive: 0x24362e, transparent: true, opacity: .24, depthWrite: false, roughness: 1 });
        model.traverse(m => { if (m.isSkinnedMesh) { m.material = material; m.castShadow = false; m.frustumCulled = false; } else if (m.isMesh) { m.visible = false; } }); model.position.set(p[0], 0, p[1]); this.root.add(model); this.echoes.push({ model: model, material: material, origin: model.position.clone(), phase: i * 2.3 });
      });
    }
    triggerBlackout(seconds) { this.outageRemaining = seconds; }
    slamNearbyDoor(position) {
      const candidates = this.doors.filter(d => !d.locked && d.open && d.id !== 'door_elder_house' && d.hinge.getWorldPosition(this.temp).distanceTo(position) < 12 && d.hinge.getWorldPosition(this.temp).distanceTo(position) > d.width + .8);
      if (!candidates.length) return false;
      const d = candidates[0]; if(!this.setDoor(d,false,true))return false;d.angle=0;d.hinge.rotation.y=0;this.refreshDoorCollider(d); this.bus.emit('sound:cue', { name: 'slam', position: d.hinge.getWorldPosition(new THREE.Vector3()) }); return true;
    }
    buildPickups() {
      G.WorldLayout.pickups.forEach(p => { this.addSupport(p.position); const model = this.models.item(p.item); model.position.fromArray(p.position); this.root.add(model); this.pickups.set(p.id, model); this.register(p.id, model, { type: 'pickup', item: p.item, amount: p.amount, label: 'Nhặt · ' + G.Items[p.item].name }); this.addGlint(model); });
      G.Lore.journals.forEach(page => {
        this.addSupport(page.position);
        const g = new THREE.Group(); g.position.fromArray(page.position); this.root.add(g);
        const map = this.textures.label(['NHẬT KÝ · ' + page.number, page.title, page.author, page.date], { width: 512, height: 512, background: '#c1ac83', color: '#452b25', fontSize: 35 }); const mat = new THREE.MeshStandardMaterial({ map: map, side: THREE.DoubleSide }); this.models.materials.set('journal:' + page.id, mat);
        this.models.mesh(g, 'PlaneGeometry', [.32, .42], mat, [0, .02, 0], [-Math.PI / 2 + .18, 0, 0]); this.register(page.id, g, { type: 'journal', page: page, label: 'Đọc · ' + page.title }); this.addGlint(g);
      });
    }
    addSupport(position) {
      const [x, y, z] = position; if (z === 49 || y < .1) return;
      const supported = this.colliders.some(c => x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ && c.maxY >= y - .12);
      if (!supported) this.box([.48, y - .025, .48], [x, (y - .025) / 2, z], this.textures.material('wood'), true);
    }
    addGlint(root) { const mat = new THREE.SpriteMaterial({ map: this.textures.particle(), color: 0xe0bb70, transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending }); this.models.materials.set('glint:' + this.models.materials.size, mat); const s = new THREE.Sprite(mat); s.position.y = .22; s.scale.set(.22, .22, .22); root.add(s); }
    buildWeather() {
      const q = G.Config.quality[this.settings.quality];
      const baseRain = q.rainCount != null ? q.rainCount : 1800;
      const baseAsh = q.ashCount != null ? q.ashCount : 280;
      const density = this.settings.particleDensity != null ? this.settings.particleDensity : 1;
      this.rainCount = Math.max(4000, Math.ceil(baseRain * 1.5));
      this.ashCount = Math.max(720, Math.ceil(baseAsh * 1.5));
      const rain = new Float32Array(this.rainCount * 6);
      for (let i = 0; i < this.rainCount; i++) { const o = i * 6; rain[o] = (this.random() - .5) * 72; rain[o + 1] = this.random() * 26; rain[o + 2] = (this.random() - .5) * 72; rain[o + 3] = rain[o] - .035; rain[o + 4] = rain[o + 1] - .45; rain[o + 5] = rain[o + 2]; }
      this.rainGeo = new THREE.BufferGeometry(); this.rainGeo.setAttribute('position', new THREE.BufferAttribute(rain, 3).setUsage(THREE.DynamicDrawUsage));
      this.rainGeo.setDrawRange(0, Math.min(this.rainCount, Math.round(baseRain * density)) * 2);
      this.rainMat = new THREE.LineBasicMaterial({ color: 0x9daabd, transparent: true, opacity: .15, depthWrite: false }); this.rain = new THREE.LineSegments(this.rainGeo, this.rainMat); this.rain.frustumCulled = false; this.root.add(this.rain);
      const ash = new Float32Array(this.ashCount * 3); for (let i = 0; i < ash.length; i += 3) { ash[i] = (this.random() - .5) * 60; ash[i + 1] = this.random() * 12; ash[i + 2] = (this.random() - .5) * 60; }
      this.ashGeo = new THREE.BufferGeometry(); this.ashGeo.setAttribute('position', new THREE.BufferAttribute(ash, 3).setUsage(THREE.DynamicDrawUsage));
      this.ashGeo.setDrawRange(0, Math.min(this.ashCount, Math.round(baseAsh * density)));
      this.ashMat = new THREE.PointsMaterial({ map: this.textures.particle(), color: 0xc9a5a0, size: .055, transparent: true, opacity: .5, depthWrite: false }); this.ash = new THREE.Points(this.ashGeo, this.ashMat); this.ash.frustumCulled = false; this.root.add(this.ash);
    }
    sync(session) {
      this.session = session;
      session.collectedPickups.forEach(id => this.disable(id)); session.journals.forEach(id => this.disable(id));
      ['lan', 'tuan', 'hung'].forEach(id => { if (session.companions[id] === 'rescued') { this.releaseCompanion(id, true); } });
      if (session.solvedPuzzles.includes('incense_order')) this.unlockPrison('rescue_lan');
      session.solvedPuzzles.forEach(id => { const p = G.Puzzles[id]; if (p && p.unlocks) p.unlocks.forEach(door => this.unlockPrison(door)); });
      if (session.solvedPuzzles.includes('truth_incense') || session.inventory.truth_mirror) this.revealMirror();
      if (session.flags.ritualComplete) this.openGate();
    }
    disable(id) { const e = this.interactions.get(id); if (e) { e.enabled = false; e.root.visible = false; } }
    unlockPrison(id) { const door = this.doors.find(d => d.id === id); if (door) { door.locked = false; door.collider.navigation = false; this.setDoor(door, true, true); if (id.indexOf('door_') === 0) { const entry = this.interactions.get(id); entry.type = 'door'; entry.label = 'Mở / đóng cửa'; } this.navRevision++; this.navCache.clear(); } }
    releaseCompanion(id, loaded) { this.unlockPrison('rescue_' + id); const entry = this.companions.get(id); const interaction = this.interactions.get('friend_' + id); if (interaction) interaction.enabled = false; if (entry && loaded) { entry.model.position.fromArray(entry.config.safePosition); entry.arrived = true; } }
    openGate() { this.gate.visible = false; this.gateCollider.enabled = false; this.interactions.get('gate').enabled = false; this.ritualRelics.forEach(m => m.visible = true); this.navCache.clear(); }
    isIndoors(position) { return G.WorldLayout.houses.concat(this.decorHouses).find(h => Math.abs(position.x - h.position[0]) < h.width / 2 && Math.abs(position.z - h.position[2]) < h.depth / 2); }
    revealMirror() { this.drawerOpen = true; if (this.drawerMirror) this.drawerMirror.visible = true; }
    nearestClear(position, radius, height) {
      if (!this.blocked(position.x,position.z,radius,height)) return position.clone();
      for(let r=.2;r<=6;r+=.2)for(let i=0;i<32;i++){const p=position.clone();p.x+=Math.cos(i*Math.PI/16)*r;p.z+=Math.sin(i*Math.PI/16)*r;if(!this.blocked(p.x,p.z,radius,height))return p;}
      return null;
    }
    cinematicRoute(start, end) {
      const radius = .48, first = this.nearestClear(start, radius, 1.85), last = this.nearestClear(end, radius, 1.85);
      if (!first || !last) return [];
      const raw = [first, ...this.findPath(first, last, radius)], route = [first];
      let cursor = 0;
      while (cursor < raw.length - 1) {
        let next = raw.length - 1;
        while (next > cursor + 1 && !this.walkableLine(raw[cursor], raw[next], radius)) next--;
        if (!this.walkableLine(raw[cursor], raw[next], radius)) break;
        route.push(raw[next]);
        cursor = next;
      }
      return route;
    }
    beginCinematic(id) {
      this.cinematic = id;
      this.cinematicActors = [];
      if (id === 'intro') {
        const mids = [[-0.85, 0, 48.6], [0.05, 0, 48.2], [0.85, 0, 48.6]];
        const ends = [[-7.8, 0, 35.5], [-0.4, 0, 31.5], [7.8, 0, 33.5]];
        const idleYaws = [0.24, 0.04, -0.24];
        Array.from(this.companions.values()).forEach((c, i) => {
          const start = new THREE.Vector3((i - 1) * 1.6, 0, 52);
          const mid = new THREE.Vector3().fromArray(mids[i]);
          const end = new THREE.Vector3().fromArray(ends[i]);
          const leg1 = this.cinematicRoute(start, mid), leg2 = this.cinematicRoute(mid, end);
          const route = leg1.length && leg2.length ? leg1.concat(leg2.slice(1)) : [start, mid, end];
          const lengths = [0];
          for (let k = 1; k < route.length; k++) lengths.push(lengths[k - 1] + route[k].distanceTo(route[k - 1]));
          c.model.position.copy(start);
          c.model.rotation.set(0, idleYaws[i], 0);
          c.model.visible = true;
          this.cinematicActors.push({
            c, i, route, lengths, idleYaw: idleYaws[i],
            savedPosition: c.config ? new THREE.Vector3().fromArray(c.config.position) : c.model.position.clone(),
            savedRotation: new THREE.Euler(0, 0, 0),
            savedVisible: true
          });
        });
      }
    }
    updateCinematic(id, time) {
      if (id !== 'intro') return;
      const targets = [];
      this.cinematicActors.forEach(actor => {
        const { c, i, route, lengths, idleYaw } = actor;
        if (!route.length) return;
        const u = G.Utils.clamp((time - 8.5 - i * .45) / 5.4, 0, 1);
        const progress = u * u * (3 - 2 * u);
        const distance = progress * lengths[lengths.length - 1];
        let k = 1;
        while (k < lengths.length - 1 && lengths[k] < distance) k++;
        const desired = route[0].clone();
        let targetYaw = idleYaw;
        if (route.length > 1) {
          const mix = (distance - lengths[k - 1]) / Math.max(.0001, lengths[k] - lengths[k - 1]);
          desired.copy(route[k - 1]).lerp(route[k], mix);
          const segDx = route[k].x - route[k - 1].x, segDz = route[k].z - route[k - 1].z;
          if (Math.hypot(segDx, segDz) > .01 && u > .02) {
            const walkYaw = Math.atan2(segDx, segDz);
            const turnBlend = G.Utils.clamp(u / .18, 0, 1);
            const diff = Math.atan2(Math.sin(walkYaw - idleYaw), Math.cos(walkYaw - idleYaw));
            targetYaw = idleYaw + diff * turnBlend;
          }
        }
        // Keep actor spacing >= 0.72m and verify physical colliders
        targets.forEach(prev => {
          const dx = desired.x - prev.x, dz = desired.z - prev.z, sep = Math.hypot(dx, dz);
          if (sep > .001 && sep < .74) {
            desired.x += (dx / sep) * (.74 - sep);
            desired.z += (dz / sep) * (.74 - sep);
          }
        });
        if (!this.blocked(desired.x, desired.z, .36, 1.85, false)) {
          c.model.position.x = G.Utils.damp(c.model.position.x, desired.x, 14, .033);
          c.model.position.z = G.Utils.damp(c.model.position.z, desired.z, 14, .033);
          c.model.position.y = desired.y;
        }
        targets.push(c.model.position);
        c.model.visible = u < .995;
        const yawDiff = Math.atan2(Math.sin(targetYaw - c.model.rotation.y), Math.cos(targetYaw - c.model.rotation.y));
        c.model.rotation.y += yawDiff * .32;
        // Hung briefly glances back over shoulder when shouting "Minh! Dung buong tay!"
        c.model.userData.lookYaw = i === 2 && u > .05 && u < .45 ? -.48 * Math.sin(G.Utils.clamp((u - .05) / .40, 0, 1) * Math.PI) : 0;
        c.model.userData.suppressBlink = u < .05 && (c.model.userData.speechLevel || 0) > .08;
        c.model.userData.motionDistance = distance;
        c.model.userData.motionBlend = u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0;
        this.models.animatePerson(c.model, time, c.model.userData.motionBlend, u > .03 ? 'dragged' : 'idle');
      });
      this.scene.fog.density = G.Config.world.fog.density + Math.sin(G.Utils.clamp((time - 8) / 9, 0, 1) * Math.PI) * .038;
    }
    endCinematic(id) {
      if (id === 'intro') (this.cinematicActors || []).forEach(a => {
        a.c.model.visible = a.savedVisible;
        a.c.model.position.copy(a.savedPosition);
        a.c.model.rotation.copy(a.savedRotation);
        a.c.model.userData.lookYaw = 0;
        a.c.model.userData.suppressBlink = false;
        delete a.c.model.userData.motionDistance;
        delete a.c.model.userData.motionBlend;
        this.models.animatePerson(a.c.model, 0, 0, 'captive');
      });
      this.cinematicActors = [];
      this.cinematic = null;
      this.scene.fog.density = G.Config.world.fog.density;
    }
    resolveCamera(position, radius, lookTarget) {
      position.y = Math.max(.30, position.y);
      for (let pass = 0; pass < 8; pass++) {
        let hit = false;
        for (const c of this.colliders) {
          if (!c.enabled || position.y + radius < c.minY || position.y - radius > c.maxY) continue;
          if (c.obb) {
            if (this.circleHits(position.x, position.z, radius, c)) {
              const o = c.obb, dx = position.x - o.x, dz = position.z - o.z;
              const px = dx * o.ux + dz * o.uz, pz = dx * o.vx + dz * o.vz;
              const pushZ = pz >= 0 ? o.hd + radius + .02 - pz : -o.hd - radius - .02 - pz;
              position.x += o.vx * pushZ;
              position.z += o.vz * pushZ;
              hit = true;
            }
            continue;
          }
          if (position.x > c.minX - radius && position.x < c.maxX + radius && position.z > c.minZ - radius && position.z < c.maxZ + radius) {
            const sides = [
              [Math.abs(position.x - c.minX + radius), 'x', c.minX - radius - .01],
              [Math.abs(c.maxX + radius - position.x), 'x', c.maxX + radius + .01],
              [Math.abs(position.z - c.minZ + radius), 'z', c.minZ - radius - .01],
              [Math.abs(c.maxZ + radius - position.z), 'z', c.maxZ + radius + .01]
            ];
            sides.sort((a, b) => a[0] - b[0]);
            position[sides[0][1]] = sides[0][2];
            hit = true;
          }
        }
        // Keep cinematic camera outside actor capsules during cutscenes
        if (this.cinematic) {
          this.companions.forEach(c => {
            if (!c.model.visible || position.y > 1.85) return;
            const dx = position.x - c.model.position.x, dz = position.z - c.model.position.z, d = Math.hypot(dx, dz);
            const minSep = radius + .28;
            if (d > .0001 && d < minSep) {
              position.x += (dx / d) * (minSep - d);
              position.z += (dz / d) * (minSep - d);
              hit = true;
            }
          });
        }
        if (!hit) break;
      }
      // Pull camera slightly toward lookTarget if an opaque obstacle intersects the line of sight
      if (lookTarget && this.cinematic === 'intro') {
        const probe = position.clone();
        for (let s = 1; s <= 4; s++) {
          const hit = this.colliders.find(c => c.enabled && c.opaque && this.segmentHits(lookTarget, probe, c, .04));
          if (!hit) break;
          probe.lerp(lookTarget, .22);
        }
        position.copy(probe);
      }
      return position;
    }
    location(position) { const h = this.isIndoors(position); if (h) return h.name; const zone = G.WorldLayout.zones.find(z => Math.hypot(position.x - z.center[0], position.z - z.center[2]) < z.radius); return zone ? zone.name : 'Đường Làng'; }
    isSafe(position) { return !!this.session && Object.values(this.session.companions).includes('rescued') && Math.hypot(position.x, position.z - 48) < 5; }
    blocked(x, z, radius, height, navigation) {
      if (x < -64.5 || x > 64.5 || z < -67.5 || z > 70) return true;
      return this.colliders.some(c => c.enabled && (!navigation || c.navigation) && c.maxY > .23 && c.minY < height && this.circleHits(x,z,radius,navigation&&c.navShape?c.navShape:c));
    }
    move(position,dx,dz,radius,height) {
      const occupants=[];if(this.player&&position!==this.player.position&&!this.player.hiddenSpot)occupants.push(this.player.position);this.companions.forEach(c=>{if(c.model.visible&&c.model.position!==position)occupants.push(c.model.position);});
      const avoidPeople=(this.player&&position===this.player.position)||Array.from(this.companions.values()).some(c=>c.model.position===position);
      const blocked=(x,z)=>this.blocked(x,z,radius,height)||(avoidPeople&&occupants.some(p=>Math.hypot(x-p.x,z-p.z)<radius+.28));
      const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/Math.min(.12,radius*.5)));
      for(let i=0;i<steps;i++){if(!blocked(position.x+dx/steps,position.z))position.x+=dx/steps;if(!blocked(position.x,position.z+dz/steps))position.z+=dz/steps;}return position;
    }
    segmentHits(a, b, c, padding) {
      if(c.obb){const o=c.obb,local=p=>new THREE.Vector3((p.x-o.x)*o.ux+(p.z-o.z)*o.uz,p.y,(p.x-o.x)*o.vx+(p.z-o.z)*o.vz);return this.segmentHits(local(a),local(b),{minX:-o.hw,maxX:o.hw,minZ:-o.hd,maxZ:o.hd,minY:c.minY,maxY:c.maxY},padding);}
      let lo = 0, hi = 1;
      for (const axis of ['X', 'Z']) { const key = axis.toLowerCase(), d = b[key] - a[key], min = c['min' + axis] - padding, max = c['max' + axis] + padding; if (Math.abs(d) < 1e-7) { if (a[key] < min || a[key] > max) return false; } else { let t1 = (min - a[key]) / d, t2 = (max - a[key]) / d; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; } lo = Math.max(lo, t1); hi = Math.min(hi, t2); if (lo > hi) return false; } }
      const y = a.y + (b.y - a.y) * lo; return lo < .99 && hi > .01 && y >= c.minY && y <= c.maxY;
    }
    lineOfSight(a, b, ignore) { return !this.colliders.some(c => c.enabled && c.opaque && c !== ignore && this.segmentHits(a, b, c, 0)); }
    walkableLine(a, b, radius) { const distance = a.distanceTo(b), count = Math.ceil(distance / .35); for (let i = 0; i <= count; i++) { const t = count ? i / count : 0; if (this.blocked(G.Utils.lerp(a.x, b.x, t), G.Utils.lerp(a.z, b.z, t), radius, 1.7, radius >= .45 ? false : true)) return false; } return true; }
    findPath(start, end, radius = .33) {
      const keyOf = (x, z) => radius + ':' + x + ',' + z;
      const free = (x, z) => { const k = keyOf(x, z); if (!this.navCache.has(k)) this.navCache.set(k, !this.blocked(x, z, radius, 1.7, radius >= .45 ? false : true)); return this.navCache.get(k); };
      const edgeFree = (x1, z1, x2, z2) => {
        const key = 'edge:' + radius + ':' + x1 + ',' + z1 + ':' + x2 + ',' + z2;
        if (!this.navCache.has(key)) this.navCache.set(key, this.walkableLine(new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x2, 0, z2), radius));
        return this.navCache.get(key);
      };
      const nearest = p => { const x = Math.round(p.x), z = Math.round(p.z); for (let r = 0; r < 5; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (free(x + dx, z + dz)) return [x + dx, z + dz]; return null; };
      const a = nearest(start), b = nearest(end); if (!a || !b) return [];
      const heap = [], nodes = new Map(), closed = new Set();
      const push = n => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p].f <= n.f) break; heap[i] = heap[p]; i = p; } heap[i] = n; };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { let i = 0; while (i * 2 + 1 < heap.length) { let c = i * 2 + 1; if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++; if (last.f <= heap[c].f) break; heap[i] = heap[c]; i = c; } heap[i] = last; } return top; };
      const first = { x: a[0], z: a[1], g: 0, f: Math.hypot(a[0] - b[0], a[1] - b[1]), parent: null }; nodes.set(keyOf(...a), first); push(first);
      let visited = 0;
      while (heap.length && visited++ < 18000) {
        const n = pop(), key = keyOf(n.x, n.z); if (closed.has(key)) continue; closed.add(key);
        if (n.x === b[0] && n.z === b[1]) { const path = []; let current = n; while (current.parent) { path.push(new THREE.Vector3(current.x, 0, current.z)); current = current.parent; } path.reverse(); if (this.walkableLine(path.length ? path[path.length - 1] : start, end, radius)) path.push(end.clone().setY(0)); return path; }
        for (const step of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const x = n.x + step[0], z = n.z + step[1], k = keyOf(x, z); if (closed.has(k) || !free(x, z)) continue;
          if (step[0] && step[1] && (!free(x, n.z) || !free(n.x, z))) continue;
          if (!edgeFree(n.x, n.z, x, z)) continue;
          const cost = n.g + Math.hypot(...step), existing = nodes.get(k); if (existing && existing.g <= cost) continue;
          const next = { x: x, z: z, g: cost, f: cost + Math.hypot(x - b[0], z - b[1]), parent: n }; nodes.set(k, next); push(next);
        }
      }
      return [];
    }
    openNearbyDoors(position) { this.doors.forEach(d => { if (!d.locked && !d.open && d.hinge.getWorldPosition(this.temp).distanceTo(position) < 2.2) this.setDoor(d, true, true); }); }
    update(dt, time, camera) {
      this.time = time;
      if (this.skyDome) {
        this.skyDome.position.set(camera.position.x, -4, camera.position.z);
        const skyU = this.skyDome.material && this.skyDome.material.uniforms;
        if (skyU) {
          if (skyU.uTime) skyU.uTime.value = time;
          if (skyU.uFlash) skyU.uFlash.value = this.settings.reducedFlashes ? 0 : this.flash;
        }
      }
      if(!this.forestFrustum){this.forestFrustum=new THREE.Frustum();this.forestMatrix=new THREE.Matrix4();this.forestSphere=new THREE.Sphere(new THREE.Vector3(),20);}camera.updateMatrixWorld();this.forestMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.forestFrustum.setFromProjectionMatrix(this.forestMatrix);(this.forestClusters||[]).forEach(mesh=>{const distance=mesh.userData.clusterCenter.distanceToSquared(camera.position);this.forestSphere.center.copy(mesh.userData.clusterCenter).y=5;mesh.visible=distance<80*80&&(distance<30*30||this.forestFrustum.intersectsSphere(this.forestSphere));mesh.castShadow=distance<38*38;});
      this.moonLight.shadow.autoUpdate=false;if(time-(this.lastMoonShadow||-1)>.16){this.moonLight.shadow.needsUpdate=true;this.lastMoonShadow=time;}
      this.waterMaterial.uniforms.uTime.value = time;
      this.doors.forEach(d=>{const next=G.Utils.damp(d.angle,d.open?(d.openAngle||-Math.PI/2):0,5,dt);if(Math.abs(next-d.angle)>.0001&&this.doorSweepClear(d,next)){d.angle=next;d.hinge.rotation.y=next;this.refreshDoorCollider(d);}});
      this.rain.visible = !this.isIndoors(camera.position);
      this.rain.position.set(camera.position.x, 0, camera.position.z);
      if (this.rain.visible) {
        const rain = this.rainGeo.attributes.position.array;
        const rainLim = Number.isFinite(this.rainGeo.drawRange.count) ? Math.min(rain.length, this.rainGeo.drawRange.count * 3) : rain.length;
        for (let i = 0; i < rainLim; i += 6) { rain[i + 1] -= dt * 15; if (rain[i + 1] < 0) rain[i + 1] += 26; rain[i + 3] = rain[i] - .035; rain[i + 4] = rain[i + 1] - .45; }
        this.rainGeo.attributes.position.needsUpdate = true;
      }
      const ash = this.ashGeo.attributes.position.array;
      const ashLim = Number.isFinite(this.ashGeo.drawRange.count) ? Math.min(ash.length, this.ashGeo.drawRange.count * 3) : ash.length;
      for (let i = 0; i < ashLim; i += 3) { ash[i] += dt * .15; ash[i + 1] -= dt * .16; if (ash[i + 1] < .1) ash[i + 1] = 12; if (ash[i] > 30) ash[i] = -30; }
      this.ashGeo.attributes.position.needsUpdate = true; this.ash.position.set(camera.position.x, 0, camera.position.z);
      this.lightningTimer -= dt; this.flash = Math.max(0, this.flash - dt * 7);
      if (this.lightningTimer <= 0) { this.lightningTimer = 24 + this.random() * 28; this.flash = 1; this.bus.emit('weather:thunder', { delay: 1.2 + this.random() * 2.6 }); }
      this.stormLight.intensity = this.settings.reducedFlashes ? 0 : this.flash * 2.8;
      if (!this._prevCompPos) this._prevCompPos = new THREE.Vector3();
      this.companions.forEach((c, id) => {
        if (this.cinematic === 'intro') return;
        const previousPosition=this._prevCompPos.copy(c.model.position);
        const rescued = this.session && this.session.companions[id] === 'rescued'; let moving = 0;
        if (rescued && !c.arrived) {
          const target = new THREE.Vector3().fromArray(c.config.safePosition); c.repath -= dt;
          if (c.repath <= 0) { c.path = this.findPath(c.model.position, target); c.repath = 3; }
          this.openNearbyDoors(c.model.position);
          if (c.path.length) { const delta = c.path[0].clone().sub(c.model.position); delta.y = 0; if (delta.length() < .2) c.path.shift(); else { delta.normalize(); this.move(c.model.position, delta.x * dt * 2.1, delta.z * dt * 2.1, .28, 1.7); const targetYaw=Math.atan2(delta.x,delta.z),difference=Math.atan2(Math.sin(targetYaw-c.model.rotation.y),Math.cos(targetYaw-c.model.rotation.y));c.model.rotation.y+=G.Utils.clamp(difference,-dt*3,dt*3); } }
          if (c.model.position.distanceTo(target) < .8) c.arrived = true;
        }
        const travelled=c.model.position.distanceTo(previousPosition);c.model.userData.motionDistance=(c.model.userData.motionDistance||0)+travelled;moving=dt>0?Math.min(1,travelled/dt/2.1):0;c.model.userData.motionBlend=G.Utils.damp(c.model.userData.motionBlend||0,moving,8,dt);const gaze=Math.atan2(camera.position.x-c.model.position.x,camera.position.z-c.model.position.z)-c.model.rotation.y;const targetGaze=c.model.position.distanceTo(camera.position)<9?G.Utils.clamp(Math.atan2(Math.sin(gaze),Math.cos(gaze)),-.5,.5):0;c.model.userData.lookYaw=G.Utils.damp(c.model.userData.lookYaw||0,targetGaze,3,dt);this.models.animatePerson(c.model,time,c.model.userData.motionBlend,rescued?'safe':'captive');
      });
      this.models.update(time, this.settings.reducedMotion, camera, this.settings.quality);
      this.outageRemaining = Math.max(0, this.outageRemaining - dt);
      if (this.outageRemaining > 0) this.models.animations.forEach(a => { if (a.kind === 'lantern') a.light.intensity = 0; });
      const lanternMaterial = this.models.materials.get('lantern-red'); if (lanternMaterial) lanternMaterial.emissiveIntensity = this.outageRemaining > 0 ? .015 : .7;
      (this.volumetricBeams || []).forEach(beam => {
        const mesh = beam.mesh || beam;
        if (!mesh) return;
        mesh.visible = this.settings.volumetricBeams !== false && this.outageRemaining <= 0;
        const beamU = mesh.material && mesh.material.uniforms;
        if (beamU && beamU.uTime) beamU.uTime.value = time;
      });
      if (this.secretDrawer && this.drawerOpen) this.secretDrawer.position.z = G.Utils.damp(this.secretDrawer.position.z, .72, 3, dt);
      this.echoes.forEach(e => { const distance = camera.position.distanceTo(e.origin); e.model.visible = distance > 5 && distance < 27 && !(this.session && this.session.flags.ritualComplete); e.material.opacity = .18 * Math.min(1, Math.max(0, (distance - 5) / 4)); e.model.position.x = e.origin.x + Math.sin(time * .16 + e.phase) * .7; e.model.rotation.y = e.phase; this.models.animatePerson(e.model, time * .5, .12, 'captive'); });
    }
    dispose() { this.scene.remove(this.root); this.rainGeo.dispose(); this.ashGeo.dispose(); this.rainMat.dispose(); this.ashMat.dispose(); if (this.skyDome && this.skyDome.geometry) this.skyDome.geometry.dispose(); (this.volumetricBeams || []).forEach(beam => { const mesh = beam.mesh || beam; if (mesh && mesh.geometry) mesh.geometry.dispose(); if (mesh && mesh.material) mesh.material.dispose(); }); if (this.moonLight.shadow.map) this.moonLight.shadow.map.dispose(); this.interactions.clear(); this.targets = []; this.colliders = []; }
  };
}(window.Game = window.Game || {}));
