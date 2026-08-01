// ═══════════════════════════════════════════════════════════════════════
// VISUAL REASONER — Razonador contextual por plano
// Responde a: "¿Qué puesta en escena expresa mejor esta parte de la canción?"
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class VisualReasoner {
    constructor() {}

    /**
     * Contextually reason about the visual staging for a specific narrative block.
     * @param {Object} block - Lyric block analysis
     * @param {Object} songVision - From VisualImaginationEngine
     * @param {Object} narrativeMemory - From NarrativeMemory
     * @returns {Object} ContextualVisualScript
     */
    reasonShot(block, songVision, narrativeMemory) {
      const emotion = block.emotion || 'neutral';
      const intensity = Math.max(block.intensity || 0.5, block.arcIntensity || 0);
      const blockMeaning = (songVision.blockMotifs || []).find(item => item.startMs === block.startMs);
      const primaryTheme = blockMeaning && blockMeaning.primaryTheme || songVision.primaryTheme;
      const previous = narrativeMemory && narrativeMemory.getLastEventBefore(block.startMs);
      const dramaticPurpose = this._resolvePurpose(block, emotion, previous);
      const mainSymbol = this._resolveSymbol(primaryTheme, emotion);
      const symbolicProps = this._buildSymbolSet(mainSymbol, songVision, block, narrativeMemory);
      const composition = songVision.composition || {};
      const biome = this._resolveBiome(songVision, block, primaryTheme);

      const cameraConfig = this._buildCamera(dramaticPurpose, block, songVision, previous);
      const lighting = this._buildLighting(emotion, primaryTheme, block.arcPosition, intensity, biome, songVision.lightingPreset);
      const weather = this._buildWeather(emotion, primaryTheme, intensity);
      const worldState = this._buildWorldState(songVision, emotion, block.arcPosition, intensity, symbolicProps);
      const characters = this._buildCharacters(songVision, dramaticPurpose, emotion, block.arcPosition, intensity, previous);

      // Consume director notes and rich intent if provided by Gemma 3 1B
      const directorNotes = songVision.richVision ? songVision.richVision.directorNotes || [] : [];

      return {
        startMs: block.startMs,
        durationMs: Math.max(1000, block.endMs - block.startMs),
        biome,
        actIndex: block.actIndex != null ? block.actIndex : 0,
        dramaticPurpose,
        emotion,
        intensity,
        primaryTheme,
        directorNotes,
        artStyle: songVision.artStyle,
        worldConcept: songVision.worldConcept,
        symbolicProps,
        composition,
        world: {
          baseIdentity: composition.baseIdentity,
          composition: composition.type,
          terrainType: biome && biome.terrain || composition.terrainType,
          terrainColor: lighting.groundColor,
          sky: composition.sky,
          focalAxis: composition.focalAxis,
          evolution: songVision.worldEvolution
        },
        stage: {
          composition: composition.type,
          focalAxis: composition.focalAxis,
          artStyle: songVision.artStyle,
          symbolicProps,
          density: this._vegetationDensity(emotion, worldState),
          foregroundDensity: dramaticPurpose === 'intimacy' ? 0.3 : 0.58,
          focalClearance: dramaticPurpose === 'isolation' ? 22 : 12
        },
        cameraConfig,
        lighting,
        weather,
        fx: {
          weatherType: weather.type,
          intensity: weather.intensity,
          particles: this._buildParticles(emotion, primaryTheme, intensity)
        },
        characters,
        worldState
      };
    }

    _resolvePurpose(block, emotion, previous) {
      if (block.arcPosition === 'climax') return 'climax';
      if (block.arcPosition === 'resolution') return emotion === 'sad' || emotion === 'dark' ? 'contemplation' : 'realization';
      if (emotion === 'sad' || emotion === 'dark' || emotion === 'nostalgia') return 'isolation';
      if (emotion === 'love' || emotion === 'spiritual') return 'intimacy';
      if (emotion === 'energy' || emotion === 'anger' || emotion === 'celebration') return 'power';
      if (previous && previous.details && previous.details.emotion !== emotion) return 'transition';
      return 'narrative_flow';
    }

    _resolveSymbol(theme, emotion) {
      const byTheme = {
        sacrifice_and_acceptance: 'death', immortality_of_feeling: 'time', existential_solitude: 'solitude',
        transcendent_hope: 'hope', destructive_passion: 'death', inexorable_passage_of_time: 'time',
        cathartic_purification: 'hope', liberation_from_bounds: 'hope', romantic_devotion: 'romance',
        obsessive_longing: 'obsession', veiled_mystery: 'mystery', epic_ascension: 'epic'
      };
      return byTheme[theme] || (emotion === 'sad' || emotion === 'dark' ? 'death'
        : emotion === 'love' ? 'romance' : emotion === 'nostalgia' ? 'time' : 'memory');
    }

    _buildSymbolSet(mainSymbol, songVision, block, narrativeMemory) {
      const local = Array.isArray(block.visualMotifs) ? block.visualMotifs : [];
      const globalMotifs = songVision.richVision && Array.isArray(songVision.richVision.visualMotifs)
        ? songVision.richVision.visualMotifs
        : [];
      const persistent = songVision.persistentMotifs || [];
      const prior = narrativeMemory && narrativeMemory.getRecent
        ? narrativeMemory.getRecent(2)
        : [];
      const recalled = prior
        .flatMap(entry => entry.details && entry.details.symbolicProps || [])
        .slice(0, 1);

      const concrete = [...new Set([...local, ...globalMotifs])];
      const translated = this._translateMotifs(concrete);

      // Si hay objetos concretos, se priorizan y se omiten cristales abstractos.
      if (translated.length > 0) return translated.slice(0, 5);

      const ecosystem = global.SceneSymbolEcology
        ? global.SceneSymbolEcology.getEcosystem(mainSymbol, songVision.seed + block.startMs)
        : [];

      return [...new Set([...persistent, ...recalled, ...ecosystem])]
        .filter(symbol => symbol !== 'glowing_crystals' && symbol !== 'shimmering_motes')
        .slice(0, 4);
    }

    _translateMotifs(motifs) {
      const map = {
        dog: 'dog',
        home: 'home_room',
        kitchen: 'kitchen_table',
        food: 'food_bowl',
        return_home: 'open_door',
        threat: 'knives',
        memory: 'photo_frame',
        bed: 'bed',
        window: 'window',
        street: 'street_lamp',
        sea: 'waves',
        fire: 'fire_brazier'
      };
      return motifs.map(motif => map[motif]).filter(Boolean);
    }

    _buildCamera(purpose, block, songVision, previous) {
      const libraryPurpose = purpose === 'contemplation' ? 'isolation' : purpose === 'realization' ? 'climax' : purpose;
      const language = global.SceneCinematographyLibrary
        ? global.SceneCinematographyLibrary.getShotForPurpose(libraryPurpose)
        : { distance: 120, height: 25, fov: 50 };
      const shotByPurpose = {
        isolation: 'WIDE', intimacy: 'CLOSE_UP', power: 'LOW_ANGLE', climax: 'EXTREME_CLOSE',
        realization: 'MEDIUM', contemplation: 'WIDE', transition: 'MEDIUM', narrative_flow: 'MEDIUM'
      };
      const movementByPurpose = {
        isolation: 'static_breath', intimacy: 'dolly_in', power: 'crane_rise', climax: 'arc',
        realization: 'dolly_out', contemplation: 'lateral_track', transition: 'lateral_track', narrative_flow: 'follow'
      };
      const changedEmotion = previous && previous.details && previous.details.emotion !== block.emotion;
      const cameraStyle = songVision.cameraStyle;
      const styleMovement = {
        slow_follow: 'follow', intimate_dolly: 'dolly_in', orbit: 'arc', crane: 'crane_rise', still: 'static_breath', kinetic: 'lateral_track'
      };
      return {
        shot: shotByPurpose[purpose] || 'MEDIUM',
        distance: language.distance,
        height: language.height,
        fov: language.fov,
        movement: styleMovement[cameraStyle] || movementByPurpose[purpose] || 'follow',
        targetRole: purpose === 'intimacy' ? 'companion' : 'protagonist',
        orbitDirection: changedEmotion ? -1 : 1,
        breath: purpose === 'isolation' || purpose === 'intimacy' ? 0.45 : 0.16,
        durationMs: Math.max(1000, block.endMs - block.startMs),
        narrativePurpose: purpose,
        pace: songVision.cinematicIntent && songVision.cinematicIntent.pace || 'slow'
      };
    }

    _buildLighting(emotion, theme, arcPosition, intensity, biome, requestedPreset) {
      const sad = emotion === 'sad' || emotion === 'dark';
      const warm = emotion === 'love' || emotion === 'celebration' || theme === 'transcendent_hope';
      const violent = emotion === 'anger' || emotion === 'energy' || theme === 'destructive_passion';
      const mysterious = theme === 'veiled_mystery' || emotion === 'nostalgia';
      const inferredPreset = violent ? 'dramatic' : warm ? (arcPosition === 'resolution' ? 'sunrise' : 'golden_hour')
        : sad ? 'moonlight' : mysterious ? 'cold' : 'warm';
      const preset = requestedPreset || inferredPreset;
      const biomeFog = biome && biome.fog;
      const biomeGround = biome && biome.ground;
      return {
        preset,
        keyColor: violent ? 0xff6a45 : warm ? 0xffc07a : sad ? 0x7894c8 : 0xa8c9ff,
        keyIntensity: 0.45 + intensity * 1.1,
        fillIntensity: sad ? 0.08 : 0.18 + intensity * 0.18,
        rimIntensity: 0.45 + intensity * 0.75,
        rimColor: warm ? 0xffd3a1 : 0x8fb7ff,
        fogColor: biomeFog ? biomeFog.color : (warm ? 0x51311b : sad ? 0x101827 : 0x18202d),
        fogDensity: (biomeFog ? biomeFog.density : 0.004) * (sad || mysterious ? 1.8 + intensity : 0.9),
        shafts: warm || theme === 'epic_ascension' || theme === 'transcendent_hope',
        silhouette: sad || violent || mysterious,
        groundColor: biomeGround ? biomeGround.base : (warm ? 0x25331b : sad ? 0x101d1c : 0x1c2630)
      };
    }

    _resolveBiome(songVision, block, theme) {
      if (!block.worldType || !global.SceneBiomeLibrary) return songVision.biome;
      const resolved = global.SceneBiomeLibrary.resolve(block.worldType, theme);
      const visionWorld = songVision.richVision && songVision.richVision.world || {};
      return global.SceneBiomeLibrary.applyModifiers(resolved.biome, visionWorld.season, visionWorld.time);
    }

    _buildWeather(emotion, theme, intensity) {
      if (emotion === 'sad' || theme === 'cathartic_purification') return { type: 'rain', intensity: 0.35 + intensity * 0.65 };
      if (emotion === 'dark' || theme === 'veiled_mystery') return { type: 'mist', intensity: 0.38 + intensity * 0.5 };
      if (emotion === 'anger' || theme === 'destructive_passion') return { type: 'storm', intensity: 0.4 + intensity * 0.6 };
      if (theme === 'inexorable_passage_of_time') return { type: 'fog', intensity: 0.24 + intensity * 0.28 };
      return { type: 'clear', intensity: 0.18 + intensity * 0.3 };
    }

    _buildParticles(emotion, theme, intensity) {
      const type = emotion === 'love' ? 'petals'
        : emotion === 'sad' ? 'rain'
        : emotion === 'anger' || theme === 'destructive_passion' ? 'embers'
        : theme === 'epic_ascension' ? 'confetti'
        : theme === 'veiled_mystery' ? 'dust'
        : 'shimmering_motes';
      // The current pool has no motes implementation; dust is the compatible visual carrier.
      return [{ type: type === 'shimmering_motes' ? 'dust' : type, intensity, depth: emotion === 'sad' ? 'midground' : 'foreground' }];
    }

    _buildWorldState(songVision, emotion, arcPosition, intensity, symbolicProps = []) {
      const base = songVision.initialWorldState || {};
      const state = { ...base };
      const has = value => symbolicProps.includes(value);

      if (has('dog') || has('photo_frame')) state.intimacy = Math.min(1, (state.intimacy || 0.5) + 0.3);
      if (has('home_room') || has('kitchen_table')) state.life = Math.min(1, (state.life || 0.5) + 0.15);
      if (has('knives')) state.chaos = Math.min(1, (state.chaos || 0.2) + 0.28);
      if (has('open_door')) state.hope = Math.min(1, (state.hope || 0.5) + 0.16);

      if (emotion === 'sad' || emotion === 'dark') {
        state.decay = Math.min(1, (state.decay || 0.2) + 0.2 * intensity);
        state.life = Math.max(0, (state.life || 0.6) - 0.18 * intensity);
        state.light = Math.max(0.08, (state.light || 0.6) - 0.25 * intensity);
      }
      if (emotion === 'love' || emotion === 'spiritual' || emotion === 'celebration') {
        state.hope = Math.min(1, (state.hope || 0.5) + 0.16 * intensity);
        state.life = Math.min(1, (state.life || 0.6) + 0.12 * intensity);
      }
      if (emotion === 'anger' || emotion === 'energy') state.chaos = Math.min(1, (state.chaos || 0.2) + 0.36 * intensity);
      if (arcPosition === 'resolution') {
        state.hope = Math.min(1, (state.hope || 0.5) + 0.18);
        state.light = Math.min(1, (state.light || 0.5) + 0.16);
        state.decay = Math.max(0, (state.decay || 0.2) - 0.12);
      }
      return state;
    }

    _vegetationDensity(emotion, state) {
      if (emotion === 'dark' || emotion === 'sad') return 0.28 + (state.decay || 0) * 0.22;
      return 0.42 + (state.life || 0.5) * 0.4;
    }

    _buildCharacters(songVision, purpose, emotion, arcPosition, intensity, previous) {
      const motifs = songVision.visualMotifs || [];
      const cast = [...(songVision.cast || [])];
      if (motifs.includes('dog') && !cast.some(actor => actor.id === 'dog_1')) {
        cast.push({ id: 'dog_1', role: 'animal_companion', species: 'animal', style: 'loyal' });
      }
      const relationship = cast[0] && cast[0].style || 'reflective';
      const behavior = purpose === 'intimacy' ? 'approach'
        : purpose === 'isolation' ? 'withdraw'
        : purpose === 'power' || purpose === 'climax' ? 'confront'
        : arcPosition === 'resolution' ? 'release' : 'observe';
      return {
        cast,
        relationship,
        behavior,
        emotion,
        intensity,
        changedEmotion: !!(previous && previous.details && previous.details.emotion !== emotion)
      };
    }
  }

  global.SceneVisualReasoner = VisualReasoner;
})(typeof window !== 'undefined' ? window : globalThis);
