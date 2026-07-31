// ═══════════════════════════════════════════════════════════════════════
// VEGETATION GENERATOR — Generador procedural de vegetación 3D
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class VegetationGenerator {
    /**
     * Generate procedural vegetation group.
     * @param {THREE.Scene} scene
     * @param {SceneAssetLibrary} assets
     * @param {Object} spec - { style, density, seed }
     * @returns {THREE.Group}
     */
    static generate(scene, assets, spec = {}) {
      const group = new THREE.Group();
      const density = spec.density || 0.5;
      const count = Math.floor(18 + density * 52);
      const seed = spec.seed || 1;
      const foregroundDensity = spec.foregroundDensity ?? 0.45;
      const focalClearance = spec.focalClearance ?? 14;
      const random = (index, channel = 0) => {
        const value = Math.sin(seed * 0.127 + index * 12.9898 + channel * 78.233) * 43758.5453;
        return value - Math.floor(value);
      };

      const trunkGeo = assets.getGeometry('trunkGeo', () => new THREE.CylinderGeometry(1.2, 2, 20, 8));
      const trunkMat = assets.getMaterial('trunkMat', () => new THREE.MeshPhongMaterial({ color: 0x2b1d0c, flatShading: true }));
      const foliageGeo = assets.getGeometry('foliageGeo', () => new THREE.ConeGeometry(8, 25, 8));
      const foliageMats = [0, 1, 2, 3].map(index => assets.getMaterial(`foliageMat_${index}`, () =>
        new THREE.MeshPhongMaterial({ color: new THREE.Color().setHSL(0.28 + index * 0.018, 0.42, 0.16 + index * 0.035), flatShading: true })
      ));
      const treeData = [];

      for (let i = 0; i < count; i++) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 10;
        const foliage = new THREE.Mesh(foliageGeo, foliageMats[i % foliageMats.length]);
        foliage.position.y = 22;

        if (random(i, 3) > 0.32) {
          const crown = new THREE.Mesh(foliageGeo, foliage.material);
          crown.scale.set(0.72, 0.66, 0.72);
          crown.position.y = 34;
          tree.add(crown);
        }

        tree.add(trunk);
        tree.add(foliage);

        const layerRoll = random(i, 0);
        const foreground = layerRoll < foregroundDensity * 0.26;
        const middle = !foreground && layerRoll < 0.72;
        const z = foreground ? 22 + random(i, 1) * 54 : middle ? -16 - random(i, 1) * 108 : -126 - random(i, 1) * 132;
        let x = (random(i, 2) - 0.5) * (foreground ? 280 : 238);
        const pathX = Math.sin(z * 0.018 + seed) * 24;
        if (Math.abs(x - pathX) < focalClearance) x += (x < pathX ? -1 : 1) * (focalClearance + random(i, 4) * 18);
        if (foreground && Math.abs(x) < 34) x += x < 0 ? -42 : 42;
        const height = 0.48 + random(i, 5) * 1.35;
        const width = 0.56 + random(i, 6) * 0.86;

        tree.position.set(x, -5, z);
        tree.scale.set(width, height, width * (0.82 + random(i, 7) * 0.28));
        tree.rotation.set((random(i, 8) - 0.5) * 0.09, random(i, 9) * Math.PI * 2, (random(i, 10) - 0.5) * 0.12);
        tree.castShadow = true;
        treeData.push({ tree, baseScale: tree.scale.clone(), baseTilt: tree.rotation.z, foliage });
        group.add(tree);
      }

      group.userData.applyWorldState = (state, local, forces, alpha) => {
        const life = state.life || 0;
        const decay = state.decay || 0;
        const bend = forces.vegetationBend || 0;
        const wind = local.windSpeed || 0;
        const saturation = forces.vegetationSaturation || 0.5;
        for (const data of treeData) {
          data.tree.rotation.z += ((data.baseTilt + bend * 0.34 + Math.sin(performance.now() * 0.001 + data.tree.position.x) * wind * 0.055) - data.tree.rotation.z) * alpha;
          data.tree.scale.y += ((data.baseScale.y * (0.7 + life * 0.34 - decay * 0.16)) - data.tree.scale.y) * alpha;
          const target = new THREE.Color().setHSL(0.08 + life * 0.27, 0.15 + saturation * 0.42, 0.1 + life * 0.17 - decay * 0.05);
          data.foliage.material.color.lerp(target, alpha * 0.18);
        }
      };

      return group;
    }
  }

  global.SceneVegetationGenerator = VegetationGenerator;
})(typeof window !== 'undefined' ? window : globalThis);
