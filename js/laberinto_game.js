/**
 * LÓGICA DEL JUEGO: EL LABERINTO
 * ODS 15: Vida de ecosistemas terrestres
 */
const LaberintoGame = (() => {
    let canvas, ctx;
    let running = false;
    let score = 0;
    let lives = 4;
    let gameState = 'waiting'; // 'waiting', 'playing', 'ended'
    let lastTime = 0;
    let animationId;

    // Tamaño de cada bloque del laberinto
    const TILE_SIZE = 40;
    let COLS = 20; // 800 / 40
    let ROWS = 10; // 400 / 40 (Adjusted to project's 800x400 canvas)

    // Estados
    const TILE_EMPTY = 0;
    const TILE_WALL = 1;
    const TILE_SAFE = 2; // Zona central
    const TILE_COIN = 3; // Monedas

    // ==========================================
    // EL LABERINTO (Mapa Fijo Ajustado a 20x10)
    // ==========================================
    let baseMap = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        [1, 0, 1, 0, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 0, 1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1, 0, 0, 2, 2, 2, 2, 0, 0, 1, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 0, 1, 0, 1, 2, 2, 2, 2, 1, 0, 1, 0, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];

    let map = []; // Copia interactiva
    let totalCoinsInGame = 0;
    let isMapExpanded = false;

    const player = {
        x: 0, y: 0,
        width: 20, height: 20, // Slightly smaller
        speed: 3,
        color: '#3b82f6',
        startX: 9 * TILE_SIZE + 10, // Centro del 2x2 de safe zone aprox
        startY: 5 * TILE_SIZE + 10
    };

    let enemies = [];
    let enemySpeedNormal = 1.5;
    let enemySpeedFast = 2.5;
    let currentDifficulty = 'EASY';
    let globalSpeedMultiplier = 1.0;

    // Controles
    const keys = {
        ArrowUp: false, ArrowDown: false,
        ArrowLeft: false, ArrowRight: false,
        w: false, s: false, a: false, d: false,
        W: false, S: false, A: false, D: false
    };

    function initCanvas() {
        if (!canvas) {
            canvas = document.getElementById('gameCanvas');
            if (canvas) ctx = canvas.getContext('2d');
        }
        return !!ctx;
    }

    function initGame(difficulty = 'EASY', speedMultiplier = 1.0) {
        if (!initCanvas()) return;

        currentDifficulty = difficulty.toUpperCase();
        globalSpeedMultiplier = speedMultiplier;

        score = 0;
        lives = 4;
        gameState = 'waiting';
        totalCoinsInGame = 0;
        isMapExpanded = false;
        enemies = [];

        // Fix potential button focus trapping keyboard events
        if (document.activeElement) document.activeElement.blur();
        window.focus();

        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = "PULSA ENTER PARA EMPEZAR";
        overlay.querySelector('h3').style.color = "#fff";
        overlay.querySelector('p').innerText = "Recoge las monedas y escapa de la polución.";

        // Clear potential residual instructions
        const ctrlP = document.getElementById('game-controls');
        if (ctrlP) ctrlP.innerText = "WASD / Flechas: Mover";
        const instP = document.getElementById('game-instruction');
        if (instP) instP.innerText = "";

        // Reset player keys
        for (let k in keys) keys[k] = false;

        // Determine map bounds based on difficulty
        let minCol = 0;
        let maxCol = 19;

        if (currentDifficulty === 'EASY') {
            minCol = 5;
            maxCol = 14;
        } else if (currentDifficulty === 'NORMAL') {
            minCol = 2;
            maxCol = 17;
        }
        // HARD uses 0 - 19

        // Generar interactivo
        map = [];
        for (let r = 0; r < ROWS; r++) {
            let row = [];
            for (let c = 0; c < COLS; c++) {
                let tile = baseMap[r][c];

                // Dynamic map bounds
                if (c < minCol || c > maxCol) {
                    row.push(TILE_WALL);
                    continue;
                }

                // Repartir monedas en pasillos vacíos
                if (tile === TILE_EMPTY) {
                    if (Math.random() > 0.2) {
                        tile = TILE_COIN;
                        totalCoinsInGame++;
                    }
                }
                row.push(tile);
            }
            map.push(row);
        }

        resetPlayer();

        ctx.clearRect(0, 0, 800, 400);
        draw();
        updateHUD();
    }

    function startGame() {
        if (!initCanvas()) return;
        running = true;

        // Adjust enemy base speed based on speedMultiplier from GameMaster
        enemySpeedNormal = 1.5 * Math.max(1, globalSpeedMultiplier);
        enemySpeedFast = 2.5 * Math.max(1, globalSpeedMultiplier);

        // We do NOT reset score/lives/map here because they are initialized in initGame() before overlay.
        // We just change state and start loop.
        if (gameState !== 'waiting') return;

        gameState = 'playing';

        // Spawn enemies based on difficulty
        if (currentDifficulty === 'EASY') {
            spawnEnemy(6, 1);
        } else if (currentDifficulty === 'NORMAL') {
            spawnEnemy(6, 1);
            spawnEnemy(15, 1);
        } else { // HARD
            spawnEnemy(2, 1);
            spawnEnemy(17, 1);
            spawnEnemy(2, 5);
        }

        document.getElementById('game-overlay').classList.add('hidden');

        // Update HUD labels
        const scoreLabel = document.getElementById('score-label');
        if (scoreLabel) scoreLabel.innerText = "PUNTOS:";
        const scoreGoal = document.getElementById('score-goal');
        if (scoreGoal) scoreGoal.innerText = ""; // no specific goal limit visually shown

        lastTime = performance.now();
        animationId = requestAnimationFrame(loop);
    }

    function resetPlayer() {
        player.x = player.startX;
        player.y = player.startY;
    }

    function loop(timestamp) {
        if (!running) return;

        // Fix very high delta times if tab was inactive
        const deltaTime = timestamp - lastTime;
        if (deltaTime > 100) {
            lastTime = timestamp;
            animationId = requestAnimationFrame(loop);
            return;
        }

        lastTime = timestamp;

        if (gameState === 'playing') {
            updatePlayer();
            updateEnemies();
            checkCollisions();
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw();

        if (gameState === 'playing') {
            // Optional: timer if needed, but Laberinto doesn't seem to use explicit time limit in original
        }

        updateHUD();
        if (running) {
            animationId = requestAnimationFrame(loop);
        }
    }

    function updatePlayer() {
        // Calculamos el próximo movimiento
        let nextX = player.x;
        let nextY = player.y;

        if (keys.ArrowUp || keys.w || keys.W) nextY -= player.speed;
        if (keys.ArrowDown || keys.s || keys.S) nextY += player.speed;
        if (keys.ArrowLeft || keys.a || keys.A) nextX -= player.speed;
        if (keys.ArrowRight || keys.d || keys.D) nextX += player.speed;

        // Limites canvas
        nextX = Math.max(0, Math.min(canvas.width - player.width, nextX));
        nextY = Math.max(0, Math.min(canvas.height - player.height, nextY));

        // Colisión con Paredes
        if (!checkWallCollision(nextX, player.y, player.width, player.height)) {
            player.x = nextX;
        }
        if (!checkWallCollision(player.x, nextY, player.width, player.height)) {
            player.y = nextY;
        }

        // Recoger Monedas
        const centerX = player.x + player.width / 2;
        const centerY = player.y + player.height / 2;
        const gridC = Math.floor(centerX / TILE_SIZE);
        const gridR = Math.floor(centerY / TILE_SIZE);

        if (map[gridR] && map[gridR][gridC] === TILE_COIN) {
            map[gridR][gridC] = TILE_EMPTY; // Quitamos moneda
            score += 2;
            updateHUD();
            totalCoinsInGame--;

            if (totalCoinsInGame <= 0) {
                endGame("¡LABERINTO COMPLETADO!", true);
            }
        }
    }

    // Map enforcing logic removed since it's handled completely by initGame now

    function checkWallCollision(x, y, w, h) {
        const left = Math.floor(x / TILE_SIZE);
        const right = Math.floor((x + w - 1) / TILE_SIZE);
        const top = Math.floor(y / TILE_SIZE);
        const bottom = Math.floor((y + h - 1) / TILE_SIZE);

        for (let r = top; r <= bottom; r++) {
            for (let c = left; c <= right; c++) {
                if (map[r] && map[r][c] === TILE_WALL) {
                    return true;
                }
            }
        }
        return false;
    }

    function checkSafeCollision(x, y, w, h) {
        const left = Math.floor(x / TILE_SIZE);
        const right = Math.floor((x + w - 1) / TILE_SIZE);
        const top = Math.floor(y / TILE_SIZE);
        const bottom = Math.floor((y + h - 1) / TILE_SIZE);

        for (let r = top; r <= bottom; r++) {
            for (let c = left; c <= right; c++) {
                if (map[r] && map[r][c] === TILE_SAFE) return true;
            }
        }
        return false;
    }

    function spawnEnemy(gridC, gridR) {
        let dirs = [
            { vx: enemySpeedNormal, vy: 0 },
            { vx: -enemySpeedNormal, vy: 0 },
            { vx: 0, vy: enemySpeedNormal },
            { vx: 0, vy: -enemySpeedNormal }
        ];
        let dir = dirs[Math.floor(Math.random() * dirs.length)];

        enemies.push({
            x: gridC * TILE_SIZE + 4,
            y: gridR * TILE_SIZE + 4,
            width: 32,
            height: 32,
            speed: enemySpeedNormal,
            color: '#ef4444',
            vx: dir.vx,
            vy: dir.vy
        });
    }

    function hasLineOfSight(enemy, pCenterC, pCenterR) {
        const eCenterC = Math.floor((enemy.x + enemy.width / 2) / TILE_SIZE);
        const eCenterR = Math.floor((enemy.y + enemy.height / 2) / TILE_SIZE);

        if (eCenterC === pCenterC) {
            let minR = Math.min(eCenterR, pCenterR);
            let maxR = Math.max(eCenterR, pCenterR);
            for (let r = minR + 1; r < maxR; r++) {
                if (map[r] && (map[r][eCenterC] === TILE_WALL || map[r][eCenterC] === TILE_SAFE)) return false;
            }
            return true;
        }
        if (eCenterR === pCenterR) {
            let minC = Math.min(eCenterC, pCenterC);
            let maxC = Math.max(eCenterC, pCenterC);
            for (let c = minC + 1; c < maxC; c++) {
                if (map[eCenterR] && (map[eCenterR][c] === TILE_WALL || map[eCenterR][c] === TILE_SAFE)) return false;
            }
            return true;
        }
        return false;
    }

    function updateEnemies() {
        const pCenterC = Math.floor((player.x + player.width / 2) / TILE_SIZE);
        const pCenterR = Math.floor((player.y + player.height / 2) / TILE_SIZE);
        const isPlayerSafe = (map[pCenterR] && map[pCenterR][pCenterC] === TILE_SAFE);

        enemies.forEach(enemy => {
            if (enemy.vx > 0) enemy.vx = enemy.speed;
            if (enemy.vx < 0) enemy.vx = -enemy.speed;
            if (enemy.vy > 0) enemy.vy = enemy.speed;
            if (enemy.vy < 0) enemy.vy = -enemy.speed;

            let chasing = false;

            if (!isPlayerSafe && hasLineOfSight(enemy, pCenterC, pCenterR)) {
                const eCenterC = Math.floor((enemy.x + enemy.width / 2) / TILE_SIZE);
                const eCenterR = Math.floor((enemy.y + enemy.height / 2) / TILE_SIZE);

                if (eCenterC === pCenterC) {
                    enemy.x = eCenterC * TILE_SIZE + 4;
                    enemy.vx = 0;
                    enemy.vy = (pCenterR > eCenterR) ? enemy.speed : -enemy.speed;
                    chasing = true;
                } else if (eCenterR === pCenterR) {
                    enemy.y = eCenterR * TILE_SIZE + 4;
                    enemy.vy = 0;
                    enemy.vx = (pCenterC > eCenterC) ? enemy.speed : -enemy.speed;
                    chasing = true;
                }
            }

            let canMoveX = false;
            let canMoveY = false;

            if (enemy.vx !== 0) {
                canMoveX = !checkWallCollision(enemy.x + enemy.vx, enemy.y, enemy.width, enemy.height) &&
                    !checkSafeCollision(enemy.x + enemy.vx, enemy.y, enemy.width, enemy.height);
            }
            if (enemy.vy !== 0) {
                canMoveY = !checkWallCollision(enemy.x, enemy.y + enemy.vy, enemy.width, enemy.height) &&
                    !checkSafeCollision(enemy.x, enemy.y + enemy.vy, enemy.width, enemy.height);
            }

            if (!chasing && Math.random() < 0.015) {
                canMoveX = false;
                canMoveY = false;
            }

            if (enemy.vx !== 0 && canMoveX) {
                enemy.x += enemy.vx;
            } else if (enemy.vy !== 0 && canMoveY) {
                enemy.y += enemy.vy;
            } else {
                let options = [
                    { vx: enemy.speed, vy: 0 }, { vx: -enemy.speed, vy: 0 },
                    { vx: 0, vy: enemy.speed }, { vx: 0, vy: -enemy.speed }
                ];

                options.sort(() => Math.random() - 0.5);

                if (!chasing) {
                    options = options.filter(op => op.vx !== -enemy.vx && op.vy !== -enemy.vy);
                }

                let moved = false;
                for (let op of options) {
                    if (!checkWallCollision(enemy.x + op.vx, enemy.y + op.vy, enemy.width, enemy.height) &&
                        !checkSafeCollision(enemy.x + op.vx, enemy.y + op.vy, enemy.width, enemy.height)) {
                        enemy.vx = op.vx;
                        enemy.vy = op.vy;
                        enemy.x += enemy.vx;
                        enemy.y += enemy.vy;
                        moved = true;
                        break;
                    }
                }

                if (!moved) {
                    let allOptions = [
                        { vx: enemy.speed, vy: 0 }, { vx: -enemy.speed, vy: 0 },
                        { vx: 0, vy: enemy.speed }, { vx: 0, vy: -enemy.speed }
                    ];
                    for (let op of allOptions.sort(() => Math.random() - 0.5)) {
                        if (!checkWallCollision(enemy.x + op.vx, enemy.y + op.vy, enemy.width, enemy.height) &&
                            !checkSafeCollision(enemy.x + op.vx, enemy.y + op.vy, enemy.width, enemy.height)) {
                            enemy.vx = op.vx;
                            enemy.vy = op.vy;
                            enemy.x += enemy.vx;
                            enemy.y += enemy.vy;
                            break;
                        }
                    }
                }
            }
        });
    }

    function checkCollisions() {
        for (let enemy of enemies) {
            if (
                player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y
            ) {
                takeDamage();
                return;
            }
        }
    }

    function takeDamage() {
        const damageFlash = () => {
            canvas.parentElement.classList.add('damage-flash');
            setTimeout(() => {
                canvas.parentElement.classList.remove('damage-flash');
            }, 400);
        };
        damageFlash();

        if (window.GameMaster && window.GameMasterIsActive) {
            window.GameMaster.loseLife();
            lives = window.GameMaster.getLives(); // sync internal visually if needed
        } else {
            lives--;
        }

        updateHUD();

        if (lives <= 0) {
            endGame("¡TE ATRAPARON!", false);
        } else {
            resetPlayer();
        }
    }

    function draw() {
        // Fondo base
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Dibujar mapa
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const tile = map[r][c];
                const x = c * TILE_SIZE;
                const y = r * TILE_SIZE;

                if (tile === TILE_WALL) {
                    ctx.fillStyle = '#334155'; // Color pared
                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#0f172a';
                    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
                }
                else if (tile === TILE_SAFE) {
                    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; // Verde transparente
                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                }
                else if (tile === TILE_COIN) {
                    ctx.beginPath();
                    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#fbbf24';
                    ctx.fill();
                    ctx.closePath();
                }
            }
        }

        // Si estamos esperando no dibujamos ni jugador ni enemigos
        if (gameState !== 'playing' && gameState !== 'ended') return;

        // Dibujar jugador
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        // Dibujar Enemigos
        enemies.forEach(e => {
            ctx.fillStyle = e.color;
            ctx.fillRect(e.x, e.y, e.width, e.height);

            // Ojos
            ctx.fillStyle = '#fff';
            ctx.fillRect(e.x + 6, e.y + 6, 6, 6);
            ctx.fillRect(e.x + 20, e.y + 6, 6, 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(e.x + 8, e.y + 8, 2, 2);
            ctx.fillRect(e.x + 22, e.y + 8, 2, 2);
        });
    }

    function updateHUD() {
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.innerText = score;
        const livesEl = document.getElementById('lives');
        if (livesEl) livesEl.innerText = lives;

        const timeEl = document.getElementById('time');
        if (timeEl) {
            timeEl.innerText = `--:--`; // No limit
        }
    }

    function endGame(reason = "FIN DEL JUEGO", win = false) {
        running = false;
        gameState = 'ended';
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = win ? "¡LOGRADO!" : "¡FALLO!";
        overlay.querySelector('p').innerText = reason;

        // Report to GameMaster
        if (window.GameMaster && window.GameMasterIsActive) {
            window.GameMaster.onGameResult(win);
        }
        updateHUD();
    }

    // Input listeners global
    window.addEventListener('keydown', (e) => {
        if (window.currentGameMode !== 'laberinto') return;

        if (keys.hasOwnProperty(e.key)) keys[e.key] = true;

        if (gameState === 'waiting') {
            if (e.key === 'Enter') startGame();
        } else if (gameState === 'playing') {
            // Prevent scrolling with arrows
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1) {
                e.preventDefault();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (window.currentGameMode !== 'laberinto') return;
        if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    });

    return {
        start: initGame,
        stop: () => {
            running = false;
            gameState = 'waiting';
            if (animationId) cancelAnimationFrame(animationId);

            // Cleanup visually if forced stop
            if (ctx && canvas) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };
})();

window.LaberintoGame = LaberintoGame;
