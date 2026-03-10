// ==========================================
// CALCULADORA - INTEGRADA EN EL CANVAS (ODS)
// ==========================================

window.CalculoGame = (function () {
    let canvas, ctx;
    let score = 0;
    let lives = 4;
    let correctAnswer = null;
    let currentPhase = 1;
    let timeRemaining = 60;
    let timerInterval = null;
    let animationFrameId = null;

    let isPlaying = false;
    let problemString = "";
    let feedbackMsg = "";
    let feedbackTimer = 0;
    let isFeedbackCorrect = false;
    let userInput = ""; // Para capturar lo que teclea el usuario
    let gameOver = false;
    let isWin = false;

    // Elementos del HUD externo
    let externalScoreDisplay, externalTimeDisplay, externalLivesDisplay;

    function init() {
        canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        // Referencias al HUD del portal
        externalScoreDisplay = document.getElementById('score');
        externalTimeDisplay = document.getElementById('time');
        externalLivesDisplay = document.getElementById('lives');

        // Event listener para teclado
        window.addEventListener('keydown', handleKeyDown);
    }

    function handleKeyDown(e) {
        if (!isPlaying || gameOver) return;

        // Si es un número (teclas de arriba o numpad)
        if (!isNaN(e.key) && e.key !== ' ') {
            userInput += e.key;
        }
        // Si es retroceso para borrar
        else if (e.key === 'Backspace') {
            userInput = userInput.slice(0, -1);
        }
        // Si pulsa Enter y ha escrito algo, validar
        else if (e.key === 'Enter' && userInput.length > 0) {
            checkAnswer();
        }
    }

    // ==========================================
    // UTILIDADES MATEMÁTICAS
    // ==========================================
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // ==========================================
    // CONTROL DEL TIEMPO
    // ==========================================
    function startTimer() {
        clearInterval(timerInterval);
        timeRemaining = 60;
        updateExternalHUD();

        timerInterval = setInterval(() => {
            timeRemaining--;
            updateExternalHUD();

            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                triggerGameOver(false);
            }
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    // ==========================================
    // GENERACIÓN DE PROBLEMAS
    // ==========================================
    function generateProblem() {
        checkPhase();

        result = 0;
        let operations;

        if (currentPhase === 3) {
            operations = ['+', '-', '*'];
        } else {
            operations = ['+', '-', '*', '/'];
        }

        let isTripleSum = (Math.random() < 0.2) && operations.includes('+');

        if (isTripleSum) {
            let minLimit, maxLimit;
            if (currentPhase === 1) { minLimit = 1; maxLimit = 10; }
            else if (currentPhase === 2) { minLimit = 10; maxLimit = 30; }
            else { minLimit = 20; maxLimit = 50; }

            let a = getRandomInt(minLimit, maxLimit);
            let b = getRandomInt(minLimit, maxLimit);
            let c = getRandomInt(minLimit, maxLimit);

            problemString = `${a} + ${b} + ${c} =`;
            result = a + b + c;
        } else {
            let op = operations[getRandomInt(0, operations.length - 1)];
            let a, b;

            switch (op) {
                case '+':
                    if (currentPhase === 1) { a = getRandomInt(1, 15); b = getRandomInt(1, 15); }
                    else if (currentPhase === 2) { a = getRandomInt(10, 50); b = getRandomInt(10, 50); }
                    else { a = getRandomInt(50, 100); b = getRandomInt(50, 100); }

                    problemString = `${a} + ${b} =`;
                    result = a + b;
                    break;
                case '-':
                    if (currentPhase === 1) { a = getRandomInt(1, 15); b = getRandomInt(1, 15); }
                    else if (currentPhase === 2) { a = getRandomInt(10, 50); b = getRandomInt(10, 50); }
                    else { a = getRandomInt(50, 100); b = getRandomInt(50, 100); }

                    if (a < b) { let temp = a; a = b; b = temp; }

                    problemString = `${a} - ${b} =`;
                    result = a - b;
                    break;
                case '*':
                    if (currentPhase === 1) { a = getRandomInt(1, 5); b = getRandomInt(1, 5); }
                    else if (currentPhase === 2) { a = getRandomInt(1, 10); b = getRandomInt(1, 10); }
                    else { a = getRandomInt(10, 20); b = getRandomInt(2, 5); }

                    problemString = `${a} × ${b} =`;
                    result = a * b;
                    break;
                case '/':
                    if (currentPhase === 1) {
                        b = getRandomInt(1, 5);
                        result = getRandomInt(1, 5);
                        a = b * result;
                    } else if (currentPhase === 2) {
                        b = getRandomInt(2, 10);
                        result = getRandomInt(2, 10);
                        a = b * result;
                    }
                    problemString = `${a} ÷ ${b} =`;
                    break;
            }
        }

        correctAnswer = result;
        userInput = ""; // Reiniciar input del usuario
    }

    // ==========================================
    // LÓGICA DE FASES Y ESTADO
    // ==========================================
    function checkPhase() {
        if (score >= 20) {
            currentPhase = 3;
        } else if (score >= 10 && score < 20) {
            currentPhase = 2;
        } else {
            currentPhase = 1;
        }
    }

    function showFeedback(isCorrect, message) {
        isFeedbackCorrect = isCorrect;
        feedbackMsg = message;
        feedbackTimer = 60; // Mostrar durante 60 frames (aprox 1s)
    }

    function checkAnswer() {
        if (!isPlaying || gameOver) return;

        let answer = parseInt(userInput, 10);

        if (answer === correctAnswer) {
            score += 2;
            showFeedback(true, '¡Correcto! +2 pts');

            if (score >= 30) {
                triggerGameOver(true);
            } else {
                generateProblem();
            }
        } else {
            lives--;
            showFeedback(false, `Mal. Era ${correctAnswer}`);
            userInput = ""; // Limpiar para que intente de nuevo

            if (lives <= 0) {
                triggerGameOver(false);
            } else {
                generateProblem(); // Opcional: Generar uno nuevo si falla
            }
        }
        updateExternalHUD();
    }

    function triggerGameOver(win) {
        isPlaying = false;
        gameOver = true;
        isWin = win;
        stopTimer();
    }

    function updateExternalHUD() {
        if (externalScoreDisplay) externalScoreDisplay.innerText = score;

        // Formato de tiempo M:SS
        if (externalTimeDisplay) {
            let m = Math.floor(Math.max(0, timeRemaining) / 60);
            let s = Math.max(0, timeRemaining) % 60;
            externalTimeDisplay.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        }

        if (externalLivesDisplay) externalLivesDisplay.innerText = lives;
    }

    // ==========================================
    // RENDERIZADO CANVAS (PIZARRA)
    // ==========================================
    function draw() {
        if (!ctx) return;

        // Limpiar
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dibujar Pizarra Verde
        ctx.fillStyle = '#1e3f20'; // Verde pizarra oscuro
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Borde de madera
        ctx.strokeStyle = '#8b5a2b';
        ctx.lineWidth = 15;
        ctx.strokeRect(7.5, 7.5, canvas.width - 15, canvas.height - 15);

        // Dibujar Textos Globales (Estilo tiza)
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.shadowBlur = 4;

        // Puntuación Arriba Izquierda
        ctx.font = '24px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`PTS: ${score}`, 30, 50);

        // Vidas Arriba Derecha
        ctx.textAlign = 'right';
        ctx.fillText(`VIDAS: ${lives}`, canvas.width - 30, 50);

        // Etapa/Fase
        ctx.textAlign = 'center';
        ctx.font = '16px "Press Start 2P", monospace';
        ctx.fillText(`FASE ${currentPhase}`, canvas.width / 2, 40);

        ctx.shadowBlur = 0; // Quitar sombra para el resto

        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = isWin ? '#7aff7a' : '#ff4c4c';
            ctx.font = '40px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(isWin ? "¡ENHORABUENA!" : "¡FIN DE LA CLASE!", canvas.width / 2, canvas.height / 2 - 20);

            ctx.fillStyle = '#fff';
            ctx.font = '20px "Press Start 2P"';
            ctx.fillText(`Puntuación Final: ${score}`, canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillText("Pulsa ENTER para reiniciar", canvas.width / 2, canvas.height / 2 + 70);

            return;
        }

        if (!isPlaying) return;

        // Dibujar Problema Central
        ctx.fillStyle = '#fff';
        ctx.font = '50px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(problemString, canvas.width / 2, canvas.height / 2 - 20);

        // Dibujar Input del Usuario
        ctx.fillStyle = '#ffdb58'; // Tiza amarilla
        ctx.font = '60px "Press Start 2P", monospace';

        // Barra de cursor intermitente
        let cursor = (Math.floor(Date.now() / 500) % 2 === 0) ? "_" : " ";
        ctx.fillText(userInput + cursor, canvas.width / 2, canvas.height / 2 + 60);

        // Dibujar mensaje de feedback si está activo
        if (feedbackTimer > 0) {
            ctx.fillStyle = isFeedbackCorrect ? '#7aff7a' : '#ff4c4c';
            ctx.font = '20px "Press Start 2P"';
            ctx.fillText(feedbackMsg, canvas.width / 2, canvas.height / 2 + 130);
            feedbackTimer--;
        }
    }

    function gameLoop() {
        draw();

        if (isPlaying || gameOver) {
            animationFrameId = requestAnimationFrame(gameLoop);
        }
    }

    // ==========================================
    // EXPORTACIÓN API
    // ==========================================
    return {
        start: function () {
            if (!canvas) init();

            const overlay = document.getElementById('game-overlay');
            if (overlay) overlay.classList.add('hidden');

            score = 0;
            lives = 4;
            currentPhase = 1;
            gameOver = false;
            isPlaying = true;
            feedbackTimer = 0;
            userInput = "";

            generateProblem();
            startTimer();
            updateExternalHUD();

            // Iniciar bucle solo si no hay otro
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            gameLoop();
        },

        stop: function () {
            isPlaying = false;
            stopTimer();
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            window.removeEventListener('keydown', handleKeyDown);
        }
    };
})();

// Listener global para arrancar con ENTER si estamos en la pantalla de inicio del juego o en GameOver
document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        const overlay = document.getElementById('game-overlay');
        const isOverlayVisible = overlay && !overlay.classList.contains('hidden');

        // Si estamos en el modo de cálculo, y (el overlay es visible O estamos en Game Over)
        if (window.currentGameMode === 'calculo') {
            if (isOverlayVisible || (window.CalculoGame && window.CalculoGame.gameOver)) {
                window.CalculoGame.start();
            }
        }
    }
});
