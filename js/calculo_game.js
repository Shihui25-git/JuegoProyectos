/**
 * CÁLCULO RÁPIDO - Arcade Game Logic
 * Resuelve las operaciones matemáticas antes de que caigan.
 * Estética: Pizarra verde clásica.
 */
const CalculoGame = (() => {
    let canvas, ctx;
    let running = false;
    let score = 0;
    let lives = 4;
    let gameState = 'waiting'; // 'waiting', 'playing', 'ended'
    let lastTime = 0;
    
    let operations = [];
    let spawnTimer = 0;
    let spawnInterval = 3000;
    let fallSpeed = 30; // pixels per second
    
    let typedAnswer = "";
    
    // Chalk colors
    const BOARD_COLOR = '#2b5329'; // dark green board
    const BORDER_COLOR = '#6b4d24'; // wood
    const CHALK_WHITE = '#f2f2f2';
    const CHALK_YELLOW = '#f7ea8b';
    const CHALK_RED = '#f07d7d';

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
        gameState = 'waiting';
        operations = [];
        spawnTimer = 0;
        spawnInterval = 3000;
        fallSpeed = 30;
        typedAnswer = "";
        
        // Fix potential button focus trapping keyboard events
        if (document.activeElement) document.activeElement.blur();
        window.focus();
        
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = "PULSA ENTER PARA EMPEZAR";
        overlay.querySelector('h3').style.color = "#fff";
        overlay.querySelector('p').innerText = "Cálculo Rápido: Resuelve las operaciones y pulsa Enter.";

        ctx.clearRect(0, 0, 800, 400);
        drawBoard();
        updateHUD();
    }

    function startGame() {
        if (!initCanvas()) return;
        running = true;
        score = 0;
        lives = 4;
        gameState = 'playing';
        operations = [];
        spawnTimer = 0;
        spawnInterval = 3000;
        fallSpeed = 30;
        typedAnswer = "";
        
        document.getElementById('game-overlay').classList.add('hidden');
        lastTime = performance.now();
        generateOperation();
        requestAnimationFrame(loop);
    }

    function generateOperation() {
        const types = ['+', '-', '*'];
        const opType = types[Math.floor(Math.random() * types.length)];
        let num1, num2, result;
        
        // Difficulty scaling based on score
        let difficulty = 1;
        if (score >= 20) difficulty = 3;
        else if (score >= 10) difficulty = 2;
        
        switch (opType) {
            case '+':
                num1 = Math.floor(Math.random() * (10 * difficulty)) + 1;
                num2 = Math.floor(Math.random() * (10 * difficulty)) + 1;
                result = num1 + num2;
                break;
            case '-':
                // Ensure positive result for subtraction
                num1 = Math.floor(Math.random() * (10 * difficulty)) + 5;
                num2 = Math.floor(Math.random() * num1) + 1;
                result = num1 - num2;
                break;
            case '*':
                const maxMult = (difficulty > 3) ? 10 : (difficulty > 1 ? 7 : 5);
                num1 = Math.floor(Math.random() * maxMult) + 2;
                num2 = Math.floor(Math.random() * maxMult) + 2;
                result = num1 * num2;
                break;
        }
        
        operations.push({
            text: `${num1} ${opType} ${num2}`,
            answer: result.toString(),
            x: Math.floor(Math.random() * (canvas.width - 200)) + 100,
            y: 40 // Start near top
        });
    }

    function loop(timestamp) {
        if (!running) return;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        if (gameState === 'playing') {
            update(deltaTime);
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBoard();
        drawGameElements();

        updateHUD();
        requestAnimationFrame(loop);
    }

    function update(dt) {
        // Adjust speed and spawn based on score
        let targetSpeed = 30;
        let targetSpawn = 3000;
        if (score >= 20) {
            targetSpeed = 45;
            targetSpawn = 2000;
        } else if (score >= 10) {
            targetSpeed = 38;
            targetSpawn = 2500;
        }
        
        fallSpeed = targetSpeed;
        spawnInterval = targetSpawn;

        // Spawn logic
        spawnTimer += dt;
        if (spawnTimer >= spawnInterval) {
            spawnTimer = 0;
            generateOperation();
        }

        // Move operations down
        const moveDist = fallSpeed * (dt / 1000);
        for (let i = operations.length - 1; i >= 0; i--) {
            operations[i].y += moveDist;
            // Check if it hit bottom
            if (operations[i].y > canvas.height - 40) { // Don't let it hit user input line
                operations.splice(i, 1);
                lives -= 1;
                typedAnswer = ""; // clear typed answer in panic
                if (lives <= 0) {
                    endGame("¡TE QUEDASTE SIN VIDAS!");
                }
            }
        }
    }

    function drawBoard() {
        // Wooden border
        ctx.fillStyle = BORDER_COLOR;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Chalkboard inside
        ctx.fillStyle = BOARD_COLOR;
        const borderThickness = 12;
        ctx.fillRect(borderThickness, borderThickness, canvas.width - borderThickness * 2, canvas.height - borderThickness * 2);

        // Eraser dust / smudges (subtle effect)
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.beginPath();
        ctx.arc(200, 150, 100, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(600, 250, 150, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawGameElements() {
        if (gameState !== 'playing') return;

        // Draw operations falling
        ctx.font = 'bold 36px "Comic Sans MS", cursive, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let op of operations) {
            ctx.fillStyle = CHALK_WHITE;
            ctx.fillText(op.text, op.x, op.y);
            // Draw chalk shadow for realism
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillText(op.text, op.x + 2, op.y + 2);
        }

        // Draw Typed Answer line
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(20, canvas.height - 40, canvas.width - 40, 2);

        ctx.font = 'bold 32px "Comic Sans MS", cursive, sans-serif';
        ctx.fillStyle = CHALK_YELLOW;
        ctx.textAlign = 'center';
        let displayText = "Respuesta: " + typedAnswer;
        if (Math.floor(performance.now() / 500) % 2 === 0) {
            displayText += "_";
        }
        ctx.fillText(displayText, canvas.width / 2, canvas.height - 20);
    }

    function checkAnswer() {
        if (gameState !== 'playing' || typedAnswer === "") return;

        // Check if any operation matches this answer
        // We prioritize the lowest one on screen
        let hitIndex = -1;
        let maxY = -1;
        for (let i = 0; i < operations.length; i++) {
            if (operations[i].answer === typedAnswer) {
                if (operations[i].y > maxY) {
                    maxY = operations[i].y;
                    hitIndex = i;
                }
            }
        }

        if (hitIndex !== -1) {
            // Correct answer
            operations.splice(hitIndex, 1);
            score += 2;
        } else {
            // Incorrect, optionally deduct a small penalty or just do nothing
            // In this version, we just do nothing and waiting for correct
        }
        typedAnswer = ""; // Always clear after Enter
    }

    function handleInput(key) {
        if (gameState !== 'playing') return;

        if (key === 'Enter') {
            checkAnswer();
            return;
        }

        if (key === 'Backspace') {
            typedAnswer = typedAnswer.slice(0, -1);
            return;
        }

        // Only allow numbers and maybe negative sign
        if (/^[0-9\-]$/.test(key)) {
            // Prevent too long answers
            if (typedAnswer.length < 5) {
                typedAnswer += key;
            }
        }
    }

    function updateHUD() {
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.innerText = score;

        const livesEl = document.getElementById('lives');
        if (livesEl) livesEl.innerText = lives;

        const timeEl = document.getElementById('time');
        if (timeEl) timeEl.innerText = 'INF';
    }

    function endGame(reason = "FIN DEL JUEGO") {
        running = false;
        gameState = 'ended';
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('hidden');
        overlay.querySelector('h3').innerText = reason;
        overlay.querySelector('h3').style.color = CHALK_RED;
        overlay.querySelector('p').innerText = "Puntos Finales: " + score + "\nPulsa ENTER para reintentar";
        updateHUD();
    }

    // Input listeners global
    window.addEventListener('keydown', (e) => {
        if (window.currentGameMode !== 'calculo') return;

        if (gameState !== 'playing') {
            if (e.key === 'Enter') startGame();
            return;
        }

        if (e.key === ' ' || e.key === 'Backspace' || e.key === 'Enter') {
            e.preventDefault();
        }

        handleInput(e.key);
    });

    return {
        start: initGame,
        stop: () => {
            running = false;
            gameState = 'waiting';
        }
    };
})();

window.CalculoGame = CalculoGame;
