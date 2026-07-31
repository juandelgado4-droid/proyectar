// ═══════════════════════════════════════════════════════════════════════
// WEATHER SYSTEM — Sistema de clima (niebla, lluvia, nieve, etc.)
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class WeatherSystem {
    constructor(scene, eventBus, particlePool) {
      this.scene = scene;
      this.eventBus = eventBus;
      this.particlePool = particlePool;
      this.currentWeather = 'clear';
      this.currentIntensity = 0;

      if (this.eventBus) {
        this.eventBus.on('WeatherChange', data => this.setWeather(data.type, data.intensity));
      }
    }

    setWeather(type, intensity = 0.5) {
      const changedType = this.currentWeather !== type;
      this.currentWeather = type;
      this.currentIntensity = Math.max(0, Math.min(1, intensity));

      // Deactivate rain/snow from particle pool if switching away
      if (this.particlePool && changedType) {
        if (type === 'rain') {
          this.particlePool.activate('rain', { intensity });
          this.particlePool.deactivate('snow');
        } else if (type === 'snow') {
          this.particlePool.activate('snow', { intensity });
          this.particlePool.deactivate('rain');
        } else {
          this.particlePool.deactivate('rain');
          this.particlePool.deactivate('snow');
        }
      }

      // Adjust fog based on weather
      if (!this.scene.fog) this.scene.fog = new THREE.FogExp2(0x15202b, 0.003);
      if (type === 'fog' || type === 'mist') {
        this.scene.fog.density = 0.004 + 0.009 * this.currentIntensity;
      } else if (type === 'storm') {
        this.scene.fog.density = 0.007 + 0.008 * this.currentIntensity;
      } else {
        this.scene.fog.density = 0.002 + (type === 'rain' ? 0.003 * this.currentIntensity : 0);
      }
    }

    update(deltaTime) {}

    dispose() {}
  }

  global.SceneWeatherSystem = WeatherSystem;
})(typeof window !== 'undefined' ? window : globalThis);
