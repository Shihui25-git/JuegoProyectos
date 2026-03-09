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

    // Traffic Lights: true = Green for North-South, false = Green for East-West
    let nsGreen = true;
    let transitionState = 0; // 0 = stable, 1 = yellow

    const VEHICLE_TYPES = {
        CAR: { points: 5, speed: 2, color: '#ff4d4d', label: '🚗', pollutionRate: 0.05 },
        BUS: { points: 20, speed: 1.5, color: '#3498db', label: '🚌', pollutionRate: 0.01 },
        BIKE: { points: 30, speed: 1.2, color: '#2ecc71', label: '🚲', pollutionRate: 0 }
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

    function startGame() {
        if (!initCanvas()) return;
        running = true;
        score = 0;
        lives = 3;
        pollution = 0;
        gameState = 'playing';
        vehicles = [];
        nsGreen = true;
        spawnTimer = 0;
        document.getElementById('game-overlay').classList.add('hidden');

        requestAnimationFrame(loop);
    }

    function spawnVehicle() {
        const sides = ['N', 'S', 'E', 'W'];
        const side = sides[Math.floor(Math.random() * sides.length)];
        const types = [
            { type: 'CAR', weight: 0.7 },
            { type: 'BUS', weight: 0.15 },
            { type: 'BIKE', weight: 0.15 }
        ];

        // Random selection based on weights
        let rand = Math.random();
        let selectedType = 'CAR';
        for (let t of types) {
            if (rand < t.weight) {
                selectedType = t.type;
                break;
            }
            rand -= t.weight;
        }

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

        // Positioning based on side
        // Intersection is roughly center 400x200
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
        // Road
        ctx.fillStyle = '#333';
        // Vertical Road
        ctx.fillRect(350, 0, 100, 400);
        // Horizontal Road
        ctx.fillRect(0, 150, 800, 100);

        // Lines
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        // Vert middle
        ctx.moveTo(400, 0); ctx.lineTo(400, 400);
        // Horiz middle
        ctx.moveTo(0, 200); ctx.lineTo(800, 200);
        ctx.stroke();
        ctx.setLineDash([]);

        // Intersection square
        ctx.fillStyle = '#444';
        ctx.fillRect(350, 150, 100, 100);

        // Grid/Environment
        ctx.fillStyle = '#1a5e1a'; // Grass
        ctx.fillRect(0, 0, 350, 150);
        ctx.fillRect(450, 0, 350, 150);
        ctx.fillRect(0, 250, 350, 150);
        ctx.fillRect(450, 250, 350, 150);
    }

    function drawTrafficLights() {
        const lights = [
            { x: 320, y: 120, vertical: true }, // Top left
            { x: 460, y: 270, vertical: true }, // Bottom right
            { x: 320, y: 270, vertical: false }, // Bottom left
            { x: 460, y: 120, vertical: false }  // Top right
        ];

        lights.forEach(l => {
            ctx.fillStyle = '#222';
            ctx.fillRect(l.x, l.y, 20, 40);

            let isActive = l.vertical ? nsGreen : !nsGreen;

            // Red light
            ctx.fillStyle = isActive ? '#300' : '#f00';
            ctx.beginPath(); ctx.arc(l.x + 10, l.y + 10, 6, 0, Math.PI * 2); ctx.fill();

            // Green light
            ctx.fillStyle = isActive ? '#0f0' : '#030';
            ctx.beginPath(); ctx.arc(l.x + 10, l.y + 30, 6, 0, Math.PI * 2); ctx.fill();
        });
    }

    function update(dt) {
        spawnTimer += dt;
        if (spawnTimer > Math.max(700, 1600 - (score / 10))) {
            spawnVehicle();
            spawnTimer = 0;
        }

        let currentPollution = 0;

        vehicles.forEach((v, index) => {
            if (v.finished) return;

            let canMove = true;
            const stopLineN = 140;
            const stopLineS = 260;
            const stopLineW = 340;
            const stopLineE = 460;

            // Traffic Light logic
            if (v.direction === 'N' && v.y < stopLineN - 10 && v.y + v.speed >= stopLineN - 10 && !nsGreen) canMove = false;
            if (v.direction === 'S' && v.y > stopLineS + 10 && v.y - v.speed <= stopLineS + 10 && !nsGreen) canMove = false;
            if (v.direction === 'W' && v.x < stopLineW - 10 && v.x + v.speed >= stopLineW - 10 && nsGreen) canMove = false;
            if (v.direction === 'E' && v.x > stopLineE + 10 && v.x - v.speed <= stopLineE + 10 && nsGreen) canMove = false;

            // Collision with vehicle in front
            vehicles.forEach(other => {
                if (v.id === other.id || other.finished) return;
                if (v.direction === other.direction) {
                    if (v.direction === 'N' && other.y > v.y && other.y < v.y + 60) canMove = false;
                    if (v.direction === 'S' && other.y < v.y && other.y > v.y - 60) canMove = false;
                    if (v.direction === 'W' && other.x > v.x && other.x < v.x + 60) canMove = false;
                    if (v.direction === 'E' && other.x < v.x && other.x > v.x - 60) canMove = false;
                }
            });

            if (canMove) {
                v.waiting = false;
                if (v.direction === 'N') v.y += v.speed;
                if (v.direction === 'S') v.y -= v.speed;
                if (v.direction === 'W') v.x += v.speed;
                if (v.direction === 'E') v.x -= v.speed;
            } else {
                v.waiting = true;
                v.waitingTime += dt;
                currentPollution += v.pollutionRate;
            }

            // Check if passed intersection
            if (!v.scored) {
                if (v.direction === 'N' && v.y > 450) { score += v.points; v.scored = true; v.finished = true; }
                if (v.direction === 'S' && v.y < -50) { score += v.points; v.scored = true; v.finished = true; }
                if (v.direction === 'W' && v.x > 850) { score += v.points; v.scored = true; v.finished = true; }
                if (v.direction === 'E' && v.x < -50) { score += v.points; v.scored = true; v.finished = true; }
            }
        });

        // Global pollution increases
        pollution += (currentPollution * (dt / 1000)) * 5;
        if (pollution > 100) {
            endGame("¡NIVEL CRÍTICO DE CONTAMINACIÓN!");
        }

        // Clean up finished vehicles
        vehicles = vehicles.filter(v => !v.finished);

        // Collision Check (Accidents)
        checkAccidents();
    }

    function checkAccidents() {
        for (let i = 0; i < vehicles.length; i++) {
            for (let j = i + 1; j < vehicles.length; j++) {
                const v1 = vehicles[i];
                const v2 = vehicles[j];

                // Simplified collision box
                const dx = Math.abs(v1.x - v2.x);
                const dy = Math.abs(v1.y - v2.y);

                if (dx < 30 && dy < 30) {
                    lives--;
                    flashScreen('rgba(255, 0, 0, 0.4)');
                    // Remove both vehicles
                    v1.finished = true;
                    v2.finished = true;
                    if (lives <= 0) endGame("¡DEMASIADOS ACCIDENTES!");
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

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(-v.width / 2 + 2, -v.height / 2 + 2, v.width, v.height);

            // Body
            ctx.fillStyle = v.color;
            ctx.beginPath();
            ctx.roundRect(-v.width / 2, -v.height / 2, v.width, v.height, 5);
            ctx.fill();

            // Pollution warning
            if (v.waiting && v.waitingTime > 3000 && v.type === 'CAR') {
                ctx.font = '12px Arial';
                ctx.fillText('💨', -10, -15);
            }

            // Label
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.rotate(-v.rotation * Math.PI / 180); // Keep emoji upright
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
            timeEl.innerText = `POL: ${Math.floor(pollution)}%`;
            timeEl.style.color = pollution > 70 ? '#ff4d4d' : '#fff';
        }

        const goalEl = document.getElementById('score-goal');
        if (goalEl) goalEl.innerText = " / 500";

        if (score >= 500) winGame();
    }

    function winGame() {
        running = false;
        gameState = 'ended';
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = "¡MOVILIDAD SOSTENIBLE LOGRADA!";
        overlay.querySelector('h3').style.color = "#2ecc71";
        overlay.querySelector('p').innerText = "Has gestionado el tráfico con éxito.\n¡Felicidades!\nPulsa ENTER para jugar de nuevo";
    }

    function endGame(reason = "FIN DEL JUEGO") {
        running = false;
        gameState = 'ended';
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = reason;
        overlay.querySelector('h3').style.color = "#ff4d4d";
        overlay.querySelector('p').innerText = "Puntuación de Sostenibilidad: " + score + "\nPulsa ENTER para reintentar";
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
        // Optional: click sound
    }

    // Input listener
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

    // Mouse control
    window.addEventListener('mousedown', (e) => {
        if (window.currentGameMode !== 'traffic' || !running) return;
        toggleLights();
    });

    return {
        start: startGame,
        stop: () => {
            running = false;
            gameState = 'waiting';
        }
    };
})();

window.TrafficControlGame = TrafficControlGame;
