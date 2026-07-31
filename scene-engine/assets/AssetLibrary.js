// ═══════════════════════════════════════════════════════════════════════
// ASSET LIBRARY — Caché central de geometrías, materiales y texturas
// Nunca se crea el mismo recurso dos veces
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class AssetLibrary {
    constructor() {
      this._geometries = new Map();
      this._materials = new Map();
      this._textures = new Map();
    }

    /**
     * Get or create a cached geometry.
     * @param {string} name - Unique identifier
     * @param {Function} factory - () => THREE.BufferGeometry
     * @returns {THREE.BufferGeometry}
     */
    getGeometry(name, factory) {
      if (!this._geometries.has(name)) {
        this._geometries.set(name, factory());
      }
      return this._geometries.get(name);
    }

    /**
     * Get or create a cached material.
     * @param {string} name - Unique identifier
     * @param {Function} factory - () => THREE.Material
     * @returns {THREE.Material}
     */
    getMaterial(name, factory) {
      if (!this._materials.has(name)) {
        this._materials.set(name, factory());
      }
      return this._materials.get(name);
    }

    /**
     * Get or create a cached texture.
     * @param {string} name - Unique identifier
     * @param {Function} factory - () => THREE.Texture
     * @returns {THREE.Texture}
     */
    getTexture(name, factory) {
      if (!this._textures.has(name)) {
        this._textures.set(name, factory());
      }
      return this._textures.get(name);
    }

    /**
     * Check if a geometry exists.
     * @param {string} name
     * @returns {boolean}
     */
    hasGeometry(name) { return this._geometries.has(name); }

    /**
     * Check if a material exists.
     * @param {string} name
     * @returns {boolean}
     */
    hasMaterial(name) { return this._materials.has(name); }

    /**
     * Create a procedural canvas texture and cache it.
     * @param {string} name
     * @param {number} width
     * @param {number} height
     * @param {Function} drawFn - (ctx, w, h) => void
     * @returns {THREE.CanvasTexture}
     */
    getCanvasTexture(name, width, height, drawFn) {
      if (!this._textures.has(name)) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        drawFn(ctx, width, height);
        const tex = new THREE.CanvasTexture(canvas);
        this._textures.set(name, tex);
      }
      return this._textures.get(name);
    }

    /**
     * Dispose resources that are not in the active set.
     * @param {Set<string>} activeNames - Names currently in use
     */
    disposeUnused(activeNames) {
      for (const [name, geo] of this._geometries) {
        if (!activeNames.has(name)) {
          geo.dispose();
          this._geometries.delete(name);
        }
      }
      for (const [name, mat] of this._materials) {
        if (!activeNames.has(name)) {
          mat.dispose();
          this._materials.delete(name);
        }
      }
      for (const [name, tex] of this._textures) {
        if (!activeNames.has(name)) {
          tex.dispose();
          this._textures.delete(name);
        }
      }
    }

    /** Dispose all resources. */
    dispose() {
      for (const geo of this._geometries.values()) geo.dispose();
      for (const mat of this._materials.values()) mat.dispose();
      for (const tex of this._textures.values()) tex.dispose();
      this._geometries.clear();
      this._materials.clear();
      this._textures.clear();
    }
  }

  global.SceneAssetLibrary = AssetLibrary;
})(typeof window !== 'undefined' ? window : globalThis);
