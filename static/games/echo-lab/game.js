(() => {
  'use strict';
  const { Game, levels, chapters, kind, switchNames, switchSymbols, WIDTH, HEIGHT, FPS, MAX_ECHOES } = EchoCore;
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d'), dialog = $('dialog');
  const colors = { gold: '#efc17b', mint: '#bce5cd', cyan: '#83d9e3', pink: '#e8a4c9', white: '#edf2e6' };
  const echoColors = [colors.cyan, colors.pink, colors.mint];
  let palette = chapters[0];
  let completed = [];
  try { const saved = JSON.parse(localStorage.getItem('echo-lab-progress-v1') || '[]'); if (Array.isArray(saved)) completed = saved.filter(n => Number.isInteger(n) && n >= 0 && n < levels.length); } catch {}
  const game = new Game();
  const keys = { left: false, right: false, jump: false, interact: false };
  let paused = false, audioEnabled = false, audioContext, toastTimer, lastTime = 0, accumulator = 0, lastUI = 0, visualTime = 0, lastStatus = 'ready', previousSwitches = '';
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => { reducedMotion = e.matches; });
  const keyMap = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyF: 'interact' };
  const trackNodes = [];

  function sound(type) {
    if (!audioEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      audioContext.resume();
      const notes = { switch: [440, 660], rewind: [740, 554, 370, 185], win: [392, 494, 587, 784], jump: [220, 330], dead: [170, 120, 85] }[type] || [400];
      notes.forEach((frequency, i) => {
        const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), start = audioContext.currentTime + i * .065;
        oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.035, start + .01); gain.gain.exponentialRampToValueAtTime(.001, start + .18);
        oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + .2);
      });
    } catch { audioEnabled = false; $('sound').textContent = '声音不可用'; $('sound').setAttribute('aria-pressed', 'false'); }
  }
  function notify(text) {
    $('announcement').textContent = text;
    $('toast').textContent = text; $('toast').classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3400);
  }
  function clearKeys() { Object.keys(keys).forEach(k => keys[k] = false); document.querySelectorAll('[data-hold]').forEach(b => b.classList.remove('held')); }
  function closeDialog() { dialog.close(); clearKeys(); lastTime = 0; accumulator = 0; canvas.focus({ preventScroll: true }); }
  function modal(label, title, body, actions) {
    clearKeys(); $('dialog-label').textContent = label; $('dialog-title').textContent = title; $('dialog-body').innerHTML = body; $('dialog-actions').replaceChildren();
    actions.forEach((action, i) => { const button = document.createElement('button'); button.textContent = action.label; if (i === 0) button.className = 'primary'; button.onclick = () => { closeDialog(); action.run?.(); }; $('dialog-actions').append(button); });
    if (!dialog.open) dialog.showModal();
  }
  function showHelp() {
    modal('HOW TO PLAY / 实验说明', '让过去，帮现在一把。',
      '<ol><li><strong>A / D 或 ← / → 移动，空格跳跃。</strong>也可用 W / ↑ 跳跃；按住跳得更高。<strong>F 转动附近镜子。</strong></li><li>走、等、跳、推箱、转镜，落地后按 <strong>E 留下分身</strong>。分身会从头重演这段操作。</li><li><strong>分身也能推箱、被箱子载着走、乘升降台。</strong>彼此穿过，但箱子或机关变了，分身的路线也可能变。它碰到红色危险区后会失效，本轮的你仍可行动。</li></ol><p>最多 3 个分身，前 3 章每轮 24 秒，后 2 章 32 秒。播完后停止操作，但仍受物理影响。回溯、重试都会重置箱子、镜面、升降台及所有机关；记忆开关的常亮只持续<strong>本轮</strong>。</p><p><strong>◎ 感应</strong>：靠近才亮 · <strong>∞ 记忆</strong>：碰过常亮 · <strong>◷ 一次性</strong>：限时且不可续期 · <strong>▣ 配重</strong>：只认箱子 · <strong>⇆ 供能</strong>：实际跑动才充能 · <strong>☼ 接收器</strong>：只认金色光束。</p><p><strong>R</strong> 重试 · <strong>Z</strong> 撤回分身 · <strong>P / Esc</strong> 暂停。25 关全部开放；通关标记仅保存在本浏览器。复制本关链接可直接邀请朋友挑战。</p>',
      [{ label: '明白了，开始实验' }]);
  }
  function buildTracks() {
    $('tracks').replaceChildren(); trackNodes.length = 0;
    for (let i = 0; i < 4; i++) {
      const row = document.createElement('div'); row.className = 'track'; row.style.setProperty('--track-color', i ? echoColors[i - 1] : colors.gold);
      row.innerHTML = `<span class="track-label"><i class="track-dot"></i>${i ? `分身 0${i}` : '现在的你'}</span><div class="track-lane"><div class="track-fill"></div><div class="track-cursor"></div></div><span class="track-state"></span>`;
      $('tracks').append(row); trackNodes.push({ row, fill: row.querySelector('.track-fill'), cursor: row.querySelector('.track-cursor'), state: row.querySelector('.track-state') });
    }
  }
  function buildNavigation() {
    $('levels').replaceChildren();
    levels.forEach((level, i) => {
      if (level.chapter !== game.level.chapter) return;
      const button = document.createElement('button'); button.textContent = String(i + 1).padStart(2, '0'); button.title = level.title;
      button.setAttribute('aria-label', `实验室 ${i + 1}：${level.title}${completed.includes(i) ? '，已通关' : ''}`); button.setAttribute('aria-current', String(i === game.index));
      if (completed.includes(i)) button.classList.add('completed');
      button.onclick = () => changeRoom(i); $('levels').append(button);
    });
    $('completion-count').textContent = `${completed.length} / ${levels.length} 已通关`;
    $('room-catalog').replaceChildren();
    chapters.forEach((chapter, ci) => {
      const section = document.createElement('section'); section.style.setProperty('--chapter-accent', chapter.accent);
      const heading = document.createElement('h2'); heading.textContent = `0${ci + 1} / ${chapter.title}`;
      const desc = document.createElement('p'); desc.textContent = chapter.subtitle;
      const grid = document.createElement('div'); grid.className = 'room-grid';
      levels.forEach((level, i) => {
        if (level.chapter !== ci) return;
        const button = document.createElement('button'); button.dataset.room = String(i + 1);
        button.setAttribute('aria-current', String(i === game.index));
        button.innerHTML = `<b>${String(i + 1).padStart(2, '0')} ${completed.includes(i) ? '✓' : ''}</b><span>${level.title}</span><small>${[...new Set(level.plates.map(p => switchNames[kind(p)]))].join(' · ') || '移动踏板'}</small>`;
        button.title = level.objective; button.onclick = () => changeRoom(i); grid.append(button);
      });
      section.append(heading, desc, grid); $('room-catalog').append(section);
    });
  }
  function changeRoom(i) {
    if (i === game.index) { $('room-picker').open = false; canvas.focus({ preventScroll: true }); return; }
    history.replaceState(null, '', `#room=${game.index + 1}`);
    if (game.tick || game.echoes.length) modal('CHANGE ROOM / 切换实验室', '离开当前实验？', '<p>本关正在录制的轨迹和分身会清空，已通关进度会保留。</p>', [{ label: '切换实验室', run: () => loadLevel(i) }, { label: '继续当前实验' }]);
    else loadLevel(i);
  }
  function loadLevel(index) {
    game.load(index); paused = false; lastStatus = 'ready'; previousSwitches = ''; clearKeys(); accumulator = 0; lastTime = 0;
    const level = game.level;
    palette = chapters[level.chapter]; colors.mint = palette.accent;
    for (const key of ['bg', 'surface', 'raised', 'border', 'muted']) document.documentElement.style.setProperty(`--${key}`, palette[key]);
    document.documentElement.style.setProperty('--mint', palette.accent);
    document.querySelector('meta[name="theme-color"]').content = palette.bg;
    $('chapter-label').textContent = `CHAPTER 0${level.chapter + 1} / ${palette.title}`;
    $('chapter-title').textContent = level.title; $('chapter-subtitle').textContent = level.subtitle; $('room-label').textContent = `实验室 ${String(index + 1).padStart(2, '0')}`;
    document.title = `${String(index + 1).padStart(2, '0')} ${level.title} · 回声实验室`;
    history.replaceState(null, '', `#room=${game.index + 1}`); $('room-picker').open = false;
    document.querySelector('.clock-limit').textContent = `/ ${game.maxTicks / FPS} s`;
    document.querySelectorAll('.timeline-ruler span').forEach((n, i) => { n.textContent = `${game.maxTicks / FPS * i / 4} s`; });
    $('objective').textContent = level.objective; $('field-note').textContent = level.note; $('hint-text').textContent = level.hint; $('hint-text').hidden = true; $('hint').setAttribute('aria-expanded', 'false'); $('hint').innerHTML = '需要一点提示？ <span aria-hidden="true">＋</span>';
    $('circuit-list').innerHTML = level.plates.map(p => `<span class="circuit" data-plate="${p.id}" title="${switchNames[kind(p)]}"><b>${p.id} ${switchSymbols[kind(p)]}</b><span>未激活</span></span>`).join('');
    const tips = { plate: '脚踩保持', box: '只认箱子', near: '角色靠近才亮', latch: '触碰后本轮常亮', fuse: '限时 · 本轮只用一次', motion: '跑动充能 · 停下衰减', light: '只认金色光束' };
    $('device-legend').innerHTML = [...new Set(level.plates.map(kind))].map(k => `<div><b>${switchSymbols[k]}</b><span>${switchNames[k]}</span><small>${tips[k]}</small></div>`).join('') + (level.mirrors ? '<div><b>／</b><span>反射镜</span><small>靠近按 F 转向</small></div>' : '');
    buildNavigation(); updateUI(); draw();
    canvas.focus({ preventScroll: true });
  }
  function doRewind() {
    if (dialog.open || paused) return;
    const error = game.rewind();
    if (error) { notify(error); return; }
    sound('rewind'); lastStatus = 'ready'; clearKeys(); accumulator = 0; previousSwitches = '';
    const flash = $('rewind-flash'); flash.classList.remove('active'); void flash.offsetWidth; flash.classList.add('active');
    notify(`分身 0${game.echoes.length} 已留下。开始移动，让时间再次流动。`); updateUI();
  }
  function doRetry() { game.retry(); paused = false; lastStatus = 'ready'; previousSwitches = ''; clearKeys(); accumulator = 0; updateUI(); }
  function doUndo() { if (game.undo()) { paused = false; lastStatus = 'ready'; clearKeys(); accumulator = 0; previousSwitches = ''; notify('已撤回最近的分身，回到本轮起点。'); updateUI(); } }
  function togglePause() {
    if (dialog.open || ['won', 'dead', 'timeout'].includes(game.status)) return;
    paused = !paused; clearKeys(); accumulator = 0; lastTime = 0; updateUI();
  }
  function handleStatus() {
    if (game.status === lastStatus) return;
    lastStatus = game.status;
    if (game.status === 'won') {
      sound('win');
      if (!completed.includes(game.index)) completed.push(game.index);
      try { localStorage.setItem('echo-lab-progress-v1', JSON.stringify(completed)); } catch {}
      buildNavigation();
      const final = game.index === levels.length - 1;
      modal(final ? 'FINAL CHAMBER COMPLETE / 终章完成' : `ROOM ${String(game.index + 1).padStart(2, '0')} COMPLETE / 实验成功`, final ? '众声，成光。' : '这一次，你不是一个人。',
        `${final ? `<div class="complete-symbol" aria-hidden="true">◌ ◌ ◌ ●</div><p>你完成了最后一间实验室。当前已探索 ${completed.length} / ${levels.length} 关，目录里还有更多过去的你。</p>` : '<p>门后的光，来自过去的你。</p>'}<div class="dialog-stat"><span>协作分身<b>${game.echoes.length} / 3</b></span><span>本轮用时<b>${(game.tick / FPS).toFixed(1)} s</b></span><span>本关重试<b>${game.retries}</b></span></div>`,
        [{ label: final ? '从第一间再来一次' : '进入下一个实验室 →', run: () => loadLevel(final ? 0 : game.index + 1) }, { label: '再玩这一关', run: () => loadLevel(game.index) }]);
    } else if (game.status === 'dead') {
      sound('dead'); modal('SIGNAL LOST / 信号中断', '没关系，过去还在。', '<p>碰到了红色激光。跳跃时按住空格可以跳得更远。已有分身会保留，你可以从本轮起点再来。</p>', [{ label: '重试这一轮', run: doRetry }, { label: '撤回最近的分身', run: () => { if (game.echoes.length) doUndo(); else doRetry(); } }]);
    } else if (game.status === 'timeout') {
      const canRecord = game.echoes.length < MAX_ECHOES && game.player.grounded;
      modal('RECORDING FULL / 记录已满', '这一段时间，已经装满。', `<p>本关每轮最多 ${game.maxTicks / FPS} 秒。你可以重试这一轮；如果站稳了且还有空位，也可以把它留下成为分身。</p>`, [
        ...(canRecord ? [{ label: '留下这段分身', run: doRewind }] : []), { label: '重试这一轮', run: doRetry }, ...(game.echoes.length ? [{ label: '撤回最近的分身', run: doUndo }] : [])
      ]);
    }
  }
  function updateUI() {
    $('clock').textContent = (game.tick / FPS).toFixed(1).padStart(4, '0');
    $('run-state').textContent = paused ? '时间已暂停' : { ready: '等待行动', running: '正在记录', won: '实验成功', dead: '信号中断', timeout: '记录已满' }[game.status];
    $('pause').innerHTML = `${paused ? '继续' : '暂停'} <span class="key">P</span>`;
    $('pause').setAttribute('aria-label', paused ? '继续游戏' : '暂停游戏');
    $('echo-count').textContent = `${game.echoes.length} / 3 个分身`;
    $('rewind').disabled = paused || game.echoes.length >= MAX_ECHOES || ['won', 'dead'].includes(game.status);
    $('undo').disabled = game.echoes.length === 0;
    $('stage-caption').hidden = game.status !== 'ready' && !paused;
    $('stage-caption').innerHTML = paused ? '时间暂停 · 按 <span class="key">P</span> 继续' : game.echoes.length ? '开始移动，与你的回声一起出发' : '<span class="key">A</span><span class="key">D</span> 或方向键，开始探索';
    trackNodes.forEach((track, i) => {
      const frames = i ? game.echoes[i - 1] : game.history, duration = frames ? frames.length - 1 : 0;
      track.fill.style.width = `${duration / game.maxTicks * 100}%`; track.cursor.style.left = `${game.tick / game.maxTicks * 100}%`; track.cursor.hidden = !frames;
      track.state.textContent = !frames ? '空位' : i && game.ghosts()[i - 1].dead ? '失效' : i && game.tick >= duration ? '停留' : `${(duration / FPS).toFixed(1)}s`;
      track.row.style.opacity = frames ? '1' : '.45';
    });
    document.querySelectorAll('[data-plate]').forEach(node => { const active = !!game.switches[node.dataset.plate]; node.classList.toggle('active', active); node.lastElementChild.textContent = game.switchStatus(game.level.plates.find(p => p.id === node.dataset.plate)); });
  }

  function rect(x, y, w, h, color, radius = 0) { ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill(); }
  function line(x1, y1, x2, y2, color, width = 1) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function label(text, x, y, color = '#a3b7ae', size = 12, align = 'left') { ctx.fillStyle = color; ctx.font = `${size}px "Segoe UI", "Noto Sans CJK SC", sans-serif`; ctx.textAlign = align; ctx.fillText(text, x, y); }
  function circle(x, y, radius, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); }
  function drawPlatform(p, moving = false) {
    rect(p.x, p.y, p.w, p.h, moving ? palette.glow : palette.raised, 3);
    rect(p.x, p.y, p.w, 3, moving ? colors.cyan : palette.muted, 1);
    rect(p.x + 5, p.y + 6, p.w - 10, Math.max(3, Math.min(12, p.h - 10)), palette.surface, 2);
    for (let x = p.x + 14; x < p.x + p.w - 5; x += 22) line(x, p.y + 8, x + 5, p.y + 13, palette.border, 2);
    if (!moving && p.h < 30) { line(p.x + 12, p.y + p.h, p.x + 35, p.y + p.h + 22, palette.border, 3); line(p.x + p.w - 12, p.y + p.h, p.x + p.w - 35, p.y + p.h + 22, palette.border, 3); }
  }
  function drawRobot(p, color, ghost = false, index = 0) {
    ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    if (ghost) ctx.globalAlpha = p.dead ? .25 : .63;
    ctx.shadowColor = color; ctx.shadowBlur = ghost ? 12 : 8;
    const bob = reducedMotion ? 0 : Math.sin(visualTime * 4 + index) * 1;
    const moving = !p.dead && Math.abs(p.moved) > .5;
    const stride = moving && !paused && game.status === 'running' && !reducedMotion ? Math.sin(visualTime * 20) * 3 : 0;
    rect(-11, -15 + bob, 22, 23, color, 7); ctx.shadowBlur = 0;
    rect(-8, -9 + bob, 17, 9, '#152a29', 4);
    circle(p.facing * 2, -5 + bob, 1.8, ghost ? '#e3ffff' : '#faffdf'); circle(p.facing * 2 + 5, -5 + bob, 1.4, ghost ? '#e3ffff' : '#faffdf');
    rect(-9, 10 + stride / 2, 7, 6, color, 2); rect(3, 10 - stride / 2, 7, 6, color, 2);
    line(-13, -1, -15 - stride / 2, 7, color, 3); line(13, -1, 15 + stride / 2, 7, color, 3);
    line(0, -15, 0, -20, color, 1.5); circle(0, -21, 2, color);
    if (ghost) { ctx.globalAlpha = .95; label(p.dead ? '失效 ×' : `0${index + 1}`, 0, -32, color, 11, 'center'); }
    else { label('YOU', 0, -33, colors.gold, 9, 'center'); }
    ctx.restore();
  }
  function drawDevice(p) {
    const active = game.switches[p.id], k = kind(p), x = p.x + p.w / 2, c = active ? palette.accent : palette.muted;
    if (k === 'plate' || k === 'box') {
      rect(p.x, p.y - (active ? 4 : 7), p.w, active ? 4 : 7, c, 3);
      label(`${p.id} ${switchSymbols[k]}${active ? ' ✓' : ''}`, x, p.y - 23, c, 16, 'center');
    } else if (k === 'motion') {
      rect(p.x, p.y - 7, p.w, 7, palette.border, 2);
      rect(p.x, p.y - 7, p.w * game.devices[p.id].charge / p.capacity, 7, palette.accent, 2);
      for (let xx = p.x + 15; xx < p.x + p.w - 10; xx += 32) label('›', xx, p.y + 20, c, 17);
      label(`${p.id} ⇆  ${game.switchStatus(p)}`, x, p.y - 21, c, 14, 'center');
      label('持续跑动供能', x, p.y + 39, palette.muted, 11, 'center');
    } else {
      ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = active ? 2.5 : 1.5;
      if (k === 'near') ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(x, p.y, p.radius || 24, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      if (active) { ctx.shadowColor = c; ctx.shadowBlur = 14; }
      circle(x, p.y, 13, active ? c : palette.raised); ctx.restore();
      label(switchSymbols[k], x, p.y + 5, active ? palette.bg : c, 17, 'center');
      label(`${p.id} · ${switchNames[k]}`, x, p.y - (p.radius || 24) - 13, c, 13, 'center');
      if (k === 'fuse') label(game.devices[p.id].firedAt === null ? `${p.duration / FPS} s · 一次` : game.switchStatus(p), x, p.y + 44, c, 12, 'center');
      else if (k === 'latch' && active) label('本轮常亮', x, p.y + 44, c, 11, 'center');
    }
  }
  function drawOptics() {
    ctx.save(); ctx.shadowColor = colors.gold; ctx.shadowBlur = 9;
    game.beams.forEach(b => line(b.x1, b.y1, b.x2, b.y2, colors.gold, 2.5)); ctx.restore();
    for (const s of game.level.emitters || []) {
      const on = s.requires.every(id => game.switches[id]);
      rect(s.x - 14, s.y - 12, 24, 24, palette.raised, 4);
      circle(s.x + 7, s.y, 4, on ? colors.gold : palette.border);
      label(s.requires.length ? `${s.requires.join('+')} → 光源` : '光源', s.x, s.y + 32, colors.gold, 11, 'center');
    }
    game.mirrors.forEach(m => {
      circle(m.x, m.y, 19, palette.surface);
      ctx.strokeStyle = palette.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(m.x, m.y, 19, 0, Math.PI * 2); ctx.stroke();
      line(m.x - 11, m.y + (m.slash === '/' ? 11 : -11), m.x + 11, m.y + (m.slash === '/' ? -11 : 11), colors.cyan, 4);
      label(m.fixed ? 'FIX' : 'F 转镜', m.x, m.y + 34, m.fixed ? palette.muted : colors.cyan, 12, 'center');
    });
  }
  function draw() {
    const t = reducedMotion ? 0 : visualTime;
    ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    rect(0, 0, WIDTH, HEIGHT, palette.chamber);
    // The chamber is drawn from the same geometry that controls collisions.
    const glow = ctx.createRadialGradient(580, 170, 30, 580, 270, 650); glow.addColorStop(0, palette.glow); glow.addColorStop(1, palette.chamber); ctx.fillStyle = glow; ctx.fillRect(24, 80, WIDTH - 48, 400);
    for (let x = 40; x < WIDTH; x += 48) line(x, 81, x, 480, `${palette.border}40`);
    for (let y = 96; y < 480; y += 48) line(24, y, 1096, y, `${palette.border}40`);
    ctx.save(); ctx.globalAlpha = .16; ctx.fillStyle = palette.accent; ctx.font = '180px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.fillText(String(game.index + 1).padStart(2, '0'), 60, 303); ctx.restore();
    label(palette.title.toUpperCase() + '  /  ECHO RESEARCH', 66, 332, palette.muted, 10);
    for (let x = 95; x < WIDTH - 60; x += 195) {
      rect(x, 83, 83, 4, '#668574', 2); rect(x + 12, 87, 59, 2, '#c1e5caa0', 1);
      const light = ctx.createLinearGradient(0, 90, 0, 295); light.addColorStop(0, '#bce5cd0b'); light.addColorStop(1, '#bce5cd00'); ctx.fillStyle = light; ctx.fillRect(x - 20, 91, 123, 200);
    }
    // Wires expose which switches control each gate.
    game.level.gates.forEach((g, gi) => g.requires.forEach((id, pi) => {
      const p = game.level.plates.find(p => p.id === id), active = game.switches[id];
      ctx.strokeStyle = active ? `${palette.accent}90` : `${palette.border}90`; ctx.lineWidth = 1.5; ctx.setLineDash(active ? [] : [4, 6]);
      ctx.beginPath(); ctx.moveTo(p.x + p.w / 2, p.y - 10); ctx.lineTo(p.x + p.w / 2, 114 + gi * 17 + pi * 6); ctx.lineTo(g.x + g.w / 2, 114 + gi * 17 + pi * 6); ctx.lineTo(g.x + g.w / 2, 140); ctx.stroke(); ctx.setLineDash([]);
    }));
    // Background wall panels and floating dust, kept still in reduced-motion mode.
    for (let i = 0; i < 25; i++) { const x = 50 + (i * 137.7) % 1020, y = 125 + ((i * 73 + t * (2 + i % 3)) % 300); circle(x, y, i % 3 ? 1 : 1.5, '#afc8a726'); }
    rect(0, 0, WIDTH, 80, palette.surface); line(0, 78, WIDTH, 78, palette.border, 2);
    rect(0, 80, 24, 400, palette.raised); rect(1096, 80, 24, 400, palette.raised);
    label(`CHAMBER ${String(game.index + 1).padStart(2, '0')}`, 35, 46, palette.accent, 13);
    label(`0${game.level.chapter + 1} / ${palette.title}`, WIDTH / 2, 46, palette.muted, 13, 'center');
    label(`SIGNAL ${game.echoes.length + 1} / 4`, WIDTH - 35, 46, '#bacbbb', 12, 'right');
    drawPlatform({ x: 0, y: 480, w: WIDTH, h: 80 });
    for (let x = 35; x < WIDTH; x += 120) { rect(x, 515, 48, 3, '#31473a'); circle(x + 75, 521, 2, '#526a56'); }
    label('回溯起点', 91, 453, '#a0b7a7', 10, 'center');
    ctx.save(); ctx.strokeStyle = '#8db39880'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(93, 478, 38, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    game.level.platforms.forEach(p => drawPlatform(p));
    if (game.lift) {
      const l = game.lift;
      [l.x + 8, l.x + l.w - 8].forEach(x => { line(x, l.top, x, l.bottom, '#365b5670', 3); for (let y = l.top + 10; y < l.bottom; y += 18) line(x - 4, y, x + 4, y, '#447a713c', 1); });
      label(`${l.requires.join('+')} ↑↓`, l.x + l.w / 2, l.top - 15, colors.cyan, 13, 'center'); drawPlatform(l, true);
    }
    game.level.gates.forEach(g => {
      const open = game.open(g), c = open ? '#8bb899' : '#bd9175';
      rect(g.x - 5, g.y, g.w + 10, 8, '#5d715b', 2); rect(g.x - 5, g.y + g.h - 4, g.w + 10, 4, '#5d715b', 1);
      line(g.x, g.y + 8, g.x, g.y + g.h - 4, `${c}70`, 2); line(g.x + g.w, g.y + 8, g.x + g.w, g.y + g.h - 4, `${c}70`, 2);
      if (!open) {
        rect(g.x + 3, g.y + 8, g.w - 6, g.h - 12, '#76553e80');
        for (let y = g.y + 17; y < g.y + g.h; y += 15) line(g.x + 4, y, g.x + g.w - 4, y + 6, '#d2a37285', 2);
      } else { for (let y = g.y + 16; y < g.y + g.h - 5; y += 22) circle(g.x + g.w / 2, y, 1, '#bce5cd50'); }
      rect(g.x - 14, g.y + 17, g.w + 28, 25, '#142521', 4); label(open ? 'OPEN' : g.requires.join('+'), g.x + g.w / 2, g.y + 34, open ? colors.mint : colors.gold, 11, 'center');
    });
    drawOptics();
    game.level.plates.forEach(drawDevice);
    game.boxes.forEach(b => { rect(b.x, b.y, b.w, b.h, '#a89974', 4); rect(b.x + 3, b.y + 3, b.w - 6, b.h - 6, '#4c4d3b', 2); line(b.x + 7, b.y + 7, b.x + b.w - 7, b.y + b.h - 7, '#9c9470', 3); line(b.x + b.w - 7, b.y + 7, b.x + 7, b.y + b.h - 7, '#9c9470', 3); });
    game.level.hazards.forEach(h => { rect(h.x, h.y + 6, h.w, h.h - 6, '#633d34', 2); ctx.save(); ctx.shadowColor = '#ff8070'; ctx.shadowBlur = 12; line(h.x + 2, h.y + 3, h.x + h.w - 2, h.y + 3, '#ed8e77', 3); ctx.restore(); for (let x = h.x + 8; x < h.x + h.w; x += 13) line(x, h.y + 5, x + 4, h.y + 11, '#b16759', 2); label('!', h.x + h.w / 2, h.y - 9, '#ed9a82', 13, 'center'); });
    const goal = game.level.goal;
    ctx.save(); ctx.shadowColor = '#a8edcc'; ctx.shadowBlur = 20; rect(goal.x - 1, goal.y - 66, 44, 66, '#87bd9b70', 7); ctx.shadowBlur = 0; rect(goal.x + 4, goal.y - 61, 34, 61, '#213c30', 4);
    for (let i = 0; i < 5; i++) { const y = goal.y - 8 - ((i * 11 + t * 10) % 48); line(goal.x + 8, y, goal.x + 33, y, '#bce5cd35', 1); }
    label('EXIT', goal.x + 21, goal.y - 83, colors.mint, 11, 'center'); label('→', goal.x + 21, goal.y - 28, colors.mint, 24, 'center'); ctx.restore();
    game.ghosts().forEach((p, i) => {
      if (!reducedMotion && !p.dead) for (let back = 4; back <= 16; back += 4) { const trail = game.echoTrails[i], old = trail[Math.max(0, trail.length - back)]; if (old && Math.abs(old.x - p.x) > 4) { ctx.globalAlpha = .07; rect(old.x + 2, old.y + 3, 22, 25, echoColors[i], 7); ctx.globalAlpha = 1; } }
      drawRobot(p, echoColors[i], true, i);
    });
    drawRobot(game.player, colors.gold);
    if (paused) { rect(0, 80, WIDTH, 400, '#0c1919b3'); label('时 间 暂 停', WIDTH / 2, 282, colors.white, 27, 'center'); }
  }
  function resize() { const bounds = canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(bounds.width * ratio); canvas.height = Math.round(bounds.width * .5 * ratio); draw(); }
  function frame(timestamp) {
    const delta = lastTime ? Math.min((timestamp - lastTime) / 1000, .1) : 0; lastTime = timestamp;
    if (!paused && !dialog.open && !document.hidden) {
      visualTime += delta; accumulator += delta;
      while (accumulator >= 1 / FPS) {
        const prevY = game.player.vy;
        game.step(keys);
        if (prevY >= 0 && game.player.vy < -6) sound('jump');
        accumulator -= 1 / FPS;
        handleStatus(); if (dialog.open) { accumulator = 0; break; }
      }
      const signature = Object.values(game.switches).map(Number).join('');
      if (signature !== previousSwitches) { if (signature.includes('1')) sound('switch'); previousSwitches = signature; }
    } else accumulator = 0;
    if (timestamp - lastUI > 80) { updateUI(); lastUI = timestamp; }
    draw(); requestAnimationFrame(frame);
  }
  $('rewind').onclick = () => { doRewind(); canvas.focus({ preventScroll: true }); };
  $('retry').onclick = () => { doRetry(); canvas.focus({ preventScroll: true }); };
  $('undo').onclick = () => { doUndo(); canvas.focus({ preventScroll: true }); };
  $('pause').onclick = togglePause; $('help').onclick = showHelp;
  $('room-picker').addEventListener('toggle', () => { if ($('room-picker').open && game.status === 'running') { paused = true; clearKeys(); updateUI(); } });
  $('share-game').onclick = async () => {
    const url = new URL(location.href); url.hash = `room=${game.index + 1}`;
    history.replaceState(null, '', url.hash);
    try { await navigator.clipboard.writeText(url.href); notify(`第 ${game.index + 1} 关链接已复制，可以发给朋友了。`); }
    catch { modal('SHARE ROOM / 分享本关', '复制地址栏即可分享', '<p>本关链接已经显示在地址栏，包含 #room= 关卡编号。请选择并复制浏览器地址。</p>', [{ label: '知道了' }]); }
  };
  $('sound').onclick = () => { audioEnabled = !audioEnabled; $('sound').textContent = `声音：${audioEnabled ? '开' : '关'}`; $('sound').setAttribute('aria-pressed', String(audioEnabled)); if (audioEnabled) sound('switch'); };
  $('hint').onclick = () => { const showing = $('hint-text').hidden; $('hint-text').hidden = !showing; $('hint').setAttribute('aria-expanded', String(showing)); $('hint').innerHTML = showing ? '收起提示 <span aria-hidden="true">－</span>' : '需要一点提示？ <span aria-hidden="true">＋</span>'; };
  $('reset').onclick = () => modal('RESET ROOM / 重置实验', '重新安排这一次合作？', '<p>将清空本关分身和本轮记录。已经完成的关卡仍会保留。</p>', [{ label: '清空本关，重新开始', run: () => loadLevel(game.index) }, { label: '保留当前实验' }]);
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (dialog.open) return;
    if (e.code === 'Space' && e.target.closest('button')) return;
    if (keyMap[e.code]) { e.preventDefault(); keys[keyMap[e.code]] = true; }
    if (e.repeat) return;
    if (e.code === 'KeyE') { e.preventDefault(); doRewind(); }
    else if (e.code === 'KeyR') { e.preventDefault(); doRetry(); }
    else if (e.code === 'KeyZ') { e.preventDefault(); doUndo(); }
    else if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); togglePause(); }
    else if (e.key === '?') showHelp();
  });
  document.addEventListener('keyup', e => { if (keyMap[e.code]) { keys[keyMap[e.code]] = false; e.preventDefault(); } });
  dialog.addEventListener('cancel', () => { clearKeys(); accumulator = 0; lastTime = 0; });
  dialog.addEventListener('close', () => {
    // Escape must never strand a finished or failed run without a recovery action.
    if (game.status === 'dead' || game.status === 'timeout') doRetry();
    else if (game.status === 'won') loadLevel(game.index);
    canvas.focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-hold]').forEach(button => {
    button.addEventListener('pointerdown', e => { e.preventDefault(); if (dialog.open || paused) return; button.setPointerCapture(e.pointerId); keys[button.dataset.hold] = true; button.classList.add('held'); });
    const release = () => { keys[button.dataset.hold] = false; button.classList.remove('held'); };
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
  });
  function suspend() { clearKeys(); if (game.status === 'running' && !dialog.open) paused = true; accumulator = 0; lastTime = 0; updateUI(); }
  window.addEventListener('blur', suspend); document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
  window.addEventListener('resize', resize);
  function hashRoom() { const match = /^#room=(\d+)$/.exec(location.hash), index = match ? Number(match[1]) - 1 : 0; return levels[index] ? index : 0; }
  window.addEventListener('hashchange', () => { if (location.hash.startsWith('#room=')) changeRoom(hashRoom()); });
  buildTracks(); loadLevel(hashRoom()); resize(); requestAnimationFrame(frame);
})();
