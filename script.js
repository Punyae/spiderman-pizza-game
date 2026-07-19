let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');


// ASSET LOADING

let playerSprite = new Image();
playerSprite.src = 'assets/player.png'; 

let coinSprite = new Image();
coinSprite.src = 'assets/coin.png'; 

let enemySprite = new Image();
enemySprite.src = 'assets/enemy.png'; 

let projectileSprite = new Image();
projectileSprite.src = 'assets/projectile.png'; 

let backgroundSprite = new Image();
backgroundSprite.src = 'assets/background.png'; 

let coinSound = new Audio('assets/collect.mp3'); 


// GAME STATE VARIABLES

let playerX, playerY;
let playerSize = 45;
let playerSpeed = 4;

let coinX, coinY;
let coinSize = 30;
let gameScore = 0;
let isGameOver = false;

let timeLeft; 
let gameClockTimer; 

let enemyX, enemyY;
let enemySize = 40;
let enemySpeed;       
let enemyFireRate;    
let enemyFireCooldown = 0;

let enemyBullets = [];
let bulletSpeed = 6;
let bulletSize = 28; 

let keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false
};


// INITIALIZATION ENGINE

function initGame() {
    playerX = 180;
    playerY = 180;
    
    enemyX = 20;
    enemyY = 20;
    enemySpeed = 1.2;     // Reset to standard starting speed
    enemyFireRate = 90;    // Reset to firing roughly every 1.5 seconds
    
    gameScore = 0;
    timeLeft = 20;
    isGameOver = false;
    enemyFireCooldown = 0;
    enemyBullets = []; 
    
    coinX = Math.floor(Math.random() * (canvas.width - coinSize));
    coinY = Math.floor(Math.random() * (canvas.height - coinSize));
    
    clearInterval(gameClockTimer);
    gameClockTimer = setInterval(countdownClock, 1000);
}


// INPUT LISTENERS

window.addEventListener('keydown', function(event) {
    if (event.key in keys) { keys[event.key] = true; }
    if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
    }
    
    if (isGameOver && (event.key === 'r' || event.key === 'R')) {
        initGame();
    }
});

window.addEventListener('keyup', function(event) {
    if (event.key in keys) { keys[event.key] = false; }
});


// CORE MECHANICS FUNCTIONS

function countdownClock() {
    if (isGameOver) return;
    timeLeft -= 1;
    if (timeLeft <= 0) {
        timeLeft = 0;
        isGameOver = true;
        clearInterval(gameClockTimer);
    }
}

function shootEnemyBullet() {
    let startX = enemyX + enemySize / 2 - bulletSize / 2;
    let startY = enemyY + enemySize / 2 - bulletSize / 2;
    
    let diffX = playerX - enemyX;
    let diffY = playerY - enemyY;
    let fireDir = 'down';

    if (Math.abs(diffX) > Math.abs(diffY)) {
        fireDir = diffX > 0 ? 'right' : 'left';
    } else {
        fireDir = diffY > 0 ? 'down' : 'up';
    }

    enemyBullets.push({ x: startX, y: startY, dir: fireDir });
}


// MAIN ENGINE LOOP (~60 FPS)

setInterval(gameLoop, 16);

function gameLoop() {
    if (isGameOver) {
        drawGameOverScreen();
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updatePlayerMovement();
    updateBullets();
    updateEnemyAI();
    checkCollisions();

    // Render Layer Graphics
    ctx.drawImage(backgroundSprite, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(coinSprite, coinX, coinY, coinSize, coinSize);
    ctx.drawImage(playerSprite, playerX, playerY, playerSize, playerSize);
    ctx.drawImage(enemySprite, enemyX, enemyY, enemySize, enemySize);

    // Render Projectiles
    for (let i = 0; i < enemyBullets.length; i++) {
        let b = enemyBullets[i];
        ctx.drawImage(projectileSprite, b.x, b.y, bulletSize, bulletSize);
    }

    // Draw HUD Dashboard
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.fillText("Score: " + gameScore, 10, 20);
    
    ctx.fillStyle = timeLeft <= 5 ? 'red' : 'white';
    ctx.fillText("Time Left: " + timeLeft + "s", canvas.width - 120, 20);
}


// PHYSICS & COMPUTE LOGIC

function updatePlayerMovement() {
    if (keys.w || keys.ArrowUp) playerY -= playerSpeed;
    if (keys.s || keys.ArrowDown) playerY += playerSpeed;
    if (keys.a || keys.ArrowLeft) playerX -= playerSpeed;
    if (keys.d || keys.ArrowRight) playerX += playerSpeed;

    if (playerX < 0) playerX = 0;
    if (playerX > canvas.width - playerSize) playerX = canvas.width - playerSize;
    if (playerY < 0) playerY = 0;
    if (playerY > canvas.height - playerSize) playerY = canvas.height - playerSize;
}

function updateBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let b = enemyBullets[i];
        if (b.dir === 'up') b.y -= bulletSpeed;
        if (b.dir === 'down') b.y += bulletSpeed;
        if (b.dir === 'left') b.x -= bulletSpeed;
        if (b.dir === 'right') b.x += bulletSpeed;
        
        if (b.x < -bulletSize || b.x > canvas.width || b.y < -bulletSize || b.y > canvas.height) {
            enemyBullets.splice(i, 1);
        }
    }
}

function updateEnemyAI() {
    if (enemyX < playerX) enemyX += enemySpeed;
    else if (enemyX > playerX) enemyX -= enemySpeed;

    if (enemyY < playerY) enemyY += enemySpeed;
    else if (enemyY > playerY) enemyY -= enemySpeed;

    enemyFireCooldown++;
    if (enemyFireCooldown >= enemyFireRate) {
        shootEnemyBullet();
        enemyFireCooldown = 0;
    }
}

function checkCollisions() {
    // 1. Player vs Coin
    if (playerX < coinX + coinSize && playerX + playerSize > coinX &&
        playerY < coinY + coinSize && playerY + playerSize > coinY) {
        
        gameScore += 1;
        timeLeft += 3; 
        
        // SCALING DIFFICULTY LOGIC
        enemySpeed += 0.2; // Accelerate the tracker
        
        // Increase fire rate by shortening cooldown frame limit (Cap at 30 frames / 0.5s max speed)
        if (enemyFireRate > 30) {
            enemyFireRate -= 6; 
        }

        coinSound.currentTime = 0; 
        coinSound.play();          
        coinX = Math.floor(Math.random() * (canvas.width - coinSize));
        coinY = Math.floor(Math.random() * (canvas.height - coinSize));
    }

    // 2. Player vs Enemy
    if (playerX < enemyX + enemySize && playerX + playerSize > enemyX &&
        playerY < enemyY + enemySize && playerY + playerSize > enemyY) {
        isGameOver = true;
        clearInterval(gameClockTimer);
    }

    // 3. Enemy Bullets vs Player Body
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let eb = enemyBullets[i];
        if (eb.x < playerX + playerSize && eb.x + bulletSize > playerX &&
            eb.y < playerY + playerSize && eb.y + bulletSize > playerY) {
            enemyBullets.splice(i, 1);
            isGameOver = true;
            clearInterval(gameClockTimer);
        }
    }
}

function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.font = '18px Arial';
    ctx.fillText("Final Score: " + gameScore, canvas.width / 2, canvas.height / 2 + 15);
    
    ctx.fillStyle = '#4deeea'; 
    ctx.fillText("Press 'R' to Play Again", canvas.width / 2, canvas.height / 2 + 55);
    ctx.textAlign = 'left';
}

initGame();