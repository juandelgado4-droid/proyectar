// ═══════════════════════════════════════════════════════════════════════
// STYLE ENGINE — Motor de tratamientos estéticos globales
// Low-poly, gothic, vaporwave, futuristic, anime, realistic
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  const STYLES = {
    gothic: {
      palette: { primary: '#10101a', secondary: '#2b1b36', accent: '#c084fc' },
      flatShading: true,
      wireframe: false
    },
    low_poly: {
      palette: { primary: '#1b3b22', secondary: '#2d6a4f', accent: '#ffb703' },
      flatShading: true,
      wireframe: false
    },
    vaporwave: {
      palette: { primary: '#1a0033', secondary: '#ff007f', accent: '#00f0ff' },
      flatShading: true,
      wireframe: true
    },
    futuristic: {
      palette: { primary: '#080e18', secondary: '#0077b6', accent: '#90e0ef' },
      flatShading: false,
      wireframe: false
    },
    anime: {
      palette: { primary: '#2b2d42', secondary: '#8d99ae', accent: '#ffb3c1' },
      flatShading: true,
      wireframe: false
    },
    realistic: {
      palette: { primary: '#1b263b', secondary: '#415a77', accent: '#e0e1dd' },
      flatShading: false,
      wireframe: false
    }
  };

  class StyleEngine {
    constructor() {
      this.currentStyleName = 'gothic';
      this.currentStyle = STYLES.gothic;
    }

    setStyle(styleName) {
      this.currentStyleName = styleName;
      this.currentStyle = STYLES[styleName] || STYLES.gothic;
    }

    getStyle() {
      return this.currentStyle;
    }
  }

  global.SceneStyleEngine = StyleEngine;
})(typeof window !== 'undefined' ? window : globalThis);
