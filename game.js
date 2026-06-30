// ===================================================
//  House of Kiro - スパゲッティコードの呪い
//  縦スクロール × 8bit × コードエディタ風
// ===================================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;  // 400
const H = canvas.height; // 600
const PX = 3;

let state = 'idle', score = 0, hiScore = 0, frameCount = 0, speed = 2.5;
let obstacles = [], particles = [], nextObstacleIn = 60;
let flashTimer = 0;
let lineNumber = 1; // 行番号

// ===== 入力管理 =====
const keys = { left: false, right: false };
let touchStartX = null;
let touchDir = 0; // -1 left, 0 none, 1 right

// ===== Kiroゴースト 画像読み込み =====
const kiroImg = new Image();
kiroImg.src = 'kiro-ghost.PNG';
let kiroImgReady = false;
kiroImg.onload = () => { kiroImgReady = true; };

// ===== Kiroちゃん（左右移動 + ふわふわ）=====
const kiro = {
  x: W / 2 - 28, y: H - 90, w: 56, h: 56,
  speed: 4.5, frame: 0, animTimer: 0,
  dead: false, deathAnim: 0, floatOffset: 0,

  update() {
    if (this.dead) { this.deathAnim++; return; }

    // 左右移動
    let moveDir = 0;
    if (keys.left) moveDir = -1;
    else if (keys.right) moveDir = 1;
    else moveDir = touchDir;

    this.x += moveDir * this.speed;
    // 画面端制限
    if (this.x < 40) this.x = 40;
    if (this.x > W - this.w - 10) this.x = W - this.w - 10;

    // ふわふわ
    this.floatOffset = Math.sin(frameCount * 0.05) * 5;

    // アニメーション
    this.animTimer++;
    if (this.animTimer > 10) { this.animTimer = 0; this.frame = 1 - this.frame; }
  },

  draw() {
    ctx.save();
    const drawX = this.x;
    const drawY = this.y + this.floatOffset;

    if (this.dead) {
      ctx.globalAlpha = Math.max(0, 1 - this.deathAnim * 0.025);
      ctx.translate(drawX + this.w/2, drawY + this.h/2);
      ctx.rotate(this.deathAnim * 0.12);
      ctx.translate(-(drawX + this.w/2), -(drawY + this.h/2));
    }

    // 影
    if (!this.dead) {
      ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
      ctx.beginPath();
      ctx.ellipse(drawX + this.w/2, drawY + this.h + 6, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 画像描画（グロー付き）
    if (kiroImgReady) {
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 12;
      ctx.drawImage(kiroImg, drawX, drawY, this.w, this.h);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
};

// ===== 障害物（上から降ってくる）=====
const obstacleTypes = [
  { name: 'spaghetti', color: '#a855f7', label: 'if(if(if(' },
  { name: 'todo',      color: '#4ade80', label: '// TODO' },
  { name: 'error',     color: '#ef4444', label: 'ERROR!' },
  { name: 'goto',      color: '#f97316', label: 'goto 666' },
  { name: 'eval',      color: '#ec4899', label: 'eval("")' },
];

class Obstacle {
  constructor() {
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    this.color = type.color;
    this.label = type.label;
    this.name = type.name;
    this.w = 30 + Math.random() * 50;
    this.h = 14 + Math.random() * 10;
    this.x = 45 + Math.random() * (W - 55 - this.w);
    this.y = -this.h - 10;
    this.speed = speed + Math.random() * 1.5;
  }

  update() {
    this.y += this.speed;
  }

  draw() {
    // ブロック背景
    ctx.fillStyle = this.color + '30'; // 半透明
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // 枠線（グロー）
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(this.x, this.y, this.w, this.h);
    ctx.shadowBlur = 0;

    // テキスト
    ctx.fillStyle = this.color;
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.label, this.x + this.w / 2, this.y + this.h / 2 + 3);
  }

  getBounds() {
    return { x: this.x + 2, y: this.y + 2, w: this.w - 4, h: this.h - 4 };
  }
}

// ===== パーティクル =====
class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 5;
    this.vy = (Math.random() - 0.5) * 5;
    this.life = 1;
    this.decay = 0.03 + Math.random() * 0.02;
    this.size = PX;
    this.color = color;
  }
  update() { this.x += this.vx; this.y += this.vy; this.life -= this.decay; }
  draw() {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

// ===== 背景：コードエディタ風 =====
const bgCodeLines = [
  'function haunted() {',
  '  const ghost = new Kiro();',
  '  while (true) {',
  '    if (legacy.exists()) {',
  '      spaghetti.grow();',
  '      // TODO: fix later',
  '      callback(callback(',
  '        callback(() => {',
  '    }}}}}',
  '  var x = undefined;',
  '  eval(userInput);',
  '  goto start;',
  '  } catch(e) { /* ignore */ }',
  '  rm -rf node_modules',
  '  import everything from "*"',
  '  console.log("help");',
  '  throw new Error("why");',
  '  // FIXME: 3 years old',
  '  debt += technical;',
  '  return null; // maybe',
];

let bgScrollOffset = 0;
const LINE_HEIGHT = 16;

function drawCodeBackground() {
  // 背景色
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0215');
  grad.addColorStop(1, '#12061f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 行番号ガター
  ctx.fillStyle = '#150825';
  ctx.fillRect(0, 0, 36, H);
  ctx.fillStyle = '#2d0f50';
  ctx.fillRect(36, 0, 1, H);

  // スクロールするコード行
  bgScrollOffset = (bgScrollOffset + speed * 0.3) % LINE_HEIGHT;

  ctx.font = '9px monospace';
  const startLine = Math.floor(frameCount * 0.05) % bgCodeLines.length;

  for (let i = -1; i < H / LINE_HEIGHT + 1; i++) {
    const y = i * LINE_HEIGHT + bgScrollOffset;
    const lineIdx = (startLine + i + bgCodeLines.length * 10) % bgCodeLines.length;
    const displayLineNum = lineNumber + i;

    // 行番号
    ctx.fillStyle = 'rgba(139, 92, 246, 0.3)';
    ctx.textAlign = 'right';
    ctx.fillText(String(displayLineNum).padStart(3, ' '), 32, y + 11);

    // コード
    ctx.fillStyle = 'rgba(139, 92, 246, 0.12)';
    ctx.textAlign = 'left';
    ctx.fillText(bgCodeLines[lineIdx], 42, y + 11);
  }

  if (state === 'playing') lineNumber += speed * 0.02;
}

// ===== ネオンサイン =====
function drawNeonSign() {
  ctx.save();
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'right';
  ctx.shadowColor = '#8b5cf6';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#a78bfa';
  ctx.fillText('KIRO', W - 12, 18);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ===== 稲光 =====
function drawFlash() {
  if (flashTimer > 0) {
    ctx.globalAlpha = flashTimer * 0.12;
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    flashTimer--;
  }
}

// ===== HUD =====
function drawHUD() {
  if (state !== 'playing') return;
  document.getElementById('score').textContent = score;
  document.getElementById('hi-score').textContent = hiScore;
}

// ===== 衝突判定 =====
function checkCollision(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ===== メインループ =====
function gameLoop() {
  ctx.clearRect(0, 0, W, H);

  drawCodeBackground();
  drawNeonSign();
  drawFlash();

  if (state === 'playing') {
    frameCount++;
    score = Math.floor(frameCount / 4);
    if (score > hiScore) hiScore = score;
    speed = 2.5 + Math.floor(score / 100) * 0.4;

    // 稲光
    if (Math.random() < 0.004) flashTimer = 3;

    // 障害物スポーン
    nextObstacleIn--;
    if (nextObstacleIn <= 0) {
      obstacles.push(new Obstacle());
      nextObstacleIn = Math.max(15, 50 - Math.floor(score / 50) * 3);
    }

    // 障害物更新
    obstacles.forEach(o => o.update());
    obstacles = obstacles.filter(o => o.y < H + 20);

    // 当たり判定
    const kb = {
      x: kiro.x + 6,
      y: kiro.y + kiro.floatOffset + 6,
      w: kiro.w - 12,
      h: kiro.h - 12
    };
    for (const o of obstacles) {
      if (checkCollision(kb, o.getBounds())) {
        triggerGameOver();
        break;
      }
    }

    // パーティクル
    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);
    // ゴーストの軌跡
    if (frameCount % 6 === 0) {
      particles.push(new Particle(
        kiro.x + kiro.w/2 + (Math.random()-0.5)*10,
        kiro.y + kiro.floatOffset + kiro.h,
        `hsl(${260 + Math.random()*40}, 80%, 70%)`
      ));
    }

    kiro.update();
  }

  // 描画
  obstacles.forEach(o => o.draw());
  particles.forEach(p => p.draw());
  kiro.draw();
  drawHUD();

  requestAnimationFrame(gameLoop);
}

// ===== ゲーム開始 / ゲームオーバー =====
function startGame() {
  score = 0; frameCount = 0; speed = 2.5;
  obstacles = []; particles = []; nextObstacleIn = 60;
  lineNumber = 1; bgScrollOffset = 0;
  kiro.x = W/2 - kiro.w/2; kiro.dead = false; kiro.deathAnim = 0;
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
  state = 'playing';
}

function triggerGameOver() {
  kiro.dead = true; state = 'gameover';
  for (let i = 0; i < 40; i++) {
    particles.push(new Particle(
      kiro.x + kiro.w/2, kiro.y + kiro.h/2,
      `hsl(${Math.random()*60 + 270}, 90%, 60%)`
    ));
  }
  flashTimer = 5;
  setTimeout(() => {
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('final-score-text').textContent = `${score} Lines Survived`;
    const nr = document.getElementById('new-record');
    if (score >= hiScore && score > 0) nr.classList.remove('hidden');
    else nr.classList.add('hidden');
  }, 800);
}

// ===== キーボード入力 =====
document.addEventListener('keydown', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
});
document.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
});

// ===== タッチ入力（左半分/右半分タップ）=====
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const tx = (touch.clientX - rect.left) / rect.width * W;
  touchDir = tx < W / 2 ? -1 : 1;
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  touchDir = 0;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const tx = (touch.clientX - rect.left) / rect.width * W;
  touchDir = tx < W / 2 ? -1 : 1;
}, { passive: false });

// ===== ボタン =====
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('retry-btn').addEventListener('click', startGame);

// ===== 起動 =====
state = 'idle';
gameLoop();
