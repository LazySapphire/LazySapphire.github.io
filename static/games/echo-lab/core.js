/* Fixed 60 Hz. Echoes replay inputs through shared physics, not immutable poses.
   Actors pass through one another, but all can push and ride the same boxes. */
const EchoCore = (() => {
  const { levels, chapters } = typeof module !== 'undefined' ? require('./levels.js') : EchoLevels;
  const WIDTH = 1120, HEIGHT = 560, FPS = 60, MAX_TICKS = FPS * 24, MAX_ECHOES = 3, FLOOR = 480, SPEED = 3.4;
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const pose = p => ({ x: p.x, y: p.y, w: p.w, h: p.h, facing: p.facing });
  const actor = () => ({ x: 80, y: 446, w: 26, h: 34, vx: 0, vy: 0, facing: 1, grounded: true, coyote: 6, buffer: 0, wasJump: false, wasInteract: false, dead: false, moved: 0 });
  const near = (a, x, y, radius) => Math.hypot(x - Math.max(a.x, Math.min(x, a.x + a.w)), y - Math.max(a.y, Math.min(y, a.y + a.h))) <= radius;
  const kind = p => p.kind || (p.weight ? 'box' : 'plate');
  const switchNames = { plate: '压力', box: '配重', near: '感应', latch: '记忆', fuse: '一次性', motion: '运动供能', light: '光接收' };
  const switchSymbols = { plate: '—', box: '▣', near: '◎', latch: '∞', fuse: '◷', motion: '⇆', light: '☼' };
  class Game {
    constructor(index = 0) { this.load(index); }
    load(index) {
      this.index = Number.isInteger(index) && levels[index] ? index : 0;
      this.level = levels[this.index]; this.maxTicks = (this.level.seconds || 24) * FPS;
      this.echoes = []; this.rewinds = 0; this.retries = 0; this.resetRun();
    }
    resetRun() {
      this.player = actor(); this.echoActors = this.echoes.map(() => actor()); this.echoTrails = this.echoes.map(() => []);
      this.boxes = this.level.boxes.map(b => ({ ...b, vy: 0 }));
      this.mirrors = (this.level.mirrors || []).map(m => ({ ...m }));
      this.lift = this.level.lift ? { ...this.level.lift, direction: -1, wait: 45 } : null;
      this.tick = 0; this.status = 'ready'; this.history = [pose(this.player)]; this.switches = {}; this.devices = {};
      this.level.plates.forEach(p => { this.devices[p.id] = { latched: false, firedAt: null, charge: 0 }; });
      this.refreshSwitches(); this.traceLight();
    }
    ghosts() { return this.echoActors; }
    actors() { return [...this.echoActors, this.player].filter(a => !a.dead); }
    refreshSwitches(advance = false) {
      const actors = this.actors();
      for (const p of this.level.plates) {
        const k = kind(p), state = this.devices[p.id];
        const touching = actors.some(a => near(a, p.x + p.w / 2, p.y, p.radius || 24));
        if (k === 'latch') {
          if (advance && touching) state.latched = true;
          this.switches[p.id] = state.latched;
        } else if (k === 'fuse') {
          if (advance && touching && state.firedAt === null) state.firedAt = this.tick;
          this.switches[p.id] = state.firedAt !== null && this.tick - state.firedAt < p.duration;
        } else if (k === 'near') this.switches[p.id] = touching;
        else if (k === 'motion') {
          const running = actors.some(a => a.grounded && Math.abs(a.moved) > .5 && Math.abs(a.y + a.h - p.y) < 7 && a.x + a.w > p.x && a.x < p.x + p.w);
          if (advance) state.charge = Math.max(0, Math.min(p.capacity, state.charge + (running ? 2 : -1)));
          this.switches[p.id] = state.charge >= p.threshold;
        } else if (k !== 'light') this.switches[p.id] = (k === 'box' ? this.boxes : [...actors, ...this.boxes]).some(a => a.x + a.w > p.x + 5 && a.x < p.x + p.w - 5 && Math.abs(a.y + a.h - p.y) < 7);
      }
    }
    switchStatus(p) {
      const k = kind(p), state = this.devices[p.id];
      if (k === 'fuse' && state.firedAt !== null) return this.switches[p.id] ? ((p.duration - this.tick + state.firedAt) / FPS).toFixed(1) + ' s' : '已耗尽';
      if (k === 'motion') return Math.round(state.charge / p.capacity * 100) + '% ' + (this.switches[p.id] ? '供能' : '待充能');
      if (k === 'latch' && state.latched) return '本轮常亮';
      return this.switches[p.id] ? '已激活' : '未激活';
    }
    open(g) {
      return g.requires.every(id => this.switches[id]) || (this.level.gates.includes(g) && [...this.actors(), ...this.boxes].some(body => overlap(body, g)));
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
      this.echoes.push(this.history.map(f => ({ ...f, ...(f.input ? { input: { ...f.input } } : {}) })));
      this.rewinds++; this.resetRun(); return null;
    }
    retry() { this.retries++; this.resetRun(); }
    undo() { if (!this.echoes.length) return false; this.echoes.pop(); this.resetRun(); return true; }
    pushBox(box, dx, solids) {
      // Multiple echoes pushing together cannot exceed ordinary walking speed.
      dx = Math.sign(dx) * Math.min(Math.abs(dx), Math.max(0, SPEED - Math.abs(box.x - box.startX)));
      if (!dx) return;
      const group = new Set([box]);
      for (const b of group) {
        const next = { ...b, x: b.x + dx };
        if (next.x < 25 || next.x + next.w > WIDTH - 25 || solids.some(s => overlap(next, s))) return;
        for (const other of this.boxes) if (!group.has(other) && overlap(next, other)) group.add(other);
      }
      if ([...group].some(b => Math.abs(b.x + dx - b.startX) > SPEED + .001)) return;
      // A box may move an actor sideways, but never squeeze one into a solid.
      // Validate the whole push before moving anything so the gate interlock
      // only protects legitimate occupants, not collision-generated penetration.
      const displaced = new Map();
      for (const a of this.actors()) {
        let x = a.x;
        for (const b of group) {
          const next = { ...b, x: b.x + dx };
          if (x + a.w > next.x + .0001 && x < next.x + next.w - .0001 && a.y + a.h > next.y + .0001 && a.y < next.y + next.h - .0001) {
            x = a.x + a.w / 2 < b.x + b.w / 2 ? next.x - a.w : next.x + next.w;
          }
        }
        if (x !== a.x) {
          const next = { ...a, x };
          if (x < 25 || x + a.w > WIDTH - 25 || [...solids, ...this.boxes.filter(b => !group.has(b))].some(s => overlap(next, s))) return;
          displaced.set(a, x);
        }
      }
      displaced.forEach((x, a) => { a.x = x; });
      for (const b of group) {
        for (const a of this.actors()) if (a.vy >= 0 && Math.abs(a.y + a.h - b.y) < 2 && a.x + a.w > b.x && a.x < b.x + b.w) {
          const next = { ...a, x: a.x + dx };
          if (next.x >= 25 && next.x + next.w <= WIDTH - 25 && ![...solids, ...this.boxes.filter(o => !group.has(o))].some(s => overlap(next, s))) a.x += dx;
        }
        b.x += dx;
      }
    }
    moveActor(p, input, solids) {
      if (p.dead) return;
      const startX = p.x, direction = Number(!!input.right) - Number(!!input.left);
      p.vx = direction * SPEED; if (direction) p.facing = direction;
      if (p.grounded) p.coyote = 6; else p.coyote = Math.max(0, p.coyote - 1);
      if (input.jump && !p.wasJump) p.buffer = 7; else p.buffer = Math.max(0, p.buffer - 1);
      p.wasJump = !!input.jump;
      if (p.buffer && p.coyote) { p.vy = -11.6; p.grounded = false; p.coyote = 0; p.buffer = 0; }
      if (!input.jump && p.vy < -5.5) p.vy = -5.5;
      p.x = Math.max(25, Math.min(WIDTH - 25 - p.w, p.x + p.vx));
      for (const s of solids) if (overlap(p, s)) { if (p.vx > 0) p.x = s.x - p.w; else if (p.vx < 0) p.x = s.x + s.w; }
      for (const b of this.boxes) if (overlap(p, b)) {
        if (p.vx) this.pushBox(b, p.vx > 0 ? p.x + p.w - b.x : p.x - b.x - b.w, solids);
        p.x = (p.vx > 0 || (!p.vx && p.x + p.w / 2 < b.x + b.w / 2)) ? b.x - p.w : b.x + b.w;
      }
      p.moved = direction ? p.x - startX : 0;
      p.vy = Math.min(p.vy + .55, 13); p.y += p.vy; p.grounded = false;
      for (const s of [...solids, ...this.boxes]) if (overlap(p, s)) {
        if (p.vy > 0) { p.y = s.y - p.h; p.grounded = true; } else if (p.vy < 0) p.y = s.y + s.h;
        p.vy = 0;
      }
      if (input.interact && !p.wasInteract) {
        const candidates = this.mirrors.filter(m => !m.fixed && near(p, m.x, m.y, 60));
        candidates.sort((a, b) => Math.hypot(a.x - p.x - p.w / 2, a.y - p.y - p.h / 2) - Math.hypot(b.x - p.x - p.w / 2, b.y - p.y - p.h / 2));
        if (candidates[0]) candidates[0].slash = candidates[0].slash === '/' ? '\\' : '/';
      }
      p.wasInteract = !!input.interact;
      if (this.level.hazards.some(h => overlap(p, h)) || p.y > HEIGHT) p.dead = true;
    }
    traceLight() {
      this.beams = [];
      const receivers = this.level.plates.filter(p => kind(p) === 'light'), hits = new Set(), obstacles = [...this.solids(), ...this.boxes];
      for (const source of this.level.emitters || []) {
        if (!source.requires.every(id => this.switches[id])) continue;
        let { x, y, dx, dy } = source;
        // Nearest cardinal-ray collision; the bounce limit also terminates mirror loops.
        for (let bounce = 0; bounce < 16; bounce++) {
          let distance = dx > 0 ? WIDTH - x : dx < 0 ? x : dy > 0 ? HEIGHT - y : y, target = null;
          const consider = (d, object) => { if (d > .01 && d < distance) { distance = d; target = object; } };
          for (const s of obstacles) {
            if (dx && y > s.y && y < s.y + s.h) consider(dx > 0 ? s.x - x : x - s.x - s.w, { type: 'wall' });
            if (dy && x > s.x && x < s.x + s.w) consider(dy > 0 ? s.y - y : y - s.y - s.h, { type: 'wall' });
            if (x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) { distance = 0; target = { type: 'wall' }; }
          }
          for (const m of this.mirrors) {
            if (dx && Math.abs(y - m.y) < 2) consider((m.x - x) * dx, { type: 'mirror', value: m });
            if (dy && Math.abs(x - m.x) < 2) consider((m.y - y) * dy, { type: 'mirror', value: m });
          }
          for (const r of receivers) {
            const cx = r.x + r.w / 2;
            if (dx && Math.abs(y - r.y) <= r.radius) consider((cx - x) * dx, { type: 'receiver', value: r });
            if (dy && Math.abs(x - cx) <= r.radius) consider((r.y - y) * dy, { type: 'receiver', value: r });
          }
          const nx = x + dx * distance, ny = y + dy * distance;
          this.beams.push({ x1: x, y1: y, x2: nx, y2: ny });
          if (target?.type === 'receiver') { hits.add(target.value.id); break; }
          if (target?.type !== 'mirror') break;
          [dx, dy] = target.value.slash === '/' ? [-dy, -dx] : [dy, dx];
          x = nx + dx * .05; y = ny + dy * .05;
        }
      }
      receivers.forEach(r => { this.switches[r.id] = hits.has(r.id); });
    }
    step(input = {}) {
      if (['won', 'dead', 'timeout'].includes(this.status)) return;
      if (this.status === 'ready' && !(input.left || input.right || input.jump || input.interact)) return;
      this.status = 'running'; this.refreshSwitches();
      if (this.lift && this.open(this.lift)) {
        const lift = this.lift, prev = lift.y;
        const passengers = [...this.actors(), ...this.boxes].filter(p => Math.abs(p.y + p.h - lift.y) < 3 && p.x + p.w > lift.x && p.x < lift.x + lift.w && p.vy >= 0);
        if (lift.wait > 0) lift.wait--;
        else {
          lift.y += lift.direction * 1.6;
          if (lift.y <= lift.top || lift.y >= lift.bottom) { lift.y = Math.max(lift.top, Math.min(lift.bottom, lift.y)); lift.direction *= -1; lift.wait = 50; }
        }
        passengers.forEach(p => { p.y += lift.y - prev; p.grounded = true; });
      }
      const solids = this.solids();
      for (const b of [...this.boxes].sort((a, b) => b.y - a.y)) {
        b.startX = b.x; b.vy = Math.min(b.vy + .55, 12); b.y += b.vy;
        for (const s of [...solids, ...this.boxes.filter(o => o !== b)]) if (overlap(b, s)) { b.y = b.vy >= 0 ? s.y - b.h : s.y + s.h; b.vy = 0; }
      }
      this.echoActors.forEach((p, i) => {
        this.moveActor(p, this.echoes[i][this.tick + 1]?.input || {}, solids);
        this.echoTrails[i].push(pose(p)); if (this.echoTrails[i].length > 16) this.echoTrails[i].shift();
      });
      this.moveActor(this.player, input, solids);
      this.tick++; this.refreshSwitches(true); this.traceLight();
      this.history.push({ ...pose(this.player), input: { left: !!input.left, right: !!input.right, jump: !!input.jump, interact: !!input.interact } });
      if (this.player.dead) this.status = 'dead';
      else if (overlap(this.player, { x: this.level.goal.x, y: this.level.goal.y - 66, w: 42, h: 66 })) this.status = 'won';
      else if (this.tick >= this.maxTicks) this.status = 'timeout';
    }
  }
  return { Game, levels, chapters, kind, switchNames, switchSymbols, WIDTH, HEIGHT, FPS, MAX_TICKS, MAX_ECHOES, overlap };
})();
if (typeof module !== 'undefined') module.exports = EchoCore;
