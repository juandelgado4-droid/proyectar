// ═══════════════════════════════════════════════════════════════════════
// CEMETERY SCENE — Escena 3D procedural de cementerio
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class CemeteryScene extends global.IScene {
    getName() { return 'cemetery'; }

    build(config = {}) {
      this.dispose();
      this.group = new THREE.Group();

      // Ground plane
      const groundGeo = this.assets.getGeometry('cemeteryGround', () => new THREE.PlaneGeometry(500, 500));
      const groundMat = this.assets.getMaterial('cemeteryGroundMat', () => new THREE.MeshLambertMaterial({ color: 0x111611 }));
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -5;
      this.group.add(ground);

      // Gravestones
      const headstoneGeo = this.assets.getGeometry('headstoneGeo', () => new THREE.BoxGeometry(4, 8, 1.5));
      const headstoneMat = this.assets.getMaterial('headstoneMat', () => new THREE.MeshPhongMaterial({ color: 0x3a3d40, flatShading: true }));

      for (let i = 0; i < 35; i++) {
        const stone = new THREE.Mesh(headstoneGeo, headstoneMat);
        const x = (Math.random() - 0.5) * 220;
        const z = -20 - Math.random() * 200;
        stone.position.set(x, -1, z);
        stone.rotation.y = (Math.random() - 0.5) * 0.4;
        stone.rotation.z = (Math.random() - 0.5) * 0.1;
        this.group.add(stone);
      }

      // Moon
      const moonGeo = this.assets.getGeometry('moonGeo', () => new THREE.SphereGeometry(25, 32, 32));
      const moonMat = this.assets.getMaterial('moonMat', () => new THREE.MeshBasicMaterial({ color: 0xe0e6ff }));
      const moon = new THREE.Mesh(moonGeo, moonMat);
      moon.position.set(60, 120, -250);
      this.group.add(moon);

      this.scene.add(this.group);
    }

    update(deltaTime, beatIntensity = 0) {
      if (this.group) {
        this.group.rotation.y += deltaTime * 0.01;
      }
    }
  }

  global.CemeteryScene = CemeteryScene;
})(typeof window !== 'undefined' ? window : globalThis);
