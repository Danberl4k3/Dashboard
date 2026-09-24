# Orientación del proyecto

Antes de explorar el repositorio, consulta `docs/PROJECT_MAP.md`. Es un índice de navegación, no un sustituto del código fuente.

- Para un archivo concreto: `node scripts/project-map.mjs --focus lib/data-sources/sharepoint-excel-source.ts`. Lee únicamente el grafo guardado y muestra dependencias e importadores.
- Abre los archivos relevantes para la tarea y sus dependencias inmediatas; evita leer todo el repositorio o el JSON completo del grafo por defecto.
- Si el mapa podría estar desactualizado, ejecuta `node scripts/project-map.mjs --check`. Esta comprobación sí recorre las fuentes; no hace falta repetirla en cada consulta.
- Después de cambiar fuentes, añadir o eliminar módulos, regenera con `node scripts/project-map.mjs` y verifica con `--check`. No edites manualmente los archivos generados.
- Las flechas de imports incluyen dependencias de tipos. La relación HTTP está marcada como manual; revisa su definición en el generador si cambia el endpoint. El mapa no prueba comportamiento ni recoge todas las relaciones en ejecución.

## Dónde empezar según la tarea

| Tarea                                     | Archivos iniciales                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| Pantalla, indicadores y refresco          | `components/dashboard/dashboard.tsx` y componentes hermanos                     |
| Actualización periódica y estado de carga | `hooks/use-dashboard-refresh.ts`, `components/dashboard/data-source-status.tsx` |
| Filtros y exclusiones                     | `lib/dashboard/filters.ts`                                                      |
| Contratos de datos                        | `lib/dashboard/types.ts`, `lib/data-sources/dashboard-source.ts`                |
| SharePoint, caché y datos de respaldo     | `lib/data-sources/sharepoint-excel-source.ts`                                   |
| Interpretación del Excel                  | `lib/data-sources/xlsx-reader.ts`                                               |
| Carga inicial del servidor                | `app/page.tsx`                                                                  |
| Endpoint de actualización                 | `app/api/dashboard/route.ts`                                                    |
| Estilos y estructura global               | `app/globals.css`, `app/layout.tsx`                                             |
| Infraestructura y comandos                | `package.json`, `vite.config.ts`, `next.config.ts`                              |
| Pruebas                                   | `tests/` y `npm test`                                                           |

La fuente se elige con `DASHBOARD_SOURCE=sharepoint` (predeterminada) o `DASHBOARD_SOURCE=snapshot`. La selección está en `lib/data-sources/configured-dashboard-source.ts`.

No es necesario abrir `.env.local`, conversaciones, dependencias instaladas ni salidas de compilación para orientarse. El generador no incorpora valores de entorno ni el contenido del snapshot JSON.
