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

    start(difficulty = 'EASY', speedMultiplier = 1.0) {
        this.isActive = false;
        this.isReadyToStart = true;

        const diff = (difficulty || 'EASY').toString().toUpperCase();
        if (diff === 'NORMAL' || diff === '2') {
            this.level = 2;
            this.cols = 5; this.rows = 5;
        } else if (diff === 'HARD' || diff === '3') {
            this.level = 3;
            this.cols = 6; this.rows = 6;
        } else {
            this.level = 1;
            this.cols = 4; this.rows = 4;
        }

        const baseTime = 18; // 18 seconds for puzzle
        const multiplier = Math.max(0.1, speedMultiplier || 1.0);
        this.timeRemaining = Math.ceil(Math.max(8, baseTime / multiplier));

        this.tileSize = Math.floor(Math.min(this.canvas.width / this.cols, this.canvas.height / this.rows)) - 10;
        this.offsetX = (this.canvas.width - (this.cols * this.tileSize)) / 2;
        this.offsetY = (this.canvas.height - (this.rows * this.tileSize)) / 2;

        this.generateGrid();
        this.updateTimeDisplay();
        this.calculatePower();
        this.render(); // draw initial unstarted grid

        // Initial HUD setup
        this.updateHUDLabels();

        // Immediate start for arcade flow
        this.beginPlay();
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

        this.updateHUDLabels();
        this.calculatePower(); // Sync initial state
        this.loop();
    }

    updateHUDLabels() {
        const scoreLabel = document.getElementById('score-label');
        if (scoreLabel) scoreLabel.textContent = "CONEXIÓN:";
        const scoreGoal = document.getElementById('score-goal');
        if (scoreGoal) scoreGoal.textContent = "%";
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
            // 1. Reset grid
            this.grid = Array.from({ length: this.rows }, () =>
                Array.from({ length: this.cols }, () => ({ type: 'empty', conns: [0, 0, 0, 0], powered: false, fixed: false }))
            );
            this.generators = [];
            this.cities = [];

            // 2. Place Generator and City on opposite edges
            let genR = Math.floor(Math.random() * this.rows);
            this.grid[genR][0] = { type: 'generator', conns: [0, 1, 0, 0], powered: true, fixed: true };
            this.generators.push({ r: genR, c: 0 });

            let cityR = Math.floor(Math.random() * this.rows);
            this.grid[cityR][this.cols - 1] = { type: 'city', conns: [0, 0, 0, 1], powered: false, fixed: true };
            this.cities.push({ r: cityR, c: this.cols - 1 });

            // 3. Find a path between them
            let path = this.findPath(this.generators[0], this.cities[0]);
            if (path) {
                // 4. Fill path with appropriate pipes
                for (let i = 1; i < path.length - 1; i++) {
                    let curr = path[i];
                    let prev = path[i - 1];
                    let next = path[i + 1];

                    let d1 = this.getDirection(curr, prev);
                    let d2 = this.getDirection(curr, next);

                    let conns = [0, 0, 0, 0];
                    conns[d1] = 1;
                    conns[d2] = 1;

                    let type = (d1 % 2 === d2 % 2) ? 'straight' : 'corner';
                    this.grid[curr.r][curr.c] = { type: type, conns: conns, powered: false, fixed: false };
                }

                // 5. Fill non-path tiles with garbage or obstacles
                for (let r = 0; r < this.rows; r++) {
                    for (let c = 0; c < this.cols; c++) {
                        if (this.grid[r][c].type === 'empty') {
                            if (Math.random() < 0.2) {
                                this.grid[r][c] = { type: 'obstacle', conns: [0, 0, 0, 0], powered: false, fixed: true };
                            } else {
                                let type = ['straight', 'corner', 't-junct'][Math.floor(Math.random() * 3)];
                                let conns = type === 't-junct' ? [1, 1, 1, 0] : (type === 'straight' ? [1, 0, 1, 0] : [1, 1, 0, 0]);
                                let rot = Math.floor(Math.random() * 4);
                                for (let k = 0; k < rot; k++) conns.unshift(conns.pop());
                                this.grid[r][c] = { type: type, conns: conns, powered: false, fixed: false };
                            }
                        }
                    }
                }

                // 6. Scramble and Verify
                this.scrambleGrid();
                // If it's still solved by chance, reshuffle pieces
                let safety = 0;
                while (this.isCurrentlySolved() && safety < 10) {
                    this.scrambleGrid();
                    safety++;
                }

                if (this.checkSolvable()) {
                    isSolvable = true;
                }
            }
        }
    }

    getDirection(from, to) {
        if (to.r < from.r) return 0;
        if (to.c > from.c) return 1;
        if (to.r > from.r) return 2;
        if (to.c < from.c) return 3;
        return 0;
    }

    scrambleGrid() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                let cell = this.grid[r][c];
                if (!cell.fixed && cell.type !== 'empty' && cell.type !== 'obstacle') {
                    let rots = Math.floor(Math.random() * 3) + 1;
                    for (let i = 0; i < rots; i++) cell.conns.unshift(cell.conns.pop());
                }
            }
        }
    }


    findPath(start, end) {
        let costs = [];
        for (let r = 0; r < this.rows; r++) {
            let row = [];
            for (let c = 0; c < this.cols; c++) {
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

            if (curr.r === end.r && curr.c === end.c) return path;

            for (let d of dirs) {
                let nr = curr.r + d[0];
                let nc = curr.c + d[1];

                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    let cellType = this.grid[nr][nc].type;
                    let isTarget = (nr === end.r && nc === end.c);
                    if (!visited.has(`${nr},${nc}`) && (cellType !== 'obstacle' && cellType !== 'generator' && (cellType !== 'city' || isTarget))) {
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
                cell.conns.unshift(cell.conns.pop());
                this.calculatePower();
            } else if (cell.type === 'obstacle') {
                if (window.GameMaster && typeof window.GameMaster.loseLife === 'function') {
                    window.GameMaster.loseLife();
                }
            }
        }
    }

    calculatePower() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c].type !== 'generator') this.grid[r][c].powered = false;
            }
        }

        let queue = [...this.generators];
        while (queue.length > 0) {
            let node = queue.shift();
            let r = node.r; let c = node.c;
            let cell = this.grid[r][c];

            if (cell.conns[0] && r > 0) {
                let nCell = this.grid[r - 1][c];
                if (nCell.conns[2] && !nCell.powered) { nCell.powered = true; queue.push({ r: r - 1, c: c }); }
            }
            if (cell.conns[1] && c < this.cols - 1) {
                let nCell = this.grid[r][c + 1];
                if (nCell.conns[3] && !nCell.powered) { nCell.powered = true; queue.push({ r: r, c: c + 1 }); }
            }
            if (cell.conns[2] && r < this.rows - 1) {
                let nCell = this.grid[r + 1][c];
                if (nCell.conns[0] && !nCell.powered) { nCell.powered = true; queue.push({ r: r + 1, c: c }); }
            }
            if (cell.conns[3] && c > 0) {
                let nCell = this.grid[r][c - 1];
                if (nCell.conns[1] && !nCell.powered) { nCell.powered = true; queue.push({ r: r, c: c - 1 }); }
            }
        }

        let connectedCities = 0;
        for (let city of this.cities) {
            if (this.grid[city.r][city.c].powered) connectedCities++;
        }

        const percentage = Math.floor((connectedCities / this.cities.length) * 100);
        if (this.scoreElem) this.scoreElem.textContent = percentage;

        if (connectedCities === this.cities.length && this.isActive) {
            // Re-verify it's actually solved
            if (this.isCurrentlySolved()) {
                setTimeout(() => this.gameOver(true), 200);
            }
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
            let cell = this.grid[curr.r][curr.c];
            if (cell.type === 'obstacle' || cell.type === 'generator') continue;
            if (cell.type === 'city') { if (cell.conns[curr.inDir]) return true; continue; }
            let canStraight = (cell.type === 'straight' || cell.type === 't-junct');
            let canCorner = (cell.type === 'corner' || cell.type === 't-junct');
            for (let outDir = 0; outDir < 4; outDir++) {
                if (outDir === curr.inDir) continue;
                let isStraightAngle = (curr.inDir % 2 === outDir % 2);
                let canTraverse = isStraightAngle ? canStraight : canCorner;
                if (canTraverse) {
                    let nr = curr.r + (outDir === 2 ? 1 : (outDir === 0 ? -1 : 0));
                    let nc = curr.c + (outDir === 1 ? 1 : (outDir === 3 ? -1 : 0));
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        let nextInDir = (outDir + 2) % 4;
                        if (!visited[nr][nc][nextInDir]) { visited[nr][nc][nextInDir] = true; queue.push({ r: nr, c: nc, inDir: nextInDir }); }
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
            let cell = this.grid[node.r][node.c];
            if (cell.conns[0] && node.r > 0) {
                if (this.grid[node.r - 1][node.c].conns[2] && !visited.has(`${node.r - 1},${node.c}`)) { visited.add(`${node.r - 1},${node.c}`); queue.push({ r: node.r - 1, c: node.c }); }
            }
            if (cell.conns[1] && node.c < this.cols - 1) {
                if (this.grid[node.r][node.c + 1].conns[3] && !visited.has(`${node.r},${node.c + 1}`)) { visited.add(`${node.r},${node.c + 1}`); queue.push({ r: node.r, c: node.c + 1 }); }
            }
            if (cell.conns[2] && node.r < this.rows - 1) {
                if (this.grid[node.r + 1][node.c].conns[0] && !visited.has(`${node.r + 1},${node.c}`)) { visited.add(`${node.r + 1},${node.c}`); queue.push({ r: node.r + 1, c: node.c }); }
            }
            if (cell.conns[3] && node.c > 0) {
                if (this.grid[node.r][node.c - 1].conns[1] && !visited.has(`${node.r},${node.c - 1}`)) { visited.add(`${node.r},${node.c - 1}`); queue.push({ r: node.r, c: node.c - 1 }); }
            }
        }
        for (let city of this.cities) if (!visited.has(`${city.r},${city.c}`)) return false;
        return true;
    }

    gameOver(won) {
        this.isActive = false;
        clearInterval(this.timerInterval);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = won ? '#00ff41' : '#ff003c';
        this.ctx.font = '40px Rajdhani';
        this.ctx.fillText(won ? "¡ESTABILIZADO!" : "¡APAGÓN!", this.canvas.width / 2, this.canvas.height / 2);
        if (window.GameMaster) window.GameMaster.onGameResult(won);
    }

    updateTimeDisplay() {
        let min = Math.floor(this.timeRemaining / 60);
        let sec = this.timeRemaining % 60;
        if (this.timeElem) this.timeElem.textContent = `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    loop() {
        if (!this.isActive) return;
        this.render();
        this.animFrame = requestAnimationFrame(() => this.loop());
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#000508';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) this.drawTile(r, c);
        }
    }

    drawTile(r, c) {
        let cell = this.grid[r][c];
        let cx = this.offsetX + c * this.tileSize;
        let cy = this.offsetY + r * this.tileSize;
        let size = this.tileSize;
        let half = size / 2;
        let pipeW = size * 0.2;

        this.ctx.fillStyle = 'rgba(0, 5, 10, 0.8)';
        this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
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

        let pColor = cell.powered ? '#ffd700' : '#444';

        if (cell.type !== 'generator' && cell.type !== 'city') {
            this.ctx.fillStyle = pColor;
            this.ctx.beginPath();
            this.ctx.arc(cx + half, cy + half, pipeW, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw Pipes
        this.ctx.fillStyle = pColor;
        if (cell.conns[0]) this.ctx.fillRect(cx + half - pipeW / 2, cy, pipeW, half);
        if (cell.conns[1]) this.ctx.fillRect(cx + half, cy + half - pipeW / 2, half, pipeW);
        if (cell.conns[2]) this.ctx.fillRect(cx + half - pipeW / 2, cy + half, pipeW, half);
        if (cell.conns[3]) this.ctx.fillRect(cx, cy + half - pipeW / 2, half, pipeW);

        // Draw Icons centered and larger
        if (cell.type === 'generator') {
            this.ctx.fillStyle = '#ffef00';
            this.ctx.font = `bold ${size * 0.6}px Rajdhani, Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText("⚡", cx + half, cy + half);
        }
        if (cell.type === 'city') {
            this.ctx.fillStyle = cell.powered ? '#ffef00' : '#888';
            this.ctx.font = `bold ${size * 0.6}px Rajdhani, Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(cell.powered ? "🏙️" : "🏚️", cx + half, cy + half);
        }
    }
}
window.EnergyGame = new EnergyGameEngine();
