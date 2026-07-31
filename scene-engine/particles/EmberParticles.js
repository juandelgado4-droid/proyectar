// ═══════════════════════════════════════════════════════════════════════
// EMBER PARTICLES — Brasas flotantes de fuego
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class EmberParticles {
    spawn(p, config = {}) {
      p.active = true;
      p.type = 'embers';
      p.x = (Math.random() - 0.5) * 80;
      p.y = -5 + Math.random() * 5;
      p.z = -20 - Math.random() * 80;
      p.vx = (Math.random() - 0.5) * 3;
      p.vy = 6 + Math.random() * 6;
      p.vz = (Math.random() - 0.5) * 3;
      p.life = 2.0 + Math.random() * 1.5;
      p.maxLife = p.life;
      p.r = 1.0; p.g = 0.4; p.b = 0.0;
    }

    update(p, dt) {
      p.life -= dt;
      p.y += p.vy * dt;
      p.x += Math.sin(p.life * 3) * 0.5;
      p.g = Math.max(0, p.g - dt * 0.2); // Fades from orange to red
    }
  }

  global.SceneEmberParticles = EmberParticles;
})(typeof window !== 'undefined' ? window : globalThis);
