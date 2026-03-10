/**
 * ESCRIBELO - Arcade Game Logic
 * Escribe las palabras correctamente antes de que acabe el tiempo.
 * Estética: Cuadro de museo clásico.
 */
const EscribeloGame = (() => {
    let canvas, ctx;
    let running = false;
    let score = 0;
    let lives = 4;
    let gameState = 'waiting'; // 'waiting', 'playing', 'ended'
    let lastTime = 0;
    
    // Timer
    let timeRemaining = 60;
    let lastTimerTick = 0;

    // Words
    const wordsPhase1 = [
        "sol", "mar", "pan", "luz", "sal", "red", "pez", "voz", "rey", "sur",
        "casa", "agua", "gato", "flor", "luna", "tren", "cruz", "pato", "lobo", "leon",
        "bota", "ropa", "nido", "faro", "sopa", "lobo", "miel", "frio", "hoja", "boca"
    ];
    const wordsPhase2 = [
        "reloj", "raton", "color", "pared", "cielo", "jugar", "nube", "motor", "fuego", "playa",
        "perro", "silla", "libro", "verde", "largo", "plato", "nariz", "papel", "rueda", "cajas",
        "mando", "cable", "vuelo", "reina", "nieve", "zorro", "tigre", "globo", "barco", "lapiz"
    ];
    const wordsPhase3 = [
        "teclado", "colegio", "ventana", "caballo", "cuchara", "planeta", "trabajo", "escuela",
        "camino", "espejo", "pelota", "hermano", "caminos", "estudio", "pintura", "basura",
        "comida", "piedra", "puerta", "camello", "palabra", "bosques", "sonrisa", "botella"
    ];

    let currentPhase = 1;
    let currentWord = "";
    let typedText = "";
    let flashColor = null;
    let flashTimer = 0;

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
        lives = 4;
        timeRemaining = 60;
        currentPhase = 1;
        gameState = 'waiting';
        currentWord = "";
        typedText = "";
        
        // Fix potential button focus trapping keyboard events
        if (document.activeElement) document.activeElement.blur();
        window.focus();
        
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = "PULSA ENTER PARA EMPEZAR";
        overlay.querySelector('h3').style.color = "#fff";
        overlay.querySelector('p').innerText = "Escríbelo: Escribe las palabras correctamente con tu teclado.";

        ctx.clearRect(0, 0, 800, 400);
        drawBackground();
        updateHUD();
    }

    function startGame() {
        if (!initCanvas()) return;
        running = true;
        score = 0;
        lives = 4;
        timeRemaining = 60;
        currentPhase = 1;
        gameState = 'playing';
        typedText = "";
        flashColor = null;
        
        document.getElementById('game-overlay').classList.add('hidden');
        lastTime = performance.now();
        lastTimerTick = lastTime;
        spawnWord();
        requestAnimationFrame(loop);
    }

    function spawnWord() {
        checkPhase();
        let wordArray;
        if (currentPhase === 1) wordArray = wordsPhase1;
        else if (currentPhase === 2) wordArray = wordsPhase2;
        else wordArray = wordsPhase3;

        const randomIndex = Math.floor(Math.random() * wordArray.length);
        currentWord = wordArray[randomIndex];
        typedText = "";
    }

    function checkPhase() {
        if (score >= 20) {
            currentPhase = 3;
        } else if (score >= 10) {
            currentPhase = 2;
        } else {
            currentPhase = 1;
        }
    }

    function loop(timestamp) {
        if (!running) return;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        if (gameState === 'playing') {
            update(timestamp);
        }

        ctx.clearRect(0, 0, 800, 400);
        drawBackground();
        drawGameText();
        drawFlash(deltaTime);

        updateHUD();
        requestAnimationFrame(loop);
    }

    function update(timestamp) {
        // Timer countdown
        if (timestamp - lastTimerTick >= 1000) {
            timeRemaining--;
            lastTimerTick = timestamp;
            if (timeRemaining <= 0) {
                endGame("¡TIEMPO AGOTADO!");
            }
        }
    }

    function drawBackground() {
        // Museum wall background (around the frame)
        ctx.fillStyle = '#4a0e17'; // deep red museum wall
        ctx.fillRect(0, 0, 800, 400);

        // Frame Outer (Gold/Wood gradient)
        let grad = ctx.createLinearGradient(100, 20, 700, 380);
        grad.addColorStop(0, '#d4af37'); // Gold
        grad.addColorStop(0.5, '#aa7e18');
        grad.addColorStop(1, '#8c6510');
        ctx.fillStyle = grad;
        ctx.fillRect(80, 20, 640, 360);

        // Frame Inner shadow/Bevel
        ctx.fillStyle = '#5c4104';
        ctx.fillRect(100, 40, 600, 320);

        // Canvas (Linen)
        ctx.fillStyle = '#f4ecd8'; // Off-white/cream
        ctx.fillRect(110, 50, 580, 300);

        // Plaque at the bottom
        ctx.fillStyle = '#ebd68c';
        ctx.fillRect(350, 365, 100, 25);
        ctx.fillStyle = '#000';
        ctx.font = '12px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Nº ' + (score/2 + 1) + ' - Fase ' + currentPhase, 400, 377);
    }

    function drawGameText() {
        if (gameState !== 'playing' || !currentWord) return;

        // Draw Target Word
        ctx.font = 'italic 48px "Times New Roman", Times, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = '#333';
        ctx.fillText(currentWord, 400, 160);

        // Draw Typed Text
        ctx.font = 'bold 40px monospace';
        
        // Measure the full text to find start position for typing text
        // Note: monospace font helps standardizing widths, but we can measure exactly.
        const typedWidth = ctx.measureText(typedText).width;
        
        ctx.textAlign = 'center';
        ctx.fillStyle = '#226b3c'; // Dark green for typed letters
        ctx.fillText(typedText, 400, 240);

        // Draw a blinking cursor just after the text
        if (Math.floor(performance.now() / 500) % 2 === 0) {
            ctx.fillStyle = '#888';
            ctx.fillRect(400 + (typedWidth / 2) + 2, 220, 3, 40);
        }
        
        // Message / Feedback
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#666';
        if (typedText.length === 0) {
            ctx.fillText("Escribe...", 400, 300);
        }
    }

    function drawFlash(dt) {
        if (flashTimer > 0) {
            flashTimer -= dt;
            ctx.fillStyle = flashColor;
            ctx.fillRect(110, 50, 580, 300); // Only flash the canvas area
        }
    }

    function triggerFlash(color, dur) {
        flashColor = color;
        flashTimer = dur;
    }

    function checkTyping(key) {
        if (gameState !== 'playing') return;

        // Backspace
        if (key === 'Backspace') {
            typedText = typedText.slice(0, -1);
            return;
        }

        // Ignore non-single character keys
        if (key.length !== 1) return;

        const char = key.toLowerCase();
        // Disallow symbols and accept a-zñ
        if (!/^[a-zñ]$/.test(char)) return;

        const expectedChar = currentWord[typedText.length];

        if (char === expectedChar) {
            typedText += char;
            
            // Finished word?
            if (typedText === currentWord) {
                score += 2;
                // Reward extra time for correctness to enable infinite play
                timeRemaining += 2;
                triggerFlash('rgba(0, 255, 0, 0.3)', 150);
                spawnWord();
            }
        } else {
            // Error!
            triggerError();
        }
    }

    function triggerError() {
        lives--;
        typedText = ""; // reset typed text on error
        triggerFlash('rgba(255, 0, 0, 0.4)', 200);
        
        if (lives <= 0) {
            endGame("¡TE HAS QUEDADO SIN VIDAS!");
        }
    }

    function updateHUD() {
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.innerText = score;

        const livesEl = document.getElementById('lives');
        if (livesEl) livesEl.innerText = lives;

        const timeEl = document.getElementById('time');
        if (timeEl) {
            let m = Math.floor(timeRemaining / 60);
            let s = timeRemaining % 60;
            timeEl.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
            
            if (timeRemaining <= 10 && timeRemaining > 0) {
                timeEl.style.color = '#ff4d4d';
            } else {
                timeEl.style.color = '';
            }
        }
    }

    function endGame(reason = "FIN DEL JUEGO") {
        running = false;
        gameState = 'ended';
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = reason;
        overlay.querySelector('h3').style.color = reason.includes('GANADO') ? "#0fa" : "#ff4d4d";
        overlay.querySelector('p').innerText = "Puntuación Final: " + score + "\nPulsa ENTER para reintentar";
        updateHUD();
    }

    // Input listeners global
    window.addEventListener('keydown', (e) => {
        if (window.currentGameMode !== 'escribelo') return;

        if (gameState !== 'playing') {
            if (e.key === 'Enter') startGame();
            return;
        }

        // Prevent space/backspace scrolling
        if (e.key === ' ' || e.key === 'Backspace') {
            e.preventDefault();
        }

        checkTyping(e.key);
    });

    return {
        start: initGame,
        stop: () => {
            running = false;
            gameState = 'waiting';
        }
    };
})();

window.EscribeloGame = EscribeloGame;
