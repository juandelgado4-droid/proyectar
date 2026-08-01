// ═══════════════════════════════════════════════════════════════════════
// VISUAL IMAGINATION ENGINE — Concepción del poema visual / cortometraje mudo
// Responde a: "¿Cómo contarías esta canción como una película muda?"
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  const THEME_PROFILES = Object.freeze({
    sacrifice_and_acceptance: {
      worldConcept: 'nature', artStyle: 'realistic', composition: 'forest_path', terrainType: 'path',
      sky: 'overcast', motif: 'withered_petals', relationship: 'farewell',
      state: { life: 0.58, hope: 0.32, decay: 0.5, temperature: 0.38, chaos: 0.16, light: 0.38 },
      evolution: 'release_to_dawn'
    },
    immortality_of_feeling: {
      worldConcept: 'ruins', artStyle: 'gothic', composition: 'ruined_plaza', terrainType: 'plaza',
      sky: 'stars', motif: 'old_clocks', relationship: 'enduring',
      state: { life: 0.38, hope: 0.48, decay: 0.44, temperature: 0.4, chaos: 0.1, light: 0.42 },
      evolution: 'memory_rekindles'
    },
    existential_solitude: {
      worldConcept: 'ruins', artStyle: 'gothic', composition: 'cliff', terrainType: 'cliff',
      sky: 'moon', motif: 'distant_moon', relationship: 'alone',
      state: { life: 0.24, hope: 0.18, decay: 0.68, temperature: 0.25, chaos: 0.12, light: 0.2 },
      evolution: 'endure_the_night'
    },
    transcendent_hope: {
      worldConcept: 'mystic_garden', artStyle: 'anime', composition: 'valley', terrainType: 'valley',
      sky: 'sunrise', motif: 'golden_rays', relationship: 'reunion',
      state: { life: 0.74, hope: 0.82, decay: 0.12, temperature: 0.66, chaos: 0.12, light: 0.82 },
      evolution: 'dawn_and_bloom'
    },
    destructive_passion: {
      worldConcept: 'ruins', artStyle: 'gothic', composition: 'ruined_plaza', terrainType: 'peaks',
      sky: 'storm', motif: 'floating_ashes', relationship: 'volatile',
      state: { life: 0.42, hope: 0.34, decay: 0.54, temperature: 0.86, chaos: 0.8, light: 0.58 },
      evolution: 'burn_then_settle'
    },
    inexorable_passage_of_time: {
      worldConcept: 'ruins', artStyle: 'realistic', composition: 'lake', terrainType: 'lake',
      sky: 'golden_hour', motif: 'hourglass', relationship: 'remembering',
      state: { life: 0.48, hope: 0.44, decay: 0.48, temperature: 0.5, chaos: 0.12, light: 0.5 },
      evolution: 'seasons_turn'
    },
    cathartic_purification: {
      worldConcept: 'nature', artStyle: 'realistic', composition: 'clearing', terrainType: 'clearing',
      sky: 'rain_to_sun', motif: 'shimmering_motes', relationship: 'healing',
      state: { life: 0.52, hope: 0.48, decay: 0.4, temperature: 0.42, chaos: 0.28, light: 0.42 },
      evolution: 'rain_then_bloom'
    },
    liberation_from_bounds: {
      worldConcept: 'nature', artStyle: 'anime', composition: 'cliff', terrainType: 'cliff',
      sky: 'sunrise', motif: 'blooming_sprouts', relationship: 'release',
      state: { life: 0.7, hope: 0.78, decay: 0.1, temperature: 0.62, chaos: 0.24, light: 0.76 },
      evolution: 'open_horizon'
    },
    romantic_devotion: {
      worldConcept: 'mystic_garden', artStyle: 'anime', composition: 'garden_path', terrainType: 'path',
      sky: 'golden_hour', motif: 'single_candle', relationship: 'intimate',
      state: { life: 0.7, hope: 0.72, decay: 0.14, temperature: 0.72, chaos: 0.1, light: 0.68 },
      evolution: 'approach_and_bloom'
    },
    obsessive_longing: {
      worldConcept: 'ruins', artStyle: 'gothic', composition: 'spiral_ruins', terrainType: 'plaza',
      sky: 'storm', motif: 'floating_mirrors', relationship: 'orbiting',
      state: { life: 0.46, hope: 0.28, decay: 0.5, temperature: 0.58, chaos: 0.7, light: 0.34 },
      evolution: 'tighten_then_release'
    },
    veiled_mystery: {
      worldConcept: 'nature', artStyle: 'gothic', composition: 'mist_clearing', terrainType: 'clearing',
      sky: 'moon', motif: 'mist_ring', relationship: 'unseen',
      state: { life: 0.42, hope: 0.34, decay: 0.44, temperature: 0.3, chaos: 0.34, light: 0.26 },
      evolution: 'reveal_in_mist'
    },
    epic_ascension: {
      worldConcept: 'ruins', artStyle: 'realistic', composition: 'valley', terrainType: 'peaks',
      sky: 'sunrise', motif: 'golden_rays', relationship: 'alliance',
      state: { life: 0.66, hope: 0.74, decay: 0.2, temperature: 0.58, chaos: 0.54, light: 0.78 },
      evolution: 'rise_to_light'
    },
    universal_contemplation: {
      worldConcept: 'nature', artStyle: 'realistic', composition: 'clearing', terrainType: 'hills',
      sky: 'moon', motif: 'echoing_lights', relationship: 'reflective',
      state: { life: 0.58, hope: 0.5, decay: 0.24, temperature: 0.5, chaos: 0.16, light: 0.5 },
      evolution: 'quiet_reflection'
    }
  });

  class VisualImaginationEngine {
    constructor() {}

    /**
     * Conceive the overall silent film vision and artistic direction.
     * @param {Object} deepMeaning - From MeaningEngine
     * @param {Object} narrativeResult - From NarrativeAnalyzer
     * @param {number} seed - Unique seed for this song (artist + title hash)
     * @returns {Object} SongVision
     */
    conceiveVision(deepMeaning, narrativeResult, seed, richVision = null) {
      const primaryTheme = deepMeaning.primaryTheme || 'universal_contemplation';
      const profile = THEME_PROFILES[primaryTheme] || THEME_PROFILES.universal_contemplation;
      const vision = richVision && typeof richVision === 'object' ? richVision : null;
      const llmWorld = vision && vision.world || {};
      const resolver = global.SceneBiomeLibrary;
      const resolved = resolver ? resolver.resolve(llmWorld.type, primaryTheme) : { biome: { id: profile.worldConcept, terrain: profile.terrainType, sky: profile.sky }, source: 'profile' };
      const biome = resolver ? resolver.applyModifiers(resolved.biome, llmWorld.season, llmWorld.time) : resolved.biome;
      console.log(`[Vision] Biome "${biome.id}" (source: ${resolved.source}) for theme "${primaryTheme}"`);

      // The seed provides variation inside a semantic direction; it never chooses the story.
      const rng = (offset = 0) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };

      // Continuous cinematic intent metrics
      const cinematicIntent = {
        pace: ['volatile', 'alliance', 'orbiting'].includes(profile.relationship) ? 'dynamic' : 'slow',
        spectacle: 0.42 + rng(4) * 0.26 + (primaryTheme === 'epic_ascension' ? 0.28 : 0),
        intimacy: 0.42 + rng(5) * 0.22 + (profile.relationship === 'intimate' ? 0.3 : 0),
        surrealism: 0.2 + rng(6) * 0.28 + (primaryTheme === 'veiled_mystery' ? 0.26 : 0),
        realism: profile.artStyle === 'realistic' ? 0.78 : 0.42,
        symbolism: 0.72 + rng(8) * 0.22
      };

      const cast = [{ id: 'actor_1', role: 'protagonist', species: 'human', style: profile.relationship }];
      if (!['alone', 'release', 'reflective'].includes(profile.relationship)) {
        cast.push({
          id: 'actor_2', role: 'companion',
          species: profile.relationship === 'unseen' ? 'skeleton' : (rng(9) > 0.86 ? 'robot' : 'human'),
          style: profile.relationship
        });
      }

      return {
        seed,
        primaryTheme,
        deepThemes: deepMeaning.deepThemes || [],
        blockMotifs: deepMeaning.blockMotifs || [],
        biome,
        richVision: vision,
        artStyle: this._validArtStyle(vision && vision.artStyle) || profile.artStyle,
        cameraStyle: this._validCameraStyle(vision && vision.camera && vision.camera.style),
        lightingPreset: this._validLightingPreset(vision && vision.lighting && vision.lighting.preset),
        worldConcept: biome.id,
        composition: {
          type: profile.composition,
          terrainType: biome.terrain,
          sky: biome.sky,
          focalAxis: rng(10) > 0.5 ? 'left_to_right' : 'right_to_left',
          baseIdentity: `${primaryTheme}:${biome.id}`
        },
        persistentMotifs: vision && Array.isArray(vision.symbols) && vision.symbols.length ? vision.symbols.slice(0, 2) : [profile.motif],
        initialWorldState: { ...profile.state },
        worldEvolution: profile.evolution,
        cinematicIntent,
        cast
      };
    }

    _validCameraStyle(value) {
      const allowed = ['slow_follow', 'intimate_dolly', 'orbit', 'crane', 'still', 'kinetic'];
      return allowed.includes(value) ? value : null;
    }

    _validLightingPreset(value) {
      const allowed = ['warm', 'cold', 'neon', 'dark', 'moonlight', 'sunrise', 'golden_hour', 'dramatic'];
      return allowed.includes(value) ? value : null;
    }

    _validArtStyle(value) {
      const allowed = ['realistic', 'anime', 'gothic'];
      return allowed.includes(value) ? value : null;
    }
  }

  global.SceneVisualImaginationEngine = VisualImaginationEngine;
})(typeof window !== 'undefined' ? window : globalThis);
