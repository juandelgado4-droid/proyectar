// ═══════════════════════════════════════════════════════════════════════
// SKELETON CHARACTER — Personaje 3D esqueleto procedural
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class SkeletonCharacter extends global.SceneCharacter {
    build() {
      this.dispose();
      this.group = new THREE.Group();

      const boneMat = this.assets.getMaterial('skelBoneMat', () => new THREE.MeshPhongMaterial({ color: 0xeeeedd, flatShading: true }));

      // Skull
      const headGeo = this.assets.getGeometry('skelHead', () => new THREE.SphereGeometry(2.5, 12, 12));
      const head = new THREE.Mesh(headGeo, boneMat);
      head.position.y = 12;
      head.userData.baseY = 12;
      this.group.add(head);

      // Spine
      const spineGeo = this.assets.getGeometry('skelSpine', () => new THREE.CylinderGeometry(0.6, 0.6, 8, 8));
      const spine = new THREE.Mesh(spineGeo, boneMat);
      spine.position.y = 6;
      this.group.add(spine);

      // Ribcage
      const ribGeo = this.assets.getGeometry('skelRib', () => new THREE.TorusGeometry(2, 0.4, 6, 12));
      const rib = new THREE.Mesh(ribGeo, boneMat);
      rib.rotation.x = Math.PI / 2;
      rib.position.y = 7;
      this.group.add(rib);

      const armGeo = this.assets.getGeometry('skelArm', () => new THREE.CylinderGeometry(0.32, 0.45, 7, 6));
      const leftArm = new THREE.Mesh(armGeo, boneMat);
      leftArm.position.set(-2.7, 7.8, 0);
      leftArm.rotation.z = 0.24;
      const rightArm = new THREE.Mesh(armGeo, boneMat);
      rightArm.position.set(2.7, 7.8, 0);
      rightArm.rotation.z = -0.24;
      this.group.add(leftArm, rightArm);
      this.setBodyParts({ head, torso: spine, leftArm, rightArm });

      this.scene.add(this.group);
    }
  }

  global.SkeletonCharacter = SkeletonCharacter;
})(typeof window !== 'undefined' ? window : globalThis);
