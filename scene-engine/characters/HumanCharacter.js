// ═══════════════════════════════════════════════════════════════════════
// HUMAN CHARACTER — Personaje 3D humano estilizado procedural
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class HumanCharacter extends global.SceneCharacter {
    build() {
      this.dispose();
      this.group = new THREE.Group();

      const mat = this.assets.getMaterial('humanMat', () => new THREE.MeshPhongMaterial({ color: 0x334466, flatShading: true }));

      // Head
      const headGeo = this.assets.getGeometry('humanHead', () => new THREE.SphereGeometry(2.2, 12, 12));
      const head = new THREE.Mesh(headGeo, mat);
      head.position.y = 12;
      head.userData.baseY = 12;
      this.group.add(head);

      // Torso
      const torsoGeo = this.assets.getGeometry('humanTorso', () => new THREE.CylinderGeometry(2, 1.5, 7, 8));
      const torso = new THREE.Mesh(torsoGeo, mat);
      torso.position.y = 6.5;
      this.group.add(torso);

      const armGeo = this.assets.getGeometry('humanArm', () => new THREE.CylinderGeometry(0.65, 0.8, 6, 8));
      const leftArm = new THREE.Mesh(armGeo, mat);
      leftArm.position.set(-2.4, 7.8, 0);
      leftArm.rotation.z = 0.18;
      const rightArm = new THREE.Mesh(armGeo, mat);
      rightArm.position.set(2.4, 7.8, 0);
      rightArm.rotation.z = -0.18;
      this.group.add(leftArm, rightArm);
      this.setBodyParts({ head, torso, leftArm, rightArm });

      this.scene.add(this.group);
    }
  }

  global.HumanCharacter = HumanCharacter;
})(typeof window !== 'undefined' ? window : globalThis);
