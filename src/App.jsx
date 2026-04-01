import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, where, updateDoc, getDocs } from 'firebase/firestore';
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
  const pdf = await pdfjsLib.getDocument({data: new Uint8Array(buf)}).promise;

  let allItems = [];
  let fullText = '';
  for (let i=1; i<=pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    content.items.forEach(it => {
      if (it.str.trim()) allItems.push({ text: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]), page: i });
    });
    fullText += content.items.map(it=>it.str).join(' ') + '\n';
  }

  // Year & Period
  const ym = fullText.match(/Year:\s*(\d{4})\s*Period:\s*(\d+)/);
  if (!ym || parseInt(ym[2])===0) return {error:'No es statement mensual (Period 0 o no encontrado)'};
  const year=parseInt(ym[1]), month=parseInt(ym[2]);

  // Build rows by page + Y coordinate
  const rowMap = {};
  allItems.forEach(it => {
    const key = it.page + '_' + Math.round(it.y / 3) * 3;
    if (!rowMap[key]) rowMap[key] = [];
    rowMap[key].push(it);
  });
  const rows = Object.entries(rowMap).map(([key, items]) => ({
    key,
    page: parseInt(key.split('_')[0]),
    y: parseInt(key.split('_')[1]),
    items: items.sort((a,b) => a.x - b.x),
    text: items.sort((a,b) => a.x - b.x).map(i=>i.text).join(' ')
  })).sort((a,b) => a.page===b.page ? b.y-a.y : a.page-b.page);

  // ═══ STRATEGY: Parse from Transaction Summary (consolidated totals) ═══
  // Transaction Summary rows have NO date prefix and usually TWO amounts (Period + YTD)
  const findSummary = (label) => {
    const lbl = label.toLowerCase();
    for (const row of rows) {
      if (!row.text.toLowerCase().includes(lbl)) continue;
      // Skip detail rows (they start with a date like 02/04/2026)
      if (/^\d{2}\/\d{2}\/\d{4}/.test(row.text.trim())) continue;
      const amounts = row.text.match(/\$?-?([\d,]+\.\d{2})/g);
      if (amounts && amounts.length >= 1) {
        // First amount = Period column, second = YTD
        const val = parseFloat(amounts[0].replace(/[$,-]/g, ''));
        if (val > 0) return val;
      }
    }
    return 0;
  };

  // For items in the detail section (have date prefix)
  const findDetail = (label) => {
    const lbl = label.toLowerCase();
    for (const row of rows) {
      if (!row.text.toLowerCase().includes(lbl)) continue;
      if (!/^\d{2}\/\d{2}\/\d{4}/.test(row.text.trim())) continue;
      const amounts = row.text.match(/\$?([\d,]+\.\d{2})/g);
      if (amounts && amounts.length > 0) {
        return parseFloat(amounts[0].replace(/[$,]/g, ''));
      }
    }
    return 0;
  };

  // ═══ GROSS REVENUE from Transaction Summary ═══
  const roomCharge = findSummary('Room Charge');
  const pool = findSummary('Pool Heat');
  let revenue = roomCharge + pool;
  // Fallback: sum individual Room Charges if no summary
  if (!revenue) {
    rows.forEach(r => {
      if (r.text.toLowerCase().includes('room charge') && /^\d{2}\//.test(r.text.trim())) {
        const amounts = r.text.match(/\$?([\d,]+\.\d{2})/g);
        if (amounts) revenue += parseFloat(amounts[0].replace(/[$,]/g, ''));
      }
    });
  }

  // ═══ OPERATING EXPENSES from Transaction Summary ═══
  const commission = findSummary('Commission');
  const hoa = findSummary('HOA') || findSummary('Association');
  const maintenance = findSummary('Mantenimiento');
  const vendorTotal = findSummary('Vendor Bills') || findSummary('Vendor');

  // ═══ DUKE & WATER from detail lines (Vendor Bills breakdown) ═══
  let duke = 0;
  rows.forEach(r => {
    const rt = r.text.toLowerCase();
    if ((rt.includes('duke') || rt.includes('electric') || rt.includes('energy')) 
        && !rt.includes('commission') && !rt.includes('transaction') && !rt.includes('summary')
        && /^\d{2}\//.test(r.text.trim())) {
      const amounts = r.text.match(/\$?([\d,]+\.\d{2})/g);
      if (amounts) { const v=parseFloat(amounts[0].replace(/[$,]/g,'')); if(v>0&&v<2000) duke+=v; }
    }
  });
  // Fallback: search non-detail rows but exclude Transaction Summary row
  if (!duke) {
    rows.forEach(r => {
      const rt = r.text.toLowerCase();
      if ((rt.includes('duke') || rt.includes('electric')) && !rt.includes('commission') && !/^\d{2}\//.test(r.text.trim())) {
        const amounts = r.text.match(/\$?-?([\d,]+\.\d{2})/g);
        if (amounts) { const v=parseFloat(amounts[0].replace(/[$,-]/g,'')); if(v>0&&v<2000) duke=v; }
      }
    });
  }

  let water = 0;
  rows.forEach(r => {
    const rt = r.text.toLowerCase();
    if ((rt.includes('toho') || (rt.includes('water') && !rt.includes('pool') && !rt.includes('heater')))
        && /^\d{2}\//.test(r.text.trim())) {
      const amounts = r.text.match(/\$?([\d,]+\.\d{2})/g);
      if (amounts) { const v=parseFloat(amounts[0].replace(/[$,]/g,'')); if(v>0&&v<500) water+=v; }
    }
  });
  if (!water) water = findSummary('Toho') || findSummary('Water');

  // Vendor "other" = vendorTotal - duke - water (linen, supplies, etc.)
  const vendorOther = Math.max(0, vendorTotal - duke - water);

  // ═══ ACH PAYMENT (what was deposited to owner) ═══
  let net = 0;
  // Look for ACH Payment detail line
  rows.forEach(r => {
    if (r.text.toLowerCase().includes('ach') && r.text.toLowerCase().includes('payment') && /^\d{2}\//.test(r.text.trim())) {
      const amounts = r.text.match(/\$?([\d,]+\.\d{2})/g);
      if (amounts) net = parseFloat(amounts[0].replace(/[$,]/g, ''));
    }
  });
  // Fallback: Payments To Owner from Transaction Summary
  if (!net) net = findSummary('Payments To Owner') || findSummary('Payment to Owner');
  // Last resort: calculate
  if (!net && revenue > 0) {
    net = revenue - commission - duke - water - hoa - maintenance - vendorOther;
    if (net < 0) net = 0;
  }

  // ═══ NIGHTS & RESERVATIONS ═══
  let nights = 0;
  const nightMatches = fullText.match(/(\d+)\s*Nights?/gi);
  if (nightMatches) nightMatches.forEach(m => { const n=parseInt(m); if(n>0&&n<60) nights+=n; });
  const reservations = (fullText.match(/Reservation\s*#/gi)||[]).length;


  return {year, month, revenue, commission, duke, water, hoa, maintenance, vendor: vendorOther, net, nights, reservations, pool, roomCharge};
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
    // CRITICAL: Convert FileList to Array IMMEDIATELY before any await
    // FileList is a live reference — if the input is cleared, it becomes empty
    const fileArr=Array.from(files);
    const log=[];
    const uploaded=new Set();
    let existingPeriods=new Set();
    try{
      const freshSnap=await getDocs(collection(db,'properties',propertyId,'statements'));
      existingPeriods=new Set(freshSnap.docs.map(d=>{const s=d.data();return s.year+'-'+s.month}));
    }catch(e){/* ignore */}

    for(let fi=0; fi<fileArr.length; fi++){
      const f=fileArr[fi];
      if(!f.name.toLowerCase().endsWith('.pdf')){log.push({file:f.name,status:'error',msg:'No es un archivo PDF'});setUploadLog([...log]);continue;}
      log.push({file:f.name,status:'processing',msg:`Procesando... (${fi+1}/${fileArr.length})`});setUploadLog([...log]);
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
      }catch(e){log[log.length-1]={file:f.name,status:'error',msg:'Error: '+(e.message||String(e))};setUploadLog([...log]);}
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
  // Cash-on-Cash = Annual Cash Flow / Capital Invertido Invested
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

  const annual=useMemo(()=>{const y={};stmts.forEach(s=>{if(!y[s.year])y[s.year]={year:s.year,revenue:0,net:0,commission:0,duke:0,water:0,hoa:0,maintenance:0,vendor:0,nights:0,reservations:0,n:0};const a=y[s.year];a.revenue+=s.revenue||0;a.net+=s.net||0;a.commission+=s.commission||0;a.duke+=s.duke||0;a.water+=s.water||0;a.hoa+=s.hoa||0;a.maintenance+=s.maintenance||0;a.vendor+=s.vendor||0;a.nights+=s.nights||0;a.reservations+=s.reservations||0;a.n++});return Object.values(y).sort((a,b)=>a.year-b.year)},[stmts]);

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
    {/* ═══ DASHBOARD ═══ */}
    {/* ═══ DASHBOARD ═══ */}
    {/* ═══ DASHBOARD ═══ */}
    {view==='dashboard'&&(()=>{try{
      const fy=dashYear==='all'?null:annual.find(y=>y.year===dashYear);
      const fStmts=dashYear==='all'?stmts:stmts.filter(s=>s.year===dashYear);
      const n=fy?fy.n:(stmts.length||0);
      const fRev=fy?fy.revenue:(revenue||0);
      const fNet=fy?fy.net:((stmtNet||totNet)||0);
      const fComm=fy?(fy.commission||0):(stmtComm||0);
      const fDuke=fy?(fy.duke||0):(stmtDuke||0);
      const fHoa=fy?(fy.hoa||0):(stmtHoa||0);
      const fMaint=fy?(fy.maintenance||0):(stmtMaint||0);
      const fWater=fy?(fy.water||0):(stmtWater||0);
      const fVendor=fy?(fy.vendor||0):(stmtVendor||0);
      const fOpEx=fComm+fDuke+fHoa+fMaint+fWater+fVendor;
      const fNoi=fRev-fOpEx;
      const mMort=mort.monthlyPayment||0;
      const fMortP=mMort*n;
      const insExp=expenses.filter(e=>e.category==='insurance').reduce((s,e)=>s+((e.amount||0)),0);
      const taxExp=expenses.filter(e=>e.category==='taxes').reduce((s,e)=>s+((e.amount||0)),0);
      const ownerCosts=fMortP+insExp+taxExp;
      const fCF=fNoi-ownerCosts;
      const fCFmo=n>0?fCF/n:0;
      const partial=n>0&&n<12;
      const proyAnual=partial&&n>0?(fCF/n)*12:fCF;
      const fMargin=fRev>0?(fNoi/fRev*100):0;
      const noiAnual=partial&&n>0?fNoi/n*12:fNoi;
      const fCapR=marketValue>0?(noiAnual/marketValue*100):0;
      const fCoc=totCont>0?(proyAnual/totCont*100):0;
      const fDscr=mMort>0?(noiAnual/(mMort*12)):0;
      const fNights=fy?(fy.nights||0):fStmts.reduce((s,x)=>s+(x.nights||0),0);
      const fRes=fy?(fy.reservations||0):fStmts.reduce((s,x)=>s+(x.reservations||0),0);
      const availNights=n*30;
      const occupancy=availNights>0&&fNights>0?(fNights/availNights*100):0;
      const adr=fNights>0?fRev/fNights:(n>0?fRev/(n*30):0);
      const revpar=availNights>0?fRev/availNights:0;
      const prevYr=dashYear!=='all'?annual.find(y=>y.year===dashYear-1):null;
      const revChg=prevYr&&prevYr.revenue?((fRev-prevYr.revenue)/prevYr.revenue*100):null;
      const expData=[['Comisión',fComm,'#E11D48'],['Electricidad',fDuke,'#F59E0B'],['Agua',fWater,'#06B6D4'],['HOA',fHoa,'#8B5CF6'],['Mantenimiento',fMaint,'#10B981'],['Otros',fVendor,'#64748B']].filter(([_,v])=>v>0).map(([name,value,fill])=>({name,value,fill}));
      const mChart=[...fStmts].sort((a,b)=>a.year*100+a.month-b.year*100-b.month).map(s=>({m:M[s.month-1]+(dashYear==='all'?'\''+String(s.year).slice(2):''),rev:s.revenue||0,net:s.net||0,libre:(s.net||0)-mMort}));

      return <>
      <div className="hidden print-header"><div style={{display:'flex',justifyContent:'space-between'}}><div><h1 style={{fontSize:'18px',fontWeight:800,margin:0}}>{prop.name}</h1><p style={{fontSize:'9px',color:'#64748B',margin:'3px 0'}}>{prop.address}, {prop.city} {prop.state} · {new Date().toLocaleDateString('es',{day:'2-digit',month:'long',year:'numeric'})}</p></div><div style={{fontSize:'18px',fontWeight:900,color:'#1E3A5F'}}>OD</div></div></div>

      <div className="flex justify-between items-start mb-4 no-print">
        <div><h1 className="text-xl font-extrabold text-slate-800">{prop.name}</h1><p className="text-xs text-slate-400 mt-0.5">{prop.address}, {prop.city} {prop.state}</p></div>
        <div className="flex gap-2">
          <button onClick={()=>window.print()} className="px-3 py-2 bg-slate-100 text-slate-500 text-xs rounded-xl font-bold hover:bg-slate-200 flex items-center gap-1.5"><Printer size={13}/></button>
          <button onClick={()=>{setEf({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional'});setModal('expense')}} className="px-3 py-2 bg-slate-700 text-white text-xs rounded-xl font-bold hover:bg-slate-800 flex items-center gap-1.5 shadow-sm"><Plus size={13}/> Gasto</button>
          <button onClick={()=>{setUploadLog([]);setModal('upload')}} className="px-3 py-2 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"><Upload size={13}/> Statements</button>
        </div>
      </div>

      {annual.length>0&&<div className="flex items-center gap-1.5 mb-4 no-print">
        <button onClick={()=>setDashYear('all')} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${dashYear==='all'?'bg-slate-800 text-white':'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Acumulado</button>
        {annual.map(y=><button key={y.year} onClick={()=>setDashYear(y.year)} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${dashYear===y.year?'bg-slate-800 text-white':'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{y.year}{y.n<12?` (${y.n}m)`:''}</button>)}
      </div>}

      {fRev>0?<>
      {/* ── ROW 1: Key Performance Indicators ── */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <div className="bg-white rounded-2xl p-4 border-l-4 border-l-blue-500 border border-slate-200 shadow-sm">
          <div className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Gross Revenue</div>
          <div className="text-[22px] font-extrabold text-slate-800 mt-1">{fm(fRev)}</div>
          <div className="text-[10px] text-slate-400 mt-1">Ingreso bruto de la propiedad · {n}m</div>
          {revChg!==null&&<div className={`text-[10px] font-bold mt-1 ${revChg>=0?'text-emerald-600':'text-rose-500'}`}>{revChg>=0?'▲':'▼'} {Math.abs(revChg).toFixed(0)}% YoY</div>}
        </div>
        <div className="bg-white rounded-2xl p-4 border-l-4 border-l-emerald-500 border border-slate-200 shadow-sm">
          <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Net Income</div>
          <div className="text-[22px] font-extrabold text-emerald-700 mt-1">{fm(fNet)}</div>
          <div className="text-[10px] text-slate-400 mt-1">Lo que depositó el PM</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Margen Op.: <b className={fMargin>50?'text-emerald-600':fMargin>40?'text-amber-500':'text-rose-500'}>{fMargin.toFixed(0)}%</b></div>
        </div>
        <div className={`bg-white rounded-2xl p-4 border-l-4 border border-slate-200 shadow-sm ${fCF>=0?'border-l-emerald-500':'border-l-rose-500'}`}>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cash Flow</div>
          <div className={`text-[22px] font-extrabold mt-1 ${fCF>=0?'text-emerald-700':'text-rose-600'}`}>{fm(fCF)}</div>
          <div className="text-[10px] text-slate-400 mt-1">NOI − Debt Service − Seguro</div>
          <div className={`text-[10px] mt-0.5 ${fCF>=0?'text-emerald-500':'text-rose-400'}`}>{fm(fCFmo)}/mo{partial?` · Ann: ${fm(proyAnual)}`:''}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border-l-4 border-l-blue-400 border border-slate-200 shadow-sm">
          <div className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Occupancy</div>
          <div className="text-[22px] font-extrabold text-slate-800 mt-1">{fNights>0?occupancy.toFixed(0)+'%':'—'}</div>
          <div className="text-[10px] text-slate-400 mt-1">{fNights>0?`${fNights} de ${availNights} noches`:`Re-sube PDFs para ver`}</div>
          {fNights>0&&<div className="text-[10px] text-slate-500 mt-0.5">ADR: <b className="text-blue-600">{fm(adr)}</b></div>}
        </div>
        <div className="bg-white rounded-2xl p-4 border-l-4 border-l-purple-500 border border-slate-200 shadow-sm">
          <div className="text-[9px] font-bold text-purple-600 uppercase tracking-widest">CoC Return{partial?' (ann.)':''}</div>
          <div className={`text-[22px] font-extrabold mt-1 ${fCoc>8?'text-emerald-700':fCoc>4?'text-amber-600':'text-rose-600'}`}>{fCoc.toFixed(1)}%</div>
          <div className="text-[10px] text-slate-400 mt-1">Cash-on-Cash Return</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Capital: {fm(totCont)}</div>
        </div>
      </div>

      {/* ── ROW 2: Visual P&L Cascade + Metrics ── */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">P&L — Profit & Loss{partial?` (${n} meses)`:''}</h3>
          <div className="space-y-1.5">
            <div className="rounded-lg relative overflow-hidden" style={{height:'38px'}}><div className="absolute inset-0 bg-blue-500"/><div className="absolute inset-0 flex items-center justify-between px-4"><span className="text-[11px] font-bold text-white">Ingreso Bruto</span><span className="text-[12px] font-extrabold text-white">{fm(fRev)}</span></div></div>

            <div className="pl-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest py-0.5">Gastos Operativos (descuenta el administrador)</div>

            {[[`Comisión PM (${prop.managerCommission||15}%)`,fComm,'bg-rose-400'],['Electricidad (Duke Energy)',fDuke,'bg-amber-400'],['Agua (Toho)',fWater,'bg-cyan-400'],['HOA',fHoa,'bg-purple-400'],['Mantenimiento',fMaint,'bg-teal-400'],['Vendor / Suministros',fVendor,'bg-slate-400']].filter(([_,v])=>v>0).map(([l,v,bg])=>
              <div key={l} className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className={`absolute inset-y-0 left-0 ${bg} opacity-75`} style={{width:Math.max(2,v/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-4"><span className="text-[10px] text-slate-600">{l}</span><span className="text-[10px] font-bold text-slate-700">{fm(v)} <span className="text-slate-400">({(v/fRev*100).toFixed(0)}%)</span></span></div></div>
            )}

            <div className="rounded-lg relative overflow-hidden mt-1" style={{height:'34px'}}><div className="absolute inset-y-0 left-0 bg-emerald-500" style={{width:Math.max(2,fNoi/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-4 bg-emerald-50"><span className="text-[11px] font-bold text-emerald-800">= NOI <span className="text-[9px] font-normal">(Ingreso Operativo Neto)</span></span><span className="text-[12px] font-extrabold text-emerald-800">{fm(fNoi)} <span className="text-emerald-600 text-[10px]">{(fRev>0?(fNoi/fRev*100):0).toFixed(0)}%</span></span></div></div>

            {/* Owner costs */}
            {ownerCosts>0&&<>
              <div className="pl-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest py-0.5 mt-1">Hipoteca y Gastos del Propietario</div>
              {fMortP>0&&<div className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className="absolute inset-y-0 left-0 bg-red-400 opacity-75" style={{width:Math.max(2,fMortP/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-4"><span className="text-[10px] text-slate-600">Hipoteca ({fm(mMort)}/mo × {n}m)</span><span className="text-[10px] font-bold text-slate-700">{fm(fMortP)} <span className="text-slate-400">({(fMortP/fRev*100).toFixed(0)}%)</span></span></div></div>}
              {insExp>0&&<div className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className="absolute inset-y-0 left-0 bg-orange-400 opacity-75" style={{width:Math.max(2,insExp/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-4"><span className="text-[10px] text-slate-600">Seguro</span><span className="text-[10px] font-bold text-slate-700">{fm(insExp)}</span></div></div>}
              {taxExp>0&&<div className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className="absolute inset-y-0 left-0 bg-violet-400 opacity-75" style={{width:Math.max(2,taxExp/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-4"><span className="text-[10px] text-slate-600">Impuestos</span><span className="text-[10px] font-bold text-slate-700">{fm(taxExp)}</span></div></div>}
            </>}

            {/* Cash Flow */}
            <div className={`rounded-lg relative overflow-hidden border-2 mt-1 ${fCF>=0?'border-emerald-300 bg-emerald-50':'border-rose-300 bg-rose-50'}`} style={{height:'40px'}}>
              <div className={`absolute inset-y-0 left-0 ${fCF>=0?'bg-emerald-500':'bg-rose-500'}`} style={{width:Math.max(2,Math.abs(fCF)/fRev*100)+'%'}}/>
              <div className="absolute inset-0 flex items-center justify-between px-4">
                <span className={`text-[11px] font-extrabold ${fCF>=0?'text-emerald-800':'text-rose-800'}`}>= Cash Flow Neto</span>
                <span className={`text-[13px] font-black ${fCF>=0?'text-emerald-700':'text-rose-700'}`}>{fm(fCF)}</span>
              </div>
            </div>
            {partial&&<div className="text-center text-[10px] text-slate-400 bg-slate-50 rounded py-1.5 mt-1">Periodo parcial ({n} meses) · Proyección anualizada: <b>{fm(proyAnual)}</b></div>}
          </div>
        </div>

        {/* Right: Property + Metrics + Health */}
        <div className="col-span-5 space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Propiedad & Patrimonio</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Market Value</span><span className="text-[11px] font-extrabold text-slate-800">{fm(marketValue)}</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Purchase Price</span><span className="text-[11px] font-bold text-slate-500">{fm(prop.purchasePrice)}</span></div>
              {appreciation!==0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">Valorización</span><span className={`text-[11px] font-bold ${appreciation>0?'text-emerald-600':'text-rose-500'}`}>{appreciation>0?'+':''}{appreciation.toFixed(1)}% ({fm(marketValue-prop.purchasePrice)})</span></div>}
              <div className="border-t border-slate-100 my-0.5"/>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Equity</span><span className="text-[11px] font-extrabold text-emerald-600">{fm(realEquity)}</span></div>
              {mort.balance>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">Deuda Hipoteca</span><span className="text-[11px] font-bold text-slate-500">{fm(mort.balance)} <span className="text-slate-400">· LTV {realLTV.toFixed(0)}%</span></span></div>}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Rendimiento STR{partial?' (proy.)':''}</h3>
            <div className="space-y-2">
              {fNights>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">Noches Ocupadas</span><span className="text-[11px] font-bold text-slate-700">{fNights} de {availNights} <span className="text-slate-400">({occupancy.toFixed(0)}%)</span></span></div>}
              {fNights>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">ADR <span className="text-[9px] text-slate-300">(Tarifa Promedio/Noche)</span></span><span className="text-[11px] font-bold text-blue-600">{fm(adr)}</span></div>}
              {fNights>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">RevPAR <span className="text-[9px] text-slate-300">(Ingreso/Noche Disponible)</span></span><span className={`text-[11px] font-bold ${revpar>100?'text-emerald-600':'text-amber-500'}`}>{fm(revpar)}</span></div>}
              {fRes>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">Reservaciones</span><span className="text-[11px] font-bold text-slate-700">{fRes} <span className="text-slate-400">({(fNights/fRes).toFixed(1)} noches prom.)</span></span></div>}
              <div className="border-t border-slate-100 my-0.5"/>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Cap Rate</span><span className={`text-[11px] font-bold ${fCapR>6?'text-emerald-600':fCapR>4?'text-amber-500':'text-rose-500'}`}>{fCapR.toFixed(2)}%</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Cash-on-Cash</span><span className={`text-[11px] font-bold ${fCoc>8?'text-emerald-600':fCoc>4?'text-amber-500':'text-rose-500'}`}>{fCoc.toFixed(1)}%</span></div>
              {fDscr>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">DSCR <span className="text-[9px] text-slate-300">(Debt Service Coverage)</span></span><span className={`text-[11px] font-bold ${fDscr>1.25?'text-emerald-600':fDscr>1?'text-amber-500':'text-rose-500'}`}>{fDscr.toFixed(2)}x</span></div>}
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Ratio de Gastos</span><span className={`text-[11px] font-bold ${fOpEx/fRev<0.5?'text-emerald-600':fOpEx/fRev<0.6?'text-amber-500':'text-rose-500'}`}>{(fOpEx/fRev*100).toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Capital Invertido</span><span className="text-[11px] font-bold text-slate-700">{fm(totCont)}</span></div>
            </div>
          </div>
          {/* Health indicator */}
          <div className={`rounded-2xl p-3 border ${fCF>=0&&fNoi/fRev>0.4?'bg-emerald-50 border-emerald-200':fCF<0?'bg-rose-50 border-rose-200':'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              {fCF>=0&&fNoi/fRev>0.4?<CheckCircle size={15} className="text-emerald-500"/>:<AlertTriangle size={15} className={fCF<0?'text-rose-500':'text-amber-500'}/>}
              <span className={`text-[10px] font-bold uppercase ${fCF>=0&&fNoi/fRev>0.4?'text-emerald-700':fCF<0?'text-rose-700':'text-amber-700'}`}>{fCF>=0&&fNoi/fRev>0.4?'Inversión Saludable':fCF<0?'Requiere Atención':'En Observación'}</span>
            </div>
            <div className="space-y-1 text-[10px] text-slate-600">
              {occupancy>0&&<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${occupancy>70?'bg-emerald-500':occupancy>50?'bg-amber-500':'bg-rose-500'}`}/>{occupancy.toFixed(0)}% ocupación ({fNights} noches)</div>}
              <div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${fNoi/fRev>0.5?'bg-emerald-500':fNoi/fRev>0.4?'bg-amber-500':'bg-rose-500'}`}/>{(fNoi/fRev*100).toFixed(0)}% margen operativo</div>
              {fDscr>0&&<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${fDscr>1.25?'bg-emerald-500':fDscr>1?'bg-amber-500':'bg-rose-500'}`}/>{fDscr.toFixed(2)}x cobertura de deuda</div>}
              {revChg!==null&&<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${revChg>=0?'bg-emerald-500':'bg-rose-500'}`}/>{revChg>=0?'+':''}{revChg.toFixed(0)}% ingreso vs año anterior</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: INSIGHTS — What the data tells you ── */}
      {n>=2&&<div className="grid grid-cols-12 gap-4 mb-4">
        {/* Smart Insights */}
        <div className="col-span-8 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Insights & Recomendaciones</h3>
          <div className="space-y-2">
            {(()=>{
              const insights=[];
              const avgRevMo=n>0?fRev/n:0;
              const avgNetMo=n>0?fNet/n:0;
              const breakEvenNights=adr>0?Math.ceil((fOpEx+ownerCosts)/Math.max(n,1)/adr):0;
              const monthlyMort=mMort;
              const monthlyOwnerCost=(ownerCosts)/Math.max(n,1);
              const monthlyOpEx=fOpEx/Math.max(n,1);
              const avgNightsMo=fNights>0?Math.round(fNights/n):0;
              
              // Break-even
              if(adr>0&&breakEvenNights>0) insights.push({
                type:breakEvenNights>25?'danger':breakEvenNights>20?'warn':'good',
                icon:breakEvenNights>25?'🚨':breakEvenNights>20?'⚠️':'✅',
                title:`Punto de equilibrio: ${breakEvenNights} noches/mes`,
                desc:breakEvenNights>avgNightsMo?`Necesitas ${breakEvenNights} noches para cubrir costos pero promedias ${avgNightsMo}. Déficit de ${breakEvenNights-avgNightsMo} noches.`:`Cubres costos con ${breakEvenNights} noches y promedias ${avgNightsMo}. Margen de ${avgNightsMo-breakEvenNights} noches.`
              });

              // Cash Flow health
              if(fCF<0) insights.push({type:'danger',icon:'🔴',title:`Cash flow negativo: ${fm(fCF)}`,desc:`La propiedad no cubre sus costos. La hipoteca (${fm(fMortP)}) consume ${fRev>0?(fMortP/fRev*100).toFixed(0):0}% del ingreso bruto. ${monthlyMort>avgNetMo?'El pago mensual de hipoteca es mayor que lo que deposita el PM.':'Considera refinanciar o aumentar tarifas.'}`});
              else if(fCF>0&&fCFmo<500) insights.push({type:'warn',icon:'🟡',title:`Cash flow ajustado: ${fm(fCFmo)}/mes`,desc:'Cualquier reparación mayor o mes de baja ocupación puede dejarte en negativo. Considera construir una reserva de emergencia.'});
              else if(fCFmo>1000) insights.push({type:'good',icon:'🟢',title:`Cash flow saludable: ${fm(fCFmo)}/mes`,desc:'La propiedad genera excedente consistente después de todos los costos.'});

              // Occupancy
              if(fNights>0){
                if(occupancy>=80) insights.push({type:'good',icon:'📈',title:`Ocupación excelente: ${occupancy.toFixed(0)}%`,desc:`Con ${occupancy.toFixed(0)}% de ocupación, puedes considerar subir tarifas. Un aumento de $20/noche generaría ~${fm(fNights/n*20*12)} adicionales al año.`});
                else if(occupancy>=60) insights.push({type:'warn',icon:'📊',title:`Ocupación aceptable: ${occupancy.toFixed(0)}%`,desc:`Hay espacio para ${Math.round(availNights-fNights)} noches más. Si llenas ${Math.round((availNights-fNights)*0.5)} noches adicionales al ADR actual (${fm(adr)}), generarías ${fm(Math.round((availNights-fNights)*0.5)*adr)} extra.`});
                else insights.push({type:'danger',icon:'📉',title:`Ocupación baja: ${occupancy.toFixed(0)}%`,desc:`Solo ${fNights} de ${availNights} noches ocupadas. Revisa precios, fotos del listing, y la competencia en la zona.`});
              }

              // ADR vs market (Orlando STR avg ~$180-250)
              if(adr>0){
                if(adr>300) insights.push({type:'good',icon:'💎',title:`ADR premium: ${fm(adr)}/noche`,desc:'Tu tarifa está por encima del promedio del mercado de Orlando. Asegúrate de que las reseñas y amenities justifiquen el premium.'});
                else if(adr<150) insights.push({type:'warn',icon:'💰',title:`ADR por debajo del mercado: ${fm(adr)}/noche`,desc:'Considera mejorar amenities (hot tub, game room, tematización) para subir tarifa. Cada $25 de aumento = ~'+fm(fNights/n*25*12)+'/año extra.'});
              }

              // Mortgage burden
              if(mMort>0&&fRev>0){
                const mortPct=fMortP/fRev*100;
                if(mortPct>60) insights.push({type:'danger',icon:'🏦',title:`Hipoteca consume ${mortPct.toFixed(0)}% del ingreso`,desc:`El debt service es muy alto relativo al ingreso. DSCR de ${fDscr.toFixed(2)}x. ${fDscr<1.25?'Considera refinanciar a una tasa más baja o extender el plazo.':'Aunque el DSCR es aceptable, el margen es estrecho.'}`});
              }

              // Expense efficiency
              if(fRev>0){
                const opExPct=fOpEx/fRev*100;
                if(opExPct>55) insights.push({type:'warn',icon:'📋',title:`Ratio de gastos alto: ${opExPct.toFixed(0)}%`,desc:`Los gastos operativos consumen más de la mitad del ingreso. Los principales: Comisión PM ${fm(fComm)} (${(fComm/fRev*100).toFixed(0)}%), Electricidad ${fm(fDuke)} (${(fDuke/fRev*100).toFixed(0)}%), HOA ${fm(fHoa)} (${(fHoa/fRev*100).toFixed(0)}%).`});
              }

              // Duke Energy trend
              if(fDuke>0&&fRev>0){
                const dukePct=fDuke/fRev*100;
                if(dukePct>15) insights.push({type:'warn',icon:'⚡',title:`Electricidad alta: ${(dukePct).toFixed(0)}% del ingreso`,desc:`Duke Energy ${fm(fDuke)} (${fm(fDuke/n)}/mes). Para una propiedad STR en Orlando, lo típico es 8-12%. Verifica termostato inteligente, pool heater timer, y eficiencia del A/C.`});
              }

              // YoY comparison
              if(prevYr&&prevYr.revenue>0&&dashYear!=='all'){
                const revDiff=fRev-prevYr.revenue*(n/prevYr.n);
                const netDiff=fNet-prevYr.net*(n/prevYr.n);
                if(revDiff<0) insights.push({type:'warn',icon:'📉',title:`Ingreso ${((revDiff/(prevYr.revenue*(n/prevYr.n)))*100).toFixed(0)}% vs ${prevYr.year} (mismos meses)`,desc:`Ajustado por periodo, estás generando ${fm(Math.abs(revDiff))} menos que el año pasado. Revisa si la competencia aumentó o si tus tarifas necesitan ajuste.`});
                else if(revDiff>0) insights.push({type:'good',icon:'📈',title:`Ingreso +${((revDiff/(prevYr.revenue*(n/prevYr.n)))*100).toFixed(0)}% vs ${prevYr.year}`,desc:`Crecimiento de ${fm(revDiff)} vs el mismo periodo del año anterior. Buen momentum.`});
              }

              // Appreciation
              if(appreciation>20) insights.push({type:'good',icon:'🏠',title:`Valorización +${appreciation.toFixed(0)}% (${fm(marketValue-prop.purchasePrice)})`,desc:'Excelente apreciación. Tu equity es '+fm(realEquity)+'. Podrías hacer un HELOC para adquirir otra propiedad.'});

              return insights.length>0?insights.map((ins,i)=><div key={i} className={`flex gap-3 p-3 rounded-xl border text-sm ${ins.type==='good'?'bg-emerald-50 border-emerald-100':ins.type==='warn'?'bg-amber-50 border-amber-100':'bg-rose-50 border-rose-100'}`}>
                <span className="text-lg shrink-0">{ins.icon}</span>
                <div><div className={`font-bold text-xs ${ins.type==='good'?'text-emerald-800':ins.type==='warn'?'text-amber-800':'text-rose-800'}`}>{ins.title}</div><div className="text-[11px] text-slate-600 mt-0.5">{ins.desc}</div></div>
              </div>):<p className="text-sm text-slate-400 text-center py-4">Necesita más datos para generar insights</p>;
            })()}
          </div>
        </div>

        {/* Quick Numbers */}
        <div className="col-span-4 space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Promedios Mensuales</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Ingreso Bruto</span><span className="text-[11px] font-bold text-blue-600">{fm(n>0?fRev/n:0)}/mes</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Gastos Operativos</span><span className="text-[11px] font-bold text-rose-500">{fm(n>0?fOpEx/n:0)}/mes</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Neto del PM</span><span className="text-[11px] font-bold text-emerald-600">{fm(n>0?fNet/n:0)}/mes</span></div>
              {mMort>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">Hipoteca</span><span className="text-[11px] font-bold text-red-500">{fm(mMort)}/mes</span></div>}
              <div className="border-t border-slate-100 my-0.5"/>
              <div className="flex justify-between"><span className="text-[11px] font-bold text-slate-600">Cash Flow</span><span className={`text-[11px] font-extrabold ${fCFmo>=0?'text-emerald-600':'text-rose-600'}`}>{fm(fCFmo)}/mes</span></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Punto de Equilibrio</h3>
            {(()=>{
              const beMo=n>0?(fOpEx/n+mMort+insExp/Math.max(n,1)+taxExp/Math.max(n,1)):0;
              const beNights=adr>0?Math.ceil(beMo/adr):0;
              const avgNMo=fNights>0?Math.round(fNights/n):0;
              const surplus=avgNMo-beNights;
              return <div className="text-center">
                <div className="text-3xl font-black text-slate-800">{beNights}</div>
                <div className="text-[10px] text-slate-400">noches/mes para cubrir todos los costos</div>
                <div className="text-xs text-slate-500 mt-1">Costos mensuales totales: {fm(beMo)}</div>
                <div className="text-xs text-slate-500">ADR actual: {fm(adr)}/noche</div>
                {avgNMo>0&&<div className={`text-xs font-bold mt-2 px-3 py-1 rounded-full inline-block ${surplus>=0?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{surplus>=0?`+${surplus} noches de margen`:`${Math.abs(surplus)} noches de déficit`}</div>}
              </div>;
            })()}
          </div>
        </div>
      </div>}

      {/* ── ROW 4: Monthly Chart + Property + Seasonality ── */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Rendimiento Mensual</h3>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={mChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="m" tick={{fontSize:9,fill:'#94a3b8'}} interval={mChart.length>18?2:0}/>
              <YAxis tick={{fontSize:9,fill:'#94a3b8'}} tickFormatter={fm}/>
              <Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:10}}/>
              <Bar dataKey="rev" name="Ingreso Bruto" fill="#BFDBFE" radius={[3,3,0,0]}/>
              <Bar dataKey="net" name="Neto Depositado" fill="#6EE7B7" radius={[3,3,0,0]}/>
              {mMort>0&&<Line dataKey="libre" name="Cash Flow" stroke="#1E293B" strokeWidth={2} dot={{r:2,fill:'#1E293B'}}/>}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-5 space-y-3">
          {/* Property & Equity */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Propiedad & Patrimonio</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Valor de Mercado</span><span className="text-[11px] font-extrabold text-slate-800">{fm(marketValue)}</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Precio de Compra</span><span className="text-[11px] font-bold text-slate-500">{fm(prop.purchasePrice)}</span></div>
              {appreciation!==0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">Valorización</span><span className={`text-[11px] font-bold ${appreciation>0?'text-emerald-600':'text-rose-500'}`}>{appreciation>0?'+':''}{appreciation.toFixed(1)}% ({fm(marketValue-prop.purchasePrice)})</span></div>}
              <div className="border-t border-slate-100 my-0.5"/>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Equity</span><span className="text-[11px] font-extrabold text-emerald-600">{fm(realEquity)}</span></div>
              {realLTV>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">LTV</span><span className={`text-[11px] font-bold ${realLTV>80?'text-rose-500':realLTV>60?'text-amber-500':'text-emerald-500'}`}>{realLTV.toFixed(0)}%</span></div>}
            </div>
          </div>
          {/* Mortgage Progress */}
          {mort.balance>0&&<div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Hipoteca</h3>
            {(()=>{
              const origBal=prop.purchasePrice*(realLTV>0?realLTV/100:0.8);
              const paidPrincipal=origBal>mort.balance?origBal-mort.balance:0;
              const pctPaid=origBal>0?(paidPrincipal/origBal*100):0;
              const monthsStart=mort.startDate?Math.round((new Date()-new Date(mort.startDate))/(30.44*24*60*60*1000)):0;
              const monthsLeft=mort.monthlyPayment>0?Math.ceil(mort.balance/(mort.monthlyPayment*0.3)):mort.termYears*12;
              const yearsLeft=Math.round(monthsLeft/12);
              const totalInterest=mort.monthlyPayment>0?(mort.monthlyPayment*monthsLeft)-mort.balance:0;
              return <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <div><div className="text-lg font-extrabold text-slate-800">{fm(mort.balance)}</div><div className="text-[10px] text-slate-400">Balance actual</div></div>
                  <div className="text-right"><div className="text-sm font-bold text-emerald-600">{fm(mMort)}/mes</div><div className="text-[10px] text-slate-400">{mort.rate}% · {mort.termYears} años</div></div>
                </div>
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1"><span>Pagado {pctPaid.toFixed(0)}%</span><span>Restante {(100-pctPaid).toFixed(0)}%</span></div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all" style={{width:Math.max(2,pctPaid)+'%'}}/></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-1">
                  <div className="bg-emerald-50 rounded-lg p-1.5"><div className="text-[9px] text-emerald-600 font-bold">PAGADO</div><div className="text-xs font-extrabold text-emerald-700">{fm(paidPrincipal)}</div></div>
                  <div className="bg-slate-50 rounded-lg p-1.5"><div className="text-[9px] text-slate-500 font-bold">RESTANTE</div><div className="text-xs font-extrabold text-slate-700">{fm(mort.balance)}</div></div>
                  <div className="bg-blue-50 rounded-lg p-1.5"><div className="text-[9px] text-blue-500 font-bold">AÑOS REST.</div><div className="text-xs font-extrabold text-blue-700">~{yearsLeft}</div></div>
                </div>
                {monthsStart>0&&<div className="text-[10px] text-slate-400 text-center">{Math.round(monthsStart/12)} años de {mort.termYears} transcurridos{mort.startDate?` · Desde ${mort.startDate.split('-')[0]}`:''}</div>}
              </div>;
            })()}
          </div>}
          {/* Seasonality */}
          {monthRank.length>=6&&<div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Estacionalidad (histórico)</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 rounded-xl p-2 text-center"><div className="text-[8px] text-emerald-600 font-bold">MEJOR MES</div><div className="text-sm font-extrabold text-emerald-700">{monthRank[0].month}</div><div className="text-[10px] text-emerald-500">{fm(monthRank[0].avg)} prom</div></div>
              <div className="bg-rose-50 rounded-xl p-2 text-center"><div className="text-[8px] text-rose-600 font-bold">PEOR MES</div><div className="text-sm font-extrabold text-rose-700">{monthRank[monthRank.length-1].month}</div><div className="text-[10px] text-rose-500">{fm(monthRank[monthRank.length-1].avg)} prom</div></div>
            </div>
          </div>}
        </div>
      </div>

      {/* ── ROW 4: Year comparison + Partners ── */}
      {(annual.length>1||partners.length>1)&&<div className={`grid ${annual.length>1&&partners.length>1?'grid-cols-2':'grid-cols-1'} gap-4`}>
        {annual.length>1&&<div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Comparativo Anual</h3>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={annual}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="year" tick={{fontSize:11,fill:'#64748b'}}/>
              <YAxis tick={{fontSize:9,fill:'#94a3b8'}} tickFormatter={fm}/>
              <Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:10}}/>
              <Bar dataKey="revenue" name="Ingreso Bruto" fill="#93C5FD" radius={[4,4,0,0]}/>
              <Bar dataKey="net" name="Neto Depositado" fill="#6EE7B7" radius={[4,4,0,0]}/>
              <Line dataKey="hoa" name="HOA" stroke="#8B5CF6" strokeWidth={2} dot={{r:3}}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>}
        {partners.length>1&&<div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Distribución entre Socios</h3>
          <div className="space-y-3">{partners.map(p=>{const t=pt[p.id]||{};return<div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{background:p.color}}>{p.name.charAt(0)}</div>
            <div className="flex-1 min-w-0"><div className="text-sm font-bold text-slate-700 truncate">{p.name} <span className="text-xs text-slate-400 font-normal">{p.ownership}%</span></div>
              <div className="flex gap-3 text-[10px] mt-0.5"><span className="text-emerald-600">Aportó {fm(t.cont)}</span><span className="text-rose-500">Gastó {fm(t.exp)}</span><span className="text-blue-600">Le toca {fm(fNet*(p.ownership/100))}</span></div>
            </div>
          </div>})}</div>
        </div>}
      </div>}

      </>:<div className="text-center py-12"><Empty icon={BarChart3} title="No Data Available" desc={`Esta propiedad tiene ${stmts.length} statements, ${expenses.length} gastos y ${income.length} ingresos registrados. ${stmts.length===0?'Upload your property manager statements de tu administrador para ver el dashboard.':'Si ves esto con datos cargados, intenta seleccionar un año arriba.'}`} action="Cargar Statements" onAction={()=>{setUploadLog([]);setModal('upload')}}/></div>}
      <div className="hidden print-footer">OwnerDesk · {prop.name} · {new Date().toLocaleDateString('es',{day:'2-digit',month:'long',year:'numeric'})}</div>
    </>}catch(e){console.error('Dashboard error:',e);return<div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 m-6"><h3 className="font-bold text-rose-700 mb-2">Error en el dashboard</h3><p className="text-sm text-rose-600 mb-3">{e.message}</p><p className="text-xs text-slate-400 mb-3">Stmts: {stmts.length} · Revenue: {revenue} · Annual: {annual.length}</p><button onClick={()=>setView('statements')} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold">Ir a Statements</button></div>}})()}
    {/* ═══ PARTNERS ═══ */}
    {view==='partners'&&(()=>{
      // Calculate what each partner has put in and what they should have put based on ownership %
      const totalPutAll=Object.values(pt).reduce((s,t)=>s+(t.cont||0)+(t.exp||0),0);
      const partnerBalances=partners.map(p=>{
        const t=pt[p.id]||{cont:0,exp:0,inc:0};
        const put=(t.cont||0)+(t.exp||0);  // what they actually put in
        const fairShare=totalPutAll*(p.ownership/100);  // what they should have put
        const diff=put-fairShare;  // positive = overpaid, negative = underpaid
        return{...p,t,put,fairShare,diff};
      });
      // Calculate debts between partners
      const debts=[];
      const overpaid=partnerBalances.filter(p=>p.diff>0);
      const underpaid=partnerBalances.filter(p=>p.diff<0);
      underpaid.forEach(u=>{
        overpaid.forEach(o=>{
          if(Math.abs(u.diff)>1&&o.diff>1){
            const amount=Math.min(Math.abs(u.diff),o.diff)*(Math.abs(u.diff)/(underpaid.reduce((s,x)=>s+Math.abs(x.diff),0)||1));
            if(amount>1)debts.push({from:u.name,fromColor:u.color,to:o.name,toColor:o.color,amount});
          }
        });
      });

      return <>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">👥 Socios & Capital</h1><button onClick={()=>{setCf({date:new Date().toISOString().split('T')[0],concept:'',amount:'',paidBy:partners[0]?.id||''});setModal('contribution')}} className="px-4 py-2.5 bg-purple-600 text-white text-xs rounded-xl font-bold hover:bg-purple-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Aporte</button></div>

      {/* Partner cards */}
      <div className="grid gap-4 mb-5" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,3)},1fr)`}}>{partnerBalances.map(p=>{
        return<div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-md" style={{background:`linear-gradient(135deg,${p.color},${p.color}cc)`}}>{p.name.charAt(0)}</div><div><div className="font-bold text-slate-800">{p.name}</div><div className="text-xs text-slate-400">{p.ownership}%</div></div></div>
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div className="bg-emerald-50 rounded-xl p-2.5"><div className="text-[9px] text-emerald-600 font-bold uppercase">Aportó</div><div className="text-base font-extrabold text-emerald-700">{fm(p.t.cont)}</div></div>
          <div className="bg-rose-50 rounded-xl p-2.5"><div className="text-[9px] text-rose-500 font-bold uppercase">Gastos</div><div className="text-base font-extrabold text-rose-600">{fm(p.t.exp)}</div></div>
          <div className="bg-blue-50 rounded-xl p-2.5"><div className="text-[9px] text-blue-500 font-bold uppercase">Total</div><div className="text-base font-extrabold text-blue-700">{fm(p.put)}</div></div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border text-center space-y-1">
          <div className="flex justify-between text-[11px]"><span className="text-slate-400">Le corresponde ({p.ownership}%)</span><span className="font-bold text-slate-600">{fm(p.fairShare)}</span></div>
          <div className="flex justify-between text-[11px]"><span className="text-slate-400">Ha puesto</span><span className="font-bold text-slate-600">{fm(p.put)}</span></div>
          <div className={`flex justify-between text-[11px] pt-1 border-t border-slate-200`}><span className="font-bold text-slate-500">Balance</span><span className={`font-extrabold ${p.diff>0?'text-emerald-600':p.diff<0?'text-rose-500':'text-slate-600'}`}>{p.diff>0?'A favor: +':p.diff<0?'Debe: ':''}{fm(Math.abs(p.diff))}</span></div>
        </div>
      </div>})}</div>

      {/* Debts between partners */}
      {debts.length>0&&<div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm mb-5">
        <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-2"><AlertTriangle size={14}/> Cuentas Pendientes entre Socios</h3>
        <div className="space-y-2">{debts.map((d,i)=><div key={i} className="flex items-center gap-3 py-3 px-4 bg-amber-50 rounded-xl border border-amber-100">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{background:d.fromColor}}>{d.from.charAt(0)}</div>
          <div className="flex-1"><span className="text-sm font-bold text-slate-700">{d.from}</span><span className="text-sm text-slate-400 mx-2">le debe a</span><span className="text-sm font-bold text-slate-700">{d.to}</span></div>
          <div className="text-lg font-extrabold text-amber-700">{fm(d.amount)}</div>
        </div>)}</div>
      </div>}

      {/* All balanced */}
      {partners.length>1&&debts.length===0&&totalPutAll>0&&<div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 mb-5 flex items-center gap-3">
        <CheckCircle size={18} className="text-emerald-500"/>
        <span className="text-sm font-bold text-emerald-700">Cuentas al día — todos los socios han aportado proporcionalmente a su participación.</span>
      </div>}

      {/* Contribution history */}
      {contribs.length>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Historial de Movimientos</h3>
        <Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},{label:'Socio',render:r=><span className="font-semibold" style={{color:pCl(r.paidBy)}}>{pN(r.paidBy)}</span>},{label:'Concepto',key:'concept',cls:'text-slate-600'},{label:'Monto',r:true,render:r=><span className="font-bold text-emerald-600">{fm(r.amount)}</span>}]} rows={contribs} onDel={del} dc="contributions" onEdit={r=>{setCf({date:r.date||'',concept:r.concept||'',amount:String(r.amount||''),paidBy:r.paidBy||partners[0]?.id||''});setEditId(r.id);setModal('contribution')}}/>
      </>}
    </>})()}

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
        <Tbl cols={[
          {label:'Periodo',render:r=><span className="font-bold text-slate-700">{M[r.month-1]} {r.year}</span>},
          {label:'Gross Rev.',r:true,render:r=><span className="text-blue-600 font-semibold">{fm(r.revenue)}</span>},
          {label:'Nights',r:true,render:r=>r.nights?<span className="text-slate-600">{r.nights} <span className="text-[9px] text-slate-400">({r.reservations||'—'}res)</span></span>:<span className="text-slate-300">—</span>},
          {label:'Commission',r:true,render:r=><span className="text-rose-400">{fm(r.commission)}</span>},
          {label:'Electric',r:true,render:r=><span className="text-slate-500">{fm(r.duke)}</span>},
          {label:'HOA',r:true,render:r=><span className="text-slate-500">{fm(r.hoa)}</span>},
          {label:'Agua',r:true,render:r=><span className="text-slate-500">{fm(r.water)}</span>},
          {label:'Maint.',r:true,render:r=><span className="text-slate-500">{fm(r.maintenance)}</span>},
          {label:'Total OpEx',r:true,render:r=>{const tc=(r.commission||0)+(r.duke||0)+(r.water||0)+(r.hoa||0)+(r.maintenance||0)+(r.vendor||0);return<span className="font-semibold text-rose-500">{fm(tc)}</span>}},
          {label:'Net to Owner',r:true,render:r=><span className="font-extrabold text-emerald-700">{fm(r.net)}</span>},
          {label:'Margin',r:true,render:r=>{const m=r.revenue?(r.net/r.revenue*100):0;return<span className={`font-bold text-xs ${m<40?'text-rose-500':m<50?'text-amber-500':'text-emerald-500'}`}>{m.toFixed(0)}%</span>}},
        ]} rows={paged} onDel={del} dc="statements" onEdit={r=>{setSf({year:r.year,month:r.month,revenue:String(r.revenue||''),net:String(r.net||''),commission:String(r.commission||''),duke:String(r.duke||''),water:String(r.water||''),hoa:String(r.hoa||''),maintenance:String(r.maintenance||''),vendor:String(r.vendor||'')});setEditId(r.id);setModal('addStmt')}}/>

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

        {/* Totals */}
        <div className="bg-slate-50 rounded-xl p-3 mt-3 flex justify-between items-center text-xs border border-slate-100">
          <span className="text-slate-400 font-semibold">{stmtYearFilter==='all'?'Total':'Total '+stmtYearFilter} ({filtered.length} meses):</span>
          <div className="flex gap-5">
            <span>Gross Revenue: <b className="text-blue-600">{fm(filtered.reduce((s,x)=>s+(x.revenue||0),0))}</b></span>
            <span>OpEx: <b className="text-rose-500">{fm(filtered.reduce((s,x)=>s+(x.revenue||0)-(x.net||0),0))}</b></span>
            <span>Net to Owner: <b className="text-emerald-600">{fm(filtered.reduce((s,x)=>s+(x.net||0),0))}</b></span>
            <span>Margen: <b className="text-slate-700">{(()=>{const r=filtered.reduce((s,x)=>s+(x.revenue||0),0),n=filtered.reduce((s,x)=>s+(x.net||0),0);return r?((n/r)*100).toFixed(0)+'%':'—'})()}</b></span>
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
            {label:'Commission',r:true,render:r=><span className="text-rose-500">{fm(r.commission)}</span>},
            {label:'Gastos Op.',r:true,render:r=><span className="text-rose-400">{fm((r.duke||0)+(r.water||0)+(r.hoa||0)+(r.maintenance||0)+(r.vendor||0))}</span>},
            {label:'Net',r:true,render:r=><span className="font-bold text-emerald-600">{fm(r.net)}</span>},
            {label:'Margin',r:true,render:r=>{const m=r.revenue?(r.net/r.revenue*100):0;return<span className={`font-bold ${m<40?'text-rose-500':m<50?'text-amber-600':'text-emerald-600'}`}>{m.toFixed(0)}%</span>}},
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
        <KPI label="Precio de Precio de Compra" value={fm(prop.purchasePrice)} color="blue"/>
        <KPI label="Valor de Mercado" value={fm(marketValue)} sub={latestVal?'Actualizado '+fmDate(latestVal.date):'Purchase Price'} color={appreciation>=0?'green':'red'}/>
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
          {mort.balance>0&&<div className="pl-6"><div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Balance Deuda Hipoteca</span><span className="font-semibold text-rose-500">{fm(mort.balance)}</span></div></div>}
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
          <div className="grid grid-cols-4 gap-3"><Inp label="Precio Precio de Compra" value={sf2.purchasePrice} onChange={v=>uf('purchasePrice',v)} prefix="$" type="number"/><Inp label="Property Manager" value={sf2.manager} onChange={v=>uf('manager',v)}/><Inp label="Comisión (%)" value={sf2.managerCommission} onChange={v=>uf('managerCommission',v)} type="number"/><div/></div>
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
        <button onClick={async()=>{if(!confirm('¿ELIMINAR esta propiedad y TODOS sus datos? Esta acción NO se puede deshacer.'))return;if(!confirm('¿Estás SEGURO? Se borrarán todos los statements, gastos, ingresos y aportes.'))return;for(const sub of['expenses','income','contributions','statements','valuations']){const snap=await getDocs(collection(db,'properties',propertyId,sub));for(const d of snap.docs)await deleteDoc(doc(db,'properties',propertyId,sub,d.id))}await deleteDoc(doc(db,'properties',propertyId));window.location.reload()}} className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition">🗑️ Eliminar Propiedad</button>
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
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">Ratio de Gastos</div><div className="text-sm font-extrabold text-slate-800">{expRatio.toFixed(1)}%</div></div>
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
          <div className="flex justify-between py-3 px-4 bg-emerald-50 rounded-xl border border-emerald-100"><span className="font-bold text-emerald-700">= NOI (Ingreso Operativo Neto)</span><span className="font-extrabold text-emerald-700 text-lg">{fm(noi)}</span></div>
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
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-bold uppercase">Ratio de Gastos</div><div className="text-xl font-extrabold text-blue-700">{expRatio.toFixed(1)}%</div></div>
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
      <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100"><div className="text-[10px] font-black text-rose-700 uppercase mb-3">Gastos</div><div className="grid grid-cols-2 gap-3"><Inp label="Comisión PM" value={sf.commission} onChange={v=>us('commission',v)} prefix="$" type="number"/><Inp label="Electricidad" value={sf.duke} onChange={v=>us('duke',v)} prefix="$" type="number"/><Inp label="Agua" value={sf.water} onChange={v=>us('water',v)} prefix="$" type="number"/><Inp label="HOA" value={sf.hoa} onChange={v=>us('hoa',v)} prefix="$" type="number"/><Inp label="Mantenimiento" value={sf.maintenance} onChange={v=>us('maintenance',v)} prefix="$" type="number"/><Inp label="Vendor/Otros" value={sf.vendor} onChange={v=>us('vendor',v)} prefix="$" type="number"/></div></div>
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
        <div className="flex justify-between"><span className="text-slate-500">Precio Precio de Compra</span><span className="font-semibold">{fm(prop.purchasePrice)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Valor Estimado</span><span className="font-bold text-emerald-600">{fm(parseFloat(vf.value))}</span></div>
        <div className="flex justify-between border-t border-slate-200 pt-2"><span className="text-slate-600 font-semibold">Apreciación</span><span className={`font-extrabold ${parseFloat(vf.value)>=prop.purchasePrice?'text-emerald-600':'text-rose-500'}`}>{((parseFloat(vf.value)-prop.purchasePrice)/prop.purchasePrice*100).toFixed(1)}% ({fm(parseFloat(vf.value)-prop.purchasePrice)})</span></div>
      </div>}
    </Mdl>}

    {modal==='upload'&&<Mdl title="📤 Subir Statements (PDF)" grad="from-blue-600 to-cyan-600" onClose={()=>setModal(null)}>
      <p className="text-sm text-slate-500 mb-3">Sube los PDFs de los owner statements de tu property manager.</p>
      <label className="block border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
        <Upload size={32} className="text-blue-400 mx-auto mb-2"/>
        <div className="text-sm font-semibold text-blue-600">Haz clic aquí para seleccionar PDFs</div>
        <div className="text-xs text-slate-400 mt-1">Soporta múltiples archivos</div>
        <input type="file" accept=".pdf" multiple className="hidden" onChange={async e=>{
          const arr=[...e.target.files];
          e.target.value='';
          if(arr.length) await handlePDFs(arr);
        }}/>
      </label>
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
