# Aurora Letras

Un proyector de letras para escritorio hecho en Electron, pensado para abrirlo, instalarlo y usarlo sin fricción.

<p align="center">
	<img src="logo.png" alt="Aurora Letras" width="180">
</p>

<p align="center">
	<a href="https://github.com/juandelgado4-droid/proyectar/releases/latest/download/Aurora%20Letras%20Setup%201.3.0.exe">
		Descargar instalador Windows
	</a>
</p>

## Lo que hace

- Proyecta letras sincronizadas en una ventana limpia y a pantalla completa.
- Soporta visuales, fondos, controles de texto y ajuste de sincronía.
- Incluye instalador de Windows para distribuirlo como app de escritorio.

## Descarga rápida

Si quieres instalar solo la versión final, usa el enlace de arriba. Ese archivo apunta al setup más reciente de Windows generado en `dist`.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm start
```

## Build final

```bash
npm run build
```

## Estructura de marca

La configuración central de nombre, títulos y referencias de la app está en [branding.js](branding.js).

Si quieres cambiar el logo, reemplaza directamente [logo.png](logo.png). Ese es el archivo que la app y el instalador usan como identidad visual.

Los metadatos de publicación viven en [package.json](package.json): ahí se define el nombre del paquete, `appId`, `productName` y la versión final.

## Publicación

El repositorio está pensado para que cualquiera pueda instalarlo con `npm install`, ejecutarlo con `npm start` y generar su propio instalador con `npm run build`.

## Cambiar el logo

El lugar exacto para cambiar la identidad visual es [logo.png](logo.png). Reemplaza ese archivo por tu nuevo logo y mantén el mismo nombre para que la app lo tome automáticamente.