// ═══════════════════════════════════════════════════════════════════════
// FOREST SCENE — Escena 3D procedural de bosque
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class ForestScene extends global.IScene {
    getName() { return 'forest'; }

    build(config = {}) {
      this.dispose();
      this.group = new THREE.Group();

      // Ground
      const groundGeo = this.assets.getGeometry('forestGround', () => new THREE.PlaneGeometry(500, 500));
      const groundMat = this.assets.getMaterial('forestGroundMat', () => new THREE.MeshLambertMaterial({ color: 0x0a1c0d }));
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -5;
      this.group.add(ground);

      // Trees
      const trunkGeo = this.assets.getGeometry('trunkGeo', () => new THREE.CylinderGeometry(1.2, 2, 20, 8));
      const trunkMat = this.assets.getMaterial('trunkMat', () => new THREE.MeshPhongMaterial({ color: 0x2b1d0c }));
      const foliageGeo = this.assets.getGeometry('foliageGeo', () => new THREE.ConeGeometry(8, 25, 8));
      const foliageMat = this.assets.getMaterial('foliageMat', () => new THREE.MeshPhongMaterial({ color: 0x123d1b, flatShading: true }));

      for (let i = 0; i < 45; i++) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 10;

        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.y = 22;

        tree.add(trunk);
        tree.add(foliage);

        const x = (Math.random() - 0.5) * 250;
        const z = -20 - Math.random() * 220;
        const scale = 0.7 + Math.random() * 0.7;

        tree.position.set(x, -5, z);
        tree.scale.set(scale, scale, scale);
        this.group.add(tree);
      }

      this.scene.add(this.group);
    }

    update(deltaTime, beatIntensity = 0) {
      if (this.group) {
        this.group.rotation.y += deltaTime * 0.005;
      }
    }
  }

  global.ForestScene = ForestScene;
})(typeof window !== 'undefined' ? window : globalThis);
