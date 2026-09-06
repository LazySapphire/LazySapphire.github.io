/* Fixed 60 Hz simulation. Recorded poses are immutable: echoes affect switches,
   never boxes or one another. This intentionally avoids time-paradox physics. */
const EchoCore = (() => {
  const WIDTH = 1120, HEIGHT = 560, FPS = 60, MAX_TICKS = FPS * 24, MAX_ECHOES = 3;
  const PLAYER_W = 26, PLAYER_H = 34, FLOOR = 480;
  const plate = (id, x, y = FLOOR, weight = false) => ({ id, x, y, w: 64, weight });
  const gate = (x, requires, bottom = FLOOR) => ({ x, y: 80, w: 25, h: bottom - 80, requires });
  const platform = (x, y, w, h = 22) => ({ x, y, w, h });
  const levels = [
    { title: '第一次回声', subtitle: '有些门，需要过去的你来打开。',
      objective: '让分身留在开关 A 上，穿过闸门，抵达右侧出口。',
      note: '按 E 结束这段记录。你会回到起点，过去的你则会重演它。记录结束后，分身会停在原地。',
      hint: '走到 A 的正中央，松开方向键，再按 E。跟着分身一起向右走；它会停在开关上，为你守住那扇门。',
      plates: [plate('A', 260)], gates: [gate(640, ['A'])], platforms: [], boxes: [], hazards: [], goal: { x: 1020, y: FLOOR } },
    { title: '两个人的接力', subtitle: '你走过的路，会成为下一次的帮助。',
      objective: '依次为 A 和 B 留下分身，穿过两道闸门。',
      note: '每次回溯，已有分身都会从第 0 秒重新播放。它们的脚步有先后，耐心等第一扇门开启。',
      hint: '先给 A 留一个分身。第二轮走过第一道门，停在 B 上再按 E。第三轮由你走向出口。',
      plates: [plate('A', 215), plate('B', 620)], gates: [gate(470, ['A']), gate(850, ['B'])], platforms: [], boxes: [], hazards: [], goal: { x: 1020, y: FLOOR } },
    { title: '一点重量', subtitle: '有时候，帮手只是一只安静的箱子。',
      objective: '用分身压住高处的 A，用箱子压住配重开关 B。小心出口前的红色激光。',
      note: '贴着箱子走就能推动。标有方框的配重开关只认箱子。回溯会重置箱子，分身不会再次推动它。',
      hint: '按空格跳上两级平台，在 A 留下分身。新一轮把箱子推到 B 中央，跳过箱子，再跳过右侧的激光。',
      plates: [plate('A', 390, 355), plate('B', 580, FLOOR, true)], gates: [gate(725, ['A', 'B'])],
      platforms: [platform(175, 420, 100), platform(330, 355, 165)], boxes: [{ x: 520, y: 448, w: 32, h: 32 }],
      hazards: [{ x: 865, y: 468, w: 75, h: 12 }], goal: { x: 1030, y: FLOOR } },
    { title: '托举', subtitle: '当你向上时，有人在原地为你等待。',
      objective: '让分身启动升降台，登上高层，再用第二个分身守住 B。',
      note: 'A 控制升降台。它会在上下两层往返。错过一班不用着急，等它回来，站上去就好。',
      hint: '先在 A 留下分身。去升降台的位置等它降到地面，乘上后向右跳到高层。在 B 留下第二个分身，再乘一次升降台。',
      plates: [plate('A', 215), plate('B', 700, 270)], gates: [gate(875, ['B'], 270)], platforms: [platform(590, 270, 506)], boxes: [], hazards: [],
      lift: { x: 425, y: FLOOR, w: 125, h: 18, top: 270, bottom: FLOOR, requires: ['A'] }, goal: { x: 1020, y: 270 } },
    { title: '我们，一起', subtitle: '最后一扇门，留给此刻的你。',
      objective: '让三个分身分别守住 A、B、C。最后，由你完成这次实验。',
      note: '三个分身，三段过去。按 Z 可以撤回最近一个；按 R 只重试当前这一轮，保留已有的分身。',
      hint: '依次在 A、高处的 B、地面的 C 留下分身。去 B 时利用两级平台。离开 B 后跳过激光；最后一轮等三个开关全部亮起。',
      plates: [plate('A', 205), plate('B', 540, 355), plate('C', 820)], gates: [gate(375, ['A']), gate(755, ['A', 'B']), gate(960, ['A', 'B', 'C'])],
      platforms: [platform(430, 420, 85), platform(520, 355, 125)], boxes: [], hazards: [{ x: 685, y: 468, w: 43, h: 12 }], goal: { x: 1035, y: FLOOR } }
  ];
  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function pose(p) { return { x: p.x, y: p.y, w: p.w, h: p.h, facing: p.facing }; }
  class Game {
    constructor(index = 0) { this.load(index); }
    load(index) { this.index = index; this.level = levels[index]; this.echoes = []; this.rewinds = 0; this.retries = 0; this.resetRun(); }
    resetRun() {
      this.player = { x: 80, y: FLOOR - PLAYER_H, w: PLAYER_W, h: PLAYER_H, vx: 0, vy: 0, facing: 1, grounded: true, coyote: 6, buffer: 0 };
      this.boxes = this.level.boxes.map(b => ({ ...b, vy: 0 }));
      this.lift = this.level.lift ? { ...this.level.lift, direction: -1, wait: 45 } : null;
      this.tick = 0; this.status = 'ready'; this.wasJump = false; this.history = [pose(this.player)]; this.switches = {}; this.refreshSwitches();
    }
    ghosts() { return this.echoes.map(frames => frames[Math.min(this.tick, frames.length - 1)]); }
    refreshSwitches() {
      const actors = [this.player, ...this.ghosts()];
      for (const p of this.level.plates) {
        this.switches[p.id] = (p.weight ? this.boxes : [...actors, ...this.boxes]).some(a => a.x + a.w > p.x + 5 && a.x < p.x + p.w - 5 && Math.abs(a.y + a.h - p.y) < 7);
      }
    }
    open(g) {
      // A doorway cannot close through the live player or a box.
      return g.requires.every(id => this.switches[id]) ||
        (this.level.gates.includes(g) && [this.player, ...this.boxes].some(body => overlap(body, g)));
    }
    solids(withLift = true) {
      const solids = [{ x: 0, y: FLOOR, w: WIDTH, h: 80 }, { x: 0, y: 0, w: WIDTH, h: 80 }, ...this.level.platforms, ...this.level.gates.filter(g => !this.open(g))];
      if (withLift && this.lift) solids.push(this.lift);
      return solids;
    }
    rewind() {
      if (this.status === 'won' || this.status === 'dead') return '先重试这一轮，再留下分身。';
      if (this.echoes.length >= MAX_ECHOES) return '三个分身位置已满。按 Z 撤回最近一个，或按 R 重试。';
      if (this.tick < 8) return '先走一小段路，再留下你的回声。';
      if (!this.player.grounded) return '先稳稳落地，再留下分身。';
      this.echoes.push(this.history.map(f => ({ ...f })));
      this.rewinds++; this.resetRun(); return null;
    }
    retry() { this.retries++; this.resetRun(); }
    undo() { if (!this.echoes.length) return false; this.echoes.pop(); this.resetRun(); return true; }
    step(input = {}) {
      if (['won', 'dead', 'timeout'].includes(this.status)) return;
      if (this.status === 'ready' && !(input.left || input.right || input.jump)) return;
      this.status = 'running';
      const p = this.player;
      this.refreshSwitches();
      if (this.lift && this.open(this.lift)) {
        const lift = this.lift;
        const aboard = Math.abs(p.y + p.h - lift.y) < 3 && p.x + p.w > lift.x && p.x < lift.x + lift.w && p.vy >= 0;
        const prev = lift.y;
        if (lift.wait > 0) lift.wait--;
        else {
          lift.y += lift.direction * 1.6;
          if (lift.y <= lift.top || lift.y >= lift.bottom) { lift.y = Math.max(lift.top, Math.min(lift.bottom, lift.y)); lift.direction *= -1; lift.wait = 50; }
        }
        if (aboard) { p.y += lift.y - prev; p.grounded = true; }
      }
      const solids = this.solids();
      for (const box of this.boxes) {
        box.vy = Math.min(box.vy + .55, 12); box.y += box.vy;
        for (const s of solids) if (overlap(box, s)) { if (box.vy >= 0) box.y = s.y - box.h; else box.y = s.y + s.h; box.vy = 0; }
      }
      const direction = Number(!!input.right) - Number(!!input.left);
      p.vx = direction * 3.4;
      if (direction) p.facing = direction;
      if (p.grounded) p.coyote = 6; else p.coyote = Math.max(0, p.coyote - 1);
      if (input.jump && !this.wasJump) p.buffer = 7; else p.buffer = Math.max(0, p.buffer - 1);
      this.wasJump = !!input.jump;
      if (p.buffer && p.coyote) { p.vy = -11.6; p.grounded = false; p.coyote = 0; p.buffer = 0; }
      if (!input.jump && p.vy < -5.5) p.vy = -5.5;
      p.x += p.vx;
      p.x = Math.max(25, Math.min(WIDTH - 25 - p.w, p.x));
      for (const box of this.boxes) {
        if (!overlap(p, box)) continue;
        const previous = box.x;
        box.x = p.vx > 0 ? p.x + p.w : p.x - box.w;
        if (box.x < 25 || box.x + box.w > WIDTH - 25 || [...solids, ...this.boxes.filter(b => b !== box)].some(s => overlap(box, s))) box.x = previous;
        p.x = p.vx > 0 ? box.x - p.w : box.x + box.w;
      }
      for (const s of solids) if (overlap(p, s)) { if (p.vx > 0) p.x = s.x - p.w; else if (p.vx < 0) p.x = s.x + s.w; }
      p.vy = Math.min(p.vy + .55, 13);
      p.y += p.vy; p.grounded = false;
      for (const s of [...solids, ...this.boxes]) {
        if (!overlap(p, s)) continue;
        if (p.vy > 0) { p.y = s.y - p.h; p.grounded = true; } else if (p.vy < 0) p.y = s.y + s.h;
        p.vy = 0;
      }
      this.tick++; this.refreshSwitches(); this.history.push(pose(p));
      if (this.level.hazards.some(h => overlap(p, h)) || p.y > HEIGHT) this.status = 'dead';
      else if (overlap(p, { x: this.level.goal.x, y: this.level.goal.y - 66, w: 42, h: 66 })) this.status = 'won';
      else if (this.tick >= MAX_TICKS) this.status = 'timeout';
    }
  }
  return { Game, levels, WIDTH, HEIGHT, FPS, MAX_TICKS, MAX_ECHOES, overlap };
})();
if (typeof module !== 'undefined') module.exports = EchoCore;
