import { describe, it, expect } from 'vitest';
import { fm, fmCurrency, fmDate, pct, getCats, getTerms, ADMIN_EMAILS } from '../lib/constants';

describe('fm — number formatter', () => {
  it('formats positive numbers', () => {
    expect(fm(1234)).toBe('$1,234');
    expect(fm(0)).toBe('$0');
    expect(fm(999999)).toBe('$999,999');
  });
  it('formats negative numbers with sign', () => {
    expect(fm(-500)).toMatch(/-/);
    expect(fm(-500)).toMatch(/500/);
  });
  it('handles large numbers', () => {
    expect(fm(1500000)).toMatch(/1/);
  });
  it('handles decimals', () => {
    expect(fm(1234.56)).toMatch(/1,23[45]/); // rounds
  });
});

describe('fmCurrency — currency-aware formatter', () => {
  it('formats USD', () => {
    const r = fmCurrency(1000, 'USD');
    expect(r).toMatch(/1,000|\$1,000/);
  });
  it('formats COP', () => {
    const r = fmCurrency(21000000, 'COP');
    expect(r).toMatch(/21/);
  });
  it('formats EUR', () => {
    const r = fmCurrency(500, 'EUR');
    expect(r).toMatch(/500/);
  });
  it('handles zero', () => {
    expect(fmCurrency(0, 'USD')).toMatch(/0/);
  });
  it('preserves negative sign', () => {
    const r = fmCurrency(-3500, 'USD');
    expect(r).toMatch(/-/);
  });
});

describe('pct — percentage formatter', () => {
  it('formats percentages (a/b)', () => {
    expect(pct(75, 100)).toBe('75.0%');
    expect(pct(100, 100)).toBe('100.0%');
    expect(pct(0, 100)).toBe('0.0%');
    expect(pct(50, 0)).toBe('—'); // division by zero returns dash
  });
});

describe('getCats — bilingual categories', () => {
  it('returns US categories in English', () => {
    const cats = getCats('US', 'en');
    expect(cats.length).toBeGreaterThan(5);
    const insurance = cats.find(c => c.v === 'insurance');
    expect(insurance).toBeDefined();
    expect(insurance.l).toBeTruthy();
  });
  it('returns Colombia categories in Spanish', () => {
    const cats = getCats('CO', 'es');
    expect(cats.length).toBeGreaterThan(5);
    const predial = cats.find(c => c.v === 'predial');
    expect(predial).toBeDefined();
  });
  it('includes mortgage_pay category', () => {
    const cats = getCats('US', 'en');
    expect(cats.find(c => c.v === 'mortgage_pay')).toBeDefined();
  });
});

describe('ADMIN_EMAILS', () => {
  it('includes Santiago and Camilo', () => {
    expect(ADMIN_EMAILS).toContain('santiagososa1@me.com');
    expect(ADMIN_EMAILS).toContain('crestrepoz@gmail.com');
  });
});
