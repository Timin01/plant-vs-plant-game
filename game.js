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
        'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4 // 位置選擇
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
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = GRID_SIZE * CELL_SIZE;
        this.canvas.height = CELL_SIZE;
        
        this.grid = new Array(GRID_SIZE).fill(null).map(() => ({
            fixed: null,
            movable: null
        }));
        
        this.blueMoney = 10;
        this.redMoney = 10;
        
        this.setupEventListeners();
        this.gameLoop();
        
        // 添加新的屬性
        this.selectedPosition = {
            BLUE: null,
            RED: null
        };
        this.characters = [];
        this.lastMoneyGeneration = Date.now();
        this.lastUpdate = Date.now();
        this.bullets = []; // 新增子彈陣列
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

        // 檢查位置是否合法
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

    gameLoop() {
        this.update();
        this.draw();
        this.animationFrame = requestAnimationFrame(() => this.gameLoop());
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
            if (currentCell.movable !== character) return; // 確保角色仍在原位置
            
            // 檢查是否可以移動
            if (currentTime - character.lastMove < 1000 / character.speed) return;
            
            const nextPosition = character.team === 'BLUE' ? 
                character.position + 1 : 
                character.position - 1;
            
            // 檢查是否到達勝利條件
            if (this.checkVictoryCondition(character, nextPosition)) {
                this.endGame(character.team);
                return;
            }

            // 檢查下一個位置是否可以移動
            if (this.canMoveTo(character, nextPosition)) {
                // 從當前位置移除
                currentCell.movable = null;
                
                // 移動到新位置
                this.grid[nextPosition].movable = character;
                character.position = nextPosition;
                character.lastMove = currentTime;
            }
        });
    }

    canMoveTo(character, position) {
        // 檢查是否超出邊界
        if (position < 0 || position >= GRID_SIZE) return false;

        const targetCell = this.grid[position];
        
        // 如果是敵方角色，不能穿過
        if (targetCell.fixed && targetCell.fixed.team !== character.team) return false;
        if (targetCell.movable && targetCell.movable.team !== character.team) return false;

        return true;
    }

    checkVictoryCondition(character, nextPosition) {
        if (character.team === 'BLUE' && nextPosition >= GRID_SIZE - RED_CELLS) {
            return true;
        }
        if (character.team === 'RED' && nextPosition < BLUE_CELLS) {
            return true;
        }
        return false;
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        this.drawCharacters();
        this.drawBullets();
    }

    drawGrid() {
        for (let i = 0; i < GRID_SIZE; i++) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = 'black';
            this.ctx.rect(i * CELL_SIZE, 0, CELL_SIZE, CELL_SIZE);
            this.ctx.stroke();
            
            // 標記藍方區域
            if (i < BLUE_CELLS) {
                this.ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
                this.ctx.fillRect(i * CELL_SIZE, 0, CELL_SIZE, CELL_SIZE);
            }
            // 標記紅方區域
            if (i >= GRID_SIZE - RED_CELLS) {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                this.ctx.fillRect(i * CELL_SIZE, 0, CELL_SIZE, CELL_SIZE);
            }
        }
    }

    drawCharacters() {
        for (let i = 0; i < GRID_SIZE; i++) {
            const cell = this.grid[i];
            const x = i * CELL_SIZE;
            
            if (cell.fixed) {
                this.drawCharacter(cell.fixed, x, 0);
            }
            if (cell.movable) {
                this.drawCharacter(cell.movable, x, 0);
            }
        }
    }

    drawCharacter(character, x, y) {
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // 繪製角色符號
        this.ctx.fillText(
            character.symbol,
            x + CELL_SIZE / 2,
            y + CELL_SIZE / 2
        );

        // 繪製血量
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = character.team === 'BLUE' ? 'blue' : 'red';
        this.ctx.fillText(
            character.health,
            x + CELL_SIZE / 2,
            y + CELL_SIZE - 10
        );
    }

    handleCombat(currentTime) {
        this.characters.forEach(attacker => {
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
        return this.getValidTarget(targetCell, attacker.team);
    }

    findRangedTarget(attacker) {
        const direction = attacker.team === 'BLUE' ? 1 : -1;
        for (let i = 1; i <= attacker.range; i++) {
            const targetPosition = attacker.position + (i * direction);
            if (targetPosition < 0 || targetPosition >= GRID_SIZE) break;

            const targetCell = this.grid[targetPosition];
            const target = this.getValidTarget(targetCell, attacker.team);
            if (target) return target;
        }
        return null;
    }

    getValidTarget(cell, attackerTeam) {
        if (cell.fixed && cell.fixed.team !== attackerTeam) {
            return cell.fixed;
        }
        if (cell.movable && cell.movable.team !== attackerTeam) {
            return cell.movable;
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