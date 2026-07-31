// ═══════════════════════════════════════════════════════════════════════
// STAGE COMPOSER — Ensamblador de Escenografía, Arquitectura y Props
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class StageComposer {
    constructor(scene, assetLibrary) {
      this.scene = scene;
      this.assets = assetLibrary;
      this.group = new THREE.Group();
      this.scene.add(this.group);
      this.vegetation = null;
      this.architecture = null;
      this.props = null;
      this._symbolKey = '';
    }

    compose(stageSpec = {}, seed = 1) {
      this.dispose();
      this.group = new THREE.Group();

      this.vegetation = global.SceneVegetationGenerator.generate(this.scene, this.assets, {
        density: stageSpec.density || 0.6,
        foregroundDensity: stageSpec.foregroundDensity,
        focalClearance: stageSpec.focalClearance,
        composition: stageSpec.composition,
        seed
      });
      this.group.add(this.vegetation);

      this.architecture = global.SceneArchitectureGenerator.generate(this.scene, this.assets, {
        style: stageSpec.artStyle || 'gothic',
        composition: stageSpec.composition,
        count: stageSpec.architectureCount,
        seed
      });
      this.group.add(this.architecture);

      this.props = global.ScenePropGenerator.generate(this.scene, this.assets, stageSpec.symbolicProps || [], seed);
      this.group.add(this.props);
      this._symbolKey = (stageSpec.symbolicProps || []).slice().sort().join('|');

      this.scene.add(this.group);
    }

    applyScript(stageSpec = {}, seed = 1) {
      const symbols = stageSpec.symbolicProps || [];
      const nextKey = symbols.slice().sort().join('|');
      if (nextKey === this._symbolKey) return;
      if (this.props) this.group.remove(this.props);
      this.props = global.ScenePropGenerator.generate(this.scene, this.assets, symbols, seed);
      this.group.add(this.props);
      this._symbolKey = nextKey;
    }

    applyWorldState(forces, stageSpec = {}, deltaTime = 0.016) {
      const state = forces.globalState || {};
      const local = forces.localState || {};
      const alpha = 1 - Math.exp(-deltaTime * 1.8);
      for (const element of [this.vegetation, this.architecture, this.props]) {
        if (element && element.userData && element.userData.applyWorldState) {
          element.userData.applyWorldState(state, local, forces, alpha);
        }
      }
    }

    dispose() {
      if (this.group) {
        this.scene.remove(this.group);
        this.group.clear();
      }
      this.vegetation = null;
      this.architecture = null;
      this.props = null;
      this._symbolKey = '';
    }
  }

  global.SceneStageComposer = StageComposer;
})(typeof window !== 'undefined' ? window : globalThis);
