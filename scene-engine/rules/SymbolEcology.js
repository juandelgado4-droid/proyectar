// ═══════════════════════════════════════════════════════════════════════
// SYMBOL ECOLOGY — Grafo de relaciones simbólicas y ecosistema visual
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  const SYMBOL_GRAPHS = {
    time: ['hourglass', 'falling_sand', 'autumn_leaves', 'long_shadows', 'old_clocks'],
    death: ['candles', 'withered_petals', 'gravestones', 'dry_branches', 'floating_ashes'],
    hope: ['blooming_sprouts', 'glowing_crystals', 'shimmering_motes', 'golden_rays'],
    memory: ['floating_mirrors', 'drifting_sparks', 'faded_archways', 'echoing_lights'],
    solitude: ['single_candle', 'distant_moon', 'bare_pillar', 'mist_ring'],
    romance: ['single_candle', 'falling_petals', 'glowing_crystals', 'golden_rays'],
    obsession: ['floating_mirrors', 'old_clocks', 'echoing_lights', 'mist_ring'],
    mystery: ['mist_ring', 'faded_archways', 'distant_moon', 'drifting_sparks'],
    epic: ['golden_rays', 'bare_pillar', 'glowing_crystals', 'falling_sand']
  };

  class SymbolEcology {
    /**
     * Get a coherent ecosystem of symbolic props for a given theme.
     * @param {string} mainSymbol - 'time', 'death', 'hope', 'memory', 'solitude'
     * @param {number} seed - Rng seed
     * @returns {string[]} Selected props from ecosystem
     */
    static getEcosystem(mainSymbol, seed = 1) {
      const graph = SYMBOL_GRAPHS[mainSymbol] || SYMBOL_GRAPHS.memory;
      const count = 2 + Math.floor(Math.abs(Math.sin(seed)) * 2);
      const selected = [];

      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.abs(Math.sin(seed + i * 1.7)) * graph.length);
        const item = graph[idx];
        if (!selected.includes(item)) {
          selected.push(item);
        }
      }

      return selected;
    }
  }

  global.SceneSymbolEcology = SymbolEcology;
})(typeof window !== 'undefined' ? window : globalThis);
