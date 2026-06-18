import { readFile, writeFile } from 'node:fs/promises';

const SOURCES_PATH = 'sources.json';

const BROKEN_SOURCE_IDS = new Set([
  'mundoplus',
  'national-geographic-espana',
  'hoy-extremadura',
  '20minutos-curiosidades',
  'ser-extremadura',
  'ser-caceres',
  'ser-norte-extremadura',
  'onda-cero-extremadura',
  'publico',
  'publico-politica',
  'swissinfo-espanol',
  'el-economista-economia',
  'el-economista-mercados',
  'bolsamania',
  'estrategias-de-inversion',
  'muycomputer',
  'muylinux',
  'desarrollo-web',
  'openwebinars-blog',
  'keepcoding-blog',
  'genbeta-desarrollo',
  'genbeta-linux',
  'agencia-sinc',
  'rtve-ciencia',
  'historia-national-geographic',
  'muy-historia',
  'infosalus',
  'el-pais-salud',
  'miteco-noticias',
  'wwf-espana',
  'viajes-national-geographic',
  'traveler-espana',
  'revista-viajar',
  'guia-repsol',
  'turismo-extremadura',
  'gastroactitud',
  'cocina-facil',
  '112-extremadura',
  'guardia-civil-noticias',
  'policia-nacional',
  '20minutos-sucesos',
  'hoy-sucesos',
  'el-periodico-extremadura-sucesos',
  'agenda-extremadura',
  'ayuntamiento-plasencia',
  'viralagenda',
  'los40-musica',
  'europa-fm',
  'dod-magazine',
  'trecebits',
  'lavanguardia-viral',
  'el-mueble',
  'arquitectura-y-diseno',
  'ad-magazine-espana',
  'aemet-avisos-extremadura',
  'meteored',
  'eltiempo',
  'ram-meteored',
  'vogue-espana',
  'woman-madame-figaro',
  'clara',
  'glamour-espana',
  'vanity-fair-espana',
  'lecturas',
  'semana',
  'vanitatis',
  'bekia',
  'europa-press-chance',
  'mujer-hoy',
  'pronto',
  'sport',
  'relevo',
  'el-desmarque',
  'eurosport-espana',
  'besoccer-noticias',
  'ciclismo-a-fondo',
  'planeta-triatlon'
]);

const SOURCE_OVERRIDES = new Map([
  ['as', 'https://feeds.as.com/mrss-s/pages/as/site/as.com/portada']
]);

const sources = JSON.parse(await readFile(SOURCES_PATH, 'utf8'));
const originalCount = sources.length;
const seen = new Set();

const cleanedSources = sources
  .filter((source) => source?.id && !BROKEN_SOURCE_IDS.has(source.id))
  .map((source) => {
    const cleaned = { ...source };
    if (SOURCE_OVERRIDES.has(cleaned.id)) cleaned.source = SOURCE_OVERRIDES.get(cleaned.id);
    delete cleaned.ultimoError;
    cleaned.fechaUltimaNoticia ??= null;
    cleaned.ultimaBusquedaNoticias ??= null;
    return cleaned;
  })
  .filter((source) => {
    if (seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });

await writeFile(SOURCES_PATH, `${JSON.stringify(cleanedSources, null, 2)}\n`, 'utf8');

console.log(`Fuentes originales: ${originalCount}`);
console.log(`Fuentes activas: ${cleanedSources.length}`);
console.log(`Fuentes eliminadas: ${originalCount - cleanedSources.length}`);
