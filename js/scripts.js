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
    const gameContainerPanel = document.getElementById('game-container-panel');
    const gameCards = document.querySelectorAll('.game-card:not(.game-card-locked)');
    const backToGamesBtn = document.getElementById('back-to-games');
    const backToLevelsBtn = document.getElementById('back-to-levels');
    const startMissionArcadeBtn = document.getElementById('start-mission-arcade-btn');
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
        if (gameContainerPanel) gameContainerPanel.classList.add('hidden');
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
        if (gameContainerPanel) gameContainerPanel.classList.remove('hidden');
    }

    function updateLevelMenuUI() {
        // Obsolete function since menu is removed, but we'll leave it empty to avoid errors globally if called
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
        if (['home', 'documentacion', 'memoria', 'arcade'].includes(hash)) {
            showSection(hash);
            if (hash === 'arcade') showGameMenu();
        }
    }

    // Botón de inicio
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            // Start the chained arcade mode directly
            showSection('arcade');
            if (window.GameMaster) window.GameMaster.start();
        });
    }

    // Botón de misión dentro de Arcade
    if (startMissionArcadeBtn) {
        startMissionArcadeBtn.addEventListener('click', () => {
            if (window.GameMaster) window.GameMaster.start();
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

                    // Individual play mode (NOT GameMaster)
                    window.GameMasterIsActive = false; 
                    
                    if (gameName === 'cyber-runner') {
                        if (gameTitle) gameTitle.textContent = 'ECO-SORT';
                        if (levelSuffix) levelSuffix.style.display = 'inline';
                        if (integrityHud) integrityHud.style.display = 'block';
                        if (controls) controls.textContent = 'A: Izquierda | D: Derecha';
                        if (instruction) instruction.textContent = '¡Recoge los RESIDUOS para limpiar el mar!';

                        // Stop others if running
                        if (window.ParkGame && window.ParkGame.stop) window.ParkGame.stop();
                        if (window.ForestGame && window.ForestGame.stop) window.ForestGame.stop();
                        if (window.TrafficControlGame && window.TrafficControlGame.stop) window.TrafficControlGame.stop();
                        if (window.RecyclingHeroGame && window.RecyclingHeroGame.stop) window.RecyclingHeroGame.stop();
                        if (window.EnergyGame && window.EnergyGame.stop) window.EnergyGame.stop();
                        if (window.CalculoGame && window.CalculoGame.stop) window.CalculoGame.stop();

                        window.currentGameMode = 'eco';
                        // Direct Start for ECO-SORT Level 1
                        showGame(1);
                    } else if (gameName === 'park-cleaner') {
                        if (gameTitle) gameTitle.textContent = 'PARQUE LIMPIO';
                        if (levelSuffix) levelSuffix.style.display = 'none';
                        if (integrityHud) integrityHud.style.display = 'none';
                        if (controls) controls.innerHTML = 'WASD/Flechas: Mover | Espacio: Recoger | E: Depositar';
                        if (instruction) instruction.textContent = '¡Limpia el parque antes de que acabe el tiempo!';

                        // Stop others
                        if (window.EcoSortGame && window.EcoSortGame.stop) window.EcoSortGame.stop();
                        if (window.ForestGame && window.ForestGame.stop) window.ForestGame.stop();
                        if (window.TrafficControlGame && window.TrafficControlGame.stop) window.TrafficControlGame.stop();
                        if (window.RecyclingHeroGame && window.RecyclingHeroGame.stop) window.RecyclingHeroGame.stop();
                        if (window.EnergyGame && window.EnergyGame.stop) window.EnergyGame.stop();
                        if (window.CalculoGame && window.CalculoGame.stop) window.CalculoGame.stop();

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
                        if (window.EcoSortGame && window.EcoSortGame.stop) window.EcoSortGame.stop();
                        if (window.ParkGame && window.ParkGame.stop) window.ParkGame.stop();
                        if (window.TrafficControlGame && window.TrafficControlGame.stop) window.TrafficControlGame.stop();
                        if (window.RecyclingHeroGame && window.RecyclingHeroGame.stop) window.RecyclingHeroGame.stop();
                        if (window.EnergyGame && window.EnergyGame.stop) window.EnergyGame.stop();
                        if (window.CalculoGame && window.CalculoGame.stop) window.CalculoGame.stop();

                        window.currentGameMode = 'forest';
                        showGame('forest');
                    } else if (gameName === 'traffic-control') {
                        if (gameTitle) gameTitle.textContent = 'Traffic Control';
                        if (levelSuffix) levelSuffix.style.display = 'none';
                        if (integrityHud) integrityHud.style.display = 'block';
                        if (controls) controls.innerHTML = 'Espacio/Click: Cambiar Semáforos';
                        if (instruction) instruction.textContent = '¡Evita accidentes y reduce la contaminación!';

                        // Stop others
                        if (window.EcoSortGame && window.EcoSortGame.stop) window.EcoSortGame.stop();
                        if (window.ParkGame && window.ParkGame.stop) window.ParkGame.stop();
                        if (window.ForestGame && window.ForestGame.stop) window.ForestGame.stop();
                        if (window.RecyclingHeroGame && window.RecyclingHeroGame.stop) window.RecyclingHeroGame.stop();
                        if (window.EnergyGame && window.EnergyGame.stop) window.EnergyGame.stop();
                        if (window.CalculoGame && window.CalculoGame.stop) window.CalculoGame.stop();

                        window.currentGameMode = 'traffic';
                        showGame('traffic');
                    } else if (gameName === 'recycling-hero') {
                        if (gameTitle) gameTitle.textContent = 'Hero Recicling';
                        if (levelSuffix) levelSuffix.style.display = 'none';
                        if (integrityHud) integrityHud.style.display = 'block';
                        if (controls) controls.innerHTML = 'Q,W,E,R: Clasificar Residuos';
                        if (instruction) instruction.textContent = '¡Clasifica cada palabra antes de que caiga!';

                        // Stop others
                        if (window.EcoSortGame && window.EcoSortGame.stop) window.EcoSortGame.stop();
                        if (window.ParkGame && window.ParkGame.stop) window.ParkGame.stop();
                        if (window.ForestGame && window.ForestGame.stop) window.ForestGame.stop();
                        if (window.TrafficControlGame && window.TrafficControlGame.stop) window.TrafficControlGame.stop();
                        if (window.EnergyGame && window.EnergyGame.stop) window.EnergyGame.stop();
                        if (window.CalculoGame && window.CalculoGame.stop) window.CalculoGame.stop();

                        window.currentGameMode = 'recycling';
                        showGame('recycling');
                    } else if (gameName === 'energy-game') {
                        if (gameTitle) gameTitle.textContent = 'Energy Game';
                        if (levelSuffix) levelSuffix.style.display = 'none';
                        if (integrityHud) integrityHud.style.display = 'none';
                        if (controls) controls.innerHTML = 'Click en Tubería: Rotar Pieza';
                        if (instruction) instruction.textContent = '¡Conecta la red eléctrica (ODS 7)!';

                        // Stop others
                        if (window.EcoSortGame && window.EcoSortGame.stop) window.EcoSortGame.stop();
                        if (window.ParkGame && window.ParkGame.stop) window.ParkGame.stop();
                        if (window.ForestGame && window.ForestGame.stop) window.ForestGame.stop();
                        if (window.TrafficControlGame && window.TrafficControlGame.stop) window.TrafficControlGame.stop();
                        if (window.RecyclingHeroGame && window.RecyclingHeroGame.stop) window.RecyclingHeroGame.stop();
                        if (window.CalculoGame && window.CalculoGame.stop) window.CalculoGame.stop();

                        window.currentGameMode = 'energy';
                        showGame('energy');
                    } else if (gameName === 'escribelo') {
                        if (gameTitle) gameTitle.textContent = 'Escríbelo';
                        if (levelSuffix) levelSuffix.style.display = 'none';
                        if (integrityHud) integrityHud.style.display = 'block';
                        if (controls) controls.innerHTML = 'Teclado: Escribir palabra';
                        if (instruction) instruction.textContent = '¡Escribe la palabra correctamente!';

                        // Stop others
                        if (window.EcoSortGame && window.EcoSortGame.stop) window.EcoSortGame.stop();
                        if (window.ParkGame && window.ParkGame.stop) window.ParkGame.stop();
                        if (window.ForestGame && window.ForestGame.stop) window.ForestGame.stop();
                        if (window.TrafficControlGame && window.TrafficControlGame.stop) window.TrafficControlGame.stop();
                        if (window.RecyclingHeroGame && window.RecyclingHeroGame.stop) window.RecyclingHeroGame.stop();
                        if (window.EnergyGame && window.EnergyGame.stop) window.EnergyGame.stop();
                        if (window.CalculoGame && window.CalculoGame.stop) window.CalculoGame.stop();

                        window.currentGameMode = 'escribelo';
                        showGame('escribelo');
                    } else if (gameName === 'calculo') {
                        if (gameTitle) gameTitle.textContent = 'Cálculo';
                        if (levelSuffix) levelSuffix.style.display = 'none';
                        if (integrityHud) integrityHud.style.display = 'block';
                        if (controls) controls.innerHTML = 'Teclado: Escribir número | Enter: Confirmar';
                        if (instruction) instruction.textContent = '¡Resuelve la operación correctamente!';

                        // Stop others
                        if (window.EcoSortGame && window.EcoSortGame.stop) window.EcoSortGame.stop();
                        if (window.ParkGame && window.ParkGame.stop) window.ParkGame.stop();
                        if (window.ForestGame && window.ForestGame.stop) window.ForestGame.stop();
                        if (window.TrafficControlGame && window.TrafficControlGame.stop) window.TrafficControlGame.stop();
                        if (window.RecyclingHeroGame && window.RecyclingHeroGame.stop) window.RecyclingHeroGame.stop();
                        if (window.EnergyGame && window.EnergyGame.stop) window.EnergyGame.stop();
                        if (window.EscribeloGame && window.EscribeloGame.stop) window.EscribeloGame.stop();

                        window.currentGameMode = 'calculo';
                        showGame('calculo');
                    }
                });
            }
        });
    }

    function showGame(mode) {
        if (gameMenu) gameMenu.classList.add('hidden');
        if (gameContainerPanel) gameContainerPanel.classList.remove('hidden');

        switch (mode) {
            case 'park':
                if (window.ParkGame) window.ParkGame.start();
                break;
            case 'forest':
                if (window.ForestGame) window.ForestGame.start();
                break;
            case 'traffic':
                if (window.TrafficControlGame) window.TrafficControlGame.initMenu();
                break;
            case 'recycling':
                if (window.RecyclingHeroGame) window.RecyclingHeroGame.start();
                break;
            case 'energy':
                const overlay = document.getElementById('game-overlay');
                if (overlay) {
                    overlay.classList.remove('hidden');
                    const title = overlay.querySelector('h3');
                    const msg = overlay.querySelector('p');
                    title.innerText = "PULSA ENTER PARA EMPEZAR";
                    title.style.color = "#fff";
                    msg.innerText = "¡Haz clic en las tuberías para conectarlas!";
                }
                if (window.EnergyGame) window.EnergyGame.start(1);
                break;
            case 'escribelo':
                if (window.EscribeloGame) window.EscribeloGame.start();
                break;
            case 'calculo':
                const calcOverlay = document.getElementById('game-overlay');
                if (calcOverlay) {
                    calcOverlay.classList.remove('hidden');
                    const title = calcOverlay.querySelector('h3');
                    const msg = calcOverlay.querySelector('p');
                    title.innerText = "PULSA ENTER PARA EMPEZAR";
                    title.style.color = "#fff";
                    msg.innerText = "Cálculo mental rápido. Usa los números y pulsa Enter.";
                }
                if (window.CalculoGame) window.CalculoGame.start();
                break;
            default:
                // mode is numeric level for Eco-Sort
                const level = parseInt(mode);
                selectedLevel = level;
                if (currentLevelSpan) currentLevelSpan.textContent = level;
                if (typeof setLevel === 'function') setLevel(level);

                // We need to show the start screen overlay
                const ecoOverlay = document.getElementById('game-overlay');
                if (ecoOverlay) {
                    ecoOverlay.classList.remove('hidden');
                    const title = ecoOverlay.querySelector('h3');
                    const msg = ecoOverlay.querySelector('p');
                    title.innerText = "PULSA ENTER PARA EMPEZAR";
                    title.style.color = "#fff";
                    msg.innerText = "¡Recoge la basura (A/D o Flechas) y esquiva los obstáculos marinos!";
                }

                if (window.EcoSortGame) window.EcoSortGame.initMenu();
                break;
        }
    }

    // Eliminamos listeners huérfanos del levelMenu

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

    // --- PARTICLES.JS INITIALIZATION (FIREFLIES) ---
    if (window.particlesJS) {
        particlesJS('particles-js', {
            "particles": {
                "number": { "value": 50, "density": { "enable": true, "value_area": 800 } },
                "color": { "value": "#2ecc71" }, // Verde esmeralda coherente
                "shape": { "type": "circle" },
                "opacity": { "value": 0.2, "random": true },
                "size": { "value": 3, "random": true },
                "line_linked": { "enable": false },
                "move": {
                    "enable": true,
                    "speed": 0.5,
                    "direction": "none", // Drift random like fireflies
                    "random": true,
                    "straight": false,
                    "out_mode": "out"
                }
            },
            "interactivity": { "events": { "onhover": { "enable": false } } },
            "retina_detect": true
        });
    }
});

