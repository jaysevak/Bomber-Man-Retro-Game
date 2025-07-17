// Sound Manager for Bomberman Game

class SoundManager {
    constructor() {
        this.sounds = {};
        this.musicVolume = 0.3;
        this.sfxVolume = 0.7;
        this.currentMusic = null;
        this.soundsLoaded = false;
        this.audioContext = null;
        this.userInteracted = false;
        
        this.initializeAudioContext();
        this.initializeSounds();
    }
    
    initializeAudioContext() {
        // Create audio context for better browser compatibility
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
        
        // Add user interaction listener
        const enableAudio = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                // Play a silent sound to unlock audio
                this.unlockAudio();
            }
        };
        
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });
        document.addEventListener('touchstart', enableAudio, { once: true });
    }
    
    unlockAudio() {
        // Create and play a silent audio to unlock audio context
        const silentAudio = new Audio();
        silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
        silentAudio.volume = 0;
        silentAudio.play().catch(() => {});
    }
    
    enableAudio() {
        if (!this.userInteracted) {
            this.userInteracted = true;
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            this.unlockAudio();
            console.log('Audio enabled!');
        }
    }
    
    async initializeSounds() {
        try {
            // Define sound mappings
            const soundFiles = {
                // Game actions
                placeBomb: 'put_bomb.ogg',
                explosion: 'bomb_explosion.ogg',
                playerMove: 'player_run.ogg',
                playerDeath: 'player_death.wav',
                playerHurt: 'player_hurt.wav',
                buttonClick: 'button.wav',
                
                // Enemy sounds
                enemyDeath: 'enemy_basic_death.ogg',
                enemyHit: 'enemy_hit_1.ogg',
                
                // Power-ups and items
                powerUpCollect: 'bonus.wav',
                powerUpDisappear: 'bonus_disappear.wav',
                
                // UI and game states
                menuSelect: 'bell.ogg',
                gameOver: 'game_over.ogg',
                levelComplete: 'win_music.ogg',
                newLife: 'new_life.wav',
                
                // Background music
                menuMusic: 'menu_loop.ogg',
                gameMusic: 'french79-between_the_buttons.ogg',
                bossMusic: 'boss1.ogg'
            };
            
            // Load all sounds
            const loadPromises = Object.entries(soundFiles).map(([key, filename]) => 
                this.loadSound(key, `sounds/${filename}`)
            );
            
            await Promise.all(loadPromises);
            this.soundsLoaded = true;
            console.log('All sounds loaded successfully');
            
        } catch (error) {
            console.error('Error loading sounds:', error);
            this.soundsLoaded = false;
        }
    }
    
    loadSound(key, path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(path);
            
            audio.addEventListener('canplaythrough', () => {
                this.sounds[key] = audio;
                resolve();
            });
            
            audio.addEventListener('error', (e) => {
                console.warn(`Failed to load sound: ${path}`, e);
                // Create a silent audio object as fallback
                this.sounds[key] = { play: () => {}, pause: () => {}, volume: 0 };
                resolve(); // Don't reject to allow game to continue
            });
            
            audio.preload = 'auto';
            audio.load();
        });
    }
    
    playSound(soundKey, volume = null) {
        if (!this.sounds[soundKey]) {
            console.warn('Sound not found:', soundKey);
            return;
        }
        
        try {
            const sound = this.sounds[soundKey];
            const audioClone = sound.cloneNode();
            audioClone.volume = volume !== null ? volume : this.sfxVolume;
            audioClone.currentTime = 0;
            audioClone.play().catch(e => console.warn('Play failed:', soundKey));
        } catch (error) {
            console.warn('Error playing sound:', soundKey, error);
        }
    }
    
    playMusic(musicKey, loop = true) {
        if (!this.sounds[musicKey]) {
            console.warn('Music not found:', musicKey);
            return;
        }
        
        try {
            this.stopMusic();
            this.currentMusic = this.sounds[musicKey];
            this.currentMusic.volume = this.musicVolume;
            this.currentMusic.loop = loop;
            this.currentMusic.currentTime = 0;
            this.currentMusic.play().catch(e => console.warn('Music play failed:', musicKey));
        } catch (error) {
            console.warn('Error playing music:', musicKey, error);
        }
    }
    
    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
    }
    
    pauseMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
        }
    }
    
    resumeMusic() {
        if (this.currentMusic) {
            const playPromise = this.currentMusic.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('Music resume failed:', error);
                });
            }
        }
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume;
        }
    }
    
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
    
    // Convenience methods for specific game events
    onBombPlaced() {
        this.playSound('placeBomb');
    }
    
    onBombExploded() {
        this.playSound('explosion', 0.8);
    }
    
    onPlayerMove() {
        this.playSound('playerMove', 0.3);
    }
    
    onPlayerDeath() {
        this.playSound('playerDeath');
    }
    
    onPlayerHurt() {
        this.playSound('playerHurt');
    }
    
    onEnemyDeath() {
        this.playSound('enemyDeath');
    }
    
    onPowerUpCollected() {
        this.playSound('powerUpCollect');
    }
    
    onMenuSelect() {
        this.playSound('menuSelect', 0.5);
    }
    
    onButtonClick() {
        this.playSound('buttonClick', 0.6);
    }
    
    onGameOver() {
        this.stopMusic();
        this.playSound('gameOver');
    }
    
    onLevelComplete() {
        this.playSound('levelComplete');
    }
    
    onNewLife() {
        this.playSound('newLife');
    }
    
    startMenuMusic() {
        this.playMusic('menuMusic');
    }
    
    startGameMusic() {
        this.playMusic('gameMusic');
    }
    
    startBossMusic() {
        this.playMusic('bossMusic');
    }
}