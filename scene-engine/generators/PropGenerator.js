// ═══════════════════════════════════════════════════════════════════════
// PROP GENERATOR — Traductor simbólico a props procedurales 3D
// Convierte intenciones simbólicas (hope, memory, time) en objetos físicos
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class PropGenerator {
    /**
     * Generate procedural props based on symbolic ecosystem array.
     * @param {THREE.Scene} scene
     * @param {SceneAssetLibrary} assets
     * @param {string[]} symbolicProps - Array of symbol names
     * @param {number} seed
     * @returns {THREE.Group}
     */
    static generate(scene, assets, symbolicProps = [], seed = 1) {
      const group = new THREE.Group();
      const animated = [];
      const random = (index, channel = 0) => {
        const value = Math.sin(seed * 0.17 + index * 13.371 + channel * 43.171) * 43758.5453;
        return value - Math.floor(value);
      };
      const place = (mesh, index, options = {}) => {
        const radius = options.radius || 42;
        const x = options.x ?? (random(index, 1) - 0.5) * radius * 2;
        const y = options.y ?? (options.float ? 8 + random(index, 2) * 25 : 0);
        const z = options.z ?? (-12 - random(index, 3) * 96);
        mesh.position.set(x, y, z);
        mesh.rotation.set(random(index, 4) * 0.35, random(index, 5) * Math.PI * 2, random(index, 6) * 0.25);
        mesh.castShadow = true;
        group.add(mesh);
        if (options.float) animated.push({ mesh, baseY: y, phase: random(index, 7) * Math.PI * 2 });
      };

      for (let i = 0; i < symbolicProps.length; i++) {
        const symbol = symbolicProps[i];

        if (symbol === 'glowing_crystals' || symbol === 'shimmering_motes' || symbol === 'echoing_lights' || symbol === 'drifting_sparks') {
          const crystalGeo = assets.getGeometry('propCrystal', () => new THREE.OctahedronGeometry(3, 0));
          const crystalMat = assets.getMaterial('propCrystalMat', () => new THREE.MeshBasicMaterial({ color: 0x8eeaff, wireframe: true, transparent: true, opacity: 0.88 }));

          for (let j = 0; j < 8; j++) {
            const mesh = new THREE.Mesh(crystalGeo, crystalMat);
            place(mesh, i * 11 + j, { float: true, radius: 62 });
          }
        } else if (symbol === 'candles' || symbol === 'single_candle') {
          const candleGeo = assets.getGeometry('propCandle', () => new THREE.CylinderGeometry(0.5, 0.5, 4, 8));
          const candleMat = assets.getMaterial('propCandleMat', () => new THREE.MeshBasicMaterial({ color: 0xffbd5e }));

          const count = symbol === 'single_candle' ? 1 : 7;
          for (let j = 0; j < count; j++) place(new THREE.Mesh(candleGeo, candleMat), i * 11 + j, { radius: symbol === 'single_candle' ? 0 : 24, y: 2, z: -15 - j * 3 });
        } else if (['hourglass', 'falling_sand', 'old_clocks'].includes(symbol)) {
          const clockMat = assets.getMaterial('propTimeMat', () => new THREE.MeshPhongMaterial({ color: 0xb09262, flatShading: true }));
          const geo = symbol === 'hourglass' ? new THREE.ConeGeometry(3.5, 7, 8) : new THREE.CylinderGeometry(4.6, 4.6, 1.4, 16);
          const count = symbol === 'falling_sand' ? 5 : 2;
          for (let j = 0; j < count; j++) {
            const mesh = new THREE.Mesh(geo, clockMat);
            if (symbol === 'hourglass') {
              const lower = new THREE.Mesh(geo, clockMat);
              lower.rotation.z = Math.PI;
              mesh.add(lower);
            }
            place(mesh, i * 11 + j, { float: symbol === 'falling_sand', radius: 46 });
          }
        } else if (['withered_petals', 'autumn_leaves', 'falling_petals', 'blooming_sprouts'].includes(symbol)) {
          const petalMat = assets.getMaterial(`propFloraMat_${symbol}`, () => new THREE.MeshPhongMaterial({ color: symbol === 'blooming_sprouts' ? 0x8fca72 : 0x9d6254, flatShading: true }));
          const petalGeo = symbol === 'blooming_sprouts' ? new THREE.ConeGeometry(1.6, 7, 6) : new THREE.CircleGeometry(1.7, 6);
          for (let j = 0; j < 18; j++) place(new THREE.Mesh(petalGeo, petalMat), i * 23 + j, { float: symbol !== 'blooming_sprouts', radius: 72, y: symbol === 'blooming_sprouts' ? 1.5 : undefined });
        } else if (['gravestones', 'bare_pillar', 'dry_branches', 'faded_archways'].includes(symbol)) {
          const stoneMat = assets.getMaterial('propStoneMat', () => new THREE.MeshPhongMaterial({ color: 0x5d5c68, flatShading: true }));
          const geo = symbol === 'dry_branches' ? new THREE.CylinderGeometry(0.35, 0.8, 13, 6) : new THREE.BoxGeometry(symbol === 'bare_pillar' ? 3 : 5, symbol === 'bare_pillar' ? 26 : 11, 2.6);
          for (let j = 0; j < (symbol === 'bare_pillar' ? 2 : 5); j++) place(new THREE.Mesh(geo, stoneMat), i * 13 + j, { radius: 70, y: symbol === 'dry_branches' ? 6 : undefined });
        } else if (['floating_mirrors', 'mist_ring', 'distant_moon'].includes(symbol)) {
          const mat = assets.getMaterial(`propAtmosphereMat_${symbol}`, () => new THREE.MeshBasicMaterial({ color: symbol === 'mist_ring' ? 0xaac4d8 : 0xc8e6ff, transparent: true, opacity: 0.42, side: THREE.DoubleSide }));
          const geo = symbol === 'mist_ring' ? new THREE.TorusGeometry(13, 0.7, 8, 36) : new THREE.PlaneGeometry(11, 16);
          for (let j = 0; j < 3; j++) place(new THREE.Mesh(geo, mat), i * 7 + j, { float: true, radius: 54 });
        } else if (symbol === 'golden_rays') {
          const rayMat = assets.getMaterial('propRayMat', () => new THREE.MeshBasicMaterial({ color: 0xffd789, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide }));
          for (let j = 0; j < 4; j++) place(new THREE.Mesh(new THREE.ConeGeometry(8, 78, 8, 1, true), rayMat), i * 7 + j, { x: -42 + j * 26, y: 52, z: -72, radius: 0 });
        }
      }

      group.userData.applyWorldState = (state, local, forces, alpha) => {
        const time = performance.now() * 0.001;
        for (const item of animated) {
          const targetY = item.baseY + Math.sin(time * (0.55 + (local.windSpeed || 0) * 0.4) + item.phase) * (0.55 + (forces.lightExpansion || 0) * 0.9);
          item.mesh.position.y += (targetY - item.mesh.position.y) * alpha;
          item.mesh.rotation.y += (local.windSpeed || 0) * alpha * 0.04;
        }
      };

      return group;
    }
  }

  global.ScenePropGenerator = PropGenerator;
})(typeof window !== 'undefined' ? window : globalThis);
