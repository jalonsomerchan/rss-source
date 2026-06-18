# rss-source

API estática para almacenar noticias leídas desde feeds RSS en ficheros JSON y servirlas desde GitHub Pages.

Endpoint base:

```txt
https://jalonsomerchan.github.io/rss-source/
```

## Qué genera

El repositorio tiene dos procesos automáticos:

1. **Lectura de RSS**: guarda artículos por fuente, año y mes.
2. **Generación de índices**: crea JSON agregados para portada y categorías.

Los workflows se ejecutan por horario y también pueden lanzarse manualmente desde GitHub Actions.

## Endpoints principales

### Portada

Últimas 50 noticias de todas las fuentes.

```txt
GET https://jalonsomerchan.github.io/rss-source/indexes/portada.json
```

Formato:

```json
{
  "generado": "2026-06-18T10:00:00.000Z",
  "limite": 50,
  "total": 1234,
  "noticias": [
    {
      "titulo": "Título de la noticia",
      "url": "https://example.com/noticia",
      "imagen": "https://example.com/imagen.jpg",
      "fecha": "2026-06-18T09:30:17.000Z",
      "fuenteId": "xataka",
      "fuenteTitle": "Xataka",
      "categorias": ["tecnologia"],
      "idioma": "es"
    }
  ]
}
```

### Noticias por categoría

Últimas 20 noticias de todas las fuentes para cada categoría.

```txt
GET https://jalonsomerchan.github.io/rss-source/indexes/categorias.json
```

Formato:

```json
{
  "generado": "2026-06-18T10:00:00.000Z",
  "limitePorCategoria": 20,
  "categorias": {
    "tecnologia": [
      {
        "titulo": "Título de la noticia",
        "url": "https://example.com/noticia",
        "imagen": "https://example.com/imagen.jpg",
        "fecha": "2026-06-18T09:30:17.000Z",
        "fuenteId": "xataka",
        "fuenteTitle": "Xataka",
        "categorias": ["tecnologia"],
        "idioma": "es"
      }
    ]
  }
}
```

### Fuentes configuradas

Lista de fuentes RSS configuradas.

```txt
GET https://jalonsomerchan.github.io/rss-source/sources.json
```

Cada fuente incluye:

```json
{
  "id": "xataka",
  "title": "Xataka",
  "source": "https://www.xataka.com/feedburner.xml",
  "categorias": ["tecnologia"],
  "idioma": "es",
  "fechaUltimaNoticia": "2026-06-18T09:30:17.000Z",
  "ultimaBusquedaNoticias": "2026-06-18T10:00:00.000Z"
}
```

### Archivo mensual por fuente

Noticias guardadas por fuente, año y mes.

```txt
GET https://jalonsomerchan.github.io/rss-source/data/{fuenteId}/{anio}/{mes}.json
```

Ejemplo:

```txt
GET https://jalonsomerchan.github.io/rss-source/data/xataka/2026/06.json
```

Formato:

```json
[
  {
    "titulo": "Título de la noticia",
    "url": "https://example.com/noticia",
    "imagen": "https://example.com/imagen.jpg",
    "fecha": "2026-06-18T09:30:17.000Z"
  }
]
```

## Ejemplos de uso

### JavaScript: cargar portada

```js
const base = 'https://jalonsomerchan.github.io/rss-source/';
const response = await fetch(`${base}indexes/portada.json`);
const data = await response.json();

console.log(data.noticias);
```

### JavaScript: cargar categoría

```js
const base = 'https://jalonsomerchan.github.io/rss-source/';
const response = await fetch(`${base}indexes/categorias.json`);
const data = await response.json();

console.log(data.categorias.tecnologia ?? []);
```

### JavaScript: cargar un mes concreto

```js
const base = 'https://jalonsomerchan.github.io/rss-source/';
const response = await fetch(`${base}data/xataka/2026/06.json`);
const noticias = await response.json();

console.log(noticias);
```

## Campos de noticia

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `titulo` | string | Título de la noticia. |
| `url` | string | URL original del artículo. |
| `imagen` | string | Imagen principal detectada en el RSS, si existe. |
| `fecha` | string | Fecha en formato ISO 8601. |
| `fuenteId` | string | Solo en índices. ID de la fuente. |
| `fuenteTitle` | string | Solo en índices. Nombre visible de la fuente. |
| `categorias` | array | Solo en índices. Categorías asociadas a la fuente. |
| `idioma` | string | Solo en índices. Idioma de la fuente. |

## Categorías

Las categorías salen de `sources.json`. Una fuente puede pertenecer a varias categorías, por lo que una misma noticia puede aparecer en varios grupos dentro de `indexes/categorias.json`.

## Actualización

- Los RSS se leen automáticamente desde GitHub Actions.
- Los índices se regeneran automáticamente cada 30 minutos.
- Los JSON son ficheros estáticos servidos por GitHub Pages.

## Desarrollo

Requisitos:

```txt
Node.js 20 o superior
```

Comandos:

```bash
npm run check
npm run fetch
npm run build-indexes
```
