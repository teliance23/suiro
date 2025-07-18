(function() {
    'use strict';

    class LRUCache {
        constructor(maxSize = 50) {
            this.maxSize = maxSize;
            this.cache = new Map();
        }
        
        get(key) {
            if (this.cache.has(key)) {
                const value = this.cache.get(key);
                this.cache.delete(key);
                this.cache.set(key, value);
                return value;
            }
            return null;
        }
        
        set(key, value) {
            if (this.cache.has(key)) {
                this.cache.delete(key);
            } else if (this.cache.size >= this.maxSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            this.cache.set(key, value);
        }
        
        delete(key) {
            return this.cache.delete(key);
        }
        
        clear() {
            this.cache.clear();
        }
        
        get size() {
            return this.cache.size;
        }
    }

    window.LoadingManager = {
        show: function(container, message = 'Loading...') {
            if (!container) return;
            
            const html = `
                <div class="universal-loading" style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 200px;
                    flex-direction: column;
                    gap: 16px;
                ">
                    <div class="loading-spinner" style="
                        width: 40px;
                        height: 40px;
                        border: 4px solid #e5e5ea;
                        border-top: 4px solid #007aff;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    "></div>
                    <div class="loading-text" style="
                        color: #8e8e93;
                        font-size: 16px;
                        font-weight: 500;
                    ">${message}</div>
                </div>
            `;
            container.innerHTML = html;
        },
        
        hide: function(container) {
            if (!container) return;
            const loading = container.querySelector('.universal-loading');
            if (loading) loading.remove();
        }
    };

    if (!document.getElementById('universal-loading-styles')) {
        const style = document.createElement('style');
        style.id = 'universal-loading-styles';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    class FirebaseManager {
        static instance = null;
        static initLock = null;
        static isInitializing = false;

        static async getInstance() {
            if (FirebaseManager.instance) {
                return FirebaseManager.instance;
            }
            
            if (FirebaseManager.initLock) {
                return FirebaseManager.initLock;
            }
            
            if (FirebaseManager.isInitializing) {
                return new Promise((resolve) => {
                    const checkReady = () => {
                        if (FirebaseManager.instance) {
                            resolve(FirebaseManager.instance);
                        } else {
                            setTimeout(checkReady, 50);
                        }
                    };
                    checkReady();
                });
            }
            
            FirebaseManager.isInitializing = true;
            FirebaseManager.initLock = new FirebaseManager()._performInitialization();
            
            try {
                const instance = await FirebaseManager.initLock;
                FirebaseManager.instance = instance;
                return instance;
            } finally {
                FirebaseManager.initLock = null;
                FirebaseManager.isInitializing = false;
            }
        }

        constructor() {
            this.authState = 'initializing';
            this.authMutex = false;
            this.userDataLoadingPromise = null;
            this.authUnsubscribe = null;
            
            this.initialized = false;
            this.initPromise = null;
            this.isLoading = false;
            this.hasError = false;
            this.retryCount = 0;
            
            this.config = {
                timeout: 8000,
                maxRetries: 3,
                retryDelay: 1000,
                enableDebug: false
            };
            
            this.firebaseAuth = null;
            this.app = null;
            this.auth = null;
            this.db = null;
            this.storage = null;
            
            this.currentUser = null;
            this.userData = null;
            this.authCallbacks = [];
            
            this.userDataCache = new LRUCache(50);
            this.cacheTimeout = 5 * 60 * 1000;
            
            this.callbackDebounce = null;
            this.lastAuthUpdate = null;
        }

        async initialize() {
            return FirebaseManager.getInstance();
        }

        async _performInitialization() {
            this.isLoading = true;
            this.hasError = false;
            
            try {
                const firebaseConfig = {
                    apiKey: "AIzaSyD-0wrtBrV-RyZVtjz6cZgumvsoRIJ07b",
                    authDomain: "suirodoku-web.firebaseapp.com",
                    projectId: "suirodoku-web",
                    storageBucket: "suirodoku-web.firebasestorage.app",
                    messagingSenderId: "936879624195",
                    appId: "1:936879624195:web:e3d2682df7c9b213d87e36",
                    measurementId: "G-RPJXTCGLZN"
                };
                
                const importPromises = [
                    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js'),
                    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'),
                    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'),
                    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js')
                ];
                
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase timeout')), this.config.timeout)
                );
                
                const [
                    { initializeApp },
                    { getAuth, onAuthStateChanged, signOut, updateProfile,
                      createUserWithEmailAndPassword, signInWithEmailAndPassword,
                      signInWithPopup, signInWithRedirect, getRedirectResult,
                      GoogleAuthProvider, FacebookAuthProvider,
                      sendPasswordResetEmail },
                    { getFirestore, doc, getDoc, setDoc, updateDoc,
                      collection, getDocs, query, orderBy, limit, where, startAfter },
                    { getStorage, ref, uploadBytes, getDownloadURL }
                ] = await Promise.race([Promise.all(importPromises), timeoutPromise]);

                this.app = initializeApp(firebaseConfig);
                this.auth = getAuth(this.app);
                this.db = getFirestore(this.app);
                this.storage = getStorage(this.app);

                try {
                    if (this.db._delegate?.settings) {
                        this.db._delegate.settings({
                            experimentalForceLongPolling: false,
                            experimentalAutoDetectLongPolling: false,
                            ssl: true,
                            cacheSizeBytes: 10485760,
                        });
                    }
                } catch (error) {
                    console.warn('⚠️ Settings Firestore non appliqués (pas critique):', error.code);
                }

                let googleProvider = null;
                let facebookProvider = null;
                
                try {
                    googleProvider = new GoogleAuthProvider();
                    googleProvider.addScope('email');
                    googleProvider.addScope('profile');
                    googleProvider.setCustomParameters({ 
                        prompt: 'select_account',
                        redirect_uri: window.location.origin + window.location.pathname
                    });
                } catch (error) {
                    console.warn('⚠️ Erreur configuration Google Provider:', error);
                }
                
                try {
                    facebookProvider = new FacebookAuthProvider();
                    facebookProvider.addScope('public_profile');
                    facebookProvider.addScope('email');
                    facebookProvider.setCustomParameters({ 
                        display: 'page',
                        auth_type: 'rerequest'
                    });
                } catch (error) {
                    console.warn('⚠️ Erreur configuration Facebook Provider:', error);
                }

                this.firebaseAuth = {
                    app: this.app,
                    auth: this.auth,
                    db: this.db,
                    storage: this.storage,
                    onAuthStateChanged,
                    signOut,
                    updateProfile,
                    createUserWithEmailAndPassword,
                    signInWithEmailAndPassword,
                    signInWithPopup,
                    signInWithRedirect,        
                    getRedirectResult,         
                    sendPasswordResetEmail,
                    googleProvider,
                    facebookProvider,
                    doc,
                    getDoc,
                    setDoc,
                    updateDoc,
                    collection,
                    getDocs,
                    query,
                    orderBy,
                    limit,
                    where,
                    startAfter,
                    ref,
                    uploadBytes,
                    getDownloadURL
                };

                await this._setupAuthStateListener();
                
                window.firebaseAuth = this.firebaseAuth;
                
                this.initialized = true;
                this.isLoading = false;
                this.retryCount = 0;
                
                return this;
                
            } catch (error) {
                console.error('❌ Erreur Firebase Manager:', error);
                
                this.isLoading = false;
                this.hasError = true;
                
                if (this.retryCount < this.config.maxRetries) {
                    this.retryCount++;
                    
                    await this._delay(this.config.retryDelay * this.retryCount);
                    return this._performInitialization();
                }
                
                console.error('🚫 Firebase Manager - Tous les retries échoués');
                return null;
            }
        }

        async _setupAuthStateListener() {
            const { onAuthStateChanged } = this.firebaseAuth;
            
            await this._waitForAuthReady();
            await this._checkRedirectResultSafely();
            
            onAuthStateChanged(this.auth, async (user) => {
                await this._handleAuthStateChangeSafely(user);
            });
        }

        async _waitForAuthReady() {
            return new Promise((resolve) => {
                const checkReady = () => {
                    if (this.auth && this.auth.currentUser !== undefined) {
                        resolve();
                    } else {
                        setTimeout(checkReady, 50);
                    }
                };
                checkReady();
            });
        }

        async _handleAuthStateChangeSafely(user) {
            if (this.authMutex) {
                return;
            }
            
            this.authMutex = true;
            
            try {
                if (this.lastAuthUpdate && Date.now() - this.lastAuthUpdate < 100) {
                    return;
                }
                
                this.lastAuthUpdate = Date.now();
                this.currentUser = user;
                
                if (user) {
                    this.userData = await this._loadUserDataSafely(user);
                } else {
                    this.userData = null;
                    this._clearUserCache();
                }
                
                this.authState = 'ready';
                
                await this._notifyAuthCallbacksSafely(user, this.userData);
                
            } catch (error) {
                console.error('❌ Erreur auth state change:', error);
                this.authState = 'error';
                
                await this._notifyAuthCallbacksSafely(user, null, error);
                
            } finally {
                this.authMutex = false;
            }
        }

        async _loadUserDataSafely(user, retryCount = 0) {
            const maxRetries = 3;
            
            try {
                if (this.userDataLoadingPromise && this.currentUser?.uid === user.uid) {
                    return await this.userDataLoadingPromise;
                }
                
                this.userDataLoadingPromise = Promise.race([
                    this._getUserDataWithCache(user),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('User data timeout')), 10000)
                    )
                ]);
                
                const userData = await this.userDataLoadingPromise;
                this.userDataLoadingPromise = null;
                
                return userData;
                
            } catch (error) {
                this.userDataLoadingPromise = null;
                
                if (retryCount < maxRetries) {
                    await this._delay(1000 * Math.pow(2, retryCount));
                    return this._loadUserDataSafely(user, retryCount + 1);
                }
                
                return user;
            }
        }

        async _notifyAuthCallbacksSafely(user, userData, error = null) {
            clearTimeout(this.callbackDebounce);
            this.callbackDebounce = setTimeout(async () => {
                await this._executeCallbacksSequentially(user, userData, error);
            }, 50);
        }

        async _executeCallbacksSequentially(user, userData, error) {
            const callbackPromises = this.authCallbacks.map(async (callback, index) => {
                try {
                    await Promise.race([
                        callback(user, userData, error),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Callback timeout')), 3000)
                        )
                    ]);
                } catch (callbackError) {
                    console.error(`❌ Erreur callback auth ${index}:`, callbackError);
                }
            });
            
            await Promise.allSettled(callbackPromises);
        }

        async _checkRedirectResultSafely() {
            try {
                if (!this.firebaseAuth?.getRedirectResult) {
                    return;
                }
                
                await this._delay(200);
                
                const result = await Promise.race([
                    this.firebaseAuth.getRedirectResult(this.auth),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Redirect check timeout')), 3000)
                    )
                ]);
                
                if (result && result.user) {
                    this._cleanOAuthURLSafely(true);
                }
                
            } catch (error) {
                const expectedErrors = [
                    'auth/argument-error',
                    'auth/no-auth-event', 
                    'auth/operation-not-allowed',
                    'auth/timeout'
                ];
                
                if (!expectedErrors.includes(error.code) && !error.message.includes('timeout')) {
                    console.warn('⚠️ Erreur inattendue redirect check:', error);
                }
            }
        }

        _cleanOAuthURLSafely(hasRedirectResult = false) {
            try {
                const url = new URL(window.location.href);
                
                if (!hasRedirectResult) {
                    return;
                }
                
                const oauthParams = ['code', 'state', 'scope', 'authuser', 'prompt', 'hd'];
                
                const hasGoogleParams = url.searchParams.has('code') && url.searchParams.has('scope');
                const hasFacebookParams = url.searchParams.has('code') && url.searchParams.has('state');
                
                if (!hasGoogleParams && !hasFacebookParams) {
                    return;
                }
                
                let hasOAuthParams = false;
                oauthParams.forEach(param => {
                    if (url.searchParams.has(param)) {
                        url.searchParams.delete(param);
                        hasOAuthParams = true;
                    }
                });
                
                if (hasOAuthParams) {
                    const newUrl = url.pathname + (url.search || '');
                    window.history.replaceState({}, document.title, newUrl);
                }
                
            } catch (error) {
                console.warn('⚠️ Erreur nettoyage URL (non critique):', error);
            }
        }

        async waitForAuthReady() {
            if (this.authState === 'ready') {
                return { user: this.currentUser, userData: this.userData };
            }
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Auth ready timeout'));
                }, 15000);
                
                const checkReady = () => {
                    if (this.authState === 'ready') {
                        clearTimeout(timeout);
                        resolve({ user: this.currentUser, userData: this.userData });
                    } else if (this.authState === 'error') {
                        clearTimeout(timeout);
                        reject(new Error('Auth initialization failed'));
                    } else {
                        setTimeout(checkReady, 100);
                    }
                };
                
                checkReady();
            });
        }

        onAuthStateChanged(callback) {
            if (typeof callback !== 'function') {
                console.warn('⚠️ Callback auth state doit être une fonction');
                return;
            }
            
            this.authCallbacks.push(callback);
            
            if (this.authState === 'ready') {
                setTimeout(() => {
                    this._notifyAuthCallbacksSafely(this.currentUser, this.userData);
                }, 0);
            }
            
            return () => {
                const index = this.authCallbacks.indexOf(callback);
                if (index > -1) {
                    this.authCallbacks.splice(index, 1);
                }
            };
        }

        async _getUserDataWithCache(user) {
            try {
                if (!user || !user.uid) return user;
                
                const cached = this.userDataCache.get(user.uid);
                if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
                    return cached.data;
                }
                
                const userRef = this.firebaseAuth.doc(this.db, 'users', user.uid);
                const userDoc = await this.firebaseAuth.getDoc(userRef);
                
                let userData;
                if (userDoc.exists()) {
                    userData = { ...user, ...userDoc.data() };
                } else {
                    const defaultProfile = this.createDefaultProfile(user);
                    
                    await this.firebaseAuth.setDoc(userRef, defaultProfile);
                    
                    userData = { ...user, ...defaultProfile };
                }
                
                this.userDataCache.set(user.uid, {
                    data: userData,
                    timestamp: Date.now()
                });
                
                return userData;
                
            } catch (error) {
                console.error('❌ Erreur _getUserDataWithCache:', error);
                return user;
            }
        }

        createDefaultProfile(user) {
            return {
                uid: user.uid,
                displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                email: user.email,
                profile: {
                    isProfileComplete: true,
                    displayPreference: 'realname',
                    joinDate: new Date(),
                    gamertag: '',
                    nationality: ''
                },
                privacy: {
                    profileVisibility: 'public',
                    showInLeaderboards: true
                },
                improvedStats: {
                    totalGames: 0,
                    practice: {
                        gamesPlayed: 0,
                        gamesCompleted: 0,
                        totalScore: 0,
                        bestScores: {
                            easy: 0,
                            medium: 0,
                            hard: 0,
                            expert: 0,
                            master: 0
                        }
                    },
                    ranked: {
                        gamesPlayed: 0,
                        gamesCompleted: 0,
                        currentRating: 1000,
                        winStreak: 0
                    },
                    totalPlayTime: 0,
                    lastPlayed: null
                },
                achievements: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }

        async updateUserData(userId, updateData) {
            try {
                if (!this.firebaseAuth || !this.db) {
                    throw new Error('Firebase non disponible');
                }

                const userRef = this.firebaseAuth.doc(this.db, 'users', userId);
                
                const dataWithTimestamp = {
                    ...updateData,
                    updatedAt: new Date()
                };
                
                await this.firebaseAuth.updateDoc(userRef, dataWithTimestamp);
                
                this.invalidateUserCache(userId);
                
                return true;
                
            } catch (error) {
                console.error('❌ Erreur updateUserData:', error);
                throw new Error('Échec de la mise à jour des données utilisateur');
            }
        }

        invalidateUserCache(userId) {
            this.userDataCache.delete(userId);
        }

        _clearUserCache() {
            this.userDataCache.clear();
        }

        async signInWithGoogle() {
            try {
                if (!this.firebaseAuth?.googleProvider) {
                    throw new Error('Google Provider non disponible');
                }
                
                await this.firebaseAuth.signInWithRedirect(this.auth, this.firebaseAuth.googleProvider);
                
            } catch (error) {
                console.error('❌ Erreur Google sign-in:', error);
                throw error;
            }
        }

        async signInWithFacebook() {
            try {
                if (!this.firebaseAuth?.facebookProvider) {
                    throw new Error('Facebook Provider non disponible');
                }
                
                await this.firebaseAuth.signInWithRedirect(this.auth, this.firebaseAuth.facebookProvider);
                
            } catch (error) {
                console.error('❌ Erreur Facebook sign-in:', error);
                throw error;
            }
        }

        async signInWithGooglePopup() {
            try {
                if (!this.firebaseAuth?.googleProvider) {
                    throw new Error('Google Provider non disponible');
                }

                const result = await this.firebaseAuth.signInWithPopup(this.auth, this.firebaseAuth.googleProvider);
                return result;
                
            } catch (error) {
                return this.signInWithGoogle();
            }
        }

        async signInWithFacebookPopup() {
            try {
                if (!this.firebaseAuth?.facebookProvider) {
                    throw new Error('Facebook Provider non disponible');
                }

                const result = await this.firebaseAuth.signInWithPopup(this.auth, this.firebaseAuth.facebookProvider);
                return result;
                
            } catch (error) {
                return this.signInWithFacebook();
            }
        }

        getCurrentUser() {
            return this.currentUser;
        }

        getCurrentUserData() {
            return this.userData;
        }

        isInitialized() {
            return this.initialized;
        }

        isLoading() {
            return this.isLoading;
        }

        hasError() {
            return this.hasError;
        }

        async retry() {
            FirebaseManager.instance = null;
            FirebaseManager.initLock = null;
            FirebaseManager.isInitializing = false;
            this.initialized = false;
            this.hasError = false;
            this.retryCount = 0;
            
            return FirebaseManager.getInstance();
        }

        async signOut() {
            try {
                if (!this.firebaseAuth || !this.auth) {
                    throw new Error('Firebase non initialisé');
                }
                
                await this.firebaseAuth.signOut(this.auth);
                
                this.navigateToHome();
                return true;
                
            } catch (error) {
                console.error('❌ Erreur signOut Firebase Manager:', error);
                throw error;
            }
        }

        getPathPrefix() {
            const pathname = window.location.pathname;
            
            const segments = pathname.split('/').filter(segment => 
                segment !== '' && segment !== 'index.html'
            );
            
            const depth = segments.length;
            const prefix = depth > 0 ? '../'.repeat(depth) : './';
            
            return prefix;
        }

        navigateTo(page) {
            try {
                const prefix = this.getPathPrefix();
                
                const routes = {
                    'home': '',
                    'auth': 'auth/',
                    'profile': 'profile/',
                    'settings': 'settings/',
                    'tutorial': 'tutorial/',
                    'leaderboard': 'leaderboard/',
                    'legal': 'legal/'
                };
                
                if (!routes.hasOwnProperty(page)) {
                    console.warn(`🚫 Route inconnue: ${page}`);
                    return;
                }
                
                const destination = prefix + routes[page];
                
                if (destination.includes('../') && destination.split('../').length > 6) {
                    console.error('🚫 Tentative de navigation non sécurisée bloquée');
                    return;
                }
                
                window.location.href = destination;
                
            } catch (error) {
                console.error('❌ Erreur de navigation:', error);
                window.location.href = './';
            }
        }

        navigateToHome() {
            try {
                const prefix = this.getPathPrefix();
                const homeUrl = prefix === './' ? './' : prefix.slice(0, -1);
                
                window.location.href = homeUrl || './';
                
            } catch (error) {
                console.error('❌ Erreur retour accueil:', error);
                window.location.href = './';
            }
        }

        getNavigationPath(page) {
            try {
                const prefix = this.getPathPrefix();
                
                const routes = {
                    'home': '',
                    'auth': 'auth/',
                    'profile': 'profile/',
                    'settings': 'settings/',
                    'tutorial': 'tutorial/',
                    'leaderboard': 'leaderboard/',
                    'legal': 'legal/'
                };
                
                if (!routes.hasOwnProperty(page)) {
                    console.warn(`🚫 Route inconnue: ${page}`);
                    return prefix;
                }
                
                const path = prefix + routes[page];
                return path;
                
            } catch (error) {
                console.error('❌ Erreur getNavigationPath:', error);
                return './';
            }
        }

        getDisplayName(userData) {
            try {
                if (!userData) return 'Anonymous';
                
                if (userData.profile?.displayPreference === 'gamertag' && userData.profile?.gamertag) {
                    return userData.profile.gamertag;
                }
                
                return userData.displayName || userData.email?.split('@')[0] || 'Anonymous';
                
            } catch (error) {
                console.warn('⚠️ Erreur getDisplayName:', error);
                return 'Anonymous';
            }
        }

        getFlagEmoji(countryCode) {
            const flags = {
                'FR': '🇫🇷', 'US': '🇺🇸', 'GB': '🇬🇧', 'DE': '🇩🇪', 'ES': '🇪🇸',
                'IT': '🇮🇹', 'JP': '🇯🇵', 'CN': '🇨🇳', 'BR': '🇧🇷', 'CA': '🇨🇦',
                'AU': '🇦🇺', 'IN': '🇮🇳', 'RU': '🇷🇺', 'MX': '🇲🇽', 'KR': '🇰🇷',
                'NL': '🇳🇱', 'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮',
                'CH': '🇨🇭', 'AT': '🇦🇹', 'BE': '🇧🇪', 'PL': '🇵🇱', 'PT': '🇵🇹'
            };
            
            return flags[countryCode] || '🌍';
        }

        isProfileComplete(userData) {
            try {
                return userData?.profile?.isProfileComplete === true;
            } catch (error) {
                console.warn('⚠️ Erreur isProfileComplete:', error);
                return false;
            }
        }

        _delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        getCacheStats() {
            return {
                size: this.userDataCache.size,
                maxSize: this.userDataCache.maxSize,
                maxAge: this.cacheTimeout
            };
        }

        debug() {
            console.group('🔥 Firebase Manager Debug');
            console.log('Initialized:', this.initialized);
            console.log('Loading:', this.isLoading);
            console.log('Has Error:', this.hasError);
            console.log('Retry Count:', this.retryCount);
            console.log('Current User:', this.currentUser);
            console.log('Auth Callbacks:', this.authCallbacks.length);
            console.log('Cache Stats:', this.getCacheStats());
            console.log('Singleton Instance:', !!FirebaseManager.instance);
            console.log('Init Lock:', !!FirebaseManager.initLock);
            console.log('Is Initializing:', FirebaseManager.isInitializing);
            console.groupEnd();
        }
    }

    window.FirebaseManager = FirebaseManager;
    
    window.initFirebase = () => FirebaseManager.getInstance();
    window.signOutUser = () => FirebaseManager.getInstance().then(fm => fm.signOut());
    window.getUserData = (user) => FirebaseManager.getInstance().then(fm => fm._getUserDataWithCache(user));
    window.getDisplayName = (userData) => FirebaseManager.getInstance().then(fm => fm.getDisplayName(userData));
    window.getFlagEmoji = (countryCode) => FirebaseManager.getInstance().then(fm => fm.getFlagEmoji(countryCode));
    window.isProfileComplete = (userData) => FirebaseManager.getInstance().then(fm => fm.isProfileComplete(userData));
    window.navigateTo = (page) => FirebaseManager.getInstance().then(fm => fm.navigateTo(page));
    window.goToHome = () => FirebaseManager.getInstance().then(fm => fm.navigateToHome());
    window.getNavigationPath = (page) => FirebaseManager.getInstance().then(fm => fm.getNavigationPath(page));

    function needsFirebase() {
        const firebaseSelectors = [
            '#login-form',
            '#profile-content', 
            '#settings-content',
            '#leaderboard-container',
            '[data-auth-required]',
            '.user-menu'
        ];
        
        const hasFirebaseElements = firebaseSelectors.some(selector => 
            document.querySelector(selector)
        );
        
        const firebasePages = ['/auth/', '/profile/', '/settings/', '/leaderboard/'];
        const currentPath = window.location.pathname;
        const isFirebasePage = firebasePages.some(page => currentPath.includes(page));
        
        return hasFirebaseElements || isFirebasePage;
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (needsFirebase()) {
            FirebaseManager.getInstance().catch(error => {
                console.error('❌ Échec auto-initialisation Firebase Manager:', error);
            });
        }
    });

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugFirebaseManager = () => FirebaseManager.getInstance().then(fm => fm.debug());
        window.retryFirebaseManager = () => FirebaseManager.getInstance().then(fm => fm.retry());
        window.firebaseManagerStats = () => FirebaseManager.getInstance().then(fm => fm.getCacheStats());
    }

})();
