// ═══════════════════════════════════════════════════════════════════════
// NEON PARTICLES — Pulsos neón cyberpunk
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class NeonParticles {
    spawn(p, config = {}) {
      p.active = true;
      p.type = 'neon';
      p.x = (Math.random() - 0.5) * 100;
      p.y = Math.random() * 40;
      p.z = -10 - Math.random() * 90;
      p.vx = (Math.random() - 0.5) * 12;
      p.vy = (Math.random() - 0.5) * 12;
      p.vz = (Math.random() - 0.5) * 12;
      p.life = 1.0;
      p.maxLife = 1.0;
      p.r = 0.0; p.g = 0.95; p.b = 1.0;
    }

    update(p, dt) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }
  }

  global.SceneNeonParticles = NeonParticles;
})(typeof window !== 'undefined' ? window : globalThis);
