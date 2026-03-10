/**
 * RECYCLING HERO - Arcade Game Logic
 */
const RecyclingHeroGame = (() => {
    let canvas, ctx;
    let running = false;
    let score = 0;
    let lives = 3;
    let currentWord = null;
    let wordTimer = 0;
    let gameState = 'waiting'; // 'waiting', 'playing', 'ended'

    const RECYCLABLE_WORDS = [
        "PAPEL", "CARTÓN", "BOTELLA VIDRIO", "LATA ALUMÍNIO",
        "BRICK", "REVISTA", "PERIÓDICO", "CAJA PIZZA (LIMPIA)",
        "BOTE PLÁSTICO", "BOLSA PAPEL", "TAPA METAL"
    ];

    const NON_RECYCLABLE_WORDS = [
        "PAÑAL", "COLILLA", "CERÁMICA", "CRISTAL ROTO",
        "RESTO COMIDA", "SERVILLETA SUCIA", "MASCARILLA",
        "BOLÍGRAFO", "PILAS", "CHICLE"
    ];

    function initCanvas() {
        if (!canvas) {
            canvas = document.getElementById('gameCanvas');
            if (canvas) ctx = canvas.getContext('2d');
        }
        return !!ctx;
    }

    function startGame() {
        if (!initCanvas()) return;
        running = true;
        score = 0;
        lives = 3;
        gameState = 'playing';
        nextWord();
        document.getElementById('game-overlay').classList.add('hidden');
        loop();
    }

    function nextWord() {
        const isRecyclable = Math.random() > 0.5;
        const list = isRecyclable ? RECYCLABLE_WORDS : NON_RECYCLABLE_WORDS;
        const text = list[Math.floor(Math.random() * list.length)];

        currentWord = {
            text: text,
            isRecyclable: isRecyclable,
            y: -50,
            x: 400,
            speed: 2 + (score / 100)
        };
    }

    function loop() {
        if (!running) return;

        ctx.clearRect(0, 0, 800, 400);
        drawBackground();
        drawContainers();

        if (gameState === 'playing') {
            updateWord();
            drawWord();
        }

        updateHUD();
        requestAnimationFrame(loop);
    }

    function drawBackground() {
        const grad = ctx.createLinearGradient(0, 0, 0, 400);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(1, '#16213e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 800, 400);

        // Subtle Grid
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 800; i += 40) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 400); ctx.stroke();
        }
        for (let j = 0; j < 400; j += 40) {
            ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(800, j); ctx.stroke();
        }
    }

    function drawContainers() {
        // Green Container (Recyclable) - Left
        drawContainer(50, 280, "#2ecc71", "RECICLABLE (A)");

        // Red Container (Non-Recyclable) - Right
        drawContainer(600, 280, "#e74c3c", "RESTO (D)");
    }

    function drawContainer(x, y, color, label) {
        ctx.fillStyle = color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;

        // Body
        ctx.beginPath();
        ctx.roundRect(x, y, 150, 100, 10);
        ctx.fill();

        // Top lid
        ctx.fillStyle = "#333";
        ctx.fillRect(x - 5, y - 5, 160, 10);

        // Label
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(label, x + 75, y + 120);

        // Icon
        ctx.font = "30px Arial";
        ctx.fillText(color === "#2ecc71" ? "♻️" : "🗑️", x + 75, y + 65);
    }

    function updateWord() {
        if (!currentWord) return;

        currentWord.y += currentWord.speed;

        if (currentWord.y > 350) {
            // Missed! - Quita una vida
            lives--;
            flashScreen('rgba(255, 0, 0, 0.3)');
            if (lives <= 0) endGame();
            else nextWord();
        }
    }

    function drawWord() {
        if (!currentWord) return;

        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px 'Rajdhani', sans-serif";
        ctx.textAlign = "center";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#00ffff";

        // Box for word
        const metrics = ctx.measureText(currentWord.text);
        const pad = 15;
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(currentWord.x - (metrics.width / 2) - pad, currentWord.y - 20, metrics.width + (pad * 2), 30);

        ctx.fillStyle = "#fff";
        ctx.fillText(currentWord.text, currentWord.x, currentWord.y + 5);
        ctx.restore();
    }

    function checkChoice(choiceIsRecyclable) {
        if (gameState !== 'playing' || !currentWord) return;

        if (choiceIsRecyclable === currentWord.isRecyclable) {
            // Success!
            score += 10;
            flashScreen('rgba(0, 255, 0, 0.2)');
            nextWord();
        } else {
            // Fail!
            lives--;
            flashScreen('rgba(255, 0, 0, 0.3)');
            if (lives <= 0) endGame();
            else nextWord();
        }
    }

    function endGame() {
        running = false;
        gameState = 'ended';
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = "FIN DEL JUEGO";
        overlay.querySelector('h3').style.color = "#ff4d4d";
        overlay.querySelector('p').innerText = "Puntuación Final: " + score + "\nPulsa ENTER para reintentar";
    }

    function updateHUD() {
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.innerText = score;
        const livesEl = document.getElementById('lives');
        if (livesEl) livesEl.innerText = lives;

        // Time isn't used here but let's clear it
        const timeEl = document.getElementById('time');
        if (timeEl) timeEl.innerText = "--:--";
    }

    function flashScreen(color) {
        const container = document.querySelector('.game-container');
        if (!container) return;
        container.style.backgroundColor = color;
        setTimeout(() => { container.style.backgroundColor = '#000'; }, 100);
    }

    // Input listener
    window.addEventListener('keydown', (e) => {
        if (window.currentGameMode !== 'recycling') return;

        if (!running) {
            if (e.key === 'Enter') startGame();
            return;
        }

        if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') {
            checkChoice(true); // Recyclable
        } else if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') {
            checkChoice(false); // Non-recyclable
        }
    });

    return {
        start: startGame,
        stop: () => { running = false; gameState = 'waiting'; }
    };
})();

window.RecyclingHeroGame = RecyclingHeroGame;
