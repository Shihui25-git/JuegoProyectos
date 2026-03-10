/**
 * BOSQUE EN PELIGRO: MISIÓN GUARDIÁN (ODS 15)
 */

const ForestGame = (() => {
    // --- CONFIGURACIÓN ---
    const CONFIG = {
        totalTime: 60,
        winScore: 15,
        moveStep: 40,
        maxFireSize: 60,
        colors: {
            forest: '#2E7D32', ground: '#5D4037'
        }
    };

    // --- ESTADO ---
    let state = {
        active: false, score: 0, time: CONFIG.totalTime, level: 1, lives: 4,
        fires: [], player: { x: 400, y: 300, speed: 300 },
        lastFrame: 0, floatingTexts: [],
        trees: [], // Posiciones estáticas de los árboles
        keys: { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false }
    };

    let canvas, ctx, animationFrameId;

    function init() {
        canvas = document.getElementById('gameCanvas');
        if (!canvas) return false;
        ctx = canvas.getContext('2d');

        // Generar árboles decorativos
        state.trees = [];
        for (let i = 0; i < 15; i++) {
            state.trees.push({
                x: Math.random() * 750 + 25,
                y: Math.random() * 250 + 80,
                icon: Math.random() > 0.5 ? "🌲" : "🌳"
            });
        }
        return true;
    }

    function reset() {
        state.score = 0; state.time = CONFIG.totalTime; state.level = 1; state.lives = 4;
        state.fires = []; state.floatingTexts = [];
        state.player = { x: 400, y: 300, speed: 300 };
        state.active = true;
        state.keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    }

    function start() {
        if (!init()) return;
        reset();
        spawnFire();
        state.lastFrame = performance.now();
        loop(state.lastFrame);
        document.getElementById('game-overlay').classList.add('hidden');

        // Reset HUD labels
        document.getElementById('score-label').innerText = "PUNTOS:";
        document.getElementById('score-goal').innerText = " / " + CONFIG.winScore;
    }

    function stop() {
        state.active = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    }

    function handleKeyDown(e) {
        if (!state.active) return;
        if (state.keys.hasOwnProperty(e.key)) state.keys[e.key] = true;
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    }

    function handleKeyUp(e) {
        if (!state.active) return;
        if (state.keys.hasOwnProperty(e.key)) state.keys[e.key] = false;
    }

    function loop(timestamp) {
        if (!state.active) return;
        const dt = Math.min((timestamp - state.lastFrame) / 1000, 0.1);
        state.lastFrame = timestamp;
        update(dt);
        draw();
        animationFrameId = requestAnimationFrame(loop);
    }

    function update(dt) {
        state.time -= dt;
        if (state.time <= 0) { state.time = 0; endGame(state.score >= CONFIG.winScore); return; }

        // Player movement
        if (state.keys.w || state.keys.ArrowUp) state.player.y -= state.player.speed * dt;
        if (state.keys.s || state.keys.ArrowDown) state.player.y += state.player.speed * dt;
        if (state.keys.a || state.keys.ArrowLeft) state.player.x -= state.player.speed * dt;
        if (state.keys.d || state.keys.ArrowRight) state.player.x += state.player.speed * dt;

        // Limites
        state.player.x = Math.max(30, Math.min(770, state.player.x));
        state.player.y = Math.max(50, Math.min(370, state.player.y));

        // Progresión de niveles
        if (state.score >= 10) state.level = 3;
        else if (state.score >= 5) state.level = 2;
        else state.level = 1;

        // Lógica de fuego
        let growthSpeed = 10 + (state.level * 5);
        state.fires.forEach((fire, index) => {
            fire.size += dt * growthSpeed;

            // Efecto de viento en Nivel 3
            if (state.level === 3) {
                fire.x += Math.sin(state.lastFrame / 500) * 0.5;
                fire.y += Math.cos(state.lastFrame / 700) * 0.5;
            }

            if (fire.size >= CONFIG.maxFireSize) {
                state.lives--;
                showFloatingText("¡BOSQUE DAÑADO!", fire.x, fire.y, '#F44336');
                state.fires.splice(index, 1);
                if (state.lives <= 0) endGame(false);
            }
        });

        // Spawning de fuego
        let spawnChance = 0.01 + (state.level * 0.01);
        let maxConcurrent = state.level;
        if (state.fires.length < maxConcurrent && Math.random() < spawnChance) {
            spawnFire();
        }

        checkCollisions();

        state.floatingTexts.forEach((ft, i) => { ft.y -= 40 * dt; ft.life -= dt; if (ft.life <= 0) state.floatingTexts.splice(i, 1); });
        updateHUD();
    }

    function spawnFire() {
        state.fires.push({
            x: Math.random() * 700 + 50,
            y: Math.random() * 250 + 80,
            size: 10
        });
    }

    function checkCollisions() {
        state.fires.forEach((fire, index) => {
            const dist = Math.sqrt((state.player.x - fire.x) ** 2 + (state.player.y - fire.y) ** 2);
            if (dist < 45) {
                state.score++;
                showFloatingText("+1 APAGADO", fire.x, fire.y, '#4CAF50');
                state.fires.splice(index, 1);

                if (state.score >= CONFIG.winScore) {
                    endGame(true);
                } else if (state.fires.length === 0) {
                    // Si matas el último fuego, spawnea uno nuevo pronto para no dejar al jugador aburrido
                    spawnFire();
                }
            }
        });
    }

    function showFloatingText(text, x, y, color) { state.floatingTexts.push({ text, x, y, color, life: 1 }); }

    function draw() {
        ctx.fillStyle = CONFIG.colors.forest; ctx.fillRect(0, 0, 800, 400);
        ctx.fillStyle = CONFIG.colors.ground; ctx.fillRect(0, 0, 800, 50);

        // Dibujar árboles decorativos
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        state.trees.forEach(tree => {
            ctx.fillText(tree.icon, tree.x, tree.y);
        });

        // Dibujar fuegos
        state.fires.forEach(fire => {
            ctx.font = `${fire.size}px Arial`;
            ctx.fillText("🔥", fire.x, fire.y);
        });

        // Dibujar Robot
        ctx.font = '55px Arial';
        ctx.fillText("🤖", state.player.x, state.player.y);

        // Feedback visual
        state.floatingTexts.forEach(ft => {
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 20px Rajdhani';
            ctx.fillText(ft.text, ft.x, ft.y);
        });

        // HUD Canvas
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Rajdhani';
        ctx.textAlign = 'center';
        ctx.fillText(`NIVEL ${state.level} - BOSQUE EN PELIGRO`, 400, 30);
    }

    function updateHUD() {
        const scoreEl = document.getElementById('score'),
            timeEl = document.getElementById('time'),
            levelEl = document.getElementById('current-level'),
            livesEl = document.getElementById('lives');

        if (scoreEl) scoreEl.textContent = state.score;
        if (levelEl) levelEl.textContent = state.level;
        if (livesEl) livesEl.textContent = state.lives;

        if (timeEl) {
            const m = Math.floor(state.time / 60), s = Math.floor(state.time % 60);
            timeEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        }
    }

    function endGame(win) {
        state.active = false;
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = win ? "¡BOSQUE SALVADO!" : "EL BOSQUE SE HA QUEMADO";

        let msg = win ?
            "Proteger los bosques es proteger la vida. Los incendios forestales afectan la biodiversidad y el clima." :
            "Los ecosistemas necesitan nuestra ayuda. La prevención es clave para evitar incendios forestales.";

        overlay.querySelector('p').innerHTML = `Puntuación: ${state.score}<br><br><span style="font-size: 14px; color: var(--accent-color);">${msg}</span>`;
    }

    return { start, stop };
})();
window.ForestGame = ForestGame;
