// ═══════════════════════════════════════════════════════════════════════
// TERRAIN GENERATOR — Generador procedural de terreno 3D
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class TerrainGenerator {
    /**
     * Generate procedural terrain geometry and mesh.
     * @param {THREE.Scene} scene
     * @param {SceneAssetLibrary} assets
     * @param {Object} spec - { type, height, color, flatShading }
     * @returns {THREE.Mesh}
     */
    static generate(scene, assets, spec = {}) {
      const type = spec.type || 'hills';
      const color = spec.color || 0x122617;
      const flatShading = spec.flatShading !== undefined ? spec.flatShading : true;
      const seed = spec.seed || 1;
      const group = new THREE.Group();
      if (type === 'none') {
        group.userData.applyWorldState = function () {};
        return group;
      }
      const geo = new THREE.PlaneGeometry(520, 520, 56, 56);
      const pos = geo.attributes.position;
      const hash = (x, z) => {
        const value = Math.sin(x * 12.9898 + z * 78.233 + seed * 0.137) * 43758.5453;
        return value - Math.floor(value);
      };
      const noise = (x, z) => (hash(x * 0.035, z * 0.035) - 0.5) * 2 +
        (hash(x * 0.011 + 8, z * 0.011 - 5) - 0.5) * 3;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getY(i);
        const ridge = Math.abs(x) / 260;
        let height = noise(x, z) * 2.4;

        if (type === 'peaks') height += Math.max(0, 1 - Math.abs(x + z * 0.25) / 210) * 28 + noise(x, z) * 5;
        if (type === 'valley') height += Math.pow(Math.min(1, ridge), 1.65) * 24 + noise(x, z) * 3;
        if (type === 'cliff') height += (x > 10 ? 1 : 0.15) * Math.min(38, Math.abs(x - 10) * 0.22) + noise(x, z) * 4;
        if (type === 'clearing') {
          const radius = Math.sqrt(x * x + z * z);
          height += Math.min(18, Math.max(0, radius - 54) * 0.1);
        }
        if (type === 'path') {
          const pathX = Math.sin(z * 0.018 + seed) * 24;
          const pathMask = Math.exp(-Math.pow((x - pathX) / 20, 2));
          height = height * (1 - pathMask * 0.92) + Math.min(10, ridge * 15) * (1 - pathMask);
        }
        if (type === 'dunes') {
          height += Math.sin(x * 0.028 + seed) * 7 + Math.sin(z * 0.019 - seed * 0.4) * 9 + noise(x, z) * 1.5;
        }
        if (type === 'street') {
          const road = Math.exp(-Math.pow(x / 34, 2));
          height = height * (1 - road * 0.97) - road * 0.6;
        }
        if (type === 'flat') height *= 0.02;
        if (type === 'plaza' || type === 'lake') height *= type === 'lake' ? 0.08 : 0.16;
        pos.setZ(i, height);
      }
      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({ color, flatShading, roughness: 0.9, metalness: 0.0 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = -5;
      mesh.receiveShadow = true;
      group.add(mesh);

      let water = null;
      if (type === 'lake') {
        const waterMat = new THREE.MeshPhongMaterial({ color: 0x244f68, transparent: true, opacity: 0.7, shininess: 90 });
        water = new THREE.Mesh(new THREE.CircleGeometry(104, 48), waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.set(0, -4.6, -28);
        group.add(water);
      }

      if (type === 'path') {
        const pathMat = new THREE.MeshLambertMaterial({ color: 0x5f5137, transparent: true, opacity: 0.88 });
        for (let i = 0; i < 12; i++) {
          const z = 64 - i * 28;
          const stone = new THREE.Mesh(new THREE.CircleGeometry(12 - i * 0.28, 12), pathMat);
          stone.rotation.x = -Math.PI / 2;
          stone.position.set(Math.sin(z * 0.018 + seed) * 24, -4.45, z);
          group.add(stone);
        }
      }

      const palette = spec.palette || {};
      const baseGround = new THREE.Color(palette.base != null ? palette.base : color);
      const healthyGround = new THREE.Color(palette.healthy != null ? palette.healthy : 0x31563a);
      const dryGround = new THREE.Color(palette.dry != null ? palette.dry : 0x4a4030);
      group.userData.applyWorldState = (state, local, alpha) => {
        const life = state.life || 0;
        const decay = state.decay || 0;
        const target = baseGround.clone().lerp(healthyGround, life * 0.55).lerp(dryGround, decay * 0.65);
        mat.color.lerp(target, alpha);
        const bass = local.audioBass || 0;
        mesh.position.y += ((-5 + bass * 0.75) - mesh.position.y) * alpha;
        if (water) {
          water.material.color.lerp(new THREE.Color().setHSL(0.55 - (state.temperature || 0.5) * 0.08, 0.38, 0.2 + life * 0.18), alpha);
          water.material.opacity += ((0.35 + life * 0.45) - water.material.opacity) * alpha;
          const waterScale = 1 + bass * 0.035;
          water.scale.x += (waterScale - water.scale.x) * alpha;
          water.scale.y += (waterScale - water.scale.y) * alpha;
        }
      };
      return group;
    }
  }

  global.SceneTerrainGenerator = TerrainGenerator;
})(typeof window !== 'undefined' ? window : globalThis);
