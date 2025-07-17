(function() {
    'use strict';

    function injectMobileMenuCSS() {
        if (document.getElementById('mobile-menu-styles')) return;

        const style = document.createElement('style');
        style.id = 'mobile-menu-styles';
        style.textContent = `
            .mobile-hamburger {
                display: none;
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 2000;
                width: 44px;
                height: 44px;
                background: rgba(255, 255, 255, 0.95);
                border: 2px solid rgba(0, 0, 0, 0.1);
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(20px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 3px;
            }

            .mobile-hamburger:hover {
                background: rgba(255, 255, 255, 1);
                border-color: rgba(0, 122, 255, 0.3);
                transform: scale(1.05);
                box-shadow: 0 6px 25px rgba(0, 122, 255, 0.2);
            }

            .mobile-hamburger:active {
                transform: scale(0.95);
            }

            .hamburger-line {
                width: 20px;
                height: 2px;
                background: #1c1c1e;
                border-radius: 1px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                transform-origin: center;
            }

            .mobile-hamburger.active .hamburger-line:nth-child(1) {
                transform: rotate(45deg) translate(3px, 3px);
            }

            .mobile-hamburger.active .hamburger-line:nth-child(2) {
                opacity: 0;
                transform: scale(0);
            }

            .mobile-hamburger.active .hamburger-line:nth-child(3) {
                transform: rotate(-45deg) translate(3px, -3px);
            }

            .mobile-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1500;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(4px);
            }

            .mobile-overlay.show {
                opacity: 1;
                visibility: visible;
            }

            .mobile-menu {
                position: fixed;
                top: 0;
                right: 0;
                width: 320px;
                max-width: 85vw;
                height: 100%;
                background: rgba(255, 255, 255, 0.98);
                backdrop-filter: blur(40px);
                border-left: 1px solid rgba(229, 229, 234, 0.3);
                z-index: 1600;
                transform: translateX(100%);
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                overflow-y: auto;
                box-shadow: -10px 0 50px rgba(0, 0, 0, 0.1);
            }

            .mobile-menu.show {
                transform: translateX(0);
            }

            .mobile-menu-header {
                padding: 24px 20px;
                border-bottom: 1px solid rgba(229, 229, 234, 0.3);
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                position: relative;
            }

            .mobile-menu-logo {
                font-size: 24px;
                font-weight: 800;
                color: #1c1c1e;
                text-align: center;
                margin-bottom: 8px;
                letter-spacing: -0.5px;
            }

            .mobile-menu-subtitle {
                font-size: 14px;
                color: #8e8e93;
                text-align: center;
                font-weight: 500;
            }

            .mobile-close {
                position: absolute;
                top: 20px;
                right: 20px;
                width: 32px;
                height: 32px;
                background: none;
                border: none;
                cursor: pointer;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                color: #8e8e93;
                font-size: 20px;
            }

            .mobile-close:hover {
                background: rgba(142, 142, 147, 0.1);
                color: #1c1c1e;
            }

            .mobile-menu-content {
                padding: 20px 0;
            }

            .mobile-section {
                margin-bottom: 32px;
            }

            .mobile-section-title {
                font-size: 12px;
                font-weight: 700;
                color: #8e8e93;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 0 20px 12px 20px;
                margin-bottom: 8px;
            }

            .mobile-nav-item {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px 20px;
                color: #1c1c1e;
                text-decoration: none;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.2s ease;
                border: none;
                background: none;
                width: 100%;
                text-align: left;
                cursor: pointer;
                border-radius: 0;
            }

            .mobile-nav-item:hover {
                background: rgba(0, 122, 255, 0.08);
                color: #007aff;
            }

            .mobile-nav-item:active {
                background: rgba(0, 122, 255, 0.15);
                transform: scale(0.98);
            }

            .mobile-nav-item .nav-icon {
                font-size: 20px;
                width: 24px;
                text-align: center;
                flex-shrink: 0;
            }

            .mobile-nav-item.logout {
                color: #ff3b30;
                border-top: 1px solid rgba(229, 229, 234, 0.5);
                margin-top: 16px;
                padding-top: 20px;
            }

            .mobile-nav-item.logout:hover {
                background: rgba(255, 59, 48, 0.08);
                color: #ff3b30;
            }

            .mobile-user-profile {
                padding: 20px;
                background: linear-gradient(135deg, rgba(0, 122, 255, 0.05), rgba(102, 126, 234, 0.05));
                border-bottom: 1px solid rgba(229, 229, 234, 0.3);
                margin-bottom: 20px;
            }

            .mobile-user-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: white;
                font-weight: 700;
                margin-bottom: 12px;
                border: 3px solid rgba(255, 255, 255, 0.3);
            }

            .mobile-user-name {
                font-size: 18px;
                font-weight: 700;
                color: #1c1c1e;
                margin-bottom: 4px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .mobile-user-level {
                font-size: 12px;
                font-weight: 600;
                padding: 4px 8px;
                border-radius: 10px;
                color: white;
                display: inline-block;
            }

            @media (max-width: 768px) {
                .mobile-hamburger {
                    display: flex;
                }

                .header {
                    display: none !important;
                }
            }

            @media (max-width: 480px) {
                .mobile-menu {
                    width: 100%;
                    max-width: 100%;
                }

                .mobile-hamburger {
                    top: 16px;
                    right: 16px;
                }
            }

            .mobile-nav-item {
                transform: translateX(20px);
                opacity: 0;
                animation: slideInRight 0.3s ease-out forwards;
            }

            .mobile-menu.show .mobile-nav-item:nth-child(1) { animation-delay: 0.1s; }
            .mobile-menu.show .mobile-nav-item:nth-child(2) { animation-delay: 0.15s; }
            .mobile-menu.show .mobile-nav-item:nth-child(3) { animation-delay: 0.2s; }
            .mobile-menu.show .mobile-nav-item:nth-child(4) { animation-delay: 0.25s; }
            .mobile-menu.show .mobile-nav-item:nth-child(5) { animation-delay: 0.3s; }
            .mobile-menu.show .mobile-nav-item:nth-child(6) { animation-delay: 0.35s; }

            @keyframes slideInRight {
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            .mobile-toast {
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: #007aff;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 3000;
                font-weight: 600;
                font-size: 14px;
                max-width: 300px;
                text-align: center;
                box-shadow: 0 4px 20px rgba(0, 122, 255, 0.3);
            }

            .mobile-toast-error {
                background: #ff3b30;
                box-shadow: 0 4px 20px rgba(255, 59, 48, 0.3);
            }

            .mobile-toast-success {
                background: #28a745;
                box-shadow: 0 4px 20px rgba(40, 167, 69, 0.3);
            }

            @keyframes slideDown {
                from {
                    transform: translateX(-50%) translateY(-20px);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }

            @keyframes slideUp {
                from {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(-50%) translateY(-20px);
                    opacity: 0;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    function injectMobileMenuHTML() {
        if (document.getElementById('mobile-menu')) return;

        const menuHTML = `
            <button class="mobile-hamburger" id="mobile-hamburger" aria-label="Open menu">
                <div class="hamburger-line"></div>
                <div class="hamburger-line"></div>
                <div class="hamburger-line"></div>
            </button>

            <div class="mobile-overlay" id="mobile-overlay"></div>

            <div class="mobile-menu" id="mobile-menu">
                <div class="mobile-menu-header">
                    <div class="mobile-menu-logo">Suirodoku.com</div>
                    <div class="mobile-menu-subtitle">Mobile Menu</div>
                    <button class="mobile-close" id="mobile-close" aria-label="Close menu">×</button>
                </div>

                <div class="mobile-menu-content">
                    <div class="mobile-user-profile" id="mobile-user-profile" style="display: none;">
                        <div class="mobile-user-avatar" id="mobile-user-avatar">?</div>
                        <div class="mobile-user-name" id="mobile-user-name">
                            <span id="mobile-display-name">User</span>
                            <span class="user-flag" id="mobile-user-flag"></span>
                        </div>
                        <div class="mobile-user-level" id="mobile-user-level">Beginner</div>
                    </div>

                    <div class="mobile-section">
                        <div class="mobile-section-title">Navigation</div>
                        <button class="mobile-nav-item" onclick="MobileMenu.navigateAndClose('home')">
                            <span class="nav-icon">🏠</span>
                            <span>Home</span>
                        </button>
                        <button class="mobile-nav-item" onclick="MobileMenu.navigateAndClose('tutorial')">
                            <span class="nav-icon">📚</span>
                            <span>How to Play</span>
                        </button>
                        <button class="mobile-nav-item" onclick="MobileMenu.navigateAndClose('leaderboard')">
                            <span class="nav-icon">🏆</span>
                            <span>Leaderboards</span>
                        </button>
                    </div>

                    <div class="mobile-section" id="mobile-auth-section">
                    </div>

                    <div class="mobile-section" id="mobile-game-section" style="display: none;">
                        <div class="mobile-section-title">Game</div>
                        <button class="mobile-nav-item" onclick="MobileMenu.close(); document.getElementById('new-game-btn')?.click();">
                            <span class="nav-icon">🎮</span>
                            <span>New Game</span>
                        </button>
                        <button class="mobile-nav-item" onclick="MobileMenu.close(); document.getElementById('hint-btn')?.click();">
                            <span class="nav-icon">💡</span>
                            <span>Get Hint</span>
                        </button>
                    </div>

                    <div class="mobile-section">
                        <div class="mobile-section-title">Legal</div>
                        <button class="mobile-nav-item" onclick="MobileMenu.navigateAndClose('legal')">
                            <span class="nav-icon">📄</span>
                            <span>Privacy & Terms</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('afterbegin', menuHTML);
    }

    window.MobileMenu = {
        
        isOpen: false,
        currentUser: null,
        
        init: function() {
            try {
                injectMobileMenuCSS();
                injectMobileMenuHTML();
                
                this.setupEventListeners();
                
                this.updateAuthSection(false);
                this.updateGameSection();
                
                console.log('✅ Menu mobile initialisé avec styles uniformes');
                
            } catch (error) {
                console.error('❌ Erreur initialisation menu mobile:', error);
            }
        },

        open: function() {
            try {
                const overlay = document.getElementById('mobile-overlay');
                const menu = document.getElementById('mobile-menu');
                const hamburger = document.getElementById('mobile-hamburger');
                
                if (overlay) overlay.classList.add('show');
                if (menu) menu.classList.add('show');
                if (hamburger) hamburger.classList.add('active');
                
                document.body.style.overflow = 'hidden';
                this.isOpen = true;
                
                console.log('📱 Menu mobile ouvert');
                
            } catch (error) {
                console.error('❌ Erreur ouverture menu:', error);
            }
        },

        close: function() {
            try {
                const overlay = document.getElementById('mobile-overlay');
                const menu = document.getElementById('mobile-menu');
                const hamburger = document.getElementById('mobile-hamburger');
                
                if (overlay) overlay.classList.remove('show');
                if (menu) menu.classList.remove('show');
                if (hamburger) hamburger.classList.remove('active');
                
                document.body.style.overflow = '';
                this.isOpen = false;
                
                console.log('📱 Menu mobile fermé');
                
            } catch (error) {
                console.error('❌ Erreur fermeture menu:', error);
            }
        },

        toggle: function() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        },

        navigateAndClose: function(page) {
            try {
                this.close();
                
                if (typeof window.FirebaseManager !== 'undefined' && window.FirebaseManager.navigateTo) {
                    window.FirebaseManager.navigateTo(page);
                } else if (typeof window.navigateTo === 'function') {
                    window.navigateTo(page);
                } else {
                    console.warn('⚠️ Fonction de navigation non disponible');
                    const fallbackRoutes = {
                        'home': window.location.pathname.includes('/') ? '../' : './',
                        'auth': './auth/',
                        'profile': './profile/',
                        'settings': './settings/',
                        'tutorial': './tutorial/',
                        'leaderboard': './leaderboard/',
                        'legal': './legal/'
                    };
                    
                    window.location.href = fallbackRoutes[page] || './';
                }
                
            } catch (error) {
                console.error('❌ Erreur navigation:', error);
                this.showNotification('Navigation error', 'error');
            }
        },

        syncWithAuthHeader: function(userData) {
            try {
                if (!userData) {
                    this.updateAuthSection(false);
                    this.hideUserProfile();
                    return;
                }
                
                const displayName = window.FirebaseManager ? 
                    window.FirebaseManager.getDisplayName(userData) : 
                    (userData.displayName || userData.email?.split('@')[0] || 'User');
                
                const isProfileComplete = window.FirebaseManager ? 
                    window.FirebaseManager.isProfileComplete(userData) : true;
                
                this.updateUserProfile(userData, displayName, isProfileComplete);
                this.updateAuthSection(true);
                
                console.log('📱 Menu mobile synchronisé avec auth header');
                
            } catch (error) {
                console.error('❌ Erreur sync mobile menu:', error);
            }
        },

        updateUserProfile: function(userData, displayName, isProfileComplete) {
            try {
                const profileSection = document.getElementById('mobile-user-profile');
                const avatar = document.getElementById('mobile-user-avatar');
                const nameElement = document.getElementById('mobile-display-name');
                const flagElement = document.getElementById('mobile-user-flag');
                const levelElement = document.getElementById('mobile-user-level');
                
                if (!profileSection || !avatar || !nameElement) return;
                
                profileSection.style.display = 'block';
                
                avatar.textContent = displayName.charAt(0).toUpperCase();
                nameElement.textContent = displayName;
                
                if (userData.profile?.nationality && window.FirebaseManager) {
                    const flag = window.FirebaseManager.getFlagEmoji(userData.profile.nationality);
                    flagElement.textContent = flag;
                    flagElement.style.display = 'inline';
                } else {
                    flagElement.style.display = 'none';
                }
                
                const level = userData.gameStats?.level || 'Beginner';
                levelElement.textContent = level;
                
                const levelColors = {
                    'Beginner': '#8e8e93',
                    'Novice': '#34c759',
                    'Intermediate': '#007aff',
                    'Advanced': '#af52de',
                    'Expert': '#ff9500',
                    'Master': '#ff3b30',
                    'Legend': '#ffd700'
                };
                
                levelElement.style.background = levelColors[level] || levelColors['Beginner'];
                
            } catch (error) {
                console.error('❌ Erreur updateUserProfile:', error);
            }
        },

        hideUserProfile: function() {
            try {
                const profileSection = document.getElementById('mobile-user-profile');
                if (profileSection) {
                    profileSection.style.display = 'none';
                }
            } catch (error) {
                console.error('❌ Erreur hideUserProfile:', error);
            }
        },

        updateAuthSection: function(isLoggedIn) {
            try {
                const authSection = document.getElementById('mobile-auth-section');
                if (!authSection) return;
                
                if (isLoggedIn) {
                    authSection.innerHTML = `
                        <div class="mobile-section-title">Account</div>
                        <button class="mobile-nav-item" onclick="MobileMenu.navigateAndClose('profile')">
                            <span class="nav-icon">👤</span>
                            <span>My Profile</span>
                        </button>
                        <button class="mobile-nav-item" onclick="MobileMenu.navigateAndClose('settings')">
                            <span class="nav-icon">⚙️</span>
                            <span>Settings</span>
                        </button>
                        <button class="mobile-nav-item logout" onclick="MobileMenu.signOut()">
                            <span class="nav-icon">🚪</span>
                            <span>Sign Out</span>
                        </button>
                    `;
                } else {
                    authSection.innerHTML = `
                        <div class="mobile-section-title">Account</div>
                        <button class="mobile-nav-item" onclick="MobileMenu.navigateAndClose('auth')">
                            <span class="nav-icon">🔑</span>
                            <span>Sign In</span>
                        </button>
                    `;
                }
                
            } catch (error) {
                console.error('❌ Erreur updateAuthSection:', error);
            }
        },

        updateGameSection: function() {
            try {
                const gameSection = document.getElementById('mobile-game-section');
                if (!gameSection) return;
                
                const isHomePage = window.location.pathname === '/' || 
                                 window.location.pathname.includes('index.html') ||
                                 window.location.pathname.endsWith('/');
                
                gameSection.style.display = isHomePage ? 'block' : 'none';
                
            } catch (error) {
                console.error('❌ Erreur updateGameSection:', error);
            }
        },

        signOut: async function() {
            try {
                const confirmed = confirm('Are you sure you want to sign out?');
                if (!confirmed) return;
                
                this.close();
                
                if (window.FirebaseManager && window.FirebaseManager.signOut) {
                    await window.FirebaseManager.signOut();
                } else if (window.AuthHeader && window.AuthHeader.signOut) {
                    await window.AuthHeader.signOut();
                } else {
                    console.warn('⚠️ Méthode de déconnexion non disponible');
                    this.showNotification('Sign out not available', 'error');
                }
                
            } catch (error) {
                console.error('❌ Erreur signOut:', error);
                this.showNotification('Error signing out', 'error');
            }
        },

        setupEventListeners: function() {
            try {
                const hamburger = document.getElementById('mobile-hamburger');
                const overlay = document.getElementById('mobile-overlay');
                const closeBtn = document.getElementById('mobile-close');
                
                if (hamburger) {
                    hamburger.addEventListener('click', () => this.toggle());
                }
                
                if (overlay) {
                    overlay.addEventListener('click', () => this.close());
                }
                
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.close());
                }
                
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && this.isOpen) {
                        this.close();
                    }
                });
                
            } catch (error) {
                console.error('❌ Erreur setupEventListeners:', error);
            }
        },

        showNotification: function(message, type = 'info') {
            try {
                const toast = document.createElement('div');
                toast.className = `mobile-toast ${type === 'error' ? 'mobile-toast-error' : 
                                                type === 'success' ? 'mobile-toast-success' : ''}`;
                toast.textContent = message;
                
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    toast.style.animation = 'slideUp 0.3s ease-out forwards';
                    setTimeout(() => toast.remove(), 300);
                }, 3000);
                
            } catch (error) {
                console.error('❌ Erreur showNotification:', error);
            }
        }
    };

    function initMobileMenu() {
        try {
            window.MobileMenu.init();
        } catch (error) {
            console.error('❌ Erreur auto-initialisation MobileMenu:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileMenu);
    } else {
        initMobileMenu();
    }

})();