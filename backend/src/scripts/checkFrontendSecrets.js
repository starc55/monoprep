import { readFile, readdir } from 'fs/promises';
import path from 'path';

const frontendRoot = path.resolve(process.cwd(), '..', 'frontend');
const roots = [
  path.join(frontendRoot, 'src'),
  path.join(frontendRoot, 'dist')
];
const forbiddenPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /\bsb_secret_[A-Za-z0-9_-]+\b/,
  /["']service_role["']/
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const files = (await Promise.all(roots.map(collectFiles))).flat();
  const leaks = [];

  for (const file of files) {
    const contents = await readFile(file, 'utf8').catch(() => '');
    if (forbiddenPatterns.some((pattern) => pattern.test(contents))) {
      leaks.push(path.relative(frontendRoot, file));
    }
  }

  if (leaks.length) {
    throw new Error(`Backend-only Supabase credentials found in frontend files: ${leaks.join(', ')}`);
  }

  console.log(`Frontend secret scan passed (${files.length} files checked).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
