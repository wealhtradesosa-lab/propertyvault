// ═══ CONSTANTS & HELPERS ═══
export const ADMIN_EMAILS=['santiagososa1@me.com','crestrepoz@gmail.com','management@hostu.biz'];
export const C=['#2563EB','#059669','#F59E0B','#7C3AED','#DC2626','#0891B2','#DB2777','#65A30D'];
export const M=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
export const fm=v=>'$'+Math.abs(v||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});
export const fmDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString('es',{day:'2-digit',month:'short',year:'numeric'}):'';
export const pct=(a,b)=>b?((a/b)*100).toFixed(1)+'%':'—';
export const CATS=[
  {v:'commission',l:'Comisión PM',i:'💼',fixed:true},{v:'electricity',l:'Electricidad',i:'⚡',fixed:true},
  {v:'water',l:'Agua',i:'💧',fixed:true},{v:'hoa',l:'HOA',i:'🏢',fixed:true},
  {v:'maintenance',l:'Mantenimiento',i:'🔧',fixed:true},{v:'insurance',l:'Seguro',i:'🛡️',fixed:true},
  {v:'taxes',l:'Impuestos',i:'🏛️'},{v:'legal',l:'Legal',i:'⚖️'},
  {v:'renovacion',l:'Renovación',i:'🔨'},{v:'equipamiento',l:'Equipamiento',i:'🛋️'},
  {v:'contabilidad',l:'Contabilidad',i:'📊'},{v:'marketing',l:'Marketing',i:'📸'},
  {v:'vendor',l:'Vendor',i:'🛠️'},{v:'mortgage_pay',l:'Pago Hipoteca',i:'🏦',fixed:true},
  {v:'pool',l:'Pool Heat',i:'🏊'},{v:'cleaning',l:'Limpieza',i:'🧹'},{v:'otros',l:'Otros',i:'📦'},
];
export const US_STATES='AL,AK,AZ,AR,CA,CO,CT,DE,FL,GA,HI,ID,IL,IN,IA,KS,KY,LA,ME,MD,MA,MI,MN,MS,MO,MT,NE,NV,NH,NJ,NM,NY,NC,ND,OH,OK,OR,PA,RI,SC,SD,TN,TX,UT,VT,VA,WA,WV,WI,WY'.split(',');
export const PROPERTY_TYPES=[{v:'vacation',l:'Vacacional / STR'},{v:'longterm',l:'Long-Term Rental'},{v:'primary',l:'Residencia'},{v:'flip',l:'Flip'},{v:'commercial',l:'Comercial'}];
