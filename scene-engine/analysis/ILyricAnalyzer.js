// ═══════════════════════════════════════════════════════════════════════
// ILyricAnalyzer — Interfaz/contrato para analizadores de letra
// Preparado para futuro AIAnalyzer (GPT, Gemini, modelo local)
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  /**
   * Interface that all lyric analyzers must implement.
   * Current: DictionaryAnalyzer (local, offline)
   * Future:  AIAnalyzer (GPT, Gemini, local model)
   */
  class ILyricAnalyzer {
    /**
     * Analyze a set of synced lyric lines.
     * @param {Array<{timeMs: number, text: string}>} lines - Parsed lyrics from LrcParser
     * @returns {AnalysisResult}
     */
    analyze(lines) {
      throw new Error('ILyricAnalyzer.analyze() must be implemented by subclass');
    }

    /**
     * Async analysis for LLM/AI model implementations (e.g. Gemma 3 1B).
     * @param {Array<{timeMs: number, text: string}>} lines
     * @returns {Promise<AnalysisResult>}
     */
    async analyzeAsync(lines) {
      return this.analyze(lines);
    }
  }

  /**
   * @typedef {Object} AnalyzedBlock
   * @property {number} startMs      - Start time
   * @property {number} endMs        - End time
   * @property {string} text         - Combined text of this block
   * @property {string} emotion      - Primary emotion: 'love'|'sad'|'energy'|'celebration'|'dark'|'nature'|'nostalgia'|'anger'|'spiritual'|'neutral'
   * @property {number} emotionScore - Score of primary emotion (0-1)
   * @property {string|null} secondaryEmotion - Secondary emotion
   * @property {number} secondaryScore       - Score of secondary emotion (0-1)
   * @property {number} intensity    - Overall intensity (0-1)
   * @property {string[]} keywords   - Detected keywords
   * @property {Object} rawScores    - { love: 0.8, sad: 0.1, ... }
   */

  /**
   * @typedef {Object} AnalysisResult
   * @property {AnalyzedBlock[]} blocks - Analyzed blocks with emotions and scores
   */

  // Emotion categories — shared across implementations
  ILyricAnalyzer.EMOTIONS = Object.freeze([
    'love', 'sad', 'energy', 'celebration', 'dark',
    'nature', 'nostalgia', 'anger', 'spiritual', 'neutral'
  ]);

  global.ILyricAnalyzer = ILyricAnalyzer;
})(typeof window !== 'undefined' ? window : globalThis);
