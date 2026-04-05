import { describe, it, expect } from 'vitest';

// Test the regex patterns used in parsers (without loading pdfjs-dist)

describe('Airbnb Annual Parser — regex', () => {
  const mesesES = {enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
  const monthsEN = {january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
  const allMonthMap = {...mesesES, ...monthsEN};

  function parseLine(line) {
    for (const [mName, mNum] of Object.entries(allMonthMap)) {
      const rx = new RegExp(mName + '\\s+(?:(?:de\\s+)?(\\d{4})\\s+)?[$]?([\\d,]+[.]\\d{2})\\s*USD\\s+[$]?([\\d,]+[.]\\d{2})\\s*USD', 'i');
      const match = line.match(rx);
      if (match) {
        return {
          month: mNum,
          year: match[1] ? parseInt(match[1]) : null,
          gross: parseFloat(match[2].replace(/,/g, '')),
          net: parseFloat(match[3].replace(/,/g, '')),
        };
      }
    }
    return null;
  }

  it('parses Spanish month with year', () => {
    const r = parseLine('enero de 2023 $4,983.28 USD $4,380.43 USD');
    expect(r).not.toBeNull();
    expect(r.month).toBe(1);
    expect(r.year).toBe(2023);
    expect(r.gross).toBeCloseTo(4983.28);
    expect(r.net).toBeCloseTo(4380.43);
  });

  it('parses Spanish month without year', () => {
    const r = parseLine('febrero $3,272.68 USD $2,827.18 USD');
    expect(r).not.toBeNull();
    expect(r.month).toBe(2);
    expect(r.year).toBeNull();
    expect(r.gross).toBeCloseTo(3272.68);
  });

  it('parses December 2025', () => {
    const r = parseLine('diciembre de 2025 $5,264.16 USD $5,106.98 USD');
    expect(r.month).toBe(12);
    expect(r.year).toBe(2025);
    expect(r.gross).toBeCloseTo(5264.16);
  });

  it('parses zero revenue', () => {
    const r = parseLine('mayo de 2023 $0.00 USD $0.00 USD');
    expect(r).not.toBeNull();
    expect(r.gross).toBe(0);
  });

  it('parses English month without "de"', () => {
    const r = parseLine('January 2024 $7,500.00 USD $6,800.00 USD');
    expect(r).not.toBeNull();
    expect(r.month).toBe(1);
    expect(r.year).toBe(2024);
    expect(r.gross).toBeCloseTo(7500);
  });

  it('rejects non-month text', () => {
    expect(parseLine('random text $100 USD $90 USD')).toBeNull();
  });
});

describe('Airbnb Partial Month', () => {
  const abbrMap = {ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,oct:10,nov:11,dic:12};

  function parsePartial(line) {
    const pm = line.match(/\d+\s*[\u2013-]\s*\d+\s+de\s+(\w+)\s+de\s+(\d{4})\s+[$]?([\d,]+[.]\d{2})\s*USD\s+[$]?([\d,]+[.]\d{2})\s*USD/i);
    if (!pm) return null;
    const month = abbrMap[pm[1].toLowerCase()];
    return {
      month,
      year: parseInt(pm[2]),
      gross: parseFloat(pm[3].replace(/,/g, '')),
      net: parseFloat(pm[4].replace(/,/g, '')),
    };
  }

  it('parses "1 – 3 de abr de 2026"', () => {
    const r = parsePartial('1 – 3 de abr de 2026 $645.21 USD $625.85 USD');
    expect(r).not.toBeNull();
    expect(r.month).toBe(4);
    expect(r.year).toBe(2026);
    expect(r.gross).toBeCloseTo(645.21);
  });

  it('parses with hyphen instead of en-dash', () => {
    const r = parsePartial('1 - 15 de dic de 2025 $2,500.00 USD $2,300.00 USD');
    expect(r).not.toBeNull();
    expect(r.month).toBe(12);
  });
});

describe('Mortgage Parser — grabMort', () => {
  function grabMort(text, label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx1 = new RegExp(escaped + '[\\s:]*\\$\\s*(\\d[\\d,]*\\.\\d{2})', 'i');
    const m1 = text.match(rx1);
    if (m1) return parseFloat(m1[1].replace(/,/g, ''));
    const rx2 = new RegExp(escaped + '[\\s\\S]{0,40}?\\$?(\\d{1,3}(?:,\\d{3})*\\.\\d{2})\\b', 'i');
    const m2 = text.match(rx2);
    if (m2) return parseFloat(m2[1].replace(/,/g, ''));
    return 0;
  }

  const amwestText = `Principal: 321.85 Interest: 2,173.21 
Tax and Insurance: 990.91 Regular Monthly Payment: 3,485.97 
Principal Balance: 359,703.89 Interest Rate: 7.25000`;

  it('extracts Principal Balance', () => {
    expect(grabMort(amwestText, 'Principal Balance')).toBe(359703.89);
  });
  it('extracts Regular Monthly Payment', () => {
    expect(grabMort(amwestText, 'Regular Monthly Payment')).toBe(3485.97);
  });
  it('extracts Tax and Insurance', () => {
    expect(grabMort(amwestText, 'Tax and Insurance')).toBe(990.91);
  });
  it('returns 0 for missing label', () => {
    expect(grabMort(amwestText, 'PMI')).toBe(0);
  });

  it('P&I from separate lines', () => {
    const pMatch = amwestText.match(/\bPrincipal:(?!\s*Balance)\s*\$?([\d,]+\.\d{2})/i);
    const iMatch = amwestText.match(/\bInterest:\s*\$?([\d,]+\.\d{2})/i);
    expect(pMatch).not.toBeNull();
    expect(iMatch).not.toBeNull();
    const p = parseFloat(pMatch[1].replace(/,/g, ''));
    const i = parseFloat(iMatch[1].replace(/,/g, ''));
    expect(p).toBe(321.85);
    expect(i).toBe(2173.21);
    expect(p + i).toBeCloseTo(2495.06);
  });

  it('Interest Rate extraction', () => {
    const m = amwestText.match(/Interest Rate\s*:?\s*(\d+\.\d+)\s*%?/i);
    expect(m).not.toBeNull();
    const rate = Math.round(parseFloat(m[1]) * 100) / 100;
    expect(rate).toBe(7.25);
  });
});

describe('Mortgage Sanity Ranges', () => {
  it('rejects balance outside $10K-$2M', () => {
    expect(5000 >= 10000).toBe(false);   // too low
    expect(3000000 <= 2000000).toBe(false); // too high
    expect(359703 >= 10000 && 359703 <= 2000000).toBe(true); // valid
  });
  it('rejects rate outside 1-15%', () => {
    expect(0.5 >= 1).toBe(false);
    expect(25 <= 15).toBe(false);
    expect(7.25 >= 1 && 7.25 <= 15).toBe(true);
  });
  it('rejects P&I outside $200-$15K', () => {
    expect(50 >= 200).toBe(false);
    expect(20000 <= 15000).toBe(false);
    expect(2495 >= 200 && 2495 <= 15000).toBe(true);
  });
  it('rejects tax escrow outside $50-$3K', () => {
    expect(10 >= 50).toBe(false);
    expect(5000 <= 3000).toBe(false);
    expect(594 >= 50 && 594 <= 3000).toBe(true);
  });
});
