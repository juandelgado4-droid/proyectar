// BIOME LIBRARY - Canonical, validated world descriptors for the scene engine.
(function (global) {
  'use strict';

  const BIOMES = Object.freeze({
    forest: {
      id: 'forest', terrain: 'hills', ground: { base: 0x1a2e18, healthy: 0x31563a, dry: 0x4a4030 },
      flora: { species: 'pine', density: 0.85 }, arch: null, scatter: ['rocks', 'ferns'],
      fog: { color: 0x17251c, density: 0.004 }, sky: 'overcast'
    },
    mystic_garden: {
      id: 'mystic_garden', terrain: 'path', ground: { base: 0x1f3320, healthy: 0x3c6b45, dry: 0x4d4632 },
      flora: { species: 'broadleaf', density: 0.7 }, arch: { kit: 'columns', count: 4 }, scatter: ['ferns', 'lanterns', 'rocks'],
      fog: { color: 0x2a2418, density: 0.0032 }, sky: 'golden_hour'
    },
    desert: {
      id: 'desert', terrain: 'dunes', ground: { base: 0xc2a878, healthy: 0xa89464, dry: 0x8a6f45 },
      flora: { species: 'cactus', density: 0.1 }, arch: { kit: 'columns', count: 5 }, scatter: ['bones', 'dry_shrub', 'rocks'],
      fog: { color: 0xd8c49a, density: 0.0012 }, sky: 'golden_hour'
    },
    city: {
      id: 'city', terrain: 'street', ground: { base: 0x2a2a2e, healthy: 0x33333a, dry: 0x232326 },
      flora: { species: 'none', density: 0 }, arch: { kit: 'towers', count: 16 }, scatter: ['lamps', 'signs'],
      fog: { color: 0x1b1f28, density: 0.006 }, sky: 'moon'
    },
    neon_city: {
      id: 'neon_city', terrain: 'street', ground: { base: 0x181026, healthy: 0x22163a, dry: 0x140d1e },
      flora: { species: 'none', density: 0 }, arch: { kit: 'towers', count: 22 }, scatter: ['lamps', 'signs'],
      fog: { color: 0x2a1140, density: 0.0075 }, sky: 'stars'
    },
    ocean: {
      id: 'ocean', terrain: 'lake', ground: { base: 0xc9b79a, healthy: 0xd6c7ab, dry: 0xb0a084 },
      flora: { species: 'palm', density: 0.28 }, arch: null, scatter: ['driftwood', 'rocks'],
      fog: { color: 0x9fb8c4, density: 0.0028 }, sky: 'sunrise'
    },
    snow: {
      id: 'snow', terrain: 'peaks', ground: { base: 0xdfe7f0, healthy: 0xe8eef6, dry: 0x9fb0c4 },
      flora: { species: 'dead_tree', density: 0.32 }, arch: null, scatter: ['ice_shards', 'rocks'],
      fog: { color: 0xbfd0e2, density: 0.008 }, sky: 'overcast'
    },
    ruins: {
      id: 'ruins', terrain: 'plaza', ground: { base: 0x33312c, healthy: 0x3f4436, dry: 0x2a2724 },
      flora: { species: 'dead_tree', density: 0.22 }, arch: { kit: 'cathedral', count: 10 }, scatter: ['rubble', 'gravestones', 'rocks'],
      fog: { color: 0x1c1c22, density: 0.007 }, sky: 'moon'
    },
    swamp: {
      id: 'swamp', terrain: 'lake', ground: { base: 0x1e2a1c, healthy: 0x2b3d24, dry: 0x33301f },
      flora: { species: 'reeds', density: 0.65 }, arch: null, scatter: ['driftwood', 'mushrooms'],
      fog: { color: 0x1a241c, density: 0.011 }, sky: 'overcast'
    },
    interior: {
      id: 'interior', terrain: 'flat', ground: { base: 0x3a2c22, healthy: 0x46362a, dry: 0x2c211a },
      flora: { species: 'none', density: 0 }, arch: { kit: 'room', count: 1 }, scatter: ['lamps'],
      fog: { color: 0x14100c, density: 0.009 }, sky: 'none'
    },
    void: {
      id: 'void', terrain: 'none', ground: { base: 0x05050a, healthy: 0x0a0a14, dry: 0x030306 },
      flora: { species: 'none', density: 0 }, arch: null, scatter: ['floating_shards'],
      fog: { color: 0x02020a, density: 0.0035 }, sky: 'stars'
    },
    mountain: {
      id: 'mountain', terrain: 'cliff', ground: { base: 0x3c3a35, healthy: 0x3f4a38, dry: 0x4a4238 },
      flora: { species: 'pine', density: 0.35 }, arch: null, scatter: ['rocks'],
      fog: { color: 0x2b3038, density: 0.005 }, sky: 'sunrise'
    }
  });

  const ALIASES = Object.freeze({
    bosque: 'forest', woods: 'forest', jungle: 'forest', nature: 'forest',
    desierto: 'desert', dunes: 'desert', wasteland: 'desert', sand: 'desert',
    ciudad: 'city', urban: 'city', street: 'city', rooftop: 'city',
    neon: 'neon_city', cyberpunk: 'neon_city', nightclub: 'neon_city',
    oceano: 'ocean', 'océano': 'ocean', sea: 'ocean', beach: 'ocean', shore: 'ocean', lake: 'ocean',
    nieve: 'snow', winter: 'snow', ice: 'snow', tundra: 'snow', arctic: 'snow',
    ruinas: 'ruins', temple: 'ruins', cemetery: 'ruins', church: 'ruins', gothic: 'ruins',
    pantano: 'swamp', marsh: 'swamp', bog: 'swamp',
    room: 'interior', house: 'interior', indoor: 'interior', bedroom: 'interior', bar: 'interior',
    space: 'void', cosmos: 'void', dream: 'void', abstract: 'void', sky: 'void',
    montana: 'mountain', 'montaña': 'mountain', mountains: 'mountain', peaks: 'mountain', cliff: 'mountain',
    garden: 'mystic_garden', jardin: 'mystic_garden', 'jardín': 'mystic_garden', meadow: 'mystic_garden', valley: 'mystic_garden'
  });

  const THEME_BIOME = Object.freeze({
    sacrifice_and_acceptance: 'forest', immortality_of_feeling: 'ruins', existential_solitude: 'snow',
    transcendent_hope: 'mountain', destructive_passion: 'desert', inexorable_passage_of_time: 'ruins',
    cathartic_purification: 'swamp', liberation_from_bounds: 'ocean', romantic_devotion: 'mystic_garden',
    obsessive_longing: 'neon_city', veiled_mystery: 'swamp', epic_ascension: 'mountain', universal_contemplation: 'void'
  });

  class BiomeLibrary {
    static ids() { return Object.keys(BIOMES); }
    static enumForPrompt() { return BiomeLibrary.ids().join(' | '); }

    static get(id) {
      const biome = BIOMES[id] || BIOMES.forest;
      return {
        ...biome,
        ground: { ...biome.ground }, flora: { ...biome.flora }, arch: biome.arch ? { ...biome.arch } : null,
        scatter: biome.scatter.slice(), fog: { ...biome.fog }
      };
    }

    static resolve(worldType, theme) {
      const key = BiomeLibrary._key(worldType);
      if (key && BIOMES[key]) return { biome: BiomeLibrary.get(key), source: 'llm' };
      if (key && ALIASES[key]) return { biome: BiomeLibrary.get(ALIASES[key]), source: 'llm_alias' };
      if (worldType) console.warn(`[BiomeLibrary] Unknown LLM biome "${worldType}"; using semantic fallback.`);
      const fallback = THEME_BIOME[theme] || 'forest';
      return { biome: BiomeLibrary.get(fallback), source: worldType ? 'theme_fallback' : 'theme' };
    }

    static applyModifiers(biome, season, time) {
      const out = BiomeLibrary.get((biome && biome.id) || 'forest');
      const normalizedSeason = BiomeLibrary._key(season);
      const normalizedTime = BiomeLibrary._key(time);
      if (normalizedSeason === 'autumn' && out.flora.species !== 'none') out.flora.species = 'broadleaf';
      if (normalizedSeason === 'winter') {
        out.ground.healthy = 0xcdd8e4;
        out.flora.density *= 0.45;
        if (out.flora.species === 'pine') out.flora.species = 'dead_tree';
      }
      if (normalizedSeason === 'spring') out.flora.density = Math.min(1, out.flora.density * 1.25);
      if (normalizedTime === 'night') { out.sky = 'stars'; out.fog.density *= 1.35; }
      if (normalizedTime === 'sunset') out.sky = 'golden_hour';
      if (normalizedTime === 'sunrise' || normalizedTime === 'dawn') out.sky = 'sunrise';
      return out;
    }

    static _key(value) {
      return value == null ? '' : String(value).trim().toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[\s-]+/g, '_');
    }
  }

  global.SceneBiomeLibrary = BiomeLibrary;
})(typeof window !== 'undefined' ? window : globalThis);
