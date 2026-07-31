// ═══════════════════════════════════════════════════════════════════════
// ISCENE — Interfaz base para escenas/entornos 3D composables
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class IScene {
    /**
     * @param {THREE.Scene} threeScene
     * @param {SceneAssetLibrary} assetLibrary
     */
    constructor(threeScene, assetLibrary) {
      this.scene = threeScene;
      this.assets = assetLibrary;
      this.group = new THREE.Group();
      this.scene.add(this.group);
    }

    getName() {
      throw new Error('IScene.getName() must be implemented');
    }

    /**
     * Build procedural 3D environment elements.
     * @param {Object} config
     */
    build(config = {}) {
      throw new Error('IScene.build() must be implemented');
    }

    /**
     * Update animations/procedural elements each frame.
     * @param {number} deltaTime
     * @param {number} beatIntensity
     */
    update(deltaTime, beatIntensity = 0) {}

    /**
     * Modify environment dynamically (density, variation, colors).
     * @param {Object} config
     */
    setVariation(config = {}) {}

    /** Clean up 3D meshes from scene. */
    dispose() {
      if (this.group) {
        this.scene.remove(this.group);
        this.group.clear();
      }
    }
  }

  global.IScene = IScene;
})(typeof window !== 'undefined' ? window : globalThis);
