// Sprite Loader for Bomberman Game
class SpriteLoader {
    constructor() {
        this.sprites = {};
        this.basePath = './assets/';
    }

    // Load a single sprite
    loadSprite(name, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.sprites[name] = img;
                resolve(img);
            };
            img.onerror = reject;
            img.src = this.basePath + path;
        });
    }

    // Load all game sprites
    async loadAllSprites() {
        const spriteMap = {
            // Blocks
            'backgroundTile': 'Blocks/BackgroundTile.png',
            'explodableBlock': 'Blocks/ExplodableBlock.png',
            'solidBlock': 'Blocks/SolidBlock.png',
            'portal': 'Blocks/Portal.png',

            // Bomb animation frames
            'bomb1': 'Bomb/Bomb_f01.png',
            'bomb2': 'Bomb/Bomb_f02.png',
            'bomb3': 'Bomb/Bomb_f03.png',

            // Bomberman animations
            'playerFront0': 'Bomberman/Front/Bman_F_f00.png',
            'playerFront1': 'Bomberman/Front/Bman_F_f01.png',
            'playerFront2': 'Bomberman/Front/Bman_F_f02.png',
            'playerFront3': 'Bomberman/Front/Bman_F_f03.png',
            'playerBack0': 'Bomberman/Back/Bman_B_f00.png',
            'playerBack1': 'Bomberman/Back/Bman_B_f01.png',
            'playerBack2': 'Bomberman/Back/Bman_B_f02.png',
            'playerBack3': 'Bomberman/Back/Bman_B_f03.png',
            'playerSide0': 'Bomberman/Side/Bman_F_f00.png',
            'playerSide1': 'Bomberman/Side/Bman_F_f01.png',
            'playerSide2': 'Bomberman/Side/Bman_F_f02.png',
            'playerSide3': 'Bomberman/Side/Bman_F_f03.png',

            // Enemy animations
            'enemyFront0': 'Creep/Front/Creep_F_f00.png',
            'enemyFront1': 'Creep/Front/Creep_F_f01.png',
            'enemyFront2': 'Creep/Front/Creep_F_f02.png',
            'enemyBack0': 'Creep/Back/Creep_B_f00.png',
            'enemyBack1': 'Creep/Back/Creep_B_f01.png',
            'enemyBack2': 'Creep/Back/Creep_B_f02.png',
            'enemySide0': 'Creep/Side/Creep_S_f00.png',
            'enemySide1': 'Creep/Side/Creep_S_f01.png',
            'enemySide2': 'Creep/Side/Creep_S_f02.png',

            // Explosion animation
            'flame0': 'Flame/Flame_f00.png',
            'flame1': 'Flame/Flame_f01.png',
            'flame2': 'Flame/Flame_F02.png',
            'flame3': 'Flame/Flame_F03.png',
            'flame4': 'Flame/Flame_F04.png',

            // Power-ups
            'bombPowerup': 'Powerups/BombPowerup.png',
            'flamePowerup': 'Powerups/FlamePowerup.png',
            'speedPowerup': 'Powerups/SpeedPowerup.png',

            // Menu assets
            'titleBackground': 'Menu/title_background.jpg',
            'titleText': 'Menu/title_titletext.png',
            'onePlayerNormal': 'Menu/One_Player_Normal.png',
            'onePlayerHover': 'Menu/One_Player_Hover.png',
            'twoPlayersNormal': 'Menu/Two_Players_Normal.png',
            'twoPlayersHover': 'Menu/Two_Players_Hover.png',
            'controlP1': 'Menu/Control_PlayerOne.png',
            'controlP2': 'Menu/Control_PlayerTwo.png',

            // Background
            'titleFlat': 'title_flat.jpg'
        };

        const loadPromises = Object.entries(spriteMap).map(([name, path]) => 
            this.loadSprite(name, path)
        );

        try {
            await Promise.all(loadPromises);
            console.log('All sprites loaded successfully!');
            return this.sprites;
        } catch (error) {
            console.error('Error loading sprites:', error);
            throw error;
        }
    }

    // Get sprite by name
    getSprite(name) {
        return this.sprites[name];
    }

    // Get animation frames for a character
    getAnimationFrames(character, direction) {
        const frames = [];
        for (let i = 0; i < 4; i++) {
            const spriteName = `${character}${direction}${i}`;
            if (this.sprites[spriteName]) {
                frames.push(this.sprites[spriteName]);
            }
        }
        return frames;
    }

    // Get bomb animation frames
    getBombFrames() {
        return [
            this.sprites['bomb1'],
            this.sprites['bomb2'],
            this.sprites['bomb3']
        ];
    }

    // Get explosion animation frames
    getExplosionFrames() {
        return [
            this.sprites['flame0'],
            this.sprites['flame1'],
            this.sprites['flame2'],
            this.sprites['flame3'],
            this.sprites['flame4']
        ];
    }
}

// Export for use in your game
window.SpriteLoader = SpriteLoader;