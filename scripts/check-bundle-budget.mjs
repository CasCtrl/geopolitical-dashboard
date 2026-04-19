import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');
const MANIFEST_PATH = path.join(DIST_DIR, '.vite', 'manifest.json');

const KB = 1024;
const BUDGETS = {
  maxInitialJsKb: Number(process.env.BUNDLE_BUDGET_INITIAL_JS_KB || 1600),
  maxEntryJsKb: Number(process.env.BUNDLE_BUDGET_ENTRY_JS_KB || 450),
  maxAsyncChunkJsKb: Number(process.env.BUNDLE_BUDGET_ASYNC_CHUNK_JS_KB || 900),
};

function toKb(bytes) {
  return Number((bytes / KB).toFixed(1));
}

async function getEntryScriptName() {
  const html = await readFile(INDEX_HTML, 'utf8');
  const entryMatch = html.match(/<script\s+type="module"\s+crossorigin\s+src="\/assets\/([^"]+\.js)">/i);
  return entryMatch?.[1] || null;
}

async function readManifest() {
  const manifestContent = await readFile(MANIFEST_PATH, 'utf8');
  return JSON.parse(manifestContent);
}

function collectInitialImports(manifest, entryKey) {
  const visited = new Set();
  const stack = [entryKey];
  const files = new Set();

  while (stack.length > 0) {
    const key = stack.pop();
    if (!key || visited.has(key)) {
      continue;
    }

    visited.add(key);
    const chunk = manifest[key];
    if (!chunk) {
      continue;
    }

    if (chunk.file && chunk.file.endsWith('.js')) {
      files.add(path.basename(chunk.file));
    }

    for (const imported of chunk.imports || []) {
      stack.push(imported);
    }
  }

  return files;
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
  const [entryScript, assets, manifest] = await Promise.all([
    getEntryScriptName(),
    collectJsAssets(),
    readManifest(),
  ]);

  if (assets.length === 0) {
    throw new Error('No JS assets found in dist/assets. Build output is unexpected.');
  }

  const entryAsset = entryScript ? assets.find((asset) => asset.file === entryScript) : null;
  const entryManifestKey = Object.keys(manifest).find((key) => manifest[key]?.isEntry);

  if (!entryManifestKey) {
    throw new Error('No entry chunk found in manifest.');
  }

  const initialFiles = collectInitialImports(manifest, entryManifestKey);
  const initialAssets = assets.filter((asset) => initialFiles.has(asset.file));
  const asyncAssets = assets.filter((asset) => !initialFiles.has(asset.file));
  const totalInitialJsBytes = initialAssets.reduce((sum, asset) => sum + asset.bytes, 0);
  const largestAsyncChunk = asyncAssets.sort((a, b) => b.bytes - a.bytes)[0] || null;

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
