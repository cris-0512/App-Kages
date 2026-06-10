import RenderEngine from './RenderEngine.js';
import AudioEngine from './AudioEngine.js';
import Board from '../entities/Board.js';
import Block from '../entities/Block.js';

const KEY_DIRECTIONS = {
    ArrowUp: 'UP',
    w: 'UP',
    W: 'UP',
    ArrowDown: 'DOWN',
    s: 'DOWN',
    S: 'DOWN',
    ArrowLeft: 'LEFT',
    a: 'LEFT',
    A: 'LEFT',
    ArrowRight: 'RIGHT',
    d: 'RIGHT',
    D: 'RIGHT'
};

export default class GameEngine {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.currentLevelIndex = 0;
        this.toastTimer = null;
        this.inputBound = false;
    }

    init() {
        this.renderEngine = new RenderEngine(this.canvasId);
        this.audioEngine = new AudioEngine();
        this.board = new Board(this.renderEngine);
        this.block = new Block(this.renderEngine, this.board, {
            onMove: (moves) => this.handleMove(moves),
            onWin: (moves) => this.handleWin(moves),
            onFall: (moves) => this.handleFall(moves),
            onSwitch: (result) => this.handleSwitch(result)
        });

        this.bindInput();
        window.addEventListener('resize', () => this.resize());
    }

    getLevels() {
        return this.board.levels.map((level, index) => ({
            index,
            name: level.name,
            subtitle: level.subtitle,
            optimalMoves: level.optimalMoves
        }));
    }

    bindInput() {
        if (this.inputBound) {
            return;
        }

        this.inputBound = true;
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isRunning && !this.isPaused) {
                window.dispatchEvent(new CustomEvent('game-pause-request'));
                event.preventDefault();
                return;
            }

            if ((event.key === 'r' || event.key === 'R') && this.isRunning) {
                this.resetLevel();
                event.preventDefault();
                return;
            }

            const direction = KEY_DIRECTIONS[event.key];
            if (direction) {
                this.move(direction);
                event.preventDefault();
            }
        });

        let pointerStart = null;
        this.renderEngine.canvas.addEventListener('pointerdown', (event) => {
            pointerStart = { x: event.clientX, y: event.clientY };
        });

        this.renderEngine.canvas.addEventListener('pointerup', (event) => {
            if (!pointerStart) {
                return;
            }

            const dx = event.clientX - pointerStart.x;
            const dy = event.clientY - pointerStart.y;
            pointerStart = null;

            if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) {
                return;
            }

            if (Math.abs(dx) > Math.abs(dy)) {
                this.move(dx > 0 ? 'RIGHT' : 'LEFT');
            } else {
                this.move(dy > 0 ? 'DOWN' : 'UP');
            }
        });
    }

    move(direction) {
        if (!this.isRunning || this.isPaused) {
            return;
        }

        this.block.tryMove(direction);
    }

    pauseGame() {
        if (!this.isRunning) {
            return;
        }

        this.isPaused = true;
        this.block.setPaused(true);
        this.audioEngine.pauseMusic();
    }

    resumeGame() {
        if (!this.isRunning) {
            return;
        }

        this.isPaused = false;
        this.block.setPaused(false);
        this.audioEngine.resumeMusic();
    }

    loadSpecificLevel(index) {
        this.currentLevelIndex = Math.max(0, Math.min(index, this.board.levels.length - 1));
        this.startLevel();
    }

    loadNextLevel() {
        this.currentLevelIndex++;

        if (this.currentLevelIndex >= this.board.levels.length) {
            this.currentLevelIndex = 0;
        }

        this.startLevel();
    }

    startLevel() {
        const level = this.board.levels[this.currentLevelIndex];

        this.board.buildLevel(this.currentLevelIndex);
        this.block.resetPosition(level.start);
        this.updateHud(0);
        this.audioEngine.playLevelMusic(this.currentLevelIndex);
        this.showToast(level.name);

        this.isPaused = false;
        this.block.setPaused(false);
        this.start();
    }

    resetLevel() {
        if (!this.board || !this.block) {
            return;
        }

        const level = this.board.levels[this.currentLevelIndex];
        this.board.buildLevel(this.currentLevelIndex);
        this.block.resetPosition(level.start);
        this.updateHud(0);
        this.isPaused = false;
        this.block.setPaused(false);
        this.showToast('Sector reiniciado');
    }

    updateHud(moves) {
        const level = this.board.levels[this.currentLevelIndex];
        const scoreDisplay = document.getElementById('score-display');
        const levelDisplay = document.getElementById('level-display');

        if (scoreDisplay) {
            scoreDisplay.innerText = `Movimientos: ${moves}`;
        }

        if (levelDisplay) {
            levelDisplay.innerText = `${level.name} | Optimo ${level.optimalMoves}`;
        }
    }

    handleMove(moves) {
        this.updateHud(moves);
        this.audioEngine.playMoveSound();
    }

    handleSwitch(result) {
        this.audioEngine.playSwitchSound(result.kind);
        this.showToast('Puente activado');
    }

    handleWin(moves) {
        this.updateHud(moves);
        this.audioEngine.playWinSound();
        this.isPaused = true;
        this.block.setPaused(true);

        const unlockedKey = 'blockMazeUnlocked';
        const currentUnlocked = parseInt(localStorage.getItem(unlockedKey), 10) || 0;
        if (this.currentLevelIndex >= currentUnlocked) {
            localStorage.setItem(unlockedKey, String(this.currentLevelIndex + 1));
        }

        const level = this.board.levels[this.currentLevelIndex];
        const finalStats = document.getElementById('final-stats');
        const nextButton = document.getElementById('btn-next');

        if (finalStats) {
            finalStats.innerText = `Tus movimientos: ${moves} / Optimo: ${level.optimalMoves}`;
        }

        if (nextButton) {
            nextButton.innerText = this.currentLevelIndex >= this.board.levels.length - 1 ? 'Repetir' : 'Siguiente';
        }

        let stars = 1;
        if (moves <= level.optimalMoves) {
            stars = 3;
        } else if (moves <= level.optimalMoves + 5) {
            stars = 2;
        }

        document.querySelectorAll('.star').forEach((star) => star.classList.remove('earned'));
        [1, 2, 3].forEach((starNumber) => {
            window.setTimeout(() => {
                if (stars >= starNumber) {
                    const star = document.getElementById(`star-${starNumber}`);
                    if (star) {
                        star.classList.add('earned');
                    }
                }
            }, 160 * starNumber);
        });

        document.getElementById('hud')?.classList.add('hidden');
        document.getElementById('touch-controls')?.classList.add('hidden');
        document.getElementById('level-complete')?.classList.remove('hidden');
    }

    handleFall(moves) {
        this.updateHud(moves);
        this.audioEngine.playFallSound();
        this.showToast('Caida detectada');

        window.setTimeout(() => {
            if (this.isRunning) {
                this.resetLevel();
            }
        }, 760);
    }

    showToast(message) {
        const toast = document.getElementById('message-toast');
        if (!toast) {
            return;
        }

        window.clearTimeout(this.toastTimer);
        toast.innerText = message;
        toast.classList.remove('hidden');
        this.toastTimer = window.setTimeout(() => {
            toast.classList.add('hidden');
        }, 1300);
    }

    resize() {
        this.renderEngine?.resize();
    }

    start() {
        if (this.isRunning) {
            return;
        }

        this.audioEngine.resume();
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;
        this.block?.setPaused(false);
        this.audioEngine.pauseMusic();
    }

    gameLoop(currentTime) {
        if (!this.isRunning) {
            return;
        }

        const deltaTime = Math.min(0.05, (currentTime - this.lastTime) / 1000);
        this.lastTime = currentTime;

        if (!this.isPaused) {
            this.update(deltaTime);
        }

        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        this.block?.update(deltaTime);
    }

    render() {
        this.renderEngine?.render();
    }
}
