// ═══════════════════════════════════════════════════════════════════════
// CITY NIGHT SCENE — Escena 3D procedural de ciudad nocturna
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class CityNightScene extends global.IScene {
    getName() { return 'city_night'; }

    build(config = {}) {
      this.dispose();
      this.group = new THREE.Group();

      const buildingMat = this.assets.getMaterial('cityBuildingMat', () => new THREE.MeshPhongMaterial({ color: 0x0d0d1a, flatShading: true }));
      const windowMat = this.assets.getMaterial('cityWindowMat', () => new THREE.MeshBasicMaterial({ color: 0xffea79 }));

      for (let i = 0; i < 40; i++) {
        const h = 30 + Math.random() * 90;
        const w = 12 + Math.random() * 15;
        const d = 12 + Math.random() * 15;

        const geo = new THREE.BoxGeometry(w, h, d);
        const b = new THREE.Mesh(geo, buildingMat);

        const x = (Math.random() - 0.5) * 220;
        const z = -40 - Math.random() * 200;
        b.position.set(x, h / 2 - 10, z);

        this.group.add(b);
      }

      this.scene.add(this.group);
    }

    update(deltaTime, beatIntensity = 0) {
      if (this.group) {
        this.group.rotation.y += deltaTime * 0.003;
      }
    }
  }

  global.CityNightScene = CityNightScene;
})(typeof window !== 'undefined' ? window : globalThis);
