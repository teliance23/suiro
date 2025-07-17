(function() {
    'use strict';

    const AuthUtilsState = {
        notificationQueue: [],
        isProcessingNotifications: false
    };

    window.AuthUtils = {
        
        config: {
            notificationDuration: {
                success: 4000,
                error: 6000,
                warning: 5000,
                info: 4000
            },
            maxNotifications: 3,
            retryAttempts: 3,
            retryDelay: 1000
        },

        // User data operations
        getUserData: async function(user) {
            try {
                if (!user || !user.uid) {
                    console.warn('Invalid user provided to getUserData');
                    return null;
                }
                return await window.FirebaseManager._getUserDataWithCache(user);
            } catch (error) {
                console.error('Error getUserData:', error);
                return user;
            }
        },

        updateUserData: async function(userId, updateData) {
            try {
                return await window.FirebaseManager.updateUserData(userId, updateData);
            } catch (error) {
                console.error('Error updateUserData:', error);
                throw new Error('Failed to update user data');
            }
        },

        invalidateUserCache: function(userId) {
            window.FirebaseManager.invalidateUserCache(userId);
        },

        // Gamertag validation
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

        // Utility functions
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

        // Notification system
        showSuccess: function(message, duration = null) {
            this.showNotification(message, 'success', duration);
        },

        showError: function(message, duration = null) {
            this.showNotification(message, 'error', duration);
        },

        showInfo: function(message, duration = null) {
            this.showNotification(message, 'info', duration);
        },

        showWarning: function(message, duration = null) {
            this.showNotification(message, 'warning', duration);
        },

        showNotification: function(message, type = 'info', duration = null) {
            try {
                const notification = {
                    id: this.generateId('notif_'),
                    message,
                    type,
                    duration: duration || this.config.notificationDuration[type] || 4000,
                    timestamp: Date.now()
                };

                AuthUtilsState.notificationQueue.push(notification);
                this.processNotificationQueue();
            } catch (error) {
                console.error('Error showNotification:', error);
            }
        },

        processNotificationQueue: async function() {
            if (AuthUtilsState.isProcessingNotifications) return;
            
            AuthUtilsState.isProcessingNotifications = true;
            
            try {
                while (AuthUtilsState.notificationQueue.length > 0) {
                    const notification = AuthUtilsState.notificationQueue.shift();
                    
                    const existingNotifications = document.querySelectorAll('.auth-utils-toast');
                    if (existingNotifications.length >= this.config.maxNotifications) {
                        existingNotifications[0].remove();
                    }
                    
                    await this.displayNotification(notification);
                    
                    if (AuthUtilsState.notificationQueue.length > 0) {
                        await this.delay(200);
                    }
                }
            } catch (error) {
                console.error('Error processNotificationQueue:', error);
            } finally {
                AuthUtilsState.isProcessingNotifications = false;
            }
        },

        displayNotification: async function(notification) {
            return new Promise((resolve) => {
                try {
                    const toast = document.createElement('div');
                    toast.className = `auth-utils-toast auth-utils-toast-${notification.type}`;
                    toast.id = notification.id;
                    toast.setAttribute('role', 'alert');
                    toast.setAttribute('aria-live', 'polite');
                    
                    toast.innerHTML = `
                        <div class="toast-content">
                            <div class="toast-icon">${this.getNotificationIcon(notification.type)}</div>
                            <div class="toast-message">${this.escapeHtml(notification.message)}</div>
                            <button class="toast-close" onclick="AuthUtils.closeNotification('${notification.id}')" aria-label="Close notification">×</button>
                        </div>
                        <div class="toast-progress">
                            <div class="toast-progress-bar"></div>
                        </div>
                    `;
                    
                    this.applyNotificationStyles(toast);
                    document.body.appendChild(toast);
                    
                    requestAnimationFrame(() => {
                        toast.style.transform = 'translateX(0)';
                        toast.style.opacity = '1';
                    });
                    
                    const progressBar = toast.querySelector('.toast-progress-bar');
                    if (progressBar) {
                        progressBar.style.animationDuration = `${notification.duration}ms`;
                    }
                    
                    setTimeout(() => {
                        this.closeNotification(notification.id);
                        resolve();
                    }, notification.duration);
                    
                    toast.addEventListener('mouseenter', () => {
                        toast.style.animationPlayState = 'paused';
                    });
                    
                    toast.addEventListener('mouseleave', () => {
                        toast.style.animationPlayState = 'running';
                    });
                    
                } catch (error) {
                    console.error('Error displayNotification:', error);
                    resolve();
                }
            });
        },

        closeNotification: function(notificationId) {
            try {
                const toast = document.getElementById(notificationId);
                if (toast) {
                    toast.style.transform = 'translateX(100%)';
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 300);
                }
            } catch (error) {
                console.error('Error closeNotification:', error);
            }
        },

        closeAllNotifications: function() {
            try {
                const notifications = document.querySelectorAll('.auth-utils-toast');
                notifications.forEach(notification => {
                    this.closeNotification(notification.id);
                });
            } catch (error) {
                console.error('Error closeAllNotifications:', error);
            }
        },

        applyNotificationStyles: function(toast) {
            if (document.getElementById('auth-utils-toast-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'auth-utils-toast-styles';
            style.textContent = `
                .auth-utils-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    min-width: 320px;
                    max-width: 400px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                    transform: translateX(100%);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 10000;
                    margin-bottom: 10px;
                    overflow: hidden;
                    border-left: 4px solid;
                }
                
                .auth-utils-toast:nth-child(n+2) {
                    margin-top: 10px;
                }
                
                .auth-utils-toast-success { border-left-color: #10b981; }
                .auth-utils-toast-error { border-left-color: #ef4444; }
                .auth-utils-toast-warning { border-left-color: #f59e0b; }
                .auth-utils-toast-info { border-left-color: #3b82f6; }
                
                .toast-content {
                    display: flex;
                    align-items: flex-start;
                    padding: 16px;
                    gap: 12px;
                }
                
                .toast-icon {
                    font-size: 20px;
                    flex-shrink: 0;
                    margin-top: 2px;
                }
                
                .toast-message {
                    flex: 1;
                    font-size: 14px;
                    font-weight: 500;
                    line-height: 1.4;
                    color: #1f2937;
                }
                
                .toast-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    color: #6b7280;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                
                .toast-close:hover {
                    background: #f3f4f6;
                    color: #374151;
                }
                
                .toast-progress {
                    height: 3px;
                    background: #f3f4f6;
                    overflow: hidden;
                }
                
                .toast-progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #10b981, #059669);
                    animation: progress linear;
                    transform-origin: left;
                }
                
                .auth-utils-toast-error .toast-progress-bar {
                    background: linear-gradient(90deg, #ef4444, #dc2626);
                }
                
                .auth-utils-toast-warning .toast-progress-bar {
                    background: linear-gradient(90deg, #f59e0b, #d97706);
                }
                
                .auth-utils-toast-info .toast-progress-bar {
                    background: linear-gradient(90deg, #3b82f6, #2563eb);
                }
                
                @keyframes progress {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
                
                @media (max-width: 480px) {
                    .auth-utils-toast {
                        right: 10px;
                        left: 10px;
                        min-width: auto;
                        max-width: none;
                    }
                }
            `;
            
            document.head.appendChild(style);
        },

        getNotificationIcon: function(type) {
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };
            return icons[type] || 'ℹ️';
        },

        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        // Post-login handling
        handlePostLogin: function(user, redirectTo = null) {
            try {
                if (!user) return;
                
                this.getUserData(user).then(userData => {
                    if (!window.FirebaseManager.isProfileComplete(userData)) {
                        this.showInfo('Please complete your profile to continue.');
                        setTimeout(() => {
                            const settingsUrl = redirectTo ? 
                                `../settings/?redirect=${encodeURIComponent(redirectTo)}` : 
                                '../settings/';
                            window.location.href = settingsUrl;
                        }, 2000);
                    } else {
                        this.showSuccess(`Welcome back, ${window.FirebaseManager.getDisplayName(userData)}!`);
                        
                        if (redirectTo) {
                            setTimeout(() => {
                                window.location.href = redirectTo;
                            }, 1500);
                        }
                    }
                }).catch(error => {
                    console.error('Error handlePostLogin:', error);
                    this.showError('Error loading user data.');
                });
                
            } catch (error) {
                console.error('Error handlePostLogin:', error);
            }
        },

        getNavigationPath: function(page) {
            return window.FirebaseManager.getNavigationPath(page);
        }
    };

    // Global aliases for compatibility (REMOVED duplicates that exist in firebase-manager)
    window.getUserData = (user) => AuthUtils.getUserData(user);
    window.showSuccess = (message, duration) => AuthUtils.showSuccess(message, duration);
    window.showError = (message, duration) => AuthUtils.showError(message, duration);
    window.showInfo = (message, duration) => AuthUtils.showInfo(message, duration);

    function initAuthUtils() {
        try {
            console.log('AuthUtils initialized');
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