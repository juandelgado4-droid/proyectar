// ═══════════════════════════════════════════════════════════════════════
// SKY GENERATOR — Generador procedural de cielos y elementos celestes 3D
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class SkyGenerator {
    /**
     * Generate procedural celestial objects group.
     * @param {THREE.Scene} scene
     * @param {SceneAssetLibrary} assets
     * @param {Object} spec - { celestialObject, seed }
     * @returns {THREE.Group}
     */
    static generate(scene, assets, spec = {}) {
      const group = new THREE.Group();

      const skyMode = spec.sky || 'moon';
      const skyMat = new THREE.MeshBasicMaterial({ color: 0x101a2b, side: THREE.BackSide, fog: false });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(780, 28, 20), skyMat);
      group.add(dome);

      const celestialGeo = new THREE.SphereGeometry(25, 32, 32);
      const moon = new THREE.Mesh(celestialGeo, new THREE.MeshBasicMaterial({ color: 0xe9f2ff }));
      moon.position.set(72, 118, -285);
      moon.visible = ['moon', 'stars', 'overcast'].includes(skyMode);
      group.add(moon);

      const sun = new THREE.Mesh(new THREE.SphereGeometry(30, 28, 28), new THREE.MeshBasicMaterial({ color: 0xffcf7d }));
      sun.position.set(-88, skyMode === 'golden_hour' ? 58 : 108, -280);
      sun.visible = ['sunrise', 'golden_hour', 'rain_to_sun'].includes(skyMode);
      group.add(sun);

      const starsGeo = new THREE.BufferGeometry();
      const stars = new Float32Array(240 * 3);
      for (let i = 0; i < 240; i++) {
        const a = (i * 2.399963 + spec.seed) % (Math.PI * 2);
        const y = 55 + ((i * 37) % 155);
        const r = 390 + ((i * 17) % 170);
        stars[i * 3] = Math.cos(a) * r;
        stars[i * 3 + 1] = y;
        stars[i * 3 + 2] = Math.sin(a) * r;
      }
      starsGeo.setAttribute('position', new THREE.BufferAttribute(stars, 3));
      const starField = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xddeaff, size: 1.8, transparent: true, opacity: 0.72 }));
      starField.visible = ['moon', 'stars'].includes(skyMode);
      group.add(starField);

      group.userData.applyWorldState = (state, local, alpha) => {
        const light = state.light || 0;
        const temperature = state.temperature || 0.5;
        const target = new THREE.Color().setHSL(0.58 - temperature * 0.12, 0.36, 0.06 + light * 0.18);
        skyMat.color.lerp(target, alpha);
        moon.material.color.lerp(new THREE.Color().setHSL(0.6, 0.18, 0.56 + light * 0.34), alpha);
        sun.material.color.lerp(new THREE.Color().setHSL(0.09, 0.72, 0.46 + light * 0.3), alpha);
        starField.material.opacity += (((1 - light) * 0.78) - starField.material.opacity) * alpha;
        sun.scale.setScalar(0.9 + light * 0.26);
      };

      return group;
    }
  }

  global.SceneSkyGenerator = SkyGenerator;
})(typeof window !== 'undefined' ? window : globalThis);
