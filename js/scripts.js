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

            if (level < maxUnlocked) {
                card.classList.remove('level-card-locked');
                card.classList.add('completed');
                if (statusLabel) statusLabel.textContent = 'COMPLETADO';
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'REPETIR';
                }
            } else if (level === maxUnlocked) {
                card.classList.remove('level-card-locked');
                card.classList.remove('completed');
                if (statusLabel) statusLabel.textContent = 'DISPONIBLE';
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'EMPEZAR';
                }
            } else {
                card.classList.add('level-card-locked');
                card.classList.remove('completed');
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

            if (targetId === 'arcade') {
                showGameMenu();
            }
        });
    });

    // Botón de inicio
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            showSection('definicion');
        });
    }

    // Selección de juego
    gameCards.forEach(card => {
        const playBtn = card.querySelector('.btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                const gameName = card.getAttribute('data-game');
                // Logic for 'cyber-runner' removed as requested
                /*
                if (gameName === 'cyber-runner') {
                    showLevelMenu();
                }
                */
            });
        }
    });

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
        backToLevelsBtn.addEventListener('click', () => showLevelMenu());
    }

    // Exportar funciones necesarias
    window.updateLevelMenuUI = updateLevelMenuUI;
    window.showGameMenu = showGameMenu;

    // Inicialización inicial
    showSection('home');
});

