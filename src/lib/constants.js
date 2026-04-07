// ═══ CONSTANTS & HELPERS ═══
export const ADMIN_EMAILS=['santiagososa1@me.com','crestrepoz@gmail.com','management@hostu.biz'];
export const VIP_EMAILS=['rmedina@ihmvacations.com'];
export const C=['#2563EB','#059669','#F59E0B','#7C3AED','#DC2626','#0891B2','#DB2777','#65A30D'];
export const M=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// Currency formatting — dynamic per property
export const CURRENCIES={USD:{symbol:'$',locale:'en-US'},COP:{symbol:'$',locale:'es-CO'},EUR:{symbol:'€',locale:'de-DE'},MXN:{symbol:'$',locale:'es-MX'},GBP:{symbol:'£',locale:'en-GB'},BRL:{symbol:'R$',locale:'pt-BR'}};
export const fmCurrency=(v,cur='USD')=>{const c=CURRENCIES[cur]||CURRENCIES.USD;const neg=(v||0)<0;return (neg?'-':'')+c.symbol+Math.abs(v||0).toLocaleString(c.locale,{minimumFractionDigits:0,maximumFractionDigits:0})};
export const fm=v=>{const neg=(v||0)<0;return (neg?'-':'')+'$'+Math.abs(v||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})};
export const fmDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString('es',{day:'2-digit',month:'short',year:'numeric'}):'';
export const pct=(a,b)=>b?((a/b)*100).toFixed(1)+'%':'—';

// Countries
export const COUNTRIES=[
  {v:'US',l:'🇺🇸 Estados Unidos',cur:'USD'},
  {v:'CO',l:'🇨🇴 Colombia',cur:'COP'},
  {v:'MX',l:'🇲🇽 México',cur:'MXN'},
  {v:'ES',l:'🇪🇸 España',cur:'EUR'},
  {v:'CR',l:'🇨🇷 Costa Rica',cur:'USD'},
  {v:'PA',l:'🇵🇦 Panamá',cur:'USD'},
  {v:'BR',l:'🇧🇷 Brasil',cur:'BRL'},
  {v:'GB',l:'🇬🇧 Reino Unido',cur:'GBP'},
  {v:'OTHER',l:'🌎 Otro',cur:'USD'},
];
export const CURRENCY_LIST=[{v:'USD',l:'USD ($)'},{v:'COP',l:'COP ($)'},{v:'EUR',l:'EUR (€)'},{v:'MXN',l:'MXN ($)'},{v:'GBP',l:'GBP (£)'},{v:'BRL',l:'BRL (R$)'}];

// Country-specific terminology
export const TERMS={
  US:{hoa:'HOA',state:'Estado',stateList:'AL,AK,AZ,AR,CA,CO,CT,DE,FL,GA,HI,ID,IL,IN,IA,KS,KY,LA,ME,MD,MA,MI,MN,MS,MO,MT,NE,NV,NH,NJ,NM,NY,NC,ND,OH,OK,OR,PA,RI,SC,SD,TN,TX,UT,VT,VA,WA,WV,WI,WY'.split(',')},
  CO:{hoa:'Administración',state:'Departamento',stateList:'Amazonas,Antioquia,Arauca,Atlántico,Bolívar,Boyacá,Caldas,Caquetá,Casanare,Cauca,Cesar,Chocó,Córdoba,Cundinamarca,Guainía,Guaviare,Huila,La Guajira,Magdalena,Meta,Nariño,Norte de Santander,Putumayo,Quindío,Risaralda,San Andrés,Santander,Sucre,Tolima,Valle del Cauca,Vaupés,Vichada'.split(',')},
  MX:{hoa:'Cuota Mantenimiento',state:'Estado',stateList:'Aguascalientes,Baja California,CDMX,Chiapas,Chihuahua,Jalisco,Nuevo León,Puebla,Querétaro,Quintana Roo,Yucatán'.split(',')},
  DEFAULT:{hoa:'Administración',state:'Región',stateList:[]},
};
export const getTerms=(country)=>TERMS[country]||TERMS.DEFAULT;

// Expense categories — country-aware
const baseCats=(t)=>[
  {v:'commission',l:'PM Commission',les:'Comisión PM',i:'💼',fixed:true},{v:'electricity',l:'Electricity',les:'Electricidad',i:'⚡',fixed:true},
  {v:'water',l:'Water',les:'Agua',i:'💧',fixed:true},{v:'hoa',l:t.hoa,i:'🏢',fixed:true},
  {v:'maintenance',l:'Maintenance',les:'Mantenimiento',i:'🔧',fixed:true},{v:'insurance',l:'Insurance',les:'Seguro',i:'🛡️',fixed:true},
  {v:'taxes',l:'Taxes',les:'Impuestos',i:'🏛️'},{v:'legal',l:'Legal',les:'Legal',i:'⚖️'},
  {v:'renovacion',l:'Renovation',les:'Renovación',i:'🔨'},{v:'equipamiento',l:'Equipment',les:'Equipamiento',i:'🛋️'},
  {v:'contabilidad',l:'Accounting',les:'Contabilidad',i:'📊'},{v:'marketing',l:'Marketing',les:'Marketing',i:'📸'},
  {v:'vendor',l:'Vendor',les:'Proveedor',i:'🛠️'},{v:'mortgage_pay',l:'Mortgage',les:'Hipoteca',i:'🏦',fixed:true},
  {v:'pool',l:'Pool',les:'Piscina',i:'🏊'},{v:'cleaning',l:'Cleaning',les:'Limpieza',i:'🧹'},{v:'otros',l:'Other',les:'Otros',i:'📦'},
];
const coCats=(t)=>[
  {v:'personal',l:'Staff',les:'Personal de Servicio',i:'👷',fixed:true},{v:'prestaciones',l:'Benefits',les:'Prestaciones Sociales',i:'📋',fixed:true},
  {v:'electricity',l:'Electricity',les:'Energía',i:'⚡',fixed:true},{v:'water',l:'Water',les:'Agua',i:'💧',fixed:true},
  {v:'gas',l:'Gas',les:'Gas',i:'🔥',fixed:true},{v:'internet',l:'Internet / WiFi',les:'Internet / WiFi',i:'📶',fixed:true},{v:'cable',l:'Cable / TV',les:'Cable / TV',i:'📺',fixed:true},{v:'hoa',l:t.hoa,i:'🏢',fixed:true},
  {v:'pool',l:'Pool',les:'Piscina',i:'🏊',fixed:true},{v:'jardineria',l:'Landscaping',les:'Jardinería',i:'🌿',fixed:true},
  {v:'maintenance',l:'Maintenance',les:'Mantenimiento',i:'🔧',fixed:true},
  {v:'repairs',l:'Repairs',les:'Reparaciones',i:'🛠️'},
  {v:'lenceria',l:'Linens',les:'Lencería',i:'🛏️'},
  {v:'menaje',l:'Kitchenware',les:'Menaje',i:'🍽️'},
  {v:'electrodomesticos',l:'Appliances',les:'Electrodomésticos',i:'🔌'},
  {v:'renovacion',l:'Renovation',les:'Remodelación',i:'🔨'},
  {v:'equipamiento',l:'Furniture',les:'Mobiliario',i:'🛋️'},
  {v:'insurance',l:'Insurance',les:'Seguros',i:'🛡️'},{v:'predial',l:'Property Tax',les:'Impuesto Predial',i:'🏛️'},
  {v:'taxes',l:'Other Taxes',les:'Otros Impuestos',i:'🏛️'},{v:'commission',l:'PM Commission',les:'Comisión PM',i:'💼'},
  {v:'contabilidad',l:'Accounting',les:'Contabilidad',i:'📊'},{v:'legal',l:'Legal',les:'Legal',i:'⚖️'},
  {v:'cleaning',l:'Cleaning',les:'Limpieza',i:'🧹'},{v:'vendor',l:'Vendor',les:'Proveedor',i:'📦'},
  {v:'mortgage_pay',l:'Mortgage',les:'Hipoteca',i:'🏦',fixed:true},{v:'otros',l:'Other',les:'Otros',i:'📦'},
];
export const getCats=(country,lang='en')=>{
  const t=getTerms(country);
  const cats=country==='CO'?coCats(t):baseCats(t);
  if(lang==='es')return cats.map(c=>({...c,l:c.les||c.l}));
  return cats;
};
export const CATS=getCats('US');

export const US_STATES='AL,AK,AZ,AR,CA,CO,CT,DE,FL,GA,HI,ID,IL,IN,IA,KS,KY,LA,ME,MD,MA,MI,MN,MS,MO,MT,NE,NV,NH,NJ,NM,NY,NC,ND,OH,OK,OR,PA,RI,SC,SD,TN,TX,UT,VT,VA,WA,WV,WI,WY'.split(',');
export const PROPERTY_TYPES=[{v:'vacation',l:'Vacacional / STR'},{v:'longterm',l:'Long-Term Rental'},{v:'primary',l:'Residencia'},{v:'flip',l:'Flip'},{v:'commercial',l:'Comercial'},{v:'finca',l:'Finca / Casa Campo'},{v:'apartamento',l:'Apartamento'},{v:'local',l:'Local Comercial'},{v:'lote',l:'Lote / Terreno'}];
