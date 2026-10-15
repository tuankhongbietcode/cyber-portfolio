/* Enumerate every text node in dist/index.html that i18n.js would translate.
   A tiny hand-rolled tokenizer is enough here — the markup is well formed and
   we only need to know which subtree each piece of text sits inside.
   Exported so the coverage check can use exactly this logic instead of a
   cached copy of it. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA', 'CODE', 'KBD', 'PRE']);

/* A browser decodes entities before the text node exists, so the i18n key is
   the *decoded* string. Decode here too, or every key containing an entity
   would silently miss. */
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0',
  rsquo: '\u2019', lsquo: '\u2018', ldquo: '\u201c', rdquo: '\u201d',
  mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
};
const decodeEntities = (s) => s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, body) => {
  if (body[0] === '#') {
    const cp = body[1] === 'x' || body[1] === 'X'
      ? parseInt(body.slice(2), 16)
      : parseInt(body.slice(1), 10);
    return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
  }
  return Object.prototype.hasOwnProperty.call(ENTITIES, body) ? ENTITIES[body] : m;
});
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr', 'path', 'circle', 'rect',
  'marker', 'use', 'stop', 'line', 'polyline', 'polygon', 'ellipse']);

const html = readFileSync(fileURLToPath(new URL('../dist/index.html', import.meta.url)), 'utf8');

/* i18n.js refuses to walk a subtree carrying data-i18n-skip, so this has to
   model that too — otherwise it reports strings the real translator never
   touches. #langCode is the case in point: its "EN" is set by i18n.js itself. */
const stack = [];
const found = [];
let i = 0;

while (i < html.length) {
  const lt = html.indexOf('<', i);
  if (lt === -1) break;
  if (lt > i) collect(html.slice(i, lt));
  const gt = html.indexOf('>', lt);
  if (gt === -1) break;
  const tag = html.slice(lt + 1, gt);
  i = gt + 1;

  if (tag.startsWith('!--')) {
    const end = html.indexOf('-->', lt);
    i = end === -1 ? html.length : end + 3;
    continue;
  }
  if (tag.startsWith('?') || tag.startsWith('!')) continue;

  const closing = tag.startsWith('/');
  const name = (closing ? tag.slice(1) : tag).split(/[\s/>]/)[0].toUpperCase();
  if (!name) continue;

  if (closing) {
    if (stack.length && stack[stack.length - 1].name === name) stack.pop();
    continue;
  }
  if (!VOID.has(name.toLowerCase()) && !tag.endsWith('/')) {
    stack.push({ name, skip: /data-i18n-skip/.test(tag) });
  }
}
collect(''); // flush

function collect(raw) {
  if (raw === '') return;
  const collapsed = decodeEntities(raw).replace(/\s+/g, ' ').trim();
  if (!collapsed) return;
  for (const frame of stack) if (frame.skip || SKIP.has(frame.name)) return;
  found.push(collapsed);
}

export function extractStrings() {
  return [...found];
}

/* Only print when run directly — the coverage check imports this file, and a
   module that logs on import drowns the caller's own output. */
if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`))) {
  const seen = new Map();
  for (const s of found) seen.set(s, (seen.get(s) || 0) + 1);
  console.log(`# ${seen.size} unique translatable strings\n`);
  for (const [s, n] of seen) {
    console.log(`${n > 1 ? `(${n}) ` : ''}${JSON.stringify(s)}`);
  }
}
