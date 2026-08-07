// ═══════════════════════════════════════════════════════════════
// TEMPLATE DNA — Convierte una canción en un ADN visual 2D
// ═══════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  const ACCENTS = { 'á':'a','é':'e','í':'i','ó':'o','ú':'u','ü':'u','ñ':'n','à':'a','è':'e','ì':'i','ò':'o','ù':'u','â':'a','ê':'e','ô':'o','ç':'c' };

  function norm(text) {
    return String(text || '').toLowerCase().split('').map(c => ACCENTS[c] || c).join('');
  }

  function tokens(text) {
    return norm(text).split(/[^a-z0-9]+/).filter(Boolean);
  }

  // ── Escenarios: cada uno define el stack de capas ──────────────
  const SCENES = {
    cosmos:   { layers: ['stars','nebula','bokeh'],              particles: 'dust',       words: ['espacio','cosmos','galaxia','universo','estrella','estrellas','luna','planeta','infinito','space','galaxy','universe','star','stars','moon','cosmic'] },
    aurora:   { layers: ['stars','aurora','mountains'],          particles: 'snow',       words: ['aurora','norte','polar','boreal','hielo','cristal','northern','polar'] },
    forest:   { layers: ['fog','trees','rays'],                  particles: 'fireflies',  words: ['bosque','arbol','arboles','selva','hoja','hojas','rama','ramas','musgo','forest','woods','tree','trees','leaves','jungle'] },
    garden:   { layers: ['rays','bokeh','fog'],                  particles: 'petals',     words: ['flor','flores','jardin','rosa','rosas','primavera','petalo','petalos','prado','garden','flower','flowers','rose','spring','bloom'] },
    ocean:    { layers: ['orb','waves','bokeh'],                 particles: 'bubbles',    words: ['mar','oceano','playa','ola','olas','orilla','agua','marea','barco','sea','ocean','wave','waves','beach','shore','water','sail'] },
    rain:     { layers: ['fog','city','fog'],                    particles: 'rain',       words: ['lluvia','llover','tormenta','gota','gotas','mojado','paraguas','rain','storm','drops','wet','umbrella'] },
    fire:     { layers: ['rays','fog'],                          particles: 'embers',     words: ['fuego','llama','llamas','arder','quemar','ceniza','cenizas','incendio','brasa','fire','flame','burn','ash','ember','blaze'] },
    city:     { layers: ['city','fog','bokeh'],                  particles: 'dust',       words: ['ciudad','calle','calles','avenida','edificio','esquina','semaforo','barrio','city','street','downtown','building','corner','block'] },
    neon:     { layers: ['grid','city','bokeh'],                 particles: 'dust',       words: ['neon','disco','discoteca','club','bar','luces','baile','bailar','fiesta','neon','nightclub','dance','party','lights'] },
    desert:   { layers: ['orb','dunes'],                         particles: 'dust',       words: ['desierto','arena','duna','dunas','sed','oasis','sol','desert','sand','dune','oasis','sun'] },
    snow:     { layers: ['mountains','fog'],                     particles: 'snow',       words: ['nieve','invierno','frio','helada','escarcha','montana','cumbre','snow','winter','cold','frost','mountain','peak'] },
    room:     { layers: ['fog','bokeh'],                         particles: 'dust',       words: ['casa','hogar','cuarto','habitacion','cama','mesa','ventana','cocina','sofa','puerta','home','house','room','bed','table','window','kitchen','door'] },
    ruins:    { layers: ['fog','mountains','rays'],              particles: 'dust',       words: ['ruina','ruinas','templo','iglesia','cementerio','tumba','olvido','piedra','ruins','temple','church','grave','tomb','stone'] },
    road:     { layers: ['orb','dunes','fog'],                   particles: 'dust',       words: ['camino','carretera','viaje','tren','ruta','adios','partir','volver','regresar','road','journey','train','travel','leave','return'] }
  };

  // ── Paletas por emoción ────────────────────────────────────────
  const PALETTES = {
    love:        { deep:'#2b0b1e', mid:'#7a2447', accent:'#ff8fb1', glow:'#ffd6c2', ink:'#160510' },
    sad:         { deep:'#080f1c', mid:'#1d3a5c', accent:'#6fa8d6', glow:'#bcd9f0', ink:'#04070e' },
    dark:        { deep:'#08060d', mid:'#241a35', accent:'#7d5fb0', glow:'#b8a4e0', ink:'#030207' },
    energy:      { deep:'#1c0703', mid:'#7a2a10', accent:'#ff7a33', glow:'#ffd28a', ink:'#0d0301' },
    anger:       { deep:'#170303', mid:'#6e1616', accent:'#ff4d4d', glow:'#ffb199', ink:'#0a0101' },
    celebration: { deep:'#1e0a24', mid:'#6b2168', accent:'#ff5fd2', glow:'#ffe08a', ink:'#0d0410' },
    nostalgia:   { deep:'#1a1208', mid:'#5c4322', accent:'#d9a35c', glow:'#f5dcae', ink:'#0c0804' },
    spiritual:   { deep:'#0a1220', mid:'#20456b', accent:'#8fd8ff', glow:'#eaf7ff', ink:'#050910' },
    nature:      { deep:'#07130d', mid:'#1e4a32', accent:'#6fcf8e', glow:'#d3f2c9', ink:'#030906' },
    neutral:     { deep:'#0b0f1a', mid:'#26314a', accent:'#8ea6c9', glow:'#dbe6f5', ink:'#05070d' }
  };

  // ── Diccionario emocional compacto ─────────────────────────────
  const MOOD = {
    love: ['amor','amar','quiero','corazon','beso','besar','abrazo','carino','piel','labios','amante','juntos','ternura','love','heart','kiss','darling','baby','together','adore'],
    sad: ['triste','tristeza','llorar','lagrima','lagrimas','dolor','sufrir','soledad','vacio','perdido','adios','herida','roto','extrano','melancolia','sad','cry','tears','lonely','pain','broken','goodbye','miss','sorrow'],
    dark: ['muerte','morir','muerto','oscuridad','oscuro','sombra','sombras','tumba','fantasma','infierno','sangre','miedo','death','die','dark','shadow','ghost','hell','blood','fear','nightmare'],
    energy: ['fuego','poder','fuerza','correr','volar','libre','salvaje','explota','imparable','intenso','fire','power','run','fly','wild','free','electric','explode','alive','rush'],
    anger: ['rabia','odio','furia','destruir','venganza','guerra','pelea','matar','gritar','maldito','hate','rage','fury','destroy','revenge','war','fight','kill','scream'],
    celebration: ['fiesta','bailar','baila','celebrar','feliz','alegria','sonrisa','risa','brindis','victoria','party','dance','celebrate','happy','joy','smile','laugh','victory'],
    nostalgia: ['recuerdo','recuerdos','recordar','ayer','pasado','infancia','memoria','anoro','volver','antes','aquellos','remember','memory','memories','yesterday','past','childhood','once'],
    spiritual: ['alma','espiritu','dios','angel','cielo','paraiso','eterno','sagrado','divino','rezar','fe','milagro','soul','spirit','god','heaven','eternal','sacred','divine','pray','faith'],
    nature: ['bosque','rio','mar','montana','sol','luna','flor','flores','jardin','arbol','tierra','viento','lluvia','nieve','forest','river','sea','mountain','sun','moon','flower','garden','tree','wind','rain','snow']
  };

  function hashSeed(text) {
    let hash = 2166136261;
    const value = String(text || 'aurora');
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash) || 12345;
  }

  class TemplateDNA {
    /**
     * @param {string} lyricsText - letra completa (o líneas unidas)
     * @param {Object} meta - { artist, title }
     * @param {Object} hint - opcional: { world, time, season } que puede venir de un LLM
     */
    static fromSong(lyricsText, meta, hint) {
      meta = meta || {};
      hint = hint || {};
      const words = tokens(lyricsText);
      const seed = hashSeed((meta.artist || '') + '|' + (meta.title || ''));

      const counts = {};
      for (const word of words) counts[word] = (counts[word] || 0) + 1;
      const score = list => list.reduce((total, w) => total + (counts[w] || 0), 0);

      // 1. Emoción dominante
      let mood = 'neutral';
      let moodScore = 0;
      for (const [name, list] of Object.entries(MOOD)) {
        const value = score(list);
        if (value > moodScore) { mood = name; moodScore = value; }
      }

      // 2. Escenario dominante (palabras concretas, no metáforas)
      let scene = null;
      let sceneScore = 0;
      for (const [name, def] of Object.entries(SCENES)) {
        const value = score(def.words);
        if (value > sceneScore) { scene = name; sceneScore = value; }
      }
      if (hint.world && SCENES[hint.world]) scene = hint.world;
      if (!scene) scene = TemplateDNA._sceneForMood(mood);

      // 3. Modificadores de contexto
      const night = score(['noche','luna','estrellas','madrugada','night','moon','stars','midnight']) > 0;
      const winter = score(['nieve','invierno','hielo','frio','snow','winter','ice','cold']) > 0;
      const rainy = score(['lluvia','llover','tormenta','rain','storm']) > 0;

      const def = SCENES[scene];
      const palette = TemplateDNA._tunePalette(PALETTES[mood] || PALETTES.neutral, night, seed);

      const layers = def.layers.slice();
      if (night && !layers.includes('stars') && scene !== 'room' && scene !== 'city') layers.unshift('stars');
      if (rainy && layers.indexOf('fog') === -1) layers.push('fog');

      const density = moodScore > 25 ? 1.15 : moodScore > 10 ? 1 : 0.85;
      const speedByMood = { energy: 1.5, anger: 1.6, celebration: 1.4, love: 0.85, sad: 0.6, dark: 0.65, nostalgia: 0.7, spiritual: 0.75, nature: 0.9, neutral: 1 };

      return {
        seed,
        name: (meta.title || 'Sin titulo') + ' · ' + scene,
        scene,
        mood,
        palette,
        sky: { type: scene === 'room' || scene === 'fire' ? 'radial' : night ? 'vertical' : 'diagonal', focusX: 0.3 + ((seed % 40) / 100) },
        layers,
        particles: { kind: rainy ? 'rain' : winter ? 'snow' : def.particles, density },
        motion: { speed: speedByMood[mood] || 1, pulse: 0.35 },
        atmosphere: {
          fog: scene === 'room' || rainy ? 0.45 : 0.25,
          vignette: mood === 'dark' || mood === 'sad' ? 0.65 : 0.42,
          grain: 0.12,
          bloom: mood === 'celebration' || mood === 'energy' ? 0.55 : 0.35
        }
      };
    }

    static _sceneForMood(mood) {
      const map = {
        love: 'garden', sad: 'rain', dark: 'ruins', energy: 'fire', anger: 'fire',
        celebration: 'neon', nostalgia: 'road', spiritual: 'cosmos', nature: 'forest', neutral: 'cosmos'
      };
      return map[mood] || 'cosmos';
    }

    static _tunePalette(base, night, seed) {
      const palette = Object.assign({}, base);
      if (night) {
        palette.deep = TemplateDNA._darken(palette.deep, 0.35);
        palette.mid = TemplateDNA._darken(palette.mid, 0.25);
      }
      // Variación sutil por canción para que dos temas iguales no sean idénticos
      palette.accent = TemplateDNA._rotate(palette.accent, ((seed % 24) - 12));
      return palette;
    }

    static _darken(hex, amount) {
      const rgb = TemplateDNA.toRgb(hex);
      return TemplateDNA.toHex(rgb.map(c => Math.max(0, Math.round(c * (1 - amount)))));
    }

    static _rotate(hex, degrees) {
      const [r, g, b] = TemplateDNA.toRgb(hex).map(c => c / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const l = (max + min) / 2;
      const d = max - min;
      let h = 0;
      const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      if (d !== 0) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
      }
      h = (h * 60 + degrees + 360) % 360;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = l - c / 2;
      let out = [0, 0, 0];
      if (h < 60) out = [c, x, 0];
      else if (h < 120) out = [x, c, 0];
      else if (h < 180) out = [0, c, x];
      else if (h < 240) out = [0, x, c];
      else if (h < 300) out = [x, 0, c];
      else out = [c, 0, x];
      return TemplateDNA.toHex(out.map(v => Math.round((v + m) * 255)));
    }

    static toRgb(hex) {
      let value = String(hex || '#000').replace('#', '');
      if (value.length === 3) value = value.split('').map(c => c + c).join('');
      const n = parseInt(value, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    static toHex(rgb) {
      return '#' + rgb.map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
    }

    /** Emoción de una sola línea, para que el fondo respire con la letra. */
    static moodOfLine(text) {
      const words = tokens(text);
      let best = null;
      let bestScore = 0;
      for (const [name, list] of Object.entries(MOOD)) {
        let value = 0;
        for (const word of words) if (list.indexOf(word) !== -1) value += 1;
        if (value > bestScore) { best = name; bestScore = value; }
      }
      return best;
    }

    static paletteFor(mood) {
      return PALETTES[mood] || PALETTES.neutral;
    }
  }

  global.AuroraTemplateDNA = TemplateDNA;
})(typeof window !== 'undefined' ? window : globalThis);
