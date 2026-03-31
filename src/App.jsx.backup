import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, where, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, LineChart, Line, ComposedChart } from 'recharts';
import { Home, DollarSign, Users, Plus, Building2, X, Trash2, Loader2, LogOut, Lock, Mail, Receipt, Landmark, UserPlus, ClipboardList, Eye, EyeOff, ChevronDown, FileText, TrendingUp, PiggyBank, Printer, ArrowLeft, BarChart3 } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & UTILS
// ═══════════════════════════════════════════════════════════════
const C = ['#2563EB','#059669','#D97706','#7C3AED','#DC2626','#0891B2','#DB2777','#65A30D'];
const MO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MOF = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const fm = v => '$' + Math.round(Math.abs(v||0)).toLocaleString('en-US');
const fm2 = v => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(v||0);
const fd = d => d ? new Date(d+'T12:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : '';
const pct = (a,b) => b ? ((a/b)*100).toFixed(1)+'%' : '—';

const CATS = [
  {v:'renovacion',l:'Renovación',i:'🔧'},{v:'contabilidad',l:'Contabilidad',i:'📊'},{v:'legal',l:'Legal',i:'⚖️'},
  {v:'seguro',l:'Seguro',i:'🛡️'},{v:'taxes',l:'Impuestos',i:'🏛️'},{v:'equipamiento',l:'Equipamiento',i:'🛋️'},
  {v:'marketing',l:'Marketing',i:'📸'},{v:'mantenimiento',l:'Mantenimiento',i:'🔨'},{v:'hoa',l:'HOA',i:'🏢'},
  {v:'servicios',l:'Servicios',i:'💡'},{v:'mortgage',l:'Hipoteca',i:'🏦'},{v:'otros',l:'Otros',i:'📦'},
];
const STATES = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
const PTYPES = [{v:'vacation',l:'Vacacional / STR'},{v:'longterm',l:'Long-Term Rental'},{v:'primary',l:'Residencia'},{v:'flip',l:'Flip'},{v:'commercial',l:'Comercial'}];

// ═══════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS (module-level — no focus loss)
// ═══════════════════════════════════════════════════════════════
function Inp({label,value,onChange,type='text',prefix,placeholder,className='',disabled}) {
  return <div className={className}>
    {label&&<label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>}
    <div className="relative">
      {prefix&&<span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>}
      <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className={`w-full ${prefix?'pl-7':'pl-3'} pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none text-sm bg-white transition disabled:bg-slate-50 disabled:text-slate-400`}/>
    </div>
  </div>;
}

function Sel({label,value,onChange,options,className=''}) {
  return <div className={className}>
    {label&&<label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>}
    <div className="relative">
      <select value={value} onChange={e=>onChange(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white appearance-none pr-8">
        {options.map(o=><option key={o.v??o.value} value={o.v??o.value}>{o.l??o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
    </div>
  </div>;
}

function PartnerPicker({partners,selected,onChange}) {
  return <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,4)},1fr)`}}>
    {partners.map(p=><button key={p.id} type="button" onClick={()=>onChange(p.id)}
      className={`py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${selected===p.id?'border-blue-500 bg-blue-50 text-blue-700 shadow-sm':'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
      {p.name||'Socio'}
    </button>)}
  </div>;
}

function Mdl({title,color='blue',onClose,children,footer}) {
  const g={blue:'from-blue-600 to-blue-700',red:'from-rose-500 to-rose-600',green:'from-emerald-500 to-emerald-600',purple:'from-violet-500 to-violet-600'};
  return <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4">
      <div className={`bg-gradient-to-r ${g[color]||g.blue} text-white px-5 py-4 flex justify-between items-center shrink-0`}>
        <span className="font-bold text-[15px]">{title}</span>
        <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-lg transition"><X size={18}/></button>
      </div>
      <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1">{children}</div>
      {footer&&<div className="px-5 py-4 bg-slate-50 border-t flex gap-3 shrink-0">{footer}</div>}
    </div>
  </div>;
}

function KPI({label,value,sub,color='#2563EB',icon}) {
  return <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition group">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</span>
      {icon&&<span className="text-slate-200 group-hover:text-slate-300 transition">{icon}</span>}
    </div>
    <div className="text-2xl font-extrabold text-slate-800 tracking-tight">{value}</div>
    {sub&&<div className="text-[11px] text-slate-400 mt-1">{sub}</div>}
  </div>;
}

function Empty({icon:Icon,title,desc,action,onAction}) {
  return <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Icon size={28} className="text-slate-400"/></div>
    <h3 className="text-lg font-bold text-slate-700 mb-2">{title}</h3>
    <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">{desc}</p>
    {action&&<button onClick={onAction} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition inline-flex items-center gap-2 shadow-lg shadow-blue-500/20"><Plus size={16}/>{action}</button>}
  </div>;
}

function Tbl({cols,data,onDel,delCol}) {
  if(!data?.length) return null;
  return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr className="bg-slate-50/80 border-b border-slate-100">
          {cols.map((c,i)=><th key={i} className={`py-3.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest ${c.right?'text-right':'text-left'}`}>{c.h}</th>)}
          {onDel&&<th className="w-10"/>}
        </tr></thead>
        <tbody>{data.map((r,ri)=><tr key={r.id||ri} className="border-b border-slate-50 hover:bg-blue-50/40 transition">
          {cols.map((c,ci)=><td key={ci} className={`py-3.5 px-4 text-sm ${c.right?'text-right':''} ${c.cls||''}`}>{c.r?c.r(r):r[c.k]}</td>)}
          {onDel&&<td className="py-3 px-2"><button onClick={()=>onDel(delCol,r.id)} className="text-slate-200 hover:text-rose-500 transition p-1.5 rounded-lg hover:bg-rose-50"><Trash2 size={14}/></button></td>}
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}

const Tip = ({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs shadow-2xl">
    <div className="text-slate-300 font-bold mb-1.5">{label}</div>
    {payload.map((p,i)=><div key={i} style={{color:p.color}} className="flex justify-between gap-4"><span>{p.name}</span><b>{fm(p.value)}</b></div>)}
  </div>;
};

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════
function AuthScreen() {
  const [mode,setMode]=useState('login');
  const [email,setEmail]=useState('');
  const [pw,setPw]=useState('');
  const [show,setShow]=useState(false);
  const [err,setErr]=useState('');
  const [busy,setBusy]=useState(false);

  const go = async e=>{
    e.preventDefault();setErr('');setBusy(true);
    try{mode==='login'?await signInWithEmailAndPassword(auth,email,pw):await createUserWithEmailAndPassword(auth,email,pw)}
    catch(e){const m={'auth/invalid-credential':'Correo o contraseña incorrectos','auth/email-already-in-use':'Este correo ya tiene cuenta','auth/weak-password':'Mínimo 6 caracteres'};setErr(m[e.code]||e.message)}
    setBusy(false);
  };

  return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4" style={{backgroundImage:'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,.12) 0%, transparent 60%)'}}>
    <div className="w-full max-w-[420px]">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-[72px] h-[72px] bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[20px] shadow-2xl shadow-blue-500/30 mb-5 ring-4 ring-blue-500/10">
          <Building2 className="text-white" size={34}/>
        </div>
        <h1 className="text-[32px] font-extrabold text-white tracking-tight">PropertyVault</h1>
        <p className="text-blue-300/50 mt-1">Gestión inteligente de propiedades en EE.UU.</p>
      </div>
      <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
        <div className="flex mb-7 bg-slate-100 rounded-2xl p-1">
          {[['login','Iniciar Sesión'],['register','Crear Cuenta']].map(([k,l])=>
            <button key={k} onClick={()=>{setMode(k);setErr('')}} className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${mode===k?'bg-white shadow-sm text-slate-800':'text-slate-400 hover:text-slate-600'}`}>{l}</button>
          )}
        </div>
        <form onSubmit={go} className="space-y-4">
          <div><label className="block text-sm font-semibold text-slate-700 mb-2">Correo electrónico</label>
            <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none text-sm" placeholder="tu@email.com" required autoComplete="email"/>
            </div>
          </div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
            <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} className="w-full pl-11 pr-12 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none text-sm" placeholder="••••••••" required/>
              <button type="button" onClick={()=>setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{show?<EyeOff size={16}/>:<Eye size={16}/>}</button>
            </div>
          </div>
          {err&&<div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm font-medium">{err}</div>}
          <button type="submit" disabled={busy} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-blue-500/25 text-[15px]">
            {busy&&<Loader2 size={18} className="animate-spin"/>}{mode==='login'?'Entrar':'Crear Mi Cuenta'}
          </button>
        </form>
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════════════
function Onboarding({userId,onComplete}) {
  const [step,setStep]=useState(0);
  const [busy,setBusy]=useState(false);
  const [p,setP]=useState({name:'',address:'',city:'',state:'FL',type:'vacation',price:'',date:'',beds:'',baths:'',pm:'',pmFee:'15'});
  const [prs,setPrs]=useState([{name:'',email:'',own:'100',cap:''}]);
  const [mt,setMt]=useState({bal:'',rate:'',term:'30',pay:'',start:''});
  const up=useCallback((k,v)=>setP(x=>({...x,[k]:v})),[]);
  const um=useCallback((k,v)=>setMt(x=>({...x,[k]:v})),[]);
  const upPr=useCallback((i,k,v)=>setPrs(x=>{const n=[...x];n[i]={...n[i],[k]:v};return n}),[]);
  const addPr=()=>setPrs(x=>[...x,{name:'',email:'',own:'',cap:''}]);
  const rmPr=i=>setPrs(x=>x.length>1?x.filter((_,j)=>j!==i):x);
  const totOwn=prs.reduce((s,x)=>s+(parseFloat(x.own)||0),0);

  const finish=async()=>{
    setBusy(true);
    try{
      const partnersList=prs.map((x,i)=>({id:'p'+i,name:x.name,email:x.email||'',ownership:parseFloat(x.own)||0,initialCapital:parseFloat(x.cap)||0,color:C[i%C.length]}));
      const memberEmails=[auth.currentUser.email,...partnersList.map(x=>x.email).filter(Boolean)];
      const d={...p,purchasePrice:parseFloat(p.price)||0,bedrooms:parseInt(p.beds)||0,bathrooms:parseInt(p.baths)||0,
        managerCommission:parseFloat(p.pmFee)||15,manager:p.pm,purchaseDate:p.date,
        partners:partnersList,memberEmails,
        mortgage:{balance:parseFloat(mt.bal)||0,rate:parseFloat(mt.rate)||0,termYears:parseInt(mt.term)||30,monthlyPayment:parseFloat(mt.pay)||0,startDate:mt.start||''},
        ownerId:userId,createdAt:serverTimestamp()};
      const ref=await addDoc(collection(db,'properties'),d);
      for(const x of d.partners){if(x.initialCapital>0)await addDoc(collection(db,'properties',ref.id,'contributions'),{partnerId:x.id,amount:x.initialCapital,type:'contribution',concept:'Capital Inicial',date:p.date||new Date().toISOString().split('T')[0],createdAt:serverTimestamp()});}
      onComplete(ref.id);
    }catch(e){alert('Error: '+e.message)}
    setBusy(false);
  };

  return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4" style={{backgroundImage:'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,.12) 0%, transparent 60%)'}}>
    <div className="w-full max-w-2xl">
      <div className="text-center mb-8"><h1 className="text-2xl font-extrabold text-white tracking-tight">🏠 Configurar tu propiedad</h1><p className="text-blue-300/50 text-sm mt-1">Paso {step+1} de 3</p></div>
      <div className="flex gap-2 mb-8">{['Propiedad','Socios','Hipoteca'].map((s,i)=><div key={i} className="flex-1 flex flex-col items-center gap-1.5">
        <div className={`w-full h-2 rounded-full transition-all duration-700 ${i<=step?'bg-gradient-to-r from-blue-500 to-indigo-500':'bg-slate-800'}`}/>
        <span className={`text-[11px] font-medium ${i<=step?'text-blue-400':'text-slate-600'}`}>{s}</span>
      </div>)}</div>
      <div className="bg-white rounded-3xl shadow-2xl p-7 border border-slate-100">
        {step===0&&<div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-3"><div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><Building2 size={20} className="text-blue-600"/></div>Datos de la Propiedad</h2>
          <div className="space-y-4">
            <Inp label="Nombre de la propiedad" value={p.name} onChange={v=>up('name',v)} placeholder="Ej: Casa Orlando, Condo Miami"/>
            <Inp label="Dirección completa" value={p.address} onChange={v=>up('address',v)} placeholder="8983 Backswing Way"/>
            <div className="grid grid-cols-2 gap-4"><Inp label="Ciudad" value={p.city} onChange={v=>up('city',v)} placeholder="Orlando"/><Sel label="Estado" value={p.state} onChange={v=>up('state',v)} options={STATES.map(s=>({v:s,l:s}))}/></div>
            <div className="grid grid-cols-3 gap-4">
              <Inp label="Precio de compra" value={p.price} onChange={v=>up('price',v)} prefix="$" type="number"/>
              <Inp label="Fecha de compra" value={p.date} onChange={v=>up('date',v)} type="date"/>
              <Sel label="Tipo de propiedad" value={p.type} onChange={v=>up('type',v)} options={PTYPES}/>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <Inp label="Habitaciones" value={p.beds} onChange={v=>up('beds',v)} type="number"/>
              <Inp label="Baños" value={p.baths} onChange={v=>up('baths',v)} type="number"/>
              <Inp label="Property Manager" value={p.pm} onChange={v=>up('pm',v)} placeholder="IHM, HOST U..."/>
              <Inp label="Comisión PM (%)" value={p.pmFee} onChange={v=>up('pmFee',v)} type="number"/>
            </div>
          </div>
          <div className="flex justify-end mt-7"><button onClick={()=>setStep(1)} disabled={!p.name||!p.address} className="px-7 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 transition shadow-lg shadow-blue-500/20">Siguiente →</button></div>
        </div>}

        {step===1&&<div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-2 flex items-center gap-3"><div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center"><Users size={20} className="text-emerald-600"/></div>Socios / Inversionistas</h2>
          <p className="text-sm text-slate-400 mb-6 ml-[52px]">Si eres el único dueño, pon tu nombre con 100% de participación.</p>
          {prs.map((x,i)=><div key={i} className="rounded-2xl p-5 mb-4 bg-slate-50 border-l-4" style={{borderLeftColor:C[i%C.length]}}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-extrabold uppercase tracking-widest" style={{color:C[i%C.length]}}>Socio {i+1}</span>
              {prs.length>1&&<button onClick={()=>rmPr(i)} className="text-slate-300 hover:text-rose-500 transition p-1 rounded-lg hover:bg-rose-50"><X size={16}/></button>}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <Inp label="Nombre completo" value={x.name} onChange={v=>upPr(i,'name',v)} placeholder="Juan Pérez"/>
              <Inp label="Email (para acceso)" value={x.email} onChange={v=>upPr(i,'email',v)} placeholder="socio@email.com" type="email"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Inp label="% Participación" value={x.own} onChange={v=>upPr(i,'own',v)} type="number"/>
              <Inp label="Capital Inicial (USD)" value={x.cap} onChange={v=>upPr(i,'cap',v)} prefix="$" type="number"/>
            </div>
          </div>)}
          <div className="flex justify-between items-center mt-2 mb-8">
            <button onClick={addPr} className="text-sm text-blue-600 font-bold hover:text-blue-800 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-blue-50 transition"><UserPlus size={16}/> Agregar Socio</button>
            <span className={`text-sm font-extrabold px-4 py-1.5 rounded-full ${totOwn===100?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{totOwn}% {totOwn===100?'✓':'≠ 100%'}</span>
          </div>
          <div className="flex justify-between"><button onClick={()=>setStep(0)} className="px-6 py-3 border-2 border-slate-200 rounded-2xl font-semibold text-slate-600 hover:bg-slate-50 transition">← Atrás</button><button onClick={()=>setStep(2)} disabled={!prs[0].name||totOwn!==100} className="px-7 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold disabled:opacity-40 transition shadow-lg shadow-blue-500/20">Siguiente →</button></div>
        </div>}

        {step===2&&<div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-2 flex items-center gap-3"><div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center"><Landmark size={20} className="text-violet-600"/></div>Hipoteca <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full ml-2">opcional</span></h2>
          <p className="text-sm text-slate-400 mb-6 ml-[52px]">Deja en blanco si la propiedad no tiene crédito hipotecario.</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><Inp label="Balance actual del préstamo" value={mt.bal} onChange={v=>um('bal',v)} prefix="$" type="number"/><Inp label="Tasa de interés anual (%)" value={mt.rate} onChange={v=>um('rate',v)} type="number"/></div>
            <div className="grid grid-cols-3 gap-4"><Inp label="Plazo (años)" value={mt.term} onChange={v=>um('term',v)} type="number"/><Inp label="Pago mensual" value={mt.pay} onChange={v=>um('pay',v)} prefix="$" type="number"/><Inp label="Inicio del préstamo" value={mt.start} onChange={v=>um('start',v)} type="date"/></div>
          </div>
          <div className="flex justify-between mt-7"><button onClick={()=>setStep(1)} className="px-6 py-3 border-2 border-slate-200 rounded-2xl font-semibold text-slate-600 hover:bg-slate-50 transition">← Atrás</button>
            <button onClick={finish} disabled={busy} className="px-7 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-bold disabled:opacity-50 transition flex items-center gap-2 shadow-lg shadow-emerald-500/20">{busy&&<Loader2 size={16} className="animate-spin"/>}🚀 Crear Mi Propiedad</button>
          </div>
        </div>}
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
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
  const [reportMode,setReportMode]=useState(false);

  const partners=prop.partners||[];
  const mort=prop.mortgage||{};

  const [ef,setEf]=useState({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros'});
  const [inf,setInf]=useState({date:'',month:'',gross:''});
  const [cf,setCf]=useState({date:'',concept:'',amount:'',paidBy:partners[0]?.id||''});
  const [sf,setSf]=useState({year:new Date().getFullYear(),month:new Date().getMonth()+1,revenue:'',net:'',commission:'',duke:'',water:'',hoa:'',maintenance:'',vendor:''});
  const [mortForm,setMortForm]=useState({balance:'',rate:'',term:'30',payment:'',start:''});

  const ue=useCallback((k,v)=>setEf(x=>({...x,[k]:v})),[]);
  const ui=useCallback((k,v)=>setInf(x=>({...x,[k]:v})),[]);
  const uc=useCallback((k,v)=>setCf(x=>({...x,[k]:v})),[]);
  const us=useCallback((k,v)=>setSf(x=>({...x,[k]:v})),[]);

  useEffect(()=>{
    const b=`properties/${propertyId}`;const u=[];
    const L=(s,fn)=>u.push(onSnapshot(query(collection(db,b,s),orderBy('createdAt','desc')),snap=>fn(snap.docs.map(d=>({id:d.id,...d.data()})))));
    L('expenses',setExpenses);L('income',setIncome);L('contributions',setContribs);L('statements',setStmts);
    setTimeout(()=>setLoading(false),600);return()=>u.forEach(x=>x());
  },[propertyId]);

  const save=async(s,d)=>{await addDoc(collection(db,'properties',propertyId,s),{...d,createdAt:serverTimestamp()});setModal(null)};
  const del=async(s,id)=>{if(!confirm('¿Eliminar?'))return;await deleteDoc(doc(db,'properties',propertyId,s,id))};

  // ── Calculations ──
  const pt=useMemo(()=>{
    const r={};partners.forEach(p=>{r[p.id]={n:p.name,c:p.color,o:p.ownership,contrib:0,exp:0,inc:0}});
    contribs.forEach(c=>{if(r[c.paidBy])r[c.paidBy].contrib+=c.amount||0});
    expenses.forEach(e=>{if(r[e.paidBy])r[e.paidBy].exp+=e.amount||0});
    const tn=income.reduce((s,i)=>s+(i.netAmount||0),0);
    partners.forEach(p=>{r[p.id].inc=tn*(p.ownership/100)});return r;
  },[partners,contribs,expenses,income]);

  const totExp=expenses.reduce((s,e)=>s+(e.amount||0),0);
  const totNet=income.reduce((s,i)=>s+(i.netAmount||0),0);
  const totCont=contribs.reduce((s,c)=>s+(c.amount||0),0);

  const catData=useMemo(()=>{const r={};expenses.forEach(e=>{const c=CATS.find(x=>x.v===e.category)||{l:'Otros',i:'📦'};if(!r[e.category])r[e.category]={name:c.i+' '+c.l,value:0};r[e.category].value+=e.amount||0});return Object.values(r).sort((a,b)=>b.value-a.value)},[expenses]);

  // ── Statement Analytics (like Orlando dashboard) ──
  const annualStmt=useMemo(()=>{
    const y={};stmts.forEach(s=>{
      if(!y[s.year])y[s.year]={year:s.year,revenue:0,net:0,commission:0,duke:0,water:0,hoa:0,maintenance:0,vendor:0,months:0};
      const a=y[s.year];a.revenue+=s.revenue||0;a.net+=s.net||0;a.commission+=s.commission||0;a.duke+=s.duke||0;a.water+=s.water||0;a.hoa+=s.hoa||0;a.maintenance+=s.maintenance||0;a.vendor+=s.vendor||0;a.months++;
    });return Object.values(y).sort((a,b)=>a.year-b.year);
  },[stmts]);

  const monthlyByYear=useMemo(()=>{
    const r={};stmts.forEach(s=>{if(!r[s.year])r[s.year]={rev:Array(12).fill(0),net:Array(12).fill(0)};r[s.year].rev[s.month-1]=s.revenue||0;r[s.year].net[s.month-1]=s.net||0});return r;
  },[stmts]);

  const stmtYears=Object.keys(monthlyByYear).sort();
  const yColors={'2023':'#2563EB','2024':'#D97706','2025':'#059669','2026':'#7C3AED','2027':'#DC2626'};

  const monthlyRevChart=useMemo(()=>MO.map((m,i)=>{const e={month:m};stmtYears.forEach(y=>{e['rev_'+y]=monthlyByYear[y]?.rev[i]||0});return e}),[monthlyByYear,stmtYears]);
  const monthlyNetChart=useMemo(()=>MO.map((m,i)=>{const e={month:m};stmtYears.forEach(y=>{e['net_'+y]=monthlyByYear[y]?.net[i]||0});return e}),[monthlyByYear,stmtYears]);

  const lastFullYear=annualStmt.filter(y=>y.months===12).pop();
  const expPieData=useMemo(()=>{
    const y=lastFullYear||annualStmt[annualStmt.length-1];if(!y)return[];
    return [{name:'Comisión PM',value:y.commission},{name:'Electricidad',value:y.duke},{name:'HOA',value:y.hoa},{name:'Mantenimiento',value:y.maintenance},{name:'Agua',value:y.water},{name:'Vendor/Otros',value:y.vendor}].filter(d=>d.value>0);
  },[lastFullYear,annualStmt]);

  // ── Mortgage calc ──
  const mc=useCallback((ex=0)=>{if(!mort.balance||!mort.rate||!mort.monthlyPayment)return[];let b=mort.balance;const r=mort.rate/100/12;const s=[];let t=0;for(let m=1;m<=mort.termYears*12&&b>0;m++){const i=b*r;const p=Math.min(mort.monthlyPayment-i+ex,b);b=Math.max(0,b-p);t+=i;if(m%12===0||b===0)s.push({year:Math.ceil(m/12),month:m,balance:b,interest:t})}return s},[mort]);
  const sNE=useMemo(()=>mc(0),[mc]);
  const sE=useMemo(()=>mc(parseFloat(extraP)||0),[mc,extraP]);

  const pn=id=>partners.find(p=>p.id===id)?.name||id;
  const pc=id=>partners.find(p=>p.id===id)?.color||'#94a3b8';

  const nav=[
    {id:'dashboard',icon:<Home size={18}/>,l:'Dashboard'},
    {id:'partners',icon:<Users size={18}/>,l:'Socios & Capital'},
    {id:'statements',icon:<BarChart3 size={18}/>,l:'Análisis Financiero'},
    {id:'expenses',icon:<Receipt size={18}/>,l:'Gastos'},
    {id:'income',icon:<DollarSign size={18}/>,l:'Ingresos'},
    {id:'mortgage',icon:<Landmark size={18}/>,l:'Hipoteca'},
  ];

  if(loading)return<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="text-center"><Loader2 size={36} className="animate-spin text-blue-500 mx-auto mb-4"/><p className="text-slate-400">Cargando PropertyVault...</p></div></div>;

  return <div className="min-h-screen bg-[#F8FAFC] flex">
    {/* ── SIDEBAR ── */}
    <div className="w-60 bg-white border-r border-slate-100 flex flex-col shrink-0">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20"><Building2 size={18} className="text-white"/></div>
          <div className="min-w-0"><div className="text-sm font-extrabold text-slate-800 truncate">PropertyVault</div><div className="text-[10px] text-slate-400 truncate">{userEmail}</div></div>
        </div>
        {/* Property Switcher */}
        {allProperties.length>0&&<div className="relative">
          <select value={propertyId} onChange={e=>onSwitchProperty(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none appearance-none pr-8 cursor-pointer hover:bg-slate-100 transition">
            {allProperties.map(p=><option key={p.id} value={p.id}>{p.name||'Sin nombre'} · {p.city||''}, {p.state||''}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
        </div>}
        {onAddProperty&&<button onClick={onAddProperty} className="w-full mt-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1.5"><Plus size={13}/>Agregar Propiedad</button>}
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(n=><button key={n.id} onClick={()=>setView(n.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] transition-all ${view===n.id?'bg-blue-50 text-blue-700 font-bold shadow-sm':'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'}`}>{n.icon}{n.l}</button>)}
      </nav>
      <div className="p-3 border-t border-slate-100"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition font-medium"><LogOut size={16}/>Cerrar Sesión</button></div>
    </div>

    {/* ── MAIN ── */}
    <div className="flex-1 overflow-auto"><div className="p-7 max-w-[1200px]">

      {/* ════ DASHBOARD ════ */}
      {view==='dashboard'&&<>
        <div className="flex justify-between items-start mb-7">
          <div><h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">{prop.name}</h1><p className="text-sm text-slate-400 mt-1">{prop.address}, {prop.city}, {prop.state} {prop.manager&&`· PM: ${prop.manager} (${prop.managerCommission}%)`}</p></div>
          <div className="flex gap-2">
            <button onClick={()=>{setInf({date:'',month:'',gross:''});setModal('income')}} className="px-4 py-2.5 bg-emerald-600 text-white text-xs rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition"><Plus size={14}/>Ingreso</button>
            <button onClick={()=>{setEf({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros'});setModal('expense')}} className="px-4 py-2.5 bg-rose-500 text-white text-xs rounded-xl font-bold hover:bg-rose-600 flex items-center gap-1.5 shadow-md shadow-rose-500/20 transition"><Plus size={14}/>Gasto</button>
            <button onClick={()=>setModal('statement')} className="px-4 py-2.5 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition"><ClipboardList size={14}/>Statement</button>
          </div>
        </div>

        {/* ROW 1: Main KPIs */}
        <div className="grid grid-cols-4 gap-5 mb-5">
          <KPI label="Valor Propiedad" value={fm(prop.purchasePrice)} icon={<Building2 size={18}/>}/>
          <KPI label="Capital Invertido" value={fm(totCont)} sub={`${partners.length} socio(s)`} icon={<PiggyBank size={18}/>}/>
          {annualStmt.length>0?<>
            <KPI label="Revenue Total (Statements)" value={fm(annualStmt.reduce((s,y)=>s+y.revenue,0))} sub={`${stmts.length} meses registrados`} icon={<TrendingUp size={18}/>}/>
            <KPI label="Net al Owner Total" value={fm(annualStmt.reduce((s,y)=>s+y.net,0))} sub={annualStmt.reduce((s,y)=>s+y.revenue,0)>0?`Margen ${pct(annualStmt.reduce((s,y)=>s+y.net,0),annualStmt.reduce((s,y)=>s+y.revenue,0))}`:''} icon={<DollarSign size={18}/>}/>
          </>:<>
            <KPI label="Ingreso Neto (Manual)" value={fm(totNet)} sub={`${income.length} periodos`} icon={<TrendingUp size={18}/>}/>
            <KPI label="Gastos Directos" value={fm(totExp)} sub={`${expenses.length} transacciones`} icon={<Receipt size={18}/>}/>
          </>}
        </div>

        {/* ROW 2: P&L + Performance */}
        {annualStmt.length>0&&<>
          {/* P&L Summary Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">📈 Estado de Resultados (P&L) — Desde Statements del PM</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Concepto</th>
                  {annualStmt.map(y=><th key={y.year} className="text-right py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{y.year}{y.months<12?` (${y.months}m)`:''}</th>)}
                  {annualStmt.length>=2&&<th className="text-right py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Var YoY</th>}
                </tr></thead>
                <tbody>
                  {[{l:'💰 Revenue',k:'revenue',c:'text-blue-600 font-bold'},{l:'├ Comisión PM',k:'commission',c:'text-rose-500'},{l:'├ Electricidad',k:'duke',c:'text-slate-600'},{l:'├ Agua',k:'water',c:'text-slate-600'},{l:'├ HOA',k:'hoa',c:'text-slate-600'},{l:'├ Mantenimiento',k:'maintenance',c:'text-slate-600'},{l:'└ Vendor/Otros',k:'vendor',c:'text-slate-600'},{l:'📊 Total Gastos',calc:y=>y.commission+y.duke+y.water+y.hoa+y.maintenance+y.vendor,c:'text-rose-500 font-bold'},{l:'✅ Net al Owner',k:'net',c:'text-emerald-600 font-extrabold text-base'},{l:'📉 Margen',calc:y=>y.revenue>0?(y.net/y.revenue*100):0,fmt:v=>v.toFixed(1)+'%',c:'text-slate-700 font-bold'},{l:'📆 Net Mensual Prom.',calc:y=>y.months>0?y.net/y.months:0,c:'text-slate-600'}].map((row,ri)=>{
                    const vals=annualStmt.map(y=>row.k?y[row.k]:row.calc(y));
                    const last2=vals.length>=2?[vals[vals.length-2],vals[vals.length-1]]:null;
                    const change=last2&&last2[0]?((last2[1]-last2[0])/Math.abs(last2[0])*100).toFixed(1):null;
                    return<tr key={ri} className={ri===7?'border-t-2 border-slate-200':ri===8?'border-t-2 border-emerald-200 bg-emerald-50/30':''}>
                      <td className="py-2 text-xs text-slate-700">{row.l}</td>
                      {vals.map((v,i)=><td key={i} className={`py-2 text-right text-sm ${row.c}`}>{row.fmt?row.fmt(v):fm(v)}</td>)}
                      {annualStmt.length>=2&&<td className={`py-2 text-right text-xs font-bold ${change&&parseFloat(change)>=0?'text-emerald-600':'text-rose-500'}`}>{change?`${parseFloat(change)>=0?'▲':'▼'}${change}%`:'—'}</td>}
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ROW 3: Charts */}
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"><h3 className="text-sm font-bold text-slate-700 mb-5">Revenue vs Net — Anual</h3>
              <ResponsiveContainer width="100%" height={230}><BarChart data={annualStmt}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/><XAxis dataKey="year" tick={{fontSize:12}}/><YAxis tick={{fontSize:10}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[6,6,0,0]}/><Bar dataKey="net" name="Net" fill="#059669" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
            </div>
            {expPieData.length>0&&<div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"><h3 className="text-sm font-bold text-slate-700 mb-5">Composición Gastos (último año)</h3>
              <ResponsiveContainer width="100%" height={230}><PieChart><Pie data={expPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{expPieData.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}</Pie><Tooltip formatter={v=>fm(v)}/></PieChart></ResponsiveContainer>
            </div>}
          </div>

          {/* ROW 4: Best/Worst months + Monthly comparison */}
          {monthlyByYear&&Object.keys(monthlyByYear).length>0&&<>
            {(()=>{
              const fullYears=annualStmt.filter(y=>y.months===12);
              if(!fullYears.length) return null;
              const avgNet=MO.map((_,i)=>{let s=0,c=0;fullYears.forEach(y=>{const v=monthlyByYear[y.year]?.net[i];if(v!==undefined){s+=v;c++}});return c?s/c:0;});
              const best=avgNet.indexOf(Math.max(...avgNet));
              const worst=avgNet.indexOf(Math.min(...avgNet));
              return <div className="grid grid-cols-3 gap-5 mb-5">
                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                  <div className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider mb-1">🏆 Mejor Mes (Prom. Net)</div>
                  <div className="text-2xl font-extrabold text-emerald-700">{MO[best]}</div>
                  <div className="text-sm text-emerald-600 font-bold mt-0.5">{fm(avgNet[best])}/mes</div>
                </div>
                <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100">
                  <div className="text-[10px] text-rose-500 font-extrabold uppercase tracking-wider mb-1">📉 Peor Mes (Prom. Net)</div>
                  <div className="text-2xl font-extrabold text-rose-600">{MO[worst]}</div>
                  <div className="text-sm text-rose-500 font-bold mt-0.5">{fm(avgNet[worst])}/mes</div>
                </div>
                <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                  <div className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider mb-1">📊 Net Mensual Promedio</div>
                  <div className="text-2xl font-extrabold text-blue-700">{fm(avgNet.reduce((s,v)=>s+v,0)/12)}</div>
                  <div className="text-sm text-blue-500 font-bold mt-0.5">{fullYears.length} años de datos</div>
                </div>
              </div>;
            })()}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-5"><h3 className="text-sm font-bold text-slate-700 mb-5">Revenue Mensual — Comparativo YoY</h3>
              <ResponsiveContainer width="100%" height={260}><BarChart data={MO.map((m,i)=>{const e={month:m};Object.keys(monthlyByYear).forEach(y=>{e['rev_'+y]=monthlyByYear[y].rev[i]});return e;})}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/><XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11}}/>{Object.keys(monthlyByYear).sort().map((y,i)=><Bar key={y} dataKey={'rev_'+y} name={y} fill={C[i%C.length]} radius={[4,4,0,0]}/>)}</BarChart></ResponsiveContainer>
            </div>
          </>}

          {/* Costos Fijos vs Variables */}
          {annualStmt.length>0&&<div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">🔒 Costos Fijos vs Variables</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Costos Fijos Mensuales (se pagan siempre)</div>
                {(()=>{const y=annualStmt[annualStmt.length-1];const fixed=[{l:'HOA',v:y.hoa},{l:'Electricidad',v:y.duke},{l:'Agua',v:y.water},{l:'Mantenimiento PM',v:y.maintenance}];const total=fixed.reduce((s,f)=>s+f.v,0);return<>
                  {fixed.map((f,i)=><div key={i} className="flex justify-between py-2 border-b border-slate-50 text-sm"><span className="text-slate-600">{f.l}</span><div><span className="text-slate-800 font-semibold">{fm(f.v/y.months)}/mes</span><span className="text-slate-400 text-xs ml-2">({fm(f.v)}/año)</span></div></div>)}
                  <div className="flex justify-between py-3 text-sm font-extrabold border-t-2 border-slate-200 mt-1"><span className="text-slate-800">Total Fijos</span><span className="text-rose-600">{fm(total/y.months)}/mes</span></div>
                </>})()}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Costos Variables (dependen de ocupación)</div>
                {(()=>{const y=annualStmt[annualStmt.length-1];const variable=[{l:'Comisión PM ('+prop.managerCommission+'%)',v:y.commission},{l:'Vendor / Proveedores',v:y.vendor}];const total=variable.reduce((s,f)=>s+f.v,0);return<>
                  {variable.map((f,i)=><div key={i} className="flex justify-between py-2 border-b border-slate-50 text-sm"><span className="text-slate-600">{f.l}</span><div><span className="text-slate-800 font-semibold">{fm(f.v/y.months)}/mes</span><span className="text-slate-400 text-xs ml-2">({fm(f.v)}/año)</span></div></div>)}
                  <div className="flex justify-between py-3 text-sm font-extrabold border-t-2 border-slate-200 mt-1"><span className="text-slate-800">Total Variables</span><span className="text-amber-600">{fm(total/y.months)}/mes</span></div>
                </>})()}
              </div>
            </div>
          </div>}
        </>}

        {/* Partners Balance */}
        {partners.length>1&&<div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mt-5"><h3 className="text-sm font-bold text-slate-700 mb-5">Balance entre Socios</h3><div className="grid gap-5" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,3)},1fr)`}}>{partners.map(p=>{const t=pt[p.id]||{};return<div key={p.id} className="rounded-2xl border-2 p-5 hover:shadow-md transition" style={{borderColor:p.color+'15',borderLeftColor:p.color,borderLeftWidth:5}}>
          <div className="font-bold text-sm mb-4 flex items-center gap-2.5"><div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-extrabold shadow-sm" style={{background:p.color}}>{p.name.charAt(0)}</div><span style={{color:p.color}}>{p.name} <span className="text-slate-400 font-medium">({p.ownership}%)</span></span></div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-emerald-50 rounded-xl p-3"><div className="text-emerald-500 font-bold uppercase text-[9px] mb-1">Aportado</div><div className="font-extrabold text-emerald-700 text-base">{fm(t.contrib)}</div></div>
            <div className="bg-rose-50 rounded-xl p-3"><div className="text-rose-400 font-bold uppercase text-[9px] mb-1">Gastos</div><div className="font-extrabold text-rose-600 text-base">{fm(t.exp)}</div></div>
            <div className="bg-blue-50 rounded-xl p-3"><div className="text-blue-400 font-bold uppercase text-[9px] mb-1">Ingreso</div><div className="font-extrabold text-blue-700 text-base">{fm(t.inc)}</div></div>
          </div>
        </div>})}</div></div>}

        {/* Empty state */}
        {!annualStmt.length&&!income.length&&<Empty icon={BarChart3} title="Empieza a registrar datos" desc="Carga statements del PM, registra ingresos y gastos para ver el tablero de control completo." action="Cargar Primer Statement" onAction={()=>setModal('statement')}/>}
      </>}

      {/* ════ PARTNERS ════ */}
      {view==='partners'&&<>
        <div className="flex justify-between items-center mb-7"><h1 className="text-2xl font-extrabold text-slate-800">👥 Socios & Capital</h1><button onClick={()=>{setCf({date:new Date().toISOString().split('T')[0],concept:'',amount:'',paidBy:partners[0]?.id||''});setModal('contribution')}} className="px-4 py-2.5 bg-violet-600 text-white text-xs rounded-xl font-bold hover:bg-violet-700 flex items-center gap-1.5 shadow-md shadow-violet-500/20"><Plus size={14}/>Registrar Aporte</button></div>
        <div className="grid gap-5 mb-6" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,3)},1fr)`}}>{partners.map(p=>{const t=pt[p.id]||{};const net=(t.contrib||0)+(t.exp||0);return<div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-4 mb-5"><div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-md" style={{background:`linear-gradient(135deg, ${p.color}, ${p.color}dd)`}}>{p.name.charAt(0)}</div><div><div className="font-extrabold text-slate-800 text-lg">{p.name}</div><div className="text-xs text-slate-400 font-medium">{p.ownership}% participación</div></div></div>
          <div className="grid grid-cols-2 gap-3 text-center mb-3"><div className="bg-emerald-50 rounded-2xl p-4"><div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Aportado</div><div className="text-xl font-extrabold text-emerald-700 mt-1">{fm(t.contrib)}</div></div><div className="bg-rose-50 rounded-2xl p-4"><div className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Gastos Pagados</div><div className="text-xl font-extrabold text-rose-600 mt-1">{fm(t.exp)}</div></div></div>
          <div className="text-center bg-slate-50 rounded-2xl p-3"><span className="text-xs text-slate-400 font-medium">Total invertido: </span><span className="text-lg font-extrabold text-slate-800">{fm(net)}</span></div>
        </div>})}</div>
        <Tbl cols={[{h:'Fecha',r:r=><span className="text-slate-400 font-medium">{fd(r.date)}</span>},{h:'Socio',r:r=><span className="font-bold" style={{color:pc(r.paidBy)}}>{pn(r.paidBy)}</span>},{h:'Concepto',k:'concept',cls:'text-slate-600'},{h:'Monto',right:true,r:r=><span className="font-extrabold text-emerald-600">{fm(r.amount)}</span>}]} data={contribs} onDel={del} delCol="contributions"/>
      </>}

      {/* ════ STATEMENTS / ANALYTICS ════ */}
      {view==='statements'&&<>
        <div className="flex justify-between items-center mb-7"><h1 className="text-2xl font-extrabold text-slate-800">📊 Análisis Financiero</h1>
          <div className="flex gap-2">
            <button onClick={()=>setModal('statement')} className="px-4 py-2.5 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-md shadow-blue-500/20"><Plus size={14}/>Cargar Statement</button>
          </div>
        </div>
        {stmts.length>0?<>
          {/* KPIs from statements */}
          {annualStmt.length>0&&<div className="grid grid-cols-4 gap-5 mb-6">{(()=>{const l=annualStmt[annualStmt.length-1];const p=annualStmt.length>1?annualStmt[annualStmt.length-2]:null;const chg=p?((l.revenue-p.revenue)/p.revenue*100).toFixed(1):null;return<>
            <KPI label={`Revenue ${l.year}`} value={fm(l.revenue)} sub={chg?`${parseFloat(chg)>=0?'▲':'▼'} ${chg}% vs ${l.year-1}`:`${l.months} meses`}/>
            <KPI label={`Net ${l.year}`} value={fm(l.net)} sub={l.revenue?`Margen ${pct(l.net,l.revenue)}`:''} />
            <KPI label={`Electricidad ${l.year}`} value={fm(l.duke)} sub={`${fm(l.duke/l.months)}/mes`}/>
            <KPI label={`HOA ${l.year}`} value={fm(l.hoa)} sub={`${fm(l.hoa/l.months)}/mes`}/>
          </>})()}</div>}

          {/* Revenue vs Net annual */}
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"><h3 className="text-sm font-bold text-slate-700 mb-4">Revenue vs Net — Anual</h3>
              <ResponsiveContainer width="100%" height={240}><BarChart data={annualStmt}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/><XAxis dataKey="year" tick={{fontSize:12}}/><YAxis tick={{fontSize:10}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[6,6,0,0]}/>
                <Bar dataKey="net" name="Net" fill="#059669" radius={[6,6,0,0]}/>
              </BarChart></ResponsiveContainer>
            </div>
            {expPieData.length>0&&<div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"><h3 className="text-sm font-bold text-slate-700 mb-4">Composición Gastos {lastFullYear?.year||annualStmt[annualStmt.length-1]?.year}</h3>
              <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={expPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{expPieData.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}</Pie><Tooltip formatter={v=>fm(v)}/></PieChart></ResponsiveContainer>
            </div>}
          </div>

          {/* Monthly comparison */}
          {stmtYears.length>0&&<div className="grid grid-cols-2 gap-5 mb-5">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"><h3 className="text-sm font-bold text-slate-700 mb-4">Revenue Mensual — YoY</h3>
              <ResponsiveContainer width="100%" height={240}><BarChart data={monthlyRevChart}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/><XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                {stmtYears.map(y=><Bar key={y} dataKey={'rev_'+y} name={y} fill={yColors[y]||C[0]} radius={[4,4,0,0]}/>)}
              </BarChart></ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"><h3 className="text-sm font-bold text-slate-700 mb-4">Net Mensual — YoY</h3>
              <ResponsiveContainer width="100%" height={240}><LineChart data={monthlyNetChart}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/><XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                {stmtYears.map(y=><Line key={y} dataKey={'net_'+y} name={y} stroke={yColors[y]||C[0]} strokeWidth={2.5} dot={{r:3}}/>)}
              </LineChart></ResponsiveContainer>
            </div>
          </div>}

          {/* Expense trend */}
          {annualStmt.length>1&&<div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-5"><h3 className="text-sm font-bold text-slate-700 mb-4">Evolución de Gastos por Categoría</h3>
            <ResponsiveContainer width="100%" height={240}><BarChart data={annualStmt}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/><XAxis dataKey="year" tick={{fontSize:12}}/><YAxis tick={{fontSize:10}} tickFormatter={fm} stacked/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:10}}/>
              <Bar dataKey="commission" name="Comisión" fill="#DC2626" stackId="a" radius={[0,0,0,0]}/>
              <Bar dataKey="duke" name="Electricidad" fill="#D97706" stackId="a"/>
              <Bar dataKey="hoa" name="HOA" fill="#7C3AED" stackId="a"/>
              <Bar dataKey="maintenance" name="Mantenimiento" fill="#0891B2" stackId="a"/>
              <Bar dataKey="water" name="Agua" fill="#2563EB" stackId="a"/>
              <Bar dataKey="vendor" name="Otros" fill="#94A3B8" stackId="a" radius={[6,6,0,0]}/>
            </BarChart></ResponsiveContainer>
          </div>}

          {/* Annual table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-5"><h3 className="text-sm font-bold text-slate-700 mb-4">Resumen Anual Detallado</h3>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-3 px-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Concepto</th>
                {annualStmt.map(y=><th key={y.year} className="py-3 px-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">{y.year} {y.months<12?`(${y.months}m)`:''}</th>)}
              </tr></thead>
              <tbody>
                {[{l:'Revenue',k:'revenue',c:'text-blue-600 font-extrabold'},{l:'Comisión PM',k:'commission',c:'text-rose-500'},{l:'Electricidad',k:'duke',c:'text-slate-600'},{l:'HOA',k:'hoa',c:'text-slate-600'},{l:'Mantenimiento',k:'maintenance',c:'text-slate-600'},{l:'Agua',k:'water',c:'text-slate-600'},{l:'Vendor/Otros',k:'vendor',c:'text-slate-600'},{l:'Net al Owner',k:'net',c:'text-emerald-600 font-extrabold'}].map(row=>
                  <tr key={row.k} className="border-b border-slate-50 hover:bg-blue-50/30"><td className={`py-3 px-4 font-semibold text-slate-700`}>{row.l}</td>{annualStmt.map(y=><td key={y.year} className={`py-3 px-4 text-right ${row.c}`}>{fm(y[row.k])}</td>)}</tr>
                )}
              </tbody>
            </table></div>
          </div>

          {/* Statements list */}
          <Tbl cols={[
            {h:'Periodo',r:r=><span className="font-bold text-slate-700">{MO[r.month-1]} {r.year}</span>},
            {h:'Revenue',right:true,r:r=><span className="text-blue-600 font-semibold">{fm(r.revenue)}</span>},
            {h:'Comisión',right:true,r:r=><span className="text-rose-500">{fm(r.commission)}</span>},
            {h:'Electricidad',right:true,r:r=>fm(r.duke)},
            {h:'HOA',right:true,r:r=>fm(r.hoa)},
            {h:'Net',right:true,r:r=><span className="font-extrabold text-emerald-600">{fm(r.net)}</span>},
          ]} data={[...stmts].sort((a,b)=>b.year*100+b.month-a.year*100-a.month)} onDel={del} delCol="statements"/>
        </>:<Empty icon={BarChart3} title="Sin datos financieros" desc="Carga los owner statements mensuales de tu property manager para ver análisis completo: gráficos, comparativos anuales, desglose de gastos y tendencias." action="Cargar Primer Statement" onAction={()=>setModal('statement')}/>}
      </>}

      {/* ════ EXPENSES ════ */}
      {view==='expenses'&&<>
        <div className="flex justify-between items-center mb-7"><h1 className="text-2xl font-extrabold text-slate-800">🧾 Gastos</h1><button onClick={()=>{setEf({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros'});setModal('expense')}} className="px-4 py-2.5 bg-rose-500 text-white text-xs rounded-xl font-bold hover:bg-rose-600 flex items-center gap-1.5 shadow-md shadow-rose-500/20"><Plus size={14}/>Nuevo Gasto</button></div>
        {expenses.length>0?<Tbl cols={[{h:'Fecha',r:r=><span className="text-slate-400 font-medium">{fd(r.date)}</span>},{h:'Concepto',k:'concept',cls:'text-slate-700 font-medium'},{h:'Categoría',r:r=>{const c=CATS.find(x=>x.v===r.category);return<span className="text-xs text-slate-400">{c?c.i+' '+c.l:r.category}</span>}},{h:'Pagó',r:r=><span className="font-bold" style={{color:pc(r.paidBy)}}>{pn(r.paidBy)}</span>},{h:'Monto',right:true,r:r=><span className="font-extrabold text-rose-500">{fm(r.amount)}</span>}]} data={expenses} onDel={del} delCol="expenses"/>:<Empty icon={Receipt} title="Sin gastos registrados" desc="Registra los gastos compartidos entre socios para llevar el control de quién ha aportado qué." action="Registrar Primer Gasto" onAction={()=>{setEf({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros'});setModal('expense')}}/>}
      </>}

      {/* ════ INCOME ════ */}
      {view==='income'&&<>
        <div className="flex justify-between items-center mb-7"><h1 className="text-2xl font-extrabold text-slate-800">💰 Ingresos</h1><button onClick={()=>{setInf({date:'',month:'',gross:''});setModal('income')}} className="px-4 py-2.5 bg-emerald-600 text-white text-xs rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-1.5 shadow-md shadow-emerald-500/20"><Plus size={14}/>Nuevo Ingreso</button></div>
        {income.length>0?<Tbl cols={[{h:'Fecha',r:r=><span className="text-slate-400 font-medium">{fd(r.date)}</span>},{h:'Mes',k:'month',cls:'text-slate-700 font-medium'},{h:'Bruto',right:true,r:r=>fm(r.grossAmount)},{h:`Comisión (${prop.managerCommission}%)`,right:true,r:r=><span className="text-rose-500">-{fm(r.hostUFee)}</span>},{h:'Neto',right:true,r:r=><span className="font-extrabold text-emerald-600">{fm(r.netAmount)}</span>},...(partners.length>1?[{h:'Por Socio',right:true,r:r=><span className="text-amber-600 font-semibold">{fm(r.netAmount/partners.length)}</span>}]:[])]} data={income} onDel={del} delCol="income"/>:<Empty icon={DollarSign} title="Sin ingresos" desc="Registra los ingresos de tu propiedad para ver el rendimiento y distribución entre socios." action="Registrar Ingreso" onAction={()=>{setInf({date:'',month:'',gross:''});setModal('income')}}/>}
      </>}

      {/* ════ MORTGAGE ════ */}
      {view==='mortgage'&&<>
        <h1 className="text-2xl font-extrabold text-slate-800 mb-7">🏦 Análisis de Hipoteca</h1>
        {mort.balance>0?<>
          <div className="grid grid-cols-4 gap-5 mb-6"><KPI label="Balance" value={fm(mort.balance)}/><KPI label="Tasa" value={mort.rate+'%'} sub={mort.termYears+' años'}/><KPI label="Pago Mensual" value={fm(mort.monthlyPayment)}/><KPI label="Total Intereses" value={sNE.length?fm(sNE[sNE.length-1].interest):'$0'} sub="sin pagos extra"/></div>
          <div className="bg-white rounded-2xl border border-slate-100 p-7 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-800 mb-2">💰 Simulador de Pagos Anticipados</h3><p className="text-sm text-slate-400 mb-6">¿Cuánto extra al principal cada mes? Mira el impacto en tiempo y ahorro de intereses.</p>
            <div className="max-w-xs mb-7"><Inp label="Pago extra mensual al principal" value={extraP} onChange={setExtraP} prefix="$" type="number"/></div>
            {sE.length>0&&sNE.length>0&&<>
              <div className="grid grid-cols-3 gap-5 mb-7">
                <div className="bg-emerald-50 rounded-2xl p-5 text-center border border-emerald-100"><div className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider">Se paga en</div><div className="text-3xl font-extrabold text-emerald-700 mt-1">{Math.ceil(sE[sE.length-1].month/12)} años</div><div className="text-xs text-emerald-500 mt-1">vs {Math.ceil(sNE[sNE.length-1].month/12)} sin extra</div></div>
                <div className="bg-blue-50 rounded-2xl p-5 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider">Ahorro Intereses</div><div className="text-3xl font-extrabold text-blue-700 mt-1">{fm(sNE[sNE.length-1].interest-sE[sE.length-1].interest)}</div></div>
                <div className="bg-amber-50 rounded-2xl p-5 text-center border border-amber-100"><div className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider">Meses Menos</div><div className="text-3xl font-extrabold text-amber-700 mt-1">{sNE[sNE.length-1].month-sE[sE.length-1].month}</div></div>
              </div>
              <ResponsiveContainer width="100%" height={280}><AreaChart data={sNE.map((d,i)=>({year:'Año '+d.year,sinExtra:d.balance,conExtra:sE[i]?.balance||0}))}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/><XAxis dataKey="year" tick={{fontSize:9}} interval={4}/><YAxis tick={{fontSize:10}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11}}/><Area dataKey="sinExtra" name="Sin extra" stroke="#DC2626" fill="rgba(220,38,38,.05)"/><Area dataKey="conExtra" name={`$${extraP||0}/mes extra`} stroke="#059669" fill="rgba(5,150,105,.05)"/></AreaChart></ResponsiveContainer>
            </>}
          </div>
        </>:<div className="bg-white rounded-2xl border border-slate-100 p-7 shadow-sm">
          <div className="text-center mb-6"><div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Landmark size={28} className="text-blue-500"/></div><h3 className="text-lg font-extrabold text-slate-800 mb-1">Configurar Hipoteca</h3><p className="text-sm text-slate-400 max-w-md mx-auto">Ingresa los datos del crédito hipotecario para ver la tabla de amortización y simular pagos anticipados.</p></div>
          <div className="max-w-lg mx-auto space-y-4">
            <div className="grid grid-cols-2 gap-4"><Inp label="Balance Actual del Préstamo" value={mortForm.balance} onChange={v=>setMortForm(x=>({...x,balance:v}))} prefix="$" type="number" placeholder="250,000"/><Inp label="Tasa de Interés Anual (%)" value={mortForm.rate} onChange={v=>setMortForm(x=>({...x,rate:v}))} type="number" placeholder="7.5"/></div>
            <div className="grid grid-cols-3 gap-4"><Inp label="Plazo (años)" value={mortForm.term} onChange={v=>setMortForm(x=>({...x,term:v}))} type="number" placeholder="30"/><Inp label="Pago Mensual" value={mortForm.payment} onChange={v=>setMortForm(x=>({...x,payment:v}))} prefix="$" type="number" placeholder="1,750"/><Inp label="Fecha de Inicio" value={mortForm.start} onChange={v=>setMortForm(x=>({...x,start:v}))} type="date"/></div>
            <button onClick={async()=>{
              try{
                await updateDoc(doc(db,'properties',propertyId),{mortgage:{balance:parseFloat(mortForm.balance)||0,rate:parseFloat(mortForm.rate)||0,termYears:parseInt(mortForm.term)||30,monthlyPayment:parseFloat(mortForm.payment)||0,startDate:mortForm.start||''}});
                alert('Hipoteca guardada. Recarga la página para ver el simulador.');
                window.location.reload();
              }catch(e){alert('Error: '+e.message)}
            }} disabled={!mortForm.balance||!mortForm.rate||!mortForm.payment} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-sm disabled:opacity-40 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"><Landmark size={16}/>Guardar Hipoteca</button>
          </div>
        </div>}
      </>}

    </div></div>

    {/* ═══════ MODALS ═══════ */}
    {modal==='expense'&&<Mdl title="Registrar Gasto" color="red" onClose={()=>setModal(null)} footer={<><button onClick={()=>setModal(null)} className="flex-1 py-3 border-2 border-slate-200 rounded-2xl font-semibold text-sm text-slate-600 hover:bg-slate-50 transition">Cancelar</button><button onClick={()=>save('expenses',{...ef,amount:parseFloat(ef.amount)})} disabled={!ef.amount||!ef.concept} className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm hover:bg-rose-600 disabled:opacity-40 transition shadow-lg shadow-rose-500/20">Guardar Gasto</button></>}>
      <div className="grid grid-cols-2 gap-4"><Inp label="Fecha" value={ef.date} onChange={v=>ue('date',v)} type="date"/><Sel label="Categoría" value={ef.category} onChange={v=>ue('category',v)} options={CATS.map(c=>({v:c.v,l:c.i+' '+c.l}))}/></div>
      <Inp label="Concepto" value={ef.concept} onChange={v=>ue('concept',v)} placeholder="Descripción del gasto"/>
      <Inp label="Monto (USD)" value={ef.amount} onChange={v=>ue('amount',v)} prefix="$" type="number"/>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">¿Quién pagó?</label><PartnerPicker partners={partners} selected={ef.paidBy} onChange={v=>ue('paidBy',v)}/></div>
    </Mdl>}

    {modal==='income'&&<Mdl title="Registrar Ingreso" color="green" onClose={()=>setModal(null)} footer={<><button onClick={()=>setModal(null)} className="flex-1 py-3 border-2 border-slate-200 rounded-2xl font-semibold text-sm text-slate-600 hover:bg-slate-50">Cancelar</button><button onClick={()=>{const g=parseFloat(inf.gross);save('income',{date:inf.date,month:inf.month,grossAmount:g,hostUFee:g*prop.managerCommission/100,netAmount:g*(1-prop.managerCommission/100)})}} disabled={!inf.gross} className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-sm disabled:opacity-40 shadow-lg shadow-emerald-500/20">Guardar Ingreso</button></>}>
      <div className="grid grid-cols-2 gap-4"><Inp label="Fecha" value={inf.date} onChange={v=>ui('date',v)} type="date"/><Inp label="Periodo / Mes" value={inf.month} onChange={v=>ui('month',v)} placeholder="Ej: Febrero 2025"/></div>
      <Inp label="Ingreso Bruto (USD)" value={inf.gross} onChange={v=>ui('gross',v)} prefix="$" type="number"/>
      {inf.gross&&<div className="bg-slate-50 rounded-2xl p-5 space-y-2.5 text-sm border border-slate-100">
        <div className="flex justify-between"><span className="text-slate-500">Comisión {prop.manager} ({prop.managerCommission}%)</span><span className="text-rose-500 font-bold">-{fm(inf.gross*prop.managerCommission/100)}</span></div>
        <div className="flex justify-between font-bold border-t border-slate-200 pt-2.5"><span>Ingreso Neto</span><span className="text-emerald-600 text-base">{fm(inf.gross*(1-prop.managerCommission/100))}</span></div>
        {partners.length>1&&<div className="flex justify-between text-amber-600 font-semibold"><span>Por socio ({partners.length})</span><span>{fm(inf.gross*(1-prop.managerCommission/100)/partners.length)}</span></div>}
      </div>}
    </Mdl>}

    {modal==='contribution'&&<Mdl title="Registrar Aporte de Capital" color="purple" onClose={()=>setModal(null)} footer={<><button onClick={()=>setModal(null)} className="flex-1 py-3 border-2 border-slate-200 rounded-2xl font-semibold text-sm text-slate-600 hover:bg-slate-50">Cancelar</button><button onClick={()=>save('contributions',{...cf,amount:parseFloat(cf.amount),type:'contribution'})} disabled={!cf.amount} className="flex-1 py-3 bg-violet-500 text-white rounded-2xl font-bold text-sm disabled:opacity-40 shadow-lg shadow-violet-500/20">Guardar Aporte</button></>}>
      <div className="grid grid-cols-2 gap-4"><Inp label="Fecha" value={cf.date} onChange={v=>uc('date',v)} type="date"/><Inp label="Monto (USD)" value={cf.amount} onChange={v=>uc('amount',v)} prefix="$" type="number"/></div>
      <Inp label="Concepto" value={cf.concept} onChange={v=>uc('concept',v)} placeholder="Ej: Aporte para down payment, Pago de seguro..."/>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Socio</label><PartnerPicker partners={partners} selected={cf.paidBy} onChange={v=>uc('paidBy',v)}/></div>
    </Mdl>}

    {modal==='statement'&&<Mdl title="Cargar Statement del Property Manager" color="blue" onClose={()=>setModal(null)} footer={<><button onClick={()=>setModal(null)} className="flex-1 py-3 border-2 border-slate-200 rounded-2xl font-semibold text-sm text-slate-600 hover:bg-slate-50">Cancelar</button><button onClick={()=>{save('statements',{year:parseInt(sf.year),month:parseInt(sf.month),revenue:parseFloat(sf.revenue)||0,net:parseFloat(sf.net)||0,commission:parseFloat(sf.commission)||0,duke:parseFloat(sf.duke)||0,water:parseFloat(sf.water)||0,hoa:parseFloat(sf.hoa)||0,maintenance:parseFloat(sf.maintenance)||0,vendor:parseFloat(sf.vendor)||0});setSf(x=>({...x,month:x.month<12?parseInt(x.month)+1:1,revenue:'',net:'',commission:'',duke:'',water:'',hoa:'',maintenance:'',vendor:''}))}} disabled={!sf.revenue} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm disabled:opacity-40 shadow-lg shadow-blue-500/20">Guardar Statement</button></>}>
      <p className="text-xs text-slate-400 -mt-1 mb-2">Ingresa los datos del owner statement mensual. Los campos de gastos son opcionales.</p>
      <div className="grid grid-cols-2 gap-4"><Inp label="Año" value={sf.year} onChange={v=>us('year',v)} type="number"/><Sel label="Mes" value={sf.month} onChange={v=>us('month',v)} options={MO.map((m,i)=>({v:i+1,l:m}))}/></div>
      <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100"><div className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider mb-3">💰 Ingresos</div><Inp label="Revenue Total (Room Charge + Pool Heat)" value={sf.revenue} onChange={v=>us('revenue',v)} prefix="$" type="number"/></div>
      <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100"><div className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider mb-3">📉 Desglose de Gastos</div>
        <div className="grid grid-cols-2 gap-3">
          <Inp label="Comisión PM" value={sf.commission} onChange={v=>us('commission',v)} prefix="$" type="number"/>
          <Inp label="Electricidad (Duke)" value={sf.duke} onChange={v=>us('duke',v)} prefix="$" type="number"/>
          <Inp label="Agua (Toho)" value={sf.water} onChange={v=>us('water',v)} prefix="$" type="number"/>
          <Inp label="HOA Dues" value={sf.hoa} onChange={v=>us('hoa',v)} prefix="$" type="number"/>
          <Inp label="Maintenance Fee" value={sf.maintenance} onChange={v=>us('maintenance',v)} prefix="$" type="number"/>
          <Inp label="Vendor / Otros" value={sf.vendor} onChange={v=>us('vendor',v)} prefix="$" type="number"/>
        </div>
      </div>
      <Inp label="Net al Owner (ACH Payment)" value={sf.net} onChange={v=>us('net',v)} prefix="$" type="number"/>
    </Mdl>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [user,setUser]=useState(null);
  const [ready,setReady]=useState(false);
  const [allProps,setAllProps]=useState([]);
  const [activePropId,setActivePropId]=useState(null);
  const [checking,setChecking]=useState(false);

  useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setReady(true);if(!u){setAllProps([]);setActivePropId(null)}}),[]);

  // Query: properties I own OR where my email is in memberEmails
  useEffect(()=>{
    if(!user)return;
    setChecking(true);
    // Listen to properties where I'm the owner
    const q1=query(collection(db,'properties'),where('ownerId','==',user.uid));
    // Listen to properties where I'm a member (partner)
    const q2=query(collection(db,'properties'),where('memberEmails','array-contains',user.email));
    let results1=[],results2=[];
    const merge=()=>{
      const map=new Map();
      [...results1,...results2].forEach(d=>map.set(d.id,d));
      const all=Array.from(map.values());
      setAllProps(all);
      if(!activePropId && all.length>0) setActivePropId(all[0].id);
      setChecking(false);
    };
    const u1=onSnapshot(q1,snap=>{results1=snap.docs.map(d=>({id:d.id,...d.data()}));merge();});
    const u2=onSnapshot(q2,snap=>{results2=snap.docs.map(d=>({id:d.id,...d.data()}));merge();});
    return ()=>{u1();u2();};
  },[user]);

  const activeProp=allProps.find(p=>p.id===activePropId);

  if(!ready)return<div className="min-h-screen bg-[#0B1120] flex items-center justify-center"><Loader2 size={36} className="animate-spin text-blue-500"/></div>;
  if(!user)return<AuthScreen/>;
  if(checking)return<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="text-center"><Loader2 size={36} className="animate-spin text-blue-500 mx-auto mb-4"/><p className="text-slate-400">Buscando propiedades...</p></div></div>;
  if(!allProps.length)return<Onboarding userId={user.uid} onComplete={id=>setActivePropId(id)}/>;
  if(!activeProp)return<Onboarding userId={user.uid} onComplete={id=>setActivePropId(id)}/>;
  return<Dashboard propertyId={activePropId} propertyData={activeProp} allProperties={allProps} onSwitchProperty={setActivePropId} onLogout={()=>signOut(auth)} onAddProperty={()=>setActivePropId(null)} userEmail={user.email}/>;
}
