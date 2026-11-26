{
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const W=800,H=450,GROUND=352,S=1.22;
const overlay=document.getElementById('overlay'),controls=document.getElementById('controls');
const isTouch=matchMedia('(pointer:coarse)').matches||'ontouchstart' in window;
if(!isTouch)controls.style.display='none';

function resize(){
  const vw=innerWidth,vh=innerHeight,portrait=vh>vw;
  const availH=(isTouch&&portrait)?vh-255:vh;
  const s=Math.min(vw/W,availH/H);
  const dpr=Math.min(devicePixelRatio||1,2);
  cv.style.width=W*s+'px';cv.style.height=H*s+'px';
  cv.style.left=(vw-W*s)/2+'px';
  cv.style.top=(isTouch&&portrait)?Math.max(0,(availH-H*s)/2)+'px':(vh-H*s)/2+'px';
  cv.width=Math.round(W*s*dpr);cv.height=Math.round(H*s*dpr);
  ctx.setTransform(W*s*dpr/W,0,0,H*s*dpr/H,0,0);
}
addEventListener('resize',resize);resize();
/* ---------- settings (saved on this device) ---------- */
const SET={bright:100,vol:80,shake:true,rumble:true};
try{Object.assign(SET,JSON.parse(localStorage.getItem('pf-settings')||'{}'))}catch(e){}
function saveSet(){try{localStorage.setItem('pf-settings',JSON.stringify(SET))}catch(e){}}
function applySet(){cv.style.filter=SET.bright===100?'':'brightness('+SET.bright/100+')'}
applySet();

/* ---------- sound ---------- */
let ac=null,noiseBuf=null;
function initAudio(){
  if(ac)return;
  try{
    ac=new (window.AudioContext||window.webkitAudioContext)();
    noiseBuf=ac.createBuffer(1,ac.sampleRate*0.3,ac.sampleRate);
    const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  }catch(e){ac=null}
}
function tone(type,f1,f2,dur,vol){
  vol*=SET.vol/100;
  const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();
  o.type=type;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(g).connect(ac.destination);o.start(t);o.stop(t+dur);
}
function noise(dur,vol,freq){
  vol*=SET.vol/100;
  const t=ac.currentTime,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
  s.buffer=noiseBuf;f.type='bandpass';f.frequency.value=freq;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  s.connect(f).connect(g).connect(ac.destination);s.start(t);s.stop(t+dur);
}
function sfx(k){
  if(!ac||SET.vol<=0)return;
  try{
    if(k==='whoosh')noise(0.12,0.25,900);
    if(k==='hit'){tone('square',220,50,0.18,0.25);noise(0.15,0.5,1800)}
    if(k==='bell'){tone('sine',1320,1300,0.6,0.25);tone('sine',880,870,0.6,0.15)}
    if(k==='clash')tone('triangle',600,300,0.12,0.2);
    if(k==='win'){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>{try{tone('square',f,f,0.18,0.12)}catch(e){}},i*120))}
  }catch(e){}
}

/* ---------- input: forward / back only ---------- */
const keys={},buf={punch:0,kick:0,def:0,fake:0,blitz:0,head:0,step:0,lbf:0,hbf:0,back:0,dbf:0,fakeP:0,fakeK:0};
addEventListener('keydown',e=>{
  initAudio();
  keys[e.code]=true;
  if(e.code==='KeyW')buf.punch=8;
  if(e.code==='KeyE')buf.blitz=8;
  if(e.code==='KeyD')buf.kick=8;
  if(e.code==='KeyF')buf.head=8;
  if(e.code==='KeyA')buf.def=8;
  if(e.code==='KeyQ')buf.step=8;
  if(e.code==='KeyR'){if(keys.ShiftRight)buf.dbf=8;else if(e.shiftKey)buf.hbf=8;else buf.lbf=8}
  if(e.code==='ShiftRight'&&!e.repeat)buf.back=8;
  if(e.code==='Digit1'||e.code==='Numpad1')buf.fake=4;
  if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();
});
addEventListener('keyup',e=>{keys[e.code]=false});
function bindBtn(id,k){
  const el=document.getElementById(id);
  el.addEventListener('pointerdown',e=>{initAudio();buf[k]=8;el.classList.add('on');e.preventDefault()});
  const off=()=>el.classList.remove('on');
  el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('pointerleave',off);
}
bindBtn('blitzBtn','blitz');
// double tap = fake. A single tap waits a moment (DT ms) to see if a second tap follows.
const DT=170,tapWait={punch:null,kick:null};
function tapOrDouble(k){
  if(tapWait[k]){clearTimeout(tapWait[k]);tapWait[k]=null;buf[k]=8;buf.fake=4;return}
  tapWait[k]=setTimeout(()=>{tapWait[k]=null;buf[k]=8},DT);
}
{
  const el=document.getElementById('punchBtn');
  el.addEventListener('pointerdown',e=>{initAudio();tapOrDouble('punch');el.classList.add('on');e.preventDefault()});
  const off=()=>el.classList.remove('on');
  el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('pointerleave',off);
}
function makeStick(id,onMove,onEnd){
  const el=document.getElementById(id),kn=el.querySelector('.knob');let pid=null;
  const mv=e=>{
    const r=el.getBoundingClientRect();let dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2);
    const m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}
    kn.style.transform=`translate(${dx*40}px,${dy*40}px)`;onMove(dx,dy);
  };
  el.addEventListener('pointerdown',e=>{initAudio();pid=e.pointerId;try{el.setPointerCapture(pid)}catch(_){}mv(e);e.preventDefault()});
  el.addEventListener('pointermove',e=>{if(e.pointerId===pid)mv(e)});
  const end=e=>{if(e.pointerId!==pid)return;pid=null;kn.style.transform='';onEnd()};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
}
const stick={x:0};
makeStick('moveStick',(dx)=>{stick.x=Math.abs(dx)<0.25?0:Math.max(-1,Math.min(1,dx*1.4))},()=>{stick.x=0});
// kick stick: push forward = side kick (double flick = kick fake), up = head kick, back = defensive kick
let kickArmed=true;
makeStick('kickStick',(dx,dy)=>{
  const m=Math.hypot(dx,dy);
  if(m<0.3){kickArmed=true;return}
  if(!kickArmed||m<0.55)return;
  kickArmed=false;
  const me=mode==='guest'?CPU:P1,fwd=me?me.facing:1;
  if(dy<-0.5&&Math.abs(dy)>Math.abs(dx))buf.head=8;
  else if(Math.sign(dx)===fwd)tapOrDouble('kick');
  else buf.def=8;
},()=>{kickArmed=true});
document.addEventListener('contextmenu',e=>e.preventDefault());
function pressHeld(){return !!(keys.ShiftLeft||pad.press)} // right Shift is the jump back
function readMove(){
  let x=0;
  if(keys.ArrowLeft)x-=1;
  if(keys.ArrowRight)x+=1;
  x+=stick.x+pad.x;
  return Math.max(-1,Math.min(1,x));
}
/* ---------- game controller (Xbox / PlayStation, standard layout) ----------
   left stick or d-pad: move · right stick: forward side kick, up head kick, back defensive kick
   A/✕ reverse punch · B/○ blitz · X/□ side kick · Y/△ head kick · RB/R1 defensive kick
   hold LB/L1 while punching or side-kicking to fake · Start/Options: start or rematch */
const pad={x:0,prev:[],armed:true,on:false,press:false};
// controller buttons can be changed in Settings -> Controller buttons (saved on this device).
// Every move can be one button or a combination pressed together (e.g. RB + B).
const PADNAME={0:'A',1:'B',2:'X',3:'Y',4:'LB',5:'RB',6:'LT',7:'RT',8:'View',9:'Menu',10:'L3',11:'R3',12:'D-pad up',13:'D-pad down',14:'D-pad left',15:'D-pad right',16:'Xbox'};
const padName=i=>PADNAME[i]||'Button '+i;
const comboName=c=>c&&c.length?c.map(padName).join(' + '):'Not set';
const PADDEF={punch:[0],blitz:[1],kick:[2],head:[3],def:[5],fakeP:[4,0],fakeK:[4,2],press:[6],step:[7],lbf:[12],hbf:[13],back:[11],dbf:[10]};
const PADACT=[['punch','Reverse punch'],['blitz','Blitz'],['kick','Side kick'],['head','Head kick'],['def','Defensive side kick'],['fakeP','Punch fake'],['fakeK','Kick fake'],['press','Press (hold)'],['step','Step in'],['lbf','Backfist to body'],['hbf','Backfist to head'],['back','Jump back'],['dbf','Defensive backfist']];
const PADMAP={};
for(const k in PADDEF){const v=SET.pad2&&SET.pad2[k];PADMAP[k]=Array.isArray(v)?v.filter(n=>Number.isInteger(n)&&n>=0&&n<32):PADDEF[k].slice()}
let padWait=null,padRec=[]; // move being recorded, and the buttons pressed so far
const pT=[],pUsed=[],pPend=new Set();let pf=0;
const sameCombo=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
function savePad(){SET.pad2={};for(const k in PADMAP)SET.pad2[k]=PADMAP[k].slice();saveSet()}
function pollPad(){
  let gp=null;
  try{const all=navigator.getGamepads?navigator.getGamepads():[];for(const g of all)if(g&&g.connected){gp=g;break}}catch(e){}
  const was=pad.on;pad.on=!!gp;pad.id=gp?gp.id:'';
  if(was!==pad.on)padStatus();
  if(!gp){pad.x=0;pad.press=false;return}
  pf++;
  const B=i=>!!(gp.buttons[i]&&gp.buttons[i].pressed),press=i=>B(i)&&!pad.prev[i];
  const NB=gp.buttons.length,anyDown=()=>{for(let i=0;i<NB;i++)if(B(i))return true;return false};
  const lt=document.getElementById('padLive');
  if(padWait){ // recording: collect every button pressed, save when all are let go
    for(let i=0;i<NB;i++)if(press(i)&&!padRec.includes(i))padRec.push(i);
    if(lt)lt.textContent=padRec.length?'Recording: '+comboName(padRec)+' (let go to save)':'Press one button, or hold several together…';
    if(padRec.length&&!anyDown()){
      for(const k in PADMAP)if(k!==padWait&&sameCombo(PADMAP[k],padRec))PADMAP[k]=[]; // one move per combination
      PADMAP[padWait]=padRec.slice();savePad();padWait=null;padRec=[];
      if(document.getElementById('padmapPage'))showPadMap();
    }
    pad.prev=gp.buttons.map(b=>b.pressed);return;
  }
  const ax=gp.axes[0]||0;
  // d-pad left/right move the fighter, unless the player gave them to a move
  const used=i=>Object.values(PADMAP).some(c=>c.includes(i));
  pad.x=(Math.abs(ax)>0.25?ax:0)+(B(14)&&!used(14)?-1:0)+(B(15)&&!used(15)?1:0);
  const pc=PADMAP.press;pad.press=pc.length>0&&pc.every(B);
  let any=false;const fire=k=>{if(k!=='press'){buf[k]=8;any=true}};
  for(let i=0;i<NB;i++)if(press(i)){pT[i]=pf;pUsed[i]=false;pPend.add(i)}
  // combinations first (bigger ones win): all their buttons down, pressed close together
  const combos=Object.keys(PADMAP).filter(k=>PADMAP[k].length>1).sort((a,b)=>PADMAP[b].length-PADMAP[a].length);
  for(const k of combos){
    const c=PADMAP[k];
    if(c.every(B)&&c.every(b=>!pUsed[b]&&pf-(pT[b]||-99)<=8)){fire(k);c.forEach(b=>{pUsed[b]=true;pPend.delete(b)})}
  }
  // single buttons: fire at once, or after a short wait if the button is also part of a combination
  for(const i of[...pPend]){
    const inCombo=combos.some(k=>PADMAP[k].includes(i));
    if(!inCombo||pf-pT[i]>=5||!B(i)){
      pPend.delete(i);
      if(!pUsed[i]){pUsed[i]=true;for(const k in PADMAP)if(PADMAP[k].length===1&&PADMAP[k][0]===i)fire(k)}
    }
  }
  if(any)initAudio();
  // right stick works like the phone's kick stick
  const rx=gp.axes[2]||0,ry=gp.axes[3]||0,m=Math.hypot(rx,ry);
  if(m<0.3)pad.armed=true;
  else if(pad.armed&&m>0.6){
    pad.armed=false;
    const me=mode==='guest'?CPU:P1,fwd=me?me.facing:1;
    if(ry<-0.5&&Math.abs(ry)>Math.abs(rx))buf.head=8;
    else if(Math.sign(rx)===fwd)buf.kick=8;
    else buf.def=8;
  }
  if(press(9)&&!document.getElementById('padmapPage')){
    if(state==='menu'&&!mroom)newGame('normal');
    else if(state==='end'&&mode==='cpu')newGame(diffKey);
    else if(state==='end'&&mode==='host'&&findPeer('guest'))startOnlineMatch();
  }
  // live button test on the Controller buttons page
  if(lt){const down=[];gp.buttons.forEach((b,i)=>{if(b.pressed)down.push(padName(i))});lt.textContent=down.length?'Pressing: '+down.join(' + '):'Press any button to test it.'}
  pad.prev=gp.buttons.map(b=>b.pressed);
}
function padStatus(){
  const el=document.getElementById('padMsg');
  if(el)el.textContent=pad.on?'Controller connected. Press Start to fight on Normal.':(isTouch?'':'Got a game controller? Plug it in and press any button.');
  const s=document.getElementById('padStat');
  if(s){s.textContent=pad.on?'Connected: '+pad.id:'No controller found. Plug it in, then press any button on it.';s.style.color=pad.on?'#7be3a0':'#ff9d8a'}
}
function rumble(){
  if(!SET.rumble)return;
  try{const all=navigator.getGamepads?navigator.getGamepads():[];for(const g of all)if(g&&g.vibrationActuator){g.vibrationActuator.playEffect('dual-rumble',{duration:140,strongMagnitude:0.6,weakMagnitude:0.4}).catch(()=>{});break}}catch(e){}
}
addEventListener('gamepadconnected',()=>{pad.on=true;padStatus()});addEventListener('gamepaddisconnected',()=>{setTimeout(padStatus,50)});

/* ---------- moves & poses ----------
   Fighters stand side-on (bladed stance): chest toward the camera, lead shoulder toward the opponent.
   Reverse punch: rear hand fires straight to head height, hips and shoulders rotate square,
   rear heel turns out, lead hand comes back to guard the chin, then the punch snaps back.
   Side kick: knee chambers up, support foot pivots so the heel points at the target,
   hip turns over and the leg drives out sideways with the foot blade, body leans away. */
const MOVES={
  // active = steps 1-2 (2 x stepLen); recovery = steps 3-4 + 6 frames to settle
  punch:{name:'REVERSE PUNCH',startup:6,active:16,recovery:22,stepLen:8,reach:128,pts:1,lunge:3.5,hy:104},
  head:{name:'SIDE KICK TO HEAD',startup:13,active:7,recovery:20,reach:132,pts:2,lunge:2,hy:120},
  kick:{name:'SIDE KICK TO BODY',startup:10,active:8,recovery:18,reach:138,pts:1,lunge:2.2,hy:76},
  // defensive side kick: lean back and kick with the front leg while moving away,
  // plant that leg behind the rear foot, then switch back to the normal stance
  // feints: look like the start of the real move, can't score
  // blitz: drop low, drive straight forward, backfist in the air, rear punch still in the air, land.
  // active the whole time in the air: backfist reach first, then the longer rear punch
  blitz:{name:'BLITZ',startup:8,active:12,recovery:24,reach:125,pts:1,lunge:7,hy:116},
  fakeP:{name:'PUNCH FAKE',startup:6,active:2,recovery:10,reach:0,pts:0,lunge:1.2,fake:'punch'},
  fakeK:{name:'KICK FAKE',startup:5,active:2,recovery:9,reach:0,pts:0,lunge:0,fake:'kick'},
  // press: lead leg stays up off the mat while he skips forward; kicks fire straight from the raised leg
  pkick:{name:'PRESS SIDE KICK',startup:4,active:8,recovery:8,reach:138,pts:1,lunge:2.4,hy:76,press:1},
  phead:{name:'PRESS HEAD KICK',startup:6,active:7,recovery:9,reach:132,pts:2,lunge:2.4,hy:120,press:1},
  pdown:{name:'',startup:0,active:0,recovery:8,reach:0,pts:0,lunge:0,noHit:1},
  // step in: a quick low jump forward with a backfist in the air (1 pt); a side kick to the body passes under him
  step:{name:'STEP IN BACKFIST',startup:6,active:9,recovery:10,reach:118,pts:1,lunge:4.5,hy:116},
  def:{name:'DEFENSIVE SIDE KICK',startup:8,active:7,recovery:28,reach:146,pts:1,lunge:-1.5,hy:76},
  // deep step with the lead leg (back foot stays put), body dips under head strikes, backfist to the body
  lbf:{name:'BACKFIST TO BODY',startup:7,active:6,recovery:14,reach:132,pts:1,step:24,hy:78},
  // same deep step, very quick backfist to the head
  hbf:{name:'BACKFIST TO HEAD',startup:4,active:5,recovery:12,reach:126,pts:1,step:24,hy:112},
  // big jump back off both legs, waist pulled back in the air, land in stance; a reverse punch misses him in the air
  back:{name:'JUMP BACK',startup:2,active:14,recovery:8,reach:0,pts:0,noHit:1},
  // same jump back with a backfist to the head while still in the air
  dbf:{name:'DEFENSIVE BACKFIST',startup:6,active:9,recovery:9,reach:150,pts:1,hy:112}
};
const POSE={
  // wide, low side-on stance
  stance:{hip:[0,-56],hw:6,sh:[-2,-100],sw:13,hd:[6,-118],
    fk:[34,-28],ff:[46,0],ffa:0,ffl:12,bk:[-32,-28],bf:[-44,0],bfa:0,bfl:7,
    le:[26,-88],lf:[38,-102],re:[-6,-84],rf:[6,-106]},
  // head kick: higher chamber, bigger lean back, foot drives out at head height
  hChamber:{hip:[-4,-66],hw:5,sh:[-18,-100],sw:12,hd:[-14,-118],
    fk:[22,-98],ff:[4,-78],ffa:1.4,ffl:11,bk:[-10,-30],bf:[-14,0],bfa:1.6,bfl:8,
    le:[6,-92],lf:[16,-106],re:[-26,-90],rf:[-12,-112]},
  hKick:{hip:[0,-72],hw:4,sh:[-36,-86],sw:11,hd:[-50,-96],
    fk:[46,-100],ff:[92,-122],ffa:2.0,ffl:16,bk:[-4,-34],bf:[-12,0],bfa:3.14,bfl:11,
    le:[-16,-90],lf:[-6,-104],re:[-50,-74],rf:[-44,-92]},
  chamber:{hip:[-2,-62],hw:5,sh:[-12,-102],sw:12,hd:[-6,-120],
    fk:[22,-82],ff:[4,-64],ffa:1.4,ffl:11,bk:[-10,-30],bf:[-14,0],bfa:1.6,bfl:8,
    le:[12,-90],lf:[22,-104],re:[-20,-90],rf:[-6,-112]},
  kick:{hip:[2,-68],hw:4,sh:[-30,-94],sw:11,hd:[-42,-108],
    fk:[48,-72],ff:[96,-76],ffa:1.57,ffl:16,bk:[-4,-32],bf:[-12,0],bfa:3.14,bfl:11,
    le:[-10,-90],lf:[-2,-106],re:[-44,-80],rf:[-36,-100]},
  dLean:{hip:[-10,-64],hw:5,sh:[-34,-98],sw:12,hd:[-40,-114],
    fk:[10,-82],ff:[-6,-66],ffa:1.4,ffl:11,bk:[-16,-30],bf:[-20,0],bfa:1.6,bfl:8,
    le:[-14,-92],lf:[-2,-108],re:[-44,-86],rf:[-34,-104]},
  dKick:{hip:[-8,-70],hw:4,sh:[-46,-92],sw:11,hd:[-60,-102],
    fk:[48,-74],ff:[104,-74],ffa:1.57,ffl:16,bk:[-14,-34],bf:[-20,0],bfa:3.14,bfl:11,
    le:[-26,-96],lf:[-12,-108],re:[-60,-80],rf:[-52,-98]},
  // one big step: the kicking leg lands far behind the rear foot
  dPlant:{hip:[-14,-54],hw:5,sh:[-12,-98],sw:12,hd:[-4,-116],
    fk:[-44,-28],ff:[-70,0],ffa:0,ffl:9,bk:[14,-28],bf:[22,0],bfa:0,bfl:11,
    le:[10,-92],lf:[20,-106],re:[-12,-88],rf:[0,-110]},
  // blitz: big forward lean, body stays low and glides straight forward (never rises)
  bCrouch:{hip:[0,-48],hw:6,sh:[18,-88],sw:11,hd:[30,-100],
    fk:[36,-22],ff:[46,0],ffa:0,ffl:12,bk:[-30,-20],bf:[-46,0],bfa:0,bfl:8,
    le:[36,-84],lf:[46,-98],re:[12,-78],rf:[24,-96]},
  bBack:{hip:[6,-48],hw:4,sh:[42,-80],sw:8,hd:[56,-90],
    fk:[27,-30],ff:[-15,-10],ffa:0.2,ffl:12,bk:[-24,-28],bf:[-52,-18],bfa:-0.4,bfl:10,
    le:[62,-92],lf:[92,-96],re:[36,-74],rf:[50,-90]},
  bPunch:{hip:[8,-46],hw:3,sh:[46,-74],sw:5,hd:[62,-84],
    fk:[26,-27],ff:[14,-8],ffa:0.2,ffl:12,bk:[-26,-26],bf:[-58,-16],bfa:-0.4,bfl:10,
    le:[66,-92],lf:[60,-114],re:[78,-96],rf:[110,-112]},
  // punch fake: front foot slides a bit forward, lead hand rises diagonally forward
  fakeP:{hip:[4,-56],hw:6,sh:[4,-100],sw:12,hd:[12,-118],
    fk:[44,-28],ff:[58,0],ffa:0,ffl:12,bk:[-30,-28],bf:[-44,0],bfa:0,bfl:7,
    le:[44,-100],lf:[64,-116],re:[-2,-84],rf:[10,-106]},
  // kick fake: lead leg lifts diagonally forward
  fakeK:{hip:[-2,-58],hw:6,sh:[-8,-100],sw:13,hd:[-2,-118],
    fk:[34,-62],ff:[54,-44],ffa:0.6,ffl:12,bk:[-28,-30],bf:[-40,0],bfa:0,bfl:7,
    le:[22,-90],lf:[34,-104],re:[-12,-84],rf:[0,-106]},
  stepAir:{hip:[6,-62],hw:6,sh:[10,-104],sw:12,hd:[18,-120],
    fk:[30,-48],ff:[22,-22],ffa:0.3,ffl:12,bk:[-18,-46],bf:[-34,-24],bfa:-0.3,bfl:9,
    le:[30,-92],lf:[40,-106],re:[0,-86],rf:[12,-108]},
  // backfist snapped out with the lead hand while he's in the air
  stepFist:{hip:[8,-62],hw:5,sh:[18,-100],sw:10,hd:[28,-116],
    fk:[30,-48],ff:[22,-22],ffa:0.3,ffl:12,bk:[-18,-46],bf:[-34,-24],bfa:-0.3,bfl:9,
    le:[52,-106],lf:[86,-112],re:[10,-88],rf:[24,-104]},
  // deep lead-leg step, back foot planted where it was, body dipped low
  lbf:{hip:[10,-40],hw:5,sh:[34,-76],sw:9,hd:[46,-90],
    fk:[50,-26],ff:[72,0],ffa:0,ffl:12,bk:[-34,-20],bf:[-68,0],bfa:0,bfl:7,
    le:[66,-72],lf:[100,-78],re:[32,-78],rf:[44,-94]},
  hbf:{hip:[10,-46],hw:5,sh:[28,-90],sw:10,hd:[40,-106],
    fk:[50,-28],ff:[72,0],ffa:0,ffl:12,bk:[-34,-22],bf:[-68,0],bfa:0,bfl:7,
    le:[62,-104],lf:[96,-112],re:[24,-86],rf:[36,-102]},
  // in the air going backwards: hips pulled back, legs tucked under him
  backAir:{hip:[-20,-64],hw:6,sh:[-3,-107],sw:12,hd:[6,-120],
    fk:[10,-42],ff:[16,-18],ffa:0.2,ffl:12,bk:[-15,-36],bf:[-1,-13],bfa:-0.2,bfl:8,
    le:[4,-84],lf:[-18,-98],re:[-33,-100],rf:[-40,-124]},
  dbfAir:{hip:[-18,-64],hw:5,sh:[0,-104],sw:10,hd:[10,-120],
    fk:[10,-42],ff:[16,-18],ffa:0.2,ffl:12,bk:[-36,-44],bf:[-46,-20],bfa:-0.2,bfl:8,
    le:[34,-88],lf:[65,-85],re:[-8,-90],rf:[4,-110]},
  hurt:{hip:[-6,-58],hw:6,sh:[-18,-100],sw:12,hd:[-20,-117],
    fk:[28,-28],ff:[38,0],ffa:0,ffl:12,bk:[-34,-26],bf:[-48,0],bfa:0,bfl:7,
    le:[6,-86],lf:[14,-98],re:[-24,-86],rf:[-14,-100]}
};
/* reverse punch = low upper body + running legs, blended separately */
const UP={
  // drive-blitz: body leaning forward low, rear hand straight out, lead glove up high like a shield
  punch:{sh:[42,-78],sw:5,hd:[56,-90],le:[66,-100],lf:[58,-122],re:[74,-86],rf:[106,-88]},
  run:{sh:[36,-86],sw:7,hd:[50,-98],le:[52,-100],lf:[54,-116],re:[38,-88],rf:[52,-102]}
};
const LEG={
  // A: lead foot in front, rear leg stretched back.  B: rear foot steps through to the front.
  A:{hip:[8,-48],hw:3,fk:[44,-30],ff:[52,0],ffa:0,ffl:13,bk:[-20,-24],bf:[-48,-2],bfa:-0.3,bfl:11},
  B:{hip:[8,-50],hw:3,fk:[-6,-28],ff:[-34,-8],ffa:-0.4,ffl:12,bk:[34,-30],bf:[46,0],bfa:0,bfl:12}
};
const compose=(up,legs)=>Object.assign({},legs,up);
function mix(a,b,t){
  const o={};
  for(const k in a)o[k]=typeof a[k]==='number'?a[k]+(b[k]-a[k])*t:[a[k][0]+(b[k][0]-a[k][0])*t,a[k][1]+(b[k][1]-a[k][1])*t];
  return o;
}
const ease=t=>t<0?0:t>1?1:t*t*(3-2*t);

function makeFighter(x,team){
  return{x,facing:team==='blue'?1:-1,team,state:'idle',t:0,move:null,mk:'',hasHit:false,flash:0,walk:0,spd:1,ac:0};
}
const SPX=3.4;
// tatami: 8 blocks across; at the fighters' line it runs from MAT_L to MAT_R
// 1 m = 89 px at the fighters' line; each tatami block is 1.2 x that, 7 blocks long
const M=89,T=M*1.2,MAT_L=400-3.5*T,MAT_R=400+3.5*T,XMIN=6,XMAX=794;
const START_L=400-T,START_R=400+T; // centres of the two red blocks
const isOut=f=>f.x<MAT_L||f.x>MAT_R;
// out because the opponent shoved him (in the last ~1/4 s), not by his own steps
const wasPushed=f=>(f.pushT!=null&&frame-f.pushT<15)||(mode==='host'&&f===CPU&&!!f.remotePush);
let P1,CPU;

function begin(f,k){f.state='attack';f.mk=k;f.move=MOVES[k];f.t=0;f.hasHit=false;f.ac++;onStart(f);if(k!=='pdown')sfx('whoosh')}
// Perfect timing: a side kick started before the opponent's head-kicking leg has even lifted (first ~4 frames)
// jams the head kick (it can't score) and the side kick counts as a counter.
function onStart(f){
  f.jammed=false;f.evaded=false;f.counterK=false;
  const o=f===P1?CPU:P1;
  if(o&&(f.mk==='kick'||f.mk==='pkick')&&o.state==='attack'&&(o.mk==='head'||o.mk==='phead')&&o.t<=4){o.jammed=true;f.counterK=true}
}
// in the air during a step in, a side kick to the body goes under him
const jumpsOver=(a,d)=>(a.mk==='kick'||a.mk==='pkick')&&d.state==='attack'&&d.mk==='step'&&d.t>=2&&d.t<17;
// step in only exists as an answer to the opponent's kick (a kick fake baits it too, and gets countered)
const KICKS=['kick','pkick','head','phead','def','fakeK'];
const canStep=f=>{const o=f===P1?CPU:P1;return !!o&&o.state==='attack'&&KICKS.includes(o.mk)};
function startAttack(f,k){
  if(f.state!=='idle')return false;
  if(k==='step'&&!canStep(f))return false;
  f.state='attack';f.mk=k;f.move=MOVES[k];f.t=0;f.hasHit=false;f.ac++;onStart(f);sfx('whoosh');return true;
}
// 1 pressed at the same time as W or D turns that move into a fake.
// "Same time" allows ~4 frames (about 1/15 s) either way, since fingers never land exactly together.
function handleButtons(f){
  // R during the jump back turns it into the defensive backfist, still in the air
  if(f.state==='attack'&&f.mk==='back'&&f.t<12&&(buf.dbf>0||buf.lbf>0||buf.hbf>0)){
    f.mk='dbf';f.move=MOVES.dbf;f.hasHit=false;f.ac++;buf.dbf=buf.lbf=buf.hbf=0;sfx('whoosh');
  }
  // PRESS: hold Shift to lift the lead leg and skip forward; D / F kick from there without the foot touching down
  if(f.pressing&&f.state==='idle'){f.state='press';f.pt=0}
  if(f.state==='press'){
    if(!f.pressing)begin(f,'pdown');
    else if(buf.kick>0){begin(f,'pkick');buf.kick=0;buf.fake=0}
    else if(buf.head>0){begin(f,'phead');buf.head=0}
    else if(buf.hbf>0){begin(f,'hbf');buf.hbf=0}
    return;
  }
  if(buf.fake>0&&f.state==='attack'&&f.t<4){
    if(f.mk==='punch'){f.mk='fakeP';f.move=MOVES.fakeP;f.ac++;buf.fake=0}
    else if(f.mk==='kick'){f.mk='fakeK';f.move=MOVES.fakeK;f.ac++;buf.fake=0}
  }
  const fk=buf.fake>0;
  if(buf.punch>0&&startAttack(f,fk?'fakeP':'punch')){buf.punch=0;if(fk)buf.fake=0}
  else if(buf.kick>0&&startAttack(f,fk?'fakeK':'kick')){buf.kick=0;if(fk)buf.fake=0}
  else if(buf.def>0&&startAttack(f,'def'))buf.def=0;
  else if(buf.blitz>0&&startAttack(f,'blitz'))buf.blitz=0;
  else if(buf.head>0&&startAttack(f,'head'))buf.head=0;
  else if(buf.step>0&&startAttack(f,'step'))buf.step=0;
  else if(buf.lbf>0&&startAttack(f,'lbf'))buf.lbf=0;
  else if(buf.hbf>0&&startAttack(f,'hbf'))buf.hbf=0;
  else if(buf.dbf>0&&startAttack(f,'dbf'))buf.dbf=0;
  else if(buf.back>0&&startAttack(f,'back'))buf.back=0;
  else if(buf.fakeP>0&&startAttack(f,'fakeP'))buf.fakeP=0;
  else if(buf.fakeK>0&&startAttack(f,'fakeK'))buf.fakeK=0;
}
function advance(f){
  if(f.flash>0)f.flash--;
  if(f.state!=='attack')return;
  f.t++;
  const m=f.move;
  if(f.t>=m.startup+m.active+m.recovery){
    const wasPress=m.press;f.state='idle';f.move=null;
    if(wasPress){if(f.pressing)f.state='press';else begin(f,'pdown')} // leg goes back up, or comes down
  }
}
function moveFighter(f,dir){
  // dir is in screen terms for the player (-1 left, +1 right)
  if(f.state==='idle'){
    f.x+=dir*SPX*f.spd;
    if(dir)f.walk+=0.3;
  }else if(f.state==='press'){
    if(state==='fight')f.x+=2.4*f.facing;f.pt=(f.pt||0)+1; // skipping forward on the back foot
  }else if(f.state==='attack'&&f.move.press){
    f.x+=f.move.lunge*f.facing;f.pt=(f.pt||0)+1;
  }else if(f.state==='attack'){
    const m=f.move;
    if(f.mk==='punch'){
      // steady speed: every one of the 4 steps covers the same distance
      if(f.t<m.startup)f.x+=2*f.facing;
      else if(f.t<m.startup+4*m.stepLen)f.x+=m.lunge*f.facing;
    }else if(f.mk==='blitz'){
      if(f.t>=6&&f.t<20)f.x+=m.lunge*f.facing;
      else if(f.t>=20&&f.t<36)f.x+=4.5*f.facing; // running on into the opponent
    }else if(f.mk==='lbf'||f.mk==='hbf'){
      // lead foot steps deep, back foot stays: the body shifts forward, then comes back as the lead leg returns
      if(f.t<m.startup)f.x+=m.step/m.startup*f.facing;
      else if(f.t>=m.startup+m.active)f.x-=m.step/m.recovery*f.facing;
    }else if(f.mk==='back'||f.mk==='dbf'){
      if(f.t>=1&&f.t<16)f.x-=3*f.facing; // about half a metre back, close enough to counter
    }else if(f.mk==='step'){
      if(f.t<17)f.x+=m.lunge*f.facing;
    }else if(f.mk==='def'){
      // drifts back while kicking, then steps back as the kicking leg lands behind
      const s=m.startup,a=m.active;
      if(f.t<s)f.x-=1.5*f.facing;
      else if(f.t<s+a)f.x-=0.5*f.facing;
      else if(f.t<s+a+12)f.x-=4*f.facing;
    }else if(f.t<m.startup+m.active)f.x+=m.lunge*f.facing;
  }
  f.x=Math.max(XMIN,Math.min(XMAX,f.x));
}
const GAP=52;
function separate(){
  const dx=CPU.x-P1.x;
  if(mode==='host'&&Math.abs(dx)<GAP){P1.pushT=frame;P1.x=CPU.x-GAP*(dx>=0?1:-1);P1.x=Math.max(XMIN,Math.min(XMAX,P1.x));return}
  if(mode==='guest'&&Math.abs(dx)<GAP){CPU.pushT=frame;CPU.x=P1.x+GAP*(dx>=0?1:-1);CPU.x=Math.max(XMIN,Math.min(XMAX,CPU.x));return}
  if(Math.abs(dx)<GAP){
    const push=(GAP-Math.abs(dx))/2,s=dx>=0?1:-1;
    P1.x-=push*s;CPU.x+=push*s;P1.pushT=CPU.pushT=frame;
    if(P1.x<XMIN){CPU.x+=XMIN-P1.x;P1.x=XMIN}
    if(CPU.x>XMAX){P1.x-=CPU.x-XMAX;CPU.x=XMAX}
  }
}
function face(){
  if(P1.state==='idle')P1.facing=CPU.x>=P1.x?1:-1;
  if(CPU.state==='idle')CPU.facing=P1.x>CPU.x?1:-1;
}
function inHit(a,d){
  if(a.state!=='attack'||a.hasHit||a.jammed)return false;
  const m=a.move;if(m.fake||m.noHit||a.t<m.startup||a.t>=m.startup+m.active)return false;
  const dx=(d.x-a.x)*a.facing;
  // leaning back for a defensive kick takes the head/body out of range
  const evade=(d.state==='attack'&&d.mk==='def'&&d.t<d.move.startup+d.move.active)?25:0;
  const reach=a.mk==='blitz'&&a.t<11?115:m.reach;
  // dipped low for the body backfist: anything aimed at the head goes over him
  if(m.hy>=100&&d.state==='attack'&&d.mk==='lbf'&&d.t>=3&&d.t<d.move.startup+d.move.active+6){
    if(dx>0&&dx<=reach&&!a.evaded){a.evaded=true;addPop('DUCKED!',d.x,GROUND-175,'#c9a6ff',30)}
    return false;
  }
  // jumping back with the waist pulled back: the reverse punch falls short
  if(a.mk==='punch'&&d.state==='attack'&&(d.mk==='back'||d.mk==='dbf')&&d.t>=1&&d.t<16){
    if(dx>0&&dx<=reach&&!a.evaded){a.evaded=true;addPop('MISSED!',d.x,GROUND-175,'#c9a6ff',30)}
    return false;
  }
  if(dx>0&&dx<=reach-evade&&jumpsOver(a,d)){ // jumped over it
    if(!a.evaded){a.evaded=true;addPop('STEP IN!',d.x,GROUND-175,'#c9a6ff',30)}
    return false;
  }
  return dx>0&&dx<=reach-evade;
}

/* ---------- CPU brain ---------- */
const DIFF={
  easy:{react:24,aggr:0.006,dodge:0.15,acc:0.5,spd:0.75,label:'Easy'},
  normal:{react:14,aggr:0.013,dodge:0.35,acc:0.72,spd:0.9,label:'Normal'},
  hard:{react:8,aggr:0.024,dodge:0.6,acc:0.9,spd:1,label:'Hard'}
};
let diff=DIFF.normal,diffKey='normal';
const ai={mx:0,timer:0,want:115};
function aiThink(){
  if(ai.hold>0){ai.hold--;return 0}
  const c=CPU,p=P1,dx=p.x-c.x,adx=Math.abs(dx),toward=Math.sign(dx)||-1;
  if(--ai.timer<=0){
    ai.timer=diff.react+Math.floor(Math.random()*8);
    ai.want=Math.random()<0.5?118:88;
    const pm=p.state==='attack'?(p.move.fake?MOVES[p.move.fake]:p.move):null; // a good fake fools it
    const threat=pm&&p.t<pm.startup+2&&adx<pm.reach+pm.lunge*pm.startup+20;
    const room=c.x>MAT_L+90&&c.x<MAT_R-90;
    if(threat&&pm.name&&(p.mk==='kick'||p.mk==='pkick')&&c.state==='idle'&&Math.random()<diff.dodge*0.4)startAttack(c,'step');
    else if(threat&&p.mk==='punch'&&c.state==='idle'&&Math.random()<diff.dodge*0.35)startAttack(c,'dbf');
    else if(threat&&p.mk==='blitz'&&c.state==='idle'&&adx<240&&Math.random()<diff.dodge*0.5)startAttack(c,'lbf');
    else if(threat&&room&&adx<190&&c.state==='idle'&&Math.random()<diff.dodge*0.5)startAttack(c,'def');
    else if(threat&&Math.random()<diff.dodge)ai.mx=-toward;
    else if(Math.random()>diff.acc)ai.mx=Math.floor(Math.random()*3)-1;
    else ai.mx=adx>ai.want+10?toward:adx<ai.want-14?-toward:(Math.random()<0.3?toward:0);
  }
  if((c.x<MAT_L+60&&ai.mx<0)||(c.x>MAT_R-60&&ai.mx>0))ai.mx=toward; // don't back off the mat
  if(c.state==='idle'){
    if(adx<200&&adx>90&&Math.random()<diff.aggr*2.5)startAttack(c,'punch');
    else if(adx>=110&&adx<175&&Math.random()<diff.aggr*2)startAttack(c,'kick');
    else if(adx>=110&&adx<165&&Math.random()<diff.aggr)startAttack(c,'head');
    else if(adx>=170&&adx<220&&Math.random()<diff.aggr*1.5)startAttack(c,'blitz');
    else if(p.state==='attack'&&p.t>=p.move.startup+p.move.active&&adx<200&&Math.random()<diff.acc*0.22)startAttack(c,adx<130?'kick':'punch');
  }
  return ai.mx;
}

/* ---------- game state ---------- */
let state='menu',stTimer=0,timer=0,golden=false,score=[0,0],hitstop=0,shake=0,frame=0;
let msg='',sub='',msgCol='#fff',lastLoser=null,pendingEnd=false;
const parts=[],pops=[];
const ROUND=60*60,WIN_AT=10;
function spawnHit(x,y,t){
  shake=10;sfx('hit');rumble();
  for(let n=0;n<22;n++){const an=Math.random()*Math.PI*2,sp=2+Math.random()*5;parts.push({x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp-1,life:30+Math.random()*15,col:Math.random()<0.5?'#ffd25a':'#fff'})}
  pops.push({text:t,x,y:y-14,life:60,col:'#ffd25a',size:40});
}
function addPop(t,x,y,c,size){
  pops.push({text:t,x,y,life:size>30?90:40,col:c,size});
  popSeq++;lastPop={t,x,y,c,s:size};
}

/* ---------- online: two players, host runs the fight ----------
   Both join a named room "pf-<code>". The host (blue) simulates everything and
   publishes a snapshot in its presence; the guest (red) publishes only its
   inputs and draws the host's snapshot. */
const NET_OFF='Online matches are coming soon. For now, fight the computer.';
let mode='cpu',roomNS=null,mroom=null,roomCode='',lastSnapObj=null;
let hitSeq=0,popSeq=0,lastHit={x:0,y:0,t:''},lastPop={t:'',x:0,y:0,c:'#ffffff',s:26},gameId=0,netTick=0;
let round=0,seenRound=null,lobbyTick=0,seenGame=null,seenHit=null,seenPop=null,peerGoneAt=0;
(async()=>{try{if(window.claude&&window.claude.use)roomNS=await window.claude.use('room')}catch(e){roomNS=null}
  const m=document.getElementById('netMsg');if(m&&!roomNS)m.textContent=NET_OFF;})();
function findPeer(role){
  if(!mroom)return null;
  try{return mroom.peers().find(p=>!p.sameTab&&p.kind!=='agent'&&p.presence&&p.presence.role===role)||null}catch(e){return null}
}
function setNetMsg(t){const m=document.getElementById('netMsg');if(m)m.textContent=t}
function setDirLabels(){
  // Red (online guest) fights facing left, so the kick stick's forward/back swap
  const g=mode==='guest';
  document.getElementById('kl').textContent=g?'◀ SIDE':'◀ DEF';
  document.getElementById('kr').textContent=g?'DEF ▶':'SIDE ▶';
}
function showOnline(){
  state='menu';
  overlay.innerHTML=`<p class="big" style="color:#c9a6ff">PLAY A FRIEND</p>
    <p class="how">You and your friend both open this game. One taps <b>Create match</b> and reads out the code, the other types it and taps <b>Join</b>. The one who creates is Blue.</p>
    <div class="row"><button class="pick again" data-create="1">Create match</button></div>
    <div class="row"><input id="codeIn" maxlength="4" placeholder="CODE" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Match code"><button class="pick normal" data-join="1">Join</button></div>
    <p id="netMsg" class="how"></p>
    <div class="row"><button class="pick grey" data-menu="1">Back</button></div>`;
  overlay.classList.remove('hide');
  if(!roomNS)setNetMsg(NET_OFF);
}
async function joinRoom(code,role){
  if(!roomNS){setNetMsg(NET_OFF);return}
  setNetMsg('Connecting…');
  try{
    if(mroom){try{await mroom.leave()}catch(e){}}
    mroom=await roomNS.join('pf-'+code);
  }catch(e){
    mroom=null;const c=e&&e.code;
    setNetMsg(c==='not_permitted'||c==='not_granted'||c==='revoked'
      ?"This account can't join online matches here. The game's owner needs to share it with you directly (Share → invite), and you need to be signed in to Claude."
      :"Couldn't connect ("+(c||'unknown')+"). Check your connection and try again.");
    return}
  roomCode=code;mode=role;setDirLabels();
  lastSnapObj=null;seenGame=null;peerGoneAt=0;
  mroom.presence({role,snap:null,me:null}).catch(()=>{});
  mroom.onPeers(()=>{if(mode==='host'&&state==='lobby'&&findPeer('guest'))startOnlineMatch()},()=>{});
  state='lobby';
  overlay.innerHTML=role==='host'
    ?`<p class="how">Your match code</p><p class="code">${code.toUpperCase()}</p><p class="how">Tell your friend to tap <b>Play online</b>, type this code and tap <b>Join</b>. The fight starts as soon as they're in.</p><p class="how" id="lobbyMsg">Waiting for your friend…</p><div class="row"><button class="pick grey" data-leave="1">Cancel</button></div>`
    :`<p class="how">Joined match</p><p class="code">${code.toUpperCase()}</p><p class="how" id="lobbyMsg">Connecting to the match…</p><div class="row"><button class="pick grey" data-leave="1">Cancel</button></div>`;
  overlay.classList.remove('hide');
  if(role==='host'&&findPeer('guest'))startOnlineMatch();
}
function lobbyCheck(){
  const el=document.getElementById('lobbyMsg');
  let n=0;try{n=mroom.peers().filter(p=>!p.sameTab).length}catch(e){}
  const ok=mroom.connected?mroom.connected():true;
  if(mode==='host'){
    if(findPeer('guest')){startOnlineMatch();return}
    if(el)el.textContent=!ok?'Connecting…':n?'Someone is here but hasn\'t joined as a player yet…':'Waiting for your friend… (nobody else in this match yet)';
  }else if(el){
    const h=findPeer('host');
    el.textContent=!ok?'Connecting…':h?'Found your friend\'s match. Waiting for it to start…'
      :n?'Connected, waiting for the host…':'Connected, but there\'s no match with this code right now. Check the code and that your friend is still on the code screen.';
  }
}
function createMatch(){
  const A='abcdefghjkmnpqrstuvwxyz23456789';let c='';
  for(let i=0;i<4;i++)c+=A[Math.floor(Math.random()*A.length)];
  joinRoom(c,'host');
}
function joinMatch(){
  const el=document.getElementById('codeIn');const c=(el?el.value:'').trim().toLowerCase();
  if(!/^[a-z0-9]{4}$/.test(c)){setNetMsg('Type the 4-character code your friend sees.');return}
  joinRoom(c,'guest');
}
function leaveOnline(){
  if(mroom){mroom.leave().catch(()=>{});mroom=null}
  mode='cpu';setDirLabels();P1=null;CPU=null;showMenu();
}
function startOnlineMatch(){
  gameId++;peerGoneAt=0;
  P1=makeFighter(START_L,'blue');CPU=makeFighter(START_R,'red');
  score=[0,0];timer=ROUND;golden=false;pendingEnd=false;parts.length=0;pops.length=0;
  overlay.classList.add('hide');
  resetPositions(90);
}
function opponentLeft(){
  if(mroom){mroom.leave().catch(()=>{});mroom=null}
  mode='cpu';setDirLabels();state='menu';
  overlay.innerHTML=`<p class="big">MATCH OVER</p><p class="how">Your friend left the match.</p><div class="row"><button class="pick normal" data-menu="1">Back to menu</button></div>`;
  overlay.classList.remove('hide');
}
function makeSnap(){
  const fz=f=>[Math.round(f.x*10)/10,f.facing,f.state==='attack'?1:f.state==='press'?2:0,f.mk||'',f.t,f.flash,Math.round(f.walk*100)/100];
  return{g:gameId,rd:round,s:state,st:stTimer,tm:timer,gd:golden?1:0,sc:[score[0],score[1]],f:[fz(P1),fz(CPU)],
    ll:lastLoser===P1?0:lastLoser===CPU?1:-1,m:msg,sb:sub,mc:msgCol,
    h:[hitSeq,Math.round(lastHit.x),Math.round(lastHit.y),lastHit.t],
    pp:[popSeq,lastPop.t,Math.round(lastPop.x),Math.round(lastPop.y),lastPop.c,lastPop.s]};
}
const num=(v,d)=>{v=+v;return isFinite(v)?v:d};
function applySnap(sn){
  lastSnapObj=sn;
  if(!sn||typeof sn!=='object'||!Array.isArray(sn.f)||!Array.isArray(sn.sc))return;
  if(!P1){P1=makeFighter(START_L,'blue');CPU=makeFighter(START_R,'red')}
  const prev=state;
  if(['ready','fight','break','end'].includes(sn.s))state=sn.s;
  stTimer=num(sn.st,0);timer=num(sn.tm,0);golden=!!sn.gd;score=[num(sn.sc[0],0),num(sn.sc[1],0)];
  const newRound=sn.rd!==seenRound;seenRound=sn.rd;
  [P1,CPU].forEach((f,i)=>{
    const a=sn.f[i];if(!Array.isArray(a))return;
    if(f===CPU&&!newRound){f.flash=num(a[5],0);return} // my own fighter: keep my local version
    const wasAtk=f.state==='attack',pmk=f.mk,pt=f.t;
    f.x=num(a[0],f.x);f.facing=a[1]<0?-1:1;
    f.mk=MOVES[a[3]]?a[3]:'';f.state=a[2]===2?'press':a[2]&&f.mk?'attack':'idle';f.move=f.state==='attack'?MOVES[f.mk]:null;
    f.t=num(a[4],0);f.flash=num(a[5],0);f.walk=num(a[6],0);
    if(f===P1&&f.state==='attack'&&(!wasAtk||pmk!==f.mk||f.t<pt-2))sfx('whoosh');
  });
  lastLoser=sn.ll===0?P1:sn.ll===1?CPU:null;
  msg=String(sn.m||'').slice(0,40);sub=String(sn.sb||'').slice(0,60);
  msgCol=/^#[0-9a-f]{6}$/i.test(sn.mc)?sn.mc:'#ffffff';
  const h=Array.isArray(sn.h)?sn.h:[0,0,0,''],pp=Array.isArray(sn.pp)?sn.pp:[0,'',0,0,'#ffffff',26];
  if(sn.g!==seenGame){
    seenGame=sn.g;seenHit=h[0];seenPop=pp[0];parts.length=0;pops.length=0;
    if(state!=='end')overlay.classList.add('hide');
  }
  if(h[0]!==seenHit){seenHit=h[0];spawnHit(num(h[1],400),num(h[2],250),String(h[3]).slice(0,4))}
  if(pp[0]!==seenPop){seenPop=pp[0];pops.push({text:String(pp[1]).slice(0,20),x:num(pp[2],400),y:num(pp[3],200),life:num(pp[5],26)>30?90:40,col:/^#[0-9a-f]{6}$/i.test(pp[4])?pp[4]:'#ffffff',size:Math.min(40,num(pp[5],26))})}
  if(prev!=='fight'&&state==='fight')sfx('bell');
  if(state==='end'&&prev!=='end')endGame();
}
function guestUpdate(){
  updateFx();frame++;
  if(!mroom)return;
  const hp=findPeer('host');
  const sn=hp&&hp.presence.snap;
  if(sn&&sn!==lastSnapObj)applySnap(sn);
  else if(P1&&state!=='end')advance(P1);
  if(!P1||state==='end'||state==='lobby')return;
  // my fighter (Red) runs right here, so the controls respond instantly
  if(state==='fight'){
    CPU.pressing=pressHeld();
    handleButtons(CPU);
    moveFighter(CPU,readMove());
  }else if(state==='break')moveFighter(CPU,0);
  advance(CPU);separate();
  if(CPU.state==='idle')CPU.facing=P1.x>CPU.x?1:-1;
  if(buf.punch>0)buf.punch--;if(buf.kick>0)buf.kick--;if(buf.def>0)buf.def--;if(buf.fake>0)buf.fake--;if(buf.blitz>0)buf.blitz--;if(buf.head>0)buf.head--;if(buf.step>0)buf.step--;if(buf.lbf>0)buf.lbf--;if(buf.hbf>0)buf.hbf--;if(buf.back>0)buf.back--;if(buf.dbf>0)buf.dbf--;if(buf.fakeP>0)buf.fakeP--;if(buf.fakeK>0)buf.fakeK--;
  mroom.presence({me:[Math.round(CPU.x*10)/10,CPU.state==='attack'?1:CPU.state==='press'?2:0,CPU.mk||'',CPU.t,CPU.ac,CPU.facing,round_g(),Math.round(CPU.walk*100)/100,CPU.pushT!=null&&frame-CPU.pushT<15?1:0]}).catch(()=>{});
}
const round_g=()=>seenRound;
// Red is simulated on the guest's own screen (no input delay for them); the host
// takes Red's position and attack from the guest and decides the hits.
function hostReadGuest(){
  const g=findPeer('guest'),a=g&&g.presence.me;
  if(!Array.isArray(a)||!CPU)return;
  if(num(a[6],-1)!==round)return; // still from the previous exchange
  const atk=a[1]===1,mk=MOVES[a[2]]?a[2]:'',ac=num(a[4],0);
  if(a[1]===2&&CPU.state!=='attack')CPU.state='press';else if(a[1]===0&&CPU.state==='press')CPU.state='idle';
  if(ac!==CPU.ac){CPU.ac=ac;if(atk&&mk){CPU.state='attack';CPU.mk=mk;CPU.move=MOVES[mk];CPU.t=num(a[3],0);CPU.hasHit=false;onStart(CPU);sfx('whoosh')}}
  if(atk&&mk&&CPU.state==='attack'&&CPU.mk===mk)CPU.t=num(a[3],CPU.t);
  else if(!atk&&CPU.state==='attack'){CPU.state='idle';CPU.move=null}
  if(state==='fight'||state==='break')CPU.x=Math.max(XMIN,Math.min(XMAX,num(a[0],CPU.x)));
  CPU.facing=a[5]<0?-1:1;CPU.walk=num(a[7],CPU.walk);CPU.remotePush=a[8]===1;
}

function resetPositions(t){
  P1.x=START_L;CPU.x=START_R;round++;
  for(const f of[P1,CPU]){f.state='idle';f.move=null;f.t=0;f.flash=0}
  face();lastLoser=null;ai.timer=0;ai.hold=diff.react*2; // CPU takes a beat after FIGHT!
  state='ready';stTimer=t;
}
function newGame(k){
  mode='cpu';setDirLabels();
  diffKey=k;diff=DIFF[k];
  P1=makeFighter(START_L,'blue');CPU=makeFighter(START_R,'red');CPU.spd=diff.spd;
  score=[0,0];timer=ROUND;golden=false;pendingEnd=false;parts.length=0;pops.length=0;
  overlay.classList.add('hide');
  resetPositions(80);
}
function award(a,d){
  const m=a.move,i=a===P1?0:1;
  score[i]+=m.pts;a.hasHit=true;d.flash=18;lastLoser=d;
  hitstop=7;
  const ix=d.x-a.facing*8,iy=GROUND-m.hy*S;
  spawnHit(ix,iy,'+'+m.pts);
  hitSeq++;lastHit={x:ix,y:iy,t:'+'+m.pts};
  const counter=(a.mk==='def'&&d.state==='attack'&&d.mk==='punch')||(a.mk==='dbf'&&d.state==='attack'&&d.mk==='punch')||(a.mk==='lbf'&&d.state==='attack'&&d.mk==='blitz')||(a.mk==='step'&&d.state==='attack'&&(d.mk==='kick'||d.mk==='pkick'||d.mk==='fakeK'))||(a.counterK&&(d.mk==='head'||d.mk==='phead'));
  msg=(a===P1?'BLUE':'RED')+(counter?' COUNTERS!':' SCORES!');sub=(a.mk==='blitz'?(a.t<11?'BLITZ – BACKFIST':'BLITZ – DIRECT TO HEAD'):m.name)+'  +'+m.pts;msgCol=a===P1?'#5cc8ff':'#ff5a4a';
  state='break';stTimer=95;
  if(score[i]>=WIN_AT||golden)pendingEnd=true;
}
function pushOut(f){
  lastLoser=null;hitstop=4;sfx('bell');
  addPop('PUSH',f.x,GROUND-150,'#ffffff',34);
  msg='PUSH';sub=(f===P1?'BLUE':'RED')+' PUSHED OUT · NO POINT';msgCol='#ffffff';
  state='break';stTimer=70;
}
function stepOut(f){
  if(wasPushed(f))return pushOut(f);
  const i=f===P1?0:1;
  score[i]-=1;lastLoser=null;hitstop=4;sfx('bell');
  addPop('-1',f.x,GROUND-150,'#ff6b5a',40);
  msg=(f===P1?'BLUE':'RED')+' STEPS OUT';sub='OUT OF THE MAT  −1';msgCol=f===P1?'#5cc8ff':'#ff5a4a';
  state='break';stTimer=85;
  if(golden)pendingEnd=true;
}
function endGame(){
  state='end';
  const me=mode==='guest'?1:0,won=score[me]>score[1-me];
  if(won)sfx('win');else sfx('bell');
  if(mode!=='cpu'){
    overlay.innerHTML=`<p class="big" style="color:${won?'#5cc8ff':'#ff5a4a'}">${won?'YOU WIN!':'YOU LOSE'}</p>
    <p class="score">Blue ${score[0]} – ${score[1]} Red</p>
    ${mode==='host'?'<div class="row"><button class="pick again" data-rematch="1">Rematch</button><button class="pick grey" data-leave="1">Leave</button></div>'
      :'<p class="how">Waiting for your friend to start a rematch…</p><div class="row"><button class="pick grey" data-leave="1">Leave</button></div>'}`;
    overlay.classList.remove('hide');return;
  }
  overlay.innerHTML=`<p class="big" style="color:${won?'#5cc8ff':'#ff5a4a'}">${won?'YOU WIN!':'YOU LOSE'}</p>
    <p class="score">Blue ${score[0]} – ${score[1]} Red · ${diff.label}</p>
    <div class="row"><button class="pick again" data-d="${diffKey}">Rematch</button>
    <button class="pick normal" data-cpu="1">Change level</button></div>`;
  overlay.classList.remove('hide');
}
function showMenu(){
  state='menu';
  overlay.innerHTML=`<h1>POINT<br>FIGHTER</h1>
    <p class="sub">Arcade point fighting. Score a clean hit, the referee stops the fight, then you go again.</p>
    <button class="pick cpu wide" data-cpu="1">Play vs CPU</button>
    <button class="pick online wide" data-online="1">Play online</button>
    <button class="pick setb wide" data-settings="1">Settings</button>
    <button class="pick fightersb wide" data-fighters="1">Fighters</button>
    <button class="pick rulesb wide" data-rules="1">Rules and controls</button>
    <p class="how" id="padMsg" style="margin:6px 0 0">${pad.on?'Controller connected. Press Start to fight on Normal.':isTouch?'':'Got a game controller? Plug it in and press any button.'}</p>`;
  overlay.classList.remove('hide');
}
function showLevels(){
  state='menu';
  overlay.innerHTML=`<p class="big" style="color:#ffd25a">CHOOSE LEVEL</p>
    <p class="how">Fight the computer.</p>
    <button class="pick easy wide" data-d="easy">Easy</button>
    <button class="pick normal wide" data-d="normal">Normal</button>
    <button class="pick hard wide" data-d="hard">Hard</button>
    <button class="pick grey" data-menu="1" style="margin-top:8px">Back</button>`;
  overlay.classList.remove('hide');
}
function showSettings(){
  state='menu';
  const tog=k=>`<button class="tog" data-toggle="${k}" aria-pressed="${SET[k]}">${SET[k]?'On':'Off'}</button>`;
  overlay.innerHTML=`<p class="big" style="color:#c9a6ff">SETTINGS</p>
    <label class="set">Brightness <span><input type="range" min="50" max="150" step="5" value="${SET.bright}" data-set="bright"> <output id="o-bright">${SET.bright}%</output></span></label>
    <label class="set">Sound <span><input type="range" min="0" max="100" step="5" value="${SET.vol}" data-set="vol"> <output id="o-vol">${SET.vol}%</output></span></label>
    <div class="set">Screen shake on hits ${tog('shake')}</div>
    <div class="set">Controller vibration ${tog('rumble')}</div>
    <div class="set">Controller buttons <button class="tog" data-padmap="1">Change</button></div>
    <p class="how">Settings are saved on this device.</p>
    <button class="pick grey" data-menu="1">Back</button>`;
  overlay.classList.remove('hide');
}
function showPadMap(){
  state='menu';
  const row=([k,label])=>`<div class="set"><span style="text-align:left">${label}</span><button class="tog${padWait===k?' wait':''}" data-assign="${k}" style="min-width:130px">${padWait===k?'Press…':comboName(PADMAP[k])}</button></div>`;
  overlay.innerHTML=`<p class="big" style="color:#c9a6ff" id="padmapPage">CONTROLLER</p>
    <p class="how" id="padStat"></p>
    <p class="how" id="padLive" style="margin:0;color:#ffd25a">Press any button to test it.</p>
    <p class="how">Tap a move, then press one button, or hold two or more together for a combination (like RB + B), and let go.</p>
    ${PADACT.map(row).join('')}
    <p class="how">Every button can be used, the d-pad and Menu included. The left stick always moves; d-pad left and right also move unless you give them to a move. Right stick flicks: forward side kick, up head kick, back defensive kick.</p>
    <div class="row"><button class="pick grey" data-padreset="1">Reset to default</button><button class="pick setb" data-settings="1">Done</button></div>`;
  overlay.classList.remove('hide');padStatus();
}
const FIGHTERS=[
  {name:'KONSTANTINOS CHOZOS',height:'1.85 m',main:'#1e8cff',dark:'#0b4fa8',stats:[['Kicks flex',10],['Kicks speed',9],['Punches speed',8],['Movement speed',8]]},
  {name:'MURPHY BAILY',height:'1.77 m',main:'#e8392c',dark:'#9c1d14',stats:[['Kicks flex',8],['Kicks speed',7],['Punches speed',10],['Movement speed',9]]}
];
function fighterSvg(main,dark){
  // small stance-pose portrait, same style as the fighters on the mat
  return `<svg class="fig" width="70" height="90" viewBox="-60 -140 120 150" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="0" cy="2" rx="38" ry="6" fill="rgba(0,0,0,.35)"/>
    <g stroke-linecap="round" stroke-linejoin="round">
      <polyline points="-32,-28 -44,0" fill="none" stroke="${dark}" stroke-width="10"/>
      <ellipse cx="-44" cy="0" rx="8" ry="5" fill="${dark}"/>
      <polygon points="0,-56 -2,-100 34,-28 32,-28" fill="${main}" stroke="${main}" stroke-width="10"/>
      <line x1="0" y1="-56" x2="-2" y2="-100" stroke="#fff" stroke-width="3"/>
      <polyline points="8,-48 34,-28 46,0" fill="none" stroke="#1b2030" stroke-width="10"/>
      <ellipse cx="46" cy="0" rx="9" ry="5" fill="${main}"/>
      <circle cx="6" cy="-118" r="10" fill="#e9b48a"/>
      <path d="M 6,-129 A 11 11 0 0 1 17,-118 L -5,-118 Z" fill="${main}"/>
      <circle cx="12" cy="-119" r="1.6" fill="#111"/>
      <polyline points="-2,-100 -6,-84 6,-106" fill="none" stroke="#e9b48a" stroke-width="7"/>
      <circle cx="6" cy="-106" r="8" fill="${dark}"/>
      <polyline points="-2,-100 26,-88 38,-102" fill="none" stroke="#e9b48a" stroke-width="7"/>
      <circle cx="38" cy="-102" r="7.5" fill="${main}"/>
    </g></svg>`;
}
function fighterCard(f){
  const stats=f.stats.map(([k,v])=>`<div class="st"><span>${k}</span><div class="bar"><span style="width:${v*10}%"></span></div><span class="val">${v}/10</span></div>`).join('');
  return `<div class="fcard">${fighterSvg(f.main,f.dark)}<h3>${f.name}</h3><p class="ht">Height · ${f.height}</p>${stats}<div style="clear:both"></div></div>`;
}
function showFighters(){
  state='menu';
  overlay.innerHTML=`<p class="big" style="color:#c9a6ff">FIGHTERS</p>
    <p class="how" style="margin:0 0 6px">The roster so far. Later, these ratings will change how each fighter actually plays.</p>
    ${FIGHTERS.map(fighterCard).join('')}
    <button class="pick grey" data-menu="1" style="margin-top:6px">Back</button>`;
  overlay.classList.remove('hide');
  overlay.scrollTop=0;
}
function showRules(){
  state='menu';
  const keysList=isTouch
    ?`<li><b>Left stick</b> moves.</li><li><b>Right stick</b>: forward side kick, up head kick, back defensive kick.</li><li><b>REVERSE</b> and <b>BLITZ</b> buttons punch. Double tap REVERSE, or flick the right stick forward twice, to fake.</li>`
    :`<li><b>← →</b> move</li><li><b>W</b> reverse punch · <b>E</b> blitz</li><li><b>D</b> side kick · <b>F</b> head kick · <b>A</b> defensive side kick</li><li><b>1</b> together with W or D: fake</li><li>Hold <b>left Shift</b>: press (lead leg up, skip forward), then D or F to kick</li><li><b>Q</b> step in with a backfist, only against a kick</li><li><b>R</b> deep step, backfist to the body · <b>Shift+R</b> backfist to the head</li><li><b>Right Shift</b> jump back · <b>right Shift then R</b> defensive backfist</li>`;
  overlay.innerHTML=`<p class="big" style="color:#ffd25a">RULES</p>
    <ul class="rules">
      <li>A clean hit stops the fight: <b>1 point</b>, a <b>head kick 2 points</b>.</li>
      <li>Both land together: <b>CLASH</b>, no point, back to the start.</li>
      <li>Stepping off the mat: <b>−1</b>. Pushed off by the opponent: <b>PUSH</b>, no point.</li>
      <li>First to <b>${WIN_AT}</b>, or most points after 60 seconds. A tie goes to golden point.</li>
    </ul>
    <h2 class="sec">Counters</h2>
    <ul class="rules">
      <li>Defensive side kick or jump-back backfist beats the reverse punch.</li>
      <li>Backfist to the body ducks under head strikes and beats the blitz.</li>
      <li>Step in jumps over a side kick (or a kick fake) and counters it.</li>
      <li>A side kick thrown before a head-kicking leg lifts jams it.</li>
    </ul>
    <h2 class="sec">Controls</h2>
    <ul class="rules">${keysList}</ul>
    ${isTouch?'':'<p class="how">Controller: left stick moves. '+PADACT.map(([k,l])=>comboName(PADMAP[k])+' '+l.replace(/ \(.*\)/,'').toLowerCase()).join(', ')+'. Change them in Settings.</p>'}
    <button class="pick grey" data-menu="1">Back</button>`;
  overlay.classList.remove('hide');
  overlay.scrollTop=0;
}
overlay.addEventListener('keydown',e=>{if(e.target.id==='codeIn'&&e.key==='Enter')joinMatch()});
overlay.addEventListener('input',e=>{
  const k=e.target.dataset&&e.target.dataset.set;if(!k)return;
  SET[k]=+e.target.value;const o=document.getElementById('o-'+k);if(o)o.textContent=SET[k]+'%';
  applySet();saveSet();
});
overlay.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.set==='vol'){initAudio();sfx('hit')}});
overlay.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  initAudio();
  const ds=b.dataset;
  if(ds.menu){if(mroom)leaveOnline();else showMenu()}
  else if(ds.cpu)showLevels();
  else if(ds.settings){padWait=null;showSettings()}
  else if(ds.padmap)showPadMap();
  else if(ds.assign){padWait=padWait===ds.assign?null:ds.assign;padRec=[];showPadMap()}
  else if(ds.padreset){padWait=null;padRec=[];for(const k in PADDEF)PADMAP[k]=PADDEF[k].slice();savePad();showPadMap()}
  else if(ds.rules)showRules();
  else if(ds.fighters)showFighters();
  else if(ds.toggle){SET[ds.toggle]=!SET[ds.toggle];b.setAttribute('aria-pressed',SET[ds.toggle]);b.textContent=SET[ds.toggle]?'On':'Off';saveSet()}
  else if(ds.d)newGame(ds.d);
  else if(ds.online)showOnline();
  else if(ds.create)createMatch();
  else if(ds.join)joinMatch();
  else if(ds.leave)leaveOnline();
  else if(ds.rematch){if(findPeer('guest'))startOnlineMatch();else opponentLeft()}
});

function update(){
  if(mode==='guest'){guestUpdate();return}
  if(mode==='host')hostReadGuest();
  updateFx();
  if(state==='menu'||state==='end'||state==='lobby')return;
  if(hitstop>0){hitstop--;return}
  frame++;
  if(state==='ready'){
    stTimer--;
    if(stTimer<=0){state='fight';sfx('bell')}
  }
  if(state==='fight'){
    if(!golden){
      timer--;
      if(timer<=0){
        timer=0;
        if(score[0]===score[1]){golden=true;addPop('GOLDEN POINT!',W/2,200,'#ffd25a',34)}
        else{endGame();return}
      }
    }
    P1.pressing=pressHeld();
    handleButtons(P1);
    moveFighter(P1,readMove());
    if(mode!=='host')moveFighter(CPU,aiThink());
  }
  advance(P1);advance(CPU);
  if(state==='fight'){
    separate();face();
    const a=inHit(P1,CPU),b=inHit(CPU,P1);
    // the defensive side kick is the counter to the reverse punch: it wins if both land
    if(a&&b&&P1.mk==='def'&&CPU.mk==='punch')award(P1,CPU);
    else if(a&&b&&CPU.mk==='def'&&P1.mk==='punch')award(CPU,P1);
    else if(a&&b){ // both land together: referee stops it, no point, back to the starting spots
      P1.hasHit=CPU.hasHit=true;sfx('clash');shake=6;hitstop=5;lastLoser=null;
      msg='CLASH';sub='NO POINT';msgCol='#ffffff';
      state='break';stTimer=70;
    }
    else if(a)award(P1,CPU);
    else if(b)award(CPU,P1);
    else if(isOut(P1))stepOut(P1);
    else if(isOut(CPU))stepOut(CPU);
  }else if(state==='break'){
    // the scorer keeps running through, pushing the opponent back
    moveFighter(P1,0);if(mode!=='host')moveFighter(CPU,0);separate();
    stTimer--;
    if(stTimer<=0){if(pendingEnd)endGame();else resetPositions(45)}
  }
  if(buf.punch>0)buf.punch--;if(buf.kick>0)buf.kick--;if(buf.def>0)buf.def--;if(buf.fake>0)buf.fake--;if(buf.blitz>0)buf.blitz--;if(buf.head>0)buf.head--;if(buf.step>0)buf.step--;if(buf.lbf>0)buf.lbf--;if(buf.hbf>0)buf.hbf--;if(buf.back>0)buf.back--;if(buf.dbf>0)buf.dbf--;if(buf.fakeP>0)buf.fakeP--;if(buf.fakeK>0)buf.fakeK--;
}
function updateFx(){
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.x+=p.vx;p.y+=p.vy;p.vy+=0.2;p.vx*=0.95;if(--p.life<=0)parts.splice(i,1)}
  for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.y-=0.6;if(--p.life<=0)pops.splice(i,1)}
  if(shake>0)shake*=0.85;if(shake<0.3)shake=0;
}

/* ---------- drawing ---------- */
/* ---------- arena: static layers drawn once into an offscreen canvas ---------- */
const bgc=document.createElement('canvas');bgc.width=W*2;bgc.height=H*2;
const bx=bgc.getContext('2d');bx.scale(2,2);
const LAMPS=[110,250,400,550,690];
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const crowdSpots=[];
function buildArena(){
  const b=bx,R=rng(11);crowdSpots.length=0;
  b.clearRect(0,0,W,H);
  // dark roof and back wall with a cool glow behind the stands
  let g=b.createLinearGradient(0,0,0,232);g.addColorStop(0,'#030409');g.addColorStop(1,'#0b1026');
  b.fillStyle=g;b.fillRect(0,0,W,232);
  g=b.createRadialGradient(400,150,10,400,150,430);g.addColorStop(0,'rgba(60,80,190,.32)');g.addColorStop(1,'rgba(0,0,0,0)');
  b.fillStyle=g;b.fillRect(0,0,W,232);
  // lighting truss
  b.strokeStyle='#2a3043';b.lineWidth=2;
  b.beginPath();b.moveTo(0,22);b.lineTo(W,22);b.moveTo(0,36);b.lineTo(W,36);b.stroke();
  b.lineWidth=1.2;b.beginPath();for(let x=0;x<W;x+=14){b.moveTo(x,22);b.lineTo(x+7,36);b.lineTo(x+14,22)}b.stroke();
  for(const lx of LAMPS){
    b.fillStyle='#161a26';b.beginPath();b.roundRect(lx-11,36,22,16,4);b.fill();
    b.fillStyle='#fff6dc';b.beginPath();b.ellipse(lx,52,8,3,0,0,7);b.fill();
    const lg=b.createRadialGradient(lx,52,1,lx,52,30);lg.addColorStop(0,'rgba(255,240,200,.7)');lg.addColorStop(1,'rgba(255,240,200,0)');
    b.fillStyle=lg;b.fillRect(lx-30,24,60,56);
  }
  // stands: 9 rows of spectators, smaller and darker further back, lit toward the middle
  const SHIRT=[[200,60,60],[60,90,200],[230,230,235],[40,40,48],[70,150,90],[210,170,60],[120,70,160],[90,100,120]];
  const SKIN=[[233,180,138],[198,140,100],[150,100,70],[110,72,50],[240,200,165]];
  for(let r=0;r<9;r++){
    const sc=0.5+r*0.065,y=70+r*15.5,step=15*sc+3;
    b.fillStyle=`rgb(${14+r*2},${16+r*2},${32+r*3})`;b.fillRect(0,y+9*sc,W,16*sc+4);
    for(let x=-8+(r%2)*step/2;x<W+8;x+=step){
      if(R()<0.07)continue;
      const lit=(0.28+0.72*Math.max(0,1-Math.abs(x-400)/520))*(0.45+r*0.07);
      const sh=SHIRT[(R()*SHIRT.length)|0],sk=SKIN[(R()*SKIN.length)|0],c=a=>`rgb(${a.map(v=>Math.round(v*lit)).join(',')})`;
      const jx=x+(R()-0.5)*3,hy=y+(R()-0.5)*2;
      b.fillStyle=c(sh);b.beginPath();b.roundRect(jx-6*sc,hy+5*sc,12*sc,12*sc,4*sc);b.fill();
      if(R()<0.09){b.strokeStyle=c(sk);b.lineWidth=2.2*sc;b.beginPath();b.moveTo(jx-5*sc,hy+7*sc);b.lineTo(jx-8*sc,hy-6*sc);b.moveTo(jx+5*sc,hy+7*sc);b.lineTo(jx+8*sc,hy-6*sc);b.stroke()}
      b.fillStyle=c(sk);b.beginPath();b.arc(jx,hy+1*sc,4.4*sc,0,7);b.fill();
      if(R()<0.35){b.fillStyle=c([R()<0.5?30:80,22,18]);b.beginPath();b.arc(jx,hy-0.5*sc,4.6*sc,Math.PI,0);b.fill()}
      if(R()<0.025){b.fillStyle=R()<0.5?'#c82a1e':'#1468d8';b.fillRect(jx+4*sc,hy-14*sc,14*sc,9*sc);b.fillStyle='#ccc';b.fillRect(jx+3.5*sc,hy-14*sc,1.2,22*sc)}
      crowdSpots.push([jx,hy]);
    }
  }
  // railing in front of the stands
  b.fillStyle='#0a0c14';b.fillRect(0,206,W,4);
  b.fillStyle='rgba(150,180,255,.08)';b.fillRect(0,192,W,14);
  // LED advertising boards
  b.fillStyle='#07080f';b.fillRect(0,210,W,24);
  g=b.createLinearGradient(0,212,0,232);g.addColorStop(0,'#c0261c');g.addColorStop(1,'#7c140e');
  b.fillStyle=g;b.fillRect(0,212,W,20);
  b.fillStyle='#ffd25a';b.font='14px Bungee, system-ui';b.textAlign='center';b.textBaseline='middle';
  for(let x=133;x<W;x+=267)b.fillText('POINT FIGHTER CUP',x,222.5);
  b.fillStyle='rgba(0,0,0,.28)';for(let y=212;y<232;y+=2)b.fillRect(0,y,W,1);
  for(let x=0;x<W;x+=2)b.fillRect(x,212,1,20);
  // arena floor: dark and polished, with the LED boards reflected
  g=b.createLinearGradient(0,234,0,H);g.addColorStop(0,'#10131e');g.addColorStop(1,'#04050a');
  b.fillStyle=g;b.fillRect(0,234,W,H-234);
  g=b.createLinearGradient(0,234,0,262);g.addColorStop(0,'rgba(200,40,30,.28)');g.addColorStop(1,'rgba(200,40,30,0)');
  b.fillStyle=g;b.fillRect(0,234,W,28);
  // pool of light on the floor around the mat
  g=b.createRadialGradient(400,360,40,400,360,430);g.addColorStop(0,'rgba(255,240,210,.12)');g.addColorStop(1,'rgba(255,240,210,0)');
  b.fillStyle=g;b.fillRect(0,234,W,H-234);
}
buildArena();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(buildArena);
const flashes=[];
function drawArena(){
  ctx.drawImage(bgc,0,0,W,H);
  // spotlight beams, gently swaying, onto the mat
  ctx.save();ctx.globalCompositeOperation='lighter';
  LAMPS.forEach((lx,i)=>{
    const tx=400+(lx-400)*0.55+Math.sin(frame*0.012+i*1.7)*18;
    const g=ctx.createLinearGradient(0,52,0,360);g.addColorStop(0,'rgba(255,240,210,.16)');g.addColorStop(1,'rgba(255,240,210,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(lx-7,52);ctx.lineTo(lx+7,52);ctx.lineTo(tx+70,360);ctx.lineTo(tx-70,360);ctx.closePath();ctx.fill();
  });
  // camera flashes in the crowd
  if(crowdSpots.length&&Math.random()<0.12)flashes.push({p:crowdSpots[(Math.random()*crowdSpots.length)|0],life:5});
  for(let i=flashes.length-1;i>=0;i--){
    const f=flashes[i],a=f.life/5;
    const g=ctx.createRadialGradient(f.p[0],f.p[1],0,f.p[0],f.p[1],9);g.addColorStop(0,`rgba(255,255,255,${a})`);g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=g;ctx.fillRect(f.p[0]-9,f.p[1]-9,18,18);
    if(--f.life<=0)flashes.splice(i,1);
  }
  ctx.restore();
  // tatami: 7 blocks of 1 m along the fighting line, 3 deep; red blocks under the starting spots
  const hw=y=>330+(y-300)*((3.5*T-330)/(GROUND-300));
  const ex=(y,i)=>400-hw(y)+i*2*hw(y)/7;
  const ROWS=[300,337,373,410];
  // mat edge thickness
  ctx.fillStyle='#0d2a6e';ctx.beginPath();ctx.moveTo(ex(410,0),410);ctx.lineTo(ex(410,7),410);ctx.lineTo(ex(410,7),419);ctx.lineTo(ex(410,0),419);ctx.fill();
  for(let r=0;r<3;r++)for(let c=0;c<7;c++){
    const y0=ROWS[r],y1=ROWS[r+1],start=r===1&&(c===2||c===4);
    ctx.beginPath();ctx.moveTo(ex(y0,c),y0);ctx.lineTo(ex(y0,c+1),y0);ctx.lineTo(ex(y1,c+1),y1);ctx.lineTo(ex(y1,c),y1);ctx.closePath();
    ctx.fillStyle=start?'#d23026':((r+c)%2?'#2160dc':'#1c55c8');ctx.fill();
    ctx.strokeStyle='rgba(6,18,58,.55)';ctx.lineWidth=1.5;ctx.stroke();
  }
  const sg=ctx.createRadialGradient(400,GROUND,20,400,GROUND,330);sg.addColorStop(0,'rgba(255,250,235,.16)');sg.addColorStop(1,'rgba(255,250,235,0)');
  ctx.fillStyle=sg;ctx.beginPath();ctx.moveTo(ex(300,0),300);ctx.lineTo(ex(300,7),300);ctx.lineTo(ex(410,7),410);ctx.lineTo(ex(410,0),410);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=3;
  for(const x of[START_L,START_R]){ctx.beginPath();ctx.moveTo(x-6,GROUND-14);ctx.lineTo(x+6,GROUND+14);ctx.stroke()}
  // soft vignette
  const v=ctx.createRadialGradient(400,250,240,400,250,560);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.55)');
  ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
}

function getPose(f){
  if(state==='break'&&f===lastLoser&&stTimer>45)return POSE.hurt;
  if(f.state==='attack'){
    const m=f.move,t=f.t,s=m.startup,a=m.active,r=m.recovery;
    if(f.mk==='punch'){
      // drop low and fire the punch, then 4 equal running steps:
      // steps 1-2 can score, the punch stays out through step 3, then settle
      const D=m.stepLen,LEGS=[LEG.A,LEG.B,LEG.A,LEG.B,LEG.A];
      if(t<s)return mix(POSE.stance,compose(UP.punch,LEG.A),ease(t/s));
      const k=(t-s)/D;
      if(k<4){
        const i=Math.floor(k),legs=mix(LEGS[i],LEGS[i+1],ease(k-i));
        // the punch stays out through step 3, hands come back to guard during step 4
        const up=k<3?UP.punch:mix(UP.punch,UP.run,ease(k-3));
        return compose(up,legs);
      }
      return mix(compose(UP.run,LEG.A),POSE.stance,ease((t-s-4*D)/(r-2*D)));
    }
    if(f.mk==='blitz'){
      // backfist and direct come almost together, both finished while gliding through the air
      if(t<6)return mix(POSE.stance,POSE.bCrouch,ease(t/6));
      if(t<9)return mix(POSE.bCrouch,POSE.bBack,ease((t-6)/3));
      if(t<11)return POSE.bBack;
      if(t<13)return mix(POSE.bBack,POSE.bPunch,ease((t-11)/2));
      if(t<20)return POSE.bPunch;
      // land, two running steps on into the opponent, hands back to guard, then settle
      const k=(t-20)/8;
      if(k<1)return mix(POSE.bPunch,compose(UP.run,LEG.B),ease(k));
      if(k<2)return compose(UP.run,mix(LEG.B,LEG.A,ease(k-1)));
      return mix(compose(UP.run,LEG.A),POSE.stance,ease((t-36)/(s+a+r-36)));
    }
    if(f.mk==='pkick'||f.mk==='phead'){
      const KK=f.mk==='phead'?POSE.hKick:POSE.kick;
      if(t<s)return mix(POSE.chamber,KK,ease(t/s));
      if(t<s+a)return KK;
      return mix(KK,POSE.chamber,ease((t-s-a)/r));
    }
    if(f.mk==='step'){
      if(t<3)return mix(POSE.stance,POSE.stepAir,ease(t/3));
      if(t<6)return mix(POSE.stepAir,POSE.stepFist,ease((t-3)/3));
      if(t<15)return POSE.stepFist;
      if(t<17)return mix(POSE.stepFist,POSE.stepAir,ease((t-15)/2));
      return mix(POSE.stepAir,POSE.stance,ease((t-17)/r));
    }
    if(f.mk==='back'||f.mk==='dbf'){
      const A=f.mk==='dbf'?(t<4?POSE.backAir:t<6?mix(POSE.backAir,POSE.dbfAir,ease((t-4)/2)):t<15?POSE.dbfAir:mix(POSE.dbfAir,POSE.backAir,ease((t-15)/2))):POSE.backAir;
      if(t<2)return mix(POSE.stance,A,ease(t/2));
      if(t<17)return A;
      return mix(A,POSE.stance,ease((t-17)/(s+a+r-17)));
    }
    if(f.mk==='lbf'||f.mk==='hbf'){
      const P=POSE[f.mk];
      if(t<s)return mix(POSE.stance,P,ease(t/s));
      if(t<s+a)return P;
      return mix(P,POSE.stance,ease((t-s-a)/r));
    }
    if(f.mk==='pdown')return mix(POSE.chamber,POSE.stance,ease(t/r));
    if(m.fake){
      const P=POSE[f.mk];
      if(t<s)return mix(POSE.stance,P,ease(t/s));
      if(t<s+a)return P;
      return mix(P,POSE.stance,ease((t-s-a)/r));
    }
    if(f.mk==='def'){
      if(t<s){const u=t/s;return u<0.5?mix(POSE.stance,POSE.dLean,ease(u/0.5)):mix(POSE.dLean,POSE.dKick,ease((u-0.5)/0.5))}
      if(t<s+a)return POSE.dKick;
      // one big step back with the kicking leg, then switch into stance
      const rt=t-s-a;
      if(rt<12)return mix(POSE.dKick,POSE.dPlant,ease(rt/12));
      if(rt<16)return POSE.dPlant;
      return mix(POSE.dPlant,POSE.stance,ease((rt-16)/(r-16)));
    }
    const CH=f.mk==='head'?POSE.hChamber:POSE.chamber,KK=f.mk==='head'?POSE.hKick:POSE.kick;
    if(t<s){const u=t/s;return u<0.55?mix(POSE.stance,CH,ease(u/0.55)):mix(CH,KK,ease((u-0.55)/0.45))}
    if(t<s+a)return KK;
    const u=(t-s-a)/r;return u<0.5?mix(KK,CH,ease(u/0.5)):mix(CH,POSE.stance,ease((u-0.5)/0.5));
  }
  if(f.state==='press')return POSE.chamber;
  // bouncy side-on stance, shuffle feet when moving
  const p=mix(POSE.stance,POSE.stance,0),bob=Math.sin(frame*0.14+(f.team==='red'?1.5:0))*2,w=Math.sin(f.walk)*5;
  for(const k of['hip','sh','hd','le','lf','re','rf'])p[k][1]+=bob;
  p.fk[1]+=bob*0.5;p.bk[1]+=bob*0.5;
  p.ff[0]+=w;p.fk[0]+=w*0.6;p.bf[0]+=w*0.6;p.bk[0]+=w*0.4;
  return p;
}
function limb(a,b,c,col,w){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.stroke()}
function foot(pt,ang,len,col){
  ctx.save();ctx.translate(pt[0],pt[1]);ctx.rotate(ang);
  ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(-5,-5,len+5,10,5);ctx.fill();ctx.restore();
}
function drawFighter(f){
  const p=getPose(f);
  const fl=f.flash>0&&(f.flash>>1)%2===0;
  const main=f.team==='blue'?'#1e8cff':'#e8392c',dark=f.team==='blue'?'#0b4fa8':'#9c1d14';
  const C=c=>fl?'#ffffff':c;
  const skin=C('#e9b48a'),pants=C('#1b2030'),pantsD=C('#10131d');
  // shoulder / hip lines sit across the spine (chest faces camera)
  const sx=p.sh[0]-p.hip[0],sy=p.sh[1]-p.hip[1],L=Math.hypot(sx,sy)||1,px=-sy/L,py=sx/L;
  const shL=[p.sh[0]+px*p.sw,p.sh[1]+py*p.sw],shR=[p.sh[0]-px*p.sw,p.sh[1]-py*p.sw];
  const hpL=[p.hip[0]+px*p.hw,p.hip[1]+py*p.hw],hpR=[p.hip[0]-px*p.hw,p.hip[1]-py*p.hw];
  // small hop (about 5% of his height) while the blitz glides, so he's clearly off the mat
  const pressing=f.state==='press'||(f.state==='attack'&&f.move&&f.move.press);
  const hop=f.state==='attack'&&f.mk==='blitz'&&f.t>=6&&f.t<20?Math.sin((f.t-6)/14*Math.PI)*7:f.state==='attack'&&f.mk==='step'&&f.t>=2&&f.t<17?Math.sin((f.t-2)/15*Math.PI)*16:f.state==='attack'&&(f.mk==='back'||f.mk==='dbf')&&f.t>=1&&f.t<16?Math.sin((f.t-1)/15*Math.PI)*14:pressing?Math.abs(Math.sin((f.pt||0)*0.3))*4:0;
  ctx.save();ctx.translate(f.x,GROUND);
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(0,2,44*S*(1-hop/40),9*(1-hop/40),0,0,7);ctx.fill();
  ctx.translate(0,-hop*S);
  ctx.scale(f.facing*S,S);ctx.lineCap='round';ctx.lineJoin='round';
  // rear leg
  limb(hpR,p.bk,p.bf,pantsD,12);foot(p.bf,p.bfa,p.bfl,C(dark));
  // torso
  ctx.fillStyle=C(main);ctx.strokeStyle=C(main);ctx.lineWidth=12;
  ctx.beginPath();ctx.moveTo(hpL[0],hpL[1]);ctx.lineTo(shL[0],shL[1]);ctx.lineTo(shR[0],shR[1]);ctx.lineTo(hpR[0],hpR[1]);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=C('#ffffff');ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(hpL[0]+px*5,hpL[1]+py*5);ctx.lineTo(hpR[0]-px*5,hpR[1]-py*5);ctx.stroke();
  // lead leg (the kicking leg)
  limb(hpL,p.fk,p.ff,pants,12);foot(p.ff,p.ffa,p.ffl,C(main));
  // head + helmet, looking at the opponent
  ctx.fillStyle=skin;ctx.beginPath();ctx.arc(p.hd[0],p.hd[1],11,0,7);ctx.fill();
  ctx.fillStyle=C(main);ctx.beginPath();ctx.arc(p.hd[0],p.hd[1],12.5,Math.PI*0.95,Math.PI*2.05);ctx.lineTo(p.hd[0]-11,p.hd[1]+5);ctx.closePath();ctx.fill();
  ctx.fillStyle=C('#111');ctx.beginPath();ctx.arc(p.hd[0]+6,p.hd[1]-1,1.8,0,7);ctx.fill();
  // rear arm (the reverse punch hand) then lead arm, both in front of the chest
  limb(shR,p.re,p.rf,skin,8);ctx.fillStyle=C(dark);ctx.beginPath();ctx.arc(p.rf[0],p.rf[1],9,0,7);ctx.fill();
  limb(shL,p.le,p.lf,skin,8);ctx.fillStyle=C(main);ctx.beginPath();ctx.arc(p.lf[0],p.lf[1],8.5,0,7);ctx.fill();
  ctx.restore();
}

function drawHUD(){
  ctx.textBaseline='middle';
  const box=(x,col,label,val)=>{
    ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(x,12,150,58,10);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.85)';ctx.font='700 14px Barlow, system-ui';ctx.textAlign='left';ctx.fillText(label,x+12,30);
    ctx.fillStyle='#fff';ctx.font='34px Bungee, system-ui';ctx.textAlign='right';ctx.fillText(val,x+140,44);
  };
  box(14,'#1468d8',mode==='guest'?'BLUE · FRIEND':'BLUE · YOU',score[0]);box(W-164,'#c82a1e',mode==='host'?'RED · FRIEND':mode==='guest'?'RED · YOU':'RED · CPU',score[1]);
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.roundRect(W/2-62,12,124,58,10);ctx.fill();
  ctx.textAlign='center';
  if(golden){ctx.fillStyle='#ffd25a';ctx.font='16px Bungee, system-ui';ctx.fillText('GOLDEN',W/2,32);ctx.fillText('POINT',W/2,52)}
  else{const sec=Math.ceil(timer/60);ctx.fillStyle=sec<=10?'#ff6b5a':'#fff';ctx.font='34px Bungee, system-ui';ctx.fillText(sec,W/2,44)}
  ctx.fillStyle='rgba(255,255,255,.6)';ctx.font='700 13px Barlow, system-ui';ctx.fillText('First to '+WIN_AT,W/2,84);
}
function bigText(t,y,size,col){
  ctx.font=size+'px Bungee, system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineWidth=8;ctx.strokeStyle='rgba(0,0,0,.75)';ctx.strokeText(t,W/2,y);ctx.fillStyle=col;ctx.fillText(t,W/2,y);
}
function render(){
  ctx.save();
  if(shake&&SET.shake)ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
  drawArena();
  if(P1){
    // the attacker is drawn on top so the punch/kick reads clearly
    const order=CPU.state==='attack'?[P1,CPU]:[CPU,P1];
    order.forEach(drawFighter);
    for(const p of parts){ctx.globalAlpha=Math.min(1,p.life/20);ctx.fillStyle=p.col;ctx.fillRect(p.x-2,p.y-2,4,4)}
    ctx.globalAlpha=1;
    for(const p of pops){
      ctx.globalAlpha=Math.min(1,p.life/20);ctx.font=p.size+'px Bungee, system-ui';ctx.textAlign='center';
      ctx.lineWidth=6;ctx.strokeStyle='rgba(0,0,0,.7)';ctx.strokeText(p.text,p.x,p.y);ctx.fillStyle=p.col;ctx.fillText(p.text,p.x,p.y);
    }
    ctx.globalAlpha=1;
  }
  ctx.restore();
  if(!P1)return;
  drawHUD();
  if(state==='ready')bigText(stTimer>28?'READY...':'FIGHT!',150,stTimer>28?40:56,stTimer>28?'#fff':'#ffd25a');
  if(state==='break'){bigText('STOP!',120,30,'#fff');bigText(msg,158,40,msgCol);bigText(sub,194,20,'#ffd25a')}
}

if(!CanvasRenderingContext2D.prototype.roundRect){CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h){this.rect(x,y,w,h)}}

let last=performance.now(),acc=0;
function loop(now){
  acc+=Math.min(100,now-last);last=now;
  pollPad();
  while(acc>=1000/60){update();acc-=1000/60}
  if(mroom&&state==='lobby'&&(++lobbyTick%30===0))lobbyCheck();
  if(mroom&&(mode==='host'||mode==='guest')&&state!=='lobby'&&state!=='menu'){
    if(mode==='host'&&P1&&(++netTick%2===0))mroom.presence({snap:makeSnap()}).catch(()=>{});
    if(findPeer(mode==='host'?'guest':'host'))peerGoneAt=0;
    else if(!peerGoneAt)peerGoneAt=now;
    else if(now-peerGoneAt>4000)opponentLeft();
  }
  render();requestAnimationFrame(loop);
}
showMenu();requestAnimationFrame(loop);
// installable app: works offline and picks up new versions automatically
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
}
