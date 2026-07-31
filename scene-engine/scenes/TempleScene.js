// ═══════════════════════════════════════════════════════════════════════
// TEMPLE SCENE — Escena 3D procedural de templo místico
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class TempleScene extends global.IScene {
    getName() { return 'temple'; }

    build(config = {}) {
      this.dispose();
      this.group = new THREE.Group();

      const colGeo = this.assets.getGeometry('templeCol', () => new THREE.CylinderGeometry(2, 2.5, 30, 12));
      const colMat = this.assets.getMaterial('templeColMat', () => new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }));

      for (let i = -3; i <= 3; i++) {
        const c1 = new THREE.Mesh(colGeo, colMat);
        c1.position.set(i * 15, 10, -40);

        const c2 = new THREE.Mesh(colGeo, colMat);
        c2.position.set(i * 15, 10, -80);

        this.group.add(c1);
        this.group.add(c2);
      }

      this.scene.add(this.group);
    }

    update(deltaTime, beatIntensity = 0) {
      if (this.group) {
        this.group.rotation.y += deltaTime * 0.003;
      }
    }
  }

  global.TempleScene = TempleScene;
})(typeof window !== 'undefined' ? window : globalThis);
