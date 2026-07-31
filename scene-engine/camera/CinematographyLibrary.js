// ═══════════════════════════════════════════════════════════════════════
// CINEMATOGRAPHY LIBRARY — Biblioteca de lenguaje cinematográfico
// Maps camera angles and shots to narrative purposes and emotional effects
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  const LANGUAGE = Object.freeze({
    WIDE: {
      narrativePurpose: 'convey_isolation_or_grandeur',
      emotionalEffect: 'solitude_and_contemplation',
      distance: 220, height: 40, fov: 60
    },
    MEDIUM: {
      narrativePurpose: 'establish_relationship_and_action',
      emotionalEffect: 'engagement_and_narrative_flow',
      distance: 120, height: 25, fov: 50
    },
    CLOSE_UP: {
      narrativePurpose: 'focus_on_intimate_emotion',
      emotionalEffect: 'vulnerability_and_revelation',
      distance: 60, height: 15, fov: 40
    },
    EXTREME_CLOSE: {
      narrativePurpose: 'highlight_symbolic_detail',
      emotionalEffect: 'intensity_and_realization',
      distance: 30, height: 10, fov: 35
    },
    HIGH_ANGLE: {
      narrativePurpose: 'emphasize_fragility_or_fate',
      emotionalEffect: 'smallness_and_destiny',
      distance: 180, height: 120, fov: 65
    },
    LOW_ANGLE: {
      narrativePurpose: 'project_power_or_overwhelming_presence',
      emotionalEffect: 'awe_and_dominance',
      distance: 90, height: 4, fov: 55
    }
  });

  class CinematographyLibrary {
    /**
     * Get recommended shot configuration based on dramatic purpose.
     * @param {string} purpose - 'isolation', 'intimacy', 'power', 'fragility', 'climax'
     * @returns {Object} Shot Language entry
     */
    static getShotForPurpose(purpose) {
      switch (purpose) {
        case 'isolation':
        case 'convey_profound_isolation':
          return LANGUAGE.WIDE;
        case 'intimacy':
        case 'vulnerability':
          return LANGUAGE.CLOSE_UP;
        case 'power':
        case 'overwhelming':
          return LANGUAGE.LOW_ANGLE;
        case 'fragility':
        case 'smallness':
          return LANGUAGE.HIGH_ANGLE;
        case 'climax':
        case 'realization':
          return LANGUAGE.EXTREME_CLOSE;
        default:
          return LANGUAGE.MEDIUM;
      }
    }

    static get LANGUAGE() {
      return LANGUAGE;
    }
  }

  global.SceneCinematographyLibrary = CinematographyLibrary;
})(typeof window !== 'undefined' ? window : globalThis);
