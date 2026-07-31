// ═══════════════════════════════════════════════════════════════════════
// OCEAN SCENE — Escena 3D procedural de océano
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class OceanScene extends global.IScene {
    getName() { return 'ocean'; }

    build(config = {}) {
      this.dispose();
      this.group = new THREE.Group();

      // Water Plane
      const waterGeo = new THREE.PlaneGeometry(600, 600, 32, 32);
      const waterMat = this.assets.getMaterial('oceanWaterMat', () => new THREE.MeshPhongMaterial({
        color: 0x003366,
        emissive: 0x001122,
        shininess: 90,
        flatShading: true
      }));

      this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
      this.waterMesh.rotation.x = -Math.PI / 2;
      this.waterMesh.position.y = -10;
      this.group.add(this.waterMesh);

      // Moon/Sun on horizon
      const sunGeo = this.assets.getGeometry('oceanSun', () => new THREE.SphereGeometry(30, 32, 32));
      const sunMat = this.assets.getMaterial('oceanSunMat', () => new THREE.MeshBasicMaterial({ color: 0x66aacc }));
      const sun = new THREE.Mesh(sunGeo, sunMat);
      sun.position.set(0, 15, -280);
      this.group.add(sun);

      this.scene.add(this.group);
    }

    update(deltaTime, beatIntensity = 0) {
      if (this.waterMesh) {
        const pos = this.waterMesh.geometry.attributes.position;
        const time = Date.now() * 0.002;

        for (let i = 0; i < pos.count; i++) {
          const u = pos.getX(i);
          const v = pos.getY(i);
          const z = Math.sin(u * 0.05 + time) * 1.5 + Math.cos(v * 0.05 + time) * 1.5;
          pos.setZ(i, z);
        }
        pos.needsUpdate = true;
      }
    }
  }

  global.OceanScene = OceanScene;
})(typeof window !== 'undefined' ? window : globalThis);
