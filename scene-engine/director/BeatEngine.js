// BEAT ENGINE - Lyric-timed fallback plus opt-in Web Audio FFT analysis.
(function (global) {
  'use strict';

  class BeatEngine {
    constructor(eventBus) {
      this._eventBus = eventBus;
      this._bpm = 120;
      this._beatIntervalMs = 500;
      this._lastBeatMs = 0;
      this._lastAudioBeatAt = 0;
      this._beatIntensity = 0;
      this._audioContext = null;
      this._analyser = null;
      this._audioData = null;
      this._audioStream = null;
      this._previousEnergy = 0;
      this._bands = { bass: 0, mid: 0, high: 0, energy: 0 };
      this._audioStatus = { enabled: false, reason: 'Audio capture is off.' };
    }

    analyzeBeatPattern(lines) {
      if (!lines || lines.length < 4) { this.setBPM(120); return; }
      const deltas = [];
      for (let i = 1; i < lines.length; i += 1) {
        const difference = lines[i].timeMs - lines[i - 1].timeMs;
        if (difference > 800 && difference < 4000) deltas.push(difference);
      }
      if (!deltas.length) { this.setBPM(120); return; }
      const average = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
      let bpm = 60000 / (average / 2);
      while (bpm < 80) bpm *= 2;
      while (bpm > 160) bpm /= 2;
      this.setBPM(Math.round(bpm));
    }

    setBPM(bpm) {
      this._bpm = Math.max(60, Math.min(200, bpm));
      this._beatIntervalMs = 60000 / this._bpm;
    }

    getBPM() { return this._bpm; }

    async enableSystemAudioCapture() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('This Chromium runtime does not support system-audio capture.');
      }
      this.disableAudioReactive();
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      if (!stream.getAudioTracks().length) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('No audio was shared. Enable "Share system audio" in the chooser and try again.');
      }
      this.attachAudioStream(stream);
      this._audioStatus = { enabled: true, reason: 'Listening to the shared audio stream.' };
      stream.getAudioTracks()[0].addEventListener('ended', () => this.disableAudioReactive());
      return this.getAudioReactiveStatus();
    }

    attachAudioStream(stream) {
      if (!stream || !stream.getAudioTracks || !stream.getAudioTracks().length) throw new Error('The stream has no audio track.');
      const AudioContextClass = global.AudioContext || global.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio is unavailable in this runtime.');
      this._audioContext = new AudioContextClass();
      const source = this._audioContext.createMediaStreamSource(stream);
      this._analyser = this._audioContext.createAnalyser();
      this._analyser.fftSize = 1024;
      this._analyser.smoothingTimeConstant = 0.72;
      this._audioData = new Uint8Array(this._analyser.frequencyBinCount);
      source.connect(this._analyser);
      this._audioStream = stream;
      if (this._audioContext.state === 'suspended') this._audioContext.resume();
    }

    disableAudioReactive() {
      if (this._audioStream) this._audioStream.getTracks().forEach(track => track.stop());
      if (this._audioContext && this._audioContext.state !== 'closed') this._audioContext.close();
      this._audioContext = null;
      this._analyser = null;
      this._audioData = null;
      this._audioStream = null;
      this._previousEnergy = 0;
      this._bands = { bass: 0, mid: 0, high: 0, energy: 0 };
      this._audioStatus = { enabled: false, reason: 'Audio capture is off.' };
    }

    getAudioReactiveStatus() { return { ...this._audioStatus }; }
    getFrequencyBands() { return { ...this._bands }; }

    _sampleAudio() {
      if (!this._analyser || !this._audioData) return 0;
      this._analyser.getByteFrequencyData(this._audioData);
      const averageRange = (start, end) => {
        let total = 0;
        const last = Math.min(end, this._audioData.length);
        for (let index = start; index < last; index += 1) total += this._audioData[index];
        return last > start ? total / ((last - start) * 255) : 0;
      };
      const bass = averageRange(0, 24);
      const mid = averageRange(24, 120);
      const high = averageRange(120, 300);
      const energy = bass * 0.58 + mid * 0.3 + high * 0.12;
      this._bands.bass += (bass - this._bands.bass) * 0.38;
      this._bands.mid += (mid - this._bands.mid) * 0.28;
      this._bands.high += (high - this._bands.high) * 0.22;
      this._bands.energy += (energy - this._bands.energy) * 0.34;
      return Math.max(0, energy - this._previousEnergy);
    }

    update(positionMs) {
      const transient = this._sampleAudio();
      const hasLiveAudio = !!this._analyser;
      const scheduledBeat = positionMs - this._lastBeatMs >= this._beatIntervalMs;
      const audioBeat = hasLiveAudio && transient > 0.075 && positionMs - this._lastAudioBeatAt > 120;
      if (scheduledBeat || audioBeat) {
        if (scheduledBeat) this._lastBeatMs = positionMs;
        if (audioBeat) this._lastAudioBeatAt = positionMs;
        this._beatIntensity = Math.max(scheduledBeat ? 0.72 : 0, audioBeat ? Math.min(1, 0.55 + transient * 4.5) : 0);
        if (this._eventBus) this._eventBus.emit(global.SceneEventBus.Events.BEAT_DETECTED, {
          positionMs, bpm: this._bpm, intensity: this._beatIntensity, source: audioBeat ? 'fft' : 'lyrics'
        });
      } else {
        this._beatIntensity *= hasLiveAudio ? 0.86 : 0.88;
      }
      this._previousEnergy = this._bands.energy;
    }

    getBeatIntensity() { return Math.max(this._beatIntensity, this._bands.bass * 0.45); }
  }

  global.SceneBeatEngine = BeatEngine;
})(typeof window !== 'undefined' ? window : globalThis);
