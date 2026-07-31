// ═══════════════════════════════════════════════════════════════════════
// GARDEN SCENE — Escena 3D procedural de jardín romántico
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class GardenScene extends global.IScene {
    getName() { return 'garden'; }

    build(config = {}) {
      this.dispose();
      this.group = new THREE.Group();

      // Grass
      const groundGeo = this.assets.getGeometry('gardenGround', () => new THREE.PlaneGeometry(400, 400));
      const groundMat = this.assets.getMaterial('gardenGroundMat', () => new THREE.MeshPhongMaterial({ color: 0x1e4720 }));
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -5;
      this.group.add(ground);

      // Arch / Pergola
      const archGeo = this.assets.getGeometry('archGeo', () => new THREE.TorusGeometry(15, 1.2, 8, 24, Math.PI));
      const archMat = this.assets.getMaterial('archMat', () => new THREE.MeshPhongMaterial({ color: 0xffffff }));
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.position.set(0, 10, -40);
      this.group.add(arch);

      this.scene.add(this.group);
    }

    update(deltaTime, beatIntensity = 0) {
      if (this.group) {
        this.group.rotation.y += deltaTime * 0.004;
      }
    }
  }

  global.GardenScene = GardenScene;
})(typeof window !== 'undefined' ? window : globalThis);
