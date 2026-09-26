import { describe, expect, it } from 'vitest';
import { releasesSince, type Release } from './changelog';

const log: Release[] = [
  { version: '1.2.0', date: '', changes: ['c'] },
  { version: '1.1.0', date: '', changes: ['b'] },
  { version: '1.0.0', date: '', changes: ['a'] },
];

describe('releasesSince', () => {
  it('zeigt bei Erstinstallation nichts', () => expect(releasesSince(null, log)).toEqual([]));
  it('zeigt nichts, wenn die Version schon gesehen wurde', () => expect(releasesSince('1.2.0', log)).toEqual([]));
  it('zeigt alle Versionen seit der zuletzt gesehenen', () =>
    expect(releasesSince('1.0.0', log).map((r) => r.version)).toEqual(['1.2.0', '1.1.0']));
  it('zeigt bei unbekannter Version nur die neueste', () =>
    expect(releasesSince('0.9', log).map((r) => r.version)).toEqual(['1.2.0']));
});
