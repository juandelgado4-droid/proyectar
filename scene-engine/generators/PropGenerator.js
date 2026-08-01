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

        if (symbol === 'dog') {
          const bodyMat = assets.getMaterial('propDogBody', () => new THREE.MeshStandardMaterial({ color: 0x6b3f27, roughness: 0.9 }));
          const darkMat = assets.getMaterial('propDogDark', () => new THREE.MeshStandardMaterial({ color: 0x17120f }));
          const body = new THREE.Mesh(new THREE.SphereGeometry(4.8, 12, 8), bodyMat);
          body.scale.set(1.5, 0.85, 0.75);
          place(body, i * 10, { x: -8, y: 4.5, z: -18 });

          const head = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 8), bodyMat);
          head.position.set(-3.2, 7, -18);
          group.add(head);

          for (const side of [-1, 1]) {
            const ear = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.4, 5), darkMat);
            ear.position.set(-4.0, 9.2, -18 + side * 1.8);
            ear.rotation.z = side * 0.45;
            group.add(ear);
          }

          const nose = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), darkMat);
          nose.position.set(-6.0, 7.0, -18);
          group.add(nose);

        } else if (symbol === 'home_room') {
          const wallMat = assets.getMaterial('propHomeWall', () => new THREE.MeshStandardMaterial({ color: 0x654936, roughness: 0.95 }));
          const wall = new THREE.Mesh(new THREE.BoxGeometry(100, 48, 3), wallMat);
          wall.position.set(0, 19, -100);
          group.add(wall);

          const roof = new THREE.Mesh(new THREE.ConeGeometry(72, 32, 4), wallMat);
          roof.rotation.y = Math.PI / 4;
          roof.position.set(0, 59, -100);
          group.add(roof);

        } else if (symbol === 'kitchen_table') {
          const mat = assets.getMaterial('propTable', () => new THREE.MeshStandardMaterial({ color: 0x59381f, roughness: 0.9 }));
          const top = new THREE.Mesh(new THREE.BoxGeometry(34, 2.5, 18), mat);
          top.position.set(0, 9, -22);
          group.add(top);
          for (const x of [-13, 13]) for (const z of [-6, 6]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 9, 8), mat);
            leg.position.set(x, 4, -22 + z);
            group.add(leg);
          }

        } else if (symbol === 'food_bowl') {
          const bowlMat = assets.getMaterial('propBowl', () => new THREE.MeshStandardMaterial({ color: 0xb9c2c8, roughness: 0.45 }));
          const foodMat = assets.getMaterial('propFood', () => new THREE.MeshStandardMaterial({ color: 0x8d542d, roughness: 0.9 }));
          const bowl = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 2.5, 1.5, 16), bowlMat);
          bowl.position.set(-8, 11, -22);
          group.add(bowl);
          const food = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 6), foodMat);
          food.position.set(-8, 12, -22);
          group.add(food);

        } else if (symbol === 'open_door') {
          const mat = assets.getMaterial('propDoor', () => new THREE.MeshStandardMaterial({ color: 0x271d1a, roughness: 0.85 }));
          const frame = new THREE.Mesh(new THREE.BoxGeometry(18, 38, 3), mat);
          frame.position.set(45, 14, -96);
          group.add(frame);
          const light = new THREE.MeshBasicMaterial({ color: 0xffc77a });
          const opening = new THREE.Mesh(new THREE.PlaneGeometry(12, 32), light);
          opening.position.set(45, 14, -94);
          group.add(opening);

        } else if (symbol === 'knives') {
          const mat = assets.getMaterial('propKnife', () => new THREE.MeshStandardMaterial({ color: 0xcbd5df, metalness: 0.8, roughness: 0.25 }));
          for (let j = 0; j < 3; j++) {
            const knife = new THREE.Mesh(new THREE.BoxGeometry(0.7, 12, 1.4), mat);
            knife.position.set(-22 + j * 4, 10, -40);
            knife.rotation.z = (j - 1) * 0.35;
            group.add(knife);
          }

        } else if (symbol === 'photo_frame') {
          const frameMat = assets.getMaterial('propPhotoFrame', () => new THREE.MeshStandardMaterial({ color: 0x9f7b42, roughness: 0.55 }));
          const frame = new THREE.Mesh(new THREE.BoxGeometry(7, 9, 1), frameMat);
          frame.position.set(18, 15, -45);
          group.add(frame);

        } else if (symbol === 'bed') {
          const mat = assets.getMaterial('propBed', () => new THREE.MeshStandardMaterial({ color: 0x4a5870, roughness: 0.9 }));
          const bed = new THREE.Mesh(new THREE.BoxGeometry(32, 5, 13), mat);
          bed.position.set(20, 1, -42);
          group.add(bed);

        } else if (symbol === 'window') {
          const mat = assets.getMaterial('propWindow', () => new THREE.MeshStandardMaterial({ color: 0x86a9c4, emissive: 0x182a43, emissiveIntensity: 0.5 }));
          const window = new THREE.Mesh(new THREE.BoxGeometry(24, 20, 1), mat);
          window.position.set(-28, 25, -98);
          group.add(window);

        } else if (symbol === 'glowing_crystals' || symbol === 'shimmering_motes' || symbol === 'echoing_lights' || symbol === 'drifting_sparks') {
          // Ignorar símbolos abstractos de fallback para mantener el realismo narrativo
          continue;
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
