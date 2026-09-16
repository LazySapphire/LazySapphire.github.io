const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../../static/games/pelican-bicycle/motion.js');
const close = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const clock = () => ({ hour: 10.5, motion: 0, weather: 0 });

test('a full day takes 120 seconds at 1x, scaled only by the day speed', () => {
  for (const daySpeed of [.25, .5, 1, 2, 4]) {
    const c = clock();
    const state = { ...M.defaults, autoDay: true, daySpeed, motionSpeed: 2 };
    M.advance(c, 60 / daySpeed, state);
    close(c.hour, 22.5);
    M.advance(c, 60 / daySpeed, state);
    close(c.hour, 10.5);
  }
});

test('motion pause and speed are independent of time; manual time stays fixed', () => {
  const c = clock();
  M.advance(c, 10, { ...M.defaults, autoDay: true, playing: false });
  close(c.motion, 0);
  close(c.hour, 12.5);
  M.advance(c, 10, { ...M.defaults, autoDay: false, motionSpeed: .25 });
  close(c.motion, 2.5);
  close(c.hour, 12.5);
  close(c.weather, 20);
});

test('clock rate does not depend on frame rate and wraps through midnight', () => {
  for (const fps of [10, 30, 60, 144]) {
    const c = clock();
    for (let i = 0; i < fps * 200; i++) M.advance(c, 1 / fps, { ...M.defaults, autoDay: true });
    close(c.hour, 2.5, 1e-7);
    close(c.motion, 200, 1e-7);
  }
  assert.equal(M.formatTime(24), '00:00');
  assert.equal(M.formatTime(18.5), '18:30');
});

test('reduced motion freezes scenery until motion is explicitly resumed', () => {
  const c = clock();
  M.advance(c, 2, { ...M.defaults, playing: false, reduceMotion: true });
  assert.deepEqual(c, clock());
  M.advance(c, 2, { ...M.defaults, playing: true, reduceMotion: true });
  close(c.weather, 2);
  close(c.motion, 2);
});

for (const activity of ['cycling', 'running', 'rowing']) {
  test(`${activity}: hands and feet remain reachable with constant limb lengths`, () => {
    for (let t = 0; t < 20; t += .017) {
      const p = M.pose(activity, t);
      assert.ok(p.hip.every(Number.isFinite) && Number.isFinite(p.tilt));
      for (const leg of p.legs) {
        close(distance(leg.start, leg.knee), p.legLength);
        close(distance(leg.knee, leg.end), p.legLength);
      }
      for (const arm of p.arms) {
        close(distance(arm.start, arm.elbow), 83);
        close(distance(arm.elbow, arm.end), 83);
      }
    }
  });
}

test('cycling feet follow opposite pedals on the same crank', () => {
  for (let t = 0; t < 10; t += .03) {
    const [a, b] = M.pose('cycling', t).legs.map(l => l.foot.point);
    close(distance(a, [594, 480]), 31);
    close(distance(b, [594, 480]), 31);
    close((a[0] + b[0]) / 2, 594);
    close((a[1] + b[1]) / 2, 480);
  }
});

test('running feet stay on the ground during stance and rise during swing', () => {
  let grounded = 0, airborne = 0;
  for (let t = 0; t < 10; t += .01) {
    for (const { foot } of M.pose('running', t).legs) {
      if (foot.stance) { close(foot.point[1], 570); grounded++; }
      else { assert.ok(foot.point[1] < 570 && foot.point[1] >= 492); airborne++; }
    }
  }
  assert.ok(grounded > 0 && airborne > 0);
  const cycle = 1 / .72;
  for (const leg of [0, 1]) {
    assert.ok(distance(M.pose('running', cycle - 1e-7).legs[leg].foot.point,
      M.pose('running', cycle + 1e-7).legs[leg].foot.point) < .001);
  }
});

test('rowing hands grip the same paddle shaft through the full stroke', () => {
  for (let t = 0; t < 10; t += .03) {
    const p = M.pose('rowing', t), [far, near] = p.arms;
    close(distance(near.end, p.paddle.hand), 0);
    close(distance(far.end, near.end), 42);
    close(distance(near.end, p.paddle.tip), 222);
    close(distance(far.end, p.paddle.tip), 264);
  }
});
