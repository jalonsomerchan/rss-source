# AGENTS.md

Proyecto para leer feeds RSS y guardar metadatos de noticias en JSON.

## Reglas

- Usar Node.js 20 o superior.
- Mantener el sistema sin dependencias externas salvo que sea imprescindible.
- Configurar fuentes en `sources.json`.
- Guardar noticias en `data/<fuente>/<anio>/<mes>.json`.
- Cada articulo debe guardar `titulo`, `url`, `imagen` y `fecha`.
- Deduplicar por `url`.
- Ordenar cada fichero mensual por `fecha` descendente.
- El workflow debe ejecutarse por horario o manualmente, no en cada push.

## Comandos

```bash
npm run check
npm run fetch
```
