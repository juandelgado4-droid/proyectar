// ═══════════════════════════════════════════════════════════════════════
// GEMMA 3 SCHEMA VALIDATOR — Validador de esquema JSON en tiempo de ejecución
// Garantiza la integridad narrativa antes de pasar el JSON al VisualReasoner
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class Gemma3SchemaValidator {
    /**
     * Validate raw parsed JSON object against strict narrative schema.
     * @param {Object} data 
     * @returns {{isValid: boolean, errors: string[]}}
     */
    static validate(data) {
      const errors = [];

      if (!data || typeof data !== 'object') {
        return { isValid: false, errors: ['El resultado no es un objeto JSON válido.'] };
      }

      // 1. Validate story / theme / acts
      if (!data.story || typeof data.story !== 'object') {
        errors.push('Falta el objeto "story".');
      } else {
        if (!data.story.theme || typeof data.story.theme !== 'string') {
          errors.push('El objeto "story" debe incluir "theme" (string).');
        }
        if (!Array.isArray(data.story.acts) || data.story.acts.length === 0) {
          errors.push('El objeto "story" debe contener un array "acts" no vacío.');
        } else {
          data.story.acts.forEach((act, idx) => {
            if (typeof act.start !== 'number' || typeof act.end !== 'number') {
              errors.push(`El acto ${idx + 1} debe incluir tiempos numéricos "start" y "end".`);
            }
            if (!act.emotion || typeof act.emotion !== 'string') {
              errors.push(`El acto ${idx + 1} debe incluir una propiedad "emotion".`);
            }
          });
        }
      }

      // 2. Validate world
      if (!data.world || typeof data.world !== 'object') {
        errors.push('Falta el objeto "world".');
      } else {
        if (!data.world.type || typeof data.world.type !== 'string') {
          errors.push('El objeto "world" debe definir "type".');
        }
      }

      // 3. Validate camera & lighting
      if (!data.camera || typeof data.camera.style !== 'string') {
        errors.push('El objeto "camera" debe definir "style" (string).');
      }
      if (!data.lighting || typeof data.lighting.preset !== 'string') {
        errors.push('El objeto "lighting" debe definir "preset" (string).');
      }

      // 4. Validate symbols
      if (!Array.isArray(data.symbols)) {
        errors.push('La propiedad "symbols" debe ser un array.');
      }

      // 5. Validate directorNotes (optional array of strings)
      if (data.directorNotes !== undefined && !Array.isArray(data.directorNotes)) {
        errors.push('La propiedad "directorNotes" debe ser un array.');
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    }
  }

  global.SceneGemma3SchemaValidator = Gemma3SchemaValidator;
})(typeof window !== 'undefined' ? window : globalThis);
