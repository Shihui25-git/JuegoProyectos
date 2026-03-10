// ECO-SORT CHALLENGE - Lógica del Juego (Encapsulado)
const EcoSortGame = (() => {
    let canvas, ctx;

    function initCanvas() {
        if (!canvas) {
            canvas = document.getElementById('gameCanvas');
            if (canvas) ctx = canvas.getContext('2d');
        }
        return !!ctx;
    }

    // --- CONSTANTES ---
    const PLAYER_WIDTH = 80;
    const PLAYER_HEIGHT = 60;
    const ITEM_SIZE = 55;
    const INITIAL_TIME = 120;

    const LEVEL_CONFIG = {
        1: {
            targetScore: 15, time: 60, fallSpeed: 2.5, itemFrequency: 50, hazardFrequency: 150,
            theme: {
                name: "COSTA", skyTop: '#01579B', skyBottom: '#0A97D9', ground: '#003060', player: '#90CAF9',
                goodIcons: ["🥤", "🧴", "📦", "🗑️", "🛢️"], goodIconColor: '#00ff41', badIcons: ["🐟", "🐬", "🐙", "🐢"]
            }
        }
    };

    let currentLevel = 1;
    let currentLevelConfig = LEVEL_CONFIG[1];
    let gameState = { running: false, score: 0, lives: 4, playerX: 360, items: [], timeRemaining: INITIAL_TIME, frameCount: 0 };
    let keys = { ArrowLeft: false, ArrowRight: false, a: false, d: false };

    class Player {
        constructor() { this.width = PLAYER_WIDTH; this.height = PLAYER_HEIGHT; this.y = 330; this.speed = 14; }
        update() {
            if (keys.ArrowLeft || keys.a) gameState.playerX -= this.speed;
            if (keys.ArrowRight || keys.d) gameState.playerX += this.speed;

            if (gameState.playerX < 0) gameState.playerX = 0;
            if (gameState.playerX > 800 - this.width) gameState.playerX = 800 - this.width;
        }
        draw() {
            const theme = currentLevelConfig.theme;
            ctx.save();
            ctx.translate(gameState.playerX, this.y);
            ctx.fillStyle = theme.player;
            ctx.beginPath(); ctx.roundRect(0, 5, this.width, this.height - 10, [30, 30, 10, 10]); ctx.fill();
            ctx.fillStyle = '#1a365d'; ctx.beginPath(); ctx.arc(this.width / 2, 25, 15, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
        }
    }

    class FallingItem {
        constructor(isHazard = false) {
            this.width = ITEM_SIZE; this.height = ITEM_SIZE;
            this.x = Math.random() * (800 - this.width); this.y = -50;
            this.isHazard = isHazard; this.rotation = 0; this.rotationSpeed = Math.random() * 0.1 - 0.05;
            const icons = isHazard ? currentLevelConfig.theme.badIcons : currentLevelConfig.theme.goodIcons;
            this.icon = icons[Math.floor(Math.random() * icons.length)];
        }
        update() { this.y += currentLevelConfig.fallSpeed; this.rotation += this.rotationSpeed; }
        draw() {
            ctx.save(); ctx.translate(this.x + this.width / 2, this.y + this.height / 2); ctx.rotate(this.rotation);
            ctx.shadowBlur = 15;
            if (this.isHazard) {
                ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
                ctx.fillStyle = '#ff4d4d';
            } else {
                ctx.shadowColor = 'rgba(0, 255, 0, 0.8)';
                ctx.fillStyle = currentLevelConfig.theme.goodIconColor;
            }
            ctx.font = "30px Arial"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.icon, 0, 0);
            ctx.shadowBlur = 0; // reset
            ctx.restore();
        }
    }

    const player = new Player();

    function setLevel(level) {
        currentLevel = level;
        currentLevelConfig = LEVEL_CONFIG[level];
        const scoreLabel = document.getElementById('score-label');
        if (scoreLabel) scoreLabel.innerText = `LIMPIEZA:`;
        const scoreGoal = document.getElementById('score-goal');
        if (scoreGoal) scoreGoal.innerText = ` / ${currentLevelConfig.targetScore} ptos`;
    }

    function initMenu() {
        if (!initCanvas()) return;
        gameState.running = false;

        ctx.clearRect(0, 0, 800, 400);
        drawBackground();
        player.draw(); // Draw player on the start screen
    }

    function startGame() {
        if (!initCanvas()) return;
        gameState = { running: true, score: 0, lives: 4, playerX: 360, items: [], timeRemaining: currentLevelConfig.time, frameCount: 0 };
        document.getElementById('game-overlay').classList.add('hidden');
        loop();
    }

    function loop() {
        if (!gameState.running) return;
        gameState.frameCount++;
        ctx.clearRect(0, 0, 800, 400);

        // Adjust difficulty dynamically based on score
        if (gameState.score >= 10) {
            currentLevelConfig.fallSpeed = 5.5;  // Fast
            currentLevelConfig.itemFrequency = 30;
            currentLevelConfig.hazardFrequency = 80;
        } else if (gameState.score >= 5) {
            currentLevelConfig.fallSpeed = 4.0;  // Medium
            currentLevelConfig.itemFrequency = 40;
            currentLevelConfig.hazardFrequency = 100;
        } else {
            currentLevelConfig.fallSpeed = 2.5;  // Slow
            currentLevelConfig.itemFrequency = 50;
            currentLevelConfig.hazardFrequency = 150;
        }

        drawBackground();
        player.update();
        player.draw();

        if (gameState.frameCount % currentLevelConfig.itemFrequency === 0) gameState.items.push(new FallingItem(false));
        if (gameState.frameCount % currentLevelConfig.hazardFrequency === 0) gameState.items.push(new FallingItem(true));
        for (let item of gameState.items) { item.update(); item.draw(); }
        checkCollisions();
        updateHUD();
        requestAnimationFrame(loop);
    }

    function checkCollisions() {
        for (let i = 0; i < gameState.items.length; i++) {
            let item = gameState.items[i];
            const collision = (item.x < gameState.playerX + PLAYER_WIDTH && item.x + ITEM_SIZE > gameState.playerX && item.y < player.y + PLAYER_HEIGHT && item.y + ITEM_SIZE > player.y);
            if (collision) {
                if (item.isHazard) {
                    gameState.lives--;
                    gameState.score = Math.max(0, gameState.score - 1);
                    flashScreen('rgba(255, 0, 0, 0.3)');
                } else {
                    gameState.score += 1;
                    gameState.timeRemaining += 2;
                    flashScreen('rgba(0, 255, 0, 0.2)');
                }
                gameState.items.splice(i, 1); i--;
            } else if (item.y > 400) { gameState.items.splice(i, 1); i--; }
        }
    }

    function updateHUD() {
        if (gameState.frameCount % 60 === 0) gameState.timeRemaining--;
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.innerText = Math.floor(gameState.score);
        const livesEl = document.getElementById('lives');
        if (livesEl) livesEl.innerText = gameState.lives;
        const timeEl = document.getElementById('time');
        if (timeEl) {
            const minutes = Math.floor(gameState.timeRemaining / 60);
            const seconds = gameState.timeRemaining % 60;
            timeEl.innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        if (gameState.timeRemaining <= 0 || gameState.lives <= 0) endGame(false);
        if (gameState.score >= currentLevelConfig.targetScore) endGame(true);
    }

    function endGame(win) {
        gameState.running = false;
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        const title = overlay.querySelector('h3');
        const msg = overlay.querySelector('p');
        if (win) {
            title.innerText = "¡OCÉANO LIMPIO!"; title.style.color = "#00ff41";
            msg.innerText = "¡Felicidades! Se acabó la partida.\nVolviendo al Arcade...";
        } else {
            title.innerText = "FIN DE MISIÓN"; title.style.color = "#ff0000";
            msg.innerText = "Demasiados errores de recogida.\nVolviendo al Arcade...";
        }

        setTimeout(() => {
            if (window.showGameMenu) window.showGameMenu();
        }, 3000);
    }

    function drawBackground() {
        const theme = currentLevelConfig.theme;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, theme.skyTop); gradient.addColorStop(1, theme.skyBottom);
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, 800, 400);
        ctx.fillStyle = theme.ground; ctx.fillRect(0, 380, 800, 20);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        for (let i = 0; i < 15; i++) {
            ctx.beginPath();
            const x = (100 + i * 80 + Math.sin(gameState.frameCount / 50 + i) * 30) % 800;
            const y = (gameState.frameCount * 2 + i * 100) % 400;
            ctx.arc(x, 400 - y, 5 + (i % 5), 0, Math.PI * 2); ctx.fill();
        }
    }

    function flashScreen(color) {
        const container = document.querySelector('.game-container');
        if (!container) return;
        container.style.backgroundColor = color;
        setTimeout(() => { container.style.backgroundColor = '#000'; }, 100);
    }

    // Input global listener restricted to while EcoSort is active
    window.addEventListener('keydown', (e) => {
        if (!gameState.running) {
            if (e.key === 'Enter' && window.currentGameMode === 'eco' && !document.getElementById('game-container-panel').classList.contains('hidden')) {
                startGame();
            }
            return;
        }
        if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
        else if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
        else if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false;
    });

    return {
        start: startGame, initMenu: initMenu, setLevel: setLevel, stop: () => {
            gameState.running = false;
            keys = { ArrowLeft: false, ArrowRight: false, a: false, d: false }; // reset keys on stop
        }
    };
})();

window.setLevel = EcoSortGame.setLevel;
window.startGame = EcoSortGame.start;
window.EcoSortGame = EcoSortGame;

