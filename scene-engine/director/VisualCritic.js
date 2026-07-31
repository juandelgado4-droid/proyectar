// ═══════════════════════════════════════════════════════════════════════
// VISUAL CRITIC — Director Crítico y Bucle de Autoevaluación pre-renderizado
// Evalúa variedad, equilibrio estético y coherencia comunicativa
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class VisualCritic {
    constructor() {
      this._lastShotConfig = null;
    }

    /**
     * Evaluate a proposed VisualScript shot before rendering.
     * @param {Object} shotConfig - Proposed shot config from VisualReasoner
     * @returns {{ approved: boolean, score: number, adjustmentHint: string|null }}
     */
    evaluateShot(shotConfig) {
      if (!shotConfig) {
        return { approved: true, score: 1.0, adjustmentHint: null };
      }

      let score = 1.0;
      let hint = null;

      // Check variety and whether the script actually communicates a distinct idea.
      if (this._lastShotConfig) {
        const sameCamera = this._lastShotConfig.cameraConfig && shotConfig.cameraConfig &&
          this._lastShotConfig.cameraConfig.shot === shotConfig.cameraConfig.shot &&
          this._lastShotConfig.cameraConfig.movement === shotConfig.cameraConfig.movement;
        const sameLight = this._lastShotConfig.lighting && shotConfig.lighting &&
          this._lastShotConfig.lighting.preset === shotConfig.lighting.preset;
        const sameComposition = this._lastShotConfig.composition && shotConfig.composition &&
          this._lastShotConfig.composition.type === shotConfig.composition.type;
        if (sameCamera && sameLight && sameComposition) {
          score -= 0.35;
          hint = 'Shot repeats its camera, light and composition; introduce a new visual beat.';
        }
      }

      if (!shotConfig.symbolicProps || shotConfig.symbolicProps.length === 0) {
        score -= 0.2;
        hint = hint || 'The shot has no visible symbol for its lyrical meaning.';
      }
      if (!shotConfig.cameraConfig || !shotConfig.lighting || !shotConfig.worldState) {
        score -= 0.3;
        hint = hint || 'The visual script is incomplete.';
      }

      this._lastShotConfig = shotConfig;

      const approved = score >= 0.7;

      return {
        approved,
        score,
        adjustmentHint: hint
      };
    }

    reviseShot(shotConfig, evaluation) {
      if (!shotConfig || !evaluation || evaluation.approved) return shotConfig;
      const camera = shotConfig.cameraConfig || {};
      const alternateShots = { WIDE: 'MEDIUM', MEDIUM: 'CLOSE_UP', CLOSE_UP: 'WIDE', EXTREME_CLOSE: 'MEDIUM', LOW_ANGLE: 'WIDE' };
      camera.shot = alternateShots[camera.shot] || 'MEDIUM';
      camera.distance = Math.max(28, (camera.distance || 120) * (camera.shot === 'WIDE' ? 1.28 : 0.72));
      camera.movement = camera.movement === 'dolly_in' ? 'lateral_track' : 'dolly_in';
      shotConfig.cameraConfig = camera;
      if (shotConfig.lighting) shotConfig.lighting.silhouette = !shotConfig.lighting.silhouette;
      return shotConfig;
    }

    reset() {
      this._lastShotConfig = null;
    }
  }

  global.SceneVisualCritic = VisualCritic;
})(typeof window !== 'undefined' ? window : globalThis);
