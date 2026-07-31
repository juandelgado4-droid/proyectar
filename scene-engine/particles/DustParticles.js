// ═══════════════════════════════════════════════════════════════════════
// DUST PARTICLES — Mota de polvo flotante ambiental
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class DustParticles {
    spawn(p, config = {}) {
      p.active = true;
      p.type = 'dust';
      p.x = (Math.random() - 0.5) * 120;
      p.y = Math.random() * 50;
      p.z = -10 - Math.random() * 100;
      p.vx = (Math.random() - 0.5) * 0.8;
      p.vy = (Math.random() - 0.5) * 0.8;
      p.vz = (Math.random() - 0.5) * 0.8;
      p.life = 8.0;
      p.maxLife = 8.0;
      p.r = 0.8; p.g = 0.8; p.b = 0.7;
    }

    update(p, dt) {
      p.life -= dt;
      p.x += Math.sin(p.life) * 0.2;
      p.y += Math.cos(p.life) * 0.2;
    }
  }

  global.SceneDustParticles = DustParticles;
})(typeof window !== 'undefined' ? window : globalThis);
