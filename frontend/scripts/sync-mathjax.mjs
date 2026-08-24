import { copyFile, cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(
  projectRoot,
  'node_modules/@mathjax/mathjax-tex-font/tex-mml-svg-mathjax-tex.js'
);
const destination = resolve(projectRoot, 'public/vendor/mathjax/tex-svg.js');
const mathLiveFontsSource = resolve(projectRoot, 'node_modules/mathlive/fonts');
const mathLiveFontsDestination = resolve(projectRoot, 'public/vendor/mathlive/fonts');

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
await cp(mathLiveFontsSource, mathLiveFontsDestination, { recursive: true });

console.log('MathJax bundle and MathLive fonts synced.');
