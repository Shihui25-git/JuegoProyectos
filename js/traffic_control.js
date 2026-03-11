/**
 * TRAFFIC CONTROL - Arcade Game Logic
 * Eco-friendly traffic management game.
 */
const TrafficControlGame = (() => {
    let canvas, ctx;
    let running = false;
    let score = 0;
    let lives = 3; // Accidents
    let pollution = 0; // 0 to 100
    let gameState = 'waiting'; // 'waiting', 'playing', 'ended'
    let lastTime = 0;
    let targetCars = 1;
    let timeRemaining = 0;

    // Traffic Lights: true = Green for North-South, false = Green for East-West
    let nsGreen = true;
    let transitionState = 0; // 0 = stable, 1 = yellow

    const VEHICLE_TYPES = {
        CAR: { points: 5, speed: 2, color: '#ff4d4d', label: '🚗', pollutionRate: 0.05 },
        BUS: { points: 20, speed: 1.5, color: '#3498db', label: '🚌', pollutionRate: 0.01 }
    };

    let vehicles = [];
    let spawnTimer = 0;

    function initCanvas() {
        if (!canvas) {
            canvas = document.getElementById('gameCanvas');
            if (canvas) ctx = canvas.getContext('2d');
        }
        return !!ctx;
    }

    function initMenu() {
        if (!initCanvas()) return;
        running = false;
        gameState = 'waiting';
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = "PULSA ENTER PARA EMPEZAR";
        overlay.querySelector('h3').style.color = "#fff";
        overlay.querySelector('p').innerText = "Traffic Control: ¡Evita accidentes controlando los semáforos (Español o Click)!";

        ctx.clearRect(0, 0, 800, 400);
        drawBackground();
        drawTrafficLights();
    }

    function startGame(difficulty = 'EASY', speedMultiplier = 1.0) {
        if (!initCanvas()) return;
        running = true;
        score = 0;
        lives = 4;
        pollution = 0;
        gameState = 'playing';
        vehicles = [];
        nsGreen = true;
        spawnTimer = 0;

        // Setup Overlay
        const overlay = document.getElementById('game-overlay');
        overlay.classList.add('hidden');

        // Clear residual instructions
        const ctrlP = document.getElementById('game-controls');
        if (ctrlP) ctrlP.innerText = "ESPACIO / CLIC: Cambiar semáforos";
        const instP = document.getElementById('game-instruction');
        if (instP) instP.innerText = "";

        const diff = difficulty.toUpperCase();
        if (diff === 'NORMAL') {
            targetCars = 3;
        } else if (diff === 'HARD') {
            targetCars = 5;
        } else {
            targetCars = 1;
        }

        const baseTime = 15;
        timeRemaining = Math.max(7, baseTime / speedMultiplier);

        // Update HUD labels
        const scoreLabel = document.getElementById('score-label');
        if (scoreLabel) scoreLabel.innerText = "OBJETIVO:";
        const scoreGoal = document.getElementById('score-goal');
        if (scoreGoal) scoreGoal.innerText = " / " + targetCars;

        lastTime = performance.now();
        spawnVehicle(); // Spawn first vehicle immediately
        spawnTimer = 0;
        requestAnimationFrame(loop);
    }

    function spawnVehicle() {
        const sides = ['N', 'S', 'E', 'W'];
        const side = sides[Math.floor(Math.random() * sides.length)];

        let selectedType = 'CAR'; // Fixed to only spawn cars

        const typeData = VEHICLE_TYPES[selectedType];
        let v = {
            id: Date.now() + Math.random(),
            type: selectedType,
            points: typeData.points,
            speed: typeData.speed + (score / 350),
            currentSpeed: typeData.speed,
            color: typeData.color,
            label: typeData.label,
            pollutionRate: typeData.pollutionRate,
            waiting: false,
            waitingTime: 0,
            width: 40,
            height: 25,
            direction: side,
            x: 0,
            y: 0,
            finished: false
        };

        if (side === 'N') { v.x = 360; v.y = -50; v.rotation = 90; }
        if (side === 'S') { v.x = 410; v.y = 450; v.rotation = -90; }
        if (side === 'E') { v.x = 850; v.y = 210; v.rotation = 180; }
        if (side === 'W') { v.x = -50; v.y = 160; v.rotation = 0; }

        vehicles.push(v);
    }

    function loop(timestamp) {
        if (!running) return;

        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        ctx.clearRect(0, 0, 800, 400);
        drawBackground();

        if (gameState === 'playing') {
            update(deltaTime);
            drawVehicles();
            drawTrafficLights();
        }

        updateHUD();
        requestAnimationFrame(loop);
    }

    function drawBackground() {
        ctx.fillStyle = '#333';
        ctx.fillRect(350, 0, 100, 400);
        ctx.fillRect(0, 150, 800, 100);

        ctx.strokeStyle = '#fff';
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(400, 0); ctx.lineTo(400, 400);
        ctx.moveTo(0, 200); ctx.lineTo(800, 200);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#444';
        ctx.fillRect(350, 150, 100, 100);

        ctx.fillStyle = '#1a5e1a'; // Grass
        ctx.fillRect(0, 0, 350, 150);
        ctx.fillRect(450, 0, 350, 150);
        ctx.fillRect(0, 250, 350, 150);
        ctx.fillRect(450, 250, 350, 150);
    }

    function drawTrafficLights() {
        const lights = [
            { x: 320, y: 120, vertical: true },
            { x: 460, y: 270, vertical: true },
            { x: 320, y: 270, vertical: false },
            { x: 460, y: 120, vertical: false }
        ];

        lights.forEach(l => {
            ctx.fillStyle = '#222';
            ctx.fillRect(l.x, l.y, 20, 40);

            let isActive = l.vertical ? nsGreen : !nsGreen;

            ctx.fillStyle = isActive ? '#300' : '#f00';
            ctx.beginPath(); ctx.arc(l.x + 10, l.y + 10, 6, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = isActive ? '#0f0' : '#030';
            ctx.beginPath(); ctx.arc(l.x + 10, l.y + 30, 6, 0, Math.PI * 2); ctx.fill();
        });
    }

    function update(dt) {
        // Timer
        timeRemaining -= dt / 1000;
        if (timeRemaining <= 0) {
            timeRemaining = 0;
            endGame("¡TIEMPO AGOTADO!", false);
            return;
        }

        spawnTimer += dt;
        if (spawnTimer > 1500) { // Fast spawn for microgame
            spawnVehicle();
            spawnTimer = 0;
        }

        let currentPollution = 0;
        let carsSorted = 0;

        vehicles.forEach((v, index) => {
            if (v.finished) return;
            // ... (keep movement logic)
            let canMove = true;
            const stopLineN = 140;
            const stopLineS = 260;
            const stopLineW = 340;
            const stopLineE = 460;

            if (v.direction === 'N' && v.y < stopLineN - 10 && v.y + v.speed >= stopLineN - 10 && !nsGreen) canMove = false;
            if (v.direction === 'S' && v.y > stopLineS + 10 && v.y - v.speed <= stopLineS + 10 && !nsGreen) canMove = false;
            if (v.direction === 'W' && v.x < stopLineW - 10 && v.x + v.speed >= stopLineW - 10 && nsGreen) canMove = false;
            if (v.direction === 'E' && v.x > stopLineE + 10 && v.x - v.speed <= stopLineE + 10 && nsGreen) canMove = false;

            if (canMove) {
                if (v.direction === 'N') v.y += v.speed;
                if (v.direction === 'S') v.y -= v.speed;
                if (v.direction === 'W') v.x += v.speed;
                if (v.direction === 'E') v.x -= v.speed;
            }

            if (!v.scored) {
                if ((v.direction === 'N' && v.y > 450) || (v.direction === 'S' && v.y < -50) ||
                    (v.direction === 'W' && v.x > 850) || (v.direction === 'E' && v.x < -50)) {
                    score++;
                    v.scored = true;
                    v.finished = true;
                }
            }
        });

        if (score >= (targetCars || 1)) {
            endGame("¡TRÁFICO FLUIDO!", true);
        }

        vehicles = vehicles.filter(v => !v.finished);
        checkAccidents();
    }

    function checkAccidents() {
        for (let i = 0; i < vehicles.length; i++) {
            for (let j = i + 1; j < vehicles.length; j++) {
                const v1 = vehicles[i];
                const v2 = vehicles[j];
                const dx = Math.abs(v1.x - v2.x);
                const dy = Math.abs(v1.y - v2.y);

                // Reduce collision box size to prevent unfair side-byside collisions (was randomly hitting at 30)
                if (dx < 22 && dy < 22) {
                    if (window.GameMaster) window.GameMaster.loseLife();
                    else lives--;
                    flashScreen('rgba(255, 0, 0, 0.4)');
                    v1.finished = true;
                    v2.finished = true;
                    return;
                }
            }
        }
    }

    function drawVehicles() {
        vehicles.forEach(v => {
            ctx.save();
            ctx.translate(v.x, v.y);
            ctx.rotate(v.rotation * Math.PI / 180);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(-v.width / 2 + 2, -v.height / 2 + 2, v.width, v.height);
            ctx.fillStyle = v.color;
            ctx.beginPath();
            ctx.roundRect(-v.width / 2, -v.height / 2, v.width, v.height, 5);
            ctx.fill();
            if (v.waiting && v.waitingTime > 3000 && v.type === 'CAR') {
                ctx.font = '12px Arial';
                ctx.fillText('💨', -10, -15);
            }
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.rotate(-v.rotation * Math.PI / 180);
            ctx.fillText(v.label, 0, 0);
            ctx.restore();
        });
    }

    function updateHUD() {
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.innerText = score;
        const livesEl = document.getElementById('lives');
        if (livesEl) livesEl.innerText = lives;

        const timeEl = document.getElementById('time');
        if (timeEl) {
            const s = Math.ceil(timeRemaining);
            timeEl.innerText = `0:${s.toString().padStart(2, '0')}`;
        }
    }

    function winGame() {
        running = false;
        gameState = 'ended';
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = "¡MOVILIDAD LOGRADA!";
        overlay.querySelector('h3').style.color = "#2ecc71";
        overlay.querySelector('p').innerText = "¡Excelente gestión!";
        if (window.GameMaster) {
            setTimeout(() => window.GameMaster.onGameResult(true), 2000);
        }
    }

    function endGame(reason = "FIN DEL JUEGO", win = false) {
        running = false;
        gameState = 'ended';
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = win ? "¡LOGRADO!" : "¡FALLO!";
        overlay.querySelector('p').innerText = reason;

        // Report to GameMaster (immediate)
        if (window.GameMaster) {
            window.GameMaster.onGameResult(win);
        }
    }

    function flashScreen(color) {
        const container = document.querySelector('.game-container');
        if (!container) return;
        container.style.backgroundColor = color;
        setTimeout(() => { container.style.backgroundColor = '#000'; }, 150);
    }

    function toggleLights() {
        if (gameState !== 'playing') return;
        nsGreen = !nsGreen;
    }

    window.addEventListener('keydown', (e) => {
        if (window.currentGameMode !== 'traffic') return;
        if (!running) {
            if (e.key === 'Enter') startGame();
            return;
        }
        if (e.key === ' ' || e.key === 'Spacebar') {
            toggleLights();
            e.preventDefault();
        }
    });

    window.addEventListener('mousedown', (e) => {
        if (window.currentGameMode !== 'traffic' || !running) return;
        toggleLights();
    });

    return {
        start: startGame,
        initMenu: initMenu,
        stop: () => {
            running = false;
            gameState = 'waiting';
        }
    };
})();
window.TrafficControlGame = TrafficControlGame;
