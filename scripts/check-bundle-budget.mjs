import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');

const KB = 1024;
const BUDGETS = {
  maxInitialJsKb: Number(process.env.BUNDLE_BUDGET_INITIAL_JS_KB || 300),
  maxEntryJsKb: Number(process.env.BUNDLE_BUDGET_ENTRY_JS_KB || 180),
  maxAsyncChunkJsKb: Number(process.env.BUNDLE_BUDGET_ASYNC_CHUNK_JS_KB || 800),
};

function toKb(bytes) {
  return Number((bytes / KB).toFixed(1));
}

async function getStartupScriptNames() {
  const html = await readFile(INDEX_HTML, 'utf8');
  const entryMatch = html.match(/<script\s+type="module"\s+crossorigin\s+src="\/assets\/([^"]+\.js)">/i);
  const preloadMatches = Array.from(
    html.matchAll(/<link\s+rel="modulepreload"\s+crossorigin\s+href="\/assets\/([^"]+\.js)">/gi)
  ).map((match) => match[1]);

  const startupScripts = new Set(preloadMatches);
  if (entryMatch?.[1]) {
    startupScripts.add(entryMatch[1]);
  }

  return {
    entryScript: entryMatch?.[1] || null,
    startupScripts,
  };
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
  const [{ entryScript, startupScripts }, assets] = await Promise.all([
    getStartupScriptNames(),
    collectJsAssets(),
  ]);

  if (assets.length === 0) {
    throw new Error('No JS assets found in dist/assets. Build output is unexpected.');
  }

  const entryAsset = entryScript ? assets.find((asset) => asset.file === entryScript) : null;
  const initialAssets = assets.filter((asset) => startupScripts.has(asset.file));
  const asyncAssets = assets.filter((asset) => !startupScripts.has(asset.file));
  const totalInitialJsBytes = initialAssets.reduce((sum, asset) => sum + asset.bytes, 0);
  const largestAsyncChunk = asyncAssets[0] || null;

  const violations = [];

  if (toKb(totalInitialJsBytes) > BUDGETS.maxInitialJsKb) {
    violations.push(
      `Initial JS size ${toKb(totalInitialJsBytes)} KB exceeds budget ${BUDGETS.maxInitialJsKb} KB`
    );
  }

  if (entryAsset && toKb(entryAsset.bytes) > BUDGETS.maxEntryJsKb) {
    violations.push(
      `Entry JS size ${entryAsset.file} (${toKb(entryAsset.bytes)} KB) exceeds budget ${BUDGETS.maxEntryJsKb} KB`
    );
  }

  if (largestAsyncChunk && toKb(largestAsyncChunk.bytes) > BUDGETS.maxAsyncChunkJsKb) {
    violations.push(
      `Largest async JS chunk ${largestAsyncChunk.file} (${toKb(largestAsyncChunk.bytes)} KB) exceeds budget ${BUDGETS.maxAsyncChunkJsKb} KB`
    );
  }

  console.log('Bundle budget report');
  console.log(`- Initial JS: ${toKb(totalInitialJsBytes)} KB (budget ${BUDGETS.maxInitialJsKb} KB)`);
  if (entryAsset) {
    console.log(
      `- Entry JS: ${entryAsset.file} ${toKb(entryAsset.bytes)} KB (budget ${BUDGETS.maxEntryJsKb} KB)`
    );
  }
  if (largestAsyncChunk) {
    console.log(
      `- Largest async JS chunk: ${largestAsyncChunk.file} ${toKb(largestAsyncChunk.bytes)} KB (budget ${BUDGETS.maxAsyncChunkJsKb} KB)`
    );
  }
  if (initialAssets.length > 0) {
    console.log('- Startup scripts considered:');
    initialAssets.forEach((asset) => {
      console.log(`  - ${asset.file} (${toKb(asset.bytes)} KB)`);
    });
  }
  if (asyncAssets.length > 0) {
    console.log('- Top async chunks:');
    asyncAssets.slice(0, 5).forEach((asset) => {
      console.log(`  - ${asset.file} (${toKb(asset.bytes)} KB)`);
    });
  }

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
