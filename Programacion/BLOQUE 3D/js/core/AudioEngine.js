export default class AudioEngine {
    constructor() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = AudioContextClass ? new AudioContextClass() : null;

        this.bgmPlayer = new Audio();
        this.bgmPlayer.loop = true;
        this.bgmPlayer.volume = 0.16;

        this.tracks = {
            menu: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
            level0: 'https://cdn.pixabay.com/download/audio/2021/11/25/audio_91b3cb0023.mp3',
            level1: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_249bc782d4.mp3',
            level2: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c0bb47b4.mp3',
            level3: 'https://cdn.pixabay.com/download/audio/2022/12/28/audio_6512baf60d.mp3',
            level4: 'https://cdn.pixabay.com/download/audio/2023/04/07/audio_78f14909a3.mp3'
        };

        this.currentTrackType = '';
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    pauseMusic() {
        this.bgmPlayer.pause();
    }

    resumeMusic() {
        if (this.currentTrackType) {
            this.bgmPlayer.play().catch(() => {});
        }
    }

    playMenuMusic() {
        this.playTrack('menu', this.tracks.menu);
    }

    playLevelMusic(levelIndex) {
        const trackKey = `level${levelIndex % 5}`;
        this.playTrack(trackKey, this.tracks[trackKey] || this.tracks.level0);
    }

    playTrack(type, src) {
        if (this.currentTrackType === type) {
            this.resumeMusic();
            return;
        }

        this.currentTrackType = type;
        this.bgmPlayer.src = src;
        this.bgmPlayer.play().catch(() => {});
    }

    playMoveSound() {
        this.playTone([
            { frequency: 620, time: 0 },
            { frequency: 320, time: 0.045 }
        ], 0.045, 'sine', 0.045);
    }

    playSwitchSound(kind = 'soft') {
        const base = kind === 'heavy' ? 180 : 380;
        this.playTone([
            { frequency: base, time: 0 },
            { frequency: base * 1.7, time: 0.08 },
            { frequency: base * 2.2, time: 0.16 }
        ], 0.22, 'triangle', 0.07);
    }

    playFallSound() {
        this.playTone([
            { frequency: 220, time: 0 },
            { frequency: 70, time: 0.34 }
        ], 0.38, 'square', 0.09);
    }

    playWinSound() {
        [440, 554.37, 659.25, 880].forEach((frequency, index) => {
            this.playTone([{ frequency, time: 0 }], 0.26, 'sine', 0.075, index * 0.09);
        });
    }

    playTone(points, duration, type = 'sine', volume = 0.05, delay = 0) {
        if (!this.ctx) {
            return;
        }

        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = this.ctx.currentTime + delay;

        osc.type = type;
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        points.forEach((point, index) => {
            const time = start + point.time;
            if (index === 0) {
                osc.frequency.setValueAtTime(point.frequency, time);
            } else {
                osc.frequency.exponentialRampToValueAtTime(Math.max(1, point.frequency), time);
            }
        });

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(volume, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.start(start);
        osc.stop(start + duration + 0.02);
    }
}
