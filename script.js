const container = document.getElementById('game-container');
const player = document.getElementById('player');
const scoreVal = document.getElementById('score-val');
const livesVal = document.getElementById('lives-val');
const levelVal = document.getElementById('level-val');
const goalVal = document.getElementById('goal-val');
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const finalScore = document.getElementById('final-score');

const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');

// Променливи за състоянието на играта
const impossibleGoal = 1000000;
const hardCap = 4500;

let score = 0;
let lives = 3;
let level = 1;
let shield = 0;
let combo = 0;
let gameRunning = false;
let playerX = 170;
const playerSpeed = 9;
let items = [];
let animationFrameId;
let gameTime = 0;

// Контроли с клавиатура
let keys = {
    ArrowLeft: false,
    ArrowRight: false,
    KeyA: false,
    KeyD: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

// Мобилни контроли
let moveLeft = false;
let moveRight = false;

leftBtn.addEventListener('mousedown', () => moveLeft = true);
leftBtn.addEventListener('mouseup', () => moveLeft = false);
leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); moveLeft = true; });
leftBtn.addEventListener('touchend', () => moveLeft = false);

rightBtn.addEventListener('mousedown', () => moveRight = true);
rightBtn.addEventListener('mouseup', () => moveRight = false);
rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); moveRight = true; });
rightBtn.addEventListener('touchend', () => moveRight = false);

container.addEventListener('mousemove', (e) => {
    if (!gameRunning) return;
    const rect = container.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    playerX = mouseX - 30;
    clampPlayer();
});

function clampPlayer() {
    const maxW = container.clientWidth - player.clientWidth;
    if (playerX < 0) playerX = 0;
    if (playerX > maxW) playerX = maxW;
    player.style.left = playerX + 'px';
}

function updateHUD() {
    scoreVal.textContent = score;
    livesVal.textContent = lives;
    levelVal.textContent = level;
    goalVal.textContent = impossibleGoal.toLocaleString('bg-BG');
}

function triggerHitEffect() {
    player.classList.add('hit');
    clearTimeout(triggerHitEffect.timeoutId);
    triggerHitEffect.timeoutId = setTimeout(() => {
        player.classList.remove('hit');
    }, 150);
}

function updateBackground() {
    const stage = Math.min(3, Math.floor(score / 100));
    const palettes = [
        'linear-gradient(to bottom, #0d2f1d, #1a1a1a)',
        'linear-gradient(to bottom, #3a1c00, #1a0f00)',
        'linear-gradient(to bottom, #4b3a00, #1a1000)',
        'linear-gradient(to bottom, #102b4f, #0d1536)'
    ];

    document.body.style.background = palettes[stage] || palettes[palettes.length - 1];
    const containerGradients = [
        'linear-gradient(to bottom, #0d4a2a, #1b7d46, #2fbf67)',
        'linear-gradient(to bottom, #4a2000, #7a2a00, #d63a00)',
        'linear-gradient(to bottom, #5c3a00, #9a6b00, #f2c200)',
        'linear-gradient(to bottom, #123d73, #245fba, #4eb3ff)'
    ];

    container.style.background = containerGradients[stage] || containerGradients[containerGradients.length - 1];
}

function flashColorOnMoney() {
    const colors = [
        '#1b7d46',
        '#d63a00',
        '#f2c200',
        '#4eb3ff'
    ];

    const colorIndex = Math.min(3, Math.floor(score / 100));
    container.style.boxShadow = '0 0 25px ' + colors[colorIndex];
    container.style.borderColor = colors[colorIndex];

    clearTimeout(flashColorOnMoney.timeoutId);
    flashColorOnMoney.timeoutId = setTimeout(() => {
        container.style.boxShadow = '0 10px 30px rgba(255, 119, 0, 0.4)';
        container.style.borderColor = '#ff7700';
    }, 150);
}

function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    shield = 0;
    combo = 0;
    gameTime = 0;
    updateBackground();
    updateHUD();
    
    items.forEach(item => item.element.remove());
    items = [];

    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    
    gameRunning = true;
    playerX = 170;
    clampPlayer();
    
    lastSpawnTime = performance.now();
    animationFrameId = requestAnimationFrame(updateGame);
}

let lastSpawnTime = 0;

function updateGame(timestamp) {
    if (!gameRunning) return;

    gameTime += 0.016;
    level = Math.min(10, 1 + Math.floor(gameTime / 12));
    updateBackground();
    updateHUD();

    if (keys.ArrowLeft || keys.KeyA || moveLeft) {
        playerX -= playerSpeed;
    }
    if (keys.ArrowRight || keys.KeyD || moveRight) {
        playerX += playerSpeed;
    }
    clampPlayer();

    const scoreSpeedBoost = Math.floor(score / 100);
    const currentSpawnInterval = Math.max(240, 1500 - (gameTime * 30) - (scoreSpeedBoost * 140) - (level * 18));

    if (timestamp - lastSpawnTime > currentSpawnInterval) {
        spawnItem();
        lastSpawnTime = timestamp;
    }

    for (let i = items.length - 1; i >= 0; i--) {
        let item = items[i];
        item.y += item.speed + (gameTime * 0.14) + (level * 0.18);
        item.element.style.top = item.y + 'px';

        const pRect = player.getBoundingClientRect();
        const iRect = item.element.getBoundingClientRect();

        if (
            iRect.left < pRect.right &&
            iRect.right > pRect.left &&
            iRect.bottom > pRect.top &&
            iRect.top < pRect.bottom
        ) {
            if (item.type === 'bomb') {
                lives--;
                triggerHitEffect();
                combo = 0;
                updateHUD();
                if (lives <= 0) {
                    endGame();
                    return;
                }
            } else if (item.type === 'shield') {
                shield++;
                score += 40;
            } else if (item.type === 'bonus') {
                score += item.points + Math.min(50, combo * 5);
                combo++;
                flashColorOnMoney();
            } else {
                score += item.points + Math.min(30, combo * 3);
                combo++;
                flashColorOnMoney();
            }

            if (score > hardCap) {
                score = hardCap;
            }

            if (item.type !== 'bomb') {
                scoreVal.textContent = score;
            }

            item.element.remove();
            items.splice(i, 1);
            continue;
        }

        if (item.y > container.clientHeight) {
            if (item.type !== 'bomb') {
                combo = 0;
            }
            item.element.remove();
            items.splice(i, 1);
        }
    }

    if (gameRunning) {
        animationFrameId = requestAnimationFrame(updateGame);
    }
}

function spawnItem() {
    const itemEl = document.createElement('div');
    itemEl.classList.add('falling-item');

    const rand = Math.random();
    let type = 'money';
    let points = 10;
    let speed = 5 + Math.random() * 4;
    let emoji = '💵';

    if (rand < 0.18) {
        type = 'bomb';
        emoji = '💣';
        speed = 8 + Math.random() * 4;
    } else if (rand < 0.28) {
        type = 'shield';
        emoji = '🛡️';
        speed = 6 + Math.random() * 3;
        points = 0;
    } else if (rand < 0.62) {
        type = 'bag';
        emoji = '💰';
        points = 30;
        speed = 7 + Math.random() * 3;
    } else if (rand < 0.82) {
        type = 'bonus';
        emoji = '💎';
        points = 60;
        speed = 6 + Math.random() * 3;
    } else {
        type = 'bill';
        emoji = '💵';
        points = 15;
    }

    itemEl.innerHTML = emoji;

    const size = type === 'bomb' ? 58 : 42;
    itemEl.style.width = size + 'px';
    itemEl.style.height = size + 'px';
    itemEl.style.fontSize = (type === 'bomb' ? 34 : 24) + 'px';

    const maxLeft = container.clientWidth - size;
    const randomX = Math.floor(Math.random() * maxLeft);

    itemEl.style.left = randomX + 'px';
    itemEl.style.top = '-40px';

    container.appendChild(itemEl);

    items.push({
        element: itemEl,
        y: -40,
        speed: speed,
        type: type,
        points: points,
        size: size
    });
}

function endGame() {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    finalScore.textContent = score;
    gameoverScreen.classList.remove('hidden');
    startScreen.classList.add('hidden');
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);