(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const DAY_SECONDS = 120;
  const species = {
    pelican: { name: '鹈鹕', color: '#fbf6e4', leg: '#d6ab57', width: 10, arm: 25, hair: [20,-113], eye: [33,-89], scarf: [15,-39] },
    human: { name: '人', color: '#ecc49d', leg: '#d7a779', width: 17, arm: 17, hair: [12,-79], eye: [29,-47], scarf: [12,4] },
    cat: { name: '猫', color: '#dca96e', leg: '#dca96e', width: 19, arm: 22, hair: [9,-76], eye: [27,-40], scarf: [12,4] },
    rabbit: { name: '兔子', color: '#ece6db', leg: '#ded7cd', width: 20, arm: 23, hair: [8,-79], eye: [30,-42], scarf: [12,4] },
    bear: { name: '熊', color: '#a37d59', leg: '#9b7450', width: 26, arm: 28, hair: [11,-73], eye: [26,-43], scarf: [12,4] },
    fox: { name: '狐狸', color: '#d68450', leg: '#9b674a', width: 17, arm: 21, hair: [5,-78], eye: [25,-41], scarf: [12,4] }
  };
  const defaults = { head:'pelican', body:'pelican', legs:'pelican', hair:'none', clothes:'none', color:'#d97550', shoes:'natural', scarf:true, glasses:false, hat:false, backpack:false, activity:'cycling', season:'summer', weather:'clear', motionSpeed:1, daySpeed:1, autoDay:false, playing:true };
  const mod = (n,d) => ((n%d)+d)%d;
  function advance(clock, dt, state) {
    if (state.playing) clock.motion += dt * state.motionSpeed;
    if (state.autoDay) clock.hour = mod(clock.hour + dt * 24 / DAY_SECONDS * state.daySpeed,24);
    if (!state.reduceMotion || state.playing) clock.weather += dt;
    return clock;
  }
  function joint(a,b,l1,l2,bend=1) {
    const dx=b[0]-a[0], dy=b[1]-a[1], d=Math.max(.0001,Math.hypot(dx,dy));
    const along=(l1*l1-l2*l2+d*d)/(2*d), height=Math.sqrt(Math.max(0,l1*l1-along*along));
    return [a[0]+along*dx/d+bend*height*dy/d,a[1]+along*dy/d-bend*height*dx/d];
  }
  function local(origin, point, degrees) {
    const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    return [origin[0]+point[0]*c-point[1]*s,origin[1]+point[0]*s+point[1]*c];
  }
  function pose(activity,t) {
    let hip, tilt, feet, hands, paddle=null, legLength=94;
    if (activity==='running') {
      const p=mod(t*.72,1);
      hip=[595,386-10*Math.pow(Math.sin(p*TAU),2)]; tilt=-12+Math.sin(p*TAU)*2;
      feet=[.5,0].map(offset => {
        const u=mod(p+offset,1),stance=u<.55,v=stance?u/.55:(u-.55)/.45;
        return { point:[hip[0]+(stance?80-160*v:-80+160*v),570-(stance?0:78*Math.sin(v*Math.PI))], angle:stance?0:-25*Math.sin(v*Math.PI), stance };
      });
      legLength=112;
      const shoulder=local(hip,[25,-65],tilt);
      hands=[Math.PI,0].map(offset=>[shoulder[0]+25+59*Math.cos(p*TAU+offset),shoulder[1]+72+14*Math.sin(p*TAU+offset)]);
    } else if (activity==='rowing') {
      const a=t*2.15,stroke=Math.cos(a);
      hip=[546+stroke*14,438+Math.sin(a)*2]; tilt=5+stroke*13;
      feet=[{point:[682,478],angle:-14},{point:[700,486],angle:-14}];
      const hand=[661+stroke*47,359+Math.sin(a)*14],angle=57+Math.sin(a)*22,rad=angle*Math.PI/180;
      const axis=[Math.cos(rad),Math.sin(rad)];
      hands=[[hand[0]-axis[0]*42,hand[1]-axis[1]*42],hand];
      paddle={hand,angle,tip:[hand[0]+axis[0]*222,hand[1]+axis[1]*222],wet:Math.sin(a)>.05};
    } else {
      const a=t*3.3;
      hip=[565,337+Math.sin(a*2)*2];tilt=0;
      feet=[Math.PI,0].map(offset=>({point:[594+Math.cos(a+offset)*31,480+Math.sin(a+offset)*31],angle:0}));
      hands=[[703,315],[716,312]];
    }
    const legs=feet.map((foot,i)=> {
      const start=[hip[0]+(i?7:-9),hip[1]],end=[foot.point[0]-10,foot.point[1]-12];
      return {start,end,knee:joint(start,end,legLength,legLength),foot};
    });
    const arms=hands.map((end,i)=> {
      const start=local(hip,[i?13:32,-66],tilt);
      return {start,end,elbow:joint(start,end,83,83,-1)};
    });
    return {hip,tilt,legs,arms,paddle,legLength};
  }
  function formatTime(hour) {
    const minutes=mod(Math.floor(hour*60),1440);
    return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
  }
  function period(hour) { return hour<5?'深夜':hour<8?'清晨':hour<16?'白天':hour<19?'黄昏':'夜晚'; }
  const api={DAY_SECONDS,species,defaults,mod,advance,joint,local,pose,formatTime,period};
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  else root.CoastMotion=api;
})(typeof globalThis!=='undefined'?globalThis:this);
