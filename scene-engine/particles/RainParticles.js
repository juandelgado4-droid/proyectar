// ═══════════════════════════════════════════════════════════════════════
// RAIN PARTICLES — Lluvia 3D
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class RainParticles {
    spawn(p, config = {}) {
      p.active = true;
      p.type = 'rain';
      p.x = (Math.random() - 0.5) * 160;
      p.y = 80 + Math.random() * 20;
      p.z = -10 - Math.random() * 120;
      p.vx = 2;
      p.vy = -45 - Math.random() * 20;
      p.vz = 0;
      p.life = 2.0;
      p.maxLife = 2.0;
      p.r = 0.6; p.g = 0.8; p.b = 1.0;
    }

    update(p, dt) {
      p.life -= dt;
      p.y += p.vy * dt;
      p.x += p.vx * dt;
    }
  }

  global.SceneRainParticles = RainParticles;
})(typeof window !== 'undefined' ? window : globalThis);
