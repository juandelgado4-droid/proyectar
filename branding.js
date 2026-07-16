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
  logoPath: 'logo.png'
};

if (typeof module !== 'undefined') {
  module.exports = branding;
}

if (typeof window !== 'undefined') {
  window.BRANDING = branding;
}