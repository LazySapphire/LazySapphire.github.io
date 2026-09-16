(function (root) {
  'use strict';
  const scenes = {
    coast: {name:'海岸', route:'海岸线', surface:'海面', elements:[['lighthouse','灯塔','mid'],['sailboat','帆船','far'],['gulls','海鸥','far'],['parasols','遮阳伞','near'],['kites','风筝','far']]},
    forest: {name:'森林', route:'林间小径', surface:'草丛', elements:[['pines','松树','mid'],['cabin','林间木屋','mid'],['mushrooms','蘑菇','near'],['flowers','野花','near'],['butterflies','蝴蝶','far']]},
    desert: {name:'沙漠', route:'沙丘旅行', surface:'沙丘', elements:[['cacti','仙人掌','near'],['pyramids','金字塔','far'],['oasis','绿洲棕榈','mid'],['ruins','古老遗迹','mid'],['balloon','热气球','far']]},
    city: {name:'城市', route:'城市漫游', surface:'游泳池', elements:[['towers','高楼','far'],['cafe','街角咖啡馆','mid'],['tram','有轨电车','mid'],['lights','街灯','near'],['fountain','喷泉','near']]}
  };
  // Baselines lie inside their own terrain band. A translated object never has
  // to follow an unrelated dune or hill, and the next band starts below its feet.
  const layers = {
    far: {name:'远景', ratio:.10, y:365, x:910, opacity:.72},
    mid: {name:'中景', ratio:.36, y:430, x:255, opacity:.94},
    near:{name:'近景', ratio:.72, y:478, x:965, opacity:1}
  };
  const period = 1600;
  const mod=(n,d)=>((n%d)+d)%d;
  const group=(x,y,scale,body)=>`<g transform="translate(${x} ${y}) scale(${scale})">${body}</g>`;
  function options(scene,depth) { return scenes[scene].elements.filter(e=>e[2]===depth); }
  function defaultElements() {
    return Object.fromEntries(Object.keys(scenes).map(scene=>[scene,Object.keys(layers).map(depth=>options(scene,depth)[0][0])]));
  }
  function randomEnvironment(random=Math.random) {
    const pick=items=>items[Math.floor(random()*items.length)];
    const elements=Object.fromEntries(Object.keys(scenes).map(scene=>[scene,Object.keys(layers).map(depth=>pick(options(scene,depth))[0])]));
    return {scene:pick(Object.keys(scenes)),season:pick(['spring','summer','autumn','winter']),weather:pick(['clear','cloudy','rain','snow','fog']),hour:Math.floor(random()*1440)/60,elements};
  }
  function travelDistance(time,activity) { return time*(activity==='running'?160*.72/.55:170); }
  function layerOffset(time,activity,depth) { return -mod(travelDistance(time,activity)*layers[depth].ratio,period); }
  function flowOffset(time,row,activity='cycling') {
    // Perspective within the road/water: even its back edge moves faster than
    // the near scenery, while the contact plane uses the actor's full travel.
    const ratio=activity==='rowing'?.8+Math.min(row,5)*.04:1;
    return -mod(travelDistance(time,activity)*ratio,1200);
  }
  // Every terrestrial drawing has its contact point at local y=0. Airborne
  // objects declare an altitude; boats touch the far water plane instead.
  const objects = {
    lighthouse:{scale:1, width:55, drawing:group(0,-96,1,'<g stroke="#789486" stroke-width="1.5" stroke-linejoin="round"><path d="M-11 9H13L21 96H-19Z" fill="#f8efd8"/><path d="M-13 34H15L17 50H-15Z" fill="#d98463" stroke="none"/><path d="M-16 69H18L20 82H-17Z" fill="#d98463" stroke="none"/><path d="M-16 9H18V-9H-16Z" fill="#f4e4ba"/><path d="M-19-9L1-22 21-9Z" fill="#6e8d79"/><path d="M-6-6V6m14-12V6M-22 13H24"/><path d="M-3 96V81Q1 75 6 81V96" fill="#7b9785"/></g>')},
    sailboat:{scale:1, width:58, water:true, drawing:group(0,-16,1,'<g stroke="#6c8d7d" stroke-width="1.5" stroke-linejoin="round"><path d="M-26 7H28L17 16H-15Z" fill="#708f7d"/><path d="M1-53V6"/><path d="M-4-48V0H-29Z" fill="#fff8df"/><path d="M6-38V0H24Z" fill="#f2dda9"/></g>')},
    gulls:{scale:.8, altitude:125, drawing:'<use href="#gull"/>'},
    parasols:{scale:.85, width:105, drawing:'<path d="M0 0v-91" stroke="#766b50" stroke-width="4"/><path d="M-64-71Q0-141 64-71Z" fill="#d98d70" stroke="#a16f53" stroke-width="2"/><path d="M-25-71Q0-132 26-71" fill="#edcc9a"/>'},
    kites:{scale:.7, altitude:205, drawing:'<path d="M0 0 28 27 0 62-25 27Z" fill="#df9a70" stroke="#98795c" stroke-width="2"/><path d="M0 0v62L28 27H-25" fill="#edcb92" fill-opacity=".4"/><path d="M0 62q26 34-1 54t5 50" fill="none" stroke="#b79d72" stroke-width="2"/><path d="M7 93l-10-6v12Zm-7 40 12-5-2 12Z" fill="#6f9b8b"/>'},
    pines:{scale:.83, width:115, drawing:'<path d="M0 0v-92m0 44-24-18m24 3 22-24" stroke="#6b7860" stroke-width="7" fill="none"/><path d="M0-185-62-75h31l-43 40H72L30-75h32Z" fill="var(--forest-leaf)"/>'},
    cabin:{scale:.78, width:155, drawing:'<path d="M-78 0v-99H77V0Z" fill="#b88c62" stroke="#6b7760" stroke-width="3"/><path d="M-96-96 0-163 98-96Z" fill="#677c63"/><path d="M-75-73H73M-75-47H73M-75-21H73" stroke="#d1ab79" stroke-width="3"/><path d="M-11 0v-63h37V0" fill="#766b51"/><path d="M-57-75h30v29h-30Z" fill="var(--window-light)" stroke="#efdfaa" stroke-width="4"/>'},
    mushrooms:{scale:1.1, width:46, drawing:'<path d="M-4 0v-25h10V0" fill="#eadfbd"/><path d="M-24-22Q0-65 26-22Z" fill="#c88362"/><g fill="#f3e5c5"><circle cx="-7" cy="-30" r="3"/><circle cx="8" cy="-33" r="4"/></g>'},
    flowers:{scale:1.15, width:35, drawing:'<path d="M0 0v-31m0 17-13-10m13 15 12-10" stroke="#66805a" stroke-width="3"/><g fill="#e6b4b2"><circle cy="-34" r="10"/><circle cx="-10" cy="-26" r="9"/><circle cx="9" cy="-24" r="9"/></g><circle cy="-28" r="5" fill="#ead18e"/>'},
    butterflies:{scale:.7, altitude:82, drawing:'<path d="M0 0Q-28-29-25-3Q-26 13 0 5Q27 22 25-3Q25-26 0 0Z" fill="#d8a471"/><path d="M0-4v16" stroke="#627158" stroke-width="3"/>'},
    cacti:{scale:.86, width:75, drawing:'<path d="M0-11v-101m0 63h-31v-42m31 64h29v-44" stroke="#537f68" stroke-width="22" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M-3-7v-99m-25 43v-21m54 35v-15" stroke="#94ae79" stroke-width="3"/><circle cx="1" cy="-126" r="7" fill="#d8968f"/>'},
    pyramids:{scale:.83, width:220, drawing:'<path d="M-132 0 0-150 143 0Z" fill="#c8a16e"/><path d="M0-150 43 0H143Z" fill="#b59062"/>'},
    oasis:{scale:.8, width:174, drawing:'<ellipse cy="0" rx="107" ry="12" fill="#84b6aa"/><path d="M0 0q11-67 0-110" stroke="#ae8a5e" stroke-width="10" fill="none"/><path d="M0-110q-59-33-83 19q49-20 83-5q-8-65 35-58q-15 28-25 52q52-53 85-11q-36-10-72 16" fill="#75996e"/>'},
    ruins:{scale:.8, width:120, drawing:'<path d="M-64 0v-62h31V0M20 0v-97h32V0M-75-63h54v-12h-54M9-97h56v-14H9" fill="#c4a678" stroke="#b19369" stroke-width="2"/><path d="M-72 0H68" stroke="#ad9166" stroke-width="5"/>'},
    balloon:{scale:.6, altitude:105, drawing:'<path d="M-31-44Q-89-124-34-155Q0-180 36-155Q89-124 31-44Z" fill="#cb967c"/><path d="M-12-47Q-46-157 0-164Q47-157 12-47Z" fill="#eee0aa"/><path d="M-24-42-14-18h29l10-24" fill="none" stroke="#997b58" stroke-width="2"/><path d="M-17-19h36L14 0H-12Z" fill="#ad8657"/>'},
    towers:{scale:.67, width:80, drawing:'<path d="M-40 0v-190h80V0" fill="#92aaa1" stroke="#6a8b82" stroke-width="2"/><path d="M-25-30h14m15 0h14m-43-27h14m15 0h14m-43-27h14m15 0h14m-43-27h14m15 0h14m-43-27h14m15 0h14" stroke="var(--window-light)" stroke-width="13"/>'},
    cafe:{scale:.85, width:155, drawing:'<path d="M-78 0v-102H75V0Z" fill="#dcc9aa" stroke="#8c9985" stroke-width="2"/><path d="M-87-60h174l-10-25H-76Z" fill="#c47d63"/><path d="M-54-84l-7 24m37-24-3 24m36-24v24m28-24 6 24m23-24 9 24" stroke="#f5e5c8" stroke-width="12"/><path d="M-62-47h42v40h-42Zm69 0h44V0H7Z" fill="#80a59a"/><text y="-90" text-anchor="middle" font-family="serif" font-size="13" fill="#576f65">PETIT CAFÉ</text>'},
    tram:{scale:.78, width:230, drawing:'<rect x="-113" y="-83" width="224" height="70" rx="15" fill="#b68066" stroke="#597b72" stroke-width="3"/><path d="M-89-67h41v27h-41Zm57 0h43v27h-43Zm59 0h41v27H27Z" fill="#d0ded0"/><path d="M82-60V-17M-110-29H110M-20-85 0-113 20-85" fill="none" stroke="#617f71" stroke-width="3"/><circle cx="-68" cy="-10" r="10" fill="#617a6b"/><circle cx="73" cy="-10" r="10" fill="#617a6b"/><path d="M-150 2h300" stroke="#8f9e89" stroke-width="3"/>'},
    lights:{scale:.72, width:30, drawing:'<path d="M0 0v-160q0-30 36-28" fill="none" stroke="#607e72" stroke-width="5"/><path d="M16-179q19-25 40 0Z" fill="#789183"/><ellipse cx="36" cy="-175" rx="17" ry="5" fill="var(--window-light)"/><ellipse cx="36" cy="-165" rx="27" ry="15" fill="var(--window-light)" opacity=".12"/>'},
    fountain:{scale:.75, width:150, drawing:'<path d="M-92-26Q0 3 92-26L65 0H-65Z" fill="#aab9ae" stroke="#7c988b" stroke-width="3"/><path d="M0-18V-100m0 38q-45-90-70 26M0-73q44-74 69 37" fill="none" stroke="#afd6ca" stroke-width="5"/><ellipse cy="-98" rx="15" ry="6" fill="#98b6a5"/>'}
  };
  function placements(state) {
    return Object.entries(layers).flatMap(([depth,layer])=>{
      const selected=options(state.scene,depth).find(([key])=>state.elements[state.scene].includes(key));
      if(!selected)return [];
      const key=selected[0],object=objects[key];
      return [{key,depth,x:layer.x,y:layer.y-(object.altitude||0),scale:object.scale,support:object.altitude?'air':object.water?'water':'ground'}];
    });
  }
  function art(state) {
    const scene=state.scene,rowing=state.activity==='rowing';
    let backdrop='',terrain;
    if(scene==='coast') {
      backdrop='<path d="M0 347Q120 290 255 341T590 347M875 347Q1055 286 1200 335V350H875Z" fill="#9dbba5" opacity=".43"/>';
      terrain=['url(#water)','var(--land-back)','var(--land-front)'];
    }
    if(scene==='forest') {
      backdrop='<path d="M0 345Q150 218 310 289T620 277T940 300T1200 253V355H0Z" fill="#b1c2a2"/><path d="M0 348 40 310 65 330 100 278 142 325 183 295 228 334 275 290 321 325 370 277 425 324 475 296 510 333 552 282 602 326 640 302 682 334 723 285 770 317 805 298 845 327 889 281 930 323 972 291 1020 330 1070 289 1115 319 1160 285 1200 328V355H0Z" fill="var(--forest-leaf)" opacity=".5"/>';
      terrain=['var(--land-back)','var(--forest-ground)','var(--land-front)'];
    }
    if(scene==='desert') {
      backdrop='<path d="M0 345Q220 255 438 335Q715 211 970 324L1200 302V350H0Z" fill="#d3b482"/>';
      terrain=['#e4c994','#ddbf89','var(--sand-color)'];
    }
    if(scene==='city') {
      backdrop='<path d="M0 350V315H90V283H149V326H231V262H285V315H360V285H442V328H526V280H570V248H615V320H695V289H747V312H844V258H900V309H996V283H1058V322H1125V271H1200V350Z" fill="#bbc6b7" opacity=".65"/>';
      terrain=['#d9ddcb','#c8cfb6','#b8c7a7'];
    }
    let markup=`<g id="world-backdrop">${backdrop}</g>`;
    const placed=placements(state);
    for(const [i,[depth,layer]] of Object.entries(layers).entries()) {
      // The band is deliberately level at the object's contact plane. The
      // curved edge lies above it; no hills pass through moving foundations.
      const top=[345,400,448][i];
      markup+=`<path data-ground="${depth}" data-baseline="${layer.y}" d="M0 ${top}Q300 ${top-12} 600 ${top}T1200 ${top}V640H0Z" fill="${terrain[i]}"/>`;
      const p=placed.find(item=>item.depth===depth);
      let content='';
      if(p) {
        const object=objects[p.key];
        const contact=p.support==='air'?'':p.support==='water'?'<path d="M-38 0q38 5 76 0" stroke="#eef0d9" stroke-width="2" fill="none"/>':`<ellipse cy="1" rx="${object.width/2}" ry="3" fill="#5f7356" opacity=".17"/>`;
        // Three far-apart copies cover both sides of the viewport during wraps;
        // the 1600-unit spacing keeps at most one whole object in the picture.
        for(const shift of [-period,0,period])content+=`<g data-element="${p.key}" data-support="${p.support}" transform="translate(${p.x+shift} ${p.y}) scale(${p.scale})">${contact}${object.drawing}</g>`;
      }
      markup+=`<g id="world-${depth}" data-depth="${depth}" opacity="${layer.opacity}">${content}</g>`;
    }
    let surface;
    if(rowing)surface={coast:'url(#water)',forest:'var(--forest-ground)',desert:'var(--sand-color)',city:'#7cafb4'}[scene];
    else surface={coast:'var(--ground-color)',forest:'var(--trail-color)',desert:'var(--sand-color)',city:'#b9baaa'}[scene];
    markup+=`<g id="world-surface"><path d="M0 491H1200V640H0Z" fill="${surface}"/><path d="M0 492H1200" stroke="${rowing?'#dfdfbd':'#b4ba98'}" stroke-width="4"/>`;
    if(rowing&&scene==='city')markup+='<path d="M0 486H1200M0 496H1200" stroke="#eddfbb" stroke-width="7"/><path d="M0 519H1200M0 610H1200" stroke="#387e91" stroke-width="7" opacity=".38"/><g id="pool-lane"><path d="M0 607H2400" stroke="#efead7" stroke-width="8"/><path d="M0 607H2400" stroke="#bb7964" stroke-width="8" stroke-dasharray="16 24"/></g>';
    if(!rowing)markup+='<ellipse cx="610" cy="577" rx="230" ry="12" fill="#809776" opacity=".17"/>';
    markup+='</g>';
    return markup;
  }
  function surfaceKind(state) { return state.activity==='rowing'?{coast:'water',forest:'grass',desert:'sand',city:'pool'}[state.scene]:'road'; }
  function create(doc) {
    const $=id=>doc.getElementById(id),svg=$('world-scenery');
    let flow=[],trails=[],spray=[];
    const make=(tag,attributes)=>{const e=doc.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attributes))e.setAttribute(k,v);return e;};
    function build(state) {
      const kind=surfaceKind(state),rowing=state.activity==='rowing';
      svg.innerHTML=art(state);
      $('travel-marks').replaceChildren();$('wake-trails').replaceChildren();$('surface-spray').replaceChildren();flow=[];trails=[];spray=[];
      for(let row=0;row<6;row++) {
        const y=505+row*24,grass=kind==='grass',water=kind==='water'||kind==='pool';
        const d=Array.from({length:13},(_,i)=>{const x=i*200+(row%2)*66;return grass?`M${x} ${y}l-7-11m7 11 8-13m-8 13 17-9`:water?`M${x} ${y}q28-6 59 0t54 0`:kind==='road'?`M${x} ${y}h${row===5?85:17}`:`M${x} ${y}q39-5 98 0`;}).join('');
        const e=make('path',{d,fill:'none',stroke:grass?'#4f7c59':water?'#e3eee0':kind==='sand'?'#b59165':'#eee6cb','stroke-width':grass?2.8:row===5?3.5:2,opacity:.22+row*.08});$('travel-marks').append(e);flow.push(e);
      }
      if(rowing) {
        for(let i=0;i<24;i++) {
          const grass=kind==='grass',sand=kind==='sand';
          const e=make('path',{d:grass?'M0 0l-8-14m8 14 7-18':sand?'M0 0l5-3 8 4-7 2Z':'M0 0q-26-8-62 0',fill:sand?'#bb935e':'none',stroke:grass?'#728f59':sand?'#c2a172':'#f0eed6','stroke-width':grass?3:2.5});$('wake-trails').append(e);trails.push(e);
        }
        const bow=make('path',{id:'bow-wave',d:'M841 540q37 1 53-11m-53 15q-10 18-45 17',fill:'none',stroke:kind==='grass'?'#b7ca88':kind==='sand'?'#e9d0a1':'#f0eed6','stroke-width':4});$('wake-trails').append(bow);
        for(let i=0;i<12;i++) {const e=make('circle',{r:1.7+(i%3),fill:kind==='grass'?'#728f59':kind==='sand'?'#c5a06c':'#edf5dd'});$('surface-spray').append(e);spray.push(e);}
      }
      $('splash').style.display=rowing&&(kind==='water'||kind==='pool')?'':'none';
      $('scene').setAttribute('data-surface',kind);
    }
    function draw(state,clock,pose) {
      const t=clock.motion,rowing=state.activity==='rowing';
      for(const depth of Object.keys(layers))$("world-"+depth).setAttribute('transform',`translate(${layerOffset(t,state.activity,depth)} 0)`);
      flow.forEach((el,row)=>el.setAttribute('transform',`translate(${flowOffset(t,row,state.activity)} ${rowing?Math.sin(t*1.4+row)*1.5:0})`));
      trails.forEach((el,i)=>{const age=mod(t*.8+i/24,1);el.setAttribute('transform',`translate(${373-age*370} ${542+(i%3-1)*(8+age*28)}) scale(${.45+age*1.4})`);el.setAttribute('opacity',(1-age)*.7);});
      if(rowing) {
        if(state.scene==='city')$('pool-lane').setAttribute('transform',`translate(${-mod(travelDistance(t,state.activity),1200)} 0)`);
        $('bow-wave').setAttribute('transform',`translate(${Math.sin(t*4)*3} ${Math.sin(t*2.15)*2})`);
        spray.forEach((el,i)=>{const age=mod(t*1.35+i/12,1);el.setAttribute('cx',pose.paddle.tip[0]-age*(45+i*6));el.setAttribute('cy',pose.paddle.tip[1]-Math.sin(age*Math.PI)*(18+i*3));el.setAttribute('opacity',pose.paddle.wet?(1-age)*.9:0);});
      }
    }
    return {build,draw};
  }
  const api={scenes,layers,period,options,defaultElements,randomEnvironment,placements,art,surfaceKind,travelDistance,layerOffset,flowOffset,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CoastWorld=api;
})(typeof globalThis!=='undefined'?globalThis:this);
