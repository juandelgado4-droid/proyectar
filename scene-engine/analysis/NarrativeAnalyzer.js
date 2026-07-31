// ═══════════════════════════════════════════════════════════════════════
// NARRATIVE ANALYZER — Análisis de estructura narrativa
// Story arcs, intensity curves, stanza grouping, transition smoothing
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class NarrativeAnalyzer {
    constructor() {
      this._GAP_THRESHOLD_MS = 4000; // Gap between stanzas
    }

    /**
     * Analyze the narrative structure of an analyzed song.
     * @param {{ blocks: AnalyzedBlock[] }} analysisResult - From DictionaryAnalyzer
     * @returns {NarrativeResult}
     */
    analyze(analysisResult) {
      const blocks = analysisResult.blocks;
      if (!blocks || blocks.length === 0) {
        return {
          blocks: [],
          arc: null,
          intensityCurve: [],
          stanzas: []
        };
      }

      // Group into stanzas
      const stanzas = this._groupIntoStanzas(blocks);

      // Calculate intensity curve
      const intensityCurve = this._calculateIntensityCurve(blocks);

      // Detect story arc
      const arc = this._detectStoryArc(blocks, intensityCurve);

      // Enrich blocks with arc position
      const enrichedBlocks = this._enrichWithArc(blocks, arc);

      // Smooth abrupt transitions
      const smoothedBlocks = this._smoothTransitions(enrichedBlocks);

      return {
        blocks: smoothedBlocks,
        arc,
        intensityCurve,
        stanzas
      };
    }

    /**
     * Group blocks into stanzas based on time gaps.
     * @param {AnalyzedBlock[]} blocks
     * @returns {number[][]} Array of stanzas, each containing block indices
     */
    _groupIntoStanzas(blocks) {
      const stanzas = [];
      let currentStanza = [0];

      for (let i = 1; i < blocks.length; i++) {
        const gap = blocks[i].startMs - blocks[i - 1].endMs;
        if (gap >= this._GAP_THRESHOLD_MS) {
          stanzas.push(currentStanza);
          currentStanza = [];
        }
        currentStanza.push(i);
      }
      if (currentStanza.length > 0) {
        stanzas.push(currentStanza);
      }

      return stanzas;
    }

    /**
     * Calculate a smoothed intensity curve across the song.
     * @param {AnalyzedBlock[]} blocks
     * @returns {{ timeMs: number, intensity: number }[]}
     */
    _calculateIntensityCurve(blocks) {
      // Calculate raw intensity for each block using emotion scores + text intensity
      const raw = blocks.map(b => ({
        timeMs: b.startMs,
        intensity: Math.min(1, b.emotionScore * 0.6 + b.intensity * 0.4)
      }));

      // Smooth with a simple moving average (window of 3)
      const smoothed = [];
      for (let i = 0; i < raw.length; i++) {
        const window = [];
        for (let j = Math.max(0, i - 1); j <= Math.min(raw.length - 1, i + 1); j++) {
          window.push(raw[j].intensity);
        }
        smoothed.push({
          timeMs: raw[i].timeMs,
          intensity: window.reduce((a, b) => a + b, 0) / window.length
        });
      }

      return smoothed;
    }

    /**
     * Detect the story arc of the song.
     * @param {AnalyzedBlock[]} blocks
     * @param {{ timeMs: number, intensity: number }[]} curve
     * @returns {{ introEnd, buildStart, climaxStart, climaxPeak, resolutionStart } | null}
     */
    _detectStoryArc(blocks, curve) {
      if (blocks.length < 4) return null;

      const totalDuration = blocks[blocks.length - 1].endMs;
      const peakIdx = curve.reduce((maxI, v, i, arr) =>
        v.intensity > arr[maxI].intensity ? i : maxI, 0);

      const peakPosition = peakIdx / curve.length;

      // Estimate arc positions
      return {
        introEnd: totalDuration * 0.12,
        buildStart: totalDuration * 0.15,
        climaxStart: totalDuration * Math.max(0.4, peakPosition - 0.15),
        climaxPeak: totalDuration * peakPosition,
        resolutionStart: totalDuration * Math.min(0.85, peakPosition + 0.2)
      };
    }

    /**
     * Enrich blocks with their position in the story arc.
     * @param {AnalyzedBlock[]} blocks
     * @param {Object|null} arc
     * @returns {AnalyzedBlock[]}
     */
    _enrichWithArc(blocks, arc) {
      if (!arc) {
        return blocks.map(b => ({ ...b, arcPosition: 'body', arcIntensity: 0.5 }));
      }

      return blocks.map(b => {
        const t = b.startMs;
        let arcPosition, arcIntensity;

        if (t < arc.introEnd) {
          arcPosition = 'intro';
          arcIntensity = 0.2 + (t / arc.introEnd) * 0.2;
        } else if (t < arc.climaxStart) {
          arcPosition = 'build';
          const progress = (t - arc.buildStart) / (arc.climaxStart - arc.buildStart);
          arcIntensity = 0.4 + Math.max(0, progress) * 0.3;
        } else if (t < arc.resolutionStart) {
          arcPosition = 'climax';
          const distFromPeak = Math.abs(t - arc.climaxPeak) / (arc.resolutionStart - arc.climaxStart);
          arcIntensity = 1.0 - distFromPeak * 0.2;
        } else {
          arcPosition = 'resolution';
          const remaining = (blocks[blocks.length - 1].endMs - t) /
            (blocks[blocks.length - 1].endMs - arc.resolutionStart);
          arcIntensity = 0.3 + remaining * 0.3;
        }

        return { ...b, arcPosition, arcIntensity: Math.min(1, Math.max(0, arcIntensity)) };
      });
    }

    /**
     * Smooth abrupt emotion transitions by inserting intermediate states.
     * @param {AnalyzedBlock[]} blocks
     * @returns {AnalyzedBlock[]}
     */
    _smoothTransitions(blocks) {
      if (blocks.length < 2) return blocks;

      const result = [];

      for (let i = 0; i < blocks.length; i++) {
        result.push(blocks[i]);

        if (i < blocks.length - 1) {
          const current = blocks[i];
          const next = blocks[i + 1];

          // If emotions are very different, mark the transition
          if (current.emotion !== next.emotion &&
              current.emotionScore > 0.5 && next.emotionScore > 0.5) {
            // Mark the current block as having a pending transition
            current.transitionTo = next.emotion;
            current.transitionDuration = Math.min(3000,
              Math.max(1000, (next.startMs - current.startMs) * 0.3));
          }
        }
      }

      return result;
    }
  }

  global.SceneNarrativeAnalyzer = NarrativeAnalyzer;
})(typeof window !== 'undefined' ? window : globalThis);
