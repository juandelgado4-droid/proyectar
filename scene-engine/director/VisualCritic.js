// VISUAL CRITIC - Short-term shot memory and bounded self-correction.
(function (global) {
  'use strict';

  const SHOT_OPTIONS = ['WIDE', 'MEDIUM', 'CLOSE_UP', 'LOW_ANGLE', 'BIRDS_EYE', 'EXTREME_CLOSE'];
  const MOVEMENT_OPTIONS = ['static_breath', 'dolly_in', 'lateral_track', 'arc', 'crane_rise', 'follow'];

  class VisualCritic {
    constructor() { this._history = []; }

    evaluateShot(shotConfig) {
      if (!shotConfig) return { approved: true, score: 1, adjustmentHint: null };
      let score = 1;
      let hint = null;
      const recent = this._history.slice(-4);
      const camera = shotConfig.cameraConfig || {};
      const sameFraming = recent.filter(previous => previous.cameraConfig && previous.cameraConfig.shot === camera.shot).length;
      const sameMovement = recent.filter(previous => previous.cameraConfig && previous.cameraConfig.movement === camera.movement).length;
      const sameLighting = recent.filter(previous => previous.lighting && shotConfig.lighting && previous.lighting.preset === shotConfig.lighting.preset).length;
      const sameBiome = recent.filter(previous => previous.biome && shotConfig.biome && previous.biome.id === shotConfig.biome.id).length;
      if (sameFraming >= 2) { score -= 0.3; hint = 'Recent framing is overused.'; }
      if (sameMovement >= 2) { score -= 0.16; hint = hint || 'Recent camera movement is overused.'; }
      if (sameLighting >= 3 && sameBiome >= 3 && shotConfig.dramaticPurpose !== 'contemplation') {
        score -= 0.16; hint = hint || 'The visual beat needs a lighting contrast.';
      }
      if (!shotConfig.symbolicProps || !shotConfig.symbolicProps.length) { score -= 0.2; hint = hint || 'The shot needs a visible lyrical symbol.'; }
      if (!shotConfig.cameraConfig || !shotConfig.lighting || !shotConfig.worldState) { score -= 0.3; hint = hint || 'The visual script is incomplete.'; }
      return { approved: score >= 0.7, score, adjustmentHint: hint };
    }

    reviseShot(shotConfig, evaluation) {
      if (!shotConfig || !evaluation || evaluation.approved) return shotConfig;
      const camera = { ...(shotConfig.cameraConfig || {}) };
      const shotCounts = this._counts('shot');
      const movementCounts = this._counts('movement');
      const shotCandidates = SHOT_OPTIONS.filter(option => option !== camera.shot);
      const movementCandidates = MOVEMENT_OPTIONS.filter(option => option !== camera.movement);
      camera.shot = this._leastUsed(shotCandidates, shotCounts, 'MEDIUM');
      camera.movement = this._leastUsed(movementCandidates, movementCounts, 'follow');
      const framing = global.SceneCameraDirector && global.SceneCameraDirector.SHOTS && global.SceneCameraDirector.SHOTS[camera.shot];
      camera.distance = framing ? framing.distance : Math.max(28, (camera.distance || 120) * 0.82);
      camera.height = framing ? framing.height : camera.height;
      camera.fov = framing ? framing.fov : camera.fov;
      shotConfig.cameraConfig = camera;
      if (shotConfig.lighting && evaluation.adjustmentHint && evaluation.adjustmentHint.includes('lighting')) {
        shotConfig.lighting.silhouette = !shotConfig.lighting.silhouette;
      }
      return shotConfig;
    }

    commitShot(shotConfig) {
      if (!shotConfig) return;
      this._history.push(shotConfig);
      if (this._history.length > 6) this._history.shift();
    }

    _counts(key) {
      return this._history.reduce((counts, shot) => {
        const value = shot.cameraConfig && shot.cameraConfig[key];
        if (value) counts[value] = (counts[value] || 0) + 1;
        return counts;
      }, {});
    }

    _leastUsed(candidates, counts, fallback) {
      return candidates.sort((left, right) => (counts[left] || 0) - (counts[right] || 0))[0] || fallback;
    }

    reset() { this._history = []; }
  }

  global.SceneVisualCritic = VisualCritic;
})(typeof window !== 'undefined' ? window : globalThis);
