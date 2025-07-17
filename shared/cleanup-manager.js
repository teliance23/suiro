// ============= SHARED/CLEANUP-MANAGER.JS - MODULE CLEANUP MEMORY LEAKS =============

(function() {
    'use strict';

    // ============= CLEANUP MANAGER CLASS =============

    class CleanupManager {
        constructor() {
            this.eventListeners = [];
            this.timers = [];
            this.intervals = [];
            this.observers = [];
            this.isInitialized = false;
        }
        
        init() {
            if (this.isInitialized) return;
            
            this.setupGlobalEventListeners();
            this.setupPageVisibilityHandling();
            this.setupBeforeUnloadCleanup();
            
            this.isInitialized = true;
            console.log('🧹 Cleanup Manager initialized');
        }
        
        // ============= EVENT LISTENER MANAGEMENT =============
        
        addEventListeners(listeners) {
            listeners.forEach(({ element, event, handler, options }) => {
                element.addEventListener(event, handler, options);
                this.eventListeners.push({ element, event, handler, options });
            });
        }
        
        addSingleEventListener(element, event, handler, options) {
            element.addEventListener(event, handler, options);
            this.eventListeners.push({ element, event, handler, options });
        }
        
        removeEventListener(element, event, handler) {
            element.removeEventListener(event, handler);
            
            // Remove from tracking
            this.eventListeners = this.eventListeners.filter(listener => 
                !(listener.element === element && listener.event === event && listener.handler === handler)
            );
        }
        
        removeAllEventListeners() {
            this.eventListeners.forEach(({ element, event, handler }) => {
                try {
                    element.removeEventListener(event, handler);
                } catch (error) {
                    console.warn('Error removing event listener:', error);
                }
            });
            this.eventListeners = [];
            console.log('🧹 All event listeners removed');
        }
        
        // ============= TIMER MANAGEMENT =============
        
        addTimer(timerId, type = 'timeout') {
            this.timers.push({ id: timerId, type });
            return timerId;
        }
        
        addInterval(intervalId) {
            this.intervals.push(intervalId);
            return intervalId;
        }
        
        clearTimer(timerId) {
            clearTimeout(timerId);
            clearInterval(timerId);
            
            this.timers = this.timers.filter(timer => timer.id !== timerId);
            this.intervals = this.intervals.filter(id => id !== timerId);
        }
        
        clearAllTimers() {
            // Clear all timeouts and intervals
            this.timers.forEach(timer => {
                try {
                    if (timer.type === 'interval') {
                        clearInterval(timer.id);
                    } else {
                        clearTimeout(timer.id);
                    }
                } catch (error) {
                    console.warn('Error clearing timer:', error);
                }
            });
            
            this.intervals.forEach(intervalId => {
                try {
                    clearInterval(intervalId);
                } catch (error) {
                    console.warn('Error clearing interval:', error);
                }
            });
            
            this.timers = [];
            this.intervals = [];
            console.log('🧹 All timers cleared');
        }
        
        // ============= OBSERVER MANAGEMENT =============
        
        addObserver(observer, type = 'mutation') {
            this.observers.push({ observer, type });
        }
        
        clearAllObservers() {
            this.observers.forEach(({ observer, type }) => {
                try {
                    if (observer && typeof observer.disconnect === 'function') {
                        observer.disconnect();
                    }
                } catch (error) {
                    console.warn('Error disconnecting observer:', error);
                }
            });
            this.observers = [];
            console.log('🧹 All observers disconnected');
        }
        
        // ============= CACHE MANAGEMENT =============
        
        cleanupGameCache() {
            // Clear large game state caches
            if (window.gameState && window.gameState.notes) {
                const notesCount = Object.keys(window.gameState.notes).length;
                if (notesCount > 100) {
                    window.gameState.notes = {};
                    console.log(`🧹 Cleared ${notesCount} notes from cache`);
                }
            }
            
            // Clear Firebase cache if too large
            if (window.FirebaseManager && typeof window.FirebaseManager.getCacheStats === 'function') {
                const cacheStats = window.FirebaseManager.getCacheStats();
                if (cacheStats.size > 30) {
                    // Let Firebase Manager handle its own cleanup
                    console.log('🧹 Firebase cache size:', cacheStats.size);
                }
            }
        }
        
        // ============= DOM CLEANUP =============
        
        cleanupDOMElements() {
            // Remove orphaned toast notifications
            const orphanedToasts = document.querySelectorAll('.auth-utils-toast, .achievement-toast, .stats-toast');
            orphanedToasts.forEach(toast => {
                if (toast.parentNode) {
                    toast.remove();
                }
            });
            
            // Remove temporary modals that might be left behind
            const temporaryModals = document.querySelectorAll('.mode-selection-modal, .defeat-modal[id^="temp-"]');
            temporaryModals.forEach(modal => {
                if (modal.parentNode) {
                    modal.remove();
                }
            });
            
            if (orphanedToasts.length > 0 || temporaryModals.length > 0) {
                console.log(`🧹 Cleaned up ${orphanedToasts.length + temporaryModals.length} DOM elements`);
            }
        }
        
        // ============= GLOBAL EVENT HANDLERS =============
        
        setupGlobalEventListeners() {
            // Keyboard cleanup
            const keyboardHandler = (e) => {
                // Handle Escape key for modal cleanup
                if (e.key === 'Escape') {
                    this.cleanupModalStates();
                }
            };
            
            this.addSingleEventListener(document, 'keydown', keyboardHandler);
        }
        
        setupPageVisibilityHandling() {
            const visibilityHandler = () => {
                if (document.hidden) {
                    // Page hidden - pause timers and cleanup
                    this.pauseNonEssentialTimers();
                } else {
                    // Page visible - resume if needed
                    this.resumeNonEssentialTimers();
                }
            };
            
            this.addSingleEventListener(document, 'visibilitychange', visibilityHandler);
        }
        
        setupBeforeUnloadCleanup() {
            const beforeUnloadHandler = (e) => {
                this.performFullCleanup();
                
                // Don't prevent page unload, just cleanup
                return undefined;
            };
            
            this.addSingleEventListener(window, 'beforeunload', beforeUnloadHandler);
        }
        
        // ============= CLEANUP UTILITIES =============
        
        cleanupModalStates() {
            // Close any open modals
            const openModals = document.querySelectorAll('.modal-overlay.show, .mode-selection-modal.show');
            openModals.forEach(modal => {
                modal.classList.remove('show');
            });
        }
        
        pauseNonEssentialTimers() {
            // This would pause game timers when page is hidden
            if (window.gameState && window.gameState.isPlaying) {
                window.gameState.isPaused = true;
            }
        }
        
        resumeNonEssentialTimers() {
            // Resume game timers when page is visible
            if (window.gameState && window.gameState.isPlaying && window.gameState.isPaused) {
                window.gameState.isPaused = false;
            }
        }
        
        // ============= MAIN CLEANUP METHODS =============
        
        performRoutineCleanup() {
            this.cleanupGameCache();
            this.cleanupDOMElements();
            console.log('🧹 Routine cleanup completed');
        }
        
        performFullCleanup() {
            try {
                this.clearAllTimers();
                this.removeAllEventListeners();
                this.clearAllObservers();
                this.cleanupGameCache();
                this.cleanupDOMElements();
                this.cleanupModalStates();
                
                console.log('🧹 Full cleanup completed - Memory leaks prevented');
            } catch (error) {
                console.error('Error during cleanup:', error);
            }
        }
        
        // ============= STATUS AND DEBUGGING =============
        
        getStatus() {
            return {
                eventListeners: this.eventListeners.length,
                timers: this.timers.length,
                intervals: this.intervals.length,
                observers: this.observers.length,
                isInitialized: this.isInitialized
            };
        }
        
        debugInfo() {
            const status = this.getStatus();
            console.group('🧹 Cleanup Manager Status');
            console.log('Event Listeners:', status.eventListeners);
            console.log('Timers:', status.timers);
            console.log('Intervals:', status.intervals);
            console.log('Observers:', status.observers);
            console.log('Initialized:', status.isInitialized);
            console.groupEnd();
        }
    }

    // ============= GLOBAL CLEANUP UTILITIES =============

    // Helper function to create a safe interval that auto-cleans
    function createSafeInterval(callback, delay) {
        const intervalId = setInterval(callback, delay);
        
        if (window.cleanupManager) {
            window.cleanupManager.addInterval(intervalId);
        }
        
        return intervalId;
    }

    // Helper function to create a safe timeout that auto-cleans
    function createSafeTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
            callback();
            // Auto-remove from cleanup tracking after execution
            if (window.cleanupManager) {
                window.cleanupManager.clearTimer(timeoutId);
            }
        }, delay);
        
        if (window.cleanupManager) {
            window.cleanupManager.addTimer(timeoutId, 'timeout');
        }
        
        return timeoutId;
    }

    // Helper function to add a safe event listener
    function addSafeEventListener(element, event, handler, options) {
        element.addEventListener(event, handler, options);
        
        if (window.cleanupManager) {
            window.cleanupManager.addSingleEventListener(element, event, handler, options);
        }
        
        return { element, event, handler };
    }

    // ============= EXPOSE GLOBALLY =============

    // Create global instance
    window.CleanupManager = CleanupManager;
    window.cleanupManager = new CleanupManager();

    // Expose utility functions
    window.createSafeInterval = createSafeInterval;
    window.createSafeTimeout = createSafeTimeout;
    window.addSafeEventListener = addSafeEventListener;

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.cleanupManager.init();
        });
    } else {
        window.cleanupManager.init();
    }

    // Setup routine cleanup every 5 minutes
    setInterval(() => {
        if (window.cleanupManager) {
            window.cleanupManager.performRoutineCleanup();
        }
    }, 5 * 60 * 1000);

    console.log('✅ Cleanup Manager module loaded successfully');

})();