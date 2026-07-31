// ═══════════════════════════════════════════════════════════════════════
// MEANING ENGINE — Extracción de metáforas y significado profundo
// Convierte el texto lírico en intenciones poéticas y temas profundos
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class MeaningEngine {
    constructor() {
      // Meaning mappings for deep themes
      this._THEME_PATTERNS = [
        { pattern: /(dejar ir|liberar|soltar|adiós|let go|letting go)/i, theme: 'sacrifice_and_acceptance', weight: 0.9 },
        { pattern: /(siempre|eterno|forever|eternity|nunca olvidar)/i, theme: 'immortality_of_feeling', weight: 0.8 },
        { pattern: /(oscuridad|noche|sombra|darkness|shadow|night)/i, theme: 'existential_solitude', weight: 0.7 },
        { pattern: /(luz|amanecer|estrellas|light|dawn|stars)/i, theme: 'transcendent_hope', weight: 0.85 },
        { pattern: /(fuego|arder|quemar|fire|burn|flame)/i, theme: 'destructive_passion', weight: 0.9 },
        { pattern: /(tiempo|reloj|ayer|pasado|time|clock|yesterday)/i, theme: 'inexorable_passage_of_time', weight: 0.85 },
        { pattern: /(lluvia|lágrimas|dolor|rain|tears|pain)/i, theme: 'cathartic_purification', weight: 0.75 },
        { pattern: /(volar|cielo|alas|fly|sky|wings)/i, theme: 'liberation_from_bounds', weight: 0.8 },
        { pattern: /(amor|beso|corazón|corazon|abrazo|amar|love|kiss|heart|darling)/i, theme: 'romantic_devotion', weight: 0.85 },
        { pattern: /(obsesión|obsesion|no puedo dejar|siempre pienso|adicción|addicted|obsession|cannot stop)/i, theme: 'obsessive_longing', weight: 0.95 },
        { pattern: /(secreto|misterio|niebla|susurro|oculto|secret|mystery|whisper|hidden)/i, theme: 'veiled_mystery', weight: 0.8 },
        { pattern: /(reino|batalla|héroe|heroe|victoria|destino|kingdom|battle|hero|victory|destiny)/i, theme: 'epic_ascension', weight: 0.9 }
      ];
    }

    /**
     * Analyze lyrical blocks and extract deep metaphorical meaning.
     * @param {Array<{text: string, emotion: string, intensity: number}>} blocks
     * @returns {Object} DeepMeaningResult
     */
    extractMeaning(blocks) {
      if (!blocks || blocks.length === 0) {
        return {
          primaryTheme: 'universal_contemplation',
          deepThemes: [],
          metaphors: [],
          themeScores: {},
          blockMotifs: []
        };
      }

      const detectedThemes = new Map();
      const metaphors = [];
      const blockMotifs = [];

      for (const block of blocks) {
        const text = block.text || '';
        const localThemes = [];
        for (const item of this._THEME_PATTERNS) {
          if (item.pattern.test(text)) {
            const current = detectedThemes.get(item.theme) || 0;
            detectedThemes.set(item.theme, current + item.weight);
            const metaphor = {
              text,
              meaning: item.theme,
              weight: item.weight,
              startMs: block.startMs
            };
            metaphors.push(metaphor);
            localThemes.push(metaphor);
          }
        }

        const orderedLocalThemes = localThemes.slice().sort((a, b) => b.weight - a.weight);
        blockMotifs.push({
          startMs: block.startMs,
          endMs: block.endMs,
          primaryTheme: orderedLocalThemes[0] ? orderedLocalThemes[0].meaning : null,
          themes: orderedLocalThemes.map(item => item.meaning),
          metaphors: orderedLocalThemes,
          keywords: block.keywords || []
        });
      }

      const sortedThemes = Array.from(detectedThemes.entries())
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

      const primaryTheme = sortedThemes.length > 0 ? sortedThemes[0] : 'universal_contemplation';

      return {
        primaryTheme,
        deepThemes: sortedThemes,
        metaphors,
        themeScores: Object.fromEntries(detectedThemes),
        blockMotifs
      };
    }
  }

  global.SceneMeaningEngine = MeaningEngine;
})(typeof window !== 'undefined' ? window : globalThis);
