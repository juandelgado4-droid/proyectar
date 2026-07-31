// ═══════════════════════════════════════════════════════════════════════
// NARRATIVE MEMORY — Registro de hitos y acontecimientos de la historia
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class NarrativeMemory {
    constructor() {
      this._history = [];
      this._milestones = new Map();
    }

    reset() {
      this._history = [];
      this._milestones.clear();
    }

    /**
     * Record a narrative milestone event.
     * @param {number} timeMs
     * @param {string} eventName - e.g., 'solitude_start', 'encounter', 'conflict', 'climax', 'reconciliation'
     * @param {Object} details
     */
    recordEvent(timeMs, eventName, details = {}) {
      const entry = { timeMs, eventName, details: { ...details } };
      this._history.push(entry);
      this._history.sort((a, b) => a.timeMs - b.timeMs);
      this._milestones.set(eventName, entry);
    }

    /**
     * Check if a specific milestone has occurred before a given time.
     * @param {string} eventName
     * @param {number} posMs
     * @returns {boolean}
     */
    hasOccurredBefore(eventName, posMs) {
      const entry = this._milestones.get(eventName);
      return !!(entry && entry.timeMs <= posMs);
    }

    /**
     * Get the latest milestone before a given time.
     * @param {number} posMs
     * @returns {Object|null}
     */
    getLastEventBefore(posMs) {
      let last = null;
      for (const entry of this._history) {
        if (entry.timeMs <= posMs) {
          last = entry;
        } else {
          break;
        }
      }
      return last;
    }

    getHistory() {
      return this._history;
    }

    getRecent(limit = 3) {
      return this._history.slice(Math.max(0, this._history.length - limit));
    }

    hasSymbolBefore(symbol, posMs) {
      return this._history.some(entry => entry.timeMs <= posMs &&
        Array.isArray(entry.details.symbolicProps) && entry.details.symbolicProps.includes(symbol));
    }
  }

  global.SceneNarrativeMemory = NarrativeMemory;
})(typeof window !== 'undefined' ? window : globalThis);
