// ═══════════════════════════════════════════════════════════════════════
// CONFETTI PARTICLES — Confeti brillante
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class ConfettiParticles {
    spawn(p, config = {}) {
      p.active = true;
      p.type = 'confetti';
      p.x = (Math.random() - 0.5) * 100;
      p.y = 50 + Math.random() * 20;
      p.z = -10 - Math.random() * 80;
      p.vx = (Math.random() - 0.5) * 6;
      p.vy = -8 - Math.random() * 6;
      p.vz = (Math.random() - 0.5) * 6;
      p.life = 3.5;
      p.maxLife = 3.5;
      p.r = Math.random(); p.g = Math.random(); p.b = Math.random();
    }

    update(p, dt) {
      p.life -= dt;
      p.y += p.vy * dt;
      p.x += Math.sin(p.life * 5) * 0.8;
    }
  }

  global.SceneConfettiParticles = ConfettiParticles;
})(typeof window !== 'undefined' ? window : globalThis);
