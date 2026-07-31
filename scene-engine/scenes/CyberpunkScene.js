// ═══════════════════════════════════════════════════════════════════════
// CYBERPUNK SCENE — Escena 3D procedural cyberpunk con grid y neones
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class CyberpunkScene extends global.IScene {
    getName() { return 'cyberpunk'; }

    build(config = {}) {
      this.dispose();
      this.group = new THREE.Group();

      // Neon grid
      const grid = new THREE.GridHelper(300, 40, 0xff007f, 0x00f0ff);
      grid.position.y = -5;
      this.group.add(grid);

      // Glowing floating pyramids / crystals
      const geo = this.assets.getGeometry('cyberCrystal', () => new THREE.ConeGeometry(5, 15, 4));
      const mat = this.assets.getMaterial('cyberCrystalMat', () => new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true }));

      for (let i = 0; i < 20; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        const x = (Math.random() - 0.5) * 180;
        const z = -20 - Math.random() * 180;
        const y = Math.random() * 40;
        mesh.position.set(x, y, z);
        this.group.add(mesh);
      }

      this.scene.add(this.group);
    }

    update(deltaTime, beatIntensity = 0) {
      if (this.group) {
        this.group.rotation.y += deltaTime * 0.02 * (1 + beatIntensity);
      }
    }
  }

  global.CyberpunkScene = CyberpunkScene;
})(typeof window !== 'undefined' ? window : globalThis);
