// ═══════════════════════════════════════════════════════════════════════
// EVENT BUS — Sistema pub/sub desacoplado para Scene Engine
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class EventBus {
    constructor() {
      this._listeners = new Map();
    }

    /**
     * Subscribe to an event.
     * @param {string} event
     * @param {Function} callback
     * @returns {Function} unsubscribe function
     */
    on(event, callback) {
      if (!this._listeners.has(event)) {
        this._listeners.set(event, new Set());
      }
      this._listeners.get(event).add(callback);
      return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event (fires only once).
     * @param {string} event
     * @param {Function} callback
     */
    once(event, callback) {
      const wrapper = (data) => {
        this.off(event, wrapper);
        callback(data);
      };
      this.on(event, wrapper);
    }

    /**
     * Unsubscribe from an event.
     * @param {string} event
     * @param {Function} callback
     */
    off(event, callback) {
      const set = this._listeners.get(event);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this._listeners.delete(event);
      }
    }

    /**
     * Emit an event synchronously.
     * @param {string} event
     * @param {*} data
     */
    emit(event, data) {
      const set = this._listeners.get(event);
      if (!set) return;
      for (const cb of set) {
        try {
          cb(data);
        } catch (e) {
          console.error(`[EventBus] Error in handler for "${event}":`, e);
        }
      }
    }

    /** Remove all listeners. */
    clear() {
      this._listeners.clear();
    }
  }

  // ─── Event name constants ───
  EventBus.Events = Object.freeze({
    SONG_LOADED:        'SongLoaded',
    LYRICS_PARSED:      'LyricsParsed',
    ANALYSIS_COMPLETE:  'AnalysisComplete',
    NARRATIVE_COMPLETE: 'NarrativeComplete',
    TIMELINE_READY:     'TimelineReady',
    BEAT_DETECTED:      'BeatDetected',
    EMOTION_CHANGED:    'EmotionChanged',
    SCENE_CHANGED:      'SceneChanged',
    ANIMATION_STARTED:  'AnimationStarted',
    PARTICLE_STARTED:   'ParticleStarted',
    POSITION_UPDATE:    'PositionUpdate',
    CLEANUP:            'Cleanup'
  });

  global.SceneEventBus = EventBus;
})(typeof window !== 'undefined' ? window : globalThis);
