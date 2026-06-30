const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const GROUND_Y = H - 60;

let state = 'idle', score = 0, hiScore = 0, frameCount = 0, speed = 5;
let obstacles = [], particles = [], groundOffset = 0, nextObstacleIn = 80;

const kiro = {
  x:100, y:GROUND_Y, w:50, h:50,
  vy:0, gravity:0.7, jumpForce:-15,
  onGround:true, legPhase:0, eyeBlink:120, blinkTimer:0,
  dead:false, deathAnim:0,

  jump() { if(this.onGround && !this.dead){ this.vy=this.jumpForce; this.onGround=false; } },

  update() {
    if(this.dead){ this.deathAnim++; return; }
    this.vy += this.gravity; this.y += this.vy;
    if(this.y >= GROUND_Y){ this.y=GROUND_Y; this.vy=0; this.onGround=true; }
    if(this.onGround) this.legPhase += 0.25;
    this.eyeBlink--;
    if(this.eyeBlink <= 0){ this.blinkTimer=5; this.eyeBlink=120+Math.random()*80; }
    if(this.blinkTimer > 0) this.blinkTimer--;
  },

  draw() {
    ctx.save();
    const x=this.x, y=this.y;
    if(this.dead){
      ctx.translate(x+this.w/2, y+this.h/2);
      ctx.rotate(this.deathAnim*0.15);
      ctx.translate(-(x+this.w/2), -(y+this.h/2));
    }
    const cx=x+this.w/2, cy=y+this.h/2-4, r=22;
    ctx.fillStyle='#a0c4ff';
    ctx.beginPath(); ctx.moveTo(cx-14,cy-r+2); ctx.lineTo(cx-22,cy-r-14); ctx.lineTo(cx-4,cy-r-4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx+14,cy-r+2); ctx.lineTo(cx+22,cy-r-14); ctx.lineTo(cx+4,cy-r-4); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#c9b8ff';
    ctx.beginPath(); ctx.moveTo(cx-12,cy-r+1); ctx.lineTo(cx-19,cy-r-10); ctx.lineTo(cx-6,cy-r-3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx+12,cy-r+1); ctx.lineTo(cx+19,cy-r-10); ctx.lineTo(cx+6,cy-r-3); ctx.closePath(); ctx.fill();
    const bg=ctx.createRadialGradient(cx-4,cy-6,2,cx,cy,r);
    bg.addColorStop(0,'#d0e8ff'); bg.addColorStop(1,'#6c8fff');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(100,150,255,0.6)'; ctx.lineWidth=1.5; ctx.stroke();
    const eyeY=cy-5;
    if(this.dead){
      [cx-8,cx+8].forEach(ex=>{
        ctx.strokeStyle='#333'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(ex-5,eyeY-4); ctx.lineTo(ex+5,eyeY+4);
        ctx.moveTo(ex+5,eyeY-4); ctx.lineTo(ex-5,eyeY+4); ctx.stroke();
      });
    } else if(this.blinkTimer > 0){
      ctx.strokeStyle='#1a1a3e'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(cx-13,eyeY); ctx.lineTo(cx-3,eyeY);
      ctx.moveTo(cx+3,eyeY); ctx.lineTo(cx+13,eyeY); ctx.stroke();
    } else {
      ctx.fillStyle='#1a1a3e';
      ctx.beginPath(); ctx.arc(cx-8,eyeY,5,0,Math.PI*2); ctx.arc(cx+8,eyeY,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(cx-6,eyeY-2,2,0,Math.PI*2); ctx.arc(cx+10,eyeY-2,2,0,Math.PI*2); ctx.fill();
    }
    if(!this.dead){
      ctx.strokeStyle='#1a1a3e'; ctx.lineWidth=1.8;
      ctx.beginPath(); ctx.arc(cx,cy+8,6,0.2,Math.PI-0.2); ctx.stroke();
      const ls=Math.sin(this.legPhase)*8, footY=y+this.h+2;
      ctx.strokeStyle='#6c8fff'; ctx.lineWidth=5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(cx-8,y+this.h-5); ctx.lineTo(cx-8-ls,footY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+8,y+this.h-5); ctx.lineTo(cx+8+ls,footY); ctx.stroke();
      const tw=Math.sin(this.legPhase*0.7)*12;
      ctx.strokeStyle='#a0c4ff'; ctx.lineWidth=4; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(cx-r+2,cy+10);
      ctx.quadraticCurveTo(cx-r-12,cy+20+tw,cx-r-6,cy+30+tw); ctx.stroke();
    }
    ctx.restore();
  }
};


class Obstacle {
  constructor(type){
    this.type=type; this.x=W+20; this.passed=false;
    if(type==='bug'){this.w=36;this.h=36;this.legPhase=0;}
    else if(type==='error'){this.w=44;this.h=44;}
    else{this.w=28;this.h=42;}
    this.y=GROUND_Y+kiro.h-this.h;
  }
  update(){ this.x-=speed; if(this.type==='bug') this.legPhase+=0.2; }
  getBounds(){ const m=6; return{x:this.x+m,y:this.y+m,w:this.w-m*2,h:this.h-m*2}; }
  draw(){
    ctx.save();
    const cx=this.x+this.w/2, cy=this.y+this.h/2;
    if(this.type==='bug'){
      ctx.fillStyle='#ff6b6b';
      ctx.beginPath(); ctx.ellipse(cx,cy,14,10,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#c0392b'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle='#e74c3c'; ctx.beginPath(); ctx.arc(cx+14,cy,8,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx+17,cy-2,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(cx+18,cy-2,1.5,0,Math.PI*2); ctx.fill();
      const ls=Math.sin(this.legPhase)*5;
      ctx.strokeStyle='#c0392b'; ctx.lineWidth=2;
      for(let i=-1;i<=1;i++){
        ctx.beginPath(); ctx.moveTo(cx+i*6,cy-5); ctx.lineTo(cx+i*6-ls,cy-14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+i*6,cy+5); ctx.lineTo(cx+i*6+ls,cy+14); ctx.stroke();
      }
      ctx.fillStyle='#fff'; ctx.font='bold 9px monospace'; ctx.textAlign='center'; ctx.fillText('bug',cx-1,cy+4);
    } else if(this.type==='error'){
      const g=ctx.createLinearGradient(this.x,this.y,this.x,this.y+this.h);
      g.addColorStop(0,'#ff9f43'); g.addColorStop(1,'#ee5a24');
      ctx.fillStyle=g;
      const rx=8;
      ctx.beginPath();
      ctx.moveTo(this.x+rx,this.y); ctx.lineTo(this.x+this.w-rx,this.y);
      ctx.quadraticCurveTo(this.x+this.w,this.y,this.x+this.w,this.y+rx);
      ctx.lineTo(this.x+this.w,this.y+this.h-rx);
      ctx.quadraticCurveTo(this.x+this.w,this.y+this.h,this.x+this.w-rx,this.y+this.h);
      ctx.lineTo(this.x+rx,this.y+this.h);
      ctx.quadraticCurveTo(this.x,this.y+this.h,this.x,this.y+this.h-rx);
      ctx.lineTo(this.x,this.y+rx);
      ctx.quadraticCurveTo(this.x,this.y,this.x+rx,this.y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font='bold 22px monospace'; ctx.textAlign='center';
      ctx.fillText('!',cx,cy-2); ctx.font='bold 8px monospace'; ctx.fillText('ERROR',cx,cy+14);
    } else {
      for(let i=0;i<2;i++){
        const sx=this.x+i*16;
        const g=ctx.createLinearGradient(sx,this.y,sx,this.y+this.h);
        g.addColorStop(0,'#a29bfe'); g.addColorStop(1,'#6c5ce7');
        ctx.fillStyle=g;
        ctx.beginPath(); ctx.moveTo(sx+8,this.y); ctx.lineTo(sx+16,this.y+this.h); ctx.lineTo(sx,this.y+this.h); ctx.closePath(); ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1; ctx.stroke();
      }
    }
    ctx.restore();
  }
}

class Particle {
  constructor(x,y,color){ this.x=x;this.y=y;this.vx=(Math.random()-0.5)*6;this.vy=-Math.random()*6-2;this.life=1;this.decay=0.04+Math.random()*0.03;this.r=3+Math.random()*4;this.color=color; }
  update(){ this.x+=this.vx;this.y+=this.vy;this.vy+=0.25;this.life-=this.decay; }
  draw(){ ctx.save();ctx.globalAlpha=Math.max(0,this.life);ctx.fillStyle=this.color;ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.fill();ctx.restore(); }
}

const stars=Array.from({length:60},()=>({x:Math.random()*W,y:Math.random()*(GROUND_Y-20),r:Math.random()*1.5+0.3,twinkle:Math.random()*Math.PI*2}));

function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

function spawnObstacle(){
  const roll=Math.random(); let type;
  if(score<300) type=roll<0.6?'bug':roll<0.85?'error':'spike';
  else if(score<800) type=roll<0.4?'bug':roll<0.75?'error':'spike';
  else type=['bug','error','spike'][randInt(0,2)];
  obstacles.push(new Obstacle(type));
  nextObstacleIn=randInt(55,110)-Math.min(30,Math.floor(score/100));
}

function checkCollision(a,b){ return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y; }

function drawBackground(){
  const sg=ctx.createLinearGradient(0,0,0,GROUND_Y);
  sg.addColorStop(0,'#050510'); sg.addColorStop(1,'#0d1a3a');
  ctx.fillStyle=sg; ctx.fillRect(0,0,W,GROUND_Y);
  stars.forEach(s=>{
    s.twinkle+=0.03; ctx.globalAlpha=0.4+Math.sin(s.twinkle)*0.3;
    ctx.fillStyle='#c9d8ff'; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  });
}

function drawGround(){
  const gg=ctx.createLinearGradient(0,GROUND_Y+kiro.h,0,H);
  gg.addColorStop(0,'#1a2a5e'); gg.addColorStop(1,'#0d1a3a');
  ctx.fillStyle=gg; ctx.fillRect(0,GROUND_Y+kiro.h,W,H-(GROUND_Y+kiro.h));
  ctx.fillStyle='#3a5abf'; ctx.fillRect(0,GROUND_Y+kiro.h,W,3);
  groundOffset=(groundOffset+speed)%60;
  ctx.strokeStyle='rgba(100,150,255,0.15)'; ctx.lineWidth=1;
  for(let x=-groundOffset;x<W+60;x+=60){ ctx.beginPath();ctx.moveTo(x,GROUND_Y+kiro.h+3);ctx.lineTo(x,H);ctx.stroke(); }
}

function drawHUD(){
  if(state!=='playing') return;
  document.getElementById('score').textContent=score;
  document.getElementById('hi-score').textContent=hiScore;
}

function gameLoop(){
  ctx.clearRect(0,0,W,H); drawBackground(); drawGround();
  if(state==='playing'){
    frameCount++; score=Math.floor(frameCount/5);
    if(score>hiScore) hiScore=score;
    speed=5+Math.floor(score/200)*0.8;
    nextObstacleIn--; if(nextObstacleIn<=0) spawnObstacle();
    obstacles.forEach(o=>o.update());
    obstacles=obstacles.filter(o=>o.x+o.w>-20);
    const kb={x:kiro.x+8,y:kiro.y+6,w:kiro.w-16,h:kiro.h-8};
    for(const o of obstacles){ if(checkCollision(kb,o.getBounds())){ triggerGameOver(); break; } }
    particles.forEach(p=>p.update()); particles=particles.filter(p=>p.life>0);
    if(frameCount%10===0) particles.push(new Particle(kiro.x+kiro.w/2+(Math.random()-0.5)*20,kiro.y+kiro.h/2,`hsl(${200+Math.random()*60},90%,70%)`));
    kiro.update();
  }
  particles.forEach(p=>p.draw()); obstacles.forEach(o=>o.draw()); kiro.draw(); drawHUD();
  requestAnimationFrame(gameLoop);
}

function startGame(){
  score=0;frameCount=0;speed=5;obstacles=[];particles=[];nextObstacleIn=80;groundOffset=0;
  kiro.y=GROUND_Y;kiro.vy=0;kiro.onGround=true;kiro.dead=false;kiro.deathAnim=0;
  kiro.legPhase=0;kiro.eyeBlink=120;kiro.blinkTimer=0;
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
  state='playing';
}

function triggerGameOver(){
  kiro.dead=true; state='gameover';
  for(let i=0;i<30;i++) particles.push(new Particle(kiro.x+kiro.w/2,kiro.y+kiro.h/2,`hsl(${Math.random()*60},100%,60%)`));
  setTimeout(()=>{
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('final-score-text').textContent=`スコア: ${score}`;
    const nr=document.getElementById('new-record');
    if(score>=hiScore&&score>0) nr.classList.remove('hidden'); else nr.classList.add('hidden');
  },800);
}

document.addEventListener('keydown',e=>{
  if(e.code==='Space'||e.code==='ArrowUp'){ e.preventDefault(); if(state==='playing') kiro.jump(); }
});
canvas.addEventListener('touchstart',e=>{ e.preventDefault(); if(state==='playing') kiro.jump(); },{passive:false});
document.getElementById('start-btn').addEventListener('click',startGame);
document.getElementById('retry-btn').addEventListener('click',startGame);

state='idle';
gameLoop();
