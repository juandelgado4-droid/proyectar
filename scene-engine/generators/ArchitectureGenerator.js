// ARCHITECTURE GENERATOR - Procedural kits selected by the active biome.
(function (global) {
  'use strict';

  class ArchitectureGenerator {
    static generate(scene, assets, spec = {}) {
      const group = new THREE.Group();
      const kit = spec.kit || 'columns';
      if (kit === 'none') { group.userData.applyWorldState = function () {}; return group; }
      const style = spec.style || 'gothic';
      const seed = spec.seed || 1;
      const random = (index, channel = 0) => {
        const value = Math.sin(seed * 0.139 + index * 17.217 + channel * 19.19) * 43758.5453;
        return value - Math.floor(value);
      };
      const structures = [];
      const stoneMat = assets.getMaterial(`arch_stone_${style}`, () => new THREE.MeshPhongMaterial({
        color: style === 'realistic' ? 0x57534c : 0x403d50, flatShading: true
      }));
      switch (kit) {
        case 'towers': ArchitectureGenerator._towers(group, assets, spec, random, structures); break;
        case 'houses': ArchitectureGenerator._houses(group, assets, spec, random, structures, stoneMat); break;
        case 'cathedral': ArchitectureGenerator._cathedral(group, assets, spec, random, structures, stoneMat); break;
        case 'room': ArchitectureGenerator._room(group, assets, structures, stoneMat); break;
        default: ArchitectureGenerator._columns(group, assets, spec, random, structures, stoneMat); break;
      }
      group.userData.applyWorldState = (state, local, forces, alpha) => {
        const target = new THREE.Color().setHSL(
          0.06 + (state.temperature || 0.5) * 0.05,
          0.10 + (state.life || 0.4) * 0.12,
          0.18 + (1 - (state.decay || 0.2)) * 0.16
        );
        stoneMat.color.lerp(target, alpha * 0.4);
        const haze = Math.min(0.26, (local.fogDensity || 0) * 18);
        const audioMid = local.audioMid || 0;
        for (const structure of structures) {
          if (structure.mesh !== group) structure.mesh.position.y += ((structure.baseY + haze * 1.2) - structure.mesh.position.y) * alpha;
          if (structure.emissiveMat) {
            const light = state.light != null ? state.light : 0.5;
            const targetIntensity = 0.4 + (1 - light) * 1.6 + (state.chaos || 0) * 0.6 + audioMid * 0.9;
            structure.emissiveMat.emissiveIntensity += (targetIntensity - structure.emissiveMat.emissiveIntensity) * alpha * 0.4;
          }
        }
      };
      return group;
    }

    static _columns(group, assets, spec, random, structures, material) {
      const composition = spec.composition || 'clearing';
      const plaza = ['ruined_plaza', 'spiral_ruins', 'plaza'].includes(composition);
      const count = spec.count || (plaza ? 12 : 5);
      const geo = assets.getGeometry('archColGeo', () => new THREE.CylinderGeometry(2, 2.5, 30, 10));
      for (let i = 0; i < count; i += 1) {
        const column = new THREE.Mesh(geo, material);
        const angle = (i / count) * Math.PI * 2 + (spec.seed || 1) * 0.03;
        const side = i % 2 === 0 ? -1 : 1;
        const x = plaza ? Math.cos(angle) * (54 + random(i) * 36) : side * (62 + random(i) * 74);
        const z = plaza ? -42 + Math.sin(angle) * 46 : -52 - random(i, 1) * 148;
        const height = 0.45 + random(i, 2) * 1.3;
        column.position.set(x, -5 + 15 * height, z);
        column.scale.set(0.7 + random(i, 3) * 0.85, height, 0.7 + random(i, 4) * 0.72);
        column.rotation.z = (random(i, 5) - 0.5) * 0.28;
        column.castShadow = true; column.receiveShadow = true;
        structures.push({ mesh: column, baseY: column.position.y }); group.add(column);
      }
      if (plaza) {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(16, 1.7, 8, 16, Math.PI), material);
        arch.position.set(0, 25, -86); arch.rotation.z = Math.PI; group.add(arch);
        structures.push({ mesh: arch, baseY: arch.position.y });
      }
    }

    static _towers(group, assets, spec, random, structures) {
      const count = spec.count || 16;
      const neon = !!spec.neon;
      const geo = assets.getGeometry('archBoxGeo', () => new THREE.BoxGeometry(1, 1, 1));
      const bodyMat = assets.getMaterial(`archTowerMat_${neon ? 'neon' : 'std'}`, () =>
        new THREE.MeshStandardMaterial({ color: neon ? 0x14101f : 0x24242a, roughness: 0.85, flatShading: true }));
      const windowMat = assets.getMaterial(`archWinMat_${neon ? 'neon' : 'std'}`, () => new THREE.MeshStandardMaterial({
        color: 0x000000, emissive: neon ? 0xff2f8e : 0xffd08a, emissiveIntensity: 1.2
      }));
      for (let i = 0; i < count; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        const depth = i / count;
        const width = 16 + random(i) * 22;
        const height = 45 + random(i, 1) * 165;
        const length = 16 + random(i, 2) * 20;
        const tower = new THREE.Mesh(geo, bodyMat);
        tower.scale.set(width, height, length);
        tower.position.set(side * (46 + random(i, 3) * 120), -5 + height / 2, -30 - depth * 300 - random(i, 4) * 40);
        tower.castShadow = true; group.add(tower); structures.push({ mesh: tower, baseY: tower.position.y });
        const rows = Math.max(3, Math.floor(height / 16));
        const cols = Math.max(2, Math.floor(width / 7));
        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            if (random(i * 97 + row * 13 + col, 5) < 0.45) continue;
            const window = new THREE.Mesh(geo, windowMat);
            window.scale.set(2.6, 3.4, 0.6);
            window.position.set(tower.position.x - width / 2 + 5 + col * (width / cols), -5 + 9 + row * (height / rows), tower.position.z + length / 2 + 0.4);
            group.add(window);
          }
        }
      }
      structures.push({ mesh: group, baseY: 0, emissiveMat: windowMat });
    }

    static _houses(group, assets, spec, random, structures, material) {
      const count = spec.count || 8;
      const boxGeo = assets.getGeometry('archBoxGeo', () => new THREE.BoxGeometry(1, 1, 1));
      const roofGeo = assets.getGeometry('archRoofGeo', () => new THREE.ConeGeometry(1, 1, 4));
      const roofMat = assets.getMaterial('archRoofMat', () => new THREE.MeshPhongMaterial({ color: 0x5a2f26, flatShading: true }));
      for (let i = 0; i < count; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        const width = 18 + random(i) * 12;
        const height = 14 + random(i, 1) * 10;
        const x = side * (58 + random(i, 2) * 70);
        const z = -40 - (i / count) * 220 - random(i, 3) * 30;
        const body = new THREE.Mesh(boxGeo, material);
        body.scale.set(width, height, width * 0.9); body.position.set(x, -5 + height / 2, z); body.castShadow = true;
        group.add(body); structures.push({ mesh: body, baseY: body.position.y });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.scale.set(width * 0.85, height * 0.6, width * 0.75); roof.rotation.y = Math.PI / 4; roof.position.set(x, -5 + height + height * 0.3, z);
        group.add(roof); structures.push({ mesh: roof, baseY: roof.position.y });
      }
    }

    static _cathedral(group, assets, spec, random, structures, material) {
      const nave = new THREE.Mesh(new THREE.BoxGeometry(64, 58, 120), material);
      nave.position.set(0, 24, -140); nave.castShadow = true; group.add(nave); structures.push({ mesh: nave, baseY: nave.position.y });
      const spire = new THREE.Mesh(new THREE.ConeGeometry(16, 70, 6), material);
      spire.position.set(0, 88, -140); group.add(spire); structures.push({ mesh: spire, baseY: spire.position.y });
      const arch = new THREE.Mesh(new THREE.TorusGeometry(16, 2.2, 8, 18, Math.PI), material);
      arch.position.set(0, 22, -78); group.add(arch); structures.push({ mesh: arch, baseY: arch.position.y });
      const geo = assets.getGeometry('archColGeo', () => new THREE.CylinderGeometry(2, 2.5, 30, 10));
      const count = spec.count || 10;
      for (let i = 0; i < count; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        const column = new THREE.Mesh(geo, material);
        const height = 0.6 + random(i, 2) * 0.9;
        column.position.set(side * 48, -5 + 15 * height, -20 - Math.floor(i / 2) * 34);
        column.scale.set(0.9, height, 0.9); column.rotation.z = (random(i, 5) - 0.5) * 0.2; column.castShadow = true;
        group.add(column); structures.push({ mesh: column, baseY: column.position.y });
      }
    }

    static _room(group, assets, structures, material) {
      const geo = assets.getGeometry('archBoxGeo', () => new THREE.BoxGeometry(1, 1, 1));
      const walls = [
        { size: [220, 110, 4], position: [0, 50, -110] }, { size: [4, 110, 220], position: [-110, 50, 0] },
        { size: [4, 110, 220], position: [110, 50, 0] }, { size: [220, 4, 220], position: [0, 105, 0] }
      ];
      for (const wallSpec of walls) {
        const wall = new THREE.Mesh(geo, material); wall.scale.set(...wallSpec.size); wall.position.set(...wallSpec.position); wall.receiveShadow = true;
        group.add(wall); structures.push({ mesh: wall, baseY: wall.position.y });
      }
      const windowMat = assets.getMaterial('archRoomWin', () => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x9fc4ff, emissiveIntensity: 1.4 }));
      const window = new THREE.Mesh(geo, windowMat); window.scale.set(46, 58, 2); window.position.set(-30, 58, -107);
      group.add(window); structures.push({ mesh: window, baseY: window.position.y, emissiveMat: windowMat });
    }
  }

  global.SceneArchitectureGenerator = ArchitectureGenerator;
})(typeof window !== 'undefined' ? window : globalThis);
