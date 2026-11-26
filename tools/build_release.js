// Đóng gói bản phát hành Huyết Lệ Thôn: gộp + rút gọn mã, mã hoá tài nguyên (model, chuyển động, lồng tiếng).
// Dùng: node build_release.js <thư mục game> <thư mục ra>
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const esbuild = require(process.env.ESBUILD || 'esbuild');
const [, , SRC, OUT] = process.argv;
const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const ASSET = s => /^js\/(chars\/|mx_anims|vo_data)/.test(s);
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });

// khoá ngẫu nhiên mỗi bản build; được chia nhỏ và trộn vào mã đã rút gọn
const key = crypto.randomBytes(32), salt = crypto.randomBytes(16);
// luồng khoá: xorshift128 khởi tạo từ khoá + chỉ số gói + vị trí khối
function stream(n, idx) {
  const out = Buffer.alloc(n); let a = key.readUInt32LE(0) ^ idx * 0x9e3779b1, b = key.readUInt32LE(4) ^ salt.readUInt32LE(0), c = key.readUInt32LE(8) ^ salt.readUInt32LE(4), d = key.readUInt32LE(12) ^ (idx + 1) * 0x85ebca6b;
  a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; if (!(a | b | c | d)) d = 1;
  for (let i = 0; i < n; i += 4) {
    let t = a ^ (a << 11); a = b; b = c; c = d; d = (d ^ (d >>> 19) ^ (t ^ (t >>> 8))) >>> 0;
    const w = (d + key.readUInt32LE(16 + ((i >> 2) & 3) * 4)) >>> 0;
    out[i] = w & 255; if (i + 1 < n) out[i + 1] = (w >>> 8) & 255; if (i + 2 < n) out[i + 2] = (w >>> 16) & 255; if (i + 3 < n) out[i + 3] = w >>> 24;
  }
  return out;
}
function seal(text, idx) { const b = Buffer.from(text, 'utf8'), s = stream(b.length, idx); for (let i = 0; i < b.length; i++) b[i] ^= s[i]; return b.toString('base64'); }

// 1) mã nguồn: gộp theo đúng thứ tự, rút gọn
let code = '', assetIdx = 0; const outScripts = [];
const loader = `(function(){var K=[${[...key].map((v, i) => (v ^ (i * 37 + 11) & 255)).join(',')}],S=[${[...salt].join(',')}];
function k(i){return (K[i]^((i*37+11)&255))&255}function u(o){return (k(o)|k(o+1)<<8|k(o+2)<<16|k(o+3)<<24)>>>0}function su(o){return (S[o]|S[o+1]<<8|S[o+2]<<16|S[o+3]<<24)>>>0}
window.__hlt=function(idx,b64){var bin=atob(b64),n=bin.length,o=new Uint8Array(n),a=(u(0)^Math.imul(idx,0x9e3779b1))>>>0,b=(u(4)^su(0))>>>0,c=(u(8)^su(4))>>>0,d=(u(12)^Math.imul(idx+1,0x85ebca6b))>>>0,W=[u(16),u(20),u(24),u(28)];if(!(a|b|c|d))d=1;
for(var i=0;i<n;i+=4){var t=a^(a<<11);a=b;b=c;c=d;d=(d^(d>>>19)^(t^(t>>>8)))>>>0;var w=(d+W[(i>>2)&3])>>>0;o[i]=bin.charCodeAt(i)^(w&255);if(i+1<n)o[i+1]=bin.charCodeAt(i+1)^((w>>>8)&255);if(i+2<n)o[i+2]=bin.charCodeAt(i+2)^((w>>>16)&255);if(i+3<n)o[i+3]=bin.charCodeAt(i+3)^(w>>>24);}
(0,eval)(new TextDecoder().decode(o));};})();`;
let pending = '';
function flushCode() { if (!pending) return; code += pending; pending = ''; }
const order = [];
for (const s of scripts) {
  const src = fs.readFileSync(path.join(SRC, s), 'utf8');
  if (ASSET(s)) { const idx = assetIdx++, name = 'p' + String(idx).padStart(2, '0') + '.dat.js'; fs.writeFileSync(path.join(OUT, 'data', name), '__hlt(' + idx + ',"' + seal(src, idx) + '");'); order.push('data/' + name); }
  else order.push(s);
}
// gộp các đoạn mã liền nhau thành từng file rút gọn, giữ nguyên thứ tự xen kẽ với gói dữ liệu
const final = []; let buf = [], part = 0;
function emit() { if (!buf.length) return; const js = buf.map(s => fs.readFileSync(path.join(SRC, s), 'utf8')).join('\n;\n');
  const min = esbuild.transformSync(js, { minify: true, legalComments: 'none', target: 'es2017', charset: 'utf8' }).code;
  const name = 'g' + (part++) + '.js'; fs.writeFileSync(path.join(OUT, name), '/* Huyết Lệ Thôn: Oán Linh — © HTC T-rex. All rights reserved. */\n' + (part === 1 ? loader + '\n' : '') + min); final.push(name); buf = []; }
for (const s of order) { if (s.startsWith('data/')) { emit(); final.push(s); } else buf.push(s); }
emit();
// 2) index.html
let h = html.replace(/(?:<script src="[^"]+"><\/script>\s*)+/, final.map(f => `<script src="${f}"></script>`).join('\n') + '\n');
h = h.replace(/<!--[\s\S]*?-->/g, '');
fs.writeFileSync(path.join(OUT, 'index.html'), h);
// 3) css rút gọn, tài liệu cho người chơi
fs.mkdirSync(path.join(OUT, 'css'));
fs.writeFileSync(path.join(OUT, 'css/style.css'), esbuild.transformSync(fs.readFileSync(path.join(SRC, 'css/style.css'), 'utf8'), { loader: 'css', minify: true }).code);
for (const f of ['DOC_TRUOC.txt', 'LICENSES.md']) if (fs.existsSync(path.join(SRC, f))) fs.copyFileSync(path.join(SRC, f), path.join(OUT, f));
console.log('files', final.length, 'assets', assetIdx);
