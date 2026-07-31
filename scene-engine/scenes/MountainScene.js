// ═══════════════════════════════════════════════════════════════════════
// MOUNTAIN SCENE — Escena 3D procedural de montañas
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class MountainScene extends global.IScene {
    getName() { return 'mountain'; }

    build(config = {}) {
      this.dispose();
      this.group = new THREE.Group();

      const mountGeo = this.assets.getGeometry('mountainPeak', () => new THREE.ConeGeometry(40, 90, 5));
      const mountMat = this.assets.getMaterial('mountainMat', () => new THREE.MeshPhongMaterial({ color: 0x223344, flatShading: true }));

      for (let i = 0; i < 12; i++) {
        const peak = new THREE.Mesh(mountGeo, mountMat);
        const x = (Math.random() - 0.5) * 300;
        const z = -60 - Math.random() * 200;
        peak.position.set(x, 35, z);
        this.group.add(peak);
      }

      this.scene.add(this.group);
    }

    update(deltaTime, beatIntensity = 0) {
      if (this.group) {
        this.group.rotation.y += deltaTime * 0.002;
      }
    }
  }

  global.MountainScene = MountainScene;
})(typeof window !== 'undefined' ? window : globalThis);
