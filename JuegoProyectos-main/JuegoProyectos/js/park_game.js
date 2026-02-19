/**
 * PARQUE LIMPIO: ROBOT RECICLADOR
 * Versión simplificada Estilo Robot Reciclador Original
 */

const ParkGame = (() => {
    // --- CONFIGURACIÓN ---
    const CONFIG = {
        totalTime: 60, // Bastante más tiempo
        winScore: 15,
        moveStep: 40,
        colors: {
            grass: '#7CB342', path: '#8D6E63'
        },
        items: {
            trash: ["🍎", "🧴", "📄", "📦"],
            hazard: ["🐈", "🌳", "🐕"] // Opcional para variedad
        }
    };

    // --- ESTADO ---
    let state = {
        active: false, score: 0, time: CONFIG.totalTime, level: 1, lives: 4,
        items: [], player: { x: 400, y: 300 },
        lastFrame: 0, floatingTexts: [],
        keys: { w: false, a: false, s: false, d: false }
    };

    let canvas, ctx, animationFrameId;

    function init() {
        canvas = document.getElementById('gameCanvas');
        if (!canvas) return false;
        ctx = canvas.getContext('2d');
        return true;
    }

    function reset() {
        state.score = 0; state.time = CONFIG.totalTime; state.level = 1; state.lives = 4;
        state.items = []; state.floatingTexts = [];
        state.player = { x: 400, y: 300 };
        state.keys = { w: false, a: false, s: false, d: false };
        state.active = true;

        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    }

    function start() {
        if (!init()) return;
        reset();
        for (let i = 0; i < 5; i++) spawnItem();
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
        const key = e.key.toLowerCase();
        if (key === 'w' || key === 'arrowup') state.keys.w = true;
        if (key === 's' || key === 'arrowdown') state.keys.s = true;
        if (key === 'a' || key === 'arrowleft') state.keys.a = true;
        if (key === 'd' || key === 'arrowright') state.keys.d = true;

        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    }

    function handleKeyUp(e) {
        if (!state.active) return;
        const key = e.key.toLowerCase();
        if (key === 'w' || key === 'arrowup') state.keys.w = false;
        if (key === 's' || key === 'arrowdown') state.keys.s = false;
        if (key === 'a' || key === 'arrowleft') state.keys.a = false;
        if (key === 'd' || key === 'arrowright') state.keys.d = false;
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
        // Movimiento Jugador
        const speed = 250; // Velocidad en pixels por segundo
        if (state.keys.w) state.player.y -= speed * dt;
        if (state.keys.s) state.player.y += speed * dt;
        if (state.keys.a) state.player.x -= speed * dt;
        if (state.keys.d) state.player.x += speed * dt;

        // Limites
        state.player.x = Math.max(30, Math.min(770, state.player.x));
        state.player.y = Math.max(50, Math.min(370, state.player.y));
        state.time -= dt;
        if (state.time <= 0) { state.time = 0; endGame(state.score >= CONFIG.winScore); return; }

        // Progresión de niveles
        if (state.score >= 10 && state.level < 3) state.level = 3;
        else if (state.score >= 5 && state.level < 2) state.level = 2;

        // Movimiento de items según nivel
        state.items.forEach(item => {
            // Level 1: Estáticos o muy poco movimiento (default)
            if (state.level === 1) {
                // No movement or very slow drift if desired, keeping static for now as per implication of "appear" vs "move"
            }

            // Level 2: Derecha a Izquierda
            if (state.level === 2) {
                item.x -= 100 * dt; // Mover a la izquierda constantemente
                if (item.x < -50) item.x = 850; // Reaparecer por la derecha
            }

            // Level 3: Arriba, abajo, derecha, izquierda (Rebote)
            if (state.level === 3) {
                item.x += item.dx * dt * 60;
                item.y += item.dy * dt * 60;

                // Rebote
                if (item.x <= 30 || item.x >= 770) item.dx *= -1;
                if (item.y <= 50 || item.y >= 370) item.dy *= -1;
            }
        });

        // Aumentar cantidad de objetos en nivel 1
        let maxItems = (state.level === 1) ? 6 : (state.level === 2 ? 8 : 12);
        if (state.items.length < maxItems && Math.random() < 0.05) spawnItem();

        checkCollisions();

        state.floatingTexts.forEach((ft, i) => { ft.y -= 40 * dt; ft.life -= dt; if (ft.life <= 0) state.floatingTexts.splice(i, 1); });
        updateHUD();
    }

    function spawnItem() {
        const isHazard = Math.random() < 0.2; // Un poco más de oportunidad de hazard
        const type = isHazard ? 'hazard' : 'trash';
        const icons = CONFIG.items[type];

        let x, y, dx, dy;

        // Spawn logic based on level
        if (state.level === 2) {
            x = 850; // Start off-screen right
            y = Math.random() * 300 + 50;
            dx = 0; // Handled in update
            dy = 0;
        } else {
            x = Math.random() * 700 + 50;
            y = Math.random() * 250 + 80;
            dx = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random());
            dy = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random());
        }

        state.items.push({
            id: Math.random(),
            type: type,
            icon: icons[Math.floor(Math.random() * icons.length)],
            x: x,
            y: y,
            dx: dx,
            dy: dy
        });
    }

    function checkCollisions() {
        state.items.forEach((item, index) => {
            const dist = Math.sqrt((state.player.x - item.x) ** 2 + (state.player.y - item.y) ** 2);
            if (dist < 40) {
                if (item.type === 'hazard') {
                    state.lives--;
                    showFloatingText("HP -1", item.x, item.y, '#F44336');
                    if (state.lives <= 0) endGame(false);
                } else {
                    state.score++;
                    showFloatingText("+1", item.x, item.y, '#4CAF50');
                }
                state.items.splice(index, 1);
                if (state.score >= CONFIG.winScore) endGame(true);
            }
        });
    }

    function showFloatingText(text, x, y, color) { state.floatingTexts.push({ text, x, y, color, life: 1 }); }

    function draw() {
        // Fondo simple
        ctx.fillStyle = CONFIG.colors.grass; ctx.fillRect(0, 0, 800, 400);
        ctx.fillStyle = CONFIG.colors.path; ctx.fillRect(0, 0, 800, 50);

        // Dibujar items
        state.items.forEach(item => {
            ctx.save();
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Efecto de borde difuminado
            ctx.shadowBlur = 15;
            if (item.type === 'hazard') {
                ctx.shadowColor = 'rgba(255, 0, 0, 0.8)'; // Rojo para peligros
            } else {
                ctx.shadowColor = 'rgba(0, 255, 0, 0.8)'; // Verde para basura recogible
            }

            ctx.fillText(item.icon, item.x, item.y);
            ctx.restore();
        });

        // Dibujar Robot
        ctx.font = '55px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("🤖", state.player.x, state.player.y);

        // Feedback visual
        state.floatingTexts.forEach(ft => {
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 24px Rajdhani';
            ctx.fillText(ft.text, ft.x, ft.y);
        });

        // Nivel HUD en Canvas
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 18px Rajdhani';
        ctx.textAlign = 'center';
        ctx.fillText(`NIVEL ${state.level}`, 400, 25);
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
        overlay.querySelector('h3').innerText = win ? "¡PARQUE LIMPIO!" : "MISIÓN FALLIDA";
        overlay.querySelector('p').innerHTML = `Puntuación: ${state.score} | Nivel: ${state.level}<br>${win ? "¡Has salvado el pulmón de la ciudad!" : (state.lives <= 0 ? "Te has quedado sin integridad." : "Tiempo agotado.")}`;
    }

    return { start, stop };
})();
window.ParkGame = ParkGame;
