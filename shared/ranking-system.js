// ============= SHARED/RANKING-SYSTEM.JS - MODULE SYSTÈME RANKINGS =============

(function() {
    'use strict';

    // ============= RANKING STATS MANAGER =============

    class RankingStatsManager {
        constructor() {
            this.difficultyMultipliers = {
                'easy': 1,
                'medium': 1.5,
                'hard': 2,
                'expert': 3,
                'master': 5
            };
            this.achievementSystem = new AchievementSystem();
        }
        
        async updateStats(gameData) {
            const currentUser = window.FirebaseManager.getCurrentUser();
            if (!currentUser) return { success: false, message: 'Not logged in' };
            
            try {
                console.log('🔄 Updating ranking stats...', gameData);
                
                const previousStats = await window.getPlayerStats(currentUser.uid);
                
                if (typeof window.updatePlayerStatsOnly === 'function') {
                    await window.updatePlayerStatsOnly(gameData);
                    
                    const achievements = this.achievementSystem.checkAchievements(gameData, previousStats);
                    if (achievements.length > 0) {
                        this.showAchievements(achievements);
                    }
                    
                    return this.generateMessage(gameData, previousStats);
                } else {
                    throw new Error('Firebase stats function not available');
                }
                
            } catch (error) {
                console.error('❌ Ranking stats update error:', error);
                return { success: false, message: 'Error saving ranking stats' };
            }
        }
        
        generateMessage(gameData, previousStats = null) {
            const isWin = gameData.isCompleted && gameData.errors <= 3;
            const rankingPoints = this.calculateRankingPoints(gameData, isWin);
            
            if (gameData.gameMode === 'practice') {
                return {
                    success: true,
                    message: gameData.isCompleted ? 
                        `🎯 Practice completed! Score: ${gameData.finalScore.toLocaleString()}` :
                        `🎯 Practice session ended. No penalties in practice mode!`,
                    rankingChange: 0
                };
            } else {
                let message = '';
                const previousPoints = previousStats?.ranking?.rankingPoints || 0;
                const newPoints = previousPoints + rankingPoints;
                
                if (gameData.isCompleted) {
                    const perfectBonus = gameData.errors === 0 ? ' 🌟 Perfect game!' : '';
                    const streakInfo = this.getStreakInfo(gameData, previousStats);
                    message = `🏆 Ranked completed! +${rankingPoints} points${perfectBonus}${streakInfo}`;
                } else if (gameData.isAbandoned) {
                    message = `🏆 Ranked abandoned. -10 points (Total: ${Math.max(0, newPoints)})`;
                } else {
                    message = `🏆 Ranked defeated. -15 points (Total: ${Math.max(0, newPoints)})`;
                }
                
                return {
                    success: true,
                    message: message,
                    rankingChange: rankingPoints,
                    newTotal: Math.max(0, newPoints)
                };
            }
        }
        
        getStreakInfo(gameData, previousStats) {
            if (!gameData.isCompleted || !previousStats) return '';
            
            const currentStreak = (previousStats.ranking?.currentStreak || 0) + 1;
            if (currentStreak >= 5) {
                return ` 🔥 ${currentStreak} win streak!`;
            } else if (currentStreak >= 3) {
                return ` 🔥 ${currentStreak} wins in a row!`;
            }
            return '';
        }
        
        calculateRankingPoints(gameData, isWin) {
            if (gameData.gameMode === 'practice') return 0;
            
            if (!isWin) {
                if (gameData.isAbandoned) return -10;
                if (gameData.isDefeated) return -15;
                return -5;
            }
            
            const basePoints = 100;
            const difficultyBonus = basePoints * (this.difficultyMultipliers[gameData.difficulty] || 1);
            
            const expectedTime = this.getExpectedTime(gameData.difficulty);
            const timeBonus = Math.max(0, Math.min(50, Math.floor((expectedTime - gameData.time) / 10)));
            
            const errorBonus = Math.max(0, (5 - gameData.errors) * 6);
            
            const scoreRatio = gameData.finalScore / gameData.initialScore;
            const scoreBonus = Math.floor(scoreRatio * 20);
            
            const streakBonus = this.calculateStreakBonus(gameData);
            
            const totalPoints = Math.max(10, Math.round(difficultyBonus + timeBonus + errorBonus + scoreBonus + streakBonus));
            
            console.log('📊 Ranking points calculation:', {
                difficulty: gameData.difficulty,
                difficultyBonus,
                timeBonus,
                errorBonus,
                scoreBonus,
                streakBonus,
                totalPoints
            });
            
            return totalPoints;
        }
        
        calculateStreakBonus(gameData) {
            const estimatedStreak = Math.min(gameData.errors === 0 ? 2 : 1, 10);
            return Math.floor(estimatedStreak * 5);
        }
        
        getExpectedTime(difficulty) {
            const expectedTimes = {
                'easy': 300,
                'medium': 480,
                'hard': 720,
                'expert': 1080,
                'master': 1800
            };
            return expectedTimes[difficulty] || 300;
        }
        
        showAchievements(achievements) {
            achievements.forEach((achievement, index) => {
                setTimeout(() => {
                    const toast = document.createElement('div');
                    toast.className = 'achievement-toast';
                    toast.innerHTML = `
                        <div class="achievement-icon">${achievement.icon}</div>
                        <div class="achievement-content">
                            <div class="achievement-title">${achievement.title}</div>
                            <div class="achievement-description">${achievement.description}</div>
                            ${achievement.points ? `<div class="achievement-points">+${achievement.points} bonus points</div>` : ''}
                        </div>
                    `;
                    toast.style.cssText = `
                        position: fixed; top: ${20 + (index * 80)}px; right: 20px; 
                        background: linear-gradient(135deg, #ffd700, #ff8c00); color: #1c1c1e;
                        padding: 16px 20px; border-radius: 12px; z-index: 10001; 
                        font-weight: 600; box-shadow: 0 8px 25px rgba(255,215,0,0.4);
                        animation: slideIn 0.5s ease-out; display: flex; align-items: center; gap: 12px;
                        min-width: 300px; border: 2px solid rgba(255,255,255,0.3);
                    `;
                    
                    document.body.appendChild(toast);
                    
                    setTimeout(() => {
                        toast.style.animation = 'slideOut 0.5s ease-in';
                        setTimeout(() => toast.remove(), 500);
                    }, 4000);
                }, index * 1000);
            });
        }
    }

    // ============= PLAYER RANKING SYSTEM =============

    class PlayerRankingSystem {
        constructor() {
            this.levels = [
                { name: 'Novice', minPoints: 0, color: '#8e8e93', icon: '🥉' },
                { name: 'Beginner', minPoints: 500, color: '#34c759', icon: '🟢' },
                { name: 'Intermediate', minPoints: 1500, color: '#007aff', icon: '🔵' },
                { name: 'Advanced', minPoints: 3500, color: '#af52de', icon: '🟣' },
                { name: 'Expert', minPoints: 7000, color: '#ff9500', icon: '🟠' },
                { name: 'Master', minPoints: 15000, color: '#ff3b30', icon: '🔴' },
                { name: 'Grandmaster', minPoints: 30000, color: '#ffd700', icon: '👑' }
            ];
        }
        
        getLevel(rankingPoints) {
            for (let i = this.levels.length - 1; i >= 0; i--) {
                if (rankingPoints >= this.levels[i].minPoints) return this.levels[i];
            }
            return this.levels[0];
        }
        
        getNextLevel(rankingPoints) {
            const currentLevel = this.getLevel(rankingPoints);
            const currentIndex = this.levels.findIndex(level => level.name === currentLevel.name);
            
            if (currentIndex < this.levels.length - 1) {
                return this.levels[currentIndex + 1];
            }
            return null;
        }
        
        getLevelProgress(rankingPoints) {
            const currentLevel = this.getLevel(rankingPoints);
            const nextLevel = this.getNextLevel(rankingPoints);
            
            if (!nextLevel) return 100;
            
            const currentPoints = rankingPoints || 0;
            const levelStart = currentLevel.minPoints;
            const levelEnd = nextLevel.minPoints;
            
            const progress = ((currentPoints - levelStart) / (levelEnd - levelStart)) * 100;
            return Math.max(0, Math.min(100, progress));
        }
    }

    // ============= ACHIEVEMENT SYSTEM =============

    class AchievementSystem {
        constructor() {
            this.achievements = [
                {
                    id: 'first_win',
                    title: 'First Victory!',
                    description: 'Complete your first game',
                    icon: '🎉',
                    points: 50,
                    check: (gameData, previousStats) => 
                        gameData.isCompleted && (!previousStats || (previousStats.stats?.totalGamesWon || 0) === 0)
                },
                {
                    id: 'perfect_game',
                    title: 'Perfect Game!',
                    description: 'Complete without any errors',
                    icon: '🌟',
                    points: 100,
                    check: (gameData, previousStats) => 
                        gameData.isCompleted && gameData.errors === 0
                },
                {
                    id: 'speed_runner',
                    title: 'Speed Runner',
                    description: 'Complete in under 5 minutes',
                    icon: '⚡',
                    points: 75,
                    check: (gameData, previousStats) => 
                        gameData.isCompleted && gameData.time <= 300
                },
                {
                    id: 'high_scorer',
                    title: 'High Scorer',
                    description: 'Score over 20,000 points',
                    icon: '💯',
                    points: 60,
                    check: (gameData, previousStats) => 
                        gameData.finalScore >= 20000
                },
                {
                    id: 'ranked_debut',
                    title: 'Ranked Debut',
                    description: 'Play your first ranked game',
                    icon: '🏆',
                    points: 25,
                    check: (gameData, previousStats) => 
                        gameData.gameMode === 'ranked' && (!previousStats || (previousStats.stats?.rankedGames || 0) === 0)
                },
                {
                    id: 'streak_master',
                    title: 'Streak Master',
                    description: 'Win 5 games in a row',
                    icon: '🔥',
                    points: 150,
                    check: (gameData, previousStats) => 
                        gameData.isCompleted && (previousStats?.ranking?.currentStreak || 0) >= 4
                }
            ];
        }
        
        checkAchievements(gameData, previousStats) {
            const earned = [];
            
            for (const achievement of this.achievements) {
                if (achievement.check(gameData, previousStats)) {
                    const alreadyEarned = previousStats?.achievements?.includes(achievement.id);
                    if (!alreadyEarned) {
                        earned.push(achievement);
                    }
                }
            }
            
            return earned;
        }
    }

    // ============= EXPOSE CLASSES AND FUNCTIONS GLOBALLY =============

    window.RankingStatsManager = RankingStatsManager;
    window.PlayerRankingSystem = PlayerRankingSystem;
    window.AchievementSystem = AchievementSystem;

    // Helper functions for other pages
    window.calculatePlayerRankingLevel = function(rankingPoints) {
        const rankingSystem = new PlayerRankingSystem();
        return rankingSystem.getLevel(rankingPoints || 0);
    };

    window.calculateNextRankingLevel = function(rankingPoints) {
        const rankingSystem = new PlayerRankingSystem();
        return rankingSystem.getNextLevel(rankingPoints || 0);
    };

    window.formatRankingPoints = function(points) {
        if (!points || points === 0) return '0';
        if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`;
        if (points >= 1000) return `${(points / 1000).toFixed(1)}K`;
        return points.toString();
    };

    window.getRankingLevelColor = function(rankingPoints) {
        const level = window.calculatePlayerRankingLevel(rankingPoints);
        return level.color;
    };

    window.getRankingLevelIcon = function(rankingPoints) {
        const level = window.calculatePlayerRankingLevel(rankingPoints);
        return level.icon;
    };

    window.getPointsToNextLevel = function(rankingPoints) {
        const nextLevel = window.calculateNextRankingLevel(rankingPoints);
        if (!nextLevel) return 0;
        return nextLevel.minPoints - (rankingPoints || 0);
    };

    window.getLevelProgress = function(rankingPoints) {
        const rankingSystem = new PlayerRankingSystem();
        return rankingSystem.getLevelProgress(rankingPoints);
    };

    window.checkRankingAchievements = function(gameData, previousStats = null) {
        const achievementSystem = new AchievementSystem();
        return achievementSystem.checkAchievements(gameData, previousStats);
    };

    window.showAchievements = function(achievements) {
        if (!achievements || achievements.length === 0) return;
        
        const statsManager = new RankingStatsManager();
        statsManager.showAchievements(achievements);
    };

    window.getRankingInsights = async function(userId) {
        try {
            const stats = await window.getPlayerRankingStats(userId);
            const rank = await window.getUserRankingPosition(userId);
            
            if (!stats) return null;
            
            const rankingPoints = stats.ranking?.rankingPoints || 0;
            const level = window.calculatePlayerRankingLevel(rankingPoints);
            const nextLevel = window.calculateNextRankingLevel(rankingPoints);
            const progress = window.getLevelProgress(rankingPoints);
            
            return {
                currentPoints: rankingPoints,
                currentRank: rank,
                currentLevel: level,
                nextLevel: nextLevel,
                progressToNext: progress,
                pointsToNext: window.getPointsToNextLevel(rankingPoints),
                totalGames: stats.stats?.totalGamesPlayed || 0,
                rankedGames: stats.stats?.rankedGames || 0,
                winRate: (stats.stats?.totalGamesPlayed || 0) > 0 ? 
                    Math.round(((stats.stats?.totalGamesWon || 0) / stats.stats.totalGamesPlayed) * 100) : 0,
                currentStreak: stats.ranking?.currentStreak || 0,
                bestStreak: stats.ranking?.bestStreak || 0,
                perfectGames: stats.ranking?.perfectGames || 0
            };
        } catch (error) {
            console.error('❌ Error getting ranking insights:', error);
            return null;
        }
    };

    window.getPerformanceSummary = function(gameData, previousStats = null) {
        const isWin = gameData.isCompleted && gameData.errors <= 3;
        const performance = gameData.performance || 0;
        
        let summary = {
            result: gameData.isCompleted ? 'victory' : gameData.isDefeated ? 'defeat' : 'abandoned',
            performance: performance,
            difficulty: gameData.difficulty,
            time: gameData.time,
            score: gameData.finalScore,
            errors: gameData.errors,
            isPerfect: gameData.isPerfectGame,
            mode: gameData.gameMode
        };
        
        if (gameData.gameMode === 'ranked' && previousStats) {
            const rankingSystem = new RankingStatsManager();
            const pointsChange = rankingSystem.calculateRankingPoints(gameData, isWin);
            const newTotal = (previousStats.ranking?.rankingPoints || 0) + pointsChange;
            
            summary.rankingChange = pointsChange;
            summary.newRankingTotal = Math.max(0, newTotal);
            summary.streak = isWin ? 
                (previousStats.ranking?.currentStreak || 0) + 1 : 0;
        }
        
        return summary;
    };

    // CSS for achievements
    const achievementStyles = `
        .achievement-toast .achievement-icon {
            font-size: 24px;
            flex-shrink: 0;
        }
        
        .achievement-toast .achievement-content {
            flex: 1;
        }
        
        .achievement-toast .achievement-title {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 4px;
        }
        
        .achievement-toast .achievement-description {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 2px;
        }
        
        .achievement-toast .achievement-points {
            font-size: 12px;
            font-weight: 600;
            color: #ff6b35;
        }
    `;

    if (!document.getElementById('achievement-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'achievement-styles';
        styleSheet.textContent = achievementStyles;
        document.head.appendChild(styleSheet);
    }

    console.log('✅ Ranking System module loaded successfully');

})();