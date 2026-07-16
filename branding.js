// ╔══════════════════════════════════════════════════════════════╗
// ║          🎨  CONFIGURACIÓN DE MARCA / BRANDING  🎨          ║
// ║                                                              ║
// ║  Para cambiar el LOGO de la aplicación después de instalar:  ║
// ║                                                              ║
// ║  1. Reemplaza el archivo  logo.svg  con tu propio SVG        ║
// ║     (misma carpeta que este archivo)                         ║
// ║                                                              ║
// ║  2. Si quieres cambiar el NOMBRE de la app, edita:          ║
// ║     appName, title, windowTitle                              ║
// ║                                                              ║
// ║  Ruta del logo:  ./logo.svg  ← CAMBIA ESTE ARCHIVO          ║
// ╚══════════════════════════════════════════════════════════════╝

const branding = {
  appName: 'Aurora Letras',
  shortName: 'Aurora',
  packageName: 'aurora-letras',
  description: 'Proyector de letras sincronizadas con visuales',
  author: 'juandelgado4-droid',
  appId: 'com.auroraletras.player',
  title: 'Aurora Letras',
  windowTitle: 'Aurora Letras - Proyector de Letras',
  watermarkAlt: 'Aurora Letras',

  // ← LOGO PRINCIPAL: Cambia 'logo.svg' por tu propio archivo SVG
  logoPath: 'logo.svg',

  // ← ICONO DE VENTANA: Mismo archivo SVG (antes era logo.png)
  windowIconPath: 'logo.svg'
};

if (typeof module !== 'undefined') {
  module.exports = branding;
}

if (typeof window !== 'undefined') {
  window.BRANDING = branding;
}