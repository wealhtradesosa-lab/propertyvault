import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ═══ SHARED HELPERS ═══
const monthNames = {January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12};
const monthAbbrev = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};

function extractDate(text) {
  const full = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  if (full) return { year: parseInt(full[2]), month: monthNames[full[1].charAt(0).toUpperCase()+full[1].slice(1).toLowerCase()] };
  const abbr = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i);
  if (abbr) return { year: parseInt(abbr[2]), month: monthAbbrev[abbr[1].charAt(0).toUpperCase()+abbr[1].slice(1,3).toLowerCase()] };
  const mesesFull={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
  const spanishFull = text.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(\d{4})/i);
  if (spanishFull) return { year: parseInt(spanishFull[2]), month: mesesFull[spanishFull[1].toLowerCase()] };
  const slashed = text.match(/(1[0-2]|0?[1-9])\/(\d{4})/);
  if (slashed) return { year: parseInt(slashed[2]), month: parseInt(slashed[1]) };
  const iso = text.match(/(\d{4})-(1[0-2]|0[1-9])/);
  if (iso) return { year: parseInt(iso[1]), month: parseInt(iso[2]) };
  const stmtDate = text.match(/(?:Statement|Report|Billing)\s*Date\s*:?\s*(\d{1,2})\/\d{1,2}\/(\d{4})/i);
  if (stmtDate) return { year: parseInt(stmtDate[2]), month: parseInt(stmtDate[1]) };
  return null;
}

function grab(text, label) {
  const rx = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]{0,40}?-?\\$?(\\d[\\d,]*\\.\\d{2})', 'i');
  const m = text.match(rx);
  return m ? parseFloat(m[1].replace(/,/g, '')) : 0;
}

function grabAny(text, labels) {
  for (const l of labels) { const v = grab(text, l); if (v > 0) return v; }
  return 0;
}

function nights(text) {
  let n = 0;
  // English: "15 nights"
  const nm = text.match(/(\d+)\s*nights?/gi);
  if (nm) nm.forEach(m => { const v = parseInt(m); if (v > 0 && v < 366) n += v; });
  if (n > 0) return Math.min(n, 365);
  // Spanish: "Noches reservadas" — grab FIRST number directly after
  const nrDirect = text.match(/[Nn]oches\s*reservadas\s*(\d+)/);
  if (nrDirect) return Math.min(parseInt(nrDirect[1]), 365);
  // Spanish: "X noches" — take FIRST match only
  const sn = text.match(/(\d+)\s*noches?\b/i);
  if (sn) { const v = parseInt(sn[1]); if (v > 0 && v <= 365) return v; }
  return 0;
}

function reservations(text) {
  const rm = text.match(/(\d+)\s*reservations?/i);
  if (rm) return parseInt(rm[1]);
  const rs = text.match(/(\d+)\s*reservas?/i);
  if (rs) return parseInt(rs[1]);
  const re = text.match(/(\d+)\s*reservaciones?/i);
  if (re) return parseInt(re[1]);
  return (text.match(/Reservation\s*#/gi) || []).length || (text.match(/Booking\s*#/gi) || []).length;
}

function result(d) {
  const net = d.net || Math.max(0, (d.revenue||0) - (d.commission||0) - (d.duke||0) - (d.water||0) - (d.hoa||0) - (d.maintenance||0) - (d.vendor||0));
  return { year:d.year, month:d.month, revenue:d.revenue||0, commission:d.commission||0, duke:d.duke||0, water:d.water||0, hoa:d.hoa||0, maintenance:d.maintenance||0, vendor:d.vendor||0, net, nights:d.nights||0, reservations:d.reservations||0, pool:d.pool||0, roomCharge:d.roomCharge||d.revenue||0, format:d.format, ...(d.sourceType?{sourceType:d.sourceType}:{}) };
}

// ═══ FORMAT PARSERS ═══

function parseIHM(t) {
  const ym = t.match(/Year:\s*(\d{4})\s*Period:\s*(\d+)/);
  if (!ym || parseInt(ym[2]) === 0) return { error: 'IHM: Period 0 o anual' };
  const year = parseInt(ym[1]), month = parseInt(ym[2]);
  const grabTS = (label) => {
    const rx = new RegExp('(?<!\\d{2}\\/\\d{2}\\/\\d{4}\\s*)' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s]*\\$?-?(\\d[\\d,]*\\.\\d{2})', 'i');
    const m = t.split('\n').join(' ').match(rx);
    return m ? parseFloat(m[1].replace(/,/g, '')) : 0;
  };
  const roomCharge = grabTS('Room Charge'), pool = grabTS('Pool Heat');
  return result({ year, month, revenue: roomCharge + pool, commission: grabTS('Commission Charge') || grabTS('Commission'), hoa: grabTS('HOA'), maintenance: grabTS('Maintenance Fee') || grabTS('Maintenance'), duke: grab(t,'Duke Energy') || grab(t,'Duke') || grab(t,'Electricity'), water: grab(t,'Toho Water') || grab(t,'Toho') || grab(t,'Water Monthly'), vendor: Math.max(0, (grabTS('Vendor Bills') || grabTS('Vendor')) - (grab(t,'Duke Energy') || grab(t,'Duke') || grab(t,'Electricity')) - (grab(t,'Toho Water') || grab(t,'Toho') || grab(t,'Water Monthly'))), net: grab(t,'ACH Payment') || grabTS('Payments To Owner') || grab(t,'Payment made to Owner'), pool, roomCharge, nights: nights(t), reservations: reservations(t), format: 'IHM' });
}

function parseHostU(t) {
  const d = extractDate(t);
  if (!d) return { error: 'Host U: no se encontró fecha' };
  const commission = grab(t, 'Management Fee');
  let mgmt = 0;
  const mm = t.match(/Management\s+-?\$([\d,]+\.\d{2})/);
  if (mm) mgmt = parseFloat(mm[1].replace(/,/g, ''));
  if (mgmt === commission) mgmt = 0;
  return result({ ...d, revenue: grab(t,'Rental Income'), commission, vendor: mgmt + grab(t,'Supplies'), net: grabAny(t, ['Payment due to owner','Ending balance','Statement balance','Property income']), nights: nights(t), reservations: reservations(t), format: 'HostU' });
}

function parseVacasa(t) {
  const d = extractDate(t);
  if (!d) return { error: 'Vacasa: no se encontró fecha' };
  return result({ ...d, revenue: grabAny(t, ['Gross Revenue','Rental Revenue','Gross Rental Income','Total Revenue','Rental Income','Room Revenue']), commission: grabAny(t, ['Management Fee','Vacasa Fee','Management Commission','Commission']), duke: grabAny(t, ['Electric','Electricity','Power','Utility']), water: grabAny(t, ['Water','Sewer','Water/Sewer']), hoa: grabAny(t, ['HOA','Association Fee','Community Fee']), maintenance: grabAny(t, ['Maintenance','Repairs','Repair']), vendor: grabAny(t, ['Cleaning Fee','Cleaning','Housekeeping']), net: grabAny(t, ['Net Owner Payout','Net to Owner','Owner Payout','Net Proceeds','Amount Due','Owner Payment']), nights: nights(t), reservations: reservations(t), format: 'Vacasa' });
}

function parseEvolve(t) {
  const d = extractDate(t);
  if (!d) return { error: 'Evolve: no se encontró fecha' };
  return result({ ...d, revenue: grabAny(t, ['Booking Revenue','Gross Revenue','Total Revenue','Rental Income','Nightly Revenue']), commission: grabAny(t, ['Evolve Fee','Service Fee','Evolve Commission','Management Fee','Platform Fee']), vendor: grabAny(t, ['Cleaning Fee','Cleaning']), net: grabAny(t, ['Host Payout','Net Payout','Owner Payout','Net to Host','Total Payout','Amount Paid']), nights: nights(t), reservations: reservations(t), format: 'Evolve' });
}

function parseGuesty(t) {
  const d = extractDate(t);
  if (!d) return { error: 'Guesty: no se encontró fecha' };
  return result({ ...d, revenue: grabAny(t, ['Total Revenue','Gross Revenue','Accommodation Revenue','Rental Income','Revenue Summary']), commission: grabAny(t, ['Management Fee','Guesty Fee','Channel Commission','Commission','PM Fee']), maintenance: grabAny(t, ['Maintenance','Repairs']), vendor: grabAny(t, ['Cleaning Fee','Cleaning','Turnover']), net: grabAny(t, ['Net Proceeds','Owner Payout','Net to Owner','Net Revenue','Amount Due']), nights: nights(t), reservations: reservations(t), format: 'Guesty' });
}

function parseAirbnb(t) {
  const d = extractDate(t);
  if (!d) return { error: 'Airbnb: no se encontró fecha' };
  const net = grabAny(t, ['Host Payout','Total Payout','You Earned','Net Earnings']);
  const commission = grabAny(t, ['Host Service Fee','Service Fee','Airbnb Fee','Host Fee']);
  const revenue = grabAny(t, ['Gross Earnings','Total Earnings','Accommodation','Nightly Price','Listing Revenue']) || (net + commission);
  return result({ ...d, revenue, commission, vendor: grabAny(t, ['Cleaning Fee','Cleaning']), net, nights: nights(t), reservations: reservations(t), format: 'Airbnb' });
}

function parseVrbo(t) {
  const d = extractDate(t);
  if (!d) return { error: 'Vrbo: no se encontró fecha' };
  return result({ ...d, revenue: grabAny(t, ['Rental Income','Gross Revenue','Total Revenue','Nightly Rate']), commission: grabAny(t, ['Commission','Service Fee','Vrbo Fee','HomeAway Fee']), net: grabAny(t, ['Owner Payout','Net Payout','Net to Owner','Amount Paid']), nights: nights(t), reservations: reservations(t), format: 'Vrbo' });
}

function parseGeneric(t) {
  const d = extractDate(t);
  if (!d) return { error: 'No se pudo identificar la fecha. Usa "Ingresar manualmente".' };

  // MASSIVE label lists — English + Spanish + abbreviations + variations
  const revLabels = ['Rental Income','Room Charge','Revenue','Total Income','Gross Revenue','Gross Income','Booking Revenue','Accommodation','Nightly Revenue','Rental Revenue','Gross Rental','Total Revenue','Room Revenue','Accommodation Revenue','Rental Earnings','Total Earnings','Ingreso Bruto','Ingreso por Renta','Ingresos','Renta Total','Ingreso Total','Total Ingresos','Booking Income','Lodging Revenue','Guest Payment','Total Rent','Rent Collected','Rent Revenue','Owner Revenue','Property Revenue','Gross Rent','Total Collections','Receipts','Rental Receipts','Collected Rent','Proceeds','Gross Proceeds'];
  const commLabels = ['Commission','Management Fee','Service Fee','PM Fee','Platform Fee','Manager Fee','Admin Fee','Property Management','Mgmt Fee','PM Commission','Manager Commission','Monthly Fee','Comisión','Comision','Fee de Administración','Cargo Administrativo','Honorarios','Administration Fee','Company Fee','Agency Fee','Listing Fee','Booking Fee','Channel Fee','Host Fee','OTA Commission'];
  const elecLabels = ['Electric','Electricity','Duke Energy','Power','FPL','TECO','Electricidad','Energía','Energia','Luz','Servicio Eléctrico','Utility','Energy','Electric Bill','Power Bill','EPM','Codensa','Enel','CFE'];
  const waterLabels = ['Water','Sewer','Toho','Water/Sewer','Agua','Acueducto','Alcantarillado','Water Bill','Water Utility','EPM Agua','Servicio de Agua'];
  const hoaLabels = ['HOA','Association','Community Fee','Cuota de Administración','Administración','Admin','Condo Fee','Strata','Body Corporate','Common Area','Cuota Mensual','Monthly Assessment','Assessment','Owners Association'];
  const maintLabels = ['Maintenance','Repairs','Repair','Mantenimiento','Reparación','Reparaciones','Fix','Handyman','Plumbing','HVAC','Landscaping','Pool Maintenance','Jardinería','Fumigación','Pest Control'];
  const vendLabels = ['Cleaning','Housekeeping','Turnover','Limpieza','Aseo','Laundry','Lavandería','Supplies','Amenities','Guest Supplies','Linen','Linens','Towels','Consumables'];
  const netLabels = ['Payment due','Payments To Owner','ACH Payment','Ending balance','Net to Owner','Owner Payout','Net Proceeds','Host Payout','Total Payout','Net Payment','Amount Due','Owner Payment','Disbursement','Owner Disbursement','Net Owner','Pago al Propietario','Pago Neto','Transferencia','Deposito','Depósito','Wire Transfer','Direct Deposit','Owner Net','Net Income','Owner Draw','Distribution','Remittance','Balance Due','Owner Balance','Net Rent','Pay to Owner','Payout'];

  const revenue = grabAny(t, revLabels);
  const commission = grabAny(t, commLabels);
  const duke = grabAny(t, elecLabels);
  const water = grabAny(t, waterLabels);
  const hoa = grabAny(t, hoaLabels);
  const maintenance = grabAny(t, maintLabels);
  const vendor = grabAny(t, vendLabels);
  let net = grabAny(t, netLabels);

  // SMART FALLBACK: if we found nothing, scan for the largest dollar amounts
  if (revenue === 0 && net === 0) {
    const amounts = [];
    const rx = /\$\s*([\d,]+\.\d{2})/g;
    let m;
    while ((m = rx.exec(t)) !== null) {
      const v = parseFloat(m[1].replace(/,/g, ''));
      if (v > 10 && v < 500000) amounts.push(v);
    }
    if (amounts.length >= 2) {
      amounts.sort((a, b) => b - a);
      // Assume largest = revenue, smallest positive at end = net
      return result({ ...d, revenue: amounts[0], net: amounts[amounts.length - 1], format: 'Generic (auto-detected)' });
    }
  }

  // If we found revenue but no net, estimate
  if (revenue > 0 && net === 0) {
    net = Math.max(0, revenue - commission - duke - water - hoa - maintenance - vendor);
  }

  return result({ ...d, revenue, commission, duke, water, hoa, maintenance, vendor, net, nights: nights(t), reservations: reservations(t), format: 'Generic' });
}

// ═══ DETECTORS ═══

// IHM Annual Statement Parser — parses full year from a single PDF
function parseIHMAnnual(t) {
  const yrMatch = t.match(/Annual\s+Statement\s+for\s+(\d{4})/i);
  if (!yrMatch) return { error: 'IHM Annual: no year found' };
  const headerYear = parseInt(yrMatch[1]);

  // Dynamic month map — keyed by "YYYY-M" to support cross-year data
  const months = {};
  const getMonth = (yr, mo) => {
    const key = yr + '-' + mo;
    if (!months[key]) months[key] = { year: yr, month: mo, revenue: 0, commission: 0, pool: 0, duke: 0, water: 0, hoa: 0, maintenance: 0, vendor: 0, nights: 0, reservations: 0, net: 0 };
    return months[key];
  };

  const lines = t.split(/\n/);

  for (const line of lines) {
    // Reservation header: "Reservation #37159626: Jessica Burnett (12/29/2024 - 01/02/2025) 4 Nights"
    const endMatch = line.match(/-\s*(\d{1,2})\/\d{1,2}\/(\d{4})\)\s*(\d+)\s*Night/i);
    if (endMatch) {
      const resMonth = parseInt(endMatch[1]);
      const resYear = parseInt(endMatch[2]);
      if (resMonth >= 1 && resMonth <= 12) {
        const m = getMonth(resYear, resMonth);
        m.nights += parseInt(endMatch[3]) || 0;
        m.reservations++;
      }
      continue;
    }

    // Dated line items: "MM/DD/YYYY Description $X,XXX.XX"
    const dated = line.match(/(\d{1,2})\/\d{1,2}\/(\d{4})\s+(.+?)\s+\$?([\d,]+\.\d{2})/);
    if (dated) {
      const mo = parseInt(dated[1]);
      const lineYear = parseInt(dated[2]);
      const desc = dated[3];
      const amt = parseFloat(dated[4].replace(/,/g, ''));
      if (mo < 1 || mo > 12) continue;

      const m = getMonth(lineYear, mo);
      if (/room\s*charge/i.test(desc)) { m.revenue += amt; }
      else if (/pool\s*heat/i.test(desc)) { m.pool += amt; m.revenue += amt; }
      else if (/commission\s*charge/i.test(desc)) { m.commission += amt; }
      else if (/owner\s*cleaning/i.test(desc)) { m.vendor += amt; }
      else if (/duke\s*energy|duke\s*monthly/i.test(desc)) { m.duke += amt; }
      else if (/toho\s*water|toho\s*monthly/i.test(desc)) { m.water += amt; }
      else if (/hoa|montly\s*dues|monthly\s*dues/i.test(desc)) { m.hoa += amt; }
      else if (/maintenance\s*fee/i.test(desc)) { m.maintenance += amt; }
      else if (/ach\s*payment/i.test(desc)) { m.net += amt; }
      else if (/spectrum|linen|towel|cleaning|rug|filter|license|dbpr|tax\s*collector/i.test(desc)) { m.vendor += amt; }
      else { m.vendor += amt; }
    }
  }

  // Build results — all months with activity, sorted by date
  const results = [];
  for (const d of Object.values(months)) {
    if (d.revenue > 0 || d.net > 0 || d.duke > 0) {
      if (d.net === 0) d.net = Math.max(0, d.revenue - d.commission - d.duke - d.water - d.hoa - d.maintenance - d.vendor);
      results.push(result({ ...d, sourceType: 'annual', format: 'IHM Annual' }));
    }
  }
  results.sort((a, b) => a.year * 100 + a.month - b.year * 100 - b.month);

  if (results.length === 0) return { error: 'IHM Annual: no monthly data found' };
  return results;
}

const detectors = [
  { name: 'IHMAnnual', test: t => /Annual\s+Statement\s+for\s+\d{4}/i.test(t) && (/Insight\s*hospitality|IHM|Room\s*Charge[\s\S]*Commission\s*Charge[\s\S]*Vendor\s*Bills[\s\S]*ACH\s*Payment|Maintenance\s*Fee\s*to\s*Owner[\s\S]*ACH\s*Payment/i.test(t)), parse: parseIHMAnnual },
  { name: 'IHM', test: t => /Year:\s*\d{4}\s*Period:\s*\d+/.test(t), parse: parseIHM },
  { name: 'HostU', test: t => /Host\s*U/i.test(t) || /PMC commission/i.test(t), parse: parseHostU },
  { name: 'Vacasa', test: t => /Vacasa/i.test(t), parse: parseVacasa },
  { name: 'Evolve', test: t => /Evolve/i.test(t) && (/Payout|Fee|Revenue/i.test(t)), parse: parseEvolve },
  { name: 'Guesty', test: t => /Guesty/i.test(t), parse: parseGuesty },
  { name: 'AirbnbAnnual', test: t => /Airbnb/i.test(t) && /Informe de ganancias|Earnings Report|Período del informe|Report Period/i.test(t), parse: null },
  { name: 'Airbnb', test: t => /Airbnb/i.test(t) && (/Payout|Earnings|Transaction|Ingresos|ganancias/i.test(t)), parse: parseAirbnb },
  { name: 'Vrbo', test: t => /(Vrbo|HomeAway|VRBO)/i.test(t), parse: parseVrbo },
];

// Spanish month names for Airbnb annual reports
const mesesES={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
const monthsEN={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};

function parseAirbnbAnnual(t) {
  const yrMatch = t.match(/[–-]\s*\d+\s*de\s*\w+\s*de\s*(\d{4})/);
  const defaultYear = yrMatch ? parseInt(yrMatch[1]) : new Date().getFullYear() - 1;
  const results = [];
  const seen = new Set();
  const allMonthMap = {...mesesES, ...monthsEN};
  const lines = t.split(/\n/);
  for (const line of lines) {
    for (const [mName, mNum] of Object.entries(allMonthMap)) {
      const rx = new RegExp(mName + '\\s+(?:(?:de\\s+)?(\\d{4})\\s+)?[$]?([\\d,]+[.]\\d{2})\\s*USD\\s+[$]?([\\d,]+[.]\\d{2})\\s*USD', 'i');
      const match = line.match(rx);
      if (match) {
        const year = match[1] ? parseInt(match[1]) : defaultYear;
        const revenue = parseFloat(match[2].replace(/,/g, ''));
        const net = parseFloat(match[3].replace(/,/g, ''));
        const key = year + '-' + mNum;
        if (revenue > 0 && !seen.has(key)) {
          seen.add(key);
          results.push(result({ year, month: mNum, revenue, commission: Math.max(0, revenue - net), net, format: 'Airbnb Annual' }));
        }
        break;
      }
    }
    // Partial month: "1 – 3 de abr de 2026 $645.21 USD $625.85 USD"
    const abbrMap = {ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,oct:10,nov:11,dic:12};
    const pm = line.match(/\d+\s*[\u2013-]\s*\d+\s+de\s+(\w+)\s+de\s+(\d{4})\s+[$]?([\d,]+[.]\d{2})\s*USD\s+[$]?([\d,]+[.]\d{2})\s*USD/i);
    if (pm) {
      const month = abbrMap[pm[1].toLowerCase()] || mesesES[pm[1].toLowerCase()];
      if (month) {
        const year = parseInt(pm[2]);
        const revenue = parseFloat(pm[3].replace(/,/g, ''));
        const net = parseFloat(pm[4].replace(/,/g, ''));
        const key = year + '-' + month;
        if (revenue > 0 && !seen.has(key)) {
          seen.add(key);
          results.push(result({ year, month, revenue, commission: Math.max(0, revenue - net), net, format: 'Airbnb Annual' }));
        }
      }
    }
  }
  results.sort((a, b) => a.year * 100 + a.month - b.year * 100 - b.month);
  let totalNights = Math.min(nights(t), 365 * 4);
  if (totalNights > 0 && results.length > 0) {
    const totalRev = results.reduce((s, r) => s + r.revenue, 0);
    if (totalRev > 0) results.forEach(r => { r.nights = Math.round(totalNights * (r.revenue / totalRev)); });
  }
  const totalRes = reservations(t);
  if (totalRes > 0 && results.length > 0) {
    const totalRev = results.reduce((s, r) => s + r.revenue, 0);
    results.forEach(r => { r.reservations = totalRev > 0 ? Math.round(totalRes * (r.revenue / totalRev)) : Math.round(totalRes / results.length); });
  }
  if (results.length === 0) return { error: 'Airbnb Annual: no monthly data found' };
  return results; // Returns ARRAY
}

// ═══ MORTGAGE STATEMENT PARSER ═══

// Smarter grab — only matches $ amounts, ignores account numbers
function grabMort(text, label) {
  // Match label followed by a dollar amount (with $, within 60 chars)
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Try with $ sign first (most reliable)
  const rx1 = new RegExp(escaped + '[\\s:]*\\$\\s*(\\d[\\d,]*\\.\\d{2})', 'i');
  const m1 = text.match(rx1);
  if (m1) return parseFloat(m1[1].replace(/,/g, ''));
  // Fallback: number within 40 chars but must have decimal (rules out IDs)
  const rx2 = new RegExp(escaped + '[\\s\\S]{0,40}?\\$?(\\d{1,3}(?:,\\d{3})*\\.\\d{2})\\b', 'i');
  const m2 = text.match(rx2);
  if (m2) return parseFloat(m2[1].replace(/,/g, ''));
  return 0;
}

export async function parseMortgageStatement(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(it => it.str).join(' ') + '\n';
  }
  if (fullText.trim().length < 30) return { error: 'PDF empty or unreadable' };

  const result = {
    balance: 0, rate: 0, monthlyPayment: 0,
    principalAndInterest: 0, taxEscrow: 0, insuranceEscrow: 0, otherEscrow: 0,
    includesTaxes: false, includesInsurance: false,
    servicer: '', parsed: true, rawPreview: '',
  };

  // Show first 500 chars for debugging
  result.rawPreview = fullText.slice(0, 500).replace(/\s+/g, ' ').trim();

  // Detect servicer
  const servicers = ['AmWest','Mr. Cooper','NewRez','Wells Fargo','Chase','Bank of America','Flagstar','PennyMac','Rocket Mortgage','loanDepot','Freedom Mortgage','Caliber','PHH','Nationstar','Shellpoint','Carrington'];
  for (const s of servicers) { if (fullText.toLowerCase().includes(s.toLowerCase())) { result.servicer = s; break; } }

  // Balance (must be between $10K and $2M to be realistic)
  for (const l of ['Unpaid Principal Balance','Principal Balance','Outstanding Principal','Current Principal Balance','Loan Balance']) {
    const v = grabMort(fullText, l);
    if (v >= 10000 && v <= 2000000) { result.balance = v; break; }
  }

  // Interest Rate — handle "7.25000" format with or without %
  const rateMatch = fullText.match(/Interest Rate\s*:?\s*(\d+\.\d+)\s*%?/i);
  if (rateMatch) { const r = parseFloat(rateMatch[1]); if (r >= 1 && r <= 15) result.rate = Math.round(r * 100) / 100; }

  // Principal & Interest — try combined first, then calculate from separate P + I
  for (const l of ['Principal and Interest','Principal & Interest','P&I','Principal/Interest','P & I']) {
    const v = grabMort(fullText, l);
    if (v >= 200 && v <= 15000) { result.principalAndInterest = v; break; }
  }
  // If not found as combined, try separate Principal + Interest lines
  // IMPORTANT: "Principal:" must NOT be followed by "Balance" (that's the loan balance)
  if (!result.principalAndInterest) {
    const pMatch = fullText.match(/\bPrincipal:(?!\s*Balance)\s*\$?([\d,]+\.\d{2})/i);
    const iMatch = fullText.match(/\bInterest:\s*\$?([\d,]+\.\d{2})/i);
    if (pMatch && iMatch) {
      const p = parseFloat(pMatch[1].replace(/,/g,''));
      const i = parseFloat(iMatch[1].replace(/,/g,''));
      if (p > 0 && p < 5000 && i > 0 && i < 10000) {
        result.principalAndInterest = Math.round((p + i) * 100) / 100;
        result.principal = p;
        result.interest = i;
      }
    }
  }

  // Tax and Insurance COMBINED (AmWest, some other servicers)
  const tiCombined = grabMort(fullText, 'Tax and Insurance');
  if (tiCombined >= 100 && tiCombined <= 5000) {
    // Combined — split roughly 60/40 tax/insurance (common ratio)
    // User can edit in the confirmation modal
    result.taxEscrow = Math.round(tiCombined * 0.6 * 100) / 100;
    result.insuranceEscrow = Math.round(tiCombined * 0.4 * 100) / 100;
    result.taxAndInsuranceCombined = tiCombined;
    result.includesTaxes = true;
    result.includesInsurance = true;
  }

  // Tax Escrow — only if not already found from combined
  if (!result.taxEscrow) {
    for (const l of ['Tax Escrow','Property Tax','County Tax','Real Estate Tax','Escrow for Taxes','Tax Impound']) {
      const v = grabMort(fullText, l);
      if (v >= 50 && v <= 3000) { result.taxEscrow = v; result.includesTaxes = true; break; }
    }
  }
  if (!result.taxEscrow) {
    for (const l of ['Annual Property Tax','Annual Tax','Yearly Tax']) {
      const v = grabMort(fullText, l);
      if (v >= 500 && v <= 30000) { result.taxEscrow = Math.round(v / 12 * 100) / 100; result.includesTaxes = true; break; }
    }
  }

  // Insurance Escrow — only if not already found from combined
  if (!result.insuranceEscrow) {
    for (const l of ['Insurance Escrow','Hazard Insurance','Homeowner Insurance','Homeowners Insurance','HO Insurance','Escrow for Insurance','Insurance Impound','Dwelling Insurance','Insurance Payment']) {
      const v = grabMort(fullText, l);
      if (v >= 30 && v <= 2000) { result.insuranceEscrow = v; result.includesInsurance = true; break; }
    }
  }
  if (!result.insuranceEscrow) {
    for (const l of ['Annual Insurance','Annual Premium','Yearly Insurance','Insurance Premium']) {
      const v = grabMort(fullText, l);
      if (v >= 300 && v <= 20000) { result.insuranceEscrow = Math.round(v / 12 * 100) / 100; result.includesInsurance = true; break; }
    }
  }

  // Other escrow — PMI, Flood (must be < $500/mo)
  for (const l of ['PMI','Mortgage Insurance','MIP','Flood Insurance','Miscellaneous Insurance']) {
    const v = grabMort(fullText, l);
    if (v > 0 && v <= 500) { result.otherEscrow += v; }
  }

  // Total Monthly Payment (must be between $300 and $20,000)
  for (const l of ['Regular Monthly Payment','Total Payment','Total Monthly Payment','Total Amount Due','Amount Due','Monthly Payment Amount','Payment Amount']) {
    const v = grabMort(fullText, l);
    if (v >= 300 && v <= 20000) { result.monthlyPayment = v; break; }
  }

  // Calculate total from components if not found
  if (!result.monthlyPayment && result.principalAndInterest > 0) {
    result.monthlyPayment = result.principalAndInterest + result.taxEscrow + result.insuranceEscrow + result.otherEscrow;
  }

  // Cross-validate: if total ≈ sum of parts, good. If not, trust the total.
  if (result.monthlyPayment > 0 && result.principalAndInterest > 0) {
    const sum = result.principalAndInterest + result.taxEscrow + result.insuranceEscrow + result.otherEscrow;
    if (Math.abs(sum - result.monthlyPayment) > result.monthlyPayment * 0.1) {
      // Parts don't add up — might have wrong components, keep total but flag
      result.partsNote = 'Components may not match total — verify manually';
    }
  }

  if (result.monthlyPayment === 0 && result.balance === 0) {
    return { error: 'Could not extract mortgage data. This may not be a standard US mortgage statement. Preview: ' + result.rawPreview.slice(0, 200) };
  }

  return result;
}

// ═══ MAIN EXPORT ═══
export async function parsePDF(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(it => it.str).join(' ') + '\n';
  }
  if (fullText.trim().length < 30) return { error: 'PDF vacío o no se pudo leer' };

  // Check for annual reports first (return array)
  if (/Airbnb/i.test(fullText) && /Informe de ganancias|Earnings Report|Período del informe/i.test(fullText)) {
    const annual = parseAirbnbAnnual(fullText);
    if (Array.isArray(annual) && annual.length > 0) return annual;
  }
  if (/Annual\s+Statement\s+for\s+\d{4}/i.test(fullText) && /Room\s*Charge/i.test(fullText) && /Commission\s*Charge/i.test(fullText)) {
    const annual = parseIHMAnnual(fullText);
    if (Array.isArray(annual) && annual.length > 0) return annual;
  }

  for (const d of detectors) { if (d.parse && d.test(fullText)) { const r = d.parse(fullText); if (!r.error) return r; } }
  return parseGeneric(fullText);
}
