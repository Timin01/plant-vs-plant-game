// 遊戲常量
const GRID_SIZE = 16;
const CELL_SIZE = 50;
const BLUE_CELLS = 5;
const RED_CELLS = 5;

// 角色類型枚舉
const CHARACTER_TYPES = {
    SUNFLOWER: 'sunflower',
    WALL: 'wall',
    CANNON: 'cannon',
    CAT: 'cat',
    SWORD_CAT: 'swordCat'
};

// 角色設定
const CHARACTER_CONFIG = {
    [CHARACTER_TYPES.SUNFLOWER]: {
        cost: 2,
        health: 5,
        moneyGeneration: 1,
        generationInterval: 2000,
        isMovable: false,
        symbol: '🌻'
    },
    [CHARACTER_TYPES.WALL]: {
        cost: 5,
        health: 30,
        isMovable: false,
        symbol: '🧱'
    },
    [CHARACTER_TYPES.CANNON]: {
        cost: 5,
        health: 4,
        attack: 1,
        range: 9,
        fireRate: 1,
        bulletSpeed: 1,
        isMovable: false,
        symbol: '💣'
    },
    [CHARACTER_TYPES.CAT]: {
        cost: 2,
        health: 12,
        attack: 2,
        speed: 1,
        isMovable: true,
        symbol: '🐱'
    },
    [CHARACTER_TYPES.SWORD_CAT]: {
        cost: 3,
        health: 10,
        attack: 3,
        speed: 1,
        isMovable: true,
        symbol: '⚔️'
    }
};

// 在CHARACTER_TYPES後添加按鍵映射
const KEY_MAPPINGS = {
    BLUE: {
        'q': CHARACTER_TYPES.SUNFLOWER,
        'w': CHARACTER_TYPES.WALL,
        'e': CHARACTER_TYPES.CANNON,
        'r': CHARACTER_TYPES.CAT,
        't': CHARACTER_TYPES.SWORD_CAT,
        'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4  // 確保 g 對應到第 4 格
    },
    RED: {
        '=': CHARACTER_TYPES.SUNFLOWER,
        '-': CHARACTER_TYPES.WALL,
        '0': CHARACTER_TYPES.CANNON,
        '9': CHARACTER_TYPES.CAT,
        '8': CHARACTER_TYPES.SWORD_CAT,
        '\\': 15, ']': 14, 'p': 13, 'o': 12, 'i': 11 // 位置選擇
    }
};

class Game {
    constructor() {
        // 初始化所有屬性
        this.initializeProperties();
        
        // 獲取並設置 Canvas
        if (!this.initializeCanvas()) {
            console.error('Canvas 初始化失敗');
            return;
        }
        
        // 設置事件監聽和開始遊戲
        this.setupEventListeners();
        this.startGame();
    }

    initializeProperties() {
        // 確保所有屬性都被正確初始化
        this.characters = [];
        this.bullets = [];
        this.selectedPosition = {
            BLUE: null,
            RED: null
        };
        this.lastMoneyGeneration = Date.now();
        this.lastUpdate = Date.now();
        this.blueMoney = 10;
        this.redMoney = 10;
        this.grid = new Array(GRID_SIZE).fill(null).map(() => ({
            fixed: null,
            movable: null
        }));
        this.animationFrame = null;
        this.isGameRunning = false;
    }

    initializeCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('找不到 canvas 元素');
            return false;
        }
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('無法獲取 canvas context');
            return false;
        }
        
        this.canvas.width = GRID_SIZE * CELL_SIZE;
        this.canvas.height = CELL_SIZE;
        return true;
    }

    startGame() {
        this.isGameRunning = true;
        this.gameLoop();
    }

    gameLoop() {
        if (!this.isGameRunning) return;
        
        try {
            this.update();
            this.draw();
            this.animationFrame = requestAnimationFrame(() => this.gameLoop());
        } catch (error) {
            console.error('遊戲循環錯誤:', error);
            this.isGameRunning = false;
            cancelAnimationFrame(this.animationFrame);
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e.key.toLowerCase());
        });
    }

    handleKeyPress(key) {
        // 藍方選擇位置
        if (KEY_MAPPINGS.BLUE[key] !== undefined) {
            if (['a', 's', 'd', 'f', 'g'].includes(key)) {
                this.selectedPosition.BLUE = KEY_MAPPINGS.BLUE[key];
            } else {
                this.placeCharacter('BLUE', KEY_MAPPINGS.BLUE[key]);
            }
        }
        
        // 紅方選擇位置
        if (KEY_MAPPINGS.RED[key] !== undefined) {
            if (['\\', ']', 'p', 'o', 'i'].includes(key)) {
                this.selectedPosition.RED = KEY_MAPPINGS.RED[key];
            } else {
                this.placeCharacter('RED', KEY_MAPPINGS.RED[key]);
            }
        }
    }

    placeCharacter(team, characterType) {
        const position = this.selectedPosition[team];
        if (position === null) return;

        const config = CHARACTER_CONFIG[characterType];
        const money = team === 'BLUE' ? this.blueMoney : this.redMoney;
        
        if (money < config.cost) return;

        // 檢查位置是否在各自的部署區域內
        if (team === 'BLUE' && position >= BLUE_CELLS) return;
        if (team === 'RED' && position < GRID_SIZE - RED_CELLS) return;

        // 檢查格子是否已被占用
        const existingFixed = this.grid[position].fixed;
        const existingMovable = this.grid[position].movable;
        
        if (config.isMovable && existingMovable) return;
        if (!config.isMovable && existingFixed) return;

        // 創建新角色
        const character = {
            type: characterType,
            team: team,
            position: position,
            health: config.health,
            lastAttack: Date.now(),
            lastMove: Date.now(),
            lastMoneyGeneration: Date.now(),
            ...config
        };

        // 更新金錢
        if (team === 'BLUE') {
            this.blueMoney -= config.cost;
        } else {
            this.redMoney -= config.cost;
        }

        // 放置角色
        if (config.isMovable) {
            this.grid[position].movable = character;
        } else {
            this.grid[position].fixed = character;
        }
        
        this.characters.push(character);
        this.updateMoneyDisplay();
    }

    updateMoneyDisplay() {
        document.getElementById('blueMoneyText').textContent = this.blueMoney;
        document.getElementById('redMoneyText').textContent = this.redMoney;
    }

    update() {
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastUpdate) / 1000; // 轉換為秒
        this.lastUpdate = currentTime;

        // 生成金錢
        if (currentTime - this.lastMoneyGeneration >= 2000) {
            this.characters.forEach(character => {
                if (character.type === CHARACTER_TYPES.SUNFLOWER) {
                    if (character.team === 'BLUE') {
                        this.blueMoney += character.moneyGeneration;
                    } else {
                        this.redMoney += character.moneyGeneration;
                    }
                }
            });
            this.lastMoneyGeneration = currentTime;
            this.updateMoneyDisplay();
        }
        
        // 處理戰鬥
        this.handleCombat(currentTime);
        
        // 更新子彈
        this.updateBullets(deltaTime);
        
        // 處理移動角色的移動
        this.characters.forEach(character => {
            if (!character.isMovable) return;
            
            const currentCell = this.grid[character.position];
            if (currentCell.movable !== character) return;
            
            // 檢查是否可以移動
            if (currentTime - character.lastMove < 1000 / character.speed) return;
            
            const nextPosition = character.team === 'BLUE' ? 
                character.position + 1 : 
                character.position - 1;

            // 檢查下一個位置是否可以移動
            if (this.canMoveTo(character, nextPosition)) {
                // 從當前位置移除
                currentCell.movable = null;
                
                // 移動到新位置
                this.grid[nextPosition].movable = character;
                character.position = nextPosition;
                character.lastMove = currentTime;

                // 移動後檢查勝利條件
                if (this.checkVictoryCondition(character, nextPosition)) {
                    return;
                }
            }
        });
    }

    checkVictoryCondition(character, position) {
        // 藍方需要到達最右邊（第15格）才算勝利
        if (character.team === 'BLUE' && position === GRID_SIZE - 1) {
            this.endGame('BLUE');
            return true;
        }
        // 紅方需要到達最左邊（第0格）才算勝利
        if (character.team === 'RED' && position === 0) {
            this.endGame('RED');
            return true;
        }
        return false;
    }

    canMoveTo(character, position) {
        // 檢查是否超出遊戲邊界
        if (position < 0 || position >= GRID_SIZE) return false;
        
        // 檢查目標格子是否被佔用
        const targetCell = this.grid[position];
        if (targetCell.fixed || targetCell.movable) return false;

        return true;
    }

    endGame(winner) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = '48px Arial';
        this.ctx.fillStyle = winner === 'BLUE' ? 'blue' : 'red';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            `${winner === 'BLUE' ? '藍方' : '紅方'}勝利！`,
            this.canvas.width / 2,
            this.canvas.height / 2
        );
        
        // 停止遊戲循環
        cancelAnimationFrame(this.animationFrame);
    }

    draw() {
        // 清空畫布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 繪製格子
        for (let i = 0; i < GRID_SIZE; i++) {
            // 設置格子顏色
            if (i < BLUE_CELLS) {
                this.ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';  // 藍方基地，完全不透明
            } else if (i >= GRID_SIZE - RED_CELLS) {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';  // 紅方基地，完全不透明
            } else {
                this.ctx.fillStyle = 'white';  // 中立區域
            }
            
            // 繪製格子背景
            this.ctx.fillRect(i * CELL_SIZE, 0, CELL_SIZE, CELL_SIZE);
            
            // 繪製格子邊框
            this.ctx.strokeStyle = 'black';
            this.ctx.strokeRect(i * CELL_SIZE, 0, CELL_SIZE, CELL_SIZE);
        }

        // 繪製角色
        this.characters.forEach(character => {
            const x = character.position * CELL_SIZE + CELL_SIZE / 2;
            const y = CELL_SIZE / 2;
            
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = character.team === 'BLUE' ? 'blue' : 'red';
            
            // 繪製角色符號
            this.ctx.fillText(character.symbol, x, y);
            
            // 繪製生命值
            this.ctx.font = '12px Arial';
            this.ctx.fillText(character.health.toString(), x, y + 20);
        });

        // 繪製子彈
        this.drawBullets();
    }

    handleCombat(currentTime) {
        if (!Array.isArray(this.characters)) {
            console.error('characters 不是陣列');
            return;
        }
        
        this.characters.forEach(attacker => {
            if (!attacker) return;
            
            try {
                // 檢查是否可以攻擊
                if (currentTime - attacker.lastAttack < 1000) return;

                // 獲取攻擊目標
                const target = this.findTarget(attacker);
                if (!target) return;

                // 執行攻擊
                if (attacker.type === CHARACTER_TYPES.CANNON) {
                    this.createBullet(attacker, target);
                } else {
                    this.meleeAttack(attacker, target);
                }
                
                attacker.lastAttack = currentTime;
            } catch (error) {
                console.error('戰鬥處理錯誤:', error);
            }
        });
    }

    findTarget(attacker) {
        if (attacker.type === CHARACTER_TYPES.CANNON) {
            return this.findRangedTarget(attacker);
        } else if (attacker.type === CHARACTER_TYPES.CAT || attacker.type === CHARACTER_TYPES.SWORD_CAT) {
            return this.findMeleeTarget(attacker);
        }
        return null;
    }

    findMeleeTarget(attacker) {
        const targetPosition = attacker.team === 'BLUE' ? 
            attacker.position + 1 : 
            attacker.position - 1;

        if (targetPosition < 0 || targetPosition >= GRID_SIZE) return null;

        const targetCell = this.grid[targetPosition];
        const target = targetCell.fixed || targetCell.movable;

        if (target && target.team !== attacker.team) {
            return target;
        }
        return null;
    }

    findRangedTarget(attacker) {
        const direction = attacker.team === 'BLUE' ? 1 : -1;
        let position = attacker.position;

        for (let i = 1; i <= attacker.range; i++) {
            position += direction;
            if (position < 0 || position >= GRID_SIZE) break;

            const cell = this.grid[position];
            const target = cell.fixed || cell.movable;

            if (target && target.team !== attacker.team) {
                return target;
            }
        }
        return null;
    }

    meleeAttack(attacker, target) {
        target.health -= attacker.attack;
        this.checkCharacterDeath(target);
    }

    createBullet(attacker, target) {
        const direction = attacker.team === 'BLUE' ? 1 : -1;
        this.bullets.push({
            x: attacker.position * CELL_SIZE + CELL_SIZE / 2,
            y: CELL_SIZE / 2,
            targetX: target.position * CELL_SIZE + CELL_SIZE / 2,
            speed: attacker.bulletSpeed * CELL_SIZE,
            damage: attacker.attack,
            team: attacker.team,
            target: target
        });
    }

    updateBullets(deltaTime) {
        this.bullets = this.bullets.filter(bullet => {
            // 檢查目標是否還存在
            const targetCell = this.grid[bullet.target.position];
            const targetExists = (targetCell.fixed === bullet.target || 
                                targetCell.movable === bullet.target);
            
            if (!targetExists) {
                return false; // 如果目標不存在，移除子彈
            }

            const dx = bullet.targetX - bullet.x;
            const distance = bullet.speed * deltaTime;
            
            if (Math.abs(dx) <= distance) {
                // 子彈命中目標
                bullet.target.health -= bullet.damage;
                this.checkCharacterDeath(bullet.target);
                return false;
            }

            // 更新子彈位置
            bullet.x += Math.sign(dx) * distance;
            return true;
        });
    }

    checkCharacterDeath(character) {
        if (character.health <= 0) {
            // 從網格中移除
            const cell = this.grid[character.position];
            if (character.isMovable) {
                cell.movable = null;
            } else {
                cell.fixed = null;
            }
            
            // 從角色列表中移除
            const index = this.characters.indexOf(character);
            if (index > -1) {
                this.characters.splice(index, 1);
            }

            // 移除所有針對該角色的子彈
            this.bullets = this.bullets.filter(bullet => bullet.target !== character);
        }
    }

    drawBullets() {
        this.ctx.fillStyle = 'black';
        this.bullets.forEach(bullet => {
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
}

// 啟動遊戲
window.onload = () => {
    new Game();
}; 