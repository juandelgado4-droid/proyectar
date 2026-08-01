// ═══════════════════════════════════════════════════════════════════════
// SCENE COMPOSER — Orquestador principal de Composers Procedurales (v7)
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class SceneComposer {
    constructor(scene, eventBus, assetLibrary, particlePool, weatherSystem, emotionPhysics, lightingManager = null) {
      this.scene = scene;
      this.eventBus = eventBus;
      this.assets = assetLibrary;
      this.lightingManager = lightingManager;
      this._baseSignature = null;
      this._currentScript = null;

      this.worldComposer = new global.SceneWorldComposer(this.scene, this.assets);
      this.stageComposer = new global.SceneStageComposer(this.scene, this.assets);
      this.characterComposer = new global.SceneCharacterComposer(this.scene, this.assets, this.eventBus);
      this.fxComposer = new global.SceneFXComposer(this.scene, this.eventBus, particlePool, weatherSystem, emotionPhysics);
    }

    /**
     * Compose an entire procedural 3D scene from a VisualScript.
     * @param {Object} visualScript
     * @param {number} seed
     */
    composeFromScript(visualScript, seed = 1) {
      if (!visualScript) return;

      const inheritedBiome = visualScript.biome || (visualScript.world && visualScript.world.biome) || null;
      const worldSpec = {
        ...(visualScript.world || {
        terrainType: visualScript.worldConcept === 'ocean' ? 'lake' : 'hills',
        composition: visualScript.composition,
        terrainColor: visualScript.terrainColor
        }),
        biome: inheritedBiome
      };
      const stageSpec = {
        ...(visualScript.stage || {
        artStyle: visualScript.artStyle,
        symbolicProps: visualScript.symbolicProps,
        composition: visualScript.composition
        }),
        biome: inheritedBiome
      };
      const baseSignature = JSON.stringify({
        biome: inheritedBiome && inheritedBiome.id,
        act: visualScript.actIndex != null ? visualScript.actIndex : 0,
        world: worldSpec.baseIdentity || worldSpec.composition || worldSpec.terrainType,
        style: visualScript.artStyle,
        cast: (visualScript.characters && visualScript.characters.cast || []).map(actor => actor.id)
      });

      // The setting is built once per narrative world. Subsequent blocks animate it.
      if (baseSignature !== this._baseSignature) {
        const actSeed = seed + ((visualScript.actIndex || 0) * 7919);
        this.worldComposer.compose(worldSpec, actSeed);
        this.stageComposer.compose(stageSpec, actSeed);
        this.characterComposer.compose(visualScript.characters || { cast: visualScript.cast }, actSeed);
        this._baseSignature = baseSignature;
      } else if (this.stageComposer.applyScript) {
        // Symbolic props may evolve while the location itself remains recognisable.
        this.stageComposer.applyScript(stageSpec, seed);
      }

      this._currentScript = visualScript;
      this.fxComposer.compose(visualScript.fx || {
        weatherType: visualScript.emotion === 'sad' ? 'rain' : 'clear',
        particles: [{ type: visualScript.emotion === 'love' ? 'hearts' : 'dust' }]
      });

      if (this.lightingManager && visualScript.lighting) {
        this.lightingManager.setCinematicRig(visualScript.lighting);
      }
    }

    /** Apply the changing WorldState without recreating meshes or actors. */
    applyWorldState(forces, visualScript, deltaTime, progress = 0) {
      const script = visualScript || this._currentScript;
      if (!script || !forces) return;

      if (this.worldComposer.applyWorldState) this.worldComposer.applyWorldState(forces, script.world, deltaTime, progress);
      if (this.stageComposer.applyWorldState) this.stageComposer.applyWorldState(forces, script.stage, deltaTime, progress);
      if (this.characterComposer.applyDirection) this.characterComposer.applyDirection(script.characters || {}, forces, deltaTime, progress);
      if (this.fxComposer.applyWorldState) this.fxComposer.applyWorldState(forces, script.fx || {}, deltaTime, progress);
      if (this.lightingManager && this.lightingManager.applyWorldState) {
        this.lightingManager.applyWorldState(forces, script.lighting || {}, deltaTime, progress);
      }
    }

    getFocusAnchor(role) {
      return this.characterComposer && this.characterComposer.getFocusAnchor
        ? this.characterComposer.getFocusAnchor(role)
        : null;
    }

    update(deltaTime) {
      if (this.characterComposer) this.characterComposer.update(deltaTime);
      if (this.fxComposer) this.fxComposer.update(deltaTime);
    }

    dispose() {
      if (this.worldComposer) this.worldComposer.dispose();
      if (this.stageComposer) this.stageComposer.dispose();
      if (this.characterComposer) this.characterComposer.dispose();
      if (this.fxComposer) this.fxComposer.dispose();
      this._baseSignature = null;
      this._currentScript = null;
    }
  }

  global.SceneComposer = SceneComposer;
})(typeof window !== 'undefined' ? window : globalThis);
