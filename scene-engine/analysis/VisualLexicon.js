(function (global) {
  'use strict';

  const MOTIFS = Object.freeze({
    dog: ['perro', 'perrita', 'can', 'cachorro', 'dog', 'puppy'],
    home: ['casa', 'hogar', 'habitacion', 'habitación', 'cuarto', 'living', 'home', 'house', 'room'],
    kitchen: ['cocina', 'mesa', 'silla', 'plato', 'comedor', 'kitchen', 'table', 'chair', 'plate'],
    food: ['comer', 'comida', 'pan', 'carne', 'hambre', 'bocado', 'alimento', 'eat', 'food', 'hungry', 'meal'],
    return_home: ['volver', 'volver al hogar', 'regresar', 'regreso', 'volver a casa', 'return', 'come home'],
    threat: ['puñal', 'puñales', 'cuchillo', 'cuchillos', 'herida', 'clavar', 'knife', 'blade', 'stab', 'wound'],
    memory: ['recuerdo', 'recuerdos', 'memoria', 'recordar', 'fotografía', 'foto', 'memory', 'remember', 'photo'],
    bed: ['cama', 'dormir', 'sueño', 'almohada', 'bed', 'sleep', 'pillow'],
    window: ['ventana', 'lluvia en la ventana', 'window'],
    street: ['calle', 'avenida', 'esquina', 'semáforo', 'street', 'road', 'corner'],
    sea: ['mar', 'océano', 'playa', 'orilla', 'olas', 'sea', 'ocean', 'beach'],
    fire: ['fuego', 'llama', 'arder', 'incendio', 'fire', 'flame', 'burn']
  });

  class VisualLexicon {
    static extract(text) {
      const source = String(text || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ' ');
      const motifs = [];
      for (const [motif, terms] of Object.entries(MOTIFS)) {
        if (terms.some(term => {
          const normalized = term.normalize('NFD').replace(/[\u0300-\u036f]/g, ' ');
          return new RegExp(`(^|[^a-z0-9])${VisualLexicon.escape(normalized)}(?=$|[^a-z0-9])`).test(source);
        })) motifs.push(motif);
      }
      return motifs;
    }

    static inferWorld(motifs) {
      const set = new Set(motifs || []);
      if (set.has('home') || set.has('kitchen') || set.has('food') || set.has('bed')) return 'interior';
      if (set.has('street')) return 'city';
      if (set.has('sea')) return 'ocean';
      if (set.has('fire') || set.has('threat')) return 'ruins';
      return null;
    }

    static escape(value) {
      return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }

  global.SceneVisualLexicon = VisualLexicon;
})(typeof window !== 'undefined' ? window : globalThis);
