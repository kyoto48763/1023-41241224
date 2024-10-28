const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let paddleHeight = 20, paddleWidth = 100;
let paddleX, ballX, ballY, ballSpeedX, ballSpeedY, ballRadius = 10;
let brickRowCount, brickColumnCount, bricks, score, rightPressed, leftPressed;
let gameOver = false, lives = 3;  // 新增 lives 變數來管理生命數量
let ballTrail = [];
let currentDifficulty; // 新增變數以儲存當前難度
let timer = 120; // 設定倒數時間為兩分鐘（120秒）
let countdownInterval; // 用於存儲計時器間隔
let currentTheme = 'night'; // 默認主題
let backgroundImage = new Image();
let particles = []; // 儲存粒子效果
let level = 0;
let paddleMoveUpDistance = 30; // 每次移動30像素，您可以設定為50像素
let isCooldown = false; // 是否處於冷卻時間
let cooldownTime = 2000; // 冷卻時間，單位為毫秒（此處為1秒）
let comboCount = 0;         // 追蹤連擊次數
let extraScore = 0;         // 累積的額外分數
const comboTimeLimit = 1000; // 連擊有效時間（毫秒）

let lastHitTime = Date.now(); // 上一次擊中磚塊的時間

const triggerZones = [
    { x: canvas.width / 4, y: canvas.height / 3, radius: 30 }, // 第一個觸發區域
    { x: (canvas.width / 4) * 3, y: canvas.height / 3, radius: 30 }, // 第二個觸發區域
    // 可以添加更多觸發區域
];

const levels = [
    { brickRowCount: 5, brickColumnCount: 8, hitPoints: 1 },
    { brickRowCount: 6, brickColumnCount: 10, hitPoints: 2 },
    { brickRowCount: 7, brickColumnCount: 12, hitPoints: 3 },
    // 添加更多關卡
];
const POWER_UP_TYPES = {
    TIME: 'time',
    EXTRA_BALL: 'extra_ball',
    PIERCING: 'piercing',
    SPLIT: 'split',
    COLOR_CHANGE: 'color_change'
};
const rewardScoreThreshold = 10; // 每隔 10 分觸發一次獎勵
let nextRewardScore = rewardScoreThreshold;
function updateTimer() {
    timeRemaining--; // 每秒減少一秒
    if (timeRemaining <= 0) {
        gameOver = true;
        alert("時間到！遊戲結束!");
        resetGame();
    }
    document.getElementById('timerDisplay').textContent = `時間: ${timeRemaining}s`; // 更新顯示
}

// 定期執行倒數計時
setInterval(updateTimer, 1000);

function checkForReward() {
    if ((score+extraScore) >= nextRewardScore) {
        nextRewardScore += rewardScoreThreshold; // 更新下一個獎勵分數門檻

        const reward = Math.random() < 0.5 ? 'extraTime' : 'extraLife'; // 隨機選擇獎勵

        if (reward === 'extraTime') {
            // 延長遊戲時間，例如延長 10 秒
            timer += 10;
            console.log("獎勵：延長遊戲時間 10 秒！");
        } else if (reward === 'extraLife') {
            // 增加一條生命
            lives += 1;
            console.log("獎勵：增加一條生命！");
        }
    }
}

function movePaddleUp() {
    // 設定擋板不超過畫布頂部
    if (canvas.height - paddleHeight > paddleHeight) {
        paddleHeight += paddleMoveUpDistance; // 向上移動擋板
    }
    setTimeout(() => {
        paddleHeight -= paddleMoveUpDistance;
    }, 500);
}

function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {  // 調整數量來控制粒子的密集程度
        particles.push({
            x: x,
            y: y,
            radius: Math.random() * 3 + 1, // 隨機大小
            color: color,
            speedX: (Math.random() - 0.5) * 6, // 隨機水平速度
            speedY: (Math.random() - 0.5) * 6, // 隨機垂直速度
            life: 30 // 設定粒子的生命週期
        });
    }
}
function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
        ctx.closePath();

        // 更新粒子位置和生命週期
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.life--;

        // 移除已過期的粒子
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function changeTheme() {
    const themeSelect = document.getElementById('themeSelect');
    currentTheme = themeSelect.value;
    
    if (currentTheme === 'night') {
        backgroundImage.src = 'background_night.jpg';
    } else if (currentTheme === 'forest') {
        backgroundImage.src = 'background_forest.jpg';
    }

    backgroundImage.onload = function() {
        draw(); // 確保背景更新
    };
}


function startGame(difficulty) {
    document.getElementById('difficultyMenu').style.display = 'none';
    canvas.style.display = 'block';
    
    ballX = canvas.width / 2;
    ballY = canvas.height - 30;
    score = 0;
    lives = 3;
    gameOver = false;
    rightPressed = false;
    leftPressed = false;
    paddleX = (canvas.width - paddleWidth) / 2;
    changeTheme(); // 呼叫主題切換
    currentDifficulty = difficulty;
    switch (difficulty) {
        case 'easy':
            brickRowCount = 5;
            brickColumnCount = 8;
            break;
        case 'medium':
            brickRowCount = 7;
            brickColumnCount = 10;
            break;
        case 'hard':
            brickRowCount = 9;
            brickColumnCount = 12;
            break;
    }
    timer = 120; // 重置倒數時間為兩分鐘

    // 設定倒數計時器
    countdownInterval = setInterval(() => {
        if (!gameOver) {
            timer--;
            if (timer <= 0) {
                gameOver = true;
                alert("時間到！遊戲結束！您的得分：" + score);
                resetGame();
            }
        }
    }, 1000);
    setBallSpeedAndBricks();
    initBricks(difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1);
    document.addEventListener("keydown", keyDownHandler);
    document.addEventListener("keyup", keyUpHandler);
    draw();
}
function drawTimer() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("Time: " + timer + "s", canvas.width / 2 - 30, 20);
}

function setLevelParameters(difficulty) {
    switch (difficulty) {
        case 'easy':
            levels[0].brickRowCount = 5;
            levels[0].brickColumnCount = 8;
            levels[0].hitPoints = 1;
            break;
        case 'medium':
            levels[1].brickRowCount = 6;
            levels[1].brickColumnCount = 10;
            levels[1].hitPoints = 2;
            break;
        case 'hard':
            levels[2].brickRowCount = 7;
            levels[2].brickColumnCount = 12;
            levels[2].hitPoints = 3;
            break;
    }
}

function setBallSpeedAndBricks() {
    switch (currentDifficulty) {
        case 'easy':
            ballSpeedX = 2;
            ballSpeedY = -2;
            break;
        case 'medium':
            ballSpeedX = 4;
            ballSpeedY = -4;
            break;
        case 'hard':
            ballSpeedX = 5;
            ballSpeedY = -5;
            break;
    }
    initBricks(levels[level].brickRowCount, levels[level].brickColumnCount, levels[level].hitPoints);
}

function initBricks(hitPoints) {
    const brickPadding = 5;
    const brickOffsetTop = 30;
    const brickOffsetLeft = 15;
    const brickWidth = (canvas.width - brickOffsetLeft * 2 - brickPadding * (brickColumnCount - 1)) / brickColumnCount;
    const brickHeight = (canvas.height / 2 - brickOffsetTop - brickPadding * (brickRowCount - 1)) / brickRowCount;

    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            const status = Math.min(hitPoints, Math.floor(Math.random() * 3) + 1);
            const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
            const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
            const hidden = Math.random() < 0.2; // 20% 磚塊為隱藏狀態，可根據需要調整機率
            bricks[c][r] = { x: brickX, y: brickY, width: brickWidth, height: brickHeight, status, hidden };
        }
    }
}


function nextLevel() {
    if (level < levels.length - 1) {
        level++;
        setBallSpeedAndBricks();
    } else {
        showVictoryAnimation();
    }
}
function initBricks(hitPoints) {
    const brickPadding = 5;
    const brickOffsetTop = 30;
    const brickOffsetLeft = 15;
    const brickWidth = (canvas.width - brickOffsetLeft * 2 - brickPadding * (brickColumnCount - 1)) / brickColumnCount;
    const brickHeight = (canvas.height / 2 - brickOffsetTop - brickPadding * (brickRowCount - 1)) / brickRowCount;

    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            const status = Math.min(hitPoints, Math.floor(Math.random() * 3) + 1);
            const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
            const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
            bricks[c][r] = { x: brickX, y: brickY, width: brickWidth, height: brickHeight, status };
        }
    }
}

function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status > 0 && ballX > b.x && ballX < b.x + b.width && ballY > b.y && ballY < b.y + b.height) {
                ballSpeedY = -ballSpeedY;
                b.status--;
                score++;
                checkForReward(); // 檢查是否應觸發獎勵
                // 檢查連擊是否在有效時間內
                if (Date.now() - lastHitTime < comboTimeLimit) {
                    comboCount++;
                } else {
                    comboCount = 1; // 超過連擊時間，重置計數器
                }

                // 更新上一次擊中的時間
                lastHitTime = Date.now();

                // 如果達到 3 次連擊，獲得額外分數
                if (comboCount >= 3) {
                    extraScore += comboCount * 2; // 每次連擊得額外分數
                    console.log(`Combo! 獲得 ${comboCount * 2} 額外分數`);
                }
                // 呼叫粒子效果
                createParticles(b.x + b.width / 2, b.y + b.height / 2, `rgb(${255 - 80 * b.status}, ${50 + 50 * b.status}, 100)`);

                if (score === brickRowCount * brickColumnCount && !gameOver) {
                    showVictoryAnimation();
                }
            }
        }
    }
}


function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const brick = bricks[c][r];
            if (brick.status > 0 && !brick.hidden) { // 僅顯示非隱藏磚塊
                ctx.beginPath();
                ctx.rect(brick.x, brick.y, brick.width, brick.height);
                ctx.fillStyle = `rgb(${255 - 80 * brick.status}, ${50 + 50 * brick.status}, 100)`;
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}


function drawBall() {
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}

function drawBallTrail() {
    ctx.fillStyle = "rgba(0, 149, 221, 0.1)";  // 半透明尾跡
    for (let i = 0; i < ballTrail.length; i++) {
        const pos = ballTrail[i];
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }
}



function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}

function drawScore() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("Score: " + (score+extraScore), 8, 20);
}


function drawLives() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("Lives: " + lives, canvas.width - 65, 20);  // 在畫面右上角顯示生命數
}

function keyDownHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = true;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = true;
    } else if (e.key === "Up" || e.key === "ArrowUp") {
        if (!isCooldown) { // 檢查是否處於冷卻狀態
            movePaddleUp();
            isCooldown = true; // 設置為冷卻狀態
            setTimeout(() => {
                isCooldown = false; // 冷卻結束
            }, cooldownTime); // 設置冷卻時間
        }
    }
}

function keyUpHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
    else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
}

function movePaddle() {
    if (rightPressed && paddleX < canvas.width - paddleWidth) paddleX += 10;
    if (leftPressed && paddleX > 0) paddleX -= 10;
}

function moveBall() {
    // 檢查是否進入觸發區域
    for (let zone of triggerZones) {
        const dx = ballX - zone.x;
        const dy = ballY - zone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < zone.radius) {
            // 顯示所有隱藏磚塊
            for (let c = 0; c < brickColumnCount; c++) {
                for (let r = 0; r < brickRowCount; r++) {
                    if (bricks[c][r].hidden) {
                        bricks[c][r].hidden = false;
                    }
                }
            }
        }
    }
    // 添加當前球的位置到尾跡陣列
    ballTrail.push({ x: ballX, y: ballY });
    // 限制尾跡的數量
    if (ballTrail.length > 20) {  // 調整此數字來增加或減少尾跡長度
        ballTrail.shift();
    }

    ballX += ballSpeedX;
    ballY += ballSpeedY;

    if (ballX + ballRadius > canvas.width || ballX - ballRadius < 0) ballSpeedX = -ballSpeedX;
    if (ballY - ballRadius < 0) ballSpeedY = -ballSpeedY;

    if (ballY + ballRadius > canvas.height - paddleHeight &&
        ballX > paddleX && ballX < paddleX + paddleWidth) {
        ballSpeedY = -ballSpeedY;
    } else if (ballY + ballRadius > canvas.height) {
        lives--;
        if (lives <= 0) {
            gameOver = true;
            alert("遊戲結束!\n您的得分：" + score);
            resetGame();
        } else {
            resetBall(currentDifficulty);
        }
    }
}


function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height - 30;
    switch (currentDifficulty) {
        case 'easy':
            ballSpeedX = 2;
            ballSpeedY = -2;
            break;
        case 'medium':
            ballSpeedX = 4;
            ballSpeedY = -4;
            break;
        case 'hard':
            ballSpeedX = 5;
            ballSpeedY = -5;
            break;
    }
    paddleX = (canvas.width - paddleWidth) / 2;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 繪製背景圖片
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    
    drawBricks();
    drawBallTrail();
    drawBall();
    drawPaddle();
    drawScore();
    drawTimer(); // 顯示倒數計時
    drawLives();
    collisionDetection();
    drawParticles(); // 繪製粒子效果
    moveBall();
    movePaddle();

    if (!gameOver) requestAnimationFrame(draw);
}




function showVictoryAnimation() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除畫布
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)"; // 半透明背景
    ctx.fillRect(0, 0, canvas.width, canvas.height); // 覆蓋整個畫布

    ctx.font = "48px Arial";
    ctx.fillStyle = "#28a745"; // 設置文字顏色
    ctx.fillText("恭喜過關!", canvas.width / 2 - 100, canvas.height / 2);
    ctx.font = "24px Arial";
    ctx.fillText("得分: " + score, canvas.width / 2 - 50, canvas.height / 2 + 50);
    setTimeout(resetGame, 2000); // 2秒後重置遊戲
}


function resetGame() {
    clearInterval(countdownInterval); // 清除計時器
    document.getElementById('difficultyMenu').style.display = 'block';
    canvas.style.display = 'none';
    document.removeEventListener("keydown", keyDownHandler);
    document.removeEventListener("keyup", keyUpHandler);
    // 重新初始化所有變數
    lives = 3; // 重置生命數
    score = 0; // 重置分數
}

