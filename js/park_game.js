/**
 * PARQUE LIMPIO: RECICLAJE CON RATÓN
 * Versión de Arrastrar y Soltar con Contenedores
 */

const ParkGame = (() => {
    // --- CONFIGURACIÓN ---
    const CONFIG = {
        totalTime: 60,
        winScore: 15,
        colors: {
            grass: '#7CB342', path: '#8D6E63'
        },
        items: {
            trash: ["🍎", "🧴", "📄", "📦"],
            hazard: ["🐈", "🌳", "🐕"]
        },
        bins: [
            { id: 'yellow', color: '#FFEB3B', textColor: '#000', accept: ["🧴", "📦"], x: 150, y: 300, w: 100, h: 90, label: "ENVASES" },
            { id: 'blue', color: '#2196F3', textColor: '#FFF', accept: ["📄"], x: 350, y: 300, w: 100, h: 90, label: "PAPEL" },
            { id: 'brown', color: '#795548', textColor: '#FFF', accept: ["🍎"], x: 550, y: 300, w: 100, h: 90, label: "ORGÁNICO" }
        ]
    };

    // --- ESTADO ---
    let state = {
        active: false, score: 0, time: 15, level: 1, lives: 4,
        items: [],
        lastFrame: 0, floatingTexts: [],
        draggedItem: null,
        winScore: 5
    };

    let canvas, ctx, animationFrameId;

    // Almacenamos referencias a las funciones bindeables
    let handlers = {};

    function init() {
        canvas = document.getElementById('gameCanvas');
        if (!canvas) return false;
        ctx = canvas.getContext('2d');

        // Setup event listener bindings
        handlers.mousedown = handleMouseDown;
        handlers.mousemove = handleMouseMove;
        handlers.mouseup = handleMouseUp;
        handlers.mouseleave = handleMouseUp; // Handle dragging outside canvas
        return true;
    }

    function reset() {
        state.score = 0; state.time = CONFIG.totalTime; state.level = 1; state.lives = 4;
        state.items = []; state.floatingTexts = [];
        state.draggedItem = null;
        state.active = true;

        removeEvents();
        addEvents();
    }

    function addEvents() {
        canvas.addEventListener('mousedown', handlers.mousedown);
        canvas.addEventListener('mousemove', handlers.mousemove);
        canvas.addEventListener('mouseup', handlers.mouseup);
        canvas.addEventListener('mouseleave', handlers.mouseleave);
    }

    function removeEvents() {
        canvas.removeEventListener('mousedown', handlers.mousedown);
        canvas.removeEventListener('mousemove', handlers.mousemove);
        canvas.removeEventListener('mouseup', handlers.mouseup);
        canvas.removeEventListener('mouseleave', handlers.mouseleave);
    }

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    function handleMouseDown(e) {
        if (!state.active) return;
        const pos = getMousePos(e);

        // Check collision in reverse order to prefer top items (most recently spawned)
        for (let i = state.items.length - 1; i >= 0; i--) {
            const item = state.items[i];
            const dist = Math.sqrt((pos.x - item.x) ** 2 + (pos.y - item.y) ** 2);
            if (dist < 30) { // 30px hit radius
                if (item.type === 'hazard') {
                    // Clickeaste un hazard (gato, perro, árbol)
                    if (window.GameMaster) window.GameMaster.loseLife();
                    else state.lives--;
                    showFloatingText("HP -1", item.x, item.y, '#F44336');
                    state.items.splice(i, 1);
                } else {
                    // Clickeaste una basura, start dragging
                    state.draggedItem = item;
                    // Mover el objeto arrastrado al final del array (dibujar encima)
                    state.items.splice(i, 1);
                    state.items.push(item);
                }
                break;
            }
        }
    }

    function handleMouseMove(e) {
        if (!state.active || !state.draggedItem) return;
        const pos = getMousePos(e);
        state.draggedItem.x = pos.x;
        state.draggedItem.y = pos.y;
    }

    function handleMouseUp(e) {
        if (!state.active || !state.draggedItem) return;
        const pos = getMousePos(e);

        // Comprobar si soltamos sobre un contenedor
        let overBin = null;
        for (let b of CONFIG.bins) {
            // Chequear si (pos.x, pos.y) está dentro del rect del contenedor
            if (pos.x >= b.x && pos.x <= b.x + b.w &&
                pos.y >= b.y && pos.y <= b.y + b.h) {
                overBin = b;
                break;
            }
        }

        if (overBin) {
            // Verificar si pertenece
            if (overBin.accept.includes(state.draggedItem.icon)) {
                state.score++;
                showFloatingText("+1", pos.x, pos.y, '#4CAF50');
            } else {
                if (window.GameMaster) window.GameMaster.loseLife();
                else state.lives--;
                showFloatingText("ERROR -1 HP", pos.x, pos.y, '#F44336');
            }
            // Destruir el item (está al final de state.items, ya que lo movimos en mousedown)
            state.items.pop();
            if (state.score >= state.winScore) endGame(true);
        }

        state.draggedItem = null;
    }

    function    start(difficulty = 'EASY', speedMultiplier = 1.0) {
        this.difficulty = (difficulty || 'EASY').toString().toUpperCase();
        this.finishTimeMultiplier = speedMultiplier || 1.0;
        if (!init()) return;
        reset();
        
        // Adjust based on difficulty
        const diff = difficulty.toUpperCase();
        if (diff === 'NORMAL') {
            state.winScore = 5;
            state.level = 2;
        } else if (diff === 'HARD') {
            state.winScore = 8;
            state.level = 3;
        } else {
            state.winScore = 2;
            state.level = 1;
        }

        // Apply speed multiplier to time
        const baseTime = 15; // 15 seconds base
        state.time = Math.max(7, baseTime / speedMultiplier);

        for (let i = 0; i < 5; i++) spawnItem();
        state.lastFrame = performance.now();
        loop(state.lastFrame);
        document.getElementById('game-overlay').classList.add('hidden');
        
        // Clear residual instructions
        const ctrlP = document.getElementById('game-controls');
        if (ctrlP) ctrlP.innerText = "RATÓN: Arrastra cada residuo a su cubo";
        const instP = document.getElementById('game-instruction');
        if (instP) instP.innerText = "";

        // Reset HUD labels
        document.getElementById('score-label').innerText = "OBJETIVO:";
        document.getElementById('score-goal').innerText = " / " + state.winScore;
    }

    function stop() {
        state.active = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        removeEvents();
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
        if (state.time <= 0) { state.time = 0; endGame(state.score >= state.winScore); return; }

        // Progresión de niveles (5 puntos por nivel)
        if (state.score >= 10 && state.level < 3) state.level = 3;
        else if (state.score >= 5 && state.level < 2) state.level = 2;

        // Movimiento de items según nivel
        state.items.forEach(item => {
            // No mover el item que está siendo arrastrado
            if (item === state.draggedItem) return;

            // Restringir el y máximo para que la basura no se solape demasiado con los contenedores
            const maxY = 250;

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
                if (item.y <= 50 || item.y >= maxY) item.dy *= -1;
            }
        });

        // Aumentar cantidad de objetos
        let maxItems = (state.level === 1) ? 6 : (state.level === 2 ? 8 : 12);
        if (state.items.length < maxItems && Math.random() < 0.05) spawnItem();

        state.floatingTexts.forEach((ft, i) => { ft.y -= 40 * dt; ft.life -= dt; if (ft.life <= 0) state.floatingTexts.splice(i, 1); });
        updateHUD();
    }

    function spawnItem() {
        const isHazard = Math.random() < 0.2; // Un poco más de oportunidad de hazard
        const type = isHazard ? 'hazard' : 'trash';
        const icons = CONFIG.items[type];

        let x, y, dx, dy;
        const maxY = 250; // No spawnear sobre los contenedores

        if (state.level === 2) {
            x = 850; // Start off-screen right
            y = Math.random() * (maxY - 50) + 50;
            dx = 0;
            dy = 0;
        } else {
            x = Math.random() * 700 + 50;
            y = Math.random() * (maxY - 80) + 80;
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

    function showFloatingText(text, x, y, color) { state.floatingTexts.push({ text, x, y, color, life: 1 }); }

    function draw() {
        // Fondo simple
        ctx.fillStyle = CONFIG.colors.grass; ctx.fillRect(0, 0, 800, 400);
        ctx.fillStyle = CONFIG.colors.path; ctx.fillRect(0, 0, 800, 50);

        // Dibujar contenedores de reciclaje
        if (ctx.roundRect) {
            CONFIG.bins.forEach(b => {
                ctx.fillStyle = b.color;
                // Sombra suave
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 5;
                ctx.shadowOffsetY = 3;

                ctx.beginPath();
                ctx.roundRect(b.x, b.y, b.w, b.h, 10);
                ctx.fill();

                // Reset sombra
                ctx.shadowBlur = 0;
                ctx.shadowOffsetY = 0;

                // Label e Icono guía
                ctx.fillStyle = b.textColor;
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(b.label, b.x + b.w / 2, b.y + 25);

                // Dibujar pequeña indicación de lo que entra
                ctx.font = '24px Arial';
                ctx.fillText(b.accept.join(" "), b.x + b.w / 2, b.y + 60);
            });
        } else {
            CONFIG.bins.forEach(b => {
                ctx.fillStyle = b.color;
                ctx.fillRect(b.x, b.y, b.w, b.h);

                ctx.fillStyle = b.textColor;
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(b.label, b.x + b.w / 2, b.y + 25);

                ctx.font = '24px Arial';
                ctx.fillText(b.accept.join(" "), b.x + b.w / 2, b.y + 60);
            });
        }

        // Dibujar items
        state.items.forEach(item => {
            ctx.save();
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Efecto de borde difuminado
            ctx.shadowBlur = 15;
            if (item.type === 'hazard') {
                ctx.shadowColor = 'rgba(255, 0, 0, 0.8)'; // Rojo para peligros
            } else {
                ctx.shadowColor = 'rgba(0, 255, 0, 0.8)'; // Verde para basura
            }

            // Cambiar el tamaño si se arrastra
            if (item === state.draggedItem) {
                ctx.font = '50px Arial';
                ctx.shadowBlur = 20;
            }

            ctx.fillText(item.icon, item.x, item.y);
            ctx.restore();
        });

        // Feedback visual
        state.floatingTexts.forEach(ft => {
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 24px Rajdhani';
            ctx.textAlign = 'center';
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
            const timeRounded = Math.ceil(state.time);
            const m = Math.floor(timeRounded / 60), s = timeRounded % 60;
            timeEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        }
    }

    function endGame(win) {
        state.active = false;
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = win ? "¡PARQUE LIMPIO!" : "¡FALLO!";
        overlay.querySelector('p').innerHTML = win ? "¡Excelente trabajo!" : "Aún queda basura...";

        // Report to GameMaster if available
        if (window.GameMaster) {
            window.GameMaster.onGameResult(win);
        }
    }

    return { start, stop };
})();
window.ParkGame = ParkGame;