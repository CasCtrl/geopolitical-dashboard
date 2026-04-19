import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');

const KB = 1024;
const BUDGETS = {
  maxTotalJsKb: Number(process.env.BUNDLE_BUDGET_TOTAL_JS_KB || 1400),
  maxEntryJsKb: Number(process.env.BUNDLE_BUDGET_ENTRY_JS_KB || 450),
  maxChunkJsKb: Number(process.env.BUNDLE_BUDGET_CHUNK_JS_KB || 350),
};

function toKb(bytes) {
  return Number((bytes / KB).toFixed(1));
}

async function getEntryScriptName() {
  const html = await readFile(INDEX_HTML, 'utf8');
  const entryMatch = html.match(/<script\s+type="module"\s+crossorigin\s+src="\/assets\/([^"]+\.js)">/i);
  return entryMatch?.[1] || null;
}

async function collectJsAssets() {
  const files = await readdir(ASSETS_DIR);
  const jsFiles = files.filter((file) => file.endsWith('.js'));

  const assets = await Promise.all(
    jsFiles.map(async (file) => {
      const filePath = path.join(ASSETS_DIR, file);
      const fileStat = await stat(filePath);
      return {
        file,
        bytes: fileStat.size,
      };
    })
  );

  return assets.sort((a, b) => b.bytes - a.bytes);
}

async function main() {
  const [entryScript, assets] = await Promise.all([getEntryScriptName(), collectJsAssets()]);

  if (assets.length === 0) {
    throw new Error('No JS assets found in dist/assets. Build output is unexpected.');
  }

  const totalJsBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
  const entryAsset = entryScript ? assets.find((asset) => asset.file === entryScript) : null;
  const largestChunk = assets[0];

  const violations = [];

  if (toKb(totalJsBytes) > BUDGETS.maxTotalJsKb) {
    violations.push(
      `Total JS size ${toKb(totalJsBytes)} KB exceeds budget ${BUDGETS.maxTotalJsKb} KB`
    );
  }

  if (entryAsset && toKb(entryAsset.bytes) > BUDGETS.maxEntryJsKb) {
    violations.push(
      `Entry JS size ${entryAsset.file} (${toKb(entryAsset.bytes)} KB) exceeds budget ${BUDGETS.maxEntryJsKb} KB`
    );
  }

  if (largestChunk && toKb(largestChunk.bytes) > BUDGETS.maxChunkJsKb) {
    violations.push(
      `Largest JS chunk ${largestChunk.file} (${toKb(largestChunk.bytes)} KB) exceeds budget ${BUDGETS.maxChunkJsKb} KB`
    );
  }

  console.log('Bundle budget report');
  console.log(`- Total JS: ${toKb(totalJsBytes)} KB (budget ${BUDGETS.maxTotalJsKb} KB)`);
  if (entryAsset) {
    console.log(
      `- Entry JS: ${entryAsset.file} ${toKb(entryAsset.bytes)} KB (budget ${BUDGETS.maxEntryJsKb} KB)`
    );
  }
  console.log(
    `- Largest JS chunk: ${largestChunk.file} ${toKb(largestChunk.bytes)} KB (budget ${BUDGETS.maxChunkJsKb} KB)`
  );

  if (violations.length > 0) {
    console.error('\nBundle budget violations:');
    violations.forEach((violation) => console.error(`- ${violation}`));
    process.exit(1);
  }

  console.log('\nBundle budgets passed.');
}

main().catch((error) => {
  console.error(`Bundle budget check failed: ${error.message}`);
  process.exit(1);
});
