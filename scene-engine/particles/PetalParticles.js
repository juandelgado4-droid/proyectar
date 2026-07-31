// ═══════════════════════════════════════════════════════════════════════
// PETAL PARTICLES — Pétalos de sakura cayendo
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class PetalParticles {
    spawn(p, config = {}) {
      p.active = true;
      p.type = 'petals';
      p.x = (Math.random() - 0.5) * 120;
      p.y = 60 + Math.random() * 20;
      p.z = -10 - Math.random() * 100;
      p.vx = (Math.random() - 0.5) * 4;
      p.vy = -5 - Math.random() * 4;
      p.vz = (Math.random() - 0.5) * 2;
      p.life = 4.0 + Math.random() * 3;
      p.maxLife = p.life;
      p.r = 1.0; p.g = 0.7; p.b = 0.8;
    }

    update(p, dt) {
      p.life -= dt;
      p.y += p.vy * dt;
      p.x += Math.sin(p.life * 3) * 1.2;
    }
  }

  global.ScenePetalParticles = PetalParticles;
})(typeof window !== 'undefined' ? window : globalThis);
