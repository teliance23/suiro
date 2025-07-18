(function() {
    'use strict';

    function injectHeaderCSS() {
        if (document.getElementById('auth-header-styles')) return;

        const style = document.createElement('style');
        style.id = 'auth-header-styles';
        style.textContent = `
            .user-menu {
                position: relative;
                display: inline-block;
            }

            .user-name {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 18px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.15);
                border-radius: 10px;
                color: #4a5568;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                min-width: 140px;
                justify-content: space-between;
                backdrop-filter: blur(10px);
            }

            .user-name:hover {
                background: rgba(255, 255, 255, 0.18);
                border-color: rgba(255, 255, 255, 0.25);
                color: #2d3748;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .user-name:active {
                transform: translateY(0);
                transition-duration: 0.1s;
            }

            .user-info {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }

            .user-flag {
                font-size: 18px;
                flex-shrink: 0;
            }

            .user-display-name {
                font-weight: 600;
                max-width: 120px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .dropdown-arrow {
                font-size: 12px;
                transition: transform 0.3s ease;
                color: #8e8e93;
                flex-shrink: 0;
            }

            .user-menu:hover .dropdown-arrow {
                transform: rotate(180deg);
                color: #4a5568;
            }

            .dropdown-menu {
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                background: rgba(255, 255, 255, 0.98);
                backdrop-filter: blur(40px);
                border: 1px solid rgba(229, 229, 234, 0.3);
                border-radius: 16px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
                min-width: 220px;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px) scale(0.95);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 1000;
                overflow: hidden;
            }

            .user-menu:hover .dropdown-menu {
                opacity: 1;
                visibility: visible;
                transform: translateY(0) scale(1);
            }

            .dropdown-menu a {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px 20px;
                color: #1c1c1e;
                text-decoration: none;
                font-size: 15px;
                font-weight: 500;
                transition: all 0.2s ease;
                border-bottom: 1px solid rgba(229, 229, 234, 0.2);
                cursor: pointer;
            }

            .dropdown-menu a:last-child {
                border-bottom: none;
            }

            .dropdown-menu a:hover {
                background: rgba(0, 122, 255, 0.08);
                color: #007aff;
            }

            .dropdown-menu a:active {
                background: rgba(0, 122, 255, 0.15);
                transform: scale(0.98);
            }

            .dropdown-icon {
                font-size: 16px;
                width: 20px;
                text-align: center;
                flex-shrink: 0;
            }

            .dropdown-menu a.sign-out {
                color: #ff3b30;
                border-top: 1px solid rgba(229, 229, 234, 0.3);
                margin-top: 4px;
            }

            .dropdown-menu a.sign-out:hover {
                background: rgba(255, 59, 48, 0.08);
                color: #ff3b30;
            }

            .auth-btn {
                padding: 12px 24px;
                border-radius: 10px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: none;
                text-decoration: none;
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 120px;
                justify-content: center;
            }

            .login-btn {
                background: transparent;
                border: 2px solid #e2e8f0;
                color: #4a5568;
                backdrop-filter: blur(10px);
            }

            .login-btn:hover {
                background: rgba(247, 250, 252, 0.8);
                border-color: #cbd5e0;
                color: #2d3748;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .login-btn:active {
                transform: translateY(0);
                transition-duration: 0.1s;
            }

            .auth-error {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 18px;
                background: rgba(255, 59, 48, 0.1);
                border: 2px solid rgba(255, 59, 48, 0.2);
                border-radius: 10px;
                color: #ff3b30;
                font-size: 14px;
                backdrop-filter: blur(10px);
                min-width: 140px;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .auth-error:hover {
                background: rgba(255, 59, 48, 0.15);
                transform: translateY(-1px);
            }

            .auth-error-icon {
                font-size: 16px;
            }

            .auth-loading {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 18px;
                color: #8e8e93;
                font-size: 14px;
                font-weight: 500;
                min-width: 120px;
                min-height: 40px;
                justify-content: center;
            }

            .auth-loading-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid #e5e5ea;
                border-top: 2px solid #8e8e93;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .profile-incomplete-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                width: 12px;
                height: 12px;
                background: #ff9500;
                border: 2px solid white;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 149, 0, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(255, 149, 0, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 149, 0, 0); }
            }

            @media (max-width: 768px) {
                .user-name {
                    padding: 10px 14px;
                    font-size: 14px;
                    min-width: 120px;
                }

                .dropdown-menu {
                    min-width: 200px;
                    right: -10px;
                }

                .dropdown-menu a {
                    padding: 14px 16px;
                    font-size: 14px;
                }

                .auth-btn {
                    padding: 10px 20px;
                    font-size: 14px;
                    min-width: 100px;
                }

                .auth-loading {
                    min-width: 100px;
                    padding: 10px 14px;
                    font-size: 13px;
                }
            }

            @media (max-width: 480px) {
                .user-display-name {
                    max-width: 80px;
                }

                .dropdown-menu {
                    right: -20px;
                    min-width: 180px;
                }
            }

            .user-name:focus,
            .auth-btn:focus {
                outline: 2px solid #007aff;
                outline-offset: 2px;
            }

            .dropdown-menu a:focus {
                background: rgba(0, 122, 255, 0.08);
                color: #007aff;
                outline: none;
            }
        `;
        
        document.head.appendChild(style);
    }

    const AuthHeaderState = {
        currentUser: null,
        userData: null,
        authState: 'initializing',
        updateInProgress: false,
        authUnsubscribe: null,
        isLoading: false,
        isInitialized: false,
        hasError: false
    };

    window.AuthHeader = {
        authState: 'initializing',
        updateInProgress: false,
        authUnsubscribe: null,
        
        init: function() {
            try {
                injectHeaderCSS();
                this.showLoadingState();
                this.setupFirebaseManager();
                AuthHeaderState.isInitialized = true;
            } catch (error) {
                console.error('Error initializing AuthHeader:', error);
                this.showErrorState('Initialization failed');
            }
        },

        setupFirebaseManager: async function() {
            try {
                await window.FirebaseManager.initialize();
                
                const unsubscribe = window.FirebaseManager.onAuthStateChanged(
                    async (user, userData, error) => {
                        await this.handleAuthStateChangeSafely(user, userData, error);
                    }
                );
                
                this.authUnsubscribe = unsubscribe;
                
            } catch (error) {
                console.error('Error setupFirebaseManager:', error);
                this.showErrorState('Connection failed');
            }
        },
        
        async handleAuthStateChangeSafely(user, userData, error) {
            if (this.updateInProgress) {
                console.log('🔒 Auth header update en cours, skipping...');
                return;
            }
            
            this.updateInProgress = true;
            
            try {
                if (error) {
                    console.error('❌ Erreur auth state:', error);
                    this.showErrorState('Authentication error');
                    return;
                }
                
                if (user) {
                    const validatedUserData = this.validateUserData(user, userData);
                    await this.updateAuthenticatedUISafely(validatedUserData);
                } else {
                    this.showNotAuthenticatedState();
                }
                
                this.syncWithMobileMenuSafely(userData || user);
                
                this.authState = 'ready';
                
            } catch (error) {
                console.error('❌ Erreur handleAuthStateChangeSafely:', error);
                this.showErrorState('UI update failed');
            } finally {
                this.updateInProgress = false;
            }
        },
        
        validateUserData: function(user, userData) {
            if (!user) {
                throw new Error('User object is required');
            }
            
            const validUserData = userData || user;
            
            const validatedData = {
                uid: user.uid,
                email: user.email,
                displayName: validUserData.displayName || user.displayName || 'Anonymous',
                photoURL: validUserData.photoURL || user.photoURL,
                profile: validUserData.profile || {
                    isProfileComplete: true,
                    displayPreference: 'realname',
                    nationality: null
                },
                privacy: validUserData.privacy || {
                    profileVisibility: 'public',
                    showInLeaderboards: true
                }
            };
            
            return validatedData;
        },

        async updateAuthenticatedUISafely(userData) {
            try {
                const desktopAuthButtons = document.getElementById('desktop-auth-buttons');
                if (!desktopAuthButtons) {
                    console.warn('Element desktop-auth-buttons not found');
                    return;
                }
                
                const displayName = this.getDisplayNameSafely(userData);
                const flag = this.getFlagEmojiSafely(userData.profile?.nationality);
                const isProfileComplete = this.isProfileCompleteSafely(userData);
                
                const profileBadge = !isProfileComplete ? 
                    '<div class="profile-incomplete-badge" title="Complete your profile"></div>' : '';
                
                const template = this.createAuthUITemplate(displayName, flag, profileBadge);
                desktopAuthButtons.innerHTML = template;
                
                this.setupDropdownAccessibility();
                
            } catch (error) {
                console.error('❌ Erreur updateAuthenticatedUISafely:', error);
                this.showNotAuthenticatedState();
            }
        },
        
        getDisplayNameSafely: function(userData) {
            try {
                if (window.FirebaseManager && window.FirebaseManager.getDisplayName) {
                    return window.FirebaseManager.getDisplayName(userData);
                }
                
                return userData?.displayName || userData?.email?.split('@')[0] || 'Anonymous';
            } catch (error) {
                console.warn('⚠️ Erreur getDisplayNameSafely:', error);
                return 'Anonymous';
            }
        },
        
        getFlagEmojiSafely: function(nationality) {
            try {
                if (window.FirebaseManager && window.FirebaseManager.getFlagEmoji) {
                    return window.FirebaseManager.getFlagEmoji(nationality);
                }
                return nationality ? '🌍' : '';
            } catch (error) {
                return '';
            }
        },
        
        isProfileCompleteSafely: function(userData) {
            try {
                if (window.FirebaseManager && window.FirebaseManager.isProfileComplete) {
                    return window.FirebaseManager.isProfileComplete(userData);
                }
                return userData?.profile?.isProfileComplete === true;
            } catch (error) {
                return true;
            }
        },
        
        createAuthUITemplate: function(displayName, flag, profileBadge) {
            const escapeHtml = (str) => {
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            };
            
            const safeDisplayName = escapeHtml(displayName);
            const safeFlag = flag || '';
            
            return `
                <div class="user-menu">
                    <div class="user-name" tabindex="0" role="button" aria-haspopup="true" aria-expanded="false">
                        <div class="user-info">
                            ${safeFlag ? `<span class="user-flag">${safeFlag}</span>` : ''}
                            <span class="user-display-name">${safeDisplayName}</span>
                        </div>
                        <span class="dropdown-arrow">▼</span>
                        ${profileBadge}
                    </div>
                    <div class="dropdown-menu" role="menu">
                        <a href="${this.getNavigationPathSafely('profile')}" role="menuitem">
                            <span class="dropdown-icon">👤</span>
                            <span>My Profile</span>
                        </a>
                        <a href="${this.getNavigationPathSafely('settings')}" role="menuitem">
                            <span class="dropdown-icon">⚙️</span>
                            <span>Settings</span>
                        </a>
                        <a href="#" class="sign-out" onclick="event.preventDefault(); AuthHeader.signOut();" role="menuitem">
                            <span class="dropdown-icon">🚪</span>
                            <span>Sign Out</span>
                        </a>
                    </div>
                </div>
            `;
        },
        
        getNavigationPathSafely: function(page) {
            try {
                if (window.FirebaseManager && window.FirebaseManager.getNavigationPath) {
                    return window.FirebaseManager.getNavigationPath(page);
                }
                return `../${page}/`;
            } catch (error) {
                console.warn('⚠️ Navigation path fallback:', error);
                return '#';
            }
        },
        
        syncWithMobileMenuSafely: function(userData) {
            try {
                if (typeof window.MobileMenu !== 'undefined' && 
                    typeof window.MobileMenu.syncWithAuthHeader === 'function') {
                    window.MobileMenu.syncWithAuthHeader(userData);
                }
            } catch (error) {
                console.warn('⚠️ Erreur sync MobileMenu (non critique):', error);
            }
        },

        showNotAuthenticatedState: function() {
            try {
                const desktopAuthButtons = document.getElementById('desktop-auth-buttons');
                if (!desktopAuthButtons) return;
                
                desktopAuthButtons.innerHTML = `
                    <button class="auth-btn login-btn" onclick="AuthHeader.navigateToAuth()">
                        <span>Log In</span>
                    </button>
                `;
            } catch (error) {
                console.error('Error showNotAuthenticatedState:', error);
            }
        },

        showLoadingState: function() {
            try {
                const desktopAuthButtons = document.getElementById('desktop-auth-buttons');
                if (!desktopAuthButtons) return;
                
                AuthHeaderState.isLoading = true;
                AuthHeaderState.hasError = false;
                
                desktopAuthButtons.innerHTML = `
                    <div class="auth-loading">
                        <div class="auth-loading-spinner"></div>
                        <span>Loading...</span>
                    </div>
                `;
            } catch (error) {
                console.error('Error showLoadingState:', error);
                this.showNotAuthenticatedState();
            }
        },

        showErrorState: function(errorType = 'Error') {
            try {
                const desktopAuthButtons = document.getElementById('desktop-auth-buttons');
                if (!desktopAuthButtons) return;
                
                AuthHeaderState.isLoading = false;
                AuthHeaderState.hasError = true;
                
                desktopAuthButtons.innerHTML = `
                    <div class="auth-error" onclick="AuthHeader.retryConnection()" title="Click to retry connection">
                        <span class="auth-error-icon">⚠️</span>
                        <span>Retry</span>
                    </div>
                `;
            } catch (error) {
                console.error('Error showErrorState:', error);
                this.showNotAuthenticatedState();
            }
        },

        retryConnection: function() {
            try {
                AuthHeaderState.hasError = false;
                this.showLoadingState();
                
                window.FirebaseManager.retry().catch(error => {
                    console.error('Error retry:', error);
                    this.showErrorState('Retry failed');
                });
            } catch (error) {
                console.error('Error retryConnection:', error);
                this.showErrorState('Retry failed');
            }
        },

        signOut: async function() {
            try {
                const confirmed = confirm('Are you sure you want to sign out?');
                if (!confirmed) return false;

                this.showLoadingState();
                await window.FirebaseManager.signOut();
                return true;
                
            } catch (error) {
                console.error('Error signOut:', error);
                this.showErrorState('Sign out failed');
                
                if (typeof window.AuthUtils !== 'undefined' && window.AuthUtils.showError) {
                    window.AuthUtils.showError('Error signing out. Please try again.');
                } else {
                    alert('Error signing out. Please try again.');
                }
                
                return false;
            }
        },

        navigateToAuth: function() {
            try {
                window.FirebaseManager.navigateTo('auth');
            } catch (error) {
                console.error('Error navigateToAuth:', error);
                window.location.href = '../auth/';
            }
        },

        setupDropdownAccessibility: function() {
            try {
                const userNameBtn = document.querySelector('.user-name');
                const dropdownMenu = document.querySelector('.dropdown-menu');
                
                if (!userNameBtn || !dropdownMenu) return;
                
                userNameBtn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        userNameBtn.click();
                    }
                });
                
                dropdownMenu.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        userNameBtn.focus();
                    }
                });
            } catch (error) {
                console.warn('Error setupDropdownAccessibility:', error);
            }
        },

        updateAuthState: async function(user, userData) {
            if (user) {
                await this.updateAuthenticatedUISafely(userData || user);
            } else {
                this.showNotAuthenticatedState();
            }
        },

        getCurrentUser: function() {
            return AuthHeaderState.currentUser;
        },

        getCurrentUserData: function() {
            return AuthHeaderState.userData;
        },

        isLoading: function() {
            return AuthHeaderState.isLoading;
        },

        hasError: function() {
            return AuthHeaderState.hasError;
        },
        
        cleanup: function() {
            if (this.authUnsubscribe) {
                this.authUnsubscribe();
                this.authUnsubscribe = null;
            }
        }
    };

    window.updateHeaderAuthState = (user, userData) => window.AuthHeader.updateAuthState(user, userData);
    window.signOutUser = () => window.AuthHeader.signOut();

    function initAuthHeader() {
        try {
            window.AuthHeader.init();
        } catch (error) {
            console.error('Error auto-initializing AuthHeader:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuthHeader);
    } else {
        initAuthHeader();
    }

})();
