# Como cambiar el logo de la app

La forma recomendada es hacerlo desde la app:

1. Abre Aurora Letras.
2. Pasa el mouse sobre el logo de la esquina.
3. Haz clic en "Cambiar Logo".
4. Elige una imagen en formato SVG, PNG, JPG, WEBP o ICO.

La app guarda una copia del logo en la carpeta de datos del usuario, asi que el cambio se mantiene aunque reinicies la app y tambien funciona en la version instalada.

## Logo por defecto

Si quieres cambiar el logo por defecto del proyecto antes de compilar una nueva version, reemplaza:

```text
logo.svg
```

El icono del instalador se toma desde:

```text
logo.png
```

Despues de cambiar el icono del instalador, vuelve a compilar con:

```bash
npm run build
```

## Nombre de la app

Para cambiar el nombre, edita `branding.js`:

```js
appName: 'Aurora Letras',
title: 'Aurora Letras',
windowTitle: 'Aurora Letras - Proyector de Letras'
```
