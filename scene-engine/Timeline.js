// ═══════════════════════════════════════════════════════════════════════
// TIMELINE — Sistema de timeline con tracks, events y actions
// Inspirado en Unity Timeline para organización temporal de escenas
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  /**
   * A single event on a timeline track.
   */
  class TimelineEvent {
    /**
     * @param {number} timeMs      - Start time in milliseconds
     * @param {number} durationMs  - Duration in milliseconds
     * @param {string} action      - Action identifier (e.g., 'setEmotion', 'setScene')
     * @param {Object} data        - Payload for the action
     */
    constructor(timeMs, durationMs, action, data = {}) {
      this.timeMs = timeMs;
      this.durationMs = durationMs;
      this.endMs = timeMs + durationMs;
      this.action = action;
      this.data = data;
    }

    /**
     * Get normalized progress within this event (0-1).
     * @param {number} posMs
     * @returns {number}
     */
    getProgress(posMs) {
      if (this.durationMs <= 0) return 1;
      return Math.max(0, Math.min(1, (posMs - this.timeMs) / this.durationMs));
    }

    /**
     * Check if position is within this event.
     * @param {number} posMs
     * @returns {boolean}
     */
    isActive(posMs) {
      return posMs >= this.timeMs && posMs < this.endMs;
    }
  }

  /**
   * A named track containing ordered events.
   * Examples: 'emotion', 'scene', 'camera', 'particles', 'weather', 'lighting', 'characters'
   */
  class TimelineTrack {
    /**
     * @param {string} name - Track name
     */
    constructor(name) {
      this.name = name;
      this._events = [];
      this._sorted = true;
    }

    /**
     * Add an event to this track.
     * @param {TimelineEvent} event
     */
    addEvent(event) {
      this._events.push(event);
      this._sorted = false;
    }

    /** Ensure events are sorted by time. */
    _ensureSorted() {
      if (!this._sorted) {
        this._events.sort((a, b) => a.timeMs - b.timeMs);
        this._sorted = true;
      }
    }

    /**
     * Get the active event at a given time (binary search).
     * @param {number} posMs
     * @returns {TimelineEvent|null}
     */
    getActiveEvent(posMs) {
      this._ensureSorted();
      const events = this._events;
      let low = 0, high = events.length - 1, result = null;

      while (low <= high) {
        const mid = (low + high) >> 1;
        if (posMs >= events[mid].timeMs) {
          result = events[mid];
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      // Check if the found event is still active (within duration)
      if (result && posMs < result.endMs) {
        return result;
      }
      // If past end, return last event that started before posMs (for sustained states)
      return result || null;
    }

    /**
     * Get upcoming events within a lookahead window.
     * @param {number} posMs
     * @param {number} lookAheadMs
     * @returns {TimelineEvent[]}
     */
    getUpcoming(posMs, lookAheadMs) {
      this._ensureSorted();
      const result = [];
      const endMs = posMs + lookAheadMs;

      for (const evt of this._events) {
        if (evt.timeMs > endMs) break;
        if (evt.timeMs > posMs) {
          result.push(evt);
        }
      }
      return result;
    }

    /**
     * Get the next event after a given time.
     * @param {number} posMs
     * @returns {TimelineEvent|null}
     */
    getNextEvent(posMs) {
      this._ensureSorted();
      for (const evt of this._events) {
        if (evt.timeMs > posMs) return evt;
      }
      return null;
    }

    /**
     * Get all events in this track.
     * @returns {TimelineEvent[]}
     */
    getEvents() {
      this._ensureSorted();
      return this._events;
    }

    /** Clear all events. */
    clear() {
      this._events.length = 0;
      this._sorted = true;
    }
  }

  /**
   * Main Timeline — collection of named tracks.
   */
  class Timeline {
    constructor() {
      this._tracks = new Map();
    }

    /**
     * Add or get a track by name.
     * @param {string} name
     * @returns {TimelineTrack}
     */
    addTrack(name) {
      if (!this._tracks.has(name)) {
        this._tracks.set(name, new TimelineTrack(name));
      }
      return this._tracks.get(name);
    }

    /**
     * Get a track by name.
     * @param {string} name
     * @returns {TimelineTrack|null}
     */
    getTrack(name) {
      return this._tracks.get(name) || null;
    }

    /**
     * Get all active events across all tracks at a given time.
     * @param {number} posMs
     * @returns {Object} Map of trackName → activeEvent
     */
    getAllActiveEvents(posMs) {
      const result = {};
      for (const [name, track] of this._tracks) {
        const evt = track.getActiveEvent(posMs);
        if (evt) result[name] = evt;
      }
      return result;
    }

    /**
     * Get duration of the entire timeline.
     * @returns {number} ms
     */
    getDuration() {
      let max = 0;
      for (const track of this._tracks.values()) {
        const events = track.getEvents();
        if (events.length > 0) {
          const last = events[events.length - 1];
          max = Math.max(max, last.endMs);
        }
      }
      return max;
    }

    /** Clear all tracks. */
    clear() {
      for (const track of this._tracks.values()) {
        track.clear();
      }
      this._tracks.clear();
    }
  }

  // ─── Track name constants ───
  Timeline.Tracks = Object.freeze({
    EMOTION:    'emotion',
    SCENE:      'scene',
    CAMERA:     'camera',
    CHARACTERS: 'characters',
    PARTICLES:  'particles',
    WEATHER:    'weather',
    LIGHTING:   'lighting',
    BEAT:       'beat'
  });

  global.SceneTimeline = Timeline;
  global.SceneTimelineTrack = TimelineTrack;
  global.SceneTimelineEvent = TimelineEvent;
})(typeof window !== 'undefined' ? window : globalThis);
