// ═══════════════════════════════════════════════════════════════════════
// FIREWORK PARTICLES — Fuegos artificiales
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class FireworkParticles {
    spawn(p, config = {}) {
      p.active = true;
      p.type = 'fireworks';
      const cx = (Math.random() - 0.5) * 80;
      const cy = 30 + Math.random() * 30;
      const cz = -50 - Math.random() * 50;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 15 + Math.random() * 15;

      p.x = cx; p.y = cy; p.z = cz;
      p.vx = Math.sin(phi) * Math.cos(theta) * speed;
      p.vy = Math.cos(phi) * speed;
      p.vz = Math.sin(phi) * Math.sin(theta) * speed;

      p.life = 1.2 + Math.random() * 0.8;
      p.maxLife = p.life;

      p.r = Math.random();
      p.g = Math.random();
      p.b = 1.0;
    }

    update(p, dt) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 9.8 * dt; // Gravity
    }
  }

  global.SceneFireworkParticles = FireworkParticles;
})(typeof window !== 'undefined' ? window : globalThis);
