/* Run: node scripts/tests/echo-lab.cjs. Every walkthrough below uses real control inputs. */
const assert = require('node:assert/strict');
const { Game, levels, FPS, MAX_TICKS } = require('../../static/games/echo-lab/core.js');
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
function waitTo(g, tick) { until(g, () => g.tick >= tick, {}); }
function patrol(g, left, right, rounds) { walk(g, left); for (let i = 0; i < rounds; i++) { walk(g, right); walk(g, left); } }
function interact(g) { ticks(g, 1, { interact: true }); ticks(g, 1); }
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
  },
  g => { walk(g, 490); echo(g); walk(g, 220); echo(g); walk(g, 440); jump(g, 590); walk(g, 1040); },
  g => { walk(g, 245); jump(g, 245); walk(g, 610); jump(g, 755); walk(g, 1040); },
  g => {
    walk(g, 560); echo(g); walk(g, 170); jump(g, 320);
    assert.equal(g.player.y + g.player.h, g.boxes[0].y, 'Land on the echo-driven crate');
    const beforeRide = g.player.x;
    until(g, () => g.boxes[0].x >= 540, {});
    assert(g.player.x > beforeRide + 150, 'Standing player is carried by the echo-driven crate');
    jump(g, 640); walk(g, 1040);
  },
  g => { firstSteps(g); jump(g, 409); walk(g, 510); settle(g); walk(g, 740); jump(g, 875); walk(g, 1040); },
  g => {
    walk(g, 175); jump(g, 175); walk(g, 410); echo(g);
    walk(g, 350); jump(g, 505); walk(g, 765); echo(g);
    walk(g, 350); jump(g, 505); walk(g, 705); jump(g, 860); walk(g, 1040);
  },
  g => { walk(g, 290); ticks(g, 120); jump(g, 290); echo(g); walk(g, 1040); },
  g => { walk(g, 240); ticks(g, 120); jump(g, 240); echo(g); walk(g, 640); ticks(g, 60); jump(g, 640); echo(g); walk(g, 1040); },
  g => { firstSteps(g); jump(g, 409); echo(g); walk(g, 810); ticks(g, 60); jump(g, 810); echo(g); walk(g, 1040); },
  g => { walk(g, 240); waitTo(g, 240); jump(g, 240); echo(g); walk(g, 540); waitTo(g, 240); jump(g, 540); echo(g); walk(g, 1040); },
  g => {
    walk(g, 220); jump(g, 220); walk(g, 790); echo(g);
    walk(g, 550); jump(g, 640); waitTo(g, 300); jump(g, 640); echo(g);
    walk(g, 740); jump(g, 905); walk(g, 1040);
  },
  g => { walk(g, 240); jump(g, 300); walk(g, 590); jump(g, 750); walk(g, 1040); },
  g => { walk(g, 250); waitTo(g, 240); jump(g, 250); echo(g); walk(g, 1040); },
  g => { patrol(g, 190, 410, 5); echo(g); walk(g, 1040); },
  g => { patrol(g, 180, 390, 5); echo(g); walk(g, 680); jump(g, 765); walk(g, 1040); },
  g => { patrol(g, 180, 365, 6); echo(g); patrol(g, 610, 780, 5); echo(g); walk(g, 810); jump(g, 895); walk(g, 1040); },
  g => { walk(g, 810); jump(g, 945); walk(g, 1040); },
  g => { walk(g, 410); interact(g); walk(g, 1040); },
  g => { walk(g, 725); walk(g, 490); interact(g); walk(g, 690); jump(g, 850); walk(g, 1040); },
  g => { patrol(g, 190, 400, 6); echo(g); walk(g, 650); interact(g); walk(g, 1040); },
  g => { walk(g, 225); jump(g, 225); patrol(g, 180, 390, 10); echo(g); walk(g, 780); walk(g, 650); interact(g); walk(g, 750); jump(g, 890); walk(g, 1040); }
];
assert.equal(solutions.length, levels.length, 'Every authored room needs a real-input solution');
const solved = [];
solutions.forEach((solve, index) => {
  if (process.argv[2] && index + 1 !== Number(process.argv[2])) return;
  const g = new Game(index); solve(g); assert.equal(g.status, 'won', describe(g));
  solved.push(g);
  console.log(`PASS room ${index + 1}: ${g.echoes.length} echoes, final run ${(g.tick / FPS).toFixed(1)} s`);
});
if (process.argv[2]) process.exit(0);

const g = new Game();
ticks(g, 50); assert.equal(g.tick, 0, 'Ready mode must not consume time');
assert.match(g.rewind(), /先走/);
walk(g, 280); settle(g);
const expected = structuredClone(g.history); echo(g);
const recorded = structuredClone(g.echoes[0]);
ticks(g, 1, { right: true }); ticks(g, 300);
assert.deepEqual(g.echoes[0], recorded, 'Playback must not mutate its recording');
assert.equal(g.switches.A, true, 'Finished echoes keep holding their switch');
assert.equal(g.ghosts()[0].x, recorded.at(-1).x);
assert.equal(g.ghosts()[0].y, recorded.at(-1).y);
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
