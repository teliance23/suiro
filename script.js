// ============= SYSTÈME I18N ============= 
const translations = {
    fr: {
        nav: {
            howToPlay: "Comment jouer",
            leaderboards: "Classements",
            login: "Connexion",
            signup: "S'inscrire"
        },
        game: {
            score: "Score",
            level: "Niveau",
            errors: "Erreurs",
            time: "Temps",
            hint: "Indice",
            complete: "Compléter",
            newGame: "Nouvelle partie",
            correct: "Corriger"
        },
        difficulty: {
            easy: "Facile",
            medium: "Moyen", 
            hard: "Difficile",
            expert: "Expert",
            master: "Maître",
            chooseTitle: "Choisir la difficulté",
            chooseSubtitle: "Sélectionnez votre niveau de défi"
        },
        victory: {
            title: "Félicitations !",
            subtitle: "Vous avez terminé le puzzle !",
            finalScore: "Score final",
            time: "Temps",
            difficulty: "Difficulté",
            errors: "Erreurs",
            newGame: "Nouvelle partie",
            close: "Fermer"
        },
        error: {
            title: "Oops ! Essayez encore !",
            subtitle: "Cliquez sur 'Corriger' pour effacer l'erreur et continuer"
        }
    },
    en: {
        nav: {
            howToPlay: "How to Play",
            leaderboards: "Leaderboards", 
            login: "Log In",
            signup: "Sign Up"
        },
        game: {
            score: "Score",
            level: "Level",
            errors: "Errors",
            time: "Time",
            hint: "Hint",
            complete: "Complete",
            newGame: "New Game",
            correct: "Correct"
        },
        difficulty: {
            easy: "Easy",
            medium: "Medium",
            hard: "Hard", 
            expert: "Expert",
            master: "Master",
            chooseTitle: "Choose difficulty",
            chooseSubtitle: "Select your challenge level"
        },
        victory: {
            title: "Congratulations!",
            subtitle: "You completed the puzzle!",
            finalScore: "Final Score",
            time: "Time",
            difficulty: "Difficulty",
            errors: "Errors",
            newGame: "New Game",
            close: "Close"
        },
        error: {
            title: "Oops! Try again!",
            subtitle: "Click 'Correct' to clear the error and continue"
        }
    }
};

let currentLang = localStorage.getItem('lang') || 'en';

function t(key) {
    const keys = key.split('.');
    let value = translations[currentLang];
    for (const k of keys) {
        value = value?.[k];
    }
    return value || key;
}

// ============= ÉTAT DU JEU ============= 
const gameState = {
    grid: Array(9).fill().map(() => Array(9).fill('')),
    solution: Array(9).fill().map(() => Array(9).fill('')),
    selectedCell: null,
    currentHighlightMode: 'none',
    clickCount: 0,
    notesMode: { numbers: false, colors: false },
    notes: {}, // Structure: { "row-col": { numbers: Set(['1','3']), colors: Set(['R','B']) } }
    errors: 0,
    time: 0,
    isPlaying: false,
    isPaused: false,
    hints: new Set(),
    originalHints: new Map(), // Sauvegarde des valeurs d'indices originales
    difficulty: 'easy',
    score: 2000,
    maxErrors: 5,
    hasError: false,
    showError: false,
    errorCell: null,
    // ============= NOUVEAU : SYSTÈME FIREBASE =============
    gameMode: 'practice', // 'ranked' ou 'practice'
    gameStartTime: null, // Pour calculer le temps total
    initialScore: 2000 // Score de départ pour calculer la performance
};

// ============= SYSTÈME UTILISATEUR =============
let currentUser = null;
let playerStats = null;

// Configuration des niveaux de difficulté
const difficultyConfig = {
    easy: {
        name: 'Easy',
        hintsCount: 74,
        initialScore: 2000,
        errorPenalty: 300,
        hintPenalty: 150,
        timeDecrement: 1
    },
    medium: {
        name: 'Medium',
        hintsCount: 68,
        initialScore: 4000,
        errorPenalty: 500,
        hintPenalty: 250,
        timeDecrement: 2
    },
    hard: {
        name: 'Hard',
        hintsCount: 60,
        initialScore: 8000,
        errorPenalty: 800,
        hintPenalty: 400,
        timeDecrement: 3
    },
    expert: {
        name: 'Expert',
        hintsCount: 52,
        initialScore: 15000,
        errorPenalty: 1200,
        hintPenalty: 600,
        timeDecrement: 4
    },
    master: {
        name: 'Master',
        hintsCount: 44,
        initialScore: 25000,
        errorPenalty: 2000,
        hintPenalty: 1000,
        timeDecrement: 6
    }
};

// Mapping des couleurs
const colorMap = {
    'V': '#BEA1E5', 'O': '#FFBB45', 'B': '#5DB2FF', 'R': '#FF8A7A', 'J': '#FFEB6A',
    'T': '#64EAE6', 'M': '#FFA8CB', 'P': '#C9A387', 'G': '#5BD87A'
};

// ============= FIREBASE FUNCTIONS =============

function getCurrentUserId() {
    return currentUser?.uid || null;
}

function isUserLoggedIn() {
    return currentUser !== null;
}

// ============= NOUVELLE FONCTION : SAUVEGARDER TOUTES LES PARTIES =============
async function saveGameToFirebase() {
    // Sauvegarder TOUTES les parties ranked, même celles échouées
    if (!isUserLoggedIn() || gameState.gameMode !== 'ranked') {
        console.log('🎯 Game not saved: user not logged in or practice mode');
        return;
    }

    const config = getCurrentDifficultyConfig();
    const performance = (gameState.score / gameState.initialScore) * 100;
    
    const gameData = {
        difficulty: gameState.difficulty,
        finalScore: gameState.score,
        initialScore: gameState.initialScore,
        time: gameState.time,
        errors: gameState.errors,
        isCompleted: true, // Partie terminée (même si score = 0)
        performance: Math.round(performance * 100) / 100,
        gameMode: gameState.gameMode,
        completedAt: new Date()
    };

    console.log('💾 Attempting to save game data:', gameData);

    try {
        // ============= APPEL DIRECT AUX FONCTIONS FIREBASE =============
        if (typeof window.firebaseAuth !== 'undefined' && window.firebaseAuth.auth && window.firebaseAuth.auth.currentUser) {
            const { auth, db, updateDoc, doc, getDoc } = window.firebaseAuth;
            const userId = auth.currentUser.uid;
            
            console.log('🔥 Using Firebase directly to update stats...');
            
            // Mettre à jour les stats directement
            await updatePlayerStatsDirectly(userId, gameData);
            
            console.log('✅ Game stats updated successfully!');
            
            // Mettre à jour les stats locales
            await updateLocalPlayerStats(gameData);
            
        } else {
            console.error('❌ Firebase not properly initialized');
            throw new Error('Firebase not available');
        }
    } catch (error) {
        console.error('❌ Error saving game to Firebase:', error);
        
        // Essayer un deuxième appel après un délai
        setTimeout(async () => {
            try {
                console.log('🔄 Retrying save...');
                await updatePlayerStatsDirectly(currentUser.uid, gameData);
                console.log('✅ Game stats updated on retry!');
            } catch (retryError) {
                console.error('❌ Retry failed:', retryError);
            }
        }, 2000);
    }
}

// ============= FONCTION DIRECTE POUR METTRE À JOUR LES STATS =============
async function updatePlayerStatsDirectly(userId, gameData) {
    try {
        const { db, doc, getDoc, updateDoc } = window.firebaseAuth;
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        let currentStats = {
            totalGamesPlayed: 0,
            totalGamesWon: 0,
            totalTimeSpent: 0,
            averageTime: 0,
            averageScore: 0,
            bestScores: {},
            practiceGames: 0,
            rankedGames: 0,
            level: 'Beginner',
            currentPerformance: 0,
            lastPlayed: new Date()
        };

        if (userDoc.exists()) {
            const userData = userDoc.data();
            currentStats = { ...currentStats, ...(userData.gameStats || {}) };
        }

        // ============= CALCUL DES NOUVELLES STATS =============
        const calculatedScore = calculateFairScore(gameData);
        
        // Score moyen pondéré
        const alpha = 0.3;
        const previousAverage = currentStats.averageScore || gameData.initialScore;
        const newAverageScore = Math.round(
            (alpha * calculatedScore) + ((1 - alpha) * previousAverage)
        );

        // Autres statistiques
        const isWin = gameData.isCompleted && gameData.performance >= 50;
        const newTotalGames = currentStats.totalGamesPlayed + 1;
        const newTotalWins = currentStats.totalGamesWon + (isWin ? 1 : 0);
        const newTotalTime = currentStats.totalTimeSpent + gameData.time;
        const newAverageTime = Math.round(newTotalTime / newTotalGames);

        // Compteurs de mode
        const newPracticeGames = gameData.gameMode === 'practice' ? 
            (currentStats.practiceGames || 0) + 1 : (currentStats.practiceGames || 0);
        const newRankedGames = gameData.gameMode === 'ranked' ? 
            (currentStats.rankedGames || 0) + 1 : (currentStats.rankedGames || 0);

        // Meilleurs scores
        const currentBest = currentStats.bestScores?.[gameData.difficulty] || 0;
        const newBestScores = { ...currentStats.bestScores };
        if (gameData.isCompleted && gameData.finalScore > currentBest) {
            newBestScores[gameData.difficulty] = gameData.finalScore;
        }

        // Niveau du joueur
        const newLevel = calculatePlayerLevel(newRankedGames, newTotalWins, gameData.gameMode === 'ranked' && isWin);

        // Performance actuelle
        let newPerformance = currentStats.currentPerformance || 0;
        if (gameData.gameMode === 'ranked') {
            const averageInitialScore = (2000 + 4000 + 8000 + 15000 + 25000) / 5; // 10,800
            newPerformance = Math.round(((newAverageScore / averageInitialScore) * 100) * 100) / 100;
        }

        // ============= METTRE À JOUR LA BASE DE DONNÉES =============
        const updatedStats = {
            totalGamesPlayed: newTotalGames,
            totalGamesWon: newTotalWins,
            totalTimeSpent: newTotalTime,
            averageTime: newAverageTime,
            averageScore: newAverageScore,
            bestScores: newBestScores,
            practiceGames: newPracticeGames,
            rankedGames: newRankedGames,
            level: newLevel,
            currentPerformance: Math.max(0, Math.min(100, newPerformance)),
            lastPlayed: new Date()
        };

        await updateDoc(userRef, {
            gameStats: updatedStats
        }, { merge: true });

        console.log('📊 Player stats updated:', {
            totalGames: newTotalGames,
            averageScore: newAverageScore,
            level: newLevel,
            finalScore: gameData.finalScore
        });

    } catch (error) {
        console.error('❌ Error in updatePlayerStatsDirectly:', error);
        throw error;
    }
}

// ============= FONCTIONS UTILITAIRES =============
function calculateFairScore(gameData) {
    const { finalScore, initialScore, isCompleted } = gameData;
    
    if (isCompleted) {
        return finalScore; // Partie terminée avec succès
    }
    
    // Pénalités pour parties non terminées
    let penalizedScore = finalScore;
    const abandonPenalty = Math.round(initialScore * 0.20);
    penalizedScore = Math.max(0, penalizedScore - abandonPenalty);
    const minimumScore = Math.round(initialScore * 0.10);
    penalizedScore = Math.max(minimumScore, penalizedScore);
    
    return penalizedScore;
}

function calculatePlayerLevel(rankedGames, totalWins, isRankedWin) {
    if (rankedGames < 5) return 'Beginner';
    if (rankedGames < 10) return 'Novice';
    if (rankedGames < 25) return 'Intermediate';
    if (rankedGames < 50) return 'Advanced';
    if (rankedGames < 100) return 'Expert';
    if (rankedGames < 200) return 'Master';
    return 'Legend';
}

// ============= SAUVEGARDER PARTIES ABANDONNÉES =============
async function saveAbandonedGameToFirebase() {
    if (!isUserLoggedIn() || gameState.gameMode !== 'ranked') {
        console.log('🎯 Abandoned game not saved: user not logged in or practice mode');
        return;
    }

    const config = getCurrentDifficultyConfig();
    const performance = (gameState.score / gameState.initialScore) * 100;
    
    const gameData = {
        difficulty: gameState.difficulty,
        finalScore: gameState.score,
        initialScore: gameState.initialScore,
        time: gameState.time,
        errors: gameState.errors,
        isCompleted: false, // Partie abandonnée
        performance: Math.round(performance * 100) / 100,
        gameMode: gameState.gameMode,
        abandonedAt: new Date()
    };

    console.log('💾 Saving abandoned game:', gameData);

    try {
        if (typeof window.firebaseAuth !== 'undefined' && window.firebaseAuth.auth && window.firebaseAuth.auth.currentUser) {
            await updatePlayerStatsDirectly(window.firebaseAuth.auth.currentUser.uid, gameData);
            console.log('✅ Abandoned game stats updated');
            await updateLocalPlayerStats(gameData);
        } else {
            console.error('❌ Firebase not available for abandoned game');
        }
    } catch (error) {
        console.error('❌ Error saving abandoned game:', error);
    }
}

async function updateLocalPlayerStats(gameData) {
    if (!playerStats) {
        playerStats = await getPlayerStats();
    }
    
    // Mettre à jour les stats locales pour l'affichage immédiat
    if (playerStats) {
        playerStats.totalGamesPlayed = (playerStats.totalGamesPlayed || 0) + 1;
        if (gameData.isCompleted) {
            playerStats.totalGamesWon = (playerStats.totalGamesWon || 0) + 1;
        }
        
        // Mettre à jour le meilleur score pour cette difficulté
        const currentBest = playerStats.bestScores?.[gameData.difficulty] || 0;
        if (gameData.finalScore > currentBest) {
            if (!playerStats.bestScores) playerStats.bestScores = {};
            playerStats.bestScores[gameData.difficulty] = gameData.finalScore;
        }
        
        // Recalculer le niveau (simplifié pour l'affichage local)
        updatePlayerLevelDisplay();
    }
}

async function getPlayerStats() {
    if (!isUserLoggedIn()) return null;
    
    try {
        if (typeof window.getPlayerStats === 'function') {
            return await window.getPlayerStats(getCurrentUserId());
        }
    } catch (error) {
        console.error('Error getting player stats:', error);
    }
    return null;
}

function updatePlayerLevelDisplay() {
    // Afficher les stats du joueur dans l'interface
    if (playerStats) {
        const levelDisplay = document.getElementById('difficulty-display');
        if (levelDisplay && playerStats.level) {
            // Vous pouvez personaliser l'affichage ici
            // levelDisplay.title = `Player Level: ${playerStats.level}`;
        }
    }
}

// ============= FONCTIONS UTILITAIRES =============

function getCurrentDifficultyConfig() {
    const config = difficultyConfig[gameState.difficulty];
    if (!config) {
        console.warn('Configuration de difficulté non trouvée pour:', gameState.difficulty, 'utilisation de easy par défaut');
        gameState.difficulty = 'easy';
        return difficultyConfig['easy'];
    }
    return config;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getContainsNumber(code) {
    if (!code) return '';
    for (let i = 0; i < code.length; i++) {
        if (!isNaN(code[i]) && code[i] !== '' && code[i] !== ' ') return code[i];
    }
    return '';
}

function getContainsColor(code) {
    if (!code) return '';
    for (let i = 0; i < code.length; i++) {
        if (isNaN(code[i]) && code[i] !== '' && code[i] !== ' ') return code[i];
    }
    return '';
}

function normalizeValue(value) {
    if (!value) return '';
    
    const number = getContainsNumber(value);
    const color = getContainsColor(value);
    
    let result = '';
    if (number) result += number;
    if (color) result += color;
    
    return result;
}

function rearrangeString(str) {
    if (str.length === 2) {
        if (!isNaN(str[0]) && isNaN(str[1])) {
            return str; // déjà dans le bon ordre (chiffre-couleur)
        } else if (isNaN(str[0]) && !isNaN(str[1])) {
            return str[1] + str[0]; // inverse pour mettre chiffre-couleur
        }
    }
    return str;
}

// ============= SYSTÈME DE GESTION D'ERREUR =============

function updateErrorDisplay() {
    const errorElement = document.getElementById('errors-count');
    const errorText = `${gameState.errors}/${gameState.maxErrors}`;
    errorElement.textContent = errorText;
    
    if (gameState.errors >= 5) {
        errorElement.classList.add('error');
    } else {
        errorElement.classList.remove('error');
    }
}

function showErrorModal() {
    const modal = document.getElementById('error-modal');
    modal.classList.remove('fade-out');
    modal.classList.add('show');
    
    setTimeout(() => {
        modal.classList.add('fade-out');
        setTimeout(() => {
            modal.classList.remove('show', 'fade-out');
        }, 2000);
    }, 3000);
}

function setErrorState(row, col) {
    gameState.hasError = true;
    gameState.showError = true;
    gameState.errorCell = [row, col];
    
    showErrorModal();
    
    if (gameState.errors < 5) {
        const config = getCurrentDifficultyConfig();
        updateScore(gameState.score - config.errorPenalty, true);
    }
    gameState.errors++;
    
    updateErrorDisplay();
    
    if (gameState.errors >= 5) {
        clearInterval(gameTimer);
        updateScore(0);
        
        if (gameState.errors === 5) {
            setTimeout(async () => {
                alert(`5 errors reached!\nTimer stopped, score reset to 0.\nYou can continue playing but beware of more errors!`);
                
                // ============= SAUVEGARDER PARTIE ÉCHOUÉE =============
                if (gameState.gameMode === 'ranked') {
                    console.log('💾 Saving failed game due to 5 errors...');
                    await saveGameToFirebase(); // Sauvegarder même avec score = 0
                }
            }, 100);
        }
    }
    
    disableAllControls();
    showCorrectButton();
    markCellAsError(row, col);
}

function clearErrorState() {
    gameState.hasError = false;
    gameState.showError = false;
    
    if (gameState.errorCell) {
        const [row, col] = gameState.errorCell;
        clearCellError(row, col);
        gameState.errorCell = null;
    }
    
    enableAllControls();
    hideCorrectButton();
    
    if (gameState.errors < 5) {
        gameState.isPlaying = true;
    }
}

function disableAllControls() {
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.3';
        btn.style.pointerEvents = 'none';
    });
    
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.3';
        btn.style.pointerEvents = 'none';
    });
    
    document.querySelectorAll('.notes-toggle').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.3';
        btn.style.pointerEvents = 'none';
    });
    
    const hintBtn = document.getElementById('hint-btn');
    hintBtn.disabled = true;
    hintBtn.style.opacity = '0.3';
    hintBtn.style.pointerEvents = 'none';
    
    const revealBtn = document.getElementById('reveal-btn');
    revealBtn.disabled = true;
    revealBtn.style.opacity = '0.3';
    revealBtn.style.pointerEvents = 'none';
    
    document.querySelectorAll('.sudoku-cell').forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        if (!gameState.errorCell || gameState.errorCell[0] !== row || gameState.errorCell[1] !== col) {
            cell.classList.add('disabled');
            cell.style.pointerEvents = 'none';
            cell.style.cursor = 'not-allowed';
        }
    });
}

function enableAllControls() {
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    });
    
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    });
    
    document.querySelectorAll('.notes-toggle').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    });
    
    const hintBtn = document.getElementById('hint-btn');
    hintBtn.disabled = false;
    hintBtn.style.opacity = '1';
    hintBtn.style.pointerEvents = 'auto';
    
    const revealBtn = document.getElementById('reveal-btn');
    revealBtn.disabled = false;
    revealBtn.style.opacity = '1';
    revealBtn.style.pointerEvents = 'auto';
    
    document.querySelectorAll('.sudoku-cell').forEach(cell => {
        cell.classList.remove('disabled');
        cell.style.pointerEvents = 'auto';
        cell.style.cursor = 'pointer';
    });
}

function showCorrectButton() {
    const correctBtn = document.getElementById('correct-btn');
    const revealBtn = document.getElementById('reveal-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    
    correctBtn.style.display = 'block';
    revealBtn.style.display = 'none';
    correctBtn.classList.add('correct-btn');
    
    if (window.innerWidth <= 768) {
        newGameBtn.style.display = 'none';
        correctBtn.style.order = '2';
    }
}

function hideCorrectButton() {
    const correctBtn = document.getElementById('correct-btn');
    const revealBtn = document.getElementById('reveal-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    
    correctBtn.style.display = 'none';
    revealBtn.style.display = 'block';
    correctBtn.classList.remove('correct-btn');
    
    if (window.innerWidth <= 768) {
        newGameBtn.style.display = 'block';
        correctBtn.style.order = '';
    }
}

function markCellAsError(row, col) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        cell.classList.add('error');
    }
}

function clearCellError(row, col) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        cell.classList.remove('error');
    }
}

function correctError() {
    if (!gameState.hasError || !gameState.errorCell) return;
    
    const [row, col] = gameState.errorCell;
    const cellKey = `${row}-${col}`;
    const currentValue = gameState.grid[row][col];
    const solutionValue = gameState.solution[row][col];
    
    const currentNumber = getContainsNumber(currentValue);
    const currentColor = getContainsColor(currentValue);
    const correctNumber = getContainsNumber(solutionValue);
    const correctColor = getContainsColor(solutionValue);
    
    let newValue = '';
    
    if (currentNumber && currentNumber === correctNumber) {
        newValue += currentNumber;
    }
    if (currentColor && currentColor === correctColor) {
        newValue += currentColor;
    }
    
    gameState.grid[row][col] = rearrangeString(newValue);
    
    delete gameState.notes[cellKey];
    
    clearErrorState();
    gameState.selectedCell = [row, col];
    gameState.clickCount = 1;
    gameState.currentHighlightMode = 'none';
    
    updateDisplay();
}

// ============= SCORE ET VALIDATION =============

function updateScore(newScore, showEffect = false) {
    const oldScore = gameState.score;
    gameState.score = Math.max(0, Math.floor(newScore));
    const scoreElement = document.getElementById('score-display');
    scoreElement.textContent = gameState.score.toLocaleString();
    
    if (showEffect && newScore < oldScore) {
        scoreElement.style.animation = 'scoreDecrease 1s ease-out';
        setTimeout(() => {
            scoreElement.style.animation = '';
        }, 1000);
    }
}

function isValidMove(row, col, newValue) {
    const targetValue = gameState.solution[row][col];
    const targetNumber = getContainsNumber(targetValue);
    const targetColor = getContainsColor(targetValue);
    
    const placedNumber = getContainsNumber(newValue);
    const placedColor = getContainsColor(newValue);
    
    if (placedNumber && placedNumber !== targetNumber) return false;
    if (placedColor && placedColor !== targetColor) return false;
    
    return true;
}

// ============= GRILLE MODÈLE DE BASE =============
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

function shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function rotateGrid(grid) {
    const newGrid = Array(9).fill().map(() => Array(9).fill(''));
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            newGrid[j][8-i] = grid[i][j];
        }
    }
    return newGrid;
}

function generateSolution() {
    let grid = JSON.parse(JSON.stringify(modelGrid));
    
    const rotations = Math.floor(Math.random() * 4);
    for (let i = 0; i < rotations; i++) {
        grid = rotateGrid(grid);
    }
    
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const shuffledNumbers = shuffle(numbers);
    
    const colorsList = ['R', 'G', 'B', 'M', 'O', 'P', 'T', 'V', 'J'];
    const shuffledColors = shuffle(colorsList);
    const colorMap = {};
    colorsList.forEach((color, index) => {
        colorMap[color] = shuffledColors[index];
    });
    
    grid = grid.map(row => 
        row.map(cell => {
            if (cell) {
                const num = parseInt(cell[0]);
                const color = cell[1];
                
                return shuffledNumbers[num - 1] + colorMap[color];
            }
            return cell;
        })
    );
    
    return grid;
}

function generateHints(grid, count) {
    const newGrid = Array(9).fill().map(() => Array(9).fill(''));
    const hintsPositions = new Set();
    
    const numbersOnly = Math.floor(count * 0.3);
    const colorsOnly = Math.floor(count * 0.3);
    const complete = count - numbersOnly - colorsOnly;
    
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
    
    const numbersPerZone = Math.floor(numbersOnly / 9);
    const extraNumbers = numbersOnly % 9;
    
    const colorsPerZone = Math.floor(colorsOnly / 9);
    const extraColors = colorsOnly % 9;
    
    const completePerZone = Math.floor(complete / 9);
    const extraComplete = complete % 9;
    
    zones.forEach((zone, zoneIndex) => {
        const numbersForZone = numbersPerZone + (zoneIndex < extraNumbers ? 1 : 0);
        const colorsForZone = colorsPerZone + (zoneIndex < extraColors ? 1 : 0);
        const completeForZone = completePerZone + (zoneIndex < extraComplete ? 1 : 0);
        
        const shuffledZone = shuffle([...zone]);
        let positionIndex = 0;
        
        for (let i = 0; i < numbersForZone; i++) {
            if (positionIndex < shuffledZone.length) {
                const [row, col] = shuffledZone[positionIndex];
                const fullValue = grid[row][col];
                const number = getContainsNumber(fullValue);
                
                newGrid[row][col] = number;
                hintsPositions.add(`${row}-${col}`);
                positionIndex++;
            }
        }
        
        for (let i = 0; i < colorsForZone; i++) {
            if (positionIndex < shuffledZone.length) {
                const [row, col] = shuffledZone[positionIndex];
                const fullValue = grid[row][col];
                const color = getContainsColor(fullValue);
                
                newGrid[row][col] = color;
                hintsPositions.add(`${row}-${col}`);
                positionIndex++;
            }
        }
        
        for (let i = 0; i < completeForZone; i++) {
            if (positionIndex < shuffledZone.length) {
                const [row, col] = shuffledZone[positionIndex];
                const fullValue = grid[row][col];
                
                newGrid[row][col] = fullValue;
                hintsPositions.add(`${row}-${col}`);
                positionIndex++;
            }
        }
    });
    
    return { grid: newGrid, hintsPositions };
}

// ============= CHRONOMÈTRE =============
let gameTimer = null;
function startTimer() {
    if (gameTimer) clearInterval(gameTimer);
    gameTimer = setInterval(async () => {
        if (gameState.isPlaying && !gameState.isPaused && gameState.errors < 5) {
            gameState.time++;
            document.getElementById('game-time').textContent = formatTime(gameState.time);
            
            const config = getCurrentDifficultyConfig();
            const newScore = gameState.score - config.timeDecrement;
            updateScore(newScore, false);
            
            if (gameState.score <= 0) {
                gameState.isPlaying = false;
                clearInterval(gameTimer);
                
                // ============= SAUVEGARDER PARTIE ÉCHOUÉE (SCORE = 0) =============
                if (gameState.gameMode === 'ranked') {
                    console.log('💾 Saving failed game due to time/score = 0...');
                    await saveGameToFirebase(); // Sauvegarder même avec score = 0
                }
                
                alert(`Time's up! Your score reached zero.\nTime survived: ${formatTime(gameState.time)}`);
            }
        }
    }, 1000);
}

// ============= CRÉATION ET AFFICHAGE DE LA GRILLE =============

function createGrid() {
    const gridElement = document.getElementById('sudoku-grid');
    gridElement.innerHTML = '';
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'sudoku-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', () => selectCell(row, col));
            gridElement.appendChild(cell);
        }
    }
}

function selectCell(row, col) {
    if (gameState.isPaused) return;
    
    if (gameState.hasError && gameState.errorCell) {
        const [errorRow, errorCol] = gameState.errorCell;
        if (row !== errorRow || col !== errorCol) {
            return;
        }
    }
    
    if (gameState.selectedCell && gameState.selectedCell[0] === row && gameState.selectedCell[1] === col) {
        gameState.clickCount++;
        const currentValue = gameState.grid[row][col];
        const hasNumber = getContainsNumber(currentValue);
        const hasColor = getContainsColor(currentValue);
        
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
            updateDisplay();
            return;
        }
    } else {
        gameState.selectedCell = [row, col];
        gameState.currentHighlightMode = 'none';
        gameState.clickCount = 1;
        
        const currentValue = gameState.grid[row][col];
        const currentNumber = getContainsNumber(currentValue);
        const currentColor = getContainsColor(currentValue);
        const solutionValue = gameState.solution[row][col];
        const correctNumber = getContainsNumber(solutionValue);
        const correctColor = getContainsColor(solutionValue);
        
        if (currentNumber && currentNumber === correctNumber) {
            gameState.notesMode.numbers = false;
        }
        if (currentColor && currentColor === correctColor) {
            gameState.notesMode.colors = false;
        }
        
        updateNotesButtons();
    }
    
    updateDisplay();
}

function updateNotesButtons() {
    document.querySelectorAll('.notes-toggle').forEach(btn => {
        const isNumbers = btn.id.includes('numbers');
        const type = isNumbers ? 'numbers' : 'colors';
        
        if (gameState.notesMode[type]) {
            btn.classList.add('active');
            btn.innerHTML = '<span class="pencil-icon">✏️</span>';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<span class="pencil-icon">✏️</span>';
        }
        
        let shouldDisable = false;
        if (gameState.selectedCell) {
            const [row, col] = gameState.selectedCell;
            const currentValue = gameState.grid[row][col];
            const currentNumber = getContainsNumber(currentValue);
            const currentColor = getContainsColor(currentValue);
            const solutionValue = gameState.solution[row][col];
            const correctNumber = getContainsNumber(solutionValue);
            const correctColor = getContainsColor(solutionValue);
            
            if (isNumbers && currentNumber && currentNumber === correctNumber) {
                shouldDisable = true;
            }
            if (!isNumbers && currentColor && currentColor === correctColor) {
                shouldDisable = true;
            }
        }
        
        btn.disabled = shouldDisable || gameState.hasError;
        btn.style.opacity = shouldDisable ? '0.5' : '1';
    });

    document.querySelectorAll('.number-btn').forEach(btn => {
        if (gameState.notesMode.numbers) {
            btn.classList.add('notes-mode');
        } else {
            btn.classList.remove('notes-mode');
        }
    });

    document.querySelectorAll('.color-btn').forEach(btn => {
        if (gameState.notesMode.colors) {
            btn.classList.add('notes-mode');
        } else {
            btn.classList.remove('notes-mode');
        }
    });
}

function calculateHighlight(row, col) {
    if (!gameState.selectedCell) return { highlight: false, selected: false };
    
    const [selectedRow, selectedCol] = gameState.selectedCell;
    const isSelected = selectedRow === row && selectedCol === col;
    
    if (isSelected) return { highlight: false, selected: true };
    
    let shouldHighlight = false;
    const mode = gameState.currentHighlightMode;
    
    if (mode === 'lineColumn') {
        shouldHighlight = selectedRow === row || selectedCol === col;
    } else if (mode === 'sameNumber') {
        const selectedNumber = getContainsNumber(gameState.grid[selectedRow][selectedCol]);
        const cellNumber = getContainsNumber(gameState.grid[row][col]);
        shouldHighlight = selectedNumber && cellNumber === selectedNumber;
    } else if (mode === 'sameColor') {
        const selectedColor = getContainsColor(gameState.grid[selectedRow][selectedCol]);
        const cellColor = getContainsColor(gameState.grid[row][col]);
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

function updateCellDisplay(row, col) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;
    
    const value = gameState.grid[row][col];
    const number = getContainsNumber(value);
    const color = getContainsColor(value);
    const { highlight, selected } = calculateHighlight(row, col);
    const cellKey = `${row}-${col}`;
    const cellNotes = gameState.notes[cellKey];
    
    const hadError = cell.classList.contains('error');
    cell.innerHTML = '';
    cell.className = 'sudoku-cell';
    if (selected) cell.classList.add('selected');
    if (gameState.hints.has(`${row}-${col}`)) cell.classList.add('hint');
    if (hadError) cell.classList.add('error');
    
    cell.style.position = 'relative';
    
    let backgroundColor = color && colorMap[color] ? colorMap[color] : '#E6F0FF';
    
    if ((highlight || selected) && !color) {
        backgroundColor = '#FFFFFF';
    }
    
    cell.style.backgroundColor = backgroundColor;
    
    if (highlight) {
        cell.style.boxShadow = 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.1)';
        cell.style.opacity = '1';
    } else if (gameState.selectedCell && !selected && gameState.currentHighlightMode !== 'none') {
        let opacity = '0.4';
        if (gameState.currentHighlightMode === 'lineColumn' || gameState.currentHighlightMode === 'region3x3') {
            opacity = '0.6';
        } else if (gameState.currentHighlightMode === 'sameColor') {
            opacity = '0.4';
        } else if (gameState.currentHighlightMode === 'sameNumber') {
            opacity = '0.2';
        }
        cell.style.boxShadow = 'inset 0 4px 8px rgba(0,0,0,0.5)';
        cell.style.opacity = opacity;
    } else {
        cell.style.boxShadow = '';
        cell.style.opacity = '1';
    }
    
    if (number) {
        const span = document.createElement('span');
        span.textContent = number;
        span.style.fontSize = '24px';
        span.style.fontWeight = '700';
        span.style.position = 'relative';
        span.style.zIndex = '1';
        cell.appendChild(span);
    }
    
    if (cellNotes && (cellNotes.numbers.size > 0 || cellNotes.colors.size > 0)) {
        const notesContainer = document.createElement('div');
        notesContainer.className = 'cell-notes';
        
        const row1 = document.createElement('div');
        row1.className = 'notes-row';
        for (let i = 1; i <= 5; i++) {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            
            if (!number && cellNotes.numbers.has(i.toString())) {
                noteItem.className += ' note-number';
                noteItem.textContent = i;
            }
            row1.appendChild(noteItem);
        }
        notesContainer.appendChild(row1);
        
        const row2 = document.createElement('div');
        row2.className = 'notes-row';
        for (let i = 6; i <= 9; i++) {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            
            if (!number && cellNotes.numbers.has(i.toString())) {
                noteItem.className += ' note-number';
                noteItem.textContent = i;
            }
            row2.appendChild(noteItem);
        }
        const emptyDiv1 = document.createElement('div');
        emptyDiv1.className = 'note-item';
        row2.appendChild(emptyDiv1);
        notesContainer.appendChild(row2);
        
        const row3 = document.createElement('div');
        row3.className = 'notes-row';
        const colors1 = ['J', 'O', 'R', 'G', 'P'];
        colors1.forEach(colorCode => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            
            if (!color && cellNotes.colors.has(colorCode)) {
                noteItem.className += ` note-color color-${colorCode}`;
            }
            row3.appendChild(noteItem);
        });
        notesContainer.appendChild(row3);
        
        const row4 = document.createElement('div');
        row4.className = 'notes-row';
        const colors2 = ['M', 'T', 'B', 'V'];
        colors2.forEach(colorCode => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            
            if (!color && cellNotes.colors.has(colorCode)) {
                noteItem.className += ` note-color color-${colorCode}`;
            }
            row4.appendChild(noteItem);
        });
        const emptyDiv2 = document.createElement('div');
        emptyDiv2.className = 'note-item';
        row4.appendChild(emptyDiv2);
        notesContainer.appendChild(row4);
        
        cell.appendChild(notesContainer);
    }
}

// ============= GESTION DES ENTRÉES =============

function handleInput(type, value) {
    if (!gameState.selectedCell || !gameState.isPlaying || gameState.isPaused) return;
    
    if (gameState.hasError) {
        if (!gameState.errorCell) return;
        const [errorRow, errorCol] = gameState.errorCell;
        const [selectedRow, selectedCol] = gameState.selectedCell;
        if (selectedRow !== errorRow || selectedCol !== errorCol) return;
    }
    
    const [row, col] = gameState.selectedCell;
    const cellKey = `${row}-${col}`;
    const currentValue = gameState.grid[row][col];
    
    if (gameState.hints.has(cellKey)) {
        const originalHint = gameState.originalHints.get(cellKey);
        const originalNumber = getContainsNumber(originalHint);
        const originalColor = getContainsColor(originalHint);
        
        if (type === 'numbers' && originalNumber) return;
        if (type === 'colors' && originalColor) return;
    }
    
    const currentNumber = getContainsNumber(currentValue);
    const currentColor = getContainsColor(currentValue);
    const solutionValue = gameState.solution[row][col];
    const correctNumber = getContainsNumber(solutionValue);
    const correctColor = getContainsColor(solutionValue);
    
    if (gameState.notesMode[type]) {
        if (type === 'numbers' && currentNumber && currentNumber === correctNumber) return;
        if (type === 'colors' && currentColor && currentColor === correctColor) return;
        
        if (!gameState.notes[cellKey]) {
            gameState.notes[cellKey] = { 
                numbers: new Set(), 
                colors: new Set() 
            };
        }
        
        const cellNotes = gameState.notes[cellKey];
        const valueStr = value.toString();
        
        if (type === 'numbers') {
            if (cellNotes.numbers.has(valueStr)) {
                cellNotes.numbers.delete(valueStr);
            } else {
                cellNotes.numbers.add(valueStr);
            }
        } else {
            if (cellNotes.colors.has(valueStr)) {
                cellNotes.colors.delete(valueStr);
            } else {
                cellNotes.colors.add(valueStr);
            }
        }
        
        if (cellNotes.numbers.size === 0 && cellNotes.colors.size === 0) {
            delete gameState.notes[cellKey];
        }
        
        updateDisplay();
        return;
    }
    
    let newNumber = currentNumber;
    let newColor = currentColor;
    
    if (type === 'numbers') {
        newNumber = currentNumber === value.toString() ? '' : value.toString();
    } else {
        newColor = currentColor === value ? '' : value;
    }
    
    let newValue = '';
    if (newNumber) newValue += newNumber;
    if (newColor) newValue += newColor;
    newValue = rearrangeString(newValue);
    
    if (newValue && !isValidMove(row, col, newValue)) {
        gameState.grid[row][col] = newValue;
        updateDisplay();
        setErrorState(row, col);
        return;
    }
    
    gameState.grid[row][col] = newValue;
    
    if (gameState.notes[cellKey]) {
        const hasNumber = getContainsNumber(newValue);
        const hasColor = getContainsColor(newValue);
        
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
    
    updateDisplay();
    checkWinCondition();
}

// ============= FONCTIONS DU JEU =============

function handleVisibilityChange() {
    if (document.hidden) {
        if (gameState.isPlaying && !gameState.isPaused) {
            gameState.isPaused = true;
        }
    } else {
        if (gameState.isPlaying && gameState.isPaused) {
            gameState.isPaused = false;
        }
    }
}

// ============= MODIFICATION : SÉLECTION DIFFICULTÉ + MODE =============

function changeDifficulty(newDifficulty, gameMode = 'practice') {
    gameState.difficulty = newDifficulty;
    gameState.gameMode = gameMode;
    
    const config = difficultyConfig[newDifficulty];
    
    document.getElementById('difficulty-display').textContent = config.name;
    
    closeModal();
    
    // Vérifier connexion pour mode classé
    if (gameMode === 'ranked' && !isUserLoggedIn()) {
        alert('Please log in to play ranked games');
        navigateTo('auth');
        return;
    }
    
    generateNewGame();
}

function openModal() {
    const modal = document.getElementById('difficulty-modal');
    modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('difficulty-modal');
    modal.classList.remove('show');
}

function showNewGameModal() {
    // Vérifier si un modal de mode existe déjà
    const existingModeModal = document.querySelector('.mode-selection-modal');
    if (existingModeModal) {
        existingModeModal.remove();
    }
    
    // Créer le modal de sélection de mode en premier
    const modeModal = document.createElement('div');
    modeModal.className = 'mode-selection-modal';
    modeModal.innerHTML = `
        <div class="mode-modal-content">
            <div class="mode-modal-title">Choose Game Mode</div>
            <div class="mode-modal-subtitle">How do you want to play?</div>
            
            <div class="mode-options">
                <button class="mode-option practice-mode" data-mode="practice">
                    <div class="mode-icon">🎯</div>
                    <div class="mode-name">Practice</div>
                    <div class="mode-description">Play casually without affecting your ranking</div>
                </button>
                
                <button class="mode-option ranked-mode" data-mode="ranked">
                    <div class="mode-icon">🏆</div>
                    <div class="mode-name">Ranked</div>
                    <div class="mode-description">Compete and save your best scores</div>
                </button>
            </div>
        </div>
    `;
    
    // Ajouter le modal au body
    document.body.appendChild(modeModal);
    
    // Animer l'apparition
    setTimeout(() => {
        modeModal.classList.add('show');
    }, 10);
    
    // Gérer les clics sur les modes
    modeModal.querySelectorAll('.mode-option').forEach(modeBtn => {
        modeBtn.addEventListener('click', () => {
            const mode = modeBtn.dataset.mode;
            
            // Vérifier connexion pour mode classé
            if (mode === 'ranked' && !isUserLoggedIn()) {
                modeModal.remove();
                alert('Please log in to play ranked games');
                navigateTo('auth');
                return;
            }
            
            // Sauvegarder le mode sélectionné temporairement
            gameState.gameMode = mode;
            
            // Fermer ce modal et ouvrir le modal de difficulté
            modeModal.remove();
            openModal(); // Utiliser la fonction existante
        });
    });
    
    // Fermer si clic en dehors
    modeModal.addEventListener('click', (e) => {
        if (e.target === modeModal) {
            modeModal.remove();
        }
    });
}

function giveHint() {
    if (!gameState.selectedCell) return;
    if (gameState.hasError) return;
    
    const [row, col] = gameState.selectedCell;
    const cellKey = `${row}-${col}`;
    
    const config = getCurrentDifficultyConfig();
    updateScore(gameState.score - config.hintPenalty, true);
    
    gameState.grid[row][col] = gameState.solution[row][col];
    
    delete gameState.notes[cellKey];
    
    updateDisplay();
}

function revealGrid() {
    if (gameState.hasError) return;
    
    gameState.isPlaying = false;
    clearInterval(gameTimer);
    updateScore(0);
    
    // ============= SAUVEGARDER PARTIE ABANDONNÉE =============
    if (gameState.gameMode === 'ranked') {
        console.log('💾 Saving abandoned game (reveal used)...');
        saveAbandonedGameToFirebase();
    }
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            gameState.grid[row][col] = gameState.solution[row][col];
        }
    }
    
    gameState.notes = {};
    
    updateDisplay();
}

function checkWinCondition() {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const currentNorm = normalizeValue(gameState.grid[row][col]);
            const solutionNorm = normalizeValue(gameState.solution[row][col]);
            if (currentNorm !== solutionNorm) {
                return false;
            }
        }
    }
    
    gameState.isPlaying = false;
    clearInterval(gameTimer);
    
    // ============= SAUVEGARDER PARTIE GAGNÉE =============
    if (gameState.gameMode === 'ranked') {
        console.log('🏆 Saving completed game...');
        saveGameToFirebase();
    }
    
    showVictoryModal();
    return true;
}

function showVictoryModal() {
    const modal = document.getElementById('victory-modal');
    const config = getCurrentDifficultyConfig();
    
    document.getElementById('final-score').textContent = gameState.score.toLocaleString();
    document.getElementById('final-time').textContent = formatTime(gameState.time);
    document.getElementById('final-difficulty').textContent = config.name;
    document.getElementById('final-errors').textContent = `${gameState.errors}/${gameState.maxErrors}`;
    
    // ============= NOUVEAU : AFFICHER INFOS MODE =============
    const modeInfo = document.createElement('div');
    modeInfo.className = 'victory-stat';
    modeInfo.innerHTML = `
        <div class="stat-label">Game Mode</div>
        <div class="stat-value">${gameState.gameMode === 'ranked' ? '🏆 Ranked' : '🎯 Practice'}</div>
    `;
    
    // Ajouter après les autres stats si pas déjà présent
    const statsContainer = document.querySelector('.victory-stats');
    if (statsContainer && !statsContainer.querySelector('.mode-stat')) {
        modeInfo.classList.add('mode-stat');
        statsContainer.appendChild(modeInfo);
    }
    
    modal.classList.add('show');
}

function closeVictoryModal() {
    const modal = document.getElementById('victory-modal');
    modal.classList.remove('show');
}

function updateDisplay() {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            updateCellDisplay(row, col);
        }
    }
    
    updateNotesButtons();
}

function generateNewGame() {
    clearErrorState();
    
    const config = getCurrentDifficultyConfig();
    
    gameState.solution = generateSolution();
    
    const { grid: puzzle, hintsPositions } = generateHints(gameState.solution, config.hintsCount);
    
    gameState.grid = puzzle;
    gameState.hints = hintsPositions;
    
    gameState.originalHints.clear();
    for (const hintKey of hintsPositions) {
        const [row, col] = hintKey.split('-').map(Number);
        gameState.originalHints.set(hintKey, gameState.grid[row][col]);
    }
    
    gameState.errors = 0;
    gameState.time = 0;
    gameState.score = config.initialScore;
    gameState.initialScore = config.initialScore; // ============= NOUVEAU =============
    gameState.gameStartTime = new Date(); // ============= NOUVEAU =============
    gameState.isPlaying = true;
    gameState.isPaused = false;
    gameState.selectedCell = null;
    gameState.currentHighlightMode = 'none';
    gameState.clickCount = 0;
    gameState.hasError = false;
    gameState.showError = false;
    gameState.errorCell = null;
    gameState.notesMode = { numbers: false, colors: false };
    gameState.notes = {};
    
    enableAllControls();
    hideCorrectButton();
    
    document.querySelectorAll('.notes-toggle').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.sudoku-cell').forEach(cell => {
        cell.classList.remove('error', 'disabled');
        cell.style.pointerEvents = 'auto';
        cell.style.cursor = 'pointer';
    });
    
    updateScore(gameState.score);
    updateErrorDisplay();
    document.getElementById('game-time').textContent = '00:00';
    
    updateDisplay();
    startTimer();
    
    // ============= NOUVEAU : AFFICHER MODE ACTUEL =============
    console.log(`🎮 New game started - Mode: ${gameState.gameMode}, Difficulty: ${gameState.difficulty}`);
}

// ============= NAVIGATION =============

function navigateTo(page) {
    switch(page) {
        case 'tutorial':
            window.location.href = './tutorial/';
            break;
        case 'leaderboard':
            window.location.href = './leaderboard/';
            break;
        case 'auth':
            window.location.href = './auth/';
            break;
        case 'legal':
            window.location.href = './legal/';
            break;
        default:
            console.log('Navigate to:', page);
            alert(`Navigation to ${page} - Feature coming soon!`);
    }
}

function goToHome() {
    // Déjà sur la page d'accueil
    console.log('Already on home page');
}

// ============= MENU MOBILE =============

function openMobileMenu() {
    const overlay = document.getElementById('mobile-overlay');
    const menu = document.getElementById('mobile-menu');
    const hamburger = document.getElementById('mobile-hamburger');
    
    overlay.classList.add('show');
    menu.classList.add('show');
    hamburger.classList.add('active');
    
    // Empêcher le scroll du body
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    const overlay = document.getElementById('mobile-overlay');
    const menu = document.getElementById('mobile-menu');
    const hamburger = document.getElementById('mobile-hamburger');
    
    overlay.classList.remove('show');
    menu.classList.remove('show');
    hamburger.classList.remove('active');
    
    // Rétablir le scroll du body
    document.body.style.overflow = '';
}

// ============= INITIALISATION =============

document.addEventListener('DOMContentLoaded', function() {
    createGrid();
    
    if (!difficultyConfig[gameState.difficulty]) {
        gameState.difficulty = 'easy';
    }
    
    // ============= NOUVEAU : VÉRIFIER CONNEXION UTILISATEUR =============
    // Vérifier si Firebase est disponible
    if (typeof window.firebaseAuth !== 'undefined') {
        // Écouter les changements d'état de connexion
        const checkAuthState = () => {
            if (window.firebaseAuth && window.firebaseAuth.auth) {
                window.firebaseAuth.auth.onAuthStateChanged((user) => {
                    currentUser = user;
                    if (user) {
                        console.log('✅ User logged in:', user.email);
                        // Charger les stats du joueur
                        getPlayerStats().then(stats => {
                            playerStats = stats;
                            updatePlayerLevelDisplay();
                        });
                    } else {
                        console.log('❌ User logged out');
                        currentUser = null;
                        playerStats = null;
                    }
                });
            } else {
                // Réessayer après un court délai
                setTimeout(checkAuthState, 100);
            }
        };
        checkAuthState();
    }
    
    document.querySelectorAll('.notes-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const isNumbers = btn.id.includes('numbers');
            const type = isNumbers ? 'numbers' : 'colors';
            
            gameState.notesMode[type] = !gameState.notesMode[type];
            
            updateNotesButtons();
        });
    });
    
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.addEventListener('click', () => handleInput('numbers', parseInt(btn.dataset.number)));
    });
    
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => handleInput('colors', btn.dataset.color));
    });
    
    // ============= MODIFICATION : GESTION SÉLECTION DIFFICULTÉ + MODE =============
    document.querySelectorAll('.difficulty-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const difficulty = option.dataset.difficulty;
            
            // Utiliser le mode déjà sélectionné depuis showNewGameModal()
            const mode = gameState.gameMode || 'practice';
            
            changeDifficulty(difficulty, mode);
        });
    });
    
    document.getElementById('new-game-btn').addEventListener('click', showNewGameModal);
    
    document.getElementById('difficulty-modal').addEventListener('click', (e) => {
        if (e.target.id === 'difficulty-modal') {
            closeModal();
        }
    });

    document.getElementById('victory-new-game').addEventListener('click', () => {
        closeVictoryModal();
        showNewGameModal();
    });

    document.getElementById('victory-close').addEventListener('click', () => {
        closeVictoryModal();
    });

    document.getElementById('victory-modal').addEventListener('click', (e) => {
        if (e.target.id === 'victory-modal') {
            closeVictoryModal();
        }
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    document.getElementById('hint-btn').addEventListener('click', giveHint);
    
    document.getElementById('reveal-btn').addEventListener('click', function() {
        revealGrid();
    });
    
    document.getElementById('correct-btn').addEventListener('click', function() {
        correctError();
    });
    
    // Menu mobile
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
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
            closeMobileMenu();
            return;
        }
        
        if (!gameState.selectedCell || !gameState.isPlaying || gameState.isPaused) return;
        
        if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            handleInput('numbers', parseInt(e.key));
        }
        
        if (e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            giveHint();
        }
        
        if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            revealGrid();
        }
        
        if (e.key === 'c' || e.key === 'C') {
            e.preventDefault();
            if (gameState.hasError) {
                correctError();
            }
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
                updateDisplay();
            }
        }
    });
    
    const currentConfig = getCurrentDifficultyConfig();
    document.getElementById('difficulty-display').textContent = currentConfig.name;
    
    generateNewGame();
});

// ============= STYLES CSS POUR LES NOUVEAUX ÉLÉMENTS =============

// Ajouter les styles CSS pour les nouveaux éléments
const modeStyles = document.createElement('style');
modeStyles.textContent = `
    /* Modal de sélection de mode */
    .mode-selection-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
        backdrop-filter: blur(10px);
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .mode-selection-modal.show {
        opacity: 1;
    }
    
    .mode-modal-content {
        background: white;
        border-radius: 20px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        transform: scale(0.9);
        transition: transform 0.3s ease;
    }
    
    .mode-selection-modal.show .mode-modal-content {
        transform: scale(1);
    }
    
    .mode-modal-title {
        font-size: 24px;
        font-weight: 700;
        color: #1c1c1e;
        text-align: center;
        margin-bottom: 8px;
    }
    
    .mode-modal-subtitle {
        font-size: 16px;
        color: #8e8e93;
        text-align: center;
        margin-bottom: 32px;
    }
    
    .mode-options {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
    }
    
    .mode-option {
        flex: 1;
        background: #f8f9fa;
        border: 2px solid #e9ecef;
        border-radius: 16px;
        padding: 24px 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: center;
    }
    
    .mode-option:hover {
        border-color: #6c757d;
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    .practice-mode:hover {
        border-color: #059669;
        background: #ecfdf5;
    }
    
    .ranked-mode:hover {
        border-color: #dc2626;
        background: #fef2f2;
    }
    
    .mode-icon {
        font-size: 32px;
        margin-bottom: 12px;
    }
    
    .mode-name {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 8px;
        color: #1c1c1e;
    }
    
    .mode-description {
        font-size: 14px;
        color: #6c757d;
        line-height: 1.4;
    }
    
    /* Responsive */
    @media (max-width: 600px) {
        .mode-options {
            flex-direction: column;
        }
        
        .mode-modal-content {
            padding: 24px;
            margin: 16px;
        }
        
        .mode-option {
            padding: 20px 16px;
        }
    }
    
    /* Style pour le game mode dans victory modal */
    .victory-stats .mode-stat {
        grid-column: span 2;
        text-align: center;
    }
    
    .victory-stats .mode-stat .stat-value {
        font-size: 18px;
    }
`;

document.head.appendChild(modeStyles);
