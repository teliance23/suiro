// ============= SHARED/FIREBASE-MANAGER.JS - SINGLETON CENTRALISÉ CORRIGÉ =============
// Solution complète pour éliminer les race conditions et unifier Firebase
// VERSION FINALE CORRIGÉE avec signInWithRedirect et getRedirectResult + FIX uid + CSP OPTIMISÉ + COOP

(function() {
    'use strict';

    // ============= LRU CACHE IMPLEMENTATION (Fix Bug #4) =============
    class LRUCache {
        constructor(maxSize = 50) {
            this.maxSize = maxSize;
            this.cache = new Map();
        }
        
        get(key) {
            if (this.cache.has(key)) {
                const value = this.cache.get(key);
                // Réorganiser pour LRU
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
                // Supprimer le plus ancien
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

    // ============= LOADING COMPONENT UNIFORME (Fix Bug #5) =============
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

    // Injecter CSS spinner si pas déjà fait
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

    // ============= CLASSE FIREBASE MANAGER SINGLETON =============
    class FirebaseManager {
        constructor() {
            // État de l'initialisation
            this.initialized = false;
            this.initPromise = null;
            this.isLoading = false;
            this.hasError = false;
            this.retryCount = 0;
            
            // Configuration unifiée (Fix Bug #2 - Timeouts cohérents)
            this.config = {
                timeout: 8000,        // UNIFIÉ : 8 secondes pour tous (plus sûr)
                maxRetries: 3,        // Réduit à 3 pour éviter les boucles
                retryDelay: 1000,     // 1 seconde entre retries
                enableDebug: false
            };
            
            // Firebase objects
            this.firebaseAuth = null;
            this.app = null;
            this.auth = null;
            this.db = null;
            this.storage = null;
            
            // État d'authentification centralisé
            this.currentUser = null;
            this.userData = null;
            this.authCallbacks = [];
            
            // Cache centralisé avec LRU (Fix Bug #4)
            this.userDataCache = new LRUCache(50);
            this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
            
            console.log('🔥 Firebase Manager Singleton créé - Cache LRU activé');
        }

        // ============= INITIALISATION CENTRALISÉE =============
        
        /**
         * Point d'entrée unique pour initialiser Firebase
         * @returns {Promise<Object|null>} L'objet Firebase ou null
         */
        async initialize() {
            // Si déjà initialisé, retourner immédiatement
            if (this.initialized && this.firebaseAuth) {
                console.log('🔥 Firebase déjà initialisé - utilisation du singleton');
                return this.firebaseAuth;
            }
            
            // Si initialisation en cours, attendre la promesse existante
            if (this.initPromise) {
                console.log('🔥 Firebase en cours d\'initialisation - attente...');
                return this.initPromise;
            }
            
            // Démarrer nouvelle initialisation
            console.log('🔥 Démarrage initialisation Firebase...');
            this.initPromise = this._loadFirebase();
            return this.initPromise;
        }

        /**
         * Charge Firebase avec gestion d'erreurs robuste
         * @private
         */
        async _loadFirebase() {
            this.isLoading = true;
            this.hasError = false;
            
            try {
                console.log('🔥 Chargement modules Firebase...');
                
                // 🔧 FIX CRITIQUE: Configuration Firebase avec optimisations CSP
                const firebaseConfig = {
                    apiKey: "AIzaSyD-0wrtBrV-RyZVtjz6cZgumvsoRIJ07bY",
                    authDomain: "suirodoku-web.firebaseapp.com",
                    projectId: "suirodoku-web",
                    storageBucket: "suirodoku-web.firebasestorage.app",
                    messagingSenderId: "936879624195",
                    appId: "1:936879624195:web:e3d2682df7c9b213d87e36",
                    measurementId: "G-RPJXTCGLZN"
                };
                
                // Import dynamique avec timeout unifié
                const importPromises = [
                    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js'),
                    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'),
                    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'),
                    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js')
                ];
                
                // Timeout unifié plus long pour plus de stabilité
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

                // Initialiser Firebase avec settings optimisés pour CSP
                this.app = initializeApp(firebaseConfig);
                
                // 🔧 FIX CRITIQUE: Simplification Auth pour éviter les erreurs
                console.log('🔧 Configuration Auth simplifiée et robuste...');
                this.auth = getAuth(this.app);
                console.log('✅ Auth initialisé avec configuration standard');
                
                this.db = getFirestore(this.app);
                this.storage = getStorage(this.app);

                // 🔧 FIX CRITIQUE: Configuration Firestore optionnelle
                try {
                    // Tentative de configuration avancée Firestore
                    if (this.db._delegate?.settings) {
                        this.db._delegate.settings({
                            experimentalForceLongPolling: false,
                            experimentalAutoDetectLongPolling: false,
                            ssl: true,
                            cacheSizeBytes: 10485760, // 10MB cache
                        });
                        console.log('✅ Firestore configuré avec settings avancés');
                    } else {
                        console.log('ℹ️ Firestore utilise la configuration par défaut');
                    }
                } catch (error) {
                    console.warn('⚠️ Settings Firestore non appliqués (pas critique):', error.code);
                }

                // Configuration des providers avec gestion d'erreur et optimisation COOP
                let googleProvider = null;
                let facebookProvider = null;
                
                try {
                    googleProvider = new GoogleAuthProvider();
                    googleProvider.addScope('email');
                    googleProvider.addScope('profile');
                    // 🔧 FIX COOP: Configuration optimisée pour les redirects
                    googleProvider.setCustomParameters({ 
                        prompt: 'select_account',
                        // Paramètres optimisés pour Firebase Hosting et COOP
                        redirect_uri: window.location.origin + window.location.pathname
                    });
                    console.log('✅ Google Provider configuré (optimisé COOP)');
                } catch (error) {
                    console.warn('⚠️ Erreur configuration Google Provider:', error);
                }
                
                try {
                    facebookProvider = new FacebookAuthProvider();
                    facebookProvider.addScope('public_profile');
                    facebookProvider.addScope('email');
                    // 🔧 FIX COOP: Configuration optimisée pour les redirects
                    facebookProvider.setCustomParameters({ 
                        display: 'page', // Utiliser 'page' au lieu de 'popup' pour les redirects
                        auth_type: 'rerequest'
                    });
                    console.log('✅ Facebook Provider configuré (optimisé COOP)');
                } catch (error) {
                    console.warn('⚠️ Erreur configuration Facebook Provider:', error);
                }

                // Créer l'objet API unifié
                this.firebaseAuth = {
                    // Core Firebase objects
                    app: this.app,
                    auth: this.auth,
                    db: this.db,
                    storage: this.storage,
                    
                    // Auth methods - signInWithRedirect et getRedirectResult inclus
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
                    
                    // Firestore methods
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
                    
                    // Storage methods
                    ref,
                    uploadBytes,
                    getDownloadURL
                };

                // Configurer l'écoute d'auth state centralisée
                this._setupAuthStateListener();
                
                // Exposer globalement pour compatibilité
                window.firebaseAuth = this.firebaseAuth;
                
                // Marquer comme initialisé
                this.initialized = true;
                this.isLoading = false;
                this.retryCount = 0;
                
                console.log('✅ Firebase Manager initialisé avec succès !');
                return this.firebaseAuth;
                
            } catch (error) {
                console.error('❌ Erreur Firebase Manager:', error);
                
                this.isLoading = false;
                this.hasError = true;
                this.initPromise = null; // Reset pour retry
                
                // Retry automatique avec limite
                if (this.retryCount < this.config.maxRetries) {
                    this.retryCount++;
                    console.log(`🔄 Retry ${this.retryCount}/${this.config.maxRetries} dans ${this.config.retryDelay}ms...`);
                    
                    await this._delay(this.config.retryDelay * this.retryCount);
                    return this.initialize(); // Recursive retry
                }
                
                console.error('🚫 Firebase Manager - Tous les retries échoués');
                return null;
            }
        }

        // ============= GESTION D'AUTHENTIFICATION CENTRALISÉE =============
        
        /**
         * Configure l'écoute d'état d'authentification centralisée
         * @private
         */
        _setupAuthStateListener() {
            const { onAuthStateChanged } = this.firebaseAuth;
            
            // 🔧 FIX CRITIQUE: Vérification redirect simplifiée et sécurisée
            this._checkRedirectResult();
            
            onAuthStateChanged(this.auth, async (user) => {
                console.log('🔥 Auth state change détecté:', user ? user.email : 'déconnecté');
                
                this.currentUser = user;
                
                if (user) {
                    // Charger données utilisateur avec cache
                    this.userData = await this._getUserDataWithCache(user);
                } else {
                    this.userData = null;
                    this._clearUserCache();
                }
                
                // Notifier tous les composants
                this._notifyAuthCallbacks(user, this.userData);
            });
        }

        /**
         * Vérifie le résultat d'une redirection OAuth de façon sécurisée
         * @private
         */
        async _checkRedirectResult() {
            try {
                if (!this.firebaseAuth?.getRedirectResult) return;
                
                // 🔧 FIX COOP: Ajouter un délai pour laisser la page se stabiliser après redirect
                await this._delay(100);
                
                const result = await this.firebaseAuth.getRedirectResult(this.auth);
                if (result && result.user) {
                    console.log('✅ Redirection authentification réussie:', result.user.email);
                    // Nettoyer l'URL si elle contient des paramètres OAuth
                    this._cleanOAuthURL();
                } else {
                    console.log('ℹ️ Aucune redirection OAuth en attente');
                }
            } catch (error) {
                // Les erreurs de redirect sont normales s'il n'y a pas de redirection en cours
                if (error.code === 'auth/argument-error' || 
                    error.code === 'auth/no-auth-event' ||
                    error.code === 'auth/operation-not-allowed') {
                    console.log('ℹ️ Aucune redirection OAuth en cours (normal)');
                } else {
                    console.warn('⚠️ Erreur vérification redirect (non critique):', error.code);
                }
            }
        }

        /**
         * Nettoie l'URL des paramètres OAuth après une redirection réussie
         * @private
         */
        _cleanOAuthURL() {
            try {
                const url = new URL(window.location.href);
                let hasOAuthParams = false;
                
                // Paramètres OAuth courants à nettoyer
                const oauthParams = ['code', 'state', 'scope', 'authuser', 'prompt'];
                
                oauthParams.forEach(param => {
                    if (url.searchParams.has(param)) {
                        url.searchParams.delete(param);
                        hasOAuthParams = true;
                    }
                });
                
                // Mettre à jour l'URL si nécessaire
                if (hasOAuthParams) {
                    window.history.replaceState({}, document.title, url.pathname + url.search);
                    console.log('🧹 URL nettoyée des paramètres OAuth');
                }
            } catch (error) {
                console.warn('⚠️ Erreur nettoyage URL (non critique):', error);
            }
        }

        /**
         * Ajoute un callback d'état d'authentification
         * @param {Function} callback - Fonction à appeler sur changement d'auth
         */
        onAuthStateChanged(callback) {
            if (typeof callback !== 'function') {
                console.warn('⚠️ Callback auth state doit être une fonction');
                return;
            }
            
            this.authCallbacks.push(callback);
            
            // Si déjà initialisé, appeler immédiatement
            if (this.initialized && this.currentUser !== undefined) {
                callback(this.currentUser, this.userData);
            }
            
            console.log(`🔥 Callback auth ajouté - Total: ${this.authCallbacks.length}`);
        }

        /**
         * Supprime un callback d'état d'authentification
         * @param {Function} callback - Fonction à supprimer
         */
        removeAuthCallback(callback) {
            const index = this.authCallbacks.indexOf(callback);
            if (index > -1) {
                this.authCallbacks.splice(index, 1);
                console.log(`🔥 Callback auth supprimé - Total: ${this.authCallbacks.length}`);
            }
        }

        /**
         * Notifie tous les callbacks d'auth state
         * @private
         */
        _notifyAuthCallbacks(user, userData) {
            this.authCallbacks.forEach((callback, index) => {
                try {
                    callback(user, userData);
                } catch (error) {
                    console.error(`❌ Erreur callback auth ${index}:`, error);
                }
            });
        }

        // ============= GESTION DES DONNÉES UTILISATEUR AVEC CACHE LRU =============
        
        /**
         * Récupère les données utilisateur avec cache LRU
         * @private
         */
        async _getUserDataWithCache(user) {
            try {
                if (!user || !user.uid) return user;
                
                // Vérifier le cache LRU
                const cached = this.userDataCache.get(user.uid);
                if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
                    console.log('📋 Données utilisateur depuis le cache LRU');
                    return cached.data;
                }
                
                // Charger depuis Firestore
                const userRef = this.firebaseAuth.doc(this.db, 'users', user.uid);
                const userDoc = await this.firebaseAuth.getDoc(userRef);
                
                let userData;
                if (userDoc.exists()) {
                    userData = { ...user, ...userDoc.data() };
                } else {
                    // 🔧 CORRIGÉ: Créer automatiquement le profil par défaut avec uid
                    console.log('🔧 Création profil par défaut pour:', user.email);
                    const defaultProfile = this.createDefaultProfile(user);
                    
                    // Sauvegarder dans Firestore
                    await this.firebaseAuth.setDoc(userRef, defaultProfile);
                    
                    // Combiner avec les données utilisateur Firebase
                    userData = { ...user, ...defaultProfile };
                    
                    console.log('✅ Profil par défaut créé avec uid pour:', user.email);
                }
                
                // Mettre en cache LRU
                this.userDataCache.set(user.uid, {
                    data: userData,
                    timestamp: Date.now()
                });
                
                console.log('✅ Données utilisateur chargées et mises en cache LRU');
                return userData;
                
            } catch (error) {
                console.error('❌ Erreur _getUserDataWithCache:', error);
                return user;
            }
        }

        /**
         * 🔧 CORRIGÉ: Crée un profil par défaut pour un nouvel utilisateur
         * @param {Object} user - L'objet utilisateur Firebase
         * @returns {Object} - Le profil par défaut
         */
        createDefaultProfile(user) {
            return {
                uid: user.uid,  // 🔧 ESSENTIEL : uid obligatoire pour les règles Firestore
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

        /**
         * Met à jour les données utilisateur avec invalidation cache
         */
        async updateUserData(userId, updateData) {
            try {
                if (!this.firebaseAuth || !this.db) {
                    throw new Error('Firebase non disponible');
                }

                const userRef = this.firebaseAuth.doc(this.db, 'users', userId);
                
                // Ajouter timestamp de mise à jour
                const dataWithTimestamp = {
                    ...updateData,
                    updatedAt: new Date()
                };
                
                await this.firebaseAuth.updateDoc(userRef, dataWithTimestamp);
                
                // Invalider le cache
                this.invalidateUserCache(userId);
                
                console.log('✅ Données utilisateur mises à jour');
                return true;
                
            } catch (error) {
                console.error('❌ Erreur updateUserData:', error);
                throw new Error('Échec de la mise à jour des données utilisateur');
            }
        }

        /**
         * Invalide le cache pour un utilisateur
         */
        invalidateUserCache(userId) {
            this.userDataCache.delete(userId);
            console.log('🗑️ Cache utilisateur invalidé:', userId);
        }

        /**
         * Vide tout le cache utilisateur
         * @private
         */
        _clearUserCache() {
            this.userDataCache.clear();
            console.log('🗑️ Cache utilisateur vidé');
        }

        // ============= MÉTHODES D'AUTHENTIFICATION SÉCURISÉES =============

        /**
         * Authentification Google - Force le redirect pour éviter les problèmes COOP
         */
        async signInWithGoogle() {
            try {
                if (!this.firebaseAuth?.googleProvider) {
                    throw new Error('Google Provider non disponible');
                }

                console.log('🔐 Connexion Google via redirect (optimisé COOP)...');
                
                // 🔧 FIX COOP: Utiliser directement redirect pour éviter les erreurs de politique
                await this.firebaseAuth.signInWithRedirect(this.auth, this.firebaseAuth.googleProvider);
                // Note: cette méthode redirige la page, donc pas de return
                
            } catch (error) {
                console.error('❌ Erreur Google sign-in:', error);
                throw error;
            }
        }

        /**
         * Authentification Facebook - Force le redirect pour éviter les problèmes COOP
         */
        async signInWithFacebook() {
            try {
                if (!this.firebaseAuth?.facebookProvider) {
                    throw new Error('Facebook Provider non disponible');
                }

                console.log('🔐 Connexion Facebook via redirect (optimisé COOP)...');
                
                // 🔧 FIX COOP: Utiliser directement redirect pour éviter les erreurs de politique
                await this.firebaseAuth.signInWithRedirect(this.auth, this.firebaseAuth.facebookProvider);
                // Note: cette méthode redirige la page, donc pas de return
                
            } catch (error) {
                console.error('❌ Erreur Facebook sign-in:', error);
                throw error;
            }
        }

        /**
         * Méthode alternative pour popup (si besoin dans des contextes spéciaux)
         */
        async signInWithGooglePopup() {
            try {
                if (!this.firebaseAuth?.googleProvider) {
                    throw new Error('Google Provider non disponible');
                }

                console.log('🔐 Tentative connexion Google (popup)...');
                const result = await this.firebaseAuth.signInWithPopup(this.auth, this.firebaseAuth.googleProvider);
                console.log('✅ Connexion Google réussie (popup)');
                return result;
                
            } catch (error) {
                console.warn('⚠️ Popup Google bloqué par COOP:', error.code);
                // Fallback automatique vers redirect
                return this.signInWithGoogle();
            }
        }

        /**
         * Méthode alternative pour popup Facebook (si besoin dans des contextes spéciaux)
         */
        async signInWithFacebookPopup() {
            try {
                if (!this.firebaseAuth?.facebookProvider) {
                    throw new Error('Facebook Provider non disponible');
                }

                console.log('🔐 Tentative connexion Facebook (popup)...');
                const result = await this.firebaseAuth.signInWithPopup(this.auth, this.firebaseAuth.facebookProvider);
                console.log('✅ Connexion Facebook réussie (popup)');
                return result;
                
            } catch (error) {
                console.warn('⚠️ Popup Facebook bloqué par COOP:', error.code);
                // Fallback automatique vers redirect
                return this.signInWithFacebook();
            }
        }

        // ============= MÉTHODES PUBLIQUES =============
        
        /**
         * Obtient l'utilisateur actuel
         */
        getCurrentUser() {
            return this.currentUser;
        }

        /**
         * Obtient les données utilisateur actuelles
         */
        getCurrentUserData() {
            return this.userData;
        }

        /**
         * Vérifie si Firebase est initialisé
         */
        isInitialized() {
            return this.initialized;
        }

        /**
         * Vérifie si Firebase est en cours de chargement
         */
        isLoading() {
            return this.isLoading;
        }

        /**
         * Vérifie si Firebase a une erreur
         */
        hasError() {
            return this.hasError;
        }

        /**
         * Force un retry d'initialisation
         */
        async retry() {
            console.log('🔄 Force retry Firebase Manager...');
            this.initialized = false;
            this.initPromise = null;
            this.hasError = false;
            this.retryCount = 0;
            
            return this.initialize();
        }

        /**
         * Déconnexion centralisée avec navigation sécurisée
         */
        async signOut() {
            try {
                if (!this.firebaseAuth || !this.auth) {
                    throw new Error('Firebase non initialisé');
                }
                
                await this.firebaseAuth.signOut(this.auth);
                console.log('✅ Déconnexion réussie via Firebase Manager');
                
                // Navigation sécurisée vers l'accueil
                this.navigateToHome();
                return true;
                
            } catch (error) {
                console.error('❌ Erreur signOut Firebase Manager:', error);
                throw error;
            }
        }

        // ============= NAVIGATION SÉCURISÉE (Fix Bug #9) =============
        
        /**
         * Détecte le niveau de profondeur actuel de manière simplifiée
         * @returns {string} Le préfixe de chemin approprié
         */
        getPathPrefix() {
            const pathname = window.location.pathname;
            
            // Compter les segments réels (pas vides, pas index.html)
            const segments = pathname.split('/').filter(segment => 
                segment !== '' && segment !== 'index.html'
            );
            
            const depth = segments.length;
            const prefix = depth > 0 ? '../'.repeat(depth) : './';
            
            console.log(`📍 Profondeur: ${depth}, Préfixe: "${prefix}"`);
            return prefix;
        }

        /**
         * Navigation sécurisée entre les pages
         * @param {string} page - La page de destination
         */
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
                
                // Validation de sécurité simplifiée
                if (destination.includes('../') && destination.split('../').length > 6) {
                    console.error('🚫 Tentative de navigation non sécurisée bloquée');
                    return;
                }
                
                console.log(`🧭 Navigation: ${page} → ${destination}`);
                window.location.href = destination;
                
            } catch (error) {
                console.error('❌ Erreur de navigation:', error);
                window.location.href = './';
            }
        }

        /**
         * Retour à l'accueil de manière sécurisée
         */
        navigateToHome() {
            try {
                const prefix = this.getPathPrefix();
                const homeUrl = prefix === './' ? './' : prefix.slice(0, -1);
                
                console.log(`🏠 Retour accueil: ${homeUrl}`);
                window.location.href = homeUrl || './';
                
            } catch (error) {
                console.error('❌ Erreur retour accueil:', error);
                window.location.href = './';
            }
        }

        /**
         * Obtient le chemin de navigation pour une page donnée
         * @param {string} page - La page de destination
         * @returns {string} Le chemin complet vers la page
         */
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
                console.log(`🔗 Navigation path: ${page} → ${path}`);
                return path;
                
            } catch (error) {
                console.error('❌ Erreur getNavigationPath:', error);
                return './';
            }
        }

        // ============= FONCTIONS UTILITAIRES =============
        
        /**
         * Obtient le nom d'affichage selon les préférences
         */
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

        /**
         * Obtient l'emoji du drapeau pour un code pays
         */
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

        /**
         * Vérifie si le profil utilisateur est complet
         */
        isProfileComplete(userData) {
            try {
                return userData?.profile?.isProfileComplete === true;
            } catch (error) {
                console.warn('⚠️ Erreur isProfileComplete:', error);
                return false;
            }
        }

        /**
         * Délai asynchrone
         * @private
         */
        _delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Statistiques du cache LRU
         */
        getCacheStats() {
            return {
                size: this.userDataCache.size,
                maxSize: this.userDataCache.maxSize,
                maxAge: this.cacheTimeout
            };
        }

        /**
         * Debug de l'état du manager
         */
        debug() {
            console.group('🔥 Firebase Manager Debug');
            console.log('Initialized:', this.initialized);
            console.log('Loading:', this.isLoading);
            console.log('Has Error:', this.hasError);
            console.log('Retry Count:', this.retryCount);
            console.log('Current User:', this.currentUser);
            console.log('Auth Callbacks:', this.authCallbacks.length);
            console.log('Cache Stats:', this.getCacheStats());
            console.log('Firebase Auth Object:', this.firebaseAuth);
            console.groupEnd();
        }
    }

    // ============= EXPOSITION GLOBALE =============
    
    // Créer l'instance singleton
    window.FirebaseManager = new FirebaseManager();
    
    // Alias pour compatibilité avec l'ancien code
    window.initFirebase = () => window.FirebaseManager.initialize();
    window.signOutUser = () => window.FirebaseManager.signOut();
    window.getUserData = (user) => window.FirebaseManager._getUserDataWithCache(user);
    window.getDisplayName = (userData) => window.FirebaseManager.getDisplayName(userData);
    window.getFlagEmoji = (countryCode) => window.FirebaseManager.getFlagEmoji(countryCode);
    window.isProfileComplete = (userData) => window.FirebaseManager.isProfileComplete(userData);
    window.navigateTo = (page) => window.FirebaseManager.navigateTo(page);
    window.goToHome = () => window.FirebaseManager.navigateToHome();
    window.getNavigationPath = (page) => window.FirebaseManager.getNavigationPath(page);

    // Auto-initialisation pour les pages qui en ont besoin
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

    // Auto-initialisation conditionnelle
    document.addEventListener('DOMContentLoaded', function() {
        if (needsFirebase()) {
            console.log('🔥 Page nécessite Firebase - Auto-initialisation...');
            window.FirebaseManager.initialize().catch(error => {
                console.error('❌ Échec auto-initialisation Firebase Manager:', error);
            });
        } else {
            console.log('ℹ️ Page statique - Firebase Manager en standby');
        }
    });

    // Mode debug en développement
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugFirebaseManager = () => window.FirebaseManager.debug();
        window.retryFirebaseManager = () => window.FirebaseManager.retry();
        window.firebaseManagerStats = () => window.FirebaseManager.getCacheStats();
        console.log('🔧 Mode debug Firebase Manager activé');
        console.log('  - window.debugFirebaseManager() pour débugger');
        console.log('  - window.retryFirebaseManager() pour retry');
        console.log('  - window.firebaseManagerStats() pour stats cache');
    }

    console.log('🔥 Firebase Manager Singleton ready - Optimisé et stable ✅');

})();
