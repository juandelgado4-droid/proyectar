// ═══════════════════════════════════════════════════════════════════════
// ARCHITECTURE GENERATOR — Generador procedural de estructuras y ruinas 3D
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class ArchitectureGenerator {
    /**
     * Generate procedural architecture group.
     * @param {THREE.Scene} scene
     * @param {SceneAssetLibrary} assets
     * @param {Object} spec - { style, count, seed }
     * @returns {THREE.Group}
     */
    static generate(scene, assets, spec = {}) {
      const group = new THREE.Group();
      const style = spec.style || 'gothic';
      const composition = spec.composition || 'clearing';
      const count = spec.count || (['ruined_plaza', 'spiral_ruins', 'plaza'].includes(composition) ? 12 : 5);
      const seed = spec.seed || 1;
      const random = (index, channel = 0) => {
        const value = Math.sin(seed * 0.139 + index * 17.217 + channel * 19.19) * 43758.5453;
        return value - Math.floor(value);
      };

      const colGeo = assets.getGeometry('archColGeo', () => new THREE.CylinderGeometry(2, 2.5, 30, 10));
      const colMat = assets.getMaterial(`archColMat_${style}`, () => new THREE.MeshPhongMaterial({ color: style === 'realistic' ? 0x57534c : 0x403d50, flatShading: true }));
      const structures = [];

      for (let i = 0; i < count; i++) {
        const col = new THREE.Mesh(colGeo, colMat);
        const angle = (i / count) * Math.PI * 2 + seed * 0.03;
        const plaza = ['ruined_plaza', 'spiral_ruins', 'plaza'].includes(composition);
        const side = i % 2 === 0 ? -1 : 1;
        const x = plaza ? Math.cos(angle) * (54 + random(i) * 36) : side * (62 + random(i) * 74);
        const z = plaza ? -42 + Math.sin(angle) * 46 : -52 - random(i, 1) * 148;
        const height = 0.45 + random(i, 2) * 1.3;
        col.position.set(x, -5 + 15 * height, z);
        col.scale.set(0.7 + random(i, 3) * 0.85, height, 0.7 + random(i, 4) * 0.72);
        col.rotation.z = (random(i, 5) - 0.5) * 0.28;
        col.castShadow = true;
        col.receiveShadow = true;
        structures.push({ mesh: col, baseY: col.position.y });
        group.add(col);
      }

      if (composition === 'ruined_plaza' || composition === 'spiral_ruins') {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(16, 1.7, 8, 16, Math.PI), colMat);
        arch.position.set(0, 25, -86);
        arch.rotation.z = Math.PI;
        group.add(arch);
        structures.push({ mesh: arch, baseY: arch.position.y });
      }

      group.userData.applyWorldState = (state, local, forces, alpha) => {
        const target = new THREE.Color().setHSL(0.06 + (state.temperature || 0.5) * 0.05, 0.1 + (state.life || 0.4) * 0.12, 0.18 + (1 - (state.decay || 0.2)) * 0.16);
        colMat.color.lerp(target, alpha * 0.4);
        const haze = Math.min(0.26, (local.fogDensity || 0) * 18);
        for (const structure of structures) {
          structure.mesh.position.y += ((structure.baseY + haze * 1.2) - structure.mesh.position.y) * alpha;
        }
      };

      return group;
    }
  }

  global.SceneArchitectureGenerator = ArchitectureGenerator;
})(typeof window !== 'undefined' ? window : globalThis);
