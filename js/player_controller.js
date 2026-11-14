(function (G) {
  'use strict';
  G.PlayerController = class PlayerController {
    constructor(app, session) {
      this.app = app; this.world = app.world; this.camera = app.camera; this.canvas = app.canvas; this.bus = app.bus; this.sound = app.sound;
      this.data = session.player; this.session = session; this.position = new THREE.Vector3().fromArray(this.data.position); this.velocity = new THREE.Vector3(); this.keys = new Set();
      this.yaw = this.data.yaw; this.pitch = this.data.pitch; this.height = G.Config.player.standingHeight; this.running = false; this.crouching = false; this.hiddenSpot = null; this.holdingBreath = false;
      this.breathExhausted = false; this.regenDelay = 0; this.invulnerability = 0; this.talismanCooldown = 0; this.damageFlash = 0; this.stepDistance = 0; this.bobPhase = 0; this.healTimer = 0;
      this.direction = new THREE.Vector3(); this.lookEuler = new THREE.Euler(0, 0, 0, 'YXZ'); this.flashDirection = new THREE.Vector3(0, 0, -1);
      const cfg = G.Config.player.flashlight;
      this.flashlight = new THREE.SpotLight(0xffe8c0, cfg.intensity, cfg.distance, cfg.angle, cfg.penumbra, cfg.decay); this.flashlight.castShadow = app.settings.quality !== 'low'; this.flashlight.shadow.mapSize.set(1024, 1024); this.flashlight.shadow.bias = -.0004; this.flashlight.shadow.normalBias = .025;
      this.flashTarget = new THREE.Object3D(); this.flashlight.target = this.flashTarget; app.scene.add(this.flashlight, this.flashTarget);
      this.fillLight = new THREE.PointLight(0xb1b7b9, .14, 3); app.scene.add(this.fillLight);
      this.hand = new THREE.Group(); this.camera.add(this.hand); app.scene.add(this.camera);
      const body = app.models.cylinder(this.hand, .035, .04, .18, [.19, -.17, -.3], app.models.mat(0x34393a, .4, .6)); body.rotation.x = Math.PI / 2;
      const lens = app.models.cylinder(this.hand, .055, .035, .055, [.19, -.17, -.40], app.models.mat(0xc0bea2, .15, .65)); lens.rotation.x = Math.PI / 2;
      const handSkin=app.models.sharedMaterial('first-person-skin',{map:app.textures.skin(false),color:0xb2987e,roughness:.7});
      app.models.curve(this.hand,[[.33,-.46,-.08],[.25,-.29,-.19],[.20,-.22,-.28]],.035,app.textures.material('cloth',0x465653),14);
      app.models.ellipsoid(this.hand,[.20,-.21,-.29],[.039,.03,.052],handSkin);
      for(let i=0;i<4;i++)app.models.curve(this.hand,[[.17,-.21,-.32+i*.02],[.151,-.177,-.32+i*.02],[.17,-.141,-.32+i*.02],[.195,-.137,-.32+i*.02]],.008,handSkin,10);
      app.models.curve(this.hand,[[.225,-.22,-.29],[.235,-.18,-.33],[.22,-.155,-.35]],.011,handSkin,10);
      this.burningTalisman = app.models.item('talisman'); this.burningTalisman.position.set(-.22, -.22, -.45); this.burningTalisman.scale.setScalar(.65); this.burningTalisman.visible = false; this.camera.add(this.burningTalisman);
      this.burnLight = new THREE.PointLight(0xff8338, 0, 5, 2); this.camera.add(this.burnLight); this.burnTimer = 0;
      this.onMouse = e => { if (this.app.state !== 'playing' || document.pointerLockElement !== this.canvas) return; const sensitivity = this.app.settings.mouseSensitivity; this.yaw -= e.movementX * sensitivity; this.pitch = G.Utils.clamp(this.pitch - e.movementY * sensitivity, -1.48, 1.48); };
      this.onDown = e => {
        if (this.app.state !== 'playing') return;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ControlLeft', 'Tab'].includes(e.code)) e.preventDefault();
        this.keys.add(e.code); if (e.repeat) return;
        if (e.code === 'KeyF') { this.data.flashlightOn = !this.data.flashlightOn; this.sound.cue('pickup'); }
        if (e.code === 'KeyQ') this.useTalisman();
        if (e.code === 'KeyR') this.replaceBattery();
        if (e.code === 'KeyH') this.heal();
      };
      this.onUp = e => { this.keys.delete(e.code); if (e.code === 'Space') this.breathExhausted = false; };
      document.addEventListener('mousemove', this.onMouse); document.addEventListener('keydown', this.onDown); document.addEventListener('keyup', this.onUp);
      this.updateCamera(0, 0);
    }
    down(action) { return G.Config.input[action].some(code => this.keys.has(code)); }
    clearInput() { this.keys.clear(); this.velocity.set(0, 0, 0); this.running = false; this.holdingBreath = false; }
    requestPointerLock() {
      try { const result = this.canvas.requestPointerLock(); if (result && result.catch) result.catch(() => this.app.toast('Nhấn vào màn chơi để khóa chuột.', 'warning')); } catch (e) { this.app.toast('Trình duyệt chưa cho khóa chuột. Nhấn lại vào màn chơi.', 'warning'); }
    }
    emitNoise(loudness, kind) { this.bus.emit(G.EventNames.NOISE, { position: this.position.clone(), loudness: loudness, kind: kind }); }
    enterHide(spot) {
      if (this.hiddenSpot) return; this.hiddenSpot = spot; this.clearInput(); this.position.copy(spot.position); this.height = spot.type === 'table' ? .55 : 1.45;
      this.session.stats.timesHidden++; this.emitNoise(.18, 'hide'); this.app.toast('Giữ Space để nín thở khi Linh đi ngang. E để ra ngoài.');
      if (spot.model.userData.doors) spot.model.userData.doors.forEach((d, i) => d.rotation.y = i ? -.1 : .1);
      this.hand.visible = false;
    }
    exitHide(forced) {
      if (!this.hiddenSpot) return true;
      const spot = this.hiddenSpot; let destination = spot.exit.clone();
      if (this.world.blocked(destination.x, destination.z, .32, 1.72)) {
        let found = false;
        for (let r = 1; r <= 3 && !found; r += .5) for (let i = 0; i < 12; i++) { const p = spot.position.clone().add(new THREE.Vector3(Math.cos(i * Math.PI / 6) * r, 0, Math.sin(i * Math.PI / 6) * r)); if (!this.world.blocked(p.x, p.z, .32, 1.72)) { destination = p; found = true; break; } }
        if (!found) { if (!forced) this.app.toast('Lối ra đang bị chắn.', 'warning'); return false; }
      }
      this.position.copy(destination); this.hiddenSpot = null; this.holdingBreath = false; this.breathExhausted = false; this.hand.visible = true; this.emitNoise(forced ? 1 : .3, 'exit_hide'); return true;
    }
    useTalisman() {
      if (this.talismanCooldown > 0) return;
      if (!(this.session.inventory.talisman > 0)) { this.app.toast(G.UIText.messages.noTalisman); return; }
      this.session.inventory.talisman--; this.session.stats.talismansUsed++; this.talismanCooldown = 3; this.data.sanity = Math.min(100, this.data.sanity + 8);
      this.burnTimer = 1.3; this.burningTalisman.visible = true;
      this.sound.cue('burn'); const repelled = this.app.ghost.repel(this.position); this.app.toast(repelled ? 'Bùa cháy sáng. Linh bị đẩy lùi!' : 'Bùa đã cháy. Không có hồn ma trong phạm vi.'); this.bus.emit(G.EventNames.ITEM_USED, { id: 'talisman' });
    }
    replaceBattery() { if (this.data.battery >= 99) { this.app.toast(G.UIText.messages.batteryFull); return; } if (!(this.session.inventory.battery > 0)) { this.app.toast(G.UIText.messages.noBattery); return; } this.session.inventory.battery--; this.data.battery = 100; this.sound.cue('pickup'); this.app.toast('Đã thay pin đèn.'); }
    heal() {
      if (this.healTimer > 0) return;
      if (this.data.health >= 100) { this.app.toast(G.UIText.messages.healthFull); return; }
      if (!(this.session.inventory.medicine > 0)) { this.app.toast(G.UIText.messages.noMedicine); return; }
      this.healTimer = 1.4; this.session.inventory.medicine--; this.app.toast('Đang băng vết thương…');
    }
    damage(amount) {
      if (this.invulnerability > 0 || this.app.state !== 'playing') return false;
      this.data.health = Math.max(0, this.data.health - amount); this.invulnerability = 2.5; this.damageFlash = 1; this.session.stats.damageTaken += amount; this.healTimer = 0; this.sound.cue('hurt'); this.bus.emit(G.EventNames.PLAYER_DAMAGED, { amount: amount });
      if (this.data.health <= 0) this.bus.emit(G.EventNames.PLAYER_DIED, { reason: 'ghost' }); return true;
    }
    update(dt, time) {
      const c = G.Config.player; this.invulnerability = Math.max(0, this.invulnerability - dt); this.talismanCooldown = Math.max(0, this.talismanCooldown - dt); this.damageFlash = Math.max(0, this.damageFlash - dt * .65); this.regenDelay = Math.max(0, this.regenDelay - dt);
      this.burnTimer = Math.max(0, this.burnTimer - dt); this.burningTalisman.visible = this.burnTimer > 0; this.burningTalisman.scale.set(.65, .65 * Math.min(1, this.burnTimer), .65); this.burningTalisman.rotation.z = this.app.settings.reducedMotion ? 0 : Math.sin(time * 12) * .035; this.burnLight.intensity = this.burnTimer > 0 ? (this.app.settings.reducedFlashes ? .35 : .8) * Math.min(1, this.burnTimer) : 0;
      if (this.healTimer > 0) { this.healTimer -= dt; if (this.healTimer <= 0) { this.data.health = Math.min(100, this.data.health + 45); this.app.toast('Vết thương đã được băng.'); } }
      this.crouching = this.down('crouch') || (this.world.blocked(this.position.x,this.position.z,c.radius,c.standingHeight)&&!this.world.blocked(this.position.x,this.position.z,c.radius,c.crouchingHeight)); this.running = false;
      if (this.hiddenSpot) {
        this.holdingBreath = this.down('breath') && this.data.stamina > 0 && !this.breathExhausted;
        if (this.holdingBreath) { this.data.stamina = Math.max(0, this.data.stamina - c.holdBreathDrain * dt); this.regenDelay = 2.4; if (this.data.stamina <= 0) { this.breathExhausted = true; this.holdingBreath = false; this.emitNoise(.9, 'gasp'); this.app.toast(G.UIText.messages.breathEmpty, 'warning'); } }
      } else {
        this.holdingBreath = false; const forward = (this.down('forward') ? 1 : 0) - (this.down('backward') ? 1 : 0), right = (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0);
        const length = Math.hypot(forward, right), moving = length > 0;
        this.running = moving && this.down('run') && !this.crouching && this.data.stamina > c.minRunStamina && this.healTimer <= 0;
        const speed = this.healTimer > 0 ? 1 : this.running ? c.runSpeed : this.crouching ? c.crouchSpeed : c.walkSpeed;
        const tx = moving ? (-Math.sin(this.yaw) * forward + Math.cos(this.yaw) * right) / length * speed : 0;
        const tz = moving ? (-Math.cos(this.yaw) * forward - Math.sin(this.yaw) * right) / length * speed : 0;
        this.velocity.x = G.Utils.damp(this.velocity.x, tx, moving ? c.acceleration : c.friction, dt); this.velocity.z = G.Utils.damp(this.velocity.z, tz, moving ? c.acceleration : c.friction, dt);
        const oldX = this.position.x, oldZ = this.position.z; this.world.move(this.position, this.velocity.x * dt, this.velocity.z * dt, c.radius, this.crouching ? c.crouchingHeight : c.standingHeight);
        const distance = Math.hypot(this.position.x - oldX, this.position.z - oldZ); this.session.stats.distanceWalked += distance; this.stepDistance += distance; this.bobPhase += distance * (this.running ? 3.4 : 4.4);
        if (this.running) { this.data.stamina = Math.max(0, this.data.stamina - c.runDrain * dt); this.regenDelay = c.staminaRegenDelay; }
        const stepLength = this.crouching ? 1.1 : this.running ? 2.1 : 1.65;
        if (this.stepDistance > stepLength) { this.stepDistance = 0; this.sound.step(this.position, this.world.isIndoors(this.position) ? 'wood' : 'mud', this.running); this.emitNoise(this.crouching ? .05 : this.running ? .9 : .22, 'step'); }
      }
      if (this.regenDelay <= 0 && !this.holdingBreath && !this.running) this.data.stamina = Math.min(100, this.data.stamina + c.staminaRegen * dt);
      const lightOn = this.data.flashlightOn && this.data.battery > 0 && !this.hiddenSpot;
      if (lightOn) this.data.battery = Math.max(0, this.data.battery - c.flashlight.batteryDrain * dt);
      const ghost = this.app.ghost, distance = ghost ? ghost.position.distanceTo(this.position) : 100;
      let sanityRate = lightOn ? 0 : -c.sanityDarkDrain;
      if (ghost && ghost.state !== 'banished' && ghost.state !== 'dormant' && distance < c.sanityGhostRadius && this.world.lineOfSight(this.camera.position, ghost.position.clone().add(new THREE.Vector3(0, 1.6, 0)))) sanityRate -= c.sanityGhostDrain * (1 - distance / c.sanityGhostRadius);
      if (this.world.isSafe(this.position)) sanityRate = c.sanitySafeRegen;
      this.data.sanity = G.Utils.clamp(this.data.sanity + sanityRate * dt, 0, 100);
      this.updateCamera(dt, time); this.data.position = this.position.toArray(); this.data.yaw = this.yaw; this.data.pitch = this.pitch;
    }
    updateCamera(dt, time) {
      const c = G.Config.player, reduced = this.app.settings.reducedMotion;
      const targetHeight = this.hiddenSpot ? (this.hiddenSpot.type === 'table' ? .55 : 1.45) : this.crouching ? c.crouchingHeight : c.standingHeight;
      this.height = dt ? G.Utils.damp(this.height, targetHeight, 10, dt) : targetHeight;
      const speed = this.velocity.length(), bob = reduced || this.hiddenSpot ? 0 : Math.sin(this.bobPhase * 2) * (this.running ? .045 : .02) * Math.min(speed, 1);
      const madness = reduced ? 0 : Math.max(0, 1 - this.data.sanity / 30);
      this.camera.position.set(this.position.x, this.height + bob, this.position.z); this.lookEuler.set(this.pitch, this.yaw, Math.sin(time * .9) * .018 * madness); this.camera.quaternion.setFromEuler(this.lookEuler);
      this.camera.getWorldDirection(this.direction); if (!dt) this.flashDirection.copy(this.direction); else this.flashDirection.lerp(this.direction, 1 - Math.exp(-8 * dt)).normalize();
      const offset = new THREE.Vector3(.18, -.15, -.25).applyQuaternion(this.camera.quaternion); this.flashlight.position.copy(this.camera.position).add(offset); this.flashTarget.position.copy(this.flashlight.position).addScaledVector(this.flashDirection, 12);
      const flicker = this.data.battery < 15 && !this.app.settings.reducedFlashes ? .55 + .45 * Math.abs(Math.sin(time * 27) * Math.sin(time * 13)) : 1;
      this.flashlight.intensity = c.flashlight.intensity * flicker; this.flashlight.visible = this.data.flashlightOn && this.data.battery > 0 && !this.hiddenSpot; this.hand.visible = !this.hiddenSpot;
      this.hand.rotation.z = reduced ? 0 : Math.sin(this.bobPhase) * .018 * Math.min(speed, 1); this.fillLight.position.copy(this.camera.position); this.fillLight.visible = !this.hiddenSpot;
    }
    dispose() { document.removeEventListener('mousemove', this.onMouse); document.removeEventListener('keydown', this.onDown); document.removeEventListener('keyup', this.onUp); this.camera.remove(this.hand, this.burningTalisman, this.burnLight); this.app.scene.remove(this.flashlight, this.flashTarget, this.fillLight); if (this.flashlight.shadow.map) this.flashlight.shadow.map.dispose(); }
  };
}(window.Game = window.Game || {}));
