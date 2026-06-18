import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCES_PATH = path.join(ROOT, 'sources.json');
const DATA_PATH = path.join(ROOT, 'data');
const INDEXES_PATH = path.join(ROOT, 'indexes');
const HOME_PATH = path.join(INDEXES_PATH, 'portada.json');
const CATEGORIES_PATH = path.join(INDEXES_PATH, 'categorias.json');
const HOME_LIMIT = 50;
const CATEGORY_LIMIT = 20;

function slug(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'source';
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function timestamp(article) {
  const value = Date.parse(article?.fecha ?? '');
  return Number.isNaN(value) ? 0 : value;
}

function cleanCategory(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function* jsonFiles(dir) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  entries.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* jsonFiles(fullPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      yield fullPath;
    }
  }
}

function sourceFromPath(file, sourcesById) {
  const relative = path.relative(DATA_PATH, file);
  const [sourceId] = relative.split(path.sep);
  const source = sourcesById.get(sourceId) ?? {
    id: sourceId,
    title: sourceId,
    categorias: [],
    idioma: 'es',
  };

  return {
    id: source.id || sourceId || slug(source.title),
    title: source.title || source.id || sourceId,
    categorias: Array.isArray(source.categorias) ? source.categorias.map(cleanCategory).filter(Boolean) : [],
    idioma: source.idioma || 'es',
  };
}

function normalizeArticle(article, source) {
  return {
    titulo: String(article.titulo ?? '').trim(),
    url: String(article.url ?? '').trim(),
    imagen: String(article.imagen ?? '').trim(),
    fecha: String(article.fecha ?? '').trim(),
    fuenteId: source.id,
    fuenteTitle: source.title,
    categorias: source.categorias,
    idioma: source.idioma,
  };
}

async function readArticles(sourcesById) {
  const byUrl = new Map();

  for await (const file of jsonFiles(DATA_PATH)) {
    const source = sourceFromPath(file, sourcesById);
    const articles = await readJson(file, []);
    if (!Array.isArray(articles)) continue;

    for (const article of articles) {
      const normalized = normalizeArticle(article, source);
      if (!normalized.titulo || !normalized.url || !normalized.fecha) continue;

      const current = byUrl.get(normalized.url);
      if (!current || timestamp(normalized) > timestamp(current)) {
        byUrl.set(normalized.url, normalized);
      }
    }
  }

  return [...byUrl.values()].sort((a, b) => timestamp(b) - timestamp(a));
}

function buildHomeIndex(articles, now) {
  return {
    generado: now,
    limite: HOME_LIMIT,
    total: articles.length,
    noticias: articles.slice(0, HOME_LIMIT),
  };
}

function buildCategoryIndex(articles, now) {
  const grouped = new Map();

  for (const article of articles) {
    for (const category of article.categorias) {
      if (!grouped.has(category)) grouped.set(category, []);
      const list = grouped.get(category);
      if (list.length < CATEGORY_LIMIT) list.push(article);
    }
  }

  return {
    generado: now,
    limitePorCategoria: CATEGORY_LIMIT,
    categorias: Object.fromEntries([...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'))),
  };
}

const sources = await readJson(SOURCES_PATH, []);
if (!Array.isArray(sources)) throw new Error('sources.json debe contener un array');

const sourcesById = new Map(
  sources.map((source) => [source.id || slug(source.title), source]),
);
const articles = await readArticles(sourcesById);
const now = new Date().toISOString();

await writeJson(HOME_PATH, buildHomeIndex(articles, now));
await writeJson(CATEGORIES_PATH, buildCategoryIndex(articles, now));

console.log(`Noticias indexadas para portada: ${Math.min(articles.length, HOME_LIMIT)}`);
console.log(`Noticias totales encontradas: ${articles.length}`);
