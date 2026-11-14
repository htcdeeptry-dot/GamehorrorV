(function (G) {
  'use strict';
  const el = id => document.getElementById(id);
  G.QuestSystem = class QuestSystem {
    constructor(app) {
      this.app = app; this.world = app.world; this.session = app.session; this.ray = new THREE.Raycaster(); this.ray.far = G.Config.runtime.interactionDistance;
      this.session.notes = this.session.notes || [];
      this.current = null; this.activePuzzle = null; this.sequence = []; this.cooldown = 0; this.retryAt = 0; this.hold = null; this.holdTime = 0; this.listeners = []; this.selectedItem = null; this.lastTarget = null;
      this.listen(el('code-puzzle'), 'submit', e => { e.preventDefault(); this.submitCode(el('lock-code').value); });
      document.querySelectorAll('[data-incense]').forEach(b => this.listen(b, 'click', () => this.chooseIncense(b.dataset.incense)));
      this.listen(el('btn-reset-incense'), 'click', () => this.resetIncense());
      this.listen(el('btn-perform-ritual'), 'click', () => this.performRitual());
      this.listen(el('btn-use-item'), 'click', () => this.useSelectedItem());
      this.updateObjective(); this.renderInventory(); this.renderJournal();
    }
    listen(node, event, handler) { node.addEventListener(event, handler); this.listeners.push(() => node.removeEventListener(event, handler)); }
    update(dt) {
      this.cooldown = Math.max(0, this.cooldown - dt); this.updateTarget();
      if (this.hold) {
        if (!this.app.player.down('interact') || this.current !== this.hold) { this.hold = null; this.holdTime = 0; el('interaction-progress').hidden = true; }
        else { this.holdTime += dt; const p = G.Puzzles[this.hold.puzzle]; el('interaction-progress').value = this.holdTime / p.holdSeconds; if (this.holdTime >= p.holdSeconds) { const target = this.hold; this.hold = null; el('interaction-progress').hidden = true; this.completeItemInteraction(target); } }
      }
      if (this.session.phase === 'awakening' && this.session.journals.includes('journal_01')) this.setPhase('search_village');
      if (this.session.phase === 'search_village' && this.hasRelics()) this.setPhase('return_to_well');
      if (this.session.flags.ritualComplete && this.session.phase !== 'escape') this.setPhase('escape');
      G.WorldLayout.companions.forEach(c => { if (this.session.companions[c.id] !== 'captive') return; const distance = this.app.player.position.distanceTo(new THREE.Vector3().fromArray(c.position)); if (distance < 8) this.app.say(c.id + 'Nearby', true); });
    }
    updateTarget() {
      if (this.app.player.hiddenSpot) { this.current = null; el('interaction-prompt').hidden = false; el('interaction-text').textContent = 'Ra khỏi chỗ nấp'; el('interaction-detail').textContent = ''; return; }
      this.app.camera.updateMatrixWorld(true); this.world.root.updateMatrixWorld(true); this.ray.setFromCamera(new THREE.Vector2(0, 0), this.app.camera);
      const hits = this.ray.intersectObjects(this.world.targets, true); this.current = null;
      for (const hit of hits) {
        if (!hit.object.isMesh) continue;
        let node = hit.object, visible = true, entry = null;
        while (node) { if (!node.visible) visible = false; if (!entry && node.userData.interactionId) entry = this.world.interactions.get(node.userData.interactionId); node = node.parent; }
        if (!visible || !entry || !entry.enabled) continue;
        const ownerCollider = entry.door ? entry.door.collider : this.world.colliders.find(c => c.mesh && (c.mesh === entry.root || c.mesh.parent === entry.root));
        if (!this.world.lineOfSight(this.app.camera.position, hit.point, ownerCollider)) continue;
        this.current = entry; break;
      }
      const prompt = el('interaction-prompt'); prompt.hidden = !this.current;
      el('crosshair').classList.toggle('interactable', !!this.current);
      if (this.current) { el('interaction-text').textContent = this.current.label; const p = G.Puzzles[this.current.puzzle]; el('interaction-detail').textContent = p && p.holdSeconds ? 'Giữ E trong ' + p.holdSeconds + ' giây' : ''; }
    }
    interact() {
      if (this.app.state !== 'playing') return;
      if (this.app.player.hiddenSpot) { this.app.player.exitHide(); return; }
      const e = this.current; if (!e) return;
      if (e.type === 'door') { if(!this.world.setDoor(e.door,!e.door.open))this.app.toast('Cánh cửa đang vướng người. Hãy lùi ra khỏi hướng mở cửa.'); }
      else if (e.type === 'hide') this.app.player.enterHide(e.spot);
      else if (e.type === 'pickup') this.pickup(e);
      else if (e.type === 'journal') this.readJournal(e.page);
      else if (e.type === 'note') { if (!this.session.notes.includes(e.note.id)) this.session.notes.push(e.note.id); this.app.openScreen('journal'); this.renderJournal(); this.showPage(e.note); }
      else if (e.type === 'grave') { this.app.toast(e.grave.epitaph, '', 9); this.app.showSubtitle(e.grave.name, e.grave.epitaph, 9); }
      else if (e.type === 'gate') { this.app.say('gateLocked'); this.app.toast('Ba tín vật tại Giếng Cổ sẽ phá xích huyết thuật.'); }
      else if (e.type === 'puzzle' || e.type === 'rescue') {
        const p = G.Puzzles[e.puzzle]; if (!p) return;
        if (this.session.solvedPuzzles.includes(p.id) && p.type !== 'ritual') { this.app.toast('Bạn đã giải quyết nơi này.'); return; }
        if (p.type === 'code' || p.type === 'sequence' || p.type === 'ritual') this.openPuzzle(p.id);
        else if (this.requirementsMet(p)) { this.hold = e; this.holdTime = 0; el('interaction-progress').hidden = false; el('interaction-progress').value = 0; }
      }
    }
    addItem(id, amount) {
      const count = this.session.inventory[id] || 0, item = G.Items[id]; if (!item || count + amount > item.stackLimit) { this.app.toast(G.UIText.messages.inventoryFull); return false; }
      this.session.inventory[id] = count + amount; this.app.sound.cue('pickup'); this.busEmit(G.EventNames.ITEM_ADDED, { id: id, amount: amount }); this.app.toast('Đã nhận: ' + item.name); return true;
    }
    busEmit(event, payload) { this.app.bus.emit(event, payload); }
    pickup(e) { if (!this.addItem(e.item, e.amount)) return; this.session.collectedPickups.push(e.id); this.world.disable(e.id); this.current = null; this.app.player.emitNoise(.1, 'pickup'); }
    readJournal(page) {
      if (!this.session.journals.includes(page.id)) { this.session.journals.push(page.id); this.world.disable(page.id); this.busEmit(G.EventNames.JOURNAL_FOUND, { id: page.id }); this.app.sound.cue('pickup'); if (this.session.journals.length === 8) this.app.say('allJournals', true); }
      this.app.openScreen('journal'); this.renderJournal(page.id);
    }
    requirementsMet(p) {
      if (p.requiresItems && !p.requiresItems.every(id => (this.session.inventory[id] || 0) > 0)) { this.app.toast(p.failure || G.UIText.messages.ritualMissing, 'warning'); return false; }
      if (p.requiresPuzzle && !this.session.solvedPuzzles.includes(p.requiresPuzzle)) { this.app.toast(p.failure, 'warning'); return false; }
      return true;
    }
    completeItemInteraction(e) {
      const p = G.Puzzles[e.puzzle]; if (!this.requirementsMet(p)) return;
      if (p.type === 'container') this.solve(p);
      else if (p.rescuedCompanion) this.rescue(p.rescuedCompanion, p);
    }
    rescue(id, p) {
      if (this.session.companions[id] === 'rescued') return;
      this.session.companions[id] = 'rescued'; if (!this.session.solvedPuzzles.includes(p.id)) this.session.solvedPuzzles.push(p.id);
      this.world.releaseCompanion(id, false); this.app.player.emitNoise(p.noise || .3, 'rescue'); this.app.sound.cue('unlock');
      this.app.say('rescue' + id.charAt(0).toUpperCase() + id.slice(1)); this.app.toast('Đã cứu ' + G.Lore.characters[id].name + '. Bạn ấy đang ra cổng.');
      this.busEmit(G.EventNames.COMPANION_RESCUED, { id: id }); this.app.save(false);
    }
    openPuzzle(id) {
      const p = G.Puzzles[id]; this.activePuzzle = p; this.sequence = []; this.cooldown = 0;
      if (!this.requirementsMet(p)) return;
      this.app.openScreen('puzzle'); el('puzzle-title').textContent = p.title; const house = G.WorldLayout.houses.find(h => h.id === p.location); el('puzzle-location').textContent = house ? house.name : 'Giếng Cổ'; el('puzzle-description').textContent = p.description || 'Gương soi sự thật. Chuông gọi tên. Ngọc trả lại tình thân.'; el('puzzle-feedback').textContent = '';
      el('code-puzzle').hidden = p.type !== 'code'; el('incense-puzzle').hidden = p.type !== 'sequence'; el('ritual-puzzle').hidden = p.type !== 'ritual';
      if (p.type === 'code') { const input = el('lock-code'); input.value = ''; input.maxLength = p.digits; input.pattern = '[0-9]{' + p.digits + '}'; input.placeholder = Array(p.digits).fill('−').join(' '); document.querySelector('label[for="lock-code"]').textContent = p.digits + ' chữ số trên khóa'; input.focus(); }
      if (p.type === 'sequence') { el('incense-inscription').textContent = p.inscription; const choices = document.querySelector('.incense-choices'); p.visualOrder.forEach(id => choices.appendChild(choices.querySelector('[data-incense="' + id + '"]'))); this.resetIncense(); }
      if (p.type === 'ritual') {
        document.querySelectorAll('#ritual-slots li').forEach(li => li.classList.toggle('placed', !!this.session.inventory[li.dataset.relic]));
        const rescued = Object.values(this.session.companions).filter(s => s === 'rescued').length;
        el('puzzle-feedback').textContent = 'Đã cứu ' + rescued + '/3 người · Nhật ký ' + this.session.journals.length + '/8. Bạn có thể quay lại tìm những điều còn thiếu trước khi làm lễ.';
        el('btn-perform-ritual').disabled = !this.hasRelics() || this.session.flags.ritualComplete;
      }
    }
    submitCode(code) {
      const p = this.activePuzzle; if (!p || p.type !== 'code' || this.session.solvedPuzzles.includes(p.id)) return;
      if (performance.now() < this.retryAt) { el('puzzle-feedback').textContent = 'Các vòng đồng đang kẹt. Đợi một nhịp rồi thử lại.'; return; }
      if (!new RegExp('^[0-9]{' + p.digits + '}$').test(code)) { el('puzzle-feedback').textContent = 'Hãy nhập đủ ' + p.digits + ' chữ số.'; return; }
      if (code === p.answer) this.solve(p); else this.fail(p);
    }
    chooseIncense(id) {
      const p = this.activePuzzle; if (!p || p.type !== 'sequence' || this.sequence.length >= 3 || this.session.solvedPuzzles.includes(p.id)) return;
      if (performance.now() < this.retryAt) { el('puzzle-feedback').textContent = 'Khói nhang chưa tan. Đợi một nhịp rồi thử lại.'; return; }
      if (this.sequence.includes(id)) return; this.sequence.push(id); this.app.sound.cue('burn'); this.renderIncense();
      if (this.sequence.length === 3) { if (this.sequence.every((v, i) => v === p.answer[i])) this.solve(p); else this.fail(p); }
    }
    resetIncense() { this.sequence = []; this.renderIncense(); el('puzzle-feedback').textContent = ''; }
    renderIncense() { const list = el('incense-sequence'); list.textContent = ''; this.sequence.forEach(id => { const li = document.createElement('li'); li.textContent = G.Puzzles.incense_order.labels[id]; list.appendChild(li); }); document.querySelectorAll('[data-incense]').forEach(b => { b.classList.toggle('lit', this.sequence.includes(b.dataset.incense)); b.disabled = this.sequence.includes(b.dataset.incense); }); }
    fail(p) {
      this.retryAt = performance.now() + (p.retryCooldown || 1) * 1000;
      el('puzzle-feedback').textContent = p.failure; this.session.player.sanity = Math.max(0, this.session.player.sanity - (p.wrongAttemptSanityCost || 0)); this.app.player.emitNoise(p.wrongAttemptNoise || .3, 'puzzle'); this.app.sound.cue('stinger');
    }
    solve(p) {
      if (this.session.solvedPuzzles.includes(p.id)) return;
      if (!this.requirementsMet(p)) return;
      this.session.solvedPuzzles.push(p.id); (p.rewardItems || []).forEach(id => this.addItem(id, 1));
      if (p.unlocks) p.unlocks.forEach(id => this.world.unlockPrison(id));
      this.busEmit(G.EventNames.PUZZLE_SOLVED, { id: p.id }); this.app.sound.cue('unlock'); this.app.toast(p.success || 'Niêm phong đã mở.');
      if (this.app.state === 'puzzle') this.app.closeScreen();
      if (p.id === 'truth_incense') { this.app.say('mirrorFound', true); this.world.revealMirror(); } if (p.id === 'number_lock') this.app.toast('Bài nhang: Sinh → Dưỡng → Tử. Đem thứ tự này tới bàn thờ trong nhà.', '', 12); if (p.id === 'incense_order') this.app.say('bellFound', true); if (p.id === 'pendant_chest') this.app.say('pendantFound', true);
      this.updateObjective(); this.app.save(false);
    }
    hasRelics() { return G.Puzzles.well_ritual.requiresItems.every(id => this.session.inventory[id] === 1); }
    performRitual() {
      if (this.session.flags.ritualComplete || !this.hasRelics()) { this.app.toast(G.UIText.messages.ritualMissing, 'warning'); return; }
      this.activePuzzle = null; this.app.closeScreen(false); this.app.ghost.banish(); this.app.playCutscene('ritual', () => this.completeRitual());
    }
    completeRitual() {
      if (this.session.flags.ritualComplete) return;
      this.session.flags.ritualComplete = true; this.session.escapeRemaining = G.Config.quest.escapeGraceSeconds;
      if (!this.session.solvedPuzzles.includes('well_ritual')) this.session.solvedPuzzles.push('well_ritual');
      this.world.openGate(); this.app.ghost.banish(); this.setPhase('escape'); this.busEmit(G.EventNames.RITUAL_COMPLETE, {}); this.app.toast(G.UIText.messages.escapeWarning, '', 8); if (this.session.journals.length < 8) this.app.say('ritualIncompleteTruth'); this.app.save(false);
    }
    setPhase(id) { this.session.phase = id; this.updateObjective(); this.busEmit(G.EventNames.QUEST_CHANGED, { id: id }); }
    updateObjective() {
      const quest = G.Quests.find(q => q.id === this.session.phase) || G.Quests[0]; el('objective-text').textContent = quest.objective; const list = el('objective-subtasks'); list.textContent = '';
      quest.subtasks.forEach(text => { const li = document.createElement('li'); li.textContent = text; list.appendChild(li); });
    }
    renderInventory() {
      document.querySelectorAll('.relic-slot').forEach(node => { node.classList.toggle('collected', !!this.session.inventory[node.dataset.item]); node.tabIndex = 0; node.setAttribute('role', 'button'); node.onclick = () => this.selectItem(node.dataset.item); node.onkeydown = e => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); this.selectItem(node.dataset.item); } }; });
      const grid = el('inventory-grid'); grid.textContent = '';
      Object.keys(this.session.inventory).forEach(id => { const count = this.session.inventory[id], item = G.Items[id]; if (!count || item.category === 'relic') return; const button = document.createElement('button'); button.type = 'button'; button.className = 'inventory-item'; button.dataset.item = id; button.appendChild(document.createTextNode(item.name)); const amount = document.createElement('span'); amount.className = 'item-count'; amount.textContent = '× ' + count; button.appendChild(amount); button.onclick = () => this.selectItem(id); grid.appendChild(button); });
      if (!grid.children.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Chưa có vật dụng.'; grid.appendChild(p); }
      this.selectItem(this.selectedItem);
    }
    selectItem(id) { this.selectedItem = id; const item = G.Items[id]; el('item-name').textContent = item ? item.name : 'Chọn một vật phẩm'; el('item-description').textContent = item ? item.description : 'Mỗi vật đều giữ lại một phần câu chuyện.'; el('item-hint').textContent = item ? item.hint : ''; el('btn-use-item').hidden = !item || !item.consumable || !(this.session.inventory[id] > 0); document.querySelectorAll('.inventory-item').forEach(b => b.classList.toggle('selected', b.dataset.item === id)); }
    useSelectedItem() { const id = this.selectedItem; this.app.closeScreen(); if (id === 'battery') this.app.player.replaceBattery(); if (id === 'medicine') this.app.player.heal(); if (id === 'talisman') this.app.player.useTalisman(); }
    renderJournal(selected) {
      const list = el('journal-list'); list.textContent = ''; el('journal-progress').textContent = this.session.journals.length + ' / 8';
      G.Lore.journals.forEach(page => { const found = this.session.journals.includes(page.id), button = document.createElement('button'); button.type = 'button'; button.className = 'journal-entry' + (found ? '' : ' locked'); button.textContent = String(page.number).padStart(2, '0') + ' · ' + (found ? page.title : 'Chưa tìm thấy'); button.disabled = !found; button.dataset.page = page.id; button.onclick = () => this.showPage(page); list.appendChild(button); });
      G.ExplorationNotes.filter(n => this.session.notes.includes(n.id)).forEach(note => { const button = document.createElement('button'); button.type = 'button'; button.className = 'journal-entry'; button.dataset.page = note.id; button.textContent = '✎ ' + note.author + ' · ' + note.title; button.onclick = () => this.showPage(note); list.appendChild(button); });
      const page = G.Lore.journals.find(p => p.id === selected && this.session.journals.includes(p.id)) || G.Lore.journals.find(p => this.session.journals.includes(p.id));
      if (page) this.showPage(page); else { el('journal-page-title').textContent = 'Chưa có trang nhật ký'; el('journal-page-body').textContent = 'Những nét chữ cũ vẫn đang chờ được tìm thấy.'; el('journal-date').textContent = ''; el('journal-clue').hidden = true; }
    }
    showPage(page) { el('journal-date').textContent = page.author + ' · ' + page.date; el('journal-page-title').textContent = page.title; const body = el('journal-page-body'); body.textContent = ''; page.paragraphs.forEach(text => { const p = document.createElement('p'); p.textContent = text; body.appendChild(p); }); el('journal-clue').textContent = page.clue; el('journal-clue').hidden = !page.clue; document.querySelectorAll('.journal-entry').forEach(b => b.classList.toggle('selected', b.dataset.page === page.id)); }
    dispose() { this.listeners.forEach(off => off()); document.querySelectorAll('.relic-slot').forEach(n => { n.onclick = null; n.onkeydown = null; }); }
  };
}(window.Game = window.Game || {}));
