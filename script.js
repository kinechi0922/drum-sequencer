class DrumSequencer {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        
        // シーケンサー設定
        this.bpm = 60;
        this.steps = 16;
        this.currentStep = 0;
        this.isPlaying = false;
        this.playbackInterval = null;
        
        // パターンデータ (各ドラムパートごとに16ステップ)
        this.patterns = {
            hihat: new Array(16).fill(false),
            snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // 8ビートのスネア (5拍目と13拍目)
            kick: new Array(16).fill(false)
        };
        
        // 音色設定
        this.soundSettings = {
            hihat: {
                type: 'metallic',
                pitch: 4000,
                volume: 0.4,
                duration: 0.1
            },
            snare: {
                type: 'classic',
                pitch: 1000,
                volume: 0.6,
                duration: 0.2
            },
            kick: {
                type: 'deep',
                pitch: 60,
                volume: 0.8,
                duration: 0.4
            }
        };
        
        // 音色プリセット定義
        this.soundPresets = {
            hihat: {
                metallic: { waveType: 'square', filterType: 'highpass', filterFreq: 8000 },
                sharp: { waveType: 'sawtooth', filterType: 'bandpass', filterFreq: 6000 },
                soft: { waveType: 'triangle', filterType: 'lowpass', filterFreq: 4000 },
                vintage: { waveType: 'square', filterType: 'bandpass', filterFreq: 3000 }
            },
            snare: {
                classic: { noiseType: 'white', filterType: 'bandpass', filterFreq: 1000 },
                punchy: { noiseType: 'pink', filterType: 'highpass', filterFreq: 800 },
                fat: { noiseType: 'brown', filterType: 'lowpass', filterFreq: 1200 },
                electronic: { noiseType: 'white', filterType: 'bandpass', filterFreq: 2000 }
            },
            kick: {
                deep: { waveType: 'sine', filterType: 'lowpass', filterFreq: 100 },
                punchy: { waveType: 'triangle', filterType: 'lowpass', filterFreq: 150 },
                boomy: { waveType: 'sine', filterType: 'lowpass', filterFreq: 80 },
                tight: { waveType: 'square', filterType: 'lowpass', filterFreq: 120 }
            }
        };
        
        // テンプレートパターン定義
        this.templates = {
            clear: {
                name: 'クリア',
                patterns: {
                    hihat: new Array(16).fill(false),
                    snare: new Array(16).fill(false),
                    kick: new Array(16).fill(false)
                }
            },
            basic8beat: {
                name: '8ビート基本',
                patterns: {
                    hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
                    snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
                    kick: [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false]
                }
            },
            rock8beat: {
                name: 'ロック8ビート',
                patterns: {
                    hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
                    snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
                    kick: [true, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false]
                }
            },
            disco: {
                name: 'ディスコ',
                patterns: {
                    hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
                    snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
                    kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false]
                }
            },
            shuffle: {
                name: 'シャッフル',
                patterns: {
                    hihat: [true, false, false, true, false, false, true, false, false, true, false, false, true, false, false, true],
                    snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
                    kick: [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false]
                }
            },
            funk: {
                name: 'ファンク',
                patterns: {
                    hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
                    snare: [false, false, false, false, true, false, false, true, false, false, false, false, true, false, false, false],
                    kick: [true, false, false, false, false, false, false, false, false, false, true, false, false, false, false, false]
                }
            }
        };
        
        this.init();
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await this.createSounds();
            this.setupEventListeners();
            this.setupSoundControls();
            this.setupTemplateSelector();
            this.initializeDefaultPattern();
            this.updateUI();
        } catch (error) {
            console.error('Audio initialization failed:', error);
            this.setupFallbackSounds();
            this.setupEventListeners();
            this.setupSoundControls();
            this.setupTemplateSelector();
            this.initializeDefaultPattern();
            this.updateUI();
        }
    }

    async createSounds() {
        this.updateSounds();
    }

    updateSounds() {
        // 設定に基づいて各音色を更新
        Object.keys(this.soundSettings).forEach(track => {
            const settings = this.soundSettings[track];
            
            if (track === 'snare') {
                this.sounds[track] = this.createAdvancedNoiseSound(track, settings);
            } else {
                this.sounds[track] = this.createAdvancedOscillatorSound(track, settings);
            }
        });
    }

    createAdvancedOscillatorSound(track, settings) {
        return () => {
            if (!this.audioContext) return;
            
            const preset = this.soundPresets[track][settings.type];
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            // オシレーターの設定
            oscillator.frequency.setValueAtTime(settings.pitch, this.audioContext.currentTime);
            oscillator.type = preset.waveType;
            
            // フィルターの設定
            filter.type = preset.filterType;
            filter.frequency.setValueAtTime(preset.filterFreq, this.audioContext.currentTime);
            filter.Q.setValueAtTime(10, this.audioContext.currentTime);
            
            // ゲインの設定
            gainNode.gain.setValueAtTime(settings.volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + settings.duration);
            
            // 接続
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // 再生
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + settings.duration);
        };
    }

    createAdvancedNoiseSound(track, settings) {
        return () => {
            if (!this.audioContext) return;
            
            const preset = this.soundPresets[track][settings.type];
            const bufferSize = this.audioContext.sampleRate * settings.duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            
            // ノイズタイプに基づいてノイズを生成
            this.generateNoise(output, preset.noiseType);
            
            const whiteNoise = this.audioContext.createBufferSource();
            whiteNoise.buffer = buffer;
            
            // フィルターの設定
            const filter = this.audioContext.createBiquadFilter();
            filter.type = preset.filterType;
            filter.frequency.setValueAtTime(settings.pitch, this.audioContext.currentTime);
            filter.Q.setValueAtTime(5, this.audioContext.currentTime);
            
            // ゲインの設定
            const gainNode = this.audioContext.createGain();
            gainNode.gain.setValueAtTime(settings.volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + settings.duration);
            
            // 接続
            whiteNoise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // 再生
            whiteNoise.start(this.audioContext.currentTime);
        };
    }

    generateNoise(output, noiseType) {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        
        for (let i = 0; i < output.length; i++) {
            const white = Math.random() * 2 - 1;
            
            switch (noiseType) {
                case 'pink':
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980;
                    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                    b6 = white * 0.115926;
                    break;
                case 'brown':
                    b0 = (b0 + white * 0.02) * 0.996;
                    output[i] = b0 * 3.5;
                    break;
                default: // white
                    output[i] = white;
                    break;
            }
        }
    }

    createOscillatorSound(frequency, type, volume, duration) {
        return () => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    createNoiseSound(volume, duration) {
        return () => {
            if (!this.audioContext) return;
            
            const bufferSize = this.audioContext.sampleRate * duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            
            const whiteNoise = this.audioContext.createBufferSource();
            whiteNoise.buffer = buffer;
            
            const bandpass = this.audioContext.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.value = 1000;
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            whiteNoise.connect(bandpass);
            bandpass.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            whiteNoise.start(this.audioContext.currentTime);
        };
    }

    setupFallbackSounds() {
        // Web Audio APIが使えない場合のフォールバック
        this.sounds = {
            kick: () => this.playBeep(100, 400),
            snare: () => this.playBeep(200, 200),
            hihat: () => this.playBeep(800, 100)
        };
    }

    playBeep(frequency, duration) {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, 0);
            gainNode.gain.exponentialRampToValueAtTime(0.01, duration / 1000);
            
            oscillator.start();
            oscillator.stop(duration / 1000);
        } catch (error) {
            console.error('Fallback sound failed:', error);
        }
    }

    playSound(soundType) {
        if (this.sounds[soundType]) {
            this.sounds[soundType]();
        }
        
        // ドラムボタンのアニメーション
        const button = document.querySelector(`[data-sound="${soundType}"]`);
        if (button) {
            button.classList.add('playing');
            setTimeout(() => {
                button.classList.remove('playing');
            }, 200);
        }
    }

    setupEventListeners() {
        // BPMスライダー
        const bpmSlider = document.getElementById('bpm-slider');
        const bpmValue = document.getElementById('bpm-value');
        
        if (bpmSlider) {
            bpmSlider.addEventListener('input', (e) => {
                this.bpm = parseInt(e.target.value);
                bpmValue.textContent = this.bpm;
                
                // 再生中の場合、新しいBPMで再スタート
                if (this.isPlaying) {
                    this.stop();
                    setTimeout(() => this.play(), 50);
                }
            });
        }

        // メインコントロールボタン
        const playBtn = document.querySelector('.play-btn');
        const stopBtn = document.querySelector('.stop-btn');
        const clearBtn = document.querySelector('.clear-btn');

        if (playBtn) {
            playBtn.addEventListener('click', () => this.togglePlayback());
            playBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.togglePlayback();
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stop());
            stopBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.stop();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
            clearBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.clearAll();
            });
        }

        // ステップボタン
        const steps = document.querySelectorAll('.step');
        steps.forEach(step => {
            step.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleStep(step);
            });
            
            step.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.toggleStep(step);
            });
        });

        // ドラムボタン（手動演奏用）
        const drumButtons = document.querySelectorAll('.drum-button');
        drumButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.playSound(button.dataset.sound);
            });
            
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.playSound(button.dataset.sound);
            });
        });

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    this.togglePlayback();
                    break;
                case 'k':
                    this.playSound('kick');
                    break;
                case 's':
                    this.playSound('snare');
                    break;
                case 'h':
                    this.playSound('hihat');
                    break;
                case 'c':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.clearAll();
                    }
                    break;
            }
        });

        // オーディオコンテキストの再開
        document.addEventListener('click', () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        });
    }

    setupSoundControls() {
        // 音色選択のセットアップ
        const soundTypeSelectors = document.querySelectorAll('.sound-type');
        soundTypeSelectors.forEach(selector => {
            selector.addEventListener('change', (e) => {
                const track = e.target.dataset.track;
                const newType = e.target.value;
                this.soundSettings[track].type = newType;
                this.updateSounds();
                
                // プレビュー再生（再生中でない場合のみ）
                if (!this.isPlaying) {
                    this.playSound(track);
                }
            });
        });

        // ピッチスライダーのセットアップ
        const pitchSliders = document.querySelectorAll('.pitch-slider');
        pitchSliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const track = e.target.dataset.track;
                const pitch = parseFloat(e.target.value);
                this.soundSettings[track].pitch = pitch;
                
                // 値を表示更新
                const valueDisplay = slider.parentNode.querySelector('.pitch-value');
                if (valueDisplay) {
                    valueDisplay.textContent = `${pitch}Hz`;
                }
                
                this.updateSounds();
            });
            
            // プレビュー再生（マウスアップ時、再生中でない場合のみ）
            slider.addEventListener('change', (e) => {
                const track = e.target.dataset.track;
                if (!this.isPlaying) {
                    this.playSound(track);
                }
            });
        });

        // 音量スライダーのセットアップ
        const volumeSliders = document.querySelectorAll('.volume-slider');
        volumeSliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const track = e.target.dataset.track;
                const volume = parseFloat(e.target.value) / 100; // 0-1の範囲に変換
                this.soundSettings[track].volume = volume;
                
                // 値を表示更新
                const valueDisplay = slider.parentNode.querySelector('.volume-value');
                if (valueDisplay) {
                    valueDisplay.textContent = `${Math.round(volume * 100)}%`;
                }
                
                this.updateSounds();
            });
            
            // プレビュー再生（マウスアップ時、再生中でない場合のみ）
            slider.addEventListener('change', (e) => {
                const track = e.target.dataset.track;
                if (!this.isPlaying) {
                    this.playSound(track);
                }
            });
        });

        // 初期値の表示更新
        this.updateSoundControlValues();
    }

    initializeDefaultPattern() {
        // デフォルトパターンをUIに反映
        this.updateStepsUI();
    }

    setupTemplateSelector() {
        const templateSelector = document.getElementById('template-selector');
        if (templateSelector) {
            templateSelector.addEventListener('change', (e) => {
                const templateId = e.target.value;
                if (templateId && this.templates[templateId]) {
                    this.loadTemplate(templateId);
                }
            });
        }
    }

    loadTemplate(templateId) {
        if (!this.templates[templateId]) return;
        
        const template = this.templates[templateId];
        
        // パターンをロード
        this.patterns = JSON.parse(JSON.stringify(template.patterns)); // ディープコピー
        
        // UIを更新
        this.updateStepsUI();
        this.updateUI();
        
        // 再生中の場合は停止
        if (this.isPlaying) {
            this.stop();
        }
    }

    updateSoundControlValues() {
        Object.keys(this.soundSettings).forEach(track => {
            const settings = this.soundSettings[track];
            
            // 音色選択の更新
            const typeSelector = document.querySelector(`.sound-type[data-track="${track}"]`);
            if (typeSelector) {
                typeSelector.value = settings.type;
            }
            
            // ピッチスライダーの更新
            const pitchSlider = document.querySelector(`.pitch-slider[data-track="${track}"]`);
            const pitchValue = document.querySelector(`.pitch-slider[data-track="${track}"] + .pitch-value`);
            if (pitchSlider) {
                pitchSlider.value = settings.pitch;
            }
            if (pitchValue) {
                pitchValue.textContent = `${settings.pitch}Hz`;
            }
            
            // 音量スライダーの更新
            const volumeSlider = document.querySelector(`.volume-slider[data-track="${track}"]`);
            const volumeValue = document.querySelector(`.volume-slider[data-track="${track}"] + .volume-value`);
            if (volumeSlider) {
                volumeSlider.value = Math.round(settings.volume * 100);
            }
            if (volumeValue) {
                volumeValue.textContent = `${Math.round(settings.volume * 100)}%`;
            }
        });
    }

    toggleStep(stepButton) {
        const track = stepButton.closest('.steps').dataset.track;
        const stepIndex = parseInt(stepButton.dataset.step);
        
        // パターンの状態を切り替え
        this.patterns[track][stepIndex] = !this.patterns[track][stepIndex];
        
        // 視覚的な状態を更新
        stepButton.classList.toggle('active', this.patterns[track][stepIndex]);
        
        // ステップがアクティブになった場合、音を再生
        if (this.patterns[track][stepIndex]) {
            this.playSound(track);
        }
        
        this.updateUI();
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.play();
        }
    }

    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.currentStep = 0;
        
        // オーディオコンテキストの再開
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.updateUI();
        this.scheduleNextStep();
    }

    stop() {
        this.isPlaying = false;
        this.currentStep = 0;
        
        if (this.playbackInterval) {
            clearTimeout(this.playbackInterval);
            this.playbackInterval = null;
        }
        
        this.updateUI();
    }

    scheduleNextStep() {
        if (!this.isPlaying) return;
        
        // 現在のステップで音を再生
        this.playCurrentStep();
        
        // 次のステップに進む
        this.currentStep = (this.currentStep + 1) % this.steps;
        
        // 次のステップをスケジュール
        const stepDuration = (60 / this.bpm / 4) * 1000; // 16分音符の長さ（ミリ秒）
        this.playbackInterval = setTimeout(() => {
            this.scheduleNextStep();
        }, stepDuration);
        
        this.updatePlayheadPosition();
        this.updateStepInfo();
    }

    playCurrentStep() {
        // 各トラックの現在ステップがアクティブなら音を再生
        Object.keys(this.patterns).forEach(track => {
            if (this.patterns[track][this.currentStep]) {
                this.playSound(track);
            }
        });
    }

    clearAll() {
        this.stop();
        
        // すべてのパターンをクリア
        Object.keys(this.patterns).forEach(track => {
            this.patterns[track].fill(false);
        });
        
        // UIを更新
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        
        this.updateUI();
    }

    clearTrack(track) {
        this.patterns[track].fill(false);
        
        // 対応するステップボタンをクリア
        const trackSteps = document.querySelectorAll(`[data-track="${track}"] .step`);
        trackSteps.forEach(step => {
            step.classList.remove('active');
        });
        
        this.updateUI();
    }

    updateUI() {
        const playBtn = document.querySelector('.play-btn');
        const statusText = document.querySelector('.status-text');
        
        // 再生ボタンの状態
        if (playBtn) {
            playBtn.classList.toggle('playing', this.isPlaying);
        }
        
        // ステータステキストの更新
        if (statusText) {
            if (this.isPlaying) {
                statusText.textContent = `再生中 - BPM: ${this.bpm}`;
            } else {
                const activeSteps = Object.values(this.patterns)
                    .flat()
                    .filter(step => step).length;
                if (activeSteps > 0) {
                    statusText.textContent = `パターン準備完了 - ${activeSteps}ステップがアクティブ`;
                } else {
                    statusText.textContent = 'ステップをクリックしてパターンを作成しよう！';
                }
            }
        }
        
        this.updateStepInfo();
    }

    updateStepInfo() {
        const currentStepDisplay = document.querySelector('.current-step');
        if (currentStepDisplay) {
            if (this.isPlaying) {
                currentStepDisplay.textContent = `Step: ${this.currentStep + 1}`;
            } else {
                currentStepDisplay.textContent = 'Step: --';
            }
        }
    }

    updatePlayheadPosition() {
        const playheadIndicator = document.querySelector('.playhead-indicator');
        if (playheadIndicator) {
            if (this.isPlaying) {
                playheadIndicator.classList.add('playing');
                const stepWidth = 100 / this.steps;
                const position = this.currentStep * stepWidth;
                playheadIndicator.style.transform = `translateX(${position * (this.steps + 0.8)}%)`;
            } else {
                playheadIndicator.classList.remove('playing');
            }
        }
    }

    // パターンの保存/読み込み用メソッド
    exportPattern() {
        return JSON.stringify({
            bpm: this.bpm,
            patterns: this.patterns
        });
    }

    importPattern(patternData) {
        try {
            const data = JSON.parse(patternData);
            this.bpm = data.bpm || 60;
            this.patterns = data.patterns || {
                hihat: new Array(16).fill(false),
                snare: new Array(16).fill(false),
                kick: new Array(16).fill(false)
            };
            
            // BPMスライダーを更新
            const bpmSlider = document.getElementById('bpm-slider');
            const bpmValue = document.getElementById('bpm-value');
            if (bpmSlider) bpmSlider.value = this.bpm;
            if (bpmValue) bpmValue.textContent = this.bpm;
            
            // ステップUIを更新
            this.updateStepsUI();
            this.updateUI();
            
            return true;
        } catch (error) {
            console.error('Pattern import failed:', error);
            return false;
        }
    }

    updateStepsUI() {
        Object.keys(this.patterns).forEach(track => {
            const trackSteps = document.querySelectorAll(`[data-track="${track}"] .step`);
            trackSteps.forEach((step, index) => {
                step.classList.toggle('active', this.patterns[track][index]);
            });
        });
    }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    window.drumSequencer = new DrumSequencer();
});

// ユーザーが初めてページに触れたときにオーディオを有効化
document.addEventListener('click', function initAudio() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    document.removeEventListener('click', initAudio);
}, { once: true });