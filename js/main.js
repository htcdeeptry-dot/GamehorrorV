(function (G) {
  'use strict';
  const el = id => document.getElementById(id);
  G.App = class App {
    constructor(options) {
      this.canvas = options.canvas; this.state = 'boot'; this.settings = G.Storage.loadSettings(); this.bus = new G.EventBus(); this.session = null;
      this.renderer = null; this.scene = null; this.camera = null; this.player = null; this.ghost = null; this.quest = null; this.world = null; this.textures = null; this.models = null;
      this.sound = new G.SoundSystem(this.settings); this.post = null; this.time = 0; this.lastFrame = 0; this.frame = 0; this.autosave = 0; this.hudClock = 0;
      this.screenHistory = []; this.cutscene = null; this.skipDown = false; this.skipTime = 0; this.dialogueQueue = []; this.subtitle = null; this.toasts = []; this.listeners = []; this.running = false; this.saveNoticeTime = 0;
    }
    async init() {
      this.setState('loading'); el('loading-status').textContent = 'Đang dựng vật liệu và dấu tích Lệ Thôn…'; el('loading-progress').value = 10;
      await Promise.all([document.fonts.load('400 18px "LeThon Noto"'),document.fonts.load('600 18px "LeThon Noto"'),document.fonts.load('700 18px "LeThon Noto"')]);await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await G.ModelsFactory.prepareCharacters();
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
      this.renderer.outputEncoding = THREE.sRGBEncoding; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.08 * this.settings.brightness; this.renderer.shadowMap.enabled = this.settings.shadowQuality !== 'off'; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.post = new G.PostProcessor(this.renderer); this.bindUI(); this.bindEvents(); this.createWorld(G.createNewSession()); this.resize(); this.applySettings();
      el('loading-progress').value = 100; el('version-label').textContent = 'BẢN ' + G.Config.version; el('btn-continue').disabled = !G.Storage.load().ok;
      this.setState('menu'); this.camera.position.set(8, 3.3, 54); this.camera.lookAt(0, 2, 35); this.running = true; this.lastFrame = performance.now(); this.tick = now => this.loop(now); this.frame = requestAnimationFrame(this.tick);
    }
    listen(node, type, fn) { node.addEventListener(type, fn); this.listeners.push(() => node.removeEventListener(type, fn)); }
    bindEvents() {
      this.bus.on('sound:cue', e => this.sound.cue(e.name, e.position)); this.bus.on('weather:thunder', e => this.sound.thunder(e.delay));
      this.bus.on(G.EventNames.PLAYER_DIED, () => this.die());
      this.bus.on(G.EventNames.GHOST_STATE, e => { if (e.state === 'chase') this.say('firstGhost', true); });
      this.listen(window, 'resize', () => this.resize());
      this.listen(window, 'blur', () => { if (this.state === 'playing') this.pause(); if (this.player) this.player.clearInput(); this.skipDown = false; });
      this.listen(document, 'visibilitychange', () => { if (document.hidden && this.state === 'playing') this.pause(); });
      this.listen(document, 'pointerlockchange', () => { if (document.pointerLockElement !== this.canvas && this.state === 'playing') this.pause(); });
      this.listen(this.canvas, 'click', () => { if (this.state === 'playing') { this.sound.unlock(); this.player.requestPointerLock(); } });
      this.listen(this.canvas, 'webglcontextlost', e => { e.preventDefault(); this.pause(); el('error-title').textContent = 'WebGL bị gián đoạn'; el('error-message').textContent = 'Trình duyệt đã mất kết nối đồ họa. Tải lại trang để tiếp tục từ điểm lưu gần nhất.'; this.setState('error'); });
      this.listen(document, 'keydown', e => {
        if (this.state === 'cutscene' && e.code === 'Enter') { this.skipDown = true; e.preventDefault(); return; }
        if (e.repeat) return;
        if (e.code === 'Escape') {
          if (this.state === 'playing') this.pause(); else if (this.state === 'paused') this.resume(); else if (['settings', 'help', 'credits', 'inventory', 'journal', 'puzzle'].includes(this.state)) this.closeScreen(); return;
        }
        if (this.state !== 'playing') return;
        if (e.code === 'Tab') { e.preventDefault(); this.openScreen('inventory'); this.quest.renderInventory(); }
        if (e.code === 'KeyJ') { this.openScreen('journal'); this.quest.renderJournal(); }
        if (e.code === 'KeyE') this.quest.interact();
      });
      this.listen(document, 'keyup', e => { if (e.code === 'Enter') { this.skipDown = false; this.skipTime = 0; } });
      this.listen(window, 'pagehide', () => { if (this.session && this.session.flags.introSeen && !['dead', 'ending', 'cutscene'].includes(this.state)) this.save(false); });
    }
    bindUI() {
      const bind = (id, fn) => this.listen(el(id), 'click', fn);
      bind('btn-new-game', () => this.startNew()); bind('btn-restart', () => this.startNew()); bind('btn-continue', () => this.continueGame()); bind('btn-retry', () => this.continueGame());
      bind('btn-resume', () => this.resume()); bind('btn-save', () => this.save(true));
      ['btn-main-menu', 'btn-ending-menu', 'btn-death-menu'].forEach(id => bind(id, () => this.returnToMenu()));
      ['btn-settings', 'btn-pause-settings'].forEach(id => bind(id, () => { this.openScreen('settings'); this.populateSettings(); }));
      bind('btn-help', () => this.openScreen('help')); bind('btn-credits', () => this.openScreen('credits'));
      ['inventory', 'journal', 'puzzle', 'settings', 'help', 'credits'].forEach(name => bind('btn-close-' + name, () => this.closeScreen()));
      this.listen(el('settings-form'), 'submit', e => { e.preventDefault(); const source = {}; const form = el('settings-form'); Object.keys(G.Config.settingsDefaults).forEach(key => { const input = form.elements.namedItem(key); if (!input) return; source[key] = input.type === 'checkbox' ? input.checked : input.tagName === 'SELECT' ? input.value : Number(input.value); }); this.settings = G.normalizeSettings(source); G.Storage.saveSettings(this.settings); this.applySettings(); this.closeScreen(); this.toast('Đã lưu thiết lập. Độ nét texture áp dụng khi bắt đầu hoặc tải lại lượt chơi.'); });
      this.listen(el('setting-quality'), 'change', e => {
        const q = G.Config.quality[e.target.value]; const form = el('settings-form'); if (!q || !form) return;
        form.elements.namedItem('renderScale').value = q.renderScale;
        form.elements.namedItem('shadowQuality').value = q.shadowQuality;
        form.elements.namedItem('particleDensity').value = q.particleDensity;
        form.elements.namedItem('postFX').checked = q.postProcessing;
        form.elements.namedItem('volumetricFog').checked = q.volumetricFog;
        form.elements.namedItem('volumetricBeams').checked = q.volumetricBeams;
        this.syncSettingBadges();
      });
      ['setting-render-scale', 'setting-particles'].forEach(id => this.listen(el(id), 'input', () => this.syncSettingBadges()));
      this.listen(el('btn-skip-cutscene'), 'pointerdown', e => { e.preventDefault(); this.skipDown = true; el('btn-skip-cutscene').setPointerCapture(e.pointerId); });
      ['pointerup', 'pointercancel'].forEach(type => this.listen(el('btn-skip-cutscene'), type, () => { this.skipDown = false; this.skipTime = 0; }));
    }
    syncSettingBadges() {
      const form = el('settings-form'); if (!form) return;
      const rs = el('render-scale-val'), pd = el('particles-val');
      if (rs) rs.textContent = Math.round(Number(form.elements.namedItem('renderScale').value) * 100) + '%';
      if (pd) pd.textContent = Math.round(Number(form.elements.namedItem('particleDensity').value) * 100) + '%';
    }
    populateSettings() { Object.keys(this.settings).forEach(key => { const input = el('settings-form').elements.namedItem(key); if (!input) return; if (input.type === 'checkbox') input.checked = this.settings[key]; else input.value = this.settings[key]; }); this.syncSettingBadges(); }
    applySettings() {
      const s = this.settings, q = G.Config.quality[s.quality] || G.Config.quality.high;
      document.body.classList.toggle('reduced-motion', s.reducedMotion); document.body.classList.toggle('reduced-flashes', s.reducedFlashes); document.body.dataset.quality = s.quality;
      this.sound.applySettings(s); if (!this.renderer) return;
      const shadowsOn = s.shadowQuality !== 'off';
      const shadowSizes = { off: 512, low: 512, medium: 1024, high: 2048 };
      const smSize = shadowSizes[s.shadowQuality] || 1024;
      this.renderer.shadowMap.enabled = shadowsOn;
      this.renderer.toneMappingExposure = 1.08 * s.brightness;
      if (this.camera && this.state !== 'cutscene') { this.camera.fov = s.fov; this.camera.updateProjectionMatrix(); }
      if (this.models && this.scene) this.models.attachLightPool(this.scene, s.quality);
      if (this.world) {
        this.world.settings = s;
        this.world.moonLight.castShadow = shadowsOn;
        if (this.world.moonLight.shadow.mapSize.x !== smSize) {
          this.world.moonLight.shadow.mapSize.set(smSize, smSize);
          if (this.world.moonLight.shadow.map) { this.world.moonLight.shadow.map.dispose(); this.world.moonLight.shadow.map = null; }
        }
        const rainTarget = Math.min(this.world.rainCount, Math.round(q.rainCount * s.particleDensity));
        const ashTarget = Math.min(this.world.ashCount, Math.round(q.ashCount * s.particleDensity));
        this.world.rainGeo.setDrawRange(0, rainTarget * 2);
        this.world.ashGeo.setDrawRange(0, ashTarget);
        if (this.world.setBeamsVisible) this.world.setBeamsVisible(s.volumetricBeams);
        if (this.world.applyQuality) this.world.applyQuality(s, q);
      }
      if (this.player) {
        this.player.flashlight.castShadow = shadowsOn && q.spotShadows !== false;
        const flSize = q.flShadowSize || (s.shadowQuality === 'high' ? 1024 : 512);
        if (this.player.flashlight.shadow.mapSize.x !== flSize) {
          this.player.flashlight.shadow.mapSize.set(flSize, flSize);
          if (this.player.flashlight.shadow.map) { this.player.flashlight.shadow.map.dispose(); this.player.flashlight.shadow.map = null; }
        }
      }
      this.resize();
      this.prewarmShaders();
      this.bus.emit(G.EventNames.SETTINGS_CHANGED, s);
    }
    prewarmShaders() {
      if (!this.renderer || !this.scene || !this.camera) return;
      const restored = [];
      const reveal = obj => { if (obj && !obj.visible) { obj.visible = true; restored.push(obj); } };
      if (this.ghost) reveal(this.ghost.hallucination);
      if (this.player) reveal(this.player.burningTalisman);
      if (this.world && this.world.ritualRelics) this.world.ritualRelics.forEach(reveal);
      this.renderer.compile(this.scene, this.camera);
      for (let i = 0; i < restored.length; i++) restored[i].visible = false;
      if (this.post && this.settings.postFX) this.renderer.compile(this.post.scene, this.post.camera);
    }
    createWorld(session) {
      this.destroyWorld(); this.session = session; this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(this.settings.fov, 1, G.Config.camera.near, G.Config.camera.far);
      this.textures = new G.TextureFactory(this.settings.quality); this.models = new G.ModelsFactory(this.textures); this.world = new G.WorldBuilder(this.scene, this.textures, this.models, this.bus, this.settings).build(); this.world.sync(session);
      this.player = new G.PlayerController(this, session);this.world.player=this.player; this.ghost = new G.GhostAI(this); this.quest = new G.QuestSystem(this); this.autosave = 0; this.dialogueQueue = []; this.subtitle = null; this.cutscene = null; this.skipDown = false; this.skipTime = 0; this._hudPrev = {};
      this.resize(); this.applySettings(); this.updateHUD();
    }
    destroyWorld() { if(this.sound)this.sound.stopSpeech(); if (this.quest) this.quest.dispose(); if (this.player) this.player.dispose(); if (this.ghost) this.ghost.dispose(); if (this.world) this.world.dispose(); if (this.models) this.models.dispose(); if (this.textures) this.textures.dispose(); this.quest = this.player = this.ghost = this.world = this.models = this.textures = null; }
    async startNew() {
      this.setState('loading'); el('loading-status').textContent = 'Màn sương đang mở lối…';
      await this.sound.unlock(); await new Promise(resolve => requestAnimationFrame(resolve));
      this.createWorld(G.createNewSession()); this.screenHistory = []; this.playCutscene('intro', () => { this.session.flags.introSeen = true; this.say('awakening'); this.save(false); });
    }
    async continueGame() {
      const loaded = G.Storage.load(); if (!loaded.ok) { this.toast(loaded.reason === 'empty' ? 'Chưa có điểm lưu. Hãy bắt đầu lượt chơi mới.' : G.UIText.messages.corruptSave, 'warning'); return; }
      this.setState('loading'); await this.sound.unlock(); await new Promise(resolve => requestAnimationFrame(resolve)); this.createWorld(loaded.data); this.screenHistory = []; this.setState('playing'); this.player.requestPointerLock();
    }
    setState(state) {
      const old = this.state; this.state = state; document.body.dataset.state = state;
      document.querySelectorAll('.screen').forEach(screen => { screen.hidden = screen.id !== (state === 'boot' ? 'loading' : state === 'paused' ? 'pause' : state === 'dead' ? 'death' : state) + '-screen'; });
      el('hud').hidden = state !== 'playing'; el('cinematic-bars').hidden = state !== 'cutscene'; el('btn-skip-cutscene').hidden = state !== 'cutscene' || !this.cutscene || !this.cutscene.config.skippable;
      if (state !== 'playing') { if (this.player) this.player.clearInput(); if (document.pointerLockElement === this.canvas) document.exitPointerLock(); }
      if (!['playing', 'cutscene'].includes(state)) { el('subtitle-container').hidden = true; this.sound.pause(true); } else this.sound.pause(false);
      this.bus.emit(G.EventNames.STATE_CHANGED, { previous: old, state: state });
      const panel = document.querySelector('.screen:not([hidden])'); if (panel && state !== 'loading') { const focusable = panel.querySelector('button:not(:disabled), input'); if (focusable) focusable.focus({ preventScroll: true }); }
    }
    openScreen(state) { this.screenHistory.push(this.state); this.setState(state); if (this.quest) { this.quest.hold = null; el('interaction-progress').hidden = true; } }
    closeScreen(lock) { const previous = this.screenHistory.pop() || (this.session && this.session.flags.introSeen ? 'paused' : 'menu'); this.setState(previous); if (previous === 'playing' && lock !== false) { this.sound.unlock(); this.player.requestPointerLock(); } }
    pause() { if (this.state !== 'playing') return; this.setState('paused'); }
    resume() { this.setState('playing'); this.sound.unlock(); this.player.requestPointerLock(); }
    returnToMenu() { this.sound.stopSpeech();if(this.cutscene)this.world.endCinematic(this.cutscene.config.id); if (this.session && this.session.flags.introSeen && !['dead', 'ending'].includes(this.state)) this.save(false); this.screenHistory = []; this.cutscene = null; this.dialogueQueue = []; this.subtitle = null; this.setState('menu'); el('btn-continue').disabled = !G.Storage.load().ok; this.camera.position.set(8, 3.3, 54); this.camera.lookAt(0, 2, 35); }
    save(notify) {
      if (!this.session || !this.session.flags.introSeen || ['dead', 'ending'].includes(this.state)) return false;
      this.session.player.position = this.player.position.toArray(); this.session.player.yaw = this.player.yaw; this.session.player.pitch = this.player.pitch;
      const snapshot = G.Utils.clone(this.session); if (this.player.hiddenSpot) snapshot.player.position = this.player.hiddenSpot.exit.toArray();
      const result = G.Storage.save(snapshot); if (result.ok) { this.saveNoticeTime = 2; el('save-indicator').hidden = false; if (notify) this.toast(G.UIText.messages.saved); } else if (notify) this.toast(G.UIText.messages.saveUnavailable, 'warning'); return result.ok;
    }
    playCutscene(id, onComplete) {
      this.sound.stopSpeech();
      const config = G.Cutscenes[id]; this.cutscene = { config: config, elapsed: 0, fired: new Set(), onComplete: onComplete }; this.skipTime = 0; this.skipDown = false; this.dialogueQueue = []; this.subtitle = null;
      this.world.beginCinematic(id);
      this.player.flashlight.visible = false; this.player.hand.visible = false; this.setState('cutscene'); if (config.dialogue && !config.cues) this.say(config.dialogue); if (id === 'jumpscare') this.sound.jumpscare(); this.updateCutscene(0);
    }
    updateCutscene(dt) {
      const cut = this.cutscene; if (!cut) return; cut.elapsed += dt;
      if (this.skipDown && cut.config.skippable) this.skipTime += dt; else this.skipTime = 0; el('skip-progress').value = this.skipTime / G.Config.runtime.skipHoldSeconds;
      const t = Math.min(cut.elapsed, cut.config.duration), frames = cut.config.frames; let a = frames[0], b = frames[frames.length - 1];
      const storyTime = t * (cut.config.id === 'intro' || cut.config.id === 'ritual' ? 18 / cut.config.duration : 1);
      this.world.companions.forEach((c,id)=>c.model.userData.speechLevel=this.sound.speechLevel({lan:'lan',tuan:'tuấn',hung:'hùng'}[id]));this.world.updateCinematic(cut.config.id, storyTime);
      (cut.config.cues || []).forEach((cue,i)=>{if(t>=cue.time&&!cut.fired.has(i)){cut.fired.add(i);if(cue.text&&t<cue.time+(cue.duration||4)){this.showSubtitle(cue.speaker||'',cue.text,(cue.duration||4)-(t-cue.time));this.sound.speak(cue.speaker||'',cue.text,t-cue.time);}if(cue.sound)this.sound.cue(cue.sound);}});
      for (let i = 1; i < frames.length; i++) if (t <= frames[i].time) { a = frames[i - 1]; b = frames[i]; break; }
      if (cut.config.shots) { const shot = cut.config.shots.find(s => t >= s.start && t < s.end) || cut.config.shots[cut.config.shots.length - 1]; a = Object.assign({time:shot.start},shot.from); b = Object.assign({time:shot.end},shot.to); }
      let u = b.time === a.time ? 0 : G.Utils.clamp((t - a.time) / (b.time - a.time), 0, 1); u = u * u * (3 - 2 * u);
      const toWorld = (frame, key) => { const v = new THREE.Vector3().fromArray(frame[key]); if (cut.config.relativeToGhost) v.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.ghost.model.rotation.y).add(this.ghost.position); return v; };
      const positionKey = cut.config.relativeToGhost ? 'offset' : 'position', targetKey = cut.config.relativeToGhost ? 'targetOffset' : 'target';
      const camTarget = toWorld(a, targetKey).lerp(toWorld(b, targetKey), u);
      this.camera.position.copy(toWorld(a, positionKey).lerp(toWorld(b, positionKey), u));
      this.world.resolveCamera(this.camera.position, .22, camTarget);
      this.camera.lookAt(camTarget);
      this.camera.fov = G.Utils.lerp(a.fov, b.fov, u); this.camera.updateProjectionMatrix();
      if (cut.config.id === 'jumpscare' && !this.settings.reducedMotion) this.camera.rotateZ(Math.sin(t * 37) * .035 * (1 - t / cut.config.duration));
      if (cut.config.id === 'ritual') {
        const t = storyTime;
        this.world.ritualRelics.forEach((m, i) => { m.visible = t >= 2 + i * 5; m.position.y = .97 + (t > 12 ? Math.sin((t - 12) / 6 * Math.PI) * .3 : 0); });
        this.ghost.model.visible = t > 5 && t < 17; this.ghost.position.set(0, Math.min(.55, Math.max(0, t - 5) * .07), 0); this.ghost.model.rotation.y = 0; this.models.animatePerson(this.ghost.model, t, 0, 'idle');
      }
      if (t >= cut.config.duration || this.skipTime >= G.Config.runtime.skipHoldSeconds) {
        this.sound.stopSpeech();this.world.endCinematic(cut.config.id); if (cut.config.id === 'ritual') this.ghost.model.visible = false;
        this.cutscene = null; this.skipDown = false; this.skipTime = 0; this.dialogueQueue = []; this.subtitle = null; el('subtitle-container').hidden = true;
        this.camera.fov = this.settings.fov; this.camera.updateProjectionMatrix(); this.player.updateCamera(0, this.time); this.setState('playing');
        if (cut.onComplete) cut.onComplete();
        if (this.state === 'playing') { this.setState('paused'); this.toast('Nhấn Trở lại để tiếp tục khám phá.'); }
      }
    }
    say(key, once) {
      if (!G.Dialogue[key]) return; if (once && this.session.triggeredDialogue.includes(key)) return;
      if (once) this.session.triggeredDialogue.push(key); G.Dialogue[key].forEach(line => this.dialogueQueue.push(Object.assign({}, line)));
    }
    showSubtitle(speaker, text, duration) { this.subtitle = { speaker: speaker, text: text, remaining: duration }; }
    updateDialogue(dt) {
      if (this.subtitle) this.subtitle.remaining -= dt;
      if ((!this.subtitle || this.subtitle.remaining <= 0) && this.dialogueQueue.length) { const line = this.dialogueQueue.shift(); const spoken=this.sound.speak(line.speaker,line.text);this.subtitle = { speaker: line.speaker, text: line.text, remaining: Math.max(line.duration,spoken+.15) }; if (line.cue) this.sound.cue(line.cue); }
      const visible = this.settings.subtitles && this.subtitle && this.subtitle.remaining > 0; el('subtitle-container').hidden = !visible;
      if (visible) { el('subtitle-speaker').textContent = this.subtitle.speaker; el('subtitle-text').textContent = this.subtitle.text; }
    }
    toast(text, kind, duration) { const node = document.createElement('div'); node.className = 'toast' + (kind ? ' ' + kind : ''); node.textContent = text; el('toast-container').appendChild(node); this.toasts.push({ node: node, remaining: duration || 4 }); while (this.toasts.length > 4) this.toasts.shift().node.remove(); }
    updateToasts(dt) { this.toasts.forEach(t => { t.remaining -= dt; if (t.remaining < .35) t.node.classList.add('leaving'); if (t.remaining <= 0) t.node.remove(); }); this.toasts = this.toasts.filter(t => t.remaining > 0); this.saveNoticeTime -= dt; el('save-indicator').hidden = this.saveNoticeTime <= 0; }
    updateTimers(dt) {
      this.session.elapsed += dt;
      if (this.session.flags.ritualComplete) {
        this.session.escapeRemaining = Math.max(0, this.session.escapeRemaining - dt);
        if (this.player.position.z >= G.Config.world.gate.escapeZ) { this.session.flags.escaped = true; this.bus.emit(G.EventNames.ESCAPED, {}); this.playCutscene('escape', () => this.showEnding()); return; }
        if (this.session.escapeRemaining <= 0) this.curseEnds();
      } else {
        this.session.curseRemaining = Math.max(0, this.session.curseRemaining - dt);
        G.Config.quest.warningThresholds.forEach(threshold => { if (this.session.curseRemaining <= threshold && !this.session.warningsIssued.includes(threshold)) { this.session.warningsIssued.push(threshold); this.toast('Lời nguyền còn ' + G.Utils.formatTime(threshold) + '.', 'warning'); this.say('curseWarning'); this.bus.emit(G.EventNames.CURSE_WARNING, { remaining: threshold }); } });
        if (this.session.curseRemaining <= 0) this.curseEnds();
      }
    }
    curseEnds() { this.session.flags.curseExpired = true; this.sound.cue('stinger'); this.showEnding(); }
    die() { if (this.state !== 'playing') return; this.playCutscene('jumpscare', () => { this.setState('dead'); el('death-reason').textContent = 'Linh đã tìm thấy bạn trong màn sương.'; el('btn-retry').disabled = !G.Storage.load().ok; }); }
    showEnding() {
      const ending = G.selectEnding(this.session); if (!ending) return; this.setState('ending'); el('ending-screen').dataset.ending = ending.id; el('ending-label').textContent = ending.label; el('ending-title').textContent = ending.title;
      const story = el('ending-story'); story.textContent = ''; ending.paragraphs.forEach(text => { const p = document.createElement('p'); p.textContent = text; story.appendChild(p); });
      const stats = el('ending-stats'); stats.textContent = ''; const rows = [['Bạn bè đã cứu', Object.values(this.session.companions).filter(s => s === 'rescued').length + ' / 3'], ['Trang nhật ký', this.session.journals.length + ' / 8'], ['Thời gian khám phá', G.Utils.formatTime(this.session.elapsed)], ['Quãng đường', Math.round(this.session.stats.distanceWalked) + ' m'], ['Bùa đã dùng', this.session.stats.talismansUsed]];
      rows.forEach(row => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = row[0]; dd.textContent = row[1]; stats.append(dt, dd); });
    }
    updateHUD() {
      if (!this.player) return;
      const p = this.player.data;
      if (!this._hud) {
        const curseClock = el('curse-clock');
        this._hud = {
          bars: ['health', 'stamina', 'sanity', 'battery'].map(name => ({
            name, bar: el(name + '-bar'), val: el(name + '-value'), wrap: el(name + '-bar').parentElement
          })),
          location: el('location-name'),
          curseTime: el('curse-time'),
          curseClock,
          curseLabel: curseClock.querySelector('span'),
          items: ['talisman', 'battery', 'medicine'].map(id => ({ id, node: el(id + '-count') })),
          journal: el('journal-count'),
          companions: Array.from(document.querySelectorAll('[data-companion]')).map(node => ({
            id: node.dataset.companion, node
          })),
          stealth: el('stealth-indicator'),
          stealthLabel: el('stealth-label'),
          breath: el('breath-meter'),
          bloodFilter: el('blood-filter'),
          sanityFilter: el('sanity-filter')
        };
      }
      const h = this._hud, prev = this._hudPrev || (this._hudPrev = {});
      for (let i = 0; i < h.bars.length; i++) {
        const b = h.bars[i], raw = p[b.name], barV = Math.round(raw * 4) * .25, textV = String(Math.ceil(raw)), crit = raw < 20;
        if (prev['bv_' + b.name] !== barV) { prev['bv_' + b.name] = barV; b.bar.value = raw; }
        if (prev['tv_' + b.name] !== textV) { prev['tv_' + b.name] = textV; b.val.textContent = textV; }
        if (prev['cr_' + b.name] !== crit) { prev['cr_' + b.name] = crit; b.wrap.classList.toggle('critical', crit); }
      }
      const loc = this.world.location(this.player.position);
      if (prev.loc !== loc) { prev.loc = loc; h.location.textContent = loc; }
      const seconds = this.session.flags.ritualComplete ? this.session.escapeRemaining : this.session.curseRemaining;
      const timeStr = G.Utils.formatTime(seconds), cCrit = seconds < 120, cLab = this.session.flags.ritualComplete ? 'THOÁT KHỎI LÀNG' : 'NGUYỀN RỦA';
      if (prev.timeStr !== timeStr) { prev.timeStr = timeStr; h.curseTime.textContent = timeStr; }
      if (prev.cCrit !== cCrit) { prev.cCrit = cCrit; h.curseClock.classList.toggle('critical', cCrit); }
      if (prev.cLab !== cLab) { prev.cLab = cLab; h.curseLabel.textContent = cLab; }
      for (let i = 0; i < h.items.length; i++) {
        const it = h.items[i], cnt = String(this.session.inventory[it.id] || 0);
        if (prev['it_' + it.id] !== cnt) { prev['it_' + it.id] = cnt; it.node.textContent = cnt; }
      }
      const jStr = this.session.journals.length + '/8';
      if (prev.jStr !== jStr) { prev.jStr = jStr; h.journal.textContent = jStr; }
      for (let i = 0; i < h.companions.length; i++) {
        const c = h.companions[i], status = this.session.companions[c.id];
        if (prev['co_' + c.id] !== status) {
          prev['co_' + c.id] = status;
          c.node.dataset.status = status;
          c.node.textContent = G.Lore.characters[c.id].name + ' · ' + (status === 'rescued' ? 'Đã cứu' : status === 'lost' ? 'Mất tích' : 'Bị giam');
        }
      }
      const hid = !this.player.hiddenSpot, hold = this.player.holdingBreath, sLab = hold ? 'ĐANG NÍN THỞ' : 'ĐANG ẨN NẤP';
      if (prev.hid !== hid) { prev.hid = hid; h.stealth.hidden = hid; }
      if (!hid) {
        if (prev.hold !== hold) { prev.hold = hold; h.stealth.classList.toggle('holding', hold); }
        if (prev.sLab !== sLab) { prev.sLab = sLab; h.stealthLabel.textContent = sLab; }
        const stamV = Math.round(p.stamina);
        if (prev.stamV !== stamV) { prev.stamV = stamV; h.breath.value = p.stamina; }
      }
      const dmg = +this.player.damageFlash.toFixed(2);
      const san = +((Math.max(Math.max(0, 1 - p.sanity / 30), this.ghostThreat()) * .45).toFixed(2));
      if (prev.dmg !== dmg) {
        prev.dmg = dmg;
        h.bloodFilter.hidden = dmg <= .01;
        h.bloodFilter.style.setProperty('--damage', String(dmg));
      }
      if (prev.san !== san) {
        prev.san = san;
        h.sanityFilter.hidden = san <= .01;
        h.sanityFilter.style.setProperty('--sanity', String(san));
      }
    }
    ghostThreat() { if (!this.ghost || !this.player || !['playing', 'cutscene'].includes(this.state) || ['dormant', 'banished'].includes(this.ghost.state)) return 0; return G.Utils.clamp(1 - this.ghost.position.distanceTo(this.player.position) / 15, 0, 1); }
    resize() {
      if (!this.renderer || !this.camera) return;
      const width = Math.max(1, window.innerWidth), height = Math.max(1, window.innerHeight);
      const s = this.settings || G.Config.settingsDefaults;
      const q = G.Config.quality[s.quality] || G.Config.quality.medium;
      const dpr = Math.min(window.devicePixelRatio || 1, q.pixelRatio || 1.2);
      let ratio = G.Utils.clamp(dpr * s.renderScale, .45, (q.pixelRatio || 1.2) * s.renderScale);
      const maxPx = q.maxPixels || 1850000;
      if (width * height * ratio * ratio > maxPx) ratio = Math.max(.45, Math.sqrt(maxPx / (width * height)));
      this.renderer.setPixelRatio(ratio);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      if (this.post) {
        if (s.postFX) {
          const size = this.renderer.getDrawingBufferSize(this._drawSize || (this._drawSize = new THREE.Vector2()));
          this.post.resize(size.x, size.y);
        } else {
          this.post.resize(1, 1);
        }
      }
    }
    loop(now) {
      if (!this.running) return; const dt = Math.min(.05, Math.max(0, (now - this.lastFrame) / 1000)); this.lastFrame = now; this.time += dt;
      const speechMap = this._speechIds || (this._speechIds = { lan: 'lan', tuan: 'tuấn', hung: 'hùng' });
      try {
        this.updateToasts(dt);
        if (this.state === 'playing') {
          this.player.update(dt, this.time); this.ghost.update(dt, this.time);
          if (this.state === 'playing') { this.quest.update(dt); this.updateTimers(dt); }
          if (this.state === 'playing') { this.world.companions.forEach((c, id) => c.model.userData.speechLevel = this.sound.speechLevel(speechMap[id])); this.world.update(dt, this.time, this.camera); this.updateDialogue(dt); this.sound.update(dt, this.camera, this.player, this.ghost, this.time); this.autosave += dt; if (this.autosave >= 60 && this.ghost.state !== 'chase' && this.player.data.health > 0) { this.autosave = 0; this.save(false); } }
        } else if (this.state === 'cutscene') { this.updateCutscene(dt); this.world.companions.forEach((c, id) => c.model.userData.speechLevel = this.sound.speechLevel(speechMap[id])); this.world.update(dt, this.time, this.camera); this.updateDialogue(dt); this.sound.update(dt, this.camera, null, this.ghost, this.time); }
        else if (this.state === 'menu') { this.models.update(this.time, this.settings.reducedMotion, this.camera, this.settings.quality); }
        this.hudClock += dt; if (this.hudClock >= .08) { this.hudClock = 0; this.updateHUD(); }
        if (this.scene && this.camera && !['loading', 'error'].includes(this.state)) {
          const qCfg = G.Config.quality[this.settings.quality] || G.Config.quality.high;
          const fogSteps = qCfg.fogSteps !== undefined ? qCfg.fogSteps : 4;
          if (this.settings.postFX) this.post.render(this.scene, this.camera, this.time, this.player ? Math.max(0, 1 - this.player.data.sanity / 30) : 0, this.player ? this.player.damageFlash : 0, this.settings.reducedMotion || this.settings.reducedFlashes, this.ghostThreat(), this.settings.volumetricFog, fogSteps);
          else this.renderer.render(this.scene, this.camera);
        }
      } catch (error) { console.error(error); this.setState('error'); el('error-title').textContent = 'Game gặp lỗi'; el('error-message').textContent = error.message || String(error); this.running = false; return; }
      this.frame = requestAnimationFrame(this.tick);
    }
    dispose() { this.running = false; cancelAnimationFrame(this.frame); this.listeners.forEach(off => off()); this.destroyWorld(); this.sound.dispose(); if (this.post) this.post.dispose(); if (this.renderer) this.renderer.dispose(); this.bus.clear(); }
  };
}(window.Game = window.Game || {}));
