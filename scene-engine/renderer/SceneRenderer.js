// ═══════════════════════════════════════════════════════════════════════
// SCENE RENDERER — Renderer principal en Three.js con soporte para escenas composables
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class SceneRenderer {
    constructor(canvas, eventBus, assetLibrary) {
      this.canvas = canvas;
      this.eventBus = eventBus;
      this.assets = assetLibrary;

      this.renderer = null;
      this.scene = null;
      this.camera = null;

      this.scenes = new Map();
      this.activeScene = null;

      if (this.eventBus) {
        // Cognitive VisualScripts share this event name with legacy registered scenes.
        // Only named legacy scenes belong to this renderer switcher.
        this.eventBus.on(global.SceneEventBus.Events.SCENE_CHANGED, data => {
          if (data && typeof data.scene === 'string') this.switchScene(data.scene);
        });
      }
    }

    /**
     * Initialize (or re-initialize) the Three.js renderer.
     * Must be called each time the 'escena-ia' bg becomes active,
     * because 'universo' creates its own WebGLRenderer on the same canvas.
     */
    init() {
      // Dispose previous renderer if any
      if (this.renderer) {
        try { this.renderer.dispose(); } catch (_) {}
      }

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
      this.camera.position.set(0, 40, 220);

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.shadowMap.enabled = true;
      if (THREE.PCFSoftShadowMap) this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if ('toneMapping' in this.renderer && THREE.ACESFilmicToneMapping) this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      if ('toneMappingExposure' in this.renderer) this.renderer.toneMappingExposure = 1.08;
      if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      // Re-register scenes with the new THREE.Scene instance
      const sceneEntries = [...this.scenes.entries()];
      this.scenes.clear();
      for (const [name, factory] of sceneEntries) {
        const instance = factory(this.scene, this.assets);
        this.scenes.set(name, { factory, instance });
      }
    }

    /**
     * Register a scene factory. Called once during SceneEngine construction.
     * @param {string} name
     * @param {Function} factory - (threeScene, assetLibrary) => IScene instance
     */
    registerSceneFactory(name, factory) {
      this.scenes.set(name, { factory, instance: null });
    }

    /**
     * Build instance if needed and switch to it.
     */
    switchScene(name) {
      if (!this.scene) return;
      if (this.activeScene && this.activeScene.getName() === name) return;

      if (this.activeScene) {
        this.activeScene.dispose();
      }

      const entry = this.scenes.get(name) || this.scenes.get('forest');
      if (entry) {
        if (!entry.instance || !entry.instance.scene) {
          entry.instance = entry.factory(this.scene, this.assets);
        }
        this.activeScene = entry.instance;
        this.activeScene.build();
      }
    }

    render(deltaTime = 0.016, beatIntensity = 0) {
      if (!this.renderer || !this.scene || !this.camera) return;
      if (this.activeScene) {
        this.activeScene.update(deltaTime, beatIntensity);
      }
      this.renderer.render(this.scene, this.camera);
    }

    resize(width, height) {
      if (!this.renderer || !this.camera) return;
      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    dispose() {
      if (this.activeScene) {
        this.activeScene.dispose();
        this.activeScene = null;
      }
      if (this.renderer) {
        try { this.renderer.dispose(); } catch (_) {}
        this.renderer = null;
      }
      this.scene = null;
      this.camera = null;
    }
  }

  global.SceneRenderer = SceneRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
