# Despliegue en Vercel

El dashboard usa Vinext y Nitro para generar las funciones de servidor y los
archivos estáticos de Vercel. La configuración de Cloudflare se conserva en
`vite.config.ts`; Vercel usa `vite.vercel.config.ts`.

## Importar desde GitHub

1. Importa el repositorio `Danberl4k3/Dashboard` en Vercel y selecciona `main`.
2. Usa la raíz del repositorio como Root Directory. `vercel.json` configura
   `npm ci` y `npm run build:vercel`. El preset de framework es Other.
   No configures manualmente Output Directory: Nitro genera `.vercel/output`
   con el formato Build Output API, incluidas las funciones y sus rutas.
3. Configura estas variables para Production y, si corresponde, Preview:

   | Variable | Valor |
   | --- | --- |
   | `DASHBOARD_SOURCE` | `sharepoint` |
   | `SHAREPOINT_EXCEL_3979_URL` | Enlace de descarga del Excel de Esparta 1 |
   | `SHAREPOINT_EXCEL_ESPARTA_URL` | Enlace de descarga del Excel de Esparta 2 |

4. Despliega. Si cambias las variables después, vuelve a desplegar.

Las URLs se usan únicamente en el servidor. No las guardes en GitHub ni uses
el prefijo `NEXT_PUBLIC_`. El servidor debe poder descargar los Excel sin la
sesión de Microsoft de tu navegador. La implementación actual no inicia sesión
con Microsoft Graph.

## Comprobación

- Abre `/` y comprueba que el estado de la fuente indique datos en vivo.
- Usa Actualizar y revisa `/api/dashboard?force=1`: debe responder JSON y
  `Cache-Control: no-store, no-cache, must-revalidate`.
- Confirma que ambos proyectos aparecen actualizados. Que la página cargue
  no garantiza acceso a SharePoint: si falla, se pueden mostrar datos de respaldo.
- Las funciones usan Node.js 24 y un máximo de 60 segundos. La descarga de
  SharePoint tiene un límite de 30 segundos y el navegador espera 35 segundos.
- La caché de 30 segundos vive en cada instancia y se pierde al reiniciarla;
  no es un almacenamiento persistente ni compartido entre instancias.

Para una demostración sin SharePoint, configura `DASHBOARD_SOURCE=snapshot`.
Ese modo muestra el JSON incluido en el repositorio y no consulta los Excel.

## Compilación local

```sh
npm ci
npm test
npm run build:vercel
```

Referencias: [Vinext con Nitro](https://github.com/cloudflare/vinext#other-platforms-via-nitro)
y [Nitro en Vercel](https://nitro.build/deploy/providers/vercel).
