# 🎨 ¿Cómo cambiar el logo de la app?

---

## ➡️ Archivo a reemplazar: `logo.svg`

**El logo se controla con UN SOLO archivo:**

```
📁 proyectar/
├── 📄 branding.js      ← Nombre de la app, título de ventana
├── 🖼️ logo.svg         ← ¡ESTE ES EL LOGO! Reemplaza este archivo
└── ...
```

---

## Pasos

1. **Crea o consigue tu logo** en formato `.svg`
2. **Renómbralo** a `logo.svg`
3. **Cópialo aquí** (reemplaza el existente):
   - `C:\ruta-de-instalación\logo.svg`
4. **Reinicia la app** — el logo aparecerá en:
   - Marca de agua de la pantalla (esquina inferior derecha)
   - Ícono de la ventana (barra de título)
   - Ícono del instalador/desinstalador

---

## ¿También quieres cambiar el nombre?

Edita `branding.js` y modifica:

```js
appName:     'Aurora Letras',   // ← Nombre de la app
title:       'Aurora Letras',   // ← Título interno
windowTitle: 'Aurora Letras - Proyector de Letras',  // ← Barra de título
```

---

> **Tip:** El SVG debe ser cuadrado (viewBox 0 0 512 512) para que se vea bien como ícono de ventana.
