/**
 * OBJETO INFILTRADO - ODS 12: CONSUMO RESPONSABLE
 * Lógica del reto interactivo.
 */

const PlasticChallenge = {
    timer: 60,
    interval: null,
    isFirstTime: true,
    startTime: 0,

    init() {
        this.introPanel = document.getElementById('plastic-intro');
        this.gamePanel = document.getElementById('plastic-game');
        this.resultPanel = document.getElementById('plastic-result');
        this.timerDisplay = document.getElementById('plastic-time');
        this.statusDisplay = document.getElementById('plastic-status');
        this.scoreDisplay = document.getElementById('plastic-score-display');
        this.resultMessage = document.getElementById('plastic-result-message');

        this.startBtn = document.getElementById('start-plastic-btn');
        this.submitBtn = document.getElementById('submit-plastic-btn');
        this.retryBtn = document.getElementById('retry-plastic-btn');
        this.backBtn = document.getElementById('back-to-arcade-plastic');

        this.inputs = {
            object: document.getElementById('plastic-object'),
            alt1: document.getElementById('alt-1'),
            alt2: document.getElementById('alt-2'),
            alt3: document.getElementById('alt-3')
        };

        this.setupEventListeners();
    },

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.submitBtn.addEventListener('click', () => this.finish());
        this.retryBtn.addEventListener('click', () => this.reset());
        this.backBtn.addEventListener('click', () => {
            this.stop();
            if (window.showGameMenu) window.showGameMenu();
        });
    },

    start() {
        this.introPanel.classList.add('hidden');
        this.gamePanel.classList.remove('hidden');
        this.resultPanel.classList.add('hidden');

        this.timer = 60;
        this.timerDisplay.textContent = this.timer;
        this.startTime = Date.now();

        // Clear inputs
        Object.values(this.inputs).forEach(input => input.value = '');

        this.interval = setInterval(() => {
            this.timer--;
            this.timerDisplay.textContent = this.timer;

            if (this.timer <= 10) {
                this.timerDisplay.classList.add('timer-warning');
            } else {
                this.timerDisplay.classList.remove('timer-warning');
            }

            if (this.timer <= 0) {
                this.finish(true); // Fail by timeout
            }
        }, 1000);

        console.log("Plastic Challenge Started");
    },

    stop() {
        clearInterval(this.interval);
        this.timerDisplay.classList.remove('timer-warning');
    },

    reset() {
        this.stop();
        this.introPanel.classList.remove('hidden');
        this.gamePanel.classList.add('hidden');
        this.resultPanel.classList.add('hidden');
    },

    finish(timeout = false) {
        this.stop();
        const duration = (Date.now() - this.startTime) / 1000;

        this.gamePanel.classList.add('hidden');
        this.resultPanel.classList.remove('hidden');
        this.scoreDisplay.textContent = "ANALIZANDO...";
        this.resultMessage.textContent = "Procesando datos de impacto ambiental...";

        setTimeout(() => {
            if (timeout) {
                this.resultMessage.textContent = "¡SE ACABÓ EL TIEMPO! El sistema detectó una brecha en el consumo responsable.";
                this.scoreDisplay.textContent = "0 PUNTOS";
                this.scoreDisplay.style.color = "var(--accent-color)";
            } else {
                // Check if all fields are filled
                const filled = Object.values(this.inputs).every(input => input.value.trim().length > 0);

                if (!filled) {
                    this.resultMessage.textContent = "ANÁLISIS INCOMPLETO. Faltan datos críticos para validar las alternativas.";
                    this.scoreDisplay.textContent = "DATA ERROR";
                    this.scoreDisplay.style.color = "#ff00c1";
                } else {
                    let score = 1;
                    let message = "¡EXCELENTE! Has identificado alternativas sostenibles para el objeto '" + this.inputs.object.value + "'.";

                    if (duration < 30) {
                        score += 1;
                        message += " ¡BONUS DE VELOCIDAD DETECTADO! Análisis completado en " + Math.round(duration) + "s.";
                    }

                    this.resultMessage.textContent = message;
                    this.scoreDisplay.textContent = `+${score} PUNTO${score > 1 ? 'S' : ''} ODS`;
                    this.scoreDisplay.style.color = "var(--secondary-color)";
                }
            }
        }, 1500);
    }
};

// Initialize when the script loads
document.addEventListener('DOMContentLoaded', () => {
    PlasticChallenge.init();
    window.PlasticChallenge = PlasticChallenge;
});
