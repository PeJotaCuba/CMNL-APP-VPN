# Configuración PWA para CMNL App

Esta aplicación ha sido configurada como una Progressive Web App (PWA). Para completar la instalación, sigue estos pasos:

## 1. Generación de Iconos
La aplicación ahora utiliza el logo oficial en formato SVG (`icons/icon.svg`) para una mejor compatibilidad y escalabilidad en todos los dispositivos.

Se han configurado los siguientes iconos en el `manifest.json`:
1. `icons/icon.svg` (Formato SVG, escalable a cualquier tamaño)

Este icono se utiliza tanto para la instalación en Android (como icono adaptable/maskable) como para el icono de inicio en iOS y Windows.

## 2. Capturas de Pantalla (Opcional pero recomendado)
Para mejorar la presentación en tiendas de aplicaciones, crea una carpeta `screenshots/` y añade:
1. `screenshots/mobile-home.png` (Captura vertical, aprox 1080x1920)
2. `screenshots/desktop-dashboard.png` (Captura horizontal, aprox 1920x1080)

## 3. Verificación
1. Despliega la aplicación en un servidor con HTTPS (Vercel, Netlify, Firebase, etc.).
2. Abre la aplicación en Chrome.
3. Abre las DevTools (F12) -> Pestaña "Application".
4. Verifica que no haya errores en "Manifest" y "Service Workers".

## 4. PWABuilder
Una vez desplegada:
1. Ve a [PWABuilder.com](https://www.pwabuilder.com/).
2. Ingresa la URL de tu aplicación.
3. Si todo está correcto, obtendrás una puntuación alta y podrás descargar los paquetes para Google Play Store, Microsoft Store y Apple Store.
