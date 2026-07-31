// ═══════════════════════════════════════════════════════════════════════
// SNOW PARTICLES — Nieve 3D
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class SnowParticles {
    spawn(p, config = {}) {
      p.active = true;
      p.type = 'snow';
      p.x = (Math.random() - 0.5) * 160;
      p.y = 80 + Math.random() * 20;
      p.z = -10 - Math.random() * 120;
      p.vx = (Math.random() - 0.5) * 1.5;
      p.vy = -6 - Math.random() * 4;
      p.vz = (Math.random() - 0.5) * 1.5;
      p.life = 6.0;
      p.maxLife = 6.0;
      p.r = 0.95; p.g = 0.95; p.b = 1.0;
    }

    update(p, dt) {
      p.life -= dt;
      p.y += p.vy * dt;
      p.x += Math.sin(p.life * 2) * 0.8;
    }
  }

  global.SceneSnowParticles = SnowParticles;
})(typeof window !== 'undefined' ? window : globalThis);
