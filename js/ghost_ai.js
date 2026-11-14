(function (G) {
  'use strict';
  G.GhostAI = class GhostAI {
    constructor(app) {
      this.app = app; this.world = app.world; this.bus = app.bus; this.cfg = G.Config.ghost; this.model = app.models.person('linh', true); this.model.position.fromArray(this.cfg.spawn); app.scene.add(this.model);
      this.position = this.model.position; this.state = app.session.flags.ritualComplete ? 'banished' : 'dormant'; this.model.visible = this.state !== 'banished';
      this.stateTime = 0; this.path = []; this.pathClock = 0; this.patrolIndex = 0; this.lastKnown = this.position.clone(); this.target = this.position.clone(); this.lostSight = 0; this.attackClock = 0; this.inspectClock = 0; this.stunTimer = 0; this.stunImmunity = 0; this.hallucinationClock = 25; this.hallucinationLife = 0;
      this.hallucination = app.models.person('linh', true); this.hallucination.visible = false; app.scene.add(this.hallucination);
      this.offNoise = this.bus.on(G.EventNames.NOISE, event => this.hear(event)); this.random = G.Utils.seededRandom(G.Config.seed + 723);
      this.eventClock = 16; this.eventIndex = 0; this.lastEvent = null; this.inspectionGrace = 0;
    }
    setState(state) { if (this.state === state) return; this.state = state; this.stateTime = 0; this.pathClock = 0; this.bus.emit(G.EventNames.GHOST_STATE, { state: state }); if (state === 'chase') { this.app.sound.cue('stinger'); this.app.session.flags.ghostAwakened = true; } }
    hear(event) {
      if (['dormant', 'banished', 'stunned', 'chase'].includes(this.state) || this.world.isSafe(event.position)) return;
      const range = this.cfg.hearingRadius * event.loudness; if (this.position.distanceTo(event.position) > range) return;
      this.lastKnown.copy(event.position); this.target.copy(event.position); this.setState('investigate');
    }
    canSee(player) {
      if (this.world.isSafe(player.position) || player.hiddenSpot) return false;
      const delta = player.position.clone().sub(this.position), distance = delta.length();
      const lit = player.data.flashlightOn && player.data.battery > 0;
      const range = (lit ? this.cfg.flashlightDetectionRadius : this.cfg.sightDistance) * (player.crouching ? .65 : 1);
      if (distance > range) return false;
      const forward = new THREE.Vector3(Math.sin(this.model.rotation.y), 0, Math.cos(this.model.rotation.y));
      if (distance > 3 && forward.dot(delta.normalize()) < Math.cos(this.cfg.sightHalfAngle)) return false;
      return this.world.lineOfSight(this.position.clone().add(new THREE.Vector3(0, 1.6, 0)), player.camera.position);
    }
    repel(position) {
      if (this.state === 'banished' || this.stunImmunity > 0 || this.position.distanceTo(position) > G.Config.player.talisman.repelRadius) return false;
      this.stunTimer = G.Config.player.talisman.stunSeconds; this.setState('stunned'); this.app.sound.cry(this.position);
      const away = this.position.clone().sub(position).setY(0).normalize(); this.world.move(this.position, away.x * 1.5, away.z * 1.5, .32, 1.7); return true;
    }
    banish() { this.setState('banished'); this.model.visible = false; this.hallucination.visible = false; }
    moveTo(target, speed, dt) {
      if (this.world.isSafe(target)) return 0;
      this.pathClock -= dt;
      if (this.pathClock <= 0) { this.path = this.world.findPath(this.position, target); this.pathClock = this.cfg.repathSeconds; }
      this.world.openNearbyDoors(this.position);
      if (!this.path.length) return 0;
      let next = this.path[0]; if (this.position.distanceTo(next) < .22) { this.path.shift(); if (!this.path.length) return 0; next = this.path[0]; }
      const delta = next.clone().sub(this.position).setY(0), distance = delta.length(); if (!distance) return 0; delta.normalize();
      const travel = Math.min(speed * dt, distance), candidate = this.position.clone().addScaledVector(delta, travel); if (this.world.isSafe(candidate)) return 0;
      const before = this.position.clone(); this.world.move(this.position, delta.x * travel, delta.z * travel, .31, 1.7);
      const angle = Math.atan2(delta.x, delta.z), difference = Math.atan2(Math.sin(angle - this.model.rotation.y), Math.cos(angle - this.model.rotation.y)); this.model.rotation.y += difference * Math.min(1, dt * 6);
      return before.distanceTo(this.position) / Math.max(.001, dt);
    }
    update(dt, time) {
      const player = this.app.player; this.stateTime += dt; this.attackClock = Math.max(0, this.attackClock - dt); this.stunImmunity = Math.max(0, this.stunImmunity - dt);
      this.updateHallucinations(dt, time); this.updateParanormal(dt);
      if (this.state === 'banished') return;
      if (this.state === 'dormant') { if (this.app.session.elapsed >= this.cfg.activationDelay || this.app.session.flags.ghostAwakened) this.setState('patrol'); this.app.models.animatePerson(this.model, time, 0, 'idle'); return; }
      if (this.state === 'stunned') { this.stunTimer -= dt; this.model.rotation.z = Math.sin(time * 14) * .08; if (this.stunTimer <= 0) { this.model.rotation.z = 0; this.stunImmunity = 2; this.setState('search'); this.target.copy(this.position); } return; }
      const sees = this.canSee(player), distance = this.position.distanceTo(player.position);
      if (sees) { this.lastKnown.copy(player.position); this.lostSight = 0; this.setState('chase'); } else this.lostSight += dt;
      let speed = 0;
      this.inspectionGrace = Math.max(0, this.inspectionGrace - dt);
      if (player.hiddenSpot && distance < 3.5 && this.inspectionGrace <= 0 && (this.state === 'chase' || this.state === 'investigate' || this.state === 'search')) { this.inspectClock = 0; this.setState('inspect_hiding'); }
      if (this.state === 'inspect_hiding') {
        this.model.rotation.y = Math.atan2(player.position.x - this.position.x, player.position.z - this.position.z);
        if (!player.hiddenSpot) { this.inspectClock = 0; this.setState('chase'); }
        else if (!player.holdingBreath) { this.inspectClock += dt; if (this.inspectClock > G.Config.player.hiding.breathDetectionSeconds) { player.exitHide(true); player.damage(34); this.setState('chase'); this.inspectClock = 0; } }
        else { this.inspectClock = Math.max(0, this.inspectClock - dt); if (this.stateTime > 3.3) { this.patrolIndex = (this.patrolIndex + 2) % this.cfg.patrolPoints.length; this.inspectionGrace = 7; this.setState('patrol'); } }
      } else if (this.state === 'chase') {
        const target = sees ? player.position : this.lastKnown;
        speed = this.moveTo(target, this.app.session.curseRemaining < 300 ? this.cfg.enragedSpeed : this.cfg.chaseSpeed, dt);
        if (distance < this.cfg.attackRange && !player.hiddenSpot && this.attackClock <= 0 && this.world.lineOfSight(this.position.clone().setY(1.6), player.camera.position)) { this.attackClock = this.cfg.attackCooldown; player.damage(this.cfg.attackDamage); }
        if (this.lostSight > this.cfg.loseSightSeconds || this.world.isSafe(player.position)) { this.target.copy(this.lastKnown); this.setState('search'); }
      } else if (this.state === 'investigate' || this.state === 'search') {
        speed = this.moveTo(this.target, this.cfg.investigateSpeed, dt);
        if (this.position.distanceTo(this.target) < 1.2) this.model.rotation.y += dt * .6;
        if (this.stateTime > (this.state === 'search' ? this.cfg.searchDuration : this.cfg.investigateDuration)) this.setState('patrol');
      } else if (this.state === 'patrol') {
        this.target.fromArray(this.cfg.patrolPoints[this.patrolIndex]); speed = this.moveTo(this.target, this.cfg.patrolSpeed, dt);
        if (this.position.distanceTo(this.target) < .6 || this.stateTime > 28) { this.patrolIndex = (this.patrolIndex + 1) % this.cfg.patrolPoints.length; this.stateTime = 0; this.pathClock = 0; }
      }
      this.app.models.animatePerson(this.model, time, speed, this.state);
    }
    updateHallucinations(dt, time) {
      if (this.state === 'banished') return;
      this.hallucinationClock -= dt;
      if (this.hallucinationLife > 0) { this.hallucinationLife -= dt; if (this.crossing) this.hallucination.position.addScaledVector(this.crossing, dt * 5); this.app.models.animatePerson(this.hallucination, time, 0, 'idle'); if (this.hallucinationLife <= 0) { this.hallucination.visible = false; this.crossing = null; } }
      if (this.app.player.data.sanity < 50 && this.hallucinationClock <= 0) {
        this.hallucinationClock = 22 + this.random() * 23;
        const direction = this.app.player.direction.clone().setY(0).normalize(), position = this.app.player.position.clone().addScaledVector(direction, 6 + this.random() * 3);
        if (!this.world.blocked(position.x, position.z, .4, 1.7)) { this.hallucination.position.copy(position); this.hallucination.rotation.y = Math.atan2(this.app.player.position.x - position.x, this.app.player.position.z - position.z); this.hallucination.visible = true; this.hallucinationLife = this.app.settings.reducedFlashes ? 1.8 : .65; this.app.sound.whisper(position); }
      }
    }
    updateParanormal(dt) {
      if (this.state === 'banished' || this.app.session.flags.ritualComplete || this.app.player.data.sanity >= 50) return;
      this.eventClock -= dt; if (this.eventClock > 0 || this.state === 'chase' || this.state === 'inspect_hiding') return;
      this.eventClock = 18 + this.random() * 19;
      const choices = ['blackout', 'slam', 'crossing'].filter(type => type !== this.lastEvent);
      this.triggerEvent(choices[Math.floor(this.random() * choices.length)]);
    }
    triggerEvent(type) {
      const p = this.app.player; if (this.app.session.flags.ritualComplete) return false;
      if (type === 'blackout') { this.world.triggerBlackout(4.5); this.app.sound.whisper(p.position.clone().add(new THREE.Vector3(-2, 1, 0))); }
      else if (type === 'slam') { if (!this.world.slamNearbyDoor(p.position)) return this.triggerEvent('blackout'); }
      else if (type === 'crossing') {
        const forward = p.direction.clone().setY(0).normalize(), side = new THREE.Vector3(-forward.z, 0, forward.x);
        const start = p.position.clone().addScaledVector(forward, 7).addScaledVector(side, -3);
        const end = start.clone().addScaledVector(side, 6);
        if (!this.world.walkableLine(start, end, .3)) return this.triggerEvent('blackout');
        this.hallucination.position.copy(start); this.crossing = side; this.hallucination.rotation.y = Math.atan2(side.x, side.z); this.hallucination.visible = true; this.hallucinationLife = 1.2; this.app.sound.whisper(start);
      } else return false;
      this.lastEvent = type; this.eventIndex++; return true;
    }
    dispose() { this.offNoise(); this.app.scene.remove(this.model, this.hallucination); }
  };
}(window.Game = window.Game || {}));
