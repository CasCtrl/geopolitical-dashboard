import fs from 'fs';
import path from 'path';

const root = process.cwd();

const requiredFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/security-audit.yml',
  '.github/workflows/release.yml',
  '.github/CODEOWNERS',
  '.github/pull_request_template.md',
  '.github/BRANCH_PROTECTION.md',
  '.github/GITHUB_SETTINGS_CHECKLIST.md',
  'server/openapi.yaml',
  'playwright.config.ts',
  'e2e/smoke.spec.ts',
];

const requiredStatusChecks = ['CI / validate', 'CI / e2e-smoke'];

function readText(relPath) {
  const abs = path.join(root, relPath);
  return fs.readFileSync(abs, 'utf8');
}

function exists(relPath) {
  const abs = path.join(root, relPath);
  return fs.existsSync(abs);
}

function assert(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

const failures = [];

for (const relPath of requiredFiles) {
  assert(exists(relPath), `Missing required file: ${relPath}`, failures);
}

if (exists('package.json')) {
  const pkg = JSON.parse(readText('package.json'));
  const scripts = pkg.scripts || {};
  const requiredScripts = [
    'ci',
    'test:ci',
    'test:e2e:ci',
    'playwright:install',
  ];

  for (const scriptName of requiredScripts) {
    assert(Boolean(scripts[scriptName]), `Missing package script: ${scriptName}`, failures);
  }
}

if (exists('.github/BRANCH_PROTECTION.md')) {
  const content = readText('.github/BRANCH_PROTECTION.md');
  for (const check of requiredStatusChecks) {
    assert(
      content.includes(check),
      `Branch protection doc missing required status check name: ${check}`,
      failures,
    );
  }
}

if (exists('.github/workflows/ci.yml')) {
  const ciContent = readText('.github/workflows/ci.yml');
  assert(ciContent.includes('validate:'), 'CI workflow missing validate job', failures);
  assert(ciContent.includes('e2e-smoke:'), 'CI workflow missing e2e-smoke job', failures);
}

if (failures.length > 0) {
  console.error('Governance preflight failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Governance preflight passed.');
