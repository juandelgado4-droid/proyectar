// ═══════════════════════════════════════════════════════════════════════
// RULE ENGINE — Motor de reglas para transformar análisis en Timeline
// Decide entorno, personajes, partículas, clima, iluminación y cámara
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class RuleEngine {
    constructor(eventBus) {
      this._eventBus = eventBus;
      this._mixer = new global.ScenePriorityMixer();
    }

    /**
     * Generate full Timeline from NarrativeResult.
     * @param {NarrativeResult} narrativeResult
     * @returns {SceneTimeline}
     */
    generateTimeline(narrativeResult) {
      const timeline = new global.SceneTimeline();
      const blocks = narrativeResult.blocks || [];
      if (blocks.length === 0) return timeline;

      const emotionTrack = timeline.addTrack(global.SceneTimeline.Tracks.EMOTION);
      const sceneTrack = timeline.addTrack(global.SceneTimeline.Tracks.SCENE);
      const lightingTrack = timeline.addTrack(global.SceneTimeline.Tracks.LIGHTING);
      const weatherTrack = timeline.addTrack(global.SceneTimeline.Tracks.WEATHER);
      const particlesTrack = timeline.addTrack(global.SceneTimeline.Tracks.PARTICLES);
      const charactersTrack = timeline.addTrack(global.SceneTimeline.Tracks.CHARACTERS);
      const cameraTrack = timeline.addTrack(global.SceneTimeline.Tracks.CAMERA);

      let prevScene = null;
      let prevWeather = null;

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const duration = Math.max(1000, b.endMs - b.startMs);

        // 1. Emotion & Mixing
        const mixed = this._mixer.mix(b.rawScores);
        emotionTrack.addEvent(new global.SceneTimelineEvent(b.startMs, duration, 'setEmotion', mixed));

        // 2. Environment Selection
        const sceneName = this._selectEnvironment(b.emotion, b.keywords, b.arcPosition, prevScene);
        prevScene = sceneName;
        sceneTrack.addEvent(new global.SceneTimelineEvent(b.startMs, duration, 'setScene', {
          scene: sceneName,
          variation: {
            density: 0.5 + b.intensity * 0.5,
            arcIntensity: b.arcIntensity
          }
        }));

        // 3. Lighting Preset
        const lightingPreset = this._selectLighting(b.emotion, b.intensity, b.arcPosition);
        lightingTrack.addEvent(new global.SceneTimelineEvent(b.startMs, duration, 'setLighting', lightingPreset));

        // 4. Weather Selection
        const weatherName = this._selectWeather(b.emotion, b.keywords, b.arcPosition);
        if (weatherName !== prevWeather || i === 0) {
          weatherTrack.addEvent(new global.SceneTimelineEvent(b.startMs, duration, 'setWeather', {
            type: weatherName,
            intensity: 0.3 + b.intensity * 0.7
          }));
          prevWeather = weatherName;
        }

        // 5. Particles
        const particleConfigs = this._selectParticles(b.emotion, b.intensity, b.keywords);
        particlesTrack.addEvent(new global.SceneTimelineEvent(b.startMs, duration, 'setParticles', {
          configs: particleConfigs
        }));

        // 6. Characters & Animations
        const characterConfigs = this._selectCharacters(b.emotion, b.keywords, b.arcPosition);
        charactersTrack.addEvent(new global.SceneTimelineEvent(b.startMs, duration, 'setCharacters', {
          characters: characterConfigs
        }));

        // 7. Camera Movements
        const cameraConfig = this._selectCamera(b.emotion, b.intensity, b.arcPosition);
        cameraTrack.addEvent(new global.SceneTimelineEvent(b.startMs, duration, 'setCamera', cameraConfig));
      }

      if (this._eventBus) {
        this._eventBus.emit(global.SceneEventBus.Events.TIMELINE_READY, timeline);
      }

      return timeline;
    }

    _selectEnvironment(emotion, keywords, arcPosition, prevScene) {
      if (keywords.includes('cementerio') || keywords.includes('grave') || (emotion === 'dark' && keywords.includes('muerte'))) {
        return 'cemetery';
      }
      if (keywords.includes('mar') || keywords.includes('ocean') || keywords.includes('ola') || keywords.includes('sea')) {
        return 'ocean';
      }
      if (keywords.includes('ciudad') || keywords.includes('neon') || keywords.includes('city') || emotion === 'cyberpunk') {
        return 'city_night';
      }
      if (keywords.includes('espacio') || keywords.includes('galaxia') || keywords.includes('star') || keywords.includes('space')) {
        return 'space';
      }

      switch (emotion) {
        case 'dark': return 'cemetery';
        case 'love': return arcPosition === 'climax' ? 'garden' : 'forest';
        case 'sad': return 'ocean';
        case 'energy': return 'cyberpunk';
        case 'celebration': return 'city_night';
        case 'nature': return 'forest';
        case 'spiritual': return 'temple';
        case 'nostalgia': return 'desert';
        default: return prevScene || 'forest';
      }
    }

    _selectLighting(emotion, intensity, arcPosition) {
      switch (emotion) {
        case 'love': return { preset: 'warm', intensity: 0.7 + intensity * 0.3 };
        case 'sad': return { preset: 'cold', intensity: 0.4 + intensity * 0.2 };
        case 'dark': return { preset: 'dark', intensity: 0.3 };
        case 'energy': return { preset: 'neon', intensity: 0.9 };
        case 'celebration': return { preset: 'golden_hour', intensity: 0.9 };
        case 'spiritual': return { preset: 'sunrise', intensity: 0.8 };
        default: return { preset: 'moonlight', intensity: 0.6 };
      }
    }

    _selectWeather(emotion, keywords, arcPosition) {
      if (keywords.includes('lluvia') || keywords.includes('rain')) return 'rain';
      if (keywords.includes('nieve') || keywords.includes('snow')) return 'snow';
      if (keywords.includes('niebla') || keywords.includes('fog')) return 'fog';

      switch (emotion) {
        case 'sad': return 'rain';
        case 'dark': return 'fog';
        case 'energy': return 'storm';
        case 'nostalgia': return 'mist';
        default: return 'clear';
      }
    }

    _selectParticles(emotion, intensity, keywords) {
      const configs = [];
      const density = Math.min(1.0, 0.4 + intensity * 0.6);

      if (emotion === 'love' || keywords.includes('corazon') || keywords.includes('heart')) {
        configs.push({ type: 'hearts', density, color: '#ff4d6d' });
        configs.push({ type: 'petals', density: density * 0.7, color: '#ffb3c1' });
      } else if (emotion === 'sad') {
        configs.push({ type: 'rain', density: density * 0.8 });
      } else if (emotion === 'celebration') {
        configs.push({ type: 'fireworks', density });
        configs.push({ type: 'confetti', density });
      } else if (emotion === 'energy') {
        configs.push({ type: 'neon', density });
      } else if (emotion === 'dark') {
        configs.push({ type: 'embers', density: density * 0.5 });
      } else {
        configs.push({ type: 'dust', density: 0.3 });
      }

      return configs;
    }

    _selectCharacters(emotion, keywords, arcPosition) {
      if (emotion === 'dark' || keywords.includes('muerte') || keywords.includes('esqueleto')) {
        return [
          { type: 'skeleton', id: 'skel1', animation: arcPosition === 'climax' ? 'dance' : 'walk', pos: [-1.5, 0, 0] },
          { type: 'skeleton', id: 'skel2', animation: arcPosition === 'climax' ? 'hug' : 'idle', pos: [1.5, 0, 0] }
        ];
      }
      if (emotion === 'energy' || emotion === 'cyberpunk') {
        return [{ type: 'robot', id: 'bot1', animation: 'dance', pos: [0, 0, 0] }];
      }

      return [
        { type: 'human', id: 'hum1', animation: emotion === 'love' ? 'hug' : 'idle', pos: [0, 0, 0] }
      ];
    }

    _selectCamera(emotion, intensity, arcPosition) {
      if (arcPosition === 'climax') {
        return { shot: 'CLOSE_UP', movement: 'dolly_in', durationMs: 4000 };
      }
      if (emotion === 'energy') {
        return { shot: 'MEDIUM', movement: 'shake', durationMs: 2000 };
      }
      return { shot: 'WIDE', movement: 'orbit_slow', durationMs: 8000 };
    }
  }

  global.SceneRuleEngine = RuleEngine;
})(typeof window !== 'undefined' ? window : globalThis);
