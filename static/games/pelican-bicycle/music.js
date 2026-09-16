(function(root){
  'use strict';
  // Original 16-step phrases. Each scene has its own scale, voicing and rhythm.
  const scores={
    coast:{name:'海风小调',root:60,scale:[0,2,4,7,9],tempo:88,wave:'triangle',notes:[0,2,4,null,3,2,1,2,0,null,1,3,2,1,0,null]},
    forest:{name:'林间木语',root:62,scale:[0,2,5,7,9],tempo:76,wave:'sine',notes:[0,null,2,3,4,null,3,2,1,2,null,4,3,1,0,null]},
    desert:{name:'沙丘来信',root:57,scale:[0,2,3,7,8],tempo:70,wave:'triangle',notes:[0,1,2,null,3,2,1,0,4,null,3,2,1,2,0,null]},
    city:{name:'街角午后',root:65,scale:[0,2,4,7,9],tempo:96,wave:'triangle',notes:[0,null,2,1,3,null,4,3,1,2,null,4,3,1,2,0]}
  };
  const weather={clear:{rate:1,octave:0,decay:.65,brightness:2600},cloudy:{rate:.94,octave:0,decay:.9,brightness:1700},rain:{rate:.9,octave:0,decay:.55,brightness:1300},snow:{rate:.8,octave:12,decay:1.25,brightness:2100},fog:{rate:.78,octave:-12,decay:1.5,brightness:850}};
  const frequency=midi=>440*Math.pow(2,(midi-69)/12);
  function profile(scene,sky){const s=scores[scene],w=weather[sky];return {...s,...w,tempo:s.tempo*w.rate};}
  function events(scene,sky,step){
    const p=profile(scene,sky),index=step%16,degree=p.notes[index],bar=Math.floor(step/16)%4,chord=[0,3,2,4][bar];
    const pitch=d=>p.root+p.scale[d%5]+12*Math.floor(d/5);
    const out=[];
    if(degree!==null)out.push({midi:pitch(degree)+12+p.octave,amp:.12,duration:p.decay,wave:sky==='snow'?'sine':p.wave});
    if(step%8===0) {
      out.push({midi:pitch(chord)-12,amp:.13,duration:1.3,wave:'sine'});
      for(const d of [chord,chord+2,chord+4])out.push({midi:pitch(d),amp:.035,duration:1.5,wave:'sine'});
    }
    if(scene==='city'&&step%4===2)out.push({midi:42,amp:.075,duration:.12,wave:'triangle'});
    if(sky==='rain'&&step%2===1)out.push({midi:88+(step%3)*3,amp:.028,duration:.09,wave:'sine'});
    if(sky==='snow'&&step%8===4)out.push({midi:pitch(4)+24,amp:.025,duration:1.4,wave:'sine'});
    return out;
  }
  function create(getContext,getEnvironment,timers={setInterval:(fn,ms)=>root.setInterval(fn,ms),clearInterval:id=>root.clearInterval(id)}){
    let ctx,master,filter,timer=null,enabled=false,hidden=false,step=0,next=0,volume=.4,generation=0;
    const voices=new Set();
    function setup(){
      if(ctx)return;
      ctx=getContext();master=ctx.createGain();filter=ctx.createBiquadFilter();filter.type='lowpass';filter.connect(master);master.connect(ctx.destination);master.gain.value=volume;
    }
    function note(event,when){
      const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type=event.wave;oscillator.frequency.setValueAtTime(frequency(event.midi),when);
      gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(event.amp,when+.018);gain.gain.exponentialRampToValueAtTime(.0001,when+event.duration);
      oscillator.connect(gain);gain.connect(filter);const voice={oscillator,gain};voices.add(voice);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();voices.delete(voice);};oscillator.start(when);oscillator.stop(when+event.duration+.03);
    }
    function schedule(){
      if(!enabled||hidden)return;
      const env=getEnvironment(),p=profile(env.scene,env.weather);filter.frequency.setTargetAtTime(p.brightness,ctx.currentTime,.4);
      if(next<ctx.currentTime-.2)next=ctx.currentTime+.03;
      while(next<ctx.currentTime+.2){for(const event of events(env.scene,env.weather,step))note(event,next);next+=30/p.tempo;step++;}
    }
    function silence(){
      if(timer!==null){timers.clearInterval(timer);timer=null;}
      if(!ctx)return;
      for(const voice of voices){voice.gain.gain.cancelScheduledValues(ctx.currentTime);voice.gain.gain.setTargetAtTime(.0001,ctx.currentTime,.015);voice.oscillator.stop(ctx.currentTime+.06);}
      voices.clear();
    }
    async function resume(){
      const request=++generation;setup();await ctx.resume();
      if(request!==generation||!enabled||hidden)return;
      next=ctx.currentTime+.03;schedule();timer=timers.setInterval(schedule,100);
    }
    return {
      async start(){if(enabled)return;enabled=true;try{await resume();}catch(error){enabled=false;silence();throw error;}},
      stop(){enabled=false;generation++;silence();},
      async setHidden(value){hidden=value;generation++;silence();if(enabled&&!hidden)await resume();},
      setVolume(value){volume=value;if(master)master.gain.setTargetAtTime(value,ctx.currentTime,.08);},
      get enabled(){return enabled;}
    };
  }
  const api={scores,weather,frequency,profile,events,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CoastMusic=api;
})(typeof globalThis!=='undefined'?globalThis:this);
