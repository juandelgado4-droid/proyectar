// ═══════════════════════════════════════════════════════════════════════
// SPACE SCENE — Escena 3D procedural de espacio y galaxia
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class SpaceScene extends global.IScene {
    getName() { return 'space'; }

    build(config = {}) {
      this.dispose();
      this.group = new THREE.Group();

      // Planet
      const planetGeo = this.assets.getGeometry('spacePlanet', () => new THREE.SphereGeometry(30, 32, 32));
      const planetMat = this.assets.getMaterial('spacePlanetMat', () => new THREE.MeshPhongMaterial({ color: 0x442266, flatShading: true }));
      const planet = new THREE.Mesh(planetGeo, planetMat);
      planet.position.set(-60, 20, -180);
      this.group.add(planet);

      // Ring
      const ringGeo = this.assets.getGeometry('spaceRing', () => new THREE.RingGeometry(38, 55, 32));
      const ringMat = this.assets.getMaterial('spaceRingMat', () => new THREE.MeshBasicMaterial({ color: 0xaa77cc, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 3;
      planet.add(ring);

      this.scene.add(this.group);
    }

    update(deltaTime, beatIntensity = 0) {
      if (this.group) {
        this.group.rotation.y += deltaTime * 0.005;
      }
    }
  }

  global.SpaceScene = SpaceScene;
})(typeof window !== 'undefined' ? window : globalThis);
