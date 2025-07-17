// Classic Bomberman - Game Engine

class Bomberman {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameState = 'menu';
        this.gridWidth = 13;
        this.gridHeight = 11;
        this.tileSize = 64;
        this.grid = [];
        this.players = [];
        this.bombs = [];
        this.explosions = [];
        this.enemies = [];
        this.powerUps = [];
        this.particles = [];
        this.gameLoop = null;
        this.keys = {};
        this.screenShake = 0;
        this.level = 1;
        this.score = 0;
        this.enemiesDestroyed = 0;
        this.blocksDestroyed = 0;
        this.sprites = {};
        this.spritesLoaded = false;
        this.spriteLoader = null;
        this.soundManager = null;
        this.levelCompleted = false;
        this.isMobile = window.innerWidth <= 767;
        
        this.initializeGame();
    }
    
    async initializeGame() {
        this.setupCanvas();
        this.setupEventListeners();
        this.soundManager = new SoundManager();
        await this.loadSprites();
        this.generateLevel();
        // Don't start menu music immediately - wait for user interaction
    }
    
    async loadSprites() {
        try {
            this.spriteLoader = new SpriteLoader();
            this.sprites = await this.spriteLoader.loadAllSprites();
            this.spritesLoaded = true;
        } catch (error) {
            console.error('Failed to load sprites:', error);
            this.spritesLoaded = false;
        }
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('game-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.ctx.imageSmoothingEnabled = false;
        }
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        this.setupMobileControls();
    }
    
    setupMobileControls() {
        const mobileButtons = document.querySelectorAll('.joystick-btn, .action-btn');
        
        mobileButtons.forEach(button => {
            const keyCode = button.dataset.key;
            
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys[keyCode] = true;
                if (keyCode === 'Space') {
                    this.placeBomb(0);
                }
            });
            
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys[keyCode] = false;
            });
            
            button.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.keys[keyCode] = false;
            });
        });
    }
    
    handleKeyDown(e) {
        this.keys[e.code] = true;
        
        if (this.gameState === 'playing') {
            // Player controls
            if (e.code === 'Space') {
                this.placeBomb(0);
            }
        }
        
        e.preventDefault();
    }
    
    handleKeyUp(e) {
        this.keys[e.code] = false;
    }
    
    generateLevel() {
        // Initialize empty grid
        this.grid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                this.grid[y][x] = 0; // 0 = empty
            }
        }
        
        // Place indestructible walls
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                // Border walls
                if (x === 0 || x === this.gridWidth - 1 || y === 0 || y === this.gridHeight - 1) {
                    this.grid[y][x] = 1; // 1 = indestructible wall
                }
                // Internal walls (every other tile)
                else if (x % 2 === 0 && y % 2 === 0) {
                    this.grid[y][x] = 1;
                }
            }
        }
        
        // Place breakable blocks
        for (let y = 1; y < this.gridHeight - 1; y++) {
            for (let x = 1; x < this.gridWidth - 1; x++) {
                if (this.grid[y][x] === 0) {
                    // Don't place blocks near player spawn points
                    if ((x <= 2 && y <= 2) || (x >= this.gridWidth - 3 && y >= this.gridHeight - 3)) {
                        continue;
                    }
                    // 70% chance to place a breakable block
                    if (Math.random() < 0.7) {
                        this.grid[y][x] = 2; // 2 = breakable block
                    }
                }
            }
        }
        
        // Create single player
        this.players = [
            {
                x: 1, y: 1,
                pixelX: 64, pixelY: 64,
                lives: 3,
                bombCount: 0,
                maxBombs: 1,
                bombPower: 1,
                speed: 1,
                moving: false,
                direction: 'Front',
                facingRight: false,
                animationFrame: 0,
                animationTimer: 0,
                invulnerable: false,
                invulnerableTimer: 0
            }
        ];
        
        // Create enemies
        this.enemies = [];
        for (let i = 0; i < 3 + this.level; i++) {
            this.createEnemy();
        }
        
        // Clear other arrays
        this.bombs = [];
        this.explosions = [];
        this.powerUps = [];
    }
    
    createEnemy() {
        let x, y;
        do {
            x = Math.floor(Math.random() * (this.gridWidth - 2)) + 1;
            y = Math.floor(Math.random() * (this.gridHeight - 2)) + 1;
        } while (this.grid[y][x] !== 0 || this.isNearPlayer(x, y));
        
        this.enemies.push({
            x: x,
            y: y,
            pixelX: x * 64,
            pixelY: y * 64,
            direction: ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)],
            moveTimer: 0,
            speed: 1,
            animationFrame: 0,
            animationTimer: 0
        });
    }
    
    isNearPlayer(x, y) {
        for (let player of this.players) {
            if (Math.abs(player.x - x) <= 2 && Math.abs(player.y - y) <= 2) {
                return true;
            }
        }
        return false;
    }
    
    startGame() {
        this.gameState = 'playing';
        this.showScreen('game-screen');
        this.level = 1;
        this.score = 0;
        this.enemiesDestroyed = 0;
        this.blocksDestroyed = 0;
        this.generateLevel();
        this.updateHUD();
        this.soundManager?.stopMusic();
        this.soundManager?.startGameMusic();
        this.startGameLoop();
    }
    
    startGameLoop() {
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        
        const loop = () => {
            if (this.gameState === 'playing') {
                this.update();
                this.render();
                this.gameLoop = requestAnimationFrame(loop);
            }
        };
        
        this.gameLoop = requestAnimationFrame(loop);
    }
    
    update() {
        this.updatePlayers();
        this.updateEnemies();
        this.updateBombs();
        this.updateExplosions();
        this.updateParticles();
        this.updateScreenShake();
        this.checkCollisions();
        this.checkWinCondition();
        this.updateHUD();
    }
    
    updatePlayers() {
        this.players.forEach((player, index) => {
            if (player.lives <= 0) return;
            
            // Handle invulnerability
            if (player.invulnerable) {
                player.invulnerableTimer--;
                if (player.invulnerableTimer <= 0) {
                    player.invulnerable = false;
                }
            }
            
            // Smooth pixel-based movement
            let targetX = player.x * this.tileSize;
            let targetY = player.y * this.tileSize;
            let moveSpeed = this.isMobile ? 3 : 4;
            
            // Check for new grid movement
            let newGridX = player.x;
            let newGridY = player.y;
            
            if (Math.abs(player.pixelX - targetX) < 2 && Math.abs(player.pixelY - targetY) < 2) {
                // Snap to grid and check for new movement
                player.pixelX = targetX;
                player.pixelY = targetY;
                
                if (this.keys['ArrowUp'] && this.canMoveTo(player.x, player.y - 1)) {
                    newGridY = player.y - 1;
                    player.direction = 'Back';
                    player.moving = true;
                }
                if (this.keys['ArrowDown'] && this.canMoveTo(player.x, player.y + 1)) {
                    newGridY = player.y + 1;
                    player.direction = 'Front';
                    player.moving = true;
                }
                if (this.keys['ArrowLeft'] && this.canMoveTo(player.x - 1, player.y)) {
                    newGridX = player.x - 1;
                    player.direction = 'Side';
                    player.facingRight = false;
                    player.moving = true;
                }
                if (this.keys['ArrowRight'] && this.canMoveTo(player.x + 1, player.y)) {
                    newGridX = player.x + 1;
                    player.direction = 'Side';
                    player.facingRight = true;
                    player.moving = true;
                }
                
                if (newGridX !== player.x || newGridY !== player.y) {
                    player.x = newGridX;
                    player.y = newGridY;
                    this.soundManager?.onPlayerMove();
                } else {
                    player.moving = false;
                }
            } else {
                // Move towards target position
                if (player.pixelX < targetX) player.pixelX = Math.min(player.pixelX + moveSpeed, targetX);
                if (player.pixelX > targetX) player.pixelX = Math.max(player.pixelX - moveSpeed, targetX);
                if (player.pixelY < targetY) player.pixelY = Math.min(player.pixelY + moveSpeed, targetY);
                if (player.pixelY > targetY) player.pixelY = Math.max(player.pixelY - moveSpeed, targetY);
            }
            
            // Update animation
            if (player.moving) {
                player.animationTimer++;
                if (player.animationTimer >= 8) {
                    player.animationFrame = (player.animationFrame + 1) % 4;
                    player.animationTimer = 0;
                }
            } else {
                player.animationFrame = 0;
            }
        });
    }
    
    canMoveTo(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
            return false;
        }
        
        // Check for walls and blocks
        if (this.grid[y][x] === 1 || this.grid[y][x] === 2) {
            return false;
        }
        
        // Check for bombs
        for (let bomb of this.bombs) {
            if (bomb.x === x && bomb.y === y) {
                return false;
            }
        }
        
        return true;
    }
    
    updateEnemies() {
        this.enemies.forEach(enemy => {
            enemy.moveTimer++;
            
            const enemyMoveDelay = this.isMobile ? 35 : 30;
            if (enemy.moveTimer >= enemyMoveDelay) { // Move every 30/45 frames
                enemy.moveTimer = 0;
                
                // Try to move in current direction
                let newX = enemy.x;
                let newY = enemy.y;
                
                switch (enemy.direction) {
                    case 'up': newY--; break;
                    case 'down': newY++; break;
                    case 'left': newX--; break;
                    case 'right': newX++; break;
                }
                
                // Check if movement is valid
                if (this.canMoveTo(newX, newY) && !this.isFireAt(newX, newY)) {
                    enemy.x = newX;
                    enemy.y = newY;
                    enemy.pixelX = newX * this.tileSize;
                    enemy.pixelY = newY * this.tileSize;
                } else {
                    // Change direction randomly
                    enemy.direction = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
                }
            }
            
            // Update enemy animation
            enemy.animationTimer++;
            if (enemy.animationTimer >= 10) {
                enemy.animationFrame = (enemy.animationFrame + 1) % 3;
                enemy.animationTimer = 0;
            }
        });
    }
    
    isFireAt(x, y) {
        return this.explosions.some(explosion => 
            explosion.tiles.some(tile => tile.x === x && tile.y === y)
        );
    }
    
    placeBomb(playerIndex) {
        const player = this.players[playerIndex];
        if (player.lives <= 0 || player.bombCount >= player.maxBombs) return;
        
        // Check if there's already a bomb at this position
        if (this.bombs.some(bomb => bomb.x === player.x && bomb.y === player.y)) {
            return;
        }
        
        this.bombs.push({
            x: player.x,
            y: player.y,
            timer: 120, // 2 seconds at 60fps
            power: player.bombPower,
            owner: playerIndex
        });
        
        player.bombCount++;
        this.soundManager?.onBombPlaced();
    }
    
    updateBombs() {
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            bomb.timer--;
            
            if (bomb.timer <= 0) {
                this.explodeBomb(bomb);
                this.bombs.splice(i, 1);
                this.players[bomb.owner].bombCount--;
            }
        }
    }
    
    explodeBomb(bomb) {
        const explosion = {
            x: bomb.x,
            y: bomb.y,
            timer: 60, // 1 second
            tiles: []
        };
        
        // Center explosion
        explosion.tiles.push({ x: bomb.x, y: bomb.y });
        
        // Spread fire in 4 directions
        const directions = [
            { dx: 0, dy: -1 }, // up
            { dx: 0, dy: 1 },  // down
            { dx: -1, dy: 0 }, // left
            { dx: 1, dy: 0 }   // right
        ];
        
        directions.forEach(dir => {
            for (let i = 1; i <= bomb.power; i++) {
                const x = bomb.x + dir.dx * i;
                const y = bomb.y + dir.dy * i;
                
                if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
                    break;
                }
                
                if (this.grid[y][x] === 1) { // Indestructible wall
                    break;
                }
                
                explosion.tiles.push({ x, y });
                
                if (this.grid[y][x] === 2) { // Breakable block
                    this.grid[y][x] = 0;
                    this.blocksDestroyed++;
                    this.score += 10;
                    
                    // Chance to spawn power-up
                    if (Math.random() < 0.3) {
                        this.spawnPowerUp(x, y);
                    }
                    break;
                }
            }
        });
        
        this.explosions.push(explosion);
        
        // Create explosion particles
        this.createExplosionParticles(bomb.x * this.tileSize + this.tileSize/2, bomb.y * this.tileSize + this.tileSize/2);
        
        // Screen shake effect
        this.screenShake = 10;
        
        // Play explosion sound
        this.soundManager?.onBombExploded();
        
        // Mark other bombs for immediate explosion (chain reaction)
        for (let i = 0; i < this.bombs.length; i++) {
            const otherBomb = this.bombs[i];
            if (explosion.tiles.some(tile => tile.x === otherBomb.x && tile.y === otherBomb.y)) {
                otherBomb.timer = 0; // Make it explode next frame
            }
        }
    }
    
    spawnPowerUp(x, y) {
        const types = ['fire', 'bomb', 'speed', 'shield'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.powerUps.push({
            x: x,
            y: y,
            type: type,
            collected: false
        });
    }
    
    updateExplosions() {
        this.explosions.forEach((explosion, index) => {
            explosion.timer--;
            
            if (explosion.timer <= 0) {
                this.explosions.splice(index, 1);
            }
        });
    }
    
    createExplosionParticles(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30 + Math.random() * 20,
                maxLife: 30 + Math.random() * 20,
                size: 2 + Math.random() * 4,
                color: Math.random() < 0.5 ? '#ff4000' : '#ff8000'
            });
        }
    }
    
    updateParticles() {
        this.particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.2; // gravity
            particle.vx *= 0.98; // air resistance
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
            }
        });
    }
    
    updateScreenShake() {
        if (this.screenShake > 0) {
            this.screenShake--;
        }
    }
    
    checkCollisions() {
        // Players vs explosions
        this.players.forEach(player => {
            if (player.lives <= 0 || player.invulnerable) return;
            
            for (let explosion of this.explosions) {
                if (explosion.tiles.some(tile => tile.x === player.x && tile.y === player.y)) {
                    this.playerTakeDamage(player);
                    break;
                }
            }
        });
        
        // Players vs enemies
        this.players.forEach(player => {
            if (player.lives <= 0 || player.invulnerable) return;
            
            for (let enemy of this.enemies) {
                if (enemy.x === player.x && enemy.y === player.y) {
                    this.playerTakeDamage(player);
                    break;
                }
            }
        });
        
        // Enemies vs explosions
        this.enemies.forEach((enemy, index) => {
            for (let explosion of this.explosions) {
                if (explosion.tiles.some(tile => tile.x === enemy.x && tile.y === enemy.y)) {
                    this.enemies.splice(index, 1);
                    this.enemiesDestroyed++;
                    this.score += 100;
                    this.soundManager?.onEnemyDeath();
                    break;
                }
            }
        });
        
        // Players vs power-ups
        this.players.forEach(player => {
            if (player.lives <= 0) return;
            
            this.powerUps.forEach(powerUp => {
                if (!powerUp.collected && powerUp.x === player.x && powerUp.y === player.y) {
                    this.collectPowerUp(player, powerUp);
                    powerUp.collected = true;
                }
            });
        });
        
        // Remove collected power-ups
        this.powerUps = this.powerUps.filter(powerUp => !powerUp.collected);
    }
    
    playerTakeDamage(player) {
        player.lives--;
        player.invulnerable = true;
        player.invulnerableTimer = 120; // 2 seconds
        
        if (player.lives <= 0) {
            this.soundManager?.onPlayerDeath();
            this.checkGameOver();
        } else {
            this.soundManager?.onPlayerHurt();
        }
    }
    
    collectPowerUp(player, powerUp) {
        switch (powerUp.type) {
            case 'fire':
                player.bombPower = Math.min(player.bombPower + 1, 5);
                break;
            case 'bomb':
                player.maxBombs = Math.min(player.maxBombs + 1, 5);
                break;
            case 'speed':
                player.speed = Math.min(player.speed + 1, 5);
                break;
            case 'shield':
                player.invulnerable = true;
                player.invulnerableTimer = 300; // 5 seconds
                break;
        }
        
        this.score += 50;
        this.soundManager?.onPowerUpCollected();
    }
    
    checkWinCondition() {
        if (this.enemies.length === 0 && !this.levelCompleted) {
            this.levelCompleted = true;
            this.soundManager?.onLevelComplete();
            setTimeout(() => {
                this.level++;
                this.levelCompleted = false;
                this.generateLevel();
            }, 2000);
        }
    }
    
    checkGameOver() {
        const alivePlayers = this.players.filter(player => player.lives > 0);
        
        if (alivePlayers.length === 0) {
            this.gameOver();
        }
    }
    
    gameOver() {
        this.gameState = 'over';
        document.getElementById('game-over-title').textContent = 'GAME OVER';
        document.getElementById('game-over-message').textContent = 'All players eliminated!';
        this.showGameOverStats();
        this.soundManager?.onGameOver();
        this.showScreen('game-over');
    }
    
    showGameOverStats() {
        document.getElementById('final-score').textContent = this.score.toString().padStart(4, '0');
        document.getElementById('levels-completed').textContent = this.level - 1;
        document.getElementById('enemies-destroyed').textContent = this.enemiesDestroyed;
        document.getElementById('blocks-destroyed').textContent = this.blocksDestroyed;
    }
    
    updateHUD() {
        const player = this.players[0];
        document.getElementById('p1-lives').textContent = player.lives;
        document.getElementById('p1-bombs').textContent = player.maxBombs - player.bombCount;
        document.getElementById('current-level').textContent = this.level;
        document.getElementById('score-display').textContent = this.score.toString().padStart(4, '0');
        document.getElementById('fire-power').textContent = player.bombPower;
        document.getElementById('bomb-count').textContent = player.maxBombs;
        document.getElementById('speed-level').textContent = player.speed;
    }
    
    render() {
        if (!this.ctx) return;
        
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw game objects
        this.drawBombs();
        this.drawExplosions();
        this.drawPowerUps();
        this.drawPlayers();
        this.drawEnemies();
    }
    
    drawGrid() {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const pixelX = x * this.tileSize;
                const pixelY = y * this.tileSize;
                
                switch (this.grid[y][x]) {
                    case 1: // Indestructible wall
                        this.drawWallTile(pixelX, pixelY);
                        break;
                    case 2: // Breakable block
                        this.drawBlockTile(pixelX, pixelY);
                        break;
                    default: // Empty space
                        this.drawFloorTile(pixelX, pixelY);
                        break;
                }
            }
        }
    }
    
    drawWallTile(x, y) {
        if (this.spritesLoaded && this.sprites.solidBlock) {
            this.ctx.drawImage(this.sprites.solidBlock, x, y, this.tileSize, this.tileSize);
        } else {
            // Fallback to drawn graphics
            this.ctx.fillStyle = '#606060';
            this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
        }
    }
    
    drawBlockTile(x, y) {
        if (this.spritesLoaded && this.sprites.explodableBlock) {
            this.ctx.drawImage(this.sprites.explodableBlock, x, y, this.tileSize, this.tileSize);
        } else {
            // Fallback to drawn graphics
            this.ctx.fillStyle = '#8b4513';
            this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
        }
    }
    
    drawFloorTile(x, y) {
        if (this.spritesLoaded && this.sprites.backgroundTile) {
            this.ctx.drawImage(this.sprites.backgroundTile, x, y, this.tileSize, this.tileSize);
        } else {
            // Fallback to drawn graphics
            this.ctx.fillStyle = '#228b22';
            this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
        }
    }
    
    drawBombs() {
        this.bombs.forEach(bomb => {
            const pixelX = bomb.x * this.tileSize;
            const pixelY = bomb.y * this.tileSize;
            
            if (this.spritesLoaded && this.spriteLoader) {
                const bombFrames = this.spriteLoader.getBombFrames();
                if (bombFrames.length > 0) {
                    const frameIndex = Math.floor((120 - bomb.timer) / 40) % bombFrames.length;
                    const sprite = bombFrames[frameIndex];
                    if (sprite) {
                        this.ctx.drawImage(sprite, pixelX, pixelY, this.tileSize, this.tileSize);
                    }
                }
                
                // Danger flash when close to explosion
                if (bomb.timer < 30 && Math.floor(bomb.timer / 5) % 2) {
                    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                    this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
                }
            } else {
                // Fallback to drawn bomb
                const centerX = pixelX + this.tileSize/2;
                const centerY = pixelY + this.tileSize/2;
                this.ctx.fillStyle = '#2c2c2c';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, this.tileSize/3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
    
    drawExplosions() {
        this.explosions.forEach(explosion => {
            const explosionAge = (60 - explosion.timer) / 60;
            
            explosion.tiles.forEach((tile, index) => {
                const pixelX = tile.x * this.tileSize;
                const pixelY = tile.y * this.tileSize;
                
                if (this.spritesLoaded && this.spriteLoader) {
                    const explosionFrames = this.spriteLoader.getExplosionFrames();
                    if (explosionFrames.length > 0) {
                        const frameIndex = Math.floor(explosionAge * explosionFrames.length);
                        const sprite = explosionFrames[Math.min(frameIndex, explosionFrames.length - 1)];
                        if (sprite) {
                            this.ctx.drawImage(sprite, pixelX, pixelY, this.tileSize, this.tileSize);
                        }
                    }
                } else {
                    // Fallback to drawn explosion
                    const centerX = pixelX + this.tileSize/2;
                    const centerY = pixelY + this.tileSize/2;
                    const fireIntensity = 1 - explosionAge;
                    this.ctx.fillStyle = `rgba(255, 64, 0, ${fireIntensity})`;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, this.tileSize/2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });
        });
    }
    
    drawPowerUps() {
        this.powerUps.forEach(powerUp => {
            if (!powerUp.collected) {
                const pixelX = powerUp.x * this.tileSize;
                const pixelY = powerUp.y * this.tileSize;
                const centerX = pixelX + this.tileSize/2;
                const centerY = pixelY + this.tileSize/2;
                
                // Floating animation
                const floatOffset = Math.sin(Date.now() * 0.008 + powerUp.x + powerUp.y) * 4;
                const currentY = centerY + floatOffset;
                
                // Glow effect
                const glowIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
                
                switch(powerUp.type) {
                    case 'fire':
                        if (this.spritesLoaded && this.sprites.flamePowerup) {
                            this.ctx.drawImage(this.sprites.flamePowerup, pixelX, pixelY + floatOffset, this.tileSize, this.tileSize);
                        } else {
                            // Fallback
                            this.ctx.fillStyle = '#ff4000';
                            this.ctx.fillRect(centerX - 8, currentY - 8, 16, 16);
                        }
                        break;
                        
                    case 'bomb':
                        if (this.spritesLoaded && this.sprites.bombPowerup) {
                            this.ctx.drawImage(this.sprites.bombPowerup, pixelX, pixelY + floatOffset, this.tileSize, this.tileSize);
                        } else {
                            // Fallback
                            this.ctx.fillStyle = '#2c2c2c';
                            this.ctx.beginPath();
                            this.ctx.arc(centerX, currentY, 8, 0, Math.PI * 2);
                            this.ctx.fill();
                        }
                        break;
                        
                    case 'speed':
                        if (this.spritesLoaded && this.sprites.speedPowerup) {
                            this.ctx.drawImage(this.sprites.speedPowerup, pixelX, pixelY + floatOffset, this.tileSize, this.tileSize);
                        } else {
                            // Fallback
                            this.ctx.fillStyle = '#00ff00';
                            this.ctx.fillRect(centerX - 8, currentY - 8, 16, 16);
                        }
                        break;
                        
                    case 'shield':
                        // Shield power-up
                        this.ctx.fillStyle = `rgba(255, 255, 0, ${glowIntensity})`;
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, currentY, this.tileSize/2.5, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // Shield shape
                        this.ctx.fillStyle = '#ffff00';
                        this.ctx.beginPath();
                        this.ctx.moveTo(centerX, currentY - 8);
                        this.ctx.lineTo(centerX - 6, currentY - 4);
                        this.ctx.lineTo(centerX - 6, currentY + 4);
                        this.ctx.lineTo(centerX, currentY + 8);
                        this.ctx.lineTo(centerX + 6, currentY + 4);
                        this.ctx.lineTo(centerX + 6, currentY - 4);
                        this.ctx.closePath();
                        this.ctx.fill();
                        
                        this.ctx.strokeStyle = '#ffffff';
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                        break;
                }
            }
        });
    }
    
    drawPlayers() {
        this.players.forEach((player, index) => {
            if (player.lives <= 0) return;
            
            // Player flashing when invulnerable
            if (player.invulnerable && Math.floor(Date.now() / 100) % 2) {
                return;
            }
            
            const pixelX = player.pixelX;
            const pixelY = player.pixelY;
            
            if (this.spritesLoaded && this.spriteLoader) {
                // Use directional sprite animation
                const spriteName = `player${player.direction}${player.animationFrame}`;
                const sprite = this.spriteLoader.getSprite(spriteName);
                if (sprite) {
                    // Flip sprite for left movement (side sprites face right by default)
                    if (player.direction === 'Side' && !player.facingRight) {
                        this.ctx.save();
                        this.ctx.scale(-1, 1);
                        this.ctx.drawImage(sprite, -pixelX - this.tileSize, pixelY, this.tileSize, this.tileSize);
                        this.ctx.restore();
                    } else {
                        this.ctx.drawImage(sprite, pixelX, pixelY, this.tileSize, this.tileSize);
                    }
                }
            } else {
                // Fallback to drawn player
                const colors = [
                    { main: '#0080ff', light: '#40a0ff', dark: '#0060c0' },
                    { main: '#00ff00', light: '#40ff40', dark: '#00c000' }
                ];
                const color = colors[index];
                
                this.ctx.fillStyle = color.main;
                this.ctx.fillRect(pixelX + 8, pixelY + 8, this.tileSize - 16, this.tileSize - 16);
            }
            
            // Invulnerability shield effect
            if (player.invulnerable) {
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([5, 5]);
                this.ctx.strokeRect(pixelX + 4, pixelY + 4, this.tileSize - 8, this.tileSize - 8);
                this.ctx.setLineDash([]);
            }
        });
    }
    
    drawEnemies() {
        this.enemies.forEach(enemy => {
            const pixelX = enemy.pixelX;
            const pixelY = enemy.pixelY;
            
            if (this.spritesLoaded && this.spriteLoader) {
                // Use directional sprite animation for enemies
                let spriteDirection = 'Front';
                if (enemy.direction === 'up') spriteDirection = 'Back';
                else if (enemy.direction === 'down') spriteDirection = 'Front';
                else if (enemy.direction === 'left' || enemy.direction === 'right') spriteDirection = 'Side';
                
                const spriteName = `enemy${spriteDirection}${enemy.animationFrame}`;
                const sprite = this.spriteLoader.getSprite(spriteName);
                if (sprite) {
                    // Flip sprite for left movement (side sprites face right by default)
                    if (enemy.direction === 'left') {
                        this.ctx.save();
                        this.ctx.scale(-1, 1);
                        this.ctx.drawImage(sprite, -pixelX - this.tileSize, pixelY, this.tileSize, this.tileSize);
                        this.ctx.restore();
                    } else {
                        this.ctx.drawImage(sprite, pixelX, pixelY, this.tileSize, this.tileSize);
                    }
                }
            } else {
                // Fallback to drawn enemy
                const centerX = pixelX + this.tileSize/2;
                const centerY = pixelY + this.tileSize/2;
                const bobOffset = Math.sin(Date.now() * 0.005 + enemy.x + enemy.y) * 3;
                
                this.ctx.fillStyle = '#ff4444';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY + bobOffset, this.tileSize/3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
        
        // Show/hide mobile controls based on game state
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            if (screenId === 'game-screen') {
                mobileControls.classList.add('show');
            } else {
                mobileControls.classList.remove('show');
            }
        }
    }
}

// Global functions
function startBombermanGame() {
    if (window.bomberman) {
        window.bomberman.soundManager?.enableAudio();
        window.bomberman.soundManager?.onButtonClick();
        window.bomberman.startGame();
    }
}

function showBombermanInstructions() {
    if (window.bomberman) {
        window.bomberman.soundManager?.enableAudio();
        window.bomberman.soundManager?.onButtonClick();
        window.bomberman.showScreen('instructions');
    }
}

function showBombermanCredits() {
    if (window.bomberman) {
        window.bomberman.soundManager?.enableAudio();
        window.bomberman.soundManager?.onButtonClick();
        window.bomberman.showScreen('credits');
    }
}

function showBombermanMenu() {
    if (window.bomberman) {
        window.bomberman.soundManager?.enableAudio();
        window.bomberman.soundManager?.onButtonClick();
        window.bomberman.gameState = 'menu';
        window.bomberman.soundManager?.startMenuMusic();
        window.bomberman.showScreen('main-menu');
    }
}

function restartBombermanGame() {
    if (window.bomberman) {
        window.bomberman.soundManager?.enableAudio();
        window.bomberman.soundManager?.onButtonClick();
        window.bomberman.startGame();
    }
}

// Initialize game
window.addEventListener('load', () => {
    window.bomberman = new Bomberman();
});