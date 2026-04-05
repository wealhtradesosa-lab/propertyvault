import { describe, it, expect } from 'vitest';

// Recreate conversion functions as they exist in App.jsx
// These test the LOGIC, not the React component

const TRM = 4248; // Typical COP/USD rate

function makeConverters(propCurrency, viewCurrency, xRate) {
  const gConv = (v) => {
    if (viewCurrency === propCurrency || xRate <= 1) return v;
    if (viewCurrency === 'USD' && propCurrency !== 'USD') return v / xRate;
    if (viewCurrency !== 'USD' && propCurrency === 'USD') return v * xRate;
    return v;
  };

  const stmtToPC = (v) => propCurrency !== 'USD' && xRate > 1 ? v * xRate : v;

  const dConv = gConv; // Same logic inside dashboard

  const sConv = (v) => {
    if (!v) return 0;
    const inPC = propCurrency !== 'USD' && xRate > 1 ? v * xRate : v;
    return gConv(inPC);
  };

  return { gConv, stmtToPC, dConv, sConv };
}

describe('Currency Conversion — Orlando (USD property)', () => {
  const { gConv, stmtToPC, dConv, sConv } = makeConverters('USD', 'USD', TRM);

  it('stmtToPC: USD stays USD', () => {
    expect(stmtToPC(5000)).toBe(5000);
  });
  it('dConv: USD→USD is identity', () => {
    expect(dConv(5000)).toBe(5000);
  });
  it('sConv: statement USD→view USD', () => {
    expect(sConv(5000)).toBe(5000);
  });
});

describe('Currency Conversion — Puerto Madero (COP property, view USD)', () => {
  const { gConv, stmtToPC, dConv, sConv } = makeConverters('COP', 'USD', TRM);

  it('stmtToPC: USD→COP', () => {
    expect(stmtToPC(5000)).toBe(5000 * TRM);
  });
  it('dConv: COP→USD divides by rate', () => {
    expect(dConv(5000 * TRM)).toBeCloseTo(5000, 0);
  });
  it('sConv: statement USD→view USD (roundtrip)', () => {
    // USD → *TRM → COP → /TRM → USD
    expect(sConv(5000)).toBeCloseTo(5000, 0);
  });
  it('sConv: zero returns zero', () => {
    expect(sConv(0)).toBe(0);
  });
});

describe('Currency Conversion — Puerto Madero (COP property, view COP)', () => {
  const { gConv, stmtToPC, sConv } = makeConverters('COP', 'COP', TRM);

  it('stmtToPC: USD→COP', () => {
    expect(stmtToPC(5000)).toBe(5000 * TRM);
  });
  it('gConv: COP→COP is identity', () => {
    expect(gConv(21240000)).toBe(21240000);
  });
  it('sConv: statement USD→view COP', () => {
    expect(sConv(5000)).toBe(5000 * TRM);
  });
});

describe('No double conversion in charts', () => {
  // The bug was: data converted via dConv, then formatter calls dConv again
  const xRate = TRM;
  const propCurrency = 'COP';
  const viewCurrency = 'USD';

  const stmtToPC = (v) => propCurrency !== 'USD' && xRate > 1 ? v * xRate : v;
  const dConv = (v) => {
    if (viewCurrency === propCurrency || xRate <= 1) return v;
    if (viewCurrency === 'USD' && propCurrency !== 'USD') return v / xRate;
    return v;
  };

  it('data in propCurrency + one dConv = correct', () => {
    const rev = stmtToPC(4983); // = 21,167,784 COP
    const displayed = dConv(rev); // = 4,983 USD
    expect(displayed).toBeCloseTo(4983, 0);
  });

  it('double dConv = WRONG (the bug we fixed)', () => {
    const rev = stmtToPC(4983);
    const doubleConverted = dConv(dConv(rev)); // BUG: converts twice
    expect(doubleConverted).not.toBeCloseTo(4983, 0); // This should NOT equal 4983
  });
});

describe('Escrow Detection', () => {
  function isEscrowCovered(e, mort) {
    if (mort.includesTaxes && (e.category === 'taxes' || e.category === 'predial')) return true;
    if (mort.includesInsurance && e.category === 'insurance') return true;
    return false;
  }
  function isMortgageExp(e) {
    return e.category === 'mortgage_pay' || /hipoteca|mortgage|debt.service/i.test(e.concept || '');
  }
  function isExcludedFromOpEx(e, mort) {
    return isMortgageExp(e) || isEscrowCovered(e, mort);
  }

  const mortWithEscrow = { includesTaxes: true, includesInsurance: true };
  const mortNoEscrow = { includesTaxes: false, includesInsurance: false };

  it('excludes taxes when mortgage includes taxes', () => {
    expect(isExcludedFromOpEx({ category: 'taxes', concept: '' }, mortWithEscrow)).toBe(true);
  });
  it('excludes insurance when mortgage includes insurance', () => {
    expect(isExcludedFromOpEx({ category: 'insurance', concept: '' }, mortWithEscrow)).toBe(true);
  });
  it('includes taxes when mortgage does NOT include taxes', () => {
    expect(isExcludedFromOpEx({ category: 'taxes', concept: '' }, mortNoEscrow)).toBe(false);
  });
  it('always excludes mortgage_pay category', () => {
    expect(isExcludedFromOpEx({ category: 'mortgage_pay', concept: '' }, mortNoEscrow)).toBe(true);
  });
  it('excludes by concept name (hipoteca)', () => {
    expect(isExcludedFromOpEx({ category: 'otros', concept: 'Pago hipoteca' }, mortNoEscrow)).toBe(true);
  });
  it('excludes predial when taxes in escrow', () => {
    expect(isExcludedFromOpEx({ category: 'predial', concept: '' }, mortWithEscrow)).toBe(true);
  });
  it('does NOT exclude electricity', () => {
    expect(isExcludedFromOpEx({ category: 'electricity', concept: '' }, mortWithEscrow)).toBe(false);
  });
});

describe('P&L Formula', () => {
  it('NOI = Revenue - Total OpEx', () => {
    const revenue = 5000;
    const pmExpenses = 1500; // commission + utilities from PM
    const ownerExpenses = 300; // insurance, HOA from owner
    const totalOpEx = pmExpenses + ownerExpenses;
    const noi = revenue - totalOpEx;
    expect(noi).toBe(3200);
  });

  it('Cash Flow = NOI - Debt Service', () => {
    const noi = 3200;
    const mortgage = 3486;
    const cashFlow = noi - mortgage;
    expect(cashFlow).toBe(-286);
    expect(cashFlow).toBeLessThan(0); // negative cash flow
  });

  it('Cash Flow <= NOI always', () => {
    const noi = 3200;
    const mortgage = 3486;
    const cashFlow = noi - mortgage;
    expect(cashFlow).toBeLessThanOrEqual(noi);
  });

  it('Cash Flow = NOI when no mortgage', () => {
    const noi = 3200;
    const mortgage = 0;
    const cashFlow = noi - mortgage;
    expect(cashFlow).toBe(noi);
  });

  it('DSCR = NOI / Debt Service', () => {
    const noi = 3200;
    const debtService = 3486;
    const dscr = noi / debtService;
    expect(dscr).toBeCloseTo(0.918, 2);
    expect(dscr).toBeLessThan(1); // property doesn't cover mortgage
  });
});

describe('eFreq helper', () => {
  function eFreq(e) {
    if (e.frequency) return e.frequency;
    if (e.type === 'fixed') return 'monthly';
    return 'once';
  }

  it('explicit frequency wins', () => {
    expect(eFreq({ frequency: 'annual', type: 'fixed' })).toBe('annual');
  });
  it('fixed without frequency = monthly', () => {
    expect(eFreq({ type: 'fixed' })).toBe('monthly');
  });
  it('no frequency no type = once', () => {
    expect(eFreq({})).toBe('once');
  });
  it('purchase type = once', () => {
    expect(eFreq({ type: 'additional' })).toBe('once');
  });
});

describe('Trial Logic', () => {
  it('calculates remaining days correctly', () => {
    const now = Date.now();
    const startDate = new Date(now - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    const elapsed = Math.floor((now - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = 14 - elapsed;
    expect(remaining).toBe(9);
  });

  it('trial expired after 14 days', () => {
    const now = Date.now();
    const startDate = new Date(now - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const elapsed = Math.floor((now - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = 14 - elapsed;
    expect(remaining).toBeLessThanOrEqual(0);
  });

  it('trial active on day 1', () => {
    const now = Date.now();
    const startDate = new Date(now); // just now
    const elapsed = Math.floor((now - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = 14 - elapsed;
    expect(remaining).toBe(14);
  });
});

describe('Mortgage Amortization', () => {
  it('calculates P&I from balance and rate', () => {
    const balance = 359703.89;
    const rate = 7.25;
    const termYears = 30;
    const mr = rate / 100 / 12;
    const nm = termYears * 12;
    const pi = balance * (mr * Math.pow(1 + mr, nm)) / (Math.pow(1 + mr, nm) - 1);
    expect(pi).toBeCloseTo(2454, 0); // ~$2,454/mo P&I
  });

  it('calculates interest for current month', () => {
    const balance = 359703.89;
    const rate = 7.25;
    const monthlyInterest = balance * (rate / 100 / 12);
    expect(monthlyInterest).toBeCloseTo(2173, 0); // ~$2,173
  });

  it('principal = P&I - interest', () => {
    const balance = 359703.89;
    const rate = 7.25;
    const mr = rate / 100 / 12;
    const nm = 30 * 12;
    const pi = balance * (mr * Math.pow(1 + mr, nm)) / (Math.pow(1 + mr, nm) - 1);
    const interest = balance * mr;
    const principal = pi - interest;
    expect(principal).toBeGreaterThan(200);
    expect(principal).toBeLessThan(500);
  });

  it('escrow = total - P&I', () => {
    const total = 3485.97;
    const pi = 2495.06;
    const escrow = total - pi;
    expect(escrow).toBeCloseTo(990.91, 1);
  });
});
