/**
 * Script d'extraction des fruits du démon (One Piece) et leurs détenteurs
 * depuis les pages HTML Fandom (Paramecia, Logia, Zoan).
 * Génère un fichier CSV: fruit,detenteur,type
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const HTML_DIR = __dirname;
const FILES = [
  { file: 'Paramecia _ One Piece Encyclopédie _ Fandom.html', type: 'Paramecia' },
  { file: 'Logia _ One Piece Encyclopédie _ Fandom.html', type: 'Logia' },
  { file: 'Zoan _ One Piece Encyclopédie _ Fandom.html', type: 'Zoan' },
];

// Exclusions
const SKIP_HOLDERS = ['Image Non Disponible', 'SBS', '?', ''];
const SKIP_SECTIONS = /^(Artificiel|Hors-série|SBS|Non\s*canon|Canon)$/i;

function extractTitle(link) {
  if (!link || !link.attribs) return null;
  const title = link.attribs.title;
  if (!title || typeof title !== 'string') return null;
  const t = title.trim();
  if (!t || SKIP_HOLDERS.includes(t)) return null;
  return t;
}

function isFruitLink(link) {
  const href = (link.attribs?.href || '').toString();
  const title = (link.attribs?.title || '').toString();
  // Fruits: lien wiki vers un fruit (souvent contient "no_Mi" ou similar)
  return href.includes('onepiece.fandom.com') && href.includes('/wiki/') &&
    (title.includes('no Mi') || title.includes('no mi'));
}

function isHolderLink(link) {
  const href = (link.attribs?.href || '').toString();
  const title = (link.attribs?.title || '').toString();
  // Détenteurs: lien wiki, pas un fruit (pas de "no Mi")
  if (!href.includes('onepiece.fandom.com') || !href.includes('/wiki/')) return false;
  if (title.includes('no Mi') || title.includes('no mi')) return false;
  if (SKIP_HOLDERS.includes(title.trim())) return false;
  // Exclure les pages système
  if (href.includes('Sp%C3%A9cial:') || href.includes('Cat%C3%A9gorie:')) return false;
  return true;
}

function extractPairsFromTable($, table, type) {
  const pairs = [];
  const rows = $(table).find('tr');
  let prevHolders = null;

  for (let i = 0; i < rows.length; i++) {
    const row = $(rows[i]);
    const cells = row.find('th');

    // Ligne en-tête de section (ex: "Artificiel")
    const sectionCell = row.find('td[colspan]');
    if (sectionCell.length) {
      const text = sectionCell.text().trim();
      if (SKIP_SECTIONS.test(text)) prevHolders = null;
      continue;
    }

    if (cells.length === 0) continue;

    const firstLink = cells.first().find('a[href][title]').first();
    const firstEl = firstLink[0];
    if (!firstEl) continue;

    // Ligne de fruits
    if (isFruitLink(firstEl)) {
      if (prevHolders && prevHolders.length === cells.length) {
        for (let c = 0; c < cells.length; c++) {
          const fruitLink = $(cells[c]).find('a[title]').first()[0];
          const fruitTitle = extractTitle(fruitLink);
          if (fruitTitle && prevHolders[c]) {
            pairs.push({
              fruit: fruitTitle.replace(/\s*\(anciennement\)\s*/gi, '').trim(),
              detenteur: prevHolders[c],
              type,
            });
          }
        }
      }
      prevHolders = null;
      continue;
    }

    // Ligne de détenteurs (portraits ou liens personnages)
    if (isHolderLink(firstLink[0])) {
      prevHolders = [];
      for (let c = 0; c < cells.length; c++) {
        const link = $(cells[c]).find('a[href][title]').first()[0];
        prevHolders.push(extractTitle(link));
      }
    }
  }

  return pairs;
}

function extractFromFile(filePath, type) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);
  const pairs = [];

  $('table').each((_, table) => {
    const inner = $(table).closest('.table-wide-inner').length || $(table).parent().hasClass('table-wide-inner');
    const hasFruitLink = $(table).find('a[title*="no Mi"]').length > 0;
    if (hasFruitLink) {
      const found = extractPairsFromTable($, table, type);
      pairs.push(...found);
    }
  });

  return pairs;
}

function escapeCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function main() {
  const all = [];

  for (const { file, type } of FILES) {
    const filePath = path.join(HTML_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn('Fichier non trouvé:', file);
      continue;
    }
    console.log('Traitement:', file);
    const pairs = extractFromFile(filePath, type);
    all.push(...pairs);
  }

  const seen = new Set();
  const unique = all.filter((p) => {
    const key = `${p.fruit}|${p.detenteur}|${p.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const csvPath = path.join(HTML_DIR, 'fruits_demon.csv');
  const header = 'fruit,detenteur,type\n';
  const lines = unique.map((p) =>
    [escapeCsv(p.fruit), escapeCsv(p.detenteur), escapeCsv(p.type)].join(',')
  );
  fs.writeFileSync(csvPath, header + lines.join('\n'), 'utf-8');

  console.log('Fait:', unique.length, 'paires extraites');
  console.log('CSV écrit:', csvPath);
}

main();
