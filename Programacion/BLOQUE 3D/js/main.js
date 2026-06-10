import GameEngine from './core/GameEngine.js';

document.addEventListener('DOMContentLoaded', () => {
    const screens = {
        loading: document.getElementById('loading-screen'),
        main: document.getElementById('main-menu'),
        levels: document.getElementById('level-selector'),
        win: document.getElementById('level-complete'),
        pause: document.getElementById('pause-menu'),
        hud: document.getElementById('hud')
    };

    const touchControls = document.getElementById('touch-controls');
    const levelGrid = document.getElementById('level-grid');
    const game = new GameEngine('game-canvas');

    game.init();
    renderLevelCards();

    document.body.addEventListener('pointerdown', () => game.audioEngine.resume());
    document.body.addEventListener('keydown', () => game.audioEngine.resume());

    window.setTimeout(() => {
        screens.loading.classList.add('hidden');
        screens.main.classList.remove('hidden');
        game.audioEngine.playMenuMusic();
    }, 900);

    function hideOverlays() {
        screens.main.classList.add('hidden');
        screens.levels.classList.add('hidden');
        screens.win.classList.add('hidden');
        screens.pause.classList.add('hidden');
    }

    function showLevelSelector() {
        renderLevelCards();
        hideOverlays();
        screens.hud.classList.add('hidden');
        touchControls.classList.add('hidden');
        screens.levels.classList.remove('hidden');
    }

    function showMainMenu() {
        hideOverlays();
        screens.hud.classList.add('hidden');
        touchControls.classList.add('hidden');
        screens.main.classList.remove('hidden');
    }

    function showGameplay() {
        hideOverlays();
        screens.hud.classList.remove('hidden');
        touchControls.classList.remove('hidden');
    }

    function getUnlockedLevel() {
        const current = parseInt(localStorage.getItem('blockMazeUnlocked'), 10) || 0;
        return current;
    }

    function renderLevelCards() {
        const unlocked = getUnlockedLevel();
        const levels = game.getLevels();

        levelGrid.innerHTML = levels.map((level) => {
            const active = level.index <= unlocked;
            return `
                <button class="level-card ${active ? 'active' : 'disabled'}" data-level="${level.index}" ${active ? '' : 'disabled'}>
                    <span class="level-meta">
                        <span>${level.name}</span>
                        <span>${active ? 'Abierto' : 'Bloqueado'}</span>
                    </span>
                    <h3>${level.subtitle}</h3>
                    <p>Optimo: ${level.optimalMoves} movimientos</p>
                </button>
            `;
        }).join('');
    }

    function startLevel(levelIndex) {
        showGameplay();
        game.loadSpecificLevel(levelIndex);
    }

    document.getElementById('btn-campaign').addEventListener('click', () => {
        showLevelSelector();
    });

    document.getElementById('btn-back-menu').addEventListener('click', () => {
        showMainMenu();
    });

    document.getElementById('btn-menu-win').addEventListener('click', () => {
        game.stop();
        game.audioEngine.playMenuMusic();
        showLevelSelector();
    });

    levelGrid.addEventListener('click', (event) => {
        const target = event.target.closest('.level-card');
        if (!target || target.classList.contains('disabled')) {
            return;
        }

        startLevel(parseInt(target.dataset.level, 10));
    });

    document.getElementById('btn-next').addEventListener('click', () => {
        showGameplay();
        game.loadNextLevel();
    });

    function pauseGame() {
        if (!game.isRunning || game.isPaused) {
            return;
        }

        game.pauseGame();
        touchControls.classList.add('hidden');
        screens.pause.classList.remove('hidden');
    }

    document.getElementById('btn-pause').addEventListener('click', pauseGame);
    window.addEventListener('game-pause-request', pauseGame);

    document.getElementById('btn-resume').addEventListener('click', () => {
        screens.pause.classList.add('hidden');
        screens.hud.classList.remove('hidden');
        touchControls.classList.remove('hidden');
        game.resumeGame();
    });

    const restartAction = () => {
        screens.pause.classList.add('hidden');
        screens.hud.classList.remove('hidden');
        touchControls.classList.remove('hidden');
        game.resetLevel();
        game.resumeGame();
    };

    document.getElementById('btn-restart-hud').addEventListener('click', restartAction);
    document.getElementById('btn-restart-pause').addEventListener('click', restartAction);

    document.getElementById('btn-quit').addEventListener('click', () => {
        game.stop();
        game.audioEngine.playMenuMusic();
        showLevelSelector();
    });

    touchControls.addEventListener('pointerdown', (event) => {
        const button = event.target.closest('[data-dir]');
        if (!button) {
            return;
        }

        event.preventDefault();
        game.move(button.dataset.dir);
    });
});
