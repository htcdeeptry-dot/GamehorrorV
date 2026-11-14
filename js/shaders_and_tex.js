(function (G) {
  'use strict';

  G.TextureFactory = class TextureFactory {
    constructor(quality) {
      this.quality = quality || 'high';
      this.size = G.Config.quality[this.quality].textureSize;
      this.anisotropy = this.quality === 'ultra' ? 6 : this.quality === 'high' ? 4 : this.quality === 'medium' ? 2 : 1;
      this.cache = new Map();
      this.materials = new Map();
      this.owned = new Set();
    }

    canvas(width, height) {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height || width;
      return c;
    }

    texture(canvas, repeat, linear) {
      const t = new THREE.CanvasTexture(canvas);
      t.encoding = linear ? THREE.LinearEncoding : THREE.sRGBEncoding;
      t.anisotropy = this.anisotropy;
      if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
      this.owned.add(t);
      return t;
    }

    get(name) {
      if (this.cache.has(name)) return this.cache.get(name);
      const c = this.canvas(this.size), ctx = c.getContext('2d'), n = c.width;
      const seed = Array.from(name).reduce((a, ch) => Math.imul(a, 31) + ch.charCodeAt(0), G.Config.seed);
      const r = G.Utils.seededRandom(seed);
      const palettes = {
        wood: [62, 42, 29],
        wall: [104, 102, 86],
        stone: [82, 86, 87],
        ground: [39, 38, 32],
        roof: [48, 50, 56],
        cloth: [168, 162, 144],
        blood: [92, 10, 18],
        paper: [188, 152, 88],
        iron: [44, 46, 50],
        jade: [74, 128, 106],
        bark: [46, 36, 28],
        flagstone: [72, 76, 74],
        ceramic: [48, 34, 24]
      };
      const base = palettes[name] || [120, 116, 104];
      const pixels = ctx.createImageData(n, n);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const i = (y * n + x) * 4;
          const macro = Math.sin(x * .023 + y * .017) * Math.cos(y * .029 - x * .013) * 11;
          let grain = (r() - .5) * 24 + macro;
          if (name === 'wood') {
            const warp = Math.sin(y * .012 + Math.sin(x * .018) * 1.4) * 3.2;
            grain += Math.sin(x * .16 + warp) * 16 + Math.sin(x * .68 + warp * 1.6) * 7;
          } else if (name === 'bark') {
            const twist = Math.sin(y * .015 + Math.sin(x * .03) * 1.8) * 4.5;
            grain += Math.sin(x * .12 + twist) * 24 + Math.cos(x * .42 - twist) * 10 + (r() - .5) * 18;
          } else if (name === 'ceramic') {
            grain = Math.sin(y * .14) * 7 + Math.sin(y * .55) * 3 + (r() - .5) * 8;
          } else if (name === 'cloth') {
            grain += ((x % 4 === 0) ? -14 : 3) + ((y % 4 === 0) ? -12 : 3);
          } else if (name === 'iron') {
            grain = (r() - .5) * 18 + Math.sin(x * .09 + y * .07) * 8;
          } else if (name === 'jade') {
            grain = Math.sin(x * .04 + Math.sin(y * .03) * 2) * 16 + (r() - .5) * 12;
          }
          for (let k = 0; k < 3; k++) {
            pixels.data[i + k] = Math.max(0, Math.min(255, base[k] + grain));
          }
          pixels.data[i + 3] = 255;
        }
      }
      ctx.putImageData(pixels, 0, 0);

      if (name === 'wood') {
        const planks = 8;
        for (let i = 0; i < planks; i++) {
          const x = i * n / planks, pw = n / planks;
          ctx.fillStyle = 'rgba(' + Math.floor(r() * 14) + ',' + Math.floor(r() * 9) + ',4,' + (.12 + r() * .16) + ')';
          ctx.fillRect(x, 0, pw, n);
          // Plank bevel + dark gap
          ctx.fillStyle = '#0e0a07';
          ctx.fillRect(x, 0, Math.max(2, n / 220), n);
          ctx.fillStyle = 'rgba(170,142,110,0.22)';
          ctx.fillRect(x + Math.max(2, n / 220), 0, Math.max(1, n / 320), n);
          // Forged iron nail heads with rust halo
          for (const y of [n * .07, n * .50, n * .93]) {
            const nx = x + pw * .5 + (r() - .5) * pw * .12;
            const grd = ctx.createRadialGradient(nx, y, 0, nx, y, n / 70);
            grd.addColorStop(0, '#111214');
            grd.addColorStop(.45, '#3b1e14');
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(nx, y, n / 70, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#181a1c';
            ctx.beginPath(); ctx.arc(nx, y, n / 200, 0, Math.PI * 2); ctx.fill();
          }
        }
        // Wood knots
        for (let i = 0; i < 20; i++) {
          const x = r() * n, y = r() * n;
          ctx.strokeStyle = 'rgba(18,12,7,0.48)';
          ctx.lineWidth = Math.max(1, n / 400);
          for (let j = 1; j < 6; j++) {
            ctx.beginPath();
            ctx.ellipse(x, y, n / 240 * j, n / 48 * j, .04, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        // Damp dark bottom rot
        const rot = ctx.createLinearGradient(0, n * .68, 0, n);
        rot.addColorStop(0, 'rgba(12,14,10,0)');
        rot.addColorStop(1, 'rgba(10,12,8,0.52)');
        ctx.fillStyle = rot;
        ctx.fillRect(0, n * .68, n, n * .32);
      }

      if (name === 'stone' || name === 'roof' || name === 'wall' || name === 'flagstone' || name === 'bark') {
        if (name === 'roof') {
          // Overlapping Yin-Yang curved barrel & pan clay tiles
          const rows = 12, cols = 10, h = n / rows, w = n / cols;
          for (let row = 0; row < rows; row++) {
            for (let col = -1; col <= cols; col++) {
              const x = col * w + (row % 2) * (w * .5), y = row * h;
              const tileShade = Math.floor(38 + r() * 26);
              ctx.fillStyle = 'rgb(' + tileShade + ',' + (tileShade + 1) + ',' + (tileShade + 6) + ')';
              ctx.fillRect(x + 2, y + 1, w - 4, h - 2);
              const tg = ctx.createLinearGradient(x, y, x + w, y);
              tg.addColorStop(0, 'rgba(0,0,0,0.48)');
              tg.addColorStop(.5, 'rgba(150,156,162,0.22)');
              tg.addColorStop(1, 'rgba(0,0,0,0.52)');
              ctx.fillStyle = tg;
              ctx.fillRect(x, y, w, h);
              ctx.fillStyle = 'rgba(7,8,10,0.82)';
              ctx.fillRect(x, y + h - Math.max(2, h * .16), w, Math.max(2, h * .16));
              // Curved eaves lip scallop
              ctx.beginPath();
              ctx.arc(x + w * .5, y + h * .84, w * .38, 0, Math.PI);
              ctx.fillStyle = 'rgba(128,132,140,0.12)';
              ctx.fill();
            }
          }
        } else if (name === 'stone') {
          const rows = 6, h = n / rows;
          for (let row = 0; row < rows; row++) {
            let x = -(row % 2) * (n / 7);
            while (x < n) {
              const w = n / (3.1 + r() * 2.2), y = row * h;
              const v = 68 + Math.floor(r() * 34);
              ctx.fillStyle = 'rgb(' + v + ',' + (v + 4) + ',' + (v + 5) + ')';
              ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
              ctx.strokeStyle = 'rgba(14,16,16,0.92)';
              ctx.lineWidth = Math.max(3, n / 98);
              ctx.strokeRect(x, y, w, h);
              ctx.strokeStyle = 'rgba(176,182,174,0.18)';
              ctx.lineWidth = Math.max(1, n / 280);
              ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
              x += w;
            }
          }
        } else if (name === 'flagstone') {
          // Chiseled village stone pavers with mossy mortar channels
          ctx.fillStyle = '#1b2419';
          ctx.fillRect(0, 0, n, n);
          const rows = 5, h = n / rows;
          for (let row = 0; row < rows; row++) {
            let x = -(row % 2) * (n / 5.2);
            while (x < n) {
              const w = n / (2.5 + r() * 1.4), y = row * h;
              const v = 64 + Math.floor(r() * 32);
              const pad = Math.max(4, n / 68);
              ctx.fillStyle = 'rgb(' + v + ',' + (v + 5) + ',' + (v + 3) + ')';
              ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);
              ctx.strokeStyle = 'rgba(170,178,168,0.16)';
              ctx.lineWidth = Math.max(1, n / 240);
              ctx.strokeRect(x + pad + 2, y + pad + 2, w - pad * 2 - 4, h - pad * 2 - 4);
              x += w;
            }
          }
        } else if (name === 'bark') {
          for (let i = 0; i < 42; i++) {
            const x = r() * n, rw = Math.max(2, n * (.006 + r() * .018));
            ctx.fillStyle = r() < .55 ? 'rgba(14,10,8,0.45)' : 'rgba(84,68,52,0.22)';
            ctx.fillRect(x, 0, rw, n);
          }
        } else {
          // Aged lime plaster with water damage & exposed clay brick patches
          const stain = ctx.createLinearGradient(0, 0, 0, n);
          stain.addColorStop(0, 'rgba(14,16,14,0.22)');
          stain.addColorStop(.5, 'rgba(0,0,0,0)');
          stain.addColorStop(1, 'rgba(12,18,12,0.48)');
          ctx.fillStyle = stain;
          ctx.fillRect(0, 0, n, n);
          for (let i = 0; i < 16; i++) {
            const px = r() * n, py = r() * n, rx = n * (.03 + r() * .07), ry = n * (.02 + r() * .05);
            ctx.fillStyle = 'rgba(54,38,26,' + (.26 + r() * .34) + ')';
            ctx.beginPath(); ctx.ellipse(px, py, rx, ry, r() * 3, 0, Math.PI * 2); ctx.fill();
            for (let b = -1; b <= 1; b++) {
              ctx.fillStyle = 'rgba(98,46,28,0.40)';
              ctx.fillRect(px - rx * .55, py + b * ry * .32, rx * 1.1, ry * .22);
            }
          }
        }
        // Cracks
        for (let i = 0; i < 28; i++) {
          let x = r() * n, y = r() * n;
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let j = 0; j < 7; j++) { x += (r() - .5) * n / 16; y += (r() - .2) * n / 24; ctx.lineTo(x, y); }
          ctx.strokeStyle = 'rgba(16,18,17,0.68)';
          ctx.lineWidth = Math.max(1, n / 340);
          ctx.stroke();
        }
      }

      if (name === 'ceramic') {
        const g = ctx.createLinearGradient(0, 0, 0, n);
        g.addColorStop(0, 'rgba(20,14,10,0.48)');
        g.addColorStop(.32, 'rgba(94,64,42,0.25)');
        g.addColorStop(1, 'rgba(12,10,8,0.52)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, n, n);
        for (let y = n * .15; y < n * .85; y += n * .12) {
          ctx.fillStyle = 'rgba(18,12,8,0.26)';
          ctx.fillRect(0, y, n, Math.max(2, n / 120));
        }
      }

      if (name === 'ground') {
        // Mud, pebbles, damp dark puddles, and fallen leaves
        for (let i = 0; i < 34; i++) {
          const px = r() * n, py = r() * n, rad = n * (.04 + r() * .09);
          const pg = ctx.createRadialGradient(px, py, 0, px, py, rad);
          pg.addColorStop(0, 'rgba(12,15,14,0.56)');
          pg.addColorStop(1, 'rgba(14,16,14,0)');
          ctx.fillStyle = pg;
          ctx.beginPath(); ctx.ellipse(px, py, rad, rad * (.6 + r() * .5), r() * 6, 0, Math.PI * 2); ctx.fill();
        }
        for (let i = 0; i < 1200; i++) {
          const x = r() * n, y = r() * n, s = 1 + r() * n / 120;
          ctx.fillStyle = r() < .42 ? '#232920' : r() < .82 ? '#4d4c41' : '#58442a';
          ctx.beginPath(); ctx.ellipse(x, y, s, s * .55, r() * 6, 0, Math.PI * 2); ctx.fill();
        }
      }

      if (name === 'blood') {
        ctx.clearRect(0, 0, n, n);
        for (let i = 0; i < 75; i++) {
          ctx.fillStyle = 'rgba(' + (72 + Math.floor(r() * 40)) + ',4,12,' + (.28 + r() * .66) + ')';
          ctx.beginPath(); ctx.ellipse(n * (.18 + r() * .64), n * (.18 + r() * .64), n * r() * .15, n * r() * .13, r() * 6, 0, Math.PI * 2); ctx.fill();
        }
        for (let i = 0; i < 16; i++) {
          const x = n * (.2 + r() * .6), y = n * .48;
          ctx.strokeStyle = 'rgba(102,9,20,0.78)';
          ctx.lineWidth = n * (.003 + r() * .009);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - .5) * n * .03, n * (.68 + r() * .3)); ctx.stroke();
        }
      }

      if (name === 'iron') {
        for (let i = 0; i < 320; i++) {
          const x = r() * n, y = r() * n, rad = n * (.004 + r() * .018);
          ctx.fillStyle = r() < .32 ? 'rgba(92,42,22,0.28)' : 'rgba(120,126,134,0.16)';
          ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
        }
      }

      if (['wall', 'wood', 'stone', 'roof', 'flagstone', 'bark'].includes(name)) {
        for (let i = 0; i < 2400; i++) {
          const x = r() * n, y = n * (.42 + r() * .58), radius = n * (.001 + r() * .013);
          ctx.fillStyle = 'rgba(' + (22 + Math.floor(r() * 24)) + ',' + (42 + Math.floor(r() * 28)) + ',19,' + (.14 + r() * .38) + ')';
          ctx.beginPath(); ctx.ellipse(x, y, radius, radius * .55, r() * 6, 0, Math.PI * 2); ctx.fill();
        }
        for (let i = 0; i < 28; i++) {
          ctx.fillStyle = 'rgba(18,24,18,0.18)';
          ctx.fillRect(r() * n, r() * n * .65, n * (.003 + r() * .009), n * (.12 + r() * .34));
        }
      }

      const map = this.texture(c, !['blood', 'paper'].includes(name), false);
      this.cache.set(name, map);
      return map;
    }

    foliage() {
      if (this.cache.has('foliage')) return this.cache.get('foliage');
      const c = this.canvas(512), ctx = c.getContext('2d'), r = G.Utils.seededRandom(8712);
      // Radial branching twigs
      for (let b = 0; b < 14; b++) {
        const ang = (b / 14) * Math.PI * 2 + r() * .3;
        ctx.strokeStyle = 'rgba(34,26,20,0.88)';
        ctx.lineWidth = 4 + r() * 4;
        ctx.beginPath();
        ctx.moveTo(256, 256);
        ctx.quadraticCurveTo(256 + Math.cos(ang + .2) * 110, 256 + Math.sin(ang + .2) * 110, 256 + Math.cos(ang) * 208, 256 + Math.sin(ang) * 208);
        ctx.stroke();
      }
      for (let i = 0; i < 520; i++) {
        const a = r() * Math.PI * 2, radius = 16 + Math.sqrt(r()) * 212, x = 256 + Math.cos(a) * radius, y = 256 + Math.sin(a) * radius;
        const sc = .68 + r() * .55;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + (r() - .5) * 1.4); ctx.scale(sc, sc);
        const shade = ['#172416', '#21311e', '#293923', '#121d14', '#313d24'][i % 5];
        ctx.fillStyle = shade;
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.bezierCurveTo(18, -10, 16, 16, 0, 28);
        ctx.bezierCurveTo(-16, 16, -18, -10, 0, -28);
        ctx.fill();
        ctx.strokeStyle = 'rgba(96,112,72,0.34)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, 24); ctx.stroke();
        ctx.restore();
      }
      const t = this.texture(c, false, false);
      this.cache.set('foliage', t);
      return t;
    }

    bambooFoliage() {
      if (this.cache.has('bamboo-foliage')) return this.cache.get('bamboo-foliage');
      const c = this.canvas(512), ctx = c.getContext('2d'), r = G.Utils.seededRandom(4192);
      for (let g = 0; g < 36; g++) {
        const cx = 64 + r() * 384, cy = 70 + r() * 360, blades = 4 + Math.floor(r() * 4);
        for (let b = 0; b < blades; b++) {
          const ang = (b / blades - .5) * 1.4 + (r() - .5) * .35 + Math.PI * .22;
          const len = 68 + r() * 62;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
          ctx.fillStyle = ['#1f331c', '#294022', '#172716', '#334827'][(g + b) % 4];
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(9, len * .45, 0, len);
          ctx.quadraticCurveTo(-9, len * .45, 0, 0);
          ctx.fill();
          ctx.restore();
        }
      }
      const t = this.texture(c, false, false);
      this.cache.set('bamboo-foliage', t);
      return t;
    }

    clothWrinkle() {
      if (this.cache.has('cloth-wrinkle')) return this.cache.get('cloth-wrinkle');
      const n = 256, c = this.canvas(n), ctx = c.getContext('2d'), img = ctx.createImageData(n, n);
      const hVal = (x, y) => {
        const weave = (Math.sin(x * 1.45) * 0.25 + Math.sin(y * 1.45) * 0.25);
        const fold1 = Math.sin(x * .075 + Math.sin(y * .045) * 2.2) * .65;
        const fold2 = Math.cos(y * .09 - x * .035) * .42;
        return weave + fold1 + fold2;
      };
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const i = (y * n + x) * 4;
          const dx = (hVal(x - 1, y) - hVal(x + 1, y)) * 1.35;
          const dy = (hVal(x, y - 1) - hVal(x, y + 1)) * 1.35;
          const len = Math.hypot(dx, dy, 1);
          img.data[i] = Math.round((dx / len * .5 + .5) * 255);
          img.data[i + 1] = Math.round((dy / len * .5 + .5) * 255);
          img.data[i + 2] = Math.round((1 / len * .5 + .5) * 255);
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      const t = this.texture(c, true, true);
      this.cache.set('cloth-wrinkle', t);
      return t;
    }

    surface(name) {
      const key = name + ':surface';
      if (this.cache.has(key)) return this.cache.get(key);
      const diffuse = this.get(name), c = diffuse.image, n = c.width;
      const source = c.getContext('2d').getImageData(0, 0, n, n).data;
      const bumpCanvas = this.canvas(n), normalCanvas = this.canvas(n), roughCanvas = this.canvas(n);
      const bctx = bumpCanvas.getContext('2d'), nctx = normalCanvas.getContext('2d'), rctx = roughCanvas.getContext('2d');
      const bump = bctx.createImageData(n, n), normal = nctx.createImageData(n, n), rough = rctx.createImageData(n, n);
      const lum = (x, y) => {
        const idx = (((y + n) % n) * n + ((x + n) % n)) * 4;
        return (source[idx] * .299 + source[idx + 1] * .587 + source[idx + 2] * .114) / 255;
      };
      const repeat = !['blood', 'paper'].includes(name);
      const bumpGain = name === 'stone' || name === 'roof' || name === 'flagstone' || name === 'bark' ? 3.2 : name === 'wood' ? 2.4 : 1.9;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const i = (y * n + x) * 4;
          const h = lum(x, y);
          const dx = (lum(x - 1, y) - lum(x + 1, y)) * bumpGain;
          const dy = (lum(x, y - 1) - lum(x, y + 1)) * bumpGain;
          const length = Math.hypot(dx, dy, 1);
          bump.data[i] = bump.data[i + 1] = bump.data[i + 2] = Math.round(h * 255);
          bump.data[i + 3] = 255;
          normal.data[i] = Math.round((dx / length * .5 + .5) * 255);
          normal.data[i + 1] = Math.round((dy / length * .5 + .5) * 255);
          normal.data[i + 2] = Math.round((1 / length * .5 + .5) * 255);
          normal.data[i + 3] = 255;
          // Wet rain puddles & dark crevices get lower roughness so moon/flashlight gleams naturally
          const wetness = name === 'ground' ? (h < .17 ? .18 : .86)
            : name === 'flagstone' ? (h < .22 ? .24 : .78)
            : name === 'stone' || name === 'roof' ? (h < .22 ? .38 : .82)
            : name === 'ceramic' ? (.26 + h * .24)
            : name === 'bark' ? (.78 + h * .18)
            : name === 'wood' ? (.54 + h * .34)
            : name === 'iron' ? (.30 + h * .36) : (.72 + h * .24);
          const rv = Math.max(36, Math.min(248, Math.round(wetness * 255)));
          rough.data[i] = rough.data[i + 1] = rough.data[i + 2] = rv;
          rough.data[i + 3] = 255;
        }
      }
      bctx.putImageData(bump, 0, 0);
      nctx.putImageData(normal, 0, 0);
      rctx.putImageData(rough, 0, 0);
      const bumpMap = this.texture(bumpCanvas, repeat, true);
      const normalMap = this.texture(normalCanvas, repeat, true);
      const roughnessMap = this.texture(roughCanvas, repeat, true);
      const result = { map: diffuse, bumpMap: bumpMap, normalMap: normalMap, roughnessMap: roughnessMap };
      this.cache.set(key, result);
      return result;
    }

    material(name, color) {
      const key = name + ':' + (color === undefined ? 'base' : color);
      if (this.materials.has(key)) return this.materials.get(key);
      const s = this.surface(name);
      const ns = (name === 'stone' || name === 'roof' || name === 'flagstone' || name === 'bark') ? .88 : .66;
      const m = new THREE.MeshStandardMaterial({
        map: s.map,
        normalMap: s.normalMap,
        normalScale: new THREE.Vector2(ns, ns),
        roughnessMap: s.roughnessMap,
        roughness: name === 'blood' ? .16 : name === 'ceramic' ? .76 : name === 'iron' ? .62 : name === 'jade' ? .28 : .95,
        metalness: name === 'iron' ? .82 : name === 'blood' ? .06 : 0,
        color: color === undefined ? 0xffffff : color
      });
      this.materials.set(key, m);
      return m;
    }

    label(lines, options) {
      options = options || {};
      const c = this.canvas(options.width || 512, options.height || 256), ctx = c.getContext('2d');
      ctx.fillStyle = options.background || '#241e18';
      ctx.fillRect(0, 0, c.width, c.height);
      // Wood plaque grain background
      const r = G.Utils.seededRandom(1994);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = 'rgba(0,0,0,' + (0.08 + r() * 0.14) + ')';
        ctx.fillRect(0, r() * c.height, c.width, 1 + r() * 3);
      }
      ctx.strokeStyle = options.border || '#9a8055';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
      ctx.strokeStyle = 'rgba(20,14,10,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(18, 18, c.width - 36, c.height - 36);
      ctx.fillStyle = options.color || '#dfd0ae';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + (options.fontSize || 36) + 'px "LeThon Noto", Arial, sans-serif';
      lines.forEach((line, i) => ctx.fillText(String(line).normalize('NFC'), c.width / 2, c.height * (i + 1) / (lines.length + 1), c.width - 44));
      return this.texture(c, false, false);
    }

    talisman() {
      if (this.cache.has('talisman')) return this.cache.get('talisman');
      const c = this.canvas(256, 512), ctx = c.getContext('2d');
      ctx.drawImage(this.get('paper').image, 0, 0, 256, 512);
      ctx.strokeStyle = '#872722'; ctx.lineWidth = 7; ctx.strokeRect(18, 16, 220, 480);
      ctx.fillStyle = '#8c211e'; ctx.textAlign = 'center'; ctx.font = 'bold 58px serif';
      ['護', '命', '鎮', '魂'].forEach((s, i) => ctx.fillText(s, 128, 100 + i * 95));
      ctx.beginPath(); ctx.moveTo(48, 453); ctx.lineTo(100, 430); ctx.lineTo(153, 470); ctx.lineTo(209, 432); ctx.stroke();
      const t = this.texture(c, false, false);
      this.cache.set('talisman', t);
      return t;
    }

    moon() {
      if (this.cache.has('moon')) return this.cache.get('moon');
      const n = Math.min(512, Math.max(256, this.size)), c = this.canvas(n), ctx = c.getContext('2d'), r = G.Utils.seededRandom(9123);
      const g = ctx.createRadialGradient(n * .46, n * .42, n * .05, n * .5, n * .5, n * .52);
      g.addColorStop(0, '#c87266');
      g.addColorStop(.52, '#9a3438');
      g.addColorStop(.86, '#5c141d');
      g.addColorStop(1, '#2d080d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, n, n);
      // Lunar maria basins
      for (let i = 0; i < 24; i++) {
        const mx = n * (.15 + r() * .7), my = n * (.15 + r() * .7), rx = n * (.05 + r() * .13), ry = rx * (.65 + r() * .55);
        const mg = ctx.createRadialGradient(mx, my, 0, mx, my, rx);
        mg.addColorStop(0, 'rgba(32,6,11,' + (.28 + r() * .35) + ')');
        mg.addColorStop(1, 'rgba(32,6,11,0)');
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.ellipse(mx, my, rx, ry, r() * Math.PI, 0, Math.PI * 2); ctx.fill();
      }
      // Crater rims
      for (let i = 0; i < 46; i++) {
        const cx = r() * n, cy = r() * n, rad = 4 + r() * 24;
        ctx.strokeStyle = 'rgba(235,165,152,' + (.10 + r() * .16) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(28,5,10,' + (.14 + r() * .18) + ')';
        ctx.beginPath(); ctx.arc(cx + 1.5, cy + 1.5, rad * .82, 0, Math.PI * 2); ctx.fill();
      }
      const t = this.texture(c, false, false);
      this.cache.set('moon', t);
      return t;
    }

    halo() {
      if (this.cache.has('halo')) return this.cache.get('halo');
      const n = 256, c = this.canvas(n), ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(.18, 'rgba(255,220,195,0.68)');
      g.addColorStop(.48, 'rgba(255,140,120,0.22)');
      g.addColorStop(1, 'rgba(255,80,80,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, n, n);
      const t = this.texture(c, false, false);
      this.cache.set('halo', t);
      return t;
    }

    eyeTexture(irisHex, ghost) {
      const key = 'eye:' + irisHex + ':' + (ghost ? 'g' : 'h');
      if (this.cache.has(key)) return this.cache.get(key);
      const n = 256, c = this.canvas(n), ctx = c.getContext('2d'), cx = n / 2, cy = n / 2;
      const r = G.Utils.seededRandom(irisHex ^ (ghost ? 999 : 333));
      // Clear porcelain living sclera or haunting spirit sclera
      const scl = ctx.createRadialGradient(cx, cy, n * .12, cx, cy, n * .5);
      scl.addColorStop(0, ghost ? '#cdd2cc' : '#f7f2ec');
      scl.addColorStop(.68, ghost ? '#a4aba7' : '#ebe2d9');
      scl.addColorStop(1, ghost ? '#5a4e50' : '#bda299');
      ctx.fillStyle = scl;
      ctx.fillRect(0, 0, n, n);
      // Subtle scleral vessels only on outer edges for humans, darker crimson for Ghost Linh
      const veins = ghost ? 22 : 6;
      for (let i = 0; i < veins; i++) {
        const a = r() * Math.PI * 2;
        let vx = cx + Math.cos(a) * n * .45, vy = cy + Math.sin(a) * n * .45;
        ctx.beginPath(); ctx.moveTo(vx, vy);
        for (let s = 0; s < 4; s++) {
          const dist = n * (.38 - s * .045), da = a + (r() - .5) * .25;
          vx = cx + Math.cos(da) * dist; vy = cy + Math.sin(da) * dist;
          ctx.lineTo(vx, vy);
        }
        ctx.strokeStyle = ghost ? 'rgba(130,22,30,' + (.26 + r() * .32) + ')' : 'rgba(155,78,76,' + (.05 + r() * .07) + ')';
        ctx.lineWidth = ghost ? 1.3 : .7;
        ctx.stroke();
      }
      // Expressive luminous Iris stroma
      const irisR = n * .255;
      const baseCol = new THREE.Color(irisHex);
      const ir = Math.round(baseCol.r * 255), ig = Math.round(baseCol.g * 255), ib = Math.round(baseCol.b * 255);
      const irGrad = ctx.createRadialGradient(cx, cy, irisR * .15, cx, cy, irisR);
      irGrad.addColorStop(0, 'rgb(' + Math.min(255, Math.round(ir * 1.45)) + ',' + Math.min(255, Math.round(ig * 1.35)) + ',' + Math.min(255, Math.round(ib * 1.25)) + ')');
      irGrad.addColorStop(.72, 'rgb(' + ir + ',' + ig + ',' + ib + ')');
      irGrad.addColorStop(1, 'rgb(' + Math.max(0, ir - 44) + ',' + Math.max(0, ig - 44) + ',' + Math.max(0, ib - 44) + ')');
      ctx.fillStyle = irGrad;
      ctx.beginPath(); ctx.arc(cx, cy, irisR, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 140; i++) {
        const a = (i / 140) * Math.PI * 2 + (r() - .5) * .04;
        const mix = .72 + r() * .85;
        ctx.strokeStyle = 'rgba(' + Math.min(255, Math.round(ir * mix)) + ',' + Math.min(255, Math.round(ig * mix)) + ',' + Math.min(255, Math.round(ib * mix)) + ',' + (.30 + r() * .42) + ')';
        ctx.lineWidth = .8 + r() * 1.2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (irisR * .30), cy + Math.sin(a) * (irisR * .30));
        ctx.lineTo(cx + Math.cos(a) * (irisR * .95), cy + Math.sin(a) * (irisR * .95));
        ctx.stroke();
      }
      // Crisp deep limbal dark ring
      ctx.strokeStyle = ghost ? 'rgba(10,6,9,0.92)' : 'rgba(14,9,7,0.88)';
      ctx.lineWidth = n * .026;
      ctx.beginPath(); ctx.arc(cx, cy, irisR * .96, 0, Math.PI * 2); ctx.stroke();
      // Pupil
      ctx.fillStyle = '#030405';
      ctx.beginPath(); ctx.arc(cx, cy, irisR * (ghost ? .36 : .41), 0, Math.PI * 2); ctx.fill();
      // Dual sparkling catchlights
      ctx.fillStyle = 'rgba(255,250,245,0.62)';
      ctx.beginPath(); ctx.arc(cx - irisR * .28, cy - irisR * .28, irisR * .11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,244,232,0.34)';
      ctx.beginPath(); ctx.arc(cx + irisR * .22, cy + irisR * .24, irisR * .055, 0, Math.PI * 2); ctx.fill();
      // Subtle upper-lid AO shadow without blacking out upper iris sparkle
      const lidAO = ctx.createLinearGradient(0, cy - irisR * 1.45, 0, cy + irisR * .1);
      lidAO.addColorStop(0, 'rgba(12,8,8,0.48)');
      lidAO.addColorStop(.55, 'rgba(12,8,8,0.12)');
      lidAO.addColorStop(1, 'rgba(12,8,8,0)');
      ctx.fillStyle = lidAO;
      ctx.fillRect(0, 0, n, n);
      const t = this.texture(c, false, false);
      this.cache.set(key, t);
      return t;
    }

    face(ghost) {
      const key = ghost ? 'ghost_face' : 'human_face';
      if (this.cache.has(key)) return this.cache.get(key);
      const c = this.canvas(Math.min(512, Math.max(256, this.size))), ctx = c.getContext('2d'), s = c.width;
      ctx.fillStyle = ghost ? '#cad0c7' : '#d2b69d';
      ctx.fillRect(0, 0, s, s);
      const shade = ctx.createRadialGradient(s * .5, s * .44, s * .08, s * .5, s * .5, s * .55);
      shade.addColorStop(0, '#ffffff18'); shade.addColorStop(1, '#28302888');
      ctx.fillStyle = shade; ctx.fillRect(0, 0, s, s);
      const t = this.texture(c, false, false);
      this.cache.set(key, t);
      return t;
    }

    skinMicro() {
      if (this.cache.has('skin-micro')) return this.cache.get('skin-micro');
      const n = Math.min(512, Math.max(256, this.size)), canvas = this.canvas(n), ctx = canvas.getContext('2d'), r = G.Utils.seededRandom(4408);
      // Silky airbrushed porcelain micro-normal (fine low-amplitude tangent perturbation)
      const img = ctx.createImageData(n, n);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const i = (y * n + x) * 4;
          const nx = 128 + (r() - .5) * 10 + Math.sin(x * .22 + y * .10) * 3;
          const ny = 128 + (r() - .5) * 10 + Math.cos(y * .20 - x * .08) * 3;
          img.data[i] = Math.max(114, Math.min(142, nx));
          img.data[i + 1] = Math.max(114, Math.min(142, ny));
          img.data[i + 2] = 252;
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      const t = this.texture(canvas, true, true);
      this.cache.set('skin-micro', t);
      return t;
    }

    hairStrands() {
      if (this.cache.has('hair-strands')) return this.cache.get('hair-strands');
      const canvas = this.canvas(256, 512), ctx = canvas.getContext('2d'), r = G.Utils.seededRandom(2728);
      ctx.clearRect(0, 0, 256, 512);
      // Soft horizontally feathered lock core + irregular wispy strand tips (zero blunt block edges)
      const horiz = ctx.createLinearGradient(0, 0, 256, 0);
      horiz.addColorStop(0, 'rgba(20,16,15,0)');
      horiz.addColorStop(.18, 'rgba(24,19,18,0.58)');
      horiz.addColorStop(.50, 'rgba(28,22,20,0.92)');
      horiz.addColorStop(.82, 'rgba(24,19,18,0.58)');
      horiz.addColorStop(1, 'rgba(20,16,15,0)');
      const vert = ctx.createLinearGradient(0, 0, 0, 512);
      vert.addColorStop(0, 'rgba(255,255,255,0.96)');
      vert.addColorStop(.62, 'rgba(255,255,255,0.82)');
      vert.addColorStop(.88, 'rgba(255,255,255,0.22)');
      vert.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = horiz;
      ctx.fillRect(16, 0, 224, 420);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = vert;
      ctx.fillRect(0, 0, 256, 512);
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 320; i++) {
        const x = 16 + r() * 224;
        const c1 = 22 + Math.floor(r() * 58);
        const endY = 300 + Math.pow(r(), .65) * 208;
        ctx.strokeStyle = 'rgba(' + (c1 + 8) + ',' + Math.max(12, c1 - 2) + ',' + Math.max(12, c1 - 5) + ',' + (.45 + r() * .50) + ')';
        ctx.lineWidth = .45 + r() * 1.15;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + (r() - .5) * 16, 140, x + (r() - .5) * 14, 300, x + (r() - .5) * 20, endY);
        ctx.stroke();
      }
      const t = this.texture(canvas, false, false);
      this.cache.set('hair-strands', t);
      return t;
    }

    createSkinSssMaterial(opts) {
      const ghost = !!(opts && opts.ghost);
      const sssHex = ghost ? 0x466368 : 0xd8705e;
      const rimHex = ghost ? 0x708b90 : 0x788e99;
      const mat = new THREE.MeshStandardMaterial({
        map: opts.map || null,
        normalMap: opts.normalMap || null,
        normalScale: opts.normalScale || new THREE.Vector2(.18, .18),
        roughnessMap: opts.roughnessMap || null,
        roughness: opts.roughness !== undefined ? opts.roughness : (ghost ? .48 : .44),
        metalness: 0,
        color: opts.color !== undefined ? opts.color : 0xffffff,
        skinning: opts.skinning !== undefined ? opts.skinning : true,
        morphTargets: opts.morphTargets !== undefined ? opts.morphTargets : true,
        defines: { SKIN_SSS: ghost ? 2 : 1 }
      });
      mat.onBeforeCompile = function (shader) {
        shader.uniforms.uSssColor = { value: new THREE.Color(sssHex) };
        shader.uniforms.uRimColor = { value: new THREE.Color(rimHex) };
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 uSssColor;\nuniform vec3 uRimColor;')
          .replace(
            '#include <lights_fragment_end>',
            '#include <lights_fragment_end>\n' +
            'float skinNdv = clamp(dot(geometry.normal, geometry.viewDir), 0.0, 1.0);\n' +
            'float skinFres = pow(1.0 - skinNdv, 3.2);\n' +
            'float directLuma = clamp(dot(reflectedLight.directDiffuse, vec3(0.3, 0.59, 0.11)) * 1.9, 0.0, 1.0);\n' +
            'reflectedLight.directDiffuse += diffuseColor.rgb * uSssColor * (0.16 + 0.28 * skinFres) * (0.35 + 0.65 * directLuma);\n' +
            'reflectedLight.indirectDiffuse += diffuseColor.rgb * uSssColor * 0.09;\n' +
            'reflectedLight.indirectSpecular += uRimColor * skinFres * 0.16;'
          );
      };
      return mat;
    }

    roadSurface() {
      if (this.cache.has('road-surface')) return this.cache.get('road-surface');
      const s = this.size >= 768 ? 1024 : Math.max(256, this.size);
      const sc = s / 1024;
      const c = this.canvas(s), ctx = c.getContext('2d'), r = G.Utils.seededRandom(688);
      ctx.fillStyle = '#2c3128';
      ctx.fillRect(0, 0, s, s);
      const count = Math.round(42000 * (sc * sc * .75 + .25));
      for (let i = 0; i < count; i++) {
        const x = r() * s, y = r() * s, v = 30 + Math.floor(r() * 52);
        ctx.fillStyle = 'rgb(' + v + ',' + (v + 3) + ',' + (v - 4) + ')';
        ctx.beginPath(); ctx.ellipse(x, y, (.6 + r() * 4.2) * sc, (.7 + r() * 3.2) * sc, r() * 6, 0, 7); ctx.fill();
      }
      // Deep cart ruts & rain puddles along old village dirt lane
      [.27, .73].forEach(x => {
        const g = ctx.createLinearGradient((x - .13) * s, 0, (x + .13) * s, 0);
        g.addColorStop(0, 'rgba(18,22,19,0)');
        g.addColorStop(.5, 'rgba(10,14,13,0.82)');
        g.addColorStop(1, 'rgba(18,22,19,0)');
        ctx.fillStyle = g; ctx.fillRect((x - .13) * s, 0, 266 * sc, s);
      });
      // Embedded worn cobbles & dead leaves
      const stones = Math.round(420 * (sc * .65 + .35));
      for (let i = 0; i < stones; i++) {
        ctx.fillStyle = i % 3 === 0 ? '#6e6540' : i % 3 === 1 ? '#454a3a' : '#4a3d27';
        ctx.beginPath(); ctx.ellipse(r() * s, r() * s, (2 + r() * 5) * sc, (1.2 + r() * 2.5) * sc, r() * 6, 0, 7); ctx.fill();
      }
      const t = this.texture(c, true, false);
      this.cache.set('road-surface', t);
      return t;
    }

    createSkyDome(moonPos) {
      return new THREE.ShaderMaterial({
        vertexShader: G.Shaders.skyVertex,
        fragmentShader: G.Shaders.skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uFlash: { value: 0 },
          uMoonDir: { value: moonPos.clone().normalize() }
        }
      });
    }

    createBeamMaterial(colorHex, opacity) {
      return new THREE.ShaderMaterial({
        vertexShader: G.Shaders.beamVertex,
        fragmentShader: G.Shaders.beamFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
        uniforms: {
          uColor: { value: new THREE.Color(colorHex || 0xd6b078) },
          uOpacity: { value: opacity === undefined ? 0.16 : opacity },
          uTime: { value: 0 }
        }
      });
    }

    skin(ghost) {
      const key = 'skin-surface:' + ghost;
      if (this.cache.has(key)) return this.cache.get(key);
      const c = this.canvas(512), ctx = c.getContext('2d'), r = G.Utils.seededRandom(ghost ? 671 : 991);
      ctx.fillStyle = ghost ? '#bcc2b8' : '#dfc8b4';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 14000; i++) {
        const light = r() > .5;
        ctx.fillStyle = light ? '#fff4dd16' : '#53443b12';
        ctx.fillRect(r() * 512, r() * 512, 1 + r(), 1 + r());
      }
      for (let i = 0; i < 30; i++) {
        const x = r() * 512, y = r() * 512, g = ctx.createRadialGradient(x, y, 0, x, y, 25 + r() * 25);
        g.addColorStop(0, ghost ? '#52645a28' : '#a85f4b1d'); g.addColorStop(1, '#00000000');
        ctx.fillStyle = g; ctx.fillRect(x - 60, y - 60, 120, 120);
      }
      const texture = this.texture(c, true, false);
      this.cache.set(key, texture);
      return texture;
    }

    particle() {
      if (this.cache.has('particle')) return this.cache.get('particle');
      const c = this.canvas(64), ctx = c.getContext('2d'), g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, '#ffffffff'); g.addColorStop(.25, '#ffffffa0'); g.addColorStop(1, '#ffffff00');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
      const t = this.texture(c, false, false);
      this.cache.set('particle', t);
      return t;
    }

    dispose() {
      this.materials.forEach(m => m.dispose());
      this.owned.forEach(t => t.dispose());
      this.cache.clear();
      this.materials.clear();
      this.owned.clear();
    }
  };

  G.Shaders = Object.freeze({
    waterVertex: 'varying vec2 vUv; uniform float uTime; void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*4.0+uTime)*0.014+cos(p.y*3.0-uTime)*0.014;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',
    waterFragment: 'varying vec2 vUv; uniform float uTime; void main(){vec2 p=vUv-0.5;float d=length(p);float rings=sin(d*90.0-uTime*2.1);float glint=pow(max(0.0,sin(p.x*29.0+p.y*21.0+uTime*1.3)),20.0);float edge=smoothstep(0.5,0.22,d);vec3 deep=vec3(0.014,0.010,0.016);vec3 blood=vec3(0.22,0.028,0.042);vec3 c=mix(deep,blood,(rings*0.5+0.5)*edge);gl_FragColor=vec4(c+glint*vec3(0.28,0.09,0.10),0.95);}',
    skyVertex: 'varying vec3 vDir; void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    skyFragment: [
      'varying vec3 vDir;uniform float uTime;uniform float uFlash;uniform vec3 uMoonDir;',
      'float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+1.),f.x),f.y);}',
      'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n2(p);p=p*2.04+vec2(13.1,7.7);a*=.5;}return s;}',
      'void main(){vec3 d=normalize(vDir);float y=clamp(d.y,0.,1.);vec3 zenith=vec3(.011,.018,.027);vec3 horizon=vec3(.027,.044,.048);vec3 col=mix(horizon,zenith,pow(y,.55));',
      'vec2 skyUv=d.xz/(y+.24);float c1=fbm(skyUv*.55+vec2(uTime*.012,-uTime*.007));float c2=fbm(skyUv*1.35-vec2(uTime*.019,uTime*.011));',
      'float cloud=smoothstep(.42,.84,c1*.68+c2*.32)*smoothstep(.02,.28,y);',
      'float moonDot=max(dot(d,normalize(uMoonDir)),0.);float corona=pow(moonDot,9.)*.34+pow(moonDot,42.)*.55;',
      'vec3 moonGlow=vec3(.44,.14,.14)*corona;float cloudBacklit=pow(moonDot,3.)*.45;',
      'col+=moonGlow;vec3 cloudCol=vec3(.022,.030,.038)+vec3(.24,.09,.09)*cloudBacklit+vec3(.32,.40,.52)*uFlash*.45;',
      'col=mix(col,cloudCol,cloud*.82);float stars=step(.9965,h21(floor(skyUv*160.)))*(1.-cloud)*smoothstep(.15,.55,y);col+=vec3(.65,.72,.82)*stars*.55;',
      'col=mix(vec3(.024,.039,.044),col,smoothstep(-.015,.14,d.y));gl_FragColor=vec4(col,1.);}'
    ].join('\n'),
    beamVertex: 'varying vec2 vUv;varying vec3 vWorldPos;varying vec3 vNormalW;void main(){vUv=uv;vWorldPos=(modelMatrix*vec4(position,1.0)).xyz;vNormalW=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    beamFragment: 'varying vec2 vUv;varying vec3 vWorldPos;varying vec3 vNormalW;uniform vec3 uColor;uniform float uOpacity;uniform float uTime;void main(){vec3 viewDir=normalize(cameraPosition-vWorldPos);float fres=pow(abs(dot(normalize(vNormalW),viewDir)),1.85);float fade=smoothstep(0.0,0.14,vUv.y)*pow(1.0-clamp(vUv.y,0.,1.),1.65);float shimmer=0.88+0.12*sin(vUv.y*18.0-uTime*1.8+vWorldPos.x);float a=fres*fade*uOpacity*shimmer;gl_FragColor=vec4(uColor*a*1.4,clamp(a,0.,1.));}',
    postVertex: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
    postFragment: [
      'uniform sampler2D tScene;uniform sampler2D tDepth;uniform mat4 uProjectionInverse;uniform mat4 uCameraWorld;uniform vec3 uCameraPosition;uniform vec4 uHouses[6];uniform float uFog;uniform float uFogSteps;uniform float uThreat;uniform float uTime;uniform float uSanity;uniform float uDamage;uniform float uMotion;varying vec2 vUv;',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
      'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}',
      'float fogDensity(vec3 p){float height=exp(-max(p.y,0.0)*2.05)*smoothstep(-0.15,0.12,p.y);vec2 drift=vec2(uTime*.07,uTime*-.04);float n=noise(p.xz*.19+drift)*.65+noise(p.xz*.52-drift)*.35;float inside=0.;for(int i=0;i<6;i++){vec2 d=abs(p.xz-uHouses[i].xy)-uHouses[i].zw;inside=max(inside,(1.-smoothstep(-.1,.7,max(d.x,d.y))));}return height*smoothstep(.28,.82,n)*.145*(1.-inside);}',
      'vec3 groundFog(vec3 color,vec2 uv){float depth=texture2D(tDepth,uv).x;vec4 view=uProjectionInverse*vec4(uv*2.-1.,depth*2.-1.,1.);view/=view.w;vec3 endPoint=(uCameraWorld*view).xyz;vec3 delta=endPoint-uCameraPosition;float distance=min(length(delta),46.);vec3 direction=normalize(delta);if((depth>0.9995&&direction.y>0.06)||(uCameraPosition.y>2.6&&direction.y>0.0))return color;float steps=max(uFogSteps,4.);float stepSize=distance/steps;float jitter=hash(uv+fract(uTime))*stepSize;float transmission=1.;for(int i=0;i<16;i++){if(float(i)>=steps)break;vec3 p=uCameraPosition+direction*(float(i)*stepSize+jitter);if(p.y<3.2){float density=fogDensity(p);transmission*=exp(-density*stepSize);}}return mix(vec3(.021,.036,.042),color,transmission);}',
      'void main(){vec2 uv=vUv;float threatMask=smoothstep(0.08,0.85,uThreat);float band=step(0.985,hash(vec2(floor(uv.y*60.0),floor(uTime*8.0))));',
      'float interference=max(uSanity*0.75,threatMask);uv.x+=band*sin(uTime*31.0)*interference*0.012*uMotion;uv.x+=sin(uv.y*170.+uTime*9.)*.0005*threatMask*uMotion;float radial=dot(uv-.5,uv-.5);float shift=interference*0.0022+radial*0.0011;',
      'vec3 col=vec3(texture2D(tScene,uv+vec2(shift,0.)).r,texture2D(tScene,uv).g,texture2D(tScene,uv-vec2(shift,0.)).b);',
      'vec3 bloom=max(texture2D(tScene,uv+vec2(.0035,.0025)).rgb-vec3(.56),0.)+max(texture2D(tScene,uv-vec2(.0035,.0025)).rgb-vec3(.56),0.)+max(texture2D(tScene,uv+vec2(-.0025,.0035)).rgb-vec3(.56),0.)+max(texture2D(tScene,uv+vec2(.0025,-.0035)).rgb-vec3(.56),0.);',
      'if(uFog>.5)col=groundFog(col,uv);',
      'col+=bloom*0.14+max(col-vec3(0.72),vec3(0.0))*0.22;',
      'col*=1.-sin(vUv.y*850.)*.032*threatMask;col+=vec3(hash(vUv+floor(uTime*18.)*uMotion)-.5)*threatMask*.018;',
      'float vignette=1.0-smoothstep(0.24,0.78,length(vUv-0.5));col*=mix(0.48,1.0,vignette);',
      'col+=vec3(hash(vUv+fract(uTime))-0.5)*0.002;col=mix(col,vec3(col.r*1.32,col.g*.52,col.b*.56),uDamage*(1.0-vignette)*0.72);',
      'col=max(col,vec3(0.0));col=(col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14);col=clamp(col,0.0,1.0);',
      'col=mix(col*12.92,1.055*pow(col,vec3(1.0/2.4))-0.055,step(vec3(0.0031308),col));gl_FragColor=vec4(col,1.0);}'
    ].join('\n')
  });

  G.PostProcessor = class PostProcessor {
    constructor(renderer) {
      this.renderer = renderer;
      this.target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat });
      this.depthSupported = renderer.capabilities.isWebGL2 || renderer.extensions.has('WEBGL_depth_texture');
      if (this.depthSupported) {
        this.target.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedShortType);
        this.target.depthBuffer = true;
      }
      this.scene = new THREE.Scene();
      this.camera = new THREE.Camera();
      this.material = new THREE.ShaderMaterial({
        vertexShader: G.Shaders.postVertex,
        fragmentShader: G.Shaders.postFragment,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          tScene: { value: this.target.texture },
          uTime: { value: 0 },
          uSanity: { value: 0 },
          uDamage: { value: 0 },
          uMotion: { value: 1 }
        }
      });
      Object.assign(this.material.uniforms, {
        tDepth: { value: this.target.depthTexture || this.target.texture },
        uProjectionInverse: { value: new THREE.Matrix4() },
        uCameraWorld: { value: new THREE.Matrix4() },
        uCameraPosition: { value: new THREE.Vector3() },
        uThreat: { value: 0 },
        uFog: { value: this.depthSupported ? 1 : 0 },
        uFogSteps: { value: 14 },
        uHouses: { value: G.WorldLayout.houses.map(h => new THREE.Vector4(h.position[0], h.position[2], h.width / 2, h.depth / 2)) }
      });
      this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
      this.scene.add(this.quad);
    }
    resize(w, h) { this.target.setSize(w, h); }
    render(scene, camera, time, sanity, damage, reducedMotion, threat, volFog, fogSteps) {
      const u = this.material.uniforms;
      u.uTime.value = time;
      u.uSanity.value = sanity;
      u.uDamage.value = damage;
      u.uMotion.value = reducedMotion ? 0 : 1;
      u.uFog.value = (this.depthSupported && volFog !== false) ? 1 : 0;
      u.uFogSteps.value = Math.max(4, Math.min(16, fogSteps || 10));
      camera.updateMatrixWorld();
      u.uProjectionInverse.value.copy(camera.projectionMatrixInverse);
      u.uCameraWorld.value.copy(camera.matrixWorld);
      u.uCameraPosition.value.copy(camera.position);
      u.uThreat.value = threat || 0;
      this.renderer.setRenderTarget(this.target);
      this.renderer.render(scene, camera);
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
    }
    dispose() {
      this.target.dispose();
      this.quad.geometry.dispose();
      this.material.dispose();
    }
  };
}(window.Game = window.Game || {}));
