// VEGETATION GENERATOR - Procedural, biome-aware flora.
(function (global) {
  'use strict';

  const SPECIES = Object.freeze({
    pine: { trunk: 0x2b1d0c, foliage: [0.28, 0.42, 0.16], height: [0.48, 1.35] },
    broadleaf: { trunk: 0x3a2a16, foliage: [0.09, 0.52, 0.22], height: [0.55, 1.25] },
    palm: { trunk: 0x6b5637, foliage: [0.24, 0.48, 0.24], height: [0.85, 1.45] },
    cactus: { trunk: 0x2f5133, foliage: [0.30, 0.35, 0.22], height: [0.50, 1.00] },
    dead_tree: { trunk: 0x35302a, foliage: null, height: [0.60, 1.40] },
    reeds: { trunk: 0x5d6b32, foliage: [0.18, 0.40, 0.26], height: [0.40, 0.90] }
  });

  class VegetationGenerator {
    static generate(scene, assets, spec = {}) {
      const group = new THREE.Group();
      const species = spec.species || 'pine';
      const density = spec.density != null ? spec.density : 0.5;
      if (species === 'none' || !SPECIES[species] || density <= 0) {
        group.userData.applyWorldState = function () {};
        return group;
      }

      const def = SPECIES[species];
      const count = Math.floor((species === 'reeds' ? 30 : 14) + density * (species === 'cactus' ? 22 : 52));
      const seed = spec.seed || 1;
      const foregroundDensity = spec.foregroundDensity != null ? spec.foregroundDensity : 0.45;
      const focalClearance = spec.focalClearance != null ? spec.focalClearance : 14;
      const random = (index, channel = 0) => {
        const value = Math.sin(seed * 0.127 + index * 12.9898 + channel * 78.233) * 43758.5453;
        return value - Math.floor(value);
      };

      // All cached asset keys include the species: switching a biome cannot freeze old flora.
      const trunkGeo = assets.getGeometry(`trunk_${species}`, () => VegetationGenerator._trunkGeo(species));
      const trunkMat = assets.getMaterial(`trunkMat_${species}`, () =>
        new THREE.MeshPhongMaterial({ color: def.trunk, flatShading: true }));
      const foliageGeo = def.foliage ? assets.getGeometry(`foliage_${species}`, () => VegetationGenerator._foliageGeo(species)) : null;
      const foliageMats = def.foliage ? [0, 1, 2, 3].map(i => assets.getMaterial(`foliageMat_${species}_${i}`, () => {
        const color = new THREE.Color().setHSL(def.foliage[0] + i * 0.018, def.foliage[1], def.foliage[2] + i * 0.035);
        return new THREE.MeshPhongMaterial({ color, flatShading: true });
      })) : [];
      const plantData = [];

      for (let i = 0; i < count; i += 1) {
        const built = VegetationGenerator._build(species, trunkGeo, trunkMat, foliageGeo, foliageMats[i % foliageMats.length], i, random);
        const plant = built.plant;
        const layerRoll = random(i, 0);
        const foreground = layerRoll < foregroundDensity * 0.26;
        const middle = !foreground && layerRoll < 0.72;
        const z = foreground ? 22 + random(i, 1) * 54 : middle ? -16 - random(i, 1) * 108 : -126 - random(i, 1) * 132;
        let x = (random(i, 2) - 0.5) * (foreground ? 280 : 238);
        const pathX = Math.sin(z * 0.018 + seed) * 24;
        if (spec.composition === 'path' && Math.abs(x - pathX) < focalClearance) x += (x < pathX ? -1 : 1) * (focalClearance + random(i, 4) * 18);
        if (foreground && Math.abs(x) < 34) x += x < 0 ? -42 : 42;
        const height = def.height[0] + random(i, 5) * (def.height[1] - def.height[0]);
        const width = 0.56 + random(i, 6) * 0.86;
        plant.position.set(x, -5, z);
        plant.scale.set(width, height, width * (0.82 + random(i, 7) * 0.28));
        plant.rotation.set((random(i, 8) - 0.5) * 0.09, random(i, 9) * Math.PI * 2, (random(i, 10) - 0.5) * 0.12);
        plant.castShadow = true;
        plantData.push({ plant, baseScale: plant.scale.clone(), baseTilt: plant.rotation.z, foliage: built.foliage });
        group.add(plant);
      }

      const drySpecies = species === 'cactus' || species === 'dead_tree';
      const sway = species === 'reeds' ? 0.16 : species === 'palm' ? 0.10 : 0.055;
      group.userData.applyWorldState = (state, local, forces, alpha) => {
        const life = state.life || 0;
        const decay = state.decay || 0;
        const bend = forces.vegetationBend || 0;
        const wind = (local.windSpeed || 0) + (local.audioHigh || 0) * 0.35;
        const saturation = forces.vegetationSaturation || 0.5;
        const time = performance.now() * 0.001;
        for (const data of plantData) {
          data.plant.rotation.z += ((data.baseTilt + bend * 0.34 + Math.sin(time + data.plant.position.x) * wind * sway) - data.plant.rotation.z) * alpha;
          data.plant.scale.y += ((data.baseScale.y * (0.7 + life * 0.34 - decay * 0.16)) - data.plant.scale.y) * alpha;
          if (data.foliage && data.foliage.material && !drySpecies) {
            const target = new THREE.Color().setHSL(
              def.foliage[0] - 0.06 + life * 0.14,
              def.foliage[1] * (0.4 + saturation * 0.9),
              def.foliage[2] + life * 0.12 - decay * 0.05
            );
            data.foliage.material.color.lerp(target, alpha * 0.18);
          }
        }
      };
      return group;
    }

    static _trunkGeo(species) {
      switch (species) {
        case 'palm': return new THREE.CylinderGeometry(0.9, 1.6, 30, 7);
        case 'cactus': return new THREE.CylinderGeometry(2.6, 3.0, 18, 9);
        case 'dead_tree': return new THREE.CylinderGeometry(0.8, 1.8, 24, 6);
        case 'reeds': return new THREE.CylinderGeometry(0.18, 0.3, 14, 4);
        case 'broadleaf': return new THREE.CylinderGeometry(1.5, 2.4, 18, 8);
        default: return new THREE.CylinderGeometry(1.2, 2.0, 20, 8);
      }
    }

    static _foliageGeo(species) {
      switch (species) {
        case 'broadleaf': return new THREE.IcosahedronGeometry(11, 0);
        case 'palm': return new THREE.ConeGeometry(2.2, 16, 4);
        case 'cactus': return new THREE.SphereGeometry(2.6, 8, 6);
        case 'reeds': return new THREE.ConeGeometry(0.5, 5, 4);
        default: return new THREE.ConeGeometry(8, 25, 8);
      }
    }

    static _build(species, trunkGeo, trunkMat, foliageGeo, foliageMat, index, random) {
      const plant = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      let foliage = null;
      if (species === 'palm') {
        trunk.position.y = 15; trunk.rotation.z = (random(index, 11) - 0.5) * 0.22; plant.add(trunk);
        const fronds = 6 + Math.floor(random(index, 12) * 3);
        for (let f = 0; f < fronds; f += 1) {
          const frond = new THREE.Mesh(foliageGeo, foliageMat);
          const angle = (f / fronds) * Math.PI * 2;
          frond.position.set(Math.cos(angle) * 5, 30, Math.sin(angle) * 5);
          frond.rotation.set(Math.PI / 2.3, 0, -angle); plant.add(frond); foliage = foliage || frond;
        }
      } else if (species === 'cactus') {
        trunk.position.y = 9; plant.add(trunk);
        foliage = new THREE.Mesh(foliageGeo, foliageMat || trunkMat); foliage.position.y = 18; foliage.scale.set(1.1, 0.8, 1.1); plant.add(foliage);
        const arms = random(index, 13) > 0.4 ? 2 : 1;
        for (let a = 0; a < arms; a += 1) {
          const side = a === 0 ? -1 : 1; const arm = new THREE.Mesh(trunkGeo, trunkMat);
          arm.scale.set(0.45, 0.4, 0.45); arm.position.set(side * 3.4, 11 + random(index, 14 + a) * 4, 0); arm.rotation.z = side * 0.55; plant.add(arm);
        }
      } else if (species === 'dead_tree') {
        trunk.position.y = 12; plant.add(trunk);
        const branches = 3 + Math.floor(random(index, 15) * 3);
        for (let b = 0; b < branches; b += 1) {
          const branch = new THREE.Mesh(trunkGeo, trunkMat);
          branch.scale.set(0.32, 0.42, 0.32);
          branch.position.set((random(index, 16 + b) - 0.5) * 5, 16 + b * 3.5, (random(index, 20 + b) - 0.5) * 5);
          branch.rotation.set((random(index, 28 + b) - 0.5) * 1.1, 0, (random(index, 24 + b) - 0.5) * 1.5); plant.add(branch);
        }
      } else if (species === 'reeds') {
        const stalks = 4 + Math.floor(random(index, 17) * 5);
        for (let s = 0; s < stalks; s += 1) {
          const stalk = new THREE.Mesh(trunkGeo, trunkMat);
          stalk.position.set((random(index, 30 + s) - 0.5) * 5, 7 + random(index, 40 + s) * 4, (random(index, 50 + s) - 0.5) * 5);
          stalk.rotation.z = (random(index, 60 + s) - 0.5) * 0.4; plant.add(stalk);
        }
        foliage = new THREE.Mesh(foliageGeo, foliageMat); foliage.position.y = 15; plant.add(foliage);
      } else {
        trunk.position.y = 10; plant.add(trunk);
        foliage = new THREE.Mesh(foliageGeo, foliageMat); foliage.position.y = species === 'broadleaf' ? 26 : 22; plant.add(foliage);
        if (species === 'pine' && random(index, 3) > 0.32) {
          const crown = new THREE.Mesh(foliageGeo, foliage.material); crown.scale.set(0.72, 0.66, 0.72); crown.position.y = 34; plant.add(crown);
        }
      }
      return { plant, foliage };
    }
  }

  global.SceneVegetationGenerator = VegetationGenerator;
})(typeof window !== 'undefined' ? window : globalThis);
