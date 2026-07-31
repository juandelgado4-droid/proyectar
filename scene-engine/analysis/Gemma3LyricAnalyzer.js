// ═══════════════════════════════════════════════════════════════════════
// GEMMA 3 1B LYRIC ANALYZER — Analizador narrativo enriquecido con Caché y Validación
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class Gemma3LyricAnalyzer extends global.ILyricAnalyzer {
    /**
     * @param {Object} options
     * @param {string} [options.ollamaEndpoint='http://localhost:11434']
     * @param {string} [options.modelName='gemma3:1b']
     * @param {boolean} [options.fallbackToDictionary=true]
     */
    constructor(options = {}) {
      super();
      this.ollamaEndpoint = options.ollamaEndpoint || 'http://localhost:11434';
      this.modelName = options.modelName || 'gemma3:1b';
      this.fallbackToDictionary = options.fallbackToDictionary !== false;

      this.fallbackAnalyzer = new global.SceneDictionaryAnalyzer();
      this.cache = new global.SceneGemma3LyricCache();
      this.validator = global.SceneGemma3SchemaValidator;

      this.isLLMAvailable = false;
      this.checkModelAvailability();
    }

    async checkModelAvailability() {
      try {
        const res = await fetch(`${this.ollamaEndpoint}/api/tags`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          const models = data.models || [];
          this.isLLMAvailable = models.some(m => m.name.includes('gemma3') || m.name.includes('gemma'));
        } else {
          this.isLLMAvailable = false;
        }
      } catch (err) {
        this.isLLMAvailable = false;
      }
      return this.isLLMAvailable;
    }

    /**
     * Immediate baseline synchronous analysis.
     */
    analyze(lines) {
      return this.fallbackAnalyzer.analyze(lines);
    }

    /**
     * Full pre-analysis flow with cache lookup and strict JSON schema validation.
     * @param {Array<{timeMs: number, text: string}>} lines
     * @param {Object} metadata - { artist, title }
     * @returns {Promise<AnalysisResult>}
     */
    async analyzeAsync(lines, metadata = {}) {
      if (!lines || lines.length === 0) {
        return this.fallbackAnalyzer.analyze(lines);
      }

      const artist = metadata.artist || '';
      const title = metadata.title || '';

      // 1. Check persistent disk/localStorage cache first
      const cached = this.cache.get(artist, title, lines);
      if (cached && cached.data) {
        console.log(`⚡ [Gemma3LyricAnalyzer] Usando visión previamente analizada de caché para "${artist} - ${title}"`);
        return cached.data;
      }

      // 2. Check LLM availability
      const available = await this.checkModelAvailability();
      if (!available && this.fallbackToDictionary) {
        console.warn('Gemma 3 1B LLM no disponible localmente. Usando DictionaryAnalyzer como fallback.');
        return this.fallbackAnalyzer.analyze(lines);
      }

      try {
        const groupedBlocks = this._groupLines(lines, 8);
        const prompt = this._buildNarrativePrompt(groupedBlocks, metadata);

        const startTime = performance.now();
        const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.modelName,
            prompt: prompt,
            stream: false,
            options: {
              temperature: 0.25,
              top_p: 0.9,
              num_predict: 900
            }
          })
        });

        const durationMs = Math.round(performance.now() - startTime);
        console.log(`⏱️ [Gemma3LyricAnalyzer] Tiempo de inferencia LLM: ${durationMs} ms`);

        if (!response.ok) {
          throw new Error(`Servidor LLM devolvió status ${response.status}`);
        }

        const data = await response.json();
        const parsedRaw = this._extractJSON(data.response);

        // 3. Strict Schema Validation
        const validation = this.validator ? this.validator.validate(parsedRaw) : { isValid: true };
        if (!validation.isValid) {
          console.warn('❌ [Gemma3LyricAnalyzer] El JSON no superó la validación por esquema:', validation.errors);
          if (this.fallbackToDictionary) {
            return this.fallbackAnalyzer.analyze(lines);
          }
        }

        // 4. Map valid JSON to engine AnalysisResult
        const mappedResult = this._buildAnalysisResult(parsedRaw, groupedBlocks);

        // 5. Store in persistent cache
        this.cache.set(artist, title, lines, mappedResult);

        return mappedResult;

      } catch (err) {
        console.error('Error durante el análisis lírico con Gemma 3 1B:', err);
        if (this.fallbackToDictionary) {
          return this.fallbackAnalyzer.analyze(lines);
        }
        throw err;
      }
    }

    _groupLines(lines, maxLinesPerBlock = 8) {
      const blocks = [];
      let current = [];
      
      for (let i = 0; i < lines.length; i++) {
        current.push(lines[i]);
        if (current.length >= maxLinesPerBlock || i === lines.length - 1) {
          const startMs = current[0].timeMs;
          const endMs = (i < lines.length - 1) ? lines[i + 1].timeMs : startMs + 10000;
          const text = current.map(l => l.text).join(' ');
          blocks.push({ startMs, endMs, text });
          current = [];
        }
      }
      return blocks;
    }

    _buildNarrativePrompt(blocks, metadata) {
      const validEmotions = global.ILyricAnalyzer.EMOTIONS.join(', ');
      const songInfo = metadata.title ? `Canción: "${metadata.title}" de ${metadata.artist || 'Artista'}` : '';

      const blockSummaries = blocks.map((b, idx) => 
        `Bloque ${idx + 1} [${Math.floor(b.startMs/1000)}s - ${Math.floor(b.endMs/1000)}s]: "${b.text}"`
      ).join('\n');

      return `Eres un poético Director Cinematográfico de videoclips 3D. Analiza la letra y define la INTENCIÓN NARRATIVA Y ARTÍSTICA de la canción.

${songInfo}

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE en JSON sintácticamente válido. Sin explicaciones ni etiquetas markdown adicionales.
2. Emociones permitidas: [${validEmotions}].
3. No especifiques coordenadas, números de objetos ni colores Hex. Define únicamente intenciones estéticas.

Estructura JSON requerida:
{
  "story": {
    "theme": "romantic_devotion",
    "acts": [
      {
        "start": 0,
        "end": 42,
        "emotion": "love",
        "visualGoal": "search"
      }
    ]
  },
  "world": {
    "type": "forest",
    "season": "autumn",
    "time": "sunset"
  },
  "camera": {
    "style": "slow_follow"
  },
  "lighting": {
    "preset": "golden"
  },
  "symbols": ["falling_leaves", "empty_bench"],
  "directorNotes": [
    "La cámara debe permanecer distante durante la primera estrofa.",
    "La iluminación debe calentarse progresivamente."
  ]
}

Bloques de letra:
${blockSummaries}

Escribe el JSON de análisis narrativo ahora:`;
    }

    _extractJSON(rawText) {
      try {
        let clean = rawText.trim();
        if (clean.startsWith('```')) {
          clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        }
        return JSON.parse(clean);
      } catch (err) {
        return null;
      }
    }

    _buildAnalysisResult(data, groupedBlocks) {
      const story = data.story || {};
      const acts = story.acts || [];
      const world = data.world || {};
      const camera = data.camera || {};
      const lighting = data.lighting || {};
      const symbols = data.symbols || [];
      const directorNotes = data.directorNotes || [];

      const resultBlocks = groupedBlocks.map((gb, idx) => {
        // Find matching act or block intent
        const matchingAct = acts.find(a => gb.startMs / 1000 >= a.start && gb.startMs / 1000 <= a.end) || acts[idx] || {};
        let emotion = (matchingAct.emotion || 'neutral').toLowerCase();
        if (!global.ILyricAnalyzer.EMOTIONS.includes(emotion)) emotion = 'neutral';

        return {
          startMs: gb.startMs,
          endMs: gb.endMs,
          text: gb.text,
          emotion: emotion,
          emotionScore: 0.85,
          intensity: 0.7,
          keywords: symbols,
          visualGoal: matchingAct.visualGoal || 'narrative_flow',
          rawScores: { [emotion]: 0.85 }
        };
      });

      return {
        blocks: resultBlocks,
        llmTheme: story.theme || 'universal_contemplation',
        richVision: {
          world,
          camera,
          lighting,
          symbols,
          directorNotes
        },
        isAIAnalyzed: true
      };
    }
  }

  global.SceneGemma3LyricAnalyzer = Gemma3LyricAnalyzer;
})(typeof window !== 'undefined' ? window : globalThis);
