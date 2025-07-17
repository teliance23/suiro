// ============= SHARED/GAME-STATS.JS - MODULE STATS FIREBASE =============

(function() {
    'use strict';

    // ============= FIREBASE STATS FUNCTIONS =============

    async function updatePlayerStatsOnly(gameData) {
        try {
            const currentUser = window.FirebaseManager.getCurrentUser();
            if (!currentUser) {
                console.log('📊 No user logged in - skipping stats update');
                return { success: false, message: 'Not logged in' };
            }

            const firebase = await window.FirebaseManager.initialize();
            if (!firebase) {
                throw new Error('Firebase not available');
            }

            console.log('📊 Updating player statistics...', gameData);

            const userRef = firebase.doc(firebase.db, 'users', currentUser.uid);
            const userDoc = await firebase.getDoc(userRef);
            const currentData = userDoc.exists() ? userDoc.data() : {};

            const newStats = calculateNewPlayerStats(currentData, gameData);

            await firebase.updateDoc(userRef, newStats);
            window.FirebaseManager.invalidateUserCache(currentUser.uid);

            console.log('✅ Player statistics updated successfully');
            return { success: true, message: 'Statistics updated' };

        } catch (error) {
            console.error('❌ Error updating player stats:', error);
            return { success: false, message: 'Failed to save statistics' };
        }
    }

    function calculateNewPlayerStats(currentData, gameData) {
        const now = new Date();
        const stats = currentData.stats || {};
        const ranking = currentData.ranking || {
            rankingPoints: 0,
            currentStreak: 0,
            bestStreak: 0,
            perfectGames: 0
        };

        const totalGamesPlayed = (stats.totalGamesPlayed || 0) + 1;
        const totalGamesWon = stats.totalGamesWon || 0;
        const totalGamesAbandoned = stats.totalGamesAbandoned || 0;
        const rankedGames = stats.rankedGames || 0;

        const totalTimePlayed = (stats.totalTimePlayed || 0) + gameData.time;
        const fastestTime = stats.fastestTime ? Math.min(stats.fastestTime, gameData.time) : gameData.time;

        const highestScore = stats.highestScore ? Math.max(stats.highestScore, gameData.finalScore) : gameData.finalScore;
        const totalScore = (stats.totalScore || 0) + gameData.finalScore;

        const difficultyStats = stats.difficultyStats || {};
        const currentDifficultyStats = difficultyStats[gameData.difficulty] || {
            played: 0,
            won: 0,
            bestScore: 0,
            bestTime: null
        };

        const isWin = gameData.isCompleted && gameData.errors <= 3;
        const newTotalWon = isWin ? totalGamesWon + 1 : totalGamesWon;
        const newDifficultyWon = isWin ? currentDifficultyStats.won + 1 : currentDifficultyStats.won;

        let newRanking = { ...ranking };
        if (gameData.gameMode === 'ranked') {
            const rankingChange = calculateRankingPointsChange(gameData, isWin);
            newRanking.rankingPoints = Math.max(0, ranking.rankingPoints + rankingChange);

            if (isWin) {
                newRanking.currentStreak = (ranking.currentStreak || 0) + 1;
                newRanking.bestStreak = Math.max(newRanking.bestStreak || 0, newRanking.currentStreak);
                
                if (gameData.errors === 0) {
                    newRanking.perfectGames = (ranking.perfectGames || 0) + 1;
                }
            } else {
                newRanking.currentStreak = 0;
            }
        }

        const updateData = {
            stats: {
                totalGamesPlayed,
                totalGamesWon: newTotalWon,
                totalGamesAbandoned: gameData.isAbandoned ? totalGamesAbandoned + 1 : totalGamesAbandoned,
                rankedGames: gameData.gameMode === 'ranked' ? rankedGames + 1 : rankedGames,
                totalTimePlayed,
                fastestTime: isWin ? fastestTime : (stats.fastestTime || null),
                highestScore,
                totalScore,
                difficultyStats: {
                    ...difficultyStats,
                    [gameData.difficulty]: {
                        played: currentDifficultyStats.played + 1,
                        won: newDifficultyWon,
                        bestScore: Math.max(currentDifficultyStats.bestScore || 0, gameData.finalScore),
                        bestTime: isWin && currentDifficultyStats.bestTime ? 
                            Math.min(currentDifficultyStats.bestTime, gameData.time) : 
                            (isWin ? gameData.time : currentDifficultyStats.bestTime)
                    }
                }
            },
            ranking: newRanking,
            lastGamePlayed: now,
            updatedAt: now
        };

        const achievements = checkNewAchievements(updateData, currentData);
        if (achievements.length > 0) {
            updateData.achievements = [...(currentData.achievements || []), ...achievements.map(a => a.id)];
        }

        return updateData;
    }

    function calculateRankingPointsChange(gameData, isWin) {
        const difficultyMultipliers = {
            'easy': 1,
            'medium': 1.5,
            'hard': 2,
            'expert': 3,
            'master': 5
        };

        if (!isWin) {
            if (gameData.isAbandoned) return -10;
            if (gameData.isDefeated) return -15;
            return -5;
        }

        const basePoints = 100;
        const difficultyBonus = basePoints * (difficultyMultipliers[gameData.difficulty] || 1);
        
        const expectedTimes = {
            'easy': 300, 'medium': 480, 'hard': 720, 'expert': 1080, 'master': 1800
        };
        const expectedTime = expectedTimes[gameData.difficulty] || 300;
        const timeBonus = Math.max(0, Math.min(50, Math.floor((expectedTime - gameData.time) / 10)));
        
        const errorBonus = Math.max(0, (5 - gameData.errors) * 6);
        
        const scoreRatio = gameData.finalScore / gameData.initialScore;
        const scoreBonus = Math.floor(scoreRatio * 20);
        
        const totalPoints = Math.max(10, Math.round(difficultyBonus + timeBonus + errorBonus + scoreBonus));
        
        return totalPoints;
    }

    function checkNewAchievements(newStats, oldStats) {
        const achievements = [];
        const oldAchievements = oldStats.achievements || [];
        
        const achievementChecks = [
            {
                id: 'first_win',
                check: () => newStats.stats.totalGamesWon === 1 && !oldAchievements.includes('first_win'),
                title: 'First Victory!',
                description: 'Complete your first game',
                icon: '🎉',
                points: 50
            },
            {
                id: 'perfect_game',
                check: () => newStats.ranking.perfectGames > (oldStats.ranking?.perfectGames || 0),
                title: 'Perfect Game!',
                description: 'Complete without any errors',
                icon: '🌟',
                points: 100
            },
            {
                id: 'streak_master',
                check: () => newStats.ranking.currentStreak >= 5 && !oldAchievements.includes('streak_master'),
                title: 'Streak Master',
                description: 'Win 5 games in a row',
                icon: '🔥',
                points: 150
            },
            {
                id: 'speed_runner',
                check: () => newStats.stats.fastestTime <= 300 && !oldAchievements.includes('speed_runner'),
                title: 'Speed Runner',
                description: 'Complete in under 5 minutes',
                icon: '⚡',
                points: 75
            },
            {
                id: 'high_scorer',
                check: () => newStats.stats.highestScore >= 20000 && !oldAchievements.includes('high_scorer'),
                title: 'High Scorer',
                description: 'Score over 20,000 points',
                icon: '💯',
                points: 60
            },
            {
                id: 'ranked_debut',
                check: () => newStats.stats.rankedGames === 1 && !oldAchievements.includes('ranked_debut'),
                title: 'Ranked Debut',
                description: 'Play your first ranked game',
                icon: '🏆',
                points: 25
            }
        ];
        
        for (const achievement of achievementChecks) {
            if (achievement.check()) {
                achievements.push(achievement);
            }
        }
        
        return achievements;
    }

    async function getPlayerStats(userId) {
        try {
            const firebase = await window.FirebaseManager.initialize();
            if (!firebase) return null;

            const userRef = firebase.doc(firebase.db, 'users', userId);
            const userDoc = await firebase.getDoc(userRef);
            
            if (!userDoc.exists()) return null;
            
            return userDoc.data();
        } catch (error) {
            console.error('Error getPlayerStats:', error);
            return null;
        }
    }

    async function getLeaderboards(category = null, limit = 50) {
        try {
            const firebase = await window.FirebaseManager.initialize();
            if (!firebase) return [];

            let leaderboardQuery;
            
            if (category === 'ranking') {
                leaderboardQuery = firebase.query(
                    firebase.collection(firebase.db, 'users'),
                    firebase.orderBy('ranking.rankingPoints', 'desc'),
                    firebase.limit(limit)
                );
            } else {
                leaderboardQuery = firebase.query(
                    firebase.collection(firebase.db, 'users'),
                    firebase.orderBy('stats.totalScore', 'desc'),
                    firebase.limit(limit)
                );
            }

            const querySnapshot = await firebase.getDocs(leaderboardQuery);
            const leaderboard = [];
            
            querySnapshot.forEach((doc, index) => {
                const data = doc.data();
                if (data.profile && (data.stats || data.ranking)) {
                    leaderboard.push({
                        rank: index + 1,
                        userId: doc.id,
                        displayName: window.FirebaseManager.getDisplayName(data),
                        flag: window.FirebaseManager.getFlagEmoji(data.profile?.nationality),
                        stats: data.stats || {},
                        ranking: data.ranking || {},
                        profile: data.profile || {}
                    });
                }
            });

            return leaderboard;
        } catch (error) {
            console.error('Error getLeaderboards:', error);
            return [];
        }
    }

    async function getUserRank(userId) {
        try {
            const firebase = await window.FirebaseManager.initialize();
            if (!firebase) return null;

            const userRef = firebase.doc(firebase.db, 'users', userId);
            const userDoc = await firebase.getDoc(userRef);
            
            if (!userDoc.exists()) return null;
            
            const userData = userDoc.data();
            const userRankingPoints = userData.ranking?.rankingPoints || 0;

            const higherRankQuery = firebase.query(
                firebase.collection(firebase.db, 'users'),
                firebase.where('ranking.rankingPoints', '>', userRankingPoints)
            );
            
            const higherRankSnapshot = await firebase.getDocs(higherRankQuery);
            const rank = higherRankSnapshot.size + 1;

            return rank;
        } catch (error) {
            console.error('Error getUserRank:', error);
            return null;
        }
    }

    // ============= EXPOSE FUNCTIONS GLOBALLY =============

    window.updatePlayerStatsOnly = updatePlayerStatsOnly;
    window.getPlayerStats = getPlayerStats;
    window.getLeaderboards = getLeaderboards;
    window.getUserRank = getUserRank;

    // Compatibility functions for other pages
    window.getRankingLeaderboards = async function(limit = 50) {
        try {
            return await getLeaderboards('ranking', limit);
        } catch (error) {
            console.error('❌ Error getting ranking leaderboards:', error);
            return [];
        }
    };

    window.getUserRankingPosition = async function(userId) {
        try {
            return await getUserRank(userId);
        } catch (error) {
            console.error('❌ Error getting user ranking position:', error);
            return null;
        }
    };

    window.getPlayerRankingStats = async function(userId) {
        try {
            return await getPlayerStats(userId);
        } catch (error) {
            console.error('❌ Error getting player ranking stats:', error);
            return null;
        }
    };

    console.log('✅ Game Stats module loaded successfully');

})();