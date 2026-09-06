/* Run: node scripts/tests/echo-lab.cjs. Every walkthrough below uses real control inputs. */
const assert = require('node:assert/strict');
const { Game, FPS, MAX_TICKS } = require('../../static/games/echo-lab/core.js');
function describe(g) { return JSON.stringify({ room: g.index + 1, tick: g.tick, status: g.status, player: g.player, switches: g.switches, lift: g.lift, boxes: g.boxes }); }
function ticks(g, n, input = {}) { for (let i = 0; i < n; i++) g.step(input); }
function until(g, condition, input, max = 900) {
  for (let i = 0; i < max; i++) {
    if (condition()) return;
    assert(!['dead', 'timeout'].includes(g.status), describe(g));
    g.step(typeof input === 'function' ? input() : input);
  }
  assert(condition(), `Condition not reached: ${describe(g)}`);
}
const towards = (g, x) => ({ left: g.player.x > x + 2, right: g.player.x < x - 2 });
function walk(g, x) { until(g, () => Math.abs(g.player.x - x) <= 3 || g.status === 'won', () => towards(g, x)); }
function settle(g) { ticks(g, 1); until(g, () => g.player.grounded, {}); ticks(g, 8); }
function jump(g, x) {
  ticks(g, 1, { ...towards(g, x), jump: true });
  assert(g.player.vy < 0, `Jump failed: ${describe(g)}`);
  until(g, () => g.player.grounded, () => ({ ...towards(g, x), jump: true }), 120);
  ticks(g, 1);
}
function echo(g) { settle(g); assert.equal(g.rewind(), null, describe(g)); }
function firstSteps(g) { walk(g, 135); jump(g, 240); walk(g, 251); jump(g, 407); walk(g, 409); }
function ride(g) {
  walk(g, 465);
  until(g, () => g.player.grounded && g.player.y < 275, {}, 600);
  jump(g, 630); walk(g, 723);
}
const solutions = [
  g => { walk(g, 278); echo(g); walk(g, 1040); },
  g => { walk(g, 234); echo(g); walk(g, 640); echo(g); walk(g, 1040); },
  g => {
    firstSteps(g); echo(g);
    walk(g, 575); settle(g); assert.equal(g.switches.B, true, describe(g));
    jump(g, 703); walk(g, 811); jump(g, 975); walk(g, 1040);
  },
  g => { walk(g, 234); echo(g); ride(g); echo(g); ride(g); walk(g, 1040); },
  g => {
    walk(g, 223); echo(g);
    walk(g, 390); jump(g, 478); walk(g, 480); jump(g, 564); walk(g, 560); echo(g);
    walk(g, 653); jump(g, 746); walk(g, 842); echo(g);
    walk(g, 653); jump(g, 746); walk(g, 1050);
  }
];
const solved = [];
solutions.forEach((solve, index) => {
  const g = new Game(index); solve(g); assert.equal(g.status, 'won', describe(g));
  solved.push(g);
  console.log(`PASS room ${index + 1}: ${g.echoes.length} echoes, final run ${(g.tick / FPS).toFixed(1)} s`);
});

const g = new Game();
ticks(g, 50); assert.equal(g.tick, 0, 'Ready mode must not consume time');
assert.match(g.rewind(), /先走/);
walk(g, 280); settle(g);
const expected = structuredClone(g.history); echo(g);
const recorded = structuredClone(g.echoes[0]);
ticks(g, 1, { right: true }); ticks(g, 300);
assert.deepEqual(g.echoes[0], recorded, 'Playback must not mutate its recording');
assert.equal(g.switches.A, true, 'Finished echoes keep holding their switch');
assert.deepEqual(g.ghosts()[0], recorded.at(-1));
g.retry(); assert.equal(g.tick, 0); assert.deepEqual(g.echoes[0], recorded);
ticks(g, expected.length + 10, { right: true });
assert.equal(g.switches.A, true, 'Retry replays the same switch activation');
assert.equal(g.undo(), true); assert.equal(g.echoes.length, 0); assert.equal(g.tick, 0);
assert.equal(g.undo(), false);
for (let i = 0; i < 3; i++) { walk(g, 160 + i * 10); echo(g); }
ticks(g, 10, { right: true }); assert.match(g.rewind(), /位置已满/); assert.equal(g.echoes.length, 3);
g.retry(); ticks(g, 1, { right: true }); ticks(g, MAX_TICKS); assert.equal(g.status, 'timeout');
g.retry(); assert.equal(g.status, 'ready'); assert.equal(g.echoes.length, 3);
const airborne = new Game(); ticks(airborne, 10, { jump: true }); assert.match(airborne.rewind(), /落地/);
const hazard = new Game(2); solutions[2](hazard); hazard.retry(); walk(hazard, 575); jump(hazard, 703); walk(hazard, 810); ticks(hazard, 60, { right: true }); assert.equal(hazard.status, 'dead');
const repeat = new Game(4); solutions[4](repeat); assert.deepEqual(repeat.history, solved[4].history, 'Identical inputs must produce identical recordings');
const interlock = new Game(); interlock.player.x = interlock.level.gates[0].x + 2;
assert.equal(interlock.open(interlock.level.gates[0]), true, 'Gate cannot close through the player');
interlock.player.x = 800;
assert.equal(interlock.open(interlock.level.gates[0]), false, 'Gate closes after the player has left');
console.log('PASS playback, hold, retry, undo, echo limit, idle, timeout, grounded recording, hazards, gate interlock and deterministic replay');
