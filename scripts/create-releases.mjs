// Legt für jede Version aus src/lib/changelog.json, die es auf GitHub noch nicht gibt,
// Tag und Release an. Läuft im Workflow .github/workflows/release.yml (braucht die gh-CLI).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const releases = JSON.parse(readFileSync('src/lib/changelog.json', 'utf8'));
const head = process.env.GITHUB_SHA;
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const existing = new Set(
  JSON.parse(gh('release', 'list', '--limit', '200', '--json', 'tagName')).map((r) => r.tagName),
);

// Älteste zuerst, damit die Releases in der richtigen Reihenfolge entstehen
for (const [i, r] of [...releases].reverse().entries()) {
  const tag = `v${r.version}`;
  if (existing.has(tag)) {
    console.log(`${tag}: gibt es schon`);
    continue;
  }
  const isNewest = i === releases.length - 1;
  const target = r.commit ?? (isNewest ? head : null);
  if (!target) {
    console.log(`${tag}: kein Commit hinterlegt – übersprungen`);
    continue;
  }
  const notes = `**${r.date}**\n\n${r.changes.map((c) => `- ${c}`).join('\n')}`;
  const args = ['release', 'create', tag, '--target', target, '--title', `TimeTrack ${r.version}`, '--notes', notes];
  if (r.version.startsWith('0.')) args.push('--prerelease');
  if (!isNewest) args.push('--latest=false');
  gh(...args);
  console.log(`${tag}: erstellt (${target.slice(0, 7)})`);
}
