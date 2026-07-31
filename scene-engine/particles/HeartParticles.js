// ═══════════════════════════════════════════════════════════════════════
// HEART PARTICLES — Partículas de corazón flotantes
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class HeartParticles {
    spawn(p, config = {}) {
      p.active = true;
      p.type = 'hearts';
      p.x = (Math.random() - 0.5) * 80;
      p.y = -10 + Math.random() * 5;
      p.z = -10 - Math.random() * 80;
      p.vx = (Math.random() - 0.5) * 2;
      p.vy = 8 + Math.random() * 8;
      p.vz = (Math.random() - 0.5) * 2;
      p.life = 2.5 + Math.random() * 2;
      p.maxLife = p.life;
      p.r = 1.0; p.g = 0.3; p.b = 0.5;
    }

    update(p, dt) {
      p.life -= dt;
      p.y += p.vy * dt;
      p.x += Math.sin(p.life * 4) * 0.5;
    }
  }

  global.SceneHeartParticles = HeartParticles;
})(typeof window !== 'undefined' ? window : globalThis);
