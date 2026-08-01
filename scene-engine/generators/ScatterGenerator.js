// SCATTER GENERATOR - Biome-specific ground detail.
(function (global) {
  'use strict';

  const KINDS = Object.freeze({
    rocks: { color: 0x4c4a45, count: 26, scale: [2, 6], y: -4.6 },
    ferns: { color: 0x24401f, count: 34, scale: [1.5, 4], y: -4.4 },
    bones: { color: 0xd8cdb4, count: 14, scale: [1.5, 4], y: -4.7 },
    dry_shrub: { color: 0x6b5b34, count: 22, scale: [2, 5], y: -4.5 },
    lamps: { color: 0x2a2a30, count: 12, scale: [3, 5], y: 2, emissive: 0xffcb6b },
    lanterns: { color: 0x3a2a18, count: 9, scale: [2, 3.5], y: 4, emissive: 0xffb347 },
    signs: { color: 0x1c1c22, count: 10, scale: [3, 7], y: 8, emissive: 0xff3d7f },
    driftwood: { color: 0x5a4a38, count: 16, scale: [3, 8], y: -4.6 },
    ice_shards: { color: 0xbfe0f5, count: 20, scale: [3, 9], y: -4.2, emissive: 0x6688aa },
    rubble: { color: 0x3e3b36, count: 30, scale: [1.5, 5], y: -4.7 },
    gravestones: { color: 0x54514b, count: 12, scale: [3, 6], y: -3.6 },
    mushrooms: { color: 0x7a4a5c, count: 18, scale: [1, 3], y: -4.5, emissive: 0x552244 },
    floating_shards: { color: 0x7f8cff, count: 28, scale: [2, 6], y: 14, emissive: 0x3344aa }
  });

  class ScatterGenerator {
    static generate(scene, assets, spec = {}) {
      const group = new THREE.Group();
      const kinds = Array.isArray(spec.kinds) ? spec.kinds : [];
      const seed = spec.seed || 1;
      const clearance = Number.isFinite(spec.focalClearance) ? spec.focalClearance : 14;
      const items = [];
      const random = (i, c = 0) => {
        const value = Math.sin(seed * 0.211 + i * 27.13 + c * 11.7) * 43758.5453;
        return value - Math.floor(value);
      };

      let index = 0;
      for (const kind of kinds) {
        const def = KINDS[kind];
        if (!def) continue;
        const geo = assets.getGeometry(`scatter_${kind}`, () => ScatterGenerator._geometryFor(kind));
        const mat = assets.getMaterial(`scatter_${kind}`, () => new THREE.MeshStandardMaterial({
          color: def.color, emissive: def.emissive || 0x000000, emissiveIntensity: def.emissive ? 0.9 : 0,
          flatShading: true, roughness: 0.85
        }));
        for (let i = 0; i < def.count; i += 1, index += 1) {
          const mesh = new THREE.Mesh(geo, mat);
          const z = -170 + random(index, 1) * 240;
          let x = (random(index, 2) - 0.5) * 300;
          if (Math.abs(x) < clearance) x += x < 0 ? -clearance : clearance;
          const scale = def.scale[0] + random(index, 3) * (def.scale[1] - def.scale[0]);
          mesh.position.set(x, def.y + (kind === 'floating_shards' ? random(index, 6) * 30 : 0), z);
          mesh.scale.setScalar(scale);
          mesh.rotation.set(random(index, 4) * 0.6, random(index, 5) * Math.PI * 2, random(index, 6) * 0.5);
          mesh.castShadow = def.y < 0;
          mesh.receiveShadow = true;
          items.push({ mesh, baseY: mesh.position.y, kind, mat });
          group.add(mesh);
        }
      }

      group.userData.applyWorldState = (state, local, forces, alpha) => {
        const time = performance.now() * 0.001;
        const sparkle = local.audioHigh || 0;
        for (const item of items) {
          if (item.kind === 'floating_shards') {
            const targetY = item.baseY + Math.sin(time + item.mesh.position.x * 0.05) * (4 + sparkle * 3);
            item.mesh.position.y += (targetY - item.mesh.position.y) * alpha;
            item.mesh.rotation.y += 0.004 + sparkle * 0.008;
          }
          if (item.mat.emissive && item.mat.emissive.getHex() !== 0) {
            const target = 0.35 + (1 - (state.light != null ? state.light : 0.5)) * 1.2 + sparkle * 0.7;
            item.mat.emissiveIntensity += (target - item.mat.emissiveIntensity) * alpha * 0.5;
          }
        }
      };
      return group;
    }

    static _geometryFor(kind) {
      switch (kind) {
        case 'rocks': case 'rubble': return new THREE.DodecahedronGeometry(1, 0);
        case 'ferns': case 'dry_shrub': return new THREE.ConeGeometry(0.9, 2.4, 5);
        case 'bones': case 'driftwood': return new THREE.CylinderGeometry(0.22, 0.3, 3.4, 5);
        case 'lamps': return new THREE.CylinderGeometry(0.25, 0.35, 6, 6);
        case 'lanterns': return new THREE.OctahedronGeometry(1, 0);
        case 'signs': return new THREE.BoxGeometry(0.3, 3.2, 1.4);
        case 'ice_shards': case 'floating_shards': return new THREE.ConeGeometry(0.7, 3.6, 4);
        case 'gravestones': return new THREE.BoxGeometry(1.4, 2.4, 0.35);
        case 'mushrooms': return new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2);
        default: return new THREE.DodecahedronGeometry(1, 0);
      }
    }
  }

  global.SceneScatterGenerator = ScatterGenerator;
})(typeof window !== 'undefined' ? window : globalThis);
