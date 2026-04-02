import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ═══ SHARED HELPERS ═══
const monthNames = {January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12};
const monthAbbrev = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};

function extractDate(text) {
  const full = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  if (full) return { year: parseInt(full[2]), month: monthNames[full[1]] };
  const abbr = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i);
  if (abbr) return { year: parseInt(abbr[2]), month: monthAbbrev[abbr[1].slice(0,3)] };
  const slashed = text.match(/(\d{1,2})\/(\d{4})/);
  if (slashed) return { year: parseInt(slashed[2]), month: parseInt(slashed[1]) };
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
  const nm = text.match(/(\d+)\s*nights?/gi);
  if (nm) nm.forEach(m => { const v = parseInt(m); if (v > 0 && v < 60) n += v; });
  return n;
}

function reservations(text) {
  const rm = text.match(/(\d+)\s*reservations?/i);
  if (rm) return parseInt(rm[1]);
  return (text.match(/Reservation\s*#/gi) || []).length || (text.match(/Booking\s*#/gi) || []).length;
}

function result(d) {
  const net = d.net || Math.max(0, (d.revenue||0) - (d.commission||0) - (d.duke||0) - (d.water||0) - (d.hoa||0) - (d.maintenance||0) - (d.vendor||0));
  return { year:d.year, month:d.month, revenue:d.revenue||0, commission:d.commission||0, duke:d.duke||0, water:d.water||0, hoa:d.hoa||0, maintenance:d.maintenance||0, vendor:d.vendor||0, net, nights:d.nights||0, reservations:d.reservations||0, pool:d.pool||0, roomCharge:d.roomCharge||d.revenue||0, format:d.format };
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
  if (!d) return { error: 'No se pudo identificar el formato ni la fecha. Usa "Ingresar manualmente".' };
  return result({ ...d, revenue: grabAny(t, ['Rental Income','Room Charge','Revenue','Total Income','Gross Revenue','Gross Income','Booking Revenue','Accommodation']), commission: grabAny(t, ['Commission','Management Fee','Service Fee','PM Fee','Platform Fee']), duke: grabAny(t, ['Electric','Electricity','Duke Energy','Power','FPL','TECO']), water: grabAny(t, ['Water','Sewer','Toho','Water/Sewer']), hoa: grabAny(t, ['HOA','Association','Community Fee']), maintenance: grabAny(t, ['Maintenance','Repairs','Repair']), vendor: grabAny(t, ['Cleaning','Housekeeping','Turnover']), net: grabAny(t, ['Payment due','Payments To Owner','ACH Payment','Ending balance','Net to Owner','Owner Payout','Net Proceeds','Host Payout','Total Payout','Net Payment','Amount Due']), nights: nights(t), reservations: reservations(t), format: 'Generic' });
}

// ═══ DETECTORS ═══
const detectors = [
  { name: 'IHM', test: t => /Year:\s*\d{4}\s*Period:\s*\d+/.test(t), parse: parseIHM },
  { name: 'HostU', test: t => /Host\s*U/i.test(t) || /PMC commission/i.test(t), parse: parseHostU },
  { name: 'Vacasa', test: t => /Vacasa/i.test(t), parse: parseVacasa },
  { name: 'Evolve', test: t => /Evolve/i.test(t) && (/Payout|Fee|Revenue/i.test(t)), parse: parseEvolve },
  { name: 'Guesty', test: t => /Guesty/i.test(t), parse: parseGuesty },
  { name: 'Airbnb', test: t => /Airbnb/i.test(t) && (/Payout|Earnings|Transaction/i.test(t)), parse: parseAirbnb },
  { name: 'Vrbo', test: t => /(Vrbo|HomeAway|VRBO)/i.test(t), parse: parseVrbo },
];

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
  for (const d of detectors) { if (d.test(fullText)) { const r = d.parse(fullText); if (!r.error) return r; } }
  return parseGeneric(fullText);
}
