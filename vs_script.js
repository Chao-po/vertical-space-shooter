/*
 * Vertical Space Shooter (Upgraded)
 * - 四向移動（WASD / 方向鍵）
 * - 難度漸進：怪物數量/種類/子彈頻率逐步提升，不會一開始爆量
 * - 升級三選一：玩家自己選擇發展路線（像技能樹）
 * - GameOver / Restart 動畫：淡入淡出，R 重新開始
 * - 保留：星空背景、爆炸粒子、追蹤彈、Boss、射手敵人
 */

// ===== Canvas / UI =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const uiScore = document.getElementById('score');
const uiHp = document.getElementById('hp');
const uiLevel = document.getElementById('level');
const xpBar = document.getElementById('xp-bar');
const messageEl = document.getElementById('message');
const crosshairEl = document.getElementById('crosshair');

// Title & End Screen Elements
const startScreenEl = document.getElementById('startScreen');
const endScreenEl = document.getElementById('endScreen');
const finalScoreEl = document.getElementById('finalScore');

// 高分紀錄元素
const highScoreRecordEl = document.getElementById('highScoreRecord');

// 歷史紀錄元素（顯示前幾次高分）
const scoreHistoryEl = document.getElementById('scoreHistory');

// 存放歷史高分的列表
let scoreHistory = [];

// 讀取歷史紀錄
function loadScoreHistory() {
  try {
    const stored = localStorage.getItem('vs_history');
    if (stored) {
      scoreHistory = JSON.parse(stored) || [];
    } else {
      scoreHistory = [];
    }
  } catch (err) {
    scoreHistory = [];
  }
}

// 儲存一個新的分數到歷史紀錄中
function saveScoreHistory(score) {
  scoreHistory.push(score);
  // 依分數由大到小排序，只留前五
  scoreHistory.sort((a, b) => b - a);
  scoreHistory = scoreHistory.slice(0, 5);
  try {
    localStorage.setItem('vs_history', JSON.stringify(scoreHistory));
  } catch (err) {
    // ignore storage errors
  }
}

// 更新開始畫面中歷史紀錄顯示
function updateScoreHistoryDisplay() {
  if (!scoreHistoryEl) return;
  // 清空
  scoreHistoryEl.innerHTML = '';
  scoreHistory.forEach((sc, idx) => {
    const li = document.createElement('li');
    li.textContent = `${idx + 1}. ${sc}`;
    scoreHistoryEl.appendChild(li);
  });
}

// 玩家歷史高分
let highScore = 0;

// 讀取高分
function loadHighScore() {
  try {
    const stored = localStorage.getItem('vs_highscore');
    highScore = stored ? parseInt(stored, 10) || 0 : 0;
  } catch (err) {
    highScore = 0;
  }
}

// 儲存高分
function saveHighScore(score) {
  if (score > highScore) {
    highScore = score;
    try {
      localStorage.setItem('vs_highscore', String(highScore));
    } catch (err) {
      // ignore storage errors
    }
  }
}

// 更新開始畫面高分顯示
function updateHighScoreDisplay() {
  if (highScoreRecordEl) {
    highScoreRecordEl.textContent = `最佳紀錄：${highScore}`;
  }
}

// 升級視窗（需要你在 HTML 放一段 modal，下面有提供）
const upgradeModal = document.getElementById('upgradeModal');
const upgradeTitle = document.getElementById('upgradeTitle');
const upgradeChoices = document.getElementById('upgradeChoices');

let game;

// 儲存目前升級選項與鍵盤選擇索引
let currentUpgrades = [];
let upgradeSelectionIndex = 0;

// ===== Game Init =====
function initGame() {
  game = {
    running: true,
    pausedForUpgrade: false,

    score: 0,
    xp: 0,
    xpNext: 100,
    level: 1,

    timeAlive: 0,          // 存活時間(難度曲線)
    difficulty: 0,         // 0 -> 1 -> 2...
    fade: { alpha: 0, dir: 0 }, // 畫面淡入淡出：dir: -1 fadein / +1 fadeout

    player: {
      x: canvas.width * 0.5 - 20,
      y: canvas.height - 90,
      speed: 420,
      width: 40,
      height: 40,
      hp: 100,

      fireCd: 0,
      fireRate: 160,   // 射擊冷卻 (越小越快)
      bulletDamage: 1, // 子彈傷害
      bulletSpeed: 600,

      // 新屬性：子彈半徑、穿透次數、回血
      bulletRadius: 4,
      pierce: 0,
      regenRate: 0,

      // 新屬性：子彈射程（最大飛行距離）；降低射程限制以抑制穿透+導彈過於強勢
      bulletRange: 700,

      multiShot: 1,    // 幾軌
      spread: 0.18,    // 散射角度
      homing: false,   // 追蹤
      magnet: 0,       // 追蹤轉向強度（升級後提升）

      maxHp: 100
    },

    bullets: [],
    enemies: [],
    enemyBullets: [],

    stars: createStars(80),
    particles: [],

    spawnTimer: 0,
    spawnInterval: 1400,

    wave: 1,
    bossHpBase: 120
  };

  updateUI();
  showMessage('開始遊戲！', 800);

  // 淡入
  game.fade.alpha = 1;
  game.fade.dir = -1;

  hideUpgradeModal();
}

function createStars(count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.8 + 0.5,
      speed: Math.random() * 40 + 20
    });
  }
  return stars;
}

function updateUI() {
  uiScore.textContent = `Score: ${game.score}`;
  uiHp.textContent = `HP: ${Math.max(0, Math.round(game.player.hp))}`;
  uiLevel.textContent = `Level: ${game.level}`;
  const ratio = Math.min(game.xp / game.xpNext, 1);
  xpBar.style.width = `${ratio * 100}%`;
}

function showMessage(text, duration = 1000) {
  messageEl.textContent = text;
  messageEl.style.opacity = '1';
  setTimeout(() => (messageEl.style.opacity = '0'), duration);
}

// ===== Title & End Screen Helpers =====
function showStartScreen() {
  if (startScreenEl) startScreenEl.classList.add('show');
  updateHighScoreDisplay();
  updateScoreHistoryDisplay();
}
function hideStartScreen() {
  if (startScreenEl) startScreenEl.classList.remove('show');
}
function showEndScreen(score) {
  if (finalScoreEl) finalScoreEl.textContent = `你的分數：${score}`;
  if (endScreenEl) endScreenEl.classList.add('show');
}
function hideEndScreen() {
  if (endScreenEl) endScreenEl.classList.remove('show');
}

// ===== Upgrade System (三選一) =====
function buildUpgradePool() {
  // 每次升級給玩家三選一（帶描述）
  // 你要加更多技能，就往這裡加！
  return [
    {
      id: 'ms_plus',
      title: '多軌+1',
      desc: '子彈軌數 +1（更像技能樹往火力流）',
      apply: () => {
        game.player.multiShot = Math.min(7, game.player.multiShot + 1);
        showMessage('火力提升：多軌 +1', 900);
      }
    },
    {
      id: 'firerate_up',
      title: '射速提升',
      desc: '射擊冷卻 -25ms（子彈更密）',
      apply: () => {
        game.player.fireRate = Math.max(60, game.player.fireRate - 25);
        showMessage('射速提升！', 900);
      }
    },
    {
      id: 'damage_up',
      title: '傷害 +2',
      desc: '每顆子彈傷害 +2（打坦克/Boss更快）',
      apply: () => {
        game.player.bulletDamage += 2;
        showMessage('傷害提升！', 900);
      }
    },
    {
      id: 'bullet_speed',
      title: '子彈速度 +',
      desc: '子彈速度 +180（更順更爽）',
      apply: () => {
        game.player.bulletSpeed += 180;
        showMessage('彈速提升！', 900);
      }
    },
    {
      id: 'homing_unlock',
      title: '解鎖追蹤彈',
      desc: '開啟追蹤模式（子彈會找最近敵人）',
      apply: () => {
        game.player.homing = true;
        game.player.magnet = Math.max(game.player.magnet, 0.35);
        showMessage('解鎖追蹤彈！', 1100);
      }
    },
    {
      id: 'homing_stronger',
      title: '追蹤更強',
      desc: '追蹤轉向更靈敏（更容易追到敵人）',
      apply: () => {
        game.player.homing = true;
        game.player.magnet = Math.min(0.85, game.player.magnet + 0.15);
        showMessage('追蹤強化！', 900);
      }
    },
    {
      id: 'hp_up',
      title: '最大HP +20',
      desc: '提高生存力（耐打）',
      apply: () => {
        game.player.maxHp += 30;
        game.player.hp += 30;
        showMessage('最大HP提升！', 900);
      }
    },
    {
      id: 'heal',
      title: '立即回復 25HP',
      desc: '救命用（回血）',
      apply: () => {
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + 35);
        showMessage('回血 +35', 900);
      }
    },
    {
      id: 'move_speed',
      title: '移速 +',
      desc: '速度 +80（更好閃子彈）',
      apply: () => {
        game.player.speed += 80;
        showMessage('移動速度提升！', 900);
      }
    },
    {
      id: 'spread_tight',
      title: '散射更集中',
      desc: '散射角度 -0.04（更聚焦）',
      apply: () => {
        game.player.spread = Math.max(0.06, game.player.spread - 0.04);
        showMessage('散射更集中！', 900);
      }
    }
    ,
    {
      id: 'bullet_big',
      title: '大顆子彈',
      desc: '子彈尺寸 +1 並傷害 +1',
      apply: () => {
        game.player.bulletRadius = Math.min(12, game.player.bulletRadius + 1);
        game.player.bulletDamage += 1;
        showMessage('大顆子彈！', 900);
      }
    },
    {
      id: 'pierce',
      title: '穿透彈',
      desc: '子彈可穿透 1 個敵人，可堆疊',
      apply: () => {
        game.player.pierce = (game.player.pierce || 0) + 1;
        showMessage('穿透彈 +1！', 900);
      }
    },
    {
      id: 'regen',
      title: '生命回復',
      desc: '每秒自動回復 2 HP，可堆疊',
      apply: () => {
        game.player.regenRate = (game.player.regenRate || 0) + 2;
        showMessage('回血提升！', 900);
      }
    }
  ];
}

function openUpgradeModal() {
  game.pausedForUpgrade = true;   // ✅ 只暫停邏輯，不停 render

  const pool = buildUpgradePool();
  const picks = [];
  while (picks.length < 3) {
    const item = pool[Math.floor(Math.random() * pool.length)];
    if (!picks.some(p => p.id === item.id)) picks.push(item);
  }

  // Save picks and reset selection
  currentUpgrades = picks;
  upgradeSelectionIndex = 0;

  upgradeTitle.textContent = `Level Up! Lv${game.level} - 選擇一個升級`;
  upgradeChoices.innerHTML = '';

  // Create DOM buttons and store references
  const btns = [];
  for (const u of picks) {
    const btn = document.createElement('button');
    btn.className = 'upgrade-btn';
    btn.innerHTML = `<div class="u-title">${u.title}</div><div class="u-desc">${u.desc}</div>`;
    // still allow mouse click to select
    btn.addEventListener('click', () => {
      u.apply();
      hideUpgradeModal();
      game.pausedForUpgrade = false;
    });
    upgradeChoices.appendChild(btn);
    btns.push(btn);
  }
  // Mark selected button for keyboard navigation
  if (btns.length > 0) btns[0].classList.add('selected');
  game.upgradeButtons = btns;

  upgradeModal.classList.add('show');
}


function hideUpgradeModal() {
  if (!upgradeModal) return;
  upgradeModal.classList.remove('show');
  // 清除鍵盤選擇樣式
  if (game.upgradeButtons) {
    for (const btn of game.upgradeButtons) {
      btn.classList.remove('selected');
    }
  }
}

// ===== Level Up Trigger =====
function handleLevelUpCheck() {
  while (game.xp >= game.xpNext) {
    game.level++;
    game.xp -= game.xpNext;
    // 升級所需經驗值隨等級呈倍增並增加固定值
    game.xpNext = Math.floor(game.xpNext * 1.6 + (30 + (game.level - 1) * 10));

    updateUI();
    openUpgradeModal(); // 改成玩家選擇
    showMessage(`升級！Lv${game.level}`, 900);
    break; // 每次只升一次，避免一次跳很多視窗
  }
}

// ===== Enemy Spawning / Difficulty Curve =====
function spawnEnemy() {
  // 依 difficulty 逐步開啟更多敵人類型
  const d = game.difficulty;

  // 權重：初期 normal/fast 少量，中期加入 tank/shooter，後期增加 shooter
  const r = Math.random();
  let type = 'normal';

  if (d < 1) {
    // 初期：普通與快速
    type = (r < 0.7) ? 'normal' : 'fast';
  } else if (d < 2) {
    // 中期：加入坦克、射手、之字
    if (r < 0.45) type = 'normal';
    else if (r < 0.65) type = 'fast';
    else if (r < 0.78) type = 'tank';
    else if (r < 0.90) type = 'shooter';
    else type = 'zigzag';
  } else if (d < 3) {
    // 中後期：多種混合，加入分裂、衝鋒與炸彈
    if (r < 0.28) type = 'normal';
    else if (r < 0.48) type = 'fast';
    else if (r < 0.62) type = 'tank';
    else if (r < 0.76) type = 'shooter';
    else if (r < 0.86) type = 'zigzag';
    else if (r < 0.93) type = 'splitter';
    else if (r < 0.97) type = 'charger';
    else type = 'bomber';
  } else if (d < 5) {
    // 高難度：混合配比，增加新敵人
    if (r < 0.25) type = 'normal';
    else if (r < 0.45) type = 'fast';
    else if (r < 0.6) type = 'tank';
    else if (r < 0.75) type = 'shooter';
    else if (r < 0.84) type = 'zigzag';
    else if (r < 0.90) type = 'splitter';
    else if (r < 0.95) type = 'charger';
    else type = 'bomber';
  } else {
    // 極高難度：極少普通敵，增加炸彈與衝鋒
    if (r < 0.22) type = 'normal';
    else if (r < 0.40) type = 'fast';
    else if (r < 0.58) type = 'tank';
    else if (r < 0.73) type = 'shooter';
    else if (r < 0.82) type = 'zigzag';
    else if (r < 0.88) type = 'splitter';
    else if (r < 0.94) type = 'charger';
    else type = 'bomber';
  }

  game.enemies.push(createEnemy(type));
}

function createEnemy(type) {
  const y = -60;
  const x = Math.random() * (canvas.width - 60) + 30;

  // 隨難度微幅加速/加血
  const d = game.difficulty;
  // 調高難度成長：速度與血量增幅略大
  // 調整速度與血量成長幅度，難度提高
  const speedBoost = 1 + d * 0.20;
  const hpBoost = 1 + d * 0.26;

  switch (type) {
    case 'fast':
      return {
        type,
        x, y,
        width: 32, height: 32,
        hp: Math.round(3 * hpBoost),
        speedY: 240 * speedBoost,
        speedX: (Math.random() < 0.5 ? -60 : 60) * speedBoost
      };
    case 'zigzag':
      return {
        type,
        x,
        y,
        width: 34,
        height: 34,
        hp: Math.round(3 * hpBoost),
        speedY: 190 * speedBoost,
        // 之字移動基準 X
        baseX: x,
        phase: Math.random() * Math.PI * 2,
        amp: 80,
        freq: 0.005 // 調整幅度速度
      };
    case 'splitter':
      return {
        type,
        x,
        y,
        width: 44,
        height: 44,
        hp: Math.round(6 * hpBoost),
        speedY: 160 * speedBoost,
        speedX: 0
      };
    case 'mini':
      return {
        type,
        x,
        y,
        width: 26,
        height: 26,
        hp: 1,
        speedY: 260 * speedBoost,
        speedX: (Math.random() < 0.5 ? -80 : 80) * speedBoost
      };
    case 'charger':
      // 衝鋒敵人：高速直線衝向玩家所在列
      return {
        type,
        x,
        y,
        width: 32,
        height: 32,
        hp: Math.round(3 * hpBoost),
        speedY: 260 * speedBoost,
        speedX: 0
      };
    case 'bomber':
      // 炸彈敵人：緩慢下降後爆炸產生子彈圈
      return {
        type,
        x,
        y,
        width: 36,
        height: 36,
        hp: Math.round(5 * hpBoost),
        speedY: 130 * speedBoost,
        speedX: 0,
        explodeCd: 2000 + Math.random() * 1500,
        exploded: false
      };
    case 'tank':
      return {
        type,
        x, y,
        width: 52, height: 52,
        hp: Math.round(10 * hpBoost),
        speedY: 135 * speedBoost,
        speedX: 0
      };
    case 'shooter':
      return {
        type,
        x, y,
        width: 42, height: 42,
        hp: Math.round(4 * hpBoost),
        speedY: 155 * speedBoost,
        speedX: 0,
        fireCd: 600 + Math.random() * 600
      };
    default:
      return {
        type: 'normal',
        x, y,
        width: 36, height: 36,
        hp: Math.round(2 * hpBoost),
        speedY: 175 * speedBoost,
        speedX: (Math.random() < 0.5 ? -40 : 40) * speedBoost
      };
  }
}

function createBoss() {
  const hp = game.bossHpBase + Math.floor(game.difficulty * 35);
  return {
    type: 'boss',
    x: canvas.width * 0.5 - 60,
    y: -140,
    width: 120,
    height: 120,
    hp,
    maxHp: hp,
    speedY: 95 + game.difficulty * 10,
    fireCd: 0
  };
}

// ===== Player Shooting =====
function spawnPlayerBullets() {
  const p = game.player;

  const count = p.multiShot;
  const spread = p.spread;

  if (count === 1) {
    game.bullets.push(makeBullet(p.x + p.width / 2, p.y - 8, -Math.PI / 2));
  } else {
    // 多軌散射
    for (let i = 0; i < count; i++) {
      const ang = -Math.PI / 2 + (i - (count - 1) / 2) * spread;
      game.bullets.push(makeBullet(p.x + p.width / 2, p.y - 8, ang));
    }
  }

  p.fireCd = p.fireRate;
}

function makeBullet(x, y, ang) {
  const p = game.player;
  return {
    x,
    y,
    radius: p.bulletRadius,
    speedX: Math.cos(ang) * p.bulletSpeed,
    speedY: Math.sin(ang) * p.bulletSpeed,
    homing: p.homing,
    target: null,
    // 子彈可以穿透敵人剩餘次數
    pierceLeft: p.pierce || 0,
    // 子彈剩餘飛行距離
    rangeLeft: p.bulletRange
  };
}

// ===== Update Bullets =====
function updateBullets(dt) {
  for (const b of game.bullets) {
    // 追蹤調整
    if (b.homing) {
      if (!b.target || b.target.hp <= 0) b.target = findNearestEnemy(b.x, b.y);

      if (b.target) {
        const tx = b.target.x + b.target.width / 2;
        const ty = b.target.y + b.target.height / 2;
        const dx = tx - b.x;
        const dy = ty - b.y;
        const len = Math.hypot(dx, dy) || 1;

        // 追蹤：用磁力(magnet)把目前速度逐步朝向目標方向
        const desiredVx = (dx / len) * game.player.bulletSpeed;
        const desiredVy = (dy / len) * game.player.bulletSpeed;

        const m = game.player.magnet || 0.35;
        b.speedX = b.speedX + (desiredVx - b.speedX) * m;
        b.speedY = b.speedY + (desiredVy - b.speedY) * m;
      }
    }

    // 計算移動距離
    const dx = (b.speedX * dt) / 1000;
    const dy = (b.speedY * dt) / 1000;
    b.x += dx;
    b.y += dy;
    // 扣減射程
    if (typeof b.rangeLeft === 'number') {
      b.rangeLeft -= Math.hypot(dx, dy);
    }
  }

  game.bullets = game.bullets.filter(b =>
    b.y > -60 && b.y < canvas.height + 60 && b.x > -60 && b.x < canvas.width + 60 &&
    (b.rangeLeft === undefined || b.rangeLeft > 0)
  );
}

function findNearestEnemy(x, y) {
  let target = null;
  let minDist = Infinity;
  for (const e of game.enemies) {
    const dx = e.x + e.width / 2 - x;
    const dy = e.y + e.height / 2 - y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      target = e;
    }
  }
  return target;
}

// ===== Enemies Update =====
function updateEnemies(dt) {
  for (const e of game.enemies) {
    if (e.type === 'bomber') {
      // 炸彈敵人：緩慢下降並計時爆炸
      e.y += e.speedY * dt / 1000;
      // 累計計時器
      e.explodeCd -= dt;
      // 在螢幕內且計時結束時爆炸
      if (!e.exploded && e.explodeCd <= 0 && e.y > 40) {
        e.exploded = true;
        spawnBomb(e);
        createExplosion(e.x + e.width / 2, e.y + e.height / 2, false);
        e.hp = 0;
        continue;
      }
    } else if (e.type === 'zigzag') {
      // 之字敵人：X 由正弦曲線決定
      e.y += e.speedY * dt / 1000;
      e.phase += e.freq * dt;
      // 計算新的 X 基於初始 baseX + sin 波
      e.x = e.baseX + Math.sin(e.phase) * e.amp;
    } else {
      // 一般移動
      e.x += (e.speedX || 0) * dt / 1000;
      e.y += e.speedY * dt / 1000;
      // 邊界反彈
      if (e.speedX) {
        if (e.x < 0 || e.x > canvas.width - e.width) e.speedX *= -1;
      }
    }

    // 射手/ Boss 射擊（難度越高射更快）
    if (e.type === 'shooter' || e.type === 'boss') {
      e.fireCd -= dt;
      if (e.fireCd <= 0 && e.y > 0) {
        shootEnemyBullet(e);

        const base = (e.type === 'boss') ? 700 : 1200;
        const diffFactor = Math.max(0.55, 1 - game.difficulty * 0.08);
        e.fireCd = base * diffFactor + Math.random() * 200;
      }
    }

    // Boss 停在上方一段位置
    if (e.type === 'boss' && e.y > 40) e.speedY = 0;
  }

  game.enemies = game.enemies.filter(e => e.y < canvas.height + 140 && e.hp > 0);
}

// ===== Enemy Shooting =====
function shootEnemyBullet(enemy) {
  const speed = enemy.type === 'boss' ? 260 : 190;

  const dx = (game.player.x + game.player.width / 2) - (enemy.x + enemy.width / 2);
  const dy = (game.player.y + game.player.height / 2) - (enemy.y + enemy.height / 2);
  const len = Math.hypot(dx, dy) || 1;

  const vx = (dx / len) * speed;
  const vy = (dy / len) * speed;

  // Boss 多發子彈（提升可玩性）
  if (enemy.type === 'boss') {
    const angles = [-0.18, 0, 0.18];
    for (const a of angles) {
      const ca = Math.cos(a), sa = Math.sin(a);
      const rvx = vx * ca - vy * sa;
      const rvy = vx * sa + vy * ca;

      game.enemyBullets.push({
        x: enemy.x + enemy.width / 2,
        y: enemy.y + enemy.height / 2,
        radius: 4,
        speedX: rvx,
        speedY: rvy
      });
    }
  } else {
    game.enemyBullets.push({
      x: enemy.x + enemy.width / 2,
      y: enemy.y + enemy.height / 2,
      radius: 4,
      speedX: vx,
      speedY: vy
    });
  }
}

function updateEnemyBullets(dt) {
  for (const b of game.enemyBullets) {
    b.x += b.speedX * dt / 1000;
    b.y += b.speedY * dt / 1000;
  }
  game.enemyBullets = game.enemyBullets.filter(b =>
    b.x > -40 && b.x < canvas.width + 40 && b.y > -80 && b.y < canvas.height + 100
  );
}

// ===== Bomber Explosion =====
// 產生一圈子彈向八個方向擴散
function spawnBomb(enemy) {
  const count = 8;
  const speed = 220;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    game.enemyBullets.push({
      x: enemy.x + enemy.width / 2,
      y: enemy.y + enemy.height / 2,
      radius: 4,
      speedX: vx,
      speedY: vy
    });
  }
}

// ===== Input =====
const keys = {};
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();

  // 在標題畫面：Enter 開始遊戲
  if (startScreenEl && startScreenEl.classList.contains('show')) {
    if (k === 'enter') {
      e.preventDefault();
      // 開始遊戲：重新初始化並淡入
      hideStartScreen();
      initGame();
      game.running = true;
      game.fade.alpha = 1;
      game.fade.dir = -1;
    }
    return;
  }

  // 在升級選擇畫面：使用鍵盤選擇/確認
  if (game.pausedForUpgrade) {
    if (k === 'arrowup' || k === 'w') {
      e.preventDefault();
      // 移動到上一個選項
      if (game.upgradeButtons && game.upgradeButtons.length > 0) {
        game.upgradeButtons[upgradeSelectionIndex].classList.remove('selected');
        upgradeSelectionIndex = (upgradeSelectionIndex - 1 + game.upgradeButtons.length) % game.upgradeButtons.length;
        game.upgradeButtons[upgradeSelectionIndex].classList.add('selected');
      }
    } else if (k === 'arrowdown' || k === 's') {
      e.preventDefault();
      // 移動到下一個選項
      if (game.upgradeButtons && game.upgradeButtons.length > 0) {
        game.upgradeButtons[upgradeSelectionIndex].classList.remove('selected');
        upgradeSelectionIndex = (upgradeSelectionIndex + 1) % game.upgradeButtons.length;
        game.upgradeButtons[upgradeSelectionIndex].classList.add('selected');
      }
    } else if (k === 'enter' || k === ' ') {
      e.preventDefault();
      // 確認當前選項
      if (currentUpgrades && currentUpgrades[upgradeSelectionIndex]) {
        const opt = currentUpgrades[upgradeSelectionIndex];
        opt.apply();
        hideUpgradeModal();
        game.pausedForUpgrade = false;
      }
    }
    return;
  }

  // 遊戲結束畫面：Enter 或 R 重新開始
  if (!game.running) {
    if (endScreenEl && endScreenEl.classList.contains('show')) {
      if (k === 'enter' || k === 'r') {
        e.preventDefault();
        hideEndScreen();
        startRestartFade();
      }
      return;
    }
    // 如果尚未顯示結束畫面但遊戲停止，也可透過 R 重開
    if (k === 'r') {
      e.preventDefault();
      startRestartFade();
      return;
    }
  }

  // 一般情況紀錄按鍵狀態
  keys[k] = true;
});

window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

// Mouse move crosshair
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  crosshairEl.style.left = `${cx}px`;
  crosshairEl.style.top = `${cy}px`;
  // 額外小細節：滑鼠移動時準星縮放一下（CSS 會搭配 transition）
  crosshairEl.classList.add('pulse');
  clearTimeout(crosshairEl._t);
  crosshairEl._t = setTimeout(() => crosshairEl.classList.remove('pulse'), 80);
});

// ===== Main Loop =====
let lastTime = 0;
function loop(time) {
  const dt = time - lastTime;
  lastTime = time;

  updateFade(dt);

  if (game.running) {
    update(dt);
    render();
  } else {
    // 暫停時也要 render（升級視窗/遊戲結束畫面）
    render();
  }

  requestAnimationFrame(loop);
}

// ===== Update Logic =====
function update(dt) {
  game.timeAlive += dt;

  // difficulty：隨存活時間+等級漸進
  // 難度曲線：更平緩，避免前期過於困難
  // 調整難度成長更快一些，保持挑戰性
  // 調整難度：增長速度稍快，提升挑戰性
  game.difficulty = Math.min(8, (game.timeAlive / 45000) + (game.level - 1) * 0.28);

  for (const s of game.stars) {
    s.y += s.speed * dt / 1000;
    if (s.y > canvas.height + 10) {
      s.y = -10;
      s.x = Math.random() * canvas.width;
      s.speed = Math.random() * 40 + 20;
      s.size = Math.random() * 1.8 + 0.5;
    }
  }

  // ✅ 升級選擇中：只動背景，不跑遊戲邏輯
  if (game.pausedForUpgrade) {
    updateUI();
    return;
  }

  // ↓↓↓ 下面才是原本遊戲邏輯（玩家移動/射擊/刷怪/碰撞…）
  game.timeAlive += dt;

  // ===== 玩家四向移動（你要的重點）=====
  const p = game.player;
  const move = p.speed * dt / 1000;

  // 持續回血
  if (p.regenRate && p.regenRate > 0) {
    p.hp = Math.min(p.maxHp, p.hp + p.regenRate * dt / 1000);
  }

  if (keys['arrowleft'] || keys['a']) p.x -= move;
  if (keys['arrowright'] || keys['d']) p.x += move;
  if (keys['arrowup'] || keys['w']) p.y -= move;
  if (keys['arrowdown'] || keys['s']) p.y += move;

  // 限制邊界
  p.x = Math.max(0, Math.min(canvas.width - p.width, p.x));
  p.y = Math.max(0, Math.min(canvas.height - p.height, p.y));

  // 射擊（空白鍵）
  p.fireCd -= dt;
  const spacePressed = keys[' '] || keys['space'];
  if (spacePressed && p.fireCd <= 0) {
    spawnPlayerBullets();
  }

  updateBullets(dt);
  updateEnemies(dt);
  updateEnemyBullets(dt);

  // ===== 生成敵人：一開始少，慢慢變多變強 =====
  game.spawnTimer += dt;

  // 依難度調整生成間隔（越後期越短）
  // 調整生成間隔：增加挑戰性，隨難度更快生成
  const targetInterval = Math.max(500, 1200 - game.difficulty * 220);
  game.spawnInterval = targetInterval;

  if (game.spawnTimer > game.spawnInterval) {
    // 每次生成的數量：初期 1~2，中期 2~4，後期 4~6
    const base = 1 + Math.floor(game.difficulty * 0.8);
    const count = Math.min(7, base + (Math.random() < 0.5 ? 1 : 0));

    // 每 6 波出 Boss（稍微拉長一點）
    if (game.wave % 6 === 0) {
      game.enemies.push(createBoss());
      showMessage('Boss Incoming!', 1400);
    } else {
      for (let i = 0; i < count; i++) spawnEnemy();
    }

    game.wave++;
    game.spawnTimer = 0;
  }

  handleCollisions();
  handleLevelUpCheck();
  updateUI();
}

// ===== Collisions =====
function handleCollisions() {
  const p = game.player;

  // 玩家子彈 vs 敵人
  for (const b of game.bullets) {
    for (const e of game.enemies) {
      if (rectCircleIntersect(e, b)) {
        // 對敵人造成傷害
        e.hp -= game.player.bulletDamage;

        if (e.hp <= 0) {
          // 根據敵人類型計算分數
          let baseScore;
          switch (e.type) {
            case 'boss': baseScore = 600; break;
            case 'tank': baseScore = 220; break;
            case 'shooter': baseScore = 120; break;
            case 'splitter': baseScore = 180; break;
            case 'zigzag': baseScore = 120; break;
            case 'mini': baseScore = 50; break;
            case 'charger': baseScore = 130; break;
            case 'bomber': baseScore = 200; break;
            default: baseScore = 70; break;
          }
          game.score += baseScore;
          game.xp += Math.floor(baseScore * 0.6);

          // 爆炸特效
          createExplosion(e.x + e.width / 2, e.y + e.height / 2, e.type === 'boss');

          // 分裂型：死亡時產生小型敵人
          if (e.type === 'splitter') {
            for (let i = 0; i < 2; i++) {
              const mini = createEnemy('mini');
              // 放置在原位置略偏移
              mini.x = e.x + (i === 0 ? -10 : 10);
              mini.y = e.y;
              game.enemies.push(mini);
            }
          }

          e.hp = 0;
        }

        // 判斷是否穿透
        if (b.pierceLeft && b.pierceLeft > 0) {
          b.pierceLeft--;
          // 稍微縮小攻擊範圍，下次不會再次碰撞同一敵人
          // 搬移子彈位置，讓它繼續往前
          b.x += b.speedX * 0.01;
          b.y += b.speedY * 0.01;
        } else {
          // 標記移除
          b.y = -999;
        }

        // 一顆子彈一次只處理一次碰撞
        break;
      }
    }
  }

  // 敵子彈 vs 玩家
  for (const eb of game.enemyBullets) {
    if (rectCircleIntersect(p, eb)) {
      eb.y = canvas.height + 999;
      // 調整敵人子彈傷害，提升挑戰性
      p.hp -= 10;

      if (p.hp <= 0) {
        endGame();
      }
    }
  }

  // 玩家 vs 敵人
  for (const e of game.enemies) {
    if (rectIntersect(p, e)) {
      // 調整撞擊傷害，提升挑戰性
      p.hp -= 20;
      e.hp = 0;
      createExplosion(e.x + e.width / 2, e.y + e.height / 2, false);

      if (p.hp <= 0) {
        endGame();
      }
    }
  }

  game.enemies = game.enemies.filter(e => e.hp > 0);
  game.bullets = game.bullets.filter(b => b.y > -100);
  game.enemyBullets = game.enemyBullets.filter(b => b.y < canvas.height + 120);
}

function endGame() {
  game.player.hp = 0;
  game.running = false;
  // 顯示結束訊息稍短時間，然後顯示結束畫面
  showMessage(`Game Over!`, 2000);

  // 淡出後顯示結束畫面
  game.fade.alpha = 0;
  game.fade.dir = +1;
  setTimeout(() => {
    // 儲存高分並更新顯示
    // 儲存並更新高分與歷史紀錄
    saveHighScore(game.score);
    saveScoreHistory(game.score);
    updateHighScoreDisplay();
    updateScoreHistoryDisplay();
    showEndScreen(game.score);
  }, 600);
}

// ===== Helpers Collisions =====
function rectCircleIntersect(rect, circ) {
  const rx = rect.x, ry = rect.y, rw = rect.width, rh = rect.height;
  const cx = circ.x, cy = circ.y, cr = circ.radius;

  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= cr * cr;
}

function rectIntersect(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// ===== Explosion Particles (獨立 particles，不污染 stars) =====
function createExplosion(x, y, big = false) {
  const count = big ? 50 : 22;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = Math.random() * (big ? 340 : 240) + 90;
    game.particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: big ? 920 : 650,
      size: Math.random() * (big ? 3.2 : 2.2) + 1,
    });
  }
}

// ===== Render =====
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 星星背景
  ctx.fillStyle = '#fff';
  for (const s of game.stars) {
    ctx.globalAlpha = 0.15 + (s.size / 4);
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;

  // 粒子
  renderParticles();

  // 玩家
  drawPlayer(game.player);

  // 敵人
  for (const e of game.enemies) drawEnemy(e);

  // 玩家子彈
  ctx.fillStyle = '#73c4e3';
  for (const b of game.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 敵子彈
  ctx.fillStyle = '#ff7f50';
  for (const b of game.enemyBullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 淡入淡出遮罩
  if (game.fade.alpha > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.fade.alpha);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function renderParticles() {
  const dt = 16; // render 用固定step，視覺穩
  for (const p of game.particles) {
    p.x += p.vx * dt / 1000;
    p.y += p.vy * dt / 1000;
    p.life -= dt;

    const a = Math.max(0, Math.min(1, p.life / 700));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(255, 220, 140, 1)';
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.restore();
  }
  game.particles = game.particles.filter(p => p.life > 0);
}

// ===== Draw Player =====
function drawPlayer(p) {
  ctx.save();
  ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

  // 尾焰（小細節）
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = 'rgba(90,180,255,0.55)';
  ctx.beginPath();
  ctx.moveTo(-6, p.height / 2);
  ctx.lineTo(0, p.height / 2 + 18 + Math.random() * 6);
  ctx.lineTo(6, p.height / 2);
  ctx.closePath();
  ctx.fill();

  // 主體
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(200,220,255,0.92)';
  ctx.beginPath();
  ctx.moveTo(0, -p.height / 2);
  ctx.lineTo(p.width / 2, p.height / 2);
  ctx.lineTo(-p.width / 2, p.height / 2);
  ctx.closePath();
  ctx.fill();

  // 窗戶
  ctx.fillStyle = 'rgba(120,180,255,0.6)';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ===== Draw Enemy =====
function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x + e.width / 2, e.y + e.height / 2);

  if (e.type === 'tank') {
    ctx.fillStyle = 'rgba(255,200,120,0.85)';
    ctx.fillRect(-e.width/2, -e.height/2, e.width, e.height);
    ctx.fillStyle = 'rgba(255,240,180,0.8)';
    ctx.fillRect(-e.width/4, -e.height/4, e.width/2, e.height/2);
  } else if (e.type === 'fast') {
    ctx.fillStyle = 'rgba(160,255,160,0.9)';
    ctx.beginPath();
    ctx.ellipse(0, 0, e.width/2, e.height/2.5, 0, 0, Math.PI*2);
    ctx.fill();
  } else if (e.type === 'shooter') {
    ctx.fillStyle = 'rgba(255,120,200,0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, e.width/2, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,200,240,0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, e.width/4, 0, Math.PI*2);
    ctx.fill();
  } else if (e.type === 'boss') {
    ctx.fillStyle = 'rgba(255,80,120,0.92)';
    ctx.beginPath();
    ctx.arc(0, 0, e.width/2, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,180,200,0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, e.width/3, 0, Math.PI*2);
    ctx.fill();

    // Boss HP bar
    const barW = 110, barH = 8;
    const barX = -barW/2, barY = -e.height/2 - 16;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(barX, barY, barW, barH);

    const ratio = Math.max(0, e.hp) / (e.maxHp || 120);
    ctx.fillStyle = 'rgba(255,100,140,0.92)';
    ctx.fillRect(barX, barY, barW * ratio, barH);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(barX, barY, barW, barH);
  } else {
    ctx.fillStyle = 'rgba(140,200,255,0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, e.width/2, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,240,255,0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, e.width/4, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.restore();
}

// ===== Fade / Restart Animation =====
function updateFade(dt) {
  // 防呆：沒有 game 或沒有 fade 物件就不跑
  if (!game || !game.fade || game.fade.dir === 0) return;

  // 淡入淡出速度（可調）
  const speed = 0.0022;

  // 更新透明度
  game.fade.alpha += game.fade.dir * speed * dt;

  // 夾在 0 ~ 1 之間，避免超出導致卡住
  game.fade.alpha = Math.max(0, Math.min(1, game.fade.alpha));

  // 到達終點時停止
  if (
    (game.fade.dir < 0 && game.fade.alpha === 0) ||
    (game.fade.dir > 0 && game.fade.alpha === 1)
  ) {
    game.fade.dir = 0;

    // 🔥 如果之後你想接動畫完成後的事件（例如顯示升級視窗）
    if (typeof game.fade.onComplete === 'function') {
      game.fade.onComplete();
      game.fade.onComplete = null; // 用完清掉，避免重複觸發
    }
  }
}

}

function startRestartFade() {
  // 先淡出到黑，再 initGame 淡入
  game.fade.alpha = 0;
  game.fade.dir = +1;

  setTimeout(() => {
    initGame();
  }, 420);
}

// ===== Start =====
// ===== Start =====
// 讀取高分與歷史紀錄，初始化遊戲並顯示標題畫面
loadHighScore();
loadScoreHistory();
initGame();
game.running = false;
showStartScreen();
requestAnimationFrame(loop);
