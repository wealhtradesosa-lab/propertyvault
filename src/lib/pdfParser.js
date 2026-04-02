import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export async function parsePDF(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data: new Uint8Array(buf)}).promise;
  let fullText = '';
  for (let i=1; i<=pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(it=>it.str).join(' ') + '\n';
  }
  if(fullText.trim().length<30) return {error:'PDF vacío o no se pudo leer'};

  let nights=0;
  const nm=fullText.match(/(\d+)\s*nights?/gi);
  if(nm) nm.forEach(m=>{const n=parseInt(m);if(n>0&&n<60)nights+=n});
  const rm=fullText.match(/(\d+)\s*reservations?/i);
  const reservations=rm?parseInt(rm[1]):(fullText.match(/Reservation\s*#/gi)||[]).length;

  const grab=(label)=>{const rx=new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[\\s\\S]{0,30}?-?\\$(\\d[\\d,]*\\.\\d{2})','i');const m=fullText.match(rx);return m?parseFloat(m[1].replace(/,/g,'')):0;};

  const hasIHM = /Year:\s*\d{4}\s*Period:\s*\d+/.test(fullText);
  const hasHostU = /Host\s*U/i.test(fullText) || /PMC commission/i.test(fullText);
  const monthNames = {January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12};

  // ═══ HOST U ═══
  if(hasHostU && !hasIHM) {
    const dm=fullText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
    if(!dm) return {error:'Host U: no se encontró fecha'};
    const year=parseInt(dm[2]), month=monthNames[dm[1]];
    const revenue=grab('Rental Income');
    const commission=grab('Management Fee');
    let mgmt=0;
    const mgmtMatch=fullText.match(/Management\s+-?\$([\d,]+\.\d{2})/);
    if(mgmtMatch) mgmt=parseFloat(mgmtMatch[1].replace(/,/g,''));
    if(mgmt===commission) mgmt=0;
    const supplies=grab('Supplies');
    const net=grab('Payment due to owner')||grab('Ending balance')||grab('Statement balance')||grab('Property income');
    return {year,month,revenue,commission,duke:0,water:0,hoa:0,maintenance:0,vendor:mgmt+supplies,net,nights,reservations,pool:0,roomCharge:revenue,format:'HostU'};
  }

  // ═══ IHM ═══
  if(hasIHM) {
    const ym=fullText.match(/Year:\s*(\d{4})\s*Period:\s*(\d+)/);
    if(!ym||parseInt(ym[2])===0) return {error:'IHM: Period 0 o anual'};
    const year=parseInt(ym[1]), month=parseInt(ym[2]);
    const grabTS=(label)=>{
      const lines=fullText.split('\n').join(' ');
      const rx=new RegExp('(?<!\\d{2}\\/\\d{2}\\/\\d{4}\\s*)' + label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '[\\s]*\\$?-?(\\d[\\d,]*\\.\\d{2})','i');
      const m=lines.match(rx);
      return m?parseFloat(m[1].replace(/,/g,'')):0;
    };
    const roomCharge=grabTS('Room Charge');
    const pool=grabTS('Pool Heat');
    const revenue=roomCharge+pool;
    const commission=grabTS('Commission Charge')||grabTS('Commission');
    const hoa=grabTS('HOA');
    const maintenance=grabTS('Maintenance Fee')||grabTS('Maintenance');
    const vendorTotal=grabTS('Vendor Bills')||grabTS('Vendor');
    const duke=grab('Duke Energy')||grab('Duke')||grab('Electricity');
    const water=grab('Toho Water')||grab('Toho')||grab('Water Monthly');
    const vendorOther=Math.max(0,vendorTotal-duke-water);
    const net=grab('ACH Payment')||grabTS('Payments To Owner')||grab('Payment made to Owner');
    return {year,month,revenue,commission,duke,water,hoa,maintenance,vendor:vendorOther,net:net||(revenue>0?revenue-commission-duke-water-hoa-maintenance-vendorOther:0),nights,reservations,pool,roomCharge,format:'IHM'};
  }

  // ═══ GENERIC ═══
  const dm=fullText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  if(!dm) return {error:'No se pudo identificar el formato. Usa "Ingresar manualmente".'};
  const year=parseInt(dm[2]), month=monthNames[dm[1]];
  const revenue=grab('Rental Income')||grab('Room Charge')||grab('Revenue')||grab('Total Income');
  const commission=grab('Commission')||grab('Management Fee');
  const net=grab('Payment due')||grab('Payments To Owner')||grab('ACH Payment')||grab('Ending balance');
  return {year,month,revenue,commission,duke:0,water:0,hoa:0,maintenance:0,vendor:0,net:net||Math.max(0,revenue-commission),nights,reservations,pool:0,roomCharge:revenue,format:'Generic'};
}
