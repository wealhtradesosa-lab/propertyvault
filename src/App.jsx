import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, where, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, ComposedChart, Line } from 'recharts';
import { Home, DollarSign, Users, Plus, Building2, X, Trash2, Loader2, LogOut, Lock, Mail, Receipt, Landmark, UserPlus, ClipboardList, Eye, EyeOff, ChevronDown, Upload, TrendingUp, BarChart3, Calendar, Layers, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle, Settings, Target, Pencil, Menu, Wrench, Clock, Printer } from 'lucide-react';

// ═══ CONSTANTS ═══
const C=['#2563EB','#059669','#F59E0B','#7C3AED','#DC2626','#0891B2','#DB2777','#65A30D'];
const M=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const fm=v=>'$'+Math.abs(v||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});
const fmDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString('es',{day:'2-digit',month:'short',year:'numeric'}):'';
const pct=(a,b)=>b?((a/b)*100).toFixed(1)+'%':'—';
const CATS=[
  {v:'commission',l:'Comisión PM',i:'💼',fixed:true},{v:'electricity',l:'Electricidad',i:'⚡',fixed:true},
  {v:'water',l:'Agua',i:'💧',fixed:true},{v:'hoa',l:'HOA',i:'🏢',fixed:true},
  {v:'maintenance',l:'Mantenimiento',i:'🔧',fixed:true},{v:'insurance',l:'Seguro',i:'🛡️',fixed:true},
  {v:'taxes',l:'Impuestos',i:'🏛️'},{v:'legal',l:'Legal',i:'⚖️'},
  {v:'renovacion',l:'Renovación',i:'🔨'},{v:'equipamiento',l:'Equipamiento',i:'🛋️'},
  {v:'contabilidad',l:'Contabilidad',i:'📊'},{v:'marketing',l:'Marketing',i:'📸'},
  {v:'vendor',l:'Vendor',i:'🛠️'},{v:'mortgage_pay',l:'Pago Hipoteca',i:'🏦',fixed:true},
  {v:'pool',l:'Pool Heat',i:'🏊'},{v:'cleaning',l:'Limpieza',i:'🧹'},{v:'otros',l:'Otros',i:'📦'},
];
const US='AL,AK,AZ,AR,CA,CO,CT,DE,FL,GA,HI,ID,IL,IN,IA,KS,KY,LA,ME,MD,MA,MI,MN,MS,MO,MT,NE,NV,NH,NJ,NM,NY,NC,ND,OH,OK,OR,PA,RI,SC,SD,TN,TX,UT,VT,VA,WA,WV,WI,WY'.split(',');
const PT=[{v:'vacation',l:'Vacacional / STR'},{v:'longterm',l:'Long-Term Rental'},{v:'primary',l:'Residencia'},{v:'flip',l:'Flip'},{v:'commercial',l:'Comercial'}];

// ═══ UI PRIMITIVES (module-level) ═══
function Inp({label,value,onChange,type='text',prefix,placeholder,className='',disabled}) {
  return <div className={className}>{label&&<label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>}
    <div className="relative">{prefix&&<span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">{prefix}</span>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className={`w-full ${prefix?'pl-7':'pl-3.5'} pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400`}/>
    </div></div>;
}
function Sel({label,value,onChange,options,className=''}) {
  return <div className={className}>{label&&<label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>}
    <div className="relative"><select value={value} onChange={e=>onChange(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none appearance-none pr-9 focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
      {options.map(o=><option key={o.v||o.value} value={o.v||o.value}>{o.l||o.label}</option>)}
    </select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div></div>;
}
function PPick({partners,selected,onChange}) {
  return <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,4)},1fr)`}}>
    {partners.map((p,i)=><button key={p.id} type="button" onClick={()=>onChange(p.id)} className={`relative py-3 rounded-xl border-2 font-semibold text-sm transition-all ${selected===p.id?'border-blue-500 bg-blue-50 text-blue-700 shadow-sm':'border-slate-200 text-slate-500 hover:border-slate-300'}`}><span className="absolute top-1.5 left-2.5 w-2 h-2 rounded-full" style={{background:p.color||C[i]}}/>{p.name||'Socio'}</button>)}
  </div>;
}
function Mdl({title,grad='from-blue-600 to-blue-700',onClose,children,footer}) {
  return <div className="fixed inset-0 z-50 flex justify-end" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}/>
    <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in">
      <div className={`bg-gradient-to-r ${grad} text-white px-5 py-4 flex justify-between items-center shrink-0`}><span className="font-bold text-sm">{title}</span><button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-lg transition"><X size={18}/></button></div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
      {footer&&<div className="shrink-0 p-4 bg-slate-50 border-t flex gap-2">{footer}</div>}
    </div></div>;
}
function Empty({icon:Ic,title,desc,action,onAction}) {
  return <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center"><div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Ic size={28} className="text-slate-400"/></div><h3 className="text-base font-bold text-slate-700 mb-1">{title}</h3><p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">{desc}</p>{action&&<button onClick={onAction} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition inline-flex items-center gap-1.5 shadow-lg shadow-blue-500/20"><Plus size={15}/>{action}</button>}</div>;
}
function Tbl({cols,rows,onDel,dc,onEdit}) {
  if(!rows.length)return null;
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-slate-50/80">{cols.map((c,i)=><th key={i} className={`py-3.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${c.r?'text-right':'text-left'}`}>{c.label}</th>)}{(onDel||onEdit)&&<th className="w-16"/>}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((r,ri)=><tr key={r.id||ri} className="hover:bg-blue-50/30 transition-colors">{cols.map((c,ci)=><td key={ci} className={`py-3 px-4 text-sm ${c.r?'text-right':''} ${c.cls||''}`}>{c.render?c.render(r):r[c.key]}</td>)}{(onDel||onEdit)&&<td className="py-3 pr-3"><div className="flex items-center gap-0.5 justify-end">{onEdit&&<button onClick={()=>onEdit(r)} className="text-slate-300 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50 transition"><Pencil size={13}/></button>}{onDel&&<button onClick={()=>onDel(dc,r.id)} className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"><Trash2 size={13}/></button>}</div></td>}</tr>)}</tbody></table></div></div>;
}
const Tip=({active,payload,label})=>{if(!active||!payload?.length)return null;return<div className="bg-slate-800 rounded-xl px-4 py-3 shadow-xl border border-slate-700"><div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">{label}</div>{payload.map((p,i)=><div key={i} className="text-xs" style={{color:p.color}}>{p.name}: <b className="text-white">{fm(p.value)}</b></div>)}</div>};

// Semáforo KPI component
function KPI({label,value,sub,color='blue',trend,alert,help}) {
  const [showHelp,setShowHelp]=useState(false);
  const bdr={blue:'border-l-blue-500',green:'border-l-emerald-500',red:'border-l-rose-500',purple:'border-l-purple-500',amber:'border-l-amber-500',cyan:'border-l-cyan-500'};
  const alertBg={red:'bg-rose-50',yellow:'bg-amber-50',green:'bg-emerald-50'};
  return <div className={`bg-white rounded-2xl p-4 border-l-4 ${bdr[color]||bdr.blue} shadow-sm hover:shadow-md transition-all ${alert?alertBg[alert]:''} relative print-avoid`}>
    <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        {alert==='red'&&<AlertTriangle size={14} className="text-rose-500"/>}
        {alert==='green'&&<CheckCircle size={14} className="text-emerald-500"/>}
        {help&&<button onMouseEnter={()=>setShowHelp(true)} onMouseLeave={()=>setShowHelp(false)} onClick={()=>setShowHelp(!showHelp)} className="text-slate-300 hover:text-blue-400 transition no-print"><span className="text-[10px] font-bold">?</span></button>}
      </div>
    </div>
    <div className="text-xl font-extrabold text-slate-800 tracking-tight">{value}</div>
    {(sub||trend)&&<div className="flex items-center gap-1.5 mt-1">{trend&&<span className={`text-[11px] font-bold flex items-center gap-0.5 ${trend.dir==='up'?'text-emerald-600':'text-rose-500'}`}>{trend.dir==='up'?<ArrowUpRight size={11}/>:<ArrowDownRight size={11}/>}{trend.text}</span>}{sub&&<span className="text-[10px] text-slate-400">{sub}</span>}</div>}
    {showHelp&&help&&<div className="absolute z-30 bottom-full left-0 mb-2 bg-slate-800 text-white text-[11px] p-3 rounded-xl shadow-xl max-w-[260px] leading-relaxed">{help}<div className="absolute -bottom-1 left-4 w-2 h-2 bg-slate-800 rotate-45"/></div>}
  </div>;
}

// ═══ PDF PARSER (IHM Statement format) ═══
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

async function parsePDF(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data:buf}).promise;

  // Extract text WITH positions for column detection
  let allItems = [];
  let fullText = '';
  for (let i=1; i<=pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    content.items.forEach(it => {
      if (it.str.trim()) allItems.push({ text: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) });
    });
    fullText += content.items.map(it=>it.str).join(' ') + '\n';
  }

  // Year & Period
  const ym = fullText.match(/Year:\s*(\d{4})\s*Period:\s*(\d+)/);
  if (!ym || parseInt(ym[2])===0) return {error:'No es statement mensual (Period 0 o no encontrado)'};
  const year=parseInt(ym[1]), month=parseInt(ym[2]);

  // Build rows by grouping items at similar Y coordinates
  const rowMap = {};
  allItems.forEach(it => {
    const ry = Math.round(it.y / 3) * 3;
    if (!rowMap[ry]) rowMap[ry] = [];
    rowMap[ry].push(it);
  });
  const rows = Object.entries(rowMap).map(([y, items]) => ({
    y: parseInt(y),
    items: items.sort((a,b) => a.x - b.x),
    text: items.sort((a,b) => a.x - b.x).map(i=>i.text).join(' ')
  })).sort((a,b) => b.y - a.y);

  // Find row by label, return FIRST dollar amount (Period column, not YTD)
  const findRow = (label) => {
    const lbl = label.toLowerCase();
    for (const row of rows) {
      if (row.text.toLowerCase().includes(lbl)) {
        const amounts = row.text.match(/\$?\(?([\d,]+\.\d{2})\)?/g);
        if (amounts && amounts.length > 0) {
          return parseFloat(amounts[0].replace(/[$,()]/g, ''));
        }
      }
    }
    return 0;
  };

  // Revenue
  let revenue = findRow('Room Charge');
  const pool = findRow('Pool Heat');
  if (pool > 0) revenue += pool;
  if (!revenue) {
    const m = fullText.match(/Total\s+Charges[\s\S]{0,60}?\$([0-9,]+\.\d{2})/i);
    if (m) revenue = parseFloat(m[1].replace(/,/g,''));
  }

  // Commission — search multiple labels
  let commission = findRow('Commission');
  if (!commission) commission = findRow('Management Fee');
  if (!commission) commission = findRow('Mgmt Fee');

  // HOA
  let hoa = findRow('HOA');
  if (!hoa) hoa = findRow('Association');

  // Maintenance Fee
  let maintenance = findRow('Maintenance Fee');
  if (!maintenance) maintenance = findRow('Maintenance');

  // Duke Energy — ultra flexible matching + debug
  let duke = 0;
  // First pass: search all rows for anything electricity-related
  const dukeRows = rows.filter(r => {
    const rt = r.text.toLowerCase();
    return rt.includes('duke') || rt.includes('electric') || rt.includes('power bill') || rt.includes('utility') || rt.includes('energy');
  }).filter(r => !r.text.toLowerCase().includes('commission') && !r.text.toLowerCase().includes('transaction'));
  console.log(`[PDF ${year}-${month}] Electric rows found:`, dukeRows.map(r=>r.text));
  dukeRows.forEach(r => {
    const amounts = r.text.match(/\$?\s*([\d,]+\.\d{2})/g);
    if (amounts) {
      const val = parseFloat(amounts[0].replace(/[$,\s]/g, ''));
      if (val > 0 && val < 1500) duke += val;
    }
  });
  // Fallback: search full text
  if (!duke) {
    const dukeRx = fullText.match(/(?:duke|electric|electricity|power|energy)\s*(?:energy)?\s*[^$\d]{0,40}?\$?\s*([\d,]+\.\d{2})/gi);
    console.log(`[PDF ${year}-${month}] Electric regex fallback:`, dukeRx);
    if (dukeRx) {
      const m = dukeRx[0].match(/([\d,]+\.\d{2})/);
      if (m) duke = parseFloat(m[1].replace(',',''));
    }
  }
  if (!duke) duke = findRow('OUC');
  if (!duke) duke = findRow('FPL');
  if (!duke) console.warn(`[PDF ${year}-${month}] ⚠ No electricity found. Full text snippet:`, fullText.substring(0,800));

  // Toho Water — flexible matching
  let water = 0;
  rows.forEach(r => {
    const rt = r.text.toLowerCase();
    if (rt.includes('toho') || (rt.includes('water') && !rt.includes('pool') && !rt.includes('heater'))) {
      const amounts = r.text.match(/\$?([\d,]+\.\d{2})/g);
      if (amounts && amounts.length > 0) {
        const val = parseFloat(amounts[0].replace(/[$,]/g, ''));
        if (val > 0 && val < 500) water += val;
      }
    }
  });
  if (!water) water = findRow('Toho');
  if (!water) water = findRow('Water');

  // Vendor
  let vendor = findRow('Vendor');
  const clean = findRow('Owner Clean') || findRow('Cleaning Fee') || findRow('Owner Cleaning');

  // Net to Owner — try multiple patterns
  let net = findRow('Payments To Owner');
  if (!net) net = findRow('Payment to Owner');
  if (!net) net = findRow('Net to Owner');
  if (!net) net = findRow('Amount Due');
  if (!net) net = findRow('ACH');
  // Fallback: search last rows for payment amounts
  if (!net) {
    for (const row of rows.slice(0, 30)) {
      if (/paid|check|ach|wire|payment/i.test(row.text)) {
        const amounts = row.text.match(/\$?([\d,]+\.\d{2})/g);
        if (amounts) { net = parseFloat(amounts[0].replace(/[$,]/g, '')); break; }
      }
    }
  }
  // Last resort: calculate net
  if (!net && revenue > 0) {
    net = revenue - commission - duke - water - hoa - maintenance - vendor - clean;
    if (net < 0) net = 0;
  }

  return {year, month, revenue, commission, duke, water, hoa, maintenance, vendor: vendor + clean, net};
}

// ═══ AUTH ═══
function AuthScreen() {
  const [mode,setMode]=useState('login');const [email,setEmail]=useState('');const [pw,setPw]=useState('');const [show,setShow]=useState(false);const [err,setErr]=useState('');const [busy,setBusy]=useState(false);
  const go=async e=>{e.preventDefault();setErr('');setBusy(true);try{mode==='login'?await signInWithEmailAndPassword(auth,email,pw):await createUserWithEmailAndPassword(auth,email,pw)}catch(e){setErr({'auth/invalid-credential':'Correo o contraseña incorrectos','auth/email-already-in-use':'Este correo ya tiene cuenta','auth/weak-password':'Mínimo 6 caracteres'}[e.code]||e.message)}setBusy(false)};
  return <div className="min-h-screen bg-[#080E1A] flex items-center justify-center p-4" style={{backgroundImage:'radial-gradient(ellipse at 20% 50%,rgba(37,99,235,.06) 0%,transparent 50%),radial-gradient(ellipse at 80% 20%,rgba(16,185,129,.04) 0%,transparent 50%)'}}>
    <div className="w-full max-w-[440px]">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-[68px] h-[68px] bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-2xl shadow-xl shadow-blue-600/20 mb-5 ring-4 ring-white/5">
          <span className="text-2xl font-black text-white tracking-tighter">OD</span>
        </div>
        <h1 className="text-[34px] font-extrabold text-white tracking-tight">Owner<span className="text-blue-400">Desk</span></h1>
        <p className="text-white/25 mt-2 text-sm font-medium tracking-wide">INVESTMENT PROPERTY INTELLIGENCE</p>
      </div>
      <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/8 p-8 shadow-2xl">
        <div className="flex mb-7 bg-white/5 rounded-2xl p-1">{[['login','Iniciar Sesión'],['register','Crear Cuenta']].map(([k,l])=><button key={k} onClick={()=>{setMode(k);setErr('')}} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode===k?'bg-white text-slate-800 shadow-lg':'text-white/50 hover:text-white/80'}`}>{l}</button>)}</div>
        <form onSubmit={go} className="space-y-4">
          <div><label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Correo</label><div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={18}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 text-sm" placeholder="tu@email.com" required autoComplete="email"/></div></div>
          <div><label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Contraseña</label><div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={18}/><input type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 outline-none focus:border-blue-400 text-sm" placeholder="••••••••" required/><button type="button" onClick={()=>setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 p-1">{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></div>
          {err&&<div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm">{err}</div>}
          <button type="submit" disabled={busy} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-blue-500/25 mt-2">{busy&&<Loader2 size={18} className="animate-spin"/>}{mode==='login'?'Entrar':'Crear Cuenta'}</button>
        </form>
      </div>
    </div>
  </div>;
}

// ═══ ONBOARDING ═══
function Onboarding({userId,onComplete}) {
  const [step,setStep]=useState(0);const [busy,setBusy]=useState(false);
  const [p,setP]=useState({name:'',address:'',city:'',state:'FL',type:'vacation',price:'',date:'',beds:'',baths:'',pm:'',pmFee:'15'});
  const [prs,setPrs]=useState([{name:'',email:'',own:'100',cap:''}]);
  const [mt,setMt]=useState({bal:'',rate:'',term:'30',pay:'',start:''});
  const up=useCallback((k,v)=>setP(x=>({...x,[k]:v})),[]);const um=useCallback((k,v)=>setMt(x=>({...x,[k]:v})),[]);
  const upPr=useCallback((i,k,v)=>setPrs(x=>{const n=[...x];n[i]={...n[i],[k]:v};return n}),[]);
  const addPr=()=>setPrs(x=>[...x,{name:'',email:'',own:'',cap:''}]);const rmPr=i=>setPrs(x=>x.length>1?x.filter((_,j)=>j!==i):x);
  const totOwn=prs.reduce((s,x)=>s+(parseFloat(x.own)||0),0);
  const finish=async()=>{setBusy(true);try{
    const pl=prs.map((x,i)=>({id:'p'+i,name:x.name,email:x.email||'',ownership:parseFloat(x.own)||0,initialCapital:parseFloat(x.cap)||0,color:C[i%C.length]}));
    const me=[auth.currentUser.email,...pl.map(x=>x.email).filter(Boolean)];
    const d={name:p.name,address:p.address,city:p.city,state:p.state,type:p.type,purchasePrice:parseFloat(p.price)||0,purchaseDate:p.date,bedrooms:parseInt(p.beds)||0,bathrooms:parseInt(p.baths)||0,manager:p.pm,managerCommission:parseFloat(p.pmFee)||15,partners:pl,memberEmails:me,
      mortgage:{balance:parseFloat(mt.bal)||0,rate:parseFloat(mt.rate)||0,termYears:parseInt(mt.term)||30,monthlyPayment:parseFloat(mt.pay)||0,startDate:mt.start||''},ownerId:userId,createdAt:serverTimestamp()};
    const ref=await addDoc(collection(db,'properties'),d);
    for(const x of d.partners){if(x.initialCapital>0)await addDoc(collection(db,'properties',ref.id,'contributions'),{partnerId:x.id,amount:x.initialCapital,type:'contribution',concept:'Capital Inicial',date:p.date||new Date().toISOString().split('T')[0],createdAt:serverTimestamp()});}
    onComplete(ref.id);
  }catch(e){alert('Error: '+e.message)}setBusy(false)};
  return <div className="min-h-screen bg-[#080E1A] flex items-center justify-center p-4" style={{backgroundImage:'radial-gradient(ellipse at 50% 0%,rgba(37,99,235,.08) 0%,transparent 50%)'}}>
    <div className="w-full max-w-[580px]">
      <div className="text-center mb-6"><div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-xl shadow-lg shadow-blue-600/20 mb-3"><span className="text-sm font-black text-white">OD</span></div><h1 className="text-2xl font-extrabold text-white tracking-tight">Configurar Propiedad</h1><p className="text-white/30 text-sm mt-1">Paso {step+1} de 3</p></div>
      <div className="flex gap-2 mb-6">{['Propiedad','Socios','Hipoteca'].map((s,i)=><div key={i} className="flex-1"><div className={`h-1.5 rounded-full transition-all duration-500 ${i<=step?'bg-gradient-to-r from-blue-500 to-emerald-500':'bg-white/5'}`}/><div className={`text-[10px] mt-1.5 text-center font-medium ${i<=step?'text-blue-400':'text-white/20'}`}>{s}</div></div>)}</div>
      <div className="bg-white rounded-3xl shadow-2xl p-7">
        {step===0&&<div><h2 className="text-lg font-extrabold text-slate-800 mb-5 flex items-center gap-2"><Building2 size={20} className="text-blue-500"/> Datos de la Propiedad</h2>
          <div className="space-y-3"><Inp label="Nombre" value={p.name} onChange={v=>up('name',v)} placeholder="Ej: Casa Orlando"/><Inp label="Dirección" value={p.address} onChange={v=>up('address',v)} placeholder="8983 Backswing Way"/>
          <div className="grid grid-cols-2 gap-3"><Inp label="Ciudad" value={p.city} onChange={v=>up('city',v)} placeholder="Orlando"/><Sel label="Estado" value={p.state} onChange={v=>up('state',v)} options={US.map(s=>({v:s,l:s}))}/></div>
          <div className="grid grid-cols-3 gap-3"><Inp label="Precio compra" value={p.price} onChange={v=>up('price',v)} prefix="$" type="number"/><Inp label="Fecha compra" value={p.date} onChange={v=>up('date',v)} type="date"/><Sel label="Tipo" value={p.type} onChange={v=>up('type',v)} options={PT}/></div>
          <div className="grid grid-cols-4 gap-3"><Inp label="Habitaciones" value={p.beds} onChange={v=>up('beds',v)} type="number"/><Inp label="Baños" value={p.baths} onChange={v=>up('baths',v)} type="number"/><Inp label="Property Manager" value={p.pm} onChange={v=>up('pm',v)} placeholder="IHM"/><Inp label="Comisión (%)" value={p.pmFee} onChange={v=>up('pmFee',v)} type="number"/></div></div>
          <div className="flex justify-end mt-6"><button onClick={()=>setStep(1)} disabled={!p.name||!p.address} className="px-7 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-30 transition shadow-lg shadow-blue-500/20">Siguiente →</button></div></div>}
        {step===1&&<div><h2 className="text-lg font-extrabold text-slate-800 mb-1 flex items-center gap-2"><Users size={20} className="text-blue-500"/> Socios</h2><p className="text-sm text-slate-400 mb-5">Único dueño = tu nombre con 100%.</p>
          {prs.map((x,i)=><div key={i} className="rounded-2xl p-4 mb-3 bg-slate-50 border-l-4" style={{borderLeftColor:C[i%C.length]}}><div className="flex justify-between items-center mb-3"><span className="text-xs font-extrabold uppercase tracking-widest" style={{color:C[i%C.length]}}>Socio {i+1}</span>{prs.length>1&&<button onClick={()=>rmPr(i)} className="text-slate-300 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50"><X size={16}/></button>}</div>
            <div className="grid grid-cols-2 gap-3 mb-2"><Inp label="Nombre" value={x.name} onChange={v=>upPr(i,'name',v)} placeholder="Juan Pérez"/><Inp label="Email" value={x.email} onChange={v=>upPr(i,'email',v)} placeholder="socio@email.com" type="email"/></div>
            <div className="grid grid-cols-2 gap-3"><Inp label="% Participación" value={x.own} onChange={v=>upPr(i,'own',v)} type="number"/><Inp label="Capital Inicial" value={x.cap} onChange={v=>upPr(i,'cap',v)} prefix="$" type="number"/></div></div>)}
          <div className="flex justify-between items-center mt-3 mb-6"><button onClick={addPr} className="text-sm text-blue-600 font-bold flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-blue-50"><UserPlus size={15}/> Agregar</button><span className={`text-sm font-extrabold px-4 py-1.5 rounded-full ${totOwn===100?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{totOwn}%{totOwn===100?' ✓':' ≠100%'}</span></div>
          <div className="flex justify-between"><button onClick={()=>setStep(0)} className="px-5 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50">← Atrás</button><button onClick={()=>setStep(2)} disabled={!prs[0].name||totOwn!==100} className="px-7 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-30 shadow-lg shadow-blue-500/20">Siguiente →</button></div></div>}
        {step===2&&<div><h2 className="text-lg font-extrabold text-slate-800 mb-1 flex items-center gap-2"><Landmark size={20} className="text-blue-500"/> Hipoteca <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">OPCIONAL</span></h2><p className="text-sm text-slate-400 mb-5">Deja en blanco si no aplica.</p>
          <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><Inp label="Balance" value={mt.bal} onChange={v=>um('bal',v)} prefix="$" type="number"/><Inp label="Tasa (%)" value={mt.rate} onChange={v=>um('rate',v)} type="number"/></div>
          <div className="grid grid-cols-3 gap-3"><Inp label="Plazo (años)" value={mt.term} onChange={v=>um('term',v)} type="number"/><Inp label="Pago Mensual" value={mt.pay} onChange={v=>um('pay',v)} prefix="$" type="number"/><Inp label="Inicio" value={mt.start} onChange={v=>um('start',v)} type="date"/></div></div>
          <div className="flex justify-between mt-6"><button onClick={()=>setStep(1)} className="px-5 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50">← Atrás</button><button onClick={finish} disabled={busy} className="px-7 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-emerald-500/20">{busy&&<Loader2 size={16} className="animate-spin"/>}🚀 Crear Propiedad</button></div></div>}
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function Dashboard({propertyId,propertyData:prop,allProperties=[],onSwitchProperty,onLogout,onAddProperty,userEmail}) {
  const [view,setView]=useState('dashboard');const [modal,setModal]=useState(null);const [rptTab,setRptTab]=useState('performance');const [stmtPage,setStmtPage]=useState(0);const [stmtYearFilter,setStmtYearFilter]=useState('all');const PER_PAGE=12;const [dashYear,setDashYear]=useState('all');
  const [expenses,setExpenses]=useState([]);const [income,setIncome]=useState([]);const [contribs,setContribs]=useState([]);const [stmts,setStmts]=useState([]);
  const [loading,setLoading]=useState(true);const [extraP,setExtraP]=useState('');const [extraPA,setExtraPA]=useState('');const [uploadLog,setUploadLog]=useState([]);const fileRef=useRef(null);
  const [valuations,setValuations]=useState([]);const [mobileNav,setMobileNav]=useState(false);const [repairs,setRepairs]=useState([]);const [tasks,setTasks]=useState([]);
  const [vf,setVf]=useState({date:'',value:'',source:'manual',notes:''});const uv=useCallback((k,v)=>setVf(x=>({...x,[k]:v})),[]);
  const [rf,setRf]=useState({date:'',title:'',description:'',amount:'',vendor:'',category:'repair',status:'pending',paidBy:''});const ur=useCallback((k,v)=>setRf(x=>({...x,[k]:v})),[]);
  const [tf,setTf]=useState({title:'',dueDate:'',priority:'medium',status:'pending',notes:''});const ut=useCallback((k,v)=>setTf(x=>({...x,[k]:v})),[]);
  const [settingsForm,setSettingsForm]=useState(null);
  const [mc,setMc]=useState({bal:'',rate:'',term:'30',pay:'',start:''});const [savingMort,setSavingMort]=useState(false);
  const umc=useCallback((k,v)=>setMc(x=>({...x,[k]:v})),[]);
  const partners=prop.partners||[];const mort=prop.mortgage||{};
  const [ef,setEf]=useState({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional'});const [editId,setEditId]=useState(null);
  const [nf,setNf]=useState({date:'',month:'',grossAmount:''});
  const [cf,setCf]=useState({date:'',concept:'',amount:'',paidBy:partners[0]?.id||''});
  const [sf,setSf]=useState({year:new Date().getFullYear(),month:1,revenue:'',net:'',commission:'',duke:'',water:'',hoa:'',maintenance:'',vendor:''});
  const ue=useCallback((k,v)=>setEf(x=>({...x,[k]:v})),[]);const un=useCallback((k,v)=>setNf(x=>({...x,[k]:v})),[]);
  const uc=useCallback((k,v)=>setCf(x=>({...x,[k]:v})),[]);const us=useCallback((k,v)=>setSf(x=>({...x,[k]:v})),[]);

  useEffect(()=>{const b=`properties/${propertyId}`,u=[];const L=(s,fn)=>{u.push(onSnapshot(query(collection(db,b,s),orderBy('createdAt','desc')),snap=>fn(snap.docs.map(d=>({id:d.id,...d.data()})))))};L('expenses',setExpenses);L('income',setIncome);L('contributions',setContribs);L('statements',setStmts);L('valuations',setValuations);L('repairs',setRepairs);L('tasks',setTasks);setTimeout(()=>setLoading(false),700);return()=>u.forEach(x=>x())},[propertyId]);

  const save=async(sub,data)=>{await addDoc(collection(db,'properties',propertyId,sub),{...data,createdAt:serverTimestamp()});setModal(null);setEditId(null)};
  const update=async(sub,id,data)=>{await updateDoc(doc(db,'properties',propertyId,sub,id),data);setModal(null);setEditId(null)};
  const del=async(sub,id)=>{if(!confirm('¿Eliminar?'))return;await deleteDoc(doc(db,'properties',propertyId,sub,id))};
  const saveMortgage=async()=>{setSavingMort(true);try{await updateDoc(doc(db,'properties',propertyId),{mortgage:{balance:parseFloat(mc.bal)||0,rate:parseFloat(mc.rate)||0,termYears:parseInt(mc.term)||30,monthlyPayment:parseFloat(mc.pay)||0,startDate:mc.start||''}})}catch(e){alert('Error: '+e.message)}setSavingMort(false)};

  // PDF Upload handler — with robust duplicate detection
  const handlePDFs=async(files)=>{
    const log=[];
    const uploaded=new Set(); // Track what we upload in THIS batch
    // Also build set of existing periods from DB
    const existingPeriods=new Set(stmts.map(s=>s.year+'-'+s.month));

    for(const f of Array.from(files)){
      if(!f.name.toLowerCase().endsWith('.pdf')){log.push({file:f.name,status:'error',msg:'No es un archivo PDF'});setUploadLog([...log]);continue;}
      log.push({file:f.name,status:'processing',msg:'Procesando...'});setUploadLog([...log]);
      try{
        const r=await parsePDF(f);
        if(r.error){log[log.length-1]={file:f.name,status:'error',msg:r.error};setUploadLog([...log]);continue;}

        const key=r.year+'-'+r.month;

        // Check 1: Already in database
        if(existingPeriods.has(key)){
          log[log.length-1]={file:f.name,status:'dup',msg:`${M[r.month-1]} ${r.year} ya existe en la base de datos — se omitió`};
          setUploadLog([...log]);continue;
        }

        // Check 2: Already uploaded in this batch
        if(uploaded.has(key)){
          log[log.length-1]={file:f.name,status:'dup',msg:`${M[r.month-1]} ${r.year} ya se cargó en este lote — se omitió`};
          setUploadLog([...log]);continue;
        }

        // Check 3: Validate data makes sense
        if(r.revenue<=0&&r.net<=0){
          log[log.length-1]={file:f.name,status:'error',msg:`${M[r.month-1]} ${r.year} — Revenue y Net en $0, posible statement anual o vacío`};
          setUploadLog([...log]);continue;
        }

        const {_debug, ...stmtData} = r;
        await addDoc(collection(db,'properties',propertyId,'statements'),{...stmtData,createdAt:serverTimestamp()});
        uploaded.add(key);
        existingPeriods.add(key);
        const missing=[];
        if(!r.commission)missing.push('Comisión');if(!r.duke)missing.push('Electricidad');if(!r.maintenance)missing.push('Maint');if(!r.net)missing.push('Net');
        let msg=`${M[r.month-1]} ${r.year} — Rev: ${fm(r.revenue)} | Comm: ${fm(r.commission)} | Duke: ${fm(r.duke)} | Water: ${fm(r.water)} | HOA: ${fm(r.hoa)} | Maint: ${fm(r.maintenance)} | Net: ${fm(r.net)}`;
        if(missing.length)msg+=` ⚠️ Sin: ${missing.join(', ')}`;
        log[log.length-1]={file:f.name,status:missing.length?'warn':'ok',msg};
        setUploadLog([...log]);
      }catch(e){log[log.length-1]={file:f.name,status:'error',msg:'Error: '+e.message};setUploadLog([...log]);}
    }
  };

  // ═══ CALCULATIONS ═══
  const pt=useMemo(()=>{const r={};partners.forEach(p=>{r[p.id]={name:p.name,color:p.color,own:p.ownership,cont:0,exp:0,inc:0}});contribs.forEach(c=>{if(r[c.paidBy])r[c.paidBy].cont+=c.amount||0});expenses.forEach(e=>{if(r[e.paidBy])r[e.paidBy].exp+=e.amount||0});const tn=income.reduce((s,i)=>s+(i.netAmount||0),0);partners.forEach(p=>{r[p.id].inc=tn*(p.ownership/100)});return r},[partners,contribs,expenses,income]);

  const totExp=expenses.reduce((s,e)=>s+(e.amount||0),0);
  const totGross=income.reduce((s,i)=>s+(i.grossAmount||0),0);
  const totNet=income.reduce((s,i)=>s+(i.netAmount||0),0);
  const totCont=contribs.reduce((s,c)=>s+(c.amount||0),0);

  // Statement-based financials
  const stmtRev=stmts.reduce((s,x)=>s+(x.revenue||0),0);
  const stmtNet=stmts.reduce((s,x)=>s+(x.net||0),0);
  const stmtComm=stmts.reduce((s,x)=>s+(x.commission||0),0);
  const stmtDuke=stmts.reduce((s,x)=>s+(x.duke||0),0);
  const stmtHoa=stmts.reduce((s,x)=>s+(x.hoa||0),0);
  const stmtMaint=stmts.reduce((s,x)=>s+(x.maintenance||0),0);
  const stmtWater=stmts.reduce((s,x)=>s+(x.water||0),0);
  const stmtVendor=stmts.reduce((s,x)=>s+(x.vendor||0),0);
  const totalOpEx=stmtComm+stmtDuke+stmtHoa+stmtMaint+stmtWater+stmtVendor+totExp;

  // NOI = Revenue - Operating Expenses (without mortgage)
  const revenue = stmtRev || totGross;
  const noi = revenue - totalOpEx;
  // Cash Flow = NOI - Annual Mortgage Payment
  const annualMortgage = (mort.monthlyPayment||0) * 12;
  const cashFlow = noi - annualMortgage;
  // Cash-on-Cash = Annual Cash Flow / Total Capital Invested
  const coc = totCont > 0 ? (cashFlow / totCont) * 100 : 0;
  // Margin
  const margin = revenue > 0 ? (stmtNet || totNet) / revenue * 100 : 0;
  // Expense ratio
  const expRatio = revenue > 0 ? totalOpEx / revenue * 100 : 0;
  // Cap Rate = NOI / Purchase Price
  const capRate = prop.purchasePrice > 0 ? (noi / prop.purchasePrice) * 100 : 0;
  // Equity
  const equity = (prop.purchasePrice || 0) - (mort.balance || 0);
  // LTV
  const ltv = prop.purchasePrice > 0 && mort.balance > 0 ? (mort.balance / prop.purchasePrice) * 100 : 0;

  const fixedExp=useMemo(()=>expenses.filter(e=>{const c=CATS.find(x=>x.v===e.category);return c?.fixed||e.type==='fixed'}),[expenses]);
  const additionalExp=useMemo(()=>expenses.filter(e=>{const c=CATS.find(x=>x.v===e.category);return !c?.fixed&&e.type!=='fixed'}),[expenses]);
  const expByCat=useMemo(()=>{const r={};expenses.forEach(e=>{const c=CATS.find(x=>x.v===e.category)||{l:'Otros'};if(!r[e.category])r[e.category]={name:c.l,value:0};r[e.category].value+=e.amount||0});return Object.values(r).sort((a,b)=>b.value-a.value)},[expenses]);

  const annual=useMemo(()=>{const y={};stmts.forEach(s=>{if(!y[s.year])y[s.year]={year:s.year,revenue:0,net:0,commission:0,duke:0,water:0,hoa:0,maintenance:0,vendor:0,n:0};const a=y[s.year];a.revenue+=s.revenue||0;a.net+=s.net||0;a.commission+=s.commission||0;a.duke+=s.duke||0;a.water+=s.water||0;a.hoa+=s.hoa||0;a.maintenance+=s.maintenance||0;a.vendor+=s.vendor||0;a.n++});return Object.values(y).sort((a,b)=>a.year-b.year)},[stmts]);

  const monthly=useMemo(()=>{const r={};stmts.forEach(s=>{if(!r[s.year])r[s.year]={rev:Array(12).fill(0),net:Array(12).fill(0)};r[s.year].rev[s.month-1]=s.revenue||0;r[s.year].net[s.month-1]=s.net||0});return r},[stmts]);
  const monthRank=useMemo(()=>{const fy=annual.filter(y=>y.n===12);if(!fy.length)return[];return M.map((m,i)=>{let s=0,c=0;fy.forEach(y=>{if(monthly[y.year]){s+=monthly[y.year].net[i];c++}});return{month:m,avg:c?s/c:0}}).sort((a,b)=>b.avg-a.avg)},[annual,monthly]);

  // YoY trend
  const yoyTrend=useMemo(()=>{if(annual.length<2)return null;const curr=annual[annual.length-1],prev=annual[annual.length-2];if(!prev.revenue)return null;const chg=((curr.revenue-prev.revenue)/prev.revenue*100).toFixed(1);return{dir:parseFloat(chg)>=0?'up':'down',text:chg+'% vs '+prev.year}},[annual]);

  // Latest valuation & real equity
  const latestVal=useMemo(()=>{const sorted=[...valuations].sort((a,b)=>(b.date||'').localeCompare(a.date||''));return sorted[0]||null},[valuations]);
  const marketValue=latestVal?parseFloat(latestVal.value)||0:prop.purchasePrice||0;
  const realEquity=marketValue-(mort.balance||0);
  const appreciation=prop.purchasePrice>0?((marketValue-prop.purchasePrice)/prop.purchasePrice*100):0;
  const realLTV=marketValue>0&&mort.balance>0?(mort.balance/marketValue*100):0;

  // Trailing 12 months
  const t12=useMemo(()=>{const sorted=[...stmts].sort((a,b)=>b.year*100+b.month-a.year*100-a.month).slice(0,12);return{rev:sorted.reduce((s,x)=>s+(x.revenue||0),0),net:sorted.reduce((s,x)=>s+(x.net||0),0),n:sorted.length}},[stmts]);

  // Cash flow timeline (cumulative net by month)
  const cfTimeline=useMemo(()=>{const sorted=[...stmts].sort((a,b)=>a.year*100+a.month-b.year*100-b.month);let cum=0;return sorted.map(s=>{cum+=s.net||0;return{period:M[s.month-1]+' '+String(s.year).slice(2),net:s.net||0,cumulative:cum}})},[stmts]);

  // Filter out years with < 6 months of data (except current year) for charts
  const curYear=new Date().getFullYear();
  const relAnnual=useMemo(()=>annual.filter(y=>y.n>=6||y.year===curYear),[annual,curYear]);
  const relMonthly=useMemo(()=>{const r={};Object.keys(monthly).forEach(y=>{const yr=parseInt(y);const a=annual.find(x=>x.year===yr);if(a&&(a.n>=6||yr===curYear))r[y]=monthly[y]});return r},[monthly,annual,curYear]);

  const mortCalc=useCallback((exMonth=0,exAnnual=0)=>{if(!mort.balance||!mort.rate||!mort.monthlyPayment)return[];let b=mort.balance;const mr=mort.rate/100/12;const sc=[];let ti=0;for(let i=1;i<=mort.termYears*12&&b>0;i++){const int=b*mr;let extra=exMonth;if(i%12===0)extra+=exAnnual;const pr=Math.min(mort.monthlyPayment-int+extra,b);b=Math.max(0,b-pr);ti+=int;if(i%12===0||b===0)sc.push({yr:Math.ceil(i/12),mo:i,bal:b,ti})}return sc},[mort]);
  const sNE=useMemo(()=>mortCalc(0,0),[mortCalc]);
  const sE=useMemo(()=>mortCalc(parseFloat(extraP)||0,parseFloat(extraPA)||0),[mortCalc,extraP,extraPA]);

  const pN=id=>partners.find(p=>p.id===id)?.name||id;const pCl=id=>partners.find(p=>p.id===id)?.color||'#94a3b8';
  const nav=[{id:'dashboard',icon:<Home size={18}/>,l:'Dashboard'},{id:'partners',icon:<Users size={18}/>,l:'Socios & Capital'},{id:'statements',icon:<ClipboardList size={18}/>,l:'Statements'},{id:'expenses',icon:<Receipt size={18}/>,l:'Gastos'},{id:'income',icon:<DollarSign size={18}/>,l:'Ingresos'},{id:'mortgage',icon:<Landmark size={18}/>,l:'Hipoteca'},{id:'repairs',icon:<Wrench size={18}/>,l:'Reparaciones'},{id:'valuation',icon:<TrendingUp size={18}/>,l:'Valorización'},{id:'pipeline',icon:<Clock size={18}/>,l:'Pipeline'},{id:'reports',icon:<Target size={18}/>,l:'Reportes'},{id:'settings',icon:<Settings size={18}/>,l:'Configuración'}];

  if(loading)return<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 size={36} className="animate-spin text-blue-500"/></div>;
  return <div className="min-h-screen bg-[#F8FAFC] flex">
    {/* MOBILE HEADER */}
    <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-40 px-4 py-3 flex items-center justify-between">
      <button onClick={()=>setMobileNav(true)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Menu size={22} className="text-slate-600"/></button>
      <div className="flex items-center gap-2"><span className="text-sm font-extrabold text-slate-800">Owner<span className="text-blue-600">Desk</span></span></div>
      <div className="w-8"/>
    </div>

    {/* SIDEBAR — hidden on mobile, overlay when open */}
    {mobileNav&&<div className="md:hidden fixed inset-0 bg-black/40 z-50" onClick={()=>setMobileNav(false)}/>}
    <div className={`fixed md:relative z-50 md:z-auto h-full transition-transform duration-300 ${mobileNav?'translate-x-0':'-translate-x-full md:translate-x-0'} w-60 bg-white border-r border-slate-100 flex flex-col shrink-0`}>
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20"><span className="text-xs font-black text-white tracking-tighter">OD</span></div><div className="min-w-0"><div className="text-sm font-extrabold text-slate-800 truncate">Owner<span className="text-blue-600">Desk</span></div><div className="text-[10px] text-slate-400 truncate">{userEmail}</div></div></div>
          <button onClick={()=>setMobileNav(false)} className="md:hidden p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400"/></button>
        </div>
        {allProperties.length>0&&<div className="relative"><select value={propertyId} onChange={e=>onSwitchProperty(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none appearance-none pr-8 cursor-pointer hover:bg-slate-100">{allProperties.map(p=><option key={p.id} value={p.id}>{p.name||'Sin nombre'}</option>)}</select><ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>}
        {onAddProperty&&<button onClick={onAddProperty} className="w-full mt-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1"><Plus size={13}/>Agregar Propiedad</button>}
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">{nav.map(n=><button key={n.id} onClick={()=>{setView(n.id);setMobileNav(false)}} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] transition-all ${view===n.id?'bg-blue-50 text-blue-700 font-bold':'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'}`}>{n.icon}{n.l}</button>)}</nav>
      <div className="p-3 border-t border-slate-100"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition font-medium"><LogOut size={16}/>Cerrar Sesión</button></div>
    </div>

    <div className="flex-1 overflow-auto"><div className="p-6 pt-[72px] md:pt-6 max-w-[1200px]">

    {/* ═══ DASHBOARD ═══ */}
    {/* ═══ DASHBOARD ═══ */}
    {view==='dashboard'&&(()=>{
      // Filter statements by year
      const sorted=[...stmts].sort((a,b)=>b.year*100+b.month-a.year*100-a.month);
      const years=[...new Set(stmts.map(s=>s.year))].sort((a,b)=>b-a);
      const fStmts=dashYear==='all'?stmts:stmts.filter(s=>s.year===dashYear);
      const nMonths=fStmts.length;
      if(!stmts.length) return <>
        <div className="flex justify-between items-start mb-4 no-print">
          <div><h1 className="text-[22px] font-extrabold text-slate-800">{prop.name}</h1><p className="text-sm text-slate-400">{prop.address}, {prop.city}, {prop.state}</p></div>
          <button onClick={()=>{setUploadLog([]);setModal('upload')}} className="px-4 py-2.5 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"><Upload size={13}/> Cargar Statements</button>
        </div>
        <Empty icon={BarChart3} title="Carga los statements de tu property manager" desc="Sube los PDFs mensuales o ingresa los datos manualmente. El dashboard se genera automáticamente con toda la información financiera." action="Cargar Statements" onAction={()=>{setUploadLog([]);setModal('upload')}}/>
      </>;

      // Computed values for filtered period
      const fRev=fStmts.reduce((s,x)=>s+(x.revenue||0),0);
      const fComm=fStmts.reduce((s,x)=>s+(x.commission||0),0);
      const fDuke=fStmts.reduce((s,x)=>s+(x.duke||0),0);
      const fWater=fStmts.reduce((s,x)=>s+(x.water||0),0);
      const fHoa=fStmts.reduce((s,x)=>s+(x.hoa||0),0);
      const fMaint=fStmts.reduce((s,x)=>s+(x.maintenance||0),0);
      const fVendor=fStmts.reduce((s,x)=>s+(x.vendor||0),0);
      const fNet=fStmts.reduce((s,x)=>s+(x.net||0),0);
      const fOpEx=fComm+fDuke+fWater+fHoa+fMaint+fVendor;
      const mMort=mort.monthlyPayment||0;
      const fMortTotal=mMort*nMonths;
      const ownerExp=expenses.reduce((s,e)=>s+(e.amount||0),0);
      const repairExp=repairs.reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
      const fQueda=fNet-fMortTotal;
      const fMargin=fRev>0?(fNet/fRev*100):0;
      const isPartialYear=dashYear!=='all'&&nMonths<12;
      const projected=isPartialYear&&nMonths>0?{rev:fRev/nMonths*12,queda:fQueda/nMonths*12}:null;

      return <>
      {/* Print header */}
      <div className="hidden print-header"><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}><div><h1 style={{margin:0}}>OwnerDesk — {prop.name}</h1><p style={{margin:'4px 0 0'}}>{prop.address}, {prop.city}, {prop.state} · {prop.manager||''} · {new Date().toLocaleDateString('es',{day:'2-digit',month:'long',year:'numeric'})}</p></div><div style={{textAlign:'right',fontSize:'20px',fontWeight:900,color:'#1E3A5F'}}>OD</div></div></div>

      {/* Header */}
      <div className="flex justify-between items-start mb-4 no-print">
        <div><h1 className="text-[22px] font-extrabold text-slate-800">{prop.name}</h1><p className="text-sm text-slate-400">{prop.address}, {prop.city}, {prop.state} {prop.manager&&`· PM: ${prop.manager}`} {marketValue!==prop.purchasePrice&&<span className="text-emerald-600 font-semibold">· Valor: {fm(marketValue)}</span>}</p></div>
        <div className="flex gap-2">
          <button onClick={()=>window.print()} className="px-3 py-2 bg-slate-100 text-slate-600 text-xs rounded-xl font-bold hover:bg-slate-200 flex items-center gap-1.5"><Printer size={13}/> PDF</button>
          <button onClick={()=>{setEf({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional'});setModal('expense')}} className="px-3 py-2 bg-rose-500 text-white text-xs rounded-xl font-bold hover:bg-rose-600 flex items-center gap-1.5 shadow-sm"><Plus size={13}/> Gasto</button>
          <button onClick={()=>{setUploadLog([]);setModal('upload')}} className="px-3 py-2 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"><Upload size={13}/> Statement</button>
        </div>
      </div>

      {/* Year tabs */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap no-print">
        <button onClick={()=>setDashYear('all')} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${dashYear==='all'?'bg-blue-600 text-white shadow-md':'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Todo ({stmts.length}m)</button>
        {years.map(y=>{const n=stmts.filter(s=>s.year===y).length;return<button key={y} onClick={()=>setDashYear(y)} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${dashYear===y?'bg-blue-600 text-white shadow-md':'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{y} ({n}m)</button>})}
      </div>

      {/* ═══ THE ANSWER: 3 big numbers ═══ */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 text-center">
          <div className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Produjo</div>
          <div className="text-3xl font-extrabold text-blue-700 mt-1">{fm(fRev)}</div>
          <div className="text-xs text-blue-400 mt-1">{fm(nMonths>0?fRev/nMonths:0)}/mes promedio · {nMonths} meses</div>
          {projected&&<div className="text-[10px] text-blue-500 mt-1 font-semibold">Proyección anual: {fm(projected.rev)}</div>}
        </div>
        <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100 text-center">
          <div className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Costó</div>
          <div className="text-3xl font-extrabold text-rose-600 mt-1">{fm(fOpEx+fMortTotal)}</div>
          <div className="text-xs text-rose-400 mt-1">Operación: {fm(fOpEx)} + Hipoteca: {fm(fMortTotal)}</div>
          <div className="text-[10px] text-rose-500 mt-1">{fRev>0?((fOpEx+fMortTotal)/fRev*100).toFixed(0):0}% del revenue</div>
        </div>
        <div className={`rounded-2xl p-5 border text-center ${fQueda>=0?'bg-emerald-50 border-emerald-200':'bg-red-50 border-red-200'}`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider ${fQueda>=0?'text-emerald-500':'text-red-500'}`}>Te quedó</div>
          <div className={`text-3xl font-extrabold mt-1 ${fQueda>=0?'text-emerald-700':'text-red-600'}`}>{fm(fQueda)}</div>
          <div className={`text-xs mt-1 ${fQueda>=0?'text-emerald-400':'text-red-400'}`}>{fm(nMonths>0?fQueda/nMonths:0)}/mes promedio</div>
          {projected&&<div className={`text-[10px] mt-1 font-semibold ${projected.queda>=0?'text-emerald-500':'text-red-500'}`}>Proyección anual: {fm(projected.queda)}</div>}
        </div>
      </div>

      {/* ═══ DESGLOSE: A dónde se va el dinero ═══ */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">¿A dónde se fue el dinero? {dashYear!=='all'?dashYear:'(Acumulado)'}</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between py-2 px-3 bg-blue-50 rounded-lg"><span className="font-bold text-blue-700">Ingreso bruto (revenue)</span><span className="font-extrabold text-blue-700">{fm(fRev)}</span></div>
          <div className="pl-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-2 pb-1">Lo que descuenta el administrador:</div>
          {fComm>0&&<div className="flex justify-between py-1.5 px-3 hover:bg-slate-50 rounded"><span className="text-slate-600">💼 Comisión PM ({prop.managerCommission||15}%)</span><span className="text-rose-500 font-semibold">-{fm(fComm)}</span></div>}
          {fDuke>0&&<div className="flex justify-between py-1.5 px-3 hover:bg-slate-50 rounded"><span className="text-slate-600">⚡ Electricidad</span><span className="text-rose-500 font-semibold">-{fm(fDuke)}</span></div>}
          {fWater>0&&<div className="flex justify-between py-1.5 px-3 hover:bg-slate-50 rounded"><span className="text-slate-600">💧 Agua</span><span className="text-rose-500 font-semibold">-{fm(fWater)}</span></div>}
          {fHoa>0&&<div className="flex justify-between py-1.5 px-3 hover:bg-slate-50 rounded"><span className="text-slate-600">🏢 HOA</span><span className="text-rose-500 font-semibold">-{fm(fHoa)}</span></div>}
          {fMaint>0&&<div className="flex justify-between py-1.5 px-3 hover:bg-slate-50 rounded"><span className="text-slate-600">🔧 Mantenimiento</span><span className="text-rose-500 font-semibold">-{fm(fMaint)}</span></div>}
          {fVendor>0&&<div className="flex justify-between py-1.5 px-3 hover:bg-slate-50 rounded"><span className="text-slate-600">🛠️ Vendor / Otros</span><span className="text-rose-500 font-semibold">-{fm(fVendor)}</span></div>}
          <div className="flex justify-between py-2 px-3 bg-emerald-50 rounded-lg border border-emerald-100 mt-1"><span className="font-bold text-emerald-700">Lo que te transfiere el PM</span><span className="font-extrabold text-emerald-700">{fm(fNet)}</span></div>
          {mMort>0&&<><div className="pl-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-2 pb-1">Lo que pagas tú como dueño:</div>
            <div className="flex justify-between py-1.5 px-3 hover:bg-slate-50 rounded"><span className="text-slate-600">🏦 Hipoteca ({fm(mMort)}/mes × {nMonths})</span><span className="text-red-500 font-semibold">-{fm(fMortTotal)}</span></div></>}
          {ownerExp>0&&<div className="flex justify-between py-1.5 px-3 hover:bg-slate-50 rounded"><span className="text-slate-600">📦 Gastos adicionales del owner</span><span className="text-red-500 font-semibold">-{fm(ownerExp)}</span></div>}
          {repairExp>0&&<div className="flex justify-between py-1.5 px-3 hover:bg-slate-50 rounded"><span className="text-slate-600">🔨 Reparaciones</span><span className="text-red-500 font-semibold">-{fm(repairExp)}</span></div>}
          <div className={`flex justify-between py-3 px-4 rounded-lg border-2 mt-2 ${fQueda>=0?'bg-emerald-100 border-emerald-300':'bg-red-100 border-red-300'}`}>
            <span className={`font-extrabold ${fQueda>=0?'text-emerald-800':'text-red-800'}`}>{fQueda>=0?'✅ Te queda':'❌ Te cuesta'}</span>
            <span className={`text-xl font-black ${fQueda>=0?'text-emerald-700':'text-red-700'}`}>{fm(fQueda)}</span>
          </div>
        </div>
      </div>

      {/* ═══ MES A MES ═══ */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">📅 Mes a Mes</h3>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50/80">
          <th className="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase text-left">Mes</th>
          <th className="py-3 px-3 text-[10px] font-bold text-blue-500 uppercase text-right">Produce</th>
          <th className="py-3 px-3 text-[10px] font-bold text-rose-500 uppercase text-right">Gastos Op.</th>
          <th className="py-3 px-3 text-[10px] font-bold text-emerald-600 uppercase text-right">Net PM</th>
          {mMort>0&&<th className="py-3 px-3 text-[10px] font-bold text-red-500 uppercase text-right">Hipoteca</th>}
          <th className="py-3 px-3 text-[10px] font-bold text-slate-800 uppercase text-right">Te queda</th>
          <th className="py-3 px-3 text-[10px] font-bold text-slate-400 uppercase text-right">Margen</th>
        </tr></thead><tbody className="divide-y divide-slate-100">
          {fStmts.sort((a,b)=>b.year*100+b.month-a.year*100-a.month).map(s=>{
            const op=(s.commission||0)+(s.duke||0)+(s.water||0)+(s.hoa||0)+(s.maintenance||0)+(s.vendor||0);
            const q=(s.net||0)-mMort;const mg=s.revenue?(s.net/s.revenue*100):0;
            return<tr key={s.id} className="hover:bg-blue-50/30 transition">
              <td className="py-2.5 px-3 font-bold text-slate-700">{M[s.month-1]} {s.year}</td>
              <td className="py-2.5 px-3 text-right text-blue-600 font-semibold">{fm(s.revenue)}</td>
              <td className="py-2.5 px-3 text-right text-rose-500">{fm(op)}</td>
              <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">{fm(s.net)}</td>
              {mMort>0&&<td className="py-2.5 px-3 text-right text-red-500">-{fm(mMort)}</td>}
              <td className={`py-2.5 px-3 text-right font-extrabold ${q>=0?'text-emerald-700':'text-red-600'}`}>{fm(q)}</td>
              <td className={`py-2.5 px-3 text-right text-xs font-bold ${mg>50?'text-emerald-500':mg>40?'text-amber-500':'text-rose-500'}`}>{mg.toFixed(0)}%</td>
            </tr>})}
        </tbody><tfoot><tr className="bg-slate-50 border-t-2 border-slate-300">
          <td className="py-3 px-3 font-extrabold text-slate-700 text-xs">TOTAL ({nMonths}m)</td>
          <td className="py-3 px-3 text-right font-extrabold text-blue-600 text-xs">{fm(fRev)}</td>
          <td className="py-3 px-3 text-right font-extrabold text-rose-500 text-xs">{fm(fOpEx)}</td>
          <td className="py-3 px-3 text-right font-extrabold text-emerald-600 text-xs">{fm(fNet)}</td>
          {mMort>0&&<td className="py-3 px-3 text-right font-extrabold text-red-500 text-xs">-{fm(fMortTotal)}</td>}
          <td className={`py-3 px-3 text-right font-extrabold text-xs ${fQueda>=0?'text-emerald-700':'text-red-600'}`}>{fm(fQueda)}</td>
          <td className={`py-3 px-3 text-right text-xs font-bold ${fMargin>50?'text-emerald-500':fMargin>40?'text-amber-500':'text-rose-500'}`}>{fMargin.toFixed(0)}%</td>
        </tr></tfoot></table></div>
      </div>

      {/* ═══ CHART: Revenue vs Net mensual ═══ */}
      {fStmts.length>1&&<div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">📊 Revenue vs Net {dashYear!=='all'?dashYear:'(Mensual)'}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={fStmts.sort((a,b)=>a.year*100+a.month-b.year*100-b.month).map(s=>({period:M[s.month-1]+(dashYear==='all'?' '+String(s.year).slice(2):''),revenue:s.revenue||0,net:s.net||0,queda:(s.net||0)-mMort}))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="period" tick={{fontSize:9,fill:'#94a3b8'}}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11}}/>
            <Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[4,4,0,0]} opacity={0.6}/>
            <Bar dataKey="net" name="Net PM" fill="#059669" radius={[4,4,0,0]}/>
            {mMort>0&&<Line dataKey="queda" name="Te queda" stroke="#DC2626" strokeWidth={2} dot={{r:3}}/>}
          </ComposedChart>
        </ResponsiveContainer>
      </div>}

      {/* ═══ INDICADORES CLAVE (collapsed, expandable) ═══ */}
      {fRev>0&&<div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">📈 Indicadores de Inversión {dashYear!=='all'?dashYear:''}</h3>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {[
            ['NOI',fm(fRev-fOpEx),'Revenue menos gastos operativos (sin hipoteca)',fRev-fOpEx>0?'emerald':'rose'],
            ['Margen',fMargin.toFixed(0)+'%','Net / Revenue. +50% es bueno',fMargin>50?'emerald':fMargin>40?'amber':'rose'],
            ['ADR',fm(nMonths>0?fRev/(nMonths*30):0),'/noche estimado','blue'],
            ['Cap Rate',(marketValue>0?((fRev-fOpEx)/(dashYear==='all'?1:12/nMonths)/marketValue*100):0).toFixed(1)+'%','NOI anualizado / Valor mercado','blue'],
            ['Equity',fm(realEquity),'Valor mercado - hipoteca','emerald'],
            ['LTV',realLTV>0?realLTV.toFixed(0)+'%':'N/A','Deuda / Valor mercado',realLTV>80?'rose':realLTV>60?'amber':'emerald'],
            ['Cash/Cash',totCont>0?(fQueda*(dashYear==='all'?1:12/nMonths)/totCont*100).toFixed(1)+'%':'N/A','Retorno anualizado / Capital','blue'],
            ...(mMort>0?[['DSCR',(fRev-fOpEx>0?((fRev-fOpEx)/(mMort*nMonths)).toFixed(2):'N/A'),'NOI / Hipoteca. +1.25 es saludable',(fRev-fOpEx)/(mMort*nMonths)>1.25?'emerald':'rose']]:[[prop.purchasePrice?'Compra':'','','']])
          ].filter(x=>x[0]).map(([label,val,tip,c])=>(
            <div key={label} className={`rounded-xl p-2.5 text-center border ${c==='emerald'?'bg-emerald-50 border-emerald-100':c==='rose'?'bg-rose-50 border-rose-100':c==='amber'?'bg-amber-50 border-amber-100':'bg-slate-50 border-slate-100'}`} title={tip}>
              <div className="text-[9px] font-bold text-slate-500 uppercase">{label}</div>
              <div className={`text-sm font-extrabold mt-0.5 ${c==='emerald'?'text-emerald-700':c==='rose'?'text-rose-600':c==='amber'?'text-amber-700':'text-slate-800'}`}>{val}</div>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-slate-400 mt-2 text-center">Pasa el mouse sobre cada indicador para ver su significado{isPartialYear?' · Los indicadores anuales están proyectados a 12 meses':''}</p>
      </div>}

      {/* ═══ SOCIOS ═══ */}
      {partners.length>1&&<div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">👥 Socios</h3>
        <div className="grid gap-3" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,3)},1fr)`}}>{partners.map(p=>{const t=pt[p.id]||{};return<div key={p.id} className="rounded-xl p-3 bg-slate-50 border-l-4 flex items-center gap-3" style={{borderLeftColor:p.color}}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{background:p.color}}>{p.name.charAt(0)}</div>
          <div className="min-w-0 flex-1"><div className="font-bold text-sm text-slate-800 truncate">{p.name} <span className="text-slate-400 font-normal">({p.ownership}%)</span></div>
            <div className="flex gap-3 text-[10px] mt-0.5"><span className="text-emerald-600 font-semibold">Aportó: {fm(t.cont)}</span><span className="text-rose-500">Gastos: {fm(t.exp)}</span></div>
          </div>
        </div>})}</div>
      </div>}

      {/* Print footer */}
      <div className="hidden print-footer">OwnerDesk · {prop.name} · {new Date().toLocaleDateString('es',{day:'2-digit',month:'long',year:'numeric'})} · Confidencial</div>
    </>})()}

    {/* ═══ PARTNERS ═══ */}
    {view==='partners'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">👥 Socios & Capital</h1><button onClick={()=>{setCf({date:new Date().toISOString().split('T')[0],concept:'',amount:'',paidBy:partners[0]?.id||''});setModal('contribution')}} className="px-4 py-2.5 bg-purple-600 text-white text-xs rounded-xl font-bold hover:bg-purple-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Aporte</button></div>
      <div className="grid gap-4 mb-6" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,3)},1fr)`}}>{partners.map(p=>{const t=pt[p.id]||{};const n=(t.cont||0)+(t.exp||0);return<div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-md" style={{background:`linear-gradient(135deg,${p.color},${p.color}cc)`}}>{p.name.charAt(0)}</div><div><div className="font-bold text-slate-800">{p.name}</div><div className="text-xs text-slate-400">{p.ownership}%</div></div></div>
        <div className="grid grid-cols-2 gap-3 text-center mb-3"><div className="bg-emerald-50 rounded-xl p-3"><div className="text-[10px] text-emerald-600 font-bold uppercase">Aportado</div><div className="text-xl font-extrabold text-emerald-700">{fm(t.cont)}</div></div><div className="bg-rose-50 rounded-xl p-3"><div className="text-[10px] text-rose-500 font-bold uppercase">Gastos</div><div className="text-xl font-extrabold text-rose-600">{fm(t.exp)}</div></div></div>
        <div className="text-center bg-slate-50 rounded-xl p-3 border"><span className="text-xs text-slate-400">Total invertido: </span><span className="text-lg font-extrabold text-slate-800">{fm(n)}</span></div></div>})}</div>
      {contribs.length>0&&<Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},{label:'Socio',render:r=><span className="font-semibold" style={{color:pCl(r.paidBy)}}>{pN(r.paidBy)}</span>},{label:'Concepto',key:'concept',cls:'text-slate-600'},{label:'Monto',r:true,render:r=><span className="font-bold text-emerald-600">{fm(r.amount)}</span>}]} rows={contribs} onDel={del} dc="contributions" onEdit={r=>{setCf({date:r.date||'',concept:r.concept||'',amount:String(r.amount||''),paidBy:r.paidBy||partners[0]?.id||''});setEditId(r.id);setModal('contribution')}}/>}
    </>}

    {/* ═══ STATEMENTS ═══ */}
    {view==='statements'&&(()=>{
      const sorted=[...stmts].sort((a,b)=>b.year*100+b.month-a.year*100-a.month);
      const years=[...new Set(stmts.map(s=>s.year))].sort((a,b)=>b-a);
      const filtered=stmtYearFilter==='all'?sorted:sorted.filter(s=>s.year===parseInt(stmtYearFilter));
      const totalPages=Math.ceil(filtered.length/PER_PAGE);
      const page=Math.min(stmtPage,Math.max(0,totalPages-1));
      const paged=filtered.slice(page*PER_PAGE,(page+1)*PER_PAGE);
      return <>
      <div className="flex justify-between items-center mb-4"><h1 className="text-[22px] font-extrabold text-slate-800">📋 Statements <span className="text-sm font-semibold text-slate-400 ml-1">({stmts.length})</span></h1><div className="flex gap-2">
        {stmts.length>0&&<button onClick={async()=>{if(!confirm(`¿Eliminar los ${stmts.length} statements?`))return;for(const s of stmts)await deleteDoc(doc(db,'properties',propertyId,'statements',s.id))}} className="px-3 py-2.5 bg-rose-100 text-rose-600 text-xs rounded-xl font-bold hover:bg-rose-200 flex items-center gap-1.5"><Trash2 size={13}/> Borrar Todos</button>}
        <button onClick={()=>{setUploadLog([]);setModal('upload')}} className="px-4 py-2.5 bg-blue-600 text-white text-xs rounded-xl font-bold flex items-center gap-1.5 shadow-sm"><Upload size={14}/> PDFs</button><button onClick={()=>setModal('addStmt')} className="px-4 py-2.5 bg-slate-700 text-white text-xs rounded-xl font-bold flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Manual</button></div></div>

      {/* Year filter + bulk delete per year */}
      {stmts.length>0&&<div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filtrar:</span>
        <button onClick={()=>{setStmtYearFilter('all');setStmtPage(0)}} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${stmtYearFilter==='all'?'bg-blue-600 text-white shadow-sm':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Todos ({stmts.length})</button>
        {years.map(y=>{const cnt=stmts.filter(s=>s.year===y).length;return<button key={y} onClick={()=>{setStmtYearFilter(String(y));setStmtPage(0)}} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${stmtYearFilter===String(y)?'bg-blue-600 text-white shadow-sm':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{y} ({cnt})</button>})}
        <div className="flex-1"/>
        {years.map(y=>{const cnt=stmts.filter(s=>s.year===y).length;return<button key={'d'+y} onClick={async()=>{if(!confirm(`¿Eliminar ${cnt} statements de ${y}?`))return;for(const s of stmts.filter(s=>s.year===y))await deleteDoc(doc(db,'properties',propertyId,'statements',s.id))}} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-400 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 transition flex items-center gap-1"><Trash2 size={10}/>{y}</button>})}
      </div>}

      {paged.length>0?<>
        <Tbl cols={[{label:'Periodo',render:r=><span className="font-bold text-slate-700">{M[r.month-1]} {r.year}</span>},{label:'Revenue',r:true,render:r=><span className="text-blue-600 font-semibold">{fm(r.revenue)}</span>},{label:'Comisión',r:true,render:r=><span className="text-rose-500">{fm(r.commission)}</span>},{label:'Electric.',r:true,render:r=>fm(r.duke)},{label:'Agua',r:true,render:r=>fm(r.water)},{label:'HOA',r:true,render:r=>fm(r.hoa)},{label:'Maint',r:true,render:r=>fm(r.maintenance)},{label:'Vendor',r:true,render:r=>fm(r.vendor)},{label:'Net',r:true,render:r=><span className="font-bold text-emerald-600">{fm(r.net)}</span>}]} rows={paged} onDel={del} dc="statements" onEdit={r=>{setSf({year:r.year,month:r.month,revenue:String(r.revenue||''),net:String(r.net||''),commission:String(r.commission||''),duke:String(r.duke||''),water:String(r.water||''),hoa:String(r.hoa||''),maintenance:String(r.maintenance||''),vendor:String(r.vendor||'')});setEditId(r.id);setModal('addStmt')}}/>

        {/* Pagination */}
        {totalPages>1&&<div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-400">{filtered.length} statements · Página {page+1} de {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={()=>setStmtPage(0)} disabled={page===0} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">«</button>
            <button onClick={()=>setStmtPage(p=>Math.max(0,p-1))} disabled={page===0} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">‹ Anterior</button>
            {Array.from({length:totalPages},(_,i)=>i).map(i=><button key={i} onClick={()=>setStmtPage(i)} className={`w-8 py-1.5 rounded-lg text-xs font-bold transition ${i===page?'bg-blue-600 text-white shadow-sm':'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{i+1}</button>)}
            <button onClick={()=>setStmtPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">Siguiente ›</button>
            <button onClick={()=>setStmtPage(totalPages-1)} disabled={page>=totalPages-1} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
          </div>
        </div>}

        {/* Page totals */}
        <div className="bg-slate-50 rounded-xl p-3 mt-3 flex justify-between items-center text-xs border border-slate-100">
          <span className="text-slate-400 font-semibold">{stmtYearFilter==='all'?'Total general':'Total '+stmtYearFilter}:</span>
          <div className="flex gap-6">
            <span>Revenue: <b className="text-blue-600">{fm(filtered.reduce((s,x)=>s+(x.revenue||0),0))}</b></span>
            <span>Gastos: <b className="text-rose-500">{fm(filtered.reduce((s,x)=>s+(x.revenue||0)-(x.net||0),0))}</b></span>
            <span>Net: <b className="text-emerald-600">{fm(filtered.reduce((s,x)=>s+(x.net||0),0))}</b></span>
            <span>Margen: <b className="text-slate-700">{(()=>{const r=filtered.reduce((s,x)=>s+(x.revenue||0),0),n=filtered.reduce((s,x)=>s+(x.net||0),0);return r?((n/r)*100).toFixed(1)+'%':'—'})()}</b></span>
          </div>
        </div>
      </>:<Empty icon={ClipboardList} title="Sin statements" desc="Sube PDFs o ingrésalos manualmente." action="Cargar" onAction={()=>{setUploadLog([]);setModal('upload')}}/>}
    </>})()}


    {/* ═══ EXPENSES ═══ */}
    {view==='expenses'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">🧾 Gastos</h1><button onClick={()=>{setEf({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional'});setModal('expense')}} className="px-4 py-2.5 bg-rose-500 text-white text-xs rounded-xl font-bold hover:bg-rose-600 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Gasto</button></div>
      {expenses.length>0&&<div className="grid grid-cols-3 gap-3 mb-5"><KPI label="Gastos Fijos" value={fm(fixedExp.reduce((s,e)=>s+(e.amount||0),0))} sub={fixedExp.length+' registros'} color="amber"/><KPI label="Gastos Adicionales" value={fm(additionalExp.reduce((s,e)=>s+(e.amount||0),0))} sub={additionalExp.length+' registros'} color="red"/><KPI label="Total" value={fm(totExp)} color="purple"/></div>}
      {expByCat.length>0&&<div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-4"><h3 className="text-sm font-bold text-slate-700 mb-3">Por Categoría</h3><ResponsiveContainer width="100%" height={Math.max(150,expByCat.length*35)}><BarChart data={expByCat} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis type="number" tickFormatter={fm} tick={{fontSize:10,fill:'#94a3b8'}}/><YAxis type="category" dataKey="name" tick={{fontSize:10,fill:'#64748b'}} width={120}/><Tooltip content={<Tip/>}/><Bar dataKey="value" name="Monto" fill="#DC2626" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></div>}
      {fixedExp.length>0&&<div className="mb-4"><h3 className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2"><Calendar size={15} className="text-amber-500"/> Fijos / Recurrentes</h3><Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},{label:'Concepto',key:'concept',cls:'text-slate-700 font-medium'},{label:'Categoría',render:r=>{const c=CATS.find(x=>x.v===r.category);return c?c.i+' '+c.l:r.category}},{label:'Pagó',render:r=><span style={{color:pCl(r.paidBy)}}>{pN(r.paidBy)}</span>},{label:'Monto',r:true,render:r=><span className="font-bold text-rose-500">{fm(r.amount)}</span>}]} rows={fixedExp} onDel={del} dc="expenses" onEdit={r=>{setEf({date:r.date||'',concept:r.concept||'',amount:String(r.amount||''),paidBy:r.paidBy||partners[0]?.id||'',category:r.category||'otros',type:r.type||'fixed'});setEditId(r.id);setModal('expense')}}/></div>}
      {additionalExp.length>0&&<div className="mb-4"><h3 className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2"><Layers size={15} className="text-red-500"/> Adicionales / Únicos</h3><Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},{label:'Concepto',key:'concept',cls:'text-slate-700 font-medium'},{label:'Categoría',render:r=>{const c=CATS.find(x=>x.v===r.category);return c?c.i+' '+c.l:r.category}},{label:'Pagó',render:r=><span style={{color:pCl(r.paidBy)}}>{pN(r.paidBy)}</span>},{label:'Monto',r:true,render:r=><span className="font-bold text-rose-500">{fm(r.amount)}</span>}]} rows={additionalExp} onDel={del} dc="expenses" onEdit={r=>{setEf({date:r.date||'',concept:r.concept||'',amount:String(r.amount||''),paidBy:r.paidBy||partners[0]?.id||'',category:r.category||'otros',type:r.type||'additional'});setEditId(r.id);setModal('expense')}}/></div>}
      {!expenses.length&&<Empty icon={Receipt} title="Sin gastos" desc="Registra gastos fijos y adicionales." action="Registrar" onAction={()=>{setEf({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional'});setModal('expense')}}/>}
    </>}

    {/* ═══ INCOME (powered by statements) ═══ */}
    {view==='income'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">💰 Ingresos</h1><p className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">Datos de Statements</p></div>

      {stmts.length>0?(()=>{
        const sorted=[...stmts].sort((a,b)=>b.year*100+b.month-a.year*100-a.month);
        const totR=stmts.reduce((s,x)=>s+(x.revenue||0),0);
        const totC=stmts.reduce((s,x)=>s+(x.commission||0),0);
        const totN=stmts.reduce((s,x)=>s+(x.net||0),0);
        const avgMonth=stmts.length>0?totR/stmts.length:0;
        const avgNet=stmts.length>0?totN/stmts.length:0;
        return <>
        <div className="grid grid-cols-5 gap-3 mb-5">
          <KPI label="Revenue Bruto" value={fm(totR)} sub={stmts.length+' meses'} color="blue"/>
          <KPI label="Comisiones PM" value={fm(totC)} sub={totR>0?((totC/totR)*100).toFixed(1)+'% del revenue':''} color="red"/>
          <KPI label="Net al Owner" value={fm(totN)} sub={totR>0?((totN/totR)*100).toFixed(1)+'% margen':''} color="green"/>
          <KPI label="Promedio/Mes" value={fm(avgMonth)} sub="revenue bruto" color="cyan"/>
          <KPI label="Net Promedio/Mes" value={fm(avgNet)} sub="net al owner" color="green"/>
        </div>

        {/* Revenue by year */}
        {annual.length>0&&<div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-4"><h3 className="text-sm font-bold text-slate-700 mb-3">Revenue por Año</h3>
          <div className="grid gap-2">{annual.map(y=>{const m=y.revenue?(y.net/y.revenue*100):0;return<div key={y.year} className="flex items-center gap-3 py-3 px-4 bg-slate-50 rounded-xl">
            <span className="font-extrabold text-slate-800 w-12">{y.year}</span>
            <div className="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width:Math.min(100,(y.revenue/Math.max(...annual.map(a=>a.revenue))*100))+'%'}}/></div>
            <span className="text-sm font-bold text-blue-600 w-24 text-right">{fm(y.revenue)}</span>
            <span className="text-sm font-bold text-emerald-600 w-24 text-right">{fm(y.net)}</span>
            <span className={`text-xs font-bold w-14 text-right ${m<40?'text-rose-500':m<50?'text-amber-600':'text-emerald-600'}`}>{m.toFixed(0)}%</span>
            <span className="text-[10px] text-slate-400 w-8">{y.n}m</span>
          </div>})}</div>
        </div>}

        {/* Monthly detail table */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm"><h3 className="text-sm font-bold text-slate-700 mb-3">Detalle Mensual</h3>
          <Tbl cols={[
            {label:'Periodo',render:r=><span className="font-bold text-slate-700">{M[r.month-1]} {r.year}</span>},
            {label:'Revenue',r:true,render:r=><span className="text-blue-600 font-semibold">{fm(r.revenue)}</span>},
            {label:'Comisión',r:true,render:r=><span className="text-rose-500">{fm(r.commission)}</span>},
            {label:'Gastos Op.',r:true,render:r=><span className="text-rose-400">{fm((r.duke||0)+(r.water||0)+(r.hoa||0)+(r.maintenance||0)+(r.vendor||0))}</span>},
            {label:'Net',r:true,render:r=><span className="font-bold text-emerald-600">{fm(r.net)}</span>},
            {label:'Margen',r:true,render:r=>{const m=r.revenue?(r.net/r.revenue*100):0;return<span className={`font-bold ${m<40?'text-rose-500':m<50?'text-amber-600':'text-emerald-600'}`}>{m.toFixed(0)}%</span>}},
            ...(partners.length>1?partners.map(p=>({label:p.name.split(' ')[0]+' ('+p.ownership+'%)',r:true,render:r=><span className="text-sm" style={{color:p.color}}>{fm((r.net||0)*(p.ownership/100))}</span>})):[]),
          ]} rows={sorted}/>
        </div>
      </>})():<Empty icon={DollarSign} title="Sin ingresos" desc="Los ingresos se alimentan de los Statements. Ve a Statements y carga los PDFs de tu property manager." action="Ir a Statements" onAction={()=>setView('statements')}/>}
    </>}

    {/* ═══ MORTGAGE ═══ */}
    {view==='mortgage'&&<>
      <h1 className="text-[22px] font-extrabold text-slate-800 mb-6">🏦 Hipoteca</h1>
      {mort.balance>0?<>
        <div className="grid grid-cols-5 gap-3 mb-6"><KPI label="Balance" value={fm(mort.balance)} color="red"/><KPI label="Tasa" value={mort.rate+'%'} sub={mort.termYears+' años'} color="amber"/><KPI label="Pago Mensual" value={fm(mort.monthlyPayment)} color="blue"/><KPI label="Total Intereses" value={sNE.length>0?fm(sNE[sNE.length-1].ti):'$0'} sub="sin pagos extra" color="purple"/><KPI label="Equity" value={fm(equity)} sub={'LTV: '+ltv.toFixed(0)+'%'} color="green"/></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-4"><h3 className="text-base font-extrabold text-slate-800 mb-1">💰 Simulador de Pagos Anticipados</h3><p className="text-xs text-slate-400 mb-5">¿Cuánto extra al principal cada mes?</p>
          <div className="max-w-md mb-6"><div className="grid grid-cols-2 gap-3"><Inp label="Extra MENSUAL al principal" value={extraP} onChange={setExtraP} prefix="$" type="number" placeholder="Ej: 200"/><Inp label="Extra ANUAL al principal" value={extraPA} onChange={setExtraPA} prefix="$" type="number" placeholder="Ej: 5,000"/></div><p className="text-[10px] text-slate-400 mt-2">El pago mensual extra se aplica cada mes. El pago anual se aplica una vez al año al final de cada año.</p></div>
          {sE.length>0&&sNE.length>0&&<><div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50 rounded-2xl p-5 text-center border border-emerald-100"><div className="text-[10px] text-emerald-600 font-bold uppercase">Se paga en</div><div className="text-3xl font-extrabold text-emerald-700 mt-1">{Math.ceil(sE[sE.length-1].mo/12)} años</div><div className="text-xs text-emerald-500">vs {Math.ceil(sNE[sNE.length-1].mo/12)} sin extra</div></div>
            <div className="bg-blue-50 rounded-2xl p-5 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-bold uppercase">Ahorro</div><div className="text-3xl font-extrabold text-blue-700 mt-1">{fm(sNE[sNE.length-1].ti-sE[sE.length-1].ti)}</div></div>
            <div className="bg-amber-50 rounded-2xl p-5 text-center border border-amber-100"><div className="text-[10px] text-amber-600 font-bold uppercase">Meses Menos</div><div className="text-3xl font-extrabold text-amber-700 mt-1">{sNE[sNE.length-1].mo-sE[sE.length-1].mo}</div></div>
          </div><ResponsiveContainer width="100%" height={260}><AreaChart data={sNE.map((d,i)=>({yr:'Año '+d.yr,sin:d.bal,con:sE[i]?.bal||0}))}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="yr" tick={{fontSize:9,fill:'#94a3b8'}} interval={4}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11}}/><Area dataKey="sin" name="Sin extra" stroke="#DC2626" fill="rgba(220,38,38,.05)"/><Area dataKey="con" name={`$${extraP||0}/mes${extraPA?` + $${extraPA}/año`:''} extra`} stroke="#059669" fill="rgba(5,150,105,.05)"/></AreaChart></ResponsiveContainer></>}
        </div>
        <button onClick={()=>{setMc({bal:String(mort.balance||''),rate:String(mort.rate||''),term:String(mort.termYears||30),pay:String(mort.monthlyPayment||''),start:mort.startDate||''});setModal('editMort')}} className="text-sm text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-blue-50 transition"><Settings size={15}/> Editar datos de hipoteca</button>
      </>:<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-lg">
        <div className="flex items-center gap-3 mb-5"><div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center"><Landmark size={24} className="text-blue-600"/></div><div><h3 className="text-base font-extrabold text-slate-800">Configurar Hipoteca</h3><p className="text-xs text-slate-400">Ingresa los datos de tu mortgage.</p></div></div>
        <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><Inp label="Balance" value={mc.bal} onChange={v=>umc('bal',v)} prefix="$" type="number" placeholder="285,000"/><Inp label="Tasa (%)" value={mc.rate} onChange={v=>umc('rate',v)} type="number" placeholder="7.25"/></div>
        <div className="grid grid-cols-3 gap-3"><Inp label="Plazo (años)" value={mc.term} onChange={v=>umc('term',v)} type="number" placeholder="30"/><Inp label="Pago Mensual" value={mc.pay} onChange={v=>umc('pay',v)} prefix="$" type="number" placeholder="1,945"/><Inp label="Inicio" value={mc.start} onChange={v=>umc('start',v)} type="date"/></div></div>
        <button onClick={saveMortgage} disabled={!mc.bal||!mc.rate||!mc.pay||savingMort} className="w-full mt-5 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-30 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">{savingMort&&<Loader2 size={16} className="animate-spin"/>}💾 Guardar Hipoteca</button>
      </div>}
    </>}

    {/* ═══ REPAIRS & CAPEX ═══ */}
    {view==='repairs'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">🔧 Reparaciones & CapEx</h1><button onClick={()=>{setRf({date:new Date().toISOString().split('T')[0],title:'',description:'',amount:'',vendor:'',category:'repair',status:'pending',paidBy:partners[0]?.id||''});setEditId(null);setModal('repair')}} className="px-4 py-2.5 bg-amber-600 text-white text-xs rounded-xl font-bold hover:bg-amber-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Nuevo Ticket</button></div>

      {repairs.length>0&&<div className="grid grid-cols-4 gap-3 mb-5">
        <KPI label="Total Reparaciones" value={fm(repairs.reduce((s,r)=>s+(parseFloat(r.amount)||0),0))} sub={repairs.length+' tickets'} color="amber"/>
        <KPI label="Pendientes" value={String(repairs.filter(r=>r.status==='pending').length)} color="red" alert={repairs.filter(r=>r.status==='pending').length>0?'red':null}/>
        <KPI label="En Progreso" value={String(repairs.filter(r=>r.status==='progress').length)} color="blue"/>
        <KPI label="Completados" value={String(repairs.filter(r=>r.status==='done').length)} color="green"/>
      </div>}

      {repairs.length>0?<Tbl cols={[
        {label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},
        {label:'Estado',render:r=><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${r.status==='done'?'bg-emerald-100 text-emerald-700':r.status==='progress'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}`}>{r.status==='done'?'✓ Completado':r.status==='progress'?'⏳ En Progreso':'⚠ Pendiente'}</span>},
        {label:'Título',render:r=><span className="font-semibold text-slate-700">{r.title}</span>},
        {label:'Tipo',render:r=><span className="text-xs text-slate-400">{r.category==='capex'?'📈 CapEx':r.category==='preventive'?'🛡️ Preventivo':'🔧 Reparación'}</span>},
        {label:'Vendor',key:'vendor',cls:'text-xs text-slate-500'},
        {label:'Pagó',render:r=>r.paidBy?<span className="font-medium" style={{color:pCl(r.paidBy)}}>{pN(r.paidBy)}</span>:<span className="text-slate-300">—</span>},
        {label:'Monto',r:true,render:r=><span className="font-bold text-amber-600">{fm(r.amount)}</span>},
      ]} rows={repairs} onDel={del} dc="repairs" onEdit={r=>{setRf({date:r.date||'',title:r.title||'',description:r.description||'',amount:String(r.amount||''),vendor:r.vendor||'',category:r.category||'repair',status:r.status||'pending',paidBy:r.paidBy||''});setEditId(r.id);setModal('repair')}}/>
      :<Empty icon={Wrench} title="Sin reparaciones" desc="Registra mantenimientos, reparaciones y mejoras de capital (CapEx) de tu propiedad." action="Crear Ticket" onAction={()=>{setRf({date:new Date().toISOString().split('T')[0],title:'',description:'',amount:'',vendor:'',category:'repair',status:'pending',paidBy:partners[0]?.id||''});setModal('repair')}}/>}
    </>}

    {/* ═══ VALUATION & EQUITY ═══ */}
    {view==='valuation'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">📈 Valorización & Equity</h1><button onClick={()=>{setVf({date:new Date().toISOString().split('T')[0],value:'',source:'manual',notes:''});setEditId(null);setModal('valuation')}} className="px-4 py-2.5 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Registrar Valor</button></div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <KPI label="Precio de Compra" value={fm(prop.purchasePrice)} color="blue"/>
        <KPI label="Valor de Mercado" value={fm(marketValue)} sub={latestVal?'Actualizado '+fmDate(latestVal.date):'Precio de compra'} color={appreciation>=0?'green':'red'}/>
        <KPI label="Equity" value={fm(realEquity)} sub={mort.balance>0?'Valor - Hipoteca':'Sin hipoteca'} color="green" alert={realEquity>0?'green':'red'}/>
        <KPI label="Apreciación" value={appreciation.toFixed(1)+'%'} sub={appreciation>=0?fm(marketValue-prop.purchasePrice)+' ganancia':fm(prop.purchasePrice-marketValue)+' pérdida'} color={appreciation>=0?'green':'red'} trend={{dir:appreciation>=0?'up':'down',text:fm(Math.abs(marketValue-prop.purchasePrice))}}/>
      </div>

      {mort.balance>0&&<div className="grid grid-cols-3 gap-3 mb-5">
        <KPI label="LTV Real" value={realLTV.toFixed(1)+'%'} sub={realLTV>80?'Alto apalancamiento':realLTV>60?'Moderado':'Conservador'} color={realLTV>80?'red':realLTV>60?'amber':'green'}/>
        <KPI label="Balance Hipoteca" value={fm(mort.balance)} color="red"/>
        <KPI label="Valor Total Invertido" value={fm(totCont)} sub="Capital de todos los socios" color="purple"/>
      </div>}

      {/* Equity waterfall */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-4">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Composición del Equity</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-xl border border-blue-100"><span className="font-bold text-blue-700">Valor de Mercado</span><span className="font-extrabold text-blue-700 text-lg">{fm(marketValue)}</span></div>
          {mort.balance>0&&<div className="pl-6"><div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Balance Hipoteca</span><span className="font-semibold text-rose-500">{fm(mort.balance)}</span></div></div>}
          <div className={`flex justify-between py-3 px-4 rounded-xl border ${realEquity>=0?'bg-emerald-50 border-emerald-100':'bg-rose-50 border-rose-100'}`}><span className={`font-bold ${realEquity>=0?'text-emerald-700':'text-rose-700'}`}>= Equity Neto</span><span className={`font-extrabold text-lg ${realEquity>=0?'text-emerald-700':'text-rose-700'}`}>{fm(realEquity)}</span></div>
          {prop.purchasePrice>0&&<div className="pl-6 space-y-1">
            <div className="flex justify-between py-2 text-sm"><span className="text-slate-500">Capital aportado (down payment + extras)</span><span className="font-semibold">{fm(totCont)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-slate-500">Apreciación / Depreciación</span><span className={`font-semibold ${appreciation>=0?'text-emerald-600':'text-rose-500'}`}>{fm(marketValue-prop.purchasePrice)}</span></div>
            {mort.balance>0&&<div className="flex justify-between py-2 text-sm"><span className="text-slate-500">Principal pagado (equity por amortización)</span><span className="font-semibold text-blue-600">{fm(prop.purchasePrice-mort.balance-totCont)}</span></div>}
          </div>}
        </div>
      </div>

      {/* Valuation History */}
      {valuations.length>0&&<>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-4"><h3 className="text-sm font-bold text-slate-700 mb-4">Historial de Valorización</h3>
          <ResponsiveContainer width="100%" height={200}><AreaChart data={[{date:fmDate(prop.purchaseDate),value:prop.purchasePrice},...[...valuations].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(v=>({date:fmDate(v.date),value:parseFloat(v.value)||0}))]}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="date" tick={{fontSize:9,fill:'#94a3b8'}}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Area dataKey="value" name="Valor" stroke="#059669" fill="rgba(5,150,105,.1)" strokeWidth={2.5}/></AreaChart></ResponsiveContainer>
        </div>
        <Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500 font-medium">{fmDate(r.date)}</span>},{label:'Valor Estimado',r:true,render:r=><span className="font-bold text-emerald-600">{fm(r.value)}</span>},{label:'Fuente',render:r=><span className="text-xs text-slate-400">{r.source==='zillow'?'Zillow':r.source==='redfin'?'Redfin':r.source==='appraisal'?'Avalúo':r.source==='broker'?'Broker':'Manual'}</span>},{label:'Notas',key:'notes',cls:'text-xs text-slate-400'}]} rows={[...valuations].sort((a,b)=>(b.date||'').localeCompare(a.date||''))} onDel={del} dc="valuations" onEdit={r=>{setVf({date:r.date||'',value:String(r.value||''),source:r.source||'manual',notes:r.notes||''});setEditId(r.id);setModal('valuation')}}/>
      </>}
      {!valuations.length&&<div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm"><p className="text-sm text-slate-400 text-center py-4">Registra el valor actual de tu propiedad para trackear apreciación y equity real. Puedes usar Zillow, Redfin, un avalúo o tu propia estimación.</p></div>}
    </>}

    {/* ═══ PIPELINE ═══ */}
    {view==='pipeline'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">📋 Pipeline de Tareas</h1><button onClick={()=>{setTf({title:'',dueDate:'',priority:'medium',status:'pending',notes:''});setEditId(null);setModal('task')}} className="px-4 py-2.5 bg-indigo-600 text-white text-xs rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Nueva Tarea</button></div>

      {tasks.length>0&&<div className="grid grid-cols-4 gap-3 mb-5">
        <KPI label="Total Tareas" value={String(tasks.length)} color="blue"/>
        <KPI label="Pendientes" value={String(tasks.filter(t=>t.status==='pending').length)} color="red" alert={tasks.filter(t=>t.status==='pending').length>2?'red':null}/>
        <KPI label="En Progreso" value={String(tasks.filter(t=>t.status==='progress').length)} color="amber"/>
        <KPI label="Completadas" value={String(tasks.filter(t=>t.status==='done').length)} color="green"/>
      </div>}

      {/* Kanban-style columns */}
      {tasks.length>0?<div className="grid grid-cols-3 gap-4">
        {[['pending','⚠ Pendientes','bg-amber-50 border-amber-200'],['progress','⏳ En Progreso','bg-blue-50 border-blue-200'],['done','✓ Completadas','bg-emerald-50 border-emerald-200']].map(([st,label,cls])=>(
          <div key={st} className={`rounded-2xl border p-4 ${cls} min-h-[200px]`}>
            <h3 className="text-sm font-bold text-slate-700 mb-3">{label} ({tasks.filter(t=>t.status===st).length})</h3>
            <div className="space-y-2">{tasks.filter(t=>t.status===st).map(t=>(
              <div key={t.id} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-sm text-slate-700">{t.title}</span>
                  <div className="flex gap-0.5">
                    <button onClick={()=>{setTf({title:t.title||'',dueDate:t.dueDate||'',priority:t.priority||'medium',status:t.status||'pending',notes:t.notes||''});setEditId(t.id);setModal('task')}} className="text-slate-300 hover:text-blue-500 p-1 rounded"><Pencil size={12}/></button>
                    <button onClick={()=>del('tasks',t.id)} className="text-slate-300 hover:text-red-500 p-1 rounded"><Trash2 size={12}/></button>
                  </div>
                </div>
                {t.notes&&<p className="text-[11px] text-slate-400 mb-2">{t.notes}</p>}
                <div className="flex justify-between items-center">
                  {t.dueDate&&<span className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar size={10}/>{fmDate(t.dueDate)}</span>}
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${t.priority==='high'?'bg-rose-100 text-rose-600':t.priority==='low'?'bg-slate-100 text-slate-500':'bg-amber-100 text-amber-600'}`}>{t.priority==='high'?'Alta':t.priority==='low'?'Baja':'Media'}</span>
                </div>
                {t.status!=='done'&&<div className="flex gap-1 mt-2">{t.status==='pending'&&<button onClick={()=>update('tasks',t.id,{status:'progress'})} className="flex-1 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-200">Iniciar →</button>}{t.status!=='done'&&<button onClick={()=>update('tasks',t.id,{status:'done'})} className="flex-1 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-200">Completar ✓</button>}</div>}
              </div>
            ))}</div>
          </div>
        ))}
      </div>:<Empty icon={Clock} title="Sin tareas" desc="Crea tareas para llevar control de pagos pendientes, renovaciones de seguro, inspecciones y más." action="Nueva Tarea" onAction={()=>{setTf({title:'',dueDate:'',priority:'medium',status:'pending',notes:''});setModal('task')}}/>}
    </>}

    {/* ═══ SETTINGS ═══ */}
    {view==='settings'&&(()=>{
      const sf2=settingsForm||{name:prop.name||'',address:prop.address||'',city:prop.city||'',state:prop.state||'FL',type:prop.type||'vacation',purchasePrice:String(prop.purchasePrice||''),manager:prop.manager||'',managerCommission:String(prop.managerCommission||15),bedrooms:String(prop.bedrooms||''),bathrooms:String(prop.bathrooms||'')};
      const uf=(k,v)=>setSettingsForm({...sf2,[k]:v});
      return <>
      <h1 className="text-[22px] font-extrabold text-slate-800 mb-6">⚙️ Configuración de la Propiedad</h1>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl">
        <h3 className="text-base font-bold text-slate-700 mb-4">Datos Generales</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><Inp label="Nombre" value={sf2.name} onChange={v=>uf('name',v)}/><Inp label="Dirección" value={sf2.address} onChange={v=>uf('address',v)}/></div>
          <div className="grid grid-cols-3 gap-3"><Inp label="Ciudad" value={sf2.city} onChange={v=>uf('city',v)}/><Sel label="Estado" value={sf2.state} onChange={v=>uf('state',v)} options={US.map(s=>({v:s,l:s}))}/><Sel label="Tipo" value={sf2.type} onChange={v=>uf('type',v)} options={PT}/></div>
          <div className="grid grid-cols-4 gap-3"><Inp label="Precio Compra" value={sf2.purchasePrice} onChange={v=>uf('purchasePrice',v)} prefix="$" type="number"/><Inp label="Property Manager" value={sf2.manager} onChange={v=>uf('manager',v)}/><Inp label="Comisión (%)" value={sf2.managerCommission} onChange={v=>uf('managerCommission',v)} type="number"/><div/></div>
          <div className="grid grid-cols-4 gap-3"><Inp label="Habitaciones" value={sf2.bedrooms} onChange={v=>uf('bedrooms',v)} type="number"/><Inp label="Baños" value={sf2.bathrooms} onChange={v=>uf('bathrooms',v)} type="number"/></div>
        </div>
        <button onClick={async()=>{try{await updateDoc(doc(db,'properties',propertyId),{name:sf2.name,address:sf2.address,city:sf2.city,state:sf2.state,type:sf2.type,purchasePrice:parseFloat(sf2.purchasePrice)||0,manager:sf2.manager,managerCommission:parseFloat(sf2.managerCommission)||15,bedrooms:parseInt(sf2.bedrooms)||0,bathrooms:parseInt(sf2.bathrooms)||0});alert('Guardado. Recarga para ver los cambios.')}catch(e){alert('Error: '+e.message)}}} className="mt-5 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">💾 Guardar Cambios</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl mt-4">
        <h3 className="text-base font-bold text-slate-700 mb-2">Socios Actuales</h3>
        <p className="text-xs text-slate-400 mb-4">Para agregar o cambiar socios, contacta al administrador.</p>
        <div className="space-y-2">{partners.map((p,i)=><div key={p.id} className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl border-l-4" style={{borderLeftColor:p.color}}>
          <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{background:p.color}}>{p.name.charAt(0)}</div><div><div className="font-semibold text-sm text-slate-700">{p.name}</div><div className="text-[10px] text-slate-400">{p.email||'Sin email'}</div></div></div>
          <div className="text-right"><div className="font-bold text-sm text-slate-800">{p.ownership}%</div><div className="text-[10px] text-slate-400">Capital: {fm(p.initialCapital)}</div></div>
        </div>)}</div>
      </div>

      <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6 max-w-2xl mt-4">
        <h3 className="text-base font-bold text-rose-700 mb-2">Zona de Peligro</h3>
        <p className="text-xs text-rose-500 mb-4">Estas acciones son irreversibles.</p>
        <button onClick={async()=>{if(!confirm('¿ELIMINAR esta propiedad y TODOS sus datos? Esta acción NO se puede deshacer.'))return;if(!confirm('¿Estás SEGURO? Se borrarán todos los statements, gastos, ingresos y aportes.'))return;for(const sub of['expenses','income','contributions','statements','valuations']){const snap=await import('firebase/firestore').then(m=>m.getDocs(collection(db,'properties',propertyId,sub)));for(const d of snap.docs)await deleteDoc(doc(db,'properties',propertyId,sub,d.id))}await deleteDoc(doc(db,'properties',propertyId));window.location.reload()}} className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition">🗑️ Eliminar Propiedad</button>
      </div>
    </>;})()}

    {/* ═══ REPORTS ═══ */}
    {view==='reports'&&<>
      <div className="flex justify-between items-center mb-2 no-print"><h1 className="text-[22px] font-extrabold text-slate-800">📄 Reportes Financieros</h1><button onClick={()=>window.print()} className="px-4 py-2.5 bg-slate-100 text-slate-600 text-xs rounded-xl font-bold hover:bg-slate-200 flex items-center gap-1.5 transition"><Printer size={13}/> Imprimir PDF</button></div>
      <p className="text-sm text-slate-400 mb-5 no-print">Reportes profesionales de tu propiedad. Selecciona un reporte y dale Imprimir PDF.</p>

      {/* Report tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm mb-5 overflow-x-auto no-print">
        {[['performance','📊 Rendimiento'],['pnl','📋 P&L Detallado'],['partners','👥 Socios'],['cashflow','💰 Cash Flow'],['mortgage_rpt','🏦 Hipoteca'],['expenses_rpt','🧾 Gastos']].map(([k,l])=>
          <button key={k} onClick={()=>setRptTab(k)} className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${rptTab===k?'bg-blue-600 text-white shadow-md':'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>{l}</button>
        )}
      </div>

      {/* PERFORMANCE REPORT */}
      {rptTab==='performance'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:shadow-none print:border-none">
        <div className="border-b-2 border-blue-600 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">{prop.name} — Reporte de Rendimiento</h2><p className="text-xs text-slate-400">{prop.address}, {prop.city}, {prop.state} · Generado: {new Date().toLocaleDateString('es')}</p></div>
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-bold uppercase">Revenue Total</div><div className="text-xl font-extrabold text-blue-700">{fm(revenue)}</div></div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100"><div className="text-[10px] text-emerald-600 font-bold uppercase">NOI</div><div className="text-xl font-extrabold text-emerald-700">{fm(noi)}</div></div>
          <div className={`rounded-xl p-3 text-center border ${cashFlow>=0?'bg-emerald-50 border-emerald-100':'bg-rose-50 border-rose-100'}`}><div className={`text-[10px] font-bold uppercase ${cashFlow>=0?'text-emerald-600':'text-rose-600'}`}>Cash Flow</div><div className={`text-xl font-extrabold ${cashFlow>=0?'text-emerald-700':'text-rose-700'}`}>{fm(cashFlow)}</div></div>
          <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100"><div className="text-[10px] text-purple-600 font-bold uppercase">Cash-on-Cash</div><div className="text-xl font-extrabold text-purple-700">{coc.toFixed(1)}%</div></div>
        </div>
        <div className="grid grid-cols-6 gap-2 mb-6">
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">Margen</div><div className="text-sm font-extrabold text-slate-800">{margin.toFixed(1)}%</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">Cap Rate</div><div className="text-sm font-extrabold text-slate-800">{capRate.toFixed(2)}%</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">Expense Ratio</div><div className="text-sm font-extrabold text-slate-800">{expRatio.toFixed(1)}%</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">Equity</div><div className="text-sm font-extrabold text-slate-800">{fm(equity)}</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">LTV</div><div className="text-sm font-extrabold text-slate-800">{ltv.toFixed(0)}%</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">Capital</div><div className="text-sm font-extrabold text-slate-800">{fm(totCont)}</div></div>
        </div>
        {relAnnual.length>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Evolución Anual</h3>
          <ResponsiveContainer width="100%" height={220}><ComposedChart data={relAnnual}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="year" tick={{fontSize:11,fill:'#94a3b8'}}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[4,4,0,0]}/><Bar dataKey="net" name="Net" fill="#059669" radius={[4,4,0,0]}/><Line dataKey="commission" name="Comisión" stroke="#DC2626" strokeWidth={2} dot={{r:3}}/></ComposedChart></ResponsiveContainer>
        </>}
        {monthRank.length>0&&<><h3 className="text-sm font-bold text-slate-700 mt-5 mb-3">Estacionalidad — Mejores y Peores Meses</h3>
          <div className="grid grid-cols-4 gap-2">{monthRank.slice(0,4).map((r,i)=><div key={r.month} className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100"><div className="text-[10px] text-emerald-600 font-bold">#{i+1} MEJOR</div><div className="text-base font-extrabold text-emerald-700">{r.month}</div><div className="text-xs text-emerald-500">{fm(r.avg)} avg</div></div>)}
          {monthRank.slice(-3).reverse().map((r,i)=><div key={r.month} className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100"><div className="text-[10px] text-rose-600 font-bold">PEOR</div><div className="text-base font-extrabold text-rose-700">{r.month}</div><div className="text-xs text-rose-500">{fm(r.avg)} avg</div></div>)}</div>
        </>}
      </div>}

      {/* P&L REPORT */}
      {rptTab==='pnl'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-blue-600 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Estado de Resultados (P&L)</h2><p className="text-xs text-slate-400">{prop.name} · {annual.length>0?annual[0].year+' — '+annual[annual.length-1].year:'Sin datos'}</p></div>
        {annual.length>0?<>
          <Tbl cols={[{label:'Concepto',render:r=><span className={`${r.bold?'font-extrabold':'font-medium'} ${r.color||'text-slate-700'}`}>{r.concept}</span>},...annual.map(y=>({label:y.year+(y.n<12?` (${y.n}m)`:''),r:true,render:r=>{const v=r.values[y.year];return<span className={`${r.bold?'font-extrabold':'font-medium'} ${r.color||''}`}>{v!==undefined?fm(v):'—'}</span>}}))]}
            rows={[
              {concept:'Revenue (Gross)',bold:true,color:'text-blue-600',values:Object.fromEntries(annual.map(y=>[y.year,y.revenue]))},
              {concept:'(-) Comisión PM',color:'text-rose-500',values:Object.fromEntries(annual.map(y=>[y.year,y.commission]))},
              {concept:'(-) Electricidad',values:Object.fromEntries(annual.map(y=>[y.year,y.duke]))},
              {concept:'(-) HOA',values:Object.fromEntries(annual.map(y=>[y.year,y.hoa]))},
              {concept:'(-) Mantenimiento',values:Object.fromEntries(annual.map(y=>[y.year,y.maintenance]))},
              {concept:'(-) Agua',values:Object.fromEntries(annual.map(y=>[y.year,y.water]))},
              {concept:'(-) Vendor/Otros',values:Object.fromEntries(annual.map(y=>[y.year,y.vendor]))},
              {concept:'Net al Owner',bold:true,color:'text-emerald-600',values:Object.fromEntries(annual.map(y=>[y.year,y.net]))},
              {concept:'Margen',bold:true,color:null,values:Object.fromEntries(annual.map(y=>[y.year,y.revenue?(y.net/y.revenue*100):0])),render:null},
            ].map(r=>({...r,values:r.values||{}}))}
          />
          <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
            <h4 className="text-xs font-bold text-slate-600 mb-2">Totales Acumulados</h4>
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <div><span className="text-slate-400">Revenue Total</span><div className="font-extrabold text-blue-600 text-base">{fm(stmtRev)}</div></div>
              <div><span className="text-slate-400">Gastos Totales</span><div className="font-extrabold text-rose-500 text-base">{fm(stmtRev-stmtNet)}</div></div>
              <div><span className="text-slate-400">Net Total</span><div className="font-extrabold text-emerald-600 text-base">{fm(stmtNet)}</div></div>
              <div><span className="text-slate-400">Margen Promedio</span><div className="font-extrabold text-slate-800 text-base">{stmtRev?((stmtNet/stmtRev)*100).toFixed(1)+'%':'—'}</div></div>
            </div>
          </div>
        </>:<p className="text-sm text-slate-400 text-center py-8">Carga statements para generar el P&L.</p>}
      </div>}

      {/* PARTNERS REPORT */}
      {rptTab==='partners'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-purple-600 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Reporte de Socios — Capital & Balance</h2><p className="text-xs text-slate-400">{prop.name} · {partners.length} socio(s) · Generado: {new Date().toLocaleDateString('es')}</p></div>
        <div className="grid gap-4 mb-5" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,3)},1fr)`}}>
          {partners.map(p=>{const t=pt[p.id]||{};const totalPut=(t.cont||0)+(t.exp||0);const shareOfRev=revenue*(p.ownership/100);const shareOfNet=(stmtNet||totNet)*(p.ownership/100);const roi=totalPut>0?((shareOfNet/totalPut)*100).toFixed(1):0;
            return<div key={p.id} className="rounded-2xl border-2 p-5" style={{borderColor:p.color+'30',borderLeftColor:p.color,borderLeftWidth:4}}>
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{background:p.color}}>{p.name.charAt(0)}</div><div><div className="font-bold text-slate-800">{p.name}</div><div className="text-xs text-slate-400">{p.ownership}% participación</div></div></div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Capital aportado</span><span className="font-bold text-emerald-600">{fm(t.cont)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Gastos pagados</span><span className="font-bold text-rose-500">{fm(t.exp)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Total invertido</span><span className="font-extrabold text-slate-800">{fm(totalPut)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Revenue ({p.ownership}%)</span><span className="font-bold text-blue-600">{fm(shareOfRev)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Net ({p.ownership}%)</span><span className="font-bold text-emerald-600">{fm(shareOfNet)}</span></div>
                <div className="flex justify-between py-2 bg-slate-50 rounded-lg px-3 mt-2"><span className="text-slate-600 font-semibold">ROI Personal</span><span className={`font-extrabold ${parseFloat(roi)>0?'text-emerald-600':'text-rose-500'}`}>{roi}%</span></div>
              </div>
            </div>})}
        </div>
        {contribs.length>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Historial de Movimientos</h3>
          <Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},{label:'Socio',render:r=><span className="font-semibold" style={{color:pCl(r.paidBy)}}>{pN(r.paidBy)}</span>},{label:'Tipo',render:r=><span className="text-xs">{r.type==='contribution'?'📥 Aporte':'📤 Distribución'}</span>},{label:'Concepto',key:'concept',cls:'text-slate-600'},{label:'Monto',r:true,render:r=><span className="font-bold text-emerald-600">{fm(r.amount)}</span>}]} rows={contribs}/>
        </>}
      </div>}

      {/* CASH FLOW REPORT */}
      {rptTab==='cashflow'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-emerald-600 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Estado de Cash Flow</h2><p className="text-xs text-slate-400">{prop.name} · Generado: {new Date().toLocaleDateString('es')}</p></div>
        <div className="space-y-3">
          <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-xl border border-blue-100"><span className="font-bold text-blue-700">Revenue Total</span><span className="font-extrabold text-blue-700 text-lg">{fm(revenue)}</span></div>
          <div className="pl-6 space-y-1">
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Comisión PM</span><span className="font-semibold text-rose-500">{fm(stmtComm)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Electricidad</span><span className="font-semibold text-rose-500">{fm(stmtDuke)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) HOA</span><span className="font-semibold text-rose-500">{fm(stmtHoa)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Mantenimiento</span><span className="font-semibold text-rose-500">{fm(stmtMaint)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Agua</span><span className="font-semibold text-rose-500">{fm(stmtWater)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Vendor/Otros</span><span className="font-semibold text-rose-500">{fm(stmtVendor)}</span></div>
            {totExp>0&&<div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Gastos Adicionales</span><span className="font-semibold text-rose-500">{fm(totExp)}</span></div>}
          </div>
          <div className="flex justify-between py-3 px-4 bg-emerald-50 rounded-xl border border-emerald-100"><span className="font-bold text-emerald-700">= NOI (Net Operating Income)</span><span className="font-extrabold text-emerald-700 text-lg">{fm(noi)}</span></div>
          {mort.balance>0&&<><div className="pl-6"><div className="flex justify-between py-2 text-sm"><span className="text-amber-600">(-) Pago de Hipoteca (anual)</span><span className="font-semibold text-amber-600">{fm(annualMortgage)}</span></div></div>
          <div className={`flex justify-between py-3 px-4 rounded-xl border ${cashFlow>=0?'bg-emerald-50 border-emerald-100':'bg-rose-50 border-rose-100'}`}><span className={`font-bold ${cashFlow>=0?'text-emerald-700':'text-rose-700'}`}>= Cash Flow</span><span className={`font-extrabold text-lg ${cashFlow>=0?'text-emerald-700':'text-rose-700'}`}>{fm(cashFlow)}</span></div></>}
          <div className="flex justify-between py-3 px-4 bg-purple-50 rounded-xl border border-purple-100 mt-2"><span className="font-bold text-purple-700">Cash-on-Cash Return</span><span className="font-extrabold text-purple-700 text-lg">{coc.toFixed(1)}%</span></div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">Cash-on-Cash = Cash Flow Anual / Capital Total Invertido ({fm(totCont)})</p>
        </div>
      </div>}

      {/* MORTGAGE REPORT */}
      {rptTab==='mortgage_rpt'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-amber-500 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Resumen de Hipoteca</h2><p className="text-xs text-slate-400">{prop.name} · Generado: {new Date().toLocaleDateString('es')}</p></div>
        {mort.balance>0?<>
          <div className="grid grid-cols-5 gap-3 mb-5">
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Balance</div><div className="text-lg font-extrabold text-slate-800">{fm(mort.balance)}</div></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Tasa</div><div className="text-lg font-extrabold text-slate-800">{mort.rate}%</div></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Plazo</div><div className="text-lg font-extrabold text-slate-800">{mort.termYears} años</div></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Pago Mensual</div><div className="text-lg font-extrabold text-slate-800">{fm(mort.monthlyPayment)}</div></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Equity</div><div className="text-lg font-extrabold text-emerald-600">{fm(equity)}</div></div>
          </div>
          {sNE.length>0&&<>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Tabla de Amortización (Anual)</h3>
            <Tbl cols={[{label:'Año',render:r=><span className="font-bold">{r.yr}</span>},{label:'Mes',r:true,render:r=>r.mo},{label:'Balance',r:true,render:r=><span className="font-semibold text-slate-800">{fm(r.bal)}</span>},{label:'Interés Acumulado',r:true,render:r=><span className="text-rose-500">{fm(r.ti)}</span>}]} rows={sNE}/>
          </>}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-rose-50 rounded-xl p-4 text-center border border-rose-100"><div className="text-[10px] text-rose-600 font-bold uppercase">Total Intereses</div><div className="text-2xl font-extrabold text-rose-700">{sNE.length>0?fm(sNE[sNE.length-1].ti):'—'}</div><div className="text-[10px] text-rose-500">sin pagos extra</div></div>
            <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100"><div className="text-[10px] text-amber-600 font-bold uppercase">LTV</div><div className="text-2xl font-extrabold text-amber-700">{ltv.toFixed(0)}%</div><div className="text-[10px] text-amber-500">{ltv>80?'Alto riesgo':ltv>60?'Moderado':'Conservador'}</div></div>
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-bold uppercase">DSCR</div><div className="text-2xl font-extrabold text-blue-700">{annualMortgage>0?(noi/annualMortgage).toFixed(2):'N/A'}</div><div className="text-[10px] text-blue-500">{noi/annualMortgage>1.25?'Saludable':'Ajustado'}</div></div>
          </div>
        </>:<p className="text-sm text-slate-400 text-center py-8">No hay hipoteca configurada. Ve al módulo de Hipoteca para configurarla.</p>}
      </div>}

      {/* EXPENSES REPORT */}
      {rptTab==='expenses_rpt'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-rose-500 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Reporte de Gastos</h2><p className="text-xs text-slate-400">{prop.name} · {expenses.length} registros · Generado: {new Date().toLocaleDateString('es')}</p></div>
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100"><div className="text-[10px] text-rose-600 font-bold uppercase">Total Gastos</div><div className="text-xl font-extrabold text-rose-700">{fm(totalOpEx)}</div></div>
          <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100"><div className="text-[10px] text-amber-600 font-bold uppercase">Fijos (Statements)</div><div className="text-xl font-extrabold text-amber-700">{fm(stmtRev-stmtNet)}</div></div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Adicionales</div><div className="text-xl font-extrabold text-slate-800">{fm(totExp)}</div></div>
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-bold uppercase">Expense Ratio</div><div className="text-xl font-extrabold text-blue-700">{expRatio.toFixed(1)}%</div></div>
        </div>
        {/* Breakdown from statements */}
        {stmtRev>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Desglose — Costos Operativos (de Statements)</h3>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[['Comisión PM',stmtComm,'💼'],['Electricidad',stmtDuke,'⚡'],['HOA',stmtHoa,'🏢'],['Mantenimiento',stmtMaint,'🔧'],['Agua',stmtWater,'💧'],['Vendor',stmtVendor,'🛠️']].filter(([_,v])=>v>0).map(([l,v,ic])=><div key={l} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border">
              <span className="text-lg">{ic}</span><div><div className="text-xs text-slate-500">{l}</div><div className="font-bold text-slate-800">{fm(v)}</div><div className="text-[10px] text-slate-400">{pct(v,stmtRev)} del revenue</div></div>
            </div>)}
          </div>
        </>}
        {expByCat.length>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Gastos Adicionales por Categoría</h3>
          <ResponsiveContainer width="100%" height={Math.max(150,expByCat.length*35)}><BarChart data={expByCat} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis type="number" tickFormatter={fm} tick={{fontSize:10,fill:'#94a3b8'}}/><YAxis type="category" dataKey="name" tick={{fontSize:10,fill:'#64748b'}} width={120}/><Tooltip content={<Tip/>}/><Bar dataKey="value" name="Monto" fill="#DC2626" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer>
        </>}
      </div>}
    </>}

    </div></div>

    {/* ═══ MODALS ═══ */}
    {modal==='expense'&&<Mdl title={editId?'✏️ Editar Gasto':'Registrar Gasto'} grad="from-rose-500 to-rose-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>{const data={...ef,amount:parseFloat(ef.amount)};if(editId){update('expenses',editId,data)}else{save('expenses',data)}}} disabled={!ef.amount||!ef.concept} className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?'Actualizar':'Guardar'}</button></>}>
      <div className="grid grid-cols-2 gap-3"><Inp label="Fecha" value={ef.date} onChange={v=>ue('date',v)} type="date"/><Sel label="Categoría" value={ef.category} onChange={v=>ue('category',v)} options={CATS.map(c=>({v:c.v,l:c.i+' '+c.l}))}/></div>
      <Inp label="Concepto" value={ef.concept} onChange={v=>ue('concept',v)} placeholder="Descripción"/>
      <Inp label="Monto (USD)" value={ef.amount} onChange={v=>ue('amount',v)} prefix="$" type="number"/>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de gasto</label><div className="grid grid-cols-2 gap-2">{[['fixed','🔄 Fijo'],['additional','➕ Adicional']].map(([v,l])=><button key={v} type="button" onClick={()=>ue('type',v)} className={`py-2.5 rounded-xl border-2 text-sm font-medium transition ${ef.type===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div></div>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">¿Quién pagó?</label><PPick partners={partners} selected={ef.paidBy} onChange={v=>ue('paidBy',v)}/></div>
    </Mdl>}

    {modal==='contribution'&&<Mdl title={editId?'✏️ Editar Aporte':'Aporte de Capital'} grad="from-purple-500 to-purple-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>{const data={...cf,amount:parseFloat(cf.amount),type:'contribution'};if(editId){update('contributions',editId,data)}else{save('contributions',data)}}} disabled={!cf.amount} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?'Actualizar':'Guardar'}</button></>}>
      <div className="grid grid-cols-2 gap-3"><Inp label="Fecha" value={cf.date} onChange={v=>uc('date',v)} type="date"/><Inp label="Monto" value={cf.amount} onChange={v=>uc('amount',v)} prefix="$" type="number"/></div>
      <Inp label="Concepto" value={cf.concept} onChange={v=>uc('concept',v)} placeholder="Ej: Down payment"/>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Socio</label><PPick partners={partners} selected={cf.paidBy} onChange={v=>uc('paidBy',v)}/></div>
    </Mdl>}

    {modal==='addStmt'&&<Mdl title={editId?'✏️ Editar Statement':'Statement Manual'} grad="from-slate-700 to-slate-800" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>{const yr=parseInt(sf.year),mo=parseInt(sf.month);const data={year:yr,month:mo,revenue:parseFloat(sf.revenue)||0,net:parseFloat(sf.net)||0,commission:parseFloat(sf.commission)||0,duke:parseFloat(sf.duke)||0,water:parseFloat(sf.water)||0,hoa:parseFloat(sf.hoa)||0,maintenance:parseFloat(sf.maintenance)||0,vendor:parseFloat(sf.vendor)||0};if(editId){update('statements',editId,data)}else{if(stmts.find(s=>s.year===yr&&s.month===mo)){alert(`Ya existe un statement para ${M[mo-1]} ${yr}.`);return;}save('statements',data);setSf(x=>({...x,month:x.month<12?x.month+1:1,revenue:'',net:'',commission:'',duke:'',water:'',hoa:'',maintenance:'',vendor:''}))}}} disabled={!sf.revenue} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?'Actualizar':'Guardar'}</button></>}>
      <div className="grid grid-cols-2 gap-3"><Inp label="Año" value={sf.year} onChange={v=>us('year',v)} type="number" disabled={!!editId}/><Sel label="Mes" value={sf.month} onChange={v=>us('month',v)} options={M.map((m,i)=>({v:i+1,l:m}))}/></div>
      <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100"><div className="text-[10px] font-black text-emerald-700 uppercase mb-3">Ingresos</div><Inp label="Revenue Total" value={sf.revenue} onChange={v=>us('revenue',v)} prefix="$" type="number"/></div>
      <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100"><div className="text-[10px] font-black text-rose-700 uppercase mb-3">Gastos</div><div className="grid grid-cols-2 gap-3"><Inp label="Comisión PM" value={sf.commission} onChange={v=>us('commission',v)} prefix="$" type="number"/><Inp label="Electricidad" value={sf.duke} onChange={v=>us('duke',v)} prefix="$" type="number"/><Inp label="Agua" value={sf.water} onChange={v=>us('water',v)} prefix="$" type="number"/><Inp label="HOA" value={sf.hoa} onChange={v=>us('hoa',v)} prefix="$" type="number"/><Inp label="Maintenance" value={sf.maintenance} onChange={v=>us('maintenance',v)} prefix="$" type="number"/><Inp label="Vendor/Otros" value={sf.vendor} onChange={v=>us('vendor',v)} prefix="$" type="number"/></div></div>
      <Inp label="Net al Owner" value={sf.net} onChange={v=>us('net',v)} prefix="$" type="number"/>
    </Mdl>}

    {modal==='editMort'&&<Mdl title="Editar Hipoteca" grad="from-blue-600 to-blue-700" onClose={()=>setModal(null)} footer={<><button onClick={()=>setModal(null)} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={async()=>{await saveMortgage();setModal(null)}} disabled={!(parseFloat(mc.bal)>0)||!(parseFloat(mc.rate)>0)||!(parseFloat(mc.pay)>0)||savingMort} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-30 flex items-center justify-center gap-2">{savingMort&&<Loader2 size={14} className="animate-spin"/>}Guardar</button></>}>
      <div className="grid grid-cols-2 gap-3"><Inp label="Balance" value={mc.bal} onChange={v=>umc('bal',v)} prefix="$" type="number"/><Inp label="Tasa (%)" value={mc.rate} onChange={v=>umc('rate',v)} type="number"/></div>
      <div className="grid grid-cols-3 gap-3"><Inp label="Plazo (años)" value={mc.term} onChange={v=>umc('term',v)} type="number"/><Inp label="Pago Mensual" value={mc.pay} onChange={v=>umc('pay',v)} prefix="$" type="number"/><Inp label="Inicio" value={mc.start} onChange={v=>umc('start',v)} type="date"/></div>
    </Mdl>}

    {modal==='repair'&&<Mdl title={editId?'✏️ Editar Ticket':'🔧 Nuevo Ticket de Reparación'} grad="from-amber-500 to-amber-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>{const data={...rf,amount:parseFloat(rf.amount)||0};if(editId){update('repairs',editId,data)}else{save('repairs',data)}}} disabled={!rf.title} className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?'Actualizar':'Guardar'}</button></>}>
      <Inp label="Título" value={rf.title} onChange={v=>ur('title',v)} placeholder="Ej: Reparación de AC, Pintura exterior"/>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Fecha" value={rf.date} onChange={v=>ur('date',v)} type="date"/>
        <Inp label="Monto (USD)" value={rf.amount} onChange={v=>ur('amount',v)} prefix="$" type="number"/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Sel label="Tipo" value={rf.category} onChange={v=>ur('category',v)} options={[{v:'repair',l:'🔧 Reparación urgente'},{v:'preventive',l:'🛡️ Mantenimiento preventivo'},{v:'capex',l:'📈 Mejora / CapEx'}]}/>
        <Sel label="Estado" value={rf.status} onChange={v=>ur('status',v)} options={[{v:'pending',l:'⚠ Pendiente'},{v:'progress',l:'⏳ En Progreso'},{v:'done',l:'✓ Completado'}]}/>
      </div>
      <Inp label="Vendor / Proveedor" value={rf.vendor} onChange={v=>ur('vendor',v)} placeholder="Ej: ABC Plumbing, Home Depot"/>
      <Inp label="Descripción (opcional)" value={rf.description} onChange={v=>ur('description',v)} placeholder="Detalles adicionales..."/>
      {partners.length>0&&<div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">¿Quién pagó?</label><PPick partners={partners} selected={rf.paidBy} onChange={v=>ur('paidBy',v)}/></div>}
    </Mdl>}

    {modal==='task'&&<Mdl title={editId?'✏️ Editar Tarea':'📋 Nueva Tarea'} grad="from-indigo-500 to-indigo-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>{const data={...tf};if(editId){update('tasks',editId,data)}else{save('tasks',data)}}} disabled={!tf.title} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?'Actualizar':'Guardar'}</button></>}>
      <Inp label="Título" value={tf.title} onChange={v=>ut('title',v)} placeholder="Ej: Renovar seguro, Pagar property tax"/>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Fecha límite" value={tf.dueDate} onChange={v=>ut('dueDate',v)} type="date"/>
        <Sel label="Prioridad" value={tf.priority} onChange={v=>ut('priority',v)} options={[{v:'high',l:'🔴 Alta'},{v:'medium',l:'🟡 Media'},{v:'low',l:'🟢 Baja'}]}/>
      </div>
      <Sel label="Estado" value={tf.status} onChange={v=>ut('status',v)} options={[{v:'pending',l:'⚠ Pendiente'},{v:'progress',l:'⏳ En Progreso'},{v:'done',l:'✓ Completada'}]}/>
      <Inp label="Notas (opcional)" value={tf.notes} onChange={v=>ut('notes',v)} placeholder="Detalles adicionales..."/>
    </Mdl>}

    {modal==='valuation'&&<Mdl title={editId?'✏️ Editar Valorización':'📈 Registrar Valor de Mercado'} grad="from-emerald-600 to-teal-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>{const data={date:vf.date,value:parseFloat(vf.value)||0,source:vf.source,notes:vf.notes};if(editId){update('valuations',editId,data)}else{save('valuations',data)}}} disabled={!vf.value} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?'Actualizar':'Guardar'}</button></>}>
      <Inp label="Fecha de Estimación" value={vf.date} onChange={v=>uv('date',v)} type="date"/>
      <Inp label="Valor Estimado de Mercado" value={vf.value} onChange={v=>uv('value',v)} prefix="$" type="number" placeholder="490,000"/>
      <Sel label="Fuente" value={vf.source} onChange={v=>uv('source',v)} options={[{v:'manual',l:'Estimación propia'},{v:'zillow',l:'Zillow Zestimate'},{v:'redfin',l:'Redfin Estimate'},{v:'appraisal',l:'Avalúo profesional'},{v:'broker',l:'CMA de broker'},{v:'comps',l:'Comparables de mercado'}]}/>
      <Inp label="Notas (opcional)" value={vf.notes} onChange={v=>uv('notes',v)} placeholder="Ej: Basado en venta de vecino por $500K"/>
      {vf.value&&prop.purchasePrice>0&&<div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Precio Compra</span><span className="font-semibold">{fm(prop.purchasePrice)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Valor Estimado</span><span className="font-bold text-emerald-600">{fm(parseFloat(vf.value))}</span></div>
        <div className="flex justify-between border-t border-slate-200 pt-2"><span className="text-slate-600 font-semibold">Apreciación</span><span className={`font-extrabold ${parseFloat(vf.value)>=prop.purchasePrice?'text-emerald-600':'text-rose-500'}`}>{((parseFloat(vf.value)-prop.purchasePrice)/prop.purchasePrice*100).toFixed(1)}% ({fm(parseFloat(vf.value)-prop.purchasePrice)})</span></div>
      </div>}
    </Mdl>}

    {modal==='upload'&&<Mdl title="📤 Subir Statements (PDF)" grad="from-blue-600 to-cyan-600" onClose={()=>setModal(null)}>
      <p className="text-sm text-slate-500 mb-1">Sube los PDFs de los owner statements de tu property manager. El sistema extrae automáticamente: año, periodo, revenue, comisión, utilities, HOA, maintenance y net.</p>
      <div className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50/50 ${uploadLog.some(l=>l.status==='processing')?'border-blue-300 bg-blue-50/30':'border-slate-200'}`}
        onClick={()=>fileRef.current?.click()}
        onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('border-blue-400','bg-blue-50')}}
        onDragLeave={e=>{e.currentTarget.classList.remove('border-blue-400','bg-blue-50')}}
        onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('border-blue-400','bg-blue-50');handlePDFs(e.dataTransfer.files)}}>
        <Upload size={32} className="text-slate-300 mx-auto mb-2"/>
        <div className="text-sm font-semibold text-slate-600">Arrastra PDFs aquí o haz clic</div>
        <div className="text-xs text-slate-400 mt-1">Soporta múltiples archivos a la vez</div>
      </div>
      <input ref={fileRef} type="file" accept=".pdf" multiple className="hidden" onChange={e=>{if(e.target.files.length)handlePDFs(e.target.files);e.target.value=''}}/>
      {uploadLog.length>0&&<div className="space-y-2 mt-3 max-h-[300px] overflow-y-auto">{uploadLog.map((l,i)=>(
        <div key={i} className={`flex items-start gap-2 p-3 rounded-xl text-xs font-medium ${l.status==='ok'?'bg-emerald-50 text-emerald-700 border border-emerald-100':l.status==='warn'?'bg-amber-50 text-amber-700 border border-amber-100':l.status==='dup'?'bg-slate-50 text-slate-600 border border-slate-200':l.status==='processing'?'bg-blue-50 text-blue-700 border border-blue-100':'bg-rose-50 text-rose-700 border border-rose-100'}`}>
          <span className="shrink-0">{l.status==='ok'?'✅':l.status==='warn'?'⚠️':l.status==='dup'?'🔄':l.status==='processing'?'⏳':'❌'}</span>
          <div><div className="font-bold">{l.file}</div><div className="font-normal mt-0.5">{l.msg}</div></div>
        </div>
      ))}</div>}
      <div className="border-t border-slate-100 pt-3 mt-2">
        <button onClick={()=>{setModal('addStmt')}} className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold text-xs hover:bg-slate-200 transition flex items-center justify-center gap-2"><Plus size={14}/>O ingresar manualmente</button>
      </div>
    </Mdl>}
  </div>;
}

// ═══ ROOT ═══
export default function App() {
  const [user,setUser]=useState(null);const [ready,setReady]=useState(false);const [allProps,setAllProps]=useState([]);const [active,setActive]=useState(null);const [checking,setChecking]=useState(false);
  useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setReady(true);if(!u){setAllProps([]);setActive(null)}}),[]);
  useEffect(()=>{if(!user)return;setChecking(true);
    const q1=query(collection(db,'properties'),where('ownerId','==',user.uid));
    const q2=query(collection(db,'properties'),where('memberEmails','array-contains',user.email));
    let r1=[],r2=[];const merge=()=>{const m=new Map();[...r1,...r2].forEach(d=>m.set(d.id,d));const a=Array.from(m.values());setAllProps(a);if(!active&&a.length>0)setActive(a[0].id);setChecking(false)};
    const u1=onSnapshot(q1,s=>{r1=s.docs.map(d=>({id:d.id,...d.data()}));merge()});
    const u2=onSnapshot(q2,s=>{r2=s.docs.map(d=>({id:d.id,...d.data()}));merge()});
    return()=>{u1();u2()}},[user]);
  const ap=allProps.find(p=>p.id===active);
  if(!ready)return<div className="min-h-screen bg-[#080E1A] flex items-center justify-center"><div className="text-center"><div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20"><span className="text-sm font-black text-white">OD</span></div><Loader2 size={24} className="animate-spin text-blue-500 mx-auto"/></div></div>;
  if(!user)return<AuthScreen/>;
  if(checking)return<div className="min-h-screen bg-[#080E1A] flex items-center justify-center"><div className="text-center"><div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20"><span className="text-sm font-black text-white">OD</span></div><Loader2 size={24} className="animate-spin text-blue-500 mx-auto mb-3"/><p className="text-white/30 text-sm">Cargando propiedades...</p></div></div>;
  if(!allProps.length||!ap)return<Onboarding userId={user.uid} onComplete={id=>setActive(id)}/>;
  return<Dashboard propertyId={active} propertyData={ap} allProperties={allProps} onSwitchProperty={setActive} onLogout={()=>signOut(auth)} onAddProperty={()=>{setActive(null);setAllProps([])}} userEmail={user.email}/>;
}
