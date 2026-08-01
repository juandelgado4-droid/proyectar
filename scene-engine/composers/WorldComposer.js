// ═══════════════════════════════════════════════════════════════════════
// WORLD COMPOSER — Ensamblador de Terreno y Cielo
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class WorldComposer {
    constructor(scene, assetLibrary) {
      this.scene = scene;
      this.assets = assetLibrary;
      this.group = new THREE.Group();
      this.scene.add(this.group);
      this.terrain = null;
      this.sky = null;
      this._worldSpec = null;
    }

    compose(worldSpec = {}, seed = 1) {
      this.dispose();
      this.group = new THREE.Group();
      this._worldSpec = { ...worldSpec };
      const biome = worldSpec.biome || {};
      const ground = biome.ground || {};

      this.terrain = global.SceneTerrainGenerator.generate(this.scene, this.assets, {
        type: worldSpec.terrainType || biome.terrain || 'hills',
        composition: worldSpec.composition,
        color: ground.base != null ? ground.base : (worldSpec.terrainColor || 0x122617),
        palette: ground,
        seed
      });
      this.group.add(this.terrain);

      this.sky = global.SceneSkyGenerator.generate(this.scene, this.assets, { seed, sky: worldSpec.sky || biome.sky });
      this.group.add(this.sky);

      if (biome.fog) this.scene.fog = new THREE.FogExp2(biome.fog.color, biome.fog.density);

      this.scene.add(this.group);
    }

    applyWorldState(forces, worldSpec = {}, deltaTime = 0.016) {
      const state = forces.globalState || {};
      const local = forces.localState || {};
      const alpha = 1 - Math.exp(-deltaTime * 1.6);
      if (this.terrain && this.terrain.userData && this.terrain.userData.applyWorldState) {
        this.terrain.userData.applyWorldState(state, local, alpha);
      }
      if (this.sky && this.sky.userData && this.sky.userData.applyWorldState) {
        this.sky.userData.applyWorldState(state, local, alpha);
      }
      if (this.scene.fog) this.scene.fog.density += ((local.fogDensity || this.scene.fog.density) - this.scene.fog.density) * alpha;
    }

    dispose() {
      if (this.group) {
        this.scene.remove(this.group);
        this.group.clear();
      }
      this.terrain = null;
      this.sky = null;
    }
  }

  global.SceneWorldComposer = WorldComposer;
})(typeof window !== 'undefined' ? window : globalThis);
