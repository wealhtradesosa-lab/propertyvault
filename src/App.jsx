import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, where, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, ComposedChart, Line } from 'recharts';
import { Home, DollarSign, Users, Plus, Building2, X, Trash2, Loader2, LogOut, Lock, Mail, Receipt, Landmark, UserPlus, ClipboardList, Eye, EyeOff, ChevronDown, FileText, TrendingUp, BarChart3, Upload, AlertTriangle, Settings, Calendar, ArrowUpRight, ArrowDownRight, Target, Layers } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const C=['#2563EB','#059669','#F59E0B','#7C3AED','#DC2626','#0891B2','#DB2777','#65A30D'];
const M=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const fm=v=>'$'+Math.abs(v||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});
const fmDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString('es',{day:'2-digit',month:'short',year:'numeric'}):'';
const pct=(a,b)=>b?((a/b)*100).toFixed(1)+'%':'—';

const CATS=[
  {v:'commission',l:'Comisión PM',i:'💼',fixed:true},{v:'electricity',l:'Electricidad',i:'⚡',fixed:true},
  {v:'water',l:'Agua',i:'💧',fixed:true},{v:'hoa',l:'HOA',i:'🏢',fixed:true},
  {v:'maintenance',l:'Mantenimiento',i:'🔧',fixed:true},{v:'insurance',l:'Seguro',i:'🛡️',fixed:true},
  {v:'taxes',l:'Impuestos',i:'🏛️',fixed:false},{v:'legal',l:'Legal',i:'⚖️',fixed:false},
  {v:'renovacion',l:'Renovación',i:'🔨',fixed:false},{v:'equipamiento',l:'Equipamiento',i:'🛋️',fixed:false},
  {v:'contabilidad',l:'Contabilidad',i:'📊',fixed:false},{v:'marketing',l:'Marketing',i:'📸',fixed:false},
  {v:'vendor',l:'Vendor / Proveedor',i:'🛠️',fixed:false},{v:'mortgage_pay',l:'Pago Hipoteca',i:'🏦',fixed:true},
  {v:'pool',l:'Pool Heat',i:'🏊',fixed:false},{v:'cleaning',l:'Limpieza',i:'🧹',fixed:false},
  {v:'otros',l:'Otros',i:'📦',fixed:false},
];
const US='AL,AK,AZ,AR,CA,CO,CT,DE,FL,GA,HI,ID,IL,IN,IA,KS,KY,LA,ME,MD,MA,MI,MN,MS,MO,MT,NE,NV,NH,NJ,NM,NY,NC,ND,OH,OK,OR,PA,RI,SC,SD,TN,TX,UT,VT,VA,WA,WV,WI,WY'.split(',');
const PT=[{v:'vacation',l:'Vacacional / STR'},{v:'longterm',l:'Long-Term Rental'},{v:'primary',l:'Residencia'},{v:'flip',l:'Flip'},{v:'commercial',l:'Comercial'}];

// ═══════════════════════════════════════════════════════════════
// UI PRIMITIVES (module-level — no focus loss)
// ═══════════════════════════════════════════════════════════════
function Inp({label,value,onChange,type='text',prefix,placeholder,className='',disabled}) {
  return <div className={className}>{label&&<label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>}
    <div className="relative">{prefix&&<span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">{prefix}</span>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className={`w-full ${prefix?'pl-7':'pl-3.5'} pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400`}/>
    </div></div>;
}
function Sel({label,value,onChange,options,className=''}) {
  return <div className={className}>{label&&<label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>}
    <div className="relative"><select value={value} onChange={e=>onChange(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none appearance-none pr-9 transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
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
function Stat({label,value,sub,trend,icon:Ic,color='blue',big}) {
  const cs={blue:'border-l-blue-500',green:'border-l-emerald-500',red:'border-l-rose-500',purple:'border-l-purple-500',amber:'border-l-amber-500',cyan:'border-l-cyan-500'};
  return <div className={`bg-white rounded-2xl p-5 border-l-4 ${cs[color]||cs.blue} shadow-sm hover:shadow-md transition-all`}>
    <div className="flex items-center justify-between mb-1.5"><span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>{Ic&&<Ic size={16} className="text-slate-300"/>}</div>
    <div className={`${big?'text-3xl':'text-2xl'} font-extrabold text-slate-800 tracking-tight`}>{value}</div>
    {(sub||trend)&&<div className="flex items-center gap-2 mt-1">{trend&&<span className={`text-xs font-semibold flex items-center gap-0.5 ${trend.dir==='up'?'text-emerald-600':trend.dir==='down'?'text-rose-500':'text-slate-400'}`}>{trend.dir==='up'?<ArrowUpRight size={12}/>:trend.dir==='down'?<ArrowDownRight size={12}/>:null}{trend.text}</span>}{sub&&<span className="text-[10px] text-slate-400">{sub}</span>}</div>}
  </div>;
}
function Empty({icon:Ic,title,desc,action,onAction}) {
  return <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center"><div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Ic size={28} className="text-slate-400"/></div><h3 className="text-base font-bold text-slate-700 mb-1">{title}</h3><p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">{desc}</p>{action&&<button onClick={onAction} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition inline-flex items-center gap-1.5 shadow-lg shadow-blue-500/20"><Plus size={15}/>{action}</button>}</div>;
}
function Tbl({cols,rows,onDel,dc}) {
  if(!rows.length) return null;
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-slate-50/80">{cols.map((c,i)=><th key={i} className={`py-3.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${c.r?'text-right':'text-left'}`}>{c.label}</th>)}{onDel&&<th className="w-10"/>}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((r,ri)=><tr key={r.id||ri} className="hover:bg-blue-50/30 transition-colors">{cols.map((c,ci)=><td key={ci} className={`py-3 px-4 text-sm ${c.r?'text-right':''} ${c.cls||''}`}>{c.render?c.render(r):r[c.key]}</td>)}{onDel&&<td className="py-3 pr-3"><button onClick={()=>onDel(dc,r.id)} className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"><Trash2 size={13}/></button></td>}</tr>)}</tbody></table></div></div>;
}
const Tip=({active,payload,label})=>{if(!active||!payload?.length)return null;return<div className="bg-slate-800 rounded-xl px-4 py-3 shadow-xl border border-slate-700"><div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">{label}</div>{payload.map((p,i)=><div key={i} className="text-xs" style={{color:p.color}}>{p.name}: <b className="text-white">{fm(p.value)}</b></div>)}</div>};

// ═══ AUTH ═══
function AuthScreen() {
  const [mode,setMode]=useState('login');const [email,setEmail]=useState('');const [pw,setPw]=useState('');const [show,setShow]=useState(false);const [err,setErr]=useState('');const [busy,setBusy]=useState(false);
  const go=async e=>{e.preventDefault();setErr('');setBusy(true);try{mode==='login'?await signInWithEmailAndPassword(auth,email,pw):await createUserWithEmailAndPassword(auth,email,pw)}catch(e){setErr({'auth/invalid-credential':'Correo o contraseña incorrectos','auth/email-already-in-use':'Este correo ya tiene cuenta','auth/weak-password':'Mínimo 6 caracteres'}[e.code]||e.message)}setBusy(false)};
  return <div className="min-h-screen bg-[#0C1222] flex items-center justify-center p-4" style={{backgroundImage:'radial-gradient(ellipse at 30% 20%,rgba(37,99,235,.08) 0%,transparent 60%),radial-gradient(ellipse at 70% 80%,rgba(5,150,105,.06) 0%,transparent 60%)'}}>
    <div className="w-full max-w-[420px]">
      <div className="text-center mb-10"><div className="inline-flex items-center justify-center w-[72px] h-[72px] bg-gradient-to-br from-blue-500 to-emerald-500 rounded-[22px] shadow-xl shadow-blue-500/20 mb-5 ring-4 ring-white/5"><Building2 className="text-white" size={34}/></div><h1 className="text-[32px] font-extrabold text-white tracking-tight">PropertyVault</h1><p className="text-blue-200/40 mt-1 text-sm font-medium">Gestión inteligente de tu inversión inmobiliaria</p></div>
      <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
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
    const d={...p,purchasePrice:parseFloat(p.price)||0,bedrooms:parseInt(p.beds)||0,bathrooms:parseInt(p.baths)||0,managerCommission:parseFloat(p.pmFee)||15,manager:p.pm,purchaseDate:p.date,partners:pl,memberEmails:me,
      mortgage:{balance:parseFloat(mt.bal)||0,rate:parseFloat(mt.rate)||0,termYears:parseInt(mt.term)||30,monthlyPayment:parseFloat(mt.pay)||0,startDate:mt.start||''},ownerId:userId,createdAt:serverTimestamp()};
    const ref=await addDoc(collection(db,'properties'),d);
    for(const x of d.partners){if(x.initialCapital>0)await addDoc(collection(db,'properties',ref.id,'contributions'),{partnerId:x.id,amount:x.initialCapital,type:'contribution',concept:'Capital Inicial',date:p.date||new Date().toISOString().split('T')[0],createdAt:serverTimestamp()});}
    onComplete(ref.id);
  }catch(e){alert('Error: '+e.message)}setBusy(false)};

  return <div className="min-h-screen bg-[#0C1222] flex items-center justify-center p-4" style={{backgroundImage:'radial-gradient(ellipse at 50% 0%,rgba(37,99,235,.08) 0%,transparent 50%)'}}>
    <div className="w-full max-w-[580px]">
      <div className="text-center mb-6"><h1 className="text-2xl font-extrabold text-white">🏠 Configurar tu Propiedad</h1><p className="text-white/30 text-sm mt-1">Paso {step+1} de 3</p></div>
      <div className="flex gap-2 mb-6">{['Propiedad','Socios','Hipoteca'].map((s,i)=><div key={i} className="flex-1"><div className={`h-1.5 rounded-full transition-all duration-700 ${i<=step?'bg-gradient-to-r from-blue-500 to-emerald-500':'bg-white/5'}`}/><div className={`text-[10px] mt-1.5 text-center font-semibold ${i<=step?'text-blue-400':'text-white/20'}`}>{s}</div></div>)}</div>
      <div className="bg-white rounded-3xl shadow-2xl p-7">
        {step===0&&<div><h2 className="text-lg font-extrabold text-slate-800 mb-5 flex items-center gap-2"><Building2 size={20} className="text-blue-500"/> Datos de la Propiedad</h2>
          <div className="space-y-3"><Inp label="Nombre" value={p.name} onChange={v=>up('name',v)} placeholder="Ej: Casa Orlando"/><Inp label="Dirección" value={p.address} onChange={v=>up('address',v)} placeholder="8983 Backswing Way"/>
          <div className="grid grid-cols-2 gap-3"><Inp label="Ciudad" value={p.city} onChange={v=>up('city',v)} placeholder="Orlando"/><Sel label="Estado" value={p.state} onChange={v=>up('state',v)} options={US.map(s=>({v:s,l:s}))}/></div>
          <div className="grid grid-cols-3 gap-3"><Inp label="Precio compra" value={p.price} onChange={v=>up('price',v)} prefix="$" type="number"/><Inp label="Fecha compra" value={p.date} onChange={v=>up('date',v)} type="date"/><Sel label="Tipo" value={p.type} onChange={v=>up('type',v)} options={PT}/></div>
          <div className="grid grid-cols-4 gap-3"><Inp label="Habitaciones" value={p.beds} onChange={v=>up('beds',v)} type="number"/><Inp label="Baños" value={p.baths} onChange={v=>up('baths',v)} type="number"/><Inp label="Property Manager" value={p.pm} onChange={v=>up('pm',v)} placeholder="IHM"/><Inp label="Comisión (%)" value={p.pmFee} onChange={v=>up('pmFee',v)} type="number"/></div></div>
          <div className="flex justify-end mt-6"><button onClick={()=>setStep(1)} disabled={!p.name||!p.address} className="px-7 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-30 transition shadow-lg shadow-blue-500/20">Siguiente →</button></div>
        </div>}

        {step===1&&<div><h2 className="text-lg font-extrabold text-slate-800 mb-1 flex items-center gap-2"><Users size={20} className="text-blue-500"/> Socios</h2><p className="text-sm text-slate-400 mb-5">Si eres el único dueño, pon tu nombre con 100%.</p>
          {prs.map((x,i)=><div key={i} className="rounded-2xl p-4 mb-3 bg-slate-50 border-l-4" style={{borderLeftColor:C[i%C.length]}}>
            <div className="flex justify-between items-center mb-3"><span className="text-xs font-extrabold uppercase tracking-widest" style={{color:C[i%C.length]}}>Socio {i+1}</span>{prs.length>1&&<button onClick={()=>rmPr(i)} className="text-slate-300 hover:text-rose-500 transition p-1 rounded-lg hover:bg-rose-50"><X size={16}/></button>}</div>
            <div className="grid grid-cols-2 gap-3 mb-2"><Inp label="Nombre" value={x.name} onChange={v=>upPr(i,'name',v)} placeholder="Juan Pérez"/><Inp label="Email (acceso)" value={x.email} onChange={v=>upPr(i,'email',v)} placeholder="socio@email.com" type="email"/></div>
            <div className="grid grid-cols-2 gap-3"><Inp label="% Participación" value={x.own} onChange={v=>upPr(i,'own',v)} type="number"/><Inp label="Capital Inicial" value={x.cap} onChange={v=>upPr(i,'cap',v)} prefix="$" type="number"/></div>
          </div>)}
          <div className="flex justify-between items-center mt-3 mb-6"><button onClick={addPr} className="text-sm text-blue-600 font-bold flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-blue-50 transition"><UserPlus size={15}/> Agregar Socio</button><span className={`text-sm font-extrabold px-4 py-1.5 rounded-full ${totOwn===100?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{totOwn}% {totOwn===100?'✓':'≠100%'}</span></div>
          <div className="flex justify-between"><button onClick={()=>setStep(0)} className="px-5 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50">← Atrás</button><button onClick={()=>setStep(2)} disabled={!prs[0].name||totOwn!==100} className="px-7 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-30 transition shadow-lg shadow-blue-500/20">Siguiente →</button></div>
        </div>}

        {step===2&&<div><h2 className="text-lg font-extrabold text-slate-800 mb-1 flex items-center gap-2"><Landmark size={20} className="text-blue-500"/> Hipoteca <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">OPCIONAL</span></h2><p className="text-sm text-slate-400 mb-5">Si no tiene hipoteca, déjalo en blanco.</p>
          <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><Inp label="Balance" value={mt.bal} onChange={v=>um('bal',v)} prefix="$" type="number"/><Inp label="Tasa (%)" value={mt.rate} onChange={v=>um('rate',v)} type="number"/></div>
          <div className="grid grid-cols-3 gap-3"><Inp label="Plazo (años)" value={mt.term} onChange={v=>um('term',v)} type="number"/><Inp label="Pago Mensual" value={mt.pay} onChange={v=>um('pay',v)} prefix="$" type="number"/><Inp label="Inicio" value={mt.start} onChange={v=>um('start',v)} type="date"/></div></div>
          <div className="flex justify-between mt-6"><button onClick={()=>setStep(1)} className="px-5 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50">← Atrás</button><button onClick={finish} disabled={busy} className="px-7 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition flex items-center gap-2 shadow-xl shadow-emerald-500/20">{busy&&<Loader2 size={16} className="animate-spin"/>}🚀 Crear Propiedad</button></div>
        </div>}
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD — Professional Property Management
// ═══════════════════════════════════════════════════════════════
function Dashboard({propertyId,propertyData:prop,allProperties=[],onSwitchProperty,onLogout,onAddProperty,userEmail}) {
  const [view,setView]=useState('dashboard');
  const [modal,setModal]=useState(null);
  const [expenses,setExpenses]=useState([]);
  const [income,setIncome]=useState([]);
  const [contribs,setContribs]=useState([]);
  const [stmts,setStmts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [extraP,setExtraP]=useState('');
  const [uploadLog,setUploadLog]=useState([]);
  const fileRef=useRef(null);
  // Mortgage config state
  const [mc,setMc]=useState({bal:'',rate:'',term:'30',pay:'',start:''});
  const umc=useCallback((k,v)=>setMc(x=>({...x,[k]:v})),[]);

  const partners=prop.partners||[],mort=prop.mortgage||{};
  const [ef,setEf]=useState({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional'});
  const [nf,setNf]=useState({date:'',month:'',grossAmount:''});
  const [cf,setCf]=useState({date:'',concept:'',amount:'',paidBy:partners[0]?.id||''});
  const [sf,setSf]=useState({year:new Date().getFullYear(),month:1,revenue:'',net:'',commission:'',duke:'',water:'',hoa:'',maintenance:'',vendor:''});
  const ue=useCallback((k,v)=>setEf(x=>({...x,[k]:v})),[]);const un=useCallback((k,v)=>setNf(x=>({...x,[k]:v})),[]);
  const uc=useCallback((k,v)=>setCf(x=>({...x,[k]:v})),[]);const us=useCallback((k,v)=>setSf(x=>({...x,[k]:v})),[]);

  useEffect(()=>{const b=`properties/${propertyId}`,u=[];const L=(s,fn)=>{u.push(onSnapshot(query(collection(db,b,s),orderBy('createdAt','desc')),snap=>fn(snap.docs.map(d=>({id:d.id,...d.data()})))))};L('expenses',setExpenses);L('income',setIncome);L('contributions',setContribs);L('statements',setStmts);setTimeout(()=>setLoading(false),700);return()=>u.forEach(x=>x())},[propertyId]);

  const save=async(sub,data)=>{await addDoc(collection(db,'properties',propertyId,sub),{...data,createdAt:serverTimestamp()});setModal(null)};
  const del=async(sub,id)=>{if(!confirm('¿Eliminar?'))return;await deleteDoc(doc(db,'properties',propertyId,sub,id))};

  // Save mortgage config
  const saveMortgage=async()=>{
    const m={balance:parseFloat(mc.bal)||0,rate:parseFloat(mc.rate)||0,termYears:parseInt(mc.term)||30,monthlyPayment:parseFloat(mc.pay)||0,startDate:mc.start||''};
    await updateDoc(doc(db,'properties',propertyId),{mortgage:m});
    alert('Hipoteca guardada. Recarga la página para ver los cambios.');
  };

  // Calcs
  const pt=useMemo(()=>{const r={};partners.forEach(p=>{r[p.id]={name:p.name,color:p.color,own:p.ownership,cont:0,exp:0,inc:0}});contribs.forEach(c=>{if(r[c.paidBy])r[c.paidBy].cont+=c.amount||0});expenses.forEach(e=>{if(r[e.paidBy])r[e.paidBy].exp+=e.amount||0});const tn=income.reduce((s,i)=>s+(i.netAmount||0),0);partners.forEach(p=>{r[p.id].inc=tn*(p.ownership/100)});return r},[partners,contribs,expenses,income]);

  const totExp=expenses.reduce((s,e)=>s+(e.amount||0),0);
  const totGross=income.reduce((s,i)=>s+(i.grossAmount||0),0);
  const totNet=income.reduce((s,i)=>s+(i.netAmount||0),0);
  const totCont=contribs.reduce((s,c)=>s+(c.amount||0),0);
  const stmtRev=stmts.reduce((s,x)=>s+(x.revenue||0),0);
  const stmtNet=stmts.reduce((s,x)=>s+(x.net||0),0);
  const stmtExp=stmtRev-stmtNet;

  const fixedExp=useMemo(()=>expenses.filter(e=>{const c=CATS.find(x=>x.v===e.category);return c?.fixed||e.type==='fixed'}),[expenses]);
  const additionalExp=useMemo(()=>expenses.filter(e=>{const c=CATS.find(x=>x.v===e.category);return !c?.fixed&&e.type!=='fixed'}),[expenses]);

  const expByCat=useMemo(()=>{const r={};expenses.forEach(e=>{const c=CATS.find(x=>x.v===e.category)||{l:'Otros',i:'📦'};if(!r[e.category])r[e.category]={name:c.l,value:0};r[e.category].value+=e.amount||0});return Object.values(r).sort((a,b)=>b.value-a.value)},[expenses]);

  const annual=useMemo(()=>{const y={};stmts.forEach(s=>{if(!y[s.year])y[s.year]={year:s.year,revenue:0,net:0,commission:0,duke:0,water:0,hoa:0,maintenance:0,vendor:0,n:0};const a=y[s.year];a.revenue+=s.revenue||0;a.net+=s.net||0;a.commission+=s.commission||0;a.duke+=s.duke||0;a.water+=s.water||0;a.hoa+=s.hoa||0;a.maintenance+=s.maintenance||0;a.vendor+=s.vendor||0;a.n++});return Object.values(y).sort((a,b)=>a.year-b.year)},[stmts]);

  const monthly=useMemo(()=>{const r={};stmts.forEach(s=>{if(!r[s.year])r[s.year]={rev:Array(12).fill(0),net:Array(12).fill(0)};r[s.year].rev[s.month-1]=s.revenue||0;r[s.year].net[s.month-1]=s.net||0});return r},[stmts]);

  // Best/worst months
  const monthRank=useMemo(()=>{
    const fullYears=annual.filter(y=>y.n===12);if(!fullYears.length)return[];
    return M.map((m,i)=>{let s=0,c=0;fullYears.forEach(y=>{if(monthly[y.year]){s+=monthly[y.year].net[i];c++}});return{month:m,avg:c?s/c:0}}).sort((a,b)=>b.avg-a.avg);
  },[annual,monthly]);

  const mortCalc=useCallback((ex=0)=>{if(!mort.balance||!mort.rate||!mort.monthlyPayment)return[];let b=mort.balance;const mr=mort.rate/100/12;const sc=[];let ti=0;for(let i=1;i<=mort.termYears*12&&b>0;i++){const int=b*mr;const pr=Math.min(mort.monthlyPayment-int+ex,b);b=Math.max(0,b-pr);ti+=int;if(i%12===0||b===0)sc.push({yr:Math.ceil(i/12),mo:i,bal:b,ti})}return sc},[mort]);
  const sNE=useMemo(()=>mortCalc(0),[mortCalc]);
  const sE=useMemo(()=>mortCalc(parseFloat(extraP)||0),[mortCalc,extraP]);

  const pN=id=>partners.find(p=>p.id===id)?.name||id;const pCl=id=>partners.find(p=>p.id===id)?.color||'#94a3b8';
  const nav=[{id:'dashboard',icon:<Home size={18}/>,l:'Dashboard'},{id:'partners',icon:<Users size={18}/>,l:'Socios & Capital'},{id:'statements',icon:<ClipboardList size={18}/>,l:'Statements'},{id:'analytics',icon:<BarChart3 size={18}/>,l:'Análisis'},{id:'expenses',icon:<Receipt size={18}/>,l:'Gastos'},{id:'income',icon:<DollarSign size={18}/>,l:'Ingresos'},{id:'mortgage',icon:<Landmark size={18}/>,l:'Hipoteca'}];

  if(loading)return<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 size={36} className="animate-spin text-blue-500"/></div>;

  return <div className="min-h-screen bg-[#F8FAFC] flex">
    {/* SIDEBAR */}
    <div className="w-60 bg-white border-r border-slate-100 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20"><Building2 size={18} className="text-white"/></div><div className="min-w-0"><div className="text-sm font-extrabold text-slate-800 truncate">PropertyVault</div><div className="text-[10px] text-slate-400 truncate">{userEmail}</div></div></div>
        {allProperties.length>0&&<div className="relative"><select value={propertyId} onChange={e=>onSwitchProperty(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none appearance-none pr-8 cursor-pointer hover:bg-slate-100 transition">{allProperties.map(p=><option key={p.id} value={p.id}>{p.name||'Sin nombre'}</option>)}</select><ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>}
        {onAddProperty&&<button onClick={onAddProperty} className="w-full mt-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1"><Plus size={13}/>Agregar Propiedad</button>}
      </div>
      <nav className="flex-1 p-3 space-y-0.5">{nav.map(n=><button key={n.id} onClick={()=>setView(n.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] transition-all ${view===n.id?'bg-blue-50 text-blue-700 font-bold':'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'}`}>{n.icon}{n.l}</button>)}</nav>
      <div className="p-3 border-t border-slate-100"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition font-medium"><LogOut size={16}/>Cerrar Sesión</button></div>
    </div>

    {/* MAIN */}
    <div className="flex-1 overflow-auto"><div className="p-6 max-w-[1200px]">

    {/* ═══ DASHBOARD ═══ */}
    {view==='dashboard'&&<>
      <div className="flex justify-between items-start mb-6">
        <div><h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight">{prop.name}</h1><p className="text-sm text-slate-400 font-medium">{prop.address}, {prop.city}, {prop.state} {prop.manager&&`· ${prop.manager} (${prop.managerCommission||15}%)`} · {prop.bedrooms||'?'}BR/{prop.bathrooms||'?'}BA</p></div>
        <div className="flex gap-2">
          <button onClick={()=>{setNf({date:'',month:'',grossAmount:''});setModal('income')}} className="px-4 py-2.5 bg-emerald-600 text-white text-xs rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Ingreso</button>
          <button onClick={()=>{setEf({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional'});setModal('expense')}} className="px-4 py-2.5 bg-rose-500 text-white text-xs rounded-xl font-bold hover:bg-rose-600 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Gasto</button>
          <button onClick={()=>{setUploadLog([]);setModal('upload')}} className="px-4 py-2.5 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"><Upload size={14}/> Statement</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <Stat label="Precio Compra" value={fm(prop.purchasePrice)} icon={Building2} color="blue"/>
        <Stat label="Revenue Total" value={fm(stmtRev||totGross)} sub={stmts.length?`${stmts.length} statements`:`${income.length} ingresos`} icon={TrendingUp} color="green"/>
        <Stat label="Gastos Totales" value={fm(stmtExp+totExp)} icon={Receipt} color="red"/>
        <Stat label={stmtRev?"Net al Owner":"Ingreso Neto"} value={fm(stmtNet||totNet)} trend={stmtRev?{dir:stmtNet>0?'up':'down',text:pct(stmtNet,stmtRev)+' margen'}:null} icon={DollarSign} color={stmtNet>=0?'green':'red'}/>
        <Stat label="Capital Invertido" value={fm(totCont)} sub={`${partners.length} socio(s)`} icon={Users} color="purple"/>
      </div>

      {/* P&L + Charts */}
      {annual.length>0&&<>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Revenue vs Net Annual */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm col-span-2"><h3 className="text-sm font-bold text-slate-700 mb-4">📊 Revenue vs Net — Anual</h3>
            <ResponsiveContainer width="100%" height={230}><ComposedChart data={annual}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="year" tick={{fontSize:11,fill:'#94a3b8'}}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[6,6,0,0]}/><Bar dataKey="net" name="Net" fill="#059669" radius={[6,6,0,0]}/><Line dataKey="hoa" name="HOA" stroke="#7C3AED" strokeWidth={2} dot={{r:3}}/></ComposedChart></ResponsiveContainer>
          </div>
          {/* Best/Worst months */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4">🏆 Ranking de Meses</h3>
            {monthRank.length>0?<div className="space-y-1.5">{monthRank.map((r,i)=><div key={r.month} className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs ${i<3?'bg-emerald-50':i>=monthRank.length-3?'bg-rose-50':'bg-slate-50'}`}>
              <div className="flex items-center gap-2"><span className="font-extrabold text-slate-400 w-5">{i+1}</span><span className={`font-bold ${i<3?'text-emerald-700':i>=monthRank.length-3?'text-rose-600':'text-slate-600'}`}>{r.month}</span></div>
              <span className={`font-bold ${i<3?'text-emerald-600':i>=monthRank.length-3?'text-rose-500':'text-slate-500'}`}>{fm(r.avg)}</span>
            </div>)}</div>:<p className="text-xs text-slate-400">Necesita al menos 1 año completo de datos</p>}
          </div>
        </div>
        {/* Annual P&L Table */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-4"><h3 className="text-sm font-bold text-slate-700 mb-4">📋 Estado de Resultados (P&L)</h3>
          <Tbl cols={[{label:'Año',render:r=><span className="font-extrabold text-slate-800">{r.year}{r.n<12?` (${r.n}m)`:''}</span>},{label:'Revenue',r:true,render:r=><span className="text-blue-600 font-bold">{fm(r.revenue)}</span>},{label:'Comisión',r:true,render:r=><span className="text-rose-500">{fm(r.commission)}</span>},{label:'Electricidad',r:true,render:r=>fm(r.duke)},{label:'HOA',r:true,render:r=><span className={r.hoa/r.n>600?'text-amber-600 font-semibold':''}>{fm(r.hoa)}</span>},{label:'Maint',r:true,render:r=>fm(r.maintenance)},{label:'Agua',r:true,render:r=>fm(r.water)},{label:'Otros',r:true,render:r=>fm(r.vendor)},{label:'Net',r:true,render:r=><span className="font-extrabold text-emerald-600">{fm(r.net)}</span>},{label:'Margen',r:true,render:r=><span className={`font-bold ${r.revenue&&r.net/r.revenue<0.45?'text-rose-500':'text-emerald-600'}`}>{pct(r.net,r.revenue)}</span>}]} rows={annual}/>
        </div>
      </>}

      {/* Partner Balance */}
      {partners.length>1&&<div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-4"><h3 className="text-sm font-bold text-slate-700 mb-4">👥 Balance entre Socios</h3>
        <div className="grid gap-4" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,3)},1fr)`}}>{partners.map(p=>{const t=pt[p.id]||{};return<div key={p.id} className="rounded-2xl p-4 bg-slate-50 border-l-4" style={{borderLeftColor:p.color}}>
          <div className="flex items-center gap-2.5 mb-3"><div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{background:p.color}}>{p.name.charAt(0)}</div><div><div className="font-bold text-sm text-slate-700">{p.name}</div><div className="text-[10px] text-slate-400">{p.ownership}%</div></div></div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="bg-white rounded-xl p-2"><div className="text-slate-400 font-semibold">Aportado</div><div className="font-extrabold text-emerald-600 text-sm">{fm(t.cont)}</div></div>
            <div className="bg-white rounded-xl p-2"><div className="text-slate-400 font-semibold">Gastos</div><div className="font-extrabold text-rose-500 text-sm">{fm(t.exp)}</div></div>
            <div className="bg-white rounded-xl p-2"><div className="text-slate-400 font-semibold">Ingreso</div><div className="font-extrabold text-blue-600 text-sm">{fm(t.inc)}</div></div>
          </div></div>})}</div>
      </div>}

      {!annual.length&&!income.length&&<Empty icon={BarChart3} title="Empieza a registrar datos" desc="Carga statements, registra ingresos y gastos para ver tu dashboard completo." action="Cargar Statement" onAction={()=>{setUploadLog([]);setModal('upload')}}/>}
    </>}

    {/* ═══ PARTNERS ═══ */}
    {view==='partners'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">👥 Socios & Capital</h1><button onClick={()=>{setCf({date:new Date().toISOString().split('T')[0],concept:'',amount:'',paidBy:partners[0]?.id||''});setModal('contribution')}} className="px-4 py-2.5 bg-purple-600 text-white text-xs rounded-xl font-bold hover:bg-purple-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Aporte</button></div>
      <div className="grid gap-4 mb-6" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,3)},1fr)`}}>{partners.map(p=>{const t=pt[p.id]||{};const n=(t.cont||0)+(t.exp||0);return<div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-md" style={{background:`linear-gradient(135deg,${p.color},${p.color}cc)`}}>{p.name.charAt(0)}</div><div><div className="font-bold text-slate-800">{p.name}</div><div className="text-xs text-slate-400">{p.ownership}%</div></div></div>
        <div className="grid grid-cols-2 gap-3 text-center mb-3"><div className="bg-emerald-50 rounded-xl p-3"><div className="text-[10px] text-emerald-600 font-bold uppercase">Aportado</div><div className="text-xl font-extrabold text-emerald-700">{fm(t.cont)}</div></div><div className="bg-rose-50 rounded-xl p-3"><div className="text-[10px] text-rose-500 font-bold uppercase">Gastos</div><div className="text-xl font-extrabold text-rose-600">{fm(t.exp)}</div></div></div>
        <div className="text-center bg-slate-50 rounded-xl p-3 border"><span className="text-xs text-slate-400">Total: </span><span className="text-lg font-extrabold text-slate-800">{fm(n)}</span></div>
      </div>})}</div>
      {contribs.length>0&&<Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},{label:'Socio',render:r=><span className="font-semibold" style={{color:pCl(r.paidBy)}}>{pN(r.paidBy)}</span>},{label:'Concepto',key:'concept',cls:'text-slate-600'},{label:'Monto',r:true,render:r=><span className="font-bold text-emerald-600">{fm(r.amount)}</span>}]} rows={contribs} onDel={del} dc="contributions"/>}
    </>}

    {/* ═══ STATEMENTS ═══ */}
    {view==='statements'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">📋 Statements</h1>
        <div className="flex gap-2"><button onClick={()=>{setUploadLog([]);setModal('upload')}} className="px-4 py-2.5 bg-blue-600 text-white text-xs rounded-xl font-bold flex items-center gap-1.5 shadow-sm"><Upload size={14}/> Subir PDFs</button><button onClick={()=>setModal('addStmt')} className="px-4 py-2.5 bg-slate-700 text-white text-xs rounded-xl font-bold flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Manual</button></div>
      </div>
      {stmts.length>0?<Tbl cols={[{label:'Periodo',render:r=><span className="font-bold text-slate-700">{M[r.month-1]} {r.year}</span>},{label:'Revenue',r:true,render:r=><span className="text-blue-600 font-semibold">{fm(r.revenue)}</span>},{label:'Comisión',r:true,render:r=><span className="text-rose-500">{fm(r.commission)}</span>},{label:'Electricidad',r:true,render:r=>fm(r.duke)},{label:'HOA',r:true,render:r=>fm(r.hoa)},{label:'Maint',r:true,render:r=>fm(r.maintenance)},{label:'Net',r:true,render:r=><span className="font-bold text-emerald-600">{fm(r.net)}</span>}]} rows={[...stmts].sort((a,b)=>b.year*100+b.month-a.year*100-a.month)} onDel={del} dc="statements"/>:<Empty icon={ClipboardList} title="Sin statements" desc="Sube los PDFs de owner statements o ingrésalos manualmente." action="Subir Statements" onAction={()=>{setUploadLog([]);setModal('upload')}}/>}
    </>}

    {/* ═══ ANALYTICS ═══ */}
    {view==='analytics'&&<>
      <h1 className="text-[22px] font-extrabold text-slate-800 mb-6">📊 Análisis Financiero</h1>
      {annual.length>0?<>
        {Object.keys(monthly).length>0&&<div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-4"><h3 className="text-sm font-bold text-slate-700 mb-4">Revenue Mensual — Comparativo YoY</h3>
          <ResponsiveContainer width="100%" height={260}><BarChart data={M.map((m,i)=>{const e={month:m};Object.keys(monthly).forEach(y=>{e['r'+y]=monthly[y].rev[i]});return e})}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="month" tick={{fontSize:10,fill:'#94a3b8'}}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11}}/>{Object.keys(monthly).sort().map((y,i)=><Bar key={y} dataKey={'r'+y} name={y} fill={C[i%C.length]} radius={[4,4,0,0]}/>)}</BarChart></ResponsiveContainer>
        </div>}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm"><h3 className="text-sm font-bold text-slate-700 mb-4">Evolución del Margen</h3>
            <ResponsiveContainer width="100%" height={200}><AreaChart data={annual.map(y=>({year:y.year+'',margin:y.revenue?(y.net/y.revenue*100):0}))}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="year" tick={{fontSize:11,fill:'#94a3b8'}}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} unit="%"/><Tooltip/><Area dataKey="margin" name="Margen %" stroke="#059669" fill="rgba(5,150,105,.1)"/></AreaChart></ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm"><h3 className="text-sm font-bold text-slate-700 mb-4">Evolución HOA + Electricidad</h3>
            <ResponsiveContainer width="100%" height={200}><ComposedChart data={annual}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="year" tick={{fontSize:11,fill:'#94a3b8'}}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="hoa" name="HOA" fill="#7C3AED" radius={[4,4,0,0]}/><Bar dataKey="duke" name="Electricidad" fill="#F59E0B" radius={[4,4,0,0]}/></ComposedChart></ResponsiveContainer>
          </div>
        </div>
      </>:<Empty icon={BarChart3} title="Sin datos" desc="Carga statements para ver análisis completo." action="Cargar Statements" onAction={()=>{setUploadLog([]);setModal('upload')}}/>}
    </>}

    {/* ═══ EXPENSES — Fixed vs Additional ═══ */}
    {view==='expenses'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">🧾 Gastos de la Propiedad</h1><button onClick={()=>{setEf({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional'});setModal('expense')}} className="px-4 py-2.5 bg-rose-500 text-white text-xs rounded-xl font-bold hover:bg-rose-600 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Nuevo Gasto</button></div>

      {expenses.length>0&&<div className="grid grid-cols-3 gap-4 mb-5">
        <Stat label="Gastos Fijos / Recurrentes" value={fm(fixedExp.reduce((s,e)=>s+(e.amount||0),0))} sub={`${fixedExp.length} registros`} color="amber" icon={Calendar}/>
        <Stat label="Gastos Adicionales" value={fm(additionalExp.reduce((s,e)=>s+(e.amount||0),0))} sub={`${additionalExp.length} registros`} color="red" icon={Layers}/>
        <Stat label="Total Gastos" value={fm(totExp)} sub="todos los registros" color="purple" icon={Receipt}/>
      </div>}

      {expByCat.length>0&&<div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-4"><h3 className="text-sm font-bold text-slate-700 mb-4">Distribución por Categoría</h3><ResponsiveContainer width="100%" height={180}><BarChart data={expByCat} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis type="number" tickFormatter={fm} tick={{fontSize:10,fill:'#94a3b8'}}/><YAxis type="category" dataKey="name" tick={{fontSize:10,fill:'#64748b'}} width={120}/><Tooltip content={<Tip/>}/><Bar dataKey="value" name="Monto" fill="#DC2626" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></div>}

      {fixedExp.length>0&&<div className="mb-4"><h3 className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2"><Calendar size={16} className="text-amber-500"/> Gastos Fijos / Recurrentes</h3>
        <Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},{label:'Concepto',key:'concept',cls:'text-slate-700 font-medium'},{label:'Categoría',render:r=>{const c=CATS.find(x=>x.v===r.category);return<span className="text-xs text-slate-400">{c?c.i+' '+c.l:r.category}</span>}},{label:'Pagó',render:r=><span className="font-semibold" style={{color:pCl(r.paidBy)}}>{pN(r.paidBy)}</span>},{label:'Monto',r:true,render:r=><span className="font-bold text-rose-500">{fm(r.amount)}</span>}]} rows={fixedExp} onDel={del} dc="expenses"/>
      </div>}

      {additionalExp.length>0&&<div className="mb-4"><h3 className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2"><Layers size={16} className="text-red-500"/> Gastos Adicionales / Únicos</h3>
        <Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},{label:'Concepto',key:'concept',cls:'text-slate-700 font-medium'},{label:'Categoría',render:r=>{const c=CATS.find(x=>x.v===r.category);return<span className="text-xs text-slate-400">{c?c.i+' '+c.l:r.category}</span>}},{label:'Pagó',render:r=><span className="font-semibold" style={{color:pCl(r.paidBy)}}>{pN(r.paidBy)}</span>},{label:'Monto',r:true,render:r=><span className="font-bold text-rose-500">{fm(r.amount)}</span>}]} rows={additionalExp} onDel={del} dc="expenses"/>
      </div>}

      {!expenses.length&&<Empty icon={Receipt} title="Sin gastos" desc="Registra gastos fijos y adicionales de tu propiedad." action="Registrar Gasto" onAction={()=>{setEf({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional'});setModal('expense')}}/>}
    </>}

    {/* ═══ INCOME ═══ */}
    {view==='income'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">💰 Ingresos</h1><button onClick={()=>{setNf({date:'',month:'',grossAmount:''});setModal('income')}} className="px-4 py-2.5 bg-emerald-600 text-white text-xs rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Ingreso</button></div>
      {income.length>0?<>
        <div className="grid grid-cols-3 gap-4 mb-5"><Stat label="Ingreso Bruto" value={fm(totGross)} color="blue"/><Stat label="Comisiones PM" value={fm(totGross-totNet)} color="red"/><Stat label="Ingreso Neto" value={fm(totNet)} color="green"/></div>
        <Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},{label:'Mes',key:'month',cls:'text-slate-700 font-medium'},{label:'Bruto',r:true,render:r=>fm(r.grossAmount)},{label:`Comisión (${prop.managerCommission||15}%)`,r:true,render:r=><span className="text-rose-500">-{fm(r.hostUFee)}</span>},{label:'Neto',r:true,render:r=><span className="font-bold text-emerald-600">{fm(r.netAmount)}</span>},...(partners.length>1?[{label:'Por Socio',r:true,render:r=><span className="text-amber-600 font-semibold">{fm(r.netAmount/partners.length)}</span>}]:[])]} rows={income} onDel={del} dc="income"/>
      </>:<Empty icon={DollarSign} title="Sin ingresos" desc="Registra ingresos para ver rendimiento." action="Registrar Ingreso" onAction={()=>{setNf({date:'',month:'',grossAmount:''});setModal('income')}}/>}
    </>}

    {/* ═══ MORTGAGE — Config form + Simulator ═══ */}
    {view==='mortgage'&&<>
      <h1 className="text-[22px] font-extrabold text-slate-800 mb-6">🏦 Hipoteca</h1>
      {mort.balance>0?<>
        <div className="grid grid-cols-4 gap-4 mb-6"><Stat label="Balance" value={fm(mort.balance)} color="red"/><Stat label="Tasa" value={mort.rate+'%'} sub={mort.termYears+' años'} color="amber"/><Stat label="Pago Mensual" value={fm(mort.monthlyPayment)} color="blue"/><Stat label="Total Intereses" value={sNE.length>0?fm(sNE[sNE.length-1].ti):'$0'} sub="sin pagos extra" color="purple"/></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-800 mb-1">💰 Simulador de Pagos Anticipados</h3><p className="text-xs text-slate-400 mb-5">¿Cuánto extra al principal cada mes?</p>
          <div className="max-w-xs mb-6"><Inp label="Pago extra mensual" value={extraP} onChange={setExtraP} prefix="$" type="number"/></div>
          {sE.length>0&&sNE.length>0&&<>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-emerald-50 rounded-2xl p-5 text-center border border-emerald-100"><div className="text-[10px] text-emerald-600 font-bold uppercase">Se paga en</div><div className="text-3xl font-extrabold text-emerald-700 mt-1">{Math.ceil(sE[sE.length-1].mo/12)} años</div><div className="text-xs text-emerald-500">vs {Math.ceil(sNE[sNE.length-1].mo/12)} sin extra</div></div>
              <div className="bg-blue-50 rounded-2xl p-5 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-bold uppercase">Ahorro</div><div className="text-3xl font-extrabold text-blue-700 mt-1">{fm(sNE[sNE.length-1].ti-sE[sE.length-1].ti)}</div></div>
              <div className="bg-amber-50 rounded-2xl p-5 text-center border border-amber-100"><div className="text-[10px] text-amber-600 font-bold uppercase">Meses Menos</div><div className="text-3xl font-extrabold text-amber-700 mt-1">{sNE[sNE.length-1].mo-sE[sE.length-1].mo}</div></div>
            </div>
            <ResponsiveContainer width="100%" height={280}><AreaChart data={sNE.map((d,i)=>({yr:'Año '+d.yr,sin:d.bal,con:sE[i]?.bal||0}))}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="yr" tick={{fontSize:9,fill:'#94a3b8'}} interval={4}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11}}/><Area dataKey="sin" name="Sin extra" stroke="#DC2626" fill="rgba(220,38,38,.05)"/><Area dataKey="con" name={`$${extraP||0}/mes extra`} stroke="#059669" fill="rgba(5,150,105,.05)"/></AreaChart></ResponsiveContainer>
          </>}
        </div>
      </>:<>
        {/* MORTGAGE CONFIG FORM */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-lg">
          <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center"><Landmark size={24} className="text-blue-600"/></div><div><h3 className="text-base font-extrabold text-slate-800">Configurar Hipoteca</h3><p className="text-xs text-slate-400">Ingresa los datos de tu mortgage para ver análisis y simulador.</p></div></div>
          <div className="space-y-3 mt-5">
            <div className="grid grid-cols-2 gap-3"><Inp label="Balance Actual del Mortgage" value={mc.bal} onChange={v=>umc('bal',v)} prefix="$" type="number" placeholder="285,000"/><Inp label="Tasa de Interés Anual (%)" value={mc.rate} onChange={v=>umc('rate',v)} type="number" placeholder="7.25"/></div>
            <div className="grid grid-cols-3 gap-3"><Inp label="Plazo (años)" value={mc.term} onChange={v=>umc('term',v)} type="number" placeholder="30"/><Inp label="Pago Mensual (P&I)" value={mc.pay} onChange={v=>umc('pay',v)} prefix="$" type="number" placeholder="1,945"/><Inp label="Inicio del Mortgage" value={mc.start} onChange={v=>umc('start',v)} type="date"/></div>
          </div>
          {mc.bal&&mc.rate&&mc.pay&&<div className="bg-blue-50 rounded-xl p-4 mt-4 border border-blue-100">
            <div className="text-xs text-blue-700 font-semibold mb-2">Vista previa</div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div><div className="text-slate-400">Balance</div><div className="font-bold text-slate-800">{fm(parseFloat(mc.bal))}</div></div>
              <div><div className="text-slate-400">Pago Mensual</div><div className="font-bold text-slate-800">{fm(parseFloat(mc.pay))}</div></div>
              <div><div className="text-slate-400">Tasa</div><div className="font-bold text-slate-800">{mc.rate}% a {mc.term} años</div></div>
            </div>
          </div>}
          <button onClick={saveMortgage} disabled={!mc.bal||!mc.rate||!mc.pay} className="w-full mt-5 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-30 transition shadow-lg shadow-blue-500/20">💾 Guardar Hipoteca</button>
        </div>
      </>}
    </>}

    </div></div>

    {/* ═══ MODALS ═══ */}
    {modal==='expense'&&<Mdl title="Registrar Gasto" grad="from-rose-500 to-rose-600" onClose={()=>setModal(null)} footer={<><button onClick={()=>setModal(null)} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>save('expenses',{...ef,amount:parseFloat(ef.amount)})} disabled={!ef.amount||!ef.concept} className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-bold text-sm disabled:opacity-30">Guardar</button></>}>
      <div className="grid grid-cols-2 gap-3"><Inp label="Fecha" value={ef.date} onChange={v=>ue('date',v)} type="date"/><Sel label="Categoría" value={ef.category} onChange={v=>ue('category',v)} options={CATS.map(c=>({v:c.v,l:c.i+' '+c.l}))}/></div>
      <Inp label="Concepto" value={ef.concept} onChange={v=>ue('concept',v)} placeholder="Descripción del gasto"/>
      <Inp label="Monto (USD)" value={ef.amount} onChange={v=>ue('amount',v)} prefix="$" type="number"/>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de gasto</label>
        <div className="grid grid-cols-2 gap-2">{[['fixed','🔄 Fijo / Recurrente'],['additional','➕ Adicional / Único']].map(([v,l])=><button key={v} type="button" onClick={()=>ue('type',v)} className={`py-2.5 rounded-xl border-2 text-sm font-medium transition ${ef.type===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500 hover:border-slate-300'}`}>{l}</button>)}</div>
      </div>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">¿Quién pagó?</label><PPick partners={partners} selected={ef.paidBy} onChange={v=>ue('paidBy',v)}/></div>
    </Mdl>}

    {modal==='income'&&<Mdl title="Registrar Ingreso" grad="from-emerald-500 to-emerald-600" onClose={()=>setModal(null)} footer={<><button onClick={()=>setModal(null)} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>{const g=parseFloat(nf.grossAmount);save('income',{date:nf.date,month:nf.month,grossAmount:g,hostUFee:g*(prop.managerCommission||15)/100,netAmount:g*(1-(prop.managerCommission||15)/100)})}} disabled={!nf.grossAmount} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">Guardar</button></>}>
      <div className="grid grid-cols-2 gap-3"><Inp label="Fecha" value={nf.date} onChange={v=>un('date',v)} type="date"/><Inp label="Mes" value={nf.month} onChange={v=>un('month',v)} placeholder="Ej: Febrero 2025"/></div>
      <Inp label="Ingreso Bruto" value={nf.grossAmount} onChange={v=>un('grossAmount',v)} prefix="$" type="number"/>
      {nf.grossAmount&&<div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-sm border border-slate-100"><div className="flex justify-between"><span className="text-slate-400">Comisión {prop.manager} ({prop.managerCommission||15}%)</span><span className="text-rose-500 font-semibold">-{fm(nf.grossAmount*(prop.managerCommission||15)/100)}</span></div><div className="flex justify-between font-bold border-t border-slate-200 pt-2"><span>Neto</span><span className="text-emerald-600">{fm(nf.grossAmount*(1-(prop.managerCommission||15)/100))}</span></div>{partners.length>1&&<div className="flex justify-between text-amber-600 font-semibold"><span>Por socio</span><span>{fm(nf.grossAmount*(1-(prop.managerCommission||15)/100)/partners.length)}</span></div>}</div>}
    </Mdl>}

    {modal==='contribution'&&<Mdl title="Aporte de Capital" grad="from-purple-500 to-purple-600" onClose={()=>setModal(null)} footer={<><button onClick={()=>setModal(null)} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>save('contributions',{...cf,amount:parseFloat(cf.amount),type:'contribution'})} disabled={!cf.amount} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">Guardar</button></>}>
      <div className="grid grid-cols-2 gap-3"><Inp label="Fecha" value={cf.date} onChange={v=>uc('date',v)} type="date"/><Inp label="Monto" value={cf.amount} onChange={v=>uc('amount',v)} prefix="$" type="number"/></div>
      <Inp label="Concepto" value={cf.concept} onChange={v=>uc('concept',v)} placeholder="Ej: Down payment, reparación..."/>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Socio</label><PPick partners={partners} selected={cf.paidBy} onChange={v=>uc('paidBy',v)}/></div>
    </Mdl>}

    {modal==='addStmt'&&<Mdl title="Statement Manual" grad="from-slate-700 to-slate-800" onClose={()=>setModal(null)} footer={<><button onClick={()=>setModal(null)} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>{save('statements',{year:parseInt(sf.year),month:parseInt(sf.month),revenue:parseFloat(sf.revenue)||0,net:parseFloat(sf.net)||0,commission:parseFloat(sf.commission)||0,duke:parseFloat(sf.duke)||0,water:parseFloat(sf.water)||0,hoa:parseFloat(sf.hoa)||0,maintenance:parseFloat(sf.maintenance)||0,vendor:parseFloat(sf.vendor)||0});setSf(x=>({...x,month:x.month<12?x.month+1:1,revenue:'',net:'',commission:'',duke:'',water:'',hoa:'',maintenance:'',vendor:''}))}} disabled={!sf.revenue} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">Guardar</button></>}>
      <div className="grid grid-cols-2 gap-3"><Inp label="Año" value={sf.year} onChange={v=>us('year',v)} type="number"/><Sel label="Mes" value={sf.month} onChange={v=>us('month',v)} options={M.map((m,i)=>({v:i+1,l:m}))}/></div>
      <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100"><div className="text-[10px] font-black text-emerald-700 uppercase mb-3">Ingresos</div><Inp label="Revenue Total" value={sf.revenue} onChange={v=>us('revenue',v)} prefix="$" type="number"/></div>
      <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100"><div className="text-[10px] font-black text-rose-700 uppercase mb-3">Gastos</div><div className="grid grid-cols-2 gap-3"><Inp label="Comisión PM" value={sf.commission} onChange={v=>us('commission',v)} prefix="$" type="number"/><Inp label="Electricidad" value={sf.duke} onChange={v=>us('duke',v)} prefix="$" type="number"/><Inp label="Agua" value={sf.water} onChange={v=>us('water',v)} prefix="$" type="number"/><Inp label="HOA" value={sf.hoa} onChange={v=>us('hoa',v)} prefix="$" type="number"/><Inp label="Maintenance" value={sf.maintenance} onChange={v=>us('maintenance',v)} prefix="$" type="number"/><Inp label="Vendor/Otros" value={sf.vendor} onChange={v=>us('vendor',v)} prefix="$" type="number"/></div></div>
      <Inp label="Net al Owner (ACH)" value={sf.net} onChange={v=>us('net',v)} prefix="$" type="number"/>
    </Mdl>}

    {modal==='upload'&&<Mdl title="📤 Subir Statements (PDF)" grad="from-blue-600 to-cyan-600" onClose={()=>setModal(null)}>
      <p className="text-sm text-slate-500">Sube PDFs de owner statements. Se extrae automáticamente: revenue, comisiones, utilities, HOA, maintenance y net.</p>
      <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all" onClick={()=>fileRef.current?.click()}>
        <Upload size={32} className="text-slate-300 mx-auto mb-2"/><div className="text-sm font-semibold text-slate-600">Arrastra PDFs aquí o haz clic</div><div className="text-xs text-slate-400 mt-1">Múltiples archivos</div>
      </div>
      <input ref={fileRef} type="file" accept=".pdf" multiple className="hidden" onChange={e=>{if(e.target.files.length){/* PDF parsing placeholder - use manual entry for now */setUploadLog([{file:'PDF Upload',status:'info',msg:'Usa la entrada manual por ahora. El parser de PDF se activa con la versión deployada.'}])}e.target.value=''}}/>
      {uploadLog.length>0&&<div className="space-y-2 mt-3">{uploadLog.map((l,i)=><div key={i} className={`flex items-start gap-2 p-3 rounded-xl text-xs font-medium ${l.status==='ok'?'bg-emerald-50 text-emerald-700':l.status==='dup'?'bg-amber-50 text-amber-700':l.status==='info'?'bg-blue-50 text-blue-700':'bg-rose-50 text-rose-700'}`}><span>{l.status==='ok'?'✅':l.status==='dup'?'⚠️':l.status==='info'?'ℹ️':'❌'}</span><div><div className="font-bold">{l.file}</div><div className="font-normal mt-0.5">{l.msg}</div></div></div>)}</div>}
    </Mdl>}
  </div>;
}

// ═══ ROOT ═══
export default function App() {
  const [user,setUser]=useState(null);const [ready,setReady]=useState(false);const [allProps,setAllProps]=useState([]);const [activePropId,setActivePropId]=useState(null);const [checking,setChecking]=useState(false);
  useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setReady(true);if(!u){setAllProps([]);setActivePropId(null)}}),[]);
  useEffect(()=>{if(!user)return;setChecking(true);
    const q1=query(collection(db,'properties'),where('ownerId','==',user.uid));
    const q2=query(collection(db,'properties'),where('memberEmails','array-contains',user.email));
    let r1=[],r2=[];const merge=()=>{const m=new Map();[...r1,...r2].forEach(d=>m.set(d.id,d));const a=Array.from(m.values());setAllProps(a);if(!activePropId&&a.length>0)setActivePropId(a[0].id);setChecking(false)};
    const u1=onSnapshot(q1,s=>{r1=s.docs.map(d=>({id:d.id,...d.data()}));merge()});
    const u2=onSnapshot(q2,s=>{r2=s.docs.map(d=>({id:d.id,...d.data()}));merge()});
    return()=>{u1();u2()}},[user]);
  const ap=allProps.find(p=>p.id===activePropId);
  if(!ready)return<div className="min-h-screen bg-[#0C1222] flex items-center justify-center"><Loader2 size={36} className="animate-spin text-blue-500"/></div>;
  if(!user)return<AuthScreen/>;
  if(checking)return<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 size={36} className="animate-spin text-blue-500"/></div>;
  if(!allProps.length||!ap)return<Onboarding userId={user.uid} onComplete={id=>setActivePropId(id)}/>;
  return<Dashboard propertyId={activePropId} propertyData={ap} allProperties={allProps} onSwitchProperty={setActivePropId} onLogout={()=>signOut(auth)} onAddProperty={()=>{setActivePropId(null);setAllProps([])}} userEmail={user.email}/>;
}
