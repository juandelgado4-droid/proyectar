// SCENE ENGINE - Cognitive pipeline facade for Aurora Letras.
(function (global) {
  'use strict';

  class SceneEngine {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.eventBus = new global.SceneEventBus();
      this.assetLibrary = new global.SceneAssetLibrary();
      this.renderer = new global.SceneRenderer(canvas, this.eventBus, this.assetLibrary);
      this.meaningEngine = new global.SceneMeaningEngine();
      this.narrativeMemory = new global.SceneNarrativeMemory();
      this.visualImagination = new global.SceneVisualImaginationEngine();
      this.visualReasoner = new global.SceneVisualReasoner();
      this.emotionPhysics = new global.SceneEmotionPhysics();
      this.styleEngine = new global.SceneStyleEngine();
      this.visualCritic = new global.SceneVisualCritic();
      // Aurora is offline-first: no Ollama, model download or localhost service is required.
      // A host app may explicitly opt into a local LLM later with enableLocalLLM.
      this.analyzer = options.enableLocalLLM && global.SceneGemma3LyricAnalyzer
        ? new global.SceneGemma3LyricAnalyzer(options.analyzerOptions)
        : new global.SceneDictionaryAnalyzer();
      this.narrative = new global.SceneNarrativeAnalyzer();
      this.beatEngine = new global.SceneBeatEngine(this.eventBus);
      this.director = new global.SceneDirector(this.eventBus);
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
      this._analysisRequestId = 0;
    }

    _hashSeed(value) {
      let hash = 0;
      for (let i = 0; i < value.length; i += 1) { hash = (hash << 5) - hash + value.charCodeAt(i); hash |= 0; }
      return Math.abs(hash) || 12345;
    }

    init() {
      if (this._initialized) this._disposeSubsystems();
      this.renderer.init();
      const threeScene = this.renderer.scene;
      const threeCamera = this.renderer.camera;
      this.lighting = new global.SceneLightingManager(threeScene, this.eventBus);
      this.particlePool = new global.SceneParticlePool(threeScene, this.eventBus);
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
      this.sceneComposer = new global.SceneComposer(threeScene, this.eventBus, this.assetLibrary, this.particlePool, this.weather, this.emotionPhysics, this.lighting);
      this.lighting.setPreset('warm');
      this._initialized = true;
      this._lastTime = performance.now();
    }

    loadSong(lyricLines, metadata = {}) {
      if (!lyricLines || lyricLines.length === 0 || !this._initialized) return;
      this._analysisRequestId += 1;
      this._applyAnalysisResult(this.analyzer.analyze(lyricLines), lyricLines, metadata);
    }

    async loadSongAsync(lyricLines, metadata = {}) {
      if (!lyricLines || lyricLines.length === 0 || !this._initialized) return;
      const requestId = ++this._analysisRequestId;
      if (this.analyzer && typeof this.analyzer.analyzeAsync === 'function') {
        try {
          const analysis = await this.analyzer.analyzeAsync(lyricLines, metadata);
          if (requestId !== this._analysisRequestId) return;
          this._applyAnalysisResult(analysis, lyricLines, metadata);
          return;
        } catch (error) {
          console.warn('[SceneEngine] AI analysis failed; using synchronous fallback.', error);
        }
      }
      if (requestId === this._analysisRequestId) this._applyAnalysisResult(this.analyzer.analyze(lyricLines), lyricLines, metadata);
    }

    _applyAnalysisResult(analysisResult, lyricLines, metadata = {}) {
      if (!analysisResult || !lyricLines || lyricLines.length === 0 || !this._initialized) return;
      this._songSeed = this._hashSeed(`${metadata.artist || ''} - ${metadata.title || ''}`);
      this.narrativeMemory.reset();
      this.visualCritic.reset();
      this._activeSceneEvent = null;
      this._activeVisualScript = null;
      this.eventBus.emit(global.SceneEventBus.Events.SONG_LOADED, metadata);
      this.eventBus.emit(global.SceneEventBus.Events.ANALYSIS_COMPLETE, analysisResult);
      const deepMeaning = this.meaningEngine.extractMeaning(analysisResult.blocks || []);
      this._mergeAITheme(deepMeaning, analysisResult);
      const narrativeResult = this.narrative.analyze(analysisResult);
      this.eventBus.emit(global.SceneEventBus.Events.NARRATIVE_COMPLETE, narrativeResult);
      this._songVision = this.visualImagination.conceiveVision(deepMeaning, narrativeResult, this._songSeed, analysisResult.richVision || null);
      this.styleEngine.setStyle(this._songVision.artStyle);
      if (this.emotionPhysics.reset) this.emotionPhysics.reset(this._songVision.initialWorldState);
      this.beatEngine.analyzeBeatPattern(lyricLines);
      this.director.setTimeline(this._buildTimeline(narrativeResult));
    }

    _mergeAITheme(deepMeaning, analysisResult) {
      if (!analysisResult.isAIAnalyzed || typeof analysisResult.llmTheme !== 'string' || !analysisResult.llmTheme.trim()) return;
      const theme = analysisResult.llmTheme.trim();
      deepMeaning.primaryTheme = theme;
      deepMeaning.deepThemes = [...new Set([theme, ...(deepMeaning.deepThemes || [])])];
    }

    _buildTimeline(narrativeResult) {
      const timeline = new global.SceneTimeline();
      const tracks = {
        scene: timeline.addTrack(global.SceneTimeline.Tracks.SCENE),
        camera: timeline.addTrack(global.SceneTimeline.Tracks.CAMERA),
        lighting: timeline.addTrack(global.SceneTimeline.Tracks.LIGHTING),
        weather: timeline.addTrack(global.SceneTimeline.Tracks.WEATHER),
        particles: timeline.addTrack(global.SceneTimeline.Tracks.PARTICLES),
        characters: timeline.addTrack(global.SceneTimeline.Tracks.CHARACTERS)
      };
      for (const block of narrativeResult.blocks || []) {
        let shot = this.visualReasoner.reasonShot(block, this._songVision, this.narrativeMemory);
        let evaluation = this.visualCritic.evaluateShot(shot);
        let attempts = 0;
        while (!evaluation.approved && attempts < 3) {
          shot = this.visualCritic.reviseShot(shot, evaluation) || shot;
          evaluation = this.visualCritic.evaluateShot(shot);
          attempts += 1;
        }
        if (this.visualCritic.commitShot) this.visualCritic.commitShot(shot);
        const durationMs = Math.max(1000, block.endMs - block.startMs);
        const event = (action, data) => new global.SceneTimelineEvent(block.startMs, durationMs, action, data);
        tracks.scene.addEvent(event('setScene', shot));
        tracks.camera.addEvent(event('setCamera', shot.cameraConfig));
        tracks.lighting.addEvent(event('setLighting', shot.lighting));
        tracks.weather.addEvent(event('setWeather', shot.weather));
        tracks.particles.addEvent(event('setParticles', { configs: shot.fx && shot.fx.particles || [] }));
        tracks.characters.addEvent(event('setCharacters', shot.characters || {}));
        this.narrativeMemory.recordEvent(block.startMs, block.arcPosition || 'beat', {
          blockText: block.text, emotion: block.emotion, intensity: block.intensity,
          symbolicProps: shot.symbolicProps, dramaticPurpose: shot.dramaticPurpose
        });
      }
      const first = tracks.scene.getEvents()[0];
      if (first && first.data && this.sceneComposer) {
        this.sceneComposer.composeFromScript(first.data, this._songSeed);
        this._activeSceneEvent = first;
        this._activeVisualScript = first.data;
      }
      return timeline;
    }

    async enableAudioReactive() {
      if (!this.beatEngine || !this.beatEngine.enableSystemAudioCapture) throw new Error('Audio-reactive mode is not available in this runtime.');
      return this.beatEngine.enableSystemAudioCapture();
    }

    disableAudioReactive() {
      if (this.beatEngine && this.beatEngine.disableAudioReactive) this.beatEngine.disableAudioReactive();
    }

    getAudioReactiveStatus() {
      return this.beatEngine && this.beatEngine.getAudioReactiveStatus ? this.beatEngine.getAudioReactiveStatus() : { enabled: false, reason: 'Unavailable' };
    }

    _withAudioForces(forces, bands) {
      const source = forces || {};
      return {
        ...source,
        globalState: { ...(source.globalState || {}) },
        localState: { ...(source.localState || {}), audioBass: bands.bass || 0, audioMid: bands.mid || 0, audioHigh: bands.high || 0 }
      };
    }

    update(positionMs) {
      if (!this._initialized) return;
      const now = performance.now();
      const deltaTime = Math.min(0.1, (now - this._lastTime) / 1000);
      this._lastTime = now;
      this.beatEngine.update(positionMs);
      const beatIntensity = this.beatEngine.getBeatIntensity();
      const audioBands = this.beatEngine.getFrequencyBands ? this.beatEngine.getFrequencyBands() : { bass: 0, mid: 0, high: 0 };
      this.director.update(positionMs);
      if (this.director._timeline) {
        const sceneTrack = this.director._timeline.getTrack(global.SceneTimeline.Tracks.SCENE);
        const activeEvent = sceneTrack && sceneTrack.getActiveEvent(positionMs);
        if (activeEvent && activeEvent.data && this.sceneComposer) {
          if (activeEvent !== this._activeSceneEvent) {
            this.sceneComposer.composeFromScript(activeEvent.data, this._songSeed);
            this._activeSceneEvent = activeEvent;
            this._activeVisualScript = activeEvent.data;
          }
          this.emotionPhysics.updateWorldState(activeEvent.data.emotion, activeEvent.data.intensity || 0.5, activeEvent.data.worldState);
          if (this.emotionPhysics.update) this.emotionPhysics.update(deltaTime);
          this.sceneComposer.applyWorldState(this._withAudioForces(this.emotionPhysics.getForces(), audioBands), activeEvent.data, deltaTime, activeEvent.getProgress(positionMs));
          const focus = this.sceneComposer.getFocusAnchor(activeEvent.data.cameraConfig && activeEvent.data.cameraConfig.targetRole);
          if (focus && this.cameraDirector && this.cameraDirector.setFocusTarget) this.cameraDirector.setFocusTarget(focus);
          if (focus && this.renderer && this.renderer.setFocusTarget) this.renderer.setFocusTarget(focus);
        }
      }
      if (this.cameraDirector) this.cameraDirector.update(deltaTime);
      if (this.lighting) this.lighting.update(deltaTime);
      if (this.particlePool) this.particlePool.update(deltaTime);
      if (this.weather) this.weather.update(deltaTime);
      if (this.sceneComposer) this.sceneComposer.update(deltaTime);
      if (this.renderer && this.renderer.setAudioBands) this.renderer.setAudioBands(audioBands);
      this.renderer.render(deltaTime, beatIntensity);
    }

    resize(width, height) { this.renderer.resize(width, height); }

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
      this._analysisRequestId += 1;
      this.disableAudioReactive();
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
