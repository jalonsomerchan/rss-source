import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCES_PATH = path.join(ROOT, 'sources.json');
const DATA_PATH = path.join(ROOT, 'data');
const DEFAULT_FEEDS = {
  xataka: ['https://', 'www.', 'xataka.com', '/feedburner.xml'].join(''),
};

const entityMap = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decode(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, entity) => entityMap[entity.toLowerCase()] ?? match)
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(value = '') {
  return value.replace(/<[^>]*>/g, ' ');
}

function cleanText(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function tag(xml, names, { raw = false } = {}) {
  for (const name of names) {
    const re = new RegExp(`<${escapeRegExp(name)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(name)}>`, 'i');
    const match = xml.match(re);
    if (match?.[1]) {
      const decoded = decode(match[1]);
      return raw ? decoded : cleanText(stripHtml(decoded));
    }
  }
  return '';
}

function attr(xml, names, attribute) {
  for (const name of names) {
    const re = new RegExp(`<${escapeRegExp(name)}\\b([^>]*)>`, 'gi');
    let match;
    while ((match = re.exec(xml)) !== null) {
      const attrRe = new RegExp(`${escapeRegExp(attribute)}=["']([^"']+)["']`, 'i');
      const attrMatch = match[1].match(attrRe);
      if (attrMatch?.[1]) return decode(attrMatch[1]);
    }
  }
  return '';
}

function imageFrom(item) {
  const media = attr(item, ['media:content', 'media:thumbnail', 'image'], 'url');
  if (media) return media;

  const enclosureUrl = attr(item, ['enclosure'], 'url');
  const enclosureType = attr(item, ['enclosure'], 'type');
  if (enclosureUrl && (!enclosureType || enclosureType.startsWith('image/'))) return enclosureUrl;

  const itunes = attr(item, ['itunes:image'], 'href');
  if (itunes) return itunes;

  const html = tag(item, ['content:encoded', 'description', 'summary'], { raw: true });
  return html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1] ?? '';
}

function isoDate(value, fallback) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? fallback : new Date(timestamp).toISOString();
}

function parseFeed(xml, fallbackDate) {
  const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  const items = blocks.length ? blocks : [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);

  return items
    .map((item) => ({
      titulo: tag(item, ['title']),
      url: decode(tag(item, ['feedburner:origLink', 'link']) || attr(item, ['link'], 'href') || tag(item, ['guid', 'id'])).replace(/\s+/g, ''),
      imagen: imageFrom(item),
      fecha: isoDate(tag(item, ['pubDate', 'published', 'updated', 'dc:date', 'date']), fallbackDate),
    }))
    .filter((article) => article.titulo && article.url);
}

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

async function readExtraSources() {
  const entries = await readdir(ROOT, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /^sources-extra.*\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  const lists = [];
  for (const file of files) {
    lists.push(await readJson(path.join(ROOT, file), []));
  }

  return lists;
}

function mergeSources(...lists) {
  const byId = new Map();

  for (const list of lists) {
    if (!Array.isArray(list)) throw new Error('Los ficheros de fuentes deben contener un array');

    for (const source of list) {
      const id = source.id || slug(source.title);
      if (!id) continue;

      const current = byId.get(id);
      byId.set(id, current ? { ...source, ...current, id } : { ...source, id });
    }
  }

  return [...byId.values()];
}

function monthlyPath(sourceId, article) {
  const date = new Date(article.fecha);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return path.join(DATA_PATH, sourceId, year, `${month}.json`);
}

async function saveArticles(sourceId, articles) {
  const byFile = new Map();
  for (const article of articles) {
    const file = monthlyPath(sourceId, article);
    byFile.set(file, [...(byFile.get(file) ?? []), article]);
  }

  let added = 0;
  for (const [file, incoming] of byFile.entries()) {
    const current = await readJson(file, []);
    const byUrl = new Map(current.map((article) => [article.url, article]));
    let changed = false;

    for (const article of incoming) {
      if (!byUrl.has(article.url)) {
        byUrl.set(article.url, article);
        added += 1;
        changed = true;
        continue;
      }

      const existing = byUrl.get(article.url);
      const merged = {
        ...existing,
        titulo: existing.titulo || article.titulo,
        imagen: existing.imagen || article.imagen,
        fecha: existing.fecha || article.fecha,
      };
      if (JSON.stringify(existing) !== JSON.stringify(merged)) {
        byUrl.set(article.url, merged);
        changed = true;
      }
    }

    if (changed) {
      await writeJson(file, [...byUrl.values()].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha)));
    }
  }

  return added;
}

function latestDate(articles) {
  return articles
    .map((article) => Date.parse(article.fecha))
    .filter((timestamp) => !Number.isNaN(timestamp))
    .sort((a, b) => b - a)
    .map((timestamp) => new Date(timestamp).toISOString())[0] ?? null;
}

function feedPreview(text) {
  return decode(stripHtml(text.slice(0, 500))).slice(0, 160) || 'respuesta vacia';
}

async function fetchArticles(source, now) {
  const response = await fetch(source.source, {
    headers: {
      'User-Agent': 'rss-source-bot/1.0',
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const text = await response.text();
  const articles = parseFeed(text, now);
  if (!articles.length) {
    const contentType = response.headers.get('content-type') ?? 'sin content-type';
    throw new Error(`Feed sin articulos parseables (${contentType}): ${feedPreview(text)}`);
  }

  return articles;
}

const primarySources = await readJson(SOURCES_PATH, []);
const extraSourceLists = await readExtraSources();
const sources = mergeSources(primarySources, ...extraSourceLists);

const now = new Date().toISOString();
let total = 0;

for (const source of sources) {
  source.id = source.id || slug(source.title);
  source.source = source.source || DEFAULT_FEEDS[source.id] || '';
  source.ultimaBusquedaNoticias = now;

  try {
    if (!source.source) throw new Error('Fuente sin URL');
    const articles = await fetchArticles(source, now);
    total += await saveArticles(source.id, articles);
    source.fechaUltimaNoticia = latestDate(articles) ?? source.fechaUltimaNoticia ?? null;
    delete source.ultimoError;
    console.log(`${source.title ?? source.id}: ${articles.length} articulos leidos`);
  } catch (error) {
    source.ultimoError = error instanceof Error ? error.message : String(error);
    console.error(`${source.title ?? source.id}: ${source.ultimoError}`);
  }
}

await writeJson(SOURCES_PATH, sources);
console.log(`Nuevos articulos guardados: ${total}`);
