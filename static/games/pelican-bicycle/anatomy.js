(function(root) {
  'use strict';
  // Torso coordinates share a pelvis at (0,0). The neck socket is deliberately
  // inside the shoulder silhouette, so any head can tuck into any body.
  const bodies = {
    pelican:{neck:[17,-59],headScale:1,tail:[-43,-18],wag:3,bag:[-55,-53],arm:21,
      shape:'M-43-10Q-63-28-51-54Q-37-81-4-78Q19-82 36-65Q52-46 33-23Q21-5 2 3Q-24 9-43-10Z',
      detail:'<path d="M-34-49Q-4-72 20-46Q10-22-27-20M-29-37Q-7-24 13-38" fill="none" stroke="#bcc5aa" stroke-width="2"/>'},
    human:{neck:[11,-71],headScale:.96,tail:[0,0],wag:0,bag:[-39,-59],arm:15,
      shape:'M-20 3Q-27-18-20-43L-22-69Q-21-87 2-88Q28-93 38-69L31-40Q22-16 27 3Z',
      detail:'<path d="M2-67Q6-57 17-56M-12-15Q3-8 18-14" fill="none" stroke="#c39e7b" stroke-width="2"/>'},
    cat:{neck:[12,-61],headScale:.96,tail:[-26,-8],wag:8,bag:[-43,-49],arm:16,
      shape:'M-24 4Q-36-11-24-33Q-19-43-23-59Q-27-80-1-82Q29-89 36-66Q42-49 26-28Q13-9 21 4Z',
      detail:'<path d="M-19-60l14 6m-15 7 13 5m-10 8 10 3" fill="none" stroke="#af794c" stroke-width="5"/><path d="M21-62Q4-50 8-31Q22-35 28-50Z" fill="#efdcba" stroke="none"/>'},
    rabbit:{neck:[12,-58],headScale:.95,tail:[-30,-9],wag:3,bag:[-46,-46],arm:17,
      shape:'M-27 4Q-45-10-30-37Q-19-48-21-61Q-17-82 7-78Q36-80 37-54Q32-32 23-23Q19-7 26 4Z',
      detail:'<path d="M10-62Q-9-42 1-20Q20-16 26-40Q31-60 10-62Z" fill="#faf6e9" stroke="none"/><path d="M-21-18l7-6-1 9" fill="none" stroke="#c3c3b5" stroke-width="2"/>'},
    bear:{neck:[13,-66],headScale:1,tail:[-38,-8],wag:2,bag:[-57,-51],arm:24,
      shape:'M-33 5Q-52-8-40-39Q-34-52-30-69Q-24-88 6-86Q38-91 45-61Q48-39 31-22Q24-8 33 5Z',
      detail:'<path d="M2-62Q-19-52-18-26Q2-12 24-31Q30-59 2-62Z" fill="#c1a07a" stroke="none"/><path d="M-28-46l9-7-1 10" fill="none" stroke="#86694e" stroke-width="2"/>'},
    fox:{neck:[14,-61],headScale:.94,tail:[-26,-7],wag:5,bag:[-43,-49],arm:15,
      shape:'M-22 3Q-31-13-19-35Q-14-47-22-62Q-22-81 4-83Q34-85 38-59Q34-40 20-27Q8-8 18 3Z',
      detail:'<path d="M4-77 27-72 33-54 24-43 21-29 12-36 5-25 3-46-4-55Z" fill="#f1e6ca" stroke="none"/>'},
    dog:{neck:[15,-62],headScale:.97,tail:[-31,-9],wag:13,bag:[-47,-51],arm:18,
      shape:'M-28 4Q-38-13-26-38L-26-63Q-21-83 2-84Q34-88 42-63Q44-45 27-27Q18-8 26 4Z',
      detail:'<path d="M-23-68Q-3-78 4-61Q7-45-22-39Z" fill="#99734f" stroke="none"/><path d="M22-62Q7-50 11-31L27-43Z" fill="#e9d3ae" stroke="none"/>'},
    panda:{neck:[12,-65],headScale:1,tail:[-41,-7],wag:2,bag:[-59,-51],arm:25,
      shape:'M-34 5Q-52-14-42-42Q-34-53-31-68Q-24-88 4-87Q39-90 46-62Q50-34 32-20Q24-6 32 5Z',
      detail:'<path d="M-41-66Q0-46 47-65L49-42Q0-30-44-46Z" fill="#50655c" stroke="none"/><path d="M-25-17Q0-3 24-16" fill="none" stroke="#d0d3bd" stroke-width="2"/>'},
    frog:{neck:[12,-43],headScale:.91,tail:[0,0],wag:0,bag:[-43,-36],arm:14,
      shape:'M-29 4Q-38-10-28-27Q-26-36-25-48Q-18-70 8-67Q38-69 39-43Q35-24 25-17L29 4Z',
      detail:'<path d="M6-50Q-14-42-14-10Q6 0 24-17Q32-38 6-50Z" fill="#cad39c" stroke="none"/><g fill="#739366" stroke="none"><circle cx="-23" cy="-32" r="4"/><circle cx="-14" cy="-48" r="3"/><circle cx="-25" cy="-15" r="3"/></g>'},
    penguin:{neck:[10,-65],headScale:.96,tail:[-31,-7],wag:3,bag:[-50,-50],arm:20,
      shape:'M-29 4Q-40-8-30-40Q-22-51-23-69Q-15-90 9-87Q34-84 39-60Q42-35 27-17L31 4Z',
      detail:'<path d="M12-76Q-3-59-14-31Q-25-2 6 3Q32-5 28-37Q37-63 12-76Z" fill="#eee9d4" stroke="none"/>'}
  };
  const heads = {
    pelican:{base:[8.5,10],span:[-13,30]},human:{base:[12.5,12],span:[0,25]},
    cat:{base:[12.5,13],span:[-2,27]},rabbit:{base:[13,13],span:[-2,28]},
    bear:{base:[11,14],span:[-5,27]},fox:{base:[13,12],span:[-2,28]},
    dog:{base:[12.5,13],span:[-2,27]},panda:{base:[13,13],span:[-4,30]},
    frog:{base:[12,13],span:[-6,30]},penguin:{base:[11.5,13],span:[-6,29]}
  };
  function headMount(head,body) {
    const b=bodies[body],h=heads[head],scale=b.headScale;
    return {x:b.neck[0]-h.base[0]*scale,y:b.neck[1]-h.base[1]*scale,scale};
  }
  const tails = {
    human:'',frog:'',
    pelican:'<path d="M5-8Q-21-15-48-37L-39-16-58-24-43-5-57-8Q-35 15 5 10Z" fill="#f6f2dd"/><path d="M-5 1-39-16M-6 6-43-5" fill="none" stroke="#b6c3aa" stroke-width="2"/>',
    cat:'<path d="M3 0C-28 18-68 8-70-28C-72-56-102-60-109-41C-117-19-86-11-88-33" fill="none" stroke="#294e46" stroke-width="17"/><path d="M3 0C-28 18-68 8-70-28C-72-56-102-60-109-41C-117-19-86-11-88-33" fill="none" stroke="#dca96e" stroke-width="11"/><path d="M-33 13-34 4M-63-6-72-2M-74-41-68-47M-105-46-112-49" fill="none" stroke="#ac784c" stroke-width="4"/>',
    rabbit:'<path d="M3-13Q-10-27-19-15Q-35-17-32-2Q-38 11-23 14Q-16 25-5 14Q10 12 3-13Z" fill="#faf6e8"/><path d="M-20-9q-9 8 0 14m4-20 6 5" fill="none" stroke="#d1d3c0" stroke-width="2"/>',
    bear:'<path d="M3-8Q-17-24-22-6Q-25 11-7 13L5 7Z" fill="#a37d59"/><path d="M-16-4l5-4-1 7" fill="none" stroke="#c1a07a" stroke-width="2"/>',
    fox:'<path d="M8-8Q-23-5-41-19Q-59-44-91-41L-117-54-109-34-126-35Q-118 0-94 13Q-50 40 5 11Z" fill="#d68450"/><path d="M-91-41-117-54-109-34-126-35Q-118 0-94 13L-79 9-87-4-70-6-84-20-70-28Z" fill="#f3e8cf" stroke="none"/><path d="M-16 4Q-47 13-72-4M-46-19l8 12-16-3" fill="none" stroke="#bb7145" stroke-width="2"/>',
    dog:'<path d="M5-9Q-30-3-44-30Q-47-51-64-67L-70-64Q-61-42-65-25Q-57 14 4 10Z" fill="#c7a176"/><path d="M-64-67-70-64Q-61-42-65-25L-50-31Q-50-51-64-67Z" fill="#eee0bf" stroke="none"/><path d="M-15 1q-24-4-32-22" fill="none" stroke="#a98760" stroke-width="2"/>',
    panda:'<path d="M4-10Q-9-23-21-12Q-30 1-18 12Q-5 19 5 7Z" fill="#f1efdd"/><path d="M-16-5q-6 8 3 10" fill="none" stroke="#c7cfba" stroke-width="2"/>',
    penguin:'<path d="M5-13-49 2-38 9-44 16-22 16-24 22 7 9Z" fill="#506974"/><path d="M-5 2-38 9M-2 7-22 16" fill="none" stroke="#8aa09f" stroke-width="2"/>'
  };
  // Hocks add a third segment without moving pedal / ground / boat contacts.
  // Dimensions are radii at the root, belly and tip of each tapered segment.
  const legs = {
    pelican:{split:.42,hock:[-10,-18],upper:[13,17,8],lower:[5,6,4],ankle:[4,4,3],upperColor:'#f5f0dd',lowerColor:'#d6ab57',detail:'#ba9350',pattern:'feather'},
    human:{split:.51,hock:[0,0],upper:[11,14,9],lower:[9,13,6],ankle:[0,0,0],upperColor:'#ecc49d',lowerColor:'#d7a779',detail:'#be936e',pattern:'knee'},
    cat:{split:.53,hock:[-25,-24],upper:[12,17,9],lower:[9,11,5],ankle:[5,6,4],upperColor:'#dca96e',lowerColor:'#dca96e',detail:'#ac784c',pattern:'stripes'},
    rabbit:{split:.46,hock:[-35,-23],upper:[17,26,10],lower:[9,13,6],ankle:[6,10,5],upperColor:'#ece6db',lowerColor:'#ded7cd',detail:'#b5b7a8',pattern:'fur'},
    bear:{split:.56,hock:[0,0],upper:[19,24,14],lower:[14,18,10],ankle:[0,0,0],upperColor:'#a37d59',lowerColor:'#9b7450',detail:'#d4b891',pattern:'fur'},
    fox:{split:.52,hock:[-30,-24],upper:[11,16,8],lower:[8,10,5],ankle:[5,6,4],upperColor:'#d68450',lowerColor:'#735640',detail:'#ecdbc0',pattern:'stocking'},
    dog:{split:.54,hock:[-22,-24],upper:[13,19,9],lower:[9,12,6],ankle:[6,7,5],upperColor:'#c7a176',lowerColor:'#c7a176',detail:'#977551',pattern:'fur'},
    panda:{split:.57,hock:[0,0],upper:[20,25,15],lower:[15,19,11],ankle:[0,0,0],upperColor:'#50655c',lowerColor:'#50655c',detail:'#9dab94',pattern:'fur'},
    frog:{split:.5,hock:[-31,-19],upper:[13,29,8],lower:[8,13,5],ankle:[5,7,4],upperColor:'#97b57c',lowerColor:'#8baa72',detail:'#5f845e',pattern:'spots'},
    penguin:{split:.62,hock:[-7,-11],upper:[19,25,12],lower:[11,14,6],ankle:[6,7,4],upperColor:'#506974',lowerColor:'#d9a859',detail:'#bdc7b5',pattern:'feather'}
  };
  function frame(a,b) {
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/length,(b[1]-a[1])/length];
    return (along,across)=>[a[0]+u[0]*along-u[1]*across,a[1]+u[1]*along+u[0]*across];
  }
  function taper(a,b,widths) {
    const at=frame(a,b),length=Math.hypot(b[0]-a[0],b[1]-a[1]),[root,belly,tip]=widths;
    return `M${at(0,root)}C${at(length*.32,belly)} ${at(length*.7,belly)} ${at(length,tip)}Q${at(length+tip,0)} ${at(length,-tip)}C${at(length*.7,-belly)} ${at(length*.32,-belly)} ${at(0,-root)}Q${at(-root,0)} ${at(0,root)}Z`;
  }
  function legDrawing(leg,key) {
    const style=legs[key],target=leg.hock||leg.end;
    const at=frame(leg.start,leg.knee),length=leg.upperLength;
    let detail='';
    if(style.pattern==='stripes')for(const f of [.3,.5,.7])detail+=`M${at(length*f,-style.upper[1]*.65)}Q${at(length*f+4,0)} ${at(length*f,style.upper[1]*.65)}`;
    else if(style.pattern==='spots')for(const f of [.3,.52,.72]){const p=at(length*f,(f===.52?1:-1)*5);detail+=`M${p[0]-2.5} ${p[1]}a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0`;}
    else if(style.pattern==='feather')for(const f of [.48,.66])detail+=`M${at(length*f,-7)}L${at(length*f+8,0)} ${at(length*f,7)}`;
    else if(style.pattern==='fur')detail=`M${at(length*.55,-5)}l4 5 3-4m-9 10 5 4`;
    else if(style.pattern==='knee')detail=`M${at(length*.87,-4)}Q${at(length*.83,0)} ${at(length*.87,4)}`;
    else detail=`M${at(length*.75,-5)}L${at(length*.82,0)} ${at(length*.75,5)}`;
    return {upper:taper(leg.start,leg.knee,style.upper),lower:taper(leg.knee,target,style.lower),ankle:leg.hock?taper(leg.hock,leg.end,style.ankle):'',detail};
  }
  const api={bodies,heads,headMount,tails,legs,legDrawing};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CoastAnatomy=api;
})(typeof globalThis!=='undefined'?globalThis:this);
