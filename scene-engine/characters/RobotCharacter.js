// ═══════════════════════════════════════════════════════════════════════
// ROBOT CHARACTER — Personaje 3D robot procedural
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class RobotCharacter extends global.SceneCharacter {
    build() {
      this.dispose();
      this.group = new THREE.Group();

      const mat = this.assets.getMaterial('robotMat', () => new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.8, roughness: 0.2 }));

      // Head
      const headGeo = this.assets.getGeometry('robotHead', () => new THREE.BoxGeometry(3, 3, 3));
      const head = new THREE.Mesh(headGeo, mat);
      head.position.y = 12;
      this.group.add(head);

      // Torso
      const torsoGeo = this.assets.getGeometry('robotTorso', () => new THREE.BoxGeometry(5, 7, 3));
      const torso = new THREE.Mesh(torsoGeo, mat);
      torso.position.y = 6.5;
      this.group.add(torso);

      this.scene.add(this.group);
    }
  }

  global.RobotCharacter = RobotCharacter;
})(typeof window !== 'undefined' ? window : globalThis);
