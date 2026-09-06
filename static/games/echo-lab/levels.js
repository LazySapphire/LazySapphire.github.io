/* Authored rooms: stable first-five indices preserve existing local progress. */
const EchoLevels = (() => {
  const FLOOR = 480;
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
      note: '贴着箱子走就能推动。配重开关只认箱子。回溯会重置箱子；分身也会重演推箱子的操作。',
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

  const orb = (id, x, y, kind = 'near', extra = {}) => ({ id, x: x - 22, y, w: 44, radius: 24, kind, ...extra });
  const box = (x, w = 32, h = 32) => ({ x, y: FLOOR - h, w, h });
  const motor = (id, x, w = 250) => ({ id, x, y: FLOOR, w, kind: 'motion', capacity: 60, threshold: 20 });
  const receiver = (id, x, y) => orb(id, x, y, 'light', { radius: 14 });
  const mirror = (x, y, slash = '\\', fixed = false) => ({ x, y, slash, fixed });
  const emitter = (x, y, requires = []) => ({ x, y, dx: 1, dy: 0, requires });
  const add = (title, subtitle, objective, note, hint, geometry) => levels.push({ title, subtitle, objective, note, hint, plates: [], gates: [], platforms: [], boxes: [], hazards: [], goal: { x: 1030, y: FLOOR }, ...geometry });

  // II / Amber workshop: shared matter, durable changes, moving footholds.
  add('过去也有重量', '这一次，过去的你真的能推箱子。',
    '让箱子压住 B，再让分身守住 A。试着把运输交给过去的你。',
    '分身回放的是操作，不是固定路线。箱子位置变了，它的路径也会改变；你们彼此穿过，但都能推箱子。',
    '第一轮把箱子推到 B，站稳后按 E。第二轮在 A 留下分身。第三轮跳过已运到 B 的箱子，穿过 A+B 闸门。',
    { plates: [plate('A', 200), plate('B', 480, FLOOR, true)], gates: [gate(790, ['A', 'B'])], boxes: [box(300)] });
  add('举手之劳', '有些承诺，只要碰一下就算数。',
    '跳起碰亮记忆开关 A，再把箱子送到 B。',
    '菱形 ∞ 是记忆开关：角色碰一次，本轮一直亮。回溯、重试或重置时，它会恢复初始状态。',
    '在 A 下方起跳，看到 ∞ 常亮后向右推箱子。B 亮起时停下，跳过箱子去出口，不必给 A 留人。',
    { plates: [orb('A', 260, 370, 'latch'), plate('B', 620, FLOOR, true)], gates: [gate(880, ['A', 'B'])], boxes: [box(500)] });
  add('搭自己的顺风车', '一个负责驾驶，一个负责抬头看路。',
    '把宽箱当移动踏板，借它登上 150 像素高的上层。',
    '箱子移动时会带着站在上面的人。分身可以当司机；录制结束后不再走路，但仍受重力和箱子影响。',
    '先向右推宽箱一段距离并留下分身。重播时跳到箱顶，跟着车走，接近上层左边缘时再次起跳。也可以探索自己搬运踏板的解法。',
    { boxes: [box(240, 72, 48)], platforms: [platform(600, 330, 495)], goal: { x: 1025, y: 330 } });
  add('不必原路等待', '留下一盏灯，再去做另一件事。',
    '点亮高处 A 后离开平台，把箱子推到 B。',
    '记忆开关释放了一个分身名额。高处绕路只需一次，接下来的时间可以拿去搬运。',
    '利用左侧两级平台，站到上层后跳起碰 A。落回地面，将箱子推至 B，再跳过箱子。',
    { plates: [orb('A', 420, 275, 'latch'), plate('B', 750, FLOOR, true)], gates: [gate(930, ['A', 'B'])], platforms: [platform(175, 420, 100), platform(330, 355, 165)], boxes: [box(540)] });
  add('仓库二重奏', '两只箱子，两段各司其职的过去。',
    '点亮 A，把两只箱子分别留在 B 与 C。',
    '箱子会挡住后来的路线。绕过已经就位的货物，别把完成的工作又推走。',
    '跳亮 A，推第一箱到 B 并记录。第二轮跳过第一箱，穿门后推第二箱到 C 再记录。最后跳过两箱去出口。',
    { plates: [orb('A', 190, 370, 'latch'), plate('B', 420, FLOOR, true), plate('C', 775, FLOOR, true)], gates: [gate(570, ['A', 'B']), gate(950, ['B', 'C'])], boxes: [box(280), box(650)] });

  // III / Blue observatory: transient contact and synchronized air time.
  add('空中的一拍', '门开的那一刻，你不必还在开关旁。',
    '录下一次跳跃，让分身在空中触发 A，自己穿过远处闸门。',
    '圆环 ◎ 是感应开关：只认附近角色，离开立即熄灭。地面走过不会碰到这个空中开关。',
    '走到 A 下方，等约 2 秒，原地完整跳一次，落地后记录。重播时先到闸门前等，分身跳起时穿过。',
    { plates: [orb('A', 300, 365)], gates: [gate(660, ['A'])] });
  add('延迟接力', '同一首歌，可以从不同的拍子开始。',
    '用两段错开的跳跃，依次开启 A 门与 B 门。',
    '录制时的等待也会被记住。两扇门不必同时开，按自己的行进速度安排跳跃。',
    '先在 A 下等 2 秒、跳跃并记录。第二轮穿 A 门，在 B 下稍等、跳跃并记录。第三轮跟着开门节奏向右走。',
    { plates: [orb('A', 250, 365), orb('B', 650, 365)], gates: [gate(480, ['A']), gate(860, ['B'])] });
  add('远路与近门', '长久的承诺，接上一瞬的机会。',
    '高处 A 记忆常亮，地面上方 B 感应开门。',
    '先让长路线获得持久成果，再让另一个分身制造短窗口。∞ 与 ◎ 的分工很不同。',
    '登上左侧平台，跳亮 A，落地记录。下一轮通过 A 门，在 B 下等一会儿再原地跳、记录。最后直奔出口。',
    { plates: [orb('A', 420, 275, 'latch'), orb('B', 820, 365)], gates: [gate(740, ['A']), gate(950, ['A', 'B'])], platforms: [platform(175, 420, 100), platform(330, 355, 165)] });
  add('同一秒的我们', '隔着半个房间，跳出同一个节拍。',
    '让远处的 A 与 B 同时感应到角色，为第三人开门。',
    '看时间轨迹安排等待。两个分身的跳跃窗口要重合，不是各自碰过一次就行。',
    '第一段在 A 下等到约第 4 秒再跳。第二段到 B 后，也等到第 4 秒再跳。第三轮提前到门口，等双环一起亮。',
    { plates: [orb('A', 250, 365), orb('B', 550, 365)], gates: [gate(870, ['A', 'B'])] });
  add('留灯、搬运、起跳', '把三件事，交给三种不同的时间。',
    '记忆 A、平台上方感应 B、箱子配重 C 一起开启终门。',
    'B 离地较高，先上平台才能碰到。不要把箱子留在平台的左边；它需要继续运到右侧。',
    '先跳亮 A，再将箱子送到 C 并记录。下一轮跳上中间平台，在 B 下等到约 5 秒再跳、记录。最后借两个分身的成果通过终门。',
    { plates: [orb('A', 230, 370, 'latch'), orb('B', 655, 285), plate('C', 800, FLOOR, true)], gates: [gate(460, ['A']), gate(960, ['A', 'B', 'C'])], platforms: [platform(590, 400, 140)], boxes: [box(510)] });

  // IV / Violet engine room: one-shot deadlines and sustained movement.
  add('一枚火花', '倒计时一旦开始，就不再回头。',
    '跳触 F，在 4 秒内过门；途中跳过红色危险区。',
    '时钟 ◷ 是一次性定时开关：首次靠近便消耗，时间到后本轮不能再触发。R 可重试并复位。',
    '准备好路线再跳亮 F。保持向右，在红线前起跳，计时结束前穿过闸门。再碰已耗尽的 F 不会延时。',
    { plates: [orb('F', 250, 365, 'fuse', { duration: 240 })], gates: [gate(850, ['F'])], hazards: [{ x: 645, y: 468, w: 65, h: 12 }] });
  add('把火花留到最后', '不是跑得更快，而是晚一点点开始。',
    '远处 F 只亮 2 秒。让分身等你接近终门才点火。',
    '别在第一轮见到开关就跳。提前规划你的抵达时间，把等待也录进分身。',
    '到 F 下方后等到计时约 4 秒，再跳跃并记录。重播时一路向右，到门前等分身点火。',
    { plates: [orb('F', 260, 365, 'fuse', { duration: 120 })], gates: [gate(920, ['F'])] });
  add('请不要停下来', '这台机器，需要真实的脚步。',
    '让分身在 M 跑道上持续往返，为远处闸门供能。',
    '箭头跑道 ⇆ 只在角色落地且实际移动时充能。站着不动、顶墙或站在移动箱子上都不算；停下约 1 秒便失去供能。',
    '在跑道内左右折返，录下约 8 秒连续运动。新一轮让它负责跑步，你负责抵达出口。',
    { plates: [motor('M', 170, 270)], gates: [gate(900, ['M'])] });
  add('发动机与引信', '持续的努力，换一个短暂的出口。',
    '保持 M 供能，穿过中门，在终点前跳亮 F。',
    '运动供能和一次性计时可以串联。记录的跑步要够长，才能覆盖你跳跃与赶路的时间。',
    '先记录跑道内约 10 秒往返。重播后穿过 M 门，在 F 下起跳，趁它还亮着通过 M+F 终门。',
    { plates: [motor('M', 160, 260), orb('F', 715, 365, 'fuse', { duration: 150 })], gates: [gate(540, ['M']), gate(950, ['M', 'F'])] });
  add('不停歇的合奏', '两台发动机，和一位最后按下按钮的人。',
    '两个分身分别在 M、N 跑道运动，你在终门前点燃 F。',
    '第二台发动机在第一扇门后。先录足够长的 M，再录 N；最后一轮需要两段运动窗口重叠。',
    '在 M 录约 12 秒折返。第二轮走到 N，在 610—780 之间往返约 7 秒并记录。第三轮穿过两区，跳亮 F 后冲过终门。',
    { plates: [motor('M', 160, 240), motor('N', 590, 220), orb('F', 855, 365, 'fuse', { duration: 120 })], gates: [gate(470, ['M']), gate(960, ['M', 'N', 'F'])] });

  // V / Rose optics lab: object-only detection, real reflected rays and synthesis.
  add('让光走过去', '身体不挡光，箱子会。',
    '把挡光的箱子推到 R 右侧，让光束抵达接收器。',
    '太阳符号 ☼ 只认光束，不认你或分身。金色实验光无伤害，可被箱子、实体墙和关闭的门挡住；红色危险区仍不能碰。',
    '推着箱子向右，直到 R 亮起。箱子越过接收器即可让光通过；随后跳过箱子去出口。',
    { plates: [receiver('R', 800, 455)], gates: [gate(950, ['R'])], boxes: [box(400)], emitters: [emitter(170, 455)] });
  add('转一个弯', '路不通的时候，改变光的方向。',
    '靠近可转镜面按 F，将水平光反射到上方 R。',
    '镜子有 / 与 \\ 两种方向。F 转动最近的可动镜；分身会记录并重演这次交互。触屏也有「交互」按钮。',
    '走到镜子下方附近，按一次 F，把 \\ 改为 /。观察向上的光到达 R，再去出口。',
    { plates: [receiver('R', 420, 180)], gates: [gate(870, ['R'])], mirrors: [mirror(420, 420)], emitters: [emitter(170, 420)] });
  add('折光搬运工', '先清出光路，再照亮拐角。',
    '用箱子压 B，再转动下层镜，让光经过两次反射抵达 R。',
    '上层标有 FIX 的镜子是固定镜。高箱既是配重，也是光路障碍；安排好它最终停的位置。',
    '先把高箱推到 B，回到下方镜子旁按 F。上方固定 / 镜将光折向右。最后跳过高箱，穿过 R+B 门。',
    { plates: [receiver('R', 820, 240), plate('B', 730, FLOOR, true)], gates: [gate(950, ['R', 'B'])], boxes: [box(300, 40, 64)], mirrors: [mirror(500, 420), mirror(500, 240, '/', true)], emitters: [emitter(170, 420)] });
  add('奔跑的光', '光源的心跳，来自另一端的你。',
    '让 M 持续为光源供电，旋转镜面，保持 R 接收到光。',
    '并非所有光源都常亮：标着 M 的光源要靠跑道供能。只留下站着的分身，光会熄灭。',
    '先录跑道内约 10 秒往返。重播时去镜子旁按 F，让光向上抵达 R；分身仍在跑步时穿过终门。',
    { plates: [motor('M', 170, 250), receiver('R', 660, 180)], gates: [gate(940, ['M', 'R'])], mirrors: [mirror(660, 420)], emitters: [emitter(480, 420, ['M'])] });
  add('众声成光', '把等待、奔跑、重量和光，写进同一段时间。',
    '记忆 L 开路，跑道 M 供电，箱子压 B，镜面点亮 R，最后触发一次性 T。',
    '这是五章机制的合奏。没有唯一剧本：过去可以搬运、点灯、供能，你来安排它们相遇的时刻。',
    '先跳亮 L，在 M 录约 16 秒往返。新一轮把箱子推到 B，回到镜边按 F，绕过箱子，在 T 下起跳并穿过终门。也试试让另一个分身负责运输或转镜。',
    { plates: [orb('L', 235, 365, 'latch'), motor('M', 160, 250), receiver('R', 660, 180), plate('B', 785, FLOOR, true), orb('T', 880, 365, 'fuse', { duration: 120 })], gates: [gate(470, ['L']), gate(975, ['M', 'R', 'B', 'T'])], boxes: [box(550)], mirrors: [mirror(660, 420)], emitters: [emitter(500, 420, ['M'])] });

  const chapters = [
    { title: '基础共振', subtitle: '遇见过去的自己', bg: '#101918', surface: '#16211f', raised: '#1d2b27', border: '#455a4e', muted: '#acbdb1', accent: '#bce5cd', chamber: '#101c1c', glow: '#294239' },
    { title: '琥珀工坊', subtitle: '重量与长久的承诺', bg: '#201912', surface: '#2b231a', raised: '#392d21', border: '#66523d', muted: '#cfbca7', accent: '#f3cd91', chamber: '#211b16', glow: '#4a3725' },
    { title: '蓝调观测站', subtitle: '让跳跃落在同一秒', bg: '#111c2b', surface: '#182638', raised: '#22344b', border: '#425f7b', muted: '#b0c5dc', accent: '#a2d7f9', chamber: '#101e30', glow: '#28445e' },
    { title: '紫夜动力室', subtitle: '跑动、等待与倒计时', bg: '#1d172c', surface: '#282038', raised: '#352b4b', border: '#635176', muted: '#c7b9dd', accent: '#d7baf8', chamber: '#1d182e', glow: '#433358' },
    { title: '玫瑰光学所', subtitle: '将所有声音汇成光', bg: '#25191f', surface: '#302129', raised: '#402d37', border: '#745263', muted: '#d9bccb', accent: '#f1bad2', chamber: '#251a24', glow: '#533443' }
  ];
  levels.forEach((level, i) => { level.chapter = Math.floor(i / 5); level.seconds = i < 15 ? 24 : 32; });
  return { levels, chapters };
})();
if (typeof module !== 'undefined') module.exports = EchoLevels;
