(() => {
  'use strict';
  const M=CoastMotion, $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let state={...M.defaults,playing:!reduced.matches,reduceMotion:reduced.matches};
  const clock={motion:0,weather:0,hour:10.5};
  let frame=0,previous=0,lastMinute=-1,bellUntil=0,audio;
  const speciesKeys=Object.keys(M.species);
  const colors=[['陶土橘','#d97550'],['海草绿','#709381'],['海水蓝','#709dab'],['麦穗黄','#d2b166'],['莓果粉','#bb8392'],['奶油白','#ebe4cc']];
  const seasons={spring:{name:'春日',back:'#d9deb4',front:'#afc498',ground:'#ddd6b9',leaf:'#a6bb88',flower:'#e6b1bb'},summer:{name:'夏日',back:'#d2d9ae',front:'#bdc994',ground:'#dad4af',leaf:'#89a77d',flower:'#e7cd81'},autumn:{name:'秋日',back:'#d9c292',front:'#c5a36e',ground:'#decaab',leaf:'#c78f57',flower:'#ca724a'},winter:{name:'冬日',back:'#dce5dc',front:'#cfdbd1',ground:'#e4e5da',leaf:'#bccfc7',flower:'#f5f4e8'}};
  const weatherNames={clear:'晴天',cloudy:'多云',rain:'下雨',snow:'飘雪',fog:'薄雾'};
  const activityNames={cycling:'骑自行车',running:'跑步',rowing:'划艇'};
  const eye=(name,x,y,r=4.5)=>`<g id="eye-${name}" transform="translate(${x} ${y})"><circle r="${r}" fill="#294e46" stroke="none"/><circle cx="1.2" cy="-1.4" r="1.3" fill="#fff8e7" stroke="none"/></g>`;
  const cores={
    pelican:'M-78-55Q-46-95 7-86Q37-85 50-77Q70-65 57-36Q47-4 10 2Q-39 8-72-14Q-93-33-78-55Z',
    human:'M-25-2L-27-34L-16-78Q-7-95 19-93Q49-89 54-68L48-33L35 1Z',
    cat:'M-57-13Q-82-37-50-70Q-14-103 26-83Q52-82 59-59Q62-28 36-5Q-13 17-57-13Z',
    rabbit:'M-56-7Q-91-38-58-70Q-36-93-2-83Q41-99 56-65Q66-31 31-5Q-12 15-56-7Z',
    bear:'M-61-8Q-84-39-63-73Q-41-103 5-90Q50-95 62-64Q75-26 39 1Q-9 20-61-8Z',
    fox:'M-62-10Q-89-32-59-62Q-26-89 15-83Q53-89 59-58Q66-31 30-6Q-12 12-62-10Z'
  };
  $('character-symbols').innerHTML=speciesKeys.map(key=>`<path id="torso-${key}" d="${cores[key]}"/>`).join('')+`
    <clipPath id="clothes-clip"><use id="clothes-boundary"/></clipPath>
    <g id="tail-human"></g><g id="tail-pelican" fill="#f6f2dd"><path d="M-68-43L-111-65L-101-39L-119-48Q-107-19-64-14Z"/></g>
    <g id="tail-cat" fill="none"><path d="M-58-20Q-108-1-106-39T-122-74" stroke="#294e46" stroke-width="18"/><path d="M-58-20Q-108-1-106-39T-122-74" stroke="#dca96e" stroke-width="12"/></g>
    <g id="tail-rabbit" fill="#faf6e8"><circle cx="-72" cy="-18" r="21"/></g><g id="tail-bear" fill="#a37d59"><circle cx="-67" cy="-20" r="13"/></g>
    <g id="tail-fox"><path d="M-50-14Q-98 1-121-34L-140-70Q-86-78-52-39Z" fill="#d68450"/><path d="M-140-70Q-115-75-99-65L-111-48L-102-38L-121-34Z" fill="#f2e7cf" stroke="none"/></g>
    <g id="head-pelican"><path d="M-13 10Q-17-18-11-54L-11-81Q-14-105 10-113Q34-121 49-101Q62-80 46-63Q30-46 30-13L30 10Z" fill="#fbf6e4"/><path d="M9-63Q9-30 3 8H23Q18-33 34-60Z" fill="#dfdfc8" stroke="none"/><path d="M46-78L177-60Q149-25 103-25Q69-24 51-58Z" fill="#edbf64"/><path d="M61-61Q93-25 147-45" fill="none" stroke="#d79c4d" stroke-width="2"/><path d="M44-87Q106-85 181-63Q190-58 179-55L42-69Z" fill="#f4d781"/><path d="M54-69L175-59" stroke="#b58a42" stroke-width="1.5"/><path d="M11-112l-10-16m20 13-4-17" fill="none" stroke-width="2.5"/><circle cx="33" cy="-89" r="11" fill="#e8d9a6" stroke="none"/>${eye('pelican',33,-89,5)}<path d="M22-104q10-5 17 0" fill="none" stroke-width="2"/></g>
    <g id="head-human"><path d="M0-15V12H25V-17" fill="#ecc49d"/><path d="M-16-50Q-15-80 15-80Q43-79 43-50L54-32L42-28Q44-5 23-2Q-13 0-16-28Z" fill="#ecc49d"/><path d="M-15-42q-17-8-12 10q3 10 14 6" fill="#ecc49d"/><path d="M32-18q6 4 11 0M22-58h12" fill="none" stroke-width="2"/><circle cx="29" cy="-28" r="7" fill="#d99885" opacity=".5" stroke="none"/>${eye('human',29,-47,3.7)}</g>
    <g id="head-cat"><path d="M-2-17V13H27V-14" fill="#dca96e"/><path d="M-21-48L-27-84L1-65Q16-70 28-62L47-83L46-43Q65-14 31 1Q-11 9-24-22Z" fill="#dca96e"/><path d="M-20-73l3 20L-5-64M40-71 29-59 40-51" fill="#d5a092" stroke="none"/><path d="M33-29Q62-37 60-20Q55-7 35-12" fill="#efe2c8"/><path d="M58-28l7 5-8 5Z" fill="#705447" stroke-width="1.5"/><path d="M49-13 62-9m-15-10 18-1M-11-45l10 4m-7-13 9 5" fill="none" stroke-width="1.8"/>${eye('cat',27,-40,4)}</g>
    <g id="head-rabbit"><path d="M-2-16V13H28V-14" fill="#ece6db"/><path d="M-9-62Q-34-123-18-130Q-3-141 7-65M17-64Q11-139 30-143Q48-144 37-59" fill="#ece6db"/><path d="M-11-80l-8-36M28-84l1-40" stroke="#d8aea5" stroke-width="8"/><path d="M-20-38Q-21-73 10-78Q45-82 48-47Q68-32 57-17Q48 0 19 0Q-18 0-20-38Z" fill="#ece6db"/><path d="M43-26q18-8 18 4l-7 5Z" fill="#ca9c93" stroke-width="1.5"/><path d="M42-15q8 4 13-2" fill="none" stroke-width="2"/>${eye('rabbit',30,-42,4.5)}</g>
    <g id="head-bear"><path d="M-5-13V14H27V-11" fill="#a37d59"/><circle cx="-14" cy="-62" r="17" fill="#a37d59"/><circle cx="39" cy="-63" r="16" fill="#a37d59"/><circle cx="-14" cy="-62" r="9" fill="#c5a788" stroke="none"/><circle cx="39" cy="-63" r="8" fill="#c5a788" stroke="none"/><path d="M-24-34Q-27-72 9-76Q45-79 48-43Q64-14 35-1Q-17 15-24-34Z" fill="#a37d59"/><ellipse cx="39" cy="-22" rx="20" ry="16" fill="#cdb38c" stroke-width="2"/><ellipse cx="47" cy="-27" rx="8" ry="5" fill="#4e4639" stroke="none"/><path d="M46-21v7l-8 1" fill="none" stroke-width="2"/>${eye('bear',26,-43,3.8)}</g>
    <g id="head-fox"><path d="M-2-16V12H28V-12" fill="#d68450"/><path d="M-20-40L-29-89L1-67Q13-72 27-66L42-93L44-42L73-23Q75-16 61-11L23 3Q-8 7-22-19Z" fill="#d68450"/><path d="M-21-75l6 25 12-14M37-78 29-61 39-48" fill="#5d5546" stroke="none"/><path d="M-14-16L9-35L30-20L65-18L25 1Q1 5-14-16Z" fill="#f1e4c9" stroke="none"/><path d="M66-26l10 4-8 8Z" fill="#514e40" stroke-width="1.5"/>${eye('fox',25,-41,4)}</g>
    <g id="hair-none"></g><g id="hair-quiff" fill="#594e40"><path d="M-29 14Q-36-11-16-15L-9-33L4-18Q24-36 34-14L39 5Q20 2 8 9L-8 2Z"/></g>
    <g id="hair-bob" fill="#594e40"><path d="M-27 45Q-45 21-35-5Q-29-28 4-24Q37-26 38 9L18 3L1 9L-12 3L-13 47Z"/></g>
    <g id="hair-pony" fill="#594e40"><path d="M-27 7Q-65-12-65 34Q-60 63-89 63Q-38 89-39 19Z"/><path d="M-32 13Q-34-24 4-24Q38-24 39 10L21 3L0 7Z"/><path d="M-36 7l1 13" stroke="#c87e62" stroke-width="7"/></g>
    <g id="hair-curls" fill="#594e40"><circle cx="-29" cy="7" r="15"/><circle cx="-29" cy="-10" r="14"/><circle cx="-11" cy="-22" r="15"/><circle cx="10" cy="-22" r="16"/><circle cx="29" cy="-8" r="15"/><circle cx="32" cy="9" r="12"/></g>
    <g id="foot-pelican" fill="currentColor"><path d="M-17-17Q-6-23-2-9L24-1L16 5L6 1L-2 5L-20 1Z"/><path d="M-4-7 6 1M2-8 16 5" fill="none" stroke="#ac823d" stroke-width="1.6"/></g>
    <g id="foot-human" fill="currentColor"><path d="M-19-18H-2L-1-7Q20-7 22 3H-20Z"/><path d="M8-3V3m6-4v4" fill="none" stroke-width="1.4"/></g>
    <g id="foot-cat" fill="currentColor"><path d="M-21-18H-1L2-8Q26-8 25 4H-24Z"/><path d="M9-3V4m7-7v7" stroke-width="1.5"/></g>
    <g id="foot-rabbit" fill="currentColor"><path d="M-21-19H0L2-9Q31-11 34 3Q12 10-24 3Z"/><path d="M18-4v9m7-9v8" stroke-width="1.5"/></g>
    <g id="foot-bear" fill="currentColor"><path d="M-25-20H0L2-9Q25-11 28 4Q2 12-29 5Z"/><path d="M8 1v5m9-6v5m8-5v4" stroke="#e4d7b7" stroke-width="3"/></g>
    <g id="foot-fox" fill="#735640"><path d="M-19-22H-2L0-9Q24-7 23 4H-21Z"/><path d="M11-1v5m6-5v5" stroke="#ded9bd" stroke-width="1.5"/></g>
    <g id="shoe-sneakers"><path d="M-23-21H-2L4-9L24-3Q32 0 29 6H-26Z" fill="#d97853"/><path d="M-25 2H30V9H-25Z" fill="#f7efda"/><path d="M-3-13 6-12m-5 5 10 1M17-5l-2 7" fill="none" stroke="#f7efda" stroke-width="2.5"/></g>
    <g id="shoe-boots"><path d="M-25-50H-2L-3-10Q28-10 30 6H-26Z" fill="#d4b15e"/><path d="M-25-46H-2M-26 6H30" stroke="#806b3f" stroke-width="5"/><path d="M-16-36v22" stroke="#ecd294" stroke-width="3"/></g>
    <g id="shoe-sandals" fill="currentColor"><path d="M-18-20H-1L0-7Q24-9 26 5H-23Z"/><path d="M-25 6H28M-21-13H-1M10-5V6M-2-7-7 5" fill="none" stroke="#4c807c" stroke-width="5"/></g>`;

  const parts={};
  ['body-tail','body-shape','clothes-layer','clothes-shape','clothes-details','clothes-boundary','head-shape','hair-rig','hair-shape','scarf','scarf-tail','hat','glasses','backpack','torso-rig','bicycle','boat','boat-seat','boat-wake','paddle','splash','ground-shadow','shore','ground','ground-edge','ground-trim','road','foreground','rowing-ripples','season-trees','clouds','gulls','overcast','stars','sun','moon','sky-top','sky-bottom','water-top','water-bottom','night-tint','fog','rear-spokes','front-spokes','crank','bell-rings','ripples'].forEach(id=>parts[id]=$(id));
  const limbs=['far','near'].map(side=>({
    leg:{root:$(side+'-leg'),outline:$(side+'-leg').querySelector('.limb-outline'),fill:$(side+'-leg').querySelector('.limb-fill'),foot:$(side+'-leg').querySelector('.foot'),use:$(side+'-leg').querySelector('use'),pedal:$(side+'-leg').querySelector('.pedal')},
    arm:{root:$(side+'-arm'),outline:$(side+'-arm').querySelector('.limb-outline'),fill:$(side+'-arm').querySelector('.limb-fill'),sleeve:$(side+'-arm').querySelector('.sleeve'),hand:$(side+'-arm').querySelector('.hand')}
  }));
  const attrs=(el,values)=>{for(const [key,value] of Object.entries(values))el.setAttribute(key,value);};
  const transform=(id,value)=>parts[id].setAttribute('transform',value);
  const show=(id,on)=>{parts[id].style.display=on?'':'none';};
  const translate=p=>`translate(${p[0]} ${p[1]})`;
  const path=(a,b,c)=>`M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${c[0]} ${c[1]}`;
  const make=(tag,values)=>{const el=document.createElementNS(NS,tag);attrs(el,values);return el;};

  for(const key of ['head','body','legs']){
    for(const [value,item] of Object.entries(M.species)){
      const option=document.createElement('option');option.value=value;option.textContent=item.name;$(key).append(option);
    }
  }
  for(const key of speciesKeys){
    const button=document.createElement('button');button.type='button';button.dataset.preset=key;button.textContent=M.species[key].name;button.setAttribute('aria-label',`整套${M.species[key].name}`);$('presets').append(button);
  }
  for(const [name,color] of colors){
    const button=document.createElement('button');button.type='button';button.dataset.color=color;button.style.setProperty('--swatch',color);button.setAttribute('aria-label',name);button.title=name;button.innerHTML='<span></span>';$('colors').append(button);
  }
  const scatter=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  for(let i=0;i<66;i++)parts.stars.append(make('circle',{cx:scatter(i)*1200,cy:36+scatter(i+80)*265,r:i%7===0?2:1.1,fill:'#f5edca',opacity:.4+(i%5)*.12}));
  let weatherParticles=[],seasonParticles=[];
  function buildWorld(){
    const season=seasons[state.season];
    const tree=(x,scale)=>`<g transform="translate(${x} 428) scale(${scale})"><path d="M0 0L-3-69m1 38-27-21m27 8 22-27" stroke="#869278" stroke-width="5" fill="none" stroke-linecap="round"/>${state.season==='winter'?'<path d="M-31-53l17 3m-1-15h22m8-4h12" fill="none" stroke="#f8f3df" stroke-width="8" stroke-linecap="round"/>':`<path d="M-45-51Q-63-69-38-88Q-35-116-4-103Q23-122 34-91Q63-78 40-52Z" fill="${season.leaf}"/>`}${state.season==='spring'?'<g fill="#eac0c2"><circle cx="-28" cy="-77" r="7"/><circle cx="2" cy="-92" r="8"/><circle cx="26" cy="-64" r="7"/><circle cx="-5" cy="-64" r="5"/></g>':''}</g>`;
    parts['season-trees'].innerHTML=tree(65,1)+tree(1080,.8)+`<g fill="${season.flower}"><circle cx="244" cy="442" r="4"/><circle cx="263" cy="438" r="3"/><circle cx="973" cy="447" r="4"/><circle cx="945" cy="442" r="3"/></g>`;
    $('weather-particles').replaceChildren();weatherParticles=[];
    if(state.weather==='rain'||state.weather==='snow'){
      const rain=state.weather==='rain';
      for(let i=0;i<(rain?72:50);i++){
        const el=rain?make('path',{d:'M0 0l-7 21',stroke:'#d7e8e5','stroke-width':1.6,opacity:.5+(i%4)*.12}):make('circle',{r:1.8+(i%4)*.6,fill:'#fffaf0',opacity:.65+(i%3)*.13});
        $('weather-particles').append(el);weatherParticles.push({el,x:(i*179+53)%1240,y:(i*97+17)%700});
      }
    }
    $('season-particles').replaceChildren();seasonParticles=[];
    const count=state.season==='winter'?0:22;
    for(let i=0;i<count;i++){
      const el=state.season==='summer'?make('circle',{r:1.8,fill:'#f4e29a'}):make('path',{d:state.season==='spring'?'M0 0Q-8-12 3-10Q13-5 0 0Z':'M0 0Q-14-6-5-17Q9-16 0 0Z',fill:state.season==='spring'?'#eac0c2':['#c18049','#ccaa64','#d79865'][i%3],opacity:.8});
      $('season-particles').append(el);seasonParticles.push({el,x:(i*149+49)%1250,y:(i*67+53)%650});
    }
    const rowing=state.activity==='rowing';
    for(const id of ['shore','ground','ground-edge','ground-trim','road','foreground','ground-shadow'])show(id,!rowing);
    transform('season-trees',rowing?'translate(0 115) scale(1 .58)':'');
    for(const id of ['boat','boat-seat','boat-wake','rowing-ripples','paddle','splash'])show(id,rowing);
    show('bicycle',state.activity==='cycling');
    for(const limb of limbs)limb.leg.pedal.style.display=state.activity==='cycling'?'':'none';
    show('fog',state.weather==='fog');
    parts.overcast.setAttribute('opacity',state.weather==='clear'?0:state.weather==='cloudy'?.65:state.weather==='fog'?.3:.8);
    $('scene-conditions').textContent=`${season.name} · ${weatherNames[state.weather]}`;
    lastMinute=-1;
  }
  function applyAppearance(){
    const body=M.species[state.body],leg=M.species[state.legs],head=M.species[state.head];
    attrs(parts['body-tail'],{href:'#tail-'+state.body});attrs(parts['body-shape'],{href:'#torso-'+state.body,fill:body.color});
    attrs(parts['clothes-shape'],{href:'#torso-'+state.body,fill:state.color});
    attrs(parts['clothes-boundary'],{href:'#torso-'+state.body});
    show('clothes-layer',state.clothes!=='none');
    const details={
      none:'',
      tee:'<path d="M5-86Q20-64 42-78M-61-12Q-16 7 30-8" fill="none" stroke="#f3e8d0" stroke-width="5"/>',
      sweater:'<path d="M1-85Q20-65 42-77M-59-16Q-19 3 33-9" fill="none" stroke="#ede4cb" stroke-width="7"/><path d="M-42-35l9 12 10-10 10 13 10-11 10 10 12-14" fill="none" stroke="#ede4cb" stroke-width="2"/>',
      raincoat:'<path d="M4-84L16-62L40-79M16-62L-1-1M-35-38l-13 17 25 2M30-39l-9 18 21-5" fill="none" stroke="#f5e4bd" stroke-width="3"/><g fill="#f0deb0" stroke="none"><circle cx="12" cy="-52" r="3"/><circle cx="7" cy="-31" r="3"/><circle cx="2" cy="-12" r="3"/></g>',
      vest:'<path d="M-6-85L-30-6M30-81L13 0" stroke="#eee1b7" stroke-width="14" fill="none"/><path d="M-55-48 47-48M-59-23 35-21" stroke="#3e6058" stroke-width="8"/><path d="M-6-55H9V-42H-6ZM-11-29H4V-15H-11Z" fill="#efe4c6" stroke-width="2"/>'
    };
    parts['clothes-details'].innerHTML=details[state.clothes];
    attrs(parts['head-shape'],{href:'#head-'+state.head});attrs(parts['hair-shape'],{href:'#hair-'+state.hair});
    transform('hair-rig',translate(head.hair));transform('hat',translate([head.hair[0],head.hair[1]-9]));transform('glasses',translate(head.eye));transform('scarf',translate(head.scarf));
    for(const key of ['scarf','glasses','hat','backpack'])show(key,state[key]);
    for(const [i,limb] of limbs.entries()){
      attrs(limb.leg.outline,{stroke:'#294e46','stroke-width':leg.width+5});attrs(limb.leg.fill,{stroke:leg.leg,'stroke-width':leg.width});
      attrs(limb.leg.use,{href:'#'+(state.shoes==='natural'?'foot-'+state.legs:'shoe-'+state.shoes),color:leg.leg});
      attrs(limb.arm.outline,{stroke:'#294e46','stroke-width':body.arm+5});attrs(limb.arm.fill,{stroke:body.color,'stroke-width':body.arm});
      attrs(limb.arm.sleeve,{stroke:state.color,'stroke-width':body.arm+1});attrs(limb.arm.hand,{fill:body.color,rx:state.body==='pelican'?17:12,ry:state.body==='pelican'?8:10});
      limb.arm.sleeve.style.display=['tee','sweater','raincoat'].includes(state.clothes)?'':'none';
      limb.arm.root.setAttribute('opacity',i?1:.86);limb.leg.root.setAttribute('opacity',i?1:.88);
    }
    $('combination').textContent=`${head.name}头 · ${body.name}身 · ${leg.name}腿`;
    $('scene-title').textContent=`${head.name}头、${body.name}身体、${leg.name}腿的旅伴在海边${activityNames[state.activity]}`;
    $('scene-desc').textContent=`可自由混搭角色与穿搭，切换运动、时间、天气和四季。当前是${seasons[state.season].name}${weatherNames[state.weather]}。`;
  }
  function syncControls(){
    document.querySelectorAll('[data-choice]').forEach(el=>{el.value=state[el.dataset.choice];});
    document.querySelectorAll('[data-accessory]').forEach(el=>{el.checked=state[el.dataset.accessory];});
    for(const key of ['activity','season','weather','color'])document.querySelectorAll(`[data-${key}]`).forEach(el=>el.setAttribute('aria-pressed',String(state[key]===el.dataset[key])));
    document.querySelectorAll('[data-preset]').forEach(el=>el.setAttribute('aria-pressed',String(['head','body','legs'].every(k=>state[k]===el.dataset.preset))));
    $('motion-speed').value=state.motionSpeed;$('motion-speed-value').value=state.motionSpeed+'×';$('motion-speed').setAttribute('aria-valuetext',state.motionSpeed+' 倍速');
    $('day-speed').value=state.daySpeed;$('auto-day').setAttribute('aria-pressed',String(state.autoDay));$('auto-day').querySelector('span').textContent=state.autoDay?'循环中':'自动循环';
    const seconds=M.DAY_SECONDS/state.daySpeed;$('day-duration').textContent=seconds>=60?`${seconds/60} 分钟 / 天`:`${seconds} 秒 / 天`;
    $('toggle-label').textContent=state.playing?'歇一会儿':'继续出发';$('toggle').setAttribute('aria-label',state.playing?'暂停运动':'继续运动');
    $('toggle-icon').setAttribute('d',state.playing?'M4 3h3v10H4zM9 3h3v10H9z':'M4 2l10 6-10 6z');
    const sound=state.activity==='cycling'?'叮铃铃':state.activity==='running'?'打个节拍':'水花声';$('bell-label').textContent=sound;$('bell').setAttribute('aria-label',state.activity==='cycling'?'按响车铃':sound);
    document.querySelector('.stage-number').textContent='SCENE '+({cycling:'01',running:'02',rowing:'03'}[state.activity]);
  }
  const palette=[
    [0,'#203747','#546771','#516f79','#70868a'],[5,'#253c4d','#667577','#647f80','#8e9e96'],
    [6.5,'#b9bcae','#eac59a','#96b8ae','#c9d0ad'],[8,'#d9e8d6','#f5e4be','#a3c6b8','#d1dfbf'],
    [12,'#e8eedc','#f8edcc','#b5d2c2','#d4dfc4'],[16,'#e5dfc1','#f1d7a8','#a6c2ae','#d2d4b0'],
    [18,'#bd9d9c','#efb486','#9caeaa','#c8c2a2'],[19.5,'#4c5269','#a48487','#778f98','#9ba8a0'],
    [21,'#203747','#546771','#516f79','#70868a'],[24,'#203747','#546771','#516f79','#70868a']
  ];
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const mix=(a,b,k)=>{a=rgb(a);b=rgb(b);return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*k).toString(16).padStart(2,'0')).join('');};
  const daylight=h=>Math.max(0,Math.min(1,(h-5)/3,(21-h)/3));
  function drawLight(){
    const hour=clock.hour,minute=Math.floor(hour*60);
    if(minute===lastMinute)return;
    lastMinute=minute;
    const season=seasons[state.season],night=1-daylight(hour);
    let index=0;while(index<palette.length-2&&palette[index+1][0]<=hour)index++;
    const a=palette[index],b=palette[index+1],k=(hour-a[0])/(b[0]-a[0]);
    const grey={clear:0,cloudy:.24,rain:.42,snow:.25,fog:.33}[state.weather];
    const values=[1,2,3,4].map(i=>mix(mix(a[i],b[i],k),'#9ba9a7',grey));
    attrs(parts['sky-top'],{'stop-color':values[0]});attrs(parts['sky-bottom'],{'stop-color':values[1]});attrs(parts['water-top'],{'stop-color':values[2]});attrs(parts['water-bottom'],{'stop-color':values[3]});
    $('scene').style.setProperty('--land-back',mix(season.back,'#647c78',night*.5));$('scene').style.setProperty('--land-front',mix(season.front,'#617975',night*.5));$('scene').style.setProperty('--ground-color',mix(season.ground,'#75887e',night*.38));$('scene').style.setProperty('--cloud-color',mix('#fffaf0','#879798',Math.max(night*.8,grey)));
    document.querySelector('.postcard').style.setProperty('--scene-ink',night>.6?'#e5e7d1':'#466359');
    const sunPhase=Math.max(0,Math.min(1,(hour-6)/12));transform('sun',`translate(${840+sunPhase*160} ${180-100*Math.sin(sunPhase*Math.PI)})`);
    parts.sun.setAttribute('opacity',Math.max(0,Math.min(1,(hour-5.8)*2,(18.6-hour)*2))*(1-grey));
    parts.moon.setAttribute('opacity',night*(1-grey*.5));parts.stars.setAttribute('opacity',Math.max(0,night-.15)*(1-grey));
    parts['night-tint'].setAttribute('opacity',night*.26+grey*.07);
    $('clock').value=M.formatTime(hour);$('period').textContent=M.period(hour);$('time').value=minute;$('time').setAttribute('aria-valuetext',M.formatTime(hour)+'，'+M.period(hour));
  }
  function drawWeather(){
    const t=clock.weather;
    transform('clouds',`translate(${-t*8%1200} 0)`);transform('gulls',`translate(${Math.sin(t*.32)*22} ${Math.sin(t*.85)*3})`);
    transform('ripples',`translate(${-t*13%1200} 0)`);
    parts.fog.setAttribute('transform',`translate(${Math.sin(t*.15)*40} 0)`);
    for(const [i,p] of weatherParticles.entries()){
      const rain=state.weather==='rain';
      const x=M.mod(p.x+t*(rain?-64:13)+(rain?0:Math.sin(t*.7+i)*17),1240)-20;
      const y=M.mod(p.y+t*(rain?440:24+(i%5)*3),700)-30;
      p.el.setAttribute('transform',`translate(${x} ${y})`);
    }
    for(const [i,p] of seasonParticles.entries()){
      const firefly=state.season==='summer';
      const x=M.mod(p.x-t*(firefly?3:23)+Math.sin(t*.5+i)*15,1260)-30;
      const y=firefly?385+(p.y%170)+Math.sin(t+i)*9:M.mod(p.y+t*11,690)-20;
      p.el.setAttribute('transform',`translate(${x} ${y}) rotate(${t*24+i*31})`);
      if(firefly)p.el.setAttribute('opacity',(1-daylight(clock.hour))*(.5+.4*Math.sin(t*2+i)));
    }
  }
  function drawActor(){
    const t=clock.motion,pose=M.pose(state.activity,t);
    transform('torso-rig',`${translate(pose.hip)} rotate(${pose.tilt})`);
    for(const [i,limb] of limbs.entries()){
      const leg=pose.legs[i],arm=pose.arms[i];
      const legPath=path(leg.start,leg.knee,leg.end);limb.leg.outline.setAttribute('d',legPath);limb.leg.fill.setAttribute('d',legPath);
      limb.leg.foot.setAttribute('transform',`${translate(leg.foot.point)} rotate(${leg.foot.angle})`);
      limb.leg.pedal.setAttribute('d',`M${leg.foot.point[0]-19} ${leg.foot.point[1]+8}h40`);
      const armPath=path(arm.start,arm.elbow,arm.end);limb.arm.outline.setAttribute('d',armPath);limb.arm.fill.setAttribute('d',armPath);
      if(state.clothes==='tee')limb.arm.sleeve.setAttribute('d',`M${arm.start}L${(arm.start[0]+arm.elbow[0])/2} ${(arm.start[1]+arm.elbow[1])/2}`);
      else limb.arm.sleeve.setAttribute('d',armPath);
      const armAngle=Math.atan2(arm.end[1]-arm.elbow[1],arm.end[0]-arm.elbow[0])*180/Math.PI;
      limb.arm.hand.setAttribute('transform',`${translate(arm.end)} rotate(${armAngle})`);
    }
    const flutter=Math.sin(clock.weather*7)*6;
    parts['scarf-tail'].setAttribute('d',`M-5-4C-35 ${-17+flutter}-56 ${8-flutter}-86 ${-9+flutter}L-80 ${9+flutter}C-54 ${24-flutter}-29 ${-3+flutter} 4 10Z`);
    const info=M.species[state.head],blink=t%5.7;
    $('eye-'+state.head).setAttribute('transform',`${translate(info.eye)} scale(1 ${blink>5.48?Math.max(.08,Math.abs(blink-5.59)/.11):1})`);
    const wheel=t*170/88*180/Math.PI;transform('rear-spokes',`rotate(${wheel})`);transform('front-spokes',`rotate(${wheel})`);transform('crank',`translate(594 480) rotate(${t*3.3*180/Math.PI})`);
    const travel=t*(state.activity==='running'?160*.72/.55:170);
    transform('shore',`translate(${-travel*.24%1200} 0)`);transform('road',`translate(${-travel%1200} 0)`);transform('foreground',`translate(${-travel*1.2%1200} 0)`);
    if(pose.paddle){
      transform('paddle',`${translate(pose.paddle.hand)} rotate(${pose.paddle.angle})`);
      transform('splash',`${translate(pose.paddle.tip)} scale(${.8+.25*Math.sin(t*4)})`);parts.splash.setAttribute('opacity',pose.paddle.wet?.75:0);
      transform('boat-wake',`translate(${Math.sin(t*2.15)*4} ${Math.sin(t*2.15)*2})`);
    }
  }
  function render(){drawActor();drawLight();drawWeather();}
  function tick(now){
    frame=0;if(document.hidden){previous=0;return;}
    const dt=previous?(now-previous)/1000:0;previous=now;
    M.advance(clock,dt,state);render();
    const ring=Math.max(0,(bellUntil-now)/1000);parts['bell-rings'].setAttribute('opacity',ring);
    if(state.playing||state.autoDay||!state.reduceMotion||ring>0)frame=requestAnimationFrame(tick);else previous=0;
  }
  function wake(){if(!frame&&!document.hidden){previous=0;frame=requestAnimationFrame(tick);}}
  function refresh(world=false){if(world)buildWorld();applyAppearance();syncControls();render();wake();}
  document.querySelectorAll('[data-choice]').forEach(el=>el.addEventListener('change',()=>{state[el.dataset.choice]=el.value;refresh();}));
  document.querySelectorAll('[data-accessory]').forEach(el=>el.addEventListener('change',()=>{state[el.dataset.accessory]=el.checked;refresh();}));
  document.querySelectorAll('[data-preset]').forEach(el=>el.addEventListener('click',()=>{for(const key of ['head','body','legs'])state[key]=el.dataset.preset;refresh();}));
  document.querySelectorAll('[data-color]').forEach(el=>el.addEventListener('click',()=>{state.color=el.dataset.color;refresh();}));
  for(const key of ['activity','season','weather'])document.querySelectorAll(`[data-${key}]`).forEach(el=>el.addEventListener('click',()=>{state[key]=el.dataset[key];if(key==='activity')clock.motion=0;refresh(true);}));
  function chooseTab(name){
    for(const tab of document.querySelectorAll('[data-tab]')){const active=tab.dataset.tab===name;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;$('panel-'+tab.dataset.tab).hidden=!active;}
  }
  const tabs=[...document.querySelectorAll('[data-tab]')];
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>chooseTab(tab.dataset.tab));
    tab.addEventListener('keydown',event=>{let target;if(event.key==='ArrowRight')target=tabs[(i+1)%3];if(event.key==='ArrowLeft')target=tabs[(i+2)%3];if(event.key==='Home')target=tabs[0];if(event.key==='End')target=tabs[2];if(target){event.preventDefault();chooseTab(target.dataset.tab);target.focus();}});
  });
  $('toggle').addEventListener('click',()=>{state.playing=!state.playing;syncControls();wake();});
  $('motion-speed').addEventListener('input',event=>{state.motionSpeed=Number(event.target.value);syncControls();});
  $('time').addEventListener('input',event=>{clock.hour=Number(event.target.value)/60;state.autoDay=false;lastMinute=-1;syncControls();render();});
  $('auto-day').addEventListener('click',()=>{state.autoDay=!state.autoDay;syncControls();wake();});
  $('day-speed').addEventListener('change',event=>{state.daySpeed=Number(event.target.value);syncControls();});
  const random=list=>list[Math.floor(Math.random()*list.length)];
  $('shuffle').addEventListener('click',()=>{
    for(const key of ['head','body','legs'])state[key]=random(speciesKeys);
    for(const key of ['hair','clothes','shoes'])state[key]=random([...$(key).options].map(o=>o.value));
    state.color=random(colors)[1];for(const key of ['scarf','hat','glasses','backpack'])state[key]=Math.random()>.55;
    refresh();$('announcement').textContent='新旅伴准备好了：'+$('combination').textContent;
  });
  $('reset').addEventListener('click',()=>{state={...M.defaults,playing:!reduced.matches,reduceMotion:reduced.matches};Object.assign(clock,{motion:0,weather:0,hour:10.5});chooseTab('character');refresh(true);$('announcement').textContent='已回到最初的夏日鹈鹕骑行。';});
  $('bell').addEventListener('click',async()=>{
    bellUntil=performance.now()+1000;wake();$('announcement').textContent=state.activity==='cycling'?'叮铃铃，一路好心情。':state.activity==='running'?'嗒、嗒，跟上自己的节奏。':'哗啦，把烦恼留在浪里。';
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audio||=new Audio();await audio.resume();
      for(const delay of [0,.17]){
        const start=audio.currentTime+delay,oscillator=audio.createOscillator(),gain=audio.createGain();
        oscillator.type=state.activity==='cycling'?'sine':'triangle';const frequency={cycling:1568,running:392,rowing:240}[state.activity];oscillator.frequency.setValueAtTime(frequency,start);
        if(state.activity==='rowing')oscillator.frequency.exponentialRampToValueAtTime(70,start+.2);
        gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.10,start+.006);gain.gain.exponentialRampToValueAtTime(.0001,start+.5);
        oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+.55);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      }
    }catch{$('announcement').textContent='当前浏览器无法播放声音，画面仍可正常操作。';}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;previous=0;}else wake();});
  reduced.addEventListener('change',event=>{state.reduceMotion=event.matches;if(event.matches){state.playing=false;state.autoDay=false;}refresh();});
  refresh(true);
})();
