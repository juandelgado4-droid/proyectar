// ═══════════════════════════════════════════════════════════════════════
// DICTIONARY ANALYZER — Análisis de emociones por diccionario local
// ~300 palabras en español e inglés → categorías emocionales
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  // ─── Emotion Dictionary ───
  // Each entry: word → { emotion, weight }
  // Weight 1.0 = strong signal, 0.5 = moderate, 0.3 = weak
  const DICTIONARY = {
    // ── LOVE (amor) ──
    'amor': { e: 'love', w: 1.0 }, 'amar': { e: 'love', w: 1.0 },
    'te amo': { e: 'love', w: 1.0 }, 'te quiero': { e: 'love', w: 0.9 },
    'corazón': { e: 'love', w: 0.9 }, 'corazon': { e: 'love', w: 0.9 },
    'beso': { e: 'love', w: 0.9 }, 'besar': { e: 'love', w: 0.9 },
    'abrazo': { e: 'love', w: 0.8 }, 'abrazar': { e: 'love', w: 0.8 },
    'cariño': { e: 'love', w: 0.7 }, 'carino': { e: 'love', w: 0.7 },
    'ternura': { e: 'love', w: 0.7 }, 'pasión': { e: 'love', w: 0.8 },
    'pasion': { e: 'love', w: 0.8 }, 'romántico': { e: 'love', w: 0.7 },
    'romantico': { e: 'love', w: 0.7 }, 'amante': { e: 'love', w: 0.7 },
    'querido': { e: 'love', w: 0.6 }, 'querida': { e: 'love', w: 0.6 },
    'juntos': { e: 'love', w: 0.5 }, 'juntas': { e: 'love', w: 0.5 },
    'siempre': { e: 'love', w: 0.4 }, 'para siempre': { e: 'love', w: 0.8 },
    'eterno': { e: 'love', w: 0.6 }, 'eterna': { e: 'love', w: 0.6 },
    'mi vida': { e: 'love', w: 0.7 }, 'mi cielo': { e: 'love', w: 0.6 },
    'suspiro': { e: 'love', w: 0.5 }, 'caricia': { e: 'love', w: 0.7 },
    'piel': { e: 'love', w: 0.5 }, 'labios': { e: 'love', w: 0.6 },
    'mirada': { e: 'love', w: 0.4 }, 'ojos': { e: 'love', w: 0.3 },
    'love': { e: 'love', w: 1.0 }, 'heart': { e: 'love', w: 0.9 },
    'kiss': { e: 'love', w: 0.9 }, 'hug': { e: 'love', w: 0.8 },
    'darling': { e: 'love', w: 0.7 }, 'baby': { e: 'love', w: 0.5 },
    'forever': { e: 'love', w: 0.7 }, 'together': { e: 'love', w: 0.5 },
    'romance': { e: 'love', w: 0.7 }, 'sweetheart': { e: 'love', w: 0.8 },
    'desire': { e: 'love', w: 0.7 }, 'passion': { e: 'love', w: 0.8 },
    'embrace': { e: 'love', w: 0.8 }, 'adore': { e: 'love', w: 0.9 },
    'beloved': { e: 'love', w: 0.8 }, 'tender': { e: 'love', w: 0.6 },

    // ── SAD (tristeza) ──
    'triste': { e: 'sad', w: 1.0 }, 'tristeza': { e: 'sad', w: 1.0 },
    'llorar': { e: 'sad', w: 0.9 }, 'lloro': { e: 'sad', w: 0.9 },
    'lágrima': { e: 'sad', w: 0.9 }, 'lagrima': { e: 'sad', w: 0.9 },
    'lágrimas': { e: 'sad', w: 0.9 }, 'lagrimas': { e: 'sad', w: 0.9 },
    'dolor': { e: 'sad', w: 0.8 }, 'sufrir': { e: 'sad', w: 0.8 },
    'sufrimiento': { e: 'sad', w: 0.9 }, 'soledad': { e: 'sad', w: 0.8 },
    'solo': { e: 'sad', w: 0.5 }, 'sola': { e: 'sad', w: 0.5 },
    'vacío': { e: 'sad', w: 0.7 }, 'vacio': { e: 'sad', w: 0.7 },
    'perder': { e: 'sad', w: 0.6 }, 'perdido': { e: 'sad', w: 0.6 },
    'perdida': { e: 'sad', w: 0.6 }, 'adiós': { e: 'sad', w: 0.7 },
    'adios': { e: 'sad', w: 0.7 }, 'despedida': { e: 'sad', w: 0.7 },
    'olvidar': { e: 'sad', w: 0.6 }, 'olvido': { e: 'sad', w: 0.6 },
    'herida': { e: 'sad', w: 0.7 }, 'roto': { e: 'sad', w: 0.7 },
    'rota': { e: 'sad', w: 0.7 }, 'extraño': { e: 'sad', w: 0.5 },
    'extrano': { e: 'sad', w: 0.5 }, 'melancolía': { e: 'sad', w: 0.8 },
    'melancolia': { e: 'sad', w: 0.8 }, 'lamento': { e: 'sad', w: 0.7 },
    'sad': { e: 'sad', w: 1.0 }, 'cry': { e: 'sad', w: 0.9 },
    'tears': { e: 'sad', w: 0.9 }, 'alone': { e: 'sad', w: 0.7 },
    'lonely': { e: 'sad', w: 0.8 }, 'pain': { e: 'sad', w: 0.8 },
    'broken': { e: 'sad', w: 0.8 }, 'hurt': { e: 'sad', w: 0.7 },
    'goodbye': { e: 'sad', w: 0.7 }, 'miss': { e: 'sad', w: 0.5 },
    'sorrow': { e: 'sad', w: 0.9 }, 'grief': { e: 'sad', w: 0.9 },
    'weep': { e: 'sad', w: 0.8 }, 'heartbreak': { e: 'sad', w: 0.9 },
    'empty': { e: 'sad', w: 0.6 }, 'lost': { e: 'sad', w: 0.5 },

    // ── ENERGY (energía alta) ──
    'fuego': { e: 'energy', w: 0.8 }, 'llama': { e: 'energy', w: 0.7 },
    'poder': { e: 'energy', w: 0.7 }, 'fuerza': { e: 'energy', w: 0.7 },
    'vamos': { e: 'energy', w: 0.5 }, 'dale': { e: 'energy', w: 0.5 },
    'arriba': { e: 'energy', w: 0.5 }, 'grita': { e: 'energy', w: 0.6 },
    'gritar': { e: 'energy', w: 0.6 }, 'correr': { e: 'energy', w: 0.5 },
    'volar': { e: 'energy', w: 0.6 }, 'libre': { e: 'energy', w: 0.5 },
    'libertad': { e: 'energy', w: 0.5 }, 'electricidad': { e: 'energy', w: 0.8 },
    'explota': { e: 'energy', w: 0.8 }, 'explotar': { e: 'energy', w: 0.8 },
    'imparable': { e: 'energy', w: 0.7 }, 'salvaje': { e: 'energy', w: 0.7 },
    'intenso': { e: 'energy', w: 0.6 }, 'intensa': { e: 'energy', w: 0.6 },
    'fire': { e: 'energy', w: 0.8 }, 'burn': { e: 'energy', w: 0.7 },
    'power': { e: 'energy', w: 0.7 }, 'energy': { e: 'energy', w: 0.8 },
    'run': { e: 'energy', w: 0.5 }, 'fly': { e: 'energy', w: 0.6 },
    'wild': { e: 'energy', w: 0.7 }, 'free': { e: 'energy', w: 0.5 },
    'thunder': { e: 'energy', w: 0.7 }, 'electric': { e: 'energy', w: 0.8 },
    'explode': { e: 'energy', w: 0.8 }, 'unstoppable': { e: 'energy', w: 0.7 },
    'intense': { e: 'energy', w: 0.6 }, 'alive': { e: 'energy', w: 0.6 },
    'rush': { e: 'energy', w: 0.6 }, 'blaze': { e: 'energy', w: 0.7 },

    // ── CELEBRATION (celebración) ──
    'fiesta': { e: 'celebration', w: 0.9 }, 'bailar': { e: 'celebration', w: 0.8 },
    'baila': { e: 'celebration', w: 0.8 }, 'celebrar': { e: 'celebration', w: 0.9 },
    'celebración': { e: 'celebration', w: 0.9 }, 'celebracion': { e: 'celebration', w: 0.9 },
    'feliz': { e: 'celebration', w: 0.7 }, 'felicidad': { e: 'celebration', w: 0.8 },
    'alegría': { e: 'celebration', w: 0.8 }, 'alegria': { e: 'celebration', w: 0.8 },
    'sonrisa': { e: 'celebration', w: 0.6 }, 'risa': { e: 'celebration', w: 0.6 },
    'reír': { e: 'celebration', w: 0.6 }, 'reir': { e: 'celebration', w: 0.6 },
    'brindis': { e: 'celebration', w: 0.8 }, 'victoria': { e: 'celebration', w: 0.7 },
    'triunfo': { e: 'celebration', w: 0.7 }, 'gloria': { e: 'celebration', w: 0.6 },
    'party': { e: 'celebration', w: 0.9 }, 'dance': { e: 'celebration', w: 0.8 },
    'celebrate': { e: 'celebration', w: 0.9 }, 'happy': { e: 'celebration', w: 0.7 },
    'joy': { e: 'celebration', w: 0.8 }, 'smile': { e: 'celebration', w: 0.6 },
    'laugh': { e: 'celebration', w: 0.6 }, 'cheer': { e: 'celebration', w: 0.7 },
    'victory': { e: 'celebration', w: 0.7 }, 'glory': { e: 'celebration', w: 0.6 },
    'fun': { e: 'celebration', w: 0.5 }, 'tonight': { e: 'celebration', w: 0.3 },

    // ── DARK (oscuridad) ──
    'muerte': { e: 'dark', w: 1.0 }, 'morir': { e: 'dark', w: 1.0 },
    'muerto': { e: 'dark', w: 0.9 }, 'muerta': { e: 'dark', w: 0.9 },
    'oscuridad': { e: 'dark', w: 0.8 }, 'oscuro': { e: 'dark', w: 0.7 },
    'oscura': { e: 'dark', w: 0.7 }, 'sombra': { e: 'dark', w: 0.7 },
    'sombras': { e: 'dark', w: 0.7 }, 'noche': { e: 'dark', w: 0.4 },
    'tumba': { e: 'dark', w: 0.9 }, 'fantasma': { e: 'dark', w: 0.8 },
    'demonio': { e: 'dark', w: 0.9 }, 'infierno': { e: 'dark', w: 0.9 },
    'sangre': { e: 'dark', w: 0.8 }, 'ceniza': { e: 'dark', w: 0.7 },
    'cenizas': { e: 'dark', w: 0.7 }, 'hueso': { e: 'dark', w: 0.6 },
    'huesos': { e: 'dark', w: 0.6 }, 'esqueleto': { e: 'dark', w: 0.8 },
    'calavera': { e: 'dark', w: 0.8 }, 'cementerio': { e: 'dark', w: 0.9 },
    'ataúd': { e: 'dark', w: 0.9 }, 'ataud': { e: 'dark', w: 0.9 },
    'death': { e: 'dark', w: 1.0 }, 'die': { e: 'dark', w: 0.9 },
    'dead': { e: 'dark', w: 0.9 }, 'dark': { e: 'dark', w: 0.7 },
    'darkness': { e: 'dark', w: 0.8 }, 'shadow': { e: 'dark', w: 0.7 },
    'shadows': { e: 'dark', w: 0.7 }, 'ghost': { e: 'dark', w: 0.8 },
    'demon': { e: 'dark', w: 0.9 }, 'hell': { e: 'dark', w: 0.9 },
    'blood': { e: 'dark', w: 0.8 }, 'skull': { e: 'dark', w: 0.8 },
    'grave': { e: 'dark', w: 0.9 }, 'tomb': { e: 'dark', w: 0.9 },
    'night': { e: 'dark', w: 0.3 }, 'nightmare': { e: 'dark', w: 0.8 },

    // ── NATURE (naturaleza) ──
    'bosque': { e: 'nature', w: 0.8 }, 'río': { e: 'nature', w: 0.7 },
    'rio': { e: 'nature', w: 0.7 }, 'mar': { e: 'nature', w: 0.7 },
    'montaña': { e: 'nature', w: 0.7 }, 'montana': { e: 'nature', w: 0.7 },
    'sol': { e: 'nature', w: 0.5 }, 'luna': { e: 'nature', w: 0.5 },
    'estrella': { e: 'nature', w: 0.5 }, 'estrellas': { e: 'nature', w: 0.5 },
    'flor': { e: 'nature', w: 0.7 }, 'flores': { e: 'nature', w: 0.7 },
    'jardín': { e: 'nature', w: 0.7 }, 'jardin': { e: 'nature', w: 0.7 },
    'árbol': { e: 'nature', w: 0.6 }, 'arbol': { e: 'nature', w: 0.6 },
    'cielo': { e: 'nature', w: 0.4 }, 'tierra': { e: 'nature', w: 0.5 },
    'amanecer': { e: 'nature', w: 0.6 }, 'atardecer': { e: 'nature', w: 0.6 },
    'océano': { e: 'nature', w: 0.7 }, 'oceano': { e: 'nature', w: 0.7 },
    'ola': { e: 'nature', w: 0.5 }, 'olas': { e: 'nature', w: 0.5 },
    'viento': { e: 'nature', w: 0.5 }, 'lluvia': { e: 'nature', w: 0.5 },
    'nieve': { e: 'nature', w: 0.6 }, 'aurora': { e: 'nature', w: 0.7 },
    'forest': { e: 'nature', w: 0.8 }, 'river': { e: 'nature', w: 0.7 },
    'sea': { e: 'nature', w: 0.6 }, 'ocean': { e: 'nature', w: 0.7 },
    'mountain': { e: 'nature', w: 0.7 }, 'sun': { e: 'nature', w: 0.4 },
    'moon': { e: 'nature', w: 0.5 }, 'star': { e: 'nature', w: 0.5 },
    'stars': { e: 'nature', w: 0.5 }, 'flower': { e: 'nature', w: 0.7 },
    'flowers': { e: 'nature', w: 0.7 }, 'garden': { e: 'nature', w: 0.7 },
    'tree': { e: 'nature', w: 0.6 }, 'sky': { e: 'nature', w: 0.4 },
    'rain': { e: 'nature', w: 0.5 }, 'snow': { e: 'nature', w: 0.6 },
    'wind': { e: 'nature', w: 0.5 }, 'sunrise': { e: 'nature', w: 0.6 },
    'sunset': { e: 'nature', w: 0.6 },

    // ── NOSTALGIA ──
    'recuerdo': { e: 'nostalgia', w: 0.8 }, 'recuerdos': { e: 'nostalgia', w: 0.8 },
    'recordar': { e: 'nostalgia', w: 0.7 }, 'ayer': { e: 'nostalgia', w: 0.6 },
    'pasado': { e: 'nostalgia', w: 0.7 }, 'antes': { e: 'nostalgia', w: 0.4 },
    'infancia': { e: 'nostalgia', w: 0.8 }, 'niñez': { e: 'nostalgia', w: 0.8 },
    'ninez': { e: 'nostalgia', w: 0.8 }, 'tiempo': { e: 'nostalgia', w: 0.3 },
    'aquellos': { e: 'nostalgia', w: 0.5 }, 'volver': { e: 'nostalgia', w: 0.5 },
    'regreso': { e: 'nostalgia', w: 0.5 }, 'memoria': { e: 'nostalgia', w: 0.7 },
    'memorias': { e: 'nostalgia', w: 0.7 }, 'añoro': { e: 'nostalgia', w: 0.8 },
    'anoro': { e: 'nostalgia', w: 0.8 }, 'añoranza': { e: 'nostalgia', w: 0.9 },
    'remember': { e: 'nostalgia', w: 0.7 }, 'memory': { e: 'nostalgia', w: 0.7 },
    'memories': { e: 'nostalgia', w: 0.7 }, 'yesterday': { e: 'nostalgia', w: 0.7 },
    'past': { e: 'nostalgia', w: 0.6 }, 'childhood': { e: 'nostalgia', w: 0.8 },
    'once': { e: 'nostalgia', w: 0.3 }, 'used to': { e: 'nostalgia', w: 0.5 },
    'long ago': { e: 'nostalgia', w: 0.7 }, 'reminisce': { e: 'nostalgia', w: 0.8 },

    // ── ANGER (rabia) ──
    'rabia': { e: 'anger', w: 0.9 }, 'odio': { e: 'anger', w: 0.9 },
    'odiar': { e: 'anger', w: 0.9 }, 'furia': { e: 'anger', w: 0.9 },
    'furioso': { e: 'anger', w: 0.8 }, 'furiosa': { e: 'anger', w: 0.8 },
    'destruir': { e: 'anger', w: 0.8 }, 'romper': { e: 'anger', w: 0.6 },
    'maldito': { e: 'anger', w: 0.7 }, 'maldita': { e: 'anger', w: 0.7 },
    'venganza': { e: 'anger', w: 0.9 }, 'guerra': { e: 'anger', w: 0.8 },
    'pelea': { e: 'anger', w: 0.7 }, 'pelear': { e: 'anger', w: 0.7 },
    'golpe': { e: 'anger', w: 0.7 }, 'matar': { e: 'anger', w: 0.9 },
    'hate': { e: 'anger', w: 0.9 }, 'rage': { e: 'anger', w: 0.9 },
    'fury': { e: 'anger', w: 0.9 }, 'angry': { e: 'anger', w: 0.8 },
    'destroy': { e: 'anger', w: 0.8 }, 'break': { e: 'anger', w: 0.5 },
    'revenge': { e: 'anger', w: 0.9 }, 'war': { e: 'anger', w: 0.8 },
    'fight': { e: 'anger', w: 0.7 }, 'kill': { e: 'anger', w: 0.9 },
    'scream': { e: 'anger', w: 0.7 }, 'curse': { e: 'anger', w: 0.7 },

    // ── SPIRITUAL (espiritual) ──
    'alma': { e: 'spiritual', w: 0.8 }, 'espíritu': { e: 'spiritual', w: 0.8 },
    'espiritu': { e: 'spiritual', w: 0.8 }, 'dios': { e: 'spiritual', w: 0.7 },
    'ángel': { e: 'spiritual', w: 0.8 }, 'angel': { e: 'spiritual', w: 0.8 },
    'cielo': { e: 'spiritual', w: 0.5 }, 'paraíso': { e: 'spiritual', w: 0.7 },
    'paraiso': { e: 'spiritual', w: 0.7 }, 'infinito': { e: 'spiritual', w: 0.6 },
    'eterno': { e: 'spiritual', w: 0.5 }, 'eternidad': { e: 'spiritual', w: 0.7 },
    'sagrado': { e: 'spiritual', w: 0.7 }, 'divino': { e: 'spiritual', w: 0.7 },
    'divina': { e: 'spiritual', w: 0.7 }, 'bendición': { e: 'spiritual', w: 0.7 },
    'bendicion': { e: 'spiritual', w: 0.7 }, 'oración': { e: 'spiritual', w: 0.7 },
    'oracion': { e: 'spiritual', w: 0.7 }, 'rezar': { e: 'spiritual', w: 0.7 },
    'fe': { e: 'spiritual', w: 0.6 }, 'milagro': { e: 'spiritual', w: 0.7 },
    'soul': { e: 'spiritual', w: 0.8 }, 'spirit': { e: 'spiritual', w: 0.7 },
    'god': { e: 'spiritual', w: 0.7 }, 'heaven': { e: 'spiritual', w: 0.7 },
    'paradise': { e: 'spiritual', w: 0.7 }, 'eternal': { e: 'spiritual', w: 0.6 },
    'eternity': { e: 'spiritual', w: 0.7 }, 'sacred': { e: 'spiritual', w: 0.7 },
    'divine': { e: 'spiritual', w: 0.7 }, 'pray': { e: 'spiritual', w: 0.7 },
    'prayer': { e: 'spiritual', w: 0.7 }, 'faith': { e: 'spiritual', w: 0.6 },
    'miracle': { e: 'spiritual', w: 0.7 }, 'blessed': { e: 'spiritual', w: 0.7 }
  };

  // Pre-compute: separate single words from multi-word phrases
  const PHRASES = {};
  const WORDS = {};
  for (const [key, val] of Object.entries(DICTIONARY)) {
    if (key.includes(' ')) {
      PHRASES[key] = val;
    } else {
      WORDS[key] = val;
    }
  }

  // Concrete visual nouns only. Metaphors such as "fire" are intentionally absent so a
  // romantic lyric does not become a desert merely because it says "arde mi corazon".
  const WORLD_SIGNALS = Object.freeze({
    forest: ['bosque', 'arbol', 'arboles', 'selva', 'forest', 'woods', 'jungle'],
    mystic_garden: ['jardin', 'flores', 'flor', 'prado', 'garden', 'meadow', 'blossom'],
    desert: ['desierto', 'arena', 'dunas', 'oasis', 'desert', 'sand', 'dunes'],
    city: ['ciudad', 'calle', 'avenida', 'edificio', 'trafico', 'city', 'street', 'downtown'],
    neon_city: ['neon', 'cyberpunk', 'discoteca', 'nightclub', 'sintetizador', 'synthwave'],
    ocean: ['oceano', 'mar', 'playa', 'orilla', 'olas', 'ocean', 'sea', 'beach', 'shore'],
    snow: ['nieve', 'hielo', 'invierno', 'tundra', 'snow', 'ice', 'winter'],
    ruins: ['ruinas', 'templo', 'iglesia', 'cementerio', 'tumba', 'ruins', 'temple', 'grave'],
    swamp: ['pantano', 'ciénaga', 'cienaga', 'marisma', 'swamp', 'marsh', 'bog'],
    interior: ['habitacion', 'habitación', 'cuarto', 'casa', 'ventana', 'room', 'house', 'bedroom'],
    void: ['espacio', 'cosmos', 'galaxia', 'universo', 'space', 'cosmos', 'galaxy', 'universe'],
    mountain: ['montana', 'montaña', 'cumbre', 'acantilado', 'mountain', 'peak', 'cliff']
  });

  class DictionaryAnalyzer extends ILyricAnalyzer {
    constructor() {
      super();
    }

    /**
     * Analyze synced lyrics lines into emotion blocks.
     * @param {Array<{timeMs: number, text: string, isInterlude?: boolean}>} lines
     * @returns {{ blocks: AnalyzedBlock[] }}
     */
    analyze(lines) {
      if (!lines || lines.length === 0) {
        return { blocks: [] };
      }

      // Filter out interlude markers
      const lyricLines = lines.filter(l => !l.isInterlude && l.text && l.text.trim());
      if (lyricLines.length === 0) {
        return { blocks: [] };
      }

      const blocks = [];

      for (let i = 0; i < lyricLines.length; i++) {
        const line = lyricLines[i];
        const nextLine = lyricLines[i + 1];
        const startMs = line.timeMs;
        const endMs = nextLine ? nextLine.timeMs : startMs + 5000;
        const text = line.text;

        const visualMotifs = global.SceneVisualLexicon
          ? global.SceneVisualLexicon.extract(text)
          : [];

        const analysis = this._analyzeBlock(text);
        const intensity = this._detectIntensity(text, analysis);

        blocks.push({
          startMs,
          endMs,
          text,
          emotion: analysis.primary,
          emotionScore: analysis.primaryScore,
          secondaryEmotion: analysis.secondary,
          secondaryScore: analysis.secondaryScore,
          intensity,
          keywords: analysis.keywords,
          visualMotifs,
          rawScores: analysis.rawScores
        });
      }

      const richVision = this._buildLocalVision(blocks);
      const allMotifs = [...new Set(blocks.flatMap(block => block.visualMotifs || []))];
      const inferredWorld = global.SceneVisualLexicon
        ? global.SceneVisualLexicon.inferWorld(allMotifs)
        : null;

      if (inferredWorld) {
        richVision.world = {
          ...(richVision.world || {}),
          type: inferredWorld
        };
      }

      richVision.visualMotifs = allMotifs;

      return {
        blocks,
        richVision,
        isAIAnalyzed: false,
        analysisSource: 'local'
      };
    }

    /** Build a deterministic visual hint locally; it never calls a model or network service. */
    _buildLocalVision(blocks) {
      const fullText = blocks.map(block => block.text || '').join(' ').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ' ');
      let bestBiome = null;
      let bestScore = 0;
      for (const [biome, signals] of Object.entries(WORLD_SIGNALS)) {
        const score = signals.reduce((total, signal) => total + (this._hasVisualSignal(fullText, signal) ? 1 : 0), 0);
        if (score > bestScore) { bestBiome = biome; bestScore = score; }
      }
      const dominant = blocks.reduce((scores, block) => {
        scores[block.emotion] = (scores[block.emotion] || 0) + (block.emotionScore || 0);
        return scores;
      }, {});
      const emotion = Object.keys(dominant).sort((left, right) => dominant[right] - dominant[left])[0] || 'neutral';
      const symbols = [...new Set(
        blocks.flatMap(block => block.visualMotifs || [])
      )].slice(0, 8);
      const night = /\b(noche|luna|estrellas|night|moon|stars)\b/.test(fullText);
      const winter = /\b(nieve|hielo|invierno|snow|ice|winter)\b/.test(fullText);
      const lightingPreset = emotion === 'anger' || emotion === 'energy' ? 'dramatic'
        : emotion === 'sad' || emotion === 'dark' ? 'moonlight'
          : emotion === 'love' || emotion === 'celebration' ? 'golden_hour' : 'cold';
      const cameraStyle = emotion === 'love' ? 'intimate_dolly'
        : emotion === 'energy' || emotion === 'anger' ? 'kinetic'
          : emotion === 'dark' || emotion === 'sad' ? 'still' : 'slow_follow';
      return {
        world: bestBiome ? { type: bestBiome, season: winter ? 'winter' : 'neutral', time: night ? 'night' : 'day' } : {},
        camera: { style: cameraStyle },
        lighting: { preset: lightingPreset },
        symbols,
        directorNotes: ['Vision generated locally from lyric imagery.'],
        artStyle: bestBiome === 'neon_city' || bestBiome === 'ruins' ? 'gothic' : 'realistic'
      };
    }

    _hasVisualSignal(text, signal) {
      const normalized = signal.normalize('NFD').replace(/[\u0300-\u036f]/g, ' ');
      const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`).test(text);
    }

    /**
     * Analyze a single text block for emotions.
     * @param {string} text
     * @returns {{ primary, primaryScore, secondary, secondaryScore, keywords, rawScores }}
     */
    _analyzeBlock(text) {
      const lower = text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents for matching
        .replace(/[^\w\sáéíóúñü]/g, ' ');
      const lowerOriginal = text.toLowerCase();

      const scores = {};
      const keywords = [];

      // Initialize all emotions to 0
      for (const emotion of ILyricAnalyzer.EMOTIONS) {
        scores[emotion] = 0;
      }

      // Check multi-word phrases first (higher priority)
      for (const [phrase, { e, w }] of Object.entries(PHRASES)) {
        const phraseNorm = phrase.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (lower.includes(phraseNorm) || lowerOriginal.includes(phrase)) {
          scores[e] += w;
          keywords.push(phrase);
        }
      }

      // Check individual words
      const wordTokens = lower.split(/\s+/);
      for (const token of wordTokens) {
        if (token.length < 2) continue;
        const entry = WORDS[token];
        if (entry) {
          scores[entry.e] += entry.w;
          if (!keywords.includes(token)) keywords.push(token);
        }
      }

      // Also check original (with accents) for words that need them
      const origTokens = lowerOriginal.split(/\s+/);
      for (const token of origTokens) {
        if (token.length < 2) continue;
        const entry = WORDS[token];
        if (entry && !keywords.includes(token)) {
          scores[entry.e] += entry.w;
          keywords.push(token);
        }
      }

      // Normalize and find primary + secondary
      const normalized = this._normalizeScores(scores);
      const sorted = Object.entries(normalized)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]);

      const primary = sorted.length > 0 ? sorted[0][0] : 'neutral';
      const primaryScore = sorted.length > 0 ? sorted[0][1] : 0;
      const secondary = sorted.length > 1 ? sorted[1][0] : null;
      const secondaryScore = sorted.length > 1 ? sorted[1][1] : 0;

      return {
        primary,
        primaryScore,
        secondary,
        secondaryScore,
        keywords,
        rawScores: normalized
      };
    }

    /**
     * Detect intensity from text features.
     * @param {string} text
     * @param {Object} analysis
     * @returns {number} 0-1
     */
    _detectIntensity(text, analysis) {
      let intensity = 0;

      // Exclamation marks
      const exclamations = (text.match(/!/g) || []).length;
      intensity += Math.min(0.3, exclamations * 0.1);

      // ALL CAPS words
      const capsWords = (text.match(/\b[A-ZÁÉÍÓÚÑÜ]{2,}\b/g) || []).length;
      intensity += Math.min(0.2, capsWords * 0.1);

      // Repeated characters (e.g., "nooooo", "siiiiii")
      const repeats = (text.match(/(.)\1{2,}/g) || []).length;
      intensity += Math.min(0.2, repeats * 0.1);

      // Keyword density — more keywords = more intense
      const keywordDensity = analysis.keywords.length / Math.max(1, text.split(/\s+/).length);
      intensity += Math.min(0.3, keywordDensity);

      return Math.min(1, intensity);
    }

    /**
     * Normalize scores to 0-1 range.
     * @param {Object} scores
     * @returns {Object}
     */
    _normalizeScores(scores) {
      const max = Math.max(...Object.values(scores), 0.001);
      const normalized = {};
      for (const [key, val] of Object.entries(scores)) {
        normalized[key] = Math.round((val / max) * 1000) / 1000;
      }
      return normalized;
    }
  }

  global.SceneDictionaryAnalyzer = DictionaryAnalyzer;
})(typeof window !== 'undefined' ? window : globalThis);
