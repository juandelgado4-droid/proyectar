// ═══════════════════════════════════════════════════════════════════════
// EMOTION PHYSICS — Leyes físicas del universo emocional y Vector WorldState
// Convierte el estado de ánimo en fuerzas físicas, gravedad y ambiente
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  const EMOTION_TARGETS = Object.freeze({
    sad:         { life: 0.3, hope: 0.16, decay: 0.74, temperature: 0.28, chaos: 0.14, light: 0.18, fogDensity: 0.010, windSpeed: 0.2, moisture: 0.88, localWarmth: 0.2 },
    dark:        { life: 0.22, hope: 0.1,  decay: 0.84, temperature: 0.2,  chaos: 0.28, light: 0.12, fogDensity: 0.012, windSpeed: 0.28, moisture: 0.58, localWarmth: 0.12 },
    love:        { life: 0.84, hope: 0.82, decay: 0.08, temperature: 0.76, chaos: 0.1,  light: 0.8,  fogDensity: 0.002, windSpeed: 0.28, moisture: 0.52, localWarmth: 0.82 },
    spiritual:   { life: 0.76, hope: 0.9,  decay: 0.06, temperature: 0.62, chaos: 0.08, light: 0.9,  fogDensity: 0.002, windSpeed: 0.34, moisture: 0.42, localWarmth: 0.72 },
    celebration: { life: 0.9,  hope: 0.86, decay: 0.05, temperature: 0.72, chaos: 0.38, light: 0.88, fogDensity: 0.001, windSpeed: 0.48, moisture: 0.38, localWarmth: 0.78 },
    energy:      { life: 0.68, hope: 0.58, decay: 0.22, temperature: 0.7,  chaos: 0.84, light: 0.76, fogDensity: 0.003, windSpeed: 0.82, moisture: 0.3,  localWarmth: 0.62 },
    anger:       { life: 0.38, hope: 0.22, decay: 0.62, temperature: 0.88, chaos: 0.94, light: 0.58, fogDensity: 0.006, windSpeed: 0.9,  moisture: 0.22, localWarmth: 0.78 },
    nostalgia:   { life: 0.48, hope: 0.38, decay: 0.48, temperature: 0.4,  chaos: 0.16, light: 0.34, fogDensity: 0.007, windSpeed: 0.16, moisture: 0.6,  localWarmth: 0.36 },
    neutral:     { life: 0.66, hope: 0.5,  decay: 0.2,  temperature: 0.5,  chaos: 0.18, light: 0.58, fogDensity: 0.003, windSpeed: 0.3,  moisture: 0.5,  localWarmth: 0.5 }
  });

  class EmotionPhysics {
    constructor() {
      // Global WorldState Macro Vector
      this.globalWorldState = {
        life: 0.7,
        hope: 0.5,
        decay: 0.2,
        temperature: 0.5,
        chaos: 0.2,
        light: 0.6
      };

      // Local SceneState Micro Vector
      this.localSceneState = {
        fogDensity: 0.003,
        windSpeed: 0.3,
        moisture: 0.5,
        localWarmth: 0.5
      };
      this._initialWorldState = { ...this.globalWorldState };
      this._targetWorldState = { ...this.globalWorldState };
      this._targetLocalState = { ...this.localSceneState };
    }

    reset(initialWorldState = {}) {
      this._initialWorldState = { ...this.globalWorldState, ...initialWorldState };
      Object.assign(this.globalWorldState, this._initialWorldState);
      this._targetWorldState = { ...this._initialWorldState };
      this._targetLocalState = { fogDensity: 0.003, windSpeed: 0.3, moisture: 0.5, localWarmth: this._initialWorldState.temperature || 0.5 };
      Object.assign(this.localSceneState, this._targetLocalState);
    }

    /**
     * Compute emotional forces based on current emotion and intensity.
     * @param {string} emotion
     * @param {number} intensity
     */
    updateWorldState(emotion, intensity = 0.5, narrativeTarget = null) {
      const amount = Math.max(0, Math.min(1, intensity));
      const profile = EMOTION_TARGETS[emotion] || EMOTION_TARGETS.neutral;
      const blend = (from, to) => from + (to - from) * (0.42 + amount * 0.58);

      for (const key of Object.keys(this.globalWorldState)) {
        const emotional = blend(this._initialWorldState[key], profile[key] ?? this._initialWorldState[key]);
        const narrative = narrativeTarget && Number.isFinite(narrativeTarget[key]) ? narrativeTarget[key] : emotional;
        this._targetWorldState[key] = Math.max(0, Math.min(1, blend(emotional, narrative)));
      }
      for (const key of Object.keys(this.localSceneState)) {
        this._targetLocalState[key] = blend(this.localSceneState[key], profile[key] ?? this.localSceneState[key]);
      }
    }

    update(deltaTime) {
      const alpha = 1 - Math.exp(-Math.max(0, deltaTime) * 1.9);
      for (const key of Object.keys(this.globalWorldState)) {
        this.globalWorldState[key] += (this._targetWorldState[key] - this.globalWorldState[key]) * alpha;
      }
      for (const key of Object.keys(this.localSceneState)) {
        this.localSceneState[key] += (this._targetLocalState[key] - this.localSceneState[key]) * alpha;
      }
    }

    /**
     * Get computed physical forces for particles, camera, and vegetation.
     * @returns {Object} EmotionalForces
     */
    getForces() {
      // Sadness/Decay makes things heavy and bend downwards; Hope makes particles float upwards
      const particleBuoyancy = (this.globalWorldState.hope - this.globalWorldState.decay) * 5.0;
      const cameraWeight = 1.0 + this.globalWorldState.decay * 0.8;
      const vegetationBend = (this.globalWorldState.decay - this.globalWorldState.hope) * 0.4;
      const lightExpansion = this.globalWorldState.light;
      const vegetationSaturation = Math.max(0.18, this.globalWorldState.life * 0.8 + this.globalWorldState.hope * 0.2);

      return {
        particleBuoyancy,
        cameraWeight,
        vegetationBend,
        vegetationSaturation,
        lightExpansion,
        globalState: this.globalWorldState,
        localState: this.localSceneState
      };
    }
  }

  global.SceneEmotionPhysics = EmotionPhysics;
})(typeof window !== 'undefined' ? window : globalThis);
