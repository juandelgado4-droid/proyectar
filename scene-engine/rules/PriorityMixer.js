// ═══════════════════════════════════════════════════════════════════════
// PRIORITY MIXER — Mezcla múltiples emociones según prioridades
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  // Base priorities for emotions (higher number = higher priority)
  const EMOTION_PRIORITIES = Object.freeze({
    love:        100,
    sad:         90,
    dark:        85,
    energy:      80,
    celebration: 75,
    anger:       70,
    spiritual:   65,
    nostalgia:   60,
    nature:      50,
    neutral:     10
  });

  class PriorityMixer {
    constructor() {}

    /**
     * Blend raw scores using weights and priorities.
     * @param {Object} rawScores - { love: 0.8, sad: 0.2, ... }
     * @returns {{ primary: { emotion: string, weight: number }, secondary: { emotion: string, weight: number }|null, blendFactor: number }}
     */
    mix(rawScores) {
      if (!rawScores) {
        return { primary: { emotion: 'neutral', weight: 1 }, secondary: null, blendFactor: 0 };
      }

      const weighted = [];

      for (const [emotion, score] of Object.entries(rawScores)) {
        if (score <= 0) continue;
        const priority = EMOTION_PRIORITIES[emotion] || 10;
        const weightedScore = score * (priority / 100);
        weighted.push({ emotion, score, priority, weightedScore });
      }

      if (weighted.length === 0) {
        return { primary: { emotion: 'neutral', weight: 1 }, secondary: null, blendFactor: 0 };
      }

      weighted.sort((a, b) => b.weightedScore - a.weightedScore);

      const primary = {
        emotion: weighted[0].emotion,
        weight: weighted[0].weightedScore
      };

      let secondary = null;
      let blendFactor = 0;

      if (weighted.length > 1 && weighted[1].weightedScore > 0.15) {
        secondary = {
          emotion: weighted[1].emotion,
          weight: weighted[1].weightedScore
        };
        const total = primary.weight + secondary.weight;
        blendFactor = total > 0 ? secondary.weight / total : 0;
      }

      return { primary, secondary, blendFactor };
    }

    static get PRIORITIES() {
      return EMOTION_PRIORITIES;
    }
  }

  global.ScenePriorityMixer = PriorityMixer;
})(typeof window !== 'undefined' ? window : globalThis);
