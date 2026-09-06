/* Deterministic regression for the reported echo/box interaction. */
const assert = require('node:assert/strict');
const { Game, levels, overlap } = require('../../static/games/echo-lab/core.js');
const game = new Game(2);
for (let i = 0; i < 160; i++) game.step({ right: true });
for (let i = 0; i < 10; i++) game.step({});
const pushedTo = game.boxes[0].x;
assert(pushedTo > 600, 'The original player must push the box in this recording');
assert.equal(game.rewind(), null);
game.step({ left: true }); // Start time, then leave the current player at the spawn.
for (let i = 0; i < 180; i++) game.step({});
assert(game.player.x < 100, 'Only the echo may reach this box');
assert(Math.abs(game.boxes[0].x - pushedTo) < 1, `Echo must reproduce the push: expected ${pushedTo}, got ${game.boxes[0].x}`);
console.log('PASS recorded echo pushes the shared box while the current player stays at spawn');

const ticks = (g, n, input = {}) => { for (let i = 0; i < n; i++) g.step(input); };
const walk = (g, x) => { for (let i = 0; i < 600 && Math.abs(g.player.x - x) > 3; i++) g.step({ right: g.player.x < x, left: g.player.x > x }); assert(Math.abs(g.player.x - x) <= 3); };
const fixture = geometry => { const g = new Game(); g.level = { ...g.level, plates: [], boxes: [], gates: [], platforms: [], hazards: [], ...geometry }; g.resetRun(); return g; };

// Review reproduction: a delayed echo must not squeeze a player through a closed gate.
const squeeze = new Game(5);
ticks(squeeze, 1, { left: true }); ticks(squeeze, 100); ticks(squeeze, 250, { right: true }); ticks(squeeze, 10); squeeze.rewind();
ticks(squeeze, 46, { right: true }); ticks(squeeze, 42, { right: true, jump: true }); ticks(squeeze, 113, { right: true }); ticks(squeeze, 86); ticks(squeeze, 100, { right: true });
assert.notEqual(squeeze.status, 'won', 'Echo-driven crate must not bypass a closed gate by squeezing the player into its interlock');
assert.equal(squeeze.switches.A, false); assert(squeeze.player.x + squeeze.player.w <= squeeze.level.gates[0].x + .001);

// The recording is immutable, but its physical route must react to changed obstacles.
const recording = structuredClone(game.echoes[0]);
game.level = { ...game.level, platforms: [...game.level.platforms, { x: 400, y: 80, w: 30, h: 400 }] };
game.retry(); ticks(game, 1, { left: true }); ticks(game, 180);
assert(game.ghosts()[0].x < 375, 'Echo must collide with a newly obstructed route');
assert.deepEqual(game.echoes[0], recording);

const air = new Game(10); walk(air, 290);
assert.equal(air.switches.A, false, 'Walking beneath the airborne sensor is insufficient');
ticks(air, 10, { jump: true }); assert.equal(air.switches.A, true);
ticks(air, 50, { jump: true }); assert.equal(air.switches.A, false, 'Momentary sensor turns off on departure');
const boxSensor = fixture({ plates: levels[10].plates, boxes: [{ x: 280, y: 330, w: 40, h: 150 }] });
ticks(boxSensor, 1, { left: true }); assert.equal(boxSensor.switches.A, false, 'Proximity sensor ignores a nearby crate');

const latch = new Game(6); walk(latch, 245); ticks(latch, 50, { jump: true });
assert.equal(latch.switches.A, true); walk(latch, 350); ticks(latch, 100); assert.equal(latch.switches.A, true);
assert.equal(latch.rewind(), null); assert.equal(latch.switches.A, false, 'Latch resets on rewind');
latch.step({ left: true }); ticks(latch, 250); assert.equal(latch.switches.A, true, 'Echo can latch the switch again');

const fuse = new Game(16); walk(fuse, 250); ticks(fuse, 10, { jump: true });
assert.equal(fuse.switches.F, true); const firedAt = fuse.devices.F.firedAt;
ticks(fuse, 200, { jump: true }); assert.equal(fuse.switches.F, false);
ticks(fuse, 1); ticks(fuse, 15, { jump: true });
assert.equal(fuse.devices.F.firedAt, firedAt, 'Another contact cannot restart or extend a spent fuse');
assert.equal(fuse.switches.F, false); assert.equal(fuse.switchStatus(fuse.level.plates[0]), '已耗尽');
fuse.retry(); assert.equal(fuse.devices.F.firedAt, null);

const weight = fixture({ plates: [{ id: 'B', x: 280, y: 480, w: 64, weight: true }] });
walk(weight, 300); assert.equal(weight.switches.B, false, 'Crate-only plate ignores the live character');
assert.equal(weight.rewind(), null); ticks(weight, 1, { left: true }); ticks(weight, 130);
assert.equal(weight.switches.B, false, 'Crate-only plate also ignores an echo');

const motion = new Game(17); walk(motion, 350); assert.equal(motion.switches.M, true);
ticks(motion, 90); assert.equal(motion.switches.M, false); assert.equal(motion.devices.M.charge, 0);
const blockedMotor = fixture({ plates: [{ ...levels[17].plates[0], x: 25, w: 250 }], platforms: [{ x: 220, y: 80, w: 30, h: 400 }] });
ticks(blockedMotor, 160, { right: true }); assert.equal(blockedMotor.devices.M.charge, 0, 'Holding a key against a wall is not motion');

const optics = new Game(21); walk(optics, 410); assert.equal(optics.switches.R, false);
ticks(optics, 1, { interact: true }); assert.equal(optics.switches.R, true);
assert.equal(optics.mirrors[0].slash, '/'); ticks(optics, 20, { interact: true }); assert.equal(optics.mirrors[0].slash, '/', 'Held F toggles once');
ticks(optics, 1); assert.equal(optics.rewind(), null); assert.equal(optics.switches.R, false);
ticks(optics, 1, { left: true }); ticks(optics, 160);
assert.equal(optics.switches.R, true, 'Echo reproduces a mirror interaction');
assert(optics.player.x < 100);
optics.undo(); walk(optics, 410); ticks(optics, 1, { interact: true }); ticks(optics, 1); ticks(optics, 1, { interact: true });
assert.equal(optics.switches.R, false, 'Mirror may also switch the beam off');

const occluded = new Game(20); assert.equal(occluded.switches.R, false);
walk(occluded, 760); assert.equal(occluded.switches.R, false, 'The crate blocks light until it clears the receiver');
walk(occluded, 810); assert.equal(occluded.switches.R, true);
const wallLight = fixture({ plates: levels[21].plates, emitters: levels[21].emitters, mirrors: [{ ...levels[21].mirrors[0], slash: '/' }], platforms: [{ x: 300, y: 350, w: 20, h: 130 }] });
assert.equal(wallLight.switches.R, false, 'An opaque wall occludes light');
const loop = fixture({ emitters: [{ x: 300, y: 200, dx: 1, dy: 0, requires: [] }], mirrors: [
  { x: 500, y: 200, slash: '\\' }, { x: 500, y: 350, slash: '/' }, { x: 200, y: 350, slash: '\\' }, { x: 200, y: 200, slash: '/' }
] });
assert.equal(loop.beams.length, 16, 'A closed mirror loop is bounded');
const dark = new Game(23); assert.equal(dark.beams.length, 0, 'Motor-powered light starts off');

// Keep multiple cooperating pushes at walking speed; a closed gate stays solid for boxes.
const capped = fixture({ boxes: [{ x: 160, y: 448, w: 32, h: 32 }], gates: [{ x: 350, y: 80, w: 25, h: 400, requires: ['off'] }] });
ticks(capped, 50, { right: true }); ticks(capped, 10); capped.rewind();
for (let i = 0; i < 150; i++) { const before = capped.boxes[0].x; capped.step({ right: true }); assert(capped.boxes[0].x - before <= 3.401); assert(!overlap(capped.boxes[0], capped.level.gates[0])); }
const echoGate = new Game(); walk(echoGate, 280); ticks(echoGate, 10); echoGate.rewind();
echoGate.ghosts()[0].x = echoGate.level.gates[0].x + 2;
assert.equal(echoGate.open(echoGate.level.gates[0]), true, 'Gate interlock includes echoes');
echoGate.ghosts()[0].dead = true;
assert.equal(echoGate.open(echoGate.level.gates[0]), false, 'Lost echo no longer holds a gate');

assert.equal(levels.length, 25); assert.equal(new Set(levels.map(l => l.title)).size, 25);
levels.forEach(l => {
  const ids = l.plates.map(p => p.id); assert.equal(new Set(ids).size, ids.length);
  for (const device of [...l.gates, ...(l.emitters || []), ...(l.lift ? [l.lift] : [])]) for (const id of device.requires) assert(ids.includes(id), 'Every circuit reference must resolve');
});
console.log('PASS physical replay, airborne contact, latch reset, spent fuse, box-only detection, motion decay, wall blocking, mirror edge/replay, optical occlusion/loops, push speed, echo interlock and 25-room circuit integrity');
