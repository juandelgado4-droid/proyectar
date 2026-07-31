// ═══════════════════════════════════════════════════════════════════════
// DESERT SCENE — Escena 3D procedural de desierto
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class DesertScene extends global.IScene {
    getName() { return 'desert'; }

    build(config = {}) {
      this.dispose();
      this.group = new THREE.Group();

      const groundGeo = this.assets.getGeometry('desertGround', () => new THREE.PlaneGeometry(500, 500, 16, 16));
      const groundMat = this.assets.getMaterial('desertGroundMat', () => new THREE.MeshPhongMaterial({ color: 0xc28d4b, flatShading: true }));
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -5;
      this.group.add(ground);

      // Sun
      const sunGeo = this.assets.getGeometry('desertSun', () => new THREE.SphereGeometry(35, 32, 32));
      const sunMat = this.assets.getMaterial('desertSunMat', () => new THREE.MeshBasicMaterial({ color: 0xffaa33 }));
      const sun = new THREE.Mesh(sunGeo, sunMat);
      sun.position.set(0, 30, -220);
      this.group.add(sun);

      this.scene.add(this.group);
    }

    update(deltaTime, beatIntensity = 0) {
      if (this.group) {
        this.group.rotation.y += deltaTime * 0.002;
      }
    }
  }

  global.DesertScene = DesertScene;
})(typeof window !== 'undefined' ? window : globalThis);
