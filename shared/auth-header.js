// ============= SHARED/AUTH-HEADER.JS V2 - THREAD-SAFE AVEC FIREBASE MANAGER V2 =============

(function() {
    'use strict';

    // ============= CSS INJECTION POUR HEADER AUTH =============
    
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
                animation: auth-spin 1s linear infinite;
            }

            @keyframes auth-spin {
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
                animation: auth-pulse 2s infinite;
            }

            @keyframes auth-pulse {
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

    // ============= AUTH HEADER STATE MANAGEMENT =============

    const AuthHeaderState = {
        currentUser: null,
        userData: null,
        firebaseManager: null,
        authState: 'uninitialized',
        isInitialized: false,
        authUnsubscribe: null,
        lastUpdate: null,
        retryCount: 0,
        maxRetries: 3
    };

    // ============= AUTH HEADER MANAGER CLASS =============

    class AuthHeaderManager {
        constructor() {
            this.state = AuthHeaderState;
        }

        // ============= INITIALIZATION THREAD-SAFE =============

        async init() {
            try {
                injectHeaderCSS();
                this.showLoadingState();
                await this.setupFirebaseManagerV2();
                this.state.isInitialized = true;
                console.log('✅ AuthHeader V2 initialized with FirebaseManager V2');
            } catch (error) {
                console.error('❌ Error initializing AuthHeader V2:', error);
                this.showErrorState('Initialization failed');
            }
        }

        // ✅ NOUVEAU PATTERN - Utilise getInstance() thread-safe
        async setupFirebaseManagerV2() {
            try {
                // ✅ Utiliser la nouvelle API thread-safe
                this.state.firebaseManager = await window.FirebaseManager.getInstance();
                
                // ✅ Attendre que Firebase soit prêt avec waitForAuthReady()
                await this.state.firebaseManager.waitForAuthReady();
                
                // ✅ Utiliser la nouvelle API de callbacks
                this.state.authUnsubscribe = this.state.firebaseManager.onAuthStateChanged(
                    async (user, userData, error) => {
                        await this.handleAuthStateChangeSafely(user, userData, error);
                    }
                );
                
                console.log('✅ Firebase Manager V2 setup completed');
                
            } catch (error) {
                console.error('❌ Error setupFirebaseManagerV2:', error);
                await this.handleRetryLogic(error);
            }
        }

        // ✅ NOUVEAU PATTERN - Thread-safe avec operation queue
        async handleAuthStateChangeSafely(user, userData, error) {
            try {
                // ✅ Utiliser operationQueue.enqueue() au lieu de updateInProgress
                return this.state.firebaseManager.operationQueue.enqueue(async () => {
                    this.state.lastUpdate = Date.now();
                    
                    if (error) {
                        console.error('❌ Auth state error:', error);
                        this.showErrorState('Authentication error');
                        return;
                    }
                    
                    if (user) {
                        // ✅ Utiliser getUserData() avec options au lieu d'accès direct
                        const validatedData = await this.state.firebaseManager.getUserData(user, {
                            useCache: false,
                            validatePermissions: false,
                            includeProfile: true,
                            includeStats: false
                        });
                        
                        await this.updateAuthenticatedUISafely(validatedData);
                    } else {
                        this.showNotAuthenticatedState();
                    }
                    
                    // ✅ Synchronisation thread-safe avec MobileMenu
                    this.syncWithMobileMenuSafely(userData || user);
                    
                    this.state.authState = 'ready';
                    this.state.retryCount = 0; // Reset retry count on success
                });
                
            } catch (error) {
                console.error('❌ Error handleAuthStateChangeSafely:', error);
                this.showErrorState('UI update failed');
                await this.handleRetryLogic(error);
            }
        }

        // ✅ NOUVEAU PATTERN - Thread-safe UI update
        async updateAuthenticatedUISafely(userData) {
            try {
                const desktopAuthButtons = document.getElementById('desktop-auth-buttons');
                if (!desktopAuthButtons) {
                    console.warn('⚠️ Element desktop-auth-buttons not found');
                    return;
                }
                
                // ✅ Utiliser les méthodes thread-safe du FirebaseManager
                const displayName = this.state.firebaseManager.getDisplayName(userData);
                const flag = this.state.firebaseManager.getFlagEmoji(userData.profile?.nationality);
                const isProfileComplete = this.state.firebaseManager.isProfileComplete(userData);
                
                const profileBadge = !isProfileComplete ? 
                    '<div class="profile-incomplete-badge" title="Complete your profile"></div>' : '';
                
                const template = this.createAuthUITemplate(displayName, flag, profileBadge);
                desktopAuthButtons.innerHTML = template;
                
                this.setupDropdownAccessibility();
                
                // ✅ Mise à jour des state variables thread-safe
                this.state.currentUser = userData;
                this.state.userData = userData;
                
                console.log('✅ Auth UI updated successfully');
                
            } catch (error) {
                console.error('❌ Error updateAuthenticatedUISafely:', error);
                this.showNotAuthenticatedState();
            }
        }

        // ============= UI TEMPLATE CREATION =============

        createAuthUITemplate(displayName, flag, profileBadge) {
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
                        <a href="#" class="sign-out" onclick="event.preventDefault(); window.AuthHeader.signOut();" role="menuitem">
                            <span class="dropdown-icon">🚪</span>
                            <span>Sign Out</span>
                        </a>
                    </div>
                </div>
            `;
        }

        // ============= STATE MANAGEMENT =============

        showNotAuthenticatedState() {
            try {
                const desktopAuthButtons = document.getElementById('desktop-auth-buttons');
                if (!desktopAuthButtons) return;
                
                desktopAuthButtons.innerHTML = `
                    <button class="auth-btn login-btn" onclick="window.AuthHeader.navigateToAuth()">
                        <span>Log In</span>
                    </button>
                `;
                
                this.state.currentUser = null;
                this.state.userData = null;
                
            } catch (error) {
                console.error('❌ Error showNotAuthenticatedState:', error);
            }
        }

        showLoadingState() {
            try {
                const desktopAuthButtons = document.getElementById('desktop-auth-buttons');
                if (!desktopAuthButtons) return;
                
                this.state.authState = 'loading';
                
                desktopAuthButtons.innerHTML = `
                    <div class="auth-loading">
                        <div class="auth-loading-spinner"></div>
                        <span>Loading...</span>
                    </div>
                `;
            } catch (error) {
                console.error('❌ Error showLoadingState:', error);
                this.showNotAuthenticatedState();
            }
        }

        showErrorState(errorType = 'Error') {
            try {
                const desktopAuthButtons = document.getElementById('desktop-auth-buttons');
                if (!desktopAuthButtons) return;
                
                this.state.authState = 'error';
                
                desktopAuthButtons.innerHTML = `
                    <div class="auth-error" onclick="window.AuthHeader.retryConnection()" title="Click to retry connection">
                        <span class="auth-error-icon">⚠️</span>
                        <span>Retry</span>
                    </div>
                `;
            } catch (error) {
                console.error('❌ Error showErrorState:', error);
                this.showNotAuthenticatedState();
            }
        }

        // ============= RETRY LOGIC =============

        async handleRetryLogic(error) {
            if (this.state.retryCount < this.state.maxRetries) {
                this.state.retryCount++;
                const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000); // Exponential backoff
                
                console.log(`🔄 Retrying AuthHeader operation (${this.state.retryCount}/${this.state.maxRetries}) in ${delay}ms`);
                
                setTimeout(async () => {
                    try {
                        await this.setupFirebaseManagerV2();
                    } catch (retryError) {
                        console.error('❌ Retry failed:', retryError);
                        if (this.state.retryCount >= this.state.maxRetries) {
                            this.showErrorState('Max retries reached');
                        }
                    }
                }, delay);
            } else {
                console.error('❌ Max retries reached for AuthHeader');
                this.showErrorState('Connection failed');
            }
        }

        async retryConnection() {
            try {
                this.state.retryCount = 0;
                this.showLoadingState();
                
                // ✅ Utiliser la nouvelle méthode retry() du FirebaseManager
                await this.state.firebaseManager.retry();
                
            } catch (error) {
                console.error('❌ Error retryConnection:', error);
                this.showErrorState('Retry failed');
            }
        }

        // ============= USER ACTIONS =============

        async signOut() {
            try {
                const confirmed = confirm('Are you sure you want to sign out?');
                if (!confirmed) return false;

                this.showLoadingState();
                
                // ✅ Utiliser la méthode thread-safe du FirebaseManager
                await this.state.firebaseManager.signOut();
                
                return true;
                
            } catch (error) {
                console.error('❌ Error signOut:', error);
                this.showErrorState('Sign out failed');
                
                if (typeof window.AuthUtils !== 'undefined' && window.AuthUtils.showError) {
                    window.AuthUtils.showError('Error signing out. Please try again.');
                } else {
                    alert('Error signing out. Please try again.');
                }
                
                return false;
            }
        }

        navigateToAuth() {
            try {
                // ✅ Utiliser la méthode thread-safe du FirebaseManager
                this.state.firebaseManager.navigateTo('auth');
            } catch (error) {
                console.error('❌ Error navigateToAuth:', error);
                window.location.href = '../auth/';
            }
        }

        // ============= UTILITY METHODS =============

        getNavigationPathSafely(page) {
            try {
                // ✅ Utiliser la méthode thread-safe du FirebaseManager
                return this.state.firebaseManager.getNavigationPath(page);
            } catch (error) {
                console.warn('⚠️ Navigation path fallback:', error);
                return '#';
            }
        }

        syncWithMobileMenuSafely(userData) {
            try {
                if (typeof window.MobileMenu !== 'undefined' && 
                    typeof window.MobileMenu.syncWithAuthHeader === 'function') {
                    window.MobileMenu.syncWithAuthHeader(userData);
                }
            } catch (error) {
                console.warn('⚠️ MobileMenu sync error (non-critical):', error);
            }
        }

        setupDropdownAccessibility() {
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
                console.warn('⚠️ Error setupDropdownAccessibility:', error);
            }
        }

        // ============= PUBLIC API =============

        async updateAuthState(user, userData) {
            try {
                if (user) {
                    await this.updateAuthenticatedUISafely(userData || user);
                } else {
                    this.showNotAuthenticatedState();
                }
            } catch (error) {
                console.error('❌ Error updateAuthState:', error);
            }
        }

        getCurrentUser() {
            return this.state.currentUser;
        }

        getCurrentUserData() {
            return this.state.userData;
        }

        isLoading() {
            return this.state.authState === 'loading';
        }

        hasError() {
            return this.state.authState === 'error';
        }

        getState() {
            return {
                authState: this.state.authState,
                isInitialized: this.state.isInitialized,
                currentUser: !!this.state.currentUser,
                lastUpdate: this.state.lastUpdate,
                retryCount: this.state.retryCount
            };
        }

        // ============= CLEANUP =============

        cleanup() {
            try {
                if (this.state.authUnsubscribe) {
                    this.state.authUnsubscribe();
                    this.state.authUnsubscribe = null;
                }
                
                this.state.currentUser = null;
                this.state.userData = null;
                this.state.isInitialized = false;
                
                console.log('🧹 AuthHeader cleanup completed');
            } catch (error) {
                console.error('❌ Error during AuthHeader cleanup:', error);
            }
        }
    }

    // ============= GLOBAL EXPOSE =============

    // Créer l'instance globale
    const authHeaderManager = new AuthHeaderManager();

    window.AuthHeader = {
        // API publique unifiée
        init: () => authHeaderManager.init(),
        updateAuthState: (user, userData) => authHeaderManager.updateAuthState(user, userData),
        signOut: () => authHeaderManager.signOut(),
        navigateToAuth: () => authHeaderManager.navigateToAuth(),
        retryConnection: () => authHeaderManager.retryConnection(),
        getCurrentUser: () => authHeaderManager.getCurrentUser(),
        getCurrentUserData: () => authHeaderManager.getCurrentUserData(),
        isLoading: () => authHeaderManager.isLoading(),
        hasError: () => authHeaderManager.hasError(),
        getState: () => authHeaderManager.getState(),
        cleanup: () => authHeaderManager.cleanup()
    };

    // Aliases pour compatibilité
    window.updateHeaderAuthState = (user, userData) => window.AuthHeader.updateAuthState(user, userData);
    window.signOutUser = () => window.AuthHeader.signOut();

    // ============= AUTO-INITIALIZATION =============

    function initAuthHeader() {
        try {
            window.AuthHeader.init();
        } catch (error) {
            console.error('❌ Error auto-initializing AuthHeader V2:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuthHeader);
    } else {
        initAuthHeader();
    }

    console.log('✅ AuthHeader V2 module loaded - Thread-safe with FirebaseManager V2');

})();
