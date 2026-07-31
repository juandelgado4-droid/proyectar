// ═══════════════════════════════════════════════════════════════════════
// SCENE ENGINE (v7) — Fachada principal que orquesta el Pipeline Cognitivo v7
// MeaningEngine → NarrativeMemory → VisualImaginationEngine → VisualReasoner
// → EmotionPhysics → SymbolEcology → VisualCritic → SceneComposer → Renderer
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class SceneEngine {
    constructor(canvas, options = {}) {
      this.canvas = canvas;

      // 1. Core & Infrastructure
      this.eventBus = new global.SceneEventBus();
      this.assetLibrary = new global.SceneAssetLibrary();
      this.renderer = new global.SceneRenderer(this.canvas, this.eventBus, this.assetLibrary);

      // 2. Cognitive & Meaning Modules (v7)
      this.meaningEngine = new global.SceneMeaningEngine();
      this.narrativeMemory = new global.SceneNarrativeMemory();
      this.visualImagination = new global.SceneVisualImaginationEngine();
      this.visualReasoner = new global.SceneVisualReasoner();
      this.emotionPhysics = new global.SceneEmotionPhysics();
      this.styleEngine = new global.SceneStyleEngine();
      this.visualCritic = new global.SceneVisualCritic();

      // 3. Analysis & Beats
      this.analyzer = global.SceneGemma3LyricAnalyzer 
        ? new global.SceneGemma3LyricAnalyzer()
        : new global.SceneDictionaryAnalyzer();
      this.narrative = new global.SceneNarrativeAnalyzer();
      this.beatEngine = new global.SceneBeatEngine(this.eventBus);
      this.director = new global.SceneDirector(this.eventBus);

      // 4. Subsystems & Composers
      this.lighting = null;
      this.particlePool = null;
      this.weather = null;
      this.cameraDirector = null;
      this.sceneComposer = null;

      this._lastTime = performance.now();
      this._initialized = false;
      this._songSeed = 12345;
      this._songVision = null;
      this._activeSceneEvent = null;
      this._activeVisualScript = null;
    }

    /**
     * Helper to convert artist + title into a numeric seed.
     */
    _hashSeed(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash) || 12345;
    }

    /**
     * Initialize WebGL renderer + active composers & subsystems.
     * Called each time user selects 'escena-ia'.
     */
    init() {
      if (this._initialized) {
        this._disposeSubsystems();
      }

      this.renderer.init();
      const threeScene = this.renderer.scene;
      const threeCamera = this.renderer.camera;

      this.lighting = new global.SceneLightingManager(threeScene, this.eventBus);
      this.particlePool = new global.SceneParticlePool(threeScene, this.eventBus);

      // Register particle behavior implementations
      this.particlePool.registerType('hearts', new global.SceneHeartParticles());
      this.particlePool.registerType('petals', new global.ScenePetalParticles());
      this.particlePool.registerType('rain', new global.SceneRainParticles());
      this.particlePool.registerType('snow', new global.SceneSnowParticles());
      this.particlePool.registerType('fireworks', new global.SceneFireworkParticles());
      this.particlePool.registerType('confetti', new global.SceneConfettiParticles());
      this.particlePool.registerType('embers', new global.SceneEmberParticles());
      this.particlePool.registerType('neon', new global.SceneNeonParticles());
      this.particlePool.registerType('dust', new global.SceneDustParticles());

      this.weather = new global.SceneWeatherSystem(threeScene, this.eventBus, this.particlePool);
      this.cameraDirector = new global.SceneCameraDirector(threeCamera, this.eventBus);

      // Main SceneComposer delegating to World, Stage, Character, and FX composers
      this.sceneComposer = new global.SceneComposer(
        threeScene,
        this.eventBus,
        this.assetLibrary,
        this.particlePool,
        this.weather,
        this.emotionPhysics,
        this.lighting
      );

      this.lighting.setPreset('warm');
      this._initialized = true;
      this._lastTime = performance.now();
    }

    /**
     * Execute full Cognitive Pipeline v7 for a newly loaded song.
     * @param {Array<{timeMs: number, text: string}>} lyricLines
     * @param {Object} metadata
     */
    loadSong(lyricLines, metadata = {}) {
      if (!lyricLines || lyricLines.length === 0) return;
      if (!this._initialized) return;

      const titleKey = `${metadata.artist || ''} - ${metadata.title || ''}`;
      this._songSeed = this._hashSeed(titleKey);

      this.narrativeMemory.reset();
      this.visualCritic.reset();
      this._activeSceneEvent = null;
      this._activeVisualScript = null;

      this.eventBus.emit(global.SceneEventBus.Events.SONG_LOADED, metadata);

      // 1. Surface Lyric Analysis
      const analysisResult = this.analyzer.analyze(lyricLines);
      this.eventBus.emit(global.SceneEventBus.Events.ANALYSIS_COMPLETE, analysisResult);

      // 2. Deep Meaning Extraction (v7)
      const deepMeaning = this.meaningEngine.extractMeaning(analysisResult.blocks);

      // 3. Narrative Structure & Arcs
      const narrativeResult = this.narrative.analyze(analysisResult);
      this.eventBus.emit(global.SceneEventBus.Events.NARRATIVE_COMPLETE, narrativeResult);

      // 4. Silent Film Vision & Cognitive Imagination (v7)
      this._songVision = this.visualImagination.conceiveVision(deepMeaning, narrativeResult, this._songSeed);
      this.styleEngine.setStyle(this._songVision.artStyle);
      if (this.emotionPhysics.reset) this.emotionPhysics.reset(this._songVision.initialWorldState);

      // 5. Rhythm / BPM Detection
      this.beatEngine.analyzeBeatPattern(lyricLines);

      // 6. Contextual Shot Reasoning with VisualCritic loop (v7)
      const timeline = new global.SceneTimeline();
      const shotTrack = timeline.addTrack(global.SceneTimeline.Tracks.SCENE);
      const cameraTrack = timeline.addTrack(global.SceneTimeline.Tracks.CAMERA);
      const lightingTrack = timeline.addTrack(global.SceneTimeline.Tracks.LIGHTING);
      const weatherTrack = timeline.addTrack(global.SceneTimeline.Tracks.WEATHER);
      const particleTrack = timeline.addTrack(global.SceneTimeline.Tracks.PARTICLES);
      const characterTrack = timeline.addTrack(global.SceneTimeline.Tracks.CHARACTERS);

      for (const block of narrativeResult.blocks) {
        let shotConfig = this.visualReasoner.reasonShot(block, this._songVision, this.narrativeMemory);

        // Pre-render evaluation loop (v7 VisualCritic)
        const evalResult = this.visualCritic.evaluateShot(shotConfig);
        if (!evalResult.approved) {
          this.visualCritic.reviseShot(shotConfig, evalResult);
        }

        shotTrack.addEvent(new global.SceneTimelineEvent(
          block.startMs,
          Math.max(1000, block.endMs - block.startMs),
          'setScene',
          shotConfig
        ));

        const durationMs = Math.max(1000, block.endMs - block.startMs);
        cameraTrack.addEvent(new global.SceneTimelineEvent(block.startMs, durationMs, 'setCamera', shotConfig.cameraConfig));
        lightingTrack.addEvent(new global.SceneTimelineEvent(block.startMs, durationMs, 'setLighting', shotConfig.lighting));
        weatherTrack.addEvent(new global.SceneTimelineEvent(block.startMs, durationMs, 'setWeather', shotConfig.weather));
        particleTrack.addEvent(new global.SceneTimelineEvent(block.startMs, durationMs, 'setParticles', { configs: shotConfig.fx && shotConfig.fx.particles || [] }));
        characterTrack.addEvent(new global.SceneTimelineEvent(block.startMs, durationMs, 'setCharacters', shotConfig.characters || {}));

        // Record narrative milestone
        this.narrativeMemory.recordEvent(block.startMs, block.arcPosition || 'beat', {
          blockText: block.text,
          emotion: block.emotion,
          intensity: block.intensity,
          symbolicProps: shotConfig.symbolicProps,
          dramaticPurpose: shotConfig.dramaticPurpose
        });
      }

      // 7. Pass completed timeline to director
      this.director.setTimeline(timeline);

      // Initial composition for first shot
      if (narrativeResult.blocks.length > 0) {
        const firstShot = shotTrack.getEvents()[0];
        if (firstShot && firstShot.data) {
          this.sceneComposer.composeFromScript(firstShot.data, this._songSeed);
          this._activeSceneEvent = firstShot;
          this._activeVisualScript = firstShot.data;
        }
      }
    }

    /**
     * Asynchronously load song with Gemma 3 1B AI analysis.
     * @param {Array<{timeMs: number, text: string}>} lyricLines
     * @param {Object} metadata
     */
    async loadSongAsync(lyricLines, metadata = {}) {
      if (this.analyzer && typeof this.analyzer.analyzeAsync === 'function') {
        try {
          const aiAnalysis = await this.analyzer.analyzeAsync(lyricLines);
          this._applyAnalysisResult(aiAnalysis, lyricLines, metadata);
          return;
        } catch (err) {
          console.warn('Fallback a análisis síncrono por error en IA:', err);
        }
      }
      this.loadSong(lyricLines, metadata);
    }

    /**
     * Apply parsed analysis result to scene engine.
     */
    _applyAnalysisResult(analysisResult, lyricLines, metadata) {
      if (!lyricLines || lyricLines.length === 0) return;
      if (!this._initialized) return;

      const titleKey = `${metadata.artist || ''} - ${metadata.title || ''}`;
      this._songSeed = this._hashSeed(titleKey);

      this.narrativeMemory.reset();
      this.visualCritic.reset();
      this._activeSceneEvent = null;
      this._activeVisualScript = null;

      this.eventBus.emit(global.SceneEventBus.Events.SONG_LOADED, metadata);
      this.eventBus.emit(global.SceneEventBus.Events.ANALYSIS_COMPLETE, analysisResult);

      const deepMeaning = this.meaningEngine.extractMeaning(analysisResult.blocks);
      const narrativeResult = this.narrative.analyze(analysisResult);
      this.eventBus.emit(global.SceneEventBus.Events.NARRATIVE_COMPLETE, narrativeResult);

      this._songVision = this.visualImagination.conceiveVision(deepMeaning, narrativeResult, this._songSeed);
      this.styleEngine.setStyle(this._songVision.artStyle);
      if (this.emotionPhysics.reset) this.emotionPhysics.reset(this._songVision.initialWorldState);

      this.beatEngine.analyzeBeatPattern(lyricLines);

      const timeline = new global.SceneTimeline();
      const shotTrack = timeline.addTrack(global.SceneTimeline.Tracks.SCENE);
      const cameraTrack = timeline.addTrack(global.SceneTimeline.Tracks.CAMERA);
      const lightingTrack = timeline.addTrack(global.SceneTimeline.Tracks.LIGHTING);
      const weatherTrack = timeline.addTrack(global.SceneTimeline.Tracks.WEATHER);
      const particleTrack = timeline.addTrack(global.SceneTimeline.Tracks.PARTICLES);
      const characterTrack = timeline.addTrack(global.SceneTimeline.Tracks.CHARACTERS);

      for (const block of narrativeResult.blocks) {
        let shotConfig = this.visualReasoner.reasonShot(block, this._songVision, this.narrativeMemory);
        const evalResult = this.visualCritic.evaluateShot(shotConfig);
        if (!evalResult.approved) {
          this.visualCritic.reviseShot(shotConfig, evalResult);
        }

        const durationMs = Math.max(1000, block.endMs - block.startMs);
        shotTrack.addEvent(new global.SceneTimelineEvent(block.startMs, durationMs, 'setScene', shotConfig));
        cameraTrack.addEvent(new global.SceneTimelineEvent(block.startMs, durationMs, 'setCamera', shotConfig.cameraConfig));
        lightingTrack.addEvent(new global.SceneTimelineEvent(block.startMs, durationMs, 'setLighting', shotConfig.lighting));
        weatherTrack.addEvent(new global.SceneTimelineEvent(block.startMs, durationMs, 'setWeather', shotConfig.weather));
        particleTrack.addEvent(new global.SceneTimelineEvent(block.startMs, durationMs, 'setParticles', { configs: shotConfig.fx && shotConfig.fx.particles || [] }));
        characterTrack.addEvent(new global.SceneTimelineEvent(block.startMs, durationMs, 'setCharacters', shotConfig.characters || {}));

        this.narrativeMemory.recordEvent(block.startMs, block.arcPosition || 'beat', {
          blockText: block.text,
          emotion: block.emotion,
          intensity: block.intensity,
          symbolicProps: shotConfig.symbolicProps,
          dramaticPurpose: shotConfig.dramaticPurpose
        });
      }

      this.director.setTimeline(timeline);

      if (narrativeResult.blocks.length > 0) {
        const firstShot = shotTrack.getEvents()[0];
        if (firstShot && firstShot.data) {
          this.sceneComposer.composeFromScript(firstShot.data, this._songSeed);
          this._activeSceneEvent = firstShot;
          this._activeVisualScript = firstShot.data;
        }
      }
    }

    /**
     * Frame update loop.
     * @param {number} positionMs
     */
    update(positionMs) {
      if (!this._initialized) return;

      const now = performance.now();
      const deltaTime = Math.min(0.1, (now - this._lastTime) / 1000);
      this._lastTime = now;

      // Update rhythm
      this.beatEngine.update(positionMs);
      const beatIntensity = this.beatEngine.getBeatIntensity();

      // Update timeline & director
      this.director.update(positionMs);

      // Compose only when the narrative asks for a new shot. WorldState is animated below.
      if (this.director._timeline) {
        const activeEvent = this.director._timeline.getTrack(global.SceneTimeline.Tracks.SCENE)?.getActiveEvent(positionMs);
        if (activeEvent && activeEvent.data && this.sceneComposer) {
          if (activeEvent !== this._activeSceneEvent) {
            this.sceneComposer.composeFromScript(activeEvent.data, this._songSeed);
            this._activeSceneEvent = activeEvent;
            this._activeVisualScript = activeEvent.data;
          }

          this.emotionPhysics.updateWorldState(
            activeEvent.data.emotion,
            activeEvent.data.intensity || 0.5,
            activeEvent.data.worldState
          );
          if (this.emotionPhysics.update) this.emotionPhysics.update(deltaTime);
          this.sceneComposer.applyWorldState(
            this.emotionPhysics.getForces(),
            activeEvent.data,
            deltaTime,
            activeEvent.getProgress(positionMs)
          );
          const focus = this.sceneComposer.getFocusAnchor(activeEvent.data.cameraConfig && activeEvent.data.cameraConfig.targetRole);
          if (focus && this.cameraDirector && this.cameraDirector.setFocusTarget) this.cameraDirector.setFocusTarget(focus);
        }
      }

      // Update subsystems
      if (this.cameraDirector) this.cameraDirector.update(deltaTime);
      if (this.lighting) this.lighting.update(deltaTime);
      if (this.particlePool) this.particlePool.update(deltaTime);
      if (this.weather) this.weather.update(deltaTime);
      if (this.sceneComposer) this.sceneComposer.update(deltaTime);

      // Render Three.js frame
      this.renderer.render(deltaTime, beatIntensity);
    }

    resize(w, h) {
      this.renderer.resize(w, h);
    }

    _disposeSubsystems() {
      if (this.sceneComposer) { this.sceneComposer.dispose(); this.sceneComposer = null; }
      if (this.particlePool) { this.particlePool.dispose(); this.particlePool = null; }
      if (this.lighting) { this.lighting.dispose(); this.lighting = null; }
      if (this.weather) { this.weather.dispose(); this.weather = null; }
      if (this.cameraDirector) { this.cameraDirector.dispose(); this.cameraDirector = null; }
      this._activeSceneEvent = null;
      this._activeVisualScript = null;
    }

    dispose() {
      this.eventBus.emit(global.SceneEventBus.Events.CLEANUP);
      this.director.reset();
      this._disposeSubsystems();
      this.renderer.dispose();
      this.assetLibrary.dispose();
      this.eventBus.clear();
      this._initialized = false;
    }
  }

  global.SceneEngine = SceneEngine;
})(typeof window !== 'undefined' ? window : globalThis);
