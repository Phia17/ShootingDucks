const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

canvas.width = 1000;
canvas.height = 600;
canvas.style.width = "100%";
canvas.style.height = "auto";
ctx.imageSmoothingEnabled = false;

const duckImgs = ["img/green.png", "img/yellow.png"].map(src => {
  let img = new Image();
  img.src = src;
  return img;
});

const pistolSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60">
  <rect x="10" y="20" width="70" height="20" fill="#777" stroke="#000" stroke-width="2"/>
  <rect x="70" y="25" width="35" height="10" fill="#555" stroke="#000" stroke-width="2"/>
  <rect x="30" y="40" width="20" height="15" fill="#8B4513" stroke="#000" stroke-width="2"/>
</svg>`;
const pistolImg = new Image();
pistolImg.src = "data:image/svg+xml;base64," + btoa(pistolSVG);

let score1, score2, player1, player2, targets;
let gameLoop;

function initGame() {
  score1 = 0; score2 = 0;
  score1El.innerText = score1;
  score2El.innerText = score2;

  player1 = { x: canvas.width / 3, y: canvas.height - 70, angle: -Math.PI / 2, bullets: [] };
  player2 = { x: 2 * canvas.width / 3, y: canvas.height - 70, angle: -Math.PI / 2, bullets: [] };

  targets = [];
  const rows = 4;
  const cols = 10;
  const tW = 70;
  const tH = 70;
  const gapX = 20;
  const shelfHeights = [180, 320];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const baseX = 100 + c * (tW + gapX);
      const offsetX = (Math.random() - 0.5) * 30;
      const baseY = shelfHeights[r] + 20;
      const offsetY = (Math.random() - 0.5) * 15;
      const speed = (r === 0 ? 1.5 : 2) * (Math.random() < 0.5 ? -1 : 1);

      targets.push({
        x: baseX + offsetX,
        y: baseY + offsetY,
        width: tW,
        height: tH,
        dx: speed,
        alive: true,
        img: duckImgs[(r + c) % duckImgs.length],
        hit: false,
        dy: 0
      });
    }
  }
}

function drawBackground() {
  const w = canvas.width, h = canvas.height;

  ctx.fillStyle = "#3396D3";
  ctx.fillRect(0, 0, w, h);

  const stripeWidth = 80;
  for (let i = 0; i <= w / stripeWidth + 2; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#d32f2f" : "#fff";
    ctx.beginPath();
    ctx.moveTo(i * stripeWidth, 0);
    ctx.lineTo((i + 1) * stripeWidth, 0);
    ctx.lineTo((i + 1) * stripeWidth - stripeWidth / 2, 80);
    ctx.lineTo(i * stripeWidth + stripeWidth / 2, 80);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#5d4037";
  ctx.fillRect(0, 160, w, 15);
  ctx.fillRect(0, 300, w, 15);

  const boothStripeWidth = 40;
  for (let i = 0; i <= w / boothStripeWidth + 2; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#d32f2f" : "#fff";
    ctx.fillRect(i * boothStripeWidth, h - 150, boothStripeWidth, 150);
  }
}

function drawTargets() {
  targets.forEach(t => {
    if (!t.alive) return;
    ctx.save();
    if (t.hit) {
      ctx.translate(t.x + t.width / 2, t.y + t.height / 2);
      ctx.rotate(Math.min(1, t.dy / 10));
      ctx.drawImage(t.img, -t.width / 2, -t.height / 2, t.width, t.height);
    } else {
      ctx.drawImage(t.img, t.x, t.y, t.width, t.height);
    }
    ctx.restore();
  });
}

function drawGun(player) {
  const w = 120, h = 60;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.drawImage(pistolImg, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawBullets(player, color) {
  ctx.fillStyle = color;
  player.bullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 8, 4, 12));
}

function moveTargets() {
  targets.forEach(t => {
    if (!t.alive) return;
    if (!t.hit) {
      t.x += t.dx;
      if (t.x < 60 || t.x + t.width > canvas.width - 60) t.dx *= -1;
    } else {
      t.dy += 0.4;
      t.y += t.dy;
      if (t.y > canvas.height) t.alive = false;
    }
  });
}

function moveBullets(player) {
  for (let i = player.bullets.length - 1; i >= 0; i--) {
    const b = player.bullets[i];
    b.x += b.vx; b.y += b.vy;
    if (b.y < -20 || b.x < -20 || b.x > canvas.width + 20) player.bullets.splice(i, 1);
  }
}

function checkHits(player, isP1) {
  for (let bi = player.bullets.length - 1; bi >= 0; bi--) {
    const b = player.bullets[bi];
    for (let ti = 0; ti < targets.length; ti++) {
      const t = targets[ti];
      if (!t.alive || t.hit) continue;
      if (b.x > t.x && b.x < t.x + t.width && b.y > t.y && b.y < t.y + t.height) {
        t.hit = true; t.dy = -5;
        player.bullets.splice(bi, 1);
        if (isP1) {
          score1 += 10; score1El.innerText = score1;
          if (score1 >= 100) declareWinner(1);
        } else {
          score2 += 10; score2El.innerText = score2;
          if (score2 >= 100) declareWinner(2);
        }
        break;
      }
    }
  }
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  moveTargets();
  drawTargets();
  drawBullets(player1, '#ff5252');
  moveBullets(player1);
  checkHits(player1, true);
  drawBullets(player2, '#40c4ff');
  moveBullets(player2);
  checkHits(player2, false);
  drawGun(player1);
  drawGun(player2);
}

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const dx = mx - player1.x;
  const dy = my - player1.y;
  player1.x = mx;
  player1.angle = Math.atan2(dy, dx);
});

canvas.addEventListener('click', () => shoot(player1));

document.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    shoot(player1);
  }
  if (e.code === 'ArrowLeft') player2.x -= 10;
  if (e.code === 'ArrowRight') player2.x += 10;
  if (e.code === 'ArrowUp') player2.angle -= 0.1;
  if (e.code === 'ArrowDown') player2.angle += 0.1;
  if (e.code === 'Enter') shoot(player2);
});

function shoot(player) {
  const speed = 9;
  const vx = Math.cos(player.angle) * speed;
  const vy = Math.sin(player.angle) * speed;
  player.bullets.push({ x: player.x, y: player.y, vx, vy });
}

const WINNING_SCORE = 100;
let gameWon = false;

function declareWinner(playerNumber) {
  if (gameWon) return;
  gameWon = true;
  clearInterval(gameLoop);
  overlay.style.display = 'flex';

  const gifts = [
    { name: "Bunny", img: "img/Bunny.png" },
    { name: "Barbie", img: "img/Barbie.png" },
    { name: "Teddy", img: "img/Teddy.png" }
  ];

  overlay.innerHTML = `
    <div id="menu" style="
      background: #ded6d9;
      padding: 50px 60px;
      border-radius: 20px;
      max-width: 340px;
      font-family: 'Press Start 2P', monospace;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      color: black;">
      <h2 style="font-weight: bold; margin-bottom: 20px;">Player ${playerNumber} Wins! 🎉</h2>
      <p style="margin-bottom: 15px;">Choose your toy prize:</p>
      <div id="toyBoxes" style="display: flex; justify-content: center; gap: 15px;">
        <img class="toyBox" src="img/giftbox.png" style="width: 80px; cursor: pointer;" alt="Gift Box" />
        <img class="toyBox" src="img/giftbox.png" style="width: 80px; cursor: pointer;" alt="Gift Box" />
        <img class="toyBox" src="img/giftbox.png" style="width: 80px; cursor: pointer;" alt="Gift Box" />
      </div>
    </div>`;

  document.querySelectorAll('.toyBox').forEach(box => {
    box.addEventListener('click', () => {
      const randomGift = gifts[Math.floor(Math.random() * gifts.length)];

      box.src = randomGift.img;
      document.querySelectorAll('.toyBox').forEach(b => {
        if (b !== box) b.style.pointerEvents = 'none';
      });

      let score = (playerNumber === 1) ? score1 : score2;

      saveScore(playerNumber, score, randomGift.name);

      setTimeout(() => {
        overlay.innerHTML = `
          <div id="menu" style="
            background: #ded6d9;
            padding: 50px 60px;
            border-radius: 20px;
            max-width: 340px;
            font-family: 'Press Start 2P', monospace;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            color: black;">
            <h2 style="font-weight: bold; margin-bottom: 20px; color: red;">Congratulations!</h2>
            <p style="margin-bottom: 30px;">You won a ${randomGift.name}!</p>
            <button id="restartBtn" style="
              background: #cd7a6f;
              color: white;
              border: none;
              border-radius: 20px;
              padding: 15px 40px;
              font-size: 10px;
              font-weight: 600;
              cursor: pointer;
              user-select: none;
              box-shadow: 0 4px 6px rgba(205,122,111,0.8);
              transition: background 0.3s ease;
              font-family: 'Press Start 2P', monospace;">Play Again</button>
          </div>`;

        document.getElementById('restartBtn').addEventListener('click', () => {
          overlay.style.display = 'none';
          initGame();
          gameLoop = setInterval(loop, 1000 / 30);
          gameWon = false;
        });
      }, 1500);
    });
  });
}

function saveScore(playerNumber, score, gift) {
  fetch("http://127.0.0.1:8000/api/save-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      player_number: playerNumber,
      score: score,
      gift: gift
    })
  })
    .then(res => res.json())
    .then(data => console.log("Saved to Laravel:", data))
    .catch(err => console.error("Error saving:", err));
}

startBtn.addEventListener('click', () => {
  overlay.style.display = "none";
  canvas.style.filter = "none";
  initGame();
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(loop, 1000 / 30);
  restartBtn.style.display = "inline-block";
});

restartBtn.addEventListener('click', () => {
  initGame();
});
