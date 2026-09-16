const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../../static/games/pelican-bicycle/motion.js');
const close = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const clock = () => ({ hour: 10.5, motion: 0, weather: 0 });

test('a full day takes 60 seconds at 1x, scaled only by the day speed', () => {
  for (const daySpeed of [.25, .5, 1, 2, 4]) {
    const c = clock();
    const state = { ...M.defaults, autoDay: true, daySpeed, motionSpeed: 2 };
    M.advance(c, 30 / daySpeed, state);
    close(c.hour, 22.5);
    M.advance(c, 30 / daySpeed, state);
    close(c.hour, 10.5);
  }
});

test('motion pause and speed are independent of time; manual time stays fixed', () => {
  const c = clock();
  M.advance(c, 10, { ...M.defaults, autoDay: true, playing: false });
  close(c.motion, 0);
  close(c.hour, 14.5);
  M.advance(c, 10, { ...M.defaults, autoDay: false, motionSpeed: .25 });
  close(c.motion, 5);
  close(c.hour, 14.5);
  close(c.weather, 20);
});

test('clock rate does not depend on frame rate and wraps through midnight', () => {
  for (const fps of [10, 30, 60, 144]) {
    const c = clock();
    for (let i = 0; i < fps * 200; i++) M.advance(c, 1 / fps, { ...M.defaults, autoDay: true });
    close(c.hour, 18.5, 1e-7);
    close(c.motion, 400, 1e-7);
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
  close(c.motion, 4);
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

const W = require('../../static/games/pelican-bicycle/world.js');
const Music = require('../../static/games/pelican-bicycle/music.js');

test('four destinations support each activity and the requested rowing surfaces', () => {
  assert.equal(Object.keys(M.species).length, 10);
  const expected = {coast:'water',forest:'grass',desert:'sand',city:'pool'};
  const defaults = {...M.defaults,elements:W.defaultElements()};
  assert.ok(W.art(defaults)); // Initial page state must be renderable.
  for (const scene of Object.keys(W.scenes)) {
    assert.equal(W.scenes[scene].elements.length, 5);
    for (const activity of ['cycling','running','rowing']) {
      const state = {...defaults,scene,activity};
      const art = W.art(state);
      assert.ok(!/undefined|NaN/.test(art));
      assert.ok(art.includes('id="world-backdrop"'));
      assert.equal(W.surfaceKind(state), activity === 'rowing' ? expected[scene] : 'road');
    }
  }
  const a = W.defaultElements(), b = W.defaultElements();
  a.coast.length = 0;
  assert.ok(b.coast.length > 0, 'reset must not share mutable background selections');
});

test('random environment includes valid backgrounds and never changes the traveler or motion', () => {
  let seed = 8421;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2**32);
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const env = W.randomEnvironment(random);
    assert.deepEqual(Object.keys(env).sort(), ['elements','hour','scene','season','weather']);
    seen.add(env.scene);
    assert.ok(env.hour >= 0 && env.hour < 24);
    assert.ok(['spring','summer','autumn','winter'].includes(env.season));
    assert.ok(['clear','cloudy','rain','snow','fog'].includes(env.weather));
    for (const [scene,keys] of Object.entries(env.elements)) {
      assert.equal(new Set(keys).size, keys.length);
      assert.ok(keys.every(key => W.scenes[scene].elements.some(e => e[0] === key)));
      for (const depth of Object.keys(W.layers)) {
        assert.equal(keys.filter(key=>W.options(scene,depth).some(e=>e[0]===key)).length,1,
          `${scene} must select exactly one ${depth} element`);
      }
    }
  }
  assert.equal(seen.size, 4);
});

test('surface movement follows the motion clock, including pause and doubled base rate', () => {
  const c = clock();
  const before = W.flowOffset(c.motion, 4);
  M.advance(c, 1, M.defaults);
  assert.notEqual(W.flowOffset(c.motion, 4), before);
  close(c.motion, 2);
  const paused = W.flowOffset(c.motion, 4);
  M.advance(c, 8, {...M.defaults, playing:false, autoDay:true});
  close(W.flowOffset(c.motion, 4), paused);
});

test('parallax is ordered behind the road for all activities and respects pause and speed', () => {
  for (const activity of ['cycling','running','rowing']) {
    for (const motionSpeed of [.25,1,2]) {
      const c=clock(),state={...M.defaults,activity,motionSpeed};
      M.advance(c,.1,state);
      const travel=W.travelDistance(c.motion,activity);
      const distances=Object.keys(W.layers).map(depth=>-W.layerOffset(c.motion,activity,depth));
      assert.ok(0<distances[0] && distances[0]<distances[1] && distances[1]<distances[2]);
      close(distances[0]/travel,.10);close(distances[1]/travel,.36);close(distances[2]/travel,.72);
      for(let row=0;row<6;row++)assert.ok(-W.flowOffset(c.motion,row,activity)>distances[2]);
      close(-W.flowOffset(c.motion,5,activity),travel);
      const before=Object.keys(W.layers).map(depth=>W.layerOffset(c.motion,activity,depth));
      M.advance(c,5,{...state,playing:false,autoDay:true});
      assert.deepEqual(Object.keys(W.layers).map(depth=>W.layerOffset(c.motion,activity,depth)),before);
    }
  }
});

test('every optional object belongs to one layer and rests on its support plane', () => {
  for(const [scene,config] of Object.entries(W.scenes)) {
    for(const [key,,depth] of config.elements) {
      const state={...M.defaults,scene,elements:{[scene]:[key]}};
      const [p]=W.placements(state);
      assert.equal(p.depth,depth);
      if(p.support==='air')assert.ok(p.y<W.layers[depth].y);
      else close(p.y,W.layers[depth].y);
      const art=W.art(state),planeIndex=art.indexOf(`data-ground="${depth}"`),objectIndex=art.indexOf(`data-element="${key}"`);
      assert.ok(planeIndex>=0 && objectIndex>planeIndex);
      assert.ok(objectIndex<art.indexOf('id="world-surface"'));
    }
    const crowded={...M.defaults,scene,elements:{[scene]:config.elements.map(e=>e[0])}};
    assert.equal(W.placements(crowded).length,3,'rendering must never stack two choices in one layer');
    assert.equal(W.placements({...crowded,elements:{[scene]:[]}}).length,0,'all layers can be left empty');
  }
});

test('layer wrapping preserves the visible position and never duplicates a whole object', () => {
  const visibleCenters=(time,depth)=>[-W.period,0,W.period].map(shift=>
    W.layers[depth].x+shift+W.layerOffset(time,'cycling',depth)).filter(x=>x>=-180&&x<=1380);
  for(const [depth,layer] of Object.entries(W.layers)) {
    const loopSeconds=W.period/(170*layer.ratio);
    for(let t=0;t<loopSeconds*2;t+=.1)assert.ok(visibleCenters(t,depth).length<=1);
    const before=visibleCenters(loopSeconds-1e-6,depth),after=visibleCenters(loopSeconds+1e-6,depth);
    assert.equal(before.length,1);assert.equal(after.length,1);
    close(before[0],after[0],.001);
  }
});

test('all scene and weather scores produce bounded notes and distinct arrangements', () => {
  const signatures = new Set();
  for (const scene of Object.keys(W.scenes)) {
    signatures.add(JSON.stringify(Music.scores[scene].notes));
    for (const sky of Object.keys(Music.weather)) {
      const p = Music.profile(scene,sky);
      assert.ok(p.tempo > 40 && p.tempo < 120);
      assert.ok(p.brightness > 0);
      let count = 0;
      for (let step = 0; step < 64; step++) {
        for (const event of Music.events(scene,sky,step)) {
          const frequency = Music.frequency(event.midi);
          assert.ok(frequency > 30 && frequency < 5000);
          assert.ok(event.amp > 0 && event.amp <= .13 && event.duration > 0);
          count++;
        }
      }
      assert.ok(count > 48);
    }
    assert.notEqual(Music.profile(scene,'clear').tempo, Music.profile(scene,'rain').tempo);
  }
  assert.equal(signatures.size, 4);
});

test('music stops scheduling on mute or hidden pages, and cannot restart after an async stop', async () => {
  const timers = new Set(), notes = [];
  const param = () => ({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
  const node = () => ({gain:param(),frequency:param(),connect(){},disconnect(){}});
  const ctx = {currentTime:1,destination:{},resume:async()=>{},createGain:node,createBiquadFilter:node,createOscillator(){
    const o={...node(),start(t){notes.push(t);},stop(){}};return o;
  }};
  const timerAPI = {setInterval(fn){timers.add(fn);return fn;},clearInterval(fn){timers.delete(fn);}};
  const engine = Music.create(()=>ctx,()=>({scene:'coast',weather:'clear'}),timerAPI);
  assert.equal(timers.size,0);
  await engine.start();assert.equal(engine.enabled,true);assert.equal(timers.size,1);assert.ok(notes.length>0);
  await engine.start();assert.equal(timers.size,1);
  await engine.setHidden(true);assert.equal(timers.size,0);
  await engine.setHidden(false);assert.equal(timers.size,1);
  engine.setVolume(0);engine.stop();assert.equal(timers.size,0);assert.equal(engine.enabled,false);
  let finishResume;ctx.resume=()=>new Promise(resolve=>{finishResume=resolve;});
  const pending=engine.start();engine.stop();finishResume();await pending;
  assert.equal(timers.size,0);assert.equal(engine.enabled,false);
});

const A = require('../../static/games/pelican-bicycle/anatomy.js');
// Sample the actual torso SVG curves, rather than just checking that two
// configuration values agree. Neck edges must lie inside the painted torso.
function silhouette(d) {
  const points=[];let point=[0,0];
  for(const [,command,args] of d.matchAll(/([MLQCZ])([^MLQCZ]*)/g)) {
    const n=(args.match(/-?\d*\.?\d+/g)||[]).map(Number),start=point;
    if(command==='M'||command==='L'){point=n;points.push(point);}
    if(command==='Q'||command==='C') {
      const cubic=command==='C',end=cubic?n.slice(4,6):n.slice(2,4);
      for(let i=1;i<=40;i++) {
        const t=i/40,u=1-t;
        points.push([0,1].map(k=>cubic?u**3*start[k]+3*u*u*t*n[k]+3*u*t*t*n[k+2]+t**3*end[k]:u*u*start[k]+2*u*t*n[k]+t*t*end[k]));
      }
      point=end;
    }
  }
  return points;
}
function inside([x,y],polygon) {
  let contained=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)contained=!contained;
  }
  return contained;
}

test('all 100 head/body combinations tuck the complete neck base inside the torso', () => {
  for(const [body,b] of Object.entries(A.bodies)) {
    const polygon=silhouette(b.shape);
    for(const [head,h] of Object.entries(A.heads)) {
      const mount=A.headMount(head,body);
      close(mount.x+h.base[0]*mount.scale,b.neck[0]);
      close(mount.y+h.base[1]*mount.scale,b.neck[1]);
      for(const x of [h.span[0],h.base[0],h.span[1]]) {
        const base=[mount.x+x*mount.scale,mount.y+h.base[1]*mount.scale];
        assert.ok(inside(base,polygon),`${head} neck edge ${base} must be inside ${body}`);
      }
    }
  }
});

test('all species leg rigs stay reachable and keep their activity contact points', () => {
  for(const [species,style] of Object.entries(A.legs))for(const activity of ['cycling','running','rowing']) {
    for(let t=0;t<15;t+=.031) {
      const pose=M.pose(activity,t,style),reference=M.pose(activity,t);
      for(const [i,leg] of pose.legs.entries()) {
        close(distance(leg.start,leg.knee),leg.upperLength);
        close(distance(leg.knee,leg.hock||leg.end),leg.lowerLength);
        if(leg.hock)close(distance(leg.hock,leg.end),Math.hypot(...style.hock));
        assert.deepEqual(leg.foot,reference.legs[i].foot,`${species} must retain ${activity} contact`);
        close(distance(leg.end,M.local(leg.foot.point,[-10,-12],leg.foot.angle)),0);
        assert.deepEqual(leg.start,M.local(pose.hip,[i?7:-9,0],pose.tilt));
        const drawing=A.legDrawing(leg,species);
        assert.ok(Object.values(drawing).every(path=>!/NaN|Infinity|undefined/.test(path)));
      }
    }
  }
});

test('species have distinct leg silhouettes and tails appropriate to their bodies', () => {
  const outlines=new Set();
  for(const [key,style] of Object.entries(A.legs)) {
    outlines.add(JSON.stringify(A.legDrawing(M.pose('running',.23,style).legs[1],key)));
    assert.ok(A.bodies[key] && A.heads[key]);
  }
  assert.equal(outlines.size,10);
  assert.ok(A.legs.rabbit.upper[1]>A.legs.cat.upper[1]);
  assert.ok(A.legs.pelican.lower[1]<A.legs.bear.lower[1]);
  assert.ok(A.legs.fox.hock[0]<0 && A.legs.frog.hock[0]<0);
  assert.equal(A.tails.human,'');assert.equal(A.tails.frog,'');
  assert.equal(new Set(Object.values(A.tails).filter(Boolean)).size,8);
});
