// ═══════════════════════════════════════════════════════════════
// TEMPLATE RENDERER — Fondo 2D por capas dirigido por el ADN
// ═══════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  const TAU = Math.PI * 2;

  function toRgb(hex) {
    let value = String(hex || '#000').replace('#', '');
    if (value.length === 3) value = value.split('').map(c => c + c).join('');
    const n = parseInt(value, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgba(hex, alpha) {
    const [r, g, b] = toRgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function mix(a, b, t) {
    const x = toRgb(a), y = toRgb(b);
    return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * t) + ',' +
                    Math.round(x[1] + (y[1] - x[1]) * t) + ',' +
                    Math.round(x[2] + (y[2] - x[2]) * t) + ')';
  }

  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Capas ──────────────────────────────────────────────────────
  const LAYERS = {

    stars: {
      init(rng, W, H) {
        const items = [];
        const count = Math.round((W * H) / 5200);
        for (let i = 0; i < count; i += 1) {
          items.push({ x: rng() * W, y: rng() * H * 0.85, r: 0.4 + rng() * 1.6, ph: rng() * TAU, sp: 0.4 + rng() * 1.4, d: 0.3 + rng() * 0.7 });
        }
        return items;
      },
      draw(ctx, items, e) {
        ctx.save();
        for (const s of items) {
          const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(e.t * s.sp + s.ph));
          ctx.fillStyle = rgba(e.p.glow, tw * 0.85 * s.d);
          ctx.beginPath();
          ctx.arc(s.x, (s.y + e.t * 2 * s.d) % (e.H * 0.9), s.r * (1 + e.audio.high * 0.6), 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    },

    nebula: {
      init(rng, W, H) {
        const items = [];
        for (let i = 0; i < 6; i += 1) {
          items.push({ x: rng() * W, y: rng() * H * 0.8, r: (0.18 + rng() * 0.3) * Math.max(W, H), ph: rng() * TAU, sp: 0.05 + rng() * 0.12, tint: rng() });
        }
        return items;
      },
      draw(ctx, items, e) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const n of items) {
          const x = n.x + Math.cos(e.t * n.sp + n.ph) * 40;
          const y = n.y + Math.sin(e.t * n.sp * 0.7 + n.ph) * 26;
          const r = n.r * (1 + e.audio.bass * 0.12);
          const color = n.tint > 0.5 ? e.p.accent : e.p.mid;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, rgba(color, 0.20 * e.bloom));
          g.addColorStop(0.5, rgba(color, 0.07 * e.bloom));
          g.addColorStop(1, rgba(color, 0));
          ctx.fillStyle = g;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        ctx.restore();
      }
    },

    aurora: {
      init(rng) {
        const items = [];
        for (let i = 0; i < 3; i += 1) {
          items.push({ off: rng() * TAU, amp: 40 + rng() * 90, y: 0.18 + i * 0.11, sp: 0.12 + rng() * 0.18, w: 90 + rng() * 130 });
        }
        return items;
      },
      draw(ctx, items, e) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const a of items) {
          const baseY = e.H * a.y;
          ctx.beginPath();
          ctx.moveTo(0, baseY);
          for (let x = 0; x <= e.W; x += 14) {
            const k = x / e.W;
            const y = baseY + Math.sin(k * 5 + e.t * a.sp + a.off) * a.amp
                            + Math.sin(k * 11 - e.t * a.sp * 1.6) * (a.amp * 0.32);
            ctx.lineTo(x, y);
          }
          ctx.lineTo(e.W, baseY + a.w);
          ctx.lineTo(0, baseY + a.w);
          ctx.closePath();
          const g = ctx.createLinearGradient(0, baseY - a.amp, 0, baseY + a.w);
          g.addColorStop(0, rgba(e.p.accent, 0));
          g.addColorStop(0.35, rgba(e.p.accent, 0.24 * e.bloom * (1 + e.audio.mid * 0.5)));
          g.addColorStop(1, rgba(e.p.glow, 0));
          ctx.fillStyle = g;
          ctx.fill();
        }
        ctx.restore();
      }
    },

    rays: {
      init(rng) {
        const items = [];
        for (let i = 0; i < 5; i += 1) items.push({ x: rng(), w: 0.04 + rng() * 0.1, tilt: -0.35 + rng() * 0.7, sp: 0.15 + rng() * 0.25, ph: rng() * TAU });
        return items;
      },
      draw(ctx, items, e) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const r of items) {
          const alpha = (0.05 + 0.05 * Math.sin(e.t * r.sp + r.ph)) * e.bloom * (1 + e.audio.mid * 0.7);
          const x = r.x * e.W;
          const w = r.w * e.W;
          const g = ctx.createLinearGradient(x, 0, x + r.tilt * e.W, e.H);
          g.addColorStop(0, rgba(e.p.glow, alpha));
          g.addColorStop(1, rgba(e.p.glow, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x - w / 2, 0);
          ctx.lineTo(x + w / 2, 0);
          ctx.lineTo(x + r.tilt * e.W + w * 1.8, e.H);
          ctx.lineTo(x + r.tilt * e.W - w * 1.8, e.H);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    },

    orb: {
      init(rng) {
        return { x: 0.2 + rng() * 0.6, y: 0.22 + rng() * 0.18, r: 0.05 + rng() * 0.05 };
      },
      draw(ctx, o, e) {
        const x = o.x * e.W, y = o.y * e.H, r = o.r * Math.min(e.W, e.H);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
        halo.addColorStop(0, rgba(e.p.glow, 0.32 * e.bloom));
        halo.addColorStop(0.25, rgba(e.p.accent, 0.12 * e.bloom));
        halo.addColorStop(1, rgba(e.p.accent, 0));
        ctx.fillStyle = halo;
        ctx.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
        ctx.fillStyle = rgba(e.p.glow, 0.9);
        ctx.beginPath();
        ctx.arc(x, y, r * (1 + e.audio.bass * 0.08), 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    },

    mountains: {
      init(rng, W, H) {
        const ridges = [];
        for (let layer = 0; layer < 3; layer += 1) {
          const pts = [];
          const steps = 14;
          for (let i = 0; i <= steps; i += 1) pts.push(rng());
          ridges.push({ pts, depth: layer / 2, base: 0.62 + layer * 0.09, height: 0.3 - layer * 0.07 });
        }
        return ridges;
      },
      draw(ctx, ridges, e) {
        for (let i = ridges.length - 1; i >= 0; i -= 1) {
          const r = ridges[i];
          const drift = Math.sin(e.t * 0.05) * (12 * (1 - r.depth));
          ctx.beginPath();
          ctx.moveTo(-20, e.H);
          const steps = r.pts.length - 1;
          for (let s = 0; s <= steps; s += 1) {
            const x = (s / steps) * (e.W + 40) - 20 + drift;
            const y = e.H * r.base - r.pts[s] * e.H * r.height;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(e.W + 20, e.H);
          ctx.closePath();
          ctx.fillStyle = mix(e.p.mid, e.p.ink, 0.35 + r.depth * 0.45);
          ctx.fill();
        }
      }
    },

    dunes: {
      init(rng) {
        const items = [];
        for (let i = 0; i < 4; i += 1) items.push({ base: 0.58 + i * 0.1, amp: 26 - i * 4, ph: rng() * TAU, freq: 1.2 + rng() * 1.8, depth: i / 3 });
        return items;
      },
      draw(ctx, items, e) {
        for (let i = items.length - 1; i >= 0; i -= 1) {
          const d = items[i];
          ctx.beginPath();
          ctx.moveTo(0, e.H);
          for (let x = 0; x <= e.W; x += 12) {
            const k = x / e.W;
            ctx.lineTo(x, e.H * d.base + Math.sin(k * d.freq * Math.PI * 2 + d.ph + e.t * 0.03) * d.amp);
          }
          ctx.lineTo(e.W, e.H);
          ctx.closePath();
          ctx.fillStyle = mix(e.p.mid, e.p.ink, 0.2 + d.depth * 0.5);
          ctx.fill();
        }
      }
    },

    trees: {
      init(rng, W) {
        const layers = [];
        for (let layer = 0; layer < 3; layer += 1) {
          const trees = [];
          const count = 10 + layer * 8;
          for (let i = 0; i < count; i += 1) {
            trees.push({ x: rng(), h: 0.2 + rng() * 0.3, w: 0.02 + rng() * 0.03 });
          }
          layers.push({ trees, depth: layer / 2, base: 0.78 + layer * 0.08 });
        }
        return layers;
      },
      draw(ctx, layers, e) {
        for (let i = layers.length - 1; i >= 0; i -= 1) {
          const l = layers[i];
          ctx.fillStyle = mix(e.p.mid, e.p.ink, 0.4 + l.depth * 0.45);
          const sway = Math.sin(e.t * 0.3) * (4 * (1 - l.depth));
          for (const t of l.trees) {
            const x = t.x * e.W + sway;
            const baseY = e.H * l.base;
            const topY = baseY - t.h * e.H;
            const w = t.w * e.W;
            ctx.beginPath();
            ctx.moveTo(x, topY);
            ctx.lineTo(x + w, baseY);
            ctx.lineTo(x - w, baseY);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(x - w * 0.12, baseY - 2, w * 0.24, e.H - baseY + 4);
          }
        }
      }
    },

    city: {
      init(rng, W) {
        const layers = [];
        for (let layer = 0; layer < 2; layer += 1) {
          const blocks = [];
          let x = -0.05;
          while (x < 1.05) {
            const w = 0.03 + rng() * 0.06;
            const h = (0.12 + rng() * 0.32) * (1 - layer * 0.3);
            const windows = [];
            const rows = Math.floor(h * 26);
            const cols = Math.max(2, Math.floor(w * 60));
            for (let r = 0; r < rows; r += 1) {
              for (let c = 0; c < cols; c += 1) {
                if (rng() > 0.62) windows.push({ r, c, ph: rng() * TAU });
              }
            }
            blocks.push({ x, w, h, windows, rows, cols });
            x += w + 0.004;
          }
          layers.push({ blocks, depth: layer, base: 0.88 + layer * 0.04 });
        }
        return layers;
      },
      draw(ctx, layers, e) {
        for (let i = layers.length - 1; i >= 0; i -= 1) {
          const l = layers[i];
          const baseY = e.H * l.base;
          for (const b of l.blocks) {
            const x = b.x * e.W, w = b.w * e.W, h = b.h * e.H;
            ctx.fillStyle = mix(e.p.deep, e.p.ink, 0.3 + l.depth * 0.4);
            ctx.fillRect(x, baseY - h, w, h + 20);
            if (l.depth === 0) {
              for (const win of b.windows) {
                const lit = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(e.t * 0.6 + win.ph));
                ctx.fillStyle = rgba(e.p.accent, lit * 0.75 * (1 + e.audio.high * 0.5));
                ctx.fillRect(x + 3 + win.c * (w / b.cols), baseY - h + 4 + win.r * (h / b.rows), Math.max(1.5, w / b.cols - 3), Math.max(2, h / b.rows - 4));
              }
            }
          }
        }
      }
    },

    waves: {
      init(rng) {
        const items = [];
        for (let i = 0; i < 7; i += 1) items.push({ y: 0.55 + i * 0.06, amp: 6 + i * 3, ph: rng() * TAU, sp: 0.4 + i * 0.12 });
        return items;
      },
      draw(ctx, items, e) {
        for (const w of items) {
          ctx.beginPath();
          for (let x = 0; x <= e.W; x += 10) {
            const y = e.H * w.y + Math.sin((x / e.W) * 6 + e.t * w.sp + w.ph) * w.amp * (1 + e.audio.bass * 0.5);
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = rgba(e.p.accent, 0.18 + (w.y - 0.55) * 0.6);
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
        const g = ctx.createLinearGradient(0, e.H * 0.55, 0, e.H);
        g.addColorStop(0, rgba(e.p.deep, 0));
        g.addColorStop(1, rgba(e.p.ink, 0.75));
        ctx.fillStyle = g;
        ctx.fillRect(0, e.H * 0.55, e.W, e.H * 0.45);
      }
    },

    grid: {
      init() { return { horizon: 0.62 }; },
      draw(ctx, s, e) {
        const hy = e.H * s.horizon;
        ctx.save();
        ctx.strokeStyle = rgba(e.p.accent, 0.35);
        ctx.lineWidth = 1;
        for (let i = -12; i <= 12; i += 1) {
          ctx.beginPath();
          ctx.moveTo(e.W / 2 + i * (e.W / 12), e.H);
          ctx.lineTo(e.W / 2 + i * 14, hy);
          ctx.stroke();
        }
        const scroll = (e.t * 0.35) % 1;
        for (let i = 0; i < 16; i += 1) {
          const k = (i + scroll) / 16;
          const y = hy + (e.H - hy) * (k * k);
          ctx.globalAlpha = 1 - k * 0.7;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(e.W, y);
          ctx.stroke();
        }
        ctx.restore();
      }
    },

    fog: {
      init(rng) {
        const items = [];
        for (let i = 0; i < 4; i += 1) items.push({ y: 0.4 + rng() * 0.5, h: 0.1 + rng() * 0.18, sp: 6 + rng() * 16, off: rng() * 1000 });
        return items;
      },
      draw(ctx, items, e) {
        ctx.save();
        for (const f of items) {
          const y = e.H * f.y;
          const h = e.H * f.h;
          const shift = ((e.t * f.sp + f.off) % (e.W + 400)) - 200;
          const g = ctx.createLinearGradient(shift, y, shift + e.W * 0.8, y);
          g.addColorStop(0, rgba(e.p.glow, 0));
          g.addColorStop(0.5, rgba(e.p.glow, 0.06 * e.fogAmount * 4));
          g.addColorStop(1, rgba(e.p.glow, 0));
          ctx.fillStyle = g;
          ctx.fillRect(0, y, e.W, h);
        }
        ctx.restore();
      }
    },

    bokeh: {
      init(rng, W, H) {
        const items = [];
        for (let i = 0; i < 16; i += 1) {
          items.push({ x: rng() * W, y: rng() * H, r: 14 + rng() * 60, sp: 3 + rng() * 10, ph: rng() * TAU, a: 0.04 + rng() * 0.08 });
        }
        return items;
      },
      draw(ctx, items, e) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const b of items) {
          const y = ((b.y - e.t * b.sp) % (e.H + 120) + e.H + 120) % (e.H + 120) - 60;
          const x = b.x + Math.sin(e.t * 0.2 + b.ph) * 22;
          const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
          g.addColorStop(0, rgba(e.p.glow, b.a * e.bloom * 2));
          g.addColorStop(0.7, rgba(e.p.accent, b.a * 0.4));
          g.addColorStop(1, rgba(e.p.accent, 0));
          ctx.fillStyle = g;
          ctx.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2);
        }
        ctx.restore();
      }
    }
  };

  // ── Partículas ─────────────────────────────────────────────────
  const PARTICLES = {
    rain:       { count: 260, size: [0.8, 1.6], vy: [420, 760], vx: [-40, -10], shape: 'line',   alpha: 0.5 },
    snow:       { count: 150, size: [1.4, 3.4], vy: [22, 60],   vx: [-14, 14],  shape: 'dot',    alpha: 0.8 },
    petals:     { count: 70,  size: [3, 7],     vy: [26, 62],   vx: [-26, 26],  shape: 'petal',  alpha: 0.8 },
    embers:     { count: 110, size: [1.2, 3],   vy: [-90, -30], vx: [-18, 18],  shape: 'glow',   alpha: 0.85 },
    dust:       { count: 90,  size: [0.8, 2.2], vy: [-16, 10],  vx: [-10, 10],  shape: 'dot',    alpha: 0.4 },
    bubbles:    { count: 60,  size: [2, 7],     vy: [-46, -16], vx: [-8, 8],    shape: 'ring',   alpha: 0.35 },
    fireflies:  { count: 45,  size: [1.4, 3],   vy: [-14, 8],   vx: [-14, 14],  shape: 'glow',   alpha: 0.9 }
  };

  class TemplateRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.dna = null;
      this.audio = { bass: 0, mid: 0, high: 0 };
      this._state = [];
      this._particles = [];
      this._t = 0;
      this._last = 0;
      this._raf = null;
      this._grain = null;
      this._palette = null;
      this._targetPalette = null;
      this._fps = 1000 / 30;
      this._acc = 0;
    }

    setDNA(dna) {
      this.dna = dna;
      this._palette = Object.assign({}, dna.palette);
      this._targetPalette = Object.assign({}, dna.palette);
      this._build();
    }

    /** Empuja la paleta hacia la emoción del verso actual. */
    setMood(mood) {
      if (!this.dna || !mood || !global.AuroraTemplateDNA) return;
      const next = global.AuroraTemplateDNA.paletteFor(mood);
      this._targetPalette = {
        deep: next.deep, mid: next.mid,
        accent: next.accent, glow: next.glow, ink: next.ink
      };
    }

    setAudio(bands) {
      if (!bands) return;
      this.audio.bass = bands.bass || 0;
      this.audio.mid = bands.mid || 0;
      this.audio.high = bands.high || 0;
    }

    _build() {
      const W = this.canvas.width, H = this.canvas.height;
      const rng = makeRng(this.dna.seed);
      this._state = (this.dna.layers || []).map(function (type) {
        const layer = LAYERS[type];
        return layer ? { type: type, data: layer.init(rng, W, H) } : null;
      }).filter(Boolean);

      const kind = (this.dna.particles && this.dna.particles.kind) || 'dust';
      const def = PARTICLES[kind] || PARTICLES.dust;
      const density = (this.dna.particles && this.dna.particles.density) || 1;
      const total = Math.round(def.count * density * Math.min(1.4, (W * H) / (1920 * 1080)));
      this._particles = [];
      for (let i = 0; i < total; i += 1) {
        this._particles.push({
          x: rng() * W, y: rng() * H,
          s: def.size[0] + rng() * (def.size[1] - def.size[0]),
          vy: def.vy[0] + rng() * (def.vy[1] - def.vy[0]),
          vx: def.vx[0] + rng() * (def.vx[1] - def.vx[0]),
          ph: rng() * TAU
        });
      }
      this._pdef = def;
      this._buildGrain();
    }

    _buildGrain() {
      const size = 128;
      const tile = document.createElement('canvas');
      tile.width = tile.height = size;
      const tctx = tile.getContext('2d');
      const img = tctx.createImageData(size, size);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 120 + Math.random() * 135;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      tctx.putImageData(img, 0, 0);
      this._grain = tile;
    }

    start() {
      if (!this.dna) return;
      this.stop();
      this._build();
      this._last = performance.now();
      const self = this;
      const loop = function (now) {
        self._raf = requestAnimationFrame(loop);
        const dt = Math.min(0.1, (now - self._last) / 1000);
        self._last = now;
        self._frame(dt);
      };
      this._raf = requestAnimationFrame(loop);
    }

    stop() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    resize() {
      if (this.dna) this._build();
    }

    _lerpPalette(dt) {
      if (!this._targetPalette) return;
      const k = Math.min(1, dt * 0.6);
      const keys = ['deep', 'mid', 'accent', 'glow', 'ink'];
      for (const key of keys) {
        this._palette[key] = mixHex(this._palette[key], this._targetPalette[key], k);
      }
    }

    _frame(dt) {
      const ctx = this.ctx;
      const W = this.canvas.width, H = this.canvas.height;
      const dna = this.dna;
      const speed = (dna.motion && dna.motion.speed) || 1;
      this._t += dt * speed;
      this._lerpPalette(dt);

      const env = {
        W: W, H: H, t: this._t, dt: dt,
        p: this._palette,
        audio: this.audio,
        bloom: (dna.atmosphere && dna.atmosphere.bloom) || 0.35,
        fogAmount: (dna.atmosphere && dna.atmosphere.fog) || 0.25
      };

      this._drawSky(ctx, env);
      for (const layer of this._state) LAYERS[layer.type].draw(ctx, layer.data, env);
      this._drawParticles(ctx, env);
      this._drawPost(ctx, env);
    }

    _drawSky(ctx, e) {
      const sky = this.dna.sky || {};
      let g;
      if (sky.type === 'radial') {
        const cx = (sky.focusX || 0.5) * e.W;
        const cy = e.H * 0.38;
        g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(e.W, e.H) * 0.85);
        g.addColorStop(0, e.p.mid);
        g.addColorStop(0.55, e.p.deep);
        g.addColorStop(1, e.p.ink);
      } else if (sky.type === 'diagonal') {
        g = ctx.createLinearGradient(0, 0, e.W, e.H);
        g.addColorStop(0, e.p.deep);
        g.addColorStop(0.55, e.p.mid);
        g.addColorStop(1, e.p.ink);
      } else {
        g = ctx.createLinearGradient(0, 0, 0, e.H);
        g.addColorStop(0, e.p.deep);
        g.addColorStop(0.6, e.p.mid);
        g.addColorStop(1, e.p.ink);
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, e.W, e.H);
    }

    _drawParticles(ctx, e) {
      const def = this._pdef;
      if (!def) return;
      const boost = 1 + e.audio.mid * 0.8;
      ctx.save();
      if (def.shape === 'glow') ctx.globalCompositeOperation = 'lighter';
      for (const p of this._particles) {
        p.y += p.vy * e.dt * boost;
        p.x += (p.vx + Math.sin(e.t * 0.6 + p.ph) * 12) * e.dt;
        if (p.y > e.H + 20) { p.y = -20; p.x = Math.random() * e.W; }
        if (p.y < -20) { p.y = e.H + 20; p.x = Math.random() * e.W; }
        if (p.x > e.W + 20) p.x = -20;
        if (p.x < -20) p.x = e.W + 20;

        const flick = def.shape === 'glow' ? 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(e.t * 3 + p.ph)) : 1;
        const alpha = def.alpha * flick;

        if (def.shape === 'line') {
          ctx.strokeStyle = rgba(e.p.glow, alpha * 0.5);
          ctx.lineWidth = p.s;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.02, p.y + p.s * 12);
          ctx.stroke();
        } else if (def.shape === 'ring') {
          ctx.strokeStyle = rgba(e.p.glow, alpha);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, TAU);
          ctx.stroke();
        } else if (def.shape === 'petal') {
          ctx.fillStyle = rgba(e.p.accent, alpha);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(e.t * 0.8 + p.ph);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.s, p.s * 0.5, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        } else if (def.shape === 'glow') {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 5);
          g.addColorStop(0, rgba(e.p.glow, alpha));
          g.addColorStop(1, rgba(e.p.accent, 0));
          ctx.fillStyle = g;
          ctx.fillRect(p.x - p.s * 5, p.y - p.s * 5, p.s * 10, p.s * 10);
        } else {
          ctx.fillStyle = rgba(e.p.glow, alpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    _drawPost(ctx, e) {
      const atm = this.dna.atmosphere || {};
      if (atm.vignette) {
        const g = ctx.createRadialGradient(e.W / 2, e.H / 2, Math.min(e.W, e.H) * 0.25, e.W / 2, e.H / 2, Math.max(e.W, e.H) * 0.75);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,' + atm.vignette + ')');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, e.W, e.H);
      }
      if (atm.grain && this._grain) {
        ctx.save();
        ctx.globalAlpha = atm.grain * 0.35;
        ctx.globalCompositeOperation = 'overlay';
        const pattern = ctx.createPattern(this._grain, 'repeat');
        ctx.fillStyle = pattern;
        ctx.translate((e.t * 40) % 128, (e.t * 27) % 128);
        ctx.fillRect(-128, -128, e.W + 256, e.H + 256);
        ctx.restore();
      }
    }
  }

  function mixHex(a, b, t) {
    const x = toRgb(a), y = toRgb(b);
    const out = [0, 1, 2].map(i => Math.round(x[i] + (y[i] - x[i]) * t));
    return '#' + out.map(c => c.toString(16).padStart(2, '0')).join('');
  }

  global.AuroraTemplateRenderer = TemplateRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
