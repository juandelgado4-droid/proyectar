// ═══════════════════════════════════════════════════════════════════════
// SYNC ENGINE — Motor de sincronización de letras premium
// Módulo compartido por app.js y proyector.js
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  // ─── Constants ───
  const SEEK_THRESHOLD_MS      = 1500;  // |diff| > this → hard reset (seek)
  const STATUS_CHANGE_THRESH   = 400;   // |diff| > this → fast correction
  const LERP_DEADZONE_MS       = 15;    // |diff| ≤ this → ignore (already synced)
  const LERP_FACTOR            = 0.08;  // per-frame smoothing factor (~300ms convergence)
  const LERP_FAST_FACTOR       = 0.35;  // faster correction after status changes
  const TRANSIT_LATENCY_CAP_MS = 600;   // max ms to compensate for IPC transit delay
  const LYRIC_LEAD_MS          = 200;   // activate line slightly before its timestamp
  const BACK_HYSTERESIS_MS     = 300;   // prevents bounce between line i and i-1
  const MAX_ADVANCE_PER_FRAME  = 1;     // max lines to advance per animation frame
  const OFFSET_LIMIT_MS        = 5000;  // max manual offset in either direction
  const OFFSET_STEP_MS         = 100;   // default step for offset buttons
  const GAP_THRESHOLD_MS       = 5000;  // instrumental gap detection threshold
  const DOTS_LEAD_MS           = 2500;  // "..." appear this long before next line
  const MIN_LINE_DWELL_MS      = 2500;  // min time a sung line stays visible before "..."

  // ─── PredictiveClock ───
  // Maintains a smooth, continuous position estimate that advances every frame
  // regardless of SMTC update frequency. This eliminates visual freezing between
  // SMTC polls (~250ms intervals).
  class PredictiveClock {
    constructor() {
      this._pos = 0;           // last reconciled position (ms)
      this._localTs = 0;       // performance.now() at last reconciliation
      this._rate = 1.0;        // playback rate multiplier
      this._frozen = true;     // true when paused
      this._pendingLerp = null; // { targetPos, factor } for gradual correction
    }

    /** Current estimated position (ms), called every frame */
    getPosition() {
      if (this._frozen) return Math.max(0, this._pos);
      const now = performance.now();
      let pos = this._pos + (now - this._localTs) * this._rate;

      // Apply pending LERP correction if any
      if (this._pendingLerp) {
        const diff = this._pendingLerp.targetPos - pos;
        if (Math.abs(diff) < 1) {
          // Close enough, snap and clear
          pos = this._pendingLerp.targetPos;
          this._pendingLerp = null;
        } else {
          const correction = diff * this._pendingLerp.factor;
          pos += correction;
          // Update target for next frame (the target itself drifts with playback)
          this._pendingLerp.targetPos += (now - this._localTs) * this._rate;
        }
        // Persist corrected position
        this._pos = pos;
        this._localTs = now;
      }

      return Math.max(0, pos);
    }

    /** Hard-set position (seek, song change, status change) */
    hardReset(posMs, rate) {
      this._pos = posMs;
      this._localTs = performance.now();
      if (typeof rate === 'number' && rate > 0) this._rate = rate;
      this._pendingLerp = null;
    }

    /** Smoothly correct drift between SMTC real position and our estimate */
    lerpTo(realPosMs, factor) {
      const estimated = this.getPosition();
      const diff = realPosMs - estimated;
      // Apply immediate partial correction + set up per-frame lerp
      this._pos = estimated + diff * factor;
      this._localTs = performance.now();
      this._pendingLerp = {
        targetPos: realPosMs,
        factor: factor * 0.5  // decay factor for subsequent frames
      };
    }

    /** Freeze clock (pause) */
    freeze() {
      if (!this._frozen) {
        this._pos = this.getPosition(); // snapshot current position
        this._localTs = performance.now();
        this._frozen = true;
        this._pendingLerp = null;
      }
    }

    /** Resume clock (play) */
    resume(posMs, rate) {
      this._pos = (typeof posMs === 'number') ? posMs : this._pos;
      this._localTs = performance.now();
      if (typeof rate === 'number' && rate > 0) this._rate = rate;
      this._frozen = false;
      this._pendingLerp = null;
    }

    /** Update playback rate without resetting position */
    setRate(rate) {
      if (typeof rate === 'number' && rate > 0) {
        // Snapshot current position before changing rate
        this._pos = this.getPosition();
        this._localTs = performance.now();
        this._rate = rate;
      }
    }

    isFrozen() { return this._frozen; }
    getRate()   { return this._rate; }
  }

  // ─── SmtcReconciler ───
  // Receives raw SMTC updates and feeds them into PredictiveClock with
  // appropriate smoothing. Detects seeks, status changes, and drift.
  class SmtcReconciler {
    constructor(clock) {
      this._clock = clock;
      this._lastStatus = null;
      this._lastSongKey = '';
      this._source = '';
    }

    /**
     * Process a raw SMTC media-update event.
     * @param {Object} data - { positionMs, timestamp, status, playbackRate, source, ... }
     * @returns {{ seeked: boolean, songChanged: boolean, statusChanged: boolean }}
     */
    reconcile(data) {
      const result = { seeked: false, songChanged: false, statusChanged: false };

      if (data.error) return result;

      const songKey = `${data.artist || ''}|${data.title || ''}`;
      const isPlaying = data.status === 'Playing';
      const wasPlaying = this._lastStatus === 'Playing';
      const statusChanged = (this._lastStatus !== null && isPlaying !== wasPlaying);
      const songChanged = (songKey !== this._lastSongKey && (data.title || ''));

      result.statusChanged = statusChanged;
      result.songChanged = !!songChanged;

      this._lastStatus = data.status;
      if (songChanged) this._lastSongKey = songKey;

      // Track source app
      if (data.source) this._source = data.source;

      // Extract and validate position
      let exactPosMs = Number(data.positionMs);
      if (!Number.isFinite(exactPosMs)) return result;

      const rate = (typeof data.playbackRate === 'number' && data.playbackRate > 0)
        ? data.playbackRate : 1.0;

      // Compensate for IPC transit delay
      if (isPlaying) {
        const eventTs = Number(data.timestamp);
        if (Number.isFinite(eventTs)) {
          const transit = Date.now() - eventTs;
          if (transit > 0) {
            exactPosMs += Math.min(transit, TRANSIT_LATENCY_CAP_MS) * rate;
          }
        }
      }
      exactPosMs = Math.max(0, exactPosMs);

      // ── Decision tree ──
      if (songChanged) {
        // New song → hard reset
        if (isPlaying) {
          this._clock.resume(exactPosMs, rate);
        } else {
          this._clock.hardReset(exactPosMs, rate);
          this._clock.freeze();
        }
        return result;
      }

      if (!isPlaying) {
        // Paused → freeze at exact position
        this._clock.hardReset(exactPosMs, rate);
        this._clock.freeze();
        return result;
      }

      // Playing state
      if (statusChanged || this._clock.isFrozen()) {
        // Just resumed from pause → resume with exact position
        this._clock.resume(exactPosMs, rate);
        return result;
      }

      // Already playing — check drift
      const estimated = this._clock.getPosition();
      const diff = exactPosMs - estimated;

      if (Math.abs(diff) > SEEK_THRESHOLD_MS) {
        // Large jump → seek detected
        this._clock.hardReset(exactPosMs, rate);
        this._clock.resume(exactPosMs, rate);
        result.seeked = true;
      } else if (Math.abs(diff) > STATUS_CHANGE_THRESH) {
        // Medium drift → fast correction
        this._clock.lerpTo(exactPosMs, LERP_FAST_FACTOR);
      } else if (Math.abs(diff) > LERP_DEADZONE_MS) {
        // Small drift → gentle LERP
        this._clock.lerpTo(exactPosMs, LERP_FACTOR);
      }
      // else: within deadzone, do nothing

      // Update rate if it changed
      if (Math.abs(this._clock.getRate() - rate) > 0.01) {
        this._clock.setRate(rate);
      }

      return result;
    }

    getSource() { return this._source; }
    getSongKey() { return this._lastSongKey; }
    getStatus() { return this._lastStatus; }
    isPlaying() { return this._lastStatus === 'Playing'; }
  }

  // ─── OffsetManager ───
  // Manages per-source (Spotify, Apple Music, etc.) sync offsets with
  // localStorage persistence.
  class OffsetManager {
    constructor() {
      this._currentSource = '';
      this._globalOffset = 0;
      this._sourceOffsets = {};
      this._loadAll();
    }

    _storageKey(source) {
      return `syncOffset_${source || 'global'}`;
    }

    _loadAll() {
      // Load global offset
      this._globalOffset = this._clamp(
        Number(localStorage.getItem('manualLyricOffsetMs') || 0)
      );
      // Load known source offsets
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('syncOffset_')) {
          const source = key.replace('syncOffset_', '');
          this._sourceOffsets[source] = this._clamp(
            Number(localStorage.getItem(key) || 0)
          );
        }
      }
    }

    _clamp(ms) {
      if (!Number.isFinite(ms)) return 0;
      return Math.max(-OFFSET_LIMIT_MS, Math.min(OFFSET_LIMIT_MS, ms));
    }

    /** Set the current source app (called on each SMTC update) */
    setSource(source) {
      if (source === this._currentSource) return;
      this._currentSource = source || '';
      // If we have a saved offset for this source, use it
      if (this._currentSource && this._sourceOffsets[this._currentSource] != null) {
        // Source has its own saved offset
      }
    }

    /** Get effective offset for current source (ms) */
    getOffset() {
      if (this._currentSource && this._sourceOffsets[this._currentSource] != null) {
        return this._sourceOffsets[this._currentSource];
      }
      return this._globalOffset;
    }

    /** Set offset — saves to both global and per-source */
    setOffset(ms) {
      const clamped = this._clamp(Math.round(ms / 50) * 50);
      this._globalOffset = clamped;
      localStorage.setItem('manualLyricOffsetMs', String(clamped));

      if (this._currentSource) {
        this._sourceOffsets[this._currentSource] = clamped;
        localStorage.setItem(this._storageKey(this._currentSource), String(clamped));
      }
      return clamped;
    }

    /** Adjust offset by delta ms */
    adjustOffset(deltaMs) {
      return this.setOffset(this.getOffset() + deltaMs);
    }

    /** Reset offset to 0 */
    resetOffset() {
      return this.setOffset(0);
    }

    /** Get a friendly name for current source */
    getSourceName() {
      const s = this._currentSource;
      if (!s) return '';
      // Common SMTC source app IDs
      if (s.includes('Spotify')) return 'Spotify';
      if (s.includes('AppleMusic') || s.includes('Apple') || s.includes('iTunes')) return 'Apple Music';
      if (s.includes('chrome') || s.includes('Chrome')) return 'Chrome';
      if (s.includes('firefox') || s.includes('Firefox')) return 'Firefox';
      if (s.includes('edge') || s.includes('Edge') || s.includes('msedge')) return 'Edge';
      if (s.includes('foobar')) return 'foobar2000';
      if (s.includes('AIMP')) return 'AIMP';
      if (s.includes('Winamp')) return 'Winamp';
      if (s.includes('VLC') || s.includes('vlc')) return 'VLC';
      if (s.includes('Groove') || s.includes('ZuneMusic')) return 'Groove Music';
      if (s.includes('Media Player') || s.includes('MediaPlayer')) return 'Media Player';
      // Fallback: try to extract a readable name
      const parts = s.split(/[.!_\\\/]/);
      const last = parts.filter(p => p.length > 1).pop();
      return last || s;
    }

    getCurrentSource() { return this._currentSource; }

    static get STEP_MS() { return OFFSET_STEP_MS; }
    static get LIMIT_MS() { return OFFSET_LIMIT_MS; }
  }

  // ─── LrcParser ───
  // Parses LRC (standard + Enhanced A2) and TTML formats.
  // Returns unified format: { lines: [{timeMs, text, words?}], format: 'lrc'|'a2'|'ttml'|'plain' }
  class LrcParser {

    /**
     * Auto-detect and parse lyrics content.
     * @param {string} content - Raw lyrics text (LRC, TTML, or plain)
     * @returns {{ lines: Array, format: string, hasWordLevel: boolean } | null}
     */
    static parse(content) {
      if (!content || typeof content !== 'string') return null;
      const trimmed = content.trim();

      // Try TTML first (XML-based)
      if (trimmed.startsWith('<?xml') || trimmed.startsWith('<tt') || trimmed.includes('<tt ')) {
        const result = LrcParser.parseTTML(trimmed);
        if (result) return result;
      }

      // Try LRC (standard or Enhanced A2)
      if (/\[\d{1,3}:\d{2}(?:[.,]\d{1,3})?\]/.test(trimmed)) {
        return LrcParser.parseLRC(trimmed);
      }

      return null;
    }

    /**
     * Parse standard LRC and Enhanced LRC (A2) with word-level timestamps.
     * Enhanced LRC A2 format: [00:12.34] <00:12.34>Word1 <00:12.78>Word2
     */
    static parseLRC(lrc) {
      if (!lrc) return null;
      const lines = lrc.split('\n');
      const parsed = [];
      const offsetMatch = String(lrc).match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/im);
      const lrcOffsetMs = offsetMatch ? parseInt(offsetMatch[1], 10) : 0;

      const timeTagRegex = /\[\d{1,3}:\d{2}(?:[.,]\d{1,3})?\]/g;
      // Enhanced LRC A2: word timestamps use < > delimiters
      const wordTimeTagRegex = /<(\d{1,3}):(\d{2})(?:[.,](\d{1,3}))?>([^<]*)/g;

      let hasAnyWordLevel = false;

      for (const line of lines) {
        let tags = [];
        let match;

        // Extract all line-level time tags
        while ((match = timeTagRegex.exec(line)) !== null) {
          tags.push(match[0]);
        }
        timeTagRegex.lastIndex = 0;

        if (tags.length === 0) continue;

        // Get text after all leading tags
        let fullText = line.replace(timeTagRegex, '').replace(/<\d{1,3}:\d{2}(?:[.,]\d{1,3})?>/g, '').trim();
        if (!fullText) continue;

        // Detect trailing inline timestamps → enhanced LRC (A2)
        const afterLeadingTags = line.trim().replace(/^(?:\[\d{1,3}:\d{2}(?:[.,]\d{1,3})?\]\s*)+/, '');
        const hasInlineTimestamps = timeTagRegex.test(afterLeadingTags);
        timeTagRegex.lastIndex = 0;
        const tagsToUse = hasInlineTimestamps ? tags.slice(0, 1) : tags;

        // Try to extract word-level timestamps from Enhanced LRC A2
        let words = null;
        const wordMatches = [];
        const wordSource = line.trim().replace(/^(?:\[\d{1,3}:\d{2}(?:[.,]\d{1,3})?\]\s*)+/, '');

        // Reset regex
        wordTimeTagRegex.lastIndex = 0;
        let wMatch;
        while ((wMatch = wordTimeTagRegex.exec(wordSource)) !== null) {
          const mins = parseInt(wMatch[1], 10);
          const secs = parseInt(wMatch[2], 10);
          let ms = 0;
          if (wMatch[3]) {
            ms = parseInt(wMatch[3], 10);
            if (wMatch[3].length === 1) ms *= 100;
            else if (wMatch[3].length === 2) ms *= 10;
          }
          const startMs = Math.max(0, mins * 60000 + secs * 1000 + ms + lrcOffsetMs);
          const wordText = (wMatch[4] || '').trimEnd();
          if (wordText) {
            wordMatches.push({ text: wordText, startMs });
          }
        }

        if (wordMatches.length >= 2) {
          // Valid word-level data — calculate endMs for each word
          words = wordMatches.map((w, i) => ({
            text: w.text,
            startMs: w.startMs,
            endMs: (i < wordMatches.length - 1) ? wordMatches[i + 1].startMs : w.startMs + 500
          }));
          hasAnyWordLevel = true;
        }

        for (const tag of tagsToUse) {
          const timeMatch = tag.match(/\[(\d{1,3}):(\d{2})(?:[.,](\d{1,3}))?\]/);
          if (timeMatch) {
            const mins = parseInt(timeMatch[1], 10);
            const secs = parseInt(timeMatch[2], 10);
            let ms = 0;
            if (timeMatch[3]) {
              ms = parseInt(timeMatch[3], 10);
              if (timeMatch[3].length === 1) ms *= 100;
              else if (timeMatch[3].length === 2) ms *= 10;
            }
            const timeMs = Math.max(0, mins * 60000 + secs * 1000 + ms + lrcOffsetMs);
            const entry = { timeMs, text: fullText };
            if (words) entry.words = words;
            parsed.push(entry);
          }
        }
      }

      if (parsed.length === 0) return null;

      parsed.sort((a, b) => a.timeMs - b.timeMs);

      // Insert interlude markers
      const withInterludes = LrcParser._insertInterludes(parsed);

      return {
        lines: withInterludes,
        format: hasAnyWordLevel ? 'a2' : 'lrc',
        hasWordLevel: hasAnyWordLevel
      };
    }

    /**
     * Parse TTML (Timed Text Markup Language) — used by Apple Music and others.
     */
    static parseTTML(xml) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        const parserError = doc.querySelector('parsererror');
        if (parserError) return null;

        // Find all <p> elements (lines)
        const pElements = doc.querySelectorAll('p[begin]');
        if (pElements.length === 0) return null;

        const parsed = [];
        let hasAnyWordLevel = false;

        for (const p of pElements) {
          const beginStr = p.getAttribute('begin');
          const endStr = p.getAttribute('end') || p.getAttribute('dur');
          if (!beginStr) continue;

          const lineStartMs = LrcParser._parseTTMLTime(beginStr);
          if (lineStartMs === null) continue;

          // Check for word-level spans
          const spans = p.querySelectorAll('span[begin]');
          let words = null;

          if (spans.length >= 2) {
            words = [];
            for (const span of spans) {
              const sBeg = span.getAttribute('begin');
              const sEnd = span.getAttribute('end');
              const text = (span.textContent || '').trim();
              if (!sBeg || !text) continue;

              const startMs = LrcParser._parseTTMLTime(sBeg);
              const endMs = sEnd ? LrcParser._parseTTMLTime(sEnd) : null;

              if (startMs !== null) {
                words.push({
                  text,
                  startMs,
                  endMs: endMs || (startMs + 500)
                });
              }
            }
            if (words.length >= 2) {
              hasAnyWordLevel = true;
              // Ensure endMs is set for words without explicit end
              for (let i = 0; i < words.length; i++) {
                if (!words[i].endMs && i < words.length - 1) {
                  words[i].endMs = words[i + 1].startMs;
                }
              }
            } else {
              words = null;
            }
          }

          const fullText = (p.textContent || '').trim();
          if (!fullText) continue;

          const entry = { timeMs: lineStartMs, text: fullText };
          if (words) entry.words = words;
          parsed.push(entry);
        }

        if (parsed.length === 0) return null;

        parsed.sort((a, b) => a.timeMs - b.timeMs);
        const withInterludes = LrcParser._insertInterludes(parsed);

        return {
          lines: withInterludes,
          format: 'ttml',
          hasWordLevel: hasAnyWordLevel
        };
      } catch {
        return null;
      }
    }

    /** Parse TTML time string to milliseconds */
    static _parseTTMLTime(str) {
      if (!str) return null;
      // Format: HH:MM:SS.mmm or MM:SS.mmm or SS.mmm
      const parts = str.split(':');
      let secs = 0;

      if (parts.length === 3) {
        secs = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
      } else if (parts.length === 2) {
        secs = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
      } else {
        secs = parseFloat(parts[0]);
      }

      if (!Number.isFinite(secs)) return null;
      return Math.max(0, Math.round(secs * 1000));
    }

    /** Insert "..." interlude markers for instrumental gaps */
    static _insertInterludes(parsed) {
      const withInterludes = [];

      if (parsed.length > 0 && parsed[0].timeMs >= GAP_THRESHOLD_MS) {
        withInterludes.push({ timeMs: 0, text: '...', isInterlude: true });
      }

      for (let i = 0; i < parsed.length; i++) {
        if (i > 0) {
          const gap = parsed[i].timeMs - parsed[i - 1].timeMs;
          if (gap >= GAP_THRESHOLD_MS) {
            const dotsAt = Math.max(
              parsed[i - 1].timeMs + MIN_LINE_DWELL_MS,
              parsed[i].timeMs - DOTS_LEAD_MS
            );
            withInterludes.push({ timeMs: dotsAt, text: '...', isInterlude: true });
          }
        }
        withInterludes.push(parsed[i]);
      }

      return withInterludes;
    }

    /** Check if string contains synced timestamps */
    static hasSyncedTimestamps(str) {
      return typeof str === 'string' && /\[\d{1,3}:\d{2}(?:[.,]\d{1,3})?\]\s*\S/.test(str);
    }
  }

  // ─── SyncRenderer ───
  // Manages the visual synchronization state: which line is active,
  // which word within the line, scrolling, and DOM updates.
  class SyncRenderer {
    constructor(options = {}) {
      this._lines = null;          // parsed lyrics lines array
      this._format = 'lrc';       // 'lrc', 'a2', 'ttml'
      this._hasWordLevel = false;
      this._activeLineIdx = -1;
      this._lineElements = [];
      this._lastScrollTime = 0;
      this._lyricsContent = options.lyricsContent || null;
      this._lyricsContainer = options.lyricsContainer || null;
    }

    /** Set new lyrics data */
    setLyrics(parseResult) {
      if (!parseResult) {
        this._lines = null;
        this._format = 'lrc';
        this._hasWordLevel = false;
      } else {
        this._lines = parseResult.lines || parseResult;
        this._format = parseResult.format || 'lrc';
        this._hasWordLevel = parseResult.hasWordLevel || false;
      }
      this._activeLineIdx = -1;
      this._lineElements = [];
      this._lastScrollTime = 0;
    }

    /** Set lyrics from raw parsed array (backward compat) */
    setRawLines(lines) {
      this._lines = lines;
      this._format = 'lrc';
      this._hasWordLevel = false;
      this._activeLineIdx = -1;
      this._lineElements = [];
      this._lastScrollTime = 0;
    }

    getLines() { return this._lines; }
    getFormat() { return this._format; }
    hasWordLevel() { return this._hasWordLevel; }
    getActiveLineIdx() { return this._activeLineIdx; }

    /**
     * Generate HTML for synced lyrics display.
     * Returns HTML string with word-level spans if available.
     */
    generateHTML(title) {
      if (!this._lines || this._lines.length === 0) return '';

      let html = `<h1 class="lyrics-title">${this._escapeHtml(title)}</h1>`;

      // Add sync quality indicator
      if (this._hasWordLevel) {
        html += '<div class="sync-quality-badge word-level">✦ Word Sync</div>';
      } else if (this._format === 'lrc') {
        // Standard line-level — no warning needed, it's the normal case
      }

      for (let i = 0; i < this._lines.length; i++) {
        const line = this._lines[i];

        if (line.isInterlude) {
          html += `<div class="lyric-line interlude-dots upcoming" data-idx="${i}">...</div>`;
          continue;
        }

        if (line.words && line.words.length >= 2) {
          // Word-level rendering
          let wordHtml = '';
          for (let w = 0; w < line.words.length; w++) {
            const word = line.words[w];
            wordHtml += `<span class="word-span upcoming" data-widx="${w}" data-start="${word.startMs}" data-end="${word.endMs}">${this._escapeHtml(word.text)}</span>`;
            // Add space between words (unless word already ends with space)
            if (w < line.words.length - 1 && !word.text.endsWith(' ')) {
              wordHtml += ' ';
            }
          }
          html += `<div class="lyric-line word-level upcoming" data-idx="${i}">${wordHtml}</div>`;
        } else {
          html += `<div class="lyric-line upcoming" data-idx="${i}">${this._escapeHtml(line.text)}</div>`;
        }
      }

      return html;
    }

    /**
     * Update sync position — called every frame from requestAnimationFrame.
     * @param {number} posMs - Current estimated playback position
     * @param {number} offsetMs - Manual sync offset
     * @param {boolean} force - Force update even if line hasn't changed
     */
    updatePosition(posMs, offsetMs, force) {
      if (!this._lines || this._lines.length === 0) return;

      const lyricPos = Math.max(0, posMs + (offsetMs || 0)) + LYRIC_LEAD_MS;

      let newIdx = this._findActiveLineIndex(lyricPos);

      if (!force && newIdx === this._activeLineIdx) {
        // Line hasn't changed — but still update word highlights if word-level
        if (this._hasWordLevel && this._activeLineIdx >= 0) {
          this._updateWordHighlights(lyricPos);
        }
        return;
      }

      // Gate: advance max 1 line per frame for smooth visual progression
      if (!force && newIdx > this._activeLineIdx + MAX_ADVANCE_PER_FRAME) {
        newIdx = this._activeLineIdx + MAX_ADVANCE_PER_FRAME;
      }

      this._activeLineIdx = newIdx;

      // Update line elements (lazy-init)
      if (this._lineElements.length === 0 && this._lyricsContent) {
        this._lineElements = Array.from(this._lyricsContent.querySelectorAll('.lyric-line'));
      }

      // Apply CSS classes
      for (let i = 0; i < this._lineElements.length; i++) {
        const el = this._lineElements[i];
        el.classList.remove('active', 'past', 'upcoming');
        if (i === this._activeLineIdx) el.classList.add('active');
        else if (i < this._activeLineIdx) el.classList.add('past');
        else el.classList.add('upcoming');
      }

      // Update word highlights on the active line
      if (this._hasWordLevel) {
        this._updateWordHighlights(lyricPos);
      }

      this._scrollActiveLineIntoView();
    }

    /** Binary search for active line with hysteresis */
    _findActiveLineIndex(posMs) {
      const lines = this._lines;
      let low = 0;
      let high = lines.length - 1;
      let idx = -1;

      while (low <= high) {
        const mid = (low + high) >> 1;
        if (posMs >= lines[mid].timeMs) {
          idx = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      // Hysteresis: prevent bounce between i and i-1
      if (idx === this._activeLineIdx - 1 && this._activeLineIdx >= 0 && lines[this._activeLineIdx]) {
        if (posMs > lines[this._activeLineIdx].timeMs - BACK_HYSTERESIS_MS) {
          return this._activeLineIdx;
        }
      }

      return idx;
    }

    /** Update word-level highlighting within the active line */
    _updateWordHighlights(posMs) {
      // Reset all word spans in non-active lines to upcoming
      for (let i = 0; i < this._lineElements.length; i++) {
        if (i === this._activeLineIdx) continue;
        const spans = this._lineElements[i].querySelectorAll('.word-span');
        for (const span of spans) {
          span.classList.remove('sung', 'singing');
          if (i < this._activeLineIdx) {
            span.classList.add('sung');
          } else {
            span.classList.remove('sung', 'singing');
          }
        }
      }

      // Highlight words in active line
      if (this._activeLineIdx < 0 || !this._lineElements[this._activeLineIdx]) return;
      const activeEl = this._lineElements[this._activeLineIdx];
      const wordSpans = activeEl.querySelectorAll('.word-span');

      for (const span of wordSpans) {
        const start = Number(span.dataset.start);
        const end = Number(span.dataset.end);
        span.classList.remove('sung', 'singing', 'upcoming');

        if (posMs >= end) {
          span.classList.add('sung');
        } else if (posMs >= start) {
          span.classList.add('singing');
          // Calculate progress within this word for gradient effect
          const progress = Math.min(1, Math.max(0, (posMs - start) / (end - start)));
          span.style.setProperty('--word-progress', progress.toFixed(3));
        }
        // else: upcoming (no class added, default state)
      }
    }

    /** Scroll active line to center of container */
    _scrollActiveLineIntoView() {
      if (this._activeLineIdx < 0 || !this._lineElements[this._activeLineIdx]) return;
      if (!this._lyricsContainer) return;

      const el = this._lineElements[this._activeLineIdx];
      const targetTop = Math.max(
        0,
        el.offsetTop - (this._lyricsContainer.clientHeight / 2) + (el.offsetHeight / 2)
      );

      if (Math.abs(this._lyricsContainer.scrollTop - targetTop) < 4) return;

      const now = performance.now();
      const behavior = (now - this._lastScrollTime < 400) ? 'auto' : 'smooth';
      this._lastScrollTime = now;

      this._lyricsContainer.scrollTo({ top: targetTop, behavior });
    }

    _escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    /** Reset internal state */
    reset() {
      this._activeLineIdx = -1;
      this._lineElements = [];
      this._lastScrollTime = 0;
    }
  }

  // ─── SyncEngine ───
  // Facade that ties everything together. One instance per renderer window.
  class SyncEngine {
    constructor(options = {}) {
      this.clock = new PredictiveClock();
      this.reconciler = new SmtcReconciler(this.clock);
      this.offset = new OffsetManager();
      this.renderer = new SyncRenderer(options);
      this._rafId = null;
      this._syncCallback = null;
    }

    /** Start the sync loop (call once) */
    startSyncLoop(callback) {
      this._syncCallback = callback;
      const loop = () => {
        if (this.reconciler.isPlaying() && this.renderer.getLines()) {
          const pos = this.clock.getPosition();
          this.renderer.updatePosition(pos, this.offset.getOffset(), false);
          if (this._syncCallback) this._syncCallback(pos);
        }
        this._rafId = requestAnimationFrame(loop);
      };
      this._rafId = requestAnimationFrame(loop);
    }

    /** Process a raw SMTC media-update event */
    processMediaUpdate(data) {
      // Update source tracking for offset persistence
      if (data.source) {
        this.offset.setSource(data.source);
      }

      return this.reconciler.reconcile(data);
    }

    /** Get current interpolated position */
    getPosition() {
      return this.clock.getPosition();
    }

    /** Get position adjusted for lyric offset */
    getLyricPosition() {
      return Math.max(0, this.clock.getPosition() + this.offset.getOffset());
    }

    /** Force update display at current position */
    forceUpdate() {
      const pos = this.clock.getPosition();
      this.renderer.updatePosition(pos, this.offset.getOffset(), true);
    }

    /** Stop sync loop */
    stopSyncLoop() {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
    }

    /** Check if playing */
    isPlaying() {
      return this.reconciler.isPlaying();
    }
  }

  // ─── Export ───
  global.SyncEngine = SyncEngine;
  global.PredictiveClock = PredictiveClock;
  global.SmtcReconciler = SmtcReconciler;
  global.OffsetManager = OffsetManager;
  global.LrcParser = LrcParser;
  global.SyncRenderer = SyncRenderer;

  // Constants export for external use
  global.SYNC_CONSTANTS = {
    LYRIC_LEAD_MS,
    OFFSET_STEP_MS,
    OFFSET_LIMIT_MS,
    SEEK_THRESHOLD_MS,
    STATUS_CHANGE_THRESH,
    GAP_THRESHOLD_MS
  };

})(typeof window !== 'undefined' ? window : globalThis);
