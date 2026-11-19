/* HUYẾT LỆ THÔN — player.js
   Điều khiển góc nhìn thứ nhất: vật lý di chuyển, thể lực, Điểm Tâm Trí & nhịp tim,
   đèn pin có quán tính, Máy Ảnh Tâm Linh, gương đồng, ẩn nấp & nín thở. */
(function () {
  'use strict';
  var H = window.HuyetLeThon = window.HuyetLeThon || {};
  var M = H.M, R = H.R, CFG = H.CFG, C = CFG.PLAYER;
  var P = H.Player = {};

  P.reset = function () {
    P.pos = [CFG.POS.spawn[0], 0, CFG.POS.spawn[1]]; P.yaw = CFG.POS.spawnYaw; P.pitch = 0;
    P.vel = [0, 0]; P.gy = H.World.terrainH(P.pos[0], P.pos[2]); P.eye = C.eye;
    P.stamina = C.staminaMax; P.exhausted = false; P.battery = 100; P.film = C.filmStart; P.sanity = 100; P.bpm = 65; P.stress = 0;
    P.flashlight = false; P.camUp = false; P.camAnim = 0; P.mirrorUp = false; P.flashCD = 0; P.flashT = 0;
    P.hidden = null; P.breath = C.breathMax; P.holding = false; P.noise = 0; P.noisePos = [0, 0]; P.stepAcc = 0; P.bob = 0;
    P.dead = false; P.locked = false; P.shake = 0; P.fovOverride = 0; P.crouch = false; P.sprinting = false; P.moving = false;
    P.flDir = [0, 0, -1]; P.lowBatWarned = false; P.inLight = true; P.white = 0;
  };
  P.forward = function (out) {
    out = out || [0, 0, 0]; var cp = Math.cos(P.pitch);
    out[0] = -Math.sin(P.yaw) * cp; out[1] = Math.sin(P.pitch); out[2] = -Math.cos(P.yaw) * cp; return out;
  };
  P.camPos = function () { return R.cam.pos; };

  P.hide = function (spot) {
    var hx = spot.front[0] - spot.pos[0], hz = spot.front[1] - spot.pos[2], hl = Math.hypot(hx, hz) || 1;
    P.hidden = spot; P.pos[0] = spot.pos[0] + hx / hl * 0.5; P.pos[2] = spot.pos[2] + hz / hl * 0.5;
    P.yaw = spot.yaw; P.pitch = 0; P.vel[0] = P.vel[1] = 0; P.flashlight = false; P.camUp = false; P.mirrorUp = false; P.breath = C.breathMax;
    H.Audio.creak(null, 0.3, 0.7); H.UI.subtitle(CFG.LINES.hide, 5);
    H.AI.onPlayerHide(spot);
  };
  P.unhide = function () {
    var s = P.hidden; if (!s) return;
    P.pos[0] = s.front[0]; P.pos[2] = s.front[1]; P.hidden = null; P.holding = false; H.Audio.creak(null, 0.3, 0.6);
  };

  /* chụp ảnh: đèn Xenon cường độ cao */
  P.takePhoto = function () {
    if (P.flashCD > 0) return;
    if (P.film <= 0) { H.UI.subtitle(CFG.LINES.noFilm, 2.5); H.Audio.click(0.4); return; }
    P.film--; P.flashCD = C.flashCooldown; P.flashT = 0.26; P.white = 1; H.Audio.shutter();
    P.noise = Math.max(P.noise, 6); P.noisePos = [P.pos[0], P.pos[2]];
    H.AI.onFlash(); H.Puzzles.onFlash();
  };

  var fw = [0, 0, 0], tmpP = [0, 0, 0];
  P.update = function (dt, time) {
    var I = H.Input, S = H.Settings, W = H.World, AI = H.AI, Pz = H.Puzzles, A = H.Audio, e = R.env, post = R.post, cam = R.cam;
    // ----- nhìn
    if (!P.locked) {
      var sens = 0.0021 * S.sens * (P.camAnim > 0.5 ? 0.62 : 1);
      P.yaw -= I.dx * sens; P.pitch = M.clamp(P.pitch - I.dy * sens, -1.45, 1.45);
      if (P.hidden) { var dy = M.angDiff(P.hidden.yaw, P.yaw); P.yaw = P.hidden.yaw + M.clamp(dy, -0.75, 0.75); P.pitch = M.clamp(P.pitch, -0.45, 0.45); }
    }
    var sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
    // ----- phím chức năng
    if (!P.locked && !P.hidden) {
      if (I.pressed.KeyF) { P.flashlight = !P.flashlight && P.battery > 0; A.click(0.35); }
      if (I.pressed.KeyC && Pz.has('camera')) { P.camUp = !P.camUp; P.mirrorUp = false; A.click(0.25); }
      P.mirrorUp = !!I.keys.KeyR && Pz.has('mirror') && !P.camUp;
      if (I.fire) { if (P.camUp) P.takePhoto(); else if (Pz.has('camera')) { P.camUp = true; A.click(0.25); } }
    }
    P.camAnim += ((P.camUp ? 1 : 0) - P.camAnim) * Math.min(1, dt * 9);
    P.flashCD = Math.max(0, P.flashCD - dt);
    // ----- di chuyển
    var f = 0, s = 0;
    if (!P.locked && !P.hidden) { f = (I.keys.KeyW || I.keys.ArrowUp ? 1 : 0) - (I.keys.KeyS || I.keys.ArrowDown ? 1 : 0); s = (I.keys.KeyD ? 1 : 0) - (I.keys.KeyA ? 1 : 0); }
    P.crouch = !P.locked && !!(I.keys.ControlLeft || I.keys.ControlRight || I.keys.KeyX);
    var wantSprint = !!(I.keys.ShiftLeft || I.keys.ShiftRight) && f > 0 && !P.crouch && !P.exhausted && P.camAnim < 0.5;
    P.sprinting = wantSprint && P.stamina > 0;
    var speed = P.crouch ? C.crouch : (P.sprinting ? C.sprint : C.walk);
    if (P.camAnim > 0.5) speed *= 0.6; if (P.mirrorUp) speed *= 0.75;
    var l = Math.hypot(f, s) || 1, tx = (-sy * f + cy * s) / l * speed, tz = (-cy * f - sy * s) / l * speed;
    if (!f && !s) tx = tz = 0;
    var acc = Math.min(1, dt * (f || s ? 9 : 12));
    P.vel[0] += (tx - P.vel[0]) * acc; P.vel[1] += (tz - P.vel[1]) * acc;
    var sp = Math.hypot(P.vel[0], P.vel[1]); P.moving = sp > 0.4;
    if (!P.hidden) {
      var ox = P.pos[0], oz = P.pos[2];
      P.pos[0] += P.vel[0] * dt; P.pos[2] += P.vel[1] * dt;
      W.collide(P.pos, C.radius);
      if (!W.walkable(P.pos[0], P.pos[2])) { // trượt dọc mép hành lang thay vì dừng cứng
        if (W.walkable(P.pos[0], oz)) P.pos[2] = oz; else if (W.walkable(ox, P.pos[2])) P.pos[0] = ox; else { P.pos[0] = ox; P.pos[2] = oz; }
      }
    }
    if (P.sprinting && P.moving) { P.stamina = Math.max(0, P.stamina - C.staminaDrain * dt); if (P.stamina <= 0) { P.exhausted = true; A.breath(false); } }
    else { P.stamina = Math.min(C.staminaMax, P.stamina + C.staminaRegen * dt * (P.moving ? 0.7 : 1.3)); if (P.exhausted && P.stamina > 28) P.exhausted = false; }
    // ----- độ cao & bước chân
    var gy = W.heightAt(P.pos[0], P.pos[2]), mat = W.groundMat;
    P.gy += (gy - P.gy) * Math.min(1, dt * 11);
    var eyeT = P.hidden ? (P.hidden.hideY - P.gy) : (P.crouch ? C.crouchEye : C.eye);
    P.eye += (eyeT - P.eye) * Math.min(1, dt * 8);
    if (P.moving && !P.hidden) {
      P.stepAcc += sp * dt; P.bob += sp * dt;
      var stride = P.crouch ? 1.15 : (P.sprinting ? 2.3 : 1.75);
      if (P.stepAcc > stride) {
        P.stepAcc = 0; var loud = P.crouch ? 0.22 : (P.sprinting ? 1.0 : 0.55);
        A.step(mat, loud);
        var nr = P.crouch ? 2.5 : (P.sprinting ? 17 : 8);
        if (nr > P.noise) { P.noise = nr; P.noisePos = [P.pos[0], P.pos[2]]; }
      }
    }
    P.noise = Math.max(0, P.noise - dt * 5);
    // ----- nín thở khi ẩn nấp
    if (P.hidden) {
      var want = !!I.keys.Space && P.breath > 0;
      if (want && !P.holding) A.breath(true);
      if (!want && P.holding) { A.breath(false); if (P.breath <= 0.05) { P.noise = 9; P.noisePos = [P.pos[0], P.pos[2]]; } }
      P.holding = want;
      P.breath = M.clamp(P.breath + (P.holding ? -dt : dt * 1.6), 0, C.breathMax);
    } else { P.holding = false; P.breath = Math.min(C.breathMax, P.breath + dt * 2); }
    // ----- camera
    var bobA = P.hidden ? 0 : Math.min(1, sp / C.walk), ph = P.bob * 3.6;
    var shx = (Math.random() - 0.5) * P.shake, shy = (Math.random() - 0.5) * P.shake, shz = (Math.random() - 0.5) * P.shake;
    P.shake = Math.max(0, P.shake - dt * 0.6);
    cam.pos[0] = P.pos[0] + cy * Math.cos(ph * 0.5) * 0.018 * bobA; cam.pos[1] = P.gy + P.eye + Math.sin(ph) * 0.03 * bobA; cam.pos[2] = P.pos[2] - sy * Math.cos(ph * 0.5) * 0.018 * bobA;
    var breathe = Math.sin(time * (1.2 + P.stress * 2.5)) * 0.004 * (1 + P.stress * 2);
    cam.yaw = P.yaw + shx; cam.pitch = P.pitch + shy + breathe; cam.roll = shz * 0.6 + Math.cos(ph * 0.5) * 0.006 * bobA + s * -0.008;
    var fovT = P.fovOverride || (M.lerp(S.fov, 45, P.camAnim) + (P.sprinting ? 5 : 0));
    cam.fov += (fovT - cam.fov) * Math.min(1, dt * (P.fovOverride ? 14 : 8));
    // ----- đèn pin: quán tính + rung tay
    P.forward(fw);
    var swx = Math.sin(time * 1.1) * 0.012 + Math.sin(time * 2.7) * 0.006 * (1 + P.stress * 3) + Math.cos(ph * 0.5) * 0.02 * bobA;
    var swy = Math.cos(time * 0.9) * 0.01 + Math.sin(ph) * 0.016 * bobA - 0.03;
    var tgx = fw[0] + cy * swx, tgy = fw[1] + swy, tgz = fw[2] - sy * swx, k = Math.min(1, dt * 8.5), fd = P.flDir;
    fd[0] += (tgx - fd[0]) * k; fd[1] += (tgy - fd[1]) * k; fd[2] += (tgz - fd[2]) * k;
    var fl = Math.hypot(fd[0], fd[1], fd[2]) || 1; fd[0] /= fl; fd[1] /= fl; fd[2] /= fl;
    if (P.flashlight) {
      P.battery = Math.max(0, P.battery - C.batteryDrain * dt);
      if (P.battery <= 0) { P.flashlight = false; A.click(0.3); }
      if (P.battery < 15 && !P.lowBatWarned) { P.lowBatWarned = true; H.UI.subtitle(CFG.LINES.lowBattery, 3); }
    }
    if (P.battery > 30) P.lowBatWarned = false;
    var flick = 1;
    if (P.battery < 15) flick = (Math.sin(time * 37) * Math.sin(time * 23.3) > 0.55) ? 0.25 : 0.85;
    if (AI.prox > 0.75 && Math.random() < 0.2) flick *= 0.3; // ma tới gần làm đèn chập chờn
    var on = P.flashlight ? flick * (0.55 + 0.45 * Math.min(1, P.battery / 30)) : 0;
    e.flCol[0] = 3.3 * on; e.flCol[1] = 3.15 * on; e.flCol[2] = 2.8 * on;
    e.flPos[0] = cam.pos[0] + cy * 0.2 + fw[0] * 0.1; e.flPos[1] = cam.pos[1] - 0.2; e.flPos[2] = cam.pos[2] - sy * 0.2 + fw[2] * 0.1;
    e.flDir[0] = fd[0]; e.flDir[1] = fd[1]; e.flDir[2] = fd[2];
    e.flHaze = on * 0.9;
    // ----- đèn flash Xenon
    if (!P.locked) {
      if (P.flashT > 0) { P.flashT -= dt; var xk = Math.max(0, P.flashT / 0.26); xk = xk * xk * 90; e.xenon[0] = xk; e.xenon[1] = xk * 0.97; e.xenon[2] = xk * 0.9; }
      else e.xenon[0] = e.xenon[1] = e.xenon[2] = 0;
    }
    P.white = Math.max(0, P.white - dt * 5);
    // ----- Tâm Trí & nhịp tim
    var lit = P.flashlight || P.camAnim > 0.6;
    if (!lit) { var Ls = W.lanterns; for (k = 0; k < Ls.length; k++) { var L = Ls[k]; if (L.light && !L.off && Math.hypot(L.base[0] - P.pos[0], L.base[2] - P.pos[2]) < 9) { lit = true; break; } } }
    P.inLight = lit;
    var ds = lit ? 0.7 : -1.5;
    if (AI.seen) ds -= 5.5; if (AI.state === 'HUNTING') ds -= 2.2; if (W.inGrave) ds -= 0.5; if (P.hidden && AI.prox > 0.3) ds -= 1.5;
    if (ds > 0 && (AI.state === 'HUNTING' || AI.seen)) ds = 0;
    P.sanity = M.clamp(P.sanity + ds * dt, 0, 100);
    var bt = 65 + (100 - P.sanity) * 0.5 + AI.threat * 62 + (P.sprinting ? 16 : 0) + (P.exhausted ? 14 : 0) + (P.holding ? (C.breathMax - P.breath) * 4 : 0);
    bt = M.clamp(bt, 65, 180);
    P.bpm += (bt - P.bpm) * Math.min(1, dt * (bt > P.bpm ? 0.9 : 0.25));
    P.stress = M.clamp((P.bpm - 65) / 115, 0, 1);
    A.bpm = P.bpm; A.stress = P.stress; A.indoor += ((W.underRoof(P.pos[0], P.pos[2]) || P.hidden ? 1 : 0) - A.indoor) * Math.min(1, dt * 3);
    // ----- hậu kỳ theo trạng thái
    if (!H.Main.cinematic) {
      var beat = A.ready && A.beatAt !== undefined ? Math.exp(-Math.max(0, A.ctx.currentTime - A.beatAt) * 7) : 0;
      var st = P.stress, hunted = AI.state === 'HUNTING' ? 1 : 0;
      post.aberr = 0.0015 + st * st * 0.02 + AI.prox * 0.02 + P.camAnim * 0.003;
      post.barrel = st * 0.14 + AI.prox * 0.16 + P.camAnim * 0.1;
      post.pulse = beat * st * 0.9;
      post.veins += ((Math.max(hunted * 0.7, (st - 0.55) * 1.6, AI.prox * 0.9)) - post.veins) * Math.min(1, dt * 2);
      post.vignette = 0.5 + st * 0.3 + (P.hidden ? 0.2 : 0) + P.camAnim * 0.25;
      post.grain = 0.045 + st * 0.05 + (100 - P.sanity) * 0.0005;
      post.view = P.camAnim * 0.9; post.scan = P.camAnim;
      post.white = P.white * 0.9;
      post.desat = M.clamp((60 - P.sanity) / 120, 0, 0.5);
      post.exposure = 1.15 + (P.hidden ? -0.12 : 0);
    }
    var pr = R.project(cam.pos[0] + fd[0] * 9, cam.pos[1] + fd[1] * 9, cam.pos[2] + fd[2] * 9);
    e.flScreen[0] = pr[2] > 0 ? pr[0] : 0.5; e.flScreen[1] = pr[2] > 0 ? pr[1] : 0.5;
  };

  /* góc lệch (cos) giữa hướng nhìn và một điểm */
  P.lookDot = function (x, y, z) {
    var c = R.cam.pos, dx = x - c[0], dy = y - c[1], dz = z - c[2], l = Math.hypot(dx, dy, dz) || 1;
    P.forward(tmpP); return (dx * tmpP[0] + dy * tmpP[1] + dz * tmpP[2]) / l;
  };
})();
