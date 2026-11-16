/* HUYẾT LỆ THÔN — shaders.js
   Toàn bộ GLSL ES 3.00: vật liệu PBR-lite, gió/vải, bầu trời trăng máu, mưa GPU,
   hạt, bloom và uber-shader hậu kỳ kinh dị. */
(function () {
  'use strict';
  var H = window.HuyetLeThon = window.HuyetLeThon || {};
  var S = H.Shaders = {};

  /* ---------- Vật liệu chiếu sáng ---------- */
  S.litVS = [
    'precision highp float;',
    'layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNormal; layout(location=2) in vec2 aUV; layout(location=3) in vec4 aColor;',
    '#ifdef INSTANCED',
    'layout(location=4) in vec4 aI0; layout(location=5) in vec4 aI1;',
    '#endif',
    '#ifdef SKIN',
    'layout(location=6) in vec4 aSkin; uniform mat4 uBones[20];',
    '#endif',
    '#ifdef MORPH',
    'layout(location=7) in vec3 aM0; layout(location=8) in vec3 aM1; layout(location=9) in vec3 aM2; layout(location=10) in vec3 aM3; layout(location=11) in vec3 aM4; layout(location=12) in vec3 aM5; uniform float uMorph[6];',
    '#endif',
    'uniform mat4 uModel; uniform mat4 uViewProj; uniform float uTime; uniform vec4 uWind; uniform float uCloth;',
    'out vec3 vW; out vec3 vN; out vec2 vUV; out vec4 vCol;',
    'void main(){',
    '  vec3 p=aPos; vec3 n=aNormal; float w=aColor.a; float ph=0.0; vCol=aColor;',
    '#ifdef INSTANCED',
    '  float c=cos(aI1.x), s=sin(aI1.x);',
    '  p.xz+=vec2(aI1.z,aI1.z*0.6)*p.y*p.y*0.012;',          // thân tre cong nhẹ
    '  p*=aI0.w;',
    '  p=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z); n=vec3(c*n.x+s*n.z,n.y,-s*n.x+c*n.z);',
    '  vec4 wp=vec4(p+aI0.xyz,1.0); vec3 wn=n; ph=aI1.y; vCol.rgb*=aI1.w;',
    '#else',
    '#ifdef MORPH',
    '  p+=aM0*uMorph[0]+aM1*uMorph[1]+aM2*uMorph[2]+aM3*uMorph[3]+aM4*uMorph[4]+aM5*uMorph[5];',
    '#endif',
    '#ifdef SKIN',
    '  mat4 sk=uBones[int(aSkin.x)]*aSkin.z+uBones[int(aSkin.y)]*aSkin.w; vec4 wp=sk*vec4(p,1.0); vec3 wn=mat3(sk)*n;',
    '#else',
    '  vec4 wp=uModel*vec4(p,1.0); vec3 wn=mat3(uModel)*n;',
    '#endif',
    '#endif',
    '  if(w>0.001){',
    '    float k=wp.x*0.21+wp.z*0.17+ph;',
    '    float sway=sin(uTime*1.3+k)*0.6+sin(uTime*2.9+k*1.7)*0.25+sin(uTime*0.47+k*0.3)*0.5+0.35;',
    '    sway*=1.0+uWind.w*1.5;',
    '    float ws=uCloth>0.0?0.2:1.0;',
    '    wp.xz+=uWind.xy*(sway*uWind.z*w*ws); wp.y-=abs(sway)*uWind.z*w*0.12*ws;',
    '    if(uCloth>0.0){',
    '      wp.xyz+=wn*sin(uTime*3.7+aPos.y*7.0+aPos.x*9.0)*0.05*w*uCloth;',
    '      wp.x+=sin(uTime*2.1+aPos.y*4.0+aPos.z*3.0)*0.07*w*uCloth;',
    '      wp.z+=cos(uTime*1.7+aPos.y*5.0+aPos.x*3.0)*0.07*w*uCloth;',
    '    }',
    '  }',
    '  vW=wp.xyz; vN=wn; vUV=aUV;',
    '  gl_Position=uViewProj*wp;',
    '}'
  ].join('\n');

  S.litFS = [
    'precision highp float;',
    'in vec3 vW; in vec3 vN; in vec2 vUV; in vec4 vCol; out vec4 o;',
    'uniform sampler2D uAlb; uniform sampler2D uNrm;',
    'uniform vec3 uCam; uniform vec3 uAmbSky; uniform vec3 uAmbGnd; uniform vec3 uMoonDir; uniform vec3 uMoonCol;',
    'uniform vec3 uFlPos; uniform vec3 uFlDir; uniform vec3 uFlCol; uniform vec2 uFlCone;',
    'uniform vec4 uLP[MAXL]; uniform vec3 uLC[MAXL]; uniform int uLN;',
    'uniform vec3 uXenon; uniform vec3 uEmis; uniform vec4 uTint; uniform vec4 uMat; uniform vec4 uMat2; uniform float uUVScale;',
    'vec3 shade(vec3 N,vec3 V,vec3 L,vec3 lc,vec3 alb,float rough){',
    '  float nd=dot(N,L); float nl=max(nd,0.0); float wr=uMat2.x>0.0?(clamp((nd+0.45)/1.45,0.0,1.0)-nl)*uMat2.x:0.0;',
    '  if(nl<=0.0) return wr>0.0?lc*wr*alb*vec3(1.0,0.3,0.2):vec3(0.0);',
    '  vec3 Hh=normalize(L+V); float nh=max(dot(N,Hh),0.0); float vh=max(dot(V,Hh),0.0);',
    '  float sh=mix(260.0,3.0,sqrt(rough));',
    '  float fr=0.045+0.955*pow(1.0-vh,5.0);',
    '  float spec=pow(nh,sh)*(sh+8.0)*0.04*fr*(1.0-rough)*3.6;',
    '  return lc*(nl*(alb+vec3(spec))+wr*alb*vec3(1.0,0.3,0.2));',
    '}',
    '#ifdef NORMALMAP',
    'mat3 cotangent(vec3 N,vec3 p,vec2 uv){',
    '  vec3 dp1=dFdx(p), dp2=dFdy(p); vec2 d1=dFdx(uv), d2=dFdy(uv);',
    '  vec3 a=cross(dp2,N), b=cross(N,dp1);',
    '  vec3 T=a*d1.x+b*d2.x; vec3 B=a*d1.y+b*d2.y;',
    '  float im=inversesqrt(max(max(dot(T,T),dot(B,B)),1e-12));',
    '  return mat3(T*im,B*im,N);',
    '}',
    '#endif',
    'void main(){',
    '  vec2 uv=vUV*uUVScale; vec4 a=texture(uAlb,uv);',
    '  if(uMat2.z>0.0){ if(a.a<0.42) discard; a.a=0.8; }',
    '  if(uMat.w>0.0){ float al=a.a*uTint.a;',
    '    if(uMat.z>0.0){ float rim=pow(1.0-abs(dot(normalize(vN),normalize(uCam-vW))),1.5); al*=0.12+rim*1.5; }',
    '    o=vec4(a.rgb*uTint.rgb*vCol.rgb*uMat.w+uEmis, al); return; }',
    '  vec3 alb=a.rgb*a.rgb*vCol.rgb*uTint.rgb; float rough=clamp(a.a*uMat.x,0.03,1.0);',
    '  vec3 N=normalize(vN); vec3 V=normalize(uCam-vW); if(dot(N,V)<0.0) N=-N;',
    '#ifdef NORMALMAP',
    '  vec3 nm=texture(uNrm,uv).xyz*2.0-1.0; nm.xy*=uMat.y; N=normalize(cotangent(N,vW,uv)*nm);',
    '#endif',
    '  vec3 col=alb*mix(uAmbGnd,uAmbSky,N.y*0.5+0.5);',
    '  col+=shade(N,V,uMoonDir,uMoonCol,alb,rough);',
    '  vec3 Lf=uFlPos-vW; float d=length(Lf); Lf/=max(d,0.001);',
    '  float cs=dot(-Lf,uFlDir); float spot=smoothstep(uFlCone.x,uFlCone.y,cs);',
    '  if(spot>0.0){',
    '    float att=1.0/(1.0+0.07*d+0.012*d*d);',
    '    float hot=0.55+0.45*smoothstep(uFlCone.y,1.0,cs);',                   // lõi sáng của chóa đèn
    '    float ring=1.0-0.18*smoothstep(0.0,1.0,sin(acos(clamp(cs,-1.0,1.0))*95.0)*0.5+0.5);',
    '    col+=shade(N,V,Lf,uFlCol*(spot*att*hot*ring),alb,rough);',
    '  }',
    '  for(int i=0;i<MAXL;i++){ if(i>=uLN) break;',
    '    vec3 L=uLP[i].xyz-vW; float dd=length(L); float at=clamp(1.0-dd/uLP[i].w,0.0,1.0);',
    '    if(at>0.0) col+=shade(N,V,L/max(dd,0.001),uLC[i]*(at*at),alb,rough);',
    '  }',
    '  if(uXenon.x>0.001){ float dx=distance(uCam,vW); col+=shade(N,V,V,uXenon/(1.0+0.012*dx*dx),alb,rough); }',
    '  if(uMat.z>0.0){ float rim=pow(1.0-max(dot(N,V),0.0),2.2); col+=vec3(0.95,0.04,0.02)*rim*uMat.z; col+=alb*vec3(0.5,0.08,0.06)*uMat.z*0.25; }',
    '  if(uMat2.y>0.0){ float rm=pow(1.0-max(dot(N,V),0.0),3.0); col+=alb*rm*uMat2.y*(uAmbSky*12.0+uMoonCol*2.5+vec3(0.015)); }',
    '  col+=uEmis;',
    '  o=vec4(col,uTint.a);',
    '}'
  ].join('\n');

  /* ---------- Tam giác toàn màn hình ---------- */
  S.fullVS = [
    'precision highp float; out vec2 vUV;',
    'void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); vUV=p; gl_Position=vec4(p*2.0-1.0,0.0,1.0); }'
  ].join('\n');

  var NOISE = [
    'float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }',
    'float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }',
    'float fbm(vec2 p){ float a=0.5,s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.0,9.0); a*=0.5; } return s; }'
  ].join('\n');

  /* ---------- Bầu trời: Huyết Nguyệt + mây bão ---------- */
  S.skyFS = [
    'precision highp float; in vec2 vUV; out vec4 o;',
    'uniform mat4 uInvVP; uniform vec3 uCam; uniform vec3 uMoonDir; uniform vec3 uMoonTint; uniform float uTime; uniform float uLightning;',
    NOISE,
    'void main(){',
    '  vec4 w=uInvVP*vec4(vUV*2.0-1.0,1.0,1.0); vec3 d=normalize(w.xyz/w.w-uCam);',
    '  vec3 md=normalize(uMoonDir); float m=dot(d,md);',
    '  vec3 col=mix(vec3(0.030,0.012,0.016),vec3(0.006,0.005,0.012),smoothstep(-0.15,0.7,d.y));',
    '  vec2 cp=d.xz/(abs(d.y)+0.22); float c=fbm(cp*1.3+uTime*vec2(0.035,0.012)); float c2=fbm(cp*3.1-uTime*vec2(0.02,0.03));',
    '  float cover=smoothstep(0.28,0.78,c*0.75+c2*0.35);',
    '  float disc=smoothstep(0.9968,0.9976,m);',
    '  vec3 up=abs(md.y)<0.99?vec3(0,1,0):vec3(1,0,0); vec3 mx=normalize(cross(up,md)); vec3 my=cross(md,mx);',
    '  vec2 mp=vec2(dot(d,mx),dot(d,my))*14.0; float crat=0.65+0.35*fbm(mp*2.0+3.0);',
    '  vec3 moon=uMoonTint*(1.6*crat)*disc;',
    '  float halo=pow(max(m,0.0),220.0)*0.9+pow(max(m,0.0),24.0)*0.22+pow(max(m,0.0),5.0)*0.05;',
    '  col+=uMoonTint*halo*0.55;',
    '  vec3 cloudCol=vec3(0.020,0.012,0.016)+uMoonTint*0.10*pow(max(m,0.0),6.0)+vec3(0.55,0.6,0.8)*uLightning*(0.4+c);',
    '  col=mix(col+moon*(1.0-cover*0.85),cloudCol,cover*0.9);',
    '  col+=moon*0.12;',
    '  o=vec4(col,1.0);',
    '}'
  ].join('\n');

  /* ---------- Mưa: 6000+ vệt chạy hoàn toàn trên GPU ---------- */
  S.rainVS = [
    'precision highp float; layout(location=0) in vec4 aSeed;',
    'uniform mat4 uViewProj; uniform vec3 uCam; uniform float uTime; uniform vec3 uWindV; uniform vec3 uFlPos; uniform vec3 uFlDir; uniform float uFlOn; uniform float uLit;',
    'uniform vec4 uRoof[6]; uniform int uRoofN;',
    'out float vA;',
    'void main(){',
    '  vec3 box=vec3(26.0,16.0,26.0); float sp=15.0+aSeed.y*7.0;',
    '  vec3 p=aSeed.xyz*box+aSeed.zxy*vec3(7.3,3.1,5.7); p.y-=uTime*sp; p.xz+=uWindV.xz*uTime;',
    '  vec3 base=uCam-box*0.5; p=mod(p-base,box)+base;',
    '  vec3 vel=normalize(vec3(uWindV.x,-sp,uWindV.z));',
    '  float along=step(1.5,aSeed.w); float side=mod(aSeed.w,2.0)*2.0-1.0;',
    '  vec3 toCam=normalize(uCam-p); vec3 sv=normalize(cross(vel,toCam));',
    '  float dist=distance(p,uCam);',
    '  p+=vel*along*(0.35+aSeed.x*0.45)+sv*side*(0.004+dist*0.0009);',
    '  float a=uLit;',
    '  vec3 tf=p-uFlPos; float df=length(tf); float cs=dot(tf/df,uFlDir);',
    '  a+=uFlOn*smoothstep(0.86,0.985,cs)*0.4/(1.0+0.05*df*df);',
    '  for(int i=0;i<6;i++){ if(i>=uRoofN) break; vec4 r=uRoof[i]; if(p.x>r.x&&p.x<r.z&&p.z>r.y&&p.z<r.w&&p.y<7.5) a=0.0; }',
    '  vA=a*smoothstep(0.8,4.5,dist)*(1.0-along*0.6);',
    '  gl_Position=uViewProj*vec4(p,1.0);',
    '}'
  ].join('\n');
  S.rainFS = 'precision highp float; in float vA; out vec4 o; void main(){ o=vec4(vec3(0.62,0.68,0.8),clamp(vA,0.0,1.0)); }';

  /* ---------- Hạt (tro đen, tàn lửa) ---------- */
  S.partVS = [
    'precision highp float; layout(location=0) in vec4 aP; layout(location=1) in vec4 aC;',
    'uniform mat4 uViewProj; uniform float uScale; out vec4 vC;',
    'void main(){ vC=aC; gl_Position=uViewProj*vec4(aP.xyz,1.0); gl_PointSize=clamp(aP.w*uScale/max(gl_Position.w,0.1),1.0,96.0); }'
  ].join('\n');
  S.partFS = [
    'precision highp float; in vec4 vC; out vec4 o;',
    'void main(){ vec2 c=gl_PointCoord-0.5; float d=smoothstep(0.5,0.1,length(c)); o=vec4(vC.rgb*d,vC.a*d); }'
  ].join('\n');

  /* ---------- Bloom ---------- */
  S.brightFS = [
    'precision highp float; in vec2 vUV; out vec4 o; uniform sampler2D uTex; uniform vec2 uPx;',
    'void main(){ vec3 c=texture(uTex,vUV+uPx*vec2(-1,-1)).rgb+texture(uTex,vUV+uPx*vec2(1,-1)).rgb+texture(uTex,vUV+uPx*vec2(-1,1)).rgb+texture(uTex,vUV+uPx*vec2(1,1)).rgb;',
    '  c*=0.25; float l=max(c.r,max(c.g,c.b)); c*=smoothstep(0.55,1.6,l); o=vec4(min(c,vec3(12.0)),1.0); }'
  ].join('\n');
  S.blurFS = [
    'precision highp float; in vec2 vUV; out vec4 o; uniform sampler2D uTex; uniform vec2 uDir;',
    'void main(){ vec3 c=texture(uTex,vUV).rgb*0.227;',
    '  c+=(texture(uTex,vUV+uDir*1.385).rgb+texture(uTex,vUV-uDir*1.385).rgb)*0.316;',
    '  c+=(texture(uTex,vUV+uDir*3.231).rgb+texture(uTex,vUV-uDir*3.231).rgb)*0.070;',
    '  o=vec4(c,1.0); }'
  ].join('\n');

  /* ---------- Uber-shader kinh dị ---------- */
  S.postFS = [
    'precision highp float; in vec2 vUV; out vec4 o;',
    'uniform sampler2D uScene; uniform sampler2D uDepth; uniform sampler2D uBloom;',
    'uniform vec2 uRes; uniform float uTime; uniform mat4 uInvVP; uniform vec3 uCam;',
    'uniform vec4 uFogA; uniform vec4 uFogB; uniform vec4 uFx; uniform vec4 uFx2; uniform vec4 uFx3; uniform vec4 uFx4; uniform vec4 uFx5; uniform vec4 uPx;',
    NOISE,
    'vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }',
    'void main(){',
    '  vec2 c=vUV-0.5; float asp=uRes.x/uRes.y; float r2=dot(c,c);',
    // méo thùng
    '  vec2 uv=0.5+c*(1.0+uFx.y*r2)/(1.0+uFx.y*0.25);',
    '  vec3 col;',
    '#ifdef CHROMA',
    '  vec2 off=c*(uFx.x*(0.4+r2*2.4));',
    '  col.r=texture(uScene,uv+off).r; col.g=texture(uScene,uv).g; col.b=texture(uScene,uv-off).b;',
    '#else',
    '  col=texture(uScene,uv).rgb;',
    '#endif',
    // dựng lại vị trí thế giới từ depth -> sương thể tích
    '#ifdef SHARP',
    '  vec3 nb=texture(uScene,uv+vec2(uPx.x,0.0)).rgb+texture(uScene,uv-vec2(uPx.x,0.0)).rgb+texture(uScene,uv+vec2(0.0,uPx.y)).rgb+texture(uScene,uv-vec2(0.0,uPx.y)).rgb;',
    '  col=max(col+(col-nb*0.25)*0.6,vec3(0.0));',
    '#endif',
    '  float z=texture(uDepth,uv).r;',
    '#ifdef SSAO',
    '  float lz=uPx.z*uPx.w/(uPx.w-z*(uPx.w-uPx.z));',
    '  if(lz<26.0){ float ao=0.0; float rad=0.3/lz; float rn=hash(vUV*uRes)*6.283;',
    '    for(int i=0;i<8;i++){ float a=float(i)*2.4+rn; vec2 o2=vec2(cos(a),sin(a))*rad*(0.25+0.75*float(i)/8.0)*vec2(uRes.y/uRes.x,1.0)*0.55;',
    '      float zs=texture(uDepth,uv+o2).r; float df=lz-uPx.z*uPx.w/(uPx.w-zs*(uPx.w-uPx.z)); ao+=smoothstep(0.035,0.2,df)*(1.0-smoothstep(0.3,0.8,df)); }',
    '    col*=1.0-ao*0.125*0.7*(1.0-smoothstep(16.0,26.0,lz)); }',
    '#endif',
    '  vec4 wp=uInvVP*vec4(uv*2.0-1.0,z*2.0-1.0,1.0); vec3 ray=wp.xyz/wp.w-uCam; float dist=length(ray); vec3 rd=ray/max(dist,1e-4);',
    '  float sky=step(0.99999,z); dist=mix(dist,140.0,sky);',
    '  float fog=1.0-exp(-dist*uFogA.a); fog*=mix(1.0,0.55,sky);',
    '  float b=uFogB.y; float oy=uCam.y-uFogB.x; float e0=exp(clamp(-b*oy,-12.0,3.0));',
    '  float k=b*rd.y; float t=abs(k)>1e-4?(1.0-exp(clamp(-k*dist,-30.0,30.0)))/k:dist;',
    '  float od=uFogB.z*e0*max(t,0.0);',
    '#ifdef MISTNOISE',
    '  vec2 np=(uCam.xz+rd.xz*min(dist,22.0))*0.09+uTime*vec2(0.035,0.021);',
    '  float n=vnoise(np)*0.6+vnoise(np*2.7+11.0)*0.4; od*=mix(1.0,n*2.1,uFogB.w);',
    '#endif',
    '  float mist=1.0-exp(-od);',
    '  float f=1.0-(1.0-fog)*(1.0-mist);',
    '  vec3 fogCol=uFogA.rgb*(1.0+mist*0.6)+vec3(1.0,0.97,0.9)*uFx3.w*0.02;',
    // quầng sáng thể tích của đèn pin
    '  vec2 fd=(vUV-uFx3.yz)*vec2(asp,1.0); float beam=exp(-dot(fd,fd)*9.0)+0.35*exp(-dot(fd,fd)*2.2);',
    '  fogCol+=vec3(0.75,0.82,1.0)*uFx3.x*beam*(0.10+0.5*mist);',
    '  col=mix(col,fogCol,clamp(f,0.0,1.0));',
    '#ifdef BLOOM',
    '  col+=texture(uBloom,uv).rgb*0.55;',
    '#endif',
    '  col*=uFx2.w;',
    // ống ngắm máy ảnh: khuếch đại sáng
    '  float lum=dot(col,vec3(0.3,0.59,0.11));',
    '  if(uFx2.z>0.0){ col=mix(col,(vec3(lum)*vec3(0.82,1.0,0.86)+col*0.3)*2.3+vec3(0.004,0.007,0.005),uFx2.z); }',
    '  col=mix(col,vec3(lum),uFx4.y);',
    '  col=mix(col,vec3(lum)*vec3(1.22,1.0,0.74),uFx5.x);',
    '  col=aces(col); col=pow(col,vec3(1.0/2.2));',
    // hạt phim 35mm / VHS
    '  float g=hash(vUV*uRes+fract(uTime)*417.0)-0.5; float gs=uFx.z*(1.0+uFx2.z*2.5);',
    '  col+=g*gs*(0.35+0.65*(1.0-lum));',
    '  if(uFx4.w>0.0){ col*=1.0-uFx4.w*0.22*(0.5+0.5*sin(vUV.y*uRes.y*1.6)); col+=uFx4.w*0.03*step(0.997,hash(vec2(floor(vUV.y*uRes.y*0.5),floor(uTime*24.0)))); }',
    // vignette + nhịp tim
    '  float r=length(c*vec2(1.0,1.0/max(asp*0.75,1.0))*1.9);',
    '  float vg=smoothstep(0.35,1.25,r);',
    '  col*=1.0-uFx.w*vg;',
    '  col+=vec3(0.32,0.0,0.0)*uFx2.y*vg*vg;',
    // mạch máu thủ tục
    '  if(uFx2.x>0.001){',
    '    float ang=atan(c.y,c.x); vec2 vp=vec2(ang*2.6,r*2.4);',
    '    float v1=abs(fbm(vp*2.3+vec2(0.0,uTime*0.03))*2.0-1.0); float v2=abs(fbm(vp*5.1+7.0)*2.0-1.0);',
    '    float veins=pow(1.0-v1,10.0)+0.5*pow(1.0-v2,14.0);',
    '    float edge=smoothstep(0.55-uFx2.x*0.3,1.15,r);',
    '    col=mix(col,vec3(0.28,0.0,0.01),clamp(veins*edge*uFx2.x*1.6,0.0,0.9));',
    '    col*=1.0-edge*uFx2.x*0.35;',
    '  }',
    '  col+=uFx4.z;',
    '  col*=1.0-uFx4.x;',
    '  o=vec4(col,1.0);',
    '}'
  ].join('\n');
})();
