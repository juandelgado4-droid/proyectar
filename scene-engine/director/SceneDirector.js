// ═══════════════════════════════════════════════════════════════════════
// SCENE DIRECTOR — Director de escena
// Interpola el Timeline y despacha acciones a los subsistemas cada frame
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class SceneDirector {
    constructor(eventBus) {
      this._eventBus = eventBus;
      this._timeline = null;
      this._lastActiveEvents = {};
    }

    setTimeline(timeline) {
      this._timeline = timeline;
      this._lastActiveEvents = {};
    }

    /**
     * Update current state from timeline at current position.
     * @param {number} positionMs
     */
    update(positionMs) {
      if (!this._timeline) return;

      const activeEvents = this._timeline.getAllActiveEvents(positionMs);

      for (const [trackName, event] of Object.entries(activeEvents)) {
        if (!event) continue;

        // Check if event is new or changed
        const prevEvent = this._lastActiveEvents[trackName];
        const isNew = !prevEvent || prevEvent !== event;

        if (isNew) {
          this._lastActiveEvents[trackName] = event;
          this._dispatchAction(trackName, event, positionMs);
        }
      }

      if (this._eventBus) {
        this._eventBus.emit(global.SceneEventBus.Events.POSITION_UPDATE, { positionMs });
      }
    }

    _dispatchAction(trackName, event, positionMs) {
      if (!this._eventBus) return;

      const { action, data } = event;

      switch (action) {
        case 'setEmotion':
          this._eventBus.emit(global.SceneEventBus.Events.EMOTION_CHANGED, data);
          break;
        case 'setScene':
          this._eventBus.emit(global.SceneEventBus.Events.SCENE_CHANGED, data);
          break;
        case 'setLighting':
          // Handled via event
          this._eventBus.emit('LightingChange', data);
          break;
        case 'setWeather':
          this._eventBus.emit('WeatherChange', data);
          break;
        case 'setParticles':
          this._eventBus.emit(global.SceneEventBus.Events.PARTICLE_STARTED, data);
          break;
        case 'setCharacters':
          this._eventBus.emit(global.SceneEventBus.Events.ANIMATION_STARTED, data);
          break;
        case 'setCamera':
          this._eventBus.emit('CameraChange', data);
          break;
      }
    }

    reset() {
      this._timeline = null;
      this._lastActiveEvents = {};
    }
  }

  global.SceneDirector = SceneDirector;
})(typeof window !== 'undefined' ? window : globalThis);
