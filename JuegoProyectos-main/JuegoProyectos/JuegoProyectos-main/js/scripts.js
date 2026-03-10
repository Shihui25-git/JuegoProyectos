console.log("System Initialized...");
console.log("Welcome to the Project Mainframe.");

// ========== GESTIÓN GLOBAL DE LA INTERFAZ ==========
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos de navegación y secciones
    const sections = document.querySelectorAll('.screen');
    const navLinks = document.querySelectorAll('nav a');
    const startBtn = document.getElementById('start-btn');

    // Referencias a menús de arcade
    const gameMenu = document.getElementById('game-menu');
    const levelMenu = document.getElementById('level-menu');
    const gameContainerPanel = document.getElementById('game-container-panel');
    const gameCards = document.querySelectorAll('.game-card:not(.game-card-locked)');
    const backToGamesBtn = document.getElementById('back-to-games');
    const backToLevelsBtn = document.getElementById('back-to-levels');
    const currentLevelSpan = document.getElementById('current-level');

    let selectedLevel = 1;

    // --- FUNCIONES DE NAVEGACIÓN ---

    function showSection(targetId) {
        console.log("Navigating to section:", targetId);
        sections.forEach(section => {
            section.classList.remove('active');
            section.classList.add('hidden');
        });

        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            targetSection.classList.add('active');
        }

        // Actualizar enlaces activos
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${targetId}`) {
                link.classList.add('active');
            }
        });
    }

    // --- FUNCIONES DE ARCADE ---

    // --- FUNCIONES DE ARCADE ---

    function showGameMenu() {
        if (gameMenu) gameMenu.classList.remove('hidden');
        if (levelMenu) levelMenu.classList.add('hidden');
        if (gameContainerPanel) gameContainerPanel.classList.add('hidden');
    }

    function showLevelMenu() {
        if (gameMenu) gameMenu.classList.add('hidden');
        if (levelMenu) levelMenu.classList.remove('hidden');
        if (gameContainerPanel) gameContainerPanel.classList.add('hidden');
        updateLevelMenuUI();
    }

    function showGame(level) {
        selectedLevel = level;
        if (currentLevelSpan) currentLevelSpan.textContent = level;

        // Configurar el nivel en el motor del juego si está disponible
        if (window.gameEngine && typeof window.gameEngine.setLevel === 'function') {
            window.gameEngine.setLevel(level);
        } else if (typeof setLevel === 'function') {
            setLevel(level);
        }

        if (gameMenu) gameMenu.classList.add('hidden');
        if (levelMenu) levelMenu.classList.add('hidden');
        if (gameContainerPanel) gameContainerPanel.classList.remove('hidden');
    }

    function updateLevelMenuUI() {
        // Cargar progreso (maxLevelUnlocked)
        let maxUnlocked = 1;
        const saved = localStorage.getItem('ecoSortProgress');
        if (saved) {
            try {
                const progress = JSON.parse(saved);
                maxUnlocked = progress.maxLevelUnlocked || 1;
            } catch (e) { console.error("Error parsing progress", e); }
        }

        console.log("Updating UI for Levels. Max Unlocked:", maxUnlocked);

        const allLevelCards = document.querySelectorAll('.level-card');
        allLevelCards.forEach(card => {
            const level = parseInt(card.getAttribute('data-level'));
            const btn = card.querySelector('.btn');
            const statusLabel = card.querySelector('.level-status');

            // Logic adapted to new HTML structure provided
            if (level < maxUnlocked) {
                card.classList.remove('level-card-locked');
                // card.classList.add('completed');
                if (statusLabel) statusLabel.textContent = 'COMPLETADO';
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'REPETIR';
                }
            } else if (level === maxUnlocked) {
                card.classList.remove('level-card-locked');
                if (statusLabel) statusLabel.textContent = 'DISPONIBLE';
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'EMPEZAR';
                }
            } else {
                card.classList.add('level-card-locked');
                if (statusLabel) statusLabel.textContent = 'BLOQUEADO';
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = '🔒 BLOQUEADO';
                }
            }
        });
    }

    // --- EVENT LISTENERS ---

    // Navegación principal
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            showSection(targetId);

            // Update URL hash without reloading
            window.location.hash = targetId;

            if (targetId === 'arcade') {
                showGameMenu();
            }
        });
    });

    // Handle initial hash on load
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        if (['home', 'definicion', 'gestion', 'arcade'].includes(hash)) {
            showSection(hash);
            if (hash === 'arcade') showGameMenu();
        }
    }

    // Botón de inicio
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            // Go to Definicion section
            showSection('definicion');
            window.location.hash = 'definicion';
        });
    }

    // Selección de juego
    if (gameCards) {
        gameCards.forEach(card => {
            const playBtn = card.querySelector('.btn');
            if (playBtn) {
                playBtn.addEventListener('click', () => {
                    const gameName = card.getAttribute('data-game');
                    const gameTitle = document.getElementById('game-title');
                    const levelSuffix = document.getElementById('level-suffix');
                    const integrityHud = document.getElementById('integrity-hud');
                    const controls = document.getElementById('game-controls');
                    const instruction = document.getElementById('game-instruction');

                    if (gameName === 'cyber-runner') {
                        if (gameTitle) gameTitle.textContent = 'ECO-SORT';
                        if (levelSuffix) levelSuffix.style.display = 'inline';
                        if (integrityHud) integrityHud.style.display = 'block';
                        if (controls) controls.textContent = 'A: Izquierda | D: Derecha';
                        if (instruction) instruction.textContent = '¡Recoge los RESIDUOS para limpiar el mar!';

                        // Stop Park Game if running
                        if (window.ParkGame) window.ParkGame.stop();
                        if (window.ForestGame) window.ForestGame.stop();
                        if (window.RecyclingHeroGame) window.RecyclingHeroGame.stop();

                        window.currentGameMode = 'eco';
                        // Show level menu for ECO-SORT
                        showLevelMenu();
                    } else if (gameName === 'park-cleaner') {
                        if (gameTitle) gameTitle.textContent = 'PARQUE LIMPIO';
                        if (levelSuffix) levelSuffix.style.display = 'none';
                        if (integrityHud) integrityHud.style.display = 'none';
                        if (controls) controls.innerHTML = 'WASD/Flechas: Mover | Espacio: Recoger | E: Depositar';
                        if (instruction) instruction.textContent = '¡Limpia el parque antes de que acabe el tiempo!';

                        // Stop Eco-Sort if running
                        if (window.EcoSortGame) window.EcoSortGame.stop();
                        if (window.ForestGame) window.ForestGame.stop();
                        if (window.RecyclingHeroGame) window.RecyclingHeroGame.stop();

                        window.currentGameMode = 'park';
                        // Direct Start for Park Cleaner
                        showGame('park');
                    } else if (gameName === 'forest-save') {
                        if (gameTitle) gameTitle.textContent = 'BOSQUE EN PELIGRO';
                        if (levelSuffix) levelSuffix.style.display = 'none';
                        if (integrityHud) integrityHud.style.display = 'block';
                        if (controls) controls.innerHTML = 'WASD/Flechas: Mover | Toca el FUEGO para apagarlo';
                        if (instruction) instruction.textContent = '¡Salva el bosque de los incendios forestales!';

                        // Stop others
                        if (window.EcoSortGame) window.EcoSortGame.stop();
                        if (window.ParkGame) window.ParkGame.stop();
                        if (window.RecyclingHeroGame) window.RecyclingHeroGame.stop();

                        window.currentGameMode = 'forest';
                        showGame('forest');
                    } else if (gameName === 'recycling-hero') {
                        if (gameTitle) gameTitle.textContent = 'HÉROE DEL RECICLAJE';
                        if (levelSuffix) levelSuffix.style.display = 'none';
                        if (integrityHud) integrityHud.style.display = 'block';
                        if (controls) controls.innerHTML = 'A / ← : RECICLABLE | D / → : NO RECICLABLE';
                        if (instruction) instruction.textContent = '¡Clasifica las palabras rápidamente!';

                        // Stop others
                        if (window.EcoSortGame) window.EcoSortGame.stop();
                        if (window.ParkGame) window.ParkGame.stop();
                        if (window.ForestGame) window.ForestGame.stop();

                        window.currentGameMode = 'recycling';
                        showGame('recycling');
                    }
                });
            }
        });
    }

    function showGame(mode) {
        if (gameMenu) gameMenu.classList.add('hidden');
        if (levelMenu) levelMenu.classList.add('hidden');
        if (gameContainerPanel) gameContainerPanel.classList.remove('hidden');

        if (mode === 'park') {
            if (window.ParkGame) window.ParkGame.start();
        } else if (mode === 'forest') {
            if (window.ForestGame) window.ForestGame.start();
        } else if (mode === 'recycling') {
            if (window.RecyclingHeroGame) window.RecyclingHeroGame.start();
        } else {
            // mode is numeric level for Eco-Sort
            const level = parseInt(mode);
            selectedLevel = level;
            if (currentLevelSpan) currentLevelSpan.textContent = level;
            if (typeof setLevel === 'function') setLevel(level);
        }
    }

    // START GAME ECO-SORT (Level 1 from level menu)
    const level1Btn = document.querySelector('.level-card[data-level="1"] button');
    if (level1Btn) {
        level1Btn.addEventListener('click', () => {
            showGame(1);
        });
    }

    // Selección de nivel
    if (levelMenu) {
        levelMenu.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn');
            if (btn && !btn.disabled) {
                const card = btn.closest('.level-card');
                if (card && !card.classList.contains('level-card-locked')) {
                    const level = parseInt(card.getAttribute('data-level'));
                    showGame(level);
                }
            }
        });
    }

    // Botones Volver
    if (backToGamesBtn) {
        backToGamesBtn.addEventListener('click', () => showGameMenu());
    }

    if (backToLevelsBtn) {
        backToLevelsBtn.addEventListener('click', () => {
            // Go back to Game Menu directly, skipping Level Menu
            showGameMenu();
        });
    }

    // Exportar funciones necesarias
    window.updateLevelMenuUI = updateLevelMenuUI;
    window.showGameMenu = showGameMenu;

    // Inicialización inicial se maneja con el hash check arriba, 
    // pero si no hay hash, mostramos home por defecto.
    if (!window.location.hash) {
        showSection('home');
    }
});

