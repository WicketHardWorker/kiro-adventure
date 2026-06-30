// ===================================================
//  House of Kiro - スパゲッティコードの呪い
//  8bit pixel art style
// ===================================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const GROUND_Y = H - 50;
const PX = 3; // ピクセルサイズ（8bit感）

let state = 'idle', score = 0, hiScore = 0, frameCount = 0, speed = 4;
let obstacles = [], particles = [], groundOffset = 0, nextObstacleIn = 90;
let flashTimer = 0; // 稲光

// ===== Kiroゴースト スプライトデータ =====
// 0=透明, 1=白(体), 2=黒(目)
const kiroFrameA = [
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,2,2,1,1,2,2,1,1,1,0],
  [1,1,1,1,1,1,2,2,1,1,2,2,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,1,1,0,1,1,1,1,1,0,1,1,0,0,0],
  [0,1,1,0,0,0,1,1,1,0,0,0,1,1,0,0],
  [0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0],
];

const kiroFrameB = [
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,2,2,1,1,2,2,1,1,1,0],
  [1,1,1,1,1,1,2,2,1,1,2,2,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,1,0,1,1,1,0,1,1,0,0,0,0],
  [0,0,1,1,0,0,0,1,0,0,0,1,1,0,0,0],
  [0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
];

// 死亡フレーム（×目）
const kiroDead = [
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,2,1,2,1,2,1,2,1,1,1,0],
  [1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,0],
  [1,1,1,1,1,2,1,2,1,2,1,2,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
];

function drawSprite(sprite, x, y, pixelSize, glowColor) {
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
  }
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const val = sprite[row][col];
      if (val === 0) continue;
      if (val === 1) ctx.fillStyle = '#ffffff';
      else if (val === 2) ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(x + col * pixelSize, y + row * pixelSize, pixelSize, pixelSize);
    }
  }
  ctx.shadowBlur = 0;
}



// ===== Kiroちゃん（おばけだから浮いてる！）=====
const FLOAT_HEIGHT = 30; // 地面からの浮遊高さ
const kiro = {
  x: 80, y: GROUND_Y - FLOAT_HEIGHT, w: 16*PX, h: 16*PX,
  vy: 0, gravity: 0.5, jumpForce: -12,
  onGround: true, frame: 0, animTimer: 0,
  dead: false, deathAnim: 0, floatOffset: 0,
  baseY: GROUND_Y - FLOAT_HEIGHT, // 浮遊時のベース位置

  jump() {
    if (this.onGround && !this.dead) {
      this.vy = this.jumpForce;
      this.onGround = false;
    }
  },

  update() {
    if (this.dead) { this.deathAnim++; return; }
    this.vy += this.gravity;
    this.y += this.vy;
    if (this.y >= this.baseY) { this.y = this.baseY; this.vy = 0; this.onGround = true; }
    // ゆったりふわふわ浮遊（上下に揺れる）
    this.floatOffset = Math.sin(frameCount * 0.04) * 6;
    // アニメーション切替（裾のひらひら）
    this.animTimer++;
    if (this.animTimer > 10) { this.animTimer = 0; this.frame = 1 - this.frame; }
  },

  draw() {
    ctx.save();
    const drawY = this.y + this.floatOffset - this.h;
    let sprite;
    if (this.dead) sprite = kiroDead;
    else sprite = this.frame === 0 ? kiroFrameA : kiroFrameB;

    if (this.dead) {
      ctx.globalAlpha = Math.max(0, 1 - this.deathAnim * 0.02);
      ctx.translate(this.x + this.w/2, drawY + this.h/2);
      ctx.rotate(this.deathAnim * 0.1);
      ctx.translate(-(this.x + this.w/2), -(drawY + this.h/2));
    }

    // おばけの影（地面に薄い楕円）
    if (!this.dead) {
      ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
      ctx.beginPath();
      ctx.ellipse(this.x + this.w/2, GROUND_Y - 2, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawSprite(sprite, this.x, drawY, PX, 'rgba(255,255,255,0.6)');
    ctx.restore();
  }
};

// ===== スパゲッティコード触手 障害物 =====
const SPAGHETTI_SPRITE = [
  [0,0,3,0,0,3,0,0],
  [0,3,3,0,3,3,0,0],
  [0,3,0,0,3,0,3,0],
  [3,3,0,3,3,0,3,0],
  [3,0,0,3,0,0,3,0],
  [3,0,3,3,0,3,3,0],
  [3,3,3,0,0,3,0,0],
  [3,3,0,0,3,3,0,0],
  [0,3,0,3,3,0,0,0],
  [0,3,3,3,0,0,3,0],
  [0,0,3,3,0,3,3,0],
  [0,3,3,0,3,3,0,0],
  [3,3,0,0,3,0,0,0],
  [3,0,0,3,3,0,0,0],
  [3,3,3,3,3,3,3,3],
  [3,3,3,3,3,3,3,3],
];

// TODO怨霊
const TODO_SPRITE = [
  [0,0,4,4,4,4,4,4,4,4,0,0],
  [0,4,4,4,4,4,4,4,4,4,4,0],
  [4,4,0,0,4,4,4,0,0,4,4,4],
  [4,4,0,0,4,4,4,0,0,4,4,4],
  [4,4,4,4,4,4,4,4,4,4,4,4],
  [4,4,4,4,4,4,4,4,4,4,4,4],
  [4,4,4,0,4,4,4,4,0,4,4,4],
  [4,4,4,4,0,0,0,0,4,4,4,4],
  [0,4,4,4,4,4,4,4,4,4,4,0],
  [0,0,4,4,4,4,4,4,4,4,0,0],
];

// デッドコード蜘蛛
const SPIDER_SPRITE = [
  [0,5,0,0,0,0,0,5,0,0],
  [0,0,5,0,0,0,5,0,0,0],
  [5,0,0,5,5,5,0,0,5,0],
  [0,5,5,5,5,5,5,5,0,0],
  [0,0,5,5,5,5,5,0,0,0],
  [0,5,5,2,5,2,5,5,0,0],
  [5,0,5,5,5,5,5,0,5,0],
  [0,0,0,5,5,5,0,0,0,0],
  [0,0,5,0,5,0,5,0,0,0],
  [0,5,0,0,0,0,0,5,0,0],
];

function drawObstacleSprite(sprite, x, y, pixelSize, colorMap) {
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const val = sprite[row][col];
      if (val === 0) continue;
      ctx.fillStyle = colorMap[val] || '#fff';
      ctx.fillRect(x + col * pixelSize, y + row * pixelSize, pixelSize, pixelSize);
    }
  }
}

class Obstacle {
  constructor(type) {
    this.type = type; this.x = W + 20;
    if (type === 'spaghetti') {
      this.w = 8 * PX; this.h = 16 * PX;
      this.y = GROUND_Y - this.h;
      this.sprite = SPAGHETTI_SPRITE;
      this.colors = { 3: '#a855f7' }; // 紫触手
    } else if (type === 'todo') {
      this.w = 12 * PX; this.h = 10 * PX;
      this.y = GROUND_Y - this.h - 10;
      this.sprite = TODO_SPRITE;
      this.colors = { 4: '#4ade80' }; // 緑のTODO
      this.floatPhase = Math.random() * Math.PI * 2;
    } else { // spider
      this.w = 10 * PX; this.h = 10 * PX;
      this.y = GROUND_Y - this.h;
      this.sprite = SPIDER_SPRITE;
      this.colors = { 5: '#ef4444', 2: '#0a0a0a' }; // 赤蜘蛛
    }
  }
  update() {
    this.x -= speed;
    if (this.type === 'todo') {
      this.floatPhase += 0.05;
    }
  }
  draw() {
    let drawY = this.y;
    if (this.type === 'todo') drawY += Math.sin(this.floatPhase) * 6;

    // グロー
    ctx.shadowColor = this.type === 'spaghetti' ? '#a855f7' :
                      this.type === 'todo' ? '#4ade80' : '#ef4444';
    ctx.shadowBlur = 8;
    drawObstacleSprite(this.sprite, this.x, drawY, PX, this.colors);
    ctx.shadowBlur = 0;

    // ラベルテキスト（8bit風）
    ctx.fillStyle = this.type === 'spaghetti' ? '#c084fc' :
                    this.type === 'todo' ? '#86efac' : '#fca5a5';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    if (this.type === 'spaghetti') ctx.fillText('if(if(if', this.x + this.w/2, drawY - 4);
    else if (this.type === 'todo') ctx.fillText('//TODO', this.x + this.w/2, drawY - 4);
    else ctx.fillText('dead()', this.x + this.w/2, drawY - 4);
  }
  getBounds() {
    const m = 4;
    let drawY = this.y;
    if (this.type === 'todo') drawY += Math.sin(this.floatPhase) * 6;
    return { x: this.x + m, y: drawY + m, w: this.w - m*2, h: this.h - m*2 };
  }
}



// ===== パーティクル（ドット型）=====
class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = -Math.random() * 4 - 1;
    this.life = 1;
    this.decay = 0.03 + Math.random() * 0.02;
    this.size = PX;
    this.color = color;
  }
  update() { this.x += this.vx; this.y += this.vy; this.vy += 0.15; this.life -= this.decay; }
  draw() {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

// ===== 背景：流れるコード文字列 =====
const codeLines = [
  'function(){', 'var x = x;', 'goto 10;', '} catch(e){}',
  'if(true){if(true){', '// FIXME', 'while(1){', 'eval(code);',
  'callback(callback(', '} } } } }', 'import *;', 'rm -rf /',
  'undefined is not', 'segfault', '// hack', 'TODO: later',
];

const bgTexts = Array.from({length: 12}, () => ({
  x: Math.random() * W,
  y: Math.random() * (GROUND_Y - 30),
  text: codeLines[Math.floor(Math.random() * codeLines.length)],
  speed: 0.3 + Math.random() * 0.5,
  alpha: 0.08 + Math.random() * 0.12,
}));

// ===== ネオンサイン "KIRO" =====
function drawNeonSign() {
  ctx.save();
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'right';
  ctx.shadowColor = '#8b5cf6';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#a78bfa';
  ctx.fillText('KIRO', W - 20, 25);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ===== 背景描画 =====
function drawBackground() {
  // 暗い紫グラデ
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0f0520');
  grad.addColorStop(0.6, '#1a0a2e');
  grad.addColorStop(1, '#12061f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 木壁テクスチャ（横線）
  ctx.strokeStyle = 'rgba(80, 40, 100, 0.15)';
  ctx.lineWidth = 1;
  for (let y = 0; y < GROUND_Y; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // 流れるコード
  bgTexts.forEach(t => {
    t.x -= t.speed;
    if (t.x < -150) { t.x = W + 50; t.text = codeLines[Math.floor(Math.random() * codeLines.length)]; }
    ctx.globalAlpha = t.alpha;
    ctx.fillStyle = '#a855f7';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(t.text, t.x, t.y);
    ctx.globalAlpha = 1;
  });

  // ネオンサイン
  drawNeonSign();

  // 稲光エフェクト
  if (flashTimer > 0) {
    ctx.globalAlpha = flashTimer * 0.15;
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    flashTimer--;
  }
}

// ===== 地面（絡まったケーブル/コード）=====
function drawGround() {
  // 地面ベース
  ctx.fillStyle = '#1a0a2e';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  // ケーブル地面ライン
  ctx.fillStyle = '#3b0764';
  ctx.fillRect(0, GROUND_Y, W, 3);

  // スパゲッティコード模様（流れる）
  groundOffset = (groundOffset + speed) % 40;
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
  ctx.lineWidth = 2;
  for (let x = -groundOffset; x < W + 40; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 8);
    ctx.quadraticCurveTo(x + 10, GROUND_Y + 18, x + 20, GROUND_Y + 10);
    ctx.quadraticCurveTo(x + 30, GROUND_Y + 5, x + 40, GROUND_Y + 15);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
  for (let x = -groundOffset - 20; x < W + 40; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 20);
    ctx.quadraticCurveTo(x + 15, GROUND_Y + 30, x + 25, GROUND_Y + 22);
    ctx.quadraticCurveTo(x + 35, GROUND_Y + 15, x + 40, GROUND_Y + 28);
    ctx.stroke();
  }
}

// ===== HUD =====
function drawHUD() {
  if (state !== 'playing') return;
  document.getElementById('score').textContent = score;
  document.getElementById('hi-score').textContent = hiScore;
}

// ===== ゲームロジック =====
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function spawnObstacle() {
  const roll = Math.random();
  let type;
  if (score < 200) type = roll < 0.5 ? 'spaghetti' : roll < 0.8 ? 'todo' : 'spider';
  else if (score < 600) type = roll < 0.35 ? 'spaghetti' : roll < 0.7 ? 'todo' : 'spider';
  else type = ['spaghetti', 'todo', 'spider'][randInt(0, 2)];
  obstacles.push(new Obstacle(type));
  nextObstacleIn = randInt(60, 120) - Math.min(35, Math.floor(score / 80));
}

function checkCollision(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ===== メインループ =====
function gameLoop() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawGround();

  if (state === 'playing') {
    frameCount++;
    score = Math.floor(frameCount / 5);
    if (score > hiScore) hiScore = score;
    speed = 4 + Math.floor(score / 150) * 0.6;

    // 稲光（ランダム）
    if (Math.random() < 0.003) flashTimer = 4;

    // 障害物
    nextObstacleIn--;
    if (nextObstacleIn <= 0) spawnObstacle();
    obstacles.forEach(o => o.update());
    obstacles = obstacles.filter(o => o.x + o.w > -30);

    // 当たり判定
    const kb = { x: kiro.x + 6, y: kiro.y + kiro.floatOffset - kiro.h + 6, w: kiro.w - 12, h: kiro.h - 10 };
    for (const o of obstacles) {
      if (checkCollision(kb, o.getBounds())) { triggerGameOver(); break; }
    }

    // パーティクル
    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);
    // ゴーストの軌跡パーティクル
    if (frameCount % 8 === 0) {
      particles.push(new Particle(
        kiro.x + Math.random() * kiro.w,
        kiro.y + kiro.floatOffset - kiro.h/2,
        `hsl(${260 + Math.random() * 40}, 80%, 70%)`
      ));
    }

    kiro.update();
  }

  // 描画
  particles.forEach(p => p.draw());
  obstacles.forEach(o => o.draw());
  kiro.draw();
  drawHUD();

  requestAnimationFrame(gameLoop);
}

// ===== ゲーム開始 / ゲームオーバー =====
function startGame() {
  score = 0; frameCount = 0; speed = 4;
  obstacles = []; particles = []; nextObstacleIn = 90; groundOffset = 0;
  kiro.y = kiro.baseY; kiro.vy = 0; kiro.onGround = true;
  kiro.dead = false; kiro.deathAnim = 0; kiro.frame = 0; kiro.animTimer = 0;
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
  state = 'playing';
}

function triggerGameOver() {
  kiro.dead = true; state = 'gameover';
  // 爆発パーティクル
  for (let i = 0; i < 40; i++) {
    particles.push(new Particle(
      kiro.x + kiro.w/2, kiro.y - kiro.h/2,
      `hsl(${Math.random() * 60 + 270}, 90%, 60%)`
    ));
  }
  flashTimer = 6;
  setTimeout(() => {
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('final-score-text').textContent = `${score} Lines Survived`;
    const nr = document.getElementById('new-record');
    if (score >= hiScore && score > 0) nr.classList.remove('hidden');
    else nr.classList.add('hidden');
  }, 1000);
}

// ===== 入力 =====
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (state === 'playing') kiro.jump();
  }
});
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (state === 'playing') kiro.jump();
}, { passive: false });
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('retry-btn').addEventListener('click', startGame);

state = 'idle';
gameLoop();
