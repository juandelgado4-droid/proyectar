# Aurora Letras

Aplicación de escritorio en Electron para proyectar letras sincronizadas y visuales en pantalla completa.

## Instalar

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npm start
```

## Generar instalador

```bash
npm run build
```

## Cambiar la marca

El punto único para editar nombre, título e identidad visual es [branding.js](branding.js).

Para cambiar el logo, reemplaza el archivo [logo.png](logo.png) por tu nuevo ícono usando el mismo nombre y formato.

Los títulos visibles de ventanas y el nombre del paquete se actualizan desde [package.json](package.json) y [branding.js](branding.js).