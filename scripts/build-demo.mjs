// Baut die Demo und fasst sie zu einer einzigen HTML-Datei zusammen.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] ?? 'dist-demo/timetrack-demo.html';
execSync('npx vite build --mode demo', { stdio: 'inherit' });

const assets = readdirSync('dist-demo/assets');
const js = assets.filter((f) => f.endsWith('.js'));
if (js.length !== 1) throw new Error(`Erwartet genau eine JS-Datei, gefunden: ${js.join(', ')}`);
const css = assets.filter((f) => f.endsWith('.css')).map((f) => readFileSync(`dist-demo/assets/${f}`, 'utf8')).join('\n');
const code = readFileSync(`dist-demo/assets/${js[0]}`, 'utf8').replace(/<\/script/gi, '<\\/script');
const icon = readFileSync('public/icon.svg', 'base64');

const html = `<title>TimeTrack</title>
<meta name="theme-color" content="#2563eb">
<link rel="icon" href="data:image/svg+xml;base64,${icon}">
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${code}
</script>
`;
writeFileSync(out, html);
console.log(`${out}: ${(html.length / 1024).toFixed(0)} KB`);
