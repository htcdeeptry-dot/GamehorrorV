(function (global) {
  'use strict';
  var Game = global.Game = global.Game || {};

  // Đơn vị: mét, giây, radian. Tọa độ thuần dữ liệu [x,y,z], không phụ thuộc THREE.
  // Hướng cửa mặc định +Z; yaw xoay quanh Y. main.js sở hữu khởi tạo và game loop.
  // Mọi module phải dùng cùng ID bên dưới để lưu game và nhận diện tương tác.
  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { deepFreeze(value[key]); });
    return Object.freeze(value);
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  Game.Config = deepFreeze({
    version: '0.6.0', saveVersion: 1, title: 'HUYẾT LỆ THÔN', subtitle: 'THE WEEPING VILLAGE',
    seed: 19942024, threeRevision: '128', locale: 'vi-VN',
    storage: { saveKey: 'huyet_le_thon.save.v1', settingsKey: 'huyet_le_thon.settings.v1', maxSaveBytes: 262144 },
    runtime: { maxDelta: 0.05, fixedStep: 1 / 60, maxSubSteps: 5, autosaveInterval: 60, interactionDistance: 2.6, pauseOnBlur: true, skipHoldSeconds: 1.25 },
    renderer: { antialias: true, alpha: false, powerPreference: 'high-performance', exposure: 1.05, clearColor: 0x090a10, maxPixelRatio: 1.75, shadowBias: -0.00025, shadowNormalBias: 0.035 },
    camera: { fov: 75, near: 0.08, far: 180, cutsceneNear: 0.05 },
    quality: {
      low: { pixelRatio: 1, shadows: false, shadowMapSize: 512, rainCount: 450, ashCount: 90, textureSize: 256, maxDynamicLights: 3, postProcessing: false },
      medium: { pixelRatio: 1.35, shadows: true, shadowMapSize: 1024, rainCount: 1000, ashCount: 220, textureSize: 512, maxDynamicLights: 5, postProcessing: true },
      high: { pixelRatio: 1.75, shadows: true, shadowMapSize: 2048, rainCount: 1800, ashCount: 420, textureSize: 1024, maxDynamicLights: 8, postProcessing: true }
    },
    world: {
      bounds: { minX: -65, maxX: 65, minZ: -68, maxZ: 68 }, groundY: 0,
      spawn: { position: [0, 0, 55], yaw: 0 }, gate: { position: [0, 0, 61], escapeZ: 65, width: 7, height: 6 },
      well: { position: [0, 0, 0], radius: 2.25, height: 1.15, depth: 5 },
      ritualPosition: [0, 0, 4.2], fog: { color: 0x141d1d, density: 0.030 },
      moon: { position: [-45, 75, -80], radius: 8, color: 0xa5383d, lightColor: 0x65768d, intensity: 0.45 },
      ambient: { skyColor: 0x687184, groundColor: 0x211615, intensity: 0.34 },
      rain: { radius: 36, height: 26, speed: 15, windX: -1.4, windZ: 0.6, color: 0xa6a9b9, opacity: 0.25 },
      ash: { radius: 30, height: 12, speed: 0.23, color: 0xd5a499, size: 0.035 },
      lightning: { intervalMin: 24, intervalMax: 52, intensity: 2.8, duration: 0.16, thunderDelayMin: 1.2, thunderDelayMax: 3.8 },
      forest: { seed: 7301, treeCount: 110, minRadius: 45, maxRadius: 62, pathClearance: 3.5 },
      cemetery: { center: [39, 0, -35], width: 20, depth: 18, rows: 3, columns: 4 },
      navigation: { cellSize: 1, agentRadius: 0.4, repathSeconds: 0.7, maxSearchNodes: 18000 },
      collision: { skin: 0.025, maxStep: 0.22, wallThickness: 0.3 }
    },
    player: {
      radius: 0.32, standingHeight: 1.72, crouchingHeight: 1.05,
      walkSpeed: 2.5, runSpeed: 4.7, crouchSpeed: 1.2, acceleration: 14, friction: 18,
      maxHealth: 100, maxStamina: 100, maxSanity: 100, maxBattery: 100,
      runDrain: 15, staminaRegen: 10, staminaRegenDelay: 1.6, minRunStamina: 8,
      holdBreathDrain: 20, breathRecoveryDelay: 2.4, breathExhaustNoise: 0.9,
      sanityDarkDrain: 0.13, sanityGhostDrain: 2.6, sanitySafeRegen: 0.8, sanityLowThreshold: 30,
      sanityGhostRadius: 12, fallDamageThreshold: 3, invulnerabilitySeconds: 2.5,
      headBob: { walkFrequency: 8.5, runFrequency: 12, crouchFrequency: 5, walkAmount: 0.032, runAmount: 0.065 },
      flashlight: { enabled: true, intensity: 2.7, distance: 26, angle: 0.46, penumbra: 0.62, decay: 1.5, batteryDrain: 0.14, flickerThreshold: 15, lag: 8, sway: 0.025, offset: [0.18, -0.15, -0.25], shadowMapSize: 1024 },
      noise: { walk: 0.22, run: 0.9, crouch: 0.05, interact: 0.3, breath: 0.18, stepDistanceWalk: 1.65, stepDistanceRun: 2.1, stepDistanceCrouch: 1.1 },
      hiding: { enterSeconds: 0.35, exitSeconds: 0.3, revealDistance: 2.6, breathDetectionSeconds: 2.2, heldBreathNoise: 0, exitOffset: 1.4 },
      talisman: { repelRadius: 8, stunSeconds: 5.5, cooldown: 3, sanityRestore: 8 },
      medicine: { healthRestore: 45, useSeconds: 1.4 }, batteryReplacement: 100
    },
    ghost: {
      name: 'Linh', spawn: [8, 0, -34], activationDelay: 45,
      patrolSpeed: 1.15, investigateSpeed: 1.9, chaseSpeed: 3.65, enragedSpeed: 4.15,
      sightDistance: 17, sightHalfAngle: 1.05, hearingRadius: 22, flashlightDetectionRadius: 23,
      attackRange: 1.35, attackDamage: 34, attackCooldown: 2.8,
      investigateDuration: 8, searchDuration: 12, loseSightSeconds: 4, patrolWait: 2.5,
      stunImmunitySeconds: 2, chaseMusicFade: 1.2, minimumSpawnDistance: 14,
      hallucination: { sanityThreshold: 30, intervalMin: 22, intervalMax: 45, duration: 0.65, distanceMin: 5, distanceMax: 10 },
      jumpscare: { duration: 2.6, cameraDistance: 0.65, fov: 90, shake: 0.08 },
      patrolPoints: [[0, 0, -12], [-16, 0, -16], [-28, 0, 9], [-12, 0, 28], [13, 0, 29], [29, 0, 10], [26, 0, -22], [9, 0, -33]],
      states: ['dormant', 'patrol', 'investigate', 'search', 'chase', 'inspect_hiding', 'stunned', 'banished']
    },
    audio: {
      sampleRateHint: 44100, masterLimiterThreshold: -10, masterLimiterRatio: 12,
      distanceModel: 'inverse', refDistance: 2, maxDistance: 55, rolloffFactor: 1.3,
      listenerHeight: 1.65, ambientGain: 0.22, windGain: 0.13, rainGain: 0.1,
      droneFrequencies: [43.65, 65.41, 87.31], chaseBpm: 126, calmBpm: 42,
      heartbeatBpmMin: 58, heartbeatBpmMax: 142, whisperIntervalMin: 18, whisperIntervalMax: 40,
      maxVoices: 32, noiseBufferSeconds: 4, fadeSeconds: 0.35,
      // Không dùng SpeechSynthesis: lời thoại hiển thị bằng phụ đề, tiếng người là âm tổng hợp.
      dialogueMode: 'subtitles_with_synth', suspendWhenPaused: true
    },
    quest: { curseDuration: 1800, warningThresholds: [900, 600, 300, 120, 60], ritualDuration: 18, escapeGraceSeconds: 120, journalCount: 8, relicCount: 3, companionCount: 3 },
    settingsDefaults: { masterVolume: 0.8, musicVolume: 0.55, sfxVolume: 0.85, quality: 'high', mouseSensitivity: 0.002, brightness: 1, fov: 75, subtitles: true, reducedMotion: false, reducedFlashes: false },
    input: { forward: ['KeyW', 'ArrowUp'], backward: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], run: ['ShiftLeft', 'ShiftRight'], crouch: ['ControlLeft', 'KeyC'], interact: ['KeyE'], breath: ['Space'], flashlight: ['KeyF'], talisman: ['KeyQ'], reloadBattery: ['KeyR'], heal: ['KeyH'], inventory: ['Tab'], journal: ['KeyJ'], pause: ['Escape'], skip: ['Enter'] }
  });

  Game.States = deepFreeze({ BOOT: 'boot', LOADING: 'loading', MENU: 'menu', CUTSCENE: 'cutscene', PLAYING: 'playing', PAUSED: 'paused', INVENTORY: 'inventory', JOURNAL: 'journal', PUZZLE: 'puzzle', SETTINGS: 'settings', HELP: 'help', CREDITS: 'credits', ENDING: 'ending', DEAD: 'dead', ERROR: 'error' });
  Game.StateRules = deepFreeze({
    timedStates: ['playing'], pointerLockStates: ['playing'],
    freezeSimulationStates: ['menu', 'paused', 'inventory', 'journal', 'puzzle', 'settings', 'help', 'credits', 'ending', 'dead', 'error'],
    cutsceneUsesOwnClock: true, pauseOnPointerUnlock: true,
    ritualCommitAtCutsceneEnd: true, timerStopsOnRitualSuccess: true
  });

  Game.Items = deepFreeze({
    truth_mirror: { id: 'truth_mirror', name: 'Gương Đồng Phản Chiếu Sự Thật', category: 'relic', stackLimit: 1, consumable: false, model: 'mirror', description: 'Mặt đồng xỉn đục, sau lưng khắc tên những người chết vì nguồn nước độc. Trong gương, đôi mắt Linh vẫn là đôi mắt của một người.', hint: 'Mở hộp số tại Nhà Trưởng Làng, rồi giải bàn thờ để lấy gương trong ngăn bí mật. Đặt đầu tiên trên Đàn Tế.' },
    soul_bell: { id: 'soul_bell', name: 'Chuông Đồng Gọi Hồn', category: 'relic', stackLimit: 1, consumable: false, model: 'bell', description: 'Chiếc chuông không có quả lắc. Nó ngân lên khi có ai đó gọi đúng tên người bị oan.', hint: 'Giấu sau bức tranh thờ ở Từ Đường. Đặt sau Gương Đồng.' },
    linh_pendant: { id: 'linh_pendant', name: 'Ngọc Bội Của Linh', category: 'relic', stackLimit: 1, consumable: false, model: 'pendant', description: 'Nửa viên ngọc khắc hoa ban, còn vương sợi chỉ đỏ. Mẹ Linh đã trao nó cho cô trước mùa dịch.', hint: 'Cất trong chiếc hòm tại Nhà Linh. Trả lại sau cùng trong nghi lễ.' },
    rusty_key: { id: 'rusty_key', name: 'Chìa khóa rỉ sét', category: 'tool', stackLimit: 1, consumable: false, model: 'key', description: 'Chiếc chìa nặng có dấu hình bánh xe. Rỉ sắt bám vào tay như máu khô.', hint: 'Mở cửa buồng giam Tuấn ở Nhà Kho.' },
    bolt_cutters: { id: 'bolt_cutters', name: 'Kìm cắt sắt', category: 'tool', stackLimit: 1, consumable: false, model: 'cutters', description: 'Lưỡi kìm còn sắc dưới lớp bùn khô. Có thể cắt xích sắt thường.', hint: 'Phá xích cứu Hùng ở Chuồng Trại. Không cắt được xích huyết thuật tại cổng.' },
    talisman: { id: 'talisman', name: 'Bùa Hộ Mệnh', category: 'supply', stackLimit: 5, consumable: true, model: 'talisman', description: 'Mảnh giấy vàng viết bằng chu sa. Chỉ còn đủ linh lực cho một lần đốt.', hint: 'Nhấn Q khi Linh ở gần để đẩy lùi cô trong vài giây.' },
    battery: { id: 'battery', name: 'Pin đèn dự phòng', category: 'supply', stackLimit: 5, consumable: true, model: 'battery', description: 'Một bộ pin bọc kín, may mắn chưa ngấm nước.', hint: 'Nhấn R để thay pin. Lượng điện còn trong bộ pin cũ sẽ mất.' },
    medicine: { id: 'medicine', name: 'Băng và thuốc sát trùng', category: 'supply', stackLimit: 3, consumable: true, model: 'medicine', description: 'Một cuộn băng sạch và lọ thuốc trong túi của đoàn phượt.', hint: 'Nhấn H để hồi 45 máu, tối đa 100.' }
  });

  Game.Lore = deepFreeze({
    presentYear: 2024, tragedyYear: 1994, village: 'Lệ Thôn', protagonist: 'Minh',
    premise: 'Bốn sinh viên Minh, Lan, Tuấn và Hùng gặp sạt lở trên đường đi phượt vùng cao. Họ rẽ vào Lệ Thôn tránh mưa. Sương đỏ tràn qua sân đình. Minh tỉnh lại bên cánh cổng khóa bằng ba sợi xích huyết thuật; ba người bạn đã biến mất.',
    truth: 'Ba mươi năm trước, Trưởng làng Lý Định bí mật đổ hóa chất vào nguồn nước, gây dịch bệnh để ép dân bán đất và kiếm lời từ thuốc giả. Khi Linh phát hiện chứng cứ, lão lợi dụng đôi mắt dị sắc của cô để vu là yêu nghiệt. Dân làng trói cô, cắt lưỡi rồi dìm xuống Giếng Cổ trong đêm Trăng Máu. Oán khí biến Linh thành Huyết Lệ Quỷ, giam cả làng giữa sống và chết.',
    ritualMeaning: 'Gương trả lại sự thật, chuông trả lại tên gọi, ngọc trả lại tình thân. Nghi lễ phá xích; chỉ lời chứng đầy đủ và việc cứu cả ba người bạn mới giúp Linh thực sự yên nghỉ.',
    characters: {
      minh: { id: 'minh', name: 'Minh', role: 'Người chơi', color: 0x87949b, description: 'Sinh viên kiến trúc, quen đọc mặt bằng và ghi chép. Nỗi sợ lớn nhất là sống sót bằng cách bỏ người khác lại.' },
      lan: { id: 'lan', name: 'Lan', role: 'Sinh viên sử học', color: 0xa65b58, prison: 'ancestral_hall', rescueId: 'rescue_lan', description: 'Bình tĩnh, giỏi đọc văn tự cổ. Bị nhốt trong mật thất Từ Đường.' },
      tuan: { id: 'tuan', name: 'Tuấn', role: 'Người sửa xe của nhóm', color: 0x627b83, prison: 'storehouse', rescueId: 'rescue_tuan', description: 'Hay nói đùa để giấu sợ. Bị khóa trong buồng sau Nhà Kho.' },
      hung: { id: 'hung', name: 'Hùng', role: 'Người dẫn đường', color: 0x77784d, prison: 'barn', rescueId: 'rescue_hung', description: 'Đã quay lại tìm mọi người trong sương. Bị xích sau Chuồng Trại.' },
      linh: { id: 'linh', name: 'Linh', role: 'Người bị oan', ageAtDeath: 19, leftEye: 0x799b8d, rightEye: 0xa77b45, description: 'Tóc đen dài, áo trắng đã ngấm nước, cổ tay hằn dấu dây. Nước mắt đỏ và đôi mắt dị sắc là phần ký ức cô không đánh mất.' },
      elder: { id: 'elder', name: 'Lý Định', role: 'Trưởng làng', description: 'Kẻ đầu độc nguồn nước, dựng lên một vật tế để che giấu tội ác.' }
    },
    journals: [
      { id: 'journal_01', number: 1, title: 'Chuyến đi cuối mùa', author: 'Lan', date: '17 tháng 8, 2024', location: 'gate', position: [2.5, 0.73, 49], paragraphs: ['Đường đèo sạt ngay sau khi xe chúng mình đi qua. Hùng bảo phía dưới có một làng cũ, bản đồ giấy ghi là Lệ Thôn. Mình không tìm thấy tên ấy trên điện thoại.', 'Dưới mái cổng, có dòng chữ: “Đừng uống nước giếng sau khi nghe chuông.” Tuấn cười, nhưng không ai mở chai nước. Mình vừa nhìn thấy một người mặc áo trắng bên kia màn mưa.', 'Nếu ai nhặt được sổ này: chúng mình có bốn người. Đừng rời đi khi chưa tìm đủ.'], clue: 'Ba tiếng gọi vọng từ Từ Đường, Nhà Kho và Chuồng Trại.' },
      { id: 'journal_02', number: 2, title: 'Nước có vị kim loại', author: 'Linh', date: '03 tháng 8, 1994', location: 'linh_house', position: [-27, 0.85, 23], paragraphs: ['Mẹ bảo đun kỹ nước là sẽ hết bệnh, nhưng nồi nước để nguội vẫn có váng xanh. Những nhà dùng nước mưa chưa có ai sốt. Trẻ con uống nước giếng thì đau bụng cả đêm.', 'Tối qua, tôi thấy xe của ông Định chở những thùng không nhãn tới đầu nguồn. Ông bảo là thuốc khử dịch. Nếu là thuốc, sao phải chờ cả làng ngủ?', 'Tôi lấy một ít nước, gói lại cùng mảnh vải lau thùng. Ngày mai sẽ đem cho thầy thuốc xem.'], clue: 'Dịch bệnh bắt đầu từ nguồn nước, không phải từ Linh.' },
      { id: 'journal_03', number: 3, title: 'Sổ nợ không ghi tên', author: 'Người giữ kho', date: '09 tháng 8, 1994', location: 'storehouse', position: [-31, 0.9, -12], paragraphs: ['Ông Định bắt tôi chép hai cuốn sổ. Một cuốn ghi tiền thuốc, cuốn kia ghi ruộng đã mua của nhà có người bệnh. Thuốc trong kho chỉ là bột trắng pha màu.', 'Tôi đã giấu chiếc chìa có dấu bánh xe trong Nhà Thầy Thuốc. Nếu tôi không trở về, ai còn sống hãy mở kho mà lấy sổ thật.', 'Tối nay ông ấy hỏi tôi có thấy con bé mắt hai màu đi qua không. Tôi nói không. Lần đầu tiên trong đời, tôi cầu cho lời nói dối của mình cứu được một người.'], clue: 'Chìa khóa buồng Nhà Kho được giấu tại Nhà Thầy Thuốc.' },
      { id: 'journal_04', number: 4, title: 'Bốn vòng số', author: 'Linh', date: '12 tháng 8, 1994', location: 'cemetery', position: [37, 0.7, -32], paragraphs: ['Cửa trước khắc lời lệ cũ: ba người giữ lễ, một giếng nhận lời, chín hồi chuông tiễn. Ba vòng khóa cửa lấy ba con số ấy. Còn chiếc hộp đồng bên trong có bốn vòng riêng. Tôi đã nhìn thấy ông Định xoay chúng khi đứng ngoài cửa sổ.', 'Ông lấy hai số cuối năm mất của bà vợ, rồi ghép với số tuổi trên bia của đứa con. Hai ngôi mộ có cùng dấu hoa mận, nằm cạnh nhau ở hàng đầu nghĩa địa.', 'Ông ấy đã chuyển gương xuống ngăn bàn thờ. Hộp còn một mảnh giấy chỉ cách mở ngăn. Tôi phải lấy lại trước đêm rằm.'], clue: 'Hai số cuối năm mất của bà Mai, rồi tuổi của bé An. Đọc đúng hai bia có hoa mận.' },
      { id: 'journal_05', number: 5, title: 'Một đời trên tranh thờ', author: 'Người coi Từ Đường', date: '14 tháng 8, 1994', location: 'ancestral_hall', position: [2.5, 0.85, -31], paragraphs: ['Tranh thờ không đọc từ trái sang phải. Người xưa cố ý đảo vị trí để kẻ chỉ nhìn mà không hiểu chẳng thể mở cửa sau.', 'Một đời bắt đầu từ mầm cây, lớn lên thành cành lá, cuối cùng trở về với lá rụng. Thắp nhang theo một đời ấy: Sinh, Dưỡng, Tử.', 'Chuông trong mật thất không gọi quỷ. Nó gọi tên người mà cả làng cố quên. Đêm nay, tôi đã nghe tiếng chuông dù không có ai đứng sau bức tranh.'], clue: 'Sinh (mầm cây) → Dưỡng (cành lá) → Tử (lá rụng).' },
      { id: 'journal_06', number: 6, title: 'Lời thú nhận chưa gửi', author: 'Thầy thuốc Khang', date: '15 tháng 8, 1994', location: 'healer_house', position: [27, 0.85, 23], paragraphs: ['Không có lời nguyền nào trong những mẫu nước Linh mang đến. Chỉ có độc chất. Tôi đã biết, và đã im lặng khi ông Định đặt tiền lên bàn.', 'Giờ họ nói đôi mắt con bé khiến trẻ con chết. Tôi mở miệng giữa sân đình mà không thành tiếng. Tôi là người có thể cứu nó, nhưng lại trốn sau cánh cửa nhà mình.', 'Tôi giữ chìa kho trong ngăn dưới bàn thuốc. Sổ trong kho, mẫu nước và lời chứng này đủ để kết tội ông Định. Nếu còn có người đến sau, xin đừng học cách im lặng của tôi.'], clue: 'Chứng cứ nối Nhà Thầy Thuốc với Nhà Kho và Trưởng Làng.' },
      { id: 'journal_07', number: 7, title: 'Đêm không tiếng nói', author: 'Người chăn trâu', date: 'Đêm Trăng Máu, 1994', location: 'barn', position: [32, 0.65, -13], paragraphs: ['Họ kéo Linh qua chuồng trại. Con bé không còn nói được, chỉ nhìn từng người trong đám đông. Tôi trốn sau đống rơm, nắm chiếc kìm mà không dám bước ra cắt dây.', 'Khi họ đưa con bé tới giếng, ngọc bội rơi xuống đường. Tôi nhặt rồi đặt vào chiếc hòm trong nhà nó. Một việc quá nhỏ để gọi là chuộc lỗi.', 'Từ lúc mặt trăng đỏ lên, lối ra làng dài mãi không hết. Dưới giếng có tiếng khóc. Trên cổ tay tôi cũng bắt đầu hiện những vết dây.'], clue: 'Kìm ở Chuồng Trại. Ngọc Bội được trả về chiếc hòm tại Nhà Linh.' },
      { id: 'journal_08', number: 8, title: 'Trả lại tên em', author: 'Mẹ của Linh', date: 'Không ghi ngày', location: 'elder_house', position: [-1.8, 0.9, -48], paragraphs: ['Tôi đã tới từng cửa, xin họ gọi con tôi bằng tên của nó. Họ chỉ gọi nó là yêu nghiệt. Một người bị xóa tên thì làm sao tìm được đường về?', 'Hãy đưa gương đến giếng để tội lỗi hiện hình. Rung chuông và gọi: Linh. Sau cùng, trả ngọc bội về bên con để nó nhớ vẫn có một người thương nó.', 'Nghi lễ mở được cổng, nhưng lòng người mới khép được giếng. Mang đủ lời chứng. Đưa những người còn sống ra ngoài. Đừng để con tôi nhìn thấy thêm một người bị bỏ lại.'], clue: 'Gương → Chuông → Ngọc. Cứu đủ ba người bạn và tìm đủ tám trang để giải oan trọn vẹn.' }
    ],
    graves: [
      { id: 'grave_mai', name: 'Trần Thị Mai', born: 1949, died: 1991, age: 42, emblem: 'plum', position: [35, 0, -38], epitaph: 'Người vợ hiền. Mất năm 1991. Hoa mận còn nở, người đã xa.' },
      { id: 'grave_an', name: 'Lý Bình An', born: 1970, died: 1993, age: 23, emblem: 'plum', position: [39, 0, -38], epitaph: 'Người con đoản mệnh. Hưởng dương 23 tuổi.' },
      { id: 'grave_hoa', name: 'Vũ Thị Hoa', born: 1932, died: 1994, age: 62, emblem: 'lotus', position: [43, 0, -38], epitaph: 'Mất trong mùa dịch. Cầu một giấc ngủ yên.' },
      { id: 'grave_nam', name: 'Phạm Văn Nam', born: 1955, died: 1994, age: 39, emblem: 'lotus', position: [47, 0, -38], epitaph: 'Người giữ vườn cũ.' },
      { id: 'grave_dao', name: 'Đỗ Thị Đào', born: 1963, died: 1994, age: 31, emblem: 'leaf', position: [35, 0, -33], epitaph: 'Mưa còn đọng trên hiên.' },
      { id: 'grave_binh', name: 'Lê Văn Bình', born: 1920, died: 1994, age: 74, emblem: 'leaf', position: [39, 0, -33], epitaph: 'Một đời bên ruộng.' },
      { id: 'grave_thu', name: 'Nguyễn Thị Thu', born: 1978, died: 1994, age: 16, emblem: 'lotus', position: [43, 0, -33], epitaph: 'Chưa kịp qua mùa hạ.' },
      { id: 'grave_phuc', name: 'Võ Văn Phúc', born: 1948, died: 1994, age: 46, emblem: 'leaf', position: [47, 0, -33], epitaph: 'Tiếng sáo im từ đó.' },
      { id: 'grave_sen', name: 'Trần Thị Sen', born: 1939, died: 1994, age: 55, emblem: 'lotus', position: [35, 0, -28], epitaph: 'Thương những người ở lại.' },
      { id: 'grave_kien', name: 'Bùi Văn Kiên', born: 1969, died: 1994, age: 25, emblem: 'leaf', position: [39, 0, -28], epitaph: 'Không còn đường về.' },
      { id: 'grave_van', name: 'Mai Thị Vân', born: 1951, died: 1994, age: 43, emblem: 'lotus', position: [43, 0, -28], epitaph: 'Nước giếng đã cạn lời.' },
      { id: 'grave_unknown', name: 'Người không tên', born: null, died: 1994, age: null, emblem: 'none', position: [47, 0, -28], epitaph: 'Xin hãy nhớ.' }
    ]
  });

  // Vị trí furniture và hidingSpots là LOCAL theo nhà; pickups/journals là WORLD.
  // Các buồng giam có cửa riêng: khóa buồng không được khóa lối vào nhà chứa manh mối.
  Game.WorldLayout = deepFreeze({
    zones: [
      { id: 'gate', name: 'Cổng Làng', center: [0, 0, 53], radius: 13 },
      { id: 'well', name: 'Giếng Cổ', center: [0, 0, 0], radius: 12 },
      { id: 'cemetery', name: 'Nghĩa Địa Hoa Mận', center: [40, 0, -33], radius: 15 },
      { id: 'forest', name: 'Rừng Không Lối', center: [-48, 0, -35], radius: 17 }
    ],
    houses: [
      { id: 'elder_house', name: 'Nhà Trưởng Làng', position: [0, 0, -46], yaw: 0, width: 13, depth: 10, height: 3.8, style: 'wealthy', doorWidth: 1.6, furniture: [{ type: 'altar', position: [0, 0, -3.8], interaction: 'truth_incense' }, { type: 'table', position: [-3, 0, -1] }, { type: 'locked_box', position: [3.5, 0.9, -2], interaction: 'number_lock' }, { type: 'cabinet', position: [-4.7, 0, 2.5] }], hidingSpots: [{ id: 'hide_elder', type: 'cabinet', position: [-4.7, 0, 2.5], exit: [-4.7, 0, 0.9] }] },
      { id: 'ancestral_hall', name: 'Từ Đường Cổ', position: [0, 0, -28], yaw: 0, width: 14, depth: 11, height: 4.5, style: 'temple', doorWidth: 2, furniture: [{ type: 'altar', position: [0, 0, -2], interaction: 'incense_order' }, { type: 'ancestral_painting', position: [0, 2, -3] }, { type: 'prison_partition', position: [0, 0, -3.5], interaction: 'rescue_lan' }, { type: 'table', position: [-4, 0, 1] }], hidingSpots: [{ id: 'hide_hall', type: 'table', position: [-4, 0, 1], exit: [-4, 0, 2.6] }] },
      { id: 'storehouse', name: 'Nhà Kho', position: [-30, 0, -11], yaw: 0, width: 11, depth: 10, height: 3.5, style: 'storage', doorWidth: 1.6, furniture: [{ type: 'shelves', position: [-4, 0, -2] }, { type: 'crates', position: [3, 0, 2] }, { type: 'prison_partition', position: [0, 0, -3], interaction: 'rescue_tuan' }, { type: 'cabinet', position: [-4, 0, 2] }], hidingSpots: [{ id: 'hide_store', type: 'cabinet', position: [-4, 0, 2], exit: [-2.5, 0, 2] }] },
      { id: 'barn', name: 'Chuồng Trại', position: [30, 0, -11], yaw: 0, width: 12, depth: 10, height: 3.4, style: 'barn', doorWidth: 2, furniture: [{ type: 'hay', position: [-3, 0, -2] }, { type: 'workbench', position: [3, 0, 0] }, { type: 'prison_partition', position: [0, 0, -3], interaction: 'rescue_hung' }, { type: 'table', position: [-3, 0, 2] }], hidingSpots: [{ id: 'hide_barn', type: 'table', position: [-3, 0, 2], exit: [-3, 0, 3.6] }] },
      { id: 'linh_house', name: 'Nhà Linh', position: [-28, 0, 24], yaw: 0, width: 10, depth: 9, height: 3.2, style: 'humble', doorWidth: 1.4, furniture: [{ type: 'bed', position: [3, 0, -2] }, { type: 'table', position: [0, 0, -1] }, { type: 'chest', position: [-3, 0, -2], interaction: 'pendant_chest' }, { type: 'cabinet', position: [-3, 0, 2] }], hidingSpots: [{ id: 'hide_linh', type: 'cabinet', position: [-3, 0, 2], exit: [-1.5, 0, 2] }] },
      { id: 'healer_house', name: 'Nhà Thầy Thuốc', position: [28, 0, 24], yaw: 0, width: 11, depth: 9, height: 3.4, style: 'healer', doorWidth: 1.5, furniture: [{ type: 'medicine_shelf', position: [3.5, 0, -2] }, { type: 'table', position: [-1, 0, -1] }, { type: 'bed', position: [-3.5, 0, -2] }, { type: 'cabinet', position: [3.5, 0, 2] }], hidingSpots: [{ id: 'hide_healer', type: 'cabinet', position: [3.5, 0, 2], exit: [2, 0, 2] }] }
    ],
    companions: [
      { id: 'lan', position: [0, 0, -32.5], rescueInteraction: 'rescue_lan', safePosition: [-3, 0, 47] },
      { id: 'tuan', position: [-30, 0, -15], rescueInteraction: 'rescue_tuan', safePosition: [0, 0, 48] },
      { id: 'hung', position: [30, 0, -15], rescueInteraction: 'rescue_hung', safePosition: [3, 0, 47] }
    ],
    pickups: [
      { id: 'pickup_key', item: 'rusty_key', amount: 1, position: [27, 0.35, 23] },
      { id: 'pickup_cutters', item: 'bolt_cutters', amount: 1, position: [33, 0.9, -11] },
      { id: 'pickup_talisman_gate', item: 'talisman', amount: 1, position: [-2.5, 0.72, 49] },
      { id: 'pickup_talisman_hall', item: 'talisman', amount: 1, position: [-5, 0.9, -26] },
      { id: 'pickup_talisman_linh', item: 'talisman', amount: 1, position: [-25, 0.6, 22] },
      { id: 'pickup_battery_healer', item: 'battery', amount: 1, position: [31.5, 1.27, 22] },
      { id: 'pickup_battery_store', item: 'battery', amount: 1, position: [-34, 1, -12] },
      { id: 'pickup_battery_elder', item: 'battery', amount: 1, position: [-3, 0.94, -47] },
      { id: 'pickup_medicine_healer', item: 'medicine', amount: 1, position: [31.5, 0.75, 22] },
      { id: 'pickup_medicine_barn', item: 'medicine', amount: 1, position: [27, 0.94, -9] }
    ],
    paths: [ [[0, 0, 61], [0, 0, 5]], [[0, 0, -5], [0, 0, -40]], [[0, 0, 30], [-28, 0, 30]], [[0, 0, 30], [28, 0, 30]], [[0, 0, -4], [-30, 0, -4]], [[0, 0, -4], [30, 0, -4]], [[17, 0, -4], [25, 0, -24], [39, 0, -25]] ],
    safeArea: { center: [0, 0, 48], radius: 5, activeAfterFirstRescue: true, ghostMayEnter: false, sanityRecovery: true }
  });

  Game.ExplorationNotes = deepFreeze([
    { id: 'note_gate', title: 'Dấu chân của Hùng', author: 'Hùng', date: 'Đêm mắc kẹt', position: [-2, .73, 49], paragraphs: ['Minh, tớ đã tới Nhà Trưởng Làng. Cửa có ba vòng số. Trang sổ bên giếng chép câu: Ba người giữ lễ, một giếng nhận lời, chín hồi chuông tiễn. Tớ ghi lại ở đây để cậu khỏi phải mò trong sương.', 'Có tiếng Tuấn ở Nhà Kho, phía tây. Tớ đi tìm kìm ở Chuồng Trại phía đông. Nếu tìm thấy tớ, đừng bỏ Lan lại.'], clue: 'Cửa Nhà Trưởng Làng: 3 — 1 — 9. Mã hộp bên trong là một câu đố riêng.' },
    { id: 'note_elder', title: 'Ngăn gỗ không đáy', author: 'Lan', date: 'Đêm mắc kẹt', position: [2, .8, -43], paragraphs: ['Gương không còn trong hộp. Có vết trượt mới dưới bàn thờ. Hộp số giữ bài chỉ dẫn cho ba nén nhang.', 'Hai ngôi mộ hoa mận sẽ mở hộp. Đọc tờ giấy bên trong rồi quay lại bàn thờ.'], clue: 'Bia mộ → hộp bốn số → bàn thờ → Gương Đồng.' },
    { id: 'note_hall', title: 'Đừng đọc từ trái sang phải', author: 'Lan', date: 'Đêm mắc kẹt', position: [4, .8, -25], paragraphs: ['Tớ nghe một bà cụ gọi tên Linh. Bà cứ đi từ bát hương hình mầm cây đến cành lá, rồi lá rụng.', 'Bức tranh là cửa, không phải tường. Tớ sẽ thử xem phía sau có ai cần giúp…'], clue: 'Thắp Sinh → Dưỡng → Tử để tìm Lan và Chuông Đồng.' },
    { id: 'note_store', title: 'Vết cào trên khóa', author: 'Tuấn', date: 'Đêm mắc kẹt', position: [-32, .8, -8], paragraphs: ['Ổ khóa có dấu bánh xe. Trong sổ người giữ kho nói chìa nằm dưới bàn Nhà Thầy Thuốc. Đừng phí bùa vào cái khóa này.', 'Minh, nếu cậu nghe tiếng bước chân dừng ngoài tủ, hãy nín thở. Nhưng đừng cố đến lúc phải hớp khí.'], clue: 'Chìa rỉ sét tại Nhà Thầy Thuốc mở buồng giam Tuấn.' },
    { id: 'note_barn', title: 'Chiếc kìm chưa dùng', author: 'Hùng', date: 'Đêm mắc kẹt', position: [28, .8, -8], paragraphs: ['Có kìm trên bàn thợ. Tớ đã cầm nó lên thì nghe tiếng Lan ngoài sân. Khi quay lại, xích đã quấn vào chân.', 'Đừng tin người đứng ngoài nhà hoang. Họ lặp lại đúng một động tác, như bóng trong một đoạn phim cũ.'], clue: 'Kìm cắt được xích ở đây. Những bóng dân làng là ký ức năm 1994.' },
    { id: 'note_linh', title: 'Năm em đến thế gian', author: 'Lan', date: 'Đêm mắc kẹt', position: [-26, .8, 26], paragraphs: ['Ngọc bị khóa trong hòm bằng năm sinh của Linh. Cô mất năm 1994, mới mười chín tuổi. Mẹ cô viết rằng con số ấy là điều bà không bao giờ quên.', 'Mang ngọc về giếng. Những người khác đã chỉ nhìn thấy đôi mắt, không ai nhìn thấy con người.'], clue: '1994 − 19 = 1975. Đó là mã chiếc hòm hoa ban.' },
    { id: 'note_healer', title: 'Lời nhắn dưới bàn thuốc', author: 'Tuấn', date: 'Đêm mắc kẹt', position: [25, .8, 26], paragraphs: ['Tớ thấy một chiếc chìa dưới bàn, có dấu bánh xe. Có lẽ mở được Nhà Kho. Pin và băng thuốc vẫn còn trên kệ.', 'Linh không phải nguồn bệnh. Bản ghi của thầy thuốc xác nhận nước giếng chứa độc chất. Hãy mang lời chứng ra khỏi đây.'], clue: 'Tìm dưới bàn để lấy chìa; tìm trên kệ để lấy pin và thuốc.' }
  ]);
  Game.Puzzles = deepFreeze({
    elder_entry: { id: 'elder_entry', type: 'code', location: 'elder_house', title: 'Khóa cửa ba vòng', description: 'Ba người giữ lễ. Một giếng nhận lời. Chín hồi chuông tiễn.', digits: 3, answer: '319', unlocks: ['door_elder_house'], rewardItems: [], wrongAttemptNoise: .45, wrongAttemptSanityCost: 1, retryCooldown: 1, success: 'Khóa cửa đã mở. Tiếng gỗ rên vang trong nhà.', failure: 'Ba vòng khóa không khớp. Đọc lời nhắn của Hùng ở cổng.' },
    truth_incense: { id: 'truth_incense', type: 'sequence', location: 'elder_house', title: 'Ngăn bàn thờ giấu gương', description: 'Vết xước dưới bàn thờ cho thấy có một ngăn kéo. Hộp số cất lời chỉ dẫn.', requiresPuzzle: 'number_lock', inscription: 'Soi mầm — Giữ cành — Trả lá.', visualOrder: ['life', 'death', 'birth'], answer: ['birth', 'life', 'death'], labels: { birth: 'Sinh · Mầm cây', life: 'Dưỡng · Cành lá', death: 'Tử · Lá rụng' }, rewardItems: ['truth_mirror'], wrongAttemptNoise: .6, wrongAttemptSanityCost: 3, retryCooldown: 2, success: 'Ngăn kéo trượt ra, để lộ Gương Đồng dưới lớp vải cũ.', failure: 'Ngăn bàn thờ chưa mở. Mở hộp bốn số và đọc thứ tự nhang bên trong.' },
    number_lock: { id: 'number_lock', type: 'code', location: 'elder_house', title: 'Chiếc hộp của Trưởng Làng', description: 'Bốn vòng đồng đã mòn vì những lần xoay. Bên nắp hộp khắc hai cành hoa mận.', digits: 4, answer: '9123', clueJournals: ['journal_04'], clueGraves: ['grave_mai', 'grave_an'], rewardItems: [], wrongAttemptNoise: 0.55, wrongAttemptSanityCost: 2, retryCooldown: 1, success: 'Trong hộp chỉ còn mảnh giấy: SOI MẦM — GIỮ CÀNH — TRẢ LÁ. Gương nằm trong ngăn bàn thờ. Thắp Sinh, Dưỡng, Tử.', failure: 'Các vòng số cứng lại. Từ xa có tiếng móng tay cào gỗ.' },
    incense_order: { id: 'incense_order', type: 'sequence', location: 'ancestral_hall', title: 'Ba nén nhang', description: 'Ba bát hương nằm dưới bức tranh một đời người. Mỗi bát mang một hình vẽ.', inscription: 'Từ đất mà sinh. Nhờ đời mà lớn. Rụng xuống mà về.', visualOrder: ['death', 'birth', 'life'], answer: ['birth', 'life', 'death'], labels: { birth: 'Sinh · Mầm cây', life: 'Dưỡng · Cành lá', death: 'Tử · Lá rụng' }, clueJournals: ['journal_05'], unlocks: ['rescue_lan'], rewardItems: ['soul_bell'], wrongAttemptNoise: 0.7, wrongAttemptSanityCost: 4, retryCooldown: 2, success: 'Bức tranh dịch sang một bên. Trong mật thất, Lan đang gọi bạn.', failure: 'Cả ba nén nhang tắt ngấm. Một luồng hơi lạnh tràn qua bàn thờ.' },
    rescue_tuan: { id: 'rescue_tuan', type: 'item_lock', location: 'storehouse', title: 'Khóa buồng Nhà Kho', requiresItems: ['rusty_key'], consumeItems: false, rescuedCompanion: 'tuan', holdSeconds: 1.5, noise: 0.35, failure: 'Ổ khóa có dấu hình bánh xe. Cần tìm chìa khóa rỉ sét.' },
    rescue_hung: { id: 'rescue_hung', type: 'item_lock', location: 'barn', title: 'Xích sắt Chuồng Trại', requiresItems: ['bolt_cutters'], consumeItems: false, rescuedCompanion: 'hung', holdSeconds: 3, noise: 1, failure: 'Xích sắt thường, nhưng quá dày để bẻ bằng tay. Cần kìm cắt sắt.' },
    rescue_lan: { id: 'rescue_lan', type: 'quest_lock', location: 'ancestral_hall', title: 'Mật thất Từ Đường', requiresPuzzle: 'incense_order', rescuedCompanion: 'lan', holdSeconds: 1, noise: 0.2, failure: 'Bức tranh thờ che một lối đi. Ba bát hương có thể là cơ cấu mở cửa.' },
    pendant_chest: { id: 'pendant_chest', type: 'code', location: 'linh_house', title: 'Chiếc hòm hoa ban', description: 'Năm con đến với mẹ. Linh mất năm 1994, hưởng dương 19 tuổi.', digits: 4, answer: '1975', wrongAttemptNoise: .25, wrongAttemptSanityCost: 1, retryCooldown: 1, failure: 'Năm sinh chưa đúng. Đọc ghi chú của Lan trong nhà.', rewardItems: ['linh_pendant'], holdSeconds: 1.2, noise: 0.25, success: 'Trong lớp vải cũ là một nửa ngọc bội. Có ai vừa thở dài ngay sau lưng.' },
    well_ritual: { id: 'well_ritual', type: 'ritual', location: 'well', title: 'Trả lại tên em', requiresItems: ['truth_mirror', 'soul_bell', 'linh_pendant'], order: ['truth_mirror', 'soul_bell', 'linh_pendant'], consumesRelics: false, duration: 18, requiresAllFriends: false, requiresAllJournals: false, completionFlag: 'ritualComplete', failure: 'Ba chỗ trống trên đàn tế vẫn còn chờ đủ tín vật.', success: 'Ba sợi xích huyết thuật tan ra. Cổng Làng đã mở.' }
  });

  Game.Quests = deepFreeze([
    { id: 'awakening', title: 'Sau màn sương đỏ', objective: 'Nhặt trang sổ bên Cổng Làng.', condition: { journal: 'journal_01' }, next: 'search_village', subtasks: ['Kiểm tra cổng bị khóa', 'Đọc trang sổ của Lan'] },
    { id: 'search_village', title: 'Những tiếng gọi trong mưa', objective: 'Tìm ba tín vật và giải cứu bạn bè trước khi lời nguyền hoàn tất.', condition: { itemsAll: ['truth_mirror', 'soul_bell', 'linh_pendant'] }, next: 'return_to_well', subtasks: ['Gương Đồng: Nhà Trưởng Làng', 'Chuông Đồng và Lan: Từ Đường', 'Ngọc Bội: Nhà Linh', 'Tuấn: Nhà Kho · Hùng: Chuồng Trại'] },
    { id: 'return_to_well', title: 'Một người tên Linh', objective: 'Mang ba tín vật về Đàn Tế Giếng Cổ. Bạn vẫn có thể tìm nhật ký và cứu người trước khi làm lễ.', condition: { flag: 'ritualComplete' }, next: 'escape', subtasks: ['Đặt Gương, Chuông, rồi Ngọc', 'Tám trang nhật ký sẽ trả lại toàn bộ sự thật'] },
    { id: 'escape', title: 'Bên kia cánh cổng', objective: 'Đi qua Cổng Làng trước khi màn sương khép lại.', condition: { flag: 'escaped' }, next: null, subtasks: ['Những người đã cứu đang chờ bên cổng'] }
  ]);

  // Đối thoại dùng giây; audio cue là tên bộ tổng hợp, không phải URL âm thanh.
  Game.Dialogue = deepFreeze({
    intro: [
      { speaker: 'Hùng', text: 'Đường phía sau sạt rồi. Dưới kia có mái nhà… mình trú mưa đã.', duration: 4.8, cue: 'rain' },
      { speaker: 'Tuấn', text: 'Lệ Thôn? Sao cổng làng lạnh như đá dưới suối thế này?', duration: 4.5 },
      { speaker: 'Lan', text: 'Khoan… mọi người có nghe tiếng ai khóc không?', duration: 4, cue: 'distant_cry' },
      { speaker: 'Minh', text: 'Lan? Tuấn! Hùng! Đừng đi vào trong sương!', duration: 4.2, cue: 'stinger' }
    ],
    awakening: [{ speaker: 'Minh', text: 'Mình… đang ở cổng? Mọi người đâu rồi?', duration: 4 }, { speaker: 'Minh', text: 'Ba sợi xích. Chạm vào mà như bị bỏng…', duration: 4 }],
    firstGhost: [{ speaker: 'Minh', text: 'Có người bên giếng… Không. Đừng quay lại nhìn mình.', duration: 4.5, cue: 'heartbeat' }],
    lanNearby: [{ speaker: 'Lan', text: 'Minh! Sau bức tranh! Đừng thắp theo vị trí… hãy đọc một đời người!', duration: 5.5 }],
    tuanNearby: [{ speaker: 'Tuấn', text: 'Minh ơi! Ổ khóa ở ngoài. Tìm chìa có dấu bánh xe!', duration: 4.5 }],
    hungNearby: [{ speaker: 'Hùng', text: 'Tớ ở đây! Có kìm trên bàn… nhanh lên, nhưng đừng chạy!', duration: 4.5 }],
    rescueLan: [{ speaker: 'Lan', text: 'Cô ấy tên Linh. Họ đã xóa tên cô ấy khỏi mọi bài vị.', duration: 5 }, { speaker: 'Minh', text: 'Ra cổng đợi tớ. Mình sẽ đưa tất cả ra ngoài.', duration: 4 }],
    rescueTuan: [{ speaker: 'Tuấn', text: 'Tớ nghe tiếng gõ suốt… cứ ba tiếng một. Tưởng cậu, nhưng nó gõ từ trong tường.', duration: 6 }, { speaker: 'Minh', text: 'Đi theo lối giữa làng. Đợi ở cổng, đừng quay lại.', duration: 4 }],
    rescueHung: [{ speaker: 'Hùng', text: 'Tớ đã thấy cô ấy khóc khi nhìn viên ngọc. Cô ấy vẫn nhớ.', duration: 5 }, { speaker: 'Minh', text: 'Cậu còn đi được chứ? Ra chỗ cổng cùng mọi người.', duration: 4 }],
    mirrorFound: [{ speaker: 'Minh', text: 'Trong gương… là những thùng thuốc cạnh đầu nguồn.', duration: 4.5 }],
    bellFound: [{ speaker: 'Lan', text: 'Chuông gọi tên người mất. Đừng gọi cô ấy là quỷ nữa.', duration: 4.5 }],
    pendantFound: [{ speaker: 'Minh', text: 'Hoa ban… giống hình trên chiếc hòm. Đây là đồ của Linh.', duration: 4.5 }],
    ritual: [{ speaker: 'Minh', text: 'Chiếc gương này trả lại sự thật mà họ chôn giấu.', duration: 5 }, { speaker: 'Minh', text: 'Linh. Tôi gọi tên cô. Cô không phải yêu nghiệt.', duration: 5.5, cue: 'ritual_bell' }, { speaker: 'Minh', text: 'Mẹ cô đã giữ lời. Cô vẫn luôn được yêu thương.', duration: 5.5 }],
    ritualIncompleteTruth: [{ speaker: 'Minh', text: 'Xích đã tan… nhưng tiếng khóc vẫn còn.', duration: 4 }],
    allJournals: [{ speaker: 'Minh', text: 'Đủ rồi. Không ai có thể nói rằng họ không biết nữa.', duration: 4.5 }],
    curseWarning: [{ speaker: 'Minh', text: 'Sương đang dày lên. Mình không còn nhiều thời gian.', duration: 4 }],
    gateLocked: [{ speaker: 'Minh', text: 'Kìm không cắt được thứ này. Cả ba sợi xích đều hướng về giếng.', duration: 4.5 }],
    hiding: [{ speaker: 'Minh', text: 'Im nào… đừng để cô ấy nghe thấy.', duration: 3 }]
  });

  Game.Cutscenes = deepFreeze({
    intro: { id: 'intro', duration: 36, shots: [{"start":0,"end":6,"from":{"position":[3.4,2.4,57],"target":[0,3.3,61],"fov":52},"to":{"position":[2.8,2.1,56],"target":[0,3.0,61],"fov":52}},{"start":6,"end":12,"from":{"position":[-2.5,1.65,54.4],"target":[-1.6,1.53,52],"fov":42},"to":{"position":[-2.1,1.62,54.1],"target":[-1.6,1.53,52],"fov":39}},{"start":12,"end":18,"from":{"position":[2,1.65,54.6],"target":[1.6,1.5,52],"fov":44},"to":{"position":[1.7,1.62,54.2],"target":[1.6,1.5,52],"fov":41}},{"start":18,"end":25,"from":{"position":[0,1.5,55],"target":[0,1.2,44],"fov":59},"to":{"position":[-1,1.4,54],"target":[0,1.2,44],"fov":56}},{"start":25,"end":30,"from":{"position":[3,0.6,54],"target":[0,1.1,36],"fov":68},"to":{"position":[0,0.35,55],"target":[0,1.1,36],"fov":65}},{"start":30,"end":36,"from":{"position":[0,0.28,55],"target":[0,1.7,45],"fov":65},"to":{"position":[0,1.72,55],"target":[0,1.7,45],"fov":62}}], cues: [{"time":1,"speaker":"MINH","text":"Lệ Thôn… có ai còn sống ở đây không?","duration":5},{"time":7,"speaker":"LAN","text":"Cửa nhà nào cũng dán bùa. Mình không nên ở lại.","duration":5},{"time":13,"speaker":"TUẤN","text":"Chờ đã. Có tiếng người dưới giếng.","duration":4},{"time":19,"speaker":"HÙNG","text":"Minh! Đừng buông tay!","sound":"stinger","duration":5},{"time":30,"speaker":"MINH","text":"Lan… Tuấn… Hùng? Mọi người đâu rồi?","duration":5}], skippable: true, dialogue: 'intro', frames: [{ time: 0, position: [0, 2.3, 66], target: [0, 2, 57], fov: 65 }, { time: 5, position: [-4, 2.1, 57], target: [2, 1.6, 51], fov: 65 }, { time: 10, position: [0, 1.75, 48], target: [0, 1.4, 0], fov: 72 }, { time: 15, position: [0, 0.4, 55], target: [1, 2.5, 54], fov: 75 }, { time: 18, position: [0, 1.72, 55], target: [0, 1.72, 45], fov: 75 }], onComplete: 'begin_gameplay' },
    ritual: { id: 'ritual', duration: 32, shots: [{"start":0,"end":5,"from":{"position":[2,2.4,3],"target":[0,1,0],"fov":48},"to":{"position":[1.5,2,2.5],"target":[0,1,0],"fov":45}},{"start":5,"end":10,"from":{"position":[-1.2,1.4,1.9],"target":[0,1,0],"fov":44},"to":{"position":[-0.9,1.3,1.7],"target":[0,1,0],"fov":41}},{"start":10,"end":16,"from":{"position":[3,2,2],"target":[0,1.65,0],"fov":42},"to":{"position":[2.6,1.9,1.8],"target":[0,1.65,0],"fov":39}},{"start":16,"end":22,"from":{"position":[0.35,2.13,1.7],"target":[0,2.06,0.05],"fov":38},"to":{"position":[0.25,2.1,1.4],"target":[0,2.06,0.05],"fov":35}},{"start":22,"end":27,"from":{"position":[-3,3.5,-2],"target":[0,1.3,0],"fov":58},"to":{"position":[-4,4.2,-3],"target":[0,1.3,0],"fov":55}},{"start":27,"end":32,"from":{"position":[0,1.72,5.5],"target":[0,1.5,0],"fov":60},"to":{"position":[0,1.72,6.5],"target":[0,1.5,0],"fov":57}}], cues: [{"time":1,"speaker":"MINH","text":"Gương giữ sự thật. Không ai được xóa tên em nữa.","duration":5},{"time":7,"speaker":"MINH","text":"Chuông gọi người đã khuất trở về.","sound":"ritual_bell","duration":5},{"time":14,"speaker":"MINH","text":"Linh… chúng tôi đem ngọc bội về cho em.","duration":6},{"time":24,"speaker":"","text":"Tiếng khóc lặng đi. Từ phía cổng, ba sợi xích rạn vỡ.","sound":"ritual_bell","duration":6}], skippable: true, dialogue: 'ritual', frames: [{ time: 0, position: [0, 2, 6], target: [0, 1, 0], fov: 60 }, { time: 5, position: [-4, 2.6, 2], target: [0, 1.2, 0], fov: 55 }, { time: 10, position: [3, 1.8, 1], target: [0, 1.6, 0], fov: 50 }, { time: 15, position: [0, 4, -5], target: [0, 1.4, 1], fov: 65 }, { time: 18, position: [0, 1.72, 5.5], target: [0, 1.5, 0], fov: 75 }], onComplete: 'complete_ritual' },
    escape: { id: 'escape', duration: 16, shots: [{"start":0,"end":5,"from":{"position":[0,1.72,57],"target":[0,1.6,68],"fov":55},"to":{"position":[0,1.72,61],"target":[0,1.6,68],"fov":52}},{"start":5,"end":10,"from":{"position":[5,2.5,64],"target":[0,1.5,57],"fov":50},"to":{"position":[4,2.2,65],"target":[0,1.5,57],"fov":47}},{"start":10,"end":16,"from":{"position":[0,3,69],"target":[0,2,42],"fov":54},"to":{"position":[0,5,75],"target":[0,2,42],"fov":51}}], cues: [], skippable: true, frames: [{ time: 0, position: [0, 1.72, 57], target: [0, 2, 64], fov: 70 }, { time: 4, position: [4, 3, 63], target: [0, 1.5, 58], fov: 65 }, { time: 10, position: [0, 4, 72], target: [0, 2, 50], fov: 60 }], onComplete: 'show_ending' },
    jumpscare: { id: 'jumpscare', duration: 2.6, skippable: false, relativeToGhost: true, frames: [{ time: 0, offset: [0, 1.6, 1.4], targetOffset: [0, 1.6, 0], fov: 75 }, { time: 0.35, offset: [0, 1.65, 0.65], targetOffset: [0, 1.6, 0], fov: 90 }, { time: 2.6, offset: [0.1, 1.2, 0.7], targetOffset: [0, 1.6, 0], fov: 80 }], onComplete: 'show_death' }
  });

  Game.Endings = deepFreeze({
    true: { id: 'true', label: 'TRUE ENDING · GIẢI OAN', title: 'Khi giếng ngừng khóc', paragraphs: ['Bốn người bước qua cổng khi tia sáng đầu tiên chạm xuống đường đèo. Trong tay Minh, tám trang giấy không còn vết máu. Chúng chỉ còn là lời chứng của những người cuối cùng đã được lắng nghe.', 'Bên Giếng Cổ, Linh nhận lại ngọc bội. Đôi mắt dị sắc nhìn về phía một người đàn bà đang đợi dưới gốc hoa ban. Lần này, không ai gọi cô là yêu nghiệt.', 'Nhiều tháng sau, một bia tưởng niệm được dựng ở Lệ Thôn. Trên đá không khắc lời nguyền. Chỉ có tên những người đã mất, và một dòng chữ: “Chúng tôi đã biết. Chúng tôi sẽ nhớ.”'] },
    normal: { id: 'normal', label: 'NORMAL ENDING · DƯ ÂM', title: 'Những người trở về', paragraphs: ['Minh đi qua cổng cùng những người đã kịp cứu. Ba sợi xích biến mất, nhưng sau lưng họ, tiếng chuông vẫn ngân một nhịp lạc.', 'Có lời chứng chưa được tìm thấy, hoặc một bàn tay chưa được nắm lấy. Linh đã cho họ đi; nỗi oan của cô chưa thể tan hoàn toàn.', 'Mỗi mùa mưa, Minh lại nghe tiếng nước nhỏ từ căn phòng trống. Trên cửa kính mờ hơi, có một cái tên đang chờ được viết cho trọn.'] },
    bad: { id: 'bad', label: 'BAD ENDING · BỎ LẠI', title: 'Một người qua cổng', paragraphs: ['Minh chạy qua cổng một mình. Phía bên kia là con đường đèo khô ráo, như thể cơn mưa chưa từng xảy ra.', 'Điện thoại hiện ba cuộc gọi nhỡ. Từ trong máy, Lan, Tuấn và Hùng cùng hỏi một câu: “Sao cậu không quay lại?”', 'Mỗi lần nhắm mắt, Minh lại đứng bên Giếng Cổ. Dưới mặt nước đỏ, bây giờ có bốn bóng người.'] },
    curse: { id: 'curse', label: 'BAD ENDING · LỜI NGUYỀN', title: 'Người làng mới', paragraphs: ['Khi giây cuối cùng trôi qua, mọi tiếng động dừng lại. Cổng Làng lùi xa, còn Giếng Cổ bỗng ở ngay dưới chân Minh.', 'Sáng hôm sau, một tấm bài vị mới xuất hiện trong Từ Đường. Chữ còn ướt. Ngoài đèo, những người đi đường chỉ thấy một vệt sạt lở cũ.'] }
  });

  Game.UIText = deepFreeze({
    loadingTips: ['Chạy tạo tiếng động lớn. Đi chậm khi tiếng khóc ở gần.', 'Nấp chưa đủ an toàn: giữ Space để nín thở khi Linh đi ngang.', 'Đừng nín thở đến cạn thể lực. Tiếng hớp khí có thể làm lộ bạn.', 'Bùa chỉ đẩy lùi Linh tạm thời. Hãy dùng khoảng trống đó để rời đi.', 'Đèn pin giúp giữ tinh thần, nhưng có thể khiến bạn bị phát hiện.', 'Hai ngôi mộ có hoa mận giữ manh mối của chiếc hộp.', 'Khi đọc nhật ký hoặc mở bảng giải đố, thời gian sẽ tạm dừng.', 'Nghi lễ mở cổng. Cứu người và tìm lời chứng quyết định kết cục.'],
    interactions: { pickup: 'Nhặt', inspect: 'Xem', hide: 'Chui vào nấp', exitHide: 'Ra khỏi chỗ nấp', rescue: 'Giải cứu', read: 'Đọc nhật ký', open: 'Mở', ritual: 'Làm lễ siêu độ', gate: 'Kiểm tra Cổng Làng' },
    messages: { inventoryFull: 'Không thể mang thêm vật phẩm này.', noTalisman: 'Bạn không còn bùa hộ mệnh.', noBattery: 'Không còn pin dự phòng.', noMedicine: 'Không còn thuốc.', healthFull: 'Máu đã đầy.', batteryFull: 'Pin đèn vẫn đầy.', cannotUse: 'Chưa thể sử dụng lúc này.', saved: 'Đã lưu dấu chân.', saveUnavailable: 'Trình duyệt không cho lưu trên đường dẫn này. Bạn vẫn có thể tiếp tục chơi.', corruptSave: 'Dữ liệu lưu không hợp lệ hoặc khác phiên bản.', needPointerLock: 'Nhấn vào màn chơi để tiếp tục điều khiển chuột.', breathEmpty: 'Bạn không thể nín thở thêm!', ritualMissing: 'Cần đủ ba tín vật để bắt đầu nghi lễ.', escapeWarning: 'Cổng đã mở. Bạn có hai phút để rời làng.', curseExpired: 'Lời nguyền đã hoàn tất.' }
  });

  // Hợp đồng sự kiện: emit(name, payload). Thời gian dùng elapsed gameplay, không dùng Date để trừ đồng hồ.
  Game.EventNames = deepFreeze({ STATE_CHANGED: 'state:changed', NOISE: 'world:noise', INTERACTION: 'world:interaction', ITEM_ADDED: 'inventory:added', ITEM_USED: 'inventory:used', JOURNAL_FOUND: 'journal:found', PUZZLE_SOLVED: 'puzzle:solved', COMPANION_RESCUED: 'companion:rescued', QUEST_CHANGED: 'quest:changed', PLAYER_DAMAGED: 'player:damaged', PLAYER_DIED: 'player:died', GHOST_STATE: 'ghost:state', RITUAL_COMPLETE: 'ritual:complete', CURSE_WARNING: 'curse:warning', ESCAPED: 'game:escaped', SETTINGS_CHANGED: 'settings:changed', TOAST: 'ui:toast', DIALOGUE: 'ui:dialogue' });
  Game.EventBus = class EventBus {
    constructor() { this.listeners = new Map(); }
    on(name, listener) {
      if (typeof listener !== 'function') throw new TypeError('Listener phải là function.');
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(listener);
      return () => this.off(name, listener);
    }
    once(name, listener) { var off = this.on(name, function (payload) { off(); listener(payload); }); return off; }
    off(name, listener) { var group = this.listeners.get(name); if (group) { group.delete(listener); if (!group.size) this.listeners.delete(name); } }
    emit(name, payload) { var group = this.listeners.get(name); if (group) Array.from(group).forEach(function (listener) { listener(payload); }); }
    clear() { this.listeners.clear(); }
  };

  Game.Utils = Object.freeze({
    clamp: function (value, min, max) { return Math.max(min, Math.min(max, value)); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    damp: function (a, b, rate, dt) { return a + (b - a) * (1 - Math.exp(-rate * dt)); },
    formatTime: function (seconds) { var n = Math.max(0, Math.ceil(Number(seconds) || 0)); return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0'); },
    clone: clone,
    seededRandom: function (seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
    distanceXZ: function (a, b) { return Math.hypot(a[0] - b[0], a[2] - b[2]); }
  });

  Game.createNewSession = function () {
    return {
      version: Game.Config.saveVersion, seed: Game.Config.seed, elapsed: 0, curseRemaining: Game.Config.quest.curseDuration,
      escapeRemaining: Game.Config.quest.escapeGraceSeconds, phase: 'awakening',
      player: { position: Game.Config.world.spawn.position.slice(), yaw: 0, pitch: 0, health: 100, stamina: 100, sanity: 100, battery: 100, flashlightOn: true },
      inventory: { talisman: 0, battery: 1, medicine: 0 }, journals: [], collectedPickups: [], solvedPuzzles: [],
      companions: { lan: 'captive', tuan: 'captive', hung: 'captive' },
      flags: { introSeen: false, ghostAwakened: false, ritualComplete: false, escaped: false, curseExpired: false },
      triggeredDialogue: [], warningsIssued: [], stats: { distanceWalked: 0, timesHidden: 0, talismansUsed: 0, damageTaken: 0 }
    };
  };

  Game.selectEnding = function (session) {
    if (session.flags.curseExpired) return Game.Endings.curse;
    if (!session.flags.ritualComplete || !session.flags.escaped) return null;
    var rescued = ['lan', 'tuan', 'hung'].filter(function (id) { return session.companions[id] === 'rescued'; }).length;
    var known = new Set(session.journals);
    var fullTruth = Game.Lore.journals.every(function (page) { return known.has(page.id); });
    if (rescued === 3 && fullTruth) return Game.Endings.true;
    if (rescued === 0) return Game.Endings.bad;
    return Game.Endings.normal;
  };

  Game.normalizeSettings = function (source) {
    var result = clone(Game.Config.settingsDefaults);
    if (!source || typeof source !== 'object') return result;
    var ranges = { masterVolume: [0, 1], musicVolume: [0, 1], sfxVolume: [0, 1], mouseSensitivity: [0.0005, 0.005], brightness: [0.7, 1.6], fov: [60, 95] };
    Object.keys(ranges).forEach(function (key) { if (typeof source[key] === 'number' && Number.isFinite(source[key])) result[key] = Game.Utils.clamp(source[key], ranges[key][0], ranges[key][1]); });
    ['subtitles', 'reducedMotion', 'reducedFlashes'].forEach(function (key) { if (typeof source[key] === 'boolean') result[key] = source[key]; });
    if (Object.prototype.hasOwnProperty.call(Game.Config.quality, source.quality)) result.quality = source.quality;
    return result;
  };

  Game.validateSession = function (data) {
    function finite(n, lo, hi) { return typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi; }
    function ids(list, allowed) { return Array.isArray(list) && list.length <= allowed.length && new Set(list).size === list.length && list.every(function (id) { return allowed.indexOf(id) >= 0; }); }
    if (!data || data.version !== Game.Config.saveVersion || data.seed !== Game.Config.seed) return false;
    if (!finite(data.elapsed, 0, 1000000) || !finite(data.curseRemaining, 0, 1800) || !finite(data.escapeRemaining, 0, 120)) return false;
    if (!Game.Quests.some(function (quest) { return quest.id === data.phase; })) return false;
    var p = data.player;
    if (!p || !Array.isArray(p.position) || p.position.length !== 3 || !p.position.every(function (v) { return finite(v, -200, 200); })) return false;
    if (!finite(p.yaw, -1000000, 1000000) || !finite(p.pitch, -Math.PI / 2, Math.PI / 2) || typeof p.flashlightOn !== 'boolean') return false;
    if (!['health', 'stamina', 'sanity', 'battery'].every(function (key) { return finite(p[key], 0, 100); })) return false;
    if (!data.inventory || typeof data.inventory !== 'object' || Array.isArray(data.inventory)) return false;
    if (!Object.keys(data.inventory).every(function (key) { return Object.prototype.hasOwnProperty.call(Game.Items, key) && Number.isInteger(data.inventory[key]) && finite(data.inventory[key], 0, Game.Items[key].stackLimit); })) return false;
    if (!ids(data.journals, Game.Lore.journals.map(function (j) { return j.id; }))) return false;
    if (data.notes !== undefined && !ids(data.notes, Game.ExplorationNotes.map(function (note) { return note.id; }))) return false;
    if (!ids(data.collectedPickups, Game.WorldLayout.pickups.map(function (p) { return p.id; })) || !ids(data.solvedPuzzles, Object.keys(Game.Puzzles))) return false;
    if (!data.companions || !['lan', 'tuan', 'hung'].every(function (id) { return ['captive', 'rescued', 'lost'].indexOf(data.companions[id]) >= 0; })) return false;
    if (!data.flags || !['introSeen', 'ghostAwakened', 'ritualComplete', 'escaped', 'curseExpired'].every(function (key) { return typeof data.flags[key] === 'boolean'; })) return false;
    if (!ids(data.triggeredDialogue, Object.keys(Game.Dialogue)) || !ids(data.warningsIssued, Game.Config.quest.warningThresholds)) return false;
    if (!data.stats || !['distanceWalked', 'timesHidden', 'talismansUsed', 'damageTaken'].every(function (key) { return finite(data.stats[key], 0, 10000000); })) return false;
    if (data.flags.escaped && !data.flags.ritualComplete) return false;
    if (data.flags.ritualComplete && !Game.Puzzles.well_ritual.requiresItems.every(function (id) { return data.inventory[id] === 1; })) return false;
    return true;
  };

  // localStorage có thể bị chặn trên file://. Không để lỗi lưu làm ngừng game.
  Game.Storage = Object.freeze({
    save: function (session) {
      if (!Game.validateSession(session)) return { ok: false, reason: 'invalid' };
      try { var serialized = JSON.stringify(session); if (serialized.length > Game.Config.storage.maxSaveBytes) return { ok: false, reason: 'too_large' }; global.localStorage.setItem(Game.Config.storage.saveKey, serialized); return { ok: true }; }
      catch (error) { return { ok: false, reason: 'unavailable' }; }
    },
    load: function () {
      try { var raw = global.localStorage.getItem(Game.Config.storage.saveKey); if (!raw) return { ok: false, reason: 'empty' }; if (raw.length > Game.Config.storage.maxSaveBytes) return { ok: false, reason: 'invalid' }; var data = JSON.parse(raw); return Game.validateSession(data) ? { ok: true, data: data } : { ok: false, reason: 'invalid' }; }
      catch (error) { return { ok: false, reason: error instanceof SyntaxError ? 'invalid' : 'unavailable' }; }
    },
    clearSave: function () { try { global.localStorage.removeItem(Game.Config.storage.saveKey); return true; } catch (error) { return false; } },
    loadSettings: function () { try { return Game.normalizeSettings(JSON.parse(global.localStorage.getItem(Game.Config.storage.settingsKey) || 'null')); } catch (error) { return clone(Game.Config.settingsDefaults); } },
    saveSettings: function (settings) { try { global.localStorage.setItem(Game.Config.storage.settingsKey, JSON.stringify(Game.normalizeSettings(settings))); return true; } catch (error) { return false; } }
  });
}(window));
