// GEMMA 3 LYRIC ANALYZER - Structured narrative analysis with safe local fallback.
(function (global) {
  'use strict';

  class Gemma3LyricAnalyzer extends global.ILyricAnalyzer {
    constructor(options = {}) {
      super();
      this.ollamaEndpoint = options.ollamaEndpoint || 'http://localhost:11434';
      this.preferredModelName = options.modelName || this._savedModelName() || 'gemma3:4b';
      this.fallbackModelNames = options.fallbackModelNames || ['qwen2.5:7b-instruct', 'gemma3:1b'];
      this.activeModelName = this.preferredModelName;
      this.fallbackToDictionary = options.fallbackToDictionary !== false;
      this.fallbackAnalyzer = new global.SceneDictionaryAnalyzer();
      this.cache = new global.SceneGemma3LyricCache();
      this.validator = global.SceneGemma3SchemaValidator;
      this.isLLMAvailable = false;
      this.checkModelAvailability();
    }

    _savedModelName() {
      try { return localStorage.getItem('aurora_scene_model') || ''; } catch (_) { return ''; }
    }

    async checkModelAvailability() {
      try {
        const response = await fetch(`${this.ollamaEndpoint}/api/tags`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
        const data = await response.json();
        const names = (data.models || []).map(model => model.name).filter(Boolean);
        const available = [this.preferredModelName, ...this.fallbackModelNames].find(candidate =>
          names.some(name => name === candidate || name.startsWith(`${candidate}:`) || candidate.startsWith(`${name}:`))
        );
        this.isLLMAvailable = !!available;
        this.activeModelName = available || this.preferredModelName;
        if (available && available !== this.preferredModelName) {
          console.warn(`[Gemma3] Preferred model ${this.preferredModelName} is not installed; using ${available}.`);
        }
      } catch (_) {
        this.isLLMAvailable = false;
      }
      return this.isLLMAvailable;
    }

    analyze(lines) { return this.fallbackAnalyzer.analyze(lines); }

    async analyzeAsync(lines, metadata = {}) {
      if (!lines || lines.length === 0) return this.fallbackAnalyzer.analyze(lines);
      const artist = metadata.artist || '';
      const title = metadata.title || '';
      const available = await this.checkModelAvailability();
      if (!available) return this._fallback(lines, 'No local Ollama model is available.');
      const cached = this.cache.get(artist, title, lines, this.activeModelName);
      if (cached && cached.data) {
        console.log(`[Gemma3] Reusing cached analysis for "${artist} - ${title}" (${this.activeModelName}).`);
        return cached.data;
      }

      try {
        const groupedBlocks = this._groupLines(lines);
        const prompt = this._buildNarrativePrompt(groupedBlocks, metadata);
        const startedAt = performance.now();
        const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.activeModelName,
            prompt,
            stream: false,
            format: 'json',
            options: { temperature: 0.25, top_p: 0.9, num_predict: 1200 }
          })
        });
        console.log(`[Gemma3] ${this.activeModelName} inference: ${Math.round(performance.now() - startedAt)} ms.`);
        if (!response.ok) throw new Error(`Ollama returned status ${response.status}`);
        const responseData = await response.json();
        const parsed = this._extractJSON(responseData.response);
        if (!parsed) return this._fallback(lines, 'Ollama returned unreadable JSON.', responseData.response);
        const validation = this.validator ? this.validator.validate(parsed) : { isValid: true, errors: [] };
        if (!validation.isValid) return this._fallback(lines, `Schema validation failed: ${validation.errors.join(' | ')}`);
        const mapped = this._buildAnalysisResult(parsed, groupedBlocks);
        this.cache.set(artist, title, lines, mapped, this.activeModelName);
        return mapped;
      } catch (error) {
        return this._fallback(lines, error && error.message ? error.message : String(error));
      }
    }

    _fallback(lines, reason, rawResponse) {
      console.error(`[Gemma3] Falling back to DictionaryAnalyzer. ${reason}`, rawResponse ? { rawResponse } : '');
      if (this.fallbackToDictionary) return this.fallbackAnalyzer.analyze(lines);
      throw new Error(reason);
    }

    // Segment from musical structure instead of an arbitrary fixed eight-line slice.
    _groupLines(lines, maxLinesPerBlock = 6) {
      const lyricLines = lines.filter(line => !line.isInterlude && line.text && line.text.trim());
      if (lyricLines.length === 0) return [];
      const blocks = [];
      const seen = new Map();
      let current = [];
      let currentSection = 'verse';
      const finish = () => {
        if (!current.length) return;
        const last = current[current.length - 1];
        blocks.push({
          startMs: current[0].timeMs,
          endMs: last.timeMs + Math.max(1200, last.durationMs || 0),
          text: current.map(line => line.text.trim()).join(' '),
          sectionHint: currentSection,
          lineCount: current.length
        });
        current = [];
      };
      for (let index = 0; index < lyricLines.length; index += 1) {
        const line = lyricLines[index];
        const normalized = this._normalizeLine(line.text);
        const previous = lyricLines[index - 1];
        const gap = previous ? Math.max(0, line.timeMs - previous.timeMs) : 0;
        const repeated = normalized.length > 5 && seen.has(normalized) && (index - seen.get(normalized)) >= 2;
        const boundary = current.length > 0 && (gap > 2000 || repeated || current.length >= maxLinesPerBlock);
        if (boundary) finish();
        if (current.length === 0) currentSection = repeated ? 'chorus' : (gap > 3500 ? 'bridge' : 'verse');
        current.push(line);
        if (normalized) seen.set(normalized, index);
      }
      finish();
      for (let i = 0; i < blocks.length; i += 1) {
        blocks[i].endMs = i < blocks.length - 1 ? Math.max(blocks[i].startMs + 1000, blocks[i + 1].startMs) : blocks[i].endMs;
      }
      return blocks;
    }

    _normalizeLine(text) {
      return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    _buildNarrativePrompt(blocks, metadata = {}) {
      const emotions = global.ILyricAnalyzer.EMOTIONS.join(', ');
      const biomeEnum = global.SceneBiomeLibrary ? global.SceneBiomeLibrary.enumForPrompt() : 'forest | desert | city | ocean | snow | ruins | swamp | interior | void | mountain | mystic_garden | neon_city';
      const songInfo = metadata.title ? `Song: "${metadata.title}" by ${metadata.artist || 'Unknown artist'}` : 'Song metadata is unavailable.';
      const summaries = blocks.map((block, index) =>
        `Section ${index + 1} (${block.sectionHint}, ${Math.floor(block.startMs / 1000)}s-${Math.floor(block.endMs / 1000)}s): "${block.text}"`
      ).join('\n');
      return `You are a poetic 3D music-video director. Analyze the lyrics and return a coherent cinematic plan.\n\n${songInfo}\n\nSTRICT RULES:\n1. Return ONLY valid JSON, without markdown or commentary.\n2. Allowed emotions: [${emotions}].\n3. world.type MUST be exactly one of: [${biomeEnum}]. Choose the world that expresses the song, not just a literal noun.\n4. camera.style MUST be one of: [slow_follow, intimate_dolly, orbit, crane, still, kinetic]. lighting.preset MUST be one of: [warm, cold, neon, dark, moonlight, sunrise, golden_hour, dramatic]. artStyle MUST be one of: [realistic, anime, gothic].\n5. Each act MUST include intensity from 0.0 to 1.0, section (verse|chorus|bridge|outro), and its own symbols. worldType is optional and may use the same biome list when the story truly changes location.\n6. Do not include coordinates, object counts, or hexadecimal colors.\n\nRequired JSON shape:\n{\n  "story": {\n    "theme": "romantic_devotion",\n    "acts": [{ "start": 0, "end": 42, "emotion": "love", "visualGoal": "search", "intensity": 0.4, "section": "verse", "symbols": ["empty_bench"], "worldType": "mystic_garden" }]\n  },\n  "world": { "type": "mystic_garden", "season": "autumn", "time": "sunset" },\n  "camera": { "style": "slow_follow" },\n  "lighting": { "preset": "golden_hour" },\n  "artStyle": "realistic",\n  "symbols": ["falling_leaves"],\n  "directorNotes": ["Keep the first verse distant and restrained."]\n}\n\nLyrics:\n${summaries}\n\nWrite the JSON now:`;
    }

    _extractJSON(raw) {
      try {
        if (raw && typeof raw === 'object') return raw;
        let clean = String(raw || '').trim();
        if (clean.startsWith('```')) clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        return JSON.parse(clean);
      } catch (_) { return null; }
    }

    _buildAnalysisResult(data, groupedBlocks) {
      const story = data.story || {};
      const acts = Array.isArray(story.acts) ? story.acts : [];
      const world = data.world || {};
      const camera = data.camera || {};
      const lighting = data.lighting || {};
      const symbols = Array.isArray(data.symbols) ? data.symbols : [];
      const directorNotes = Array.isArray(data.directorNotes) ? data.directorNotes : [];
      const blocks = groupedBlocks.map((group, index) => {
        const startSeconds = group.startMs / 1000;
        const matchingAct = acts.find(act => startSeconds >= act.start && startSeconds <= act.end) || acts[index] || {};
        const emotionCandidate = String(matchingAct.emotion || 'neutral').toLowerCase();
        const emotion = global.ILyricAnalyzer.EMOTIONS.includes(emotionCandidate) ? emotionCandidate : 'neutral';
        const intensity = typeof matchingAct.intensity === 'number'
          ? Math.max(0, Math.min(1, matchingAct.intensity))
          : 0.5 + (index / Math.max(1, groupedBlocks.length - 1)) * 0.35;
        const actIndex = acts.indexOf(matchingAct);
        const localSymbols = Array.isArray(matchingAct.symbols) && matchingAct.symbols.length ? matchingAct.symbols : symbols;
        return {
          startMs: group.startMs, endMs: group.endMs, text: group.text, emotion,
          emotionScore: 0.6 + intensity * 0.35, intensity,
          section: matchingAct.section || group.sectionHint || 'verse',
          actIndex: actIndex >= 0 ? actIndex : index,
          worldType: typeof matchingAct.worldType === 'string' ? matchingAct.worldType : null,
          keywords: localSymbols, visualGoal: matchingAct.visualGoal || 'narrative_flow',
          rawScores: { [emotion]: 0.6 + intensity * 0.35 }
        };
      });
      return {
        blocks, llmTheme: story.theme || 'universal_contemplation', isAIAnalyzed: true,
        richVision: { world, camera, lighting, symbols, directorNotes, artStyle: data.artStyle || null }
      };
    }
  }

  global.SceneGemma3LyricAnalyzer = Gemma3LyricAnalyzer;
})(typeof window !== 'undefined' ? window : globalThis);
