/**
 * GameMaster - Centralized state controller for microgames arcade.
 * Manages transitions, scores, lives, difficulty scaling, and speed multiplier.
 */
const GameMaster = (() => {
    const STATES = {
        MENU: 'MENU',
        INTERMISSION: 'INTERMISSION',
        PLAYING: 'PLAYING',
        RESULT: 'RESULT',
        GAMEOVER: 'GAMEOVER'
    };

    let currentState = STATES.MENU;
    let score = 0;
    let lives = 4; // User requested 4 lives
    let currentDifficulty = 'EASY';
    let speedMultiplier = 1.0;
    let currentGameIndex = -1;
    let availableGames = []; // Sequential pool for current round
    let isActive = false;

    const GAMES = [
        { id: 'eco', name: 'ECO-SORT', script: 'EcoSortGame' },
        { id: 'park', name: 'PARQUE LIMPIO', script: 'ParkGame' },
        { id: 'forest', name: 'BOSQUE EN PELIGRO', script: 'ForestGame' },
        { id: 'traffic', name: 'TRAFFIC CONTROL', script: 'TrafficControlGame' },
        { id: 'recycling', name: 'HERO RECYCLING', script: 'RecyclingHeroGame' },
        { id: 'energy', name: 'ENERGY GAME', script: 'EnergyGame' },
        { id: 'escribelo', name: 'ESCRÍBELO', script: 'EscribeloGame' },
        { id: 'calculo', name: 'CÁLCULO', script: 'CalculoGame' },
        { id: 'laberinto', name: 'EL LABERINTO', script: 'LaberintoGame' }
    ];

    // DOM Elements
    const screens = {
        menu: document.getElementById('game-menu'),
        intermission: document.getElementById('intermission-screen'),
        result: document.getElementById('result-screen'),
        game: document.getElementById('game-container-panel'),
        gameover: document.getElementById('game-over-screen')
    };

    const ui = {
        masterScore: document.getElementById('master-score'),
        masterLives: document.getElementById('master-lives'),
        nextGameName: document.getElementById('next-game-name'),
        finalScore: document.getElementById('final-score'),
        gameTitle: document.getElementById('game-title'),
        resultMessage: document.getElementById('result-message'),
        resultPoints: document.getElementById('result-points-label')
    };

    function init() {
        console.log("GameMaster Initialized");

        const restartBtn = document.getElementById('restart-master-btn');
        if (restartBtn) restartBtn.onclick = () => startMasterFlow();

        const exitBtn = document.getElementById('exit-to-menu-btn');
        if (exitBtn) exitBtn.onclick = () => location.reload();
    }

    function showScreen(screenId) {
        Object.values(screens).forEach(s => {
            if (s) s.classList.add('hidden');
        });
        if (screens[screenId]) screens[screenId].classList.remove('hidden');
    }

    function updateLivesUI() {
        if (ui.masterLives) {
            ui.masterLives.textContent = '❤️'.repeat(lives) + '🖤'.repeat(4 - lives);
        }
    }

    function startMasterFlow() {
        score = 0;
        lives = 4;
        speedMultiplier = 1.0;
        currentDifficulty = 'EASY';
        availableGames = []; // Reset pool
        isActive = true;
        window.GameMasterIsActive = true;
        currentState = STATES.INTERMISSION;
        nextGame();
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function updateDifficulty() {
        if (score >= 20) {
            currentDifficulty = 'HARD';
        } else if (score >= 10) {
            currentDifficulty = 'NORMAL';
        } else {
            currentDifficulty = 'EASY';
        }
    }

    function nextGame() {
        if (lives <= 0) {
            endMasterGame();
            return;
        }

        currentState = STATES.INTERMISSION;

        // Sequential Logic: Refill and shuffle if pool is empty
        if (availableGames.length === 0) {
            console.log("Refilling and shuffling game pool...");
            availableGames = shuffleArray([...GAMES]);
            // Ensure we don't pick the same game twice in a row during refill
            if (availableGames[0] === GAMES[currentGameIndex] && GAMES.length > 1) {
                const first = availableGames.shift();
                availableGames.push(first);
            }
        }

        const game = availableGames.pop();
        // IMPORTANT: We do NOT update currentGameIndex here. 
        // We do it in launchGame so we can stop the PREVIOUS one correctly.

        updateDifficulty();
        if (ui.masterScore) ui.masterScore.textContent = `${score} / 30`;
        updateLivesUI();
        if (ui.nextGameName) ui.nextGameName.textContent = game.name;

        // Show Level in intermission
        const levelMsg = currentDifficulty === 'HARD' ? 'NIVEL 3 - CRÍTICO' : (currentDifficulty === 'NORMAL' ? 'NIVEL 2 - AVANZADO' : 'NIVEL 1 - INICIACIÓN');
        if (ui.nextGameHint) ui.nextGameHint.innerHTML = `<span style="color: #aaa; font-size: 0.9rem;">${levelMsg}</span><br>Siguiente reto: <span id="next-game-name">${game.name}</span>`;

        showScreen('intermission');

        setTimeout(() => {
            launchGame(game);
        }, 2000);
    }

    function launchGame(game) {
        // Stop previous game if any BEFORE updating the index
        if (currentGameIndex >= 0) {
            const prevGame = GAMES[currentGameIndex];
            const prevObj = window[prevGame.script];
            if (prevObj && typeof prevObj.stop === 'function') {
                console.log(`Stopping previous game index ${currentGameIndex}: ${prevGame.id}`);
                prevObj.stop();
            }
        }

        // Update the current game index NOW
        currentGameIndex = GAMES.findIndex(g => g.id === game.id);

        clearGameUI();
        currentState = STATES.PLAYING;
        showScreen('game');

        if (ui.gameTitle) ui.gameTitle.textContent = game.name;

        // Set global mode for input handlers
        window.currentGameMode = game.id;

        const gameObj = window[game.script];
        if (gameObj && typeof gameObj.start === 'function') {
            console.log(`Launching ${game.id} (index ${currentGameIndex}) at ${currentDifficulty}`);
            gameObj.start(currentDifficulty, speedMultiplier);
        } else {
            console.error(`Game script ${game.script} not found!`);
            onGameResult(false);
        }
    }

    function onGameResult(win) {
        if (currentState !== STATES.PLAYING) {
            console.warn("onGameResult called while not in PLAYING state. ignoring.");
            return;
        }

        isActive = window.GameMasterIsActive;
        if (!isActive) return; // If manually launched a game, don't trigger master flow

        if (win) {
            score++;
            speedMultiplier += 0.02; // Dynamic speed increase (+2% per success)
            showResultFeedback(true);
        } else {
            // Only subtract life if we haven't already lost all lives during the game
            if (lives > 0) lives--;
            showResultFeedback(false);
        }
    }

    function loseLife() {
        if (currentState !== STATES.PLAYING) return;
        lives--;
        updateLivesUI();
        if (lives <= 0) {
            // Force end current game as a loss
            const currentObj = window[GAMES[currentGameIndex].script];
            if (currentObj && typeof currentObj.stop === 'function') {
                currentObj.stop();
            }
            onGameResult(false);
        }
    }

    function showResultFeedback(win) {
        currentState = STATES.RESULT;

        if (ui.resultMessage) {
            ui.resultMessage.textContent = win ? "¡BIEN!" : "¡FALLO!";
            ui.resultMessage.style.color = win ? "#2ecc71" : "#e74c3c";
        }

        if (ui.resultPoints) {
            ui.resultPoints.style.display = win ? "block" : "none";
        }

        // Only show result screen if GameMaster is active
        if (window.GameMasterIsActive) {
            showScreen('result');

            setTimeout(() => {
                if (lives <= 0 || score >= 30) {
                    endMasterGame();
                } else {
                    nextGame();
                }
            }, 1200);
        }
    }

    function endMasterGame() {
        currentState = STATES.GAMEOVER;
        const isVictory = score >= 30;

        if (ui.finalScore) ui.finalScore.textContent = score;

        const goTitle = document.querySelector('#game-over-screen h2');
        if (goTitle) {
            goTitle.textContent = isVictory ? "¡MISIÓN CUMPLIDA!" : "FIN DEL JUEGO";
            goTitle.style.color = isVictory ? "var(--accent-color)" : "#ff0000";
            goTitle.dataset.text = isVictory ? "¡MISIÓN CUMPLIDA!" : "FIN DEL JUEGO";
        }

        showScreen('gameover');
    }

    function clearGameUI() {
        // Reset overlay
        const overlay = document.getElementById('game-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            const h3 = overlay.querySelector('h3');
            if (h3) h3.innerText = "";
            const p = overlay.querySelector('p');
            if (p) p.innerText = "";
        }

        // Reset HUD labels to default
        const scoreLabel = document.getElementById('score-label');
        if (scoreLabel) scoreLabel.innerText = "PUNTOS:";
        const scoreGoal = document.getElementById('score-goal');
        if (scoreGoal) scoreGoal.innerText = "";

        // Clear canvas (optional but safe)
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    return {
        init,
        start: startMasterFlow,
        onGameResult,
        loseLife,
        getDifficulty: () => currentDifficulty,
        getLives: () => lives
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    GameMaster.init();
    window.GameMaster = GameMaster;
});
