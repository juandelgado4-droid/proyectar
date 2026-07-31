// ═══════════════════════════════════════════════════════════════════════
// FX COMPOSER — Ensamblador de Efectos, Partículas y Clima con Física Emocional
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class FXComposer {
    constructor(scene, eventBus, particlePool, weatherSystem, emotionPhysics) {
      this.scene = scene;
      this.eventBus = eventBus;
      this.particlePool = particlePool;
      this.weatherSystem = weatherSystem;
      this.emotionPhysics = emotionPhysics;
      this._fxSpec = {};
    }

    compose(fxSpec = {}) {
      this._fxSpec = { ...fxSpec };
      if (this.weatherSystem) {
        this.weatherSystem.setWeather(fxSpec.weatherType || 'clear', fxSpec.intensity || 0.5);
      }
      if (this.particlePool) {
        const desired = new Set((fxSpec.particles || []).map(p => p.type));
        for (const type of this.particlePool.activeTypes.keys()) {
          if (!desired.has(type) && type !== 'rain' && type !== 'snow') this.particlePool.deactivate(type);
        }
        for (const p of fxSpec.particles || []) {
          this.particlePool.activate(p.type, p);
        }
      }
    }

    applyWorldState(forces, fxSpec = {}, deltaTime = 0.016) {
      const state = forces.globalState || {};
      const local = forces.localState || {};
      const weatherType = fxSpec.weatherType || this._fxSpec.weatherType || 'clear';
      const weatherIntensity = Math.max(fxSpec.intensity || 0, local.moisture || 0) * (0.45 + (state.decay || 0) * 0.55);
      if (this.weatherSystem) this.weatherSystem.setWeather(weatherType, weatherIntensity);
      if (this.particlePool) {
        for (const config of fxSpec.particles || []) {
          this.particlePool.activate(config.type, { ...config, intensity: Math.max(config.intensity || 0.3, state.hope || 0.2) });
        }
      }
    }

    update(deltaTime) {
      if (this.emotionPhysics && this.particlePool) {
        const forces = this.emotionPhysics.getForces();
        // Apply buoyancy to active particles vy
        for (const p of this.particlePool.particles) {
          if (p.active) {
            p.vy += forces.particleBuoyancy * deltaTime * 0.1;
            p.vx += (forces.localState.windSpeed - 0.25) * deltaTime * 0.28;
            p.vz += (forces.globalState.chaos - 0.2) * deltaTime * 0.12;
          }
        }
      }
    }

    dispose() {}
  }

  global.SceneFXComposer = FXComposer;
})(typeof window !== 'undefined' ? window : globalThis);
