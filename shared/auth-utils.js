(function() {
    'use strict';

    window.AuthUtils = {
        
        config: {
            retryAttempts: 3,
            retryDelay: 1000
        },

        // ============= GAMERTAG VALIDATION =============
        
        validateGamertag: function(gamertag) {
            if (!gamertag || typeof gamertag !== 'string') {
                return { isValid: false, error: 'Gamertag is required' };
            }
            
            const trimmed = gamertag.trim();
            
            if (trimmed.length < 3) {
                return { isValid: false, error: 'Gamertag must be at least 3 characters' };
            }
            
            if (trimmed.length > 20) {
                return { isValid: false, error: 'Gamertag must be less than 20 characters' };
            }
            
            if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
                return { isValid: false, error: 'Gamertag can only contain letters, numbers, underscore and dash' };
            }
            
            const forbiddenWords = ['admin', 'moderator', 'suirodoku', 'anonymous', 'user', 'player', 'root', 'system'];
            if (forbiddenWords.some(word => trimmed.toLowerCase().includes(word))) {
                return { isValid: false, error: 'This gamertag is not allowed' };
            }
            
            return { isValid: true, gamertag: trimmed };
        },

        checkGamertagUniqueness: async function(gamertag, currentUserId = null) {
            try {
                const firebase = await window.FirebaseManager.initialize();
                if (!firebase) {
                    throw new Error('Firebase not available');
                }

                const gamertagQuery = firebase.query(
                    firebase.collection(firebase.db, 'users'),
                    firebase.where('profile.gamertag', '==', gamertag)
                );
                
                const existingUsers = await firebase.getDocs(gamertagQuery);
                
                if (existingUsers.empty) {
                    return { isUnique: true };
                }
                
                const foundUser = existingUsers.docs[0];
                if (currentUserId && foundUser.id === currentUserId) {
                    return { isUnique: true };
                }
                
                return { isUnique: false, error: 'This gamertag is already taken' };
                
            } catch (error) {
                console.error('Error checkGamertagUniqueness:', error);
                return { isUnique: true, warning: 'Could not verify uniqueness' };
            }
        },

        // ============= UTILITY FUNCTIONS =============
        
        formatTime: function(seconds) {
            try {
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            } catch (error) {
                return '00:00';
            }
        },

        formatNumber: function(num) {
            try {
                if (typeof num !== 'number' || isNaN(num)) return '0';
                if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
                return num.toString();
            } catch (error) {
                return '0';
            }
        },

        formatRelativeTime: function(date) {
            try {
                const now = new Date();
                const targetDate = date instanceof Date ? date : new Date(date);
                const diffMs = now - targetDate;
                
                const diffSeconds = Math.floor(diffMs / 1000);
                const diffMinutes = Math.floor(diffSeconds / 60);
                const diffHours = Math.floor(diffMinutes / 60);
                const diffDays = Math.floor(diffHours / 24);
                
                if (diffSeconds < 60) return 'Just now';
                if (diffMinutes < 60) return `${diffMinutes}m ago`;
                if (diffHours < 24) return `${diffHours}h ago`;
                if (diffDays < 7) return `${diffDays}d ago`;
                if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
                if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
                return `${Math.floor(diffDays / 365)}y ago`;
            } catch (error) {
                return 'Unknown';
            }
        },

        isValidEmail: function(email) {
            try {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email);
            } catch (error) {
                return false;
            }
        },

        generateId: function(prefix = '') {
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substr(2, 9);
            return `${prefix}${timestamp}${random}`;
        },

        delay: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        // ============= NOTIFICATION SYSTEM - DÉSACTIVÉ =============
        
        showSuccess: function(message, duration = null) {
            console.log(`✅ Success: ${message}`);
            // Plus d'affichage visuel
        },

        showError: function(message, duration = null) {
            console.log(`❌ Error: ${message}`);
            // Plus d'affichage visuel
        },

        showInfo: function(message, duration = null) {
            console.log(`ℹ️ Info: ${message}`);
            // Plus d'affichage visuel
        },

        showWarning: function(message, duration = null) {
            console.log(`⚠️ Warning: ${message}`);
            // Plus d'affichage visuel
        },

        showNotification: function(message, type = 'info', duration = null) {
            console.log(`📢 Notification [${type}]: ${message}`);
            // Plus d'affichage visuel - juste dans la console
        },

        // ============= POST-LOGIN HANDLING =============
        
        handlePostLogin: function(user, redirectTo = null) {
            try {
                if (!user) return;
                
                window.FirebaseManager._getUserDataWithCache(user).then(userData => {
                    const displayName = window.FirebaseManager.getDisplayName(userData);
                    console.log(`✅ Welcome back, ${displayName}!`);
                    
                    // Navigation directe sans notifications visuelles
                    if (redirectTo) {
                        setTimeout(() => {
                            window.location.href = redirectTo;
                        }, 1000); // Réduit le délai
                    } else {
                        setTimeout(() => {
                            window.FirebaseManager.navigateToHome();
                        }, 1000);
                    }
                    
                }).catch(error => {
                    console.error('Error handlePostLogin:', error);
                    
                    setTimeout(() => {
                        window.FirebaseManager.navigateToHome();
                    }, 1500);
                });
                
            } catch (error) {
                console.error('Error handlePostLogin:', error);
                
                setTimeout(() => {
                    window.FirebaseManager.navigateToHome();
                }, 1500);
            }
        },

        getNavigationPath: function(page) {
            return window.FirebaseManager.getNavigationPath(page);
        }
    };

    // ============= GLOBAL ALIASES - CONSOLE SEULEMENT =============
    
    window.showSuccess = (message, duration) => console.log(`✅ ${message}`);
    window.showError = (message, duration) => console.log(`❌ ${message}`);
    window.showInfo = (message, duration) => console.log(`ℹ️ ${message}`);
    window.showWarning = (message, duration) => console.log(`⚠️ ${message}`);

    function initAuthUtils() {
        try {
            console.log('✅ AuthUtils initialized - Notifications disabled (console only)');
        } catch (error) {
            console.error('Error initializing AuthUtils:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuthUtils);
    } else {
        initAuthUtils();
    }

})();
