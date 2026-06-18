# AGENTS.md

Proyecto para leer feeds RSS y guardar metadatos de noticias en JSON.

## Reglas

- Usar Node.js 20 o superior.
- Mantener el sistema sin dependencias externas salvo que sea imprescindible.
- Configurar fuentes en `sources.json` o en ficheros `sources-extra*.json`.
- Guardar noticias en `data/<fuente>/<anio>/<mes>.json`.
- Cada articulo mensual debe guardar `titulo`, `url`, `imagen` y `fecha`.
- Deduplicar por `url`.
- Ordenar cada fichero mensual por `fecha` descendente.
- Generar indices en `indexes/portada.json` y `indexes/categorias.json`.
- `indexes/portada.json` debe contener las ultimas 50 noticias de todas las fuentes.
- `indexes/categorias.json` debe agrupar las ultimas 20 noticias por categoria.
- Mantener `categories.json` como catalogo de categorias agrupadas en supercategorias.
- Cada vez que se añada, elimine o renombre una categoria en `sources.json` o en cualquier fichero `sources-extra*.json`, actualizar `categories.json` en el mismo cambio.
- Antes de crear una categoria nueva, revisar si ya existe una equivalente para evitar duplicados por acentos, singular/plural o variantes de escritura.
- Los workflows deben ejecutarse por horario o manualmente, no en cada push.

## Comandos

```bash
npm run check
npm run fetch
npm run build-indexes
```
