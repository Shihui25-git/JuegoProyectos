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
            targetScore: 100, time: 60, fallSpeed: 3, itemFrequency: 40, hazardFrequency: 120,
            theme: {
                name: "COSTA", skyTop: '#01579B', skyBottom: '#0A97D9', ground: '#003060', player: '#90CAF9',
                goodIcons: ["🥤", "🧴", "📦", "🗑️", "🛢️"], goodIconColor: '#00ff41', badIcons: ["🐟", "🐬", "🐙", "🐢"]
            }
        },
        2: {
            targetScore: 250, time: 90, fallSpeed: 4, itemFrequency: 35, hazardFrequency: 100,
            theme: {
                name: "MAR ABIERTO", skyTop: '#003060', skyBottom: '#01579B', ground: '#001a33', player: '#42A5F5',
                goodIcons: ["🥤", "🧴", "📦", "🗑️", "🛢️"], goodIconColor: '#00ff41', badIcons: ["🐬", "🐙", "🐢", "🦈"]
            }
        },
        3: {
            targetScore: 500, time: 120, fallSpeed: 5, itemFrequency: 30, hazardFrequency: 80,
            theme: {
                name: "PROFUNDIDADES", skyTop: '#001220', skyBottom: '#003060', ground: '#000814', player: '#1E88E5',
                goodIcons: ["🥤", "🧴", "📦", "🗑️", "🛢️"], goodIconColor: '#00ff41', badIcons: ["🐙", "🐡", "🐢", "🦑"]
            }
        }
    };

    let currentLevel = 1;
    let currentLevelConfig = LEVEL_CONFIG[1];
    let gameState = { running: false, score: 0, lives: 4, playerX: 360, playerTargetX: 360, items: [], timeRemaining: INITIAL_TIME, frameCount: 0 };

    class Player {
        constructor() { this.width = PLAYER_WIDTH; this.height = PLAYER_HEIGHT; this.y = 330; }
        update() {
            gameState.playerX += (gameState.playerTargetX - gameState.playerX) * 0.2;
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
            ctx.fillStyle = (!this.isHazard && currentLevelConfig.theme.goodIconColor) ? currentLevelConfig.theme.goodIconColor : (this.isHazard ? '#ff4d4d' : '#00ffff');
            ctx.font = "30px Arial"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.icon, 0, 0); ctx.restore();
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

    function startGame() {
        if (!initCanvas()) return;
        gameState = { running: true, score: 0, lives: 4, playerX: 360, playerTargetX: 360, items: [], timeRemaining: currentLevelConfig.time, frameCount: 0 };
        document.getElementById('game-overlay').classList.add('hidden');
        loop();
    }

    function loop() {
        if (!gameState.running) return;
        gameState.frameCount++;
        ctx.clearRect(0, 0, 800, 400);
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
                if (item.isHazard) { gameState.lives--; flashScreen('rgba(255, 0, 0, 0.3)'); }
                else { gameState.score += 10; gameState.timeRemaining += 2; flashScreen('rgba(0, 255, 0, 0.2)'); }
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
            title.innerText = "¡OBJETIVO " + currentLevel + " COMPLETADO!"; title.style.color = "#00ff41";
            msg.innerText = "Pulsa ENTER para continuar.";
            const nextLevel = currentLevel + 1;
            saveProgress(nextLevel);
            if (currentLevel < 3) setLevel(nextLevel);
            else msg.innerText = "¡Felicidades! Has restaurado el equilibrio global.";
            if (window.updateLevelMenuUI) window.updateLevelMenuUI();
        } else { title.innerText = "FIN DE MISIÓN"; title.style.color = "#ff0000"; msg.innerText = "Pulsa ENTER para reintentar."; }
    }

    function saveProgress(level) {
        const saved = localStorage.getItem('ecoSortProgress');
        const progress = saved ? JSON.parse(saved) : { maxLevelUnlocked: 1 };
        if (level > progress.maxLevelUnlocked) {
            progress.maxLevelUnlocked = level;
            localStorage.setItem('ecoSortProgress', JSON.stringify(progress));
        }
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
        const step = 60;
        if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') gameState.playerTargetX -= step;
        if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') gameState.playerTargetX += step;
    });

    return { start: startGame, setLevel: setLevel, stop: () => { gameState.running = false; } };
})();

window.setLevel = EcoSortGame.setLevel;
window.startGame = EcoSortGame.start;
window.EcoSortGame = EcoSortGame;

