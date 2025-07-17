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
        isLoading: false,
        isInitialized: false,
        hasError: false
    };

    window.AuthHeader = {
        
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
                
                window.FirebaseManager.onAuthStateChanged((user, userData) => {
                    AuthHeaderState.currentUser = user;
                    AuthHeaderState.userData = userData;
                    
                    if (user) {
                        this.updateAuthenticatedUI(userData || user);
                    } else {
                        this.showNotAuthenticatedState();
                    }
                    
                    this.syncWithMobileMenu(userData || user);
                    AuthHeaderState.isLoading = false;
                    AuthHeaderState.hasError = false;
                });
                
            } catch (error) {
                console.error('Error setupFirebaseManager:', error);
                this.showErrorState('Connection failed');
            }
        },

        updateAuthenticatedUI: async function(userData) {
            try {
                const desktopAuthButtons = document.getElementById('desktop-auth-buttons');
                if (!desktopAuthButtons) {
                    console.warn('Element desktop-auth-buttons not found');
                    return;
                }
                
                const displayName = window.FirebaseManager.getDisplayName(userData);
                const flag = window.FirebaseManager.getFlagEmoji(userData.profile?.nationality);
                const isProfileComplete = window.FirebaseManager.isProfileComplete(userData);
                
                const profileBadge = !isProfileComplete ? 
                    '<div class="profile-incomplete-badge" title="Complete your profile"></div>' : '';
                
                desktopAuthButtons.innerHTML = `
                    <div class="user-menu">
                        <div class="user-name" tabindex="0" role="button" aria-haspopup="true" aria-expanded="false">
                            <div class="user-info">
                                ${flag ? `<span class="user-flag">${flag}</span>` : ''}
                                <span class="user-display-name">${displayName}</span>
                            </div>
                            <span class="dropdown-arrow">▼</span>
                            ${profileBadge}
                        </div>
                        <div class="dropdown-menu" role="menu">
                            <a href="${window.FirebaseManager.getNavigationPath('profile')}" role="menuitem">
                                <span class="dropdown-icon">👤</span>
                                <span>My Profile</span>
                            </a>
                            <a href="${window.FirebaseManager.getNavigationPath('settings')}" role="menuitem">
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
                
                this.setupDropdownAccessibility();
            } catch (error) {
                console.error('Error updateAuthenticatedUI:', error);
                this.showErrorState('UI update failed');
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
                
                if (typeof window.LoadingManager !== 'undefined') {
                    window.LoadingManager.show(desktopAuthButtons, 'Loading...');
                } else {
                    desktopAuthButtons.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px; padding: 12px 18px; color: #8e8e93;">
                            <div style="width: 16px; height: 16px; border: 2px solid #e5e5ea; border-top: 2px solid #8e8e93; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                            <span>Loading...</span>
                        </div>
                    `;
                }
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

        syncWithMobileMenu: function(userData) {
            try {
                if (typeof window.MobileMenu !== 'undefined' && window.MobileMenu.syncWithAuthHeader) {
                    window.MobileMenu.syncWithAuthHeader(userData);
                }
            } catch (error) {
                console.warn('Error sync MobileMenu:', error);
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
                await this.updateAuthenticatedUI(userData || user);
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