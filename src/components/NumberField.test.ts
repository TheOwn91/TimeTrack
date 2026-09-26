import { describe, expect, it } from 'vitest';
import { parseDecimal } from './NumberField';

describe('parseDecimal', () => {
  it('versteht Komma und Punkt', () => {
    expect(parseDecimal('22,50')).toBe(22.5);
    expect(parseDecimal('22.5')).toBe(22.5);
    expect(parseDecimal('8')).toBe(8);
    expect(parseDecimal('22,')).toBe(22);
  });
  it('liefert null für leere oder ungültige Eingaben', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal(',')).toBeNull();
    expect(parseDecimal('1,2,3')).toBeNull();
    expect(parseDecimal('-3')).toBeNull();
  });
  it('erlaubt negative Werte nur auf Wunsch', () => {
    expect(parseDecimal('-3,5', true)).toBe(-3.5);
    expect(parseDecimal('-', true)).toBeNull();
  });
});
