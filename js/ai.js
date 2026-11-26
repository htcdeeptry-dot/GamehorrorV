/* HUYẾT LỆ THÔN — ai.js
   Hệ AI hai não: (1) Đạo Diễn Vĩ Mô điều phối nhịp sợ hãi theo stress của người chơi;
   (2) FSM vi mô của Lệ Nương: DORMANT -> STALKING -> INVESTIGATING -> HUNTING -> EXORCISED,
   cùng cảnh jumpscare 3D. Kèm hệ hạt tro/tàn lửa. */
(function () {
  'use strict';
  var H = window.HuyetLeThon = window.HuyetLeThon || {};
  var M = H.M, R = H.R, CFG = H.CFG;

  /* ===================== HẠT ===================== */
  var FX = H.FX = { list: [] };
  FX.emit = function (x, y, z, n, o) {
    o = o || {};
    for (var k = 0; k < n && FX.list.length < R.particles.max; k++) {
      var sp = o.spread === undefined ? 0.3 : o.spread, v = o.vel || 0.4;
      FX.list.push({ x: x + (Math.random() - 0.5) * sp, y: y + (Math.random() - 0.5) * sp * (o.tall || 1), z: z + (Math.random() - 0.5) * sp,
        vx: (Math.random() - 0.5) * v, vy: (o.up === undefined ? 0.5 : o.up) * (0.5 + Math.random()), vz: (Math.random() - 0.5) * v,
        life: 1, rate: 1 / ((o.life || 1.6) * (0.6 + Math.random() * 0.8)), size: (o.size || 0.07) * (0.6 + Math.random() * 0.8), ember: o.ember ? 1 : 0, col: o.col });
    }
  };
  FX.update = function (dt, wind) {
    var L = FX.list, d = R.particles.data, n = 0;
    for (var k = L.length - 1; k >= 0; k--) {
      var p = L[k]; p.life -= p.rate * dt;
      if (p.life <= 0) { L[k] = L[L.length - 1]; L.pop(); continue; }
      p.x += (p.vx + wind[0] * 0.5) * dt; p.y += p.vy * dt; p.z += (p.vz + wind[1] * 0.5) * dt;
    }
    for (k = 0; k < L.length && n < R.particles.max; k++, n++) {
      p = L[k]; var o = n * 8, a = Math.min(1, p.life * 2) * Math.min(1, (1 - p.life) * 8 + 0.2);
      d[o] = p.x; d[o + 1] = p.y; d[o + 2] = p.z; d[o + 3] = p.size * (p.ember ? 1 : 1.6 - p.life * 0.6);
      if (p.ember) { var c = p.col || [2.2, 0.5, 0.08]; d[o + 4] = c[0] * a; d[o + 5] = c[1] * a; d[o + 6] = c[2] * a; d[o + 7] = 0; }
      else { d[o + 4] = 0.004; d[o + 5] = 0.002; d[o + 6] = 0.002; d[o + 7] = a * 0.55; }
    }
    R.particles.count = n;
  };

  /* ===================== LỆ NƯƠNG ===================== */
  var AI = H.AI = { state: 'DORMANT', pos: [0, 0, 0], yaw: 0, alpha: 0, alphaT: 0, threat: 0, prox: 0, seen: false, enabled: false, cooldown: 30, timer: 0 };
  var rig, glow, path = [], pi = 0, repath = 0, lost = 0, dash = 4, huntT = 0, linger = 0, sawHide = false, detect = 0, scare = null, exoT = 0, target = [0, 0], glimpse = 0;
  var dir = { next: 18, idle: 0, tension: 0, huntMix: 0, lastPos: [0, 0] };

  AI.init = function () {
    rig = AI.rig = H.Models.ghost(); R.nodes.push(rig.root); rig.root.visible = false;
    glow = H.World.ctx.light([0, -50, 0], [1.0, 0.06, 0.03], 7, 0); glow.base = 0;
  };
  AI.reset = function () {
    AI.state = 'DORMANT'; AI.alpha = AI.alphaT = 0; AI.cooldown = 25; AI.threat = AI.prox = 0; AI.seen = false; scare = null; path = []; lost = 0; huntT = 0; sawHide = false; detect = 0; glimpse = 0;
    rig.root.visible = false; H.Player.locked = false; H.Player.fovOverride = 0; dir.next = 15; AI.ritual = false;
  };
  function set(s) { AI.state = s; AI.timer = 0; }
  function stage() { return H.Puzzles.stage(); }
  function distP() { var p = H.Player.pos; return Math.hypot(p[0] - AI.pos[0], p[2] - AI.pos[2]); }
  function face(x, z, dt, rate) { var want = Math.atan2(x - AI.pos[0], z - AI.pos[2]); AI.yaw += M.angDiff(AI.yaw, want) * Math.min(1, dt * (rate || 6)); }
  function seePlayer() { var p = H.Player.pos; return H.World.los(AI.pos[0], AI.pos[2], p[0], p[2], false); }
  function place(x, z) { AI.pos[0] = x; AI.pos[2] = z; AI.pos[1] = H.World.heightAt(x, z); }

  function startStalk() {
    var W = H.World, P = H.Player, pts = W.graph.pts, best = null, bs = -1e9, fw = P.forward();
    for (var k = 0; k < pts.length * 2; k++) {
      var b = pts[k % pts.length], x = b[0] + (k >= pts.length ? (Math.random() - 0.5) * 6 : 0), z = b[1] + (k >= pts.length ? (Math.random() - 0.5) * 6 : 0);
      var dx = x - P.pos[0], dz = z - P.pos[2], d = Math.hypot(dx, dz);
      if (d < 12 || d > 30 || W.pointBlocked(x, z, false, 0.4) || !W.los(x, z, P.pos[0], P.pos[2], false)) continue;
      var dot = (dx * fw[0] + dz * fw[2]) / d, sc = -Math.abs(dot - 0.72) * 8 - Math.abs(d - 19) * 0.15 + Math.random() * 2;
      if (sc > bs) { bs = sc; best = [x, z]; }
    }
    if (!best) { AI.cooldown = 8; return set('DORMANT'); }
    place(best[0], best[1]); AI.yaw = Math.atan2(P.pos[0] - best[0], P.pos[2] - best[1]);
    AI.alphaT = 0.92; set('STALKING'); linger = 9 + Math.random() * 8;
    if (Math.random() < 0.5) H.Audio.weep([best[0], 1.5, best[1]], 3.5, 0.35);
  }
  function startInvestigate(x, z) {
    var W = H.World, P = H.Player;
    if (AI.alpha < 0.1) { // hiện ra từ một waypoint xa khuất tầm mắt
      var pts = W.graph.pts, cand = [];
      for (var k = 0; k < pts.length; k++) { var d = Math.hypot(pts[k][0] - P.pos[0], pts[k][1] - P.pos[2]); if (d > 16 && d < 38 && !W.los(pts[k][0], pts[k][1], P.pos[0], P.pos[2], false)) cand.push(pts[k]); }
      if (!cand.length) for (k = 0; k < pts.length; k++) { d = Math.hypot(pts[k][0] - P.pos[0], pts[k][1] - P.pos[2]); if (d > 20 && d < 40) cand.push(pts[k]); }
      if (!cand.length) { AI.cooldown = 10; return set('DORMANT'); }
      var c = cand[Math.floor(Math.random() * cand.length)]; place(c[0], c[1]);
    }
    target = [x, z]; path = W.path(AI.pos[0], AI.pos[2], x, z); pi = 0; AI.alphaT = 0.95; linger = 0; set('INVESTIGATING');
  }
  AI.forceHunt = function (x, z, emerge) {
    if (x !== undefined) { place(x, z); AI.alpha = 0.2; }
    AI.emerge = emerge || 0;
    AI.alphaT = 1; lost = 0; huntT = 0; dash = 3 + Math.random() * 3; sawHide = false; repath = 0; set('HUNTING');
    H.Audio.scream([AI.pos[0], 1.6, AI.pos[2]], false); H.Audio.sting(); H.Player.shake = Math.max(H.Player.shake, 0.05);
  };
  function vanish(cool, sound) {
    AI.alphaT = 0; AI.cooldown = cool; set('DORMANT');
    if (sound) { var c = R.cam.pos; H.Audio.whisper([c[0], c[1], c[2]], 2.2); H.Audio.glitch([AI.pos[0], 1.5, AI.pos[2]]); }
  }
  AI.onPlayerHide = function () {
    if (AI.state === 'HUNTING') { sawHide = distP() < 9 && seePlayer(); }
  };
  /* đèn Xenon của Máy Ảnh Tâm Linh */
  AI.onFlash = function () {
    if (AI.alpha < 0.25 || AI.state === 'EXORCISED' || scare) return false;
    var d = distP();
    if (d > 16 || H.Player.lookDot(AI.pos[0], AI.pos[1] + 1.6, AI.pos[2]) < 0.72 || !seePlayer()) return false;
    set('EXORCISED'); exoT = 0; H.Audio.wail([AI.pos[0], 1.6, AI.pos[2]]);
    FX.emit(AI.pos[0], AI.pos[1] + 1.2, AI.pos[2], 120, { spread: 0.9, tall: 2, vel: 2.2, up: 1.4, life: 1.8, size: 0.09 });
    FX.emit(AI.pos[0], AI.pos[1] + 1.2, AI.pos[2], 40, { spread: 0.8, tall: 2, vel: 1.8, up: 1.8, life: 1.2, size: 0.03, ember: true });
    H.Player.sanity = Math.min(100, H.Player.sanity + 10);
    if (!H.Puzzles.flags.stunnedOnce) { H.Puzzles.flags.stunnedOnce = 1; H.UI.subtitle(CFG.LINES.stunned, 4); }
    return true;
  };
  function followPath(dt, speed) {
    if (pi >= path.length) return true;
    var t = path[pi], dx = t[0] - AI.pos[0], dz = t[1] - AI.pos[2], d = Math.hypot(dx, dz);
    if (d < 0.6) { pi++; return pi >= path.length; }
    var s = Math.min(d, speed * dt); place(AI.pos[0] + dx / d * s, AI.pos[2] + dz / d * s); face(t[0], t[1], dt, 5);
    return false;
  }
  function startScare() {
    var P = H.Player; scare = { t: 0, yaw0: P.yaw, pitch0: P.pitch }; P.locked = true; P.camUp = false; P.mirrorUp = false;
    if (P.hidden) P.unhide();
    H.Audio.scream(null, true); H.Audio.sting(); set('SCARE'); AI.alphaT = AI.alpha = 1;
  }

  AI.update = function (dt, time) {
    var P = H.Player, W = H.World, A = H.Audio, e = R.env, k;
    var d = distP(), st = AI.state;
    AI.timer += dt;
    if (AI.ritual) { // hiện thân trong nghi lễ — không tấn công
      AI.alpha += (AI.alphaT - AI.alpha) * Math.min(1, dt * 1.2); var ft = AI.faceT || [P.pos[0], P.pos[2]]; face(ft[0], ft[1], dt, 2); pose(dt, time, AI.puppetPose || 'calm'); AI.threat += (0.35 - AI.threat) * dt; AI.prox = 0; AI.seen = false; applyRig(time); return;
    }
    if (st === 'DORMANT') {
      AI.alphaT = 0;
      if (glimpse > 0) { glimpse -= dt; AI.alphaT = glimpse > 0 ? 0.85 : 0; AI.alpha = AI.alphaT; }
      else if (AI.enabled) {
        AI.cooldown -= dt * (1 + Math.max(0, 70 - P.sanity) * 0.009);
        if (P.noise > 12 && stage() >= 2 && AI.cooldown < 14 && !P.hidden) { startInvestigate(P.noisePos[0], P.noisePos[1]); }
        else if (AI.cooldown <= 0) {
          var r = Math.random(), sg = stage();
          if (sg >= 2 && r < 0.25 + sg * 0.1 && !P.hidden) startInvestigate(P.pos[0], P.pos[2]); else startStalk();
        }
      }
    } else if (st === 'STALKING') {
      face(P.pos[0], P.pos[2], dt, 1.5);
      var lit = P.flashlight && d < 30 && fdot(P) > 0.972 && seePlayer();
      if (lit || d < 6.5) { vanish(14 + Math.random() * 16 - stage() * 2, true); P.sanity = Math.max(0, P.sanity - (d < 6.5 ? 4 : 1.5)); }
      else if (AI.timer > linger) {
        var rr = Math.random();
        if (rr < 0.35) { AI.alphaT = 0; AI.cooldown = 3; set('DORMANT'); }
        else if (stage() >= 2 && rr < 0.7) startInvestigate(P.pos[0], P.pos[2]);
        else vanish(18 + Math.random() * 18, false);
      }
    } else if (st === 'INVESTIGATING') {
      var done = followPath(dt, 2.3 + stage() * 0.15);
      if (done) {
        linger += dt; AI.yaw += Math.sin(time * 0.9) * dt * 1.4;
        if (P.hidden && d < 4.5) { // rình quanh chỗ nấp: phải nín thở
          if (!P.holding) detect += dt; else detect = Math.max(0, detect - dt * 0.5);
          if (detect > 1.6) return startScare();
        }
        if (linger > 5.5) vanish(20 + Math.random() * 15, false);
      }
      if (!P.hidden && d < 17 && seePlayer() && (P.flashlight || d < 8 || (P.moving && !P.crouch) || P.camAnim > 0.5)) AI.forceHunt();
      if (P.noise > 9 && !P.hidden && !done) { target = [P.noisePos[0], P.noisePos[1]]; path = W.path(AI.pos[0], AI.pos[2], target[0], target[1]); pi = 0; }
    } else if (st === 'HUNTING') {
      if (AI.emerge > 0) { AI.emerge -= dt; face(P.pos[0], P.pos[2], dt, 3); target = [P.pos[0], P.pos[2]]; AI.alpha += (1 - AI.alpha) * Math.min(1, dt * 1.4); AI.prox += (0.5 - AI.prox) * dt; AI.threat += (1 - AI.threat) * dt * 2; pose(dt, time, 'exo'); applyRig(time); director(dt, time); return; }
      huntT += dt; var see = !P.hidden && seePlayer();
      if (see) { lost = 0; target = [P.pos[0], P.pos[2]]; } else lost += dt;
      var speed = 4.5 + stage() * 0.12;
      if (P.hidden) {
        if (sawHide) { // đã thấy người chơi chui vào -> lôi ra
          var hp = P.hidden.front; path = [[hp[0], hp[1]]]; pi = 0; followPath(dt, speed);
          if (Math.hypot(hp[0] - AI.pos[0], hp[1] - AI.pos[2]) < 1.0) return startScare();
        } else { target = [P.hidden.front[0], P.hidden.front[1]]; path = W.path(AI.pos[0], AI.pos[2], target[0], target[1]); pi = 0; linger = 0; detect = 0; set('INVESTIGATING'); }
      } else {
        if (W.los(AI.pos[0], AI.pos[2], P.pos[0], P.pos[2], true, 0.25)) { path = [[P.pos[0], P.pos[2]]]; pi = 0; }
        else { repath -= dt; if (repath <= 0 || pi >= path.length) { repath = 0.5; path = W.path(AI.pos[0], AI.pos[2], target[0], target[1]); pi = 0; } }
        followPath(dt, speed);
        dash -= dt;
        if (dash <= 0 && d > 6 && pi < path.length) { // dịch chuyển giật hình
          dash = 3.2 + Math.random() * 3.5; var t = path[pi], dx = t[0] - AI.pos[0], dz = t[1] - AI.pos[2], dl = Math.hypot(dx, dz) || 1, j = Math.min(dl, 3.6);
          FX.emit(AI.pos[0], AI.pos[1] + 1.1, AI.pos[2], 40, { spread: 0.7, tall: 2.2, vel: 0.8, life: 1.0 });
          place(AI.pos[0] + dx / dl * j, AI.pos[2] + dz / dl * j); AI.alpha = 0.15; A.glitch([AI.pos[0], 1.5, AI.pos[2]]);
        }
        if (d < 1.15) return startScare();
        if (lost > 7 || huntT > 50) { linger = 0; detect = 0; path = W.path(AI.pos[0], AI.pos[2], target[0], target[1]); pi = 0; set('INVESTIGATING'); }
      }
    } else if (st === 'EXORCISED') {
      exoT += dt; AI.alphaT = exoT < 0.5 ? 1 : 0; if (exoT > 0.5) AI.alpha *= Math.max(0, 1 - dt * 2.2) * (Math.random() < 0.3 ? 0.6 : 1);
      var bx = AI.pos[0] - P.pos[0], bz = AI.pos[2] - P.pos[2], bl = Math.hypot(bx, bz) || 1; AI.pos[0] += bx / bl * dt * 2.5; AI.pos[2] += bz / bl * dt * 2.5;
      if (exoT > 2.4) { AI.alpha = 0; AI.cooldown = 34 + Math.random() * 18 - stage() * 3; set('DORMANT'); if (!H.Puzzles.flags.ambushDone && H.Puzzles.flags.gotMirror) H.Puzzles.ambushSurvived(); }
    } else if (st === 'SCARE') {
      scare.t += dt; var t2 = scare.t, fw2 = [-Math.sin(scare.yaw0), -Math.cos(scare.yaw0)];
      // Lệ Nương áp sát mặt, khoá camera, zoom FOV, rung, đèn chớp
      var gx = P.pos[0] + fw2[0] * M.lerp(1.6, 0.62, Math.min(1, t2 * 3)), gz = P.pos[2] + fw2[1] * M.lerp(1.6, 0.62, Math.min(1, t2 * 3));
      AI.pos[0] = gx; AI.pos[2] = gz; AI.pos[1] = P.gy + P.eye - 2.13; AI.yaw = Math.atan2(P.pos[0] - gx, P.pos[2] - gz);
      P.yaw = scare.yaw0; P.pitch += (0.02 - P.pitch) * Math.min(1, dt * 12);
      P.fovOverride = M.lerp(70, 34, Math.min(1, t2 * 2.2)); P.shake = 0.07 + t2 * 0.05;
      var strobe = Math.sin(t2 * 55) > 0.1 ? 1 : 0.05; e.xenon[0] = 9 * strobe; e.xenon[1] = 1.2 * strobe; e.xenon[2] = 0.8 * strobe;
      R.post.veins = 1; R.post.aberr = 0.05; R.post.barrel = 0.35; R.post.fade = M.smooth(1.55, 1.95, t2);
      if (t2 > 2.0) { e.xenon[0] = e.xenon[1] = e.xenon[2] = 0; P.dead = true; P.fovOverride = 0; scare = null; AI.alpha = AI.alphaT = 0; AI.cooldown = 30; set('DORMANT'); }
    }
    // mờ dần / hiện dần
    AI.alpha += (AI.alphaT - AI.alpha) * Math.min(1, dt * (AI.alphaT > AI.alpha ? 1.4 : 5));
    if (AI.state === 'HUNTING' && Math.random() < 0.04) AI.alpha *= 0.5;
    var vis = AI.alpha > 0.02;
    // áp lực lên người chơi
    var px = vis ? M.clamp(1 - d / 14, 0, 1) : 0;
    AI.prox += (px * (AI.state === 'HUNTING' || AI.state === 'SCARE' ? 1 : 0.5) - AI.prox) * Math.min(1, dt * 4);
    var th = AI.state === 'HUNTING' || AI.state === 'SCARE' ? 1 : (AI.state === 'INVESTIGATING' ? 0.45 + px * 0.3 : (AI.state === 'STALKING' ? 0.2 : 0));
    AI.threat += (th - AI.threat) * Math.min(1, dt * 1.5);
    AI.seen = vis && d < 34 && P.lookDot(AI.pos[0], AI.pos[1] + 1.5, AI.pos[2]) > 0.8 && (AI.state === 'SCARE' || seePlayer());
    pose(dt, time, AI.state === 'HUNTING' ? 'hunt' : (AI.state === 'EXORCISED' ? 'exo' : (AI.state === 'SCARE' ? 'scare' : 'stalk')));
    applyRig(time);
    if (vis && Math.random() < dt * 34) FX.emit(AI.pos[0], AI.pos[1] + 0.3 + Math.random() * 1.4, AI.pos[2], 1, { spread: 0.5, vel: 0.3, up: 0.35, life: 2.2, size: 0.06 });
    director(dt, time);
  };
  function fdot(P) {
    var f = P.flDir, c = R.cam.pos, dx = AI.pos[0] - c[0], dy = AI.pos[1] + 1.4 - c[1], dz = AI.pos[2] - c[2], l = Math.hypot(dx, dy, dz) || 1;
    return (dx * f[0] + dy * f[1] + dz * f[2]) / l;
  }
  var ps = { arm: 0, elbow: 0, lean: 0, tilt: 0.3, mouth: 0.5, spread: 0.1 };
  function pose(dt, time, mode) {
    var t = { arm: -0.06, elbow: -0.08, lean: 0.03, tilt: 0.34, mouth: 0.5, spread: 0.08 }, k = Math.min(1, dt * 6);
    if (mode === 'hunt') t = { arm: -1.35, elbow: -0.35, lean: 0.3, tilt: 0.5, mouth: 1.9, spread: 0.2 };
    else if (mode === 'exo') t = { arm: -2.5, elbow: -1.7, lean: -0.45, tilt: -0.3, mouth: 2.6, spread: 0.3 };
    else if (mode === 'scare') t = { arm: -1.25, elbow: -0.9, lean: 0.12, tilt: 0.12, mouth: 3.0, spread: 0.45 };
    else if (mode === 'calm') t = { arm: -0.02, elbow: -0.05, lean: 0, tilt: 0.05, mouth: 0.35, spread: 0.05 };
    for (var n in ps) ps[n] += (t[n] - ps[n]) * k;
    ps.mode = mode;
    var tw = mode === 'hunt' || mode === 'scare' ? (Math.random() < 0.08 ? (Math.random() - 0.5) * 0.9 : 0) : 0;
    rig.body.pos[1] = 0.26 + Math.sin(time * 1.3) * 0.06; rig.body.rot[0] = ps.lean;
    rig.neck.rot[2] = ps.tilt + Math.sin(time * 0.7) * 0.05 + tw; rig.neck.rot[0] = Math.sin(time * 0.5) * 0.06 + (mode === 'scare' ? -0.1 : 0.12); rig.neck.rot[1] = tw * 0.6;
    rig.mouth.scl[1] = ps.mouth; rig.mouth.scl[0] = 1 + ps.mouth * 0.12;
    rig.armL.sh.rot[0] = ps.arm + Math.sin(time * 2.3) * 0.05; rig.armR.sh.rot[0] = ps.arm + Math.cos(time * 2.0) * 0.05;
    rig.armL.sh.rot[2] = -ps.spread; rig.armR.sh.rot[2] = ps.spread;
    rig.armL.el.rot[0] = ps.elbow; rig.armR.el.rot[0] = ps.elbow + Math.sin(time * 3.1) * 0.04;
    rig.armL.hand.rot[0] = -0.3 + Math.sin(time * 5) * 0.08; rig.armR.hand.rot[0] = -0.3 + Math.cos(time * 4.3) * 0.08;
  }
  function applyRig(time) {
    var vis = AI.alpha > 0.02; rig.root.visible = vis;
    rig.root.pos[0] = AI.pos[0]; rig.root.pos[1] = AI.pos[1]; rig.root.pos[2] = AI.pos[2]; rig.root.rot[1] = AI.yaw;
    rig.setAlpha(Math.min(1, AI.alpha));
    if (H.Chars && H.Chars.ghostSync && H.Chars.ghostSync(rig, ps, Math.min(1, AI.alpha), vis, AI.calm)) rig.root.visible = false;
    glow.pos[0] = AI.pos[0] + Math.sin(AI.yaw) * 0.5; glow.pos[1] = AI.pos[1] + 1.7; glow.pos[2] = AI.pos[2] + Math.cos(AI.yaw) * 0.5;
    glow.intensity = AI.alpha * (AI.calm ? 0.6 : 1.7); glow.on = vis;
    if (AI.calm) { glow.color[0] = 0.8; glow.color[1] = 0.85; glow.color[2] = 1.0; }
  }
  /* hiện thân trong nghi lễ */
  /* điều khiển Lệ Nương như diễn viên trong cắt cảnh */
  AI.puppet = function (x, z, mode, faceT, alphaT) { AI.ritual = true; AI.puppetPose = mode; AI.faceT = faceT; place(x, z); AI.yaw = Math.atan2(faceT[0] - x, faceT[1] - z); AI.alpha = 0; AI.alphaT = alphaT || 0.95; AI.state = 'PUPPET'; };
  AI.banish = function (cool) { AI.state = 'DORMANT'; AI.timer = 0; AI.alpha = AI.alphaT = 0; AI.cooldown = Math.max(AI.cooldown, cool || 0); AI.threat = AI.prox = 0; AI.seen = false; scare = null; rig.root.visible = false; glow.intensity = 0; glow.on = false; };
  AI.puppetEnd = function (cool) { AI.ritual = false; AI.puppetPose = null; AI.faceT = null; AI.banish(cool); };
  AI.appearRitual = function (x, z) { AI.puppetPose = null; AI.faceT = null; AI.ritual = true; place(x, z); AI.alpha = 0; AI.alphaT = 0.95; AI.state = 'RITUAL'; };
  AI.setCalm = function () {
    AI.calm = true; rig.eyeM.emis = [0.2, 0.25, 0.4]; rig.haloM.tint[0] = 0.5; rig.haloM.tint[1] = 0.6; rig.haloM.tint[2] = 1;
    rig.mats.forEach(function (m) { if (m.skin) m.skin = 0; if (m.tex === 'silk') { m.tint[0] = 0.85; m.tint[1] = 0.85; m.tint[2] = 0.9; } });
  };

  /* ===================== ĐẠO DIỄN VĨ MÔ ===================== */
  function director(dt, time) {
    var P = H.Player, A = H.Audio, W = H.World, c = R.cam.pos, k;
    var active = AI.state === 'HUNTING' || AI.state === 'SCARE' ? 1 : (AI.state === 'INVESTIGATING' ? 0.6 : (AI.state === 'STALKING' ? 0.3 : 0));
    dir.tension += (Math.max(P.stress, active, (100 - P.sanity) / 140) - dir.tension) * Math.min(1, dt * 0.6);
    dir.huntMix += ((AI.state === 'HUNTING' ? 1 : 0) - dir.huntMix) * Math.min(1, dt * (AI.state === 'HUNTING' ? 3 : 0.6));
    A.tension = dir.tension; A.hunt = dir.huntMix;
    if (H.Main.cinematic || P.locked) return;
    // người chơi "cắm trại" trong vùng an toàn quá lâu -> ép di chuyển
    if (Math.hypot(P.pos[0] - dir.lastPos[0], P.pos[2] - dir.lastPos[1]) > 6) { dir.lastPos = [P.pos[0], P.pos[2]]; dir.idle = 0; } else dir.idle += dt;
    if (dir.idle > 55 && AI.enabled && AI.state === 'DORMANT' && stage() >= 2 && !P.hidden) { dir.idle = 20; AI.cooldown = 0; }
    dir.next -= dt * (1 + (100 - P.sanity) * 0.012);
    if (dir.next > 0 || active > 0.5) return;
    dir.next = 20 + Math.random() * 32 - stage() * 2;
    var fw = P.forward(), r = Math.random(), sg = stage();
    if (r < 0.17) { // cửa gỗ xa kẽo kẹt rồi đóng sầm
      var ds = W.doors, best = null; for (k = 0; k < ds.length; k++) { var dd = Math.hypot(ds[k].pos[0] - c[0], ds[k].pos[2] - c[2]); if (dd > 8 && dd < 45 && (!best || Math.random() < 0.5)) best = ds[k]; }
      var dp = best ? best.pos : [c[0] - fw[0] * 15, 1.5, c[2] - fw[2] * 15];
      A.creak(dp, 0.9, 1.8); setTimeout(function () { A.slam(dp); }, 1900);
    } else if (r < 0.36) { // đèn lồng hoá xanh
      var n = 0; for (k = 0; k < W.lanterns.length && n < 5; k++) { var L = W.lanterns[k]; if (Math.hypot(L.base[0] - c[0], L.base[2] - c[2]) < 28) { L.blueT = time + 7 + Math.random() * 6; n++; } }
      if (n) A.whisper([c[0], c[1], c[2]], 3); else W.strike(true);
    } else if (r < 0.54) { // bước chân ma sau lưng
      A.phantomSteps([c[0] - fw[0] * 9, 0, c[2] - fw[2] * 9], [c[0] - fw[0] * 1.6, 0, c[2] - fw[2] * 1.6], W.groundMat);
    } else if (r < 0.66) { W.strike(true); }
    else if (r < 0.8) { A.whisper([c[0], c[1], c[2]], 4 + Math.random() * 3); }
    else if (r < 0.92) { var a = Math.random() * 6.28; A.weep([c[0] + Math.cos(a) * 22, 1.5, c[2] + Math.sin(a) * 22], 5, 0.7); }
    else { // một ngọn đèn gần nhất phụt tắt
      var nb = null, nd = 20; for (k = 0; k < W.lanterns.length; k++) { var L2 = W.lanterns[k], d2 = Math.hypot(L2.base[0] - c[0], L2.base[2] - c[2]); if (L2.light && d2 < nd) { nd = d2; nb = L2; } }
      if (nb) { nb.off = true; A.click(0.5); setTimeout(function () { nb.off = false; }, 7000 + Math.random() * 6000); }
    }
    // ảo giác khi Tâm Trí thấp: thoáng thấy nàng ngay sát bên
    if (P.sanity < 32 && AI.state === 'DORMANT' && AI.enabled && sg >= 1 && Math.random() < 0.5) {
      var side = Math.random() < 0.5 ? -1 : 1, gx = c[0] + fw[0] * 3.2 + fw[2] * side * 2.2, gz = c[2] + fw[2] * 3.2 - fw[0] * side * 2.2;
      if (!W.pointBlocked(gx, gz, false, 0.3)) { place(gx, gz); AI.yaw = Math.atan2(c[0] - gx, c[2] - gz); glimpse = 0.38; A.sting(); P.shake = 0.03; }
    }
  }
})();
