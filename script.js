const GAME_CONFIG = {
    difficulties: {
        easy: { name: 'Easy', hintsCount: 74, initialScore: 2000, errorPenalty: 300, hintPenalty: 150, timeDecrement: 1 },
        medium: { name: 'Medium', hintsCount: 68, initialScore: 4000, errorPenalty: 500, hintPenalty: 250, timeDecrement: 2 },
        hard: { name: 'Hard', hintsCount: 60, initialScore: 8000, errorPenalty: 800, hintPenalty: 400, timeDecrement: 3 },
        expert: { name: 'Expert', hintsCount: 52, initialScore: 15000, errorPenalty: 1200, hintPenalty: 600, timeDecrement: 4 },
        master: { name: 'Master', hintsCount: 44, initialScore: 25000, errorPenalty: 2000, hintPenalty: 1000, timeDecrement: 6 }
    },
    colorMap: {
        'V': '#BEA1E5', 'O': '#FFBB45', 'B': '#5DB2FF', 'R': '#FF8A7A', 'J': '#FFEB6A',
        'T': '#64EAE6', 'M': '#FFA8CB', 'P': '#C9A387', 'G': '#5BD87A'
    }
};

const gameState = {
    grid: Array(9).fill().map(() => Array(9).fill('')),
    solution: Array(9).fill().map(() => Array(9).fill('')),
    selectedCell: null,
    currentHighlightMode: 'none',
    clickCount: 0,
    notesMode: { numbers: false, colors: false },
    notes: {},
    errors: 0,
    time: 0,
    isPlaying: false,
    isPaused: false,
    hints: new Set(),
    originalHints: new Map(),
    difficulty: 'easy',
    score: 2000,
    maxErrors: 5,
    hasError: false,
    errorCell: null,
    gameMode: 'practice',
    gameStartTime: null,
    initialScore: 2000,
    gameInProgress: false,
    hasShownDefeatModal: false
};

let gameTimer = null;
let currentUser = null;
let gameManager;
let firebaseManager = null;

class FirebaseGameInterface {
    constructor() {
        this.saveInProgress = false;
        this.operationQueue = [];
        this.isInitialized = false;
        this.lastSaveTime = 0;
        this.saveDebounceDelay = 1000;
    }

    async ensureFirebaseReady() {
        try {
            if (!firebaseManager) {
                firebaseManager = await window.FirebaseManager.getInstance();
                this.isInitialized = true;
            }
            return firebaseManager;
        } catch (error) {
            console.warn('Firebase not available:', error);
            return null;
        }
    }

    async saveAbandonIfNeededV2() {
        if (this.saveInProgress || !gameState.gameInProgress || gameState.time < 60) {
            return;
        }

        this.saveInProgress = true;

        try {
            const firebaseManager = await this.ensureFirebaseReady();
            if (!firebaseManager || !currentUser) {
                return;
            }

            return firebaseManager.operationQueue.enqueue(async () => {
                console.log('💾 Saving abandoned game...');
                const gameData = gameManager.createGameData('abandoned');
                await this.updateStatsThreadSafe(gameData);
            });

        } catch (error) {
            console.error('❌ Error saveAbandonIfNeededV2:', error);
        } finally {
            this.saveInProgress = false;
        }
    }

    async updateStatsThreadSafe(gameData) {
        try {
            const firebaseManager = await this.ensureFirebaseReady();
            if (!firebaseManager || !currentUser) {
                return { success: false, message: 'Not logged in' };
            }

            return firebaseManager.operationQueue.enqueue(async () => {
                const result = await this.statsManager.updateStats(gameData);
                console.log('📊 Stats updated:', result);
                return result;
            });

        } catch (error) {
            console.error('❌ Error updateStatsThreadSafe:', error);
            return { success: false, message: 'Failed to save statistics' };
        }
    }

    async setupAuthStateV2() {
        try {
            const firebaseManager = await this.ensureFirebaseReady();
            if (!firebaseManager) return;

            firebaseManager.onAuthStateChanged((user, userData) => {
                currentUser = user;

                if (typeof window.AuthHeader !== 'undefined' && window.AuthHeader.updateAuthState) {
                    window.AuthHeader.updateAuthState(user, userData);
                }

                if (typeof window.MobileMenu !== 'undefined' && window.MobileMenu.syncWithAuthHeader) {
                    window.MobileMenu.syncWithAuthHeader(userData || user);
                }

                console.log(user ? `✅ User logged in: ${user.email}` : '❌ User logged out');
            });

        } catch (error) {
            console.error('❌ Error setupAuthStateV2:', error);
        }
    }

    showMessage(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'stats-toast';
        toast.textContent = message;
        
        const colors = {
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545',
            info: '#007aff'
        };
        
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; 
            background: ${colors[type] || colors.info}; color: white;
            padding: 12px 20px; border-radius: 8px; z-index: 10000; font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,122,255,0.3); animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        window.createSafeTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            window.createSafeTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

class GameManager {
    constructor() {
        this.statsManager = new window.RankingStatsManager();
        this.firebaseInterface = new FirebaseGameInterface();
        this.firebaseInterface.statsManager = this.statsManager;
    }
    
    async startNewGame(difficulty, gameMode) {
        await this.firebaseInterface.saveAbandonIfNeededV2();
        
        const config = GAME_CONFIG.difficulties[difficulty];
        gameState.difficulty = difficulty;
        gameState.gameMode = gameMode;
        
        if (gameMode === 'ranked' && !currentUser) {
            this.firebaseInterface.showMessage('Please log in to play ranked games', 'warning');
            return false;
        }
        
        this.generateGame(config);
        this.resetGameState(config);
        this.startTimer();
        
        console.log(`🎮 New ${gameMode} game started - ${difficulty}`);
        
        if (gameMode === 'ranked') {
            this.firebaseInterface.showMessage(`🏆 Ranked ${difficulty} game started! Good luck!`, 'info');
        }
        
        return true;
    }
    
    generateGame(config) {
        gameState.solution = SudokuGenerator.generate();
        const { grid, hintsPositions } = SudokuGenerator.createPuzzle(gameState.solution, config.hintsCount);
        
        gameState.grid = grid;
        gameState.hints = hintsPositions;
        gameState.originalHints.clear();
        for (const hintKey of hintsPositions) {
            const [row, col] = hintKey.split('-').map(Number);
            gameState.originalHints.set(hintKey, gameState.grid[row][col]);
        }
    }
    
    resetGameState(config) {
        Object.assign(gameState, {
            errors: 0,
            time: 0,
            score: config.initialScore,
            initialScore: config.initialScore,
            gameStartTime: new Date(),
            isPlaying: true,
            isPaused: false,
            selectedCell: null,
            currentHighlightMode: 'none',
            clickCount: 0,
            hasError: false,
            errorCell: null,
            notesMode: { numbers: false, colors: false },
            notes: {},
            gameInProgress: true,
            hasShownDefeatModal: false
        });
        
        this.updateUI();
    }
    
    startTimer() {
        if (gameTimer) {
            window.cleanupManager.clearTimer(gameTimer);
        }
        
        gameTimer = window.createSafeInterval(() => {
            if (gameState.isPlaying && !gameState.isPaused && gameState.errors < 5) {
                gameState.time++;
                document.getElementById('game-time').textContent = GameUtils.formatTime(gameState.time);
                
                const config = GAME_CONFIG.difficulties[gameState.difficulty];
                this.updateScore(gameState.score - config.timeDecrement);
                
                if (gameState.score <= 0) {
                    this.endGame('defeated', 'Time\'s up! Score reached zero.');
                }
            }
        }, 1000);
    }
    
    updateScore(newScore) {
        gameState.score = Math.max(0, Math.floor(newScore));
        document.getElementById('score-display').textContent = gameState.score.toLocaleString();
    }
    
    async endGame(endType, reason = '') {
        gameState.isPlaying = false;
        gameState.gameInProgress = false;
        
        if (gameTimer) {
            window.cleanupManager.clearTimer(gameTimer);
            gameTimer = null;
        }
        
        const gameData = this.createGameData(endType);
        
        const result = await this.firebaseInterface.updateStatsThreadSafe(gameData);
        
        if (endType === 'completed') {
            ModalManager.showVictory(gameData, result);
        } else if (endType === 'defeated') {
            ModalManager.showDefeat(reason, gameData, result);
        }
        
        if (result && result.success && result.message) {
            if (result.rankingChange > 0) {
                window.showSuccess(result.message);
            } else if (result.rankingChange < 0) {
                window.showWarning(result.message);
            } else {
                window.showInfo(result.message);
            }
        }
    }
    
    createGameData(endType) {
        return {
            difficulty: gameState.difficulty,
            finalScore: gameState.score,
            initialScore: gameState.initialScore,
            time: gameState.time,
            errors: gameState.errors,
            isCompleted: endType === 'completed',
            isAbandoned: endType === 'abandoned',
            isDefeated: endType === 'defeated',
            gameMode: gameState.gameMode,
            endType,
            performance: this.calculatePerformance(),
            isPerfectGame: gameState.errors === 0 && endType === 'completed'
        };
    }
    
    calculatePerformance() {
        if (!gameState.isPlaying && gameState.errors >= 5) return 0;
        
        const scoreRatio = gameState.score / gameState.initialScore;
        const errorPenalty = gameState.errors * 0.1;
        const performance = Math.max(0, Math.min(100, (scoreRatio * 100) - (errorPenalty * 100)));
        
        return Math.round(performance);
    }
    
    updateUI() {
        GridManager.updateDisplay();
        document.getElementById('score-display').textContent = gameState.score.toLocaleString();
        document.getElementById('difficulty-display').textContent = GAME_CONFIG.difficulties[gameState.difficulty].name;
        document.getElementById('errors-count').textContent = `${gameState.errors}/${gameState.maxErrors}`;
        document.getElementById('game-time').textContent = GameUtils.formatTime(gameState.time);
    }
    
    showNewGameModal() {
        ModalManager.showNewGameModal();
    }
}

class GridManager {
    static updateDisplay() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                this.updateCell(row, col);
            }
        }
        this.updateNotesButtons();
    }
    
    static updateCell(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (!cell) return;
        
        const value = gameState.grid[row][col];
        const number = GameUtils.getNumber(value);
        const color = GameUtils.getColor(value);
        const { highlight, selected } = this.calculateHighlight(row, col);
        const cellKey = `${row}-${col}`;
        const cellNotes = gameState.notes[cellKey];
        
        cell.innerHTML = '';
        cell.className = 'sudoku-cell';
        
        if (selected) cell.classList.add('selected');
        if (gameState.hints.has(cellKey)) cell.classList.add('hint');
        if (gameState.errorCell && gameState.errorCell[0] === row && gameState.errorCell[1] === col) {
            cell.classList.add('error');
        }
        
        let backgroundColor = color && GAME_CONFIG.colorMap[color] ? GAME_CONFIG.colorMap[color] : '#E6F0FF';
        if ((highlight || selected) && !color) backgroundColor = '#FFFFFF';
        cell.style.backgroundColor = backgroundColor;
        
        if (highlight) {
            cell.style.boxShadow = 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.1)';
            cell.style.opacity = '1';
        } else if (gameState.selectedCell && !selected && gameState.currentHighlightMode !== 'none') {
            const opacity = gameState.currentHighlightMode === 'lineColumn' || gameState.currentHighlightMode === 'region3x3' ? '0.6' : '0.4';
            cell.style.boxShadow = 'inset 0 4px 8px rgba(0,0,0,0.5)';
            cell.style.opacity = opacity;
        } else {
            cell.style.boxShadow = '';
            cell.style.opacity = '1';
        }
        
        if (number) {
            const span = document.createElement('span');
            span.textContent = number;
            span.style.cssText = 'font-size: 24px; font-weight: 700; position: relative; z-index: 1;';
            cell.appendChild(span);
        }
        
        if (cellNotes && (cellNotes.numbers?.size > 0 || cellNotes.colors?.size > 0)) {
            this.renderNotes(cell, cellNotes, number, color);
        }
    }
    
    static renderNotes(cell, cellNotes, number, color) {
        const notesContainer = document.createElement('div');
        notesContainer.className = 'cell-notes';
        
        for (let row = 0; row < 2; row++) {
            const notesRow = document.createElement('div');
            notesRow.className = 'notes-row';
            
            const start = row === 0 ? 1 : 6;
            const end = row === 0 ? 5 : 9;
            
            for (let i = start; i <= end; i++) {
                const noteItem = document.createElement('div');
                noteItem.className = 'note-item';
                
                if (!number && cellNotes.numbers?.has(i.toString())) {
                    noteItem.className += ' note-number';
                    noteItem.textContent = i;
                }
                notesRow.appendChild(noteItem);
            }
            
            if (row === 1) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'note-item';
                notesRow.appendChild(emptyDiv);
            }
            
            notesContainer.appendChild(notesRow);
        }
        
        const colors = [['J', 'O', 'R', 'G', 'P'], ['M', 'T', 'B', 'V']];
        colors.forEach((colorRow, index) => {
            const notesRow = document.createElement('div');
            notesRow.className = 'notes-row';
            
            colorRow.forEach(colorCode => {
                const noteItem = document.createElement('div');
                noteItem.className = 'note-item';
                
                if (!color && cellNotes.colors?.has(colorCode)) {
                    noteItem.className += ` note-color color-${colorCode}`;
                }
                notesRow.appendChild(noteItem);
            });
            
            if (index === 1) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'note-item';
                notesRow.appendChild(emptyDiv);
            }
            
            notesContainer.appendChild(notesRow);
        });
        
        cell.appendChild(notesContainer);
    }
    
    static calculateHighlight(row, col) {
        if (!gameState.selectedCell) return { highlight: false, selected: false };
        
        const [selectedRow, selectedCol] = gameState.selectedCell;
        const isSelected = selectedRow === row && selectedCol === col;
        
        if (isSelected) return { highlight: false, selected: true };
        
        let shouldHighlight = false;
        const mode = gameState.currentHighlightMode;
        
        if (mode === 'lineColumn') {
            shouldHighlight = selectedRow === row || selectedCol === col;
        } else if (mode === 'sameNumber') {
            const selectedNumber = GameUtils.getNumber(gameState.grid[selectedRow][selectedCol]);
            const cellNumber = GameUtils.getNumber(gameState.grid[row][col]);
            shouldHighlight = selectedNumber && cellNumber === selectedNumber;
        } else if (mode === 'sameColor') {
            const selectedColor = GameUtils.getColor(gameState.grid[selectedRow][selectedCol]);
            const cellColor = GameUtils.getColor(gameState.grid[row][col]);
            shouldHighlight = selectedColor && cellColor === selectedColor;
        } else if (mode === 'region3x3') {
            const selectedRegionRow = Math.floor(selectedRow / 3);
            const selectedRegionCol = Math.floor(selectedCol / 3);
            const cellRegionRow = Math.floor(row / 3);
            const cellRegionCol = Math.floor(col / 3);
            shouldHighlight = cellRegionRow === selectedRegionRow && cellRegionCol === selectedRegionCol;
        }
        
        return { highlight: shouldHighlight, selected: false };
    }
    
    static updateNotesButtons() {
        document.querySelectorAll('.notes-toggle').forEach(btn => {
            const isNumbers = btn.id.includes('numbers');
            const type = isNumbers ? 'numbers' : 'colors';
            
            if (gameState.notesMode[type]) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            
            let shouldDisable = false;
            if (gameState.selectedCell) {
                const [row, col] = gameState.selectedCell;
                const currentValue = gameState.grid[row][col];
                const solutionValue = gameState.solution[row][col];
                
                if (isNumbers && GameUtils.getNumber(currentValue) === GameUtils.getNumber(solutionValue)) {
                    shouldDisable = true;
                }
                if (!isNumbers && GameUtils.getColor(currentValue) === GameUtils.getColor(solutionValue)) {
                    shouldDisable = true;
                }
            }
            
            btn.disabled = shouldDisable || gameState.hasError;
            btn.style.opacity = shouldDisable ? '0.5' : '1';
        });
        
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.classList.toggle('notes-mode', gameState.notesMode.numbers);
        });
        
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.toggle('notes-mode', gameState.notesMode.colors);
        });
    }
}

class ModalManager {
    static showVictory(gameData, result) {
        const modal = document.getElementById('victory-modal');
        const config = GAME_CONFIG.difficulties[gameData.difficulty];
        
        document.getElementById('final-score').textContent = gameData.finalScore.toLocaleString();
        document.getElementById('final-time').textContent = GameUtils.formatTime(gameData.time);
        document.getElementById('final-difficulty').textContent = config.name;
        document.getElementById('final-errors').textContent = `${gameData.errors}/5`;
        
        const statsContainer = document.querySelector('.victory-stats');
        this.removeExistingExtraStats(statsContainer);
        
        this.addExtraStat(statsContainer, 'Game Mode', 
            gameData.gameMode === 'ranked' ? '🏆 Ranked' : '🎯 Practice');
        
        if (gameData.gameMode === 'ranked' && result && result.rankingChange) {
            const pointsText = result.rankingChange > 0 ? 
                `+${result.rankingChange} points` : 
                `${result.rankingChange} points`;
            this.addExtraStat(statsContainer, 'Ranking Points', pointsText);
            
            if (result.newTotal !== undefined) {
                this.addExtraStat(statsContainer, 'Total Points', result.newTotal.toLocaleString());
            }
        }
        
        if (gameData.isPerfectGame) {
            this.addExtraStat(statsContainer, 'Perfect Game', '🌟 No errors!');
        }
        
        const performance = gameData.performance || 0;
        this.addExtraStat(statsContainer, 'Performance', `${performance}%`);
        
        if (result && result.success) {
            this.addExtraStat(statsContainer, 'Statistics', '✅ Saved');
        }
        
        modal.classList.add('show');
    }
    
    static showDefeat(reason, gameData, result) {
        let modal = document.getElementById('defeat-modal');
        
        if (!modal) {
            modal = this.createDefeatModal();
            document.body.appendChild(modal);
        }
        
        document.getElementById('defeat-reason').textContent = reason;
        document.getElementById('defeat-score').textContent = gameData.finalScore.toLocaleString();
        document.getElementById('defeat-time').textContent = GameUtils.formatTime(gameData.time);
        document.getElementById('defeat-mode').textContent = 
            gameData.gameMode === 'ranked' ? '🏆 Ranked' : '🎯 Practice';
        
        const saveStatDiv = document.getElementById('defeat-save-stat');
        const saveStatusDiv = document.getElementById('defeat-save-status');
        
        if (currentUser) {
            saveStatDiv.style.display = 'block';
            
            if (gameData.gameMode === 'ranked' && result && result.rankingChange) {
                const changeText = result.rankingChange < 0 ? 
                    `${result.rankingChange} points` : `+${result.rankingChange} points`;
                saveStatusDiv.textContent = result.success ? changeText : '❌ Error';
                
                if (result.newTotal !== undefined && result.success) {
                    saveStatusDiv.textContent += ` (Total: ${result.newTotal})`;
                }
            } else {
                saveStatusDiv.textContent = result && result.success ? '✅ Saved' : '❌ Error';
            }
            
            saveStatusDiv.style.color = result && result.success ? 
                (result.rankingChange && result.rankingChange < 0 ? '#ff6b6b' : '#28a745') : '#dc3545';
        } else {
            saveStatDiv.style.display = 'none';
        }
        
        modal.classList.add('show');
    }
    
    static createDefeatModal() {
        const modal = document.createElement('div');
        modal.id = 'defeat-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="defeat-modal">
                <div class="defeat-icon">💔</div>
                <div class="defeat-title">Game Over!</div>
                <div class="defeat-subtitle">You've reached the limit</div>
                <div class="defeat-reason" id="defeat-reason">5 errors reached!</div>
                <div class="defeat-stats">
                    <div class="defeat-stat">
                        <div class="stat-label">Current Score</div>
                        <div class="stat-value" id="defeat-score">0</div>
                    </div>
                    <div class="defeat-stat">
                        <div class="stat-label">Time Played</div>
                        <div class="stat-value" id="defeat-time">00:00</div>
                    </div>
                    <div class="defeat-stat">
                        <div class="stat-label">Game Mode</div>
                        <div class="stat-value" id="defeat-mode">Practice</div>
                    </div>
                    <div class="defeat-stat" id="defeat-save-stat">
                        <div class="stat-label">Ranking Points</div>
                        <div class="stat-value" id="defeat-save-status">💾 Saving...</div>
                    </div>
                </div>
                <div class="defeat-message">
                    <p>🎮 <strong>You can continue playing on this grid!</strong></p>
                    <p>Your timer is stopped and score won't change.</p>
                </div>
                <div class="defeat-buttons">
                    <button class="defeat-btn primary" onclick="ModalManager.closeDefeat()">Continue Playing</button>
                    <button class="defeat-btn secondary" onclick="ModalManager.closeDefeat(); gameManager.showNewGameModal();">New Game</button>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeDefeat();
        });
        
        return modal;
    }
    
    static addExtraStat(container, label, value) {
        const stat = document.createElement('div');
        stat.className = 'victory-stat extra-stat';
        stat.innerHTML = `
            <div class="stat-label">${label}</div>
            <div class="stat-value">${value}</div>
        `;
        container.appendChild(stat);
    }
    
    static removeExistingExtraStats(container) {
        container.querySelectorAll('.extra-stat').forEach(stat => stat.remove());
    }
    
    static closeVictory() {
        document.getElementById('victory-modal').classList.remove('show');
    }
    
    static closeDefeat() {
        const modal = document.getElementById('defeat-modal');
        if (modal) modal.classList.remove('show');
    }
    
    static showNewGameModal() {
        const modal = this.createModeSelectionModal();
        document.body.appendChild(modal);
        window.createSafeTimeout(() => modal.classList.add('show'), 10);
    }
    
    static createModeSelectionModal() {
        const modal = document.createElement('div');
        modal.className = 'mode-selection-modal';
        
        const rankingInfo = currentUser ? 
            '<div style="font-size: 12px; color: #28a745; margin-top: 8px;">✓ Earn ranking points and compete!</div>' :
            '<div style="font-size: 12px; color: #ff6b6b; margin-top: 8px;">⚠ Login required for ranking points</div>';
        
        modal.innerHTML = `
            <div class="mode-modal-content">
                <div class="mode-modal-title">Choose Game Mode</div>
                <div class="mode-modal-subtitle">How do you want to play?</div>
                <div class="mode-options">
                    <button class="mode-option practice-mode" onclick="ModalManager.selectMode('practice')">
                        <div class="mode-icon">🎯</div>
                        <div class="mode-name">Practice</div>
                        <div class="mode-description">Play casually${currentUser ? ' and save progress' : ' without saving'}</div>
                        <div style="font-size: 12px; color: #059669; margin-top: 8px;">✓ No pressure, just fun!</div>
                    </button>
                    <button class="mode-option ranked-mode" onclick="ModalManager.selectMode('ranked')">
                        <div class="mode-icon">🏆</div>
                        <div class="mode-name">Ranked</div>
                        <div class="mode-description">Compete and improve rating${!currentUser ? ' (Login required)' : ''}</div>
                        ${rankingInfo}
                    </button>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        return modal;
    }
    
    static selectMode(mode) {
        if (mode === 'ranked' && !currentUser) {
            alert('Please log in to play ranked games');
            navigateTo('auth');
            return;
        }
        
        gameState.gameMode = mode;
        document.querySelector('.mode-selection-modal').remove();
        document.getElementById('difficulty-modal').classList.add('show');
    }
}

class SudokuGenerator {
    static generate() {
        const modelGrid = [
            ['3V', '5B', '2G', '6M', '4R', '7P', '1T', '9O', '8J'],
            ['1P', '7J', '9R', '2O', '3B', '8T', '4V', '6G', '5M'],
            ['6O', '8M', '4T', '5V', '9J', '1G', '2P', '3R', '7B'],
            ['2J', '9P', '8V', '3T', '7M', '6R', '5O', '1B', '4G'],
            ['4B', '6T', '7O', '1J', '5G', '9V', '3M', '8P', '2R'],
            ['5R', '3G', '1M', '4P', '8O', '2B', '6J', '7V', '9T'],
            ['8G', '2V', '3J', '9B', '6P', '4M', '7R', '5T', '1O'],
            ['7T', '4O', '6B', '8R', '1V', '5J', '9G', '2M', '3P'],
            ['9M', '1R', '5P', '7G', '2T', '3O', '8B', '4J', '6V']
        ];
        
        let grid = JSON.parse(JSON.stringify(modelGrid));
        
        const rotations = Math.floor(Math.random() * 4);
        for (let i = 0; i < rotations; i++) {
            grid = this.rotateGrid(grid);
        }
        
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const shuffledNumbers = this.shuffle(numbers);
        
        const colors = ['R', 'G', 'B', 'M', 'O', 'P', 'T', 'V', 'J'];
        const shuffledColors = this.shuffle(colors);
        const colorMap = {};
        colors.forEach((color, index) => {
            colorMap[color] = shuffledColors[index];
        });
        
        return grid.map(row => 
            row.map(cell => {
                const num = parseInt(cell[0]);
                const color = cell[1];
                return shuffledNumbers[num - 1] + colorMap[color];
            })
        );
    }
    
    static createPuzzle(solution, hintsCount) {
        const puzzle = Array(9).fill().map(() => Array(9).fill(''));
        const hintsPositions = new Set();
        
        const zones = this.getZones();
        const hintsPerZone = Math.floor(hintsCount / 9);
        const extraHints = hintsCount % 9;
        
        zones.forEach((zone, zoneIndex) => {
            const hintsForZone = hintsPerZone + (zoneIndex < extraHints ? 1 : 0);
            const shuffledZone = this.shuffle([...zone]);
            
            for (let i = 0; i < hintsForZone && i < shuffledZone.length; i++) {
                const [row, col] = shuffledZone[i];
                const fullValue = solution[row][col];
                
                const rand = Math.random();
                if (rand < 0.3) {
                    puzzle[row][col] = GameUtils.getNumber(fullValue);
                } else if (rand < 0.6) {
                    puzzle[row][col] = GameUtils.getColor(fullValue);
                } else {
                    puzzle[row][col] = fullValue;
                }
                
                hintsPositions.add(`${row}-${col}`);
            }
        });
        
        return { grid: puzzle, hintsPositions };
    }
    
    static getZones() {
        const zones = [];
        for (let zoneRow = 0; zoneRow < 3; zoneRow++) {
            for (let zoneCol = 0; zoneCol < 3; zoneCol++) {
                const zone = [];
                for (let row = zoneRow * 3; row < (zoneRow + 1) * 3; row++) {
                    for (let col = zoneCol * 3; col < (zoneCol + 1) * 3; col++) {
                        zone.push([row, col]);
                    }
                }
                zones.push(zone);
            }
        }
        return zones;
    }
    
    static shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    static rotateGrid(grid) {
        const newGrid = Array(9).fill().map(() => Array(9).fill(''));
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                newGrid[j][8-i] = grid[i][j];
            }
        }
        return newGrid;
    }
}

class GameUtils {
    static getNumber(value) {
        if (!value) return '';
        for (let i = 0; i < value.length; i++) {
            if (!isNaN(value[i]) && value[i] !== '' && value[i] !== ' ') return value[i];
        }
        return '';
    }
    
    static getColor(value) {
        if (!value) return '';
        for (let i = 0; i < value.length; i++) {
            if (isNaN(value[i]) && value[i] !== '' && value[i] !== ' ') return value[i];
        }
        return '';
    }
    
    static rearrangeString(str) {
        if (str.length === 2) {
            if (!isNaN(str[0]) && isNaN(str[1])) {
                return str;
            } else if (isNaN(str[0]) && !isNaN(str[1])) {
                return str[1] + str[0];
            }
        }
        return str;
    }
    
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    static isValidMove(row, col, newValue) {
        const targetValue = gameState.solution[row][col];
        const targetNumber = this.getNumber(targetValue);
        const targetColor = this.getColor(targetValue);
        
        const placedNumber = this.getNumber(newValue);
        const placedColor = this.getColor(newValue);
        
        if (placedNumber && placedNumber !== targetNumber) return false;
        if (placedColor && placedColor !== targetColor) return false;
        
        return true;
    }
}

class ErrorManager {
    static async setError(row, col) {
        gameState.hasError = true;
        gameState.errorCell = [row, col];
        
        this.showErrorModal();
        
        if (gameState.errors < 5) {
            const config = GAME_CONFIG.difficulties[gameState.difficulty];
            gameManager.updateScore(gameState.score - config.errorPenalty);
        }
        
        gameState.errors++;
        gameManager.updateUI();
        
        if (gameState.errors >= 5) {
            if (gameTimer) {
                window.cleanupManager.clearTimer(gameTimer);
                gameTimer = null;
            }
            gameManager.updateScore(0);
            
            if (gameState.errors === 5) {
                window.createSafeTimeout(() => {
                    gameManager.endGame('defeated', '5 errors reached!');
                }, 100);
            }
        }
        
        this.disableControls();
        this.showCorrectButton();
        this.markCellAsError(row, col);
    }
    
    static showErrorModal() {
        const modal = document.getElementById('error-modal');
        modal.classList.remove('fade-out');
        modal.classList.add('show');
        
        window.createSafeTimeout(() => {
            modal.classList.add('fade-out');
            window.createSafeTimeout(() => {
                modal.classList.remove('show', 'fade-out');
            }, 2000);
        }, 3000);
    }
    
    static correctError() {
        if (!gameState.hasError || !gameState.errorCell) return;
        
        const [row, col] = gameState.errorCell;
        const cellKey = `${row}-${col}`;
        const currentValue = gameState.grid[row][col];
        const solutionValue = gameState.solution[row][col];
        
        const currentNumber = GameUtils.getNumber(currentValue);
        const currentColor = GameUtils.getColor(currentValue);
        const correctNumber = GameUtils.getNumber(solutionValue);
        const correctColor = GameUtils.getColor(solutionValue);
        
        let newValue = '';
        if (currentNumber && currentNumber === correctNumber) newValue += currentNumber;
        if (currentColor && currentColor === correctColor) newValue += currentColor;
        
        gameState.grid[row][col] = GameUtils.rearrangeString(newValue);
        delete gameState.notes[cellKey];
        
        this.clearError();
        gameState.selectedCell = [row, col];
        gameState.clickCount = 1;
        gameState.currentHighlightMode = 'none';
        
        GridManager.updateDisplay();
    }
    
    static clearError() {
        gameState.hasError = false;
        
        if (gameState.errorCell) {
            const [row, col] = gameState.errorCell;
            this.clearCellError(row, col);
            gameState.errorCell = null;
        }
        
        this.enableControls();
        this.hideCorrectButton();
        
        if (gameState.errors < 5) {
            gameState.isPlaying = true;
        }
    }
    
    static disableControls() {
        document.querySelectorAll('.number-btn, .color-btn, .notes-toggle').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.3';
            btn.style.pointerEvents = 'none';
        });
        
        document.querySelectorAll('.sudoku-cell').forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            if (!gameState.errorCell || gameState.errorCell[0] !== row || gameState.errorCell[1] !== col) {
                cell.classList.add('disabled');
                cell.style.pointerEvents = 'none';
            }
        });
    }
    
    static enableControls() {
        document.querySelectorAll('.number-btn, .color-btn, .notes-toggle').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        });
        
        document.querySelectorAll('.sudoku-cell').forEach(cell => {
            cell.classList.remove('disabled');
            cell.style.pointerEvents = 'auto';
        });
    }
    
    static showCorrectButton() {
        document.getElementById('correct-btn').style.display = 'block';
        document.getElementById('reveal-btn').style.display = 'none';
    }
    
    static hideCorrectButton() {
        document.getElementById('correct-btn').style.display = 'none';
        document.getElementById('reveal-btn').style.display = 'block';
    }
    
    static markCellAsError(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) cell.classList.add('error');
    }
    
    static clearCellError(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) cell.classList.remove('error');
    }
}

class InputManager {
    static handleInput(type, value) {
        if (!gameState.selectedCell || !gameState.isPlaying || gameState.isPaused) return;
        
        if (gameState.hasError) {
            const [errorRow, errorCol] = gameState.errorCell;
            const [selectedRow, selectedCol] = gameState.selectedCell;
            if (selectedRow !== errorRow || selectedCol !== errorCol) return;
        }
        
        const [row, col] = gameState.selectedCell;
        const cellKey = `${row}-${col}`;
        const currentValue = gameState.grid[row][col];
        
        if (gameState.hints.has(cellKey)) {
            const originalHint = gameState.originalHints.get(cellKey);
            const originalNumber = GameUtils.getNumber(originalHint);
            const originalColor = GameUtils.getColor(originalHint);
            
            if (type === 'numbers' && originalNumber) return;
            if (type === 'colors' && originalColor) return;
        }
        
        if (gameState.notesMode[type]) {
            this.handleNotesInput(cellKey, type, value);
            return;
        }
        
        this.handleNormalInput(row, col, type, value);
    }
    
    static handleNotesInput(cellKey, type, value) {
        const [row, col] = gameState.selectedCell;
        const currentValue = gameState.grid[row][col];
        const solutionValue = gameState.solution[row][col];
        
        if (type === 'numbers' && GameUtils.getNumber(currentValue) === GameUtils.getNumber(solutionValue)) return;
        if (type === 'colors' && GameUtils.getColor(currentValue) === GameUtils.getColor(solutionValue)) return;
        
        if (!gameState.notes[cellKey]) {
            gameState.notes[cellKey] = { numbers: new Set(), colors: new Set() };
        }
        
        const cellNotes = gameState.notes[cellKey];
        const valueStr = value.toString();
        
        if (cellNotes[type].has(valueStr)) {
            cellNotes[type].delete(valueStr);
        } else {
            cellNotes[type].add(valueStr);
        }
        
        if (cellNotes.numbers.size === 0 && cellNotes.colors.size === 0) {
            delete gameState.notes[cellKey];
        }
        
        GridManager.updateDisplay();
    }
    
    static handleNormalInput(row, col, type, value) {
        const cellKey = `${row}-${col}`;
        const currentValue = gameState.grid[row][col];
        
        let newNumber = GameUtils.getNumber(currentValue);
        let newColor = GameUtils.getColor(currentValue);
        
        if (type === 'numbers') {
            newNumber = newNumber === value.toString() ? '' : value.toString();
        } else {
            newColor = newColor === value ? '' : value;
        }
        
        let newValue = '';
        if (newNumber) newValue += newNumber;
        if (newColor) newValue += newColor;
        newValue = GameUtils.rearrangeString(newValue);
        
        if (newValue && !GameUtils.isValidMove(row, col, newValue)) {
            gameState.grid[row][col] = newValue;
            GridManager.updateDisplay();
            ErrorManager.setError(row, col);
            return;
        }
        
        gameState.grid[row][col] = newValue;
        
        if (gameState.notes[cellKey]) {
            const hasNumber = GameUtils.getNumber(newValue);
            const hasColor = GameUtils.getColor(newValue);
            
            if (hasNumber && hasColor) {
                delete gameState.notes[cellKey];
            } else if (hasNumber) {
                gameState.notes[cellKey].numbers = new Set();
                if (gameState.notes[cellKey].colors.size === 0) {
                    delete gameState.notes[cellKey];
                }
            } else if (hasColor) {
                gameState.notes[cellKey].colors = new Set();
                if (gameState.notes[cellKey].numbers.size === 0) {
                    delete gameState.notes[cellKey];
                }
            }
        }
        
        gameState.clickCount = 1;
        gameState.currentHighlightMode = 'none';
        
        GridManager.updateDisplay();
        this.checkWinCondition();
    }
    
    static async checkWinCondition() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const currentValue = gameState.grid[row][col];
                const solutionValue = gameState.solution[row][col];
                if (currentValue !== solutionValue) {
                    return false;
                }
            }
        }
        
        await gameManager.endGame('completed');
        return true;
    }
    
    static selectCell(row, col) {
        if (gameState.isPaused) return;
        
        if (gameState.hasError && gameState.errorCell) {
            const [errorRow, errorCol] = gameState.errorCell;
            if (row !== errorRow || col !== errorCol) return;
        }
        
        if (gameState.selectedCell && gameState.selectedCell[0] === row && gameState.selectedCell[1] === col) {
            gameState.clickCount++;
            const currentValue = gameState.grid[row][col];
            const hasNumber = GameUtils.getNumber(currentValue);
            const hasColor = GameUtils.getColor(currentValue);
            
            if (gameState.clickCount === 2) {
                if (!hasNumber && !hasColor) gameState.currentHighlightMode = 'lineColumn';
                else if (hasColor && !hasNumber) gameState.currentHighlightMode = 'sameColor';
                else if (hasNumber && !hasColor) gameState.currentHighlightMode = 'sameNumber';
                else gameState.currentHighlightMode = 'sameColor';
            } else if (gameState.clickCount === 3) {
                if (!hasNumber && !hasColor) gameState.currentHighlightMode = 'region3x3';
                else if (hasColor && !hasNumber) gameState.currentHighlightMode = 'lineColumn';
                else if (hasNumber && !hasColor) gameState.currentHighlightMode = 'lineColumn';
                else gameState.currentHighlightMode = 'sameNumber';
            } else if (gameState.clickCount >= 4) {
                gameState.selectedCell = null;
                gameState.currentHighlightMode = 'none';
                gameState.clickCount = 0;
                GridManager.updateDisplay();
                return;
            }
        } else {
            gameState.selectedCell = [row, col];
            gameState.currentHighlightMode = 'none';
            gameState.clickCount = 1;
            
            const currentValue = gameState.grid[row][col];
            const solutionValue = gameState.solution[row][col];
            
            if (GameUtils.getNumber(currentValue) === GameUtils.getNumber(solutionValue)) {
                gameState.notesMode.numbers = false;
            }
            if (GameUtils.getColor(currentValue) === GameUtils.getColor(solutionValue)) {
                gameState.notesMode.colors = false;
            }
        }
        
        GridManager.updateDisplay();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    gameManager = new GameManager();
    
    gameManager.firebaseInterface.setupAuthStateV2();
    
    createGrid();
    setupEventListeners();
    gameManager.startNewGame('easy', 'practice');
});

function createGrid() {
    const gridElement = document.getElementById('sudoku-grid');
    gridElement.innerHTML = '';
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'sudoku-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', () => InputManager.selectCell(row, col));
            gridElement.appendChild(cell);
        }
    }
}

function setupEventListeners() {
    document.querySelectorAll('.notes-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.id.includes('numbers') ? 'numbers' : 'colors';
            gameState.notesMode[type] = !gameState.notesMode[type];
            GridManager.updateNotesButtons();
        });
    });
    
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.addEventListener('click', () => 
            InputManager.handleInput('numbers', parseInt(btn.dataset.number)));
    });
    
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => 
            InputManager.handleInput('colors', btn.dataset.color));
    });
    
    document.querySelectorAll('.difficulty-option').forEach(option => {
        option.addEventListener('click', () => {
            const difficulty = option.dataset.difficulty;
            const mode = gameState.gameMode || 'practice';
            gameManager.startNewGame(difficulty, mode);
            document.getElementById('difficulty-modal').classList.remove('show');
        });
    });
    
    document.getElementById('new-game-btn').addEventListener('click', () => ModalManager.showNewGameModal());
    document.getElementById('correct-btn').addEventListener('click', () => ErrorManager.correctError());
    document.getElementById('reveal-btn').addEventListener('click', async () => {
        await gameManager.firebaseInterface.saveAbandonIfNeededV2();
        revealGrid();
    });
    document.getElementById('hint-btn').addEventListener('click', giveHint);
    
    document.getElementById('victory-new-game').addEventListener('click', () => {
        ModalManager.closeVictory();
        ModalManager.showNewGameModal();
    });
    document.getElementById('victory-close').addEventListener('click', () => ModalManager.closeVictory());
    
    document.getElementById('difficulty-modal').addEventListener('click', (e) => {
        if (e.target.id === 'difficulty-modal') {
            document.getElementById('difficulty-modal').classList.remove('show');
        }
    });
    
    document.getElementById('victory-modal').addEventListener('click', (e) => {
        if (e.target.id === 'victory-modal') ModalManager.closeVictory();
    });
    
    document.addEventListener('keydown', handleKeyboard);
}

function handleKeyboard(e) {
    if (e.key === 'Escape') {
        document.getElementById('difficulty-modal').classList.remove('show');
        ModalManager.closeVictory();
        ModalManager.closeDefeat();
        return;
    }
    
    if (!gameState.selectedCell || !gameState.isPlaying || gameState.isPaused) return;
    
    if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        InputManager.handleInput('numbers', parseInt(e.key));
    }
    
    if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        giveHint();
    }
    
    if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        if (gameState.hasError) ErrorManager.correctError();
    }
    
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (gameState.hasError) return;
        
        const [row, col] = gameState.selectedCell;
        let newRow = row, newCol = col;
        
        switch(e.key) {
            case 'ArrowUp': newRow = Math.max(0, row - 1); break;
            case 'ArrowDown': newRow = Math.min(8, row + 1); break;
            case 'ArrowLeft': newCol = Math.max(0, col - 1); break;
            case 'ArrowRight': newCol = Math.min(8, col + 1); break;
        }
        
        if (newRow !== row || newCol !== col) {
            gameState.selectedCell = [newRow, newCol];
            gameState.currentHighlightMode = 'none';
            gameState.clickCount = 1;
            GridManager.updateDisplay();
        }
    }
}

function giveHint() {
    if (!gameState.selectedCell || gameState.hasError) return;
    
    const [row, col] = gameState.selectedCell;
    const cellKey = `${row}-${col}`;
    const config = GAME_CONFIG.difficulties[gameState.difficulty];
    
    gameManager.updateScore(gameState.score - config.hintPenalty);
    gameState.grid[row][col] = gameState.solution[row][col];
    delete gameState.notes[cellKey];
    
    GridManager.updateDisplay();
}

async function revealGrid() {
    if (gameState.hasError) return;
    
    gameState.isPlaying = false;
    gameState.gameInProgress = false;
    
    if (gameTimer) {
        window.cleanupManager.clearTimer(gameTimer);
        gameTimer = null;
    }
    
    gameManager.updateScore(0);
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            gameState.grid[row][col] = gameState.solution[row][col];
        }
    }
    
    gameState.notes = {};
    GridManager.updateDisplay();
}

function navigateTo(page) {
    if (firebaseManager && firebaseManager.navigateTo) {
        firebaseManager.navigateTo(page);
    } else {
        window.location.href = `./${page}/`;
    }
}

function goToHome() {
    if (firebaseManager && firebaseManager.navigateToHome) {
        firebaseManager.navigateToHome();
    } else {
        window.location.href = './';
    }
}

function openMobileMenu() {
    const overlay = document.getElementById('mobile-overlay');
    const menu = document.getElementById('mobile-menu');
    const hamburger = document.getElementById('mobile-hamburger');
    
    overlay.classList.add('show');
    menu.classList.add('show');
    hamburger.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    const overlay = document.getElementById('mobile-overlay');
    const menu = document.getElementById('mobile-menu');
    const hamburger = document.getElementById('mobile-hamburger');
    
    overlay.classList.remove('show');
    menu.classList.remove('show');
    hamburger.classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', function() {
    const mobileHamburger = document.getElementById('mobile-hamburger');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const mobileClose = document.getElementById('mobile-close');
    
    if (mobileHamburger) {
        mobileHamburger.addEventListener('click', function() {
            if (this.classList.contains('active')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
    }
    
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', closeMobileMenu);
    }
    
    if (mobileClose) {
        mobileClose.addEventListener('click', closeMobileMenu);
    }
});

console.log('✅ Script.js V2 loaded - Thread-Safe avec FirebaseManager V2');
