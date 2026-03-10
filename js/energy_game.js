class EnergyGameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElem = document.getElementById('score');
        this.timeElem = document.getElementById('time');

        this.isActive = false;
        this.isReadyToStart = false;
        this.grid = [];
        this.level = 1;
        this.cols = 4;
        this.rows = 4;
        this.tileSize = 80;
        this.offsetX = 0;
        this.offsetY = 0;

        this.timeRemaining = 0;
        this.timerInterval = null;
        this.animFrame = null;

        this.generators = [];
        this.cities = [];

        this.handleClick = this.handleClick.bind(this);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && window.currentGameMode === 'energy' && this.isReadyToStart) {
                this.beginPlay();
            }
        });
    }

    start(level) {
        this.level = level;
        this.isActive = false;
        this.isReadyToStart = true;

        // Setup levels
        if (level === 1) {
            this.cols = 5; this.rows = 5;
            this.timeRemaining = 20;
        } else if (level === 2) {
            this.cols = 6; this.rows = 6;
            this.timeRemaining = 20;
        } else {
            this.cols = 8; this.rows = 8;
            this.timeRemaining = 20;
        }

        this.tileSize = Math.floor(Math.min(this.canvas.width / this.cols, this.canvas.height / this.rows)) - 10;
        this.offsetX = (this.canvas.width - (this.cols * this.tileSize)) / 2;
        this.offsetY = (this.canvas.height - (this.rows * this.tileSize)) / 2;

        this.generateGrid();
        this.updateTimeDisplay();
        this.calculatePower();
        this.render(); // draw initial unstarted grid

        // Ensure overlay is shown
        const overlay = document.getElementById('game-overlay');
        if (overlay) overlay.classList.remove('hidden');
    }

    beginPlay() {
        this.isReadyToStart = false;
        this.isActive = true;

        const overlay = document.getElementById('game-overlay');
        if (overlay) overlay.classList.add('hidden');

        this.canvas.addEventListener('mousedown', this.handleClick);

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.isActive) return;
            this.timeRemaining--;
            this.updateTimeDisplay();
            if (this.timeRemaining <= 0) {
                this.gameOver(false);
            }
        }, 1000);

        this.loop();
    }

    stop() {
        this.isActive = false;
        this.canvas.removeEventListener('mousedown', this.handleClick);
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
    }

    // [top, right, bottom, left]
    generateGrid() {
        let isSolvable = false;
        let attempts = 0;

        while (!isSolvable && attempts < 100) {
            attempts++;
            this.grid = [];
            this.generators = [];
            this.cities = [];

            // Define pieces
            const pieces = [
                { type: 'straight', conns: [1, 0, 1, 0] },
                { type: 'corner', conns: [1, 1, 0, 0] },
                { type: 't-junct', conns: [1, 1, 1, 0] }
            ];

            for (let r = 0; r < this.rows; r++) {
                let row = [];
                for (let c = 0; c < this.cols; c++) {
                    let p = pieces[Math.floor(Math.random() * pieces.length)];
                    let rotations = Math.floor(Math.random() * 4);
                    let conns = [...p.conns];
                    for (let i = 0; i < rotations; i++) {
                        conns.unshift(conns.pop());
                    }
                    row.push({
                        type: p.type,
                        conns: conns,
                        powered: false,
                        fixed: false
                    });
                }
                this.grid.push(row);
            }

            // Place Generators
            let mainGenR = Math.floor(this.rows / 2);
            this.grid[mainGenR][0] = { type: 'generator', conns: [0, 1, 0, 0], powered: true, fixed: true };
            this.generators.push({ r: mainGenR, c: 0 });

            if (this.level >= 3) {
                this.grid[0][0] = { type: 'generator', conns: [0, 1, 0, 0], powered: true, fixed: true };
                this.generators.push({ r: 0, c: 0 });
            }

            // Place City
            let cityR = Math.floor(this.rows / 2);
            let cityC = this.cols - 1;
            this.grid[cityR][cityC] = { type: 'city', conns: [0, 0, 0, 1], powered: false, fixed: true };
            this.cities.push({ r: cityR, c: cityC });

            // Place Obstacles
            let numObstacles = this.level === 1 ? 2 : (this.level === 2 ? 5 : 8);
            let obstaclesPlaced = 0;
            let obstAttempts = 0;
            while (obstaclesPlaced < numObstacles && obstAttempts < 100) {
                obstAttempts++;
                let rr = Math.floor(Math.random() * this.rows);
                let cc = Math.floor(Math.random() * (this.cols - 2)) + 1; // don't override gen/city

                let nearGen = this.generators.some(g => Math.abs(g.r - rr) + Math.abs(g.c - cc) <= 1);
                let nearCity = this.cities.some(ci => Math.abs(ci.r - rr) + Math.abs(ci.c - cc) <= 1);

                if (!nearGen && !nearCity && this.grid[rr][cc].type !== 'obstacle') {
                    this.grid[rr][cc] = { type: 'obstacle', conns: [0, 0, 0, 0], powered: false, fixed: true };
                    obstaclesPlaced++;
                }
            }

            // Verify if solvable
            let startNode = { r: this.generators[0].r, c: this.generators[0].c + 1 };
            let endNode = { r: this.cities[0].r, c: this.cities[0].c - 1 };
            let path = this.findPath(startNode, endNode);
            if (path) {
                path.unshift(this.generators[0]);
                path.push(this.cities[0]);

                // Force an exact solvable path without cross pieces, and misalign it
                for (let i = 1; i < path.length - 1; i++) {
                    let curr = path[i];
                    let prev = path[i - 1];
                    let next = path[i + 1];

                    let dirToPrev = -1;
                    if (prev.r < curr.r) dirToPrev = 0;
                    else if (prev.r > curr.r) dirToPrev = 2;
                    else if (prev.c < curr.c) dirToPrev = 3;
                    else if (prev.c > curr.c) dirToPrev = 1;

                    let dirToNext = -1;
                    if (next.r < curr.r) dirToNext = 0;
                    else if (next.r > curr.r) dirToNext = 2;
                    else if (next.c < curr.c) dirToNext = 3;
                    else if (next.c > curr.c) dirToNext = 1;

                    let type = 'straight';
                    let base = [1, 0, 1, 0];
                    if ((dirToPrev === 0 && dirToNext === 2) || (dirToPrev === 2 && dirToNext === 0) ||
                        (dirToPrev === 1 && dirToNext === 3) || (dirToPrev === 3 && dirToNext === 1)) {
                        type = 'straight';
                        base = [1, 0, 1, 0];
                    } else {
                        type = 'corner';
                        base = [1, 1, 0, 0];
                    }

                    if (this.level > 1 && Math.random() < 0.3) {
                        type = 't-junct';
                        base = [1, 1, 1, 0];
                    }

                    let rot = Math.floor(Math.random() * 4);
                    let finalConns = [...base];
                    for (let r = 0; r < rot; r++) finalConns.unshift(finalConns.pop());

                    // Guarantee the board doesn't start solved
                    if (i === 1 || i === path.length - 2) {
                        let forceDir = i === 1 ? dirToPrev : dirToNext;
                        while (finalConns[forceDir] === 1) {
                            finalConns.unshift(finalConns.pop());
                        }
                    }

                    this.grid[curr.r][curr.c].type = type;
                    this.grid[curr.r][curr.c].conns = finalConns;
                }

                if (this.checkSolvable() && !this.isCurrentlySolved()) {
                    isSolvable = true;
                }
            }
        }
    }

    findPath(start, end) {
        let costs = [];
        for (let r = 0; r < this.rows; r++) {
            let row = [];
            for (let c = 0; c < this.cols; c++) {
                // High random variance guarantees extremely winding paths
                row.push(Math.random() * 100);
            }
            costs.push(row);
        }

        let pq = [{ path: [start], cost: 0 }];
        let visited = new Set();
        let dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        while (pq.length > 0) {
            pq.sort((a, b) => b.cost - a.cost);
            let current = pq.pop();
            let path = current.path;
            let curr = path[path.length - 1];

            let key = `${curr.r},${curr.c}`;
            if (visited.has(key)) continue;
            visited.add(key);

            if (curr.r === end.r && curr.c === end.c) {
                return path;
            }

            for (let d of dirs) {
                let nr = curr.r + d[0];
                let nc = curr.c + d[1];

                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    let cellType = this.grid[nr][nc].type;
                    if (!visited.has(`${nr},${nc}`) && cellType !== 'obstacle' && cellType !== 'generator' && cellType !== 'city') {
                        pq.push({
                            path: [...path, { r: nr, c: nc }],
                            cost: current.cost + costs[nr][nc]
                        });
                    }
                }
            }
        }
        return null;
    }

    handleClick(e) {
        if (!this.isActive) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const c = Math.floor((x - this.offsetX) / this.tileSize);
        const r = Math.floor((y - this.offsetY) / this.tileSize);

        if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
            let cell = this.grid[r][c];
            if (!cell.fixed) {
                // Rotate clockwise
                cell.conns.unshift(cell.conns.pop());
                this.calculatePower();
            }
        }
    }

    calculatePower() {
        // Reset power
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c].type !== 'generator') {
                    this.grid[r][c].powered = false;
                }
            }
        }

        let queue = [...this.generators];
        while (queue.length > 0) {
            let node = queue.shift();
            let r = node.r; let c = node.c;
            let cell = this.grid[r][c];

            // Check Top (0)
            if (cell.conns[0] && r > 0) {
                let nr = r - 1; let nc = c;
                let nCell = this.grid[nr][nc];
                if (nCell.conns[2] && !nCell.powered) {
                    nCell.powered = true;
                    queue.push({ r: nr, c: nc });
                }
            }
            // Check Right (1)
            if (cell.conns[1] && c < this.cols - 1) {
                let nr = r; let nc = c + 1;
                let nCell = this.grid[nr][nc];
                if (nCell.conns[3] && !nCell.powered) {
                    nCell.powered = true;
                    queue.push({ r: nr, c: nc });
                }
            }
            // Check Bottom (2)
            if (cell.conns[2] && r < this.rows - 1) {
                let nr = r + 1; let nc = c;
                let nCell = this.grid[nr][nc];
                if (nCell.conns[0] && !nCell.powered) {
                    nCell.powered = true;
                    queue.push({ r: nr, c: nc });
                }
            }
            // Check Left (3)
            if (cell.conns[3] && c > 0) {
                let nr = r; let nc = c - 1;
                let nCell = this.grid[nr][nc];
                if (nCell.conns[1] && !nCell.powered) {
                    nCell.powered = true;
                    queue.push({ r: nr, c: nc });
                }
            }
        }

        // Check Win Condition
        let win = true;
        for (let city of this.cities) {
            if (!this.grid[city.r][city.c].powered) {
                win = false;
            }
        }

        if (win && this.isActive) {
            setTimeout(() => this.gameOver(true), 200);
        }
    }

    checkSolvable() {
        let queue = [];
        let visited = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null).map(() => [false, false, false, false]));

        for (let gen of this.generators) {
            let genCell = this.grid[gen.r][gen.c];
            for (let i = 0; i < 4; i++) {
                if (genCell.conns[i]) {
                    let nr = gen.r + (i === 2 ? 1 : (i === 0 ? -1 : 0));
                    let nc = gen.c + (i === 1 ? 1 : (i === 3 ? -1 : 0));
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        let entryDir = (i + 2) % 4;
                        queue.push({ r: nr, c: nc, inDir: entryDir });
                        visited[nr][nc][entryDir] = true;
                    }
                }
            }
        }

        while (queue.length > 0) {
            let curr = queue.shift();
            let r = curr.r;
            let c = curr.c;
            let inDir = curr.inDir;
            let cell = this.grid[r][c];

            if (cell.type === 'obstacle' || cell.type === 'generator') continue;

            if (cell.type === 'city') {
                if (cell.conns[inDir]) return true;
                continue;
            }

            let canStraight = (cell.type === 'straight' || cell.type === 't-junct');
            let canCorner = (cell.type === 'corner' || cell.type === 't-junct');

            for (let outDir = 0; outDir < 4; outDir++) {
                if (outDir === inDir) continue;
                let isStraightAngle = (inDir % 2 === outDir % 2);
                let canTraverse = isStraightAngle ? canStraight : canCorner;

                if (canTraverse) {
                    let nr = r + (outDir === 2 ? 1 : (outDir === 0 ? -1 : 0));
                    let nc = c + (outDir === 1 ? 1 : (outDir === 3 ? -1 : 0));
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        let nextInDir = (outDir + 2) % 4;
                        if (!visited[nr][nc][nextInDir]) {
                            visited[nr][nc][nextInDir] = true;
                            queue.push({ r: nr, c: nc, inDir: nextInDir });
                        }
                    }
                }
            }
        }
        return false;
    }

    isCurrentlySolved() {
        let queue = [...this.generators];
        let visited = new Set(this.generators.map(g => `${g.r},${g.c}`));

        while (queue.length > 0) {
            let node = queue.shift();
            let r = node.r; let c = node.c;
            let cell = this.grid[r][c];

            if (cell.conns[0] && r > 0) {
                let nr = r - 1; let nc = c;
                if (this.grid[nr][nc].conns[2] && !visited.has(`${nr},${nc}`)) {
                    visited.add(`${nr},${nc}`); queue.push({ r: nr, c: nc });
                }
            }
            if (cell.conns[1] && c < this.cols - 1) {
                let nr = r; let nc = c + 1;
                if (this.grid[nr][nc].conns[3] && !visited.has(`${nr},${nc}`)) {
                    visited.add(`${nr},${nc}`); queue.push({ r: nr, c: nc });
                }
            }
            if (cell.conns[2] && r < this.rows - 1) {
                let nr = r + 1; let nc = c;
                if (this.grid[nr][nc].conns[0] && !visited.has(`${nr},${nc}`)) {
                    visited.add(`${nr},${nc}`); queue.push({ r: nr, c: nc });
                }
            }
            if (cell.conns[3] && c > 0) {
                let nr = r; let nc = c - 1;
                if (this.grid[nr][nc].conns[1] && !visited.has(`${nr},${nc}`)) {
                    visited.add(`${nr},${nc}`); queue.push({ r: nr, c: nc });
                }
            }
        }

        for (let city of this.cities) {
            if (!visited.has(`${city.r},${city.c}`)) return false;
        }
        return true;
    }

    gameOver(won) {
        this.isActive = false;
        clearInterval(this.timerInterval);

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        if (won) {
            this.ctx.fillStyle = '#00ff41'; // Green
            this.ctx.font = '40px Rajdhani';
            this.ctx.fillText("¡RED DE ENERGÍA ESTABILIZADA!", this.canvas.width / 2, this.canvas.height / 2 - 20);

            this.ctx.font = '20px Rajdhani';
            this.ctx.fillText(`Misión superada. Volviendo al Arcade...`, this.canvas.width / 2, this.canvas.height / 2 + 20);
            setTimeout(() => {
                if (window.showGameMenu) window.showGameMenu();
            }, 3000);

        } else {
            this.ctx.fillStyle = '#ff003c'; // Red
            this.ctx.font = '40px Rajdhani';
            this.ctx.fillText("¡APAGÓN TOTAL!", this.canvas.width / 2, this.canvas.height / 2 - 20);
            this.ctx.font = '20px Rajdhani';
            this.ctx.fillText("Tiempo agotado. La ciudad se ha quedado sin energía.", this.canvas.width / 2, this.canvas.height / 2 + 20);

            setTimeout(() => {
                if (window.showGameMenu) window.showGameMenu();
            }, 3000);
        }
    }

    updateTimeDisplay() {
        let min = Math.floor(this.timeRemaining / 60);
        let sec = this.timeRemaining % 60;
        this.timeElem.textContent = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        this.scoreElem.textContent = `NIVEL ${this.level}`;
    }

    loop() {
        if (!this.isActive) return;
        this.render();
        this.animFrame = requestAnimationFrame(() => this.loop());
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Background
        this.ctx.fillStyle = '#000508';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.drawTile(r, c);
            }
        }
    }

    drawTile(r, c) {
        let cell = this.grid[r][c];
        let cx = this.offsetX + c * this.tileSize;
        let cy = this.offsetY + r * this.tileSize;
        let size = this.tileSize;
        let half = size / 2;
        let pipeW = size * 0.2;

        // Draw tile background
        this.ctx.fillStyle = 'rgba(0, 5, 10, 0.8)';
        this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(cx + 2, cy + 2, size - 4, size - 4);
        this.ctx.strokeRect(cx + 2, cy + 2, size - 4, size - 4);

        if (cell.type === 'obstacle') {
            this.ctx.fillStyle = 'rgba(255, 0, 60, 0.3)';
            this.ctx.fillRect(cx + 4, cy + 4, size - 8, size - 8);
            this.ctx.strokeStyle = '#ff003c';
            this.ctx.beginPath();
            this.ctx.moveTo(cx + 10, cy + 10);
            this.ctx.lineTo(cx + size - 10, cy + size - 10);
            this.ctx.moveTo(cx + size - 10, cy + 10);
            this.ctx.lineTo(cx + 10, cy + size - 10);
            this.ctx.stroke();
            return;
        }

        let pColor = cell.powered ? '#ffd700' : '#444'; // Gold if powered, grey if not
        this.ctx.fillStyle = pColor;

        // Draw center node
        if (cell.type !== 'generator' && cell.type !== 'city') {
            this.ctx.beginPath();
            this.ctx.arc(cx + half, cy + half, pipeW, 0, Math.PI * 2);
            this.ctx.fill();
            if (cell.powered) {
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = pColor;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        }

        // Top line
        if (cell.conns[0]) {
            this.ctx.fillRect(cx + half - pipeW / 2, cy, pipeW, half);
        }
        // Right line
        if (cell.conns[1]) {
            this.ctx.fillRect(cx + half, cy + half - pipeW / 2, half, pipeW);
        }
        // Bottom line
        if (cell.conns[2]) {
            this.ctx.fillRect(cx + half - pipeW / 2, cy + half, pipeW, half);
        }
        // Left line
        if (cell.conns[3]) {
            this.ctx.fillRect(cx, cy + half - pipeW / 2, half, pipeW);
        }

        // Additional elements
        if (cell.type === 'generator') {
            this.ctx.font = `${size * 0.4}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText("⚡", cx + half - 5, cy + half);
        }

        if (cell.type === 'city') {
            this.ctx.font = `${size * 0.4}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            let icon = cell.powered ? "🏙️" : "🏚️";
            this.ctx.fillText(icon, cx + half + 5, cy + half);
        }
    }
}

window.EnergyGame = new EnergyGameEngine();
