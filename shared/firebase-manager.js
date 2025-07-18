(function() {
    'use strict';

    class Mutex {
        constructor() {
            this.locked = false;
            this.queue = [];
        }
        
        async runExclusive(fn) {
            return new Promise((resolve, reject) => {
                this.queue.push({ fn, resolve, reject });
                this.processQueue();
            });
        }
        
        async processQueue() {
            if (this.locked || this.queue.length === 0) return;
            
            this.locked = true;
            const { fn, resolve, reject } = this.queue.shift();
            
            try {
                const result = await fn();
                resolve(result);
            } catch (error) {
                reject(error);
            } finally {
                this.locked = false;
                this.processQueue();
            }
        }
    }

    class OperationQueue {
        constructor() {
            this.queue = [];
            this.isProcessing = false;
            this.mutex = new Mutex();
        }
        
        async enqueue(operation) {
            return this.mutex.runExclusive(async () => {
                return new Promise((resolve, reject) => {
                    this.queue.push({ operation, resolve, reject, timestamp: Date.now() });
                    this.processQueue();
                });
            });
        }
        
        async processQueue() {
            if (this.isProcessing || this.queue.length === 0) return;
            
            this.isProcessing = true;
            
            while (this.queue.length > 0) {
                const { operation, resolve, reject } = this.queue.shift();
                
                try {
                    const result = await Promise.race([
                        operation(),
                        new Promise((_, timeoutReject) => 
                            setTimeout(() => timeoutReject(new Error('Operation timeout')), 10000)
                        )
                    ]);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            }
            
            this.isProcessing = false;
        }
        
        clear() {
            this.queue = [];
            this.isProcessing = false;
        }
    }

    class ThreadSafeCache {
        constructor(maxSize = 50, ttl = 5 * 60 * 1000) {
            this.cache = new Map();
            this.accessOrder = [];
            this.maxSize = maxSize;
            this.ttl = ttl;
            this.mutex = new Mutex();
        }
        
        async get(key) {
            return this.mutex.runExclusive(() => {
                const entry = this.cache.get(key);
                if (!entry) return null;
                
                if (Date.now() - entry.timestamp > this.ttl) {
                    this.cache.delete(key);
                    this.accessOrder = this.accessOrder.filter(k => k !== key);
                    return null;
                }
                
                this.accessOrder = this.accessOrder.filter(k => k !== key);
                this.accessOrder.push(key);
                
                return entry.data;
            });
        }
        
        async set(key, value) {
            return this.mutex.runExclusive(() => {
                if (this.cache.has(key)) {
                    this.accessOrder = this.accessOrder.filter(k => k !== key);
                } else if (this.cache.size >= this.maxSize) {
                    const oldestKey = this.accessOrder.shift();
                    this.cache.delete(oldestKey);
                }
                
                this.cache.set(key, { data: value, timestamp: Date.now() });
                this.accessOrder.push(key);
            });
        }
        
        async delete(key) {
            return this.mutex.runExclusive(() => {
                this.cache.delete(key);
                this.accessOrder = this.accessOrder.filter(k => k !== key);
            });
        }
        
        async clear() {
            return this.mutex.runExclusive(() => {
                this.cache.clear();
                this.accessOrder = [];
            });
        }
        
        get size() {
            return this.cache.size;
        }
        
        getStats() {
            return {
                size: this.cache.size,
                maxSize: this.maxSize,
                ttl: this.ttl,
                oldestEntry: this.accessOrder[0] || null
            };
        }
    }

    const FIREBASE_STATES = {
        UNINITIALIZED: 'uninitialized',
        INITIALIZING: 'initializing',
        READY: 'ready',
        ERROR: 'error',
        RECONNECTING: 'reconnecting'
    };

    class FirebaseManager {
        static #instance = null;
        static #initializationPromise = null;
        static #isInitializing = false;
        static #mutex = new Mutex();

        static async getInstance() {
            return this.#mutex.runExclusive(async () => {
                if (this.#instance) return this.#instance;
                
                if (this.#initializationPromise) {
                    return await this.#initializationPromise;
                }
                
                this.#isInitializing = true;
                this.#initializationPromise = this.#createInstance();
                
                try {
                    this.#instance = await this.#initializationPromise;
                    return this.#instance;
                } finally {
                    this.#initializationPromise = null;
                    this.#isInitializing = false;
                }
            });
        }
        
        static async #createInstance() {
            const instance = new FirebaseManager();
            await instance._performInitialization();
            return instance;
        }

        constructor() {
            this.state = FIREBASE_STATES.UNINITIALIZED;
            this.operationQueue = new OperationQueue();
            this.userDataCache = new ThreadSafeCache(100, 5 * 60 * 1000);
            this.leaderboardCache = new ThreadSafeCache(20, 2 * 60 * 1000);
            
            this.firebaseAuth = null;
            this.app = null;
            this.auth = null;
            this.db = null;
            this.storage = null;
            
            this.currentUser = null;
            this.userData = null;
            this.authCallbacks = [];
            this.authUnsubscribe = null;
            
            this.config = {
                timeout: 10000,
                maxRetries: 3,
                retryDelay: 2000
            };
            
            this.retryCount = 0;
            this.lastError = null;
            this.authStateMutex = new Mutex();
        }

        async _performInitialization() {
            this.state = FIREBASE_STATES.INITIALIZING;
            
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
                    setTimeout(() => reject(new Error('Firebase import timeout')), this.config.timeout)
                );
                
                const [
                    { initializeApp },
                    { getAuth, onAuthStateChanged, signOut, updateProfile,
                      createUserWithEmailAndPassword, signInWithEmailAndPassword,
                      signInWithPopup, signInWithRedirect, getRedirectResult,
                      GoogleAuthProvider, FacebookAuthProvider, sendPasswordResetEmail },
                    { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
                      collection, getDocs, query, orderBy, limit, where, startAfter,
                      runTransaction, writeBatch, serverTimestamp, increment },
                    { getStorage, ref, uploadBytes, getDownloadURL, deleteObject }
                ] = await Promise.race([Promise.all(importPromises), timeoutPromise]);

                this.app = initializeApp(firebaseConfig);
                this.auth = getAuth(this.app);
                this.db = getFirestore(this.app);
                this.storage = getStorage(this.app);

                const googleProvider = new GoogleAuthProvider();
                googleProvider.addScope('email');
                googleProvider.addScope('profile');
                googleProvider.setCustomParameters({ 
                    prompt: 'select_account',
                    redirect_uri: window.location.origin + window.location.pathname
                });

                const facebookProvider = new FacebookAuthProvider();
                facebookProvider.addScope('public_profile');
                facebookProvider.addScope('email');

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
                    deleteDoc,
                    collection,
                    getDocs,
                    query,
                    orderBy,
                    limit,
                    where,
                    startAfter,
                    runTransaction,
                    writeBatch,
                    serverTimestamp,
                    increment,
                    ref,
                    uploadBytes,
                    getDownloadURL,
                    deleteObject
                };

                await this._setupAuthStateListener();
                await this._checkRedirectResultSafely();
                
                this.state = FIREBASE_STATES.READY;
                this.retryCount = 0;
                this.lastError = null;
                
                window.firebaseAuth = this.firebaseAuth;
                
                return this;
                
            } catch (error) {
                this.state = FIREBASE_STATES.ERROR;
                this.lastError = error;
                
                if (this.retryCount < this.config.maxRetries) {
                    this.retryCount++;
                    await this._delay(this.config.retryDelay * this.retryCount);
                    return this._performInitialization();
                }
                
                throw error;
            }
        }

        async _setupAuthStateListener() {
            this.authUnsubscribe = this.firebaseAuth.onAuthStateChanged(this.auth, async (user) => {
                await this._handleAuthStateChange(user);
            });
        }

        async _handleAuthStateChange(user) {
            return this.authStateMutex.runExclusive(async () => {
                try {
                    this.currentUser = user;
                    
                    if (user) {
                        this.userData = await this.getUserData(user, { useCache: true, forceRefresh: false });
                    } else {
                        this.userData = null;
                        await this.userDataCache.clear();
                    }
                    
                    await this._notifyAuthCallbacks(user, this.userData);
                    
                } catch (error) {
                    this.lastError = error;
                    await this._notifyAuthCallbacks(user, null, error);
                }
            });
        }

        async _notifyAuthCallbacks(user, userData, error = null) {
            const callbackPromises = this.authCallbacks.map(async (callback) => {
                try {
                    await Promise.race([
                        callback(user, userData, error),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Callback timeout')), 5000)
                        )
                    ]);
                } catch (callbackError) {
                    console.error('Auth callback error:', callbackError);
                }
            });
            
            await Promise.allSettled(callbackPromises);
        }

        async _checkRedirectResultSafely() {
            try {
                const result = await Promise.race([
                    this.firebaseAuth.getRedirectResult(this.auth),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Redirect timeout')), 5000)
                    )
                ]);
                
                if (result && result.user) {
                    this._cleanOAuthURL();
                }
                
            } catch (error) {
                const ignoredErrors = ['auth/no-auth-event', 'auth/operation-not-allowed'];
                if (!ignoredErrors.includes(error.code) && !error.message.includes('timeout')) {
                    console.warn('Redirect check warning:', error);
                }
            }
        }

        _cleanOAuthURL() {
            try {
                const url = new URL(window.location.href);
                const oauthParams = ['code', 'state', 'scope', 'authuser', 'prompt', 'hd', 'session_state'];
                
                let hasChanges = false;
                oauthParams.forEach(param => {
                    if (url.searchParams.has(param)) {
                        url.searchParams.delete(param);
                        hasChanges = true;
                    }
                });
                
                if (hasChanges) {
                    const cleanUrl = url.pathname + (url.search || '');
                    window.history.replaceState({}, document.title, cleanUrl);
                }
                
            } catch (error) {
                console.warn('URL cleanup warning:', error);
            }
        }

        async getUserData(user, options = {}) {
            const { useCache = true, forceRefresh = false, includeProfile = true, includeStats = true, validatePermissions = false } = options;
            
            if (!user || !user.uid) {
                throw new Error('Invalid user object');
            }
            
            return this.operationQueue.enqueue(async () => {
                const cacheKey = user.uid;
                
                if (useCache && !forceRefresh) {
                    const cachedData = await this.userDataCache.get(cacheKey);
                    if (cachedData) {
                        return cachedData;
                    }
                }
                
                const userData = await this._fetchUserDataFromFirestore(user, { includeProfile, includeStats, validatePermissions });
                
                if (useCache) {
                    await this.userDataCache.set(cacheKey, userData);
                }
                
                return userData;
            });
        }

        async _fetchUserDataFromFirestore(user, options) {
            const userRef = this.firebaseAuth.doc(this.db, 'users', user.uid);
            const userDoc = await this.firebaseAuth.getDoc(userRef);
            
            let userData;
            if (userDoc.exists()) {
                const docData = userDoc.data();
                userData = { ...user, ...docData };
                
                if (this._needsDataMigration(docData)) {
                    userData = await this._migrateUserData(user, docData);
                }
            } else {
                userData = await this._createUserProfile(user);
            }
            
            return this._validateUserData(userData, options);
        }

        _needsDataMigration(docData) {
            return !docData.improvedStats || !docData.profile || !docData.privacy;
        }

        async _migrateUserData(user, existingData) {
            const defaultProfile = this._createDefaultUserData(user);
            const migratedData = this._mergeUserData(defaultProfile, existingData);
            
            await this.updateUserDataTransaction(user.uid, () => migratedData);
            
            return { ...user, ...migratedData };
        }

        async _createUserProfile(user) {
            const defaultData = this._createDefaultUserData(user);
            
            const userRef = this.firebaseAuth.doc(this.db, 'users', user.uid);
            await this.firebaseAuth.setDoc(userRef, defaultData);
            
            return { ...user, ...defaultData };
        }

        _createDefaultUserData(user) {
            const now = new Date();
            
            return {
                uid: user.uid,
                displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous Player',
                email: user.email,
                photoURL: user.photoURL || null,
                
                profile: {
                    isProfileComplete: true,
                    displayPreference: 'realname',
                    joinDate: now,
                    gamertag: '',
                    nationality: '',
                    bio: '',
                    favoriteMode: 'practice',
                    experienceLevel: 'beginner'
                },
                
                privacy: {
                    profileVisibility: 'public',
                    showInLeaderboards: true,
                    allowFriendRequests: true,
                    showOnlineStatus: true,
                    allowGameInvitations: true
                },
                
                improvedStats: {
                    totalGames: 0,
                    totalPlayTime: 0,
                    lastPlayed: null,
                    
                    practice: {
                        gamesPlayed: 0,
                        gamesCompleted: 0,
                        gamesAbandoned: 0,
                        totalScore: 0,
                        bestScores: {
                            easy: 0,
                            medium: 0,
                            hard: 0,
                            expert: 0,
                            master: 0
                        },
                        bestTimes: {
                            easy: null,
                            medium: null,
                            hard: null,
                            expert: null,
                            master: null
                        },
                        averageCompletionTime: 0,
                        perfectGames: 0,
                        totalHintsUsed: 0
                    },
                    
                    ranked: {
                        gamesPlayed: 0,
                        gamesCompleted: 0,
                        gamesAbandoned: 0,
                        currentRating: 1000,
                        highestRating: 1000,
                        winStreak: 0,
                        bestWinStreak: 0,
                        seasonWins: 0,
                        seasonLosses: 0,
                        totalRankingPoints: 0
                    },
                    
                    achievements: {
                        unlocked: [],
                        progress: {},
                        totalPoints: 0,
                        lastUnlocked: null
                    },
                    
                    gameHistory: {
                        recentGames: [],
                        streaks: [],
                        milestones: []
                    },
                    
                    performance: {
                        averageErrorsPerGame: 0,
                        averageScorePerDifficulty: {},
                        improvementRate: 0,
                        consistencyScore: 0,
                        speedScore: 0,
                        accuracyScore: 0
                    }
                },
                
                preferences: {
                    theme: 'auto',
                    language: 'en',
                    notifications: {
                        achievements: true,
                        friendRequests: true,
                        gameInvitations: true,
                        leaderboardChanges: false
                    },
                    gameplay: {
                        autoSave: true,
                        showTimer: true,
                        showHints: true,
                        highlightErrors: true,
                        confirmMoves: false
                    }
                },
                
                social: {
                    friends: [],
                    friendRequests: [],
                    blockedUsers: [],
                    groups: [],
                    followedPlayers: []
                },
                
                createdAt: now,
                updatedAt: now,
                lastLoginAt: now,
                version: '2.0'
            };
        }

        _mergeUserData(defaultData, existingData) {
            const merged = { ...defaultData };
            
            if (existingData.profile) {
                merged.profile = { ...defaultData.profile, ...existingData.profile };
            }
            
            if (existingData.privacy) {
                merged.privacy = { ...defaultData.privacy, ...existingData.privacy };
            }
            
            if (existingData.stats) {
                if (existingData.stats.totalGamesPlayed) {
                    merged.improvedStats.totalGames = existingData.stats.totalGamesPlayed;
                }
                if (existingData.stats.totalTimePlayed) {
                    merged.improvedStats.totalPlayTime = existingData.stats.totalTimePlayed;
                }
                if (existingData.stats.difficultyStats) {
                    Object.keys(existingData.stats.difficultyStats).forEach(difficulty => {
                        const oldStats = existingData.stats.difficultyStats[difficulty];
                        if (oldStats.bestScore > 0) {
                            merged.improvedStats.practice.bestScores[difficulty] = oldStats.bestScore;
                        }
                        if (oldStats.bestTime) {
                            merged.improvedStats.practice.bestTimes[difficulty] = oldStats.bestTime;
                        }
                    });
                }
            }
            
            if (existingData.ranking) {
                merged.improvedStats.ranked.currentRating = existingData.ranking.rankingPoints || 1000;
                merged.improvedStats.ranked.winStreak = existingData.ranking.currentStreak || 0;
                merged.improvedStats.ranked.bestWinStreak = existingData.ranking.bestStreak || 0;
            }
            
            if (existingData.achievements) {
                merged.improvedStats.achievements.unlocked = Array.isArray(existingData.achievements) ? existingData.achievements : [];
            }
            
            merged.updatedAt = new Date();
            return merged;
        }

        _validateUserData(userData, options) {
            if (!userData || !userData.uid) {
                throw new Error('Invalid user data structure');
            }
            
            if (options.validatePermissions && userData.privacy?.profileVisibility === 'private') {
                if (this.currentUser?.uid !== userData.uid) {
                    throw new Error('Profile is private');
                }
            }
            
            return userData;
        }

        async updateUserDataTransaction(userId, updateFunction) {
            return this.operationQueue.enqueue(async () => {
                return this.firebaseAuth.runTransaction(this.db, async (transaction) => {
                    const userRef = this.firebaseAuth.doc(this.db, 'users', userId);
                    const userDoc = await transaction.get(userRef);
                    
                    const currentData = userDoc.exists() ? userDoc.data() : {};
                    const newData = updateFunction(currentData);
                    
                    if (newData) {
                        newData.updatedAt = new Date();
                        transaction.update(userRef, newData);
                        
                        await this.userDataCache.delete(userId);
                    }
                    
                    return newData;
                });
            });
        }

        async queryCollection(collectionName, options = {}) {
            const { where: whereConditions = [], orderBy: orderByField, limit: limitCount, useCache = false, cacheTTL = 60000 } = options;
            
            return this.operationQueue.enqueue(async () => {
                const cacheKey = `query_${collectionName}_${JSON.stringify(options)}`;
                
                if (useCache) {
                    const cached = await this.leaderboardCache.get(cacheKey);
                    if (cached) return cached;
                }
                
                let queryRef = this.firebaseAuth.collection(this.db, collectionName);
                
                whereConditions.forEach(([field, operator, value]) => {
                    queryRef = this.firebaseAuth.where(queryRef, field, operator, value);
                });
                
                if (orderByField) {
                    if (Array.isArray(orderByField)) {
                        queryRef = this.firebaseAuth.orderBy(queryRef, orderByField[0], orderByField[1]);
                    } else {
                        queryRef = this.firebaseAuth.orderBy(queryRef, orderByField, 'desc');
                    }
                }
                
                if (limitCount) {
                    queryRef = this.firebaseAuth.limit(queryRef, limitCount);
                }
                
                const querySnapshot = await this.firebaseAuth.getDocs(queryRef);
                const results = [];
                
                querySnapshot.forEach(doc => {
                    results.push({ id: doc.id, ...doc.data() });
                });
                
                if (useCache) {
                    await this.leaderboardCache.set(cacheKey, results);
                }
                
                return results;
            });
        }

        async getCachedData(cacheKey, fetchFunction, options = {}) {
            const { ttl = 60000, useQueue = true } = options;
            
            const operation = async () => {
                const cached = await this.userDataCache.get(cacheKey);
                if (cached) return cached;
                
                const freshData = await fetchFunction();
                await this.userDataCache.set(cacheKey, freshData);
                
                return freshData;
            };
            
            return useQueue ? this.operationQueue.enqueue(operation) : operation();
        }

        async signOut() {
            return this.operationQueue.enqueue(async () => {
                await this.firebaseAuth.signOut(this.auth);
                
                this.currentUser = null;
                this.userData = null;
                await this.userDataCache.clear();
                await this.leaderboardCache.clear();
                
                this.navigateToHome();
            });
        }

        onAuthStateChanged(callback) {
            if (typeof callback !== 'function') {
                throw new Error('Callback must be a function');
            }
            
            this.authCallbacks.push(callback);
            
            if (this.state === FIREBASE_STATES.READY) {
                setTimeout(() => {
                    callback(this.currentUser, this.userData);
                }, 0);
            }
            
            return () => {
                const index = this.authCallbacks.indexOf(callback);
                if (index > -1) {
                    this.authCallbacks.splice(index, 1);
                }
            };
        }

        async waitForAuthReady() {
            if (this.state === FIREBASE_STATES.READY) {
                return { user: this.currentUser, userData: this.userData };
            }
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Auth ready timeout'));
                }, 15000);
                
                const checkReady = () => {
                    if (this.state === FIREBASE_STATES.READY) {
                        clearTimeout(timeout);
                        resolve({ user: this.currentUser, userData: this.userData });
                    } else if (this.state === FIREBASE_STATES.ERROR) {
                        clearTimeout(timeout);
                        reject(this.lastError || new Error('Auth initialization failed'));
                    } else {
                        setTimeout(checkReady, 100);
                    }
                };
                
                checkReady();
            });
        }

        getState() {
            return this.state;
        }

        getCurrentUser() {
            return this.currentUser;
        }

        getCurrentUserData() {
            return this.userData;
        }

        isInitialized() {
            return this.state === FIREBASE_STATES.READY;
        }

        getDisplayName(userData) {
            if (!userData) return 'Anonymous';
            
            if (userData.profile?.displayPreference === 'gamertag' && userData.profile?.gamertag) {
                return userData.profile.gamertag;
            }
            
            return userData.displayName || userData.email?.split('@')[0] || 'Anonymous';
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
            return userData?.profile?.isProfileComplete === true;
        }

        getPathPrefix() {
            const pathname = window.location.pathname;
            const segments = pathname.split('/').filter(segment => 
                segment !== '' && segment !== 'index.html'
            );
            const depth = segments.length;
            return depth > 0 ? '../'.repeat(depth) : './';
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
                    console.warn(`Unknown route: ${page}`);
                    return;
                }
                
                const destination = prefix + routes[page];
                window.location.href = destination;
                
            } catch (error) {
                console.error('Navigation error:', error);
                window.location.href = './';
            }
        }

        navigateToHome() {
            try {
                const prefix = this.getPathPrefix();
                const homeUrl = prefix === './' ? './' : prefix.slice(0, -1);
                window.location.href = homeUrl || './';
            } catch (error) {
                console.error('Home navigation error:', error);
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
                    console.warn(`Unknown route: ${page}`);
                    return prefix;
                }
                
                return prefix + routes[page];
                
            } catch (error) {
                console.error('Path generation error:', error);
                return './';
            }
        }

        getCacheStats() {
            return {
                userCache: this.userDataCache.getStats(),
                leaderboardCache: this.leaderboardCache.getStats(),
                operationQueue: {
                    pending: this.operationQueue.queue.length,
                    processing: this.operationQueue.isProcessing
                },
                state: this.state,
                authCallbacks: this.authCallbacks.length
            };
        }

        async retry() {
            this.state = FIREBASE_STATES.UNINITIALIZED;
            this.retryCount = 0;
            this.lastError = null;
            
            FirebaseManager.#instance = null;
            FirebaseManager.#initializationPromise = null;
            FirebaseManager.#isInitializing = false;
            
            await this.operationQueue.clear();
            await this.userDataCache.clear();
            await this.leaderboardCache.clear();
            
            return FirebaseManager.getInstance();
        }

        cleanup() {
            if (this.authUnsubscribe) {
                this.authUnsubscribe();
                this.authUnsubscribe = null;
            }
            
            this.authCallbacks = [];
            this.operationQueue.clear();
        }

        async initialize() {
            return FirebaseManager.getInstance();
        }

        _delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    window.FirebaseManager = FirebaseManager;
    
    window.initFirebase = () => FirebaseManager.getInstance();
    window.signOutUser = () => FirebaseManager.getInstance().then(fm => fm.signOut());
    window.getUserData = (user, options) => FirebaseManager.getInstance().then(fm => fm.getUserData(user, options));
    window.getDisplayName = (userData) => FirebaseManager.getInstance().then(fm => fm.getDisplayName(userData));
    window.getFlagEmoji = (countryCode) => FirebaseManager.getInstance().then(fm => fm.getFlagEmoji(countryCode));
    window.isProfileComplete = (userData) => FirebaseManager.getInstance().then(fm => fm.isProfileComplete(userData));
    window.navigateTo = (page) => FirebaseManager.getInstance().then(fm => fm.navigateTo(page));
    window.goToHome = () => FirebaseManager.getInstance().then(fm => fm.navigateToHome());
    window.getNavigationPath = (page) => FirebaseManager.getInstance().then(fm => fm.getNavigationPath(page));

    window.LoadingManager = {
        show: function(container, message = 'Loading...') {
            if (!container) return;
            container.innerHTML = `
                <div class="universal-loading" style="display: flex; align-items: center; justify-content: center; min-height: 200px; flex-direction: column; gap: 16px;">
                    <div class="loading-spinner" style="width: 40px; height: 40px; border: 4px solid #e5e5ea; border-top: 4px solid #007aff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <div class="loading-text" style="color: #8e8e93; font-size: 16px; font-weight: 500;">${message}</div>
                </div>
            `;
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
        style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }

    function needsFirebase() {
        const firebaseSelectors = ['#login-form', '#profile-content', '#settings-content', '#leaderboard-container', '[data-auth-required]', '.user-menu'];
        const hasFirebaseElements = firebaseSelectors.some(selector => document.querySelector(selector));
        const firebasePages = ['/auth/', '/profile/', '/settings/', '/leaderboard/'];
        const currentPath = window.location.pathname;
        const isFirebasePage = firebasePages.some(page => currentPath.includes(page));
        return hasFirebaseElements || isFirebasePage;
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (needsFirebase()) {
            FirebaseManager.getInstance().catch(error => {
                console.error('Firebase Manager auto-initialization failed:', error);
            });
        }
    });

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugFirebaseManager = () => FirebaseManager.getInstance().then(fm => console.log(fm.getCacheStats()));
        window.retryFirebaseManager = () => FirebaseManager.getInstance().then(fm => fm.retry());
        window.firebaseManagerStats = () => FirebaseManager.getInstance().then(fm => fm.getCacheStats());
    }

})();
