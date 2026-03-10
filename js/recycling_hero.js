/**
 * HERO RECICLING - Arcade Game Logic
 * Clasifica palabras en los contenedores correctos.
 */
const RecyclingHeroGame = (() => {
    let canvas, ctx;
    let running = false;
    let score = 0;
    let lives = 3;
    let gameState = 'waiting'; // 'waiting', 'playing', 'ended'
    let lastTime = 0;

    const BINS = [
        { id: 'yellow', color: '#f1c40f', label: 'Envases (Q)', key: 'q', x: 100 },
        { id: 'blue', color: '#3498db', label: 'Papel (W)', key: 'w', x: 300 },
        { id: 'green', color: '#2ecc71', label: 'Vidrio (E)', key: 'e', x: 500 },
        { id: 'brown', color: '#8e44ad', label: 'Orgánico (R)', key: 'r', x: 700 }
    ];

    const WORDS = [
        { text: 'Botella de Plástico', bin: 'yellow' },
        { text: 'Lata de Refresco', bin: 'yellow' },
        { text: 'Bolsa de Patatas', bin: 'yellow' },
        { text: 'Periódico', bin: 'blue' },
        { text: 'Caja de Cartón', bin: 'blue' },
        { text: 'Folio', bin: 'blue' },
        { text: 'Tarro de Mermelada', bin: 'green' },
        { text: 'Botella de Vino', bin: 'green' },
        { text: 'Piel de Plátano', bin: 'brown' },
        { text: 'Restos de Comida', bin: 'brown' },
        { text: 'Posos de Café', bin: 'brown' }
    ];

    let currentWord = null;
    let dropY = 0;
    let dropSpeed = 1.0;
    let wordTimer = 0;
    let particles = [];

    function initCanvas() {
        if (!canvas) {
            canvas = document.getElementById('gameCanvas');
            if (canvas) ctx = canvas.getContext('2d');
        }
        return !!ctx;
    }

    function initGame() {
        if (!initCanvas()) return;
        score = 0;
        lives = 3;
        dropSpeed = 1.0;
        gameState = 'waiting';
        currentWord = null;
        particles = [];
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = "PULSA ENTER PARA EMPEZAR";
        overlay.querySelector('h3').style.color = "#fff";
        overlay.querySelector('p').innerText = "Hero Recicling: Clasifica cada palabra en el contenedor correcto usando Q, W, E, R.";

        ctx.clearRect(0, 0, 800, 400);
        drawBackground();
        drawBins();
    }

    function startGame() {
        if (!initCanvas()) return;
        running = true;
        score = 0;
        lives = 3;
        dropSpeed = 1.0;
        gameState = 'playing';
        currentWord = null;
        particles = [];
        spawnWord();
        document.getElementById('game-overlay').classList.add('hidden');

        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function spawnWord() {
        const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
        currentWord = {
            text: randomWord.text,
            bin: randomWord.bin,
            y: 0
        };
    }

    function createParticles(x, y, color) {
        for (let i = 0; i < 15; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                color: color
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    function loop(timestamp) {
        if (!running) return;

        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        ctx.clearRect(0, 0, 800, 400);
        drawBackground();
        drawBins();

        if (gameState === 'playing') {
            update(deltaTime);
            drawWord();
            updateParticles();
            drawParticles();
        }

        updateHUD();
        requestAnimationFrame(loop);
    }

    function update(dt) {
        if (currentWord) {
            currentWord.y += dropSpeed * (dt / 16);
            if (currentWord.y > 330) {
                // Word hit the ground without being sorted
                lives--;
                flashScreen('rgba(255, 0, 0, 0.4)');
                if (lives <= 0) {
                    endGame("¡TE HAS QUEDADO SIN VIDAS!");
                } else {
                    spawnWord();
                }
            }
        }

        // Increase difficulty mildly
        if (score > 0 && dropSpeed < 3.5) {
            dropSpeed = 1.0 + (score / 150);
        }
    }

    function checkInput(key) {
        if (gameState !== 'playing' || !currentWord) return;

        const targetBin = BINS.find(b => b.key === key.toLowerCase());
        if (targetBin) {
            if (currentWord.bin === targetBin.id) {
                score += 10;
                flashScreen('rgba(0, 255, 0, 0.2)');
                createParticles(targetBin.x, 320, targetBin.color);
            } else {
                lives--;
                flashScreen('rgba(255, 0, 0, 0.4)');
                if (lives <= 0) {
                    endGame("¡TE HAS QUEDADO SIN VIDAS!");
                    return;
                }
            }
            spawnWord();
        }
    }

    function drawBackground() {
        // Factory-like background
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, 800, 400);

        // Floor
        ctx.fillStyle = '#1a252f';
        ctx.fillRect(0, 350, 800, 50);

        // Conveyor belt decorative line
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, 350);
        ctx.lineTo(800, 350);
        ctx.stroke();
    }

    function drawBins() {
        BINS.forEach(bin => {
            // Bin Body
            ctx.fillStyle = bin.color;
            ctx.beginPath();
            ctx.roundRect(bin.x - 40, 270, 80, 80, 5);
            ctx.fill();

            // Bin Lid
            ctx.fillStyle = darkenColor(bin.color, -20);
            ctx.fillRect(bin.x - 45, 260, 90, 10);

            // Text inside Bin (Key)
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(bin.key.toUpperCase(), bin.x, 310);

            // Label under Bin
            ctx.font = '14px Arial';
            ctx.fillText(bin.label, bin.x, 370);
        });
    }

    function drawWord() {
        if (!currentWord) return;
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';

        // Add shadow/glow
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 5;
        ctx.fillText(currentWord.text, 400, currentWord.y);
        ctx.shadowBlur = 0; // reset
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });
    }

    function updateHUD() {
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.innerText = score;

        const livesEl = document.getElementById('lives');
        if (livesEl) livesEl.innerText = lives;

        const timeEl = document.getElementById('time');
        if (timeEl) timeEl.innerText = 'INF'; // Endless mode mostly

        const goalEl = document.getElementById('score-goal');
        if (goalEl) goalEl.innerText = "";
    }

    function endGame(reason = "FIN DEL JUEGO") {
        running = false;
        gameState = 'ended';
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = reason;
        overlay.querySelector('h3').style.color = "#ff4d4d";
        overlay.querySelector('p').innerText = "Puntuación Final: " + score + "\nPulsa ENTER para reintentar";
    }

    function flashScreen(color) {
        const container = document.querySelector('.game-container');
        if (!container) return;
        container.style.backgroundColor = color;
        setTimeout(() => { container.style.backgroundColor = '#000'; }, 100);
    }

    // Helper to darken colors slightly for lids
    function darkenColor(col, amt) {
        let usePound = false;
        if (col[0] == "#") {
            col = col.slice(1);
            usePound = true;
        }
        let num = parseInt(col, 16);
        let r = (num >> 16) + amt;
        if (r > 255) r = 255; else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amt;
        if (b > 255) b = 255; else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amt;
        if (g > 255) g = 255; else if (g < 0) g = 0;
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    }

    // Input listeners
    window.addEventListener('keydown', (e) => {
        if (window.currentGameMode !== 'recycling') return;

        if (gameState !== 'playing') {
            if (e.key === 'Enter') startGame();
            return;
        }

        const validKeys = ['q', 'w', 'e', 'r'];
        if (validKeys.includes(e.key.toLowerCase())) {
            checkInput(e.key);
        }
    });

    return {
        start: initGame,
        stop: () => {
            running = false;
            gameState = 'waiting';
        }
    };
})();

window.RecyclingHeroGame = RecyclingHeroGame;
